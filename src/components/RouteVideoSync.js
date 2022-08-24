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
      isLoading: true,
      videoElement: null,
      source: null,
    };

    this.onLoadStart = this.onLoadStart.bind(this);
    this.onLoadEnd = this.onLoadEnd.bind(this);
    this.segmentProgress = this.segmentProgress.bind(this);
    this.onVideoElementAvailable = this.onVideoElementAvailable.bind(this);
    this.onUserSeek = this.onUserSeek.bind(this);
    this.onPlaySeek = this.onPlaySeek.bind(this);
    this.ratioTime = this.ratioTime.bind(this);
  }

  componentDidMount() {
    this.componentDidUpdate({}, {});
  }

  componentDidUpdate(prevProps) {
    const { userSeekTime, route, share } = this.props;
    const { videoElement } = this.state;

    if (
      prevProps.userSeekTime
      && userSeekTime !== prevProps.userSeekTime
    ) {
      if (videoElement) {
        videoElement.currentTime = userSeekTime - this.props.videoOffset;
      }
    }

    if (route && (prevProps.route?.fullname !== route.fullname || prevProps.share !== share)) {
      const src = VideoApi.getQcameraStreamUrl(route.fullname, share?.exp, share?.sig);
      this.setState({ source: src });
    }
  }

  onVideoElementAvailable(videoElement) {
    this.setState({ videoElement });
  }

  onUserSeek(ratio) {
    /* ratio in [0,1] */

    const { videoElement } = this.state;
    const { onUserSeek } = this.props;
    const seekTime = this.ratioTime(ratio);
    const funcSeekToRatio = () => onUserSeek(seekTime);

    if (Number.isNaN(videoElement.duration)) {
      return;
    }
    videoElement.currentTime = seekTime - this.props.videoOffset;

    if (ratio !== 0) {
      funcSeekToRatio();
    }
  }

  onPlaySeek(offset) {
    this.seekTime = offset + this.props.videoOffset;
    this.props.onPlaySeek(this.seekTime);
  }

  onLoadStart() {
    this.setState({
      isLoading: true
    });
  }

  onLoadEnd() {
    this.setState({
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

  render() {
    const {
      isLoading,
      videoElement,
    } = this.state;
    const {
      userSeekTime,
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
        {this.state.source && <HLS
          className={css(Styles.hls)}
          source={this.state.source}
          startTime={(startTime || 0) - this.props.videoOffset}
          videoLength={this.videoLength()}
          playbackSpeed={playSpeed}
          onVideoElementAvailable={this.onVideoElementAvailable}
          playing={playing}
          onClick={onVideoClick}
          onLoadStart={this.onLoadStart}
          onLoadEnd={this.onLoadEnd}
          onUserSeek={this.onUserSeek}
          onPlaySeek={this.onPlaySeek}
        />}
        <RouteSeeker
          className={css(Styles.seekBar)}
          nearestFrameTime={userSeekTime}
          segmentProgress={this.segmentProgress}
          startTime={this.startTime() - this.props.videoOffset}
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
  maxqcamera: PropTypes.number,
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
  startTime: PropTypes.number,
  route: PropTypes.object,
  share: PropTypes.object,
};
