import React, {Component} from 'react';

import { StyleSheet, css } from 'aphrodite/no-important';

export default class NearestFrame extends Component {
    render() {
        return (<div className={css(Styles.root)}>
                </div>);
    }
}

const Styles = StyleSheet.create({
    root: {
        borderBottomWidth: '1px',
        borderColor: 'gray',
    }
});
