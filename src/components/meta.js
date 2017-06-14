import React, {Component} from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import PropTypes from 'prop-types';

import PartSelector from './PartSelector';
import LoadDbcModal from './LoadDbcModal';
import * as GithubAuth from '../api/github-auth';

export default class Meta extends Component {
    static propTypes = {
        onMessageSelected: PropTypes.func,
        dongleId: PropTypes.string,
        name: PropTypes.string,
        messages: PropTypes.objectOf(PropTypes.object),
        onPartChanged: PropTypes.func,
        partsCount: PropTypes.number,
        showLoadDbc: PropTypes.func,
        showSaveDbc: PropTypes.func,
        dbcFilename: PropTypes.string,
        dbcLastSaved: PropTypes.object // moment.js object
    };

    constructor(props) {
        super(props);
        const {dbcLastSaved} = props;
        this.state = {
            filterText: 'Filter',
            lastSaved: dbcLastSaved !== null ? this.props.dbcLastSaved.fromNow() : null
        };
        this.onFilterChanged = this.onFilterChanged.bind(this);
        this.onFilterFocus = this.onFilterFocus.bind(this);
        this.msgKeyFilter = this.msgKeyFilter.bind(this);
    }

    componentWillMount() {
        this.lastSavedTimer = setInterval(() => {
            if(this.props.dbcLastSaved !== null) {
                this.setState({lastSaved: this.props.dbcLastSaved.fromNow()})
            }
        }, 30000);
    }

    componentWillUnmount() {
        window.clearInterval(this.lastSavedTimer);
    }

    componentWillReceiveProps(nextProps) {
        if(nextProps.lastSaved !== this.props.lastSaved && typeof nextProps === 'object') {
            this.setState({lastSaved: nextProps.dbcLastSaved.fromNow()})
        }
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

    lastSavedPretty() {
        const {dbcLastSaved} = this.props;
        return dbcLastSaved.fromNow();
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
                    {GithubAuth.hasValidAccessToken() ?
                        <p>GitHub Authenticated</p>
                        :
                        <a href={GithubAuth.authorizeUrl()}
                           target="_blank">Log in with Github</a>
                    }
                </div>
                <div>
                    <p className={css(Styles.loadDbc)}
                       onClick={this.props.showLoadDbc}>Load DBC</p>
                    <p className={css(Styles.loadDbc)}
                       onClick={this.props.showSaveDbc}>Save DBC</p>
                    {this.props.dbcLastSaved !== null ?
                        <p>Last saved: {this.lastSavedPretty()}</p>
                        : null
                    }
                    {this.props.dbcFilename ? <p>Loaded: {this.props.dbcFilename}</p>: null}
                    <p></p>
                </div>
                <div>
                    <img src="http://www.westingrandcayman.com/wp-content/uploads/2017/01/westin-grand-cayman-cabana-luxury.jpg" height="133" />
                </div>
                <div className={css(Styles.routeMeta)}>
                    <p>{this.props.dongleId}</p>
                    <p>{this.props.name}</p>
                </div>
                <PartSelector
                    onPartChange={this.props.onPartChange}
                    partsCount={this.props.partsCount}
                />
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
        padding: 10,
        flex: 1,
        maxWidth: 420,
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
        marginTop: 5,
        fontSize: 14
    },
    messageList: {
        margin: 0,
        padding: 0
    },
    progressBar: {
        height: 30,
        width: '100%',
        borderColor: 'rgba(0,0,0,0.5)',
        border: 'solid 1px',
        marginBottom: 10
    },
    progressBarInner: {
        backgroundColor: 'rgba(0,0,0,0.9)'
    },
    loadDbc: {
        cursor: 'pointer',
        ':hover': {
            textDecoration: 'underline'
        }
    }
});
