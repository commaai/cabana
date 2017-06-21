import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, css } from 'aphrodite/no-important';

import {hash} from '../utils/string';
import SignalLegend from './SignalLegend';
import Signal from '../models/can/signal';
import {shade} from '../utils/color';
import TableStyles from '../styles/table';
import {elementWiseEquals} from '../utils/array';
import DbcUtils from '../utils/dbc';

/*
AddSignals component draws an 8x8 matrix
representing the bytes in a CAN message, alongside
a signal legend. Dragging on the matrix
either extends or creates a signal, which is
configurable in the legend.
*/

export default class AddSignals extends Component {
    static propTypes = {
        message: PropTypes.object,
        onConfirmedSignalChange: PropTypes.func,
        onClose: PropTypes.func,
        messageIndex: PropTypes.number
    };

    constructor(props) {
        super(props);

        let signals = {};
        if(props.message && props.message.signals) {
            Object.assign(signals, props.message.signals);
        }

        this.state = {
            bits: [],
            signals: signals,
            signalStyles: this.calcSignalStyles(signals),
            highlightedSignal: null,
            dragStartBit: null,
            dragSignal: null,
            dragCurrentBit: null
        };

        this.updateSignalStyles = this.updateSignalStyles.bind(this);
        this.onSignalHover = this.onSignalHover.bind(this);
        this.onBitHover = this.onBitHover.bind(this);
        this.onSignalHoverEnd = this.onSignalHoverEnd.bind(this);
        this.onSignalChange = this.onSignalChange.bind(this);
        this.onSignalRemove = this.onSignalRemove.bind(this);
    }

    signalColorStyle(signal) {
        const signalNameHashHex = hash(signal.name);

        let colors = [255,255,255];
        const step = Math.ceil(signalNameHashHex.length/3);
        for(let i = 0; i < signalNameHashHex.length; i+= step) {
            colors[i / step] = ((step + signalNameHashHex.charCodeAt(i) << 5 * (i + 8))) % 255;
        }

        let colorRgbStr, backgroundColor;
        if(this.state && this.state.highlightedSignal === signal.name) {
            // when signal highlighted,
            // darkened background and lightened text.

            const darkenedColors = shade(colors, -0.5);
            const lightenedColors = shade(colors, 0.9);
            colorRgbStr = `rgb(${lightenedColors.join(",")})`;
            backgroundColor = `rgba(${darkenedColors.join(",")},0.5)`;
        } else {
            const colorsCommaSep = colors.join(",");
            colorRgbStr = `rgb(${colorsCommaSep})`;
            backgroundColor = `rgba(${colorsCommaSep},0.2)`;
        }


        const style = StyleSheet.create({signal: {color: colorRgbStr, backgroundColor}}).signal;
        return style;
    }

    updateSignalStyles() {
        const signalStyles = this.calcSignalStyles(this.state.signals);

        this.setState({signalStyles})
    }

    calcSignalStyles(signals) {
        const signalStyles = {};
        Object.values(signals).forEach((signal) => {
            signalStyles[signal.name] = this.signalColorStyle(signal);
        });

        return signalStyles;
    }

    componentWillReceiveProps({message}) {
        const isNewMessage = message.address != this.props.message.address;

        if(isNewMessage) {
            const signalStyles = this.updateSignalStyles(message.signals);
            const signals = {};
            Object.assign(signals, message.signals);
            this.setState({signals}, this.updateSignalStyles);
        }
    }

    signalForBit(bitIdx) {
        // bitIdx in [0,64)
        // returns instance of Signal

        return Object.values(this.state.signals).filter((signal) => {
            return signal.bitDescription(bitIdx) != null
        })[0];
    }

    onSignalHover(signal) {
        if(!signal) return;

        this.setState({highlightedSignal: signal.name}, this.updateSignalStyles);
    }

    signalBitIndex(bitIdx, signal)  {
        // todo does this work for both big and little endian?
        let {startBit} = signal;
        if(!signal.isLittleEndian) {
            startBit = DbcUtils.bigEndianBitIndex(startBit);
        }
        return bitIdx - startBit;
    }

    onBitHover(bitIdx, signal) {
        const {dragStartBit, signals, dragSignal} = this.state;

        if(dragStartBit !== null) {
            if(dragSignal !== null) {
                const newSize = (bitIdx - dragStartBit + 1)
                    + this.signalBitIndex(dragStartBit, dragSignal);

                if(newSize > 0) {
                    dragSignal.size = newSize;
                    signals[dragSignal.name] = dragSignal;
                    this.setState({signals, dragCurrentBit: bitIdx});
                }
            } else {
                this.setState({dragCurrentBit: bitIdx});
            }
        }
        if(signal) {
            this.onSignalHover(signal);
        }
    }

    onSignalHoverEnd(signal) {
        if(!signal) return;

        this.setState({highlightedSignal: null}, this.updateSignalStyles);
    }

    nextNewSignalName() {
        const existingNames = Object.keys(this.state.signals);
        let signalNum = 1, signalName;
        do {
            signalName = 'NEW_SIGNAL_' + signalNum;
            signalNum++;
        } while(existingNames.indexOf(signalName) !== -1);

        return signalName;
    }

    onBitMouseDown(dragStartBit, dragSignal) {
        this.setState({dragStartBit,
                       dragSignal: dragSignal || null})
    }

    createSignalAtBit(bitIdx, size) {
        const signal = new Signal({name: this.nextNewSignalName(),
                                   startBit: bitIdx,
                                   size: size,
                                   isLittleEndian: true});
        const {signals} = this.state;
        signals[signal.name] = signal;

        this.setState({signals}, this.propagateUpSignalChange);
    }


    onBitMouseUp(dragEndBit, signal) {
        if(this.state.dragStartBit !== null) {
            let {dragStartBit} = this.state;
            this.setState({dragStartBit: null,
                           dragSignal: null,
                           dragCurrentBit: null})

            if(dragEndBit === dragStartBit) {
                // one-bit signal requires double click
                // see onBitDoubleClick
                return;
            }
            if(dragEndBit < dragStartBit) {
                const start = dragStartBit;
                dragStartBit = dragEndBit;
                dragEndBit = start;
            }

            // check for overlapping bits
            for(let i = dragStartBit; i <= dragEndBit; i++) {
                if(this.signalForBit(i) !== undefined) {
                    // Don't create signal if a signal is already defined in the selected range.
                    return;
                }
            }

            this.createSignalAtBit(dragStartBit,
                                   dragEndBit - dragStartBit + 1);
        }
    }

    byteValueHex(byteIdx) {
        const {entries} = this.props.message;

        const entry = entries[this.props.messageIndex];

        return entry.hexData.substr(byteIdx * 2, 2);
    }

    bitValue(byteIdx, byteBitIdx) {
        const {entries} = this.props.message;

        const entry = entries[this.props.messageIndex];
        const data = Buffer.from(entry.hexData, 'hex');
        const byte = data.readInt8(byteIdx);

        return (byte >> byteBitIdx) & 1
    }

    bitIsContainedInSelection(bitIdx) {
        const {dragStartBit, dragCurrentBit} = this.state;

        return dragStartBit !== null && dragCurrentBit !== null
                 && bitIdx >= dragStartBit && bitIdx <= dragCurrentBit;
    }

    onBitDoubleClick(bitIdx, signal) {
        if(signal === undefined) {
            this.createSignalAtBit(bitIdx, 1);
        }
    }


    bitMatrix() {
        const {bits} = this.state;
        const rows = [];
        let rowCount;
        if(this.props.message.frame && this.props.message.frame.size) {
            rowCount = Math.floor((this.props.message.frame.size * 8) / 8);
        } else {
            rowCount = 8;
        }

        for(var i = 0; i < rowCount; i++) {
            const rowBits = [];
            for(var j = 7; j >= 0; j--) {
                const bitIdx = i * 8 + j;
                const signal = this.signalForBit(bitIdx);
                let bitStyle = null, bitSignificance = '';
                if(signal) {
                    bitStyle = this.state.signalStyles[signal.name] || null;
                    const bitDesc = signal.bitDescription(bitIdx);
                    bitSignificance = bitDesc.isMsb ? 'msb' : (bitDesc.isLsb ? 'lsb' : '');
                } else if(this.bitIsContainedInSelection(bitIdx)) {
                    bitStyle = Styles.bitSelectedStyle;
                }
                const className = css(Styles.bit, bitStyle);
                rowBits.push((<td key={j.toString()}
                                  className={className}
                                  onMouseEnter={() => this.onBitHover(bitIdx, signal)}
                                  onMouseLeave={() => this.onSignalHoverEnd(signal)}
                                  onMouseDown={this.onBitMouseDown.bind(this, bitIdx, signal)}
                                  onMouseUp={this.onBitMouseUp.bind(this, bitIdx, signal)}
                                  onDoubleClick={(() => this.onBitDoubleClick(bitIdx, signal))
                                  }
                                  ><span>
                                        {this.bitValue(i, j)}
                                    </span>
                                    <span className={css(Styles.bitSignificance)}>
                                        {bitSignificance}
                                    </span>
                                    </td>));
            }

            rowBits.push((<td key={'hex-repr'}
                           className={css(Styles.hex)}
                          >{this.byteValueHex(i)}</td>));
            rows.push((<tr key={i.toString()}>{rowBits}</tr>));
        }

        return (<table className={css(TableStyles.noSpacing, Styles.bitMatrix)}
                       cellSpacing={0}>
                    <tbody>
                    {rows}
                    </tbody>
                </table>);
    }

    onSignalChange(signal, oldSignal) {
        const {signals} = this.state;
        if(oldSignal.name !== signal.name) {
            // name change, erase the old signal
            delete signals[oldSignal.name];
        }
        signals[signal.name] = signal;

        this.setState({signals}, this.propagateUpSignalChange);
    }

    onSignalRemove(signal) {
        const {signals} = this.state;
        delete signals[signal.name];
        this.setState({signals}, this.propagateUpSignalChange);
    }

    propagateUpSignalChange() {
        const {signals} = this.state;
        const newMessage = {};

        Object.assign(newMessage, this.props.message);
        newMessage.signals = signals;

        this.props.onConfirmedSignalChange(newMessage);
    }

    render() {
        return (<div className={css(Styles.root)}>
                    {Object.keys(this.state.signals).length === 0 ?
                        <p>Drag to add a signal</p> : null
                    }
                    <p>time: {this.props.message.entries[this.props.messageIndex].relTime.toFixed(3)}</p>
                    {this.bitMatrix()}
                    <SignalLegend
                        signals={this.state.signals}
                        signalStyles={this.state.signalStyles}
                        highlightedSignal={this.state.highlightedSignal}
                        onSignalHover={this.onSignalHover}
                        onSignalHoverEnd={this.onSignalHoverEnd}
                        onSignalChange={this.onSignalChange}
                        onSignalRemove={this.onSignalRemove} />
                </div>);
    }
}

const Styles = StyleSheet.create({
    root: {
        borderBottom: '1px solid #000'
    },
    pointer: {
        cursor: 'pointer'
    },
    bitMatrix: {
        fontFamily: 'monospace',
        fontSize: 16,
    },
    bit: {
        margin: 0,
        padding: 12,
        userSelect: 'none',
        cursor: 'pointer',
        textAlign: 'center',
        position: 'relative'
    },
    bitSelectedStyle: {
        backgroundColor: 'rgba(0,119,158,0.5)'
    },
    bitSignificance: {
        fontSize: 12,
        display: 'block',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        margin: '0 auto'
    },
    highlightedSignalTitle: {
        backgroundColor: 'rgba(0,0,0,0.2)'
    },
    hex: {

    }
});
