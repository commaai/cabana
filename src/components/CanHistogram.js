import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, css } from 'aphrodite/no-important';

import CanHistogramPlot from '../vega/CanHistogramPlot';

export default class CanHistogram extends Component {
    static propTypes = {
        message: PropTypes.object,
        onSegmentChanged: PropTypes.func
    };
    constructor(props) {
        super(props);
    }

    render() {
        return (<div className={css(Styles.root)}>
                    {this.props.message ?
                        (<div>
                            <CanHistogramPlot
                                              logLevel={0}
                                              data={{points: this.props.message.entries}}
                                              onSignalSegment={(signal, segment) => {this.props.onSegmentChanged(segment)}}
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
        width: '1000px'
    },
    label: {
        textAlign: 'center',
        color: 'rgba(0,0,0,0.9)',
        margin: 0
    }
});
