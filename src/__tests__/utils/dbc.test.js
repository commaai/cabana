global.__JEST__ = 1;

import DbcUtils from "../../utils/dbc";
import DBC from "../../models/can/dbc";
import Signal from "../../models/can/signal";
import extend from "xtend";

// want to mock pandareader and test processStreamedCanMessages
const SAMPLE_MESSAGE = {
  address: 0x10,
  busTime: 0,
  data: Buffer.from("abababababababab", "hex"),
  bus: 1
};
const SAMPLE_MESSAGE_ID = "1:10";

function expectSampleMessageFieldsPreserved(messages, frame) {
  const { address, busTime, data, bus } = SAMPLE_MESSAGE;
  expect(messages[SAMPLE_MESSAGE_ID].address).toEqual(address);
  expect(messages[SAMPLE_MESSAGE_ID].id).toEqual(SAMPLE_MESSAGE_ID);
  expect(messages[SAMPLE_MESSAGE_ID].bus).toEqual(bus);
  expect(messages[SAMPLE_MESSAGE_ID].frame).toEqual(frame);
  expect(messages[SAMPLE_MESSAGE_ID].byteStateChangeCounts).toEqual(
    Array(8).fill(0)
  );
}

// function addCanMessage([address, busTime, data, bus], dbc, canStartTime, messages, prevMsgEntries, byteStateChangeCountsByMessage) {
function addMessages(messages, message, dbc, n) {
  const firstCanTime = 0;
  let nextMessage = () => {
    message = extend(message);
    message.busTime += 1;
    return message;
  };

  for (let i = 0; i < n; i++) {
    DbcUtils.addCanMessage(nextMessage(), dbc, firstCanTime, messages, {}, {});
  }
}
test("addCanMessage should add raw can message with empty dbc", () => {
  const messages = {};
  addMessages(messages, SAMPLE_MESSAGE, new DBC(), 1);

  expect(messages[SAMPLE_MESSAGE_ID].entries.length).toEqual(1);
  expectSampleMessageFieldsPreserved(messages);
});

test("addCanMessage should add multiple raw can messages with empty dbc", () => {
  const messages = {};
  addMessages(messages, SAMPLE_MESSAGE, new DBC(), 3);

  expect(messages[SAMPLE_MESSAGE_ID].entries.length).toEqual(3);
  expectSampleMessageFieldsPreserved(messages);
});

test("addCanMessage should add parsed can message with dbc containing message spec", () => {
  const messages = {};
  // create dbc with message spec and signal for sample_message
  const dbc = new DBC();
  dbc.createFrame(SAMPLE_MESSAGE.address);
  const signal = new Signal({ name: "NEW_SIGNAL", startBit: 0, size: 8 });
  dbc.addSignal(SAMPLE_MESSAGE.address, signal);

  // add 1 sample_message
  addMessages(messages, SAMPLE_MESSAGE, dbc, 1);

  // verify message and parsed signal added
  const sampleMessages = messages[SAMPLE_MESSAGE_ID];
  expect(sampleMessages.entries.length).toEqual(1);
  expect(sampleMessages.entries[0].signals[signal.name]).toEqual(0xab);
  expectSampleMessageFieldsPreserved(
    messages,
    dbc.getMessageFrame(SAMPLE_MESSAGE.address)
  );
});
