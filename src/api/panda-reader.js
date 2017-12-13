import Panda from "./panda";

export default class PandaReader {
  static ERROR_NO_DEVICE_SELECTED = 8;

  constructor() {
    this.panda = new Panda();
    this.isReading = false;
    this.onMessagesReceived = () => {};
    this.callbackQueue = [];
    this.callbackQueueTimer = null;

    this.readLoop = this.readLoop.bind(this);
    this.flushCallbackQueue = this.flushCallbackQueue.bind(this);
    this._flushCallbackQueue = this._flushCallbackQueue.bind(this);
  }

  connect() {
    return this.panda.connect();
  }

  setOnMessagesReceivedCallback(callback) {
    this.onMessagesReceived = callback;
  }

  stopReadLoop() {
    this.isReading = false;
    window.cancelAnimationFrame(this.callbackQueueTimer);
  }

  _flushCallbackQueue() {
    const messages = this.callbackQueue.reduce(
      (arr, messages) => arr.concat(messages),
      []
    );
    this.onMessagesReceived(messages);

    this.callbackQueue = [];
  }

  flushCallbackQueue() {
    if (this.callbackQueue.length > 0) {
      this._flushCallbackQueue();
    }

    this.callbackQueueTimer = window.requestAnimationFrame(
      this.flushCallbackQueue
    );
  }

  readLoop() {
    if (!this.isReading) {
      this.isReading = true;
      // this.flushCallbackQueueTimer = wi
      this.callbackQueueTimer = window.requestAnimationFrame(
        this.flushCallbackQueue,
        30
      );
    }

    this.panda.canRecv().then(
      messages => {
        if (this.isReading && messages.canMessages.length > 0) {
          this.callbackQueue.push(messages);
        }
        this.readLoop();
      },
      error => {
        if (this.isReading) {
          console.log("canRecv error", error);
          this.readLoop();
        }
      }
    );
  }
}
