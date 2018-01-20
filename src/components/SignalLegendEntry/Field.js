import React, { Component } from "react";

export default class Field extends Component {
  render() {
    const { title, htmlFor, children } = this.props;
    return (
      <div className="form-field form-field--small">
        <label htmlFor={htmlFor}>{title}</label>
        {children}
      </div>
    );
  }
}
