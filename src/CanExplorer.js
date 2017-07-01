import React, { Component } from 'react';
import { css, StyleSheet } from 'aphrodite/no-important';
import Moment from 'moment';
import PropTypes from 'prop-types';

import {USE_UNLOGGER} from './config';
import * as GithubAuth from './api/github-auth';
import DBC from './models/can/dbc';
import Meta from './components/meta';
import Explorer from './components/explorer';
import * as Routes from './api/routes';
import SaveDbcModal from './components/SaveDbcModal';
import LoadDbcModal from './components/LoadDbcModal';
const CanFetcher = require('./workers/can-fetcher.worker.js');
const MessageParser = require("./workers/message-parser.worker.js");
const CanOffsetFinder = require('./workers/can-offset-finder.worker.js');
import debounce from './utils/debounce';
import EditMessageModal from './components/EditMessageModal';
import LoadingBar from './components/LoadingBar';
import {persistDbc} from './api/localstorage';
import OpenDbc from './api/opendbc';
import UnloggerClient from './api/unlogger';

export default class CanExplorer extends Component {
    static propTypes = {
        dongleId: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        dbc: PropTypes.instanceOf(DBC),
        dbcFilename: PropTypes.string,
        githubAuthToken: PropTypes.string
    };

    constructor(props) {
        super(props);
        this.state = {
            messages: {},
            route: {},
            canFrameOffset: -1,
            firstCanTime: null,
            selectedMessage: null,
            currentParts: [0,0],
            showLoadDbc: false,
            showSaveDbc: false,
            showEditMessageModal: false,
            editMessageModalMessage: null,
            dbc: new DBC(),
            dbcFilename: 'New_DBC',
            dbcLastSaved: null,
            seekTime: 0,
            seekIndex: 0,
            maxByteStateChangeCount: 0,
            isLoading: true,
            partsLoaded: 0,
        };
        this.openDbcClient = new OpenDbc(props.githubAuthToken);
        if(USE_UNLOGGER) {
          this.unloggerClient = new UnloggerClient();
        }

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
    }

    componentWillMount() {
      const {dongleId, name} = this.props;
      Routes.fetchRoutes(dongleId).then((routes) => {
        if(routes) {
          const route = routes[name];

          const newState = {route, currentParts: [0, Math.min(route.proclog - 1, 2)]};
          if(this.props.dbc !== undefined) {
            newState.dbc = this.props.dbc;
            newState.dbcFilename = this.props.dbcFilename;
          }
          this.setState(newState, this.initCanData);
        }
      });
    }

    initCanData() {
      const {route} = this.state;

      const offsetFinder = new CanOffsetFinder();
      offsetFinder.postMessage({partCount: route.proclog,
                                base: route.url});

      offsetFinder.onmessage = (e) => {
        const {canFrameOffset, firstCanTime} = e.data;

        this.setState({canFrameOffset, firstCanTime}, () => {
          this.spawnWorker(this.state.currentParts);
        });
      };
    }

    onDbcSelected(dbcFilename, dbc) {
      const {route} = this.state;
      this.hideLoadDbc();
      persistDbc(route.fullname,
                 {dbcFilename, dbc});
      this.setState({dbc,
                     dbcFilename,
                     partsLoaded: 0,
                     selectedMessage: null,
                     messages: {}}, () => {
        const {route} = this.state;

        // Pass DBC text to webworker b/c can't pass instance of es6 class
        this.spawnWorker(this.state.currentParts);
      });
    }

    onDbcSaved(dbcFilename) {
      const dbcLastSaved = Moment();
      this.setState({dbcLastSaved, dbcFilename})
      this.hideSaveDbc();
    }

    spawnWorker(parts, part, prevMsgEntries) {
      if(!this.state.isLoading) {
        this.setState({isLoading: true});
      }
      const [minPart, maxPart] = parts;
      if(part === undefined) {
        part = minPart;
      }
      if(part === minPart) {
        this.setState({partsLoaded: 0});
      }
      if(prevMsgEntries === undefined) {
        prevMsgEntries = {};
      }

      const {dbc, dbcFilename, route, firstCanTime} = this.state;
      var worker = new CanFetcher();

      worker.onmessage = (e) => {
        if(JSON.stringify(parts) != JSON.stringify(this.state.currentParts)) {
          // Parts changed, stop spawning workers.
          return;
        }

        const {messages} = this.state;
        if(this.state.dbcFilename != dbcFilename) {
          // DBC changed while this worker was running
          // -- don't update messages and halt recursion.
          return;
        }

        const {newMessages, maxByteStateChangeCount} = e.data;
        if(maxByteStateChangeCount > this.state.maxByteStateChangeCount) {
          this.setState({maxByteStateChangeCount});
        }

        for(var key in newMessages) {
          if (key in messages) {
            messages[key].entries = messages[key].entries.concat(newMessages[key].entries);
          } else {
            messages[key] = newMessages[key];
            messages[key].signals = this.state.dbc.getSignals(messages[key].address);
            messages[key].frame = this.state.dbc.messages.get(messages[key].address);
          }
        }

        const prevMsgEntries = {};
        for(let key in newMessages) {
          const msg = newMessages[key];
          prevMsgEntries[key] = msg.entries[msg.entries.length - 1];
        }

        this.setState({messages,
                       partsLoaded: this.state.partsLoaded + 1}, () => {
          if(part < maxPart) {
            this.spawnWorker(parts, part + 1, prevMsgEntries);
          } else {
            this.setState({isLoading: false});
          }
        })
      }

      worker.postMessage({dbcText: dbc.text(),
                          base: route.url,
                          num: part,
                          canStartTime: firstCanTime,
                          prevMsgEntries
                        });
    }

    showLoadDbc() {
      this.setState({showLoadDbc: true});
      document.body.style.overflow = 'hidden';
    }

    hideLoadDbc() {
      this.setState({showLoadDbc: false});
      document.body.style.overflow = '';
    }

    showSaveDbc() {
      this.setState({showSaveDbc: true})
      document.body.style.overflow = 'hidden';
    }

    hideSaveDbc() {
      this.setState({showSaveDbc: false})
      document.body.style.overflow = '';
    }

    onConfirmedSignalChange(message) {
      const signals = message.signals;
      const {dbc, dbcFilename, route} = this.state;

      dbc.setSignals(message.address, message.signals);
      persistDbc(route.fullname,
                 {dbcFilename, dbc});

      this.setState({dbc, isLoading: true});

      var worker = new MessageParser();
      worker.onmessage = (e) => {
        const newMessage = e.data;
        newMessage.signals = dbc.getSignals(newMessage.address);
        newMessage.frame = dbc.messages.get(newMessage.address);

        const messages = {};
        Object.assign(messages, this.state.messages);
        messages[message.id] = newMessage;
        this.setState({messages, isLoading: false})
      }

      worker.postMessage({message,
                          dbcText: dbc.text(),
                          canStartTime: this.state.firstCanTime});
    }

    onPartChange = debounce((part) => {
      let {currentParts} = this.state;

      const currentPartSpan = currentParts[1] - currentParts[0] + 1;
      currentParts = [part, part + currentPartSpan - 1];

      this.setState({currentParts, selectedMessage: null, messages: {}}, () => {
        this.spawnWorker(currentParts);
      });
    }, 500);

    showEditMessageModal(msgKey) {
      const msg = this.state.messages[msgKey];
      if(!msg.frame) {
        msg.frame = this.state.dbc.createFrame(msg.address);
      }


      this.setState({showEditMessageModal: true,
                     editMessageModalMessage: msgKey,
                     messages: this.state.messages});
    }

    hideEditMessageModal() {
      this.setState({showEditMessageModal: false});
    }

    onMessageFrameEdited(messageFrame) {
      const {messages,
             route,
             dbcFilename,
             dbc,
             editMessageModalMessage} = this.state;

      const message = Object.assign({}, messages[editMessageModalMessage]);
      message.frame = messageFrame;
      dbc.messages.set(messageFrame.address, messageFrame);
      persistDbc(route.fullname,
                 {dbcFilename, dbc});

      messages[editMessageModalMessage] = message;
      this.setState({messages});
      this.hideEditMessageModal();
    }

    onSeek(seekIndex, seekTime) {
      this.setState({seekIndex, seekTime});
    }

    onUserSeek(seekTime) {
      if(USE_UNLOGGER) {
        this.unloggerClient.seek(this.props.dongleId, this.props.name, seekTime);
      }
    }

    onMessageSelected(msgKey) {
      let {seekTime, seekIndex, messages} = this.state;
      const msg = messages[msgKey];

      if(seekTime > 0) {
          seekIndex = msg.entries.findIndex((e) => e.relTime >= seekTime);
          if(seekIndex === -1) {
              seekIndex = 0;
          }

          seekTime = msg.entries[seekIndex].relTime;
      }

      this.setState({seekTime, seekIndex, selectedMessage: msgKey});
    }

    onMessageUnselected(msgKey) {
      this.setState({selectedMessage: null});
    }

    loginWithGithub() {
      return <a href={GithubAuth.authorizeUrl(this.state.route.fullname || '')}>Log in with Github</a>
    }

    render() {
        return (<div className={css(Styles.root)}>
                    {this.state.isLoading ?
                      <LoadingBar
                        isLoading={this.state.isLoading}
                      /> : null}
                    <div className={css(Styles.content)}>
                      <Meta url={this.state.route.url}
                            messages={this.state.messages}
                            currentParts={this.state.currentParts}
                            partsCount={this.state.route.proclog || 0}
                            onMessageSelected={this.onMessageSelected}
                            onMessageUnselected={this.onMessageUnselected}
                            showLoadDbc={this.showLoadDbc}
                            showSaveDbc={this.showSaveDbc}
                            dbcFilename={this.state.dbcFilename}
                            dbcLastSaved={this.state.dbcLastSaved}
                            onPartChange={this.onPartChange}
                            showEditMessageModal={this.showEditMessageModal}
                            dongleId={this.props.dongleId}
                            name={this.props.name}
                            route={this.state.route}
                            seekTime={this.state.seekTime}
                            maxByteStateChangeCount={this.state.maxByteStateChangeCount}
                            githubAuthToken={this.props.githubAuthToken}
                            loginWithGithub={this.loginWithGithub()}
                      />
                      <div className={css(Styles.right)}>
                          {this.state.route.url ?
                            <Explorer
                                url={this.state.route.url}
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
                                 />
                                : null}
                      </div>
                    </div>

                    {this.state.showLoadDbc ? <LoadDbcModal
                                                onDbcSelected={this.onDbcSelected}
                                                onCancel={this.hideLoadDbc}
                                                openDbcClient={this.openDbcClient}
                                                loginWithGithub={this.loginWithGithub()}
                                                 /> : null}
                    {this.state.showSaveDbc ? <SaveDbcModal
                                                dbc={this.state.dbc}
                                                sourceDbcFilename={this.state.dbcFilename}
                                                onDbcSaved={this.onDbcSaved}
                                                onCancel={this.hideSaveDbc}
                                                openDbcClient={this.openDbcClient}
                                                hasGithubAuth={this.props.githubAuthToken !== null}
                                                loginWithGithub={this.loginWithGithub()} /> : null}
                    {this.state.showEditMessageModal ?
                      <EditMessageModal
                        onCancel={this.hideEditMessageModal}
                        onMessageFrameEdited={this.onMessageFrameEdited}
                        message={this.state.messages[this.state.editMessageModalMessage]} /> : null}
                </div>);
    }
}

const Styles = StyleSheet.create({
    root: {
      height: '100%',
    },
    content: {
      flexDirection: 'row',
      display: 'flex',
      fontFamily: `apple-system, BlinkMacSystemFont,
                   "Segoe UI", "Roboto", "Oxygen",
                   "Ubuntu", "Cantarell", "Fira Sans",
                   "Droid Sans", "Helvetica Neue", sans-serif`,
      height: '100%'
    },
    right: {
      flex: 8,
    }
});
