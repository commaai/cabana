import React, { Component } from "react";
import PropTypes from "prop-types";
import ReactList from "react-list";

import cx from "classnames";

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
      allPacketsExpanded: false
    };

    this.renderLogListItemMessage = this.renderLogListItemMessage.bind(this);
    this.addDisplayedMessages = this.addDisplayedMessages.bind(this);
    this.renderLogListItem = this.renderLogListItem.bind(this);
    this.renderLogList = this.renderLogList.bind(this);
    this.onExpandAllChanged = this.onExpandAllChanged.bind(this);
    this.toggleExpandAllPackets = this.toggleExpandAllPackets.bind(this);
    this.toggleSignalPlot = this.toggleSignalPlot.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.message && !this.props.message) {
      this.addDisplayedMessages();
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    const curMessageLength = this.props.message
      ? this.props.message.entries.length
      : 0;
    const nextMessageLength = nextProps.message
      ? nextProps.message.entries.length
      : 0;

    const shouldUpdate =
      this.props.message !== nextProps.message ||
      nextMessageLength !== curMessageLength ||
      nextProps.messageIndex !== this.props.messageIndex ||
      nextProps.plottedSignals.length !== this.props.plottedSignals.length ||
      JSON.stringify(nextProps.segmentIndices) !==
        JSON.stringify(this.props.segmentIndices) ||
      JSON.stringify(nextState) !== JSON.stringify(this.state) ||
      this.props.message !== nextProps.message ||
      (this.props.message !== undefined &&
        nextProps.message !== undefined &&
        this.props.message.frame !== undefined &&
        nextProps.message.frame !== undefined &&
        JSON.stringify(this.props.message.frame) !==
          JSON.stringify(nextProps.message.frame));

    return shouldUpdate;
  }

  addDisplayedMessages() {
    const { length } = this.state;
    const newLength = length + CanLog.ITEMS_PER_PAGE;

    this.setState({ length: newLength });
  }

  expandMessage(msg, msgIdx) {
    this.setState({
      expandedMessages: this.state.expandedMessages.concat([msg.time])
    });
    this.props.onMessageExpanded();
  }

  collapseMessage(msg, msgIdx) {
    this.setState({
      expandedMessages: this.state.expandedMessages.filter(
        expMsgTime => expMsgTime !== msg.time
      )
    });
  }

  isSignalPlotted(msgId, signalUid) {
    const plottedSignal = this.props.plottedSignals.find(plot =>
      plot.some(
        signal => signal.messageId === msgId && signal.signalUid === signalUid
      )
    );
    return plottedSignal !== undefined;
  }

  signalValuePretty(signal, value) {
    if (signal.isFloat) {
      return value.toFixed(3);
    } else return value;
  }

  isMessageExpanded(msg) {
    return this.state.expandedMessages.indexOf(msg.time) !== -1;
  }

  toggleSignalPlot(msg, signalUid, plotted) {
    if (!plotted) {
      this.props.onSignalPlotPressed(msg, signalUid);
    } else {
      this.props.onSignalUnplotPressed(msg, signalUid);
    }
  }

  toggleExpandPacketSignals(msgEntry) {
    if (!this.props.message.frame) {
      return;
    }
    const msgIsExpanded =
      this.state.allPacketsExpanded || this.isMessageExpanded(msgEntry);

    const msgHasSignals =
      Object.keys(this.props.message.frame.signals).length > 0;
    if (msgIsExpanded && msgHasSignals) {
      this.setState({
        expandedMessages: this.state.expandedMessages.filter(
          expMsgTime => expMsgTime !== msgEntry.time
        )
      });
    } else if (msgHasSignals) {
      this.setState({
        expandedMessages: this.state.expandedMessages.concat([msgEntry.time])
      });
      this.props.onMessageExpanded();
    } else {
      return;
    }
  }

  renderLogListItemSignals(msgEntry) {
    const { message } = this.props;
    return (
      <div className="signals-log-list-signals">
        {Object.entries(msgEntry.signals).map(([name, value]) => {
          const signal = message.frame.signals[name];
          if (signal === undefined) {
            // Signal removed?
            return null;
          }
          const unit = signal.unit.length > 0 ? signal.unit : "units";
          const isPlotted = this.isSignalPlotted(message.id, signal.uid);
          const plottedButtonClass = isPlotted ? null : "button--alpha";
          const plottedButtonText = isPlotted ? "Hide Plot" : "Show Plot";
          return (
            <div key={name} className="signals-log-list-signal">
              <div className="signals-log-list-signal-message">
                <span>{name}</span>
              </div>
              <div className="signals-log-list-signal-value">
                <span>
                  (<strong>{this.signalValuePretty(signal, value)}</strong>{" "}
                  {unit})
                </span>
              </div>
              <div
                className="signals-log-list-signal-action"
                onClick={() => {
                  this.toggleSignalPlot(message.id, signal.uid, isPlotted);
                }}
              >
                <button className={cx("button--tiny", plottedButtonClass)}>
                  <span>{plottedButtonText}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  renderLogListItemMessage(msgEntry, key) {
    const { message } = this.props;
    const msgIsExpanded =
      this.state.allPacketsExpanded || this.isMessageExpanded(msgEntry);
    const msgHasSignals = Object.keys(msgEntry.signals).length > 0;
    const hasSignalsClass = msgHasSignals ? "has-signals" : null;
    const expandedClass = msgIsExpanded ? "is-expanded" : null;
    const row = (
      <div
        key={key}
        className={cx("signals-log-list-item", hasSignalsClass, expandedClass)}
      >
        <div
          className="signals-log-list-item-header"
          onClick={() => {
            this.toggleExpandPacketSignals(msgEntry);
          }}
        >
          <div className="signals-log-list-message">
            <strong>
              {(message.frame ? message.frame.name : null) || message.id}
            </strong>
          </div>
          <div className="signals-log-list-time">
            <span>[{msgEntry.relTime.toFixed(3)}]</span>
          </div>
          <div className="signals-log-list-bytes">
            <span className="t-mono">{msgEntry.hexData}</span>
          </div>
        </div>
        <div className="signals-log-list-item-body">
          {msgIsExpanded ? this.renderLogListItemSignals(msgEntry) : null}
        </div>
      </div>
    );

    return row;
  }

  renderLogListItem(index, key) {
    let offset = this.props.messageIndex;
    if (offset === 0 && this.props.segmentIndices.length === 2) {
      offset = this.props.segmentIndices[0];
    }
    if (offset + index < 0) {
      debugger;
    }
    if (offset + index < this.props.message.entries.length) {
      return this.renderLogListItemMessage(
        this.props.message.entries[offset + index],
        key
      );
    } else {
      return null;
    }
  }

  renderLogList(items, ref) {
    return (
      <div className="signals-log-list">
        <div className="signals-log-list-header">
          <div className="signals-log-list-message">Message</div>
          <div className="signals-log-list-time">Time</div>
          <div className="signals-log-list-bytes">Bytes</div>
        </div>
        <div className="signals-log-list-items" ref={ref}>
          {items}
        </div>
      </div>
    );
  }

  listLength() {
    const { segmentIndices, messageIndex } = this.props;
    if (messageIndex > 0) {
      return this.props.message.entries.length - messageIndex;
    } else if (segmentIndices.length === 2) {
      return segmentIndices[1] - segmentIndices[0];
    } else if (this.props.message) {
      return this.props.message.entries.length;
    } else {
      // no message yet
      return 0;
    }
  }

  onExpandAllChanged(e) {
    this.setState({ allPacketsExpanded: e.target.checked });
  }

  toggleExpandAllPackets() {
    this.setState({ allPacketsExpanded: !this.state.allPacketsExpanded });
  }

  render() {
    let expandAllText = this.state.allPacketsExpanded
      ? "Collapse All"
      : "Expand All";
    let expandAllClass = this.state.allPacketsExpanded ? null : "button--alpha";
    return (
      <div className="cabana-explorer-signals-log">
        <div className="cabana-explorer-signals-log-header">
          <strong>Message Packets</strong>
          <button
            className={cx("button--tiny", expandAllClass)}
            onClick={this.toggleExpandAllPackets}
          >
            {expandAllText}
          </button>
        </div>
        <div className="cabana-explorer-signals-log-body">
          <ReactList
            itemRenderer={this.renderLogListItem}
            itemsRenderer={this.renderLogList}
            length={this.listLength()}
            pageSize={50}
            updateWhenThisValueChanges={this.props.messageIndex}
            type="variable"
          />
        </div>
      </div>
    );
  }
}
