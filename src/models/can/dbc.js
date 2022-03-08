import CloudLog from '../../logging/CloudLog';
import Signal from './signal';
import Frame from './frame';
import BoardUnit from './BoardUnit';
import DbcUtils from '../../utils/dbc';

const DBC_COMMENT_RE = /^CM_ *"(.*)";/;
const DBC_COMMENT_MULTI_LINE_RE = /^CM_ *"(.*)/;

const MSG_RE = /^BO_ (\w+) (\w+) *: (\w+) (\w+)/;

const SIGNAL_RE = /^SG_ (\w+) : (\d+)\|(\d+)@(\d+)([+|-]) \(([0-9.+-eE]+),([0-9.+-eE]+)\) \[([0-9.+-eE]+)\|([0-9.+-eE]+)\] "(.*)" (.*)/;
// Multiplexed signal
const MP_SIGNAL_RE = /^SG_ (\w+) (\w+) *: (\d+)\|(\d+)@(\d+)([+|-]) \(([0-9.+-eE]+),([0-9.+-eE]+)\) \[([0-9.+-eE]+)\|([0-9.+-eE]+)\] "(.*)" (.*)/;

const VAL_RE = /^VAL_ (\w+) (\w+) (.*);/;
const VAL_TABLE_RE = /^VAL_TABLE_ (\w+) (.*);/;

const MSG_TRANSMITTER_RE = /^BO_TX_BU_ ([0-9]+) *: *(.+);/;

const SIGNAL_COMMENT_RE = /^CM_ SG_ *(\w+) *(\w+) *"(.*)";/;
const SIGNAL_COMMENT_MULTI_LINE_RE = /^CM_ SG_ *(\w+) *(\w+) *"(.*)/;

// Message Comments (CM_ BO_ )
const MESSAGE_COMMENT_RE = /^CM_ BO_ *(\w+) *"(.*)";/;
const MESSAGE_COMMENT_MULTI_LINE_RE = /^CM_ BO_ *(\w+) *"(.*)/;

const BOARD_UNIT_RE = /^BU_:(.*)/;
const BOARD_UNIT_COMMENT_RE = /^CM_ BU_ *(\w+) *"(.*)";/;
const BOARD_UNIT_COMMENT_MULTI_LINE_RE = /^CM_ BU_ *(\w+) *"(.*)/;

// Follow ups are used to parse multi-line comment definitions
const FOLLOW_UP_DBC_COMMENT = 'FollowUpDbcComment';
const FOLLOW_UP_SIGNAL_COMMENT = 'FollowUpSignalComment';
const FOLLOW_UP_MSG_COMMENT = 'FollowUpMsgComment';
const FOLLOW_UP_BOARD_UNIT_COMMENT = 'FollowUpBoardUnitComment';

/* global BigInt */

function floatOrInt(numericStr) {
  if (Number.isInteger(numericStr)) {
    return parseInt(numericStr, 10);
  }
  return parseFloat(numericStr);
}

export function swapOrder(arr, wordSize, gSize) {
  const swappedWords = [];

  for (let i = 0; i < arr.length; i += wordSize) {
    const word = arr.slice(i, i + wordSize);
    for (let j = wordSize - gSize; j > -gSize; j -= gSize) {
      swappedWords.push(word.slice(j, j + gSize));
    }
  }

  return swappedWords.join('');
}

export default class DBC {
  constructor(dbcString) {
    this.boardUnits = [];
    this.comments = [];
    this.messages = new Map();

    if (dbcString !== undefined) {
      this.dbcText = dbcString;
      this.importDbcString(dbcString);
    }
  }

  getMessageFrame(address) {
    return this.messages.get(address);
  }

  nextNewFrameName() {
    const messageNames = [];

    for (const msg of this.messages.values()) {
      messageNames.push(msg.name);
    }

    let msgNum = 1;
    let msgName;
    do {
      msgName = `NEW_MSG_${msgNum}`;
      msgNum++;
    } while (messageNames.indexOf(msgName) !== -1);

    return msgName;
  }

  updateBoardUnits() {
    const boardUnitNames = this.boardUnits.map((bu) => bu.name);
    const missingBoardUnits = Array.from(this.messages.entries())
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
    txt += `NS_ :${this._newSymbols()}`;
    txt += '\n\nBS_:\n';

    const boardUnitsText = this.boardUnits.map((bu) => bu.text()).join(' ');
    txt += `\nBU_: ${boardUnitsText}\n\n\n`;

    const frames = [];
    for (const frame of this.messages.values()) {
      frames.push(frame);
    }
    txt += `${frames.map((f) => f.text()).join('\n\n')}\n\n`;

    const messageTxs = frames
      .map((f) => [f.id, f.transmitters.slice(1)])
      .filter(([addr, txs]) => txs.length > 0);
    txt += `${messageTxs
      .map(([addr, txs]) => `BO_TX_BU_ ${addr} : ${txs.join(',')};`)
      .join('\n')}\n\n\n`;

    txt += this.boardUnits
      .filter((bu) => bu.comment !== null)
      .map((bu) => `CM_ BU_ ${bu.name} "${bu.comment}";`)
      .join('\n');

    txt += frames
      .filter((f) => f.comment !== null)
      .map((msg) => `CM_ BO_ ${msg.address} "${msg.comment}";`)
      .join('\n');

    const signalsByMsgId = frames
      .map((f) => Object.values(f.signals).map((sig) => [f.id, sig]))
      .reduce((s1, s2) => s1.concat(s2), []);

    txt += `${signalsByMsgId
      .filter(([msgAddr, sig]) => sig.comment !== null)
      .map(
        ([msgAddr, sig]) => `CM_ SG_ ${msgAddr} ${sig.name} "${sig.comment}";`
      )
      .join('\n')}\n`;

    txt += `${signalsByMsgId
      .filter(([msgAddr, sig]) => sig.valueDescriptions.size > 0)
      .map(([msgAddr, sig]) => sig.valueDescriptionText(msgAddr))
      .join('\n')}\n`;

    txt += this.comments.map((comment) => `CM_ "${comment}";`).join('\n');

    return `${txt.trim()}\n`;
  }

  getMessageName(msgId) {
    const msg = this.getMessageFrame(msgId);
    if (msg && msg.frame) return msg.frame.name;
    return null;
  }

  getSignals(msgId) {
    const msg = this.getMessageFrame(msgId);
    if (msg) return msg.signals;
    return {};
  }

  createFrame(msgId, size=64) {
    const msg = new Frame({
      name: this.nextNewFrameName(),
      id: msgId,
      size: size,
    });

    this.messages.set(msgId, msg);
    return msg;
  }

  setSignals(msgId, signals, frameSize) {
    const msg = this.getMessageFrame(msgId); // TODO conform frameSize
    if (msg) {
      const newMsg = Object.assign(Object.create(msg), msg);
      newMsg.signals = signals;
      this.messages.set(msgId, newMsg);
    } else {
      const msg = this.createFrame(msgId, frameSize);
      msg.signals = signals;

      this.messages.set(msgId, msg);
      this.updateBoardUnits();
    }
  }

  addSignal(msgId, signal) {
    const msg = this.getMessageFrame(msgId);

    if (msg) {
      msg.signals[signal.name] = signal;
      this.updateBoardUnits();
    }
  }

  importDbcString(dbcString) {
    const warnings = [];
    const messages = new Map();
    let boardUnits = [];
    const valueTables = new Map();
    let id = 0;
    let followUp = null;

    const lines = dbcString.split('\n');
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      if (line.length === 0) continue;

      if (followUp != null) {
        const { type, data } = followUp;
        line = line.replace(/" *;/, '');
        let followUpLine = `\n${line.substr(0, line.length)}`;
        if (line.indexOf('"') !== -1) {
          followUp = null;
          followUpLine = followUpLine.substr(0, followUpLine.length - 1);
        }
        if (type === FOLLOW_UP_SIGNAL_COMMENT) {
          const signal = data;
          signal.comment += followUpLine;
        } else if (type === FOLLOW_UP_MSG_COMMENT) {
          const msg = data;
          msg.comment += followUpLine;
        } else if (type === FOLLOW_UP_BOARD_UNIT_COMMENT) {
          const boardUnit = data;
          boardUnit.comment += followUpLine;
        } else if (type === FOLLOW_UP_DBC_COMMENT) {
          //          const comment = data;
          const partialComment = this.comments[this.comments.length - 1];
          this.comments[this.comments.length - 1] = partialComment + followUpLine;
        }
      }

      if (line.indexOf('BO_ ') === 0) {
        const matches = line.match(MSG_RE);
        if (matches === null) {
          warnings.push(
            `failed to parse message definition on line ${i + 1} -- ${line}`
          );
          continue;
        }
        let [idString, name, size, transmitter] = matches.slice(1);
        id = parseInt(idString, 0); // 0 radix parses hex or dec
        size = parseInt(size, 10);
        const frame = new Frame({
          name,
          id,
          size,
          transmitters: [transmitter]
        });
        messages.set(id, frame);
      } else if (line.indexOf('SG_') === 0) {
        let matches = line.match(SIGNAL_RE);

        if (matches === null) {
          matches = line.match(MP_SIGNAL_RE);
          if (matches === null) {
            warnings.push(
              `failed to parse signal definition on line ${i + 1} -- ${line}`
            );
            continue;
          }
          // for now, ignore multiplex which is matches[1]
          matches = matches[1] + matches.slice(3);
        } else {
          matches = matches.slice(1);
        }

        let [
          name,
          startBit,
          size,
          isLittleEndian,
          isSigned,
          factor,
          offset,
          min,
          max,
          unit,
          receiverStr
        ] = matches;
        startBit = parseInt(startBit, 10);
        size = parseInt(size, 10);
        isLittleEndian = parseInt(isLittleEndian, 10) === 1;
        isSigned = isSigned === '-';
        factor = floatOrInt(factor);
        offset = floatOrInt(offset);
        min = floatOrInt(min);
        max = floatOrInt(max);
        const receiver = receiverStr.split(',').map((s) => s.trim());

        const signalProperties = {
          name,
          startBit,
          size,
          isLittleEndian,
          isSigned,
          factor,
          offset,
          unit,
          min,
          max,
          receiver
        };
        const signal = new Signal(signalProperties);

        if (messages.get(id) !== undefined) {
          messages.get(id).signals[name] = signal;
        } else {
          CloudLog.warn(
            `importDbcString: could not add signal: ${name} due to missing message: ${id}`
          );
        }
      } else if (line.indexOf('VAL_ ') === 0) {
        const matches = line.match(VAL_RE);

        if (matches !== null) {
          let [messageId, signalName, vals] = matches.slice(1);
          vals = vals
            .split('"')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

          messageId = parseInt(messageId, 10);
          const msg = messages.get(messageId);
          const signal = msg.signals[signalName];
          if (signal === undefined) {
            warnings.push(
              `could not find signal for value description on line ${i
                + 1} -- ${line}`
            );
            continue;
          }
          for (let i = 0; i < vals.length; i += 2) {
            const value = vals[i].trim();
            const description = vals[i + 1].trim();
            signal.valueDescriptions.set(value, description);
          }
        } else {
          warnings.push(
            `failed to parse value description on line ${i + 1} -- ${line}`
          );
        }
      } else if (line.indexOf('VAL_TABLE_ ') === 0) {
        const matches = line.match(VAL_TABLE_RE);

        if (matches !== null) {
          const table = new Map();
          let [tableName, items] = matches.slice(1);
          items = items
            .split('"')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

          for (let i = 0; i < items.length; i += 2) {
            const key = items[i];
            const value = items[i + 1];
            table.set(key, value);
          }
          valueTables.set(tableName, table);
        } else {
          warnings.push(
            `failed to parse value table on line ${i + 1} -- ${line}`
          );
        }
      } else if (line.indexOf('BO_TX_BU_ ') === 0) {
        const matches = line.match(MSG_TRANSMITTER_RE);

        if (matches !== null) {
          let [messageId, transmitter] = matches.slice(1);
          messageId = parseInt(messageId, 10);

          const msg = messages.get(messageId);
          msg.transmitters.push(transmitter);
          messages.set(messageId, msg);
        } else {
          warnings.push(
            `failed to parse message transmitter definition on line ${i
              + 1} -- ${line}`
          );
        }
      } else if (line.indexOf('CM_ SG_ ') === 0) {
        let matches = line.match(SIGNAL_COMMENT_RE);
        let hasFollowUp = false;
        if (matches === null) {
          matches = line.match(SIGNAL_COMMENT_MULTI_LINE_RE);
          hasFollowUp = true;
        }
        if (matches === null) {
          warnings.push(
            `failed to parse signal comment on line ${i + 1} -- ${line}`
          );
          continue;
        }

        let [messageId, signalName, comment] = matches.slice(1);

        messageId = parseInt(messageId, 10);
        const msg = messages.get(messageId);
        if (msg === undefined) {
          warnings.push(`failed to parse signal comment on line ${i
            + 1} -- ${line}:
                                    message id ${messageId} does not exist prior to this line`);
          continue;
        }
        const signal = msg.signals[signalName];
        if (signal === undefined) {
          warnings.push(
            `failed to parse signal comment on line ${i + 1} -- ${line}`
          );
          continue;
        } else {
          signal.comment = comment;
          messages.set(messageId, msg);
        }

        if (hasFollowUp) {
          followUp = { type: FOLLOW_UP_SIGNAL_COMMENT, data: signal };
        }
      } else if (line.indexOf('CM_ BO_ ') === 0) {
        let matches = line.match(MESSAGE_COMMENT_RE);
        let hasFollowUp = false;
        if (matches === null) {
          matches = line.match(MESSAGE_COMMENT_MULTI_LINE_RE);
          hasFollowUp = true;
          if (matches === null) {
            warnings.push(
              `failed to message comment on line ${i + 1} -- ${line}`
            );
            continue;
          }
        }

        let [messageId, comment] = matches.slice(1);
        messageId = parseInt(messageId, 10);
        const msg = messages.get(messageId);
        if (msg === undefined) {
          warnings.push(
            `failed to find message to add comment to, msg id: ${messageId}`
          );
          continue;
        }
        msg.comment = comment;

        if (hasFollowUp) {
          followUp = { type: FOLLOW_UP_MSG_COMMENT, data: msg };
        }
      } else if (line.indexOf('BU_: ') === 0) {
        const matches = line.match(BOARD_UNIT_RE);

        if (matches !== null) {
          const [boardUnitNameStr] = matches.slice(1);
          const newBoardUnits = boardUnitNameStr
            .split(' ')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .map((name) => new BoardUnit(name));

          boardUnits = boardUnits.concat(newBoardUnits);
        } else {
          warnings.push(
            `failed to parse board unit definition on line ${i + 1} -- ${line}`
          );
          continue;
        }
      } else if (line.indexOf('CM_ BU_ ') === 0) {
        let matches = line.match(BOARD_UNIT_COMMENT_RE);
        let hasFollowUp = false;
        if (matches === null) {
          matches = line.match(BOARD_UNIT_COMMENT_MULTI_LINE_RE);
          hasFollowUp = true;
          if (matches === null) {
            warnings.push(
              `failed to parse board unit comment on line ${i + 1} -- ${line}`
            );
            continue;
          }
        }

        const [boardUnitName, comment] = matches.slice(1);
        const boardUnit = boardUnits.find((bu) => bu.name === boardUnitName);
        if (boardUnit) {
          boardUnit.comment = comment;
        }

        if (hasFollowUp) {
          followUp = { type: FOLLOW_UP_BOARD_UNIT_COMMENT, data: boardUnit };
        }
      } else if (line.indexOf('CM_ ') === 0) {
        let matches = line.match(DBC_COMMENT_RE);
        let hasFollowUp = false;
        if (matches === null) {
          matches = line.match(DBC_COMMENT_MULTI_LINE_RE);
          if (matches === null) {
            warnings.push(
              `failed to parse dbc comment on line ${i + 1} -- ${line}`
            );
            continue;
          } else {
            hasFollowUp = true;
          }
        }

        const [comment] = matches.slice(1);
        this.comments.push(comment);
        if (hasFollowUp) {
          followUp = { type: FOLLOW_UP_DBC_COMMENT, data: comment };
        }
      }
    }

    // Disabled b/c live mode frequently calls this function
    // and executes way too many network requests
    if (warnings.length > 0) {
      // warnings.forEach((warning) => CloudLog.warn('importDbcString: ' + warning));
      // warnings.forEach((warning) => console.log('importDbcString: ' + warning));
    }

    this.messages = messages;
    this.boardUnits = boardUnits;
    this.valueTables = valueTables;
  }

  valueForIntSignal(signalSpec, view) {
    let sig_lsb, sig_msb;
    if (signalSpec.isLittleEndian) {
      sig_lsb = signalSpec.startBit;
      sig_msb = signalSpec.startBit + signalSpec.size - 1;
    } else {
      sig_lsb = DbcUtils.matrixBitNumber(DbcUtils.bigEndianBitIndex(signalSpec.startBit) + signalSpec.size - 1);
      sig_msb = signalSpec.startBit;
    }

    let ret = signalSpec.size > 32 ? 0n : 0;
    let i = Math.floor(sig_msb / 8);
    let bits = signalSpec.size;
    while (i >= 0 && i < view.byteLength && bits > 0) {
      let lsb = Math.floor(sig_lsb / 8) === i ? sig_lsb : i*8;
      let msb = Math.floor(sig_msb / 8) === i ? sig_msb : (i+1)*8 - 1;
      let size = msb - lsb + 1;

      let d = (view.getUint8(i) >>> (lsb - (i*8))) & ((1 << size) - 1);
      if (signalSpec.size > 32) {
        ret |= BigInt(d) << BigInt(bits - size);
      } else {
        ret |= d << (bits - size);
      }

      bits -= size;
      i = signalSpec.isLittleEndian ? i-1 : i+1;
    }

    if (signalSpec.size > 32) {
      ret = signalSpec.isSigned ? BigInt.asIntN(64, ret) : ret;
      return ret * BigInt(signalSpec.factor) + BigInt(signalSpec.offset);
    } else {
      if (signalSpec.isSigned) {
        ret -= ((ret >> (signalSpec.size-1)) & 1) ? (1 << signalSpec.size) : 0;
      }
      return ret * signalSpec.factor + signalSpec.offset;
    }
  }

  getSignalValues(messageId, data) {
    if (!this.messages.has(messageId)) {
      return {};
    }
    const frame = this.getMessageFrame(messageId);
    const view = new DataView(data.buffer);
    const signalValuesByName = {};
    Object.values(frame.signals).forEach((signalSpec) => {
      if (isNaN(signalSpec.startBit)) {
        return;
      }
      signalValuesByName[signalSpec.name] = this.valueForIntSignal(signalSpec, view);
    });

    return signalValuesByName;
  }

  getChffrMetricMappings() {
    const metricComment = this.comments.find(
      (comment) => comment.indexOf('CHFFR_METRIC') === 0
    );
    if (!metricComment) {
      return null;
    }

    return metricComment
      .split(';')
      .map((metric) => metric.trim().split(' '))
      .reduce(
        (metrics, [_, messageId, signalName, metricName, factor, offset]) => {
          metrics[metricName] = {
            messageId: parseInt(messageId, 10),
            signalName,
            factor: parseFloat(factor),
            offset: parseFloat(offset)
          };
          return metrics;
        },
        {}
      );
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
