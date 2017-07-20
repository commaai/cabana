import React, {Component} from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import cx from 'classnames';
import PropTypes from 'prop-types';
import Clipboard from 'clipboard';

import {modifyQueryParameters} from '../utils/url';
import LoadDbcModal from './LoadDbcModal';
import * as GithubAuth from '../api/github-auth';
import Images from '../styles/images';
import MessageBytes from './MessageBytes';
import {GITHUB_AUTH_TOKEN_KEY} from '../config';

export default class Meta extends Component {
    static propTypes = {
        onMessageSelected: PropTypes.func,
        onMessageUnselected: PropTypes.func,
        dongleId: PropTypes.string,
        name: PropTypes.string,
        messages: PropTypes.objectOf(PropTypes.object),
        selectedMessages: PropTypes.array,
        onPartChanged: PropTypes.func,
        partsCount: PropTypes.number,
        showLoadDbc: PropTypes.func,
        showSaveDbc: PropTypes.func,
        dbcFilename: PropTypes.string,
        dbcLastSaved: PropTypes.object, // moment.js object,
        showEditMessageModal: PropTypes.func,
        route: PropTypes.object,
        partsLoaded: PropTypes.number,
        currentParts: PropTypes.array,
        seekTime: PropTypes.number,
        loginWithGithub: PropTypes.element,
        isDemo: PropTypes.bool,
    };

    constructor(props) {
        super(props);
        const {dbcLastSaved} = props;
        this.state = {
            filterText: 'Filter',
            lastSaved: dbcLastSaved !== null ? this.props.dbcLastSaved.fromNow() : null,
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
            let {selectedMessages} = this.props;
            selectedMessages = selectedMessages.filter((m) => nextMsgKeys.indexOf(m) !== -1);
            this.setState({hoveredMessages: []});
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

    onMsgRemoveClick(key) {
        let {selectedMessages} = this.state;
        selectedMessages = selectedMessages.filter((m) => m != key);
        this.props.onMessageUnselected(key);
        this.setState({selectedMessages});
    }

    onMessageSelected(key) {
        // uncomment when we support multiple messages
        // const selectedMessages = this.state.selectedMessages.filter((m) => m != key);
        const selectedMessages = [];
        selectedMessages.push(key);
        this.props.updateSelectedMessages(selectedMessages);
        this.props.onMessageSelected(key);
    }

    orderedMessages() {
        const {messages} = this.props;
        const keys = Object.keys(messages)
                           .filter(this.msgKeyFilter)
                           .sort((key1, key2) => {
                               const msg1 = messages[key1], msg2 = messages[key2];
                               if(msg1.entries.length < msg2.entries.length) {
                                   return 1;
                               } else if(msg1.entries.length === msg2.entries.length) {
                                   return 0;
                               } else {
                                   return -1;
                               }
                           });

        let bins = [];
        keys.forEach((key, idx) => {
            const msg = messages[key];
            let bin = bins.find((bin) =>
                bin.some((binMsg) =>
                    Math.abs(binMsg.entries.length - msg.entries.length) < 100
                )
            );
            if(bin) {
                bin.push(msg);
            } else {
                bins.push([msg]);
            }
        });
        bins = bins.map((bin) => bin.sort((msg1, msg2) => {
                if(msg1.address < msg2.address) {
                    return -1;
                } else {
                    return 1;
                }
            })
        );

        return bins.reduce((arr, bin) => arr.concat(bin), []);
    }

    selectedMessageClass(messageId) {
      return (this.props.selectedMessages.includes(messageId) ? 'is-selected' : null);
    }

    renderAvailableMessagesList() {
        if(Object.keys(this.props.messages).length === 0) {
            return <p>Loading messages...</p>;
        }
        return (
            <table cellPadding='5'>
                <thead>
                    <tr>
                        <td>Name</td>
                        <td>ID</td>
                        <td>Count</td>
                        <td>Bytes</td>
                    </tr>
                </thead>
                <tbody>
                    {this.orderedMessages()
                        .map((msg) => {
                            return (
                                <tr onClick={() => {this.onMessageSelected(msg.id)}}
                                    key={msg.id}
                                    className={cx('cabana-meta-messages-list-item', this.selectedMessageClass(msg.id))}>
                                        <td>{msg.frame ? msg.frame.name : 'undefined'}</td>
                                        <td>{msg.id}</td>
                                        <td>{msg.entries.length}</td>
                                        <td>
                                            <MessageBytes
                                                message={msg}
                                                seekTime={this.props.seekTime}
                                                maxByteStateChangeCount={this.props.maxByteStateChangeCount} />
                                        </td>
                                    </tr>
                            )
                        })}
                    </tbody>
            </table>
        );
    }

    timeWindow() {
        const {route, currentParts} = this.props;
        if(route) {
            const partStartOffset = currentParts[0] * 60,
                  partEndOffset = (currentParts[1] + 1) * 60;

            const windowStartTime = Moment(route.start_time).add(partStartOffset, 's').format('HH:mm:ss');
            const windowEndTime = Moment(route.start_time).add(partEndOffset, 's').format('HH:mm:ss');

            return `${windowStartTime} - ${windowEndTime}`;
        } else return '';
    }

    shareUrl() {
        const add = {max: this.props.route.proclog, url: this.props.route.url};
        const remove = [GITHUB_AUTH_TOKEN_KEY]; // don't share github access
        const shareUrl = modifyQueryParameters({add, remove})

        return shareUrl;
    }
    render() {
        return (
            <div className='cabana-meta'>
                <div className='cabana-meta-header'>
                    <span className='cabana-meta-header-label'>Currently editing:</span>
                    <strong className='cabana-meta-header-filename'>{this.props.dbcFilename}</strong>
                    {this.props.dbcLastSaved !== null ?
                        <div className='cabana-meta-header-last-saved'>
                            <p>Last saved: {this.lastSavedPretty()}</p>
                        </div>
                        : null
                    }
                    <div className='cabana-meta-header-actions'>
                        <div className='cabana-meta-header-action'>
                            <button onClick={this.props.showLoadDbc}>Load DBC</button>
                        </div>
                        <div className='cabana-meta-header-action'
                             data-clipboard-text={this.shareUrl()}
                             data-clipboard-action='copy'
                             ref={(ref) => ref ? new Clipboard(ref) : null}>
                            <a className='button'
                               href={this.shareUrl()}
                               onClick={(e) => e.preventDefault()}>Copy Share Link</a>
                        </div>
                        <div className='cabana-meta-header-action'>
                            <button onClick={this.props.showSaveDbc}>Save DBC</button>
                        </div>
                    </div>
                </div>
                <div className='cabana-meta-messages'>
                    <div className='cabana-meta-messages-header'>
                      <p>Available messages</p>
                    </div>
                    <div className='cabana-meta-messages-window'>
                      <div className='cabana-meta-messages-filter'>
                          <div className='form-field form-field--small'>
                            <input type="text"
                                   value={this.state.filterText}
                                   onFocus={this.onFilterFocus}
                                   onBlur={this.onFilterUnfocus}
                                   onChange={this.onFilterChanged} />
                          </div>
                       </div>
                       <div className='cabana-meta-messages-list'>
                           {this.renderAvailableMessagesList()}
                       </div>
                    </div>
                </div>
            </div>
        );
    }
}

