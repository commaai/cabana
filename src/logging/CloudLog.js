import LogEntries from "./LogEntries";
import { LOGENTRIES_TOKEN } from "../config";

class CloudLog {
  constructor() {
    LogEntries.init({
      token: LOGENTRIES_TOKEN,
      no_format: true,
      catchall: false
    });
    this.context = {};
  }

  bind(obj) {
    this.context.update(obj);
  }

  emit(message, level = "log") {
    if (typeof global.__JEST__ !== "undefined") {
      // Don't log in testing environment
      return;
    }

    const entry = {
      ctx: this.context,
      created: new Date().getTime() / 1000,
      msg: message,
      src: "JSCloudLog"
    };

    if (level === "log") {
      LogEntries.log(entry);
    } else if (level === "warn") {
      LogEntries.warn(entry);
    } else if (level === "error") {
      LogEntries.error(entry);
    }
  }

  log(message) {
    this.emit(message);
  }

  warn(message) {
    this.emit(message, "warn");
  }

  error(message) {
    this.emit(message, "error");
  }
}

export default new CloudLog();
