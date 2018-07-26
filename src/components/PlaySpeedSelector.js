import React, { Component } from "react";

export default class PlaySpeedSelector extends Component {
  constructor(props) {
    super(props);
    this.onChange = this.onChange.bind(this);
  }

  onChange(value) {
    if (this.props.onPlaySpeedChanged) {
      this.props.onPlaySpeedChanged(Number(value.currentTarget.value));
    }
  }

  render() {
    return (
      <div
        style={{
          display: "inline-block",
          float: "right",
          margin: 10
        }}
      >
        <label>Play speed:&nbsp;</label>
        <select
          id="playSpeed"
          style={{
            width: 70
          }}
          onChange={this.onChange}
          value={this.props.playSpeed}
        >
          <option value="0.1">0.1x</option>
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
          <option value="2">2x</option>
        </select>
      </div>
    );
  }
}
