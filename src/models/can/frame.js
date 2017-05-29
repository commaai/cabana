export default class Frame {
    constructor({name,
                id = 0,
                dlc = 0,
                transmitter = [],
                extended = 0,
                comment = null,
                signals = []}) {
        Object.assign(this, {name,
                             id,
                             dlc,
                             transmitter,
                             extended,
                             comment,
                             signals})
    }
}