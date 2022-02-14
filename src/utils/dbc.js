function findMaxByteStateChangeCount(messages) {
  return Object.values(messages)
    .map((m) => m.byteStateChangeCounts)
    .reduce((counts, countArr) => counts.concat(countArr), []) // flatten arrays
    .reduce((count1, count2) => (count1 > count2 ? count1 : count2), 0); // find max
}

function addCanMessage(
  canMessage,
  dbc,
  canStartTime,
  messages,
  prevMsgEntries,
  byteStateChangeCountsByMessage
) {
  const {
    address, busTime, data, bus
  } = canMessage;
  const id = `${bus}:${address.toString(16)}`;

  if (messages[id] === undefined) messages[id] = createMessageSpec(dbc, address, id, bus);

  const prevMsgEntry = messages[id].entries.length > 0
    ? messages[id].entries[messages[id].entries.length - 1]
    : prevMsgEntries[id] || null;

  if (
    byteStateChangeCountsByMessage[id]
    && messages[id].byteStateChangeCounts.every((c) => c === 0)
  ) {
    messages[id].byteStateChangeCounts = byteStateChangeCountsByMessage[id];
  }

  const { msgEntry, byteStateChangeCounts } = parseMessage(
    dbc,
    busTime,
    address,
    data,
    canStartTime,
    prevMsgEntry
  );

  messages[id].byteStateChangeCounts = byteStateChangeCounts.map(
    (count, idx) => messages[id].byteStateChangeCounts[idx] + count
  );

  messages[id].entries.push(msgEntry);

  return msgEntry;
}

function createMessageSpec(dbc, address, id, bus) {
  const frame = dbc.getMessageFrame(address);
  const size = frame ? frame.size : 8;

  return {
    address,
    id,
    bus,
    entries: [],
    frame,
    byteColors: Array(size).fill(0),
    byteStateChangeCounts: Array(size).fill(0)
  };
}

function determineByteStateChangeTimes(
  hexData,
  time,
  msgSize,
  lastParsedMessage
) {
  const byteStateChangeCounts = Array(msgSize).fill(0);
  let byteStateChangeTimes;

  if (!lastParsedMessage) {
    byteStateChangeTimes = Array(msgSize).fill(time);
  } else {
    // debugger;
    byteStateChangeTimes = lastParsedMessage.byteStateChangeTimes;

    for (let i = 0; i < byteStateChangeTimes.length; i++) {
      const currentData = hexData.substr(i * 2, 2);
      const prevData = lastParsedMessage.hexData.substr(i * 2, 2);

      if (currentData !== prevData) {
        byteStateChangeTimes[i] = time;
        byteStateChangeCounts[i] = 1;
      }
    }
  }

  return { byteStateChangeTimes, byteStateChangeCounts };
}

function createMessageEntry(
  dbc,
  address,
  time,
  relTime,
  data,
  byteStateChangeTimes
) {
  return {
    signals: dbc.getSignalValues(address, data),
    address,
    data,
    time,
    relTime,
    hexData: Buffer.from(data).toString('hex'),
    byteStateChangeTimes,
    updated: Date.now()
  };
}

function reparseMessage(dbc, msg, lastParsedMessage) {
  const msgSpec = dbc.getMessageFrame(msg.address);
  const msgSize = msgSpec ? msgSpec.size : 8;

  const {
    byteStateChangeTimes,
    byteStateChangeCounts
  } = determineByteStateChangeTimes(
    msg.hexData,
    msg.relTime,
    msgSize,
    lastParsedMessage
  );

  const msgEntry = {
    ...msg,
    signals: dbc.getSignalValues(msg.address, msg.data),
    byteStateChangeTimes,
    updated: Date.now()
  };

  return { msgEntry, byteStateChangeCounts };
}

function parseMessage(dbc, time, address, data, timeStart, lastParsedMessage) {
  let hexData;
  if (typeof data === 'string') {
    hexData = data;
    data = Buffer.from(data, 'hex');
  } else {
    hexData = Buffer.from(data).toString('hex');
  }
  const msgSpec = dbc.getMessageFrame(address);
  const msgSize = msgSpec ? msgSpec.size : Math.max(8, data.length);
  const relTime = time - timeStart;

  const {
    byteStateChangeTimes,
    byteStateChangeCounts
  } = determineByteStateChangeTimes(
    hexData,
    relTime,
    msgSize,
    lastParsedMessage
  );
  const msgEntry = createMessageEntry(
    dbc,
    address,
    time,
    relTime,
    data,
    byteStateChangeTimes
  );

  return { msgEntry, byteStateChangeCounts };
}

const BIG_ENDIAN_START_BITS = [];
for (let i = 0; i < 8 * 64; i += 8) {
  for (let j = 7; j > -1; j--) {
    BIG_ENDIAN_START_BITS.push(i + j);
  }
}

function bigEndianBitIndex(matrixBitIndex) {
  return BIG_ENDIAN_START_BITS.indexOf(matrixBitIndex);
}

function matrixBitNumber(bigEndianIndex) {
  return BIG_ENDIAN_START_BITS[bigEndianIndex];
}

function setMessageByteColors(message, maxByteStateChangeCount) {
  message.byteColors = message.byteStateChangeCounts
    .map((count) => (isNaN(count)
      ? 0
      : Math.min(255, 75 + 180 * (count / maxByteStateChangeCount))))
    .map((red) => `rgb(${Math.round(red)},0,0)`);

  return message;
}

function maxMessageSize(message, initial = 8) {
  let max = initial;
  for (const entry of message.entries) {
    const data = Buffer.from(entry.hexData, 'hex');
    if (data.length > max) {
      max = data.length;
    }
  }
  return max;
}

export default {
  bigEndianBitIndex,
  addCanMessage,
  createMessageSpec,
  matrixBitNumber,
  parseMessage,
  reparseMessage,
  findMaxByteStateChangeCount,
  setMessageByteColors,
  createMessageEntry,
  maxMessageSize,
};
