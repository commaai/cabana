import React, { Component } from "react";
import PropTypes from "prop-types";
import { StyleSheet, css } from "aphrodite/no-important";

import HLS from "./HLS";
import { cameraPath } from "../api/routes";
import Video from "../api/video";
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
    secondsLoaded: PropTypes.number.isRequired,
    startOffset: PropTypes.number.isRequired,
    message: PropTypes.object,
    firstCanTime: PropTypes.number.isRequired,
    canFrameOffset: PropTypes.number.isRequired,
    url: PropTypes.string.isRequired,
    playing: PropTypes.bool.isRequired,
    onPlaySeek: PropTypes.func.isRequired,
    onUserSeek: PropTypes.func.isRequired,
    onPlay: PropTypes.func.isRequired,
    onPause: PropTypes.func.isRequired,
    userSeekTime: PropTypes.number.isRequired
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
  }

  nearestFrameUrl() {
    const { url } = this.props;
    const sec = Math.round(this.props.userSeekTime);
    return cameraPath(url, sec);
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

  segmentProgress(currentTime) {
    // returns progress as number in [0,1]

    if (currentTime < this.props.startOffset) {
      currentTime = this.props.startOffset;
    }

    const ratio =
      (currentTime - this.props.startOffset) / this.props.secondsLoaded;
    return Math.max(0, Math.min(1, ratio));
  }

  ratioTime(ratio) {
    return ratio * this.props.secondsLoaded + this.props.startOffset;
  }

  onVideoElementAvailable(videoElement) {
    this.setState({ videoElement });
  }

  onUserSeek(ratio) {
    /* ratio in [0,1] */

    const funcSeekToRatio = () => this.props.onUserSeek(this.ratioTime(ratio));
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
          source={Video.videoUrlForRouteUrl(this.props.url)}
          startTime={this.props.userSeekTime}
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
          secondsLoaded={this.props.secondsLoaded}
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
