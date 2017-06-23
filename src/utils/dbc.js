function determineByteStateChangeTimes(hexData, time, msgSize, lastParsedMessage) {
  if(!lastParsedMessage) {
    return Array(msgSize).fill(time);
  } else {
    const byteStateChangeTimes = Array.from(lastParsedMessage.byteStateChangeTimes);

    for(let i = 0; i < byteStateChangeTimes.length; i++) {
      const currentData = hexData.substr(i * 2, 2),
            prevData = lastParsedMessage.hexData.substr(i * 2, 2);

      if(currentData != prevData) {
        byteStateChangeTimes[i] = time;
      }
    }

    return byteStateChangeTimes;
  }
}

function parseMessage(dbc, time, address, data, timeStart, lastParsedMessage) {
    const hexData = Buffer.from(data).toString('hex');
    const msgSpec = dbc.messages.get(address);
    const msgSize = msgSpec ? msgSpec.size : 8;
    const relTime = time - timeStart;

    const byteStateChangeTimes = determineByteStateChangeTimes(hexData,
                                                               relTime,
                                                               msgSize,
                                                               lastParsedMessage)
    return {time: time,
            signals: dbc.getSignalValues(address, data),
            relTime,
            hexData,
            byteStateChangeTimes}
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

export default {bigEndianBitIndex, parseMessage}
