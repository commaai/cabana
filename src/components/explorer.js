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
import Images from '../styles/images';

export default class Explorer extends Component {
    static propTypes = {
       selectedMessage: PropTypes.string,
       url: PropTypes.string,
       messages: PropTypes.objectOf(PropTypes.object),
       onConfirmedSignalChange: PropTypes.func,
       canFrameOffset: PropTypes.number,
       firstCanTime: PropTypes.number,
       onSeek: PropTypes.func,
       autoplay: PropTypes.bool,
    };

    constructor(props) {
        super(props);

        const msg = props.messages[props.selectedMessage];

        const  ShowAddSignal = (
            msg && Object.keys(msg.signals).length === 0);

        this.state = {
            plottedSignals: [],
            graphData: {},
            segment: [],
            segmentIndices: [],
            shouldShowAddSignal: true,
            userSeekIndex: 0,
            userSeekRatio: 0,
            userSeekTime: 0,
            playing: this.props.autoplay,
            signals: {}
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
        this.onSignalPlotChanged = this.onSignalPlotChanged.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
    }

    _onKeyDown(e) {
        if(e.keyCode === 27){ // escape
          this.resetSegment()
        }
    }

    componentWillMount() {
        document.addEventListener('keydown', this._onKeyDown);
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this._onKeyDown);
    }

    componentDidUpdate(prevProps, prevState) {
        if(this.props.selectedMessage === prevProps.selectedMessage
            && this.props.messages[this.props.selectedMessage]
            && prevProps.messages[prevProps.selectedMessage]) {
            const nextSignalNames = Object.keys(this.props.messages[this.props.selectedMessage].signals);
            const currentSignalNames = Object.keys(prevProps.messages[prevProps.selectedMessage].signals);

            const newSignalNames = nextSignalNames.filter((s) => currentSignalNames.indexOf(s) === -1);
            for(let i = 0; i < newSignalNames.length; i++) {
                this.onSignalPlotPressed(this.props.selectedMessage, newSignalNames[i]);
            }
        }
    }

    componentWillReceiveProps(nextProps) {
        const nextMessage = nextProps.messages[nextProps.selectedMessage];
        const curMessage = this.props.messages[this.props.selectedMessage];
        const {graphData} = this.state;

        if(Object.keys(nextProps.messages).length === 0) {
            this.resetSegment();
        }
        if(nextMessage && nextMessage !== curMessage) {
            const nextSignalNames = Object.keys(nextMessage.signals);

            // this.setState({signals: Object.assign({}, nextMessage.signals)});
            if(nextSignalNames.length === 0) {
                this.setState({shouldShowAddSignal: true});
            }
        }

        let {plottedSignals} = this.state;
        // unplot signals that have been removed

        plottedSignals = plottedSignals.filter(({messageId, signalName}) => {
            const messageExists = Object.keys(nextProps.messages).indexOf(messageId) !== -1;
            let signalExists = true;
            if(!messageExists) {
                delete graphData[messageId];
            } else {
                const signalNames = Object.keys(nextProps.messages[messageId].signals);
                signalExists = signalNames.indexOf(signalName) !== -1;

                if(!signalExists) {
                    delete graphData[messageId][signalName];
                }
            }

            return messageExists && signalExists;
        });

        this.setState({plottedSignals});

        if(nextProps.selectedMessage && nextProps.selectedMessage != this.props.selectedMessage) {
            // Update segment and seek state
            // by finding new message entry indices
            // corresponding to old message segment/seek times.

            let {segment, segmentIndices} = this.state;
            if(segment.length === 2) {
                const segmentStartIdx = nextMessage.entries.findIndex((e) => e.relTime >= segment[0]);
                let segmentEndIdx = nextMessage.entries.findIndex((e) => e.relTime >= segment[1]);
                if(segmentStartIdx !== -1) {
                    if(segmentEndIdx === -1) {
                        // previous segment end is past bounds of this message
                        segmentEndIdx = nextMessage.entries.length - 1;
                    }
                    const segmentStartTime = nextMessage.entries[segmentStartIdx].relTime;
                    const segmentEndTime = nextMessage.entries[segmentEndIdx].relTime;

                    segment = [segmentStartTime, segmentEndTime];
                    segmentIndices = [segmentStartIdx, segmentEndIdx];
                } else {
                    // segment times are out of boudns for this message
                    segment = [], segmentIndices = [];
                }
            }

            const nextSeekMsgEntry = nextMessage.entries[nextProps.seekIndex];
            let nextSeekTime;
            if(nextSeekMsgEntry) {
                nextSeekTime = nextSeekMsgEntry.relTime;
            } else if(segment.length === 2) {
                nextSeekTime = segment[0];
            } else {
                nextSeekTime = nextMessage.entries[0];
            }

            this.setState({segment,
                           segmentIndices,
                           userSeekIndex: nextProps.seekIndex,
                           userSeekTime: nextSeekTime})
        }

        if(nextMessage && curMessage) {
            // Refresh graph data

            const msgGraphData = graphData[nextProps.selectedMessage];

            if(msgGraphData) {
                for(let signalName in msgGraphData) {
                    if(nextMessage.signals[signalName] === undefined) {
                        delete msgGraphData[signalName];
                    } else {
                        graphData[nextProps.selectedMessage][signalName] = this.calcGraphData(nextMessage, signalName);
                    }
                }
                this.setState({graphData});
            }
        }

        if(nextProps.partsLoaded !== this.props.partsLoaded && !nextMessage) {
            let userSeekRatio = this.state.userSeekRatio;
            const nextSecondsLoaded = this.secondsLoadedRouteRelative(nextProps.currentParts);
            userSeekRatio = (userSeekRatio * this.secondsLoaded()) / nextSecondsLoaded;


            this.setState({userSeekRatio});
        }
    }

    calcGraphData(msg, signalName) {
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

    onSignalPlotPressed(messageId, signalName) {
        const {plottedSignals, graphData} = this.state;
        if(!(messageId in graphData)) {
            graphData[messageId] = {};
        }

        const msg = this.props.messages[messageId];
        graphData[messageId][signalName] = this.calcGraphData(msg, signalName);

        this.setState({plottedSignals: plottedSignals.concat([{messageId, signalName}]),
                       graphData})
    }

    onSignalUnplotPressed(messageId, name) {
     const {plottedSignals} = this.state;
     const newPlottedSignals = plottedSignals.filter((signal) => !(signal.messageId == messageId && signal.signalName == name));

     this.setState({plottedSignals: newPlottedSignals})
    }

    updateSegment = debounce((messageId, segment) => {
        const {entries} = this.props.messages[this.props.selectedMessage];
        const segmentIndices = Entries.findSegmentIndices(entries, segment, true);

        this.setState({segment, segmentIndices, userSeekIndex: segmentIndices[0], userSeekTime: segment[0]})
    }, 250);

    onSegmentChanged(messageId, segment) {
        if(Array.isArray(segment)) {
            this.updateSegment(messageId, segment);
        }
    }

    resetSegment() {
        this.setState({segment: [], segmentIndices: [], userSeekIndex: 0, userSeekTime: 0})
    }

    showAddSignal() {
        this.setState({shouldShowAddSignal: true})
    }

    indexFromSeekRatio(ratio) {
        // returns index guaranteed to be in [0, entries.length - 1]

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

        return Math.min(entries.length - 1, offset + Math.round(ratio * (segmentLength - 1)));
    }

    onUserSeek(ratio) {
        this.setState({userSeekRatio: ratio});
        const message = this.props.messages[this.props.selectedMessage];
        if(!message) {
            const seekTime = ratio * this.secondsLoaded() + this.startOffset();
            this.props.onUserSeek(seekTime);
            this.props.onSeek(0, ratio * this.secondsLoaded() + this.startOffset());
            return;
        }

        const {entries} = message;
        const userSeekIndex = this.indexFromSeekRatio(ratio);
        const seekTime = entries[userSeekIndex].relTime;

        this.setState({userSeekIndex, userSeekTime: seekTime});
        this.props.onUserSeek(seekTime);
        this.props.onSeek(userSeekIndex, seekTime);
    }

    onPlaySeek(ratio) {
        const message = this.props.messages[this.props.selectedMessage];
        if(!message) {
            this.props.onSeek(0, ratio * this.secondsLoaded() + this.startOffset());
            return;
        }

        const {entries} = message

        const seekIndex = this.indexFromSeekRatio(ratio);
        const seekTime = entries[seekIndex].relTime;

        this.props.onSeek(seekIndex, seekTime);
    }

    onGraphTimeClick(messageId, time) {
        const canTime = time + this.props.firstCanTime;

        const {segmentIndices} = this.state;
        const {entries} = this.props.messages[messageId];
        const userSeekIndex = Entries.findTimeIndex(entries, canTime);

        const seekTime = entries[userSeekIndex].relTime;
        this.props.onUserSeek(time);

        this.setState({userSeekIndex,
                       userSeekRatio: (userSeekIndex) / entries.length,
                       userSeekTime: time});
    }

    onPlay() {
        this.setState({playing: true});
    }

    onPause() {
        this.setState({playing: false});
    }

    secondsLoadedRouteRelative(currentParts) {
        return (currentParts[1] - currentParts[0] + 1) * 60;
    }

    secondsLoaded() {
        const message = this.props.messages[this.props.selectedMessage];
        if(!message) {
            return this.secondsLoadedRouteRelative(this.props.currentParts);
        }

        const {entries} = message;

        const {segment} = this.state;
        if(segment.length === 2) {
            return segment[1] - segment[0];
        } else {
            return entries[entries.length - 1].time - entries[0].time;
        }
    }

    startOffset() {
        const message = this.props.messages[this.props.selectedMessage];
        if(!message) {
            return this.props.currentParts[0] * 60;
        }

        const {canFrameOffset, firstCanTime} = this.props;
        const {entries} = message;
        const {segment} = this.state;
        let startTime;
        if(segment.length === 2) {
            startTime = segment[0];
        } else {
            startTime = entries[0].relTime;
        }

        return canFrameOffset + startTime;
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
                        <Images.downArrow />
                        :
                        <Images.rightArrow />}
                    <p>Edit Signals</p>
                </div>);
    }

    onSignalPlotChanged(shouldPlot, messageId, signalName) {
        const {plottedSignals} = this.state;
        if(shouldPlot) {
            this.onSignalPlotPressed(messageId, signalName);
        } else {
            this.onSignalUnplotPressed(messageId, signalName);
        }
    }

    selectMessagePrompt() {
        return (<div className={css(Styles.selectMessagePrompt)}>
                <Images.leftArrow styles={[Styles.leftArrowStyle]} /> Select a message
                </div>)
    }

    leftColumnWithMessage() {
        return <div>
                {this.addSignalsHeader()}
                {this.state.shouldShowAddSignal ?
                <AddSignals
                    onConfirmedSignalChange={this.props.onConfirmedSignalChange}
                    message={this.props.messages[this.props.selectedMessage]}
                    onClose={() => {this.setState({shouldShowAddSignal: false})}}
                    messageIndex={this.props.seekIndex}
                    onSignalPlotChange={this.onSignalPlotChanged}
                    plottedSignals={this.state.plottedSignals.filter(
                            ({messageId, signalName}) => messageId === this.props.selectedMessage
                        ).map(({messageId, signalName}) => signalName)
                    }
                /> : null}
                <CanLog message={this.props.messages[this.props.selectedMessage]}
                    messageIndex={this.props.seekIndex}
                    segmentIndices={this.state.segmentIndices}
                    plottedSignals={this.state.plottedSignals}
                    onSignalPlotPressed={this.onSignalPlotPressed}
                    onSignalUnplotPressed={this.onSignalUnplotPressed}
                    showAddSignal={this.showAddSignal}
                    onMessageExpanded={this.onPause} />
            </div>
    }

    render() {
        return (<div className={css(Styles.root)}>
                    <div className={css(Styles.dataContainer)}>
                        <div className={css(Styles.left)}>
                            {this.props.messages[this.props.selectedMessage] ?
                              this.leftColumnWithMessage()
                            : this.selectMessagePrompt()}
                        </div>
                        <div className={css(Styles.right)}>
                            <div className={css(Styles.fixed)}>
                                <RouteVideoSync message={this.props.messages[this.props.selectedMessage]}
                                                secondsLoaded={this.secondsLoaded()}
                                                startOffset={this.startOffset()}
                                                seekIndex={this.props.seekIndex}
                                                userSeekIndex={this.state.userSeekIndex}
                                                playing={this.state.playing}
                                                url={this.props.url}
                                                canFrameOffset={this.props.canFrameOffset}
                                                firstCanTime={this.props.firstCanTime}
                                                onVideoClick={this.onVideoClick}
                                                onPlaySeek={this.onPlaySeek}
                                                onUserSeek={this.onUserSeek}
                                                onPlay={this.onPlay}
                                                onPause={this.onPause}
                                                userSeekRatio={this.state.userSeekRatio}
                                                userSeekTime={this.state.userSeekTime} />

                                {this.state.segment.length > 0 ?
                                    <div className={css(CommonStyles.button, Styles.resetSegment)}
                                         onClick={() => this.resetSegment()}>
                                        <p>Reset Segment</p>
                                    </div>
                                    : null}
                                {this.state.plottedSignals.map(({messageId, signalName}) => {
                                    const msg = this.props.messages[messageId];

                                    return <CanGraph key={messageId + '_' + signalName}
                                                     unplot={() => {this.onSignalUnplotPressed(messageId, signalName)}}
                                                     messageId={messageId}
                                                     messageName={msg.frame ? msg.frame.name : null}
                                                     signalSpec={Object.assign(Object.create(msg.signals[signalName]), msg.signals[signalName])}
                                                     onSegmentChanged={this.onSegmentChanged}
                                                     segment={this.state.segment}
                                                     data={this.state.graphData[messageId][signalName]}
                                                     onRelativeTimeClick={this.onGraphTimeClick}
                                                     currentTime={this.props.seekTime} />;
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
    },
    addSignalsHeader: {
        cursor: 'pointer',
        borderBottom: '1px solid #000',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center'
    },
    resetSegment: {
        marginTop: 10,
        padding: '10px 0',
        width: 160
    },
    selectMessagePrompt: {
        alignSelf: 'center',
        fontSize: 24,
        paddingTop: 230,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center'
    },
    leftArrowStyle: {
        height: 29,
        width: 29,
    }
})
