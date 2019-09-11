import React, { Component } from "react";
import PropTypes from "prop-types";

import cx from "classnames";

import AddSignals from "./AddSignals";
import CanGraphList from "./CanGraphList";
import RouteVideoSync from "./RouteVideoSync";
import CanLog from "./CanLog";
import Entries from "../models/can/entries";
import debounce from "../utils/debounce";
import PartSelector from "./PartSelector";
import PlaySpeedSelector from "./PlaySpeedSelector";
import GraphData from "../models/graph-data";

export default class Explorer extends Component {
  static propTypes = {
    selectedMessage: PropTypes.string,
    url: PropTypes.string,
    live: PropTypes.bool.isRequired,
    messages: PropTypes.objectOf(PropTypes.object),
    onConfirmedSignalChange: PropTypes.func.isRequired,
    canFrameOffset: PropTypes.number,
    firstCanTime: PropTypes.number,
    onSeek: PropTypes.func.isRequired,
    autoplay: PropTypes.bool.isRequired,
    onPartChange: PropTypes.func.isRequired,
    partsCount: PropTypes.number
  };

  constructor(props) {
    super(props);

    this.state = {
      plottedSignals: [],
      graphData: [],
      segment: [],
      segmentIndices: [],
      shouldShowAddSignal: true,
      userSeekIndex: 0,
      userSeekTime: props.currentParts[0] * 60,
      playing: props.autoplay,
      signals: {},
      playSpeed: 1
    };
    this.onSignalPlotPressed = this.onSignalPlotPressed.bind(this);
    this.onSignalUnplotPressed = this.onSignalUnplotPressed.bind(this);
    this.onSegmentChanged = this.onSegmentChanged.bind(this);
    this.showAddSignal = this.showAddSignal.bind(this);
    this.onGraphTimeClick = this.onGraphTimeClick.bind(this);
    this.onUserSeek = this.onUserSeek.bind(this);
    this.onPlaySeek = this.onPlaySeek.bind(this);
    this.onPlay = this.onPlay.bind(this);
    this.onPause = this.onPause.bind(this);
    this.onVideoClick = this.onVideoClick.bind(this);
    this.onSignalPlotChange = this.onSignalPlotChange.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this.mergePlots = this.mergePlots.bind(this);
    this.refreshGraphData = this.refreshGraphData.bind(this);
    this.toggleShouldShowAddSignal = this.toggleShouldShowAddSignal.bind(this);
    this.changePlaySpeed = this.changePlaySpeed.bind(this);
  }

  _onKeyDown(e) {
    if (e.keyCode === 27) {
      // escape
      this.resetSegment();
    }
  }

  componentWillMount() {
    document.addEventListener("keydown", this._onKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener("keydown", this._onKeyDown);
  }

  clipSegment(segment, segmentIndices, nextMessage) {
    if (segment.length === 2) {
      const segmentStartIdx = nextMessage.entries.findIndex(
        e => e.relTime >= segment[0]
      );
      let segmentEndIdx = nextMessage.entries.findIndex(
        e => e.relTime >= segment[1]
      );
      if (segmentStartIdx !== -1) {
        if (segmentEndIdx === -1) {
          // previous segment end is past bounds of this message
          segmentEndIdx = nextMessage.entries.length - 1;
        }
        const segmentStartTime = nextMessage.entries[segmentStartIdx].relTime;
        const segmentEndTime = nextMessage.entries[segmentEndIdx].relTime;

        segment = [segmentStartTime, segmentEndTime];
        segmentIndices = [segmentStartIdx, segmentEndIdx];
      } else {
        // segment times are out of boudns for this message
        segment = [];
        segmentIndices = [];
      }
    }

    return { segment, segmentIndices };
  }

  componentWillReceiveProps(nextProps) {
    const nextMessage = nextProps.messages[nextProps.selectedMessage];
    const curMessage = this.props.messages[this.props.selectedMessage];
    let { plottedSignals, graphData } = this.state;

    if (Object.keys(nextProps.messages).length === 0) {
      this.resetSegment();
    }
    if (nextMessage && nextMessage.frame && nextMessage !== curMessage) {
      const nextSignalNames = Object.keys(nextMessage.frame.signals);

      if (nextSignalNames.length === 0) {
        this.setState({ shouldShowAddSignal: true });
      }
    }

    // remove plottedSignals that no longer exist
    plottedSignals = plottedSignals
      .map(plot =>
        plot.filter(({ messageId, signalUid }, index) => {
          const messageExists = !!nextProps.messages[messageId];
          let signalExists = true;
          if (messageExists) {
            signalExists = Object.values(
              nextProps.messages[messageId].frame.signals
            ).some(signal => signal.uid === signalUid);
          }

          return messageExists && signalExists;
        })
      )
      .filter(plot => plot.length > 0);

    this.setState({ plottedSignals });

    if (
      nextProps.selectedMessage &&
      nextProps.selectedMessage !== this.props.selectedMessage
    ) {
      // Update segment and seek state
      // by finding a entry indices
      // corresponding to old message segment/seek times.

      let { segment, segmentIndices } = this.clipSegment(
        this.state.segment,
        this.state.segmentIndices,
        nextMessage
      );

      const nextSeekMsgEntry = nextMessage.entries[nextProps.seekIndex];
      let nextSeekTime;
      if (nextSeekMsgEntry) {
        nextSeekTime = nextSeekMsgEntry.relTime;
      } else if (segment.length === 2) {
        nextSeekTime = segment[0];
      } else {
        nextSeekTime = nextMessage.entries[0];
      }

      this.setState({
        segment,
        segmentIndices,
        userSeekIndex: nextProps.seekIndex,
        userSeekTime: nextSeekTime
      });
    }

    if (
      nextMessage &&
      curMessage &&
      nextMessage.entries.length !== curMessage.entries.length
    ) {
      let { segment, segmentIndices } = this.clipSegment(
        this.state.segment,
        this.state.segmentIndices,
        nextMessage
      );
      this.setState({ segment, segmentIndices });
    }

    const partsDidChange =
      JSON.stringify(nextProps.currentParts) !==
      JSON.stringify(this.props.currentParts);

    if (plottedSignals.length > 0) {
      if (graphData.length !== plottedSignals.length || partsDidChange) {
        this.refreshGraphData(nextProps.messages, plottedSignals);
      } else if (graphData.length === plottedSignals.length) {
        if (
          plottedSignals.some(plot =>
            plot.some(({ messageId, signalUid }) => {
              /* const signalName = Object.values(
               *   this.props.messages[messageId].frame.signals
               * ).find(s => s.uid === signalUid);
               */
              return (
                nextProps.messages[messageId].entries.length > 0 &&
                this.props.messages[messageId].entries.length > 0 &&
                nextProps.messages[messageId].entries[0].updated !==
                  this.props.messages[messageId].entries[0].updated
              );
            })
          )
        ) {
          this.refreshGraphData(nextProps.messages, plottedSignals);
        } else {
          graphData = GraphData.appendNewGraphData(
            plottedSignals,
            graphData,
            nextProps.messages,
            nextProps.firstCanTime
          );
          this.setState({ graphData });
        }
      }
    }

    if (partsDidChange) {
      const { userSeekTime } = this.state;
      const nextSeekTime =
        userSeekTime -
        this.props.currentParts[0] * 60 +
        nextProps.currentParts[0] * 60;
      this.setState({ userSeekTime: nextSeekTime });
    }
  }

  changePlaySpeed(value) {
    this.setState({
      playSpeed: value
    });
  }

  timeWindow() {
    const { routeStartTime, currentParts } = this.props;

    if (routeStartTime) {
      const partStartOffset = currentParts[0] * 60,
        partEndOffset = (currentParts[1] + 1) * 60;

      const windowStartTime = routeStartTime
        .clone()
        .add(partStartOffset, "s")
        .format("HH:mm:ss");
      const windowEndTime = routeStartTime
        .clone()
        .add(partEndOffset, "s")
        .format("HH:mm:ss");

      return `${windowStartTime} - ${windowEndTime}`;
    } else return "";
  }

  sortGraphData(graphData) {
    return graphData.sort((entry1, entry2) => {
      if (entry1.relTime < entry2.relTime) {
        return -1;
      } else if (entry1.relTime > entry2.relTime) {
        return 1;
      } else {
        return 0;
      }
    });
  }

  calcGraphData(plottedSignals, messages) {
    const { firstCanTime } = this.props;
    if (typeof messages === "undefined") {
      messages = this.props.messages;
    }

    const series = this.sortGraphData(
      plottedSignals
        .map(({ messageId, signalUid }) =>
          GraphData._calcGraphData(messages[messageId], signalUid, firstCanTime)
        )
        .reduce((combined, signalData) => combined.concat(signalData), [])
    );

    return { series, updated: Date.now() };
  }

  onSignalPlotPressed(messageId, signalUid) {
    let { plottedSignals, graphData } = this.state;

    graphData = [this.calcGraphData([{ messageId, signalUid }]), ...graphData];
    plottedSignals = [[{ messageId, signalUid }], ...plottedSignals];

    this.setState({ plottedSignals, graphData });
  }

  refreshGraphData(messages, plottedSignals) {
    if (typeof messages === "undefined") {
      messages = this.props.messages;
    }
    if (typeof plottedSignals === "undefined") {
      plottedSignals = this.state.plottedSignals;
    }
    let graphData = plottedSignals.map((plotSignals, index) =>
      this.calcGraphData(plotSignals, messages)
    );

    this.setState({ graphData });
  }

  onSignalUnplotPressed(messageId, signalUid) {
    const { plottedSignals } = this.state;
    const newPlottedSignals = plottedSignals
      .map(plot =>
        plot.filter(
          signal =>
            !(signal.messageId === messageId && signal.signalUid === signalUid)
        )
      )
      .filter(plot => plot.length > 0);

    this.setState(
      { plottedSignals: newPlottedSignals },
      this.refreshGraphData(this.props.messages, newPlottedSignals)
    );
  }

  updateSegment = debounce((messageId, segment) => {
    const { entries } = this.props.messages[this.props.selectedMessage];
    const segmentIndices = Entries.findSegmentIndices(entries, segment, true);

    console.log("segmentIndices", segmentIndices);

    this.setState({
      segment,
      segmentIndices,
      userSeekIndex: segmentIndices[0],
      userSeekTime: segment[0]
    });
  }, 250);

  onSegmentChanged(messageId, segment) {
    if (Array.isArray(segment)) {
      this.updateSegment(messageId, segment);
    }
  }

  resetSegment() {
    const { segment, segmentIndices } = this.state;
    const { messages, selectedMessage } = this.props;
    if (segment.length > 0 || segmentIndices.length > 0) {
      let userSeekTime = 0;
      if (
        messages[selectedMessage] &&
        messages[selectedMessage].entries.length > 0
      ) {
        userSeekTime = messages[selectedMessage].entries[0].relTime;
      }
      this.setState({
        segment: [],
        segmentIndices: [],
        userSeekIndex: 0,
        userSeekTime
      });
    }
  }

  showAddSignal() {
    this.setState({ shouldShowAddSignal: true });
  }

  toggleShouldShowAddSignal() {
    this.setState({ shouldShowAddSignal: !this.state.shouldShowAddSignal });
  }

  indexFromSeekTime(time) {
    // returns index guaranteed to be in [0, entries.length - 1]

    const { entries } = this.props.messages[this.props.selectedMessage];
    if (entries.length === 0) return null;

    const { segmentIndices } = this.state;
    if (segmentIndices.length === 2 && segmentIndices[0] >= 0) {
      for (
        let i = segmentIndices[0],
          l = Math.min(entries.length - 1, segmentIndices[1]);
        i <= l;
        i++
      ) {
        if (entries[i].relTime >= time) {
          return i;
        }
      }
      return segmentIndices[1];
    } else {
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].relTime >= time) {
          return i;
        }
      }
      return entries.length - 1;
    }
  }

  onUserSeek(time) {
    console.log("User seek", time);
    this.setState({ userSeekTime: time });
    const message = this.props.messages[this.props.selectedMessage];
    if (!message) {
      this.props.onUserSeek(time);
      return;
    }

    const { entries } = message;
    const userSeekIndex = this.indexFromSeekTime(time);
    if (userSeekIndex) {
      const seekTime = entries[userSeekIndex].relTime;

      this.setState({ userSeekIndex, userSeekTime: seekTime });
      this.props.onSeek(userSeekIndex, seekTime);
    } else {
      this.props.onUserSeek(time);
      this.setState({ userSeekTime: time });
    }
  }

  onPlaySeek(time) {
    // console.log('Play seek', time);
    const message = this.props.messages[this.props.selectedMessage];
    if (!message || message.entries.length === 0) {
      this.props.onSeek(0, time);
      return;
    }

    const seekIndex = this.indexFromSeekTime(time);
    const seekTime = time;

    this.props.onSeek(seekIndex, seekTime);
  }

  onGraphTimeClick(messageId, time) {
    const canTime = time + this.props.firstCanTime;

    const { entries } = this.props.messages[messageId];
    if (entries.length) {
      const userSeekIndex = Entries.findTimeIndex(entries, canTime);

      this.props.onUserSeek(time);
      this.setState({
        userSeekIndex,
        userSeekTime: time
      });
    } else {
      this.setState({ userSeekTime: time });
    }
  }

  onPlay() {
    this.setState({ playing: true });
  }

  onPause() {
    this.setState({ playing: false });
  }

  secondsLoadedRouteRelative(currentParts) {
    return (currentParts[1] - currentParts[0] + 1) * 60;
  }

  secondsLoaded() {
    return this.props.partsCount * 60;
  }

  onVideoClick() {
    const playing = !this.state.playing;
    this.setState({ playing });
  }

  seekTime() {
    const { userSeekIndex } = this.state;
    const msg = this.props.messages[this.props.selectedMessage];
    return msg.entries[userSeekIndex].time;
  }

  onSignalPlotChange(shouldPlot, messageId, signalUid) {
    if (shouldPlot) {
      this.onSignalPlotPressed(messageId, signalUid);
    } else {
      this.onSignalUnplotPressed(messageId, signalUid);
    }
  }

  renderSelectMessagePrompt() {
    return (
      <div className="cabana-explorer-select-prompt">
        <h1>Select a message</h1>
      </div>
    );
  }

  selectedMessagePlottedSignalUids() {
    const { plottedSignals } = this.state;
    return plottedSignals
      .map(plot =>
        plot
          .filter(
            ({ messageId, signalUid }) =>
              messageId === this.props.selectedMessage
          )
          .map(({ signalUid }) => signalUid)
      )
      .reduce((arr, signalUid) => arr.concat(signalUid), []);
  }

  renderExplorerSignals() {
    const selectedMessageKey = this.props.selectedMessage;
    const selectedMessage = this.props.messages[selectedMessageKey];
    const selectedMessageName =
      selectedMessage.frame !== undefined
        ? selectedMessage.frame.name
        : "undefined";
    return (
      <div className="cabana-explorer-signals-wrapper">
        <div className="cabana-explorer-signals-header">
          <div className="cabana-explorer-signals-header-context">
            <h5 className="t-capline">Selected Message:</h5>
            <h3>{selectedMessageName}</h3>
          </div>
          <div className="cabana-explorer-signals-header-action">
            <button
              className="button--small"
              onClick={() =>
                this.props.showEditMessageModal(selectedMessageKey)
              }
            >
              Edit
            </button>
          </div>
        </div>
        <div
          className="cabana-explorer-signals-subheader"
          onClick={this.toggleShouldShowAddSignal}
        >
          <strong>Edit Signals</strong>
        </div>
        <div className="cabana-explorer-signals-window">
          {this.state.shouldShowAddSignal ? (
            <AddSignals
              onConfirmedSignalChange={this.props.onConfirmedSignalChange}
              message={this.props.messages[this.props.selectedMessage]}
              onClose={() => {
                this.setState({ shouldShowAddSignal: false });
              }}
              messageIndex={this.props.seekIndex}
              onSignalPlotChange={this.onSignalPlotChange}
              plottedSignalUids={this.selectedMessagePlottedSignalUids()}
            />
          ) : null}
          <CanLog
            message={this.props.messages[this.props.selectedMessage]}
            messageIndex={this.props.seekIndex}
            segmentIndices={this.state.segmentIndices}
            plottedSignals={this.state.plottedSignals}
            onSignalPlotPressed={this.onSignalPlotPressed}
            onSignalUnplotPressed={this.onSignalUnplotPressed}
            showAddSignal={this.showAddSignal}
            onMessageExpanded={this.onPause}
          />
        </div>
      </div>
    );
  }

  mergePlots({ fromPlot, toPlot }) {
    let { plottedSignals, graphData } = this.state;

    // remove fromPlot from plottedSignals, graphData
    const fromPlotIdx = plottedSignals.findIndex(plot =>
      plot.some(
        signal =>
          signal.signalUid === fromPlot.signalUid &&
          signal.messageId === fromPlot.messageId
      )
    );
    plottedSignals.splice(fromPlotIdx, 1);
    graphData.splice(fromPlotIdx, 1);

    // calc new graph data
    const newGraphData = this.calcGraphData([fromPlot, toPlot]);

    const toPlotIdx = plottedSignals.findIndex(plot =>
      plot.some(
        signal =>
          signal.signalUid === toPlot.signalUid &&
          signal.messageId === toPlot.messageId
      )
    );
    graphData[toPlotIdx] = newGraphData;
    plottedSignals[toPlotIdx] = [fromPlot, toPlot];

    this.setState({ graphData, plottedSignals });
  }

  render() {
    const signalsExpandedClass = this.state.shouldShowAddSignal
      ? "is-expanded"
      : null;
    return (
      <div className="cabana-explorer">
        <div className={cx("cabana-explorer-signals", signalsExpandedClass)}>
          {this.props.messages[this.props.selectedMessage]
            ? this.renderExplorerSignals()
            : this.renderSelectMessagePrompt()}
        </div>
        <div className="cabana-explorer-visuals">
          {this.props.live === false ? (
            <div>
              <PlaySpeedSelector
                playSpeed={this.state.playSpeed}
                onPlaySpeedChanged={this.changePlaySpeed}
              />
              <div className="cabana-explorer-visuals-header g-row" />
              <br />
              <RouteVideoSync
                message={this.props.messages[this.props.selectedMessage]}
                segment={this.state.segment}
                seekIndex={this.props.seekIndex}
                userSeekIndex={this.state.userSeekIndex}
                playing={this.state.playing}
                url={this.props.url}
                canFrameOffset={this.props.canFrameOffset}
                firstCanTime={this.props.firstCanTime}
                onVideoClick={this.onVideoClick}
                onPlaySeek={this.onPlaySeek}
                onUserSeek={this.onUserSeek}
                onPlay={this.onPlay}
                onPause={this.onPause}
                userSeekTime={this.state.userSeekTime}
                playSpeed={this.state.playSpeed}
              />
            </div>
          ) : null}
          {this.state.segment.length > 0 ? (
            <div
              className={"cabana-explorer-visuals-segmentreset"}
              onClick={() => {
                this.resetSegment();
              }}
            >
              <p>Reset Segment</p>
            </div>
          ) : null}
          <CanGraphList
            plottedSignals={this.state.plottedSignals}
            messages={this.props.messages}
            onGraphTimeClick={this.onGraphTimeClick}
            seekTime={this.props.seekTime}
            onSegmentChanged={this.onSegmentChanged}
            onSignalUnplotPressed={this.onSignalUnplotPressed}
            segment={this.state.segment}
            mergePlots={this.mergePlots}
            live={this.props.live}
          />
        </div>
      </div>
    );
  }
}
