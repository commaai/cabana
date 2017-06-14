import React, {Component} from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import PropTypes from 'prop-types';

export default class DbcUpload extends Component {
    static propTypes = {
        onDbcLoaded: PropTypes.func
    };
    constructor(props) {
        super(props);
        this.state = {
            dbcText: ''
        };

        this.onTextChanged = this.onTextChanged.bind(this);
    }

    onTextChanged(e) {
        const dbcText = e.target.value;
        this.setState({dbcText})
        this.props.onDbcLoaded('from paste', dbcText);
    }

    render() {
        return (<div className={css(Styles.root)}>
                    <textarea value={this.state.dbcText}
                              placeholder={"paste DBC here"}
                              onChange={this.onTextChanged} />
                </div>);
    }
}

const Styles = StyleSheet.create({
    root: {

    }
});