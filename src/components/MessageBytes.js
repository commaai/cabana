import React, {Component} from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import PropTypes from 'prop-types';

export default class MessageBytes extends Component {
    static propTypes = {
        seekTime: PropTypes.number.isRequired,
        message: PropTypes.object.isRequired,
        maxByteStateChangeCount: PropTypes.number.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            byteColors: []
        };
    }

    componentWillReceiveProps(nextProps) {
        const {message} = nextProps;

        if(message && this.props.message && (message != this.props.message
            || JSON.stringify(message.byteStateChangeCounts) != JSON.stringify(this.props.message.byteStateChangeCounts))) {
            this.updateByteColors(message);
        }
    }

    updateByteColors(message) {
        const {maxByteStateChangeCount} = this.props;

        const byteColors = message.byteStateChangeCounts.map((count) =>
            Math.min(255, 75 + 180 * (count / maxByteStateChangeCount)) // TODO dynamic
        ).map((red) =>
            'rgb(' + Math.round(red) + ',0,0)'
        );
        console.log(byteColors)
        this.setState({byteColors});
    }

    componentWillMount() {
        this.updateByteColors(this.props.message);
    }

    render() {
        const {seekTime, message} = this.props;
        const {byteColors} = this.state;

        let mostRecentMsgIndex = message.entries.findIndex((e) =>
            e.relTime > seekTime) - 1;
        mostRecentMsgIndex = Math.max(0, mostRecentMsgIndex);
        const mostRecentMsg = message.entries[mostRecentMsgIndex];

        const msgSize = message.frame ? message.frame.size : 8;

        let byteOpacities;
        if(mostRecentMsg.byteStateChangeTimes.every((time) => time == message.entries[0].relTime)) {
            byteOpacities = Array(msgSize).fill(0.1);
        } else {
            byteOpacities = mostRecentMsg.byteStateChangeTimes.map((time) =>
                Math.max(0.1, Math.min(1, 1.1 - ((seekTime - time))))
            );
        }

        const bytes = byteOpacities.map((opacity, idx) =>
            <div key={idx} className={css(Styles.byte)}
                           style={{opacity, backgroundColor: byteColors[idx]}}>{idx + 1}</div>
        );

        return <div className={css(Styles.bytes)}>{bytes}</div>
    }
}

const Styles = StyleSheet.create({
    bytes: {
        display: 'flex',
        flexDirection: 'row'
    },
    byte: {
        width: 15,
        height: 15,
        border: '1px solid rgba(0,0,0,0.9)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    }
});