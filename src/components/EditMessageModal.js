import React, { Component } from "react";
import PropTypes from "prop-types";

import Modal from "./Modals/baseModal";

export default class EditMessageModal extends Component {
  static propTypes = {
    handleClose: PropTypes.func.isRequired,
    handleSave: PropTypes.func.isRequired,
    message: PropTypes.object.isRequired
  };

  constructor(props) {
    super(props);

    this.state = {
      messageFrame: props.message.frame.copy()
    };
    this.handleSave = this.handleSave.bind(this);
    this.editTransmitter = this.editTransmitter.bind(this);
    this.addTransmitter = this.addTransmitter.bind(this);
    this.renderActions = this.renderActions.bind(this);
  }

  handleSave() {
    this.props.handleSave(this.state.messageFrame);
  }

  addTransmitter() {
    const { messageFrame } = this.state;
    messageFrame.addTransmitter();
    this.setState({ messageFrame });
  }

  editTransmitter(transmitter) {
    return;
  }

  renderActions() {
    return (
      <div>
        <button className="button--inverted" onClick={this.props.handleClose}>
          Cancel
        </button>
        <button className="button--primary" onClick={this.handleSave}>
          Save Message
        </button>
      </div>
    );
  }

  render() {
    return (
      <Modal
        title={`Edit Message: (${this.props.message.id})`}
        subtitle="Make changes and update defaults of this message"
        handleClose={this.props.handleClose}
        handleSave={this.handleSave}
        actions={this.renderActions()}
      >
        <div className="form-field">
          <label htmlFor="message_name">
            <span>Name</span>
            <sup>Customize the name of this message</sup>
          </label>
          <input
            type="text"
            id="message_name"
            value={this.state.messageFrame.name}
            onChange={e => {
              const { messageFrame } = this.state;
              messageFrame.name = e.target.value;
              this.setState({ messageFrame });
            }}
          />
        </div>
        <div className="form-field">
          <label htmlFor="message_size">
            <span>Size</span>
            <sup>Add a size parameter to this message</sup>
          </label>
          <input
            type="number"
            id="message_size"
            value={this.state.messageFrame.size}
            onChange={e => {
              const { messageFrame } = this.state;
              if (e.target.value > 8) {
                return;
              }
              messageFrame.size = parseInt(e.target.value, 10);
              this.setState({ messageFrame });
            }}
          />
        </div>
        <div className="form-field u-hidden">
          <label htmlFor="message_transmitters">
            <span>Transmitters</span>
            <sup>
              Add the physical ECU units that this message is coming from.
            </sup>
          </label>
          <div className="form-field-inset">
            <ul className="form-field-inset-list">
              {this.state.messageFrame.transmitters.map(transmitter => {
                return (
                  <li className="form-field-inset-list-item" key={transmitter}>
                    <div className="form-field-inset-list-item-title">
                      <span>{transmitter}</span>
                    </div>
                    <div className="form-field-inset-list-item-action">
                      <button className="button--tiny button--alpha">
                        Edit
                      </button>
                    </div>
                  </li>
                );
              })}
              <button className="button--tiny button--alpha">
                <span>
                  <i className="fa fa-plus" /> Add Transmitter
                </span>
              </button>
            </ul>
          </div>
        </div>
      </Modal>
    );
  }
}
