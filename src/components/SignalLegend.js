// SignalLegend.js
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, css } from 'aphrodite/no-important';
require('core-js/fn/array/includes');

import SignalLegendEntry from './SignalLegendEntry';
import Signal from '../models/can/signal';
import TableStyles from '../styles/table';

export default class SignalLegend extends Component {
    static propTypes = {
        signals: PropTypes.object,
        signalStyles: PropTypes.object,
        highlightedSignal: PropTypes.string,
        onSignalHover: PropTypes.func,
        onSignalHoverEnd: PropTypes.func,
        onTentativeSignalChange: PropTypes.func,
        onSignalChange: PropTypes.func,
        onSignalRemove: PropTypes.func,
        onSignalPlotChange: PropTypes.func,
        plottedSignals: PropTypes.array
    };

    constructor(props) {
        super(props);
        this.state = {
          expandedSignals: [],
        }
        this.toggleExpandSignal = this.toggleExpandSignal.bind(this);
    }

    toggleExpandSignal(s) {
      const {expandedSignals} = this.state;
      if (!expandedSignals.includes(s.uid)) {
        const updatedExpandedSignals = [...expandedSignals, s.uid];
        this.setState({expandedSignals: updatedExpandedSignals})
      } else {
        const updatedExpandedSignals = expandedSignals.filter((i) => i !== s.uid)
        this.setState({expandedSignals: updatedExpandedSignals});
      }
    }

    checkExpandedSignal(s) {
      return this.state.expandedSignals.includes(s);
    }

    render() {
        const {signals, highlightedSignal} = this.props;

        const signalRowsNested = Object.entries(signals).map(([signalName, signal]) => {
            const isHighlighted = highlightedSignal === signalName;
            const highlightedStyle = isHighlighted ? this.props.signalStyles[signalName] : null;

            return <SignalLegendEntry
                      key={signal.uid}
                      signal={signal}
                      isHighlighted={isHighlighted}
                      highlightedStyle={highlightedStyle}
                      onSignalHover={this.props.onSignalHover}
                      onSignalHoverEnd={this.props.onSignalHoverEnd}
                      onTentativeSignalChange={this.props.onTentativeSignalChange}
                      onSignalChange={this.props.onSignalChange}
                      onSignalRemove={this.props.onSignalRemove}
                      onSignalPlotChange={this.props.onSignalPlotChange}
                      toggleExpandSignal={this.toggleExpandSignal}
                      isPlotted={this.props.plottedSignals.indexOf(signalName) !== -1}
                      isExpanded={this.checkExpandedSignal(signal.uid)}/>;
        });

        const signalRows = signalRowsNested
            .filter((row) => row != null)
            .reduce((a, b) => {
                return a.concat(b)
            }, []);

        return (
          <div className='cabana-explorer-signals-legend'>
            {signalRows}
          </div>
        );
    }
}
