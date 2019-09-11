import React, { Component } from "react";
import Measure from "react-measure";
import PropTypes from "prop-types";
import cx from "classnames";

import Signal from "../models/can/signal";
import GraphData from "../models/graph-data";
import CanPlot from "../vega/CanPlot";
import debounce from "../utils/debounce";

const DefaultPlotInnerStyle = {
  position: "absolute",
  top: 0,
  left: 0
};

export default class CanGraph extends Component {
  static emptyTable = [];

  static propTypes = {
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
    container: PropTypes.node,
    dragPos: PropTypes.object,
    canReceiveGraphDrop: PropTypes.bool,
    onGraphRefAvailable: PropTypes.func,
    plottedSignals: PropTypes.array
  };

  constructor(props) {
    super(props);

    this.state = {
      plotInnerStyle: null,
      shiftX: 0,
      shiftY: 0,
      bounds: null,
      isDataInserted: false,
      data: this.getGraphData(props)
    };
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
    let series = props.plottedSignals
      .map(signals => {
        const { messageId, signalUid } = signals;
        let entries = props.messages[messageId].entries;
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

  segmentIsNew(newSegment) {
    return (
      newSegment.length !== this.props.segment.length ||
      !newSegment.every((val, idx) => this.props.segment[idx] === val)
    );
  }

  visualChanged(prevProps, nextProps) {
    return (
      prevProps.canReceiveGraphDrop !== nextProps.canReceiveGraphDrop ||
      JSON.stringify(prevProps.dragPos) !== JSON.stringify(nextProps.dragPos)
    );
  }

  onPlotResize({ bounds }) {
    this.setState({ bounds });

    this.view.signal("width", bounds.width - 70);
    this.view.signal("height", 0.4 * (bounds.width - 70)); // 5:2 aspect ratio
    this.view.run();
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.view) {
      this.view.runAfter(() => {
        // only update if segment is new
        let segmentChanged = false;
        if (this.segmentIsNew(nextProps.segment)) {
          if (nextProps.segment.length > 0) {
            // Set segmented domain
            this.view.signal("segment", nextProps.segment);
          } else {
            // Reset segment to full domain
            this.view.signal("segment", 0);
          }
          segmentChanged = true;
        }

        if (
          !nextProps.live &&
          nextProps.currentTime !== this.props.currentTime
        ) {
          this.view.signal("videoTime", nextProps.currentTime);
          segmentChanged = true;
        }

        if (segmentChanged) {
          this.view.runAsync();
        }
      });

      return false;
    }

    return true;
  }

  insertData = debounce(() => {
    let { series } = this.state.data;

    // adding plot points by diff isn't faster since it basically has to be n^2
    // out-of-order events make it so that you can't just check the bounds
    let changeset = this.view
      .changeset()
      .remove(v => true)
      .insert(series);
    this.view.change("table", changeset);
    this.view.run();
  }, 250);

  componentWillReceiveProps(nextProps) {
    if (
      nextProps.dragPos &&
      JSON.stringify(nextProps.dragPos) !== JSON.stringify(this.props.dragPos)
    ) {
      this.updateStyleFromDragPos(nextProps.dragPos);
    } else if (!nextProps.dragPos && this.state.plotInnerStyle !== null) {
      this.setState({ plotInnerStyle: null });
    }
    if (
      this.props.messages !== nextProps.messages ||
      this.props.plottedSignal !== nextProps.plottedSignal
    ) {
      let data = this.getGraphData(nextProps);
      if (
        data.series.length === this.state.data.series.length &&
        data.firstRelTime === this.state.data.firstRelTime &&
        data.lastRelTime === this.state.data.lastRelTime
      ) {
        // do nothing, the data didn't *actually* change
      } else {
        this.setState({ data }, this.insertData);
      }
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
      this.onPlotResize({ bounds: this.state.bounds });
    }
    if (this.props.segment.length > 0) {
      view.signal("segment", this.props.segment);
    }

    this.insertData();
  }

  onSignalClickTime(signal, clickTime) {
    if (clickTime !== undefined) {
      this.props.onRelativeTimeClick(this.props.messageId, clickTime);
    }
  }

  onSignalSegment(signal, segment) {
    if (!Array.isArray(segment)) {
      return;
    }

    this.props.onSegmentChanged(this.props.messageId, segment);

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
      ? "is-droppable"
      : null;

    return (
      <div
        className="cabana-explorer-visuals-plot"
        ref={this.props.onGraphRefAvailable}
      >
        <div
          className={cx(
            "cabana-explorer-visuals-plot-inner",
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
              ).find(s => s.uid === signalUid);
              const { colors } = signal;

              return (
                <div
                  className="cabana-explorer-visuals-plot-header"
                  key={messageId + "_" + signal.uid}
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
                      <span>{messageName}</span>
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
            {({ measureRef }) => {
              return (
                <div
                  ref={measureRef}
                  className="cabana-explorer-visuals-plot-container"
                >
                  <CanPlot
                    logLevel={1}
                    onNewView={this.onNewView}
                    onSignalClickTime={this.onSignalClickTime}
                    onSignalSegment={this.onSignalSegment}
                    renderer={"canvas"}
                  />
                </div>
              );
            }}
          </Measure>
        </div>
      </div>
    );
  }
}
