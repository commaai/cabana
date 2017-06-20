import React, { Component } from 'react';
import { css, StyleSheet } from 'aphrodite/no-important';
import PropTypes from 'prop-types';

import Modal from './Modal';
import Frame from '../models/can/frame';
import {copyOmittingKey} from '../utils/object';

export default class EditMessageModal extends Component {
    static propTypes = {
        onCancel: PropTypes.func.isRequired,
        onMessageEdited: PropTypes.func.isRequired,
        messageFrame: PropTypes.instanceOf(Frame).isRequired
    };

    constructor(props) {
        super(props);

        this.state = {
            messageFrame: Object.assign(Object.create(props.messageFrame), props.messageFrame)
        }
        this.onContinue = this.onContinue.bind(this);
    }

    onContinue() {
        this.props.onMessageEdited(this.state.messageFrame);
    }

    render() {
        return (<Modal title={"Edit Message " + this.state.messageFrame.id}
                       continueEnabled={true}
                       onCancel={this.props.onCancel}
                       onContinue={this.onContinue}>
                    <div>
                        <div>
                            <p>Name</p>
                            <input type="text"
                                   value={this.state.messageFrame.name}
                                   onChange={(e) => {
                                    const {messageFrame} = this.state;
                                    messageFrame.name = e.target.value;
                                    this.setState({messageFrame});
                                   }} />
                            <p>Size</p>
                            <input type="number"
                                   value={this.state.messageFrame.size}
                                   onChange={(e) => {
                                    const {messageFrame} = this.state;
                                    messageFrame.size = parseInt(e.target.value);
                                    this.setState({messageFrame});
                                   }} />
                        </div>
                    </div>
                </Modal>);
    }
}