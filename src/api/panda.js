import CloudLog from '../logging/CloudLog';
require('core-js/fn/string/pad-end');

const PANDA_VENDOR_ID = 0xbbaa;
const PANDA_PRODUCT_ID = 0xddcc;
const PANDA_ENDPOINT_IN = 1;
const PANDA_BUS_SPEED = 500000.0;

const CAN_EXTENDED = 4;
const BUFFER_SIZE = 0x10 * 256;

export default class Panda {
    constructor() {
        this.device = null;
    }

    connect() {
        // Must be called via a mouse click handler, per Chrome restrictions.
        return navigator.usb.requestDevice({ filters: [{ vendorId: PANDA_VENDOR_ID, productId: PANDA_PRODUCT_ID }] })
            .then(device => {
                this.device = device;
                return device.open();
            })
            .then(() => this.device.selectConfiguration(1))
            .then(() => this.device.claimInterface(0));
    }

    async health() {
        const controlParams = {requestType: 'vendor',
                               recipient: 'device',
                               request: 0xd2,
                               value: 0,
                               index: 0};
        try {
            const result = await this.device.controlTransferIn(controlParams, 13);
        } catch(err) {
            CloudLog.error({event: 'Panda.health failed', 'error': err});
        }
    }

    parseCanBuffer(buffer) {
        const messages = [];

        for(let i = 0; i < buffer.byteLength; i+=0x10) {
            const dat = buffer.slice(i, i + 0x10);

            const datView = Buffer.from(dat);
            const f1 = datView.readInt32LE(0), f2 = datView.readInt32LE(4);

            let address;
            if(f2 & CAN_EXTENDED) {
                address = f1 >>> 3;
            } else {
                address = f1 >>> 21;
            }
            const busTime = (f2 >>> 16);
            const data = new Buffer(dat.slice(8, 8 + (f2 & 0xF)));
            const source = ((f2 >> 4) & 0xF) & 0xFF;

            messages.push([address, busTime, data.toString('hex').padEnd(16, '0'), source]);
        }

        return messages;
    }

    async canRecv() {
        let result = null, receiptTime = null;
        while(result === null) {
            try {
                result = await this.device.transferIn(1, BUFFER_SIZE);
                receiptTime = performance.now() / 1000;
            } catch(err) {
                console.warn('can_recv failed, retrying');
            }
        }

        return {time: receiptTime, canMessages: this.parseCanBuffer(result.data.buffer)};
    }
}
