import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, css } from 'aphrodite/no-important';
import * as VegaTooltip from 'vega-tooltip';

import CanHistogramPlot from '../vega/CanHistogramPlot';
import * as Histogram from '../utils/histogram';
export default class CanHistogram extends Component {
    static propTypes = {
        message: PropTypes.object,
        indices: PropTypes.arrayOf(PropTypes.number),
        onSegmentChanged: PropTypes.func,
        onResetClicked: PropTypes.func,
        partsLoaded: PropTypes.number
    };
    constructor(props) {
        super(props);

        this.state = {
            logLevel: 0,
            spec: CanHistogramPlot.getSpec(),
            bins: null
        }

        this.onHistogramViewAvailable = this.onHistogramViewAvailable.bind(this);
        this.onSignalSegment = this.onSignalSegment.bind(this);
        this.resetSegment = this.resetSegment.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        if(nextProps.message) {
            // if this is the first message or a new one
            if(this.props.message == null
                || nextProps.message.entries.length != this.props.message.entries.length
                || nextProps.partsLoaded != this.props.partsLoaded
                || JSON.stringify(nextProps.indices) !== JSON.stringify(this.props.indices)) {

                const bins = Histogram.binMessages(nextProps.message.entries,
                                                   nextProps.indices);

                this.setState({bins}, this.resetSegment)
            }
        }
    }

    onHistogramViewAvailable(view) {
        this.view = view;
        const {binDuration} = this.state.bins;
        const options = {showAllFields: false,
                         fields: [{field: 'count'}, {field: 'relStartTime', title: `from`}],
                         colorTheme: 'dark'}

        VegaTooltip.vega(view, options);
    }

    resetSegment() {
        // hack to force react-vega to re-render plot

        const newSpec = {};
        Object.assign(newSpec, CanHistogramPlot.getSpec());
        this.setState({spec: newSpec})
    }

    onSignalSegment(signal, segment) {
        this.props.onSegmentChanged(segment);
    }

    render() {
        return (<div className={css(Styles.root)}>
                    {this.state.bins ?
                        (<div>
                            <div className={css(Styles.resetBtn)}
                                 onClick={() => {
                                    this.props.onResetClicked()
                                    this.resetSegment()
                                 }}><p>Reset</p></div>
                            <CanHistogramPlot
                                              spec={this.state.spec}
                                              logLevel={this.state.logLevel}
                                              onNewView={this.onHistogramViewAvailable}
                                              data={{binned: this.state.bins.bins}}
                                              onSignalSegment={this.onSignalSegment}
                            />
                            <p className={css(Styles.label)}>{this.props.message.name} per time</p>
                        </div>)
                        : null}

                </div>);
    }
}

const Styles = StyleSheet.create({
    root: {
        borderBottom: '1px solid rgba(0,0,0,0.9)',
        borderColor: 'gray',
        width: '1000px',
        paddingLeft: '10px'
    },
    resetBtn: {
        cursor: 'pointer'
    },
    label: {
        textAlign: 'center',
        color: 'rgba(0,0,0,0.9)',
        margin: 0
    }
});
