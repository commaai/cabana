function determineByteStateChangeTimes(hexData, time, msgSize, lastParsedMessage) {
  const byteStateChangeCounts = Array(msgSize).fill(0);
  let byteStateChangeTimes;

  if(!lastParsedMessage) {
    byteStateChangeTimes = Array(msgSize).fill(time);
  } else {
    if(!lastParsedMessage.byteStateChangeTimes) {
        console.log(lastParsedMessage)
    }
    byteStateChangeTimes = Array.from(lastParsedMessage.byteStateChangeTimes);

    for(let i = 0; i < byteStateChangeTimes.length; i++) {
      const currentData = hexData.substr(i * 2, 2),
            prevData = lastParsedMessage.hexData.substr(i * 2, 2);

      if(currentData != prevData) {
        byteStateChangeTimes[i] = time;
        byteStateChangeCounts[i] = 1;
      }
    }
  }

  return {byteStateChangeTimes, byteStateChangeCounts};
}

function parseMessage(dbc, time, address, data, timeStart, lastParsedMessage) {
    const hexData = Buffer.from(data).toString('hex');
    const msgSpec = dbc.messages.get(address);
    const msgSize = msgSpec ? msgSpec.size : 8;
    const relTime = time - timeStart;

    const {byteStateChangeTimes, byteStateChangeCounts} = determineByteStateChangeTimes(hexData,
                                                               relTime,
                                                               msgSize,
                                                               lastParsedMessage)
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

export default {bigEndianBitIndex, matrixBitNumber, parseMessage}
