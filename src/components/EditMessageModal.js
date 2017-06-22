import React, { Component } from 'react';
import { css, StyleSheet } from 'aphrodite/no-important';
import PropTypes from 'prop-types';

import Modal from './Modal';
import Frame from '../models/can/frame';
import {copyOmittingKey} from '../utils/object';

export default class EditMessageModal extends Component {
    static propTypes = {
        onCancel: PropTypes.func.isRequired,
        onMessageFrameEdited: PropTypes.func.isRequired,
        message: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            messageFrame: props.message.frame.copy()
        }
        this.onContinue = this.onContinue.bind(this);
        this.editTransmitter = this.editTransmitter.bind(this);
        this.addTransmitter = this.addTransmitter.bind(this);
    }

    onContinue() {
        this.props.onMessageFrameEdited(this.state.messageFrame);
    }

    addTransmitter() {
      const {messageFrame} = this.state;
      console.log(messageFrame);
      messageFrame.addTransmitter();
      this.setState({messageFrame});
    }

    editTransmitter(transmitter) {
      return <div className={css(Styles.transmitterRow)}>
                <p key={transmitter}>{transmitter}</p>
                <p>Edit</p>
              </div>
    }

    render() {
        return (<Modal title={"Edit Message " + this.props.message.id}
                       continueEnabled={true}
                       onCancel={this.props.onCancel}
                       onContinue={this.onContinue}>

                    <div>
                        <div>
                            <p className={css(Styles.inputField)}>Name</p>
                            <input type="text"
                                   value={this.state.messageFrame.name}
                                   onChange={(e) => {
                                    const {messageFrame} = this.state;
                                    messageFrame.name = e.target.value;
                                    this.setState({messageFrame});
                                   }} />
                            <p className={css(Styles.inputField)}>Size</p>
                            <input type="number"
                                   className={css(Styles.inputSmall)}
                                   value={this.state.messageFrame.size}
                                   onChange={(e) => {
                                    const {messageFrame} = this.state;
                                    if(e.target.value > 8) {
                                      return;
                                    }
                                    messageFrame.size = parseInt(e.target.value);
                                    this.setState({messageFrame});
                                   }} />
                            <p className={css(Styles.inputField)}>Transmitters</p>
                            {this.state.messageFrame.transmitters.map(this.editTransmitter)}
                            <p className={css(Styles.addTransmitter)}
                               onClick={this.addTransmitter}>Add</p>
                        </div>
                    </div>
                </Modal>);
    }
}

const Styles = StyleSheet.create({
  inputField: {
    fontWeight: 'bold'
  },
  inputSmall: {
    width: 30
  },
  addTransmitter: {
    cursor: 'pointer'
  }
});