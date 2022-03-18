import React, { Component } from 'react';

export default class Field extends Component {
  render() {
    const { title, htmlFor, children, valid } = this.props;
    const errorCls = valid === false ? ' form-field-error' : '';
    return (
      <div className={ `form-field form-field--small${errorCls}` }>
        <label htmlFor={htmlFor}>{title}</label>
        {children}
      </div>
    );
  }
}
