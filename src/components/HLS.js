import React, { Component } from "react";
import { connect } from "react-redux";
import Obstruction from "obstruction";
import PropTypes from "prop-types";
import Hls from "hls.js/lib";

import { setLoading, seek } from "../actions";

class HLS extends Component {
  static propTypes = {
    source: PropTypes.string.isRequired,
    startTime: PropTypes.number.isRequired,
    playbackSpeed: PropTypes.number.isRequired,
    playing: PropTypes.bool.isRequired,
    onVideoElementAvailable: PropTypes.func,
    onClick: PropTypes.func,
    onPlaySeek: PropTypes.func,
    segmentProgress: PropTypes.func,
    shouldRestart: PropTypes.bool,
    onRestart: PropTypes.func
  };

  constructor(props) {
    super(props);

    this.state = {
      seekingTime: null
    };

    this.onLoadStart = this.onLoadStart.bind(this);
    this.onLoadEnd = this.onLoadEnd.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (
      (nextProps.shouldRestart ||
        nextProps.startTime !== this.props.startTime) &&
      isFinite(nextProps.startTime)
    ) {
      this.videoElement.currentTime = nextProps.startTime;
      this.props.onRestart();
    }

    if (!this.videoElement.currentTime) {
      this.videoElement.currentTime = nextProps.startTime;
    }
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
      this.onLoadStart();
      this.props.dispatch(seek(this.videoElement.currentTime));
    }
  };

  // legacy outer scope variable. Revisit this to see if putting in state
  // makes more sense
  shouldInitVideoTime = true;
  onSeeked = () => {
    if (!this.props.playing) {
      if (this.shouldInitVideoTime) {
        // this.videoElement.currentTime = this.props.startTime;
        this.shouldInitVideoTime = false;
      }
      this.onLoadEnd();
    }
  };

  componentDidMount() {
    this.player = new Hls();
    this.loadSource();
  }

  loadSource(source = this.props.source) {
    if (this.videoElement) {
      this.player.loadSource(source);
      this.player.attachMedia(this.videoElement);
      this.props.onVideoElementAvailable(this.videoElement);
    }
  }

  componentWillUnmount() {
    // destroy hls video source
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
  }

  onLoadStart() {
    if (!this.state.seekingTime) {
      this.videoElement.currentTime = this.props.seekTime;
      this.setState({
        seekingTime: this.props.seekTime
      });
    }
    this.props.dispatch(setLoading(true));
  }
  onLoadEnd() {
    this.props.dispatch(setLoading(false));
    this.setState({
      seekingTime: null
    });
  }

  render() {
    console.log(
      "rendering video with",
      this.props.startTime,
      this.props.seekTime
    );
    return (
      <div
        className="cabana-explorer-visuals-camera-wrapper"
        onClick={this.props.onClick}
      >
        <video
          ref={video => {
            this.videoElement = video;
          }}
          seek={this.props.seekTime}
          autoPlay={this.props.playing}
          muted
          onWaiting={this.onLoadStart}
          onPlaying={this.onLoadEnd}
          onSeeking={this.onSeeking}
          onSeeked={this.onSeeked}
        />
      </div>
    );
  }
}

const stateToProps = Obstruction({
  isLoading: "playback.isLoading",
  seekTime: "playback.seekTime"
});

export default connect(stateToProps)(HLS);
