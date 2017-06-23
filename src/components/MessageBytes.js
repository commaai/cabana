import React, {Component} from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import PropTypes from 'prop-types';

export default class MessageBytes extends Component {
    static propTypes = {
        seekTime: PropTypes.number.isRequired,
        message: PropTypes.object.isRequired
    };

    render() {
        const {seekTime, message} = this.props;
        let mostRecentMsgIndex = message.entries.findIndex((e) =>
            e.relTime > seekTime) - 1;
        mostRecentMsgIndex = Math.max(0, mostRecentMsgIndex);
        const mostRecentMsg = message.entries[mostRecentMsgIndex];

        const msgSize = message.frame ? message.frame.size : 8;

        const byteOpacities = mostRecentMsg.byteStateChangeTimes.map((time) =>
            Math.max(0.1, Math.min(1, 1.1 - ((seekTime - time) / 30)))
        );

        const bytes = byteOpacities.map((opacity, idx) =>
            <div key={idx} className={css(Styles.byte)} style={{opacity}}></div>
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
        backgroundColor: 'red'
    }
});