import React, {Component} from 'react';
import PropTypes from 'prop-types';
import ReactList from 'react-list';

import { StyleSheet, css } from 'aphrodite/no-important';
import { formatMsgDec, formatMsgHex } from '../models/can-msg-fmt';
import { elementWiseEquals } from '../utils/array';
import Images from '../styles/images';

export default class CanLog extends Component {
    static ITEMS_PER_PAGE = 50;

    static propTypes = {
      plottedSignals: PropTypes.array,
      segmentIndices: PropTypes.array,
      onSignalUnplotPressed: PropTypes.func,
      onSignalPlotPressed: PropTypes.func,
      message: PropTypes.object,
      messageIndex: PropTypes.number,
      onMessageExpanded: PropTypes.func
    };

    constructor(props) {
      super(props);
      // only want to display up to length elements at a time
      // offset, length

      this.state = {
        length: 0,
        expandedMessages: [],
        messageHeights: [],
        expandAllChecked: false
      }

      this.messageRow = this.messageRow.bind(this);
      this.addDisplayedMessages = this.addDisplayedMessages.bind(this);
      this.renderMessage = this.renderMessage.bind(this);
      this.renderTable = this.renderTable.bind(this);
      this.onExpandAllChanged = this.onExpandAllChanged.bind(this);
    }

    componentWillReceiveProps(nextProps) {
      if(nextProps.message && !this.props.message) {
        this.addDisplayedMessages();
      }
    }

    shouldComponentUpdate(nextProps, nextState) {
      const curMessageLength = this.props.message ? this.props.message.entries.length : 0;
      const nextMessageLength = nextProps.message ? nextProps.message.entries.length : 0;

      const shouldUpdate = nextMessageLength != curMessageLength
        || nextProps.messageIndex != this.props.messageIndex
        || nextProps.plottedSignals.length != this.props.plottedSignals.length
        || JSON.stringify(nextProps.segmentIndices) != JSON.stringify(this.props.segmentIndices)
        || JSON.stringify(nextState) != JSON.stringify(this.state)
        || this.props.message != nextProps.message
        || (this.props.message !== undefined
            && nextProps.message !== undefined
            &&
              (
                (this.props.message.signals
                && nextProps.message.signals
                && JSON.stringify(this.props.message.signals) != JSON.stringify(nextProps.message.signals))
              ||
                (JSON.stringify(this.props.message.frame) != JSON.stringify(nextProps.message.frame))
              ));

      return shouldUpdate;
    }

    addDisplayedMessages() {
      const {length} = this.state;
      const newLength = length + CanLog.ITEMS_PER_PAGE;

      this.setState({length: newLength});
    }

    expandMessage(msg, msgIdx) {
      this.setState({expandedMessages: this.state.expandedMessages.concat([msg.time])})
      this.props.onMessageExpanded();
    }

    collapseMessage(msg, msgIdx) {
      this.setState({expandedMessages: this.state.expandedMessages
                                        .filter((expMsgTime) => expMsgTime !== msg.time)})
    }

    isSignalPlotted(msgId, signalName) {
      const plottedSignal = this.props.plottedSignals.find((signal) => signal.messageId == msgId && signal.signalName == signalName);
      return plottedSignal !== undefined;
    }

    signalValuePretty(signal, value) {
      if(signal.isFloat) {
        return value.toFixed(3);
      } else return value;
    }

    expandedMessage(msg) {
      return (<div className={css(Styles.row, Styles.signalRow)} key={msg.time + '-expanded'}>
          <div className={css(Styles.col)}>
            <div className={css(Styles.signalCol)}>
              <table className={css(Styles.signalTable)}>
                <tbody>
                  {Object.entries(msg.signals).map(([name, value]) => {
                    return [name, value, this.isSignalPlotted(this.props.message.id, name)]
                  }).map(([name, value, isPlotted]) => {
                    const signal = msg.signals[name];
                    const {unit} = signal;
                    return (<tr key={name}>
                              <td>{name}</td>
                              <td><p className={css(Styles.signalValue)}>{this.signalValuePretty(signal, value)} {unit}</p></td>
                              {isPlotted ?
                                <td className={css(Styles.pointerUnderlineHover)}
                                    onClick={() => {this.props.onSignalUnplotPressed(this.props.message.id, name)}}>[unplot]</td>
                                :
                                <td className={css(Styles.pointerUnderlineHover)}
                                    onClick={() => {this.props.onSignalPlotPressed(this.props.message.id, name)}}>[plot]</td>
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
      const msgIsExpanded = this.state.expandAllChecked || this.isMessageExpanded(msg);
      const hasSignals = Object.keys(msg.signals).length > 0;
      const rowStyle = (hasSignals ? Styles.pointer : null);
      const row = [<div key={key}
                        className={css(Styles.row, Styles.messageRow, rowStyle)}
                        onClick={() => {
                         if(!hasSignals) return;
                         if(msgIsExpanded) {
                           this.collapseMessage(msg);
                         } else {
                           this.expandMessage(msg);
                         }
                         }}>
                          {hasSignals ?
                            (msgIsExpanded ? <div className={css(Styles.col, Styles.arrowCell)}>{<Images.downArrow styles={[Styles.arrow]} />}</div>
                              :
                              <div className={css(Styles.col, Styles.arrowCell)}>{<Images.rightArrow styles={[Styles.arrow]} />}</div>
                            )
                            : <div className={css(Styles.col)}></div>
                          }
                    <div className={css(Styles.col, Styles.timefieldCol)}>
                      {msg.relTime.toFixed(3)}
                    </div>
                    <div className={css(Styles.col,
                                        Styles.messageCol)}>
                      {(this.props.message.frame ? this.props.message.frame.name : null) || this.props.message.id}
                    </div>
                    <div className={css(Styles.col,
                                        Styles.messageCol,
                                        Styles.hex)}>
                       {msg.hexData}
                    </div>
                  </div>];

      if(msgIsExpanded) {
        row.push(this.expandedMessage(msg));
      }

      return row;
    }

    renderMessage(index, key) {
      let offset = this.props.messageIndex;
      if(offset === 0 && this.props.segmentIndices.length === 2) {
        offset = this.props.segmentIndices[0];
      }

      return this.messageRow(this.props.message.entries[offset + index], key);
    }

    renderTable(items, ref) {
      return (<div className={css(Styles.root)}>
                <div className={css(Styles.row)}>
                  <div className={css(Styles.col, Styles.dropdownCol)}>&nbsp;</div>
                  <div className={css(Styles.col, Styles.timefieldCol)}>Time (s)</div>
                  <div className={css(Styles.col)}>
                    Message
                  </div>
                  <div className={css(Styles.col)}>
                    Bytes
                  </div>
                </div>
                <div className={css(Styles.tableRowGroup)}
                     ref={ref}>
                  {items}
                </div>
              </div>)
    }

    listLength() {
      const {segmentIndices, messageIndex} = this.props;
      if(messageIndex > 0) {
        return this.props.message.entries.length - messageIndex;
      } else if(segmentIndices.length == 2) {
        return segmentIndices[1] - segmentIndices[0];
      } else if(this.props.message) {
        return this.props.message.entries.length;
      } else {
        // no message yet
        return 0;
      }
    }

    onExpandAllChanged(e) {
      this.setState({expandAllChecked: e.target.checked});
    }

    render() {

      return  <div>
                  <p className={css(Styles.expandAll)}>Expand all messages:
                    <input type="checkbox"
                           checked={this.state.expandAllChecked}
                           onChange={this.onExpandAllChanged} />
                  </p>
                  <ReactList
                  itemRenderer={this.renderMessage}
                  itemsRenderer={this.renderTable}
                  length={this.listLength()}
                  pageSize={50}
                  updateWhenThisValueChanges={this.props.messageIndex}
                  type='variable' />
              </div>;
    }
}

const Styles = StyleSheet.create({
    root: {
        borderBottomWidth: '1px',
        borderColor: 'gray',
        width: '100%',
        display: 'table',

    },
    row: {
      display: 'table-row',
      width: 'auto',
      clear: 'both',
    },
    pointer: {
      cursor: 'pointer',
    },
    tableRowGroup: {
      display: 'table-row-group'
    },
    messageRow: {
      lineHeight: '24px'
    },
    signalCol: {
      width: '1px',
      paddingBottom: '15px'
    },
    col: {
      display: 'table-cell',
    },
    arrowCell: {
      verticalAlign: 'middle',
      textAlign: 'center',
      marginLeft: '-5px'
    },
    dropdownCol: {
      width: '10px',
      padding: 0,
      margin: 0
    },
    timefieldCol: {

    },
    messageCol: {

    },
    messageFormatHeader: {

    },
    pointerUnderlineHover: {
      cursor: 'pointer',
      ':hover': {
        textDecoration: 'underline'
      }
    },
    hex: {
      fontFamily: 'monospace'
    },
    signalTable: {
      width: '100%'
    },
    signalValue: {
      whiteSpace: 'nowrap',
      padding: 0,
      margin: 0
    },
    arrowCell: {
      position: 'relative',
    },
    arrow: {
      position: 'absolute',
      left: '-8px'
    }
});
