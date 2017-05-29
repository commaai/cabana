import React, {Component} from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import Vega from 'react-vega';
import PropTypes from 'prop-types';

import Signal from '../models/can/signal';
import CanPlot from '../vega/CanPlot';

const spec =  {
  "$schema": "https://vega.github.io/schema/vega/v3.0.json",
  "width": 500,
  "height": 200,
  "padding": 5,


  "data": [
    {
      "name": "table"
    }
  ],

  "scales": [
    {
      "name": "xscale",
      "type": "linear",
      "range": "width",
      "zero": false,
      "domain": {"data": "table", "field": "x"}
    },
    {
      "name": "yscale",
      "type": "linear",
      "range": "height",
      "zero": true,
      "domain": {"data": "table", "field": "y"}
    }
  ],

  "axes": [
    {"orient": "bottom", "scale": "xscale"},
    {"orient": "left", "scale": "yscale"}
  ],

  "marks": [
    {
      "type": "line",
      "from": {"data": "table"},
      "encode": {
        "enter": {
          "x": {"scale": "xscale", "field": "x"},
          "y": {"scale": "yscale", "field": "y"},
        },
        "hover": {
          "fillOpacity": {"value": 0.5}
        }
      }
    }
  ]
};


export default class CanGraph extends Component {
  static propTypes = {
    data: PropTypes.array,
    messageName: PropTypes.string,
    signalSpec: PropTypes.instanceOf(Signal),
    segment: PropTypes.array
  };

  constructor(props) {
    super(props);

    this.onNewView = this.onNewView.bind(this);
  }

  segmentIsNew(newSegment) {
    return newSegment.length != this.props.segment.length
      || !(newSegment.every((val, idx) => this.props.segment[idx] == val));
  }

  shouldComponentUpdate(nextProps, nextState) {
    if(this.view) {
      // only update if segment is new
      if(this.segmentIsNew(nextProps.segment)) {
        if(nextProps.segment.length > 0) {
          // Set segmented domain
          this.view.signal('segment', nextProps.segment)
        } else {
          // Reset segment to full domain
          const xVals = this.props.data.map((d) => d.x);
          const min = Math.min.apply(null, xVals);
          const max = Math.max.apply(null, xVals);
          this.view.signal('segment', [min, max]);
        }
        this.view.run();
      }
    }

    return nextProps.data.length != this.props.data.length;
  }

  onNewView(view) {
    this.view = view;
    if(this.props.segment.length > 0) {
      view.signal('segment', this.props.segment);
    }
  }

  render() {
      return (<div className={css(Styles.root)}>
                <p className={css(Styles.messageName)}>{this.props.messageName}</p>
                <p className={css(Styles.signalName)}>{this.props.signalSpec.name}</p>
                <CanPlot logLevel={0}
                         data={{table: this.props.data}}
                         onNewView={this.onNewView}
                                 />
              </div>);
  }
}

const Styles = StyleSheet.create({
    root: {
        borderBottomWidth: '1px',
        borderColor: 'gray',
    },
    messageName: {
      fontSize: 12,
      color: 'rgba(0,0,0,0.5)',
      margin: 0
    },
    signalName: {
      fontSize: 16,
      margin: 0
    }
});
