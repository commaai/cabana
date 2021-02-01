import React, { Component } from 'react';
import Measure from 'react-measure';
import PropTypes from 'prop-types';
import cx from 'classnames';
import { Vega } from 'react-vega';
import { expressionFunction } from 'vega';

import Signal from '../models/can/signal';
import GraphData from '../models/graph-data';
import CanPlotSpec from '../vega/CanPlot';
import debounce from '../utils/debounce';
import FormatTime from '../utils/time';

const propTypes = {
  plottedSignal: PropTypes.string,
  messages: PropTypes.object,
  messageId: PropTypes.string,
  messageName: PropTypes.string,
  signalSpec: PropTypes.instanceOf(Signal),
  segment: PropTypes.array,
  unplot: PropTypes.func,
  onRelativeTimeClick: PropTypes.func,
  currentTime: PropTypes.number,
  onSegmentChanged: PropTypes.func,
  onDragStart: PropTypes.func,
  onDragEnd: PropTypes.func,
  container: PropTypes.object,
  dragPos: PropTypes.object,
  canReceiveGraphDrop: PropTypes.bool,
  onGraphRefAvailable: PropTypes.func,
  plottedSignals: PropTypes.array
};

const DefaultPlotInnerStyle = {
  position: 'absolute',
  top: 0,
  left: 0
};

export default class CanGraph extends Component {
  static emptyTable = [];

  constructor(props) {
    super(props);

    this.state = {
      plotInnerStyle: null,
      shiftX: 0,
      shiftY: 0,
      bounds: null,
      isDataInserted: false,
      data: this.getGraphData(props),
      spec: this.getGraphSpec(props)
    };

    expressionFunction('FormatTime', function(sec) {
      return FormatTime(sec,true);
    });
    this.onNewView = this.onNewView.bind(this);
    this.onSignalClickTime = this.onSignalClickTime.bind(this);
    this.onSignalSegment = this.onSignalSegment.bind(this);
    this.onDragAnchorMouseDown = this.onDragAnchorMouseDown.bind(this);
    this.onDragAnchorMouseUp = this.onDragAnchorMouseUp.bind(this);
    this.onDragStart = this.onDragStart.bind(this);
    this.onPlotResize = this.onPlotResize.bind(this);
    this.insertData = this.insertData.bind(this);
  }

  getGraphData(props) {
    let firstRelTime = -1;
    let lastRelTime = -1;
    const series = props.plottedSignals
      .map((signals) => {
        const { messageId, signalUid } = signals;
        const { entries } = props.messages[messageId];
        if (entries.length) {
          let messageRelTime = entries[0].relTime;
          if (firstRelTime === -1) {
            firstRelTime = messageRelTime;
          } else {
            firstRelTime = Math.min(firstRelTime, messageRelTime);
          }
          messageRelTime = entries[entries.length - 1].relTime;
          lastRelTime = Math.max(lastRelTime, messageRelTime);
        }
        return GraphData._calcGraphData(
          props.messages[messageId],
          signalUid,
          0
        );
      })
      .reduce((m, v) => m.concat(v), []);

    return {
      updated: Date.now(),
      series,
      firstRelTime,
      lastRelTime
    };
  }

  getGraphSpec(props) {
    return {
      ...CanPlotSpec,
      scales: [
        {
          ...CanPlotSpec.scales[0],
          domainMin: props.segment[0],
          domainMax: props.segment[1]
        },
        ...CanPlotSpec.scales.slice(1)
      ]
    };
  }

  segmentIsNew(newSegment) {
    return (
      newSegment.length !== this.props.segment.length
      || !newSegment.every((val, idx) => this.props.segment[idx] === val)
    );
  }

  visualChanged(prevProps, nextProps) {
    return (
      prevProps.canReceiveGraphDrop !== nextProps.canReceiveGraphDrop
      || JSON.stringify(prevProps.dragPos) !== JSON.stringify(nextProps.dragPos)
    );
  }

  onPlotResize(options) {
    if (!this.view) {
      return;
    }

    let bounds = null;
    if (options && options.bounds) {
      this.setState({ bounds: options.bounds });
      bounds = options.bounds;
    } else {
      bounds = this.state.bounds;
    }

    this.view.runAfter(this.updateBounds);
  }

  updateBounds = debounce(() => {
    this.view.signal('width', this.state.bounds.width);
    this.view.signal('height', 0.4 * this.state.bounds.width); // 5:2 aspect ratio
    this.view.run();
  }, 100);

  insertData = debounce(() => {
    if (!this.view) {
      console.log('Cannot insertData');
      return;
    }

    // adding plot points by diff isn't faster since it basically has to be n^2
    // out-of-order events make it so that you can't just check the bounds
    const { series } = this.state.data;
    const changeset = this.view
      .changeset()
      .remove((v) => true)
      .insert(series);
    this.view.change('table', changeset);
    this.view.run();
  }, 250);

  componentWillReceiveProps(nextProps) {
    if (
      nextProps.dragPos
      && JSON.stringify(nextProps.dragPos) !== JSON.stringify(this.props.dragPos)
    ) {
      this.updateStyleFromDragPos(nextProps.dragPos);
    } else if (!nextProps.dragPos && this.state.plotInnerStyle !== null) {
      this.setState({ plotInnerStyle: null });
    }
    if (
      this.props.messages !== nextProps.messages
      || this.props.plottedSignal !== nextProps.plottedSignal
    ) {
      console.log('Calculating new data!');
      const data = this.getGraphData(nextProps);
      // if (
      //   data.series.length === this.state.data.series.length
      //   && data.firstRelTime === this.state.data.firstRelTime
      //   && data.lastRelTime === this.state.data.lastRelTime
      //   && JSON.stringify(nextProps.signalSpec) === JSON.stringify(this.props.signalSpec)
      // ) {
      //   // do nothing, the data didn't *actually* change
      // } else {
      console.log('Inserting new data!');
      this.setState({ data });
      // }
    }
    if (this.segmentIsNew(nextProps.segment)) {
      this.setState({ spec: this.getGraphSpec(nextProps) });
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (!this.view) {
      return true;
    }
    if (this.state.spec !== nextState.spec) {
      return true;
    }
    if (this.state.data !== nextState.data) {
      this.insertData();
    }
    if (this.props.currentTime !== nextProps.currentTime) {
      this.view.signal('videoTime', nextProps.currentTime);
    }
    if (this.segmentIsNew(nextProps.segment)) {
      if (nextProps.segment.length > 0) {
        // Set segmented domain
        this.view.signal('segment', nextProps.segment);
      } else {
        // Reset segment to full domain
        this.view.signal('segment', 0);
      }
    }
    this.view.runAsync();
    return false;
  }

  componentDidUpdate(oldProps, oldState) {
    if (this.view) {
      if (this.props.segment.length > 0) {
        // Set segmented domain
        this.view.signal('segment', this.props.segment);
      } else {
        // Reset segment to full domain
        this.view.signal('segment', 0);
      }
      this.view.signal('videoTime', this.props.currentTime);
      this.view.runAsync();
    }
  }

  updateStyleFromDragPos({ left, top }) {
    const plotInnerStyle = { ...this.state.plotInnerStyle };
    plotInnerStyle.left = left;
    plotInnerStyle.top = top;
    this.setState({ plotInnerStyle });
  }

  onNewView(view) {
    this.view = view;

    if (this.state.bounds) {
      this.onPlotResize();
    }
    if (this.props.segment.length > 0) {
      view.signal('segment', this.props.segment);
    }
    view.signal('videoTime', this.props.currentTime);

    this.insertData();
  }

  onSignalClickTime(signal, clickTime) {
    // console.log('onSignalClickTime', signal, clickTime);
    if (clickTime !== undefined) {
      this.props.onRelativeTimeClick(this.props.messageId, clickTime);
    }
  }

  onSignalSegment(signal, segment) {
    // console.log('onSignalSegment', signal, segment);
    if (!Array.isArray(segment)) {
      return;
    }

    this.props.onSegmentChanged(this.props.messageId, segment);

    if (!this.view) {
      return;
    }

    this.view.runAfter(() => {
      const state = this.view.getState();
      state.subcontext[0].signals.brush = 0;
      this.view.setState(state);
      this.insertData();
    });
  }

  plotInnerStyleFromMouseEvent(e) {
    const { shiftX, shiftY } = this.state;
    const plotInnerStyle = { ...DefaultPlotInnerStyle };
    const rect = this.props.container.getBoundingClientRect();

    const x = e.clientX - rect.left - shiftX;
    const y = e.clientY - rect.top - shiftY;
    plotInnerStyle.left = x;
    plotInnerStyle.top = y;
    return plotInnerStyle;
  }

  onDragAnchorMouseDown(e) {
    e.persist();
    const shiftX = e.clientX - e.target.getBoundingClientRect().left;
    const shiftY = e.clientY - e.target.getBoundingClientRect().top;
    this.setState({ shiftX, shiftY }, () => {
      this.setState({ plotInnerStyle: this.plotInnerStyleFromMouseEvent(e) });
    });
    this.props.onDragStart(
      this.props.messageId,
      this.props.signalSpec.uid,
      shiftX,
      shiftY
    );
  }

  onDragAnchorMouseUp(e) {
    this.props.onDragEnd();
    this.setState({
      plotInnerStyle: null,
      shiftX: 0,
      shiftY: 0
    });
  }

  onDragStart(e) {
    e.preventDefault();
    return false;
  }

  render() {
    const { plotInnerStyle } = this.state;
    const canReceiveDropClass = this.props.canReceiveGraphDrop
      ? 'is-droppable'
      : null;

    return (
      <div
        className="cabana-explorer-visuals-plot"
        ref={this.props.onGraphRefAvailable}
      >
        <div
          className={cx(
            'cabana-explorer-visuals-plot-inner',
            canReceiveDropClass
          )}
          style={plotInnerStyle || null}
        >
          <div
            className="cabana-explorer-visuals-plot-draganchor"
            onMouseDown={this.onDragAnchorMouseDown}
          >
            <span className="fa fa-bars" />
          </div>
          {this.props.plottedSignals.map(
            ({ messageId, signalUid, messageName }) => {
              const signal = Object.values(
                this.props.messages[messageId].frame.signals
              ).find((s) => s.uid === signalUid);
              const colors = signal.getColors(messageId);

              return (
                <div
                  className="cabana-explorer-visuals-plot-header"
                  key={`${messageId}_${signal.uid}`}
                >
                  <div className="cabana-explorer-visuals-plot-header-toggle">
                    <button
                      className="button--tiny"
                      onClick={() => this.props.unplot(messageId, signalUid)}
                    >
                      <span>Hide Plot</span>
                    </button>
                  </div>
                  <div className="cabana-explorer-visuals-plot-header-copy">
                    <div className="cabana-explorer-visuals-plot-message">
                      <span>
                        {messageName}
                        {' '}
                        {messageId}
                      </span>
                    </div>
                    <div className="cabana-explorer-visuals-plot-signal">
                      <div
                        className="cabana-explorer-visuals-plot-signal-color"
                        style={{ background: `rgb(${colors}` }}
                      />
                      <strong>{signal.name}</strong>
                    </div>
                  </div>
                </div>
              );
            }
          )}
          <Measure bounds onResize={this.onPlotResize}>
            {({ measureRef }) => (
              <div
                ref={measureRef}
                className="cabana-explorer-visuals-plot-container"
              >
                <Vega
                  onNewView={this.onNewView}
                  logLevel={1}
                  signalListeners={{
                    clickTime: this.onSignalClickTime,
                    segment: this.onSignalSegment
                  }}
                  renderer="canvas"
                  spec={this.state.spec}
                  actions={false}
                  data={{
                    table: this.state.data.series
                  }}
                />
              </div>
            )}
          </Measure>
        </div>
      </div>
    );
  }
}

CanGraph.propTypes = propTypes;
