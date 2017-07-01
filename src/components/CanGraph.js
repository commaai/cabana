import React, {Component} from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import Vega from 'react-vega';
import PropTypes from 'prop-types';

import Signal from '../models/can/signal';
import CanPlot from '../vega/CanPlot';

export default class CanGraph extends Component {
  static MAX_POINTS = 10000;

  static propTypes = {
    data: PropTypes.array,
    messageId: PropTypes.string,
    messageName: PropTypes.string,
    signalSpec: PropTypes.instanceOf(Signal),
    segment: PropTypes.array,
    unplot: PropTypes.func,
    onRelativeTimeClick: PropTypes.func,
    currentTime: PropTypes.number,
    onSegmentChanged: PropTypes.func
  };

  constructor(props) {
    super(props);

    this.onNewView = this.onNewView.bind(this);
    this.onSignalClickTime = this.onSignalClickTime.bind(this);
    this.onSignalSegment = this.onSignalSegment.bind(this);
  }

  segmentIsNew(newSegment) {
    return newSegment.length != this.props.segment.length
      || !(newSegment.every((val, idx) => this.props.segment[idx] == val));
  }

  dataChanged(prevProps, nextProps) {
    return nextProps.data.length != prevProps.data.length
                || !(prevProps.signalSpec.equals(nextProps.signalSpec))
                || prevProps.data.some((prevEntry, idx) => prevEntry.y != nextProps.data[idx].y);
  }

  shouldComponentUpdate(nextProps, nextState) {
    if(this.view) {
      // only update if segment is new
      let segmentChanged = false;
      if(this.segmentIsNew(nextProps.segment)) {
        if(nextProps.segment.length > 0) {
          // Set segmented domain
          this.view.signal('segment', nextProps.segment)
        } else {
          // Reset segment to full domain
          this.view.signal('segment', 0);
        }
        segmentChanged = true;
      }

      if(nextProps.currentTime != this.props.currentTime) {
          this.view.signal('videoTime', nextProps.currentTime);
          segmentChanged = true;
      }

      if(segmentChanged) {
        this.view.run();
      }
    }

    return this.dataChanged(this.props, nextProps);
  }

  componentDidUpdate(prevProps, prevState) {
    if(this.dataChanged(prevProps, this.props)) {
      this.view.run();
    }

  }

  onNewView(view) {
    this.view = view;
    if(this.props.segment.length > 0) {
      view.signal('segment', this.props.segment);
    }
  }

  onSignalClickTime(signal, clickTime) {
    if(clickTime !== undefined) {
      this.props.onRelativeTimeClick(this.props.messageId, clickTime);
    }
  }

  onSignalSegment(signal, segment) {
      if(!Array.isArray(segment)) {
        return;
      }

      this.props.onSegmentChanged(this.props.messageId, segment);
      if(this.view) {
        const state = this.view.getState();
        state.subcontext[0].signals.brush = 0;
        this.view = this.view.setState(state);
      }
  }

  render() {
      return (<div className={css(Styles.root)}>
                <p className={css(Styles.messageName)}>{this.props.messageName}</p>
                <p className={css(Styles.signalName)}>{this.props.signalSpec.name}
                    &nbsp; <span className={css(Styles.unplot)}
                          onClick={this.props.unplot}>(unplot)</span></p>
                <div className={css(Styles.pointer)}>
                  <CanPlot logLevel={0}
                           data={{table: this.props.data}}
                           onNewView={this.onNewView}
                           onSignalClickTime={this.onSignalClickTime}
                           onSignalSegment={this.onSignalSegment}
                  />
                </div>
              </div>);
  }
}

const Styles = StyleSheet.create({
    root: {
        borderBottomWidth: '1px',
        borderColor: 'gray',
        width: '100%',
        maxWidth: 640,
        paddingTop: 10
    },
    messageName: {
      fontSize: 12,
      color: 'rgba(0,0,0,0.5)',
      margin: 0
    },
    signalName: {
      fontSize: 16,
      margin: 0
    },
    unplot: {
      cursor: 'pointer',
      fontSize: 14,
      color: 'rgba(0,0,0,0.5)'
    },
    pointer: {
      cursor: 'pointer'
    }
});
