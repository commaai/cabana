import React, {Component} from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import PropTypes from 'prop-types';
import Moment from 'moment';

import PartSelector from './PartSelector';
import LoadDbcModal from './LoadDbcModal';
import * as GithubAuth from '../api/github-auth';
import Images from '../styles/images';
import MessageBytes from './MessageBytes';

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
        showEditMessageModal: PropTypes.func,
        route: PropTypes.object,
        partsLoaded: PropTypes.array,
        seekTime: PropTypes.number
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
        this.onFilterUnfocus = this.onFilterUnfocus.bind(this);
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
        let val = e.target.value;
        if(val.trim() === 'Filter') val = '';

        this.setState({filterText: val})
    }

    onFilterFocus(e) {
        if(this.state.filterText.trim() == 'Filter') {
            this.setState({filterText: ''})
        }
    }

    onFilterUnfocus(e) {
        if(this.state.filterText.trim() == '') {
            this.setState({filterText: 'Filter'})
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
        return ([<div key={"edit"}
                      className={css(Styles.hoverButton, Styles.editButton)}
                      onClick={() => this.onMsgEditClick(key)}>
                    <p>Edit</p>
                </div>,
                <div key={"remove"}
                     className={css(Styles.hoverButton, Styles.removeButton)}
                     onClick={() => this.onMsgRemoveClick(key)}>
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
                                        {msg.frame ? msg.frame.name : ''} ({key}) {msg.entries.length}
                                        {hoveredMessages.indexOf(key) !== -1 ? this.hoverButtons(key): null}
                                    </li>
                            });
        return (<div className={css(Styles.messagesList)}>
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

        const defaultTextVisible = this.state.filterText.trim() === 'Filter';

        return (<div className={css(Styles.messagesList)}>
                    <p>Available Messages</p>
                    <div className={css(Styles.filter)}>
                        <input type="text"
                               value={this.state.filterText}
                               onFocus={this.onFilterFocus}
                               onBlur={this.onFilterUnfocus}
                               onChange={this.onFilterChanged}
                               className={css(defaultTextVisible ? Styles.defaultFilterText: null)}
                               />
                        {this.state.filterText.trim().length > 0 && this.state.filterText !== 'Filter' ?
                        <Images.clear onClick={() => this.setState({filterText: 'Filter'})} />
                        : null}
                    </div>
                    <table className={css(Styles.messageTable)}>
                        <tbody>
                            {Object.keys(this.props.messages)
                                .filter(this.msgKeyFilter)
                                .sort((key1, key2) => {
                                    const msg1 = this.props.messages[key1], msg2 = this.props.messages[key2];
                                    if(msg1.entries.length < msg2.entries.length) {
                                        return 1;
                                    } else if(msg1.entries.length === msg2.entries.length) {
                                        return 0;
                                    } else {
                                        return -1;
                                    }
                                })
                                .map((key) => {
                                    const msg = this.props.messages[key];
                                    return <tr onClick={() => {this.onMessageSelected(key)}}
                                            key={key}
                                            className={css(Styles.message)}>
                                                <td>{msg.frame ? msg.frame.name : ''}</td>
                                                <td>{key}</td>
                                                <td>{msg.entries.length}</td>
                                                <td>
                                                    <MessageBytes
                                                        message={msg}
                                                        seekTime={this.props.seekTime}
                                                        maxByteStateChangeCount={this.props.maxByteStateChangeCount} />
                                                </td>
                                            </tr>
                                })}
                            </tbody>
                    </table>
                </div>);
    }

    timeWindow() {
        const {route, partsLoaded} = this.props;
        if(route) {
            const partStartOffset = partsLoaded[0] * 60,
                  partEndOffset = partsLoaded[1] * 60;

            const routeStartTime = Moment(route.start_time);

            const windowStartTime = routeStartTime.add(partStartOffset, 's').format('HH:mm:ss');
            const windowEndTime = routeStartTime.add(partEndOffset, 's').format('HH:mm:ss');

            return `${windowStartTime} - ${windowEndTime}`;
        } else return '';
    }

    render() {
        return (
            <div className={css(Styles.root)}>
                <div className={css(Styles.scrollContainer)}>
                    <div>
                        <span className={css(Styles.titleText)}>
                            comma cabana
                        </span>
                    </div>
                    <div>
                        <img src="http://www.westingrandcayman.com/wp-content/uploads/2017/01/westin-grand-cayman-cabana-luxury.jpg" height="133" />
                    </div>
                    <div>
                        {GithubAuth.hasValidAccessToken() ?
                            <p className={css(Styles.githubAuth)}>GitHub Authenticated</p>
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
                        {this.props.dbcFilename ? <p>Editing: {this.props.dbcFilename}</p>: null}
                        <p></p>
                    </div>
                    <div>
                        <p className={css(Styles.timeWindow)}>{this.timeWindow()}</p>
                    </div>
                    <PartSelector
                        onPartChange={this.props.onPartChange}
                        partsCount={this.props.partsCount}
                    />
                    {this.selectedMessagesList()}
                    {this.availableMessagesList()}
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
        backgroundColor: 'rgb(246,246,246)',
        height: '100%',
    },
    scrollContainer: {
        display: 'block',
        height: '100%',
        overflowY: 'scroll',
        overflowX: 'hidden',
    },
    githubAuth: {
        marginTop: 10,
        marginBottom: 10
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
        fontSize: 12,
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
        display: 'inline',
        fontWeight: 'bold'
    },
    timeWindow: {
        marginTop: 10,
        marginBottom: 10,
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
    },
    defaultFilterText: {
        color: 'rgb(205,205,205)'
    },
    filter: {
        display: 'flex',
        flexDirection: 'row',
        height: 24
    },
    messagesList: {
        marginTop: 10
    }
});
