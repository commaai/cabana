import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, css } from 'aphrodite/no-important';
import Hls from 'hls.js';

export default class HLS extends Component {
  static propTypes = {
    source: PropTypes.string.isRequired,
    startTime: PropTypes.number.isRequired,
    playbackSpeed: PropTypes.number.isRequired,
    playing: PropTypes.bool.isRequired,
    onVideoElementAvailable: PropTypes.func,
    onClick: PropTypes.func,
    onLoadStart: PropTypes.func,
    onLoadEnd: PropTypes.func
  };

  componentWillReceiveProps(nextProps) {
    if(nextProps.startTime != this.props.startTime) {
      this.videoElement.currentTime = nextProps.startTime;
    }

    if(nextProps.playing) {
      this.videoElement.play();
    } else {
      this.videoElement.pause();
    }

  }

  componentDidMount() {
    this.player = new Hls();
    this.player.loadSource(this.props.source);
    this.player.attachMedia(this.videoElement);
    // these events fire when video is playing
    this.videoElement.addEventListener('waiting', this.props.onLoadStart);
    this.videoElement.addEventListener('playing', this.props.onLoadEnd);

    // these events fire when video is paused & seeked
    this.videoElement.addEventListener('seeking', () => {
      if(!this.props.playing) {
        this.props.onLoadStart();
      }
    });
    this.videoElement.addEventListener('seeked', () => {
      if(!this.props.playing) {
        this.props.onLoadEnd();
      }
    });

    this.props.onVideoElementAvailable(this.videoElement);
  }

  render() {
    return (<div onClick={this.props.onClick}
                 style={{cursor: 'pointer'}}>
              <video ref={ (video) => { this.videoElement = video; } } />
            </div>);
  }
}
