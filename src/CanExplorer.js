import React, { Component } from 'react';
import { css, StyleSheet } from 'aphrodite/no-important';
import Moment from 'moment';
import PropTypes from 'prop-types';

import DBC from './models/can/dbc';
import Meta from './components/meta';
import Explorer from './components/explorer';
import * as Routes from './api/routes';
import SaveDbcModal from './components/SaveDbcModal';
import LoadDbcModal from './components/LoadDbcModal';
const CanFetcher = require('./workers/can-fetcher.worker.js');
const MessageParser = require("./workers/message-parser.worker.js");

export default class CanExplorer extends Component {
    static propTypes = {
        dongleId: PropTypes.string,
        routeName: PropTypes.string,
        dbc: PropTypes.instanceOf(DBC)
    };

    constructor(props) {
        super(props);
        this.state = {
            messages: {},
            route: {},
            canFrameOffset: -1,
            firstCanTime: null,
            selectedMessage: null,
            partsLoaded: 0,
            showLoadDbc: false,
            showSaveDbc: false,
            dbc: null,
            dbcFilename: null,
            dbcLastSaved: null
        };

        this.showLoadDbc = this.showLoadDbc.bind(this);
        this.hideLoadDbc = this.hideLoadDbc.bind(this);
        this.showSaveDbc = this.showSaveDbc.bind(this);
        this.hideSaveDbc = this.hideSaveDbc.bind(this);

        this.onDbcSelected = this.onDbcSelected.bind(this);
        this.onDbcSaved = this.onDbcSaved.bind(this);
        this.onConfirmedSignalChange = this.onConfirmedSignalChange.bind(this);
    }

    componentWillMount() {
      const {dongleId, name} = this.props;
      Routes.fetchRoutes(dongleId).then((routes) => {
        if(routes) {
          const route = routes[name];

          if(this.props.dbc !== undefined) {
            this.setState({dbc: this.props.dbc, dbcFilename: 'acura_ilx_2016.dbc', route}, () => {
              this.spawnWorker(0, 4)
            });
          }
          this.setState({route})
        }
      })
    }

    onDbcSelected(filename, dbcInstance) {
      this.hideLoadDbc();
      this.setState({dbc: dbcInstance, dbcFilename: filename}, () => {
        const {route} = this.state;

        // Pass DBC text to webworker b/c can't pass instance of es6 class
        this.spawnWorker(0, 4);
      });
    }

    onDbcSaved(dbcFilename) {
      const dbcLastSaved = Moment();
      this.setState({dbcLastSaved, dbcFilename})
      this.hideSaveDbc();
    }

    updateCanFrameOffset(firstCanPart, firstCanPartEntries) {
      /*
      firstCanPart is >= 0
      firstCanPartEntries is an array of entries
      */
      const firstCanTime = firstCanPartEntries[0].time;
      const firstPartLastCanTime = firstCanPartEntries[firstCanPartEntries.length - 1].time;

      const canFrameOffsetFloat = (60 * firstCanPart
        - (60 - (firstPartLastCanTime - firstCanTime)));
      const canFrameOffset = Math.round(canFrameOffsetFloat);

      this.setState({canFrameOffset, firstCanTime});
    }

    earliestCanEntries(messages) {
      const messagesSortedByStartTime = Object.values(messages).sort(
        (msg1, msg2) => {
          const firstMessageFirstTime = msg1.entries[0].time;
          const secondMessageFirstTime = msg2.entries[0].time;
          if(firstMessageFirstTime < secondMessageFirstTime) {
            return -1;
          } else if(firstMessageFirstTime === secondMessageFirstTime) {
            return 0;
          } else {
            return 1;
          }
      });

      return messagesSortedByStartTime[0].entries;
    }

    spawnWorker(part, max) {
      var worker = new CanFetcher();

      worker.onmessage = (e) => {
        const {messages} = this.state;
        // Ensure signal consistency with DBC state.
        // possible that during worker run, local DBC changed
        // so we might have to re-parse the part.

        const newMessages = e.data;
        for(var key in newMessages) {
          if (key in messages) {
            messages[key].entries = messages[key].entries.concat(newMessages[key].entries);
          } else {
            messages[key] = newMessages[key];
            messages[key].signals = this.state.dbc.getSignals(messages[key].address);
          }
        }

        if(Object.keys(newMessages).length > 0 && this.state.canFrameOffset < 0) {
          // this part has messages, and we haven't encountered a can part yet
          this.updateCanFrameOffset(part, this.earliestCanEntries(newMessages));
        }
        this.setState({messages,
                       partsLoaded: this.state.partsLoaded + 1}, () => {
          if(part < max) {
            this.spawnWorker(part + 1, max);
          }
        })
      }

      worker.postMessage({dbcText: this.state.dbc.text(),
                          base: this.state.route.url,
                          num: part,
                          canStartTime: this.state.firstCanTime});
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
      const {dbc} = this.state;

      dbc.setSignals(message.address, message.signals);
      this.setState({dbc});

      var worker = new MessageParser();
      worker.onmessage = (e) => {
        const newMessage = e.data;
        newMessage.signals = dbc.getSignals(newMessage.address);

        const messages = {};
        Object.assign(messages, this.state.messages);
        messages[message.id] = newMessage;
        this.setState({messages})
      }

      worker.postMessage({message,
                          dbcText: dbc.text(),
                          canStartTime: this.state.firstCanTime});
    }

    render() {
        return (<div className={css(Styles.root)}>
                    <Meta url={this.state.route.url}
                          messages={this.state.messages}
                          partsLoaded={this.state.partsLoaded}
                          partsCount={this.state.route ? this.state.route.proclog : 0}
                          onMessageSelected={(msg) => {this.setState({selectedMessage: msg})}}
                          showLoadDbc={this.showLoadDbc}
                          showSaveDbc={this.showSaveDbc}
                          dbcFilename={this.state.dbcFilename}
                          dbcLastSaved={this.state.dbcLastSaved} />
                    {Object.keys(this.state.messages).length > 0 ?
                      <Explorer
                          url={this.state.route.url}
                          messages={this.state.messages}
                          selectedMessage={this.state.selectedMessage}
                          partsLoaded={this.state.partsLoaded}
                          onConfirmedSignalChange={this.onConfirmedSignalChange}
                          canFrameOffset={this.state.canFrameOffset}
                          firstCanTime={this.state.firstCanTime} /> : null}

                    {this.state.showLoadDbc ? <LoadDbcModal
                                                onDbcSelected={this.onDbcSelected}
                                                onCancel={this.hideLoadDbc} /> : null}
                    {this.state.showSaveDbc ? <SaveDbcModal
                                                dbc={this.state.dbc}
                                                sourceDbcFilename={this.state.dbcFilename}
                                                onDbcSaved={this.onDbcSaved}
                                                onCancel={this.hideSaveDbc} /> : null}
                </div>);
    }
}

const Styles = StyleSheet.create({
    root: {
        flexDirection: 'row',
        display: 'flex',
    }
});
