export default class Signal {
    constructor({name,
                startBit = 0,
                size = 0,
                isLittleEndian = true,
                isSigned = true,
                isFloat = false,
                factor = 1,
                offset = 0,
                unit = "",
                receiver = [],
                comment = null,
                multiplex = null,
                min = null,
                max = null
                }) {
        Object.assign(this,
            {name,
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
            multiplex});

        if(min == null) {
            min = this.calculateMin();
        }
        if(max == null) {
            max = this.calculateMax();
        }

        Object.assign(this, {min, max});
    }

    calculateRawRange() {
        let rawRange = Math.pow(2, this.size);
        if (this.isSigned) {
            rawRange /= 2;
        }
        return [(this.isSigned ? -1 * rawRange : 0),
                rawRange - 1]
    }

    calculateMin() {
        const rawMin = this.calculateRawRange()[0];
        return this.offset + (rawMin * this.factor);
    }

    calculateMax() {
        const rawMax = this.calculateRawRange()[1];
        return this.offset + (rawMax * this.factor);
    }

    equals(otherSignal) {
        return (otherSignal.name == this.name
                && otherSignal.startBit == this.startBit
                && otherSignal.size == this.size
                && otherSignal.isLittleEndian == this.isLittleEndian
                && otherSignal.isSigned == this.isSigned
                && otherSignal.isFloat == this.isFloat
                && otherSignal.factor == this.factor
                && otherSignal.offset == this.offset
                && otherSignal.unit == this.unit
                && otherSignal.receiver.length==this.receiver.length
                && otherSignal.receiver.every((v,i)=> v === this.receiver[i])
                && otherSignal.comment == this.comment
                && otherSignal.multiplex == this.multiplex);
    }
}