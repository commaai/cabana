function parseMessage(dbc, time, address, data, timeStart) {
    return {time: time,
            relTime: time - timeStart,
            hexData: Buffer.from(data).toString('hex'),
            signals: dbc.getSignalValues(address, data)}
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

export default {bigEndianBitIndex, parseMessage};
