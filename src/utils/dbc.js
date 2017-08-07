require('core-js/fn/array/from');

function findMaxByteStateChangeCount(messages) {
  return Object.values(messages).map((m) => m.byteStateChangeCounts)
                                .reduce((counts, countArr) => counts.concat(countArr), []) // flatten arrays
                                .reduce((count1, count2) => count1 > count2 ? count1 : count2, 0); // find max
}

function addCanMessage([address, busTime, data, source], dbc, canStartTime, messages, prevMsgEntries, byteStateChangeCountsByMessage) {
    var id = source + ":" + address.toString(16);

    if (messages[id] === undefined) messages[id] = createMessageSpec(dbc, address, id, source);

    const prevMsgEntry = messages[id].entries.length > 0 ?
                         messages[id].entries[messages[id].entries.length - 1]
                         :
                         (prevMsgEntries[id] || null);

    if(byteStateChangeCountsByMessage[id] && messages[id].byteStateChangeCounts.every((c) => c === 0)) {
      messages[id].byteStateChangeCounts = byteStateChangeCountsByMessage[id]
    }

    const {msgEntry,
           byteStateChangeCounts} = parseMessage(dbc,
                                                 busTime,
                                                 address,
                                                 data,
                                                 canStartTime,
                                                 prevMsgEntry);

    messages[id].byteStateChangeCounts = byteStateChangeCounts.map((count, idx) =>
     messages[id].byteStateChangeCounts[idx] + count
    );

    messages[id].entries.push(msgEntry);

    return msgEntry;
}

function createMessageSpec(dbc, address, id, bus) {
    const frame = dbc.messages.get(address);
    const size = frame ? frame.size : 8;

    return {address: address,
            id: id,
            bus: bus,
            entries: [],
            frame: dbc.messages.get(address),
            byteColors: Array(size).fill(0),
            byteStateChangeCounts: Array(size).fill(0)}
}

function determineByteStateChangeTimes(hexData, time, msgSize, lastParsedMessage) {
    const byteStateChangeCounts = Array(msgSize).fill(0);
    let byteStateChangeTimes;

    if(!lastParsedMessage) {
      byteStateChangeTimes = Array(msgSize).fill(time);
    } else {
      byteStateChangeTimes = Array.from(lastParsedMessage.byteStateChangeTimes);

      for(let i = 0; i < byteStateChangeTimes.length; i++) {
        const currentData = hexData.substr(i * 2, 2),
              prevData = lastParsedMessage.hexData.substr(i * 2, 2);

        if(currentData !== prevData) {
          byteStateChangeTimes[i] = time;
          byteStateChangeCounts[i] = 1;
        }
      }
    }

    return {byteStateChangeTimes, byteStateChangeCounts};
}

function parseMessage(dbc, time, address, data, timeStart, lastParsedMessage) {
    let hexData;
    if(typeof data === 'string') {
      hexData = data;
      data = Buffer.from(data, 'hex');
    } else {
      hexData = Buffer.from(data).toString('hex');
    }
    const msgSpec = dbc.messages.get(address);
    const msgSize = msgSpec ? msgSpec.size : 8;
    const relTime = time - timeStart;

    const {byteStateChangeTimes,
           byteStateChangeCounts} = determineByteStateChangeTimes(hexData,
                                                       relTime,
                                                       msgSize,
                                                       lastParsedMessage);
    const msgEntry = {time: time,
                      signals: dbc.getSignalValues(address, data),
                      relTime,
                      hexData,
                      byteStateChangeTimes}

    return {msgEntry, byteStateChangeCounts};
}

const BIG_ENDIAN_START_BITS = [];
for(let i = 0; i < 64; i += 8) {
    for(let j = 7; j > -1; j--) {
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
  message.byteColors = message.byteStateChangeCounts.map((count) =>
      isNaN(count) ? 0 : Math.min(255, 75 + 180 * (count / maxByteStateChangeCount))
  ).map((red) =>
      'rgb(' + Math.round(red) + ',0,0)'
  );


  return message;

}

export default {bigEndianBitIndex,
                addCanMessage,
                createMessageSpec,
                matrixBitNumber,
                parseMessage,
                findMaxByteStateChangeCount,
                setMessageByteColors};
