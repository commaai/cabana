import React, { Component } from "react";
import PropTypes from "prop-types";
import Hls from "hls.js";

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
    this.videoElement.playbackRate = nextProps.playbackSpeed;

    if (nextProps.source !== this.props.source) {
      this.loadSource(nextProps.source);
    }
    if (nextProps.playing) {
      if (
        this.videoElement &&
        (this.videoElement.paused || this.videoElement.currentTime < 0.01)
      ) {
        this.videoElement.play();
      }
    } else {
      this.videoElement.pause();
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
    this.player = new Hls({ disablePtsDtsCorrectionInMp4Remux: true });
    this.loadSource();
  }

  loadSource(source = this.props.source) {
    if (this.videoElement) {
      this.player.loadSource(source);
      this.player.attachMedia(this.videoElement);
      this.props.onVideoElementAvailable(this.videoElement);
      this.videoElement.currentTime = this.props.startTime;
    }
  }

  componentWillUnmount() {
    // destroy hls video source
    if (this.player) {
      this.player.destroy();
    }
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
          muted
          onWaiting={this.props.onLoadStart}
          onPlaying={this.props.onLoadEnd}
          onSeeking={this.onSeeking}
          onSeeked={this.onSeeked}
        />
      </div>
    );
  }
}
