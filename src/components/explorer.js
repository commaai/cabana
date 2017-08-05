import React, {Component} from 'react';
import PropTypes from 'prop-types';

import { StyleSheet, css } from 'aphrodite/no-important';
import cx from 'classnames';
import Moment from 'moment';

import AddSignals from './AddSignals';
import CanHistogram from './CanHistogram';
import CanGraphList from './CanGraphList';
import RouteVideoSync from './RouteVideoSync';
import CanLog from './CanLog';
import RouteSeeker from './RouteSeeker';
import Entries from '../models/can/entries';
import debounce from '../utils/debounce';
import ArrayUtils from '../utils/array';
import CommonStyles from '../styles/styles';
import Images from '../styles/images';
import PartSelector from './PartSelector';
import {CAN_GRAPH_MAX_POINTS} from '../config';

export default class Explorer extends Component {
    static propTypes = {
       selectedMessage: PropTypes.string,
       url: PropTypes.string,
       live: PropTypes.bool,
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
            msg && Object.keys(msg.frame.signals).length === 0);

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
        this.toggleShouldShowAddSignal = this.toggleShouldShowAddSignal.bind(this);
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
            && prevProps.messages[prevProps.selectedMessage]
            && this.props.messages[this.props.selectedMessage].frame !== undefined) {
            const nextSignalNames = Object.keys(this.props.messages[this.props.selectedMessage].frame.signals);
            const currentSignalNames = Object.keys(prevProps.messages[prevProps.selectedMessage].frame.signals);

            const newSignalNames = nextSignalNames.filter((s) => currentSignalNames.indexOf(s) === -1);
            for(let i = 0; i < newSignalNames.length; i++) {
                this.onSignalPlotPressed(this.props.selectedMessage, newSignalNames[i]);
            }

        }
    }

    componentWillReceiveProps(nextProps) {
        const nextMessage = nextProps.messages[nextProps.selectedMessage];
        const curMessage = this.props.messages[this.props.selectedMessage];
        let {plottedSignals, graphData} = this.state;

        if(Object.keys(nextProps.messages).length === 0) {
            this.resetSegment();
        }
        if(nextMessage && nextMessage.frame && nextMessage !== curMessage) {
            const nextSignalNames = Object.keys(nextMessage.frame.signals);

            if(nextSignalNames.length === 0) {
                this.setState({shouldShowAddSignal: true});
            }
        }

        // remove plottedSignals that no longer exist
        plottedSignals = plottedSignals.map((plot) => plot.filter(({messageId, signalName}, index) => {
            const messageExists = Object.keys(nextProps.messages).indexOf(messageId) !== -1;
            let signalExists = true;
            if(!messageExists) {
                graphData.splice(index, 1);
            } else {
                const signalNames = Object.keys(nextProps.messages[messageId].frame.signals);
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
            // by finding a entry indices
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

        if(plottedSignals.length > 0) {
            if(graphData.length === plottedSignals.length) {
                if(plottedSignals.some((plot) =>
                    plot.some(({messageId, signalName}) =>
                        nextProps.messages[messageId].frame.signals[signalName] !== this.props.messages[messageId].frame.signals[signalName]
                    ))) {
                    this.refreshGraphData(nextProps.messages, plottedSignals);
                } else {
                    graphData = this.appendNewGraphData(plottedSignals, graphData, nextProps.messages);
                    this.setState({graphData});
                }
            } else {
                this.refreshGraphData(nextProps.messages, plottedSignals);
            }
        }

        if(JSON.stringify(nextProps.currentParts) !== JSON.stringify(this.props.currentParts)) {
            const {userSeekTime} = this.state;
            const nextSeekTime = (userSeekTime - this.props.currentParts[0] * 60) + nextProps.currentParts[0] * 60;
            this.setState({userSeekTime: nextSeekTime});
        }
    }

    appendNewGraphData(plottedSignals, graphData, messages) {
        const messagesPerPlot = plottedSignals.map((plottedMessages) =>
            plottedMessages.reduce((messages,
               {messageId, signalName}) => {
                   messages.push(messageId);
                   return messages;
            }, [])
        );

        const extendedPlots = messagesPerPlot
            .map((plottedMessageIds, index) => {return {plottedMessageIds, index}}) // preserve index so we can look up graphData
            .filter(({plottedMessageIds, index}) => {
                let maxGraphTime = 0;

                if(index < graphData.length && graphData[index].length > 0) {
                    maxGraphTime = graphData[index][graphData[index].length - 1].relTime;
                }

                return plottedMessageIds.some((messageId) =>
                    messages[messageId].entries.some((e) => e.relTime > maxGraphTime));
        }).map(({plottedMessageIds, index}) => {
            plottedMessageIds = plottedMessageIds.reduce((arr, messageId) => {
                if(arr.indexOf(messageId) === -1) {
                    arr.push(messageId);
                }
                return arr;
            }, []);
            return {plottedMessageIds, index};
        });

        extendedPlots.forEach(({plottedMessageIds, index}) => {
            const signalNamesByMessageId = plottedSignals[index].reduce((obj, {messageId, signalName}) => {
                if(!obj[messageId]) {
                    obj[messageId] = []
                }
                obj[messageId].push(signalName);
                return obj;
            }, {});
            const graphDataMaxMessageTimes = plottedMessageIds.reduce((obj, messageId) => {
                const signalNames = signalNamesByMessageId[messageId];
                const maxIndex = ArrayUtils.findIndexRight(graphData[index], (entry) => {
                    return signalNames.indexOf(entry.signalName) !== -1
                });
                if(maxIndex) {
                    obj[messageId] = graphData[index][maxIndex].relTime;
                } else {
                    obj[messageId] = graphData[index][graphData[index].length - 1].relTime;
                }

                return obj;
            }, {});

            let newGraphData = [];
            plottedMessageIds.map((messageId) => {
                    return { messageId, entries: messages[messageId].entries }
                }).filter(({messageId, entries}) => // Filter to only messages with stale graphData
                    entries[entries.length - 1].relTime > graphDataMaxMessageTimes[messageId])
                .forEach(({messageId, entries}) => { // Compute and append new graphData
                    let firstNewEntryIdx =  entries.findIndex((entry) =>
                        entry.relTime > graphDataMaxMessageTimes[messageId]);

                    const newEntries = entries.slice(firstNewEntryIdx);

                    signalNamesByMessageId[messageId].forEach((signalName) => {
                        const signalGraphData = this._calcGraphData({...messages[messageId],
                                                                     entries: newEntries}, signalName);
                        newGraphData = newGraphData.concat(signalGraphData);
                    });
            });

            const messageIdOutOfBounds = plottedMessageIds.find((messageId) =>
                graphData[index][0].relTime < messages[messageId].entries[0].relTime);

            graphData[index] = graphData[index].concat(newGraphData)
            if(messageIdOutOfBounds) {
                const graphDataLowerBound = graphData[index].findIndex(
                    (e) => e.relTime > messages[messageIdOutOfBounds].entries[0].relTime);

                if(graphDataLowerBound) {
                    graphData[index] = graphData[index].slice(graphDataLowerBound);
                }
            }
        });

        return graphData;
    }

    timeWindow() {
        const {routeStartTime, currentParts} = this.props;

        if(routeStartTime) {
            const partStartOffset = currentParts[0] * 60,
                  partEndOffset = (currentParts[1] + 1) * 60;

            const windowStartTime = routeStartTime.clone().add(partStartOffset, 's').format('HH:mm:ss');
            const windowEndTime = routeStartTime.clone().add(partEndOffset, 's').format('HH:mm:ss');

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

        return samples.filter((e) => e.signals[signalName])
                      .map((entry) => {
                    return {x: entry.time,
                            relTime: entry.time - this.props.firstCanTime,
                            y: entry.signals[signalName],
                            unit: msg.frame.signals[signalName].unit,
                            color: `rgba(${msg.frame.signals[signalName].colors().join(",")}, 0.5)`,
                            signalName}
        });
    }

    sortGraphData(graphData) {
        return graphData.sort((entry1, entry2) => {
                        if(entry1.relTime < entry2.relTime) {
                            return -1;
                        } else if(entry1.relTime > entry2.relTime) {
                            return 1;
                        } else {
                            return 0;
                        }
                      });
    }

    calcGraphData(signals, messages) {
        if(typeof messages === 'undefined') {
            messages = this.props.messages;
        }

        return this.sortGraphData(signals.map(({messageId, signalName}) => this._calcGraphData(messages[messageId], signalName))
                            .reduce((combined, signalData) => combined.concat(signalData), []));
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
        let graphData = plottedSignals.map((plotSignals, index) => this.calcGraphData(plotSignals, messages));

        this.setState({graphData});
    }

    onSignalUnplotPressed(messageId, name) {
        const {plottedSignals} = this.state;
        const newPlottedSignals = plottedSignals.map((plot) =>
                                  (plot.filter((signal) => !(signal.messageId === messageId && signal.signalName === name))))
                                  .filter((plot) => plot.length > 0);

        this.setState({plottedSignals: newPlottedSignals}, this.refreshGraphData(this.props.messages, newPlottedSignals));
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
        const {messages, selectedMessage} = this.props;
        if(segment.length > 0 || segmentIndices.length > 0) {
            const userSeekTime = messages[selectedMessage].entries[0].relTime;
            this.setState({segment: [], segmentIndices: [], userSeekIndex: 0, userSeekTime})
        }
    }

    showAddSignal() {
        this.setState({shouldShowAddSignal: true})
    }

    toggleShouldShowAddSignal() {
      this.setState({shouldShowAddSignal: !this.state.shouldShowAddSignal});
    }

    indexFromSeekTime(time) {
        // returns index guaranteed to be in [0, entries.length - 1]

        const {entries} = this.props.messages[this.props.selectedMessage];
        if(entries.length === 0) return null;

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
        if(userSeekIndex) {
            const seekTime = entries[userSeekIndex].relTime;

            this.setState({userSeekIndex, userSeekTime: seekTime});
            this.props.onSeek(userSeekIndex, seekTime);
        } else {
            this.props.onUserSeek(time);
            this.setState({userSeekTime: time});
        }
    }

    onPlaySeek(time) {
        const message = this.props.messages[this.props.selectedMessage];
        if(!message || message.entries.length === 0) {
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
        if(entries.length) {
            const userSeekIndex = Entries.findTimeIndex(entries, canTime);

            const seekTime = entries[userSeekIndex].relTime;
            this.props.onUserSeek(time);

            this.setState({userSeekIndex,
                           userSeekTime: time});
        } else {
            this.setState({userSeekTime: time});
        }
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
        if(!message || message.entries.length === 0) {
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
        if(!message || message.entries.length === 0) {
            return partOffset;
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

    onSignalPlotChanged(shouldPlot, messageId, signalName) {
        if(shouldPlot) {
            this.onSignalPlotPressed(messageId, signalName);
        } else {
            this.onSignalUnplotPressed(messageId, signalName);
        }
    }

    renderSelectMessagePrompt() {
        return (
          <div className='cabana-explorer-select-prompt'>
              <h1>Select a message</h1>
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
                <div className='cabana-explorer-signals-header'>
                    <div className='cabana-explorer-signals-header-context'>
                        <h5 className='t-capline'>Selected Message:</h5>
                        <h3>{selectedMessageName}</h3>
                    </div>
                    <div className='cabana-explorer-signals-header-action'>
                        <button
                            className='button--small'
                            onClick={() => this.props.showEditMessageModal(selectedMessageKey)}>Edit</button>
                    </div>
                </div>
                <div className='cabana-explorer-signals-subheader'
                      onClick={ this.toggleShouldShowAddSignal }>
                    <strong>Edit Signals</strong>
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
        const signalsExpandedClass = this.state.shouldShowAddSignal ? 'is-expanded' : null;
        return (
            <div className='cabana-explorer'>
                <div className={ cx('cabana-explorer-signals', signalsExpandedClass) }>
                    {this.props.messages[this.props.selectedMessage] ?
                      this.renderExplorerSignals()
                    : this.renderSelectMessagePrompt()}
                </div>
                <div className='cabana-explorer-visuals'>
                    { this.props.live === false ?
                        <div>
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
                        </div>
                        : null }
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
                        mergePlots={this.mergePlots}
                        live={this.props.live} />
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
})
