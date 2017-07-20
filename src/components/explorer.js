import React, {Component} from 'react';
import PropTypes from 'prop-types';

import { StyleSheet, css } from 'aphrodite/no-important';
import Moment from 'moment';

import AddSignals from './AddSignals';
import CanHistogram from './CanHistogram';
import CanGraphList from './CanGraphList';
import RouteVideoSync from './RouteVideoSync';
import CanLog from './CanLog';
import RouteSeeker from './RouteSeeker';
import Entries from '../models/can/entries';
import debounce from '../utils/debounce';
import CommonStyles from '../styles/styles';
import Images from '../styles/images';
import PartSelector from './PartSelector';
import {CAN_GRAPH_MAX_POINTS} from '../config';

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
       onPartChanged: PropTypes.func,
       partsCount: PropTypes.number,
    };

    constructor(props) {
        super(props);

        const msg = props.messages[props.selectedMessage];

        const  ShowAddSignal = (
            msg && Object.keys(msg.signals).length === 0);

        this.state = {
            plottedSignals: [],
            graphData: [],
            segment: [],
            segmentIndices: [],
            shouldShowAddSignal: true,
            userSeekIndex: 0,
            userSeekTime: props.currentParts[0] * 60,
            playing: props.autoplay,
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
        this.mergePlots = this.mergePlots.bind(this);
        this.refreshGraphData = this.refreshGraphData.bind(this);
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

        plottedSignals = plottedSignals.map((plot) => plot.filter(({messageId, signalName}, index) => {
            const messageExists = Object.keys(nextProps.messages).indexOf(messageId) !== -1;
            let signalExists = true;
            if(!messageExists) {
                graphData.splice(index, 1);
            } else {
                const signalNames = Object.keys(nextProps.messages[messageId].signals);
                signalExists = signalNames.indexOf(signalName) !== -1;

                if(!signalExists) {
                    graphData[index] = graphData[index].filter((entry) => entry.signalName !== signalName);
                }
            }

            return messageExists && signalExists;
        })).filter((plot) => plot.length > 0);

        this.setState({plottedSignals, graphData});

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
            // refresh graph data if the message entry lengths
            // do not match
            this.refreshGraphData(nextProps.messages, plottedSignals);
        }

        if(JSON.stringify(nextProps.currentParts) !== JSON.stringify(this.props.currentParts)) {
            const {userSeekTime} = this.state;
            const nextSeekTime = (userSeekTime - this.props.currentParts[0] * 60) + nextProps.currentParts[0] * 60;
            this.setState({userSeekTime: nextSeekTime});
        }
    }

    timeWindow() {
        const {route, currentParts} = this.props;
        if(route) {
            const partStartOffset = currentParts[0] * 60,
                  partEndOffset = (currentParts[1] + 1) * 60;

            const windowStartTime = Moment(route.start_time).add(partStartOffset, 's').format('HH:mm:ss');
            const windowEndTime = Moment(route.start_time).add(partEndOffset, 's').format('HH:mm:ss');

            return `${windowStartTime} - ${windowEndTime}`;
        } else return '';
    }

    _calcGraphData(msg, signalName) {
        if(!msg) return null;

        let samples = [];
        let skip = Math.floor(msg.entries.length / CAN_GRAPH_MAX_POINTS);

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
                    unit: msg.signals[signalName].unit,
                    color: `rgba(${msg.signals[signalName].colors().join(",")}, 0.5)`,
                    signalName}
        });
    }

    calcGraphData(signals, messages) {
        if(typeof messages === 'undefined') {
            messages = this.props.messages;
        }

        return signals.map(({messageId, signalName}) => this._calcGraphData(messages[messageId], signalName))
                      .reduce((combined, signalData) => combined.concat(signalData), [])
                      .sort((entry1, entry2) => {
                        if(entry1.xRel < entry2.xRel) {
                            return -1;
                        } else if(entry1.xRel > entry2.xRel) {
                            return 1;
                        } else {
                            return 0;
                        }
                      });
    }

    onSignalPlotPressed(messageId, signalName) {
        let {plottedSignals, graphData} = this.state;

        // if (!plottedSignals.find((plottedSignal) =>
        //   (plottedSignal.messageId === messageId) && (plottedSignal.signalName === signalName))) {

        graphData = [this.calcGraphData([{messageId, signalName}]), ...graphData];
        plottedSignals = [[{messageId, signalName}], ...plottedSignals];
        this.setState({plottedSignals, graphData});
        // }
    }

    refreshGraphData(messages, plottedSignals) {
        if(typeof messages === 'undefined') {
            messages = this.props.messages;
        }
        if(typeof plottedSignals === 'undefined') {
            plottedSignals = this.state.plottedSignals;
        }
        let graphData = Array(plottedSignals.length);
        plottedSignals.forEach((plotSignals, index) => {
            const plotGraphData = this.calcGraphData(plotSignals, messages);
            graphData[index] = plotGraphData;
        });
        this.setState({graphData});
    }

    onSignalUnplotPressed(messageId, name) {
     const {plottedSignals} = this.state;
     const newPlottedSignals = plottedSignals.map((plot) =>
                                (plot.filter((signal) => !(signal.messageId === messageId && signal.signalName === name))))
                                .filter((plot) => plot.length > 0);

     this.setState({plottedSignals: newPlottedSignals}, this.refreshGraphData);
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
        const {segment, segmentIndices} = this.state;
        if(segment.length > 0 || segmentIndices.length > 0) {
            this.setState({segment: [], segmentIndices: [], userSeekIndex: 0, userSeekTime: 0})
        }
    }

    showAddSignal() {
        this.setState({shouldShowAddSignal: true})
    }

    indexFromSeekTime(time) {
        // returns index guaranteed to be in [0, entries.length - 1]

        const {entries} = this.props.messages[this.props.selectedMessage];
        const {segmentIndices} = this.state;
        let segmentLength, offset;
        if(segmentIndices.length === 2) {
            for(let i = segmentIndices[0]; i <= segmentIndices[1]; i++) {
                if(entries[i].relTime >= time) {
                    return i;
                }
            }
            return segmentIndices[1];
        } else {
            for(let i = 0; i < entries.length; i++) {
                if(entries[i].relTime >= time) {
                    return i;
                }
            }
            return entries.length - 1;
        }
    }

    onUserSeek(time) {
        this.setState({userSeekTime: time});
        const message = this.props.messages[this.props.selectedMessage];
        if(!message) {
            this.props.onUserSeek(time);
            this.props.onSeek(0, time);
            return;
        }

        const {entries} = message;
        const userSeekIndex = this.indexFromSeekTime(time);
        const seekTime = entries[userSeekIndex].relTime;

        this.setState({userSeekIndex, userSeekTime: seekTime});
        this.props.onUserSeek(seekTime);
        this.props.onSeek(userSeekIndex, seekTime);
    }

    onPlaySeek(time) {
        const message = this.props.messages[this.props.selectedMessage];
        if(!message) {
            this.props.onSeek(0, time);
            return;
        }

        const {entries} = message

        const seekIndex = this.indexFromSeekTime(time);
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
        const partOffset = this.props.currentParts[0] * 60;
        const message = this.props.messages[this.props.selectedMessage];
        if(!message) {
            return partOffset
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

        if(startTime > partOffset && startTime < (this.props.currentParts[1] + 1) * 60) {
            // startTime is within bounds of currently selected parts
            return startTime;
        } else {
            return partOffset;
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
        return (
          <div className={css(Styles.addSignalsHeader)}
               onClick={() => this.setState({shouldShowAddSignal: !this.state.shouldShowAddSignal})}>
              {shouldShowAddSignal ?
                  <Images.downArrow />
                  :
                  <Images.rightArrow />}
              <p>Edit Signals</p>
          </div>
        );
    }

    onSignalPlotChanged(shouldPlot, messageId, signalName) {
        if(shouldPlot) {
            this.onSignalPlotPressed(messageId, signalName);
        } else {
            this.onSignalUnplotPressed(messageId, signalName);
        }
    }

    selectMessagePrompt() {
        return (
            <div className={css(Styles.selectMessagePrompt)}>
                <Images.leftArrow styles={[Styles.leftArrowStyle]} /> Select a message
            </div>
        )
    }

    selectedMessagePlottedSignalNames() {
        const {plottedSignals} = this.state;
        return plottedSignals
                .map((plot) =>
                    plot.filter(({messageId, signalName}) =>
                            messageId === this.props.selectedMessage)
                         .map(({signalName}) => signalName))
                .reduce((arr, signalName) => arr.concat(signalName), []);
    }

    renderExplorerSignals() {
        const selectedMessageKey = this.props.selectedMessage;
        const selectedMessage = this.props.messages[selectedMessageKey];
        const selectedMessageName = selectedMessage.frame !== undefined ? selectedMessage.frame.name : 'undefined';
        return (
            <div className='cabana-explorer-signals-wrapper'>
                <div
                    className='cabana-explorer-signals-header'
                    onClick={this.toggleEditSignals}>
                    <div className='cabana-explorer-signals-header-context'>
                        <h6>Selected Message:</h6>
                        <h3>{selectedMessageName}</h3>
                    </div>
                    <div className='cabana-explorer-signals-header-action'>
                        <button
                            className='button--small'
                            onClick={() => this.props.showEditMessageModal(selectedMessageKey)}>Edit</button>
                    </div>
                </div>
                <div className='cabana-explorer-signals-window'>
                    {this.state.shouldShowAddSignal ?
                      <AddSignals
                          onConfirmedSignalChange={this.props.onConfirmedSignalChange}
                          message={this.props.messages[this.props.selectedMessage]}
                          onClose={() => {this.setState({shouldShowAddSignal: false})}}
                          messageIndex={this.props.seekIndex}
                          onSignalPlotChange={this.onSignalPlotChanged}
                          plottedSignals={this.selectedMessagePlottedSignalNames()}
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
            </div>
        )
    }

    mergePlots({fromPlot, toPlot}) {
        let {plottedSignals, graphData} = this.state;
        const {messages} = this.props;

        // remove fromPlot from plottedSignals, graphData
        const fromPlotIdx = plottedSignals.findIndex(
            (plot) =>
                plot.some((signal) =>
                    signal.signalName === fromPlot.signalName
                        && signal.messageId === fromPlot.messageId));
        plottedSignals.splice(fromPlotIdx, 1);
        graphData.splice(fromPlotIdx, 1);

        // calc new graph data
        const newGraphData = this.calcGraphData([fromPlot, toPlot]);

        const toPlotIdx = plottedSignals.findIndex(
            (plot) =>
                plot.some((signal) =>
                    signal.signalName === toPlot.signalName
                        && signal.messageId === toPlot.messageId));
        graphData[toPlotIdx] = newGraphData;
        plottedSignals[toPlotIdx] = [fromPlot, toPlot];

        this.setState({graphData, plottedSignals});
    }

    render() {
        return (
            <div className='cabana-explorer'>
                <div className='cabana-explorer-signals'>
                    {this.props.messages[this.props.selectedMessage] ?
                      this.renderExplorerSignals()
                    : this.selectMessagePrompt()}
                </div>
                <div className='cabana-explorer-visuals'>
                    <div className='cabana-explorer-visuals-header'>
                        {this.timeWindow()}
                        <PartSelector
                            onPartChange={this.props.onPartChange}
                            partsCount={this.props.partsCount}
                        />
                    </div>
                    <RouteVideoSync
                        message={this.props.messages[this.props.selectedMessage]}
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
                        userSeekTime={this.state.userSeekTime} />
                    {this.state.segment.length > 0 ?
                        <div className={css(CommonStyles.button, Styles.resetSegment)}
                             onClick={() => {this.resetSegment()}}>
                            <p>Reset Segment</p>
                        </div>
                        : null}
                      <CanGraphList
                        plottedSignals={this.state.plottedSignals}
                        messages={this.props.messages}
                        graphData={this.state.graphData}
                        onGraphTimeClick={this.onGraphTimeClick}
                        seekTime={this.props.seekTime}
                        onSegmentChanged={this.onSegmentChanged}
                        onSignalUnplotPressed={this.onSignalUnplotPressed}
                        segment={this.state.segment}
                        mergePlots={this.mergePlots} />
                </div>
            </div>
        );
    }
}

const Styles = StyleSheet.create({
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
