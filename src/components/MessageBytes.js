import React, { Component } from 'react';
import PropTypes from 'prop-types';

import DbcUtils from '../utils/dbc';

export default class MessageBytes extends Component {
  static propTypes = {
    seekTime: PropTypes.number.isRequired,
    message: PropTypes.object.isRequired,
    seekIndex: PropTypes.number,
    live: PropTypes.bool.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      isVisible: true,
      lastMessageIndex: 0,
      lastSeekTime: 0,
      maxMessageBytes: 8,
    };

    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this.onCanvasRefAvailable = this.onCanvasRefAvailable.bind(this);
    this.updateCanvas = this.updateCanvas.bind(this);
  }

  componentDidMount() {
    this.componentDidUpdate({}, {});
  }

  componentDidUpdate(prevProps) {
    if (prevProps.message !== this.props.message) {
      const maxMessageBytes = DbcUtils.maxMessageSize(this.props.message, this.state.maxMessageBytes);
      this.setState({ maxMessageBytes: maxMessageBytes });
      if (this.canvas) {
        this.canvas.height = Math.ceil(maxMessageBytes / 8) * 15 * window.devicePixelRatio;
      }
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps.live) {
      const nextLastEntry = nextProps.message.entries[nextProps.message.entries.length - 1];
      const curLastEntry = this.props.message.entries[
        this.props.message.entries.length - 1
      ];

      return !nextLastEntry || !curLastEntry || nextLastEntry.hexData !== curLastEntry.hexData;
    }
    return nextProps.seekTime !== this.props.seekTime;
  }

  componentDidUpdate(prevProps) {
    if (prevProps.seekIndex !== this.props.seekIndex ||
      Math.floor(prevProps.seekTime * 60) !== Math.floor(this.props.seekTime * 60))
    {
      this.updateCanvas();
    }
  }

  findMostRecentMessage(seekTime) {
    const { message } = this.props;
    const { lastMessageIndex, lastSeekTime } = this.state;
    let mostRecentMessageIndex = null;
    if (seekTime >= lastSeekTime) {
      for (let i = lastMessageIndex; i < message.entries.length; ++i) {
        const msg = message.entries[i];
        if (msg && msg.relTime >= seekTime) {
          mostRecentMessageIndex = i;
          break;
        }
      }
    }

    if (!mostRecentMessageIndex) {
      // TODO this can be faster with binary search, not currently a bottleneck though.

      mostRecentMessageIndex = message.entries.findIndex(
        (e) => e.relTime >= seekTime
      );
    }

    if (mostRecentMessageIndex) {
      this.setState({
        lastMessageIndex: mostRecentMessageIndex,
        lastSeekTime: seekTime
      });
      return message.entries[mostRecentMessageIndex];
    }
  }

  updateCanvas() {
    const { message, live, seekTime } = this.props;
    if (!this.canvas || message.entries.length === 0) return;

    let mostRecentMsg = message.entries[message.entries.length - 1];
    if (!live) {
      mostRecentMsg = this.findMostRecentMessage(seekTime);

      if (!mostRecentMsg) {
        mostRecentMsg = message.entries[0];
      }
    }

    const ctx = this.canvas.getContext('2d');
    // ctx.clearRect(0, 0, 180, 15);

    for (let i = 0; i < message.byteStateChangeCounts.length; ++i) {
      const hexData = mostRecentMsg.hexData.substr(i * 2, 2);

      const x = (i % 8) * 20;
      const y = Math.floor(i / 8) * 15;

      ctx.fillStyle = message.byteColors[i];
      ctx.fillRect(x, y, 20, 15);

      ctx.font = '12px Courier';
      ctx.fillStyle = 'white';
      ctx.fillText(hexData ? hexData : '-', x + 2, y + 12);
    }
  }

  onVisibilityChange(isVisible) {
    if (isVisible !== this.state.isVisible) {
      this.setState({ isVisible });
    }
  }

  onCanvasRefAvailable(ref) {
    if (!ref) return;

    this.canvas = ref;
    this.canvas.width = 160 * window.devicePixelRatio;
    this.canvas.height = Math.ceil(this.state.maxMessageBytes / 8) * 15 * window.devicePixelRatio;
    const ctx = this.canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  render() {
    return (
      <canvas
        ref={this.onCanvasRefAvailable}
        className="cabana-meta-messages-list-item-bytes-canvas"
      />
    );
  }
}
