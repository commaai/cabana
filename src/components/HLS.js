import React, { Component } from "react";
import PropTypes from "prop-types";
import Hls from "hls.js/lib";

export default class HLS extends Component {
  static propTypes = {
    source: PropTypes.string.isRequired,
    startTime: PropTypes.number.isRequired,
    playbackSpeed: PropTypes.number.isRequired,
    playing: PropTypes.bool.isRequired,
    onVideoElementAvailable: PropTypes.func,
    onClick: PropTypes.func,
    onLoadStart: PropTypes.func,
    onLoadEnd: PropTypes.func,
    onPlaySeek: PropTypes.func,
    segmentProgress: PropTypes.func,
    shouldRestart: PropTypes.bool,
    onRestart: PropTypes.func
  };

  componentWillReceiveProps(nextProps) {
    if (
      (nextProps.shouldRestart ||
        nextProps.startTime !== this.props.startTime) &&
      isFinite(nextProps.startTime)
    ) {
      this.videoElement.currentTime = nextProps.startTime;
      this.props.onRestart();
    }
  }

  onSeeking = () => {
    if (!this.props.playing) {
      this.props.onLoadStart();
      this.props.onPlaySeek(this.videoElement.currentTime);
    }
  };

  // legacy outer scope variable. Revisit this to see if putting in state
  // makes more sense
  shouldInitVideoTime = true;
  onSeeked = () => {
    if (!this.props.playing) {
      if (this.shouldInitVideoTime) {
        this.videoElement.currentTime = this.props.startTime;
        this.shouldInitVideoTime = false;
      }
      this.props.onLoadEnd();
    }
  };

  componentDidMount() {
    this.player = new Hls();
    this.player.loadSource(this.props.source);
    this.player.attachMedia(this.videoElement);

    this.props.onVideoElementAvailable(this.videoElement);
  }

  render() {
    return (
      <div
        className="cabana-explorer-visuals-camera-wrapper"
        onClick={this.props.onClick}
      >
        <video
          ref={video => {
            this.videoElement = video;
          }}
          autoPlay={this.props.playing}
          onWaiting={this.props.onLoadStart}
          onPlaying={this.props.onLoadEnd}
          onSeeking={this.onSeeking}
          onSeeked={this.onSeeked}
        />
      </div>
    );
  }
}
