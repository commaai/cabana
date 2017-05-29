import React, {Component} from 'react';
import PropTypes from 'prop-types';

import { StyleSheet, css } from 'aphrodite/no-important';

import CanHistogram from './CanHistogram';
import CanGraph from './CanGraph';
import NearestFrame from './NearestFrame';
import CanLog from './CanLog';

export default class Explorer extends Component {
    static propTypes = {
       selectedMessage: PropTypes.string,
       url: PropTypes.string,
       messages: PropTypes.objectOf(PropTypes.object)
    };

    constructor(props) {
        super(props);

        this.state = {
            plottedSignals: [],
            segment: []
        }
        this.onSignalPlotPressed = this.onSignalPlotPressed.bind(this);
        this.onSignalUnplotPressed = this.onSignalUnplotPressed.bind(this);
        this.onSegmentChanged = this.onSegmentChanged.bind(this);
    }

    graphData(msg, signalName) {
        if(!msg) return null;

        return msg.entries.map((entry) => {
            return {x: entry.time,
                    y: entry.signals[signalName],
                    unit: msg.signalSpecs[signalName].unit}
        });
    }

    onSignalPlotPressed(messageId, name) {
        const {plottedSignals} = this.state;
        this.setState({plottedSignals: plottedSignals.concat([{messageId, name}])})
    }

    onSignalUnplotPressed(messageId, name) {
     const {plottedSignals} = this.state;
     const newPlottedSignals = plottedSignals.filter((signal) => !(signal.messageId == messageId && signal.name == name));

     this.setState({plottedSignals: newPlottedSignals})
    }

    onSegmentChanged(segment) {
        if(Array.isArray(segment)) {
            this.setState({segment})
        }
    }

    render() {
        return (<div className={css(Styles.root)}>
                    <CanHistogram
                        message={this.props.messages[this.props.selectedMessage]}
                        onSegmentChanged={this.onSegmentChanged}
                    />
                    <div className={css(Styles.dataContainer)}>
                        <div className={css(Styles.left)}>
                            <CanLog data={this.props.messages[this.props.selectedMessage]}
                                    plottedSignals={this.state.plottedSignals}
                                    onSignalPlotPressed={this.onSignalPlotPressed}
                                    onSignalUnplotPressed={this.onSignalUnplotPressed} />
                        </div>
                        <div className={css(Styles.right)}>
                            {this.state.plottedSignals.map(({messageId, name}) => {
                                const msg = this.props.messages[messageId];
                                return <CanGraph key={messageId + '_' + name}
                                                 messageName={msg.name}
                                                 signalSpec={msg.signalSpecs[name]}
                                                 segment={this.state.segment}
                                                 data={this.graphData(msg, name)} />
                            })}
                            <NearestFrame messages={this.props.messages}
                                          selectedMessage={this.props.selectedMessage}
                                          />
                        </div>
                    </div>
                </div>);
    }
}

const Styles = StyleSheet.create({
    root: {
        flexDirection: 'column',
        flex: 4,
        width: '100%',
    },
    dataContainer: {
        paddingTop: '10px',
        paddingLeft: '10px',
        flexDirection: 'row',
        flex: 1,
        display: 'flex',
        width: '100%',
        height: '100vh'
    },
    left: {
        flex: '2 3 auto',
        overflow: 'auto'
    },
    right: {
        flex: '4 1',
    }
})
