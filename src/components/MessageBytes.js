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
    };

    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this.onCanvasRefAvailable = this.onCanvasRefAvailable.bind(this);
    this.updateCanvas = this.updateCanvas.bind(this);
    this.canvasInView = this.canvasInView.bind(this);
  }

  componentDidMount() {
    this.componentDidUpdate({}, {});
  }

  componentDidUpdate(prevProps) {
    if (prevProps.message !== this.props.message) {
      let rowCount;
      if (this.props.message.frame && this.props.message.frame.size) {
        rowCount = Math.ceil(this.props.message.frame.size / 8);
      } else {
        rowCount = Math.ceil(DbcUtils.maxMessageSize(this.props.message, this.state.maxMessageBytes) / 8);
      }
      if (this.canvas) {
        this.canvas.height = rowCount * 15;
      }
    }

    if (prevProps.seekIndex !== this.props.seekIndex ||
      Math.floor(prevProps.seekTime * 60) !== Math.floor(this.props.seekTime * 60))
    {
      this.updateCanvas();
    }
  }

  canvasInView() {
    return (!window.visualViewport || !this.canvas || (this.canvas.getBoundingClientRect().y >= 270 &&
      window.visualViewport.height >= this.canvas.getBoundingClientRect().y));
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps.live && nextProps.message.entries.length) {
      const nextLastEntry = nextProps.message.entries[nextProps.message.entries.length - 1];
      const curLastEntry = this.props.message.entries[
        this.props.message.entries.length - 1
      ];

      return !nextLastEntry || !curLastEntry || nextLastEntry.hexData !== curLastEntry.hexData;
    }
    return nextProps.seekTime !== this.props.seekTime;
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
    if (!this.canvas || message.entries.length === 0 || !this.canvasInView()) {
      return;
    }

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
    this.canvas.width = 160;
    let rowCount;
    if (this.props.message.frame && this.props.message.frame.size) {
      rowCount = Math.ceil(this.props.message.frame.size / 8);
    } else {
      rowCount = Math.ceil(DbcUtils.maxMessageSize(this.props.message, this.state.maxMessageBytes) / 8);
    }
    this.canvas.height = rowCount * 15;

    const observer = new IntersectionObserver(this.updateCanvas);
    observer.observe(this.canvas);
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
