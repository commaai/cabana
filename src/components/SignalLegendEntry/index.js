// SignalLegendEntry.js

import React, { Component } from "react";
import PropTypes from "prop-types";
import cx from "classnames";

import Signal from "../../models/can/signal";
import SignalForm from "./SignalForm";
import ColorBar from "./ColorBar";
import FIELDS from "./FIELDS";

export default class SignalLegendEntry extends Component {
  static propTypes = {
    isLogEvent: PropTypes.bool,
    signal: PropTypes.instanceOf(Signal).isRequired,
    isHighlighted: PropTypes.bool,
    onSignalHover: PropTypes.func,
    onSignalHoverEnd: PropTypes.func,
    onTentativeSignalChange: PropTypes.func,
    onSignalChange: PropTypes.func,
    onSignalRemove: PropTypes.func,
    onSignalPlotChange: PropTypes.func,
    toggleExpandSignal: PropTypes.func,
    isPlotted: PropTypes.bool,
    isExpanded: PropTypes.bool
  };

  static fieldSpecForName = name => {
    return FIELDS.find(field => field.field === name);
  };

  constructor(props) {
    super(props);
    this.state = {
      signalEdited: Object.assign(Object.create(props.signal), props.signal)
    };
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.signal.equals(this.props.signal)) {
      this.setState({
        signalEdited: Object.assign(
          Object.create(nextProps.signal),
          nextProps.signal
        )
      });
    }
  }

  updateField = (fieldSpec, value) => {
    let { signalEdited } = this.state;
    const { signal } = this.props;

    if (fieldSpec.transform) {
      signalEdited = fieldSpec.transform(value, signalEdited);
    } else {
      signalEdited[fieldSpec.field] = value;
    }

    // Save entire signal while editing
    this.setState({ signalEdited });
    const signalCopy = Object.assign(Object.create(signal), signal);
    Object.entries(signalEdited).forEach(([field, value]) => {
      signalCopy[field] = value;
    });
    this.props.onSignalChange(signalCopy, signal);
  };

  toggleEditing = e => {
    if (this.props.isLogEvent) {
      return;
    }
    let { signalEdited } = this.state;
    const { signal, isExpanded } = this.props;
    const signalCopy = Object.assign(Object.create(signal), signal);

    if (isExpanded) {
      // Finished editing, save changes & reset intermediate
      // signalEdited state.
      Object.entries(signalEdited).forEach(([field, value]) => {
        const fieldSpec = SignalLegendEntry.fieldSpecForName(field);

        if (
          fieldSpec &&
          fieldSpec.type === "number" &&
          isNaN(parseInt(value, 10))
        ) {
          value = 0;
        }

        signalCopy[field] = value;
      });
      this.props.onSignalChange(signalCopy, signal);
    } else {
      signalEdited = signalCopy;
    }

    // Expand and enable signal editing
    this.setState({
      signalEdited
    });
    this.props.toggleExpandSignal(signal);
    e.stopPropagation();
  };

  toggleSignalPlot = e => {
    const { signal, isPlotted } = this.props;
    e.preventDefault();
    this.props.onSignalPlotChange(!isPlotted, signal.uid);
  };

  getSignalEdited = field => {
    return this.state.signalEdited[field];
  };
  render() {
    const { signal, isHighlighted, color, isPlotted, isExpanded } = this.props;
    const expandedEntryClass = isExpanded ? "is-expanded" : null;
    const plottedButtonClass = isPlotted ? "button" : "button--alpha";
    return (
      <div
        className={cx("signals-legend-entry", expandedEntryClass)}
        onMouseEnter={() => this.props.onSignalHover(signal)}
        onMouseLeave={() => this.props.onSignalHoverEnd(signal)}
      >
        <ColorBar isHighlighted={isHighlighted} rgb={color} />
        <div className="signals-legend-entry-header">
          <div
            className="signals-legend-entry-header-name"
            onClick={this.toggleEditing}
          >
            <strong>{signal.name}</strong>
          </div>
          <div
            className="signals-legend-entry-header-action"
            onClick={this.toggleSignalPlot}
          >
            <button className={cx("button--tiny", plottedButtonClass)}>
              {isPlotted ? "Hide Plot" : "Show Plot"}
            </button>
          </div>
        </div>
        <div className="signals-legend-entry-body">
          {isExpanded && (
            <SignalForm
              signal={signal}
              onSignalRemove={this.props.onSignalRemove}
              isExpanded={isExpanded}
              getSignalEdited={this.getSignalEdited}
              update={this.updateField}
            />
          )}
        </div>
      </div>
    );
  }
}
