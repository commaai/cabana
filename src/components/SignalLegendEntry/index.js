// SignalLegendEntry.js

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import Signal from '../../models/can/signal';
import SignalForm from './SignalForm';
import FIELDS from './FIELDS';

export default class SignalLegendEntry extends Component {
  static propTypes = {
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

  static fieldSpecForName = (name) => FIELDS.find((field) => field.field === name);

  constructor(props) {
    super(props);
    this.state = {
      fieldError: null,
      signalEdited: Object.assign(Object.create(props.signal), props.signal)
    };
  }

  componentDidUpdate(prevProps) {
    if (!this.props.signal.equals(prevProps.signal)) {
      this.setState({
        fieldError: null,
        signalEdited: Object.assign(
          Object.create(this.props.signal),
          this.props.signal
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

    const updated = this.props.onSignalChange(signalCopy);
    this.setState({ fieldError: !updated ? fieldSpec.field : null });
  };

  toggleEditing = (e) => {
    let { signalEdited } = this.state;
    const { signal, isExpanded } = this.props;
    const signalCopy = Object.assign(Object.create(signal), signal);

    if (isExpanded) {
      // Finished editing, save changes & reset intermediate
      // signalEdited state.
      Object.entries(signalEdited).forEach(([field, value]) => {
        const fieldSpec = SignalLegendEntry.fieldSpecForName(field);

        if (
          fieldSpec
          && fieldSpec.type === 'number'
          && isNaN(parseInt(value, 10))
        ) {
          value = 0;
        }

        signalCopy[field] = value;
      });
      this.props.onSignalChange(signalCopy);
    } else {
      signalEdited = signalCopy;
    }

    // Expand and enable signal editing
    this.setState({
      fieldError: null,
      signalEdited,
    });
    this.props.toggleExpandSignal(signal);
    e.stopPropagation();
  };

  toggleSignalPlot = (e) => {
    const { signal, isPlotted } = this.props;
    e.preventDefault();
    this.props.onSignalPlotChange(!isPlotted, signal.uid);
  };

  getSignalEdited = (field) => this.state.signalEdited[field];

  render() {
    const {
      signal, isHighlighted, color, isPlotted, isExpanded
    } = this.props;
    const expandedEntryClass = isExpanded ? 'is-expanded' : null;
    const plottedButtonClass = isPlotted ? 'button' : 'button--alpha';
    const colorBarStyle = {
      opacity: isHighlighted ? 0.5 : 0.3,
      backgroundColor: color ? `rgb(${color.join(',')})` : null,
    };
    return (
      <div
        className={cx('signals-legend-entry', expandedEntryClass)}
        onMouseEnter={() => this.props.onSignalHover(signal)}
        onMouseLeave={() => this.props.onSignalHoverEnd(signal)}
      >
        <div className="signals-legend-entry-colorbar" style={ colorBarStyle } />
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
            <button className={cx('button--tiny', plottedButtonClass)}>
              {isPlotted ? 'Hide Plot' : 'Show Plot'}
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
              fieldError={this.state.fieldError}
              update={this.updateField}
            />
          )}
        </div>
      </div>
    );
  }
}
