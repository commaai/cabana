const UINT64 = require('cuint').UINT64

import Bitarray from '../bitarray';

import Signal from './signal';
import Frame from './frame';
import BoardUnit from './BoardUnit';
import DbcUtils from '../../utils/dbc';

const MSG_RE = /^BO\_ (\w+) (\w+) *: (\w+) (\w+)/

const SIGNAL_RE = /^SG\_ (\w+) : (\d+)\|(\d+)@(\d+)([\+|\-]) \(([0-9.+\-eE]+),([0-9.+\-eE]+)\) \[([0-9.+\-eE]+)\|([0-9.+\-eE]+)\] \"(.*)\" (.*)/
// Multiplexed signal
const MP_SIGNAL_RE = /^SG\_ (\w+) (\w+) *: (\d+)\|(\d+)@(\d+)([\+|\-]) \(([0-9.+\-eE]+),([0-9.+\-eE]+)\) \[([0-9.+\-eE]+)\|([0-9.+\-eE]+)\] \"(.*)\" (.*)/

const VAL_RE = /^VAL\_ (\w+) (\w+) (.*);/;
const VAL_TABLE_RE = /^VAL\_TABLE\_ (\w+) (.*);/;

const MSG_TRANSMITTER_RE = /^BO_TX_BU_ ([0-9]+) *: *(.+);/;

const SIGNAL_COMMENT_RE = /^CM\_ SG\_ *(\w+) *(\w+) *\"(.*)\";/;
const SIGNAL_COMMENT_MULTI_LINE_RE = /^CM\_ SG\_ *(\w+) *(\w+) *\"(.*)/

// Message Comments (CM_ BO_ )
const MESSAGE_COMMENT_RE = /^CM\_ BO\_ *(\w+) *\"(.*)\";/;
const MESSAGE_COMMENT_MULTI_LINE_RE = /^CM\_ BO\_ *(\w+) *\"(.*)/;

const BOARD_UNIT_RE = /^BU\_\:(.*)/;
const BOARD_UNIT_COMMENT_RE = /^CM\_ BU\_ *(\w+) *\"(.*)\";/;
const BOARD_UNIT_COMMENT_MULTI_LINE_RE = /^CM\_ BU\_ *(\w+) *\"(.*)/;

// Follow ups are used to parse multi-line comment definitions
const FOLLOW_UP_SIGNAL_COMMENT = "FollowUpSignalComment";
const FOLLOW_UP_MSG_COMMENT = "FollowUpMsgComment";
const FOLLOW_UP_BOARD_UNIT_COMMENT = "FollowUpBoardUnitComment";

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
        this.boardUnits = [];
        this.messages = new Map();

        if(dbcString !== undefined) {
            this.dbcText = dbcString;
            this.importDbcString(dbcString);
        }
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

    updateBoardUnits() {
        const boardUnitNames = this.boardUnits.map((bu) => bu.name);
        const missingBoardUnits =
            Array.from(this.messages.entries())
                .map(([msgId, frame]) => Object.values(frame.signals))
                .reduce((arr, signals) => arr.concat(signals), [])
                .map((signal) => signal.receiver)
                .reduce((arr, receivers) => arr.concat(receivers), [])
                .filter((recv, idx, array) => array.indexOf(recv) === idx)
                .filter((recv) => boardUnitNames.indexOf(recv) === -1)
                .map((recv) => new BoardUnit(recv));

        this.boardUnits = this.boardUnits.concat(missingBoardUnits);
    }

    text() {
        this.updateBoardUnits();

        let txt = 'VERSION ""\n\n\n';
        txt += 'NS_ :' + this._newSymbols();
        txt += '\n\nBS_:\n';

        const boardUnitsText = this.boardUnits.map((bu) => bu.text())
                                              .join(" ");
        txt += '\nBU_: ' + boardUnitsText + '\n\n\n';

        const frames = [];
        for(let [msgId, frame] of this.messages.entries()) {
            frames.push(frame);
        }
        txt += frames.map((f) => f.text()).join("\n\n") + '\n\n';

        const messageTxs = frames.map((f) => [f.id, f.transmitters.slice(1)])
                            .filter(([addr, txs]) => txs.length > 0);
        txt += messageTxs.map(([addr, txs]) =>
                `BO_TX_BU_ ${addr} : ${txs.join(",")};`)
                .join("\n") + '\n\n\n';

        txt += this.boardUnits.filter((bu) => bu.comment !== null)
                               .map((bu) =>
                                `CM_ BU_ ${bu.name} "${bu.comment}";`)
                               .join("\n");

        txt += frames.filter((f) => f.comment !== null)
                     .map((msg) => `CM_ BO_ ${msg.address} "${msg.comment}";`)
                     .join("\n");

        const signalsByMsgId = frames.map((f) =>
                                           Object.values(f.signals)
                                           .map((sig) => [f.id, sig]))
                                           .reduce((s1, s2) => s1.concat(s2), []);

        txt += signalsByMsgId.filter(([msgAddr, sig]) => sig.comment !== null)
                             .map(([msgAddr, sig]) =>
                                `CM_ SG_ ${msgAddr} ${sig.name} "${sig.comment}";`)
                             .join("\n") + '\n';

        txt += signalsByMsgId.filter(([msgAddr, sig]) => sig.valueDescriptions.size > 0)
                             .map(([msgAddr, sig]) => sig.valueDescriptionText(msgAddr))
                             .join("\n");
        return txt + '\n';
    }

    getMessageName(msgId) {
        const msg = this.messages.get(msgId);
        if(msg && msg.frame) return msg.frame.name;
        return null;
    }

    getSignals(msgId) {
        const msg = this.messages.get(msgId);
        if(msg) return msg.signals;
        return {};
    }

    createFrame(msgId) {
        const msg = new Frame({name: this.nextNewFrameName(),
                               id: msgId,
                               size: 8});

        this.messages.set(msgId, msg);
        return msg;
    }

    setSignals(msgId, signals) {
        const msg = this.messages.get(msgId);
        if(msg) {
            msg.signals = signals;
            this.messages.set(msgId, msg);
        } else {
            const msg = this.createFrame(msgId);
            msg.signals = signals;

            this.messages.set(msgId, msg);
            this.updateBoardUnits();
        }
    }

    addSignal(msgId, signal) {
        const msg = this.messages.get(msgId);

        if(msg) {
            msg.signals[signal.name] = signal;
            this.updateBoardUnits();
        }
    }

    importDbcString(dbcString) {
        const messages = new Map();
        let boardUnits = [];
        let valueTables = new Map();
        let id = 0;
        let followUp = null;

        dbcString.split('\n').forEach((line, idx) => {
            line = line.trim();

            if(line.length === 0) return;

            if(followUp != null) {
                const {type, data} = followUp;
                const followUpLine = `\n${line.substr(0, line.length - 2)}`;
                if(type === FOLLOW_UP_SIGNAL_COMMENT) {
                    const signal = data;
                    signal.comment += followUpLine;
                } else if(type === FOLLOW_UP_MSG_COMMENT) {
                    const msg = data;
                    msg.comment += followUpLine;
                } else if(type === FOLLOW_UP_BOARD_UNIT_COMMENT) {
                    const boardUnit = data;
                    boardUnit.comment += followUpLine;
                }
            }

            if(line.indexOf("BO_ ") === 0) {
                let matches = line.match(MSG_RE)
                if (matches === null) {
                    console.log('Bad BO', line)
                    return
                }
                let [idString, name, size, transmitter] = matches.slice(1);
                id = parseInt(idString, 0); // 0 radix parses hex or dec
                size = parseInt(size);
                const frame = new Frame({name, id, size, transmitters: [transmitter]})
                messages.set(id, frame);

            } else if(line.indexOf("SG_") === 0) {
                let matches = line.match(SIGNAL_RE);

                if(matches === null) {
                    matches = line.match(MP_SIGNAL_RE);
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
                const receiver = receiverStr.split(",").map((s) => s.trim());

                const signalProperties= {name, startBit, size, isLittleEndian,
                                         isSigned, factor, offset, unit, min, max,
                                         receiver};
                const signal = new Signal(signalProperties);

                messages.get(id).signals[name] = signal;
            } else if(line.indexOf("VAL_ ") === 0) {
                let matches = line.match(VAL_RE);

                if(matches !== null) {
                    let [messageId, signalName, vals] = matches.slice(1);
                    vals = vals.split('"')
                                .map((s) => s.trim())
                                .filter((s) => s.length > 0);

                    messageId = parseInt(messageId);
                    const msg = messages.get(messageId);
                    const signal = msg.signals[signalName];

                    for(let i = 0; i < vals.length; i+= 2) {
                        const value = vals[i].trim(), description = vals[i + 1].trim();
                        signal.valueDescriptions.set(value, description);
                    }
                }
            } else if(line.indexOf("VAL_TABLE_ ") === 0) {
                let matches = line.match(VAL_TABLE_RE);

                if(matches !== null) {
                    const table = new Map();
                    let [tableName, items] = matches.slice(1);
                    items = items.split('"')
                                  .map((s) => s.trim())
                                  .filter((s) => s.length > 0);

                    for(let i = 0; i < items.length; i += 2) {
                        const key = items[i], value = items[i + 1];
                        table.set(key, value);
                    }
                    valueTables.set(tableName, table);
                }
            } else if(line.indexOf("BO_TX_BU_ ") === 0) {
                let matches = line.match(MSG_TRANSMITTER_RE);

                if(matches !== null) {
                    let [messageId, transmitter] = matches.slice(1);
                    messageId = parseInt(messageId)

                    const msg = messages.get(messageId);
                    msg.transmitters.push(transmitter);
                    messages.set(messageId, msg);
                }
            } else if(line.indexOf("CM_ SG_ ") === 0) {
                let matches = line.match(SIGNAL_COMMENT_RE);
                let hasFollowUp = false;
                if(matches === null) {
                    matches = line.match(SIGNAL_COMMENT_MULTI_LINE_RE);
                    hasFollowUp = true;
                }
                if(matches === null) {
                    console.warn('invalid signal comment', line);
                    return;
                }

                let [messageId, signalName, comment] = matches.slice(1);

                messageId = parseInt(messageId);
                const msg = messages.get(messageId);
                const signal = msg.signals[signalName];
                if(signal === undefined) {
                    console.warn('signal ', signalName, ' undefined');
                } else {
                    signal.comment = comment;
                    messages.set(messageId, msg);
                }

                if(hasFollowUp) {
                    followUp = {type: FOLLOW_UP_SIGNAL_COMMENT, data: signal}
                }
            } else if(line.indexOf("CM_ BO_ ") === 0) {
                let matches = line.match(MESSAGE_COMMENT_RE);
                let hasFollowUp = false;
                if(matches === null) {
                    matches = line.match(MESSAGE_COMMENT_MULTI_LINE_RE);
                    hasFollowUp = true;
                    if(matches === null) {
                        console.warn('invalid message comment', line);
                        return;
                    }
                }

                let [messageId, comment] = matches.slice(1);
                messageId = parseInt(messageId);
                const msg = messages.get(messageId);
                msg.comment = comment;

                if(hasFollowUp) {
                    followUp = {type: FOLLOW_UP_MSG_COMMENT, data: msg};
                }
            } else if(line.indexOf("BU_: ") === 0) {
                let matches = line.match(BOARD_UNIT_RE);

                if(matches !== null) {
                    const [boardUnitNameStr] = matches.slice(1);
                    const newBoardUnits = boardUnitNameStr.split(' ')
                                                       .map((s) => s.trim())
                                                       .filter((s) => s.length > 0)
                                                       .map((name) => new BoardUnit(name));

                    boardUnits = boardUnits.concat(newBoardUnits);
                }
            } else if(line.indexOf("CM_ BU_ ") === 0) {
                let matches = line.match(BOARD_UNIT_COMMENT_RE);
                let hasFollowUp = false;
                if(matches === null) {
                    matches = line.match(BOARD_UNIT_COMMENT_MULTI_LINE_RE)
                    hasFollowUp = true;
                    if(matches === null) {
                        console.warn('invalid board unit comment', line);
                    }
                }

                let [boardUnitName, comment] = matches.slice(1);
                let boardUnit = boardUnits.find((bu) => bu.name == boardUnitName);
                if(boardUnit) {
                    boardUnit.comment = comment;
                }

                if(hasFollowUp) {
                    followUp = {type: FOLLOW_UP_BOARD_UNIT_COMMENT, data: boardUnit};
                }
            }
        });

        this.messages = messages;
        this.boardUnits = boardUnits;
        this.valueTables = valueTables;
    }

    valueForInt64Signal(signalSpec, hexData) {
        const blen = hexData.length * 4;
        let value, startBit, dataBitPos;

        if (signalSpec.isLittleEndian) {
            value = UINT64(swapOrder(hexData, 16, 2), 16);
            startBit = signalSpec.startBit;
            dataBitPos = UINT64(startBit);
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
            startBit = 64 - signalSpec.startBit - signalSpec.size;
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

    _newSymbols() {
        return `
    NS_DESC_
    CM_
    BA_DEF_
    BA_
    VAL_
    CAT_DEF_
    CAT_
    FILTER
    BA_DEF_DEF_
    EV_DATA_
    ENVVAR_DATA_
    SGTYPE_
    SGTYPE_VAL_
    BA_DEF_SGTYPE_
    BA_SGTYPE_
    SIG_TYPE_REF_
    VAL_TABLE_
    SIG_GROUP_
    SIG_VALTYPE_
    SIGTYPE_VALTYPE_
    BO_TX_BU_
    BA_DEF_REL_
    BA_REL_
    BA_DEF_DEF_REL_
    BU_SG_REL_
    BU_EV_REL_
    BU_BO_REL_
    SG_MUL_VAL_`;
    }
}
