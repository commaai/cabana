import React, {Component} from 'react';

import { StyleSheet, css } from 'aphrodite/no-important';
import PropTypes from 'prop-types';

export default class Meta extends Component {
    static propTypes = {
        onMessageSelected: PropTypes.func,
        url: PropTypes.string,
        messages: PropTypes.objectOf(PropTypes.object)
    };

    constructor(props) {
        super(props);
        this.state = {
            filterText: 'Filter'
        };
        this.onFilterChanged = this.onFilterChanged.bind(this);
        this.onFilterFocus = this.onFilterFocus.bind(this);
        this.msgKeyFilter = this.msgKeyFilter.bind(this);
    }

    onFilterChanged(e) {
        this.setState({filterText: e.target.value})
    }

    onFilterFocus(e) {
        if(this.state.filterText == 'Filter') {
            this.setState({filterText: ''})
        }
    }

    msgKeyFilter(key) {
        const {filterText} = this.state;
        const msgName = this.props.messages[key].name || '';

        return (filterText == 'Filter'
                || filterText == ''
                || key.toLowerCase().indexOf(filterText.toLowerCase()) !== -1
                || msgName.toLowerCase().indexOf(filterText.toLowerCase()) !== -1);
    }

    render() {
        return (
            <div className={css(Styles.root)}>
                <div>
                    <span className={css(Styles.titleText)}>
                        comma cabana
                    </span>
                </div>
                <div>
                    <img src="http://www.westingrandcayman.com/wp-content/uploads/2017/01/westin-grand-cayman-cabana-luxury.jpg" height="133" />
                </div>
                <div className={css(Styles.routeMeta)}>
                    <p>{this.props.url.match(/comma-([a-zA-Z0-9]+)/)[1]}</p>
                    <p>{this.props.url.match(/_(.+)/)[1]}</p>
                </div>
                <div>
                    <input type="text"
                           defaultValue="Filter"
                           value={this.state.filterText}
                           onFocus={this.onFilterFocus}
                           onChange={this.onFilterChanged} />
                    <ul className={css(Styles.messageList)}>
                        {Object.keys(this.props.messages)
                            .filter(this.msgKeyFilter)
                            .sort()
                            .map((key) => (
                                <li onClick={() => {this.props.onMessageSelected(key)}}
                                    key={key}
                                    className={css(Styles.message)}>{this.props.messages[key].name} ({key})</li>
                            ))}
                    </ul>
                </div>
            </div>
        );
    }
}

const Styles = StyleSheet.create({
    root: {
        maxWidth: 225,
        padding: 10,
        flex: 1,
        borderColor: 'gray',
        borderRight: 'solid',
        borderRightWidth: 2,
    },
    titleText: {
        fontFamily: 'monospace',
        paddingRight: 10,
        fontSize: 24
    },
    routeMeta: {
        borderBottomWidth: '1px',
        borderColor: 'grey',
        '*': {
            display: 'inline-block'
        }
    },
    message: {
        cursor: 'pointer',
        ':hover' : {
            backgroundColor: 'rgba(0,0,0,0.1)'
        },
        marginTop: 5
    },
    messageList: {
        margin: 0,
        padding: 0
    },
});
