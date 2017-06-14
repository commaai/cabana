const UINT64 = require('cuint').UINT64

import Bitarray from '../bitarray';

import Signal from './signal';
import Frame from './frame';
import DbcUtils from '../../utils/dbc';

const BO_RE = /^BO\_ (\w+) (\w+) *: (\w+) (\w+)/
// normal signal
const SG_RE = /^SG\_ (\w+) : (\d+)\|(\d+)@(\d+)([\+|\-]) \(([0-9.+\-eE]+),([0-9.+\-eE]+)\) \[([0-9.+\-eE]+)\|([0-9.+\-eE]+)\] \"(.*)\" (.*)/
// Multiplexed signal
const SGM_RE = /^SG\_ (\w+) (\w+) *: (\d+)\|(\d+)@(\d+)([\+|\-]) \(([0-9.+\-eE]+),([0-9.+\-eE]+)\) \[([0-9.+\-eE]+)\|([0-9.+\-eE]+)\] \"(.*)\" (.*)/

function floatOrInt(numericStr) {
    if(Number.isInteger(numericStr)) {
        return parseInt(numericStr);
    } else {
        return parseFloat(numericStr);
    }
}

export function swapOrder(arr, wordSize, gSize) {
    const swappedWords = [];

    for(let i = 0; i < arr.length; i += wordSize) {
        const word = arr.slice(i, i + wordSize);
        for(let j = wordSize - gSize; j > -gSize; j -= gSize) {
            swappedWords.push(word.slice(j, j + gSize));
        }
    }

    return swappedWords.join("");
}

export default class DBC {
    constructor(dbcString) {
        this.dbcText = dbcString;
        this.importDbcString(dbcString);
    }

    nextNewFrameName() {
        const messageNames = [];

        for(let msg of this.messages.values()) {
            messageNames.push(msg.name);
        }

        let msgNum = 1, msgName;
        do {
            msgName = 'NEW_MSG_' + msgNum;
            msgNum++;
        } while(messageNames.indexOf(msgName) !== -1);

        return msgName;
    }

    text() {
        // Strips non-message/signal lines from dbcText,
        // then appends parsed messages to bottom.
        // When fully spec compliant DBC parser is written,
        // this functionality will be removed.
        const parts = [];
        for(let [msgId, frame] of this.messages.entries()) {
            parts.push(frame.text());
        }

        return parts.join("\n");
    }

    getMessageName(msgId) {
        const msg = this.messages.get(msgId);
        if(msg) return msg.name;
        return null;
    }

    getSignals(msgId) {
        const msg = this.messages.get(msgId);
        if(msg) return msg.signals;
        return null;
    }

    setSignals(msgId, signals) {
        const msg = this.messages.get(msgId);
        if(msg) {
            msg.signals = signals;
            this.messages.set(msgId, msg);
        } else {
            const msg = new Frame({name: this.nextNewFrameName(),
                                   id: msgId,
                                   size: 8});
            msg.signals = signals;
            this.messages.set(msgId, msg);
        }
    }

    addSignal(msgId, signal) {
        const msg = this.messages.get(msgId);
        if(msg) {
            msg.signals.push(signal);
        }
    }

    importDbcString(dbcString) {
        const messages = new Map();
        let id = 0;

        dbcString.split('\n').forEach((line, idx) => {
            line = line.trim();

            if(line.indexOf("BO_") === 0) {
                let matches = line.match(BO_RE)
                if (matches === null) {
                    console.log('Bad BO', line)
                    return
                }
                let [idString, name, size, transmitter] = matches.slice(1);
                id = parseInt(idString, 0); // 0 radix parses hex or dec
                const frame = new Frame({name, id, size, transmitter})
                messages.set(id, frame);

            } else if(line.indexOf("SG_") === 0) {
                let matches = line.match(SG_RE);

                if(matches === null) {
                    matches = line.match(SGM_RE);
                    if(matches === null) {
                        return;
                    }
                    // for now, ignore multiplex which is matches[1]
                    matches = matches[1] + matches.slice(3);
                } else {
                    matches = matches.slice(1)
                }

                let [name, startBit, size, isLittleEndian, isSigned,
                       factor, offset, min, max, unit, receiverStr] = matches;
                startBit = parseInt(startBit);
                size = parseInt(size);
                isLittleEndian = parseInt(isLittleEndian) === 1
                isSigned = isSigned === '-'
                factor = floatOrInt(factor);
                offset = floatOrInt(offset);
                min = floatOrInt(min);
                max = floatOrInt(max);
                const receiver = receiverStr.split(",");

                const signalProperties= {name, startBit, size, isLittleEndian,
                                         isSigned, factor, offset, unit, min, max,
                                         receiver};
                const signal = new Signal(signalProperties);

                messages.get(id).signals[name] = signal;
            }
        });

        this.messages = messages;
    }

    valueForInt64Signal(signalSpec, hexData) {
        const blen = hexData.length * 4;
        let value, startBit, dataBitPos;

        if (signalSpec.isLittleEndian) {
            value = UINT64(swapOrder(hexData, 16, 2), 16);
            startBit = signalSpec.startBit;
            dataBitPos = UINT64.fromNumber(startBit);
        } else {
            // big endian
            value = UINT64(hexData, 16);

            startBit = DbcUtils.bigEndianBitIndex(signalSpec.startBit);
            dataBitPos = UINT64(blen - (startBit + signalSpec.size));
        }
        if(dataBitPos < 0) {
            return null;
        }

        let rightHandAnd = UINT64((1 << signalSpec.size) - 1);
        let ival = (value.shiftr(dataBitPos)).and(rightHandAnd).toNumber();

        if(signalSpec.isSigned && (ival & (1<<(signalSpec.size - 1)))) {
            ival -= 1<<signalSpec.size
        }
        ival = (ival * signalSpec.factor) + signalSpec.offset;
        return ival;
    }

    valueForInt32Signal(signalSpec, bits, bitsSwapped) {
        let value, startBit, dataBitPos, bitArr;

        if (signalSpec.isLittleEndian) {
            bitArr = bitsSwapped;
            startBit = signalSpec.startBit;
        } else {
            bitArr = bits;
            startBit = DbcUtils.bigEndianBitIndex(signalSpec.startBit);
        }
        let ival = Bitarray.extract(bitArr, startBit, signalSpec.size);

        if(signalSpec.isSigned && (ival & (1<<(signalSpec.size - 1)))) {
            ival -= 1<<signalSpec.size
        }
        ival = (ival * signalSpec.factor) + signalSpec.offset;
        return ival;
    }

    getSignalValues(messageId, data) {
        const buffer = Buffer.from(data);

        const hexData = buffer.toString('hex');
        const bufferSwapped = Buffer.from(buffer).swap64();

        const bits = Bitarray.fromBytes(data);
        const bitsSwapped = Bitarray.fromBytes(bufferSwapped);

        if(!this.messages.has(messageId)) {
            return {};
        }
        const {signals} = this.messages.get(messageId);

        const signalValuesByName = {};
        Object.values(signals).forEach((signalSpec) => {
            let value;
            if(signalSpec.size > 32) {
                value = this.valueForInt64Signal(signalSpec, hexData);
            } else {
                value = this.valueForInt32Signal(signalSpec, bits, bitsSwapped);
            }
            signalValuesByName[signalSpec.name] = value;
        });

        return signalValuesByName;
    }
}
