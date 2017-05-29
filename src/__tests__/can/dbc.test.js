import DBC, {swapOrder} from '../../models/can/dbc';
import Signal from '../../models/can/signal';
const Uint64BE = require('int64-buffer').Uint64BE

const DBC_MESSAGE_DEF = `BO_ 228 STEERING_CONTROL: 5 ADAS
 SG_ STEER_TORQUE : 7|16@0- (1,0) [-3840|3840] ""  EPS
 SG_ STEER_TORQUE_REQUEST : 23|1@0+ (1,0) [0|1] ""  EPS
 SG_ SET_ME_X00 : 22|7@0+ (1,0) [0|127] ""  EPS
 SG_ SET_ME_X00_2 : 31|8@0+ (1,0) [0|0] ""  EPS
 SG_ CHECKSUM : 39|4@0+ (1,0) [0|15] ""  EPS
 SG_ COUNTER : 33|2@0+ (1,0) [0|3] ""  EPS`;

const steerTorqueSignal = new Signal({
    name: 'STEER_TORQUE',
    startBit: 7,
    size: 16,
    isLittleEndian: false,
    isSigned: true,
    factor: 1,
    offset: 0,
    min: -3840,
    max: 3840,
    unit: ""});

test('DBC parses steering control message', () => {
    const dbcParsed = new DBC(DBC_MESSAGE_DEF);
    const {signals} = dbcParsed.messages.get(228);

    expect(Object.keys(signals).length).toBe(6);
    expect(signals['STEER_TORQUE'].equals(steerTorqueSignal)).toBe(true);
});


test('swapOrder properly converts little endian to big endian', () => {
    const littleEndianHex = 'e2d62a0bd0d3b5e5';
    const bigEndianHex = 'e5b5d3d00b2ad6e2';

    const littleEndianHexSwapped = swapOrder(littleEndianHex, 16, 2);

    expect(littleEndianHexSwapped == bigEndianHex).toBe(true);
});

test('DBC parses steer torque field from hex', () => {
    const dbc = new DBC(DBC_MESSAGE_DEF);

    const hex = 'e2d62a0bd0d3b5e5';
    const value = dbc.valueForSignal(steerTorqueSignal, hex);

    expect(value).toBe(-7466);
});