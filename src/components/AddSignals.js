import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { StyleSheet } from 'aphrodite/no-important';
import css from '../utils/css';

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
        messageIndex: PropTypes.number,
        onSignalPlotChange: PropTypes.func,
        plottedSignals: PropTypes.array
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
        this.onTentativeSignalChange = this.onTentativeSignalChange.bind(this);
        this.onSignalChange = this.onSignalChange.bind(this);
        this.onSignalRemove = this.onSignalRemove.bind(this);
        this.onSignalPlotChange = this.onSignalPlotChange.bind(this);
        this.resetDragState = this.resetDragState.bind(this);
    }

    signalColorStyle(signal) {
        const colors = signal.colors();

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
        let {dragStartBit, signals, dragSignal} = this.state;

        if(dragStartBit !== null) {
            if(dragSignal !== null) {
                if(dragStartBit === dragSignal.startBit && dragSignal.size > 1) {
                    if(!dragSignal.isLittleEndian) {
                        // should not be able to drag the msb past the lsb
                        const startBigEndian = DbcUtils.bigEndianBitIndex(dragStartBit);
                        const hoveredBigEndian = DbcUtils.bigEndianBitIndex(bitIdx);

                        const lsbBigEndian = dragSignal.lsbBitNumber();
                        if(hoveredBigEndian > lsbBigEndian) {
                            return;
                        }
                    } else {
                        // should not be able to drag the lsb past the msb
                        if(bitIdx > dragSignal.msbBitIndex()) {
                            return;
                        }
                    }

                    const diff = bitIdx - dragStartBit;

                    if(dragSignal.isLittleEndian) {
                        dragSignal.size -= diff;
                    } else if(dragSignal.bitDescription(bitIdx) === null) {
                        dragSignal.size += Math.abs(diff);
                    } else {
                        dragSignal.size -= Math.abs(diff);
                    }

                    dragSignal.startBit += diff;

                    signals[dragSignal.name] = dragSignal;
                    dragStartBit = dragSignal.startBit;
                } else if(dragSignal.size === 1) {
                    // 1-bit signals can be dragged in either direction
                    if(Math.floor(bitIdx / 8) === Math.floor(dragStartBit / 8))  {
                        if(bitIdx > dragStartBit) {
                            if(dragSignal.isLittleEndian) {
                                dragSignal.size = bitIdx - dragSignal.startBit;
                            } else {
                                dragSignal.startBit = bitIdx;
                                dragSignal.size = bitIdx - dragStartBit + 1;
                                dragStartBit = bitIdx;
                            }
                        } else {
                            if(dragSignal.isLittleEndian) {
                                dragSignal.startBit = bitIdx;
                                dragSignal.size = dragStartBit - bitIdx + 1;
                                dragStartBit = bitIdx;
                            } else {
                                dragSignal.size = dragStartBit - bitIdx + 1;
                                dragStartBit = bitIdx;
                            }
                        }
                    }
                } else if(dragSignal.isLittleEndian && dragStartBit === dragSignal.msbBitIndex()) {
                    if(bitIdx < dragSignal.startBit) {
                        // should not be able to drag the MSB past the LSB
                        return;
                    }
                    const diff = bitIdx - dragStartBit;
                    if(dragSignal.bitDescription(bitIdx) === null) {
                        dragSignal.size += Math.abs(diff);
                    } else {
                        dragSignal.size -= Math.abs(diff);
                    }
                    signals[dragSignal.name] = dragSignal;
                    dragStartBit = dragSignal.msbBitIndex();
                } else if(!dragSignal.isLittleEndian && dragStartBit === dragSignal.lsbBitIndex()) {
                    const diff = bitIdx - dragStartBit;
                    if(dragSignal.bitDescription(bitIdx) === null) {
                        dragSignal.size += Math.abs(diff);
                    } else {
                        dragSignal.size -= Math.abs(diff);
                    }
                    signals[dragSignal.name] = dragSignal;
                    dragStartBit = dragSignal.lsbBitIndex();
                }
                this.setState({signals, dragCurrentBit: bitIdx, dragStartBit});
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

    createSignal({startBit, size, isLittleEndian}) {
        const signal = new Signal({name: this.nextNewSignalName(),
                                   startBit,
                                   size: size,
                                   isLittleEndian});
        const {signals} = this.state;
        signals[signal.name] = signal;

        this.setState({signals}, this.propagateUpSignalChange);
    }

    createSignalIfNotExtendingOne(dragStartBit, dragEndBit) {
        if(this.state.dragSignal === null) {
            // check for overlapping bits
            for(let i = dragStartBit; i <= dragEndBit; i++) {
                if(this.signalForBit(i) !== undefined) {
                    // Don't create signal if a signal is already defined in the selected range.
                    return;
                }
            }
            const isDragAcrossSingleByte = Math.floor(dragEndBit / 8) === Math.floor(dragStartBit / 8);
            const isDragDirectionUp = !isDragAcrossSingleByte && dragEndBit < dragStartBit;

            let isLittleEndian;
            if(isDragAcrossSingleByte || !isDragDirectionUp) {
                isLittleEndian = (dragStartBit % 8 < 4);
            } else {
                isLittleEndian = (dragStartBit % 8 >= 4);
            }
            let size, startBit = dragStartBit;

            if(isDragAcrossSingleByte){
                size = Math.abs(dragEndBit - dragStartBit) + 1;
            } else {
                if(isLittleEndian) {
                    if(dragEndBit > dragStartBit) {
                        startBit = dragStartBit;
                        size = dragEndBit - dragStartBit + 1;
                    } else {
                        startBit = dragEndBit;
                        size = dragStartBit - dragEndBit + 1;
                    }
                } else {
                    if(dragEndBit < dragStartBit) {
                        startBit = dragEndBit;
                    }
                    size = Math.abs(DbcUtils.bigEndianBitIndex(dragEndBit) - DbcUtils.bigEndianBitIndex(dragStartBit)) + 1;
                }
            }

            this.createSignal({startBit, size, isLittleEndian});
        }
    }
    onBitMouseUp(dragEndBit, signal) {
        if(this.state.dragStartBit !== null) {
            let {dragStartBit} = this.state;

            if(dragEndBit !== dragStartBit) {
                // one-bit signal requires double click
                // see onBitDoubleClick
                this.createSignalIfNotExtendingOne(dragStartBit, dragEndBit);
            }
            this.propagateUpSignalChange();
            this.resetDragState();
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

    bitIsContainedInSelection(bitIdx, isLittleEndian = false) {
        const {dragStartBit, dragCurrentBit} = this.state;

        if(isLittleEndian || (dragStartBit % 8 < 4)) {
            return dragStartBit !== null && dragCurrentBit !== null
                     && bitIdx >= dragStartBit && bitIdx <= dragCurrentBit;
        } else {
            const bigEndianStartBit = DbcUtils.bigEndianBitIndex(dragStartBit);
            const bigEndianCurrentBit = DbcUtils.bigEndianBitIndex(dragCurrentBit);
            const bigEndianBitIdx = DbcUtils.bigEndianBitIndex(bitIdx);
            return dragStartBit !== null && dragCurrentBit !== null
                    && bigEndianBitIdx >= bigEndianStartBit && bigEndianBitIdx <= bigEndianCurrentBit;
        }
    }

    onBitDoubleClick(startBit, signal) {
        if(signal === undefined) {
            this.createSignal({startBit, size: 1, isLittleEndian: false});
        }
    }

    renderBitMatrix() {
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
                const className = css('bit', Styles.bit, bitStyle);
                rowBits.push((<td key={j.toString()}
                                  className={className}
                                  onMouseEnter={() => this.onBitHover(bitIdx, signal)}
                                  onMouseLeave={() => this.onSignalHoverEnd(signal)}
                                  onMouseDown={this.onBitMouseDown.bind(this, bitIdx, signal)}
                                  onMouseUp={this.onBitMouseUp.bind(this, bitIdx, signal)}
                                  onDoubleClick={(() => this.onBitDoubleClick(bitIdx, signal))}
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

        return (
          <div className="cabana-explorer-signals-matrix">
            <table
              cellSpacing={0}
              onMouseLeave={this.resetDragState}>
              <tbody>
                {rows}
              </tbody>
            </table>

          </div>
        );
    }

    resetDragState() {
        this.setState({dragStartBit: null,
                       dragSignal: null,
                       dragCurrentBit: null})
    }

    onTentativeSignalChange(signal) {
        // Tentative signal changes are not propagated up
        // but their effects are displayed in the bitmatrix
        const {signals} = this.state;
        signals[signal.name] = signal;
        this.setState({signals});
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

    onSignalPlotChange(shouldPlot, signalName) {
        const {message} = this.props;

        this.props.onSignalPlotChange(shouldPlot, message.id, signalName)
    }

    render() {
        return (
          <div className='cabana-explorer-signals-controller'>
            {Object.keys(this.state.signals).length === 0 ?
                <p>Double click or drag to add a signal</p> : null
            }
            <div className="cabana-explorer-signals-time">
              <p>time: {this.props.message.entries[this.props.messageIndex].relTime.toFixed(3)}</p>
            </div>
            {this.renderBitMatrix()}
            <SignalLegend
                signals={this.state.signals}
                signalStyles={this.state.signalStyles}
                highlightedSignal={this.state.highlightedSignal}
                onSignalHover={this.onSignalHover}
                onSignalHoverEnd={this.onSignalHoverEnd}
                onTentativeSignalChange={this.onTentativeSignalChange}
                onSignalChange={this.onSignalChange}
                onSignalRemove={this.onSignalRemove}
                onSignalPlotChange={this.onSignalPlotChange}
                plottedSignals={this.props.plottedSignals}
                 />
           </div>
         );
    }
}

const Styles = StyleSheet.create({
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
