export default class Frame {
  constructor({
    name,
    id = 0,
    size = 0,
    transmitters = [],
    extended = 0,
    comment = null,
    signals = {}
  }) {
    Object.assign(this, {
      name,
      id,
      size,
      transmitters,
      extended,
      comment,
      signals
    });
  }

  nextNewTransmitterName() {
    let txNum = 1,
      txName;
    do {
      txName = "NEW_TRANSMITTER_" + txNum;
      txNum++;
    } while (this.transmitters.indexOf(txName) !== -1);

    return txName;
  }

  addTransmitter() {
    const txName = this.nextNewTransmitterName();
    this.transmitters.push(txName);
    return txName;
  }

  header() {
    return (
      `BO_ ${this.id} ${this.name}: ${this.size} ` +
      `${this.transmitters[0] || "XXX"}`
    );
  }

  text() {
    const signals = Object.values(this.signals)
      .map(signal => " " + signal.text()) // indent
      .join("\n");

    if (signals.length > 0) {
      return this.header() + "\n" + signals;
    } else {
      return this.header();
    }
  }

  copy() {
    const copy = Object.assign(Object.create(this), this);

    return copy;
  }
}
