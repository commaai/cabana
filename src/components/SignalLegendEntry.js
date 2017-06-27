// SignalLegendEntry.js

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, css } from 'aphrodite/no-important';

import Signal from '../models/can/signal';
import TableStyles from '../styles/table';
import {swapKeysAndValues} from '../utils/object';

export default class SignalLegendEntry extends Component {
    static propTypes = {
        isHighlighted: PropTypes.bool,
        highlightedStyle: PropTypes.object,
        signal: PropTypes.instanceOf(Signal).isRequired,
        onSignalHover: PropTypes.func,
        onSignalHoverEnd: PropTypes.func,
        onSignalChange: PropTypes.func,
        onSignalRemove: PropTypes.func,
        onSignalPlotChange: PropTypes.func,
        isPlotted: PropTypes.bool
    };

    static fields = [
        {field: 'size', title: 'Size', type: 'number', options: {unsigned: true}},
        {field: 'startBit', title: 'Start bit', type: 'number', options: {unsigned: true}},
        {field: 'isLittleEndian',
         title: 'Endianness',
         type: 'option',
         options: {
            options: ['Little', 'Big'],
            optionValues: {Little: true, Big: false}
         }},
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

    constructor(props) {
        super(props);
        this.state = {
            isExpanded: false,
            isEditing: false,
            signalEdited: Object.assign(Object.create(props.signal), props.signal)
        };

        this.toggleEditing = this.toggleEditing.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        if(!nextProps.signal.equals(this.props.signal)) {
            this.setState({signalEdited: Object.assign(Object.create(nextProps.signal),
                                                                     nextProps.signal)});
        }
    }

    field(field, title, valueCol) {
        const value = this.props.signal[field];

        let titleCol = <td>{title}</td>;

        return <tr key={field}>{titleCol}<td>{valueCol}</td></tr>;
    }

    updateField(field, value) {
        const {signalEdited} = this.state;
        signalEdited[field] = value;
        this.setState({signalEdited});
    }

    numberField({field, title, options}) {
        let valueCol;

        if(this.state.isEditing) {
            let value = this.state.signalEdited[field];
            if(value !== '') {
                let num = Number(value);
                value = (isNaN(num) ? '' : num);
            }

            valueCol = <input type="number"
                              value={value}
                              onChange={(e) => {
                                let {value} = e.target;

                                if(value !== '') {
                                    value = Number(e.target.value) || 0;

                                    if(options && options.unsigned && value < 0) {
                                        value = 0;
                                    }
                                }

                                this.updateField(field, value);
                              }}/>;
        } else {
            let value = this.props.signal[field];
            valueCol = <span>{value}</span>;
        }
        return this.field(field, title, valueCol);
    }

    stringField({field, title}) {
        let valueCol;
        if(this.state.isEditing) {
            valueCol = <input type="text"
                              value={this.state.signalEdited[field] || ''}
                              onChange={(e) => {
                                this.updateField(field, e.target.value)
                              }}
                        />;
        } else {
            valueCol = <span>{this.props.signal[field]}</span>;
        }

        return this.field(field, title, valueCol);
    }

    optionField(fieldSpec) {
        let valueCol;
        const {field, title} = fieldSpec;
        const {options, optionValues} = fieldSpec.options;
        let valueOptions = swapKeysAndValues(optionValues);

        if(this.state.isEditing) {
            const optionEles = options.map((opt) =>
                {
                    const val = optionValues[opt];
                    return <option key={opt}
                            value={optionValues[opt]}>{opt}</option>
                }
            );
            valueCol = <select
                        defaultValue={this.state.signalEdited[field]}
                        onChange={(e) => {
                        this.updateField(field, e.target.value === "true")
                    }}>
                    {optionEles}
                   </select>;
        } else {
            valueCol = <span>{valueOptions[this.props.signal[field]]}</span>;
        }

        return this.field(field, title, valueCol);
    }

    removeSignal(signal) {
        return (<tr>
                    <td className={css(Styles.pointer, Styles.removeSignal)}
                        onClick={() => {this.props.onSignalRemove(signal)}}>Remove Signal</td>
                </tr>);
    }

    titleForField(field, signal) {
        if(field.field === 'startBit') {
            return signal.isLittleEndian ? 'Least significant bit' : 'Most significant bit';
        } else {
            return field.title;
        }
    }

    fieldNode(field, signal) {
        field.title = this.titleForField(field, signal);
        if(field.type === 'number') {
            return this.numberField(field);
        } else if(field.type === 'option') {
            return this.optionField(field);
        } else if(field.type === 'string') {
            return this.stringField(field);
        }
    }

    expandedSignal(signal) {
        const startBitTitle = signal.isLittleEndian ? 'Least significant bit' : 'Most significant bit';

        return (<tr key={signal.name + '-expanded'}>
                    <td colSpan="3">
                        <table>
                            <tbody>
                                {SignalLegendEntry.fields.map((field) => this.fieldNode(field, signal))}
                                {this.removeSignal(signal)}
                            </tbody>
                        </table>
                    </td>
                </tr>);
    }

    toggleEditing(e) {
        let {isEditing, isExpanded, signalEdited} = this.state;
        const {signal} = this.props;
        const signalCopy = Object.assign(Object.create(signal), signal);

        if(isEditing) {
            // Finished editing, save changes & reset intermediate
            // signalEdited state.
            Object.entries(signalEdited).forEach(([field, value]) => {
                const fieldSpec = SignalLegendEntry.fields.find((fieldSpec) =>
                    fieldSpec.field === field);

                if(fieldSpec && fieldSpec.type === 'number' && isNaN(parseInt(value))) {
                    value = 0;
                }

                signalCopy[field] = value;
            });

            if(!signalCopy.equals(signal)) {
                this.props.onSignalChange(signalCopy, signal);
            }
        } else {
            signalEdited = signalCopy;
        }

        isEditing = !isEditing;
        this.setState({isExpanded: isEditing || isExpanded,
                       isEditing,
                       signalEdited})
        e.stopPropagation();
    }

    render() {
        const {isExpanded, isEditing, signalEdited} = this.state;
        const {signal, highlightedStyle, plottedSignals, isPlotted} = this.props;
        return (<tbody>
                    <tr
                        onClick={() => {this.setState({isExpanded: !isExpanded})}}
                        className={css(Styles.pointer, highlightedStyle)}
                        onMouseEnter={() => this.props.onSignalHover(signal)}
                        onMouseLeave={() => this.props.onSignalHoverEnd(signal)}
                        >
                        <td>{isExpanded ? '\u2193' : '\u2192'}</td>
                        <td>{isEditing ?
                            <input type="text"
                                   value={signalEdited['name']}
                                   onClick={(e) => e.stopPropagation()}
                                   onChange={(e) => {this.updateField('name',
                                                       e.target.value)}} />
                            : <span>{signal.name}</span>
                            }</td>
                        <td onClick={this.toggleEditing}
                            className={css(Styles.pointer)}>
                            {isEditing ? 'Save' : 'Edit'}
                        </td>
                        <td>
                            <span>Plot: </span>
                            <input type="checkbox"
                                   checked={isPlotted}
                                   onChange={(e) => {
                                     this.props.onSignalPlotChange(e.target.checked, signal.name)
                                   }}
                            />
                        </td>
                    </tr>
                    {isExpanded ? this.expandedSignal(signal) : null}
                </tbody>);
    }
}

const Styles = StyleSheet.create({
    pointer: {cursor: 'pointer'},
    removeSignal: {
        ':hover': {
            textDecoration: 'underline'
        },
    }
});
