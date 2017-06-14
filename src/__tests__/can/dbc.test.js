import DBC, {swapOrder} from '../../models/can/dbc';
import Signal from '../../models/can/signal';
import Bitarray from '../../models/bitarray';

const DBC_MESSAGE_DEF = `BO_ 228 STEERING_CONTROL: 5 ADAS
 SG_ STEER_TORQUE : 7|16@0- (1,0) [-3840|3840] "" EPS
 SG_ STEER_TORQUE_REQUEST : 23|1@0+ (1,0) [0|1] "" EPS
 SG_ SET_ME_X00 : 22|7@0+ (1,0) [0|127] "" EPS
 SG_ SET_ME_X00_2 : 31|8@0+ (1,0) [0|0] "" EPS
 SG_ CHECKSUM : 39|4@0+ (1,0) [0|15] "" EPS
 SG_ COUNTER : 33|2@0+ (1,0) [0|3] "" EPS`;

const DBC_METADATA = `
VERSION ""


NS_ :
    NS_DESC_
    CM_
    BA_DEF_
    BA_
    VAL_
    CAT_DEF_
    CAT_
    FILTER
    BA_DEF_DEF_
    EV_DATA_
    ENVVAR_DATA_
    SGTYPE_
    SGTYPE_VAL_
    BA_DEF_SGTYPE_
    BA_SGTYPE_
    SIG_TYPE_REF_
    VAL_TABLE_
    SIG_GROUP_
    SIG_VALTYPE_
    SIGTYPE_VALTYPE_
    BO_TX_BU_
    BA_DEF_REL_
    BA_REL_
    BA_DEF_DEF_REL_
    BU_SG_REL_
    BU_EV_REL_
    BU_BO_REL_
    SG_MUL_VAL_

BS_:

BU_: INTERCEPTOR EBCM NEO ADAS PCM EPS VSA SCM BDY XXX EPB


BO_TX_BU_ 228 : NEO,ADAS;
BO_TX_BU_ 506 : NEO,ADAS;
BO_TX_BU_ 780 : NEO,ADAS;
BO_TX_BU_ 829 : NEO,ADAS;
BO_TX_BU_ 862 : NEO,ADAS;
BO_TX_BU_ 927 : NEO,ADAS;


CM_ SG_ 401 GEAR "10 = reverse, 11 = transition";
CM_ SG_ 490 LONG_ACCEL "wheel speed derivative, noisy and zero snapping";
CM_ SG_ 780 CRUISE_SPEED "255 = no speed";
CM_ SG_ 804 CRUISE_SPEED_PCM "255 = no speed";
CM_ SG_ 829 BEEP "beeps are pleasant, chimes are for warnngs etc...";
VAL_ 399 STEER_STATUS 5 "fault" 4 "no_torque_alert_2" 2 "no_torque_alert_1" 0 "normal" ;
`;

const DBC_MESSAGE_WITH_METADATA = `
${DBC_METADATA}
${DBC_MESSAGE_DEF}
`;
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
    receiver: ['EPS'],
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

test('int32 parser produces correct value for steer torque signal', () => {
    const dbc = new DBC(DBC_MESSAGE_DEF);

    const hex = 'e2d62a0bd0d3b5e5';
    const buffer = Buffer.from(hex, 'hex');
    const bufferSwapped = Buffer.from(buffer).swap64();

    const bitArr = Bitarray.fromBytes(buffer);
    const bitsSwapped = Bitarray.fromBytes(bufferSwapped);
    const value = dbc.valueForInt32Signal(steerTorqueSignal, bitArr, bitsSwapped);

    expect(value).toBe(-7466);
});

test('int64 parser produces correct value for steer torque signal', () => {
    const dbc = new DBC(DBC_MESSAGE_DEF);

    const hex = 'e2d62a0bd0d3b5e5';
    const value = dbc.valueForInt64Signal(steerTorqueSignal, hex);

    expect(value).toBe(-7466);
});

const EXPECTED_DBC_TEXT = DBC_MESSAGE_DEF;

test('DBC.text() should output unparsed lines followed by parsed messages', () => {
    const dbc = new DBC(DBC_MESSAGE_WITH_METADATA);

    const dbcText = dbc.text();
    expect(dbcText).toEqual(EXPECTED_DBC_TEXT);
});
