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
        onSignalRemove: PropTypes.func
    };

    constructor(props) {
        super(props);
        this.state = {
            isExpanded: false,
            isEditing: false,
            signalFields: Object.assign(Object.create(props.signal), props.signal)
        };

        this.toggleEditing = this.toggleEditing.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        if(!nextProps.signal.equals(this.props.signal)) {
            this.setState({signalFields: Object.assign(Object.create(nextProps.signal),
                                                       nextProps.signal)});
        }
    }

    field(field, title, valueCol) {
        const value = this.props.signal[field];

        let titleCol = <td>{title}</td>;

        return <tr>{titleCol}<td>{valueCol}</td></tr>;
    }

    updateField(field, value) {
        const {signalFields} = this.state;
        signalFields[field] = value;
        this.setState({signalFields});
    }

    numberField(field, title) {
        let valueCol;
        if(this.state.isEditing) {
            valueCol = <input type="number"
                              value={this.state.signalFields[field] || 0}
                              onChange={(e) => {
                                this.updateField(field,
                                                 Number(e.target.value))
                              }}/>;
        } else {
            valueCol = <span>{this.props.signal[field]}</span>;
        }

        return this.field(field, title, valueCol);
    }

    stringField(field, title) {
        let valueCol;
        if(this.state.isEditing) {
            valueCol = <input type="text"
                              value={this.state.signalFields[field] || ''}
                              onChange={(e) => {
                                this.updateField(field, e.target.value)
                              }}
                        />;
        } else {
            valueCol = <span>{this.props.signal[field]}</span>;
        }

        return this.field(field, title, valueCol);
    }

    optionField(field, title, options, optionValues) {
        let valueCol;
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
                        defaultValue={this.state.signalFields[field]}
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
                    <td className={css(Styles.pointer)}
                        onClick={() => {this.props.onSignalRemove(signal)}}>Remove Signal</td>
                </tr>);
    }

    expandedSignal(signal) {
        return (<tr key={signal.name + '-expanded'}>
                    <td colSpan="3">
                        <table>
                            <tbody>
                                {this.numberField('size', 'Size')}
                                {this.numberField('startBit', 'Start bit')}
                                {this.optionField('isLittleEndian',
                                                  'Endianness',
                                                  ['Little', 'Big'],
                                                  {Little: true,
                                                   Big: false})}
                                {this.numberField('factor', 'Factor')}
                                {this.numberField('offset', 'Offset')}
                                {this.stringField('unit', 'Unit')}
                                {this.stringField('comment', 'Comment')}
                                {this.numberField('min', 'Minimum value')}
                                {this.numberField('max', 'Maximum value')}
                                {this.removeSignal(signal)}
                            </tbody>
                        </table>
                    </td>
                </tr>);
    }

    toggleEditing(e) {
        let {isEditing, isExpanded, signalFields} = this.state;
        const {signal} = this.props;
        const signalCopy = Object.assign(Object.create(signal), signal);

        if(isEditing) {
            // Finished editing, save changes & reset intermediate
            // signalFields state.
            Object.entries(signalFields).forEach(([field, value]) => {
                signalCopy[field] = value;
            });

            if(!signalCopy.equals(signal)) {
                signalFields = {};
                this.props.onSignalChange(signalCopy, signal);
            }
        } else {
            signalFields = signalCopy;
        }

        isEditing = !isEditing;
        this.setState({isExpanded: isEditing || isExpanded,
                       isEditing,
                       signalFields})
        e.stopPropagation();
    }


    render() {
        const {isExpanded, isEditing, signalFields} = this.state;
        const {signal, highlightedStyle} = this.props;
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
                                   value={signalFields['name']}
                                   onClick={(e) => e.stopPropagation()}
                                   onChange={(e) => {this.updateField('name',
                                                       e.target.value)}} />
                            : <span>{signal.name}</span>
                            }</td>
                        <td onClick={this.toggleEditing}
                            className={css(Styles.pointer)}>
                            {isEditing ? 'Save' : 'Edit'}
                        </td>
                    </tr>
                    {isExpanded ? this.expandedSignal(signal) : null}
                </tbody>);
    }
}

const Styles = StyleSheet.create({
    pointer: {cursor: 'pointer'}
});
