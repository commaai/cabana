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
        dbcLastSaved: PropTypes.object, // moment.js object,
        showEditMessageModal: PropTypes.func
    };

    constructor(props) {
        super(props);
        const {dbcLastSaved} = props;
        this.state = {
            filterText: 'Filter',
            lastSaved: dbcLastSaved !== null ? this.props.dbcLastSaved.fromNow() : null,
            selectedMessages: [],
            hoveredMessages: []
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

        const nextMsgKeys = Object.keys(nextProps.messages);
        if(JSON.stringify(nextMsgKeys) != JSON.stringify(Object.keys(this.props.messages))) {
            let {selectedMessages} = this.state;
            selectedMessages = selectedMessages.filter((m) => nextMsgKeys.indexOf(m) !== -1);
            this.setState({selectedMessages, hoveredMessages: []});
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
        const msg = this.props.messages[key];
        const msgName = (msg.frame ? msg.frame.name : '');

        return (filterText == 'Filter'
                || filterText == ''
                || key.toLowerCase().indexOf(filterText.toLowerCase()) !== -1
                || msgName.toLowerCase().indexOf(filterText.toLowerCase()) !== -1);
    }

    lastSavedPretty() {
        const {dbcLastSaved} = this.props;
        return dbcLastSaved.fromNow();
    }

    onMessageHover(key) {
        let {hoveredMessages} = this.state;
        if(hoveredMessages.indexOf(key) !== -1) return;

        hoveredMessages.push(key);
        this.setState({hoveredMessages});
    }

    onMessageHoverEnd(key) {
        let {hoveredMessages} = this.state;
        hoveredMessages = hoveredMessages.filter((m) => m != key);
        this.setState({hoveredMessages});
    }

    onMsgEditClick(key) {
        this.props.showEditMessageModal(key);
    }

    onMsgRemoveClick(key) {
        let {selectedMessages} = this.state;
        selectedMessages = selectedMessages.filter((m) => m != key);
        this.setState({selectedMessages});
    }

    hoverButtons(key) {
        return ([<div className={css(Styles.hoverButton, Styles.editButton)}
                      onClick={() => this.onMsgEditClick(key)}>
                    <p>Edit</p>
                </div>,
                <div className={css(Styles.hoverButton, Styles.removeButton)}
                     onClick={() => this.onRemoveSelectedMsg(key)}>
                    <p>Remove</p>
                </div>]);
    }

    selectedMessagesList() {
        const {selectedMessages, hoveredMessages} = this.state;
        if(selectedMessages.length === 0) return null;

        const messages = selectedMessages
                            .sort()
                            .map((key) => {
                                const msg = this.props.messages[key];
                                return <li key={key}
                                        className={css(Styles.message,
                                                       Styles.selectedMessage)}
                                        onMouseEnter={() => this.onMessageHover(key)}
                                        onMouseLeave={() => this.onMessageHoverEnd(key)}>
                                        {msg.frame ? msg.frame.name : ''} ({key})
                                        {hoveredMessages.indexOf(key) !== -1 ? this.hoverButtons(key): null}
                                    </li>
                            });
        return (<div>
                    <p>Selected Messages</p>
                    <ul className={css(Styles.messageList)}>
                        {messages}
                    </ul>
                </div>);
    }

    onMessageSelected(key) {
        // uncomment when we support multiple messages
        // const selectedMessages = this.state.selectedMessages.filter((m) => m != key);
        const selectedMessages = [];
        selectedMessages.push(key);
        this.setState({selectedMessages});
        this.props.onMessageSelected(key);
    }

    availableMessagesList() {
        if(Object.keys(this.props.messages).length === 0) {
            return null;
        }

        return (<div>
                    <p>Available Messages</p>
                    <input type="text"
                           defaultValue="Filter"
                           value={this.state.filterText}
                           onFocus={this.onFilterFocus}
                           onChange={this.onFilterChanged} />
                    <ul className={css(Styles.messageList)}>
                        {Object.keys(this.props.messages)
                            .filter(this.msgKeyFilter)
                            .sort()
                            .map((key) => {
                                const msg = this.props.messages[key];
                                return <li onClick={() => {this.onMessageSelected(key)}}
                                        key={key}
                                        className={css(Styles.message)}>{msg.frame ? msg.frame.name : ''} ({key})</li>
                            })}
                    </ul>
                </div>);
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
                        &nbsp;/&nbsp;
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
                {this.selectedMessagesList()}
                {this.availableMessagesList()}
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
        fontSize: 14,
        display: 'flex',
        flexDirection: 'row'
    },
    messageList: {
        margin: 0,
        padding: 0
    },
    loadDbc: {
        cursor: 'pointer',
        ':hover': {
            textDecoration: 'underline'
        },
        display: 'inline'
    },
    hoverButton: {
        height: 15,
        padding: 8,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        display: 'flex',
        marginLeft: 15
    },
    editButton: {
        backgroundColor: 'RGBA(105, 69, 33, 1.00)',
        color: 'RGBA(251, 253, 242, 1.00)'
    },
    removeButton: {
        backgroundColor: 'RGBA(255, 34, 59, 0.83)',
        color: 'RGBA(251, 253, 242, 1.00)'
    }
});
