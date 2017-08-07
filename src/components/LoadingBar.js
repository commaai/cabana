import React, { Component } from 'react';
import { css, StyleSheet } from 'aphrodite/no-important';

const keyframes = {
    '0%': {
        transform: 'translateX(0)'
    },
    to: {
        transform: 'translateX(-400px)'
    }
};
const animationColor1 = 'RGBA(74, 242, 161, 1.00)';
const animationColor2 = 'RGBA(140, 169, 197, 1.00)';

const Styles = StyleSheet.create({
    loadingBar: {
        display: 'block',
        animationName: [keyframes],
        animationDuration: '2s',
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
        backgroundColor: animationColor1,
        backgroundImage: `linear-gradient(to right,
                                          ${animationColor2} 0,
                                          ${animationColor2} 50%,
                                          ${animationColor1} 50%,
                                          ${animationColor1} 100%)`,
        backgroundRepeat: 'repeat-x',
        backgroundSize: '25pc 25pc',
        width: '200%',
        position: 'fixed',
        top: 0,
        left: 0,
        height: 2
    }
});

export default class LoadingBar extends Component {
    render() {
        return (<div className={css(Styles.loadingBar)}></div>)
    }
}
