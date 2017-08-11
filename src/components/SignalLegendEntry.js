// SignalLegendEntry.js

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import Signal from '../models/can/signal';
import DbcUtils from '../utils/dbc';
import {swapKeysAndValues} from '../utils/object';

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
        isExpanded: PropTypes.bool,
    };

    static unsignedTransformation = (field) => {
        return (value, signal) => {
            if(value !== '') {
                value = Number(value) || 0;

                if(value < 0) {
                    value = 0;
                }
            }
            signal[field] = value;
            return signal;
        };
    };

    static fields = [
        {
            field: 'name',
            title: 'Name',
            type: 'string',
        },
        {
            field: 'size',
            title: 'Size',
            type: 'number',
            transform: SignalLegendEntry.unsignedTransformation('size')
        },
        {
            field: 'startBit',
            title: (signal) => signal.isLittleEndian ? 'Least significant bit' : 'Most significant bit',
            type: 'number',
            transform: SignalLegendEntry.unsignedTransformation('startBit')
        },
        {
            field: 'isLittleEndian',
            title: 'Endianness',
            type: 'option',
            options: {
               options: ['Little', 'Big'],
               optionValues: {Little: true, Big: false}
            },
            transform: (isLittleEndian, signal) => {
                if(signal.isLittleEndian !== isLittleEndian) {
                    const {startBit} = signal;

                    if(isLittleEndian) {
                        // big endian -> little endian
                        const startByte = Math.floor(signal.startBit / 8),
                              endByte = Math.floor((signal.startBit - signal.size + 1) / 8);

                        if(startByte === endByte) {
                            signal.startBit = signal.startBit - signal.size + 1;
                        } else {
                            signal.startBit = DbcUtils.matrixBitNumber(startBit);
                        }
                    } else {
                        // little endian -> big endian
                        const startByte = Math.floor(signal.startBit / 8),
                              endByte = Math.floor((signal.startBit + signal.size - 1) / 8);

                        if(startByte === endByte) {
                            signal.startBit = signal.startBit + signal.size - 1;
                        } else {
                            signal.startBit = DbcUtils.bigEndianBitIndex(startBit);
                        }
                    }
                    signal.isLittleEndian = isLittleEndian;
                }
                return signal;
            }
        },
        {
            field: 'isSigned',
            title: 'Sign',
            type: 'option',
            options: {options: ['Signed', 'Unsigned'],
                      optionValues: {Signed: true, Unsigned: false}}
        },
        {
            field: 'factor',
            title: 'Factor',
            type: 'number'
        },
        {
            field: 'offset',
            title: 'Offset',
            type: 'number'
        },
        {
            field: 'unit',
            title: 'Unit',
            type: 'string'
        },
        {
            field: 'comment',
            title: 'Comment',
            type: 'string'
        },
        {
            field: 'min',
            title: 'Minimum value',
            type: 'number'
        },
        {
            field: 'max',
            title: 'Maximum value',
            type: 'number'
        }
    ];

    static fieldSpecForName = (name) => {
        return SignalLegendEntry.fields.find((field) =>
            field.field === name)
    };

    constructor(props) {
        super(props);
        this.state = {
            isExpanded: false,
            isEditing: false,
            signalEdited: Object.assign(Object.create(props.signal), props.signal),
            nameEdited: props.signal.name
        };

        this.toggleEditing = this.toggleEditing.bind(this);
        this.updateField = this.updateField.bind(this);
        this.toggleSignalPlot = this.toggleSignalPlot.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        if(!nextProps.signal.equals(this.props.signal)) {
            this.setState({signalEdited: Object.assign(Object.create(nextProps.signal),
                                                                     nextProps.signal)});
        }
    }

    renderField(field, title, valueCol, signal) {
        let titleStr;
        if(typeof title === 'function') {
            titleStr = title(signal);
        } else {
            titleStr = title;
        }

        return (
            <div key={field} className='form-field form-field--small'>
                <label htmlFor={`${signal.name}_${field}`}>{titleStr}</label>
                {valueCol}
            </div>
        )
    }

    updateField(fieldSpec, value) {
        let {signalEdited} = this.state;
        const {signal} = this.props;

        if(fieldSpec.transform) {
            signalEdited = fieldSpec.transform(value, signalEdited);
        } else {
            signalEdited[fieldSpec.field] = value;
        }


        // Save entire signal while editing
        this.setState({signalEdited});
        const signalCopy = Object.assign(Object.create(signal), signal);
        Object.entries(signalEdited).forEach(([field, value]) => {
            signalCopy[field] = value;
        });
        this.props.onSignalChange(signalCopy, signal);
    }

    renderNumberField(fieldSpec, signal) {
        const {field, title} = fieldSpec;
        let valueCol;

        if(this.state.isEditing) {
            let value = this.state.signalEdited[field];
            if(value !== '') {
                let num = Number(value);
                value = (isNaN(num) ? '' : num);
            }
            valueCol = (
                <input id={`${signal.name}_${field}`}
                        type="number"
                        value={value}
                        onChange={(e) => {this.updateField(fieldSpec, e.target.value)}
                }/>
            );
        } else {
            let value = this.props.signal[field];
            valueCol = <span>{value}</span>;
        }
        return this.renderField(field, title, valueCol, signal);
    }

    renderStringField(fieldSpec, signal) {
        const {field, title} = fieldSpec;
        let valueCol;
        if(this.state.isEditing) {
            valueCol = (
              <input id={`${signal.name}_${field}`}
                      type="text"
                      value={this.state.signalEdited[field] || ''}
                      onChange={(e) => {
                        this.updateField(fieldSpec, e.target.value)
                      }}
                />);
        } else {
            valueCol = <span>{this.props.signal[field]}</span>;
        }

        return this.renderField(field, title, valueCol, signal);
    }

    renderOptionField(fieldSpec, signal) {
        let valueCol;
        const {field, title} = fieldSpec;
        const {options, optionValues} = fieldSpec.options;
        let valueOptions = swapKeysAndValues(optionValues);

        if(this.state.isEditing) {
            const optionEles = options.map((opt) =>
                <option key={opt}
                        value={optionValues[opt]}>{opt}</option>
            );
            valueCol = (
                <select id={`${signal.name}_${field}`}
                        defaultValue={this.state.signalEdited[field]}
                        onChange={
                          (e) => { this.updateField(fieldSpec, e.target.value === "true") }
                        }>
                    {optionEles}
               </select>
            );
        } else {
            valueCol = <span>{valueOptions[this.props.signal[field]]}</span>;
        }

        return this.renderField(field, title, valueCol, signal);
    }

    renderFieldNode(field, signal) {
        if(field.type === 'number') {
            return this.renderNumberField(field, signal);
        } else if(field.type === 'option') {
            return this.renderOptionField(field, signal);
        } else if(field.type === 'string') {
            return this.renderStringField(field, signal);
        }
    }


    toggleEditing(e) {
        let {isEditing, signalEdited} = this.state;
        const {signal} = this.props;
        const signalCopy = Object.assign(Object.create(signal), signal);

        if(isEditing) {
            // Finished editing, save changes & reset intermediate
            // signalEdited state.
            Object.entries(signalEdited).forEach(([field, value]) => {
                const fieldSpec = SignalLegendEntry.fieldSpecForName(field);

                if(fieldSpec && fieldSpec.type === 'number' && isNaN(parseInt(value, 10))) {
                    value = 0;
                }

                signalCopy[field] = value;
            });
            this.props.onSignalChange(signalCopy, signal);
        }  else {
            signalEdited = signalCopy;
        }

        // Expand and enable signal editing
        isEditing = !isEditing;
        this.setState({
          isEditing,
          signalEdited
        })
        this.props.toggleExpandSignal(signal);
        e.stopPropagation();

    }

    renderSignalForm(signal) {
      return (
        <div className='signals-legend-entry-form'>
            {SignalLegendEntry.fields.map((field) => {
                return (
                    <div className='signals-legend-entry-form-field'
                         key={field.field}>
                        {this.renderFieldNode(field, signal)}
                    </div>
                )
            })}
            <div className='signals-legend-entry-form-remove'>
                <button className='button--tiny button--alpha'
                        onClick={ () => this.props.onSignalRemove(signal) }>Remove Signal</button>
            </div>
        </div>
      );
    }

    toggleSignalPlot(e) {
      const {signal, isPlotted} = this.props;
      e.preventDefault();
      this.props.onSignalPlotChange(!isPlotted, signal.uid);
    }

    render() {
        const {signal} = this.props;
        const expandedEntryClass = this.props.isExpanded ? 'is-expanded' : null;
        const highlightedEntryClass = this.props.isHighlighted ? 'is-highlighted' : null;
        const plottedButtonClass = this.props.isPlotted ? 'button' : 'button--alpha';
        const plottedButtonText = this.props.isPlotted ? 'Hide Plot' : 'Show Plot';
        return (
          <div
              className={cx('signals-legend-entry', expandedEntryClass, highlightedEntryClass)}
              onMouseEnter={() => this.props.onSignalHover(signal)}
              onMouseLeave={() => this.props.onSignalHoverEnd(signal)}>
              <div className='signals-legend-entry-color'
                    style={{backgroundColor: `rgb(${this.props.color}`}}></div>
              <div className="signals-legend-entry-header">
                <div
                    className="signals-legend-entry-header-name"
                    onClick={this.toggleEditing}>
                    <strong>{signal.name}</strong>
                </div>
                <div
                    className="signals-legend-entry-header-action"
                    onClick={this.toggleSignalPlot}>
                    <button className={cx('button--tiny', plottedButtonClass)}>
                        {plottedButtonText}
                    </button>
                </div>
              </div>
              <div className="signals-legend-entry-body">
                  {this.props.isExpanded ? this.renderSignalForm(signal) : null}
              </div>
          </div>
        );
    }
}
