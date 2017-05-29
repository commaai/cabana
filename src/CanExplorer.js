import React, { Component } from 'react';

import { css, StyleSheet } from 'aphrodite/no-important';

import Meta from './components/meta';
import Explorer from './components/explorer';
import NumpyLoader from './utils/loadnpy';
import CivicDbc from './civic-dbc'
import {uint64BEToHex} from './models/can-msg-fmt';

const Int64LE = require('int64-buffer').Int64LE

export default class CanExplorer extends Component {
    static propTypes = {
        url: React.PropTypes.string,
        max: React.PropTypes.number,
    };

    constructor(props) {
        super(props);
        this.state = {
            messages: {},
            selectedMessage: null,
        };

        this.loadCanPart = this.loadCanPart.bind(this);
    }

    parseMessage(time, address, data) {
      return {time: time,
              hexData: Buffer.from(data).toString('hex'),
              signals: CivicDbc.getSignalValues(address, data)}
    }

    createMessageSpec(address, id, bus) {
      return {name: CivicDbc.getMessageName(address),
              address: address,
              id: id,
              bus: bus,
              signalSpecs: CivicDbc.getSignalSpecs(address),
              entries: []}
    }

    loadCanPart(base, num, messages) {
        var urls = [  base+"/Log/"+num+"/can/t",
                      base+"/Log/"+num+"/can/src",
                      base+"/Log/"+num+"/can/address",
                      base+"/Log/"+num+"/can/data"];

        return new Promise((resolve) => {
          Promise.all(urls.map(NumpyLoader.promise)).then((da) => {
              for (var i = 0; i < da[0].data.length; i++) {
                   var t = da[0].data[i];
                   var src = Int64LE(da[1].data, i*8).toString(10);
                   var address = Int64LE(da[2].data, i*8);
                   var addressHexStr = address.toString(16);
                   var id = src + ":" + addressHexStr;

                   var addressNum = address.toNumber();
                   var data = da[3].data.slice(i*8, (i+1)*8);
                   if (messages[id] === undefined) messages[id] = this.createMessageSpec(address.toNumber(), id, src);
                   const msg = this.parseMessage(t, address.toNumber(), data);

                   messages[id].entries.push(msg);
              }
              resolve(messages)
          })
        })
    }

    fetchLocalMessages() {
      fetch('http://127.0.0.1:8000/src/dev-data/civic-messages.json').then((resp) => {
        resp.json().then((messages) => {
          Object.keys(messages).forEach((key) => {
            const msg = messages[key];

            msg['id'] = msg.bus + ':' + msg.address.toString(16)
            messages[key] = msg;
          });
          this.setState({messages});
        })
      })
    }
    componentWillMount() {
      this.fetchLocalMessages();
        // This is currently way too slow. working with pre-processed CAN (see above)
        // to build out frontend before handling perf issues.

        // const messages = {};
        // let promise = new Promise((resolve, reject) => {resolve({})});
        // for(var i = 2; i <= 3; i++) {
        //     console.log(i);
        //     promise = promise.then((partialMessages) => {
        //       for(var id in partialMessages) {
        //         if(messages[id] === undefined) messages[id] = partialMessages[id];
        //         messages[id].entries = messages[id].entries.concat(partialMessages[id].entries);
        //       }

        //       this.setState({messages})
        //       console.log(messages)
        //       return this.loadCanPart(this.props.url, i, messages)
        //     });
        // }
    }

    render() {
        return (<div className={css(Styles.root)}>
                    <Meta url={this.props.url}
                          messages={this.state.messages}
                          onMessageSelected={(msg) => {this.setState({selectedMessage: msg})}} />
                    <Explorer
                          url={this.props.url}
                          messages={this.state.messages}
                          selectedMessage={this.state.selectedMessage} />
                </div>)
    }
}

const Styles = StyleSheet.create({
    root: {
        flexDirection: 'row',
        display: 'flex',
    }
});
