import React, { Component } from "react";
import PropTypes from "prop-types";
import { StyleSheet, css } from "aphrodite/no-important";
import { derived as RouteApi, video as VideoApi } from "@commaai/comma-api";

import HLS from "./HLS";
import RouteSeeker from "./RouteSeeker/RouteSeeker";

const Styles = StyleSheet.create({
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3
  },
  loadingSpinner: {
    width: "25%",
    height: "25%",
    display: "block"
  },
  img: {
    height: 480,
    display: "block",
    position: "absolute",
    zIndex: 2
  },
  hls: {
    zIndex: 1,
    height: 480,
    backgroundColor: "rgba(0,0,0,0.9)"
  },
  seekBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    zIndex: 4
  }
});

export default class RouteVideoSync extends Component {
  static propTypes = {
    userSeekIndex: PropTypes.number.isRequired,
    segment: PropTypes.array.isRequired,
    message: PropTypes.object,
    canFrameOffset: PropTypes.number.isRequired,
    url: PropTypes.string.isRequired,
    playing: PropTypes.bool.isRequired,
    onPlaySeek: PropTypes.func.isRequired,
    onUserSeek: PropTypes.func.isRequired,
    onPlay: PropTypes.func.isRequired,
    onPause: PropTypes.func.isRequired,
    userSeekTime: PropTypes.number.isRequired,
    playSpeed: PropTypes.number.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      shouldShowJpeg: true,
      isLoading: true,
      videoElement: null,
      shouldRestartHls: false
    };

    this.onLoadStart = this.onLoadStart.bind(this);
    this.onLoadEnd = this.onLoadEnd.bind(this);
    this.segmentProgress = this.segmentProgress.bind(this);
    this.onVideoElementAvailable = this.onVideoElementAvailable.bind(this);
    this.onUserSeek = this.onUserSeek.bind(this);
    this.onHlsRestart = this.onHlsRestart.bind(this);
    this.ratioTime = this.ratioTime.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (
      this.props.userSeekIndex !== nextProps.userSeekIndex ||
      this.props.canFrameOffset !== nextProps.canFrameOffset ||
      (this.props.message &&
        nextProps.message &&
        this.props.message.entries.length !== nextProps.message.entries.length)
    ) {
      this.setState({ shouldRestartHls: true });
    }
    if (
      nextProps.userSeekTime &&
      this.props.userSeekTime !== nextProps.userSeekTime
    ) {
      if (this.state.videoElement) {
        this.state.videoElement.currentTime = nextProps.userSeekTime;
      }
    }
  }

  nearestFrameUrl() {
    const { url } = this.props;
    const sec = Math.round(this.props.userSeekTime);
    if (isNaN(sec)) {
      debugger;
    }
    return RouteApi(url).getJpegUrl(sec);
  }

  loadingOverlay() {
    return (
      <div className={css(Styles.loadingOverlay)}>
        <img
          className={css(Styles.loadingSpinner)}
          src={process.env.PUBLIC_URL + "/img/loading.svg"}
          alt={"Loading video"}
        />
      </div>
    );
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
    let startTime = this.startTime();

    if (currentTime < startTime) {
      currentTime = startTime;
    }

    const ratio = (currentTime - startTime) / this.videoLength();
    return Math.max(0, Math.min(1, ratio));
  }

  ratioTime(ratio) {
    return ratio * this.videoLength() + this.startTime();
  }

  onVideoElementAvailable(videoElement) {
    this.setState({ videoElement });
  }

  onUserSeek(ratio) {
    /* ratio in [0,1] */

    let { videoElement } = this.state;
    if (isNaN(videoElement.duration)) {
      this.setState({ shouldRestartHls: true }, funcSeekToRatio);
      return;
    }
    let seekTime = this.ratioTime(ratio);
    videoElement.currentTime = seekTime;

    const funcSeekToRatio = () => this.props.onUserSeek(seekTime);
    if (ratio === 0) {
      this.setState({ shouldRestartHls: true }, funcSeekToRatio);
    } else {
      funcSeekToRatio();
    }
  }

  onHlsRestart() {
    this.setState({ shouldRestartHls: false });
  }

  render() {
    return (
      <div className="cabana-explorer-visuals-camera">
        {this.state.isLoading ? this.loadingOverlay() : null}
        {this.state.shouldShowJpeg ? (
          <img
            src={this.nearestFrameUrl()}
            className={css(Styles.img)}
            alt={"Camera preview at t = " + Math.round(this.props.userSeekTime)}
          />
        ) : null}
        <HLS
          className={css(Styles.hls)}
          source={VideoApi(
            this.props.url,
            process.env.REACT_APP_VIDEO_CDN
          ).getRearCameraStreamIndexUrl()}
          startTime={this.startTime()}
          videoLength={this.videoLength()}
          playbackSpeed={this.props.playSpeed}
          onVideoElementAvailable={this.onVideoElementAvailable}
          playing={this.props.playing}
          onClick={this.props.onVideoClick}
          onLoadStart={this.onLoadStart}
          onLoadEnd={this.onLoadEnd}
          onUserSeek={this.onUserSeek}
          onPlaySeek={this.props.onPlaySeek}
          segmentProgress={this.segmentProgress}
          shouldRestart={this.state.shouldRestartHls}
          onRestart={this.onHlsRestart}
        />
        <RouteSeeker
          className={css(Styles.seekBar)}
          nearestFrameTime={this.props.userSeekTime}
          segmentProgress={this.segmentProgress}
          startTime={this.startTime()}
          videoLength={this.videoLength()}
          segmentIndices={this.props.segmentIndices}
          onUserSeek={this.onUserSeek}
          onPlaySeek={this.props.onPlaySeek}
          videoElement={this.state.videoElement}
          onPlay={this.props.onPlay}
          onPause={this.props.onPause}
          playing={this.props.playing}
          ratioTime={this.ratioTime}
        />
      </div>
    );
  }
}
