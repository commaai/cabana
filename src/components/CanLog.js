import React, {Component} from 'react';
import PropTypes from 'prop-types';
import ReactList from 'react-list';

import { StyleSheet, css } from 'aphrodite/no-important';
import cx from 'classnames';
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
      onMessageExpanded: PropTypes.func,
    };

    constructor(props) {
      super(props);
      // only want to display up to length elements at a time
      // offset, length

      this.state = {
        length: 0,
        expandedMessages: [],
        messageHeights: [],
        allPacketsExpanded: false
      }

      this.renderLogListItemMessage = this.renderLogListItemMessage.bind(this);
      this.addDisplayedMessages = this.addDisplayedMessages.bind(this);
      this.renderLogListItem = this.renderLogListItem.bind(this);
      this.renderLogList = this.renderLogList.bind(this);
      this.onExpandAllChanged = this.onExpandAllChanged.bind(this);
      this.toggleExpandAllPackets = this.toggleExpandAllPackets.bind(this);
      this.toggleSignalPlot = this.toggleSignalPlot.bind(this);
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
      const plottedSignal = this.props.plottedSignals.find((plot) =>
        plot.some((signal) => signal.messageId == msgId && signal.signalName == signalName));
      return plottedSignal !== undefined;
    }

    signalValuePretty(signal, value) {
      if(signal.isFloat) {
        return value.toFixed(3);
      } else return value;
    }

    isMessageExpanded(msg) {
        return this.state.expandedMessages.indexOf(msg.time) !== -1;
    }

    toggleSignalPlot(msg, name, plotted) {
        if (!plotted) {
            this.props.onSignalPlotPressed(msg, name);
        } else {
            this.props.onSignalUnplotPressed(msg, name);
        }
    }

    toggleExpandPacketSignals(msg) {
        const msgIsExpanded = this.state.allPacketsExpanded || this.isMessageExpanded(msg);
        const msgHasSignals = Object.keys(msg.signals).length > 0;
        if (msgIsExpanded && msgHasSignals) {
            this.setState({expandedMessages: this.state.expandedMessages
              .filter((expMsgTime) => expMsgTime !== msg.time)})
        } else if (msgHasSignals) {
            this.setState({expandedMessages: this.state.expandedMessages.concat([msg.time])})
            this.props.onMessageExpanded();
        } else { return; }
    }

    renderLogListItemSignals(msg) {
      const { message } = this.props;
      return (
          <div className='signals-log-list-signals'>
              { Object.entries(msg.signals).map(([name, value]) => {
                  return [name, value, this.isSignalPlotted(message.id, name)]
                }).map(([name, value, isPlotted]) => {
                  const signalValue = msg.signals[name];
                  const plottedButtonClass = isPlotted ? null : 'button--alpha';
                  const plottedButtonText = isPlotted ? 'Hide Plot' : 'Show Plot';

                  const signal = message.frame.signals[name];
                  const unit = signal.unit.length > 0 ? signal.unit : 'units';

                  return (
                    <div key={ name } className='signals-log-list-signal'>
                        <div className='signals-log-list-signal-message'>
                            <span>{ name }</span>
                        </div>
                        <div className='signals-log-list-signal-value'>
                            <span>
                                (<strong>{ this.signalValuePretty(signalValue, value) }</strong> { unit })
                            </span>
                        </div>
                        <div className='signals-log-list-signal-action'
                              onClick={ () => { this.toggleSignalPlot(this.props.message.id, name, isPlotted) } }>
                          <button className={ cx('button--tiny', plottedButtonClass) }>
                              <span>{ plottedButtonText }</span>
                          </button>
                        </div>
                    </div>
                  );
              })}
          </div>
      )
    }

    renderLogListItemMessage(msg, key) {
        const msgIsExpanded = this.state.allPacketsExpanded || this.isMessageExpanded(msg);
        const msgHasSignals = Object.keys(msg.signals).length > 0;
        const hasSignalsClass = msgHasSignals ? 'has-signals' : null;
        const expandedClass = msgIsExpanded ? 'is-expanded' : null;
        const row = (
            <div key={key} className={cx('signals-log-list-item', hasSignalsClass, expandedClass)}>
                <div className='signals-log-list-item-header'
                      onClick={ () => { this.toggleExpandPacketSignals(msg) } }>
                    <div className='signals-log-list-message'>
                        <strong>{(this.props.message.frame ? this.props.message.frame.name : null) || this.props.message.id}</strong>
                    </div>
                    <div className='signals-log-list-time'>
                        <span>[{msg.relTime.toFixed(3)}]</span>
                    </div>
                    <div className='signals-log-list-bytes'>
                        <span className='t-mono'>{msg.hexData}</span>
                    </div>
              </div>
              <div className='signals-log-list-item-body'>
                  { msgIsExpanded ? this.renderLogListItemSignals(msg) : null}
              </div>
            </div>
        );

        return row;
    }

    renderLogListItem(index, key) {
        let offset = this.props.messageIndex;
        if(offset === 0 && this.props.segmentIndices.length === 2) {
            offset = this.props.segmentIndices[0];
        }

        return this.renderLogListItemMessage(this.props.message.entries[offset + index], key);
    }

    renderLogList(items, ref) {
        return (
            <div className='signals-log-list'>
                <div className='signals-log-list-header'>
                    <div className='signals-log-list-message'>Message</div>
                    <div className='signals-log-list-time'>Time</div>
                    <div className='signals-log-list-bytes'>Bytes</div>
                </div>
                <div className='signals-log-list-items'
                     ref={ref}>
                    {items}
                </div>
            </div>
        )
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
      this.setState({allPacketsExpanded: e.target.checked});
    }

    toggleExpandAllPackets() {
      this.setState({allPacketsExpanded: !this.state.allPacketsExpanded});
    }

    render() {
        let expandAllText = this.state.allPacketsExpanded ? 'Collapse All' : 'Expand All';
        let expandAllClass = this.state.allPacketsExpanded ? null : 'button--alpha';
        return (
          <div className='cabana-explorer-signals-log'>
            <div className='cabana-explorer-signals-log-header'>
              <strong>Message Packets</strong>
              <button className={cx('button--tiny', expandAllClass)}
                      onClick={this.toggleExpandAllPackets}>
                  {expandAllText}
              </button>
            </div>
            <div className='cabana-explorer-signals-log-body'>
                <ReactList
                  itemRenderer={this.renderLogListItem}
                  itemsRenderer={this.renderLogList}
                  length={this.listLength()}
                  pageSize={50}
                  updateWhenThisValueChanges={this.props.messageIndex}
                  type='variable' />
            </div>
          </div>
        );
    }
}
