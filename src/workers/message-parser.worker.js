/* eslint-env worker */
/* eslint-disable no-restricted-globals */
import Sentry from "../logging/Sentry";
import DBC from "../models/can/dbc";
import DbcUtils from "../utils/dbc";

var window = self;

function reparseEntry(entry, address, dbc, canStartTime, prevMsgEntry) {
  const data = Buffer.from(entry.hexData, "hex");
  return DbcUtils.parseMessage(
    dbc,
    entry.time,
    address,
    data,
    canStartTime,
    prevMsgEntry
  );
}

self.onmessage = function(e) {
  const { messages, dbcText, canStartTime } = e.data;
  const dbc = new DBC(dbcText);
  Object.keys(messages).forEach(messageId => {
    const message = messages[messageId];
    for (var i = 0; i < message.entries.length; i++) {
      const entry = message.entries[i];
      const prevMsgEntry = i > 0 ? message.entries[i - 1] : null;

      const { msgEntry } = reparseEntry(
        entry,
        message.address,
        dbc,
        canStartTime,
        prevMsgEntry
      );

      message.entries[i] = msgEntry;
    }
    messages[messageId] = message;
  });

  self.postMessage(messages);
  self.close();
};
