import React, {Component} from 'react';
import PropTypes from 'prop-types';
import ReactList from 'react-list';
import Measure from 'react-measure';

import { StyleSheet, css } from 'aphrodite/no-important';
import { formatMsgDec, formatMsgHex } from '../models/can-msg-fmt';

export default class CanLog extends Component {
    static ITEMS_PER_PAGE = 50;

    static propTypes = {
      plottedSignals: PropTypes.array,
      onSignalUnplotPressed: PropTypes.func,
      onSignalPlotPressed: PropTypes.func
    };

    constructor(props) {
      super(props);
      // only want to display up to length elements at a time
      // offset, length

      this.state = {
        offset: 0,
        length: 0,
        msgDisplayFormat: 'name',
        expandedMessages: [],
        messageHeights: []
      }

      this.onChoicePress = this.onChoicePress.bind(this);
      this.messageRow = this.messageRow.bind(this);
      this.addDisplayedMessages = this.addDisplayedMessages.bind(this);
      this.renderMessage = this.renderMessage.bind(this);
      this.renderTable = this.renderTable.bind(this);
    }

    componentWillReceiveProps(nextProps) {
      if(nextProps.data) {
        this.addDisplayedMessages();
      }
    }

    addDisplayedMessages() {
      const {length, messageHeights} = this.state;
      const newLength = length + CanLog.ITEMS_PER_PAGE;
      for(let i = length; i < newLength; i++) {
        messageHeights.push(Styles.dataRow.height);
      }

      this.setState({length: newLength, messageHeights});
    }

    onChoicePress(fmt) {
      this.setState({msgDisplayFormat: fmt})
    }

    expandMessage(msg, msgIdx) {
      // const {messageHeights} = this.state;
      // messageHeights[msgIdx] =  TODO dynamic height calc if message expanded.
      // Also could pre-compute height of each message Id instead of row (as signals are consistent), which would be cheaper.
      this.setState({expandedMessages: this.state.expandedMessages.concat([msg.time])})
    }

    collapseMessage(msg, msgIdx) {
      this.setState({expandedMessages: this.state.expandedMessages
                                        .filter((expMsgTime) => expMsgTime !== msg.time)})
    }

    isSignalPlotted(msgId, signalName) {
      const plottedSignal = this.props.plottedSignals.find((signal) => signal.messageId == msgId && signal.name == signalName);
      return plottedSignal !== undefined;
    }

    expandedMessage(msg) {
      return (<div className={css(Styles.row, Styles.signalRow)} key={msg.time + '-expanded'}>
          <div className={css(Styles.col)}>
            <div className={css(Styles.signalCol)}>
              <table>
                <tbody>
                  {Object.entries(msg.signals).map(([name, value]) => {
                    return [name, value, this.isSignalPlotted(this.props.data.id, name)]
                  }).sort(([name1, value1, isPlotted1], [name2, value2, isPlotted2]) => {
                    // Display plotted signals first
                    if(isPlotted1 && !isPlotted2) {
                      return -1;
                    } else if(isPlotted1 && isPlotted2) {
                      return 0;
                    } else {
                      return 1;
                    }
                  }).map(([name, value, isPlotted]) => {
                    const {unit} = this.props.data.signalSpecs[name];
                    return (<tr key={name}>
                              <td>{name}</td>
                              <td>{value} {unit}</td>
                              {isPlotted ?
                                <td className={css(Styles.plotSignal)}
                                    onClick={() => {this.props.onSignalUnplotPressed(this.props.data.id, name)}}>[unplot]</td>
                                :
                                <td className={css(Styles.plotSignal)}
                                    onClick={() => {this.props.onSignalPlotPressed(this.props.data.id, name)}}>[plot]</td>
                              }
                            </tr>);
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>)
    }

    isMessageExpanded(msg) {
      return this.state.expandedMessages.indexOf(msg.time) !== -1;
    }

    messageRow(msg, key) {
      const msgIsExpanded = this.isMessageExpanded(msg);

      const row = [<div key={key}
                        className={css(Styles.dataRow, Styles.row)}
                        onClick={() => {
                         if(msgIsExpanded) {
                           this.collapseMessage(msg);
                         } else {
                           this.expandMessage(msg);
                         }
                         }}>
                          {msgIsExpanded ? <div className={css(Styles.col)}>&uarr;</div>
                          :
                          <div className={css(Styles.col)}>&darr;</div>}
                    <div className={css(Styles.col, Styles.timefieldCol)}>{msg.time}</div>
                    <div className={css(Styles.col, Styles.dataCol)}>{this.state.msgDisplayFormat == 'name' ? this.props.data.name : msg.hexData}</div>
                  </div>];

      if(msgIsExpanded) {
        row.push(this.expandedMessage(msg));
      }

      return row;
    }

    renderMessage(index, key) {
      return this.messageRow(this.props.data.entries[this.state.offset + index], key);
    }

    renderTable(items, ref) {
      return (<div className={css(Styles.root)}>
                <div className={css(Styles.row)}>
                  <div className={css(Styles.col, Styles.dropdownCol)}>&nbsp;</div>
                  <div className={css(Styles.col, Styles.timefieldCol)}>Time</div>
                  <div className={css(Styles.dataCol)}>
                    Message
                     (<span className={css(Styles.messageFormatChoice,
                                          (this.state.msgDisplayFormat == 'name' ? Styles.messageFormatChoiceSelected
                                                                                : Styles.messageFormatChoiceUnselected))}
                            onClick={() => {this.onChoicePress('name')}}>Name</span>
                    <span> / </span>
                    <span className={css(Styles.messageFormatChoice,
                                        (this.state.msgDisplayFormat == 'hex' ? Styles.messageFormatChoiceSelected
                                                                                : Styles.messageFormatChoiceUnselected))}
                          onClick={() => {this.onChoicePress('hex')}}>Hex</span>)
                  </div>
                </div>
                <div className={css(Styles.tableRowGroup)}
                     ref={ref}>
                  {items}
                </div>
              </div>)
    }

    render() {
        return  <ReactList
                  itemRenderer={this.renderMessage}
                  itemsRenderer={this.renderTable}
                  length={this.props.data ? this.props.data.entries.length : 0}
                  pageSize={50}
                  type='variable' />;
    }
}

const Styles = StyleSheet.create({
    root: {
        borderBottomWidth: '1px',
        borderColor: 'gray',
        width: '100%',
        display: 'table',
        tableLayout: 'fixed'
    },
    row: {
      display: 'table-row',
      width: 'auto',
      clear: 'both',
    },
    dataRow: {
      cursor: 'pointer',
    },
    tableRowGroup: {
      display: 'table-row-group'
    },
    signalCol: {
      width: '1px'
    },
    col: {
      display: 'table-cell',
    },
    dropdownCol: {
      width: '10px',
      padding: 0,
      margin: 0
    },
    timefieldCol: {

    },
    dataCol: {

    },
    messageFormatHeader: {

    },
    messageFormatChoice: {
      cursor: 'pointer',
    },
    messageFormatChoiceSelected: {
      fontWeight: 'bold'
    },
    messageFormatChoiceUnselected: {
      color: 'gray'
    },
    plotSignal: {
      cursor: 'pointer',
      ':hover': {
        textDecoration: 'underline'
      }
    }
});
