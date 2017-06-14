export default class Frame {
    constructor({name,
                id = 0,
                size = 0,
                transmitter = "XXX",
                extended = 0,
                comment = null,
                signals = {}}) {
        Object.assign(this, {name,
                             id,
                             size,
                             transmitter,
                             extended,
                             comment,
                             signals})
    }

    header() {
        return `BO_ ${this.id} ${this.name}: ${this.size} ` +
               `${this.transmitter}`;
    }

    text() {
        const signals = Object.values(this.signals)
                            .map((signal) => " " + signal.text()) // indent
                            .join("\n");

        return this.header() + "\n" + signals;
    }
}
