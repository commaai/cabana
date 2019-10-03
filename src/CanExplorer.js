import React, { Component } from "react";
import Moment from "moment";
import PropTypes from "prop-types";
import cx from "classnames";
import { createWriteStream } from "streamsaver";
import Panda from "@commaai/pandajs";
import CommaAuth from "@commaai/my-comma-auth";
import { raw as RawDataApi, drives as DrivesApi } from "@commaai/comma-api";
import {
  USE_UNLOGGER,
  PART_SEGMENT_LENGTH,
  STREAMING_WINDOW,
  GITHUB_AUTH_TOKEN_KEY
} from "./config";
import * as GithubAuth from "./api/github-auth";

import DBC from "./models/can/dbc";
import Meta from "./components/Meta";
import Explorer from "./components/Explorer";
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
import { modifyQueryParameters } from "./utils/url";

const RLogDownloader = require("./workers/rlog-downloader.worker.js");
const LogCSVDownloader = require("./workers/dbc-csv-downloader.worker.js");
const MessageParser = require("./workers/message-parser.worker.js");
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
      canFrameOffset: 0,
      firstCanTime: null,
      lastBusTime: null,
      selectedMessage: null,
      currentParts: [0, 0],
      currentPart: 0,
      currentWorkers: {},
      loadingParts: [],
      loadedParts: [],
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
        props.githubAuthToken !== null && props.githubAuthToken !== undefined,
      shareUrl: null,
      logUrls: null
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
    if (CommaAuth.isAuthenticated() && !name) {
      this.showOnboarding();
    } else if (
      this.props.max &&
      this.props.url &&
      !this.props.exp &&
      !this.props.sig
    ) {
      // probably the demo!
      const { max, url } = this.props;
      const startTime = Moment(name, "YYYY-MM-DD--H-m-s");

      const route = {
        fullname: dongleId + "|" + name,
        proclog: max,
        url: url,
        start_time: startTime
      };
      this.setState(
        {
          route,
          currentParts: [0, Math.min(max, PART_SEGMENT_LENGTH - 1)]
        },
        this.initCanData
      );
    } else if (dongleId && name) {
      const routeName = dongleId + "|" + name;
      let urlPromise, logUrlsPromise;

      if (this.props.url) {
        urlPromise = Promise.resolve(this.props.url);
      } else {
        urlPromise = DrivesApi.getRouteInfo(routeName).then(function(route) {
          return route.url;
        });
      }

      if (this.props.sig && this.props.exp) {
        logUrlsPromise = RawDataApi.getLogUrls(routeName, {
          sig: this.props.sig,
          exp: this.props.exp
        });
      } else {
        logUrlsPromise = RawDataApi.getLogUrls(routeName);
      }
      Promise.all([urlPromise, logUrlsPromise])
        .then(initData => {
          let [url, logUrls] = initData;
          const newState = {
            route: {
              fullname: routeName,
              proclog: logUrls.length - 1,
              start_time: Moment(name, "YYYY-MM-DD--H-m-s"),
              url
            },
            currentParts: [
              0,
              Math.min(logUrls.length - 1, PART_SEGMENT_LENGTH - 1)
            ],
            logUrls
          };
          this.setState(newState, this.initCanData);

          DrivesApi.getShareSignature(routeName).then(shareSignature =>
            this.setState({
              shareUrl: modifyQueryParameters({
                add: {
                  exp: shareSignature.exp,
                  sig: shareSignature.sig,
                  max: logUrls.length - 1,
                  url
                },
                remove: [GITHUB_AUTH_TOKEN_KEY]
              })
            })
          );
        })
        .catch(err => {
          console.error(err);
          this.showOnboarding();
        });
    } else {
      this.showOnboarding();
    }
  }

  initCanData() {
    const { route } = this.state;

    this.spawnWorker(this.state.currentParts);
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
          this.spawnWorker();
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
    return this.downloadLiveLogAsCSV(handler);
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
        // should merge here instead of concat
        // assumes messages are always sequential
        let msgEntries = messages[key].entries;
        let newMsgEntries = newMessages[key].entries;
        let msgLength = msgEntries.length;
        let newMsgLength = newMsgEntries.length;
        let entryLength = msgLength + newMsgLength;
        messages[key].entries = Array(entryLength);

        let msgIndex = 0;
        let newMsgIndex = 0;

        for (let i = 0; i < entryLength; ++i) {
          if (newMsgIndex >= newMsgLength) {
            messages[key].entries[i] = msgEntries[msgIndex++];
          } else if (msgIndex >= msgLength) {
            messages[key].entries[i] = newMsgEntries[newMsgIndex++];
          } else if (
            msgEntries[msgIndex].relTime <= newMsgEntries[newMsgIndex].relTime
          ) {
            messages[key].entries[i] = msgEntries[msgIndex++];
          } else if (
            msgEntries[msgIndex].relTime >= newMsgEntries[newMsgIndex].relTime
          ) {
            messages[key].entries[i] = newMsgEntries[newMsgIndex++];
          }
        }
        messages[key].byteStateChangeCounts =
          newMessages[key].byteStateChangeCounts;
      } else {
        messages[key] = newMessages[key];
        messages[key].frame = this.state.dbc.getMessageFrame(
          messages[key].address
        );
      }
    }

    return messages;
  }

  cancelWorker(workerHash) {
    let currentWorkers = { ...this.state.currentWorkers };
    let { worker, part } = currentWorkers[workerHash];
    let loadingParts = this.state.loadingParts.filter(p => p !== part);
    let loadedParts = this.state.loadedParts.filter(p => p !== part);
    delete currentWorkers[workerHash];

    console.log("Stoping worker", workerHash, "for part", part);
    worker.postMessage({
      action: "terminate"
    });

    this.setState({
      currentWorkers,
      loadingParts,
      loadedParts
    });
  }

  spawnWorker(options) {
    let { currentParts, currentWorkers } = this.state;
    console.log("Checking worker for", currentParts);
    if (!this.state.isLoading) {
      this.setState({ isLoading: true });
    }
    const [minPart, maxPart] = currentParts;
    // cancel old workers that are still loading data no longer inside the window
    Object.keys(currentWorkers).forEach(workerHash => {
      if (
        currentWorkers[workerHash].part < minPart ||
        currentWorkers[workerHash].part > maxPart
      ) {
        this.cancelWorker(workerHash);
      }
    });
    // updated worker list (post canceling, and this time a copy)
    currentWorkers = { ...this.state.currentWorkers };

    let { loadingParts, loadedParts, currentPart } = this.state;

    // clean this up just in case, the cancel process above *should* have already done this
    // they have at most 4 entries so it's trivial
    loadingParts = loadingParts.filter(p => p >= minPart && p <= maxPart);
    loadedParts = loadedParts.filter(p => p >= minPart && p <= maxPart);

    let part = -1;
    let allWorkerParts = Object.keys(currentWorkers).map(
      i => currentWorkers[i].part
    );

    for (let partOffset = 0; partOffset <= maxPart - minPart; ++partOffset) {
      let tempPart = currentPart + partOffset;
      if (tempPart > maxPart) {
        tempPart = minPart + ((tempPart - minPart) % (maxPart - minPart + 1));
      }
      if (allWorkerParts.indexOf(tempPart) === -1) {
        part = tempPart;
        break;
      }
    }
    if (part === -1) {
      console.log("Loading complete");
      this.setState({ isLoading: false });
      return;
    }
    console.log("Starting worker for part", part);
    // options is object of {part, prevMsgEntries, spawnWorkerHash, prepend}
    options = options || {};
    let prevMsgEntries = options.prevMsgEntries;
    let prepend = false;

    const {
      dbc,
      dbcFilename,
      route,
      firstCanTime,
      canFrameOffset,
      maxByteStateChangeCount
    } = this.state;

    if (!prevMsgEntries) {
      // we have previous messages loaded
      let { messages } = this.state;
      let canStartTime = firstCanTime - canFrameOffset;
      prevMsgEntries = {};
      Object.keys(messages).forEach(function(key) {
        let entries = messages[key].entries;
        prevMsgEntries[key] = entries[entries.length - 1];
      });
    }

    // var worker = new CanFetcher();
    var worker = new RLogDownloader();

    let spawnWorkerHash = hash(Math.random().toString(16));
    currentWorkers[spawnWorkerHash] = {
      part,
      worker
    };

    loadingParts = [part, ...loadingParts];

    this.setState({
      currentWorkers,
      loadingParts
    });

    worker.onmessage = e => {
      if (this.state.currentWorkers[spawnWorkerHash] === undefined) {
        console.log("Worker was canceled");
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
        prevMsgEntries[key] =
          newMessages[key].entries[newMessages[key].entries.length - 1];
      }

      if (!isFinished) {
        this.setState({ messages });
      } else {
        let loadingParts = this.state.loadingParts.filter(p => p !== part);
        let loadedParts = [part, ...this.state.loadedParts];

        this.setState(
          {
            messages,
            partsLoaded: this.state.partsLoaded + 1,
            loadingParts,
            loadedParts
          },
          () => {
            this.spawnWorker({
              prevMsgEntries,
              spawnWorkerHash,
              prepend
            });
          }
        );
      }
    };

    worker.postMessage({
      // old stuff for reverse compatibility for easier testing
      base: route.url,
      num: part,

      // so that we don't try to read metadata about it...
      isDemo: this.props.isDemo,
      isLegacyShare: this.props.isLegacyShare,
      logUrls: this.state.logUrls,

      // data that is used
      dbcText: dbc.text(),
      route: route.fullname,
      part: part,
      canStartTime: firstCanTime != null ? firstCanTime - canFrameOffset : null,
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

    this.updateMessageFrame(message.id, dbc.getMessageFrame(message.address));

    this.persistDbc({ dbcFilename, dbc });

    const messages = {};
    const newMessage = { ...message };
    const frame = dbc.getMessageFrame(message.address);
    newMessage.frame = frame;

    messages[message.id] = newMessage;

    this.setState({ dbc, dbcText: dbc.text() }, () =>
      this.reparseMessages(messages)
    );
  }

  partChangeDebounced = debounce(() => {
    let [minPart, maxPart] = this.state.currentParts;
    let messages = { ...this.state.messages };
    // update messages to only preserve entries in new part range
    let minTime = minPart * 60;
    let maxTime = maxPart * 60 + 60;
    Object.keys(messages).forEach(key => {
      let entries = messages[key].entries;
      let minIndex = 0;
      let maxIndex = entries.length - 1;
      while (minIndex < entries.length && entries[minIndex].relTime < minTime) {
        minIndex++;
      }
      while (maxIndex > minIndex && entries[maxIndex].relTime > maxTime) {
        maxIndex--;
      }
      if (minIndex > 0 || maxIndex < entries.length - 1) {
        messages[key].entries = entries.slice(minIndex, maxIndex + 1);
      }
    });

    this.setState({
      messages
    });

    this.spawnWorker();
  }, 500);

  onPartChange(part) {
    let { currentParts, currentPart, canFrameOffset, route } = this.state;
    if (canFrameOffset === -1 || part === currentPart) {
      return;
    }

    // determine new parts to load, whether to prepend or append
    let maxPart = Math.min(route.proclog, part + 1);
    let minPart = Math.max(0, maxPart - PART_SEGMENT_LENGTH + 1);
    if (minPart === 0) {
      maxPart = Math.min(route.proclog, 2);
    }
    const currentPartSpan = currentParts[1] - currentParts[0] + 1;

    // update current parts
    currentParts = [minPart, maxPart];
    currentPart = part;

    if (
      currentPart !== this.state.currentPart ||
      currentParts[0] !== this.state.currentParts[0] ||
      currentParts[1] !== this.state.currentParts[1]
    ) {
      // update state then load new parts
      this.setState({ currentParts, currentPart }, this.partChangeDebounced);
    }
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

    let { currentPart } = this.state;
    let part = ~~(seekTime / 60);
    if (part !== currentPart) {
      this.onPartChange(part);
    }
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

    this.onSeek(seekIndex, seekTime);
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
      seekIndex = Math.max(0, messages[selectedMessages[0]].entries.length - 1);
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
            shareUrl={this.state.shareUrl}
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
              selectedPart={this.state.currentPart}
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
