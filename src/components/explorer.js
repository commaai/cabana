import React, {Component} from 'react';
import PropTypes from 'prop-types';

import { StyleSheet, css } from 'aphrodite/no-important';

import AddSignals from './AddSignals';
import CanHistogram from './CanHistogram';
import CanGraph from './CanGraph';
import RouteVideoSync from './RouteVideoSync';
import CanLog from './CanLog';
import RouteSeeker from './RouteSeeker';
import Entries from '../models/can/entries';
import debounce from '../utils/debounce';
import CommonStyles from '../styles/styles';

export default class Explorer extends Component {
    static propTypes = {
       selectedMessage: PropTypes.string,
       url: PropTypes.string,
       messages: PropTypes.objectOf(PropTypes.object),
       onConfirmedSignalChange: PropTypes.func,
       canFrameOffset: PropTypes.number,
       firstCanTime: PropTypes.number
    };

    constructor(props) {
        super(props);

        const msg = props.messages[props.selectedMessage];

        const shouldShowAddSignal = (
            msg && Object.keys(msg.signals).length === 0);

        this.state = {
            plottedSignals: [],
            segment: [],
            segmentIndices: [],
            shouldShowAddSignal,
            userSeekIndex: 0,
            seekIndex: 0,
            seekTime: 0,
            playing: false,
        };
        this.onSignalPlotPressed = this.onSignalPlotPressed.bind(this);
        this.onSignalUnplotPressed = this.onSignalUnplotPressed.bind(this);
        this.onSegmentChanged = this.onSegmentChanged.bind(this);
        this.showAddSignal = this.showAddSignal.bind(this);
        this.onGraphTimeClick = this.onGraphTimeClick.bind(this);
        this.onUserSeek = this.onUserSeek.bind(this);
        this.onPlaySeek = this.onPlaySeek.bind(this);
        this.onPlay = this.onPlay.bind(this);
        this.onPause = this.onPause.bind(this);
        this.onVideoClick = this.onVideoClick.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        const nextMessage = nextProps.messages[nextProps.selectedMessage];
        const curMessage = this.props.messages[this.props.selectedMessage];

        if(nextMessage && nextMessage !== curMessage) {
            if(Object.keys(nextMessage.signals).length === 0) {
                this.setState({shouldShowAddSignal: true});
            }
        }
    }

    graphData(msg, signalName) {
        if(!msg) return null;

        let samples = [];
        let skip = Math.floor(msg.entries.length / CanGraph.MAX_POINTS);

        if(skip == 0){
            samples = msg.entries;
        } else {
            for(let i = 0; i < msg.entries.length; i += skip) {
                samples.push(msg.entries[i]);
            }
        }

        return samples.map((entry) => {
            return {x: entry.time,
                    xRel: entry.time - this.props.firstCanTime,
                    y: entry.signals[signalName],
                    unit: msg.signals[signalName].unit}
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

    updateSegment = debounce((segment) => {
        const {entries} = this.props.messages[this.props.selectedMessage];
        const segmentIndices = Entries.findSegmentIndices(entries, segment, true);

        this.setState({segment, segmentIndices, userSeekIndex: segmentIndices[0]})
    }, 250);

    onSegmentChanged(segment) {
        if(Array.isArray(segment)) {
            this.updateSegment(segment);
        }
    }

    resetSegment() {
        this.setState({segment: [], segmentIndices: [], userSeekIndex: 0})
    }

    showAddSignal() {
        this.setState({shouldShowAddSignal: true})
    }

    indexFromSeekRatio(ratio) {
        const {entries} = this.props.messages[this.props.selectedMessage];
        const {segmentIndices} = this.state;
        let segmentLength, offset;
        if(segmentIndices.length === 2) {
            offset = segmentIndices[0];
            segmentLength = segmentIndices[1] - segmentIndices[0];
        } else {
            offset = 0;
            segmentLength = entries.length;
        }

        return offset + Math.round(ratio * segmentLength);
    }

    onUserSeek(ratio) {
        const userSeekIndex = this.indexFromSeekRatio(ratio);
        this.setState({seekIndex: userSeekIndex, userSeekIndex});
    }

    onPlaySeek(ratio) {
        const {entries} = this.props.messages[this.props.selectedMessage];

        const seekIndex = this.indexFromSeekRatio(ratio);

        this.setState({seekIndex, seekTime: entries[seekIndex].time});
    }

    onGraphTimeClick(time) {
        const canTime = time + this.props.firstCanTime;

        const {segmentIndices} = this.state;
        const {entries} = this.props.messages[this.props.selectedMessage];
        const userSeekIndex = Entries.findTimeIndex(entries, canTime);

        this.setState({userSeekIndex});
    }

    onPlay() {
        this.setState({playing: true});
    }

    onPause() {
        this.setState({playing: false});
    }

    secondsLoaded() {
        const {entries} = this.props.messages[this.props.selectedMessage];
        const {segmentIndices} = this.state;
        if(segmentIndices.length === 2) {
            const [low, hi] = segmentIndices;
            return entries[hi].time - entries[low].time;
        } else {
            return entries[entries.length - 1].time - entries[0].time;
        }
    }

    startOffset() {
        const {entries} = this.props.messages[this.props.selectedMessage];
        const {segmentIndices} = this.state;
        const {canFrameOffset, firstCanTime} = this.props;
        if(segmentIndices.length === 2) {
            const [low, _] = segmentIndices;
            const startEntry = entries[low];
            // can frame offset is time from first frame to first can
            // add time from first can to first can in segment

            return canFrameOffset + (startEntry.time - firstCanTime);
        } else {
            return canFrameOffset;
        }
    }

    onVideoClick() {
        const playing = !this.state.playing;
        this.setState({playing});
    }

    seekTime() {
        const {userSeekIndex} = this.state;
        const msg = this.props.messages[this.props.selectedMessage];
        return msg.entries[userSeekIndex].time;
    }

    addSignalsHeader() {
        const {shouldShowAddSignal} = this.state;
        return (<div className={css(Styles.addSignalsHeader)}
                     onClick={() => this.setState({shouldShowAddSignal: !this.state.shouldShowAddSignal})}>
                    {shouldShowAddSignal ?
                        <p>&darr;</p>
                        :
                        <p>&rarr;</p>}
                    <p>Edit Signals</p>
                </div>);
    }

    render() {
        return (<div className={css(Styles.root)}>
                    <div className={css(Styles.dataContainer)}>
                        <div className={css(Styles.left)}>
                            {this.addSignalsHeader()}
                            {this.state.shouldShowAddSignal ?
                                <AddSignals
                                    onConfirmedSignalChange={this.props.onConfirmedSignalChange}
                                    message={this.props.messages[this.props.selectedMessage]}
                                    onClose={() => {this.setState({shouldShowAddSignal: false})}}
                                    messageIndex={this.state.seekIndex}
                                /> : null}
                            <CanLog message={this.props.messages[this.props.selectedMessage]}
                                    messageIndex={this.state.seekIndex}
                                    segmentIndices={this.state.segmentIndices}
                                    plottedSignals={this.state.plottedSignals}
                                    onSignalPlotPressed={this.onSignalPlotPressed}
                                    onSignalUnplotPressed={this.onSignalUnplotPressed}
                                    showAddSignal={this.showAddSignal}
                                    onMessageExpanded={this.onPause} />
                        </div>
                        <div className={css(Styles.right)}>
                            <div className={css(Styles.fixed)}>
                                {this.props.messages[this.props.selectedMessage] !== undefined ?
                                    <RouteVideoSync message={this.props.messages[this.props.selectedMessage]}
                                                    secondsLoaded={this.secondsLoaded()}
                                                    startOffset={this.startOffset()}
                                                    segmentProgress={this.segmentProgress}
                                                    seekIndex={this.state.seekIndex}
                                                    userSeekIndex={this.state.userSeekIndex}
                                                    playing={this.state.playing}
                                                    url={this.props.url}
                                                    canFrameOffset={this.props.canFrameOffset}
                                                    onVideoClick={this.onVideoClick}
                                                    onPlaySeek={this.onPlaySeek}
                                                    onUserSeek={this.onUserSeek}
                                                    onPlay={this.onPlay}
                                                    onPause={this.onPause}
                                    /> : null}

                                {this.state.segment.length > 0 ?
                                    <div className={css(CommonStyles.button)}
                                         onClick={() => this.resetSegment()}>
                                        <p>Reset Segment</p>
                                    </div>
                                    : null}
                                {this.state.plottedSignals.map(({messageId, name}) => {
                                    const msg = this.props.messages[messageId];

                                    return <CanGraph key={messageId + '_' + name}
                                                     unplot={() => {this.onSignalUnplotPressed(messageId, name)}}
                                                     messageName={msg.name}
                                                     signalSpec={msg.signals[name]}
                                                     onSegmentChanged={this.onSegmentChanged}
                                                     segment={this.state.segment}
                                                     data={this.graphData(msg, name)}
                                                     onRelativeTimeClick={this.onGraphTimeClick}
                                                     currentTime={this.state.seekTime - this.props.firstCanTime} />;
                                })}
                            </div>
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
        flex: '2',
    },
    right: {
        flex: '4',
        overflow: 'auto'
    },
    fixed: {
        top: 0,
        width: '100%',
        overflow: 'auto'
    },
    addSignalsHeader: {
        cursor: 'pointer',
        borderBottom: '1px solid #000',
        display: 'flex',
        flexDirection: 'row'
    },

})
