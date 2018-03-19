/* eslint-env worker */
/* eslint-disable no-restricted-globals */
import DBC from "../models/can/dbc";
import DbcUtils from "../utils/dbc";
import extend from "xtend";

function processStreamedCanMessages(
  newCanMessages,
  prevMsgEntries,
  firstCanTime,
  dbc,
  lastBusTime,
  byteStateChangeCountsByMessage,
  maxByteStateChangeCount
) {
  const messages = {};
  let lastCanTime;

  for (let batch = 0; batch < newCanMessages.length; batch++) {
    let { time, canMessages } = newCanMessages[batch];
    canMessages = canMessages.sort((msg1, msg2) => {
      if (msg1[1] < msg2[1]) {
        return -1;
      } else if (msg1[1] > msg2[1]) {
        return 1;
      } else {
        return 0;
      }
    });

    let busTimeSum = 0;

    for (let i = 0; i < canMessages.length; i++) {
      let { address, busTime, data, bus } = canMessages[i];

      let prevBusTime;
      if (i === 0) {
        if (lastBusTime === null) {
          prevBusTime = 0;
        } else {
          prevBusTime = lastBusTime;
        }
      } else {
        prevBusTime = canMessages[i - 1].busTime;
      }

      if (busTime >= prevBusTime) {
        busTimeSum += busTime - prevBusTime;
      } else {
        busTimeSum += 0x10000 - prevBusTime + busTime;
      }
      const message = extend(canMessages[i]);
      message.busTime = time + busTimeSum / 500000.0;

      if (firstCanTime === 0) {
        firstCanTime = message.busTime;
      }

      const msgEntry = DbcUtils.addCanMessage(
        message,
        dbc,
        firstCanTime,
        messages,
        prevMsgEntries,
        byteStateChangeCountsByMessage
      );
      if (i === canMessages.length - 1) {
        lastCanTime = msgEntry.relTime;
      }
    }

    lastBusTime = canMessages[canMessages.length - 1].busTime;
    const newMaxByteStateChangeCount = DbcUtils.findMaxByteStateChangeCount(
      messages
    );

    if (newMaxByteStateChangeCount > maxByteStateChangeCount) {
      maxByteStateChangeCount = newMaxByteStateChangeCount;
    }

    Object.keys(messages).forEach(key => {
      messages[key] = DbcUtils.setMessageByteColors(
        messages[key],
        maxByteStateChangeCount
      );
    });
  }

  self.postMessage({
    newMessages: messages,
    seekTime: lastCanTime,
    lastBusTime,
    firstCanTime,
    maxByteStateChangeCount
  });
}

self.onmessage = function(e) {
  const {
    newCanMessages,
    prevMsgEntries,
    firstCanTime,
    dbcText,
    lastBusTime,
    byteStateChangeCountsByMessage,
    maxByteStateChangeCount
  } = e.data;
  const dbc = new DBC(dbcText);
  processStreamedCanMessages(
    newCanMessages,
    prevMsgEntries,
    firstCanTime,
    dbc,
    lastBusTime,
    byteStateChangeCountsByMessage,
    maxByteStateChangeCount
  );
};
