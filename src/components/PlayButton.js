import React, { Component } from "react";
import PropTypes from "prop-types";

export default class PlayButton extends Component {
  static propTypes = {
    onPlay: PropTypes.func,
    onPause: PropTypes.func,
    isPlaying: PropTypes.bool,
    className: PropTypes.string
  };

  constructor(props) {
    super(props);
    this.state = { hover: false };

    this.onClick = this.onClick.bind(this);
  }

  imageSource() {
    const { hover } = this.state;
    const { isPlaying } = this.props;
    if (isPlaying) {
      if (hover) {
        return (
          process.env.PUBLIC_URL + "/img/ic_pause_circle_filled_white_24px.svg"
        );
      } else {
        return (
          process.env.PUBLIC_URL + "/img/ic_pause_circle_outline_white_24px.svg"
        );
      }
    } else {
      if (hover) {
        return (
          process.env.PUBLIC_URL + "/img/ic_play_circle_filled_white_24px.svg"
        );
      } else {
        return (
          process.env.PUBLIC_URL + "/img/ic_play_circle_outline_white_24px.svg"
        );
      }
    }
  }

  onClick(e) {
    let { isPlaying } = this.props;

    if (!isPlaying) {
      this.props.onPlay();
    } else {
      this.props.onPause();
    }
  }

  render() {
    return (
      <img
        src={this.imageSource()}
        alt={this.props.isPlaying ? "Pause" : "Play"}
        className={this.props.className}
        onClick={this.onClick}
        onMouseOver={() => this.setState({ hover: true })}
        onMouseLeave={() => this.setState({ hover: false })}
      />
    );
  }
}
