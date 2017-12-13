import React, { Component } from "react";
import PropTypes from "prop-types";

export default class DbcUpload extends Component {
  static propTypes = {
    onDbcLoaded: PropTypes.func
  };
  constructor(props) {
    super(props);
    this.state = {
      dbcText: ""
    };

    this.onTextChanged = this.onTextChanged.bind(this);
  }

  onTextChanged(e) {
    const dbcText = e.target.value;
    this.setState({ dbcText });
    this.props.onDbcLoaded("from paste", dbcText);
  }

  render() {
    return (
      <div className="cabana-dbc-upload-raw">
        <div className="form-field">
          <label htmlFor="raw_dbc_upload">
            <span>Raw DBC File:</span>
            <sup>Paste your DBC text output within this box</sup>
          </label>
          <textarea
            value={this.state.dbcText}
            id="raw_dbc_upload"
            className="t-mono"
            placeholder="PASTE DBC FILE HERE"
            onChange={this.onTextChanged}
          />
        </div>
      </div>
    );
  }
}
