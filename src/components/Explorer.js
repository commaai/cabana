import React, { Component } from 'react';
import PropTypes from 'prop-types';

import cx from 'classnames';

import AddSignals from './AddSignals';
import CanGraphList from './CanGraphList';
import RouteVideoSync from './RouteVideoSync';
import CanLog from './CanLog';
import Entries from '../models/can/entries';
import debounce from '../utils/debounce';
import PlaySpeedSelector from './PlaySpeedSelector';

function clipSegment(_segment, _segmentIndices, nextMessage) {
  let segment = _segment;
  let segmentIndices = _segmentIndices;
  if (segment.length === 2) {
    const segmentStartIdx = nextMessage.entries.findIndex(
      (e) => e.relTime >= segment[0]
    );
    let segmentEndIdx = nextMessage.entries.findIndex(
      (e) => e.relTime >= segment[1]
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

export default class Explorer extends Component {
  updateSegment = debounce((messageId, _segment) => {
    let segment = _segment;
    const { messages, selectedMessage, currentParts } = this.props;
    const { entries } = messages[selectedMessage];
    let segmentIndices = Entries.findSegmentIndices(entries, segment, true);

    // console.log(this.state.segment, '->', segment, segmentIndices);
    if (
      segment[0] === currentParts[0] * 60
      && segment[1] === (currentParts[1] + 1) * 60
    ) {
      segment = [];
      segmentIndices = [];
    }
    let { userSeekTime } = this.state;
    if (segment.length) {
      userSeekTime = Math.max(segment[0], userSeekTime);
      userSeekTime = Math.min(segment[1], userSeekTime);
    } else {
      userSeekTime = Math.max(currentParts[0] * 60, userSeekTime);
      userSeekTime = Math.min(currentParts[1] * 60, userSeekTime);
    }
    this.setState({
      segment,
      segmentIndices,
      userSeekIndex: segmentIndices[0],
      userSeekTime
    });
  }, 250);

  constructor(props) {
    super(props);

    this.state = {
      plottedSignals: [],
      segment: props.startSegments || [],
      segmentIndices: [],
      shouldShowAddSignal: true,
      userSeekIndex: 0,
      userSeekTime: 0,
      playing: props.autoplay,
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
    this.onKeyDown = this.onKeyDown.bind(this);
    this.mergePlots = this.mergePlots.bind(this);
    this.toggleShouldShowAddSignal = this.toggleShouldShowAddSignal.bind(this);
    this.changePlaySpeed = this.changePlaySpeed.bind(this);
  }

  componentDidMount() {
    document.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown);
  }

  onKeyDown(e) {
    if (e.keyCode === 27) {
      // escape
      this.resetSegment();
    }
  }

  componentWillReceiveProps(nextProps) {
    const nextMessage = nextProps.messages[nextProps.selectedMessage];
    const curMessage = this.props.messages[this.props.selectedMessage];
    let { plottedSignals } = this.state;

    if (Object.keys(nextProps.messages).length === 0 && Object.keys(this.props.messages).length !== 0) {
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
      .map((plot) => plot.filter(({ messageId, signalUid }, index) => {
        const messageExists = !!nextProps.messages[messageId];
        let signalExists = true;
        if (messageExists) {
          signalExists = Object.values(
            nextProps.messages[messageId].frame.signals
          ).some((signal) => signal.uid === signalUid);
        }

        return messageExists && signalExists;
      }))
      .filter((plot) => plot.length > 0);

    this.setState({ plottedSignals });

    if (
      nextProps.selectedMessage
      && nextProps.selectedMessage !== this.props.selectedMessage
    ) {
      // Update segment and seek state
      // by finding a entry indices
      // corresponding to old message segment/seek times.

      const { segment, segmentIndices } = clipSegment(
        this.state.segment,
        this.state.segmentIndices,
        nextMessage
      );

      // console.log('componentWillReceiveProps', this.state.userSeekTime, '->', nextSeekTime);
      this.setState({
        segment,
        segmentIndices,
        userSeekIndex: nextProps.seekIndex,
        // userSeekTime: nextSeekTime
      });
    }

    if (
      nextMessage
      && curMessage
      && nextMessage.entries.length !== curMessage.entries.length
    ) {
      const { segment, segmentIndices } = clipSegment(
        this.state.segment,
        this.state.segmentIndices,
        nextMessage
      );
      // console.log(this.state.segment, '->', segment, segmentIndices);
      this.setState({ segment, segmentIndices });
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
      const partStartOffset = currentParts[0] * 60;
      const partEndOffset = (currentParts[1] + 1) * 60;

      const windowStartTime = routeStartTime
        .clone()
        .add(partStartOffset, 's')
        .format('HH:mm:ss');
      const windowEndTime = routeStartTime
        .clone()
        .add(partEndOffset, 's')
        .format('HH:mm:ss');

      return `${windowStartTime} - ${windowEndTime}`;
    }
    return '';
  }

  onSignalPlotPressed(messageId, signalUid) {
    let { plottedSignals } = this.state;

    plottedSignals = [[{ messageId, signalUid }], ...plottedSignals];

    this.setState({ plottedSignals });
  }

  onSignalUnplotPressed(messageId, signalUid) {
    const { plottedSignals } = this.state;
    const newPlottedSignals = plottedSignals
      .map((plot) => plot.filter(
        (signal) => !(signal.messageId === messageId && signal.signalUid === signalUid)
      ))
      .filter((plot) => plot.length > 0);

    this.setState({ plottedSignals: newPlottedSignals });
  }

  onSegmentChanged(messageId, segment) {
    if (Array.isArray(segment)) {
      this.updateSegment(messageId, segment);
    }
  }

  resetSegment() {
    const { segment, segmentIndices } = this.state;
    if (segment.length > 0 || segmentIndices.length > 0) {
      // console.log(this.state.segment, '->', segment, segmentIndices);
      this.setState({
        segment: [],
        segmentIndices: [],
        userSeekIndex: 0
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
    }
    for (let i = 0; i < entries.length; i++) {
      if (entries[i].relTime >= time) {
        return i;
      }
    }
    return entries.length - 1;
  }

  onUserSeek(time) {
    this.props.onUserSeek(time);
    this.setState({ userSeekTime: time });
  }

  onPlaySeek(time) {
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
    this.onUserSeek(time);
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
      .map((plot) => plot
        .filter(
          ({ messageId, signalUid }) => messageId === this.props.selectedMessage
        )
        .map(({ signalUid }) => signalUid))
      .reduce((arr, signalUid) => arr.concat(signalUid), []);
  }

  renderExplorerSignals() {
    const selectedMessageKey = this.props.selectedMessage;
    const selectedMessage = this.props.messages[selectedMessageKey];
    const selectedMessageName = selectedMessage.frame !== undefined
      ? selectedMessage.frame.name
      : 'undefined';
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
              onClick={() => this.props.showEditMessageModal(selectedMessageKey)}
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
              selectedMessageKey={selectedMessageKey}
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
    const { plottedSignals } = this.state;

    // remove fromPlot from plottedSignals
    const fromPlotIdx = plottedSignals.findIndex((plot) => plot.some(
      (signal) => signal.signalUid === fromPlot.signalUid
          && signal.messageId === fromPlot.messageId
    ));
    plottedSignals.splice(fromPlotIdx, 1);

    const toPlotIdx = plottedSignals.findIndex((plot) => plot.some(
      (signal) => signal.signalUid === toPlot.signalUid
          && signal.messageId === toPlot.messageId
    ));
    plottedSignals[toPlotIdx] = [fromPlot, toPlot];

    this.setState({ plottedSignals });
  }

  render() {
    const signalsExpandedClass = this.state.shouldShowAddSignal
      ? 'is-expanded'
      : null;

    const { thumbnails, messages, startTime } = this.props;

    let graphSegment = this.state.segment;
    if (!graphSegment.length && this.props.currentParts) {
      graphSegment = [
        this.props.currentParts[0] * 60,
        (this.props.currentParts[1] + 1) * 60
      ];
    }
    return (
      <div className="cabana-explorer">
        <div className={cx('cabana-explorer-signals', signalsExpandedClass)}>
          {messages[this.props.selectedMessage]
            ? this.renderExplorerSignals()
            : this.renderSelectMessagePrompt()}
        </div>
        <div className="cabana-explorer-visuals">
          {this.props.live === false ? (
            <div>
              <div className="cabana-explorer-visuals-header g-row">
                <PlaySpeedSelector
                  playSpeed={this.state.playSpeed}
                  onPlaySpeedChanged={this.changePlaySpeed}
                />
              </div>
              <RouteVideoSync
                message={messages[this.props.selectedMessage]}
                segment={this.state.segment}
                startTime={startTime}
                seekIndex={this.props.seekIndex}
                userSeekIndex={this.state.userSeekIndex}
                playing={this.state.playing}
                url={this.props.url}
                firstCanTime={this.props.firstCanTime}
                videoOffset={this.props.videoOffset}
                onVideoClick={this.onVideoClick}
                onPlaySeek={this.onPlaySeek}
                onUserSeek={this.onUserSeek}
                onPlay={this.onPlay}
                onPause={this.onPause}
                userSeekTime={this.state.userSeekTime}
                playSpeed={this.state.playSpeed}
                thumbnails={thumbnails}
              />
            </div>
          ) : null}
          {this.state.segment.length > 0 ? (
            <div
              className="cabana-explorer-visuals-segmentreset"
              onClick={() => {
                this.resetSegment();
              }}
            >
              <p>Reset Segment</p>
            </div>
          ) : null}
          <CanGraphList
            plottedSignals={this.state.plottedSignals}
            messages={messages}
            onGraphTimeClick={this.onGraphTimeClick}
            seekTime={this.props.seekTime}
            onSegmentChanged={this.onSegmentChanged}
            onSignalUnplotPressed={this.onSignalUnplotPressed}
            segment={graphSegment}
            mergePlots={this.mergePlots}
            live={this.props.live}
          />
        </div>
      </div>
    );
  }
}

Explorer.propTypes = {
  selectedMessage: PropTypes.string,
  url: PropTypes.string,
  live: PropTypes.bool.isRequired,
  messages: PropTypes.objectOf(PropTypes.object),
  thumbnails: PropTypes.array.isRequired,
  onConfirmedSignalChange: PropTypes.func.isRequired,
  canFrameOffset: PropTypes.number,
  firstCanTime: PropTypes.number,
  onSeek: PropTypes.func.isRequired,
  autoplay: PropTypes.bool.isRequired,
  currentParts: PropTypes.array.isRequired,
  partsCount: PropTypes.number,
  startTime: PropTypes.number,
  startSegments: PropTypes.array
};
