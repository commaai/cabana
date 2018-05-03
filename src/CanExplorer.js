import React, { Component } from "react";
import Moment from "moment";
import PropTypes from "prop-types";
import cx from "classnames";
import { createWriteStream } from "streamsaver";
import Panda from "@commaai/pandajs";

import { USE_UNLOGGER, PART_SEGMENT_LENGTH, STREAMING_WINDOW } from "./config";
import * as GithubAuth from "./api/github-auth";

import * as auth from "./api/comma-auth";
import DBC from "./models/can/dbc";
import Meta from "./components/Meta";
import Explorer from "./components/Explorer";
import * as Routes from "./api/routes";
import OnboardingModal from "./components/Modals/OnboardingModal";
import SaveDbcModal from "./components/SaveDbcModal";
import LoadDbcModal from "./components/LoadDbcModal";
import debounce from "./utils/debounce";
import EditMessageModal from "./components/EditMessageModal";
import LoadingBar from "./components/LoadingBar";
import {
  persistDbc,
  fetchPersistedDbc,
  unpersistGithubAuthToken
} from "./api/localstorage";
import OpenDbc from "./api/OpenDbc";
import UnloggerClient from "./api/unlogger";
import * as ObjectUtils from "./utils/object";
import { hash } from "./utils/string";

const RLogDownloader = require("./workers/rlog-downloader.worker.js");
const LogCSVDownloader = require("./workers/dbc-csv-downloader.worker.js");
const MessageParser = require("./workers/message-parser.worker.js");
const CanOffsetFinder = require("./workers/can-offset-finder.worker.js");
const CanStreamerWorker = require("./workers/CanStreamerWorker.worker.js");

export default class CanExplorer extends Component {
  static propTypes = {
    dongleId: PropTypes.string,
    name: PropTypes.string,
    dbc: PropTypes.instanceOf(DBC),
    dbcFilename: PropTypes.string,
    githubAuthToken: PropTypes.string,
    autoplay: PropTypes.bool,
    max: PropTypes.number,
    url: PropTypes.string
  };

  constructor(props) {
    super(props);
    this.state = {
      messages: {},
      selectedMessages: [],
      route: null,
      routes: [],
      canFrameOffset: -1,
      firstCanTime: 0,
      lastBusTime: null,
      selectedMessage: null,
      currentParts: [0, 0],
      showOnboarding: false,
      showLoadDbc: false,
      showSaveDbc: false,
      showEditMessageModal: false,
      editMessageModalMessage: null,
      dbc: props.dbc ? props.dbc : new DBC(),
      dbcText: props.dbc ? props.dbc.text() : new DBC().text(),
      dbcFilename: props.dbcFilename ? props.dbcFilename : "New_DBC",
      dbcLastSaved: null,
      seekTime: 0,
      seekIndex: 0,
      maxByteStateChangeCount: 0,
      isLoading: true,
      partsLoaded: 0,
      spawnWorkerHash: null,
      attemptingPandaConnection: false,
      pandaNoDeviceSelected: false,
      live: false,
      isGithubAuthenticated:
        props.githubAuthToken !== null && props.githubAuthToken !== undefined
    };

    this.openDbcClient = new OpenDbc(props.githubAuthToken);
    if (USE_UNLOGGER) {
      this.unloggerClient = new UnloggerClient();
    }

    this.showOnboarding = this.showOnboarding.bind(this);
    this.hideOnboarding = this.hideOnboarding.bind(this);
    this.showLoadDbc = this.showLoadDbc.bind(this);
    this.hideLoadDbc = this.hideLoadDbc.bind(this);
    this.showSaveDbc = this.showSaveDbc.bind(this);
    this.hideSaveDbc = this.hideSaveDbc.bind(this);
    this.showEditMessageModal = this.showEditMessageModal.bind(this);
    this.hideEditMessageModal = this.hideEditMessageModal.bind(this);
    this.onDbcSelected = this.onDbcSelected.bind(this);
    this.onDbcSaved = this.onDbcSaved.bind(this);
    this.onConfirmedSignalChange = this.onConfirmedSignalChange.bind(this);
    this.onPartChange = this.onPartChange.bind(this);
    this.onMessageFrameEdited = this.onMessageFrameEdited.bind(this);
    this.onSeek = this.onSeek.bind(this);
    this.onUserSeek = this.onUserSeek.bind(this);
    this.onMessageSelected = this.onMessageSelected.bind(this);
    this.onMessageUnselected = this.onMessageUnselected.bind(this);
    this.initCanData = this.initCanData.bind(this);
    this.updateSelectedMessages = this.updateSelectedMessages.bind(this);
    this.handlePandaConnect = this.handlePandaConnect.bind(this);
    this.processStreamedCanMessages = this.processStreamedCanMessages.bind(
      this
    );
    this.onStreamedCanMessagesProcessed = this.onStreamedCanMessagesProcessed.bind(
      this
    );
    this.showingModal = this.showingModal.bind(this);
    this.lastMessageEntriesById = this.lastMessageEntriesById.bind(this);
    this.githubSignOut = this.githubSignOut.bind(this);
    this.downloadLogAsCSV = this.downloadLogAsCSV.bind(this);

    this.pandaReader = new Panda();
    this.pandaReader.onMessage(this.processStreamedCanMessages);
  }

  componentWillMount() {
    const { dongleId, name } = this.props;
    if (this.props.max && this.props.url) {
      const { max, url } = this.props;
      const { startTime } = Routes.parseRouteName(name);

      const route = {
        fullname: name,
        proclog: max,
        url: url,
        start_time: startTime
      };
      this.setState(
        {
          route,
          currentParts: [0, Math.min(max - 1, PART_SEGMENT_LENGTH - 1)]
        },
        this.initCanData
      );
    } else if (auth.isAuthenticated() && !name) {
      Routes.fetchRoutes()
        .then(routes => {
          const _routes = [];
          Object.keys(routes).forEach(route => {
            _routes.push(routes[route]);
          });
          this.setState({ routes: _routes });
          if (!_routes[name]) {
            this.showOnboarding();
          }
        })
        .catch(err => {
          this.showOnboarding();
        });
    } else if (dongleId && name) {
      Routes.fetchRoutes(dongleId)
        .then(routes => {
          if (routes && routes[name]) {
            const route = routes[name];
            const newState = {
              route,
              currentParts: [
                0,
                Math.min(route.proclog - 1, PART_SEGMENT_LENGTH - 1)
              ]
            };
            this.setState(newState, this.initCanData);
          } else {
            this.showOnboarding();
          }
        })
        .catch(err => {
          this.showOnboarding();
        });
    } else {
      this.showOnboarding();
    }
  }

  initCanData() {
    const { route } = this.state;

    const offsetFinder = new CanOffsetFinder();
    offsetFinder.postMessage({
      partCount: route.proclog,
      base: route.url
    });

    offsetFinder.onmessage = e => {
      const { canFrameOffset, firstCanTime } = e.data;

      this.setState({ canFrameOffset, firstCanTime }, () => {
        this.spawnWorker(this.state.currentParts);
      });
    };
  }

  onDbcSelected(dbcFilename, dbc) {
    const { route } = this.state;
    this.hideLoadDbc();
    this.persistDbc({ dbcFilename, dbc });

    if (route) {
      this.setState(
        {
          dbc,
          dbcFilename,
          dbcText: dbc.text(),
          partsLoaded: 0,
          selectedMessage: null,
          messages: {}
        },
        () => {
          // Pass DBC text to webworker b/c can't pass instance of es6 class
          this.spawnWorker(this.state.currentParts);
        }
      );
    } else {
      this.setState({ dbc, dbcFilename, dbcText: dbc.text(), messages: {} });
    }
  }

  onDbcSaved(dbcFilename) {
    const dbcLastSaved = Moment();
    this.setState({ dbcLastSaved, dbcFilename });
    this.hideSaveDbc();
  }

  // async downloadDbcFile() {
  //   const blob = new Blob([this.props.dbc.text()], {type: "text/plain;charset=utf-8"});
  //   const filename = this.state.dbcFilename.replace(/\.dbc/g, '') + '.dbc';
  //   FileSaver.saveAs(blob, filename, true);
  // }

  downloadLogAsCSV() {
    console.log("downloadLogAsCSV:start");
    const { dbcFilename } = this.state;
    const fileStream = createWriteStream(
      `${dbcFilename.replace(/\.dbc/g, "-")}${+new Date()}.csv`
    );
    const writer = fileStream.getWriter();
    const encoder = new TextEncoder();

    if (this.state.live) {
      return this.downloadLiveLogAsCSV(dataHandler);
    }
    return this.downloadRawLogAsCSV(dataHandler);

    function dataHandler(e) {
      const { logData, shouldClose, progress } = e.data;
      if (shouldClose) {
        console.log("downloadLogAsCSV:close");
        writer.close();
        return;
      }
      console.log("CSV export progress:", progress);
      const uint8array = encoder.encode(logData + "\n");
      writer.write(uint8array);
    }
  }
  downloadRawLogAsCSV(handler) {
    // Trigger file processing and dowload in worker
    const { firstCanTime, canFrameOffset, route } = this.state;
    const worker = new LogCSVDownloader();

    worker.onmessage = handler;

    worker.postMessage({
      base: route.url,
      parts: [0, route.proclog],
      canStartTime: firstCanTime - canFrameOffset
    });
  }

  downloadLiveLogAsCSV(handler) {
    // Trigger processing of in-memory data in worker
    // this method *could* just fetch the data needed for the worked, but
    // eventually this might be in it's own worker instead of the shared one
    const { firstCanTime, canFrameOffset } = this.state;
    const worker = new LogCSVDownloader();

    worker.onmessage = handler;

    worker.postMessage({
      data: Object.keys(this.state.messages).map(sourceId => {
        var source = this.state.messages[sourceId];
        return {
          id: source.id,
          bus: source.bus,
          address: source.address,
          entries: source.entries.slice()
        };
      }),
      canStartTime: firstCanTime - canFrameOffset
    });
  }

  addAndRehydrateMessages(newMessages, options) {
    // Adds new message entries to messages state
    // and "rehydrates" ES6 classes (message frame)
    // lost from JSON serialization in webworker data cloning.
    options = options || {};

    const messages = { ...this.state.messages };
    for (var key in newMessages) {
      // add message
      if (options.replace !== true && key in messages) {
        messages[key].entries = messages[key].entries.concat(
          newMessages[key].entries
        );
        messages[key].byteStateChangeCounts =
          newMessages[key].byteStateChangeCounts;
      } else {
        messages[key] = newMessages[key];
        messages[key].frame = this.state.dbc.messages.get(
          messages[key].address
        );
      }
    }

    return messages;
  }

  spawnWorker(parts, options) {
    console.log("Spawning worker for", parts);
    if (!this.state.isLoading) {
      this.setState({ isLoading: true });
    }
    // options is object of {part, prevMsgEntries, spawnWorkerHash, prepend}
    const [minPart, maxPart] = parts;
    options = options || {};
    let part = options.part || minPart;
    let prevMsgEntries = options.prevMsgEntries || {};
    let prepend = false;
    let spawnWorkerHash = options.spawnWorkerHash; // || undefined

    if (!spawnWorkerHash) {
      spawnWorkerHash = hash(Math.random().toString(16));
      this.setState({ spawnWorkerHash });
    }

    if (part === minPart) {
      this.setState({ partsLoaded: 0 });
    }

    const {
      dbc,
      dbcFilename,
      route,
      firstCanTime,
      canFrameOffset,
      maxByteStateChangeCount
    } = this.state;
    // var worker = new CanFetcher();
    var worker = new RLogDownloader();

    worker.onmessage = e => {
      if (spawnWorkerHash !== this.state.spawnWorkerHash) {
        // Parts changed, stop spawning workers.
        return;
      }

      if (this.state.dbcFilename !== dbcFilename) {
        // DBC changed while this worker was running
        // -- don't update messages and halt recursion.
        return;
      }

      let { newMessages, maxByteStateChangeCount, isFinished } = e.data;
      if (maxByteStateChangeCount > this.state.maxByteStateChangeCount) {
        this.setState({ maxByteStateChangeCount });
      } else {
        maxByteStateChangeCount = this.state.maxByteStateChangeCount;
      }

      const messages = this.addAndRehydrateMessages(
        newMessages,
        maxByteStateChangeCount
      );
      const prevMsgEntries = {};
      for (let key in newMessages) {
        const msg = newMessages[key];

        prevMsgEntries[key] = msg.entries[msg.entries.length - 1];
      }

      if (!isFinished) {
        this.setState({ messages });
      } else {
        this.setState(
          {
            messages,
            partsLoaded: this.state.partsLoaded + 1
          },
          () => {
            if (part < maxPart) {
              this.spawnWorker(parts, {
                part: part + 1,
                prevMsgEntries,
                spawnWorkerHash,
                prepend
              });
            } else {
              this.setState({ isLoading: false });
            }
          }
        );
      }
    };

    worker.postMessage({
      // old stuff for reverse compatibility for easier testing
      base: route.url,
      num: part,

      // data that is used
      dbcText: dbc.text(),
      route: route.fullname,
      part: part,
      canStartTime: firstCanTime - canFrameOffset,
      prevMsgEntries,
      maxByteStateChangeCount
    });
  }

  showingModal() {
    const {
      showOnboarding,
      showLoadDbc,
      showSaveDbc,
      showAddSignal,
      showEditMessageModal
    } = this.state;
    return (
      showOnboarding ||
      showLoadDbc ||
      showSaveDbc ||
      showAddSignal ||
      showEditMessageModal
    );
  }

  showOnboarding() {
    this.setState({ showOnboarding: true });
  }

  hideOnboarding() {
    this.setState({ showOnboarding: false });
  }

  showLoadDbc() {
    this.setState({ showLoadDbc: true });
  }

  hideLoadDbc() {
    this.setState({ showLoadDbc: false });
  }

  showSaveDbc() {
    this.setState({ showSaveDbc: true });
  }

  hideSaveDbc() {
    this.setState({ showSaveDbc: false });
  }

  reparseMessages(messages) {
    this.setState({ isLoading: true });

    const { dbc } = this.state;
    var worker = new MessageParser();
    worker.onmessage = e => {
      let messages = e.data;
      messages = this.addAndRehydrateMessages(messages, { replace: true });

      this.setState({ messages, isLoading: false });
    };

    worker.postMessage({
      messages,
      dbcText: dbc.text(),
      canStartTime: this.state.firstCanTime
    });
  }

  updateMessageFrame(messageId, frame) {
    const { messages } = this.state;

    messages[messageId].frame = frame;
    this.setState({ messages });
  }

  persistDbc({ dbcFilename, dbc }) {
    const { route } = this.state;
    if (route) {
      persistDbc(route.fullname, { dbcFilename, dbc });
    } else {
      persistDbc("live", { dbcFilename, dbc });
    }
  }

  onConfirmedSignalChange(message, signals) {
    const { dbc, dbcFilename } = this.state;
    dbc.setSignals(message.address, { ...signals });

    this.updateMessageFrame(message.id, dbc.messages.get(message.address));

    this.persistDbc({ dbcFilename, dbc });

    const messages = {};
    const newMessage = { ...message };
    const frame = dbc.messages.get(message.address);
    newMessage.frame = frame;

    messages[message.id] = newMessage;

    this.setState({ dbc, dbcText: dbc.text() }, () =>
      this.reparseMessages(messages)
    );
  }

  partChangeDebounced = debounce(() => {
    const { currentParts } = this.state;
    this.spawnWorker(currentParts);
  }, 500);

  onPartChange(part) {
    let { currentParts, canFrameOffset, route, messages } = this.state;
    if (canFrameOffset === -1 || part + PART_SEGMENT_LENGTH > route.proclog) {
      return;
    }

    // determine new parts to load, whether to prepend or append
    const currentPartSpan = currentParts[1] - currentParts[0] + 1;

    // update current parts
    currentParts = [part, part + currentPartSpan - 1];

    // update messages to only preserve entries in new part range
    const messagesKvPairs = Object.entries(messages).map(
      ([messageId, message]) => [
        messageId,
        {
          ...message,
          entries: []
        }
      ]
    );
    messages = ObjectUtils.fromArray(messagesKvPairs);

    // update state then load new parts
    this.setState(
      { currentParts, messages, seekTime: part * 60 },
      this.partChangeDebounced
    );
  }

  showEditMessageModal(msgKey) {
    const msg = this.state.messages[msgKey];
    if (!msg.frame) {
      msg.frame = this.state.dbc.createFrame(msg.address);
    }

    this.setState({
      showEditMessageModal: true,
      editMessageModalMessage: msgKey,
      messages: this.state.messages,
      dbcText: this.state.dbc.text()
    });
  }

  hideEditMessageModal() {
    this.setState({ showEditMessageModal: false });
  }

  onMessageFrameEdited(messageFrame) {
    const { messages, dbcFilename, dbc, editMessageModalMessage } = this.state;

    const message = Object.assign({}, messages[editMessageModalMessage]);
    message.frame = messageFrame;
    dbc.messages.set(messageFrame.id, messageFrame);
    this.persistDbc({ dbcFilename, dbc });

    messages[editMessageModalMessage] = message;
    this.setState({ messages, dbc, dbcText: dbc.text() });
    this.hideEditMessageModal();
  }

  onSeek(seekIndex, seekTime) {
    this.setState({ seekIndex, seekTime });
  }

  onUserSeek(seekTime) {
    if (USE_UNLOGGER) {
      this.unloggerClient.seek(this.props.dongleId, this.props.name, seekTime);
    }

    const msg = this.state.messages[this.state.selectedMessage];
    let seekIndex;
    if (msg) {
      seekIndex = msg.entries.findIndex(e => e.relTime >= seekTime);
      if (seekIndex === -1) {
        seekIndex = 0;
      }
    } else {
      seekIndex = 0;
    }

    this.setState({ seekIndex, seekTime });
  }

  onMessageSelected(msgKey) {
    let { seekTime, seekIndex, messages } = this.state;
    const msg = messages[msgKey];

    if (seekTime > 0 && msg.entries.length > 0) {
      seekIndex = msg.entries.findIndex(e => e.relTime >= seekTime);
      if (seekIndex === -1) {
        seekIndex = 0;
      }

      seekTime = msg.entries[seekIndex].relTime;
    }

    this.setState({ seekTime, seekIndex, selectedMessage: msgKey });
  }

  updateSelectedMessages(selectedMessages) {
    this.setState({ selectedMessages });
  }

  onMessageUnselected(msgKey) {
    this.setState({ selectedMessage: null });
  }

  loginWithGithub() {
    const { route } = this.state;
    return (
      <a
        href={GithubAuth.authorizeUrl(
          route && route.fullname ? route.fullname : ""
        )}
        className="button button--dark button--inline"
      >
        <i className="fa fa-github" />
        <span> Log in with Github</span>
      </a>
    );
  }

  lastMessageEntriesById(obj, [msgId, message]) {
    obj[msgId] = message.entries[message.entries.length - 1];
    return obj;
  }

  processStreamedCanMessages(newCanMessages) {
    const { dbcText } = this.state;
    const {
      firstCanTime,
      lastBusTime,
      messages,
      maxByteStateChangeCount
    } = this.state;
    // map msg id to arrays
    const prevMsgEntries = Object.entries(messages).reduce(
      this.lastMessageEntriesById,
      {}
    );

    const byteStateChangeCountsByMessage = Object.entries(messages).reduce(
      (obj, [msgId, msg]) => {
        obj[msgId] = msg.byteStateChangeCounts;
        return obj;
      },
      {}
    );

    this.canStreamerWorker.postMessage({
      newCanMessages,
      prevMsgEntries,
      firstCanTime,
      dbcText,
      lastBusTime,
      byteStateChangeCountsByMessage,
      maxByteStateChangeCount
    });
  }

  firstEntryIndexInsideStreamingWindow(entries) {
    const lastEntryTime = entries[entries.length - 1].relTime;
    const windowFloor = lastEntryTime - STREAMING_WINDOW;

    for (let i = 0; i < entries.length; i++) {
      if (entries[i].relTime > windowFloor) {
        return i;
      }
    }

    return 0;
  }

  enforceStreamingMessageWindow(messages) {
    let messageIds = Object.keys(messages);
    for (let i = 0; i < messageIds.length; i++) {
      const messageId = messageIds[i];
      const message = messages[messageId];
      if (message.entries.length < 2) {
        continue;
      }

      const lastEntryTime = message.entries[message.entries.length - 1].relTime;
      const entrySpan = lastEntryTime - message.entries[0].relTime;
      if (entrySpan > STREAMING_WINDOW) {
        const newEntryFloor = this.firstEntryIndexInsideStreamingWindow(
          message.entries
        );
        message.entries = message.entries.slice(newEntryFloor);
        messages[messageId] = message;
      }
    }

    return messages;
  }

  _onStreamedCanMessagesProcessed(data) {
    let {
      newMessages,
      seekTime,
      lastBusTime,
      firstCanTime,
      maxByteStateChangeCount
    } = data;

    if (maxByteStateChangeCount < this.state.maxByteStateChangeCount) {
      maxByteStateChangeCount = this.state.maxByteStateChangeCount;
    }

    let messages = this.addAndRehydrateMessages(newMessages);
    messages = this.enforceStreamingMessageWindow(messages);
    let { seekIndex, selectedMessages } = this.state;
    if (
      selectedMessages.length > 0 &&
      messages[selectedMessages[0]] !== undefined
    ) {
      seekIndex = messages[selectedMessages[0]].entries.length - 1;
    }
    this.setState({
      messages,
      seekTime,
      seekIndex,
      lastBusTime,
      firstCanTime,
      maxByteStateChangeCount
    });
  }

  onStreamedCanMessagesProcessed(e) {
    this._onStreamedCanMessagesProcessed(e.data);
  }

  async handlePandaConnect(e) {
    this.setState({ attemptingPandaConnection: true, live: true });

    const persistedDbc = fetchPersistedDbc("live");
    if (persistedDbc) {
      let { dbc, dbcText } = persistedDbc;
      this.setState({ dbc, dbcText });
    }
    this.canStreamerWorker = new CanStreamerWorker();
    this.canStreamerWorker.onmessage = this.onStreamedCanMessagesProcessed;

    // if any errors go off during connection, mark as not trying to connect anymore...
    let unlisten = this.pandaReader.onError(err => {
      console.error(err.stack || err);
      this.setState({ attemptingPandaConnection: false });
    });
    try {
      await this.pandaReader.start();
      this.setState({
        showOnboarding: false,
        showLoadDbc: true
      });
    } catch (e) {}
    this.setState({ attemptingPandaConnection: false });
    unlisten();
  }

  githubSignOut(e, dataArray) {
    unpersistGithubAuthToken();
    this.setState({ isGithubAuthenticated: false });

    e.preventDefault();
  }

  render() {
    return (
      <div
        id="cabana"
        className={cx({ "is-showing-modal": this.showingModal() })}
      >
        {this.state.isLoading ? (
          <LoadingBar isLoading={this.state.isLoading} />
        ) : null}
        <div className="cabana-header">
          <a className="cabana-header-logo" href="">
            Comma Cabana
          </a>
          <div className="cabana-header-account">
            {this.state.isGithubAuthenticated ? (
              <div>
                <p>GitHub Authenticated</p>
                <p
                  className="cabana-header-account-signout"
                  onClick={this.githubSignOut}
                >
                  Sign out
                </p>
              </div>
            ) : (
              this.loginWithGithub()
            )}
          </div>
        </div>
        <div className="cabana-window">
          <Meta
            url={this.state.route ? this.state.route.url : null}
            messages={this.state.messages}
            selectedMessages={this.state.selectedMessages}
            updateSelectedMessages={this.updateSelectedMessages}
            showEditMessageModal={this.showEditMessageModal}
            currentParts={this.state.currentParts}
            onMessageSelected={this.onMessageSelected}
            onMessageUnselected={this.onMessageUnselected}
            showLoadDbc={this.showLoadDbc}
            showSaveDbc={this.showSaveDbc}
            dbcFilename={this.state.dbcFilename}
            dbcLastSaved={this.state.dbcLastSaved}
            dongleId={this.props.dongleId}
            name={this.props.name}
            route={this.state.route}
            seekTime={this.state.seekTime}
            seekIndex={this.state.seekIndex}
            maxByteStateChangeCount={this.state.maxByteStateChangeCount}
            isDemo={this.props.isDemo}
            live={this.state.live}
            saveLog={debounce(this.downloadLogAsCSV, 500)}
          />
          {this.state.route || this.state.live ? (
            <Explorer
              url={this.state.route ? this.state.route.url : null}
              live={this.state.live}
              messages={this.state.messages}
              selectedMessage={this.state.selectedMessage}
              onConfirmedSignalChange={this.onConfirmedSignalChange}
              onSeek={this.onSeek}
              onUserSeek={this.onUserSeek}
              canFrameOffset={this.state.canFrameOffset}
              firstCanTime={this.state.firstCanTime}
              seekTime={this.state.seekTime}
              seekIndex={this.state.seekIndex}
              currentParts={this.state.currentParts}
              partsLoaded={this.state.partsLoaded}
              autoplay={this.props.autoplay}
              showEditMessageModal={this.showEditMessageModal}
              onPartChange={this.onPartChange}
              routeStartTime={
                this.state.route ? this.state.route.start_time : Moment()
              }
              partsCount={this.state.route ? this.state.route.proclog : 0}
            />
          ) : null}
        </div>

        {this.state.showOnboarding ? (
          <OnboardingModal
            handlePandaConnect={this.handlePandaConnect}
            attemptingPandaConnection={this.state.attemptingPandaConnection}
            routes={this.state.routes}
          />
        ) : null}

        {this.state.showLoadDbc ? (
          <LoadDbcModal
            onDbcSelected={this.onDbcSelected}
            handleClose={this.hideLoadDbc}
            openDbcClient={this.openDbcClient}
            loginWithGithub={this.loginWithGithub()}
          />
        ) : null}

        {this.state.showSaveDbc ? (
          <SaveDbcModal
            dbc={this.state.dbc}
            sourceDbcFilename={this.state.dbcFilename}
            onDbcSaved={this.onDbcSaved}
            handleClose={this.hideSaveDbc}
            openDbcClient={this.openDbcClient}
            hasGithubAuth={this.props.githubAuthToken !== null}
            loginWithGithub={this.loginWithGithub()}
          />
        ) : null}

        {this.state.showEditMessageModal ? (
          <EditMessageModal
            handleClose={this.hideEditMessageModal}
            handleSave={this.onMessageFrameEdited}
            message={this.state.messages[this.state.editMessageModalMessage]}
          />
        ) : null}
      </div>
    );
  }
}
