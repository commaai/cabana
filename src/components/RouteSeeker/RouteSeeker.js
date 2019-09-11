import React, { Component } from "react";
import PropTypes from "prop-types";
import PlayButton from "../PlayButton";
import debounce from "../../utils/debounce";

export default class RouteSeeker extends Component {
  static propTypes = {
    videoLength: PropTypes.number.isRequired,
    segmentIndices: PropTypes.arrayOf(PropTypes.number),
    onUserSeek: PropTypes.func,
    onPlaySeek: PropTypes.func,
    video: PropTypes.node,
    onPause: PropTypes.func,
    onPlay: PropTypes.func,
    playing: PropTypes.bool,
    segmentProgress: PropTypes.func,
    ratioTime: PropTypes.func,
    nearestFrameTime: PropTypes.number
  };

  static hiddenMarkerStyle = { display: "none", left: 0 };
  static zeroSeekedBarStyle = { width: 0 };
  static hiddenTooltipStyle = { display: "none", left: 0 };
  static markerWidth = 20;
  static tooltipWidth = 50;

  constructor(props) {
    super(props);
    this.state = {
      seekedBarStyle: RouteSeeker.zeroSeekedBarStyle,
      markerStyle: RouteSeeker.hiddenMarkerStyle,
      tooltipStyle: RouteSeeker.hiddenTooltipStyle,
      ratio: 0,
      tooltipTime: "0:00",
      isPlaying: false,
      isDragging: false
    };

    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onPlay = this.onPlay.bind(this);
    this.onPause = this.onPause.bind(this);
    this.executePlayTimer = this.executePlayTimer.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const { ratio } = this.state;

    if (
      JSON.stringify(this.props.segmentIndices) !==
      JSON.stringify(nextProps.segmentIndices)
    ) {
      this.setState({
        seekedBarStyle: RouteSeeker.zeroSeekedBarStyle,
        markerStyle: RouteSeeker.hiddenMarkerStyle,
        ratio: 0
      });
    } else if (nextProps.videoLength !== this.props.videoLength) {
      // adjust ratio in line with new videoLength
      const secondsSeeked = ratio * this.props.videoLength;
      const newRatio = secondsSeeked / nextProps.videoLength;
      this.updateSeekedBar(newRatio);
    }

    if (this.props.nearestFrameTime !== nextProps.nearestFrameTime) {
      const newRatio = this.props.segmentProgress(nextProps.nearestFrameTime);
      this.updateSeekedBar(newRatio);
    }

    if (nextProps.playing && !this.state.isPlaying) {
      this.onPlay();
    } else if (!nextProps.playing && this.state.isPlaying) {
      this.onPause();
    }
  }

  componentWillUnmount() {
    window.cancelAnimationFrame(this.playTimer);
  }

  mouseEventXOffsetPercent(e) {
    const rect = this.progressBar.getBoundingClientRect();
    const x = e.clientX - rect.left;

    return 100 * (x / this.progressBar.offsetWidth);
  }

  updateDraggingSeek = debounce(ratio => this.props.onUserSeek(ratio), 250);

  onMouseMove(e) {
    const markerOffsetPct = this.mouseEventXOffsetPercent(e);
    if (markerOffsetPct < 0) {
      this.onMouseLeave();
      return;
    }
    const markerWidth = RouteSeeker.markerWidth;

    const markerLeft = `calc(${markerOffsetPct + "%"} - ${markerWidth / 2}px)`;
    const markerStyle = {
      display: "",
      left: markerLeft
    };
    const tooltipWidth = RouteSeeker.tooltipWidth;
    const tooltipLeft = `calc(${markerOffsetPct + "%"} - ${tooltipWidth /
      2}px)`;

    const tooltipStyle = { display: "flex", left: tooltipLeft };
    const ratio = Math.max(0, markerOffsetPct / 100);
    if (this.state.isDragging) {
      this.updateSeekedBar(ratio);
      this.updateDraggingSeek(ratio);
    }

    this.setState({
      markerStyle,
      tooltipStyle,
      tooltipTime: this.props.ratioTime(ratio).toFixed(3)
    });
  }

  onMouseLeave(e) {
    this.setState({
      markerStyle: RouteSeeker.hiddenMarkerStyle,
      tooltipStyle: RouteSeeker.hiddenTooltipStyle,
      isDragging: false
    });
  }

  updateSeekedBar(ratio) {
    const seekedBarStyle = { width: 100 * ratio + "%" };
    this.setState({ seekedBarStyle, ratio });
  }

  onClick(e) {
    let ratio = this.mouseEventXOffsetPercent(e) / 100;
    ratio = Math.min(1, Math.max(0, ratio));
    this.updateSeekedBar(ratio);
    this.props.onUserSeek(ratio);
  }

  onPlay() {
    this.playTimer = window.requestAnimationFrame(this.executePlayTimer);
    let { ratio } = this.state;
    if (ratio >= 1) {
      ratio = 0;
    }
    this.setState({ isPlaying: true, ratio });
    this.props.onPlay();
  }

  executePlayTimer() {
    const { videoElement } = this.props;
    if (videoElement === null) {
      this.playTimer = window.requestAnimationFrame(this.executePlayTimer);
      return;
    }

    let { videoLength, startTime } = this.props;
    let { currentTime, duration } = videoElement;

    currentTime = roundTime(currentTime);
    startTime = roundTime(startTime);
    videoLength = roundTime(videoLength);
    duration = roundTime(duration);

    let newRatio = (currentTime - startTime) / videoLength;

    if (newRatio === this.state.ratio) {
      this.playTimer = window.requestAnimationFrame(this.executePlayTimer);
      return;
    }

    if (newRatio >= 1 || newRatio < 0) {
      newRatio = 0;
      currentTime = startTime;
      this.props.onUserSeek(newRatio);
    }

    if (newRatio >= 0) {
      this.updateSeekedBar(newRatio);
      this.props.onPlaySeek(currentTime);
    }

    this.playTimer = window.requestAnimationFrame(this.executePlayTimer);
  }

  onPause() {
    window.cancelAnimationFrame(this.playTimer);
    this.setState({ isPlaying: false });
    this.props.onPause();
  }

  onMouseDown() {
    if (!this.state.isDragging) {
      this.setState({ isDragging: true });
    }
  }

  onMouseUp() {
    if (this.state.isDragging) {
      this.setState({ isDragging: false });
    }
  }

  render() {
    const { seekedBarStyle, markerStyle, tooltipStyle } = this.state;
    return (
      <div className="cabana-explorer-visuals-camera-seeker">
        <PlayButton
          className={"cabana-explorer-visuals-camera-seeker-playbutton"}
          onPlay={this.onPlay}
          onPause={this.onPause}
          isPlaying={this.state.isPlaying}
        />
        <div
          className={"cabana-explorer-visuals-camera-seeker-progress"}
          onMouseMove={this.onMouseMove}
          onMouseLeave={this.onMouseLeave}
          onMouseDown={this.onMouseDown}
          onMouseUp={this.onMouseUp}
          onClick={this.onClick}
          ref={ref => (this.progressBar = ref)}
        >
          <div
            className={"cabana-explorer-visuals-camera-seeker-progress-tooltip"}
            style={tooltipStyle}
          >
            {this.state.tooltipTime}
          </div>
          <div
            className={"cabana-explorer-visuals-camera-seeker-progress-marker"}
            style={markerStyle}
          />
          <div
            className={"cabana-explorer-visuals-camera-seeker-progress-inner"}
            style={seekedBarStyle}
          />
        </div>
      </div>
    );
  }
}

function roundTime(time) {
  return Math.round(time * 1000) / 1000;
}
