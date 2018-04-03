import React, { Component } from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import Measure from "react-measure";

export default class Modal extends Component {
  static propTypes = {
    variations: PropTypes.array,
    disableClose: PropTypes.bool,
    handleClose: PropTypes.func,
    handleSave: PropTypes.func,
    title: PropTypes.string,
    subtitle: PropTypes.string,
    navigation: PropTypes.node,
    actions: PropTypes.node,
    footer: PropTypes.node
  };

  constructor(props) {
    super(props);

    this.state = {
      windowHeight: {},
      modalHeight: {}
    };

    this.updateHeights = this.updateHeights.bind(this);
  }

  updateHeights(contentRect) {
    this.setState({ windowHeight: window.innerHeight });
    this.setState({ modalHeight: contentRect.bounds.height });
  }

  readVariationClasses() {
    if (this.props.variations) {
      const { variations } = this.props;
      const classes = variations.reduce(
        (classes, variation) => classes + `cabana-modal--${variation} `,
        ""
      );
      return classes;
    }
  }

  checkClosability() {
    return this.props.disableClose || false;
  }

  checkYScrollability() {
    return this.state.modalHeight > this.state.windowHeight;
  }

  render() {
    return (
      <div
        className={cx("cabana-modal", this.readVariationClasses(), {
          "cabana-modal--not-closable": this.checkClosability(),
          "cabana-modal--scrollable-y": this.checkYScrollability()
        })}
      >
        <Measure
          bounds
          onResize={contentRect => {
            this.updateHeights(contentRect);
          }}
        >
          {({ measureRef }) => (
            <div ref={measureRef} className="cabana-modal-container">
              <div
                className="cabana-modal-close-icon"
                onClick={this.props.handleClose}
              />
              <div className="cabana-modal-header">
                <h1>{this.props.title}</h1>
                <p>{this.props.subtitle}</p>
              </div>
              <div className="cabana-modal-navigation">
                {this.props.navigation}
              </div>
              <div className="cabana-modal-body">
                <div className="cabana-modal-body-window">
                  {this.props.children}
                </div>
                <div className="cabana-modal-body-gradient" />
              </div>
              <div className="cabana-modal-actions">{this.props.actions}</div>
              <div className="cabana-modal-footer">{this.props.footer}</div>
            </div>
          )}
        </Measure>
        <div
          className="cabana-modal-backdrop"
          onClick={this.props.handleClose}
        />
      </div>
    );
  }
}
