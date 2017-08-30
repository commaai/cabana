import React, {Component} from 'react';
import PropTypes from 'prop-types';
import Hls from 'hls.js/lib';

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
    if( (nextProps.shouldRestart || nextProps.startTime !== this.props.startTime)
        && isFinite(nextProps.startTime)) {
      this.videoElement.currentTime = nextProps.startTime;
      this.props.onRestart();
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
        this.props.onPlaySeek(this.videoElement.currentTime);
      }
    });
    let shouldInitVideoTime = true;
    this.videoElement.addEventListener('seeked', () => {
      if(!this.props.playing) {
        if(shouldInitVideoTime) {
          this.videoElement.currentTime = this.props.startTime;
          shouldInitVideoTime = false;
        }
        this.props.onLoadEnd();
      }
    });

    this.props.onVideoElementAvailable(this.videoElement);
    if(this.props.playing) {
      this.videoElement.play();
    }
  }

  render() {
    return (
      <div
        className='cabana-explorer-visuals-camera-wrapper'
        onClick={this.props.onClick}>
        <video ref={ (video) => { this.videoElement = video; } } />
      </div>
    );
  }
}
