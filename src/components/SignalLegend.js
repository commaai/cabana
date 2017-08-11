// SignalLegend.js
import React, {Component} from 'react';
import PropTypes from 'prop-types';
require('core-js/fn/array/includes');

import SignalLegendEntry from './SignalLegendEntry';

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
        plottedSignalUids: PropTypes.array
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
        const signalRowsNested = Object.entries(signals)
            .sort(([_, signal1], [__, signal2]) => {
              if(signal1.startBit < signal2.startBit) {
                return -1;
              } else {
                return 1;
              }
            })
            .map(([signalName, signal]) => {
            const color = signals[signalName].colors();
            const isHighlighted = highlightedSignal === signalName;

            return <SignalLegendEntry
                      key={signal.uid}
                      signal={signal}
                      isHighlighted={isHighlighted}
                      color={color}
                      onSignalHover={this.props.onSignalHover}
                      onSignalHoverEnd={this.props.onSignalHoverEnd}
                      onTentativeSignalChange={this.props.onTentativeSignalChange}
                      onSignalChange={this.props.onSignalChange}
                      onSignalRemove={this.props.onSignalRemove}
                      onSignalPlotChange={this.props.onSignalPlotChange}
                      toggleExpandSignal={this.toggleExpandSignal}
                      isPlotted={this.props.plottedSignalUids.indexOf(signal.uid) !== -1}
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
