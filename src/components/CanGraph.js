import React, {Component} from 'react';
import Vega from 'react-vega';
import PropTypes from 'prop-types';
import css from '../utils/css';
import Signal from '../models/can/signal';
import CanPlot from '../vega/CanPlot';

const DefaultPlotInnerStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
};

export default class CanGraph extends Component {
    static propTypes = {
        data: PropTypes.array,
        messageId: PropTypes.string,
        messageName: PropTypes.string,
        signalSpec: PropTypes.instanceOf(Signal),
        segment: PropTypes.array,
        unplot: PropTypes.func,
        onRelativeTimeClick: PropTypes.func,
        currentTime: PropTypes.number,
        onSegmentChanged: PropTypes.func,
        onDragStart: PropTypes.func,
        onDragEnd: PropTypes.func,
        container: PropTypes.node,
        dragPos: PropTypes.object,
        canReceiveGraphDrop: PropTypes.bool,
        onGraphRefAvailable: PropTypes.func,
        plottedSignals: PropTypes.array,
    };

    constructor(props) {
        super(props);

        this.state = {
          plotInnerStyle: {},
          shiftX: 0,
          shiftY: 0,
        };
        this.onNewView = this.onNewView.bind(this);
        this.onSignalClickTime = this.onSignalClickTime.bind(this);
        this.onSignalSegment = this.onSignalSegment.bind(this);
        this.onDragAnchorMouseDown = this.onDragAnchorMouseDown.bind(this);
        this.onDragAnchorMouseUp = this.onDragAnchorMouseUp.bind(this);
        this.onDragStart = this.onDragStart.bind(this);
    }

    segmentIsNew(newSegment) {
        return newSegment.length != this.props.segment.length
        || !(newSegment.every((val, idx) => this.props.segment[idx] == val));
    }

    dataChanged(prevProps, nextProps) {
        return nextProps.data.length != prevProps.data.length
        || !(prevProps.signalSpec.equals(nextProps.signalSpec))
        || prevProps.data.some((prevEntry, idx) => prevEntry.y != nextProps.data[idx].y);
    }

    visualChanged(prevProps, nextProps) {
        return prevProps.canReceiveGraphDrop !== nextProps.canReceiveGraphDrop
                || JSON.stringify(prevProps.dragPos) !== JSON.stringify(nextProps.dragPos);
    }

    shouldComponentUpdate(nextProps, nextState) {
        if(this.view) {
            // only update if segment is new
            let segmentChanged = false;
            if(this.segmentIsNew(nextProps.segment)) {
                if(nextProps.segment.length > 0) {
                  // Set segmented domain
                  this.view.signal('segment', nextProps.segment)
                } else {
                  // Reset segment to full domain
                  this.view.signal('segment', 0);
                }
                segmentChanged = true;
            }

            if(nextProps.currentTime != this.props.currentTime) {
                this.view.signal('videoTime', nextProps.currentTime);
                segmentChanged = true;
            }

            if(segmentChanged) {
                this.view.run();
            }
        }

        const dataChanged = this.dataChanged(this.props, nextProps);
        if(dataChanged) {
            this.view.run();
        }
        return dataChanged
                || JSON.stringify(this.state) !== JSON.stringify(nextState)
                || this.visualChanged(this.props, nextProps);
    }

    componentDidUpdate(prevProps, prevState) {
        if(this.dataChanged(prevProps, this.props)) {
          this.view.run();
        }
    }

    componentWillReceiveProps(nextProps) {
        if(nextProps.dragPos && JSON.stringify(nextProps.dragPos) !== JSON.stringify(this.props.dragPos)) {
            this.updateStyleFromDragPos(nextProps.dragPos);
        } else if(!nextProps.dragPos) {
            this.setState({plotInnerStyle: {}})
        }
    }

    updateStyleFromDragPos({left, top}) {
        const plotInnerStyle = {...this.state.plotInnerStyle};
        plotInnerStyle.left = left;
        plotInnerStyle.top = top;
        this.setState({plotInnerStyle});
    }

    onNewView(view) {
        this.view = view;
        if(this.props.segment.length > 0) {
            view.signal('segment', this.props.segment);
        }
    }

    onSignalClickTime(signal, clickTime) {
        if(clickTime !== undefined) {
          this.props.onRelativeTimeClick(this.props.messageId, clickTime);
         }
    }

    onSignalSegment(signal, segment) {
        if(!Array.isArray(segment)) {
         return;
        }

        this.props.onSegmentChanged(this.props.messageId, segment);
        if(this.view) {
            const state = this.view.getState();
            state.subcontext[0].signals.brush = 0;
            this.view = this.view.setState(state);
        }
    }

    plotInnerStyleFromMouseEvent(e) {
        const {shiftX, shiftY} = this.state;
        const plotInnerStyle = {...DefaultPlotInnerStyle};
        const rect = this.props.container.getBoundingClientRect();

        const x = e.clientX - rect.left - shiftX;
        const y = e.clientY - rect.top - shiftY;
        plotInnerStyle.left = x;
        plotInnerStyle.top = y;
        return plotInnerStyle;
    }

    onDragAnchorMouseDown(e) {
        e.persist();
        const shiftX = e.clientX - e.target.getBoundingClientRect().left;
        const shiftY = e.clientY - e.target.getBoundingClientRect().top;
        this.setState({shiftX, shiftY},
                       () => {
                        this.setState({plotInnerStyle: this.plotInnerStyleFromMouseEvent(e)});
                       });
        this.props.onDragStart(this.props.messageId, this.props.signalSpec.name, shiftX, shiftY);
    }

    onDragAnchorMouseUp(e) {
        this.props.onDragEnd();
        this.setState({plotInnerStyle: {},
                       shiftX: 0,
                       shiftY: 0});
    }

    onDragStart(e) {
        e.preventDefault();
        return false;
    }

    render() {
      const {plotInnerStyle} = this.state;

      const innerClasses = ['cabana-explorer-visuals-plot-inner'];
      if(this.props.canReceiveGraphDrop) {
        innerClasses.push('cabana-explorer-visuals-plot-inner-droppable');
      }

      return (
            <div className='cabana-explorer-visuals-plot'
                 ref={this.props.onGraphRefAvailable}>
                <div className={innerClasses.join(' ')}
                     style={{...plotInnerStyle}}>
                    <div className='cabana-explorer-visuals-plot-inner-draganchor'
                         onMouseDown={this.onDragAnchorMouseDown}>
                        <span className='fa fa-bars'></span>
                    </div>
                    {this.props.plottedSignals.map(({messageName, signalName}) =>
                        (<div>
                            <div className='cabana-explorer-visuals-plot-message'>
                                <span>{messageName}</span>
                            </div>
                            <div className='cabana-explorer-visuals-plot-signal'>
                                <strong>{signalName}</strong>
                            </div>
                        </div>)
                    )}
                    <a onClick={this.props.unplot}>(unplot)</a>
                    <CanPlot
                        className='cabana-explorer-visuals-plot-canvas'
                        logLevel={0}
                        data={{table: this.props.data}}
                        onNewView={this.onNewView}
                        onSignalClickTime={this.onSignalClickTime}
                        onSignalSegment={this.onSignalSegment}
                    />
                </div>
            </div>
        );
    }
}
