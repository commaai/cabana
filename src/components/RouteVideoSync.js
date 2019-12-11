import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, css } from 'aphrodite/no-important';
import { video as VideoApi } from '@commaai/comma-api';

import HLS from './HLS';
import RouteSeeker from './RouteSeeker/RouteSeeker';

const Styles = StyleSheet.create({
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3
  },
  loadingSpinner: {
    width: '25%',
    height: '25%',
    display: 'block'
  },
  img: {
    height: 480,
    display: 'block',
    position: 'absolute',
    zIndex: 2
  },
  hls: {
    zIndex: 1,
    height: 480,
    backgroundColor: 'rgba(0,0,0,0.9)'
  },
  seekBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    zIndex: 4
  }
});

export default class RouteVideoSync extends Component {
  constructor(props) {
    super(props);
    this.state = {
      shouldShowJpeg: true,
      isLoading: true,
      videoElement: null,
      source: null,
      videoStartTime: null,
      offset: 0,
    };

    this.onLoadStart = this.onLoadStart.bind(this);
    this.onLoadEnd = this.onLoadEnd.bind(this);
    this.segmentProgress = this.segmentProgress.bind(this);
    this.onVideoElementAvailable = this.onVideoElementAvailable.bind(this);
    this.onUserSeek = this.onUserSeek.bind(this);
    this.onPlaySeek = this.onPlaySeek.bind(this);
    this.ratioTime = this.ratioTime.bind(this);
    this.onStartTimeAvailable = this.onStartTimeAvailable.bind(this);
  }

  componentWillMount() {
    this.setState({source: VideoApi(
      this.props.url,
      process.env.REACT_APP_VIDEO_CDN
    ).getQcameraStreamIndexUrl()});
  }

  componentDidUpdate(prevProps) {
    const { userSeekTime } = this.props;
    const { videoElement, videoStartTime } = this.state;

    if (
      prevProps.userSeekTime
      && userSeekTime !== prevProps.userSeekTime
    ) {
      if (videoElement) {
        videoElement.currentTime = userSeekTime - this.state.offset;
      }
    }

    if (!prevProps.routeInitTime && this.props.routeInitTime) {
      this.updateOffset();
    }
  }

  onVideoElementAvailable(videoElement) {
    this.setState({ videoElement });
  }

  onStartTimeAvailable(videoStartTime) {
    this.setState({ videoStartTime }, () => this.updateOffset());
  }

  updateOffset() {
    if (this.props.routeInitTime && this.state.videoStartTime) {
      this.setState({ offset: this.state.videoStartTime - this.props.routeInitTime });
    }
  }
  onUserSeek(ratio) {
    /* ratio in [0,1] */

    const { videoElement, videoStartTime } = this.state;
    const { onUserSeek } = this.props;
    const seekTime = this.ratioTime(ratio);
    const funcSeekToRatio = () => onUserSeek(seekTime);

    if (Number.isNaN(videoElement.duration)) {
      return;
    }
    videoElement.currentTime = seekTime - this.state.offset;

    if (ratio !== 0) {
      funcSeekToRatio();
    }
  }

  onPlaySeek(offset) {
    this.seekTime = offset + this.state.offset;
    this.props.onPlaySeek(this.seekTime);
  }

  onLoadStart() {
    this.setState({
      shouldShowJpeg: true,
      isLoading: true
    });
  }

  onLoadEnd() {
    this.setState({
      shouldShowJpeg: false,
      isLoading: false
    });
  }

  loadingOverlay() {
    return (
      <div className={css(Styles.loadingOverlay)}>
        <img
          className={css(Styles.loadingSpinner)}
          src={`${process.env.PUBLIC_URL}/img/loading.svg`}
          alt="Loading video"
        />
      </div>
    );
  }

  videoLength() {
    if (this.props.segment.length) {
      return this.props.segment[1] - this.props.segment[0];
    }

    if (this.state.videoElement) {
      return this.state.videoElement.duration;
    }

    return 0;
  }

  startTime() {
    if (this.props.segment.length) {
      return this.props.segment[0];
    }

    return 0;
  }

  segmentProgress(currentTime) {
    // returns progress as number in [0,1]
    const startTime = this.startTime();

    if (currentTime < startTime) {
      currentTime = startTime;
    }

    const ratio = (currentTime - startTime) / this.videoLength();
    return Math.max(0, Math.min(1, ratio));
  }

  ratioTime(ratio) {
    return ratio * this.videoLength() + this.startTime();
  }

  nearestFrameUrl() {
    const { thumbnails } = this.props;
    if (!this.seekTime) {
      return '';
    }
    for (let i = 0, l = thumbnails.length; i < l; ++i) {
      if (Math.abs(thumbnails[i].monoTime - this.seekTime) < 5) {
        const data = btoa(String.fromCharCode(...thumbnails[i].data));
        return `data:image/jpeg;base64,${data}`;
      }
    }
    return '';
  }

  render() {
    const {
      isLoading,
      shouldShowJpeg,
      videoElement,
      videoStartTime,
    } = this.state;
    const {
      userSeekTime,
      url,
      playSpeed,
      playing,
      onVideoClick,
      segmentIndices,
      startTime,
      segment
    } = this.props;

    return (
      <div className="cabana-explorer-visuals-camera">
        {isLoading ? this.loadingOverlay() : null}
        {shouldShowJpeg ? (
          <img
            src={this.nearestFrameUrl()}
            className={css(Styles.img)}
            alt={`Camera preview at t = ${Math.round(userSeekTime)}`}
          />
        ) : null}
        <HLS
          className={css(Styles.hls)}
          source={this.state.source}
          startTime={startTime || 0}
          videoLength={this.videoLength()}
          playbackSpeed={playSpeed}
          onVideoElementAvailable={this.onVideoElementAvailable}
          playing={playing}
          onStartTimeAvailable={this.onStartTimeAvailable}
          onClick={onVideoClick}
          onLoadStart={this.onLoadStart}
          onLoadEnd={this.onLoadEnd}
          onUserSeek={this.onUserSeek}
          onPlaySeek={this.onPlaySeek}
        />
        <RouteSeeker
          className={css(Styles.seekBar)}
          nearestFrameTime={userSeekTime}
          segmentProgress={this.segmentProgress}
          startTime={this.startTime() - this.state.offset}
          videoLength={this.videoLength()}
          segmentIndices={segmentIndices}
          onUserSeek={this.onUserSeek}
          onPlaySeek={this.onPlaySeek}
          videoElement={videoElement}
          onPlay={this.props.onPlay}
          onPause={this.props.onPause}
          playing={this.props.playing}
          ratioTime={this.ratioTime}
          segment={segment}
        />
      </div>
    );
  }
}

RouteVideoSync.propTypes = {
  segment: PropTypes.array.isRequired,
  thumbnails: PropTypes.array,
  url: PropTypes.string.isRequired,
  playing: PropTypes.bool.isRequired,
  onPlaySeek: PropTypes.func.isRequired,
  onUserSeek: PropTypes.func.isRequired,
  onPlay: PropTypes.func.isRequired,
  onPause: PropTypes.func.isRequired,
  userSeekTime: PropTypes.number.isRequired,
  playSpeed: PropTypes.number.isRequired,
  onVideoClick: PropTypes.func,
  segmentIndices: PropTypes.array,
  startTime: PropTypes.number
};
