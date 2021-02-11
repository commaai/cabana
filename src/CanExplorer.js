import React, { Component } from 'react';
import Moment from 'moment';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { createWriteStream } from 'streamsaver';
import Panda from '@commaai/pandajs';
import CommaAuth from '@commaai/my-comma-auth';
import { raw as RawDataApi, drives as DrivesApi } from '@commaai/comma-api';
import { timeout, interval } from 'thyming';
import {
  USE_UNLOGGER,
  PART_SEGMENT_LENGTH,
  STREAMING_WINDOW,
  GITHUB_AUTH_TOKEN_KEY
} from './config';
import * as GithubAuth from './api/github-auth';

import DBC from './models/can/dbc';
import Meta from './components/Meta';
import Explorer from './components/Explorer';
import OnboardingModal from './components/Modals/OnboardingModal';
import SaveDbcModal from './components/SaveDbcModal';
import LoadDbcModal from './components/LoadDbcModal';
import debounce from './utils/debounce';
import EditMessageModal from './components/EditMessageModal';
import LoadingBar from './components/LoadingBar';
import {
  persistDbc,
  fetchPersistedDbc,
  unpersistGithubAuthToken
} from './api/localstorage';
import OpenDbc from './api/OpenDbc';
import UnloggerClient from './api/unlogger';
import * as ObjectUtils from './utils/object';
import { hash } from './utils/string';
import { modifyQueryParameters } from './utils/url';
import DbcUtils from './utils/dbc';
import { demoLogUrls, demoRoute } from './demo';

const RLogDownloader = require('./workers/rlog-downloader.worker');
const LogCSVDownloader = require('./workers/dbc-csv-downloader.worker');
const MessageParser = require('./workers/message-parser.worker');
const CanStreamerWorker = require('./workers/CanStreamerWorker.worker');

const dataCache = {};


export default class CanExplorer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      messages: {},
      thumbnails: [],
      selectedMessages: [],
      route: null,
      canFrameOffset: 0,
      routeInitTime: 0,
      firstFrameTime: 0,
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
      dbcFilename: props.dbcFilename ? props.dbcFilename : 'New_DBC',
      dbcLastSaved: null,
      seekTime: props.seekTime || 0,
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

  componentDidMount() {
    this.dataCacheTimer = interval(() => {
      const { currentParts } = this.state;
      let { loadedParts } = this.state;
      if (this.loadMessagesFromCacheRunning || loadedParts.length < 4) {
        return;
      }
      loadedParts.forEach((part) => {
        if (part >= currentParts[0] && part <= currentParts[1]) {
          return;
        }
        if (Date.now() - dataCache[part].lastUsed > 3 * 60 * 1000) {
          console.log('Decaching part', part);
          loadedParts = loadedParts.filter((p) => p !== part);
          this.setState({
            loadedParts
          }, () => { delete dataCache[part]; });
        }
      });
    }, 10000);

    const { dongleId, name } = this.props;
    if (CommaAuth.isAuthenticated() && !name) {
      this.showOnboarding();
    } else if (this.props.isDemo) {
      // is demo!

      const logUrls = demoLogUrls;
      const route = demoRoute;

      this.setState({
        logUrls,
        route,
        currentParts: [0, 2],
        currentPart: 0
      }, this.initCanData);
    } else if (
      this.props.max
      && this.props.url
      && !this.props.exp
      && !this.props.sig
    ) {
      // legacy share? maybe dead code
      const { max, url } = this.props;
      const startTime = Moment(name, 'YYYY-MM-DD--H-m-s');

      const route = {
        fullname: `${dongleId}|${name}`,
        proclog: max,
        url,
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
      const routeName = `${dongleId}|${name}`;
      let urlPromise;
      let logUrlsPromise;

      if (this.props.url) {
        urlPromise = Promise.resolve(this.props.url);
      } else {
        urlPromise = DrivesApi.getRouteInfo(routeName).then((route) => route.url);
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
        .then((initData) => {
          const [url, logUrls] = initData;
          const newState = {
            route: {
              fullname: routeName,
              proclog: logUrls.length - 1,
              start_time: Moment(name, 'YYYY-MM-DD--H-m-s'),
              url
            },
            currentParts: [
              0,
              Math.min(logUrls.length - 1, PART_SEGMENT_LENGTH - 1)
            ],
            logUrls
          };
          this.setState(newState, this.initCanData);

          DrivesApi.getShareSignature(routeName).then((shareSignature) => this.setState({
            shareUrl: modifyQueryParameters({
              add: {
                exp: shareSignature.exp,
                sig: shareSignature.sig,
                max: logUrls.length - 1,
                url
              },
              remove: [GITHUB_AUTH_TOKEN_KEY]
            })
          }));
        })
        .catch((err) => {
          console.error(err);
          this.showOnboarding();
        });
    } else {
      this.showOnboarding();
    }
  }

  componentWillUnmount() {
    if (this.dataCacheTimer) {
      this.dataCacheTimer();
    }
  }

  initCanData() {
    const { route } = this.state;

    this.spawnWorker(this.state.currentParts);
  }

  onDbcSelected(dbcFilename, dbc) {
    const { route } = this.state;
    this.hideLoadDbc();
    dbc.lastUpdated = Date.now();
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
          this.loadMessagesFromCache();
        }
      );
    } else {
      this.setState({
        dbc,
        dbcFilename,
        dbcText: dbc.text(),
        messages: {}
      });
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
    console.log('downloadLogAsCSV:start');
    const { dbcFilename } = this.state;
    const fileStream = createWriteStream(
      `${dbcFilename.replace(/\.dbc/g, '-')}${+new Date()}.csv`
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
        console.log('downloadLogAsCSV:close');
        writer.close();
        return;
      }
      console.log('CSV export progress:', progress);
      const uint8array = encoder.encode(`${logData}\n`);
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
      data: Object.keys(this.state.messages).map((sourceId) => {
        const source = this.state.messages[sourceId];
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

  mergeThumbnails(newThumbnails) {
    const { thumbnails } = this.state;
    if (!newThumbnails || !newThumbnails.length) {
      return thumbnails;
    }
    if (!thumbnails.length) {
      return newThumbnails;
    }

    let oldIndex = 0;
    let newIndex = 0;

    // is old immediately after new?
    if (newThumbnails[0].monoTime > thumbnails[thumbnails.length - 1]) {
      return thumbnails.concat(newThumbnails);
    }
    // is new immediately after old?
    if (newThumbnails[newThumbnails.length - 1] < thumbnails[0]) {
      return newThumbnails.concat(thumbnails);
    }
    let result = [];
    while (oldIndex < thumbnails.length && newIndex < newThumbnails.length) {
      if (thumbnails[oldIndex].monoTime < newThumbnails[newIndex].monoTime) {
        result.push(thumbnails[oldIndex]);
        oldIndex += 1;
      } else {
        result.push(newThumbnails[newIndex]);
        newIndex += 1;
      }
    }
    if (oldIndex < thumbnails.length) {
      result = result.concat(thumbnails.slice(oldIndex));
    } else if (newIndex < newThumbnails.length) {
      result = result.concat(newThumbnails.slice(newIndex));
    }

    return result;
  }

  cancelWorker(workerHash) {
    // actually don't...
    return;
    const currentWorkers = { ...this.state.currentWorkers };
    const { worker, part } = currentWorkers[workerHash];
    const loadingParts = this.state.loadingParts.filter((p) => p !== part);
    const loadedParts = this.state.loadedParts.filter((p) => p !== part);
    delete currentWorkers[workerHash];

    console.log('Stoping worker', workerHash, 'for part', part);
    worker.postMessage({
      action: 'terminate'
    });

    this.setState({
      currentWorkers,
      loadingParts,
      loadedParts
    });
  }

  spawnWorker(options) {
    let { currentParts, currentWorkers, loadingParts } = this.state;
    console.log('Checking worker for', currentParts);
    if (!this.state.isLoading) {
      this.setState({ isLoading: true });
    }
    if (loadingParts.length > 1) {
      // only 2 workers at a time pls
      return;
    }
    const [minPart, maxPart] = currentParts;

    // updated worker list (post canceling, and this time a copy)
    currentWorkers = { ...this.state.currentWorkers };

    const { loadedParts, currentPart } = this.state;

    let part = -1;
    const allWorkerParts = loadingParts.concat(loadedParts);

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
      console.log('Loading complete');
      this.setState({ isLoading: false });
      return;
    }
    console.log('Starting worker for part', part);
    // options is object of {part, prevMsgEntries, spawnWorkerHash, prepend}
    options = options || {};
    let { prevMsgEntries } = options;
    const prepend = false;

    const {
      dbc,
      dbcFilename,
      route,
      firstCanTime,
      canFrameOffset
    } = this.state;
    let { maxByteStateChangeCount } = this.state;

    if (!prevMsgEntries) {
      // we have previous messages loaded
      const { messages } = this.state;
      prevMsgEntries = {};
      Object.keys(messages).forEach((key) => {
        const { entries } = messages[key];
        prevMsgEntries[key] = entries[entries.length - 1];
      });
    }

    // var worker = new CanFetcher();
    const worker = new RLogDownloader();

    const spawnWorkerHash = hash(Math.random().toString(16));
    currentWorkers[spawnWorkerHash] = {
      part,
      worker
    };

    loadingParts = [part, ...loadingParts];

    this.setState({
      currentWorkers,
      loadingParts
    });

    worker.onmessage = (e) => {
      if (this.state.currentWorkers[spawnWorkerHash] === undefined) {
        console.log('Worker was canceled');
        return;
      }

      maxByteStateChangeCount = e.data.maxByteStateChangeCount;
      const {
        newMessages,
        newThumbnails,
        isFinished,
        routeInitTime,
        firstFrameTime,
      } = e.data;
      if (maxByteStateChangeCount > this.state.maxByteStateChangeCount) {
        this.setState({ maxByteStateChangeCount });
      } else {
        maxByteStateChangeCount = this.state.maxByteStateChangeCount;
      }
      if (routeInitTime !== this.state.routeInitTime) {
        this.setState({ routeInitTime });
      }
      if (firstFrameTime && firstFrameTime !== this.state.firstFrameTime) {
        this.setState({ firstFrameTime });
      }

      this.addMessagesToDataCache(part, newMessages, newThumbnails);

      // const messages = this.addAndRehydrateMessages(
      //   newMessages,
      //   maxByteStateChangeCount
      // );
      // const prevMsgEntries = {};
      // Object.keys(newMessages).forEach((key) => {
      //   prevMsgEntries[key] = newMessages[key].entries[newMessages[key].entries.length - 1];
      // });

      // const thumbnails = this.mergeThumbnails(newThumbnails);

      if (isFinished) {
        const loadingParts = this.state.loadingParts.filter((p) => p !== part);
        const loadedParts = [part, ...this.state.loadedParts];

        this.setState(
          {
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
            if (window.dataCallback) {
              window.dataCallback();
              window.dataCallback = null;
            }
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
      part,
      canStartTime: firstCanTime != null ? firstCanTime - canFrameOffset : null,
      prevMsgEntries,
      maxByteStateChangeCount
    });
  }

  addAndRehydrateMessages(newMessages, options) {
    // Adds new message entries to messages state
    // and "rehydrates" ES6 classes (message frame)
    // lost from JSON serialization in webworker data cloning.
    // handles merging the data in correct order
    options = options || {};

    const messages = { ...this.state.messages };

    Object.keys(newMessages).forEach((key) => {
      // add message
      if (options.replace !== true && key in messages) {
        // should merge here instead of concat
        // assumes messages are always sequential
        const msgEntries = messages[key].entries;
        const newMsgEntries = newMessages[key].entries;
        const msgLength = msgEntries.length;
        const newMsgLength = newMsgEntries.length;
        const entryLength = msgLength + newMsgLength;
        messages[key] = {
          ...messages[key],
          entries: Array(entryLength)
        };

        let msgIndex = 0;
        let newMsgIndex = 0;

        for (let i = 0; i < entryLength; ++i) {
          if (newMsgIndex >= newMsgLength) {
            messages[key].entries[i] = msgEntries[msgIndex];
            msgIndex += 1;
          } else if (msgIndex >= msgLength) {
            messages[key].entries[i] = newMsgEntries[newMsgIndex];
            newMsgIndex += 1;
          } else if (
            msgEntries[msgIndex].relTime <= newMsgEntries[newMsgIndex].relTime
          ) {
            messages[key].entries[i] = msgEntries[msgIndex];
            msgIndex += 1;
          } else if (
            msgEntries[msgIndex].relTime >= newMsgEntries[newMsgIndex].relTime
          ) {
            messages[key].entries[i] = newMsgEntries[newMsgIndex];
            newMsgIndex += 1;
          }
        }
        messages[key].byteStateChangeCounts = newMessages[key].byteStateChangeCounts;
      } else {
        messages[key] = newMessages[key];
        messages[key].frame = this.state.dbc.getMessageFrame(
          messages[key].address
        );
      }
    });

    const maxByteStateChangeCount = DbcUtils.findMaxByteStateChangeCount(
      messages
    );
    this.setState({
      maxByteStateChangeCount
    });

    Object.keys(messages).forEach((key) => {
      // console.log(key);
      messages[key] = DbcUtils.setMessageByteColors(
        messages[key],
        maxByteStateChangeCount
      );
    });

    return messages;
  }

  async addMessagesToDataCache(part, newMessages, newThumbnails) {
    const { dbc, currentParts } = this.state;
    const entry = await this.getParseSegment(part);
    if (!entry) {
      // first chunk of data returned from this segment
      Object.keys(newMessages).forEach((key) => {
        newMessages[key] = this.parseMessageEntry(newMessages[key], dbc);
      });
      dataCache[part] = {
        messages: newMessages,
        thumbnails: newThumbnails,
        lastUpdated: Date.now(),
        lastUsed: Date.now()
      };
      if (part >= currentParts[0] && part <= currentParts[1]) {
        this.setState({
          messages: this.addAndRehydrateMessages(newMessages)
        });
      }
      return;
    }

    entry.lastUsed = Date.now();

    // data is always append only, and always per segment
    Object.keys(newMessages).forEach((key) => {
      let msgs = newMessages[key];
      if (!dataCache[part].messages[key]) {
        msgs = this.parseMessageEntry(msgs, dbc);
        dataCache[part].messages[key] = msgs;
      } else {
        let { entries } = dataCache[part].messages[key];
        const lastEntry = entries.length ? entries[entries.length - 1] : null;
        msgs = this.parseMessageEntry(msgs, dbc, lastEntry);
        entries = entries.concat(msgs.entries);
        dataCache[part].messages[key].entries = entries;
      }
      newMessages[key] = msgs;
    });
    dataCache[part].thumbnails = dataCache[part].thumbnails.concat(newThumbnails);

    if (part >= currentParts[0] && part <= currentParts[1]) {
      this.setState({
        messages: this.addAndRehydrateMessages(newMessages)
      });
    }
  }

  async loadMessagesFromCache() {
    // create a new messages object for state
    if (this.loadMessagesFromCacheRunning) {
      if (!this.loadMessagesFromCacheTimer) {
        this.loadMessagesFromCacheTimer = timeout(() => this.loadMessagesFromCache(), 10);
      }
      return;
    }
    this.loadMessagesFromCacheRunning = true;
    if (this.loadMessagesFromCacheTimer) {
      this.loadMessagesFromCacheTimer();
      this.loadMessagesFromCacheTimer = null;
    }
    const { currentParts, dbc } = this.state;
    const { lastUpdated } = dbc;
    const [minPart, maxPart] = currentParts;
    const messages = {};
    let thumbnails = [];
    let isCanceled = false;

    let start = performance.now();

    const promises = [];

    for (let i = minPart, l = maxPart; i <= l; ++i) {
      promises.push(this.getParseSegment(i));
    }
    await promises.reduce(async (prev, p) => {
      await prev;
      if (isCanceled) {
        return;
      }
      const cacheEntry = await p;
      if (this.state.dbc.lastUpdated !== lastUpdated) {
        if (!isCanceled) {
          isCanceled = true;
          this.loadMessagesFromCacheRunning = false;
          console.log('Canceling!');
          this.loadMessagesFromCache();
        }
        return;
      }
      if (cacheEntry) {
        const newMessages = cacheEntry.messages;
        thumbnails = thumbnails.concat(cacheEntry.thumbnails);
        Object.keys(newMessages).forEach((key) => {
          if (!messages[key]) {
            messages[key] = { ...newMessages[key] };
          } else {
            const newMessageEntries = newMessages[key].entries;
            const messageEntries = messages[key].entries;
            if (newMessageEntries.length
              && newMessageEntries[0].relTime < messageEntries[messageEntries.length - 1].relTime) {
              console.error('Found out of order messages', newMessageEntries[0], messageEntries[messageEntries.length - 1]);
            }
            messages[key].entries = messages[key].entries.concat(newMessages[key].entries);
          }
        });
      }
      console.log('Done with', performance.now() - start);
      start = performance.now();
    }, Promise.resolve());

    if (isCanceled) {
      return;
    }

    Object.keys(this.state.messages).forEach((key) => {
      if (!messages[key]) {
        messages[key] = this.state.messages[key];
        messages[key].entries = [];
      }
    });

    Object.keys(messages).forEach((key) => {
      messages[key].frame = dbc.getMessageFrame(
        messages[key].address
      );
    });

    const maxByteStateChangeCount = DbcUtils.findMaxByteStateChangeCount(
      messages
    );

    this.setState({
      maxByteStateChangeCount
    });

    Object.keys(messages).forEach((key) => {
      // console.log(key);
      messages[key] = DbcUtils.setMessageByteColors(
        messages[key],
        maxByteStateChangeCount
      );
    });

    console.log('Done with old messages', performance.now() - start);

    this.setState({ messages, thumbnails });

    this.loadMessagesFromCacheRunning = false;
  }

  async getParseSegment(part) {
    if (!dataCache[part]) {
      return null;
    }
    if (dataCache[part].promise) {
      await dataCache[part].promise;
    }
    dataCache[part].promise = this.getParseSegmentInternal(part);

    return dataCache[part].promise;
  }

  async getParseSegmentInternal(part) {
    const start = performance.now();
    const { dbc } = this.state;
    if (!dbc.lastUpdated) {
      dbc.lastUpdated = Date.now();
    }
    const { lastUpdated } = dbc;
    let { messages } = dataCache[part];

    let reparseMessages = {};

    // if (lastUpdated > dataCache[part].lastUpdated) {
    //   dataCache[part].lastUpdated = Date.now();
    //   return await this.reparseMessages(messages);
    // }

    Object.keys(messages).forEach((key) => {
      if (messages[key].lastUpdated >= lastUpdated) {
        return;
      }
      reparseMessages[key] = messages[key];
    });

    if (Object.keys(reparseMessages).length) {
      console.log('Reparsing messages!', Object.keys(reparseMessages).length);
      reparseMessages = await this.reparseMessages(reparseMessages);
    }

    messages = {
      ...messages,
      ...reparseMessages
    };

    dataCache[part].messages = messages;

    const end = performance.now();
    if (end - start > 200) {
      // warn about anything over 200ms
      console.warn('getParseSegment took', part, end - start, Object.keys(messages).length);
    }

    return dataCache[part];
  }

  decacheMessageId(messageId) {
    Object.keys(dataCache).forEach((part) => {
      if (dataCache[part].messages[messageId]) {
        dataCache[part].messages[messageId].lastUpdated = 0;
      }
    });
  }

  async reparseMessages(_messages) {
    const messages = _messages;
    const { dbc } = this.state;
    dbc.lastUpdated = dbc.lastUpdated || Date.now();

    Object.keys(messages).forEach((key) => {
      messages[key].frame = dbc.getMessageFrame(messages[key].address);
    });

    return new Promise((resolve, reject) => {
      const worker = new MessageParser();
      worker.onmessage = (e) => {
        const newMessages = e.data.messages;
        Object.keys(newMessages).forEach((key) => {
          newMessages[key].lastUpdated = dbc.lastUpdated;
          newMessages[key].frame = dbc.getMessageFrame(newMessages[key].address);
        });
        resolve(newMessages);
      };

      worker.postMessage({
        messages,
        dbcText: dbc.text(),
        canStartTime: this.state.firstCanTime
      });
    });
  }

  parseMessageEntry(_entry, dbc, lastMsg) {
    const entry = _entry;
    dbc.lastUpdated = dbc.lastUpdated || Date.now();
    entry.lastUpdated = dbc.lastUpdated;
    entry.frame = dbc.getMessageFrame(
      entry.address
    );

    let prevMsgEntry = lastMsg || null;
    const byteStateChangeCounts = [];
    // entry.messages[id].byteStateChangeCounts = byteStateChangeCounts.map(
    //   (count, idx) => entry.messages[id].byteStateChangeCounts[idx] + count
    // );
    entry.entries = entry.entries.map((message) => {
      if (message.hexData) {
        prevMsgEntry = DbcUtils.reparseMessage(dbc, message, prevMsgEntry);
      } else {
        prevMsgEntry = DbcUtils.parseMessage(
          dbc,
          message.time,
          message.address,
          message.data,
          message.timeStart,
          prevMsgEntry
        );
      }
      byteStateChangeCounts.push(prevMsgEntry.byteStateChangeCounts);
      prevMsgEntry = prevMsgEntry.msgEntry;
      return prevMsgEntry;
    });
    entry.byteStateChangeCounts = byteStateChangeCounts.reduce((memo, val) => {
      if (!memo) {
        return val;
      }
      return memo.map((count, idx) => val[idx] + count);
    }, null);

    return entry;
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
      showOnboarding
      || showLoadDbc
      || showSaveDbc
      || showAddSignal
      || showEditMessageModal
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
      persistDbc('live', { dbcFilename, dbc });
    }

    this.loadMessagesFromCache();
  }

  onConfirmedSignalChange(message, signals) {
    const { dbc, dbcFilename } = this.state;
    dbc.setSignals(message.address, { ...signals });

    this.persistDbc({ dbcFilename, dbc });

    this.updateMessageFrame(message.id, dbc.getMessageFrame(message.address));

    this.setState({ dbc, dbcText: dbc.text() }, () => {
      this.decacheMessageId(message.id);
      this.loadMessagesFromCache();
    });
  }

  partChangeDebounced = debounce(() => {
    this.loadMessagesFromCache();

    this.spawnWorker();
  }, 500);

  onPartChange(part) {
    let {
      currentParts, currentPart, canFrameOffset, route
    } = this.state;
    if (canFrameOffset === -1 || part === currentPart) {
      return;
    }

    // determine new parts to load, whether to prepend or append
    let maxPart = Math.min(route.proclog, part + 1);
    const minPart = Math.max(0, maxPart - PART_SEGMENT_LENGTH + 1);
    if (minPart === 0) {
      maxPart = Math.min(route.proclog, 2);
    }
    const currentPartSpan = currentParts[1] - currentParts[0] + 1;

    // update current parts
    currentParts = [minPart, maxPart];
    currentPart = part;

    if (
      currentPart !== this.state.currentPart
      || currentParts[0] !== this.state.currentParts[0]
      || currentParts[1] !== this.state.currentParts[1]
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
    const {
      messages, dbcFilename, dbc, editMessageModalMessage
    } = this.state;

    const message = { ...messages[editMessageModalMessage] };
    message.frame = messageFrame;
    dbc.messages.set(messageFrame.id, messageFrame);
    this.persistDbc({ dbcFilename, dbc });

    messages[editMessageModalMessage] = message;
    this.setState({ messages, dbc, dbcText: dbc.text() });
    this.hideEditMessageModal();
  }

  onSeek(seekIndex, seekTime) {
    this.setState({ seekIndex, seekTime });

    const { currentPart } = this.state;
    const part = ~~(seekTime / 60);
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
      seekIndex = msg.entries.findIndex((e) => e.relTime >= seekTime);
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
      seekIndex = msg.entries.findIndex((e) => e.relTime >= seekTime);
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
          route && route.fullname ? route.fullname : ''
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
    const messageIds = Object.keys(messages);
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
      selectedMessages.length > 0
      && messages[selectedMessages[0]] !== undefined
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

    const persistedDbc = fetchPersistedDbc('live');
    if (persistedDbc) {
      const { dbc, dbcText } = persistedDbc;
      this.setState({ dbc, dbcText });
    }
    this.canStreamerWorker = new CanStreamerWorker();
    this.canStreamerWorker.onmessage = this.onStreamedCanMessagesProcessed;

    // if any errors go off during connection, mark as not trying to connect anymore...
    const unlisten = this.pandaReader.onError((err) => {
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
    const {
      route,
      messages,
      selectedMessages,
      currentParts,
      dbcFilename,
      dbcLastSaved,
      seekTime,
      seekIndex,
      shareUrl,
      maxByteStateChangeCount,
      live,
      thumbnails,
      selectedMessage,
      canFrameOffset,
      firstCanTime,
      currentPart,
      partsLoaded
    } = this.state;

    const { startTime, segments } = this.props;

    return (
      <div
        id="cabana"
        className={cx({ 'is-showing-modal': this.showingModal() })}
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
            url={this.state.route ? route.url : null}
            messages={messages}
            selectedMessages={selectedMessages}
            updateSelectedMessages={this.updateSelectedMessages}
            showEditMessageModal={this.showEditMessageModal}
            currentParts={currentParts}
            onMessageSelected={this.onMessageSelected}
            onMessageUnselected={this.onMessageUnselected}
            showLoadDbc={this.showLoadDbc}
            showSaveDbc={this.showSaveDbc}
            dbcFilename={dbcFilename}
            dbcLastSaved={dbcLastSaved}
            dongleId={this.props.dongleId}
            name={this.props.name}
            route={route}
            seekTime={seekTime}
            seekIndex={seekIndex}
            shareUrl={shareUrl}
            maxByteStateChangeCount={maxByteStateChangeCount}
            isDemo={this.props.isDemo}
            live={live}
            saveLog={debounce(this.downloadLogAsCSV, 500)}
          />
          {route || live ? (
            <Explorer
              url={route ? route.url : null}
              live={live}
              messages={messages}
              thumbnails={thumbnails}
              selectedMessage={selectedMessage}
              onConfirmedSignalChange={this.onConfirmedSignalChange}
              onSeek={this.onSeek}
              onUserSeek={this.onUserSeek}
              canFrameOffset={canFrameOffset}
              firstCanTime={firstCanTime}
              seekTime={seekTime}
              startTime={startTime}
              startSegments={segments}
              seekIndex={seekIndex}
              currentParts={currentParts}
              selectedPart={currentPart}
              partsLoaded={partsLoaded}
              autoplay={this.props.autoplay}
              showEditMessageModal={this.showEditMessageModal}
              onPartChange={this.onPartChange}
              routeStartTime={
                route ? route.start_time : Moment()
              }
              videoOffset={ (this.state.firstFrameTime && this.state.routeInitTime) ? this.state.firstFrameTime - this.state.routeInitTime : 0 }
              partsCount={route ? route.proclog : 0}
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

CanExplorer.propTypes = {
  dongleId: PropTypes.string,
  name: PropTypes.string,
  dbc: PropTypes.instanceOf(DBC),
  dbcFilename: PropTypes.string,
  githubAuthToken: PropTypes.string,
  autoplay: PropTypes.bool,
  max: PropTypes.number,
  url: PropTypes.string,
  startTime: PropTypes.number,
  segments: PropTypes.array
};
