import React, {Component} from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import PropTypes from 'prop-types';
import VisibilitySensor from 'react-visibility-sensor';

export default class MessageBytes extends Component {
    static propTypes = {
        seekTime: PropTypes.number.isRequired,
        message: PropTypes.object.isRequired,
        seekIndex: PropTypes.number,
        maxByteStateChangeCount: PropTypes.number.isRequired,
        live: PropTypes.bool.isRequired,
    };

    constructor(props) {
        super(props);
        this.state = {
            byteColors: [],
            isVisible: true,
            lastUpdatedMillis: 0,
        };

        this.onVisibilityChange = this.onVisibilityChange.bind(this);
        this.onCanvasRefAvailable = this.onCanvasRefAvailable.bind(this);
    }

    shouldComponentUpdate(nextProps, nextState) {
        if(nextProps.live) {
            const nextLastEntry = nextProps.message.entries[nextProps.message.entries.length - 1];
            const curLastEntry = this.props.message.entries[this.props.message.entries.length - 1];

            return (nextProps.hexData !== curLastEntry.hexData);
        } else {
            return nextProps.seekTime !== this.props.seekTime
        }
    }

    componentWillReceiveProps(nextProps) {
        this.updateCanvas(nextProps);
    }

    updateCanvas(props) {
        const {message, live, seekTime} = props;
        if(!this.canvas || message.entries.length === 0) return;

        const {byteColors} = this.state;
        let mostRecentMsg = message.entries[message.entries.length - 1];
        if(!live) {

            mostRecentMsg = message.entries.find((e) => e.relTime >= seekTime);

            if(!mostRecentMsg) {
                mostRecentMsg = message.entries[0];
            }
        }

        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0,0,180,15);
        for(let i = 0; i < message.byteStateChangeCounts.length; i++) {
            const hexData = mostRecentMsg.hexData.substr(i * 2, 2);
            ctx.fillStyle = mostRecentMsg.byteStyles[i].backgroundColor;

            ctx.fillRect(i * 20, 0, 20, 15);

            ctx.font = '12px Courier';
            ctx.fillStyle = 'white';
            ctx.fillText(hexData, i * 20 + 2, 12);
        }
    }

    onVisibilityChange(isVisible) {
        if(isVisible !== this.state.isVisible) {
            this.setState({isVisible});
        }
    }

    onCanvasRefAvailable(ref) {
        if(!ref) return;

        this.canvas = ref;
        this.canvas.width = 160 * window.devicePixelRatio;
        this.canvas.height = 15 * window.devicePixelRatio;
        const ctx = this.canvas.getContext('2d');
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    render() {
        return (<canvas ref={this.onCanvasRefAvailable}
                             className='cabana-meta-messages-list-item-bytes-canvas'></canvas>);
    }
}

const Styles = StyleSheet.create({
    byte: {
        width: 20,
        height: 15,
        border: '1px solid rgba(0,0,0,0.9)',
        color: 'white',
        display: 'inline-block',
        textAlign: 'center'
    }
});