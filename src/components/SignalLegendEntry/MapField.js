import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Field from './Field';

export default class MapField extends Component {
  static propTypes = {
    fieldSpec: PropTypes.any,
    signal: PropTypes.any,
    isExpanded: PropTypes.any,
    signalEdited: PropTypes.any,
    updateField: PropTypes.any,
    valid: PropTypes.any,
  };

  constructor(props) {
    super(props);

    this.state = {
      valid: true,
      mapString: '',
    };

    this.onChange = this.onChange.bind(this);
  }

  componentDidMount() {
    this.componentDidUpdate({}, {});
  }

  componentDidUpdate(prevProps) {
    if (prevProps.isExpanded !== this.props.isExpanded) {
      const entryPairs = Array.from(this.props.signalEdited.entries());
      const mapString = entryPairs.reduce((str, [value, desc]) => `${str + value} "${desc}" `, '').trim();
      this.setState({ mapString });
    }
  }

  onChange(ev) {
    const mapString = ev.target.value;
    this.setState({ mapString });

    if ((mapString.split('"').length - 1) % 2 !== 0) {
      this.setState({ valid: false });
      return;
    }
    let splitted = Array.from(mapString.matchAll(/[^\s"]+|"([^"]*)"/g));
    if (splitted.length % 2 !== 0) {
      this.setState({ valid: false });
      return;
    }

    splitted = splitted.map(([match, group]) => group || match);
    const res = new Map();
    for (let i = 0; i < splitted.length; i += 2) {
      res.set(splitted[i], splitted[i+1]);
    }

    this.setState({ valid: true });
    this.props.updateField(this.props.fieldSpec, res);
  }

  render() {
    const { fieldSpec, signal, isExpanded } = this.props;

    const htmlFor = `${signal.name}_${fieldSpec.field}`;
    let valueCol;

    if (isExpanded) {
      valueCol = <input id={htmlFor} type="text" value={this.state.mapString} onChange={this.onChange} />;
    } else {
      valueCol = <span>{signal[fieldSpec.field]}</span>;
    }

    return (
      <Field title={typeof fieldSpec.title === 'function' ? fieldSpec.title(signal) : fieldSpec.title}
        htmlFor={htmlFor} valid={this.props.valid && this.state.valid}>
        {valueCol}
      </Field>
    );
  }
}
