import SocketIO from "socket.io-client";
import { UNLOGGER_HOST } from "../config";

export default class UnloggerClient {
  constructor() {
    this.socket = SocketIO(UNLOGGER_HOST);
  }

  seek(dongleId, baseTime, seekSeconds) {
    this.socket.emit("seek", dongleId, baseTime, seekSeconds);
  }
}
