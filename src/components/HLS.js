import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Hls from '@commaai/hls.js';

export default class HLS extends Component {
  static propTypes = {
    source: PropTypes.string.isRequired,
    startTime: PropTypes.number.isRequired,
    playbackSpeed: PropTypes.number.isRequired,
    playing: PropTypes.bool.isRequired,
    onVideoElementAvailable: PropTypes.func,
    onStartTimeAvailable: PropTypes.func,
    onClick: PropTypes.func,
    onLoadStart: PropTypes.func,
    onLoadEnd: PropTypes.func,
    onPlaySeek: PropTypes.func,
    onRestart: PropTypes.func
  };

  componentWillReceiveProps(nextProps) {
    this.videoElement.playbackRate = nextProps.playbackSpeed;

    if (nextProps.source !== this.props.source) {
      this.loadSource(nextProps.source);
    }
    if (nextProps.playing) {
      if (
        this.videoElement
        && (this.videoElement.paused || this.videoElement.currentTime < 0.01)
      ) {
        this.videoElement.play();
      }
    } else {
      this.videoElement.pause();
    }
  }

  componentDidMount() {
    this.player = new Hls({
      enableWorker: false,
      disablePtsDtsCorrectionInMp4Remux: false,
      debug: true
    });
    this.player.on(Hls.Events.INIT_PTS_FOUND, (event, data) => {
      const time = data.initPTS/90000;
      this.props.onStartTimeAvailable(time);
    });
    this.player.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
          // try to recover network error
            console.log('fatal network error encountered, try to recover');
            this.player.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.log('fatal media error encountered, try to recover');
            this.player.recoverMediaError();
            break;
          default:
          // cannot recover
            this.player.destroy();
            this.player = null;
            break;
        }
      }
    });
    this.loadSource();
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

  render() {
    return (
      <div
        className="cabana-explorer-visuals-camera-wrapper"
        onClick={this.props.onClick}
      >
        <video
          ref={(video) => {
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
