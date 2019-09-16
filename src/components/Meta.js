import React, { Component } from "react";
import cx from "classnames";
import PropTypes from "prop-types";
import Clipboard from "clipboard";

import MessageBytes from "./MessageBytes";
const { ckmeans } = require("simple-statistics");

export default class Meta extends Component {
  static propTypes = {
    onMessageSelected: PropTypes.func,
    onMessageUnselected: PropTypes.func,
    dongleId: PropTypes.string,
    name: PropTypes.string,
    messages: PropTypes.objectOf(PropTypes.object),
    selectedMessages: PropTypes.array,
    onPartChanged: PropTypes.func,
    partsCount: PropTypes.number,
    showLoadDbc: PropTypes.func,
    showSaveDbc: PropTypes.func,
    dbcFilename: PropTypes.string,
    dbcLastSaved: PropTypes.object, // moment.js object,
    showEditMessageModal: PropTypes.func,
    route: PropTypes.object,
    partsLoaded: PropTypes.number,
    currentParts: PropTypes.array,
    seekTime: PropTypes.number,
    loginWithGithub: PropTypes.element,
    isDemo: PropTypes.bool,
    live: PropTypes.bool
  };

  constructor(props) {
    super(props);

    this.onFilterChanged = this.onFilterChanged.bind(this);
    this.onFilterFocus = this.onFilterFocus.bind(this);
    this.onFilterUnfocus = this.onFilterUnfocus.bind(this);
    this.canMsgFilter = this.canMsgFilter.bind(this);
    this.logEventMsgFilter = this.logEventMsgFilter.bind(this);
    this.renderMessageBytes = this.renderMessageBytes.bind(this);
    this.toggleShowLogEvents = this.toggleShowLogEvents.bind(this);

    const { dbcLastSaved } = props;

    this.state = {
      filterText: "Filter",
      lastSaved:
        dbcLastSaved !== null ? this.props.dbcLastSaved.fromNow() : null,
      hoveredMessages: [],
      orderedMessageKeys: [],
      showLogEvents: false
    };
  }

  componentWillMount() {
    this.lastSavedTimer = setInterval(() => {
      if (this.props.dbcLastSaved !== null) {
        this.setState({ lastSaved: this.props.dbcLastSaved.fromNow() });
      }
    }, 30000);
  }

  componentWillUnmount() {
    window.clearInterval(this.lastSavedTimer);
  }

  componentWillReceiveProps(nextProps) {
    if (
      nextProps.lastSaved !== this.props.lastSaved &&
      typeof nextProps === "object"
    ) {
      this.setState({ lastSaved: nextProps.dbcLastSaved.fromNow() });
    }

    const nextMsgKeys = Object.keys(nextProps.messages);
    if (
      JSON.stringify(nextMsgKeys) !==
      JSON.stringify(Object.keys(this.props.messages))
    ) {
      const orderedMessageKeys = this.sortMessages(nextProps.messages);
      this.setState({ hoveredMessages: [], orderedMessageKeys });
    } else if (
      this.state.orderedMessageKeys.length === 0 ||
      (!this.props.live &&
        this.props.messages &&
        nextProps.messages &&
        this.byteCountsDidUpdate(this.props.messages, nextProps.messages))
    ) {
      const orderedMessageKeys = this.sortMessages(nextProps.messages);
      this.setState({ orderedMessageKeys });
    }
  }

  byteCountsDidUpdate(prevMessages, nextMessages) {
    return Object.entries(nextMessages).some(
      ([msgId, msg]) =>
        JSON.stringify(msg.byteStateChangeCounts) !==
        JSON.stringify(prevMessages[msgId].byteStateChangeCounts)
    );
  }

  sortMessages(messages) {
    // Returns list of message keys, ordered as follows:
    // messages are binned into at most 10 bins based on entry count
    // each bin is sorted by message CAN address
    // then the list of bins is flattened and reversed to
    // yield a count-descending, address-ascending order.

    if (Object.keys(messages).length === 0) return [];
    const messagesByEntryCount = Object.entries(messages).reduce(
      (partialMapping, [msgId, msg]) => {
        const entryCountKey = msg.entries.length.toString(); // js object keys are strings
        if (!partialMapping[entryCountKey]) {
          partialMapping[entryCountKey] = [msg];
        } else {
          partialMapping[entryCountKey].push(msg);
        }
        return partialMapping;
      },
      {}
    );

    const entryCounts = Object.keys(messagesByEntryCount).map(count =>
      parseInt(count, 10)
    );
    const binnedEntryCounts = ckmeans(
      entryCounts,
      Math.min(entryCounts.length, 10)
    );
    const sortedKeys = binnedEntryCounts
      .map(bin =>
        bin
          .map(entryCount => messagesByEntryCount[entryCount.toString()])
          .reduce((messages, partial) => messages.concat(partial), [])
          .sort((msg1, msg2) => {
            if (msg1.address < msg2.address) {
              return 1;
            } else {
              return -1;
            }
          })
          .map(msg => msg.id)
      )
      .reduce((keys, bin) => keys.concat(bin), [])
      .reverse();

    return sortedKeys;
  }

  toggleShowLogEvents() {
    this.setState({
      showLogEvents: !this.state.showLogEvents
    });
  }

  onFilterChanged(e) {
    let val = e.target.value;
    if (val.trim() === "Filter") val = "";

    this.setState({ filterText: val });
  }

  onFilterFocus(e) {
    if (this.state.filterText.trim() === "Filter") {
      this.setState({ filterText: "" });
    }
  }

  onFilterUnfocus(e) {
    if (this.state.filterText.trim() === "") {
      this.setState({ filterText: "Filter" });
    }
  }

  canMsgFilter(msg) {
    if (msg.isLogEvent) {
      return;
    }
    const { filterText } = this.state;
    const msgName = msg.frame ? msg.frame.name : "";

    return (
      filterText === "Filter" ||
      filterText === "" ||
      msg.id.toLowerCase().indexOf(filterText.toLowerCase()) !== -1 ||
      msgName.toLowerCase().indexOf(filterText.toLowerCase()) !== -1
    );
  }

  logEventMsgFilter(msg) {
    if (!msg.isLogEvent) {
      return;
    }
    const { filterText } = this.state;
    const msgName = msg.frame ? msg.frame.name : "";

    return (
      filterText === "Filter" ||
      filterText === "" ||
      msg.id.toLowerCase().indexOf(filterText.toLowerCase()) !== -1 ||
      msgName.toLowerCase().indexOf(filterText.toLowerCase()) !== -1
    );
  }

  lastSavedPretty() {
    const { dbcLastSaved } = this.props;
    return dbcLastSaved.fromNow();
  }

  onMessageHover(key) {
    let { hoveredMessages } = this.state;
    if (hoveredMessages.indexOf(key) !== -1) return;

    hoveredMessages.push(key);
    this.setState({ hoveredMessages });
  }

  onMessageHoverEnd(key) {
    let { hoveredMessages } = this.state;
    hoveredMessages = hoveredMessages.filter(m => m !== key);
    this.setState({ hoveredMessages });
  }

  onMsgRemoveClick(key) {
    let { selectedMessages } = this.state;
    selectedMessages = selectedMessages.filter(m => m !== key);
    this.props.onMessageUnselected(key);
    this.setState({ selectedMessages });
  }

  onMessageSelected(key) {
    // uncomment when we support multiple messages
    // const selectedMessages = this.state.selectedMessages.filter((m) => m !== key);
    const selectedMessages = [];
    selectedMessages.push(key);
    this.props.updateSelectedMessages(selectedMessages);
    this.props.onMessageSelected(key);
  }

  orderedMessages() {
    const { orderedMessageKeys } = this.state;
    const { messages } = this.props;
    return orderedMessageKeys.map(key => messages[key]);
  }

  selectedMessageClass(messageId) {
    return this.props.selectedMessages.includes(messageId)
      ? "is-selected"
      : null;
  }

  renderMessageBytes(msg) {
    return (
      <tr
        onClick={() => {
          this.onMessageSelected(msg.id);
        }}
        key={msg.id}
        className={cx(
          "cabana-meta-messages-list-item",
          this.selectedMessageClass(msg.id)
        )}
      >
        {msg.isLogEvent ? (
          <td colSpan="2">{msg.id}</td>
        ) : (
          <React.Fragment>
            <td>{msg.frame ? msg.frame.name : "untitled"}</td>
            <td>{msg.id}</td>
          </React.Fragment>
        )}
        <td>{msg.entries.length}</td>
        <td>
          <div className="cabana-meta-messages-list-item-bytes">
            <MessageBytes
              key={msg.id}
              message={msg}
              seekIndex={this.props.seekIndex}
              seekTime={this.props.seekTime}
              live={this.props.live}
            />
          </div>
        </td>
      </tr>
    );
  }

  renderCanMessages() {
    return this.orderedMessages()
      .filter(this.canMsgFilter)
      .map(this.renderMessageBytes);
  }

  renderLogEventMessages() {
    return this.orderedMessages()
      .filter(this.logEventMsgFilter)
      .map(this.renderMessageBytes);
  }

  renderAvailableMessagesList() {
    if (Object.keys(this.props.messages).length === 0) {
      return <p>Loading messages...</p>;
    }
    return (
      <React.Fragment>
        <table cellPadding="5">
          {this.state.showLogEvents && (
            <React.Fragment>
              <thead>
                <tr>
                  <td colSpan="2">Name</td>
                  <td>Count</td>
                  <td>Bytes</td>
                </tr>
              </thead>
              <tbody>
                {this.renderLogEventMessages()}
                <tr>
                  <td colSpan="4">
                    <hr />
                  </td>
                </tr>
              </tbody>
            </React.Fragment>
          )}
          <thead>
            <tr>
              <td>Name</td>
              <td>ID</td>
              <td>Count</td>
              <td>Bytes</td>
            </tr>
          </thead>
          <tbody>{this.renderCanMessages()}</tbody>
        </table>
      </React.Fragment>
    );
  }

  saveable() {
    try {
      // eslint-disable-next-line
      "serviceWorker" in navigator &&
        !!new ReadableStream() &&
        !!new WritableStream(); // eslint-disable-line no-undef
      return "saveable";
    } catch (e) {
      return false;
    }
  }
  render() {
    return (
      <div className="cabana-meta">
        <div className="cabana-meta-header">
          <h5 className="cabana-meta-header-label t-capline">
            Currently editing:
          </h5>
          <strong className="cabana-meta-header-filename">
            {this.props.dbcFilename}
          </strong>
          {this.props.dbcLastSaved !== null ? (
            <div className="cabana-meta-header-last-saved">
              <p>Last saved: {this.lastSavedPretty()}</p>
            </div>
          ) : null}
          <div className={`cabana-meta-header-actions ${this.saveable()}`}>
            <div className="cabana-meta-header-action">
              <button onClick={this.props.showLoadDbc}>Load DBC</button>
            </div>
            {this.saveable() && (
              <div className="cabana-meta-header-action">
                <button onClick={this.props.saveLog}>Save Log</button>
              </div>
            )}
            {this.props.shareUrl ? (
              <div
                className="cabana-meta-header-action special-wide"
                data-clipboard-text={this.props.shareUrl}
                data-clipboard-action="copy"
                ref={ref => (ref ? new Clipboard(ref) : null)}
              >
                <a
                  className="button"
                  href={this.props.shareUrl}
                  onClick={e => e.preventDefault()}
                >
                  Copy Share Link
                </a>
              </div>
            ) : null}
            <div className="cabana-meta-header-action">
              <button onClick={this.props.showSaveDbc}>Save DBC</button>
            </div>
          </div>
        </div>
        <div className="cabana-meta-messages">
          <div className="cabana-meta-messages-header">
            <div
              style={{
                display: "inline-block",
                float: "right"
              }}
            >
              <h5 className="t-capline">
                Show log events
                <input
                  type="checkbox"
                  onChange={this.toggleShowLogEvents}
                  checked={!!this.state.showLogEvents}
                />
              </h5>
            </div>
            <h5 className="t-capline">Available messages</h5>
          </div>
          <div className="cabana-meta-messages-window">
            <div className="cabana-meta-messages-filter">
              <div className="form-field form-field--small">
                <input
                  type="text"
                  value={this.state.filterText}
                  onFocus={this.onFilterFocus}
                  onBlur={this.onFilterUnfocus}
                  onChange={this.onFilterChanged}
                />
              </div>
            </div>
            <div className="cabana-meta-messages-list">
              {this.renderAvailableMessagesList()}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
