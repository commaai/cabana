import DbcUtils from "../../utils/dbc";

export default class Signal {
  constructor({
    name,
    startBit = 0,
    size = 0,
    isLittleEndian = true,
    isSigned = false,
    isFloat = false,
    factor = 1,
    offset = 0,
    unit = "",
    receiver = ["XXX"],
    comment = null,
    multiplex = null,
    min = null,
    max = null,
    valueDescriptions = new Map()
  }) {
    Object.assign(this, {
      name,
      startBit,
      size,
      isLittleEndian,
      isSigned,
      isFloat,
      factor,
      offset,
      unit,
      receiver,
      comment,
      multiplex,
      valueDescriptions
    });

    const uid = Math.random().toString(36);

    if (min == null) {
      min = this.calculateMin();
    }
    if (max == null) {
      max = this.calculateMax();
    }

    const colors = this.generateColors();

    Object.assign(this, { min, max, uid, colors });
  }

  text() {
    const multiplex = this.multiplex ? " " + this.multiplex : "";
    const byteOrder = this.isLittleEndian ? 1 : 0;
    const signedChar = this.isSigned ? "-" : "+";

    return (
      `SG_ ${this.name}${multiplex} : ` +
      `${this.startBit}|${this.size}@${byteOrder}${signedChar}` +
      ` (${this.factor},${this.offset})` +
      ` [${this.min}|${this.max}]` +
      ` "${this.unit}" ${this.receiver}`
    );
  }

  valueDescriptionText(msgId) {
    const entryPairs = Array.from(this.valueDescriptions.entries());
    const values = entryPairs.reduce(
      (str, [value, desc]) => str + value + ` "${desc}" `,
      ""
    );
    return `VAL_ ${msgId} ${this.name} ${values};`;
  }

  lsbBitIndex() {
    // Returns LSB bit index in matrix order (see AddSignals.js)

    if (this.isLittleEndian) {
      return this.startBit;
    } else {
      const lsbBitNumber = this.lsbBitNumber();

      return DbcUtils.matrixBitNumber(lsbBitNumber);
    }
  }

  lsbBitNumber() {
    // Returns LSB bit number in big endian ordering

    return DbcUtils.bigEndianBitIndex(this.startBit) + this.size - 1;
  }

  msbBitIndex() {
    if (this.isLittleEndian) {
      return this.startBit + this.size - 1;
    } else {
      return this.startBit;
    }
  }

  littleEndianBitDescription(bitIndex) {
    const bitRange = [this.startBit, this.startBit + this.size - 1];
    if (bitIndex < bitRange[0] || bitIndex > bitRange[1]) {
      return null;
    } else {
      const bitNumber = bitIndex - bitRange[0];
      const isLsb = bitIndex === bitRange[0];
      const isMsb = bitIndex === bitRange[1];
      return { bitNumber, isLsb, isMsb };
    }
  }

  bigEndianBitDescription(bitIndex) {
    const start = DbcUtils.bigEndianBitIndex(this.startBit);
    const range = [start, start + this.size - 1];
    const bitNumber = DbcUtils.bigEndianBitIndex(bitIndex);

    if (bitNumber < range[0] || bitNumber > range[1]) {
      return null;
    }

    const isLsb = bitNumber === range[1];
    const isMsb = bitIndex === this.startBit;
    return { bitNumber, isLsb, isMsb, range };
  }

  bitDescription(bitIndex) {
    if (this.isLittleEndian) {
      return this.littleEndianBitDescription(bitIndex);
    } else {
      return this.bigEndianBitDescription(bitIndex);
    }
  }

  calculateRawRange() {
    let rawRange = Math.pow(2, this.size);
    if (this.isSigned) {
      rawRange /= 2;
    }
    return [this.isSigned ? -1 * rawRange : 0, rawRange - 1];
  }

  calculateMin() {
    const rawMin = this.calculateRawRange()[0];
    return this.offset + rawMin * this.factor;
  }

  calculateMax() {
    const rawMax = this.calculateRawRange()[1];
    return this.offset + rawMax * this.factor;
  }

  generateColors() {
    let colors = Array(3);
    for (let i = 0; i < 3; i++) {
      colors[i] = Math.floor(Math.random() * 211);
    }

    return colors;
  }

  equals(otherSignal) {
    return (
      otherSignal.name === this.name &&
      otherSignal.startBit === this.startBit &&
      otherSignal.size === this.size &&
      otherSignal.isLittleEndian === this.isLittleEndian &&
      otherSignal.isSigned === this.isSigned &&
      otherSignal.isFloat === this.isFloat &&
      otherSignal.factor === this.factor &&
      otherSignal.offset === this.offset &&
      otherSignal.unit === this.unit &&
      otherSignal.receiver.length === this.receiver.length &&
      otherSignal.receiver.every((v, i) => v === this.receiver[i]) &&
      otherSignal.comment === this.comment &&
      otherSignal.multiplex === this.multiplex
    );
  }
}
