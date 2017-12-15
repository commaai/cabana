import CloudLog from "../logging/CloudLog";

const PANDA_VENDOR_ID = 0xbbaa;
//const PANDA_PRODUCT_ID = 0xddcc;

const BUFFER_SIZE = 0x10 * 256;

export default class Panda {
  constructor() {
    this.device = null;
  }

  connect() {
    // Must be called via a mouse click handler, per Chrome restrictions.
    return navigator.usb
      .requestDevice({ filters: [{ vendorId: PANDA_VENDOR_ID }] })
      .then(device => {
        this.device = device;
        return device.open();
      })
      .then(() => this.device.selectConfiguration(1))
      .then(() => this.device.claimInterface(0));
  }

  async health() {
    const controlParams = {
      requestType: "vendor",
      recipient: "device",
      request: 0xd2,
      value: 0,
      index: 0
    };
    try {
      return await this.device.controlTransferIn(controlParams, 13);
    } catch (err) {
      CloudLog.error({ event: "Panda.health failed", error: err });
    }
  }

  parseCanBuffer(buffer) {
    const messages = [];

    for (let i = 0; i < buffer.byteLength; i += 0x10) {
      const dat = buffer.slice(i, i + 0x10);

      const datView = Buffer.from(dat);
      const f1 = datView.readInt32LE(0),
        f2 = datView.readInt32LE(4);

      const address = f1 >>> 21;

      const busTime = f2 >>> 16;
      const data = new Buffer(dat.slice(8, 8 + (f2 & 0xf)));
      const source = (f2 >> 4) & 0xf & 0xff;

      messages.push([
        address,
        busTime,
        data.toString("hex").padEnd(16, "0"),
        source
      ]);
    }

    return messages;
  }

  async mockCanRecv() {
    const promise = new Promise(resolve =>
      setTimeout(
        () =>
          resolve({
            time: performance.now() / 1000,
            canMessages: [[0, Math.random() * 65000, "".padEnd(16, "0"), 0]]
          }),
        100
      )
    );
    return await promise;
  }

  async canRecv() {
    let result = null,
      receiptTime = null;
    while (result === null) {
      try {
        result = await this.device.transferIn(1, BUFFER_SIZE);
        receiptTime = performance.now() / 1000;
      } catch (err) {
        console.warn("can_recv failed, retrying");
      }
    }

    return {
      time: receiptTime,
      canMessages: this.parseCanBuffer(result.data.buffer)
    };
  }
}
