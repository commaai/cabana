import React, { Component } from 'react';
import PropTypes from 'prop-types';

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
      lastSeekTime: 0
    };

    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this.onCanvasRefAvailable = this.onCanvasRefAvailable.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps.live) {
      const nextLastEntry = nextProps.message.entries[nextProps.message.entries.length - 1];
      const curLastEntry = this.props.message.entries[
        this.props.message.entries.length - 1
      ];
      if ( (curLastEntry === undefined) || ( nextLastEntry === undefined) ) {
        return false
      }
      return nextLastEntry.hexData !== curLastEntry.hexData;
    }
    return nextProps.seekTime !== this.props.seekTime;
  }

  componentWillReceiveProps(nextProps) {
    if (
      this.props.seekIndex !== nextProps.seekIndex
      || frameForTime(this.props.seekTime) !== frameForTime(nextProps.seekTime)
    ) {
      this.updateCanvas(nextProps);
    }

    function frameForTime(t) {
      return ~~(t * 60);
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

  updateCanvas(props) {
    const { message, live, seekTime } = props;
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
      ctx.fillStyle = message.byteColors[i];

      ctx.fillRect(i * 20, 0, 20, 15);

      ctx.font = '12px Courier';
      ctx.fillStyle = 'white';
      if (hexData) {
        ctx.fillText(hexData, i * 20 + 2, 12);
      } else {
        ctx.fillText('-', i * 20 + 7, 12);
      }
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
    this.canvas.height = 15 * window.devicePixelRatio;
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
