import React, {Component} from 'react';
import PropTypes from 'prop-types';
require('element-closest');

import CanGraph from './CanGraph';

export default class CanGraphList extends Component {
    static propTypes = {
        plottedSignals: PropTypes.array.isRequired,
        messages: PropTypes.object.isRequired,
        graphData: PropTypes.array.isRequired,
        onGraphTimeClick: PropTypes.func.isRequired,
        seekTime: PropTypes.number.isRequired,
        onSegmentChanged: PropTypes.func.isRequired,
        onSignalUnplotPressed: PropTypes.func.isRequired,
        segment: PropTypes.array.isRequired,
        mergePlots: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            draggingSignal: {},
            dragPos: null,
            dragShift: null,
            graphToReceiveDrop: null,
        };

        this.plotListRef = undefined;
        this.plotRefs = [];
        this.renderSignalPlot = this.renderSignalPlot.bind(this);
        this.onPlotListRefReady = this.onPlotListRefReady.bind(this);
        this.onGraphDragStart = this.onGraphDragStart.bind(this);
        this.onGraphDragEnd = this.onGraphDragEnd.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
    }

    onGraphDragStart(messageId, signalName, shiftX, shiftY) {
        this.setState({draggingSignal: {messageId, signalName},
                       dragShift: {x: shiftX, y: shiftY}});
    }

    determineDraggingGraph() {
        const {draggingSignal} = this.state;
        return this.plotRefs.find(
                ({messageId, signalName}) =>
                  draggingSignal.messageId === messageId
                  && draggingSignal.signalName === signalName);

    }

    onMouseMove(e) {
        const {dragShift} = this.state;
        if(dragShift === null) {
            if(this.state.graphToReceiveDrop !== null) {
                this.setState({graphToReceiveDrop: null});
            }
            return;
        }
        const rect = this.plotListRef.getBoundingClientRect();
        const draggingGraph = this.determineDraggingGraph();
        if(draggingGraph) {
            draggingGraph.ref.hidden = true;
            const ele = document.elementFromPoint(e.clientX, e.clientY);
            draggingGraph.ref.hidden = false;
            const closestPlot = ele.closest('.cabana-explorer-visuals-plot');
            const closestPlotRef = this.plotRefs.find(({ref, messageId, signalName}) =>
                                    !(messageId === draggingGraph.messageId
                                        && signalName === draggingGraph.signalName)
                                    && ref.isEqualNode(closestPlot));
            if(closestPlotRef) {
                this.setState({graphToReceiveDrop: closestPlotRef});
            } else {
                this.setState({graphToReceiveDrop: null});
            }
        }
        const left = e.clientX - rect.left - dragShift.x;
        const top = e.clientY - rect.top - dragShift.y;

        this.setState({dragPos: {left, top}});
    }

    onGraphDragEnd() {
        if(this.state.graphToReceiveDrop !== null) {
            this.props.mergePlots({fromPlot: this.state.draggingSignal, toPlot: this.state.graphToReceiveDrop});
        }

        this.setState({draggingSignal: {},
                       dragShift: null,
                       dragPos: null,
                       graphToReceiveDrop: null});
    }

    addCanGraphRef(ref, messageId, signalName) {
        if(ref) {
            let {plotRefs} = this;
            plotRefs = plotRefs.filter((ref) => !(ref.messageId === messageId && ref.signalName === signalName))
                               .concat([{messageId, signalName, ref}]);
            this.plotRefs = plotRefs;
        }
    }

    renderSignalPlot(plottedSignals, index) {
        const {draggingSignal, graphToReceiveDrop} = this.state;
        const {messageId, signalName} = plottedSignals[0];
        const msg = this.props.messages[messageId];
        const isDragging = draggingSignal.signalName === signalName && draggingSignal.messageId === messageId;
        const canReceiveGraphDrop = (graphToReceiveDrop
                                    && graphToReceiveDrop.signalName === signalName
                                    && graphToReceiveDrop.messageId === messageId);
        plottedSignals = plottedSignals.map((signal) => {
            return {messageName: this.props.messages[signal.messageId].frame.name, ...signal}
        });
        const key = plottedSignals.reduce(
            (key, {messageId, signalName}) => key + messageId + '_' + signalName,
            '');

        return (
            <CanGraph
                onGraphRefAvailable={(ref) => {this.addCanGraphRef(ref, messageId, signalName)}}
                key={key}
                unplot={this.props.onSignalUnplotPressed}
                messages={this.props.messages}
                messageId={messageId}
                messageName={msg.frame ? msg.frame.name : null}
                signalSpec={Object.assign(Object.create(msg.signals[signalName]), msg.signals[signalName])}
                onSegmentChanged={this.props.onSegmentChanged}
                segment={this.props.segment}
                data={this.props.graphData[index]}
                onRelativeTimeClick={this.props.onGraphTimeClick}
                currentTime={this.props.seekTime}
                onDragStart={this.onGraphDragStart}
                onDragEnd={this.onGraphDragEnd}
                container={this.plotListRef}
                dragPos={isDragging ? this.state.dragPos : null}
                canReceiveGraphDrop={canReceiveGraphDrop}
                plottedSignals={plottedSignals}
            />
        );
    }

    onPlotListRefReady(ref) {
        this.plotListRef = ref;
    }

    render() {
        return (<div className='cabana-explorer-visuals-plots'
                     ref={this.onPlotListRefReady}
                     onMouseMove={this.onMouseMove}
                     onMouseLeave={this.onGraphDragEnd}
                     onMouseUp={this.onGraphDragEnd}>
                    {this.props.plottedSignals.map(this.renderSignalPlot)}
                </div>);
    }
}
