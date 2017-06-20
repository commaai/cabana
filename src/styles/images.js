import React, {Component} from 'react';
import {StyleSheet, css} from 'aphrodite/no-important';

function createImageComponent(source, style) {
    return (props) => <img src={source} className={css(style)} {...props}/>;
}

const Styles = StyleSheet.create({
    arrow: {
        width: 24,
        height: 24,
    }
});


const rightArrow = createImageComponent("/img/ic_arrow_right_black_24dp.png", Styles.arrow);
const downArrow = createImageComponent("/img/ic_arrow_drop_down_black_24dp.png", Styles.arrow)
export default {rightArrow, downArrow};