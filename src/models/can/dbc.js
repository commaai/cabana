const Uint64BE = require('int64-buffer').Uint64BE
const UINT64 = require('cuint').UINT64
import Signal from './signal';

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
        this.importDbcString(dbcString);
        this.bits = [];
        for(let i = 0; i < 64; i += 8) {
            for(let j = 7; j > -1; j--) {
                this.bits.push(i + j);
            }
        }
    }

    getMessageName(msgId) {
        const msg = this.messages.get(msgId);
        if(msg) return msg.name;
        return null;
    }

    getSignalSpecs(msgId) {
        const msg = this.messages.get(msgId);
        if(msg) return msg.signals;
        return null;
    }

    importDbcString(dbcString) {
        const messages = new Map();
        let ids = 0;

        dbcString.split('\n').forEach((line, idx) => {
            line = line.trim();
            if(line.indexOf("BO_") === 0) {
                let matches = line.match(BO_RE)
                if (matches === null) {
                    console.log('Bad BO', line)
                    return
                }
                let [idString, name, size] = matches.slice(1);
                ids = parseInt(idString, 0); // 0 radix parses hex or dec

                messages.set(ids, {name, size, signals: {}});

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
                       factor, offset, min, max, unit] = matches;
                startBit = parseInt(startBit);
                size = parseInt(size);
                isLittleEndian = parseInt(isLittleEndian) === 1
                isSigned = isSigned === '-'
                factor = floatOrInt(factor);
                offset = floatOrInt(offset);
                min = floatOrInt(min);
                max = floatOrInt(max);

                const signalProperties= {name, startBit, size, isLittleEndian,
                                         isSigned, factor, offset, unit, min, max};
                const signal = new Signal(signalProperties);

                messages.get(ids).signals[name] = signal;
            }
        });

        this.messages = messages;
    }

    valueForSignal(signalSpec, hexData) {
        const blen = hexData.length * 4;
        let value, startBit, dataBitPos;

        if (signalSpec.isLittleEndian) {
            value = UINT64(swapOrder(hexData, 16, 2), 16);
            startBit = signalSpec.startBit;
            dataBitPos = UINT64.fromNumber(startBit);
        } else {
            // big endian
            value = UINT64(hexData, 16);

            startBit = this.bits.indexOf(signalSpec.startBit);
            dataBitPos = UINT64(blen - (startBit + signalSpec.size));
        }
        // console.log('startBit', startBit)
        // console.log('dataBitPos', dataBitPos)
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

    getSignalValues(messageId, data) {
        const hexData = Buffer.from(data).toString('hex');
        if(!this.messages.has(messageId)) {
            return [];
        }
        const {signals} = this.messages.get(messageId);

        const signalValuesByName = {};
        Object.values(signals).forEach((signalSpec) => {
            signalValuesByName[signalSpec.name] = this.valueForSignal(signalSpec, hexData);
        });

        return signalValuesByName;
    }

}