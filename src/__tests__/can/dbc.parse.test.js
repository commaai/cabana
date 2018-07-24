global.__JEST__ = 1;
import DBC, { swapOrder } from "../../models/can/dbc";
import Signal from "../../models/can/signal";
import Bitarray from "../../models/bitarray";

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

`;

const DBC_SIGNAL_WITH_COMMENT = `
BO_ 228 STEERING_CONTROL: 5 ADAS
 SG_ STEER_TORQUE : 7|16@0- (1,0) [-3840|3840] "" EPS
 SG_ STEER_TORQUE_REQUEST : 23|1@0+ (1,0) [0|1] "" EPS
 SG_ SET_ME_X00 : 22|7@0+ (1,0) [0|127] "" EPS
 SG_ SET_ME_X00_2 : 31|8@0+ (1,0) [0|0] "" EPS
 SG_ CHECKSUM : 39|4@0+ (1,0) [0|15] "" EPS
 SG_ COUNTER : 33|2@0+ (1,0) [0|3] "" EPS


CM_ SG_ 228 STEER_TORQUE "steer torque is the amount of torque in Nm applied";`;

const DBC_SIGNAL_WITH_MULTI_LINE_COMMENT = `
BO_ 228 STEERING_CONTROL: 5 ADAS
 SG_ STEER_TORQUE : 7|16@0- (1,0) [-3840|3840] "" EPS
 SG_ STEER_TORQUE_REQUEST : 23|1@0+ (1,0) [0|1] "" EPS
 SG_ SET_ME_X00 : 22|7@0+ (1,0) [0|127] "" EPS
 SG_ SET_ME_X00_2 : 31|8@0+ (1,0) [0|0] "" EPS
 SG_ CHECKSUM : 39|4@0+ (1,0) [0|15] "" EPS
 SG_ COUNTER : 33|2@0+ (1,0) [0|3] "" EPS


CM_ SG_ 228 STEER_TORQUE "steer torque is the
 amount of torque in Nm applied";`;

const DBC_MESSAGE_WITH_COMMENT = `
BO_ 228 STEERING_CONTROL: 5 ADAS
 SG_ STEER_TORQUE : 7|16@0- (1,0) [-3840|3840] "" EPS
 SG_ STEER_TORQUE_REQUEST : 23|1@0+ (1,0) [0|1] "" EPS
 SG_ SET_ME_X00 : 22|7@0+ (1,0) [0|127] "" EPS
 SG_ SET_ME_X00_2 : 31|8@0+ (1,0) [0|0] "" EPS
 SG_ CHECKSUM : 39|4@0+ (1,0) [0|15] "" EPS
 SG_ COUNTER : 33|2@0+ (1,0) [0|3] "" EPS


CM_ BO_ 228 "this message contains steer torque information";
`;

const DBC_MESSAGE_WITH_MULTI_LINE_COMMENT = `
BO_ 228 STEERING_CONTROL: 5 ADAS
 SG_ STEER_TORQUE : 7|16@0- (1,0) [-3840|3840] "" EPS
 SG_ STEER_TORQUE_REQUEST : 23|1@0+ (1,0) [0|1] "" EPS
 SG_ SET_ME_X00 : 22|7@0+ (1,0) [0|127] "" EPS
 SG_ SET_ME_X00_2 : 31|8@0+ (1,0) [0|0] "" EPS
 SG_ CHECKSUM : 39|4@0+ (1,0) [0|15] "" EPS
 SG_ COUNTER : 33|2@0+ (1,0) [0|3] "" EPS


CM_ BO_ 228 "this message contains
steer torque information";
`;

const DBC_SIGNALS_WITH_VAL = `
BO_ 228 STEERING_CONTROL: 5 ADAS
 SG_ STEER_TORQUE : 7|16@0- (1,0) [-3840|3840] "" EPS
 SG_ STEER_TORQUE_REQUEST : 23|1@0+ (1,0) [0|1] "" EPS
 SG_ SET_ME_X00 : 22|7@0+ (1,0) [0|127] "" EPS
 SG_ SET_ME_X00_2 : 31|8@0+ (1,0) [0|0] "" EPS
 SG_ CHECKSUM : 39|4@0+ (1,0) [0|15] "" EPS
 SG_ COUNTER : 33|2@0+ (1,0) [0|3] "" EPS


VAL_ 228 STEER_TORQUE_REQUEST 1 "requesting torque" 0 "not requesting torque" ;
`;

const DBC_BOARD_UNITS = `
BU_: first_board_unit second_board_unit
`;

const DBC_BOARD_UNITS_WITH_COMMENT = `
BU_: first_board_unit second_board_unit
CM_ BU_ first_board_unit "first board unit comment";
`;

const DBC_BOARD_UNITS_WITH_COMMENT_LINES = `
BU_: first_board_unit second_board_unit
CM_ BU_ first_board_unit "first board unit
comment";
`;

const DBC_VALUE_TABLE = `
VAL_TABLE_ DI_state 4 "DI_STATE_ENABLE" 3 "DI_STATE_FAULT" 2 "DI_STATE_CLEAR_FAULT" 1 "DI_STATE_STANDBY" 0 "DI_STATE_PREAUTH" ;
VAL_TABLE_ DI_speedUnits 1 "DI_SPEED_KPH" 0 "DI_SPEED_MPH" ;
`;

const steerTorqueSignal = new Signal({
  name: "STEER_TORQUE",
  startBit: 7,
  size: 16,
  isLittleEndian: false,
  isSigned: true,
  factor: 1,
  offset: 0,
  min: -3840,
  max: 3840,
  receiver: ["EPS"],
  unit: ""
});

test("DBC parses steering control message", () => {
  const dbcParsed = new DBC(DBC_MESSAGE_DEF);
  const { signals } = dbcParsed.getMessageFrame(228);

  expect(Object.keys(signals).length).toBe(6);
  expect(signals["STEER_TORQUE"].equals(steerTorqueSignal)).toBe(true);
});

test("DBC parses signal comment", () => {
  const dbcParsed = new DBC(DBC_SIGNAL_WITH_COMMENT);
  const { signals } = dbcParsed.getMessageFrame(228);

  expect(signals.STEER_TORQUE.comment).toEqual(
    "steer torque is the amount of torque in Nm applied"
  );
});

test("DBC parses multi-line signal comment", () => {
  const dbcParsed = new DBC(DBC_SIGNAL_WITH_MULTI_LINE_COMMENT);
  const { signals } = dbcParsed.getMessageFrame(228);

  expect(signals.STEER_TORQUE.comment).toEqual(
    "steer torque is the\namount of torque in Nm applied"
  );
});

test("DBC parses message comment", () => {
  const dbcParsed = new DBC(DBC_MESSAGE_WITH_COMMENT);
  const msg = dbcParsed.getMessageFrame(228);

  expect(msg.comment).toEqual("this message contains steer torque information");
});

test("DBC parses multi-line message comment", () => {
  const dbcParsed = new DBC(DBC_MESSAGE_WITH_MULTI_LINE_COMMENT);
  const msg = dbcParsed.getMessageFrame(228);

  expect(msg.comment).toEqual(
    "this message contains\nsteer torque information"
  );
});

test("DBC parses board unit names", () => {
  const dbcParsed = new DBC(DBC_BOARD_UNITS);
  expect(dbcParsed.boardUnits[0].name).toEqual("first_board_unit");
  expect(dbcParsed.boardUnits[1].name).toEqual("second_board_unit");
});

test("DBC parses board unit comments", () => {
  const dbcParsed = new DBC(DBC_BOARD_UNITS_WITH_COMMENT);
  expect(dbcParsed.boardUnits[0].comment).toEqual("first board unit comment");
});

test("DBC parses multi-line board unit comments", () => {
  const dbcParsed = new DBC(DBC_BOARD_UNITS_WITH_COMMENT_LINES);
  expect(dbcParsed.boardUnits[0].comment).toEqual("first board unit\ncomment");
});

test("DBC parses signal value descriptions", () => {
  const dbcParsed = new DBC(DBC_SIGNALS_WITH_VAL);
  const { signals } = dbcParsed.getMessageFrame(228);

  const expectedTorqueRequestVals = new Map([
    ["1", "requesting torque"],
    ["0", "not requesting torque"]
  ]);
  expect(signals.STEER_TORQUE_REQUEST.valueDescriptions).toEqual(
    expectedTorqueRequestVals
  );
});

test("DBC parses value tables", () => {
  const dbcParsed = new DBC(DBC_VALUE_TABLE);
  const stateTableEntries = [
    ["4", "DI_STATE_ENABLE"],
    ["3", "DI_STATE_FAULT"],
    ["2", "DI_STATE_CLEAR_FAULT"],
    ["1", "DI_STATE_STANDBY"],
    ["0", "DI_STATE_PREAUTH"]
  ];
  const stateTable = new Map(stateTableEntries);
  const speedUnitsEntries = [["1", "DI_SPEED_KPH"], ["0", "DI_SPEED_MPH"]];
  const speedUnitsTable = new Map(speedUnitsEntries);

  const valueTableEntries = Array.from(dbcParsed.valueTables.entries());
  expect(valueTableEntries[0]).toEqual(["DI_state", stateTable]);
  expect(valueTableEntries[1]).toEqual(["DI_speedUnits", speedUnitsTable]);
});

test("swapOrder properly converts little endian to big endian", () => {
  const littleEndianHex = "e2d62a0bd0d3b5e5";
  const bigEndianHex = "e5b5d3d00b2ad6e2";

  const littleEndianHexSwapped = swapOrder(littleEndianHex, 16, 2);

  expect(littleEndianHexSwapped == bigEndianHex).toBe(true);
});

test("int32 parser produces correct value for steer torque signal", () => {
  const dbc = new DBC(DBC_MESSAGE_DEF);

  const hex = "e2d62a0bd0d3b5e5";
  const buffer = Buffer.from(hex, "hex");
  const bufferSwapped = Buffer.from(buffer).swap64();

  const bitArr = Bitarray.fromBytes(buffer);
  const bitsSwapped = Bitarray.fromBytes(bufferSwapped);
  const value = dbc.valueForInt32Signal(steerTorqueSignal, bitArr, bitsSwapped);

  expect(value).toBe(-7466);
});

test("int64 parser produces correct value for steer torque signal", () => {
  const dbc = new DBC(DBC_MESSAGE_DEF);

  const hex = "e2d62a0bd0d3b5e5";
  const value = dbc.valueForInt64Signal(steerTorqueSignal, hex);

  expect(value).toBe(-7466);
});

function dbcInt32SignalValue(dbc, signalSpec, hex) {
  const buffer = Buffer.from(hex, "hex");
  const bufferSwapped = Buffer.from(buffer).swap64();

  const bits = Bitarray.fromBytes(buffer);
  const bitsSwapped = Bitarray.fromBytes(bufferSwapped);

  return dbc.valueForInt32Signal(signalSpec, bits, bitsSwapped);
}

const DBC_BINARY_LE_SIGNAL = `
BO_ 768 NEW_MSG_1: 8 XXX
 SG_ NEW_SIGNAL_1 : 37|1@1+ (1,0) [0|1] "" XXX
`;

test("int32 parsers produces correct value for binary little endian signal", () => {
  const dbc = new DBC(DBC_BINARY_LE_SIGNAL);
  const signalSpec = dbc.getMessageFrame(768).signals["NEW_SIGNAL_1"];

  const hexDataSet = "0000000020000000";
  const hexDataNotSet = "0000000000000000";

  const setValue = dbcInt32SignalValue(dbc, signalSpec, hexDataSet);
  const notSetValue = dbcInt32SignalValue(dbc, signalSpec, hexDataNotSet);

  expect(setValue).toEqual(1);
  expect(notSetValue).toEqual(0);
});

const DBC_TWO_BIT_LE_SIGNAL = `
BO_ 768 NEW_MSG_1: 8 XXX
 SG_ NEW_SIGNAL_1 : 35|2@1+ (1,0) [0|3] "" XXX
`;
test("int32 parser produces correct value for 2-bit little endian signal spanning words", () => {
  const dbc = new DBC(DBC_TWO_BIT_LE_SIGNAL);
  const signalSpec = dbc.getMessageFrame(768).signals["NEW_SIGNAL_1"];

  const hexData = "00000001f8000000";

  const value = dbcInt32SignalValue(dbc, signalSpec, hexData);
  expect(value).toEqual(3);
});

const DBC_FOUR_BIT_LE_SIGNAL = `
BO_ 768 NEW_MSG_1: 8 XXX
 SG_ NEW_SIGNAL_1 : 6|4@1+ (1,0) [0|15] "" XXX
`;
test("int32 parser produces correct value for 4-bit little endian signal", () => {
  const dbc = new DBC(DBC_FOUR_BIT_LE_SIGNAL);
  const signalSpec = dbc.getMessageFrame(768).signals["NEW_SIGNAL_1"];

  // this data is symmetric, the data bits are 1111
  const hexDataSymmetric = "f00f000000000000";
  const symValue = dbcInt32SignalValue(dbc, signalSpec, hexDataSymmetric);
  expect(symValue).toEqual(15);

  // this data is asymmetric, the data bits are 1101
  const hexDataAsymmetric = "f002000000000000";
  const aSymValue = dbcInt32SignalValue(dbc, signalSpec, hexDataAsymmetric);
  expect(aSymValue).toEqual(11);
});

const DBC_CHFFR_METRIC_COMMENT = `
BO_ 37 STEERING_CONTROL: 8 XXX
  SG_ STEER_ANGLE : 6|4@1+ (1,0) [0|15] "" XXX

CM_ "CHFFR_METRIC 37 STEER_ANGLE STEER_ANGLE 0.36 180";
`;

test("dbc parser parses top-level comment with chffr metric", () => {
  const dbc = new DBC(DBC_CHFFR_METRIC_COMMENT);
  const { comments } = dbc;

  expect(comments.length).toEqual(1);
  expect(comments[0]).toEqual(
    "CHFFR_METRIC 37 STEER_ANGLE STEER_ANGLE 0.36 180"
  );
});
