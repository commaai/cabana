import React, {Component} from 'react';
import {StyleSheet, css} from 'aphrodite/no-important';

function createImageComponent(source, styles) {
    if(styles === undefined) {
        styles = []
    } else if(!Array.isArray(styles)) {
        styles = [styles];
    }

    return (props) => {
        if(Array.isArray(props.styles)) {
            styles = styles.concat(props.styles);
        }

        return <img src={source} className={css(...styles)} {...props}/>
    };
}

const Styles = StyleSheet.create({
    materialIcon: {
        width: 24,
        height: 24,
    },
    pointer: {
        cursor: 'pointer'
    }
});


const rightArrow = createImageComponent("/img/ic_arrow_right_black_24dp.png", Styles.materialIcon);
const downArrow = createImageComponent("/img/ic_arrow_drop_down_black_24dp.png", Styles.materialIcon)

const clear = createImageComponent("/img/ic_clear_black_24dp.png", [Styles.materialIcon, Styles.pointer]);
export default {rightArrow, downArrow, clear};