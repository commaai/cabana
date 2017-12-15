/*
Tests for AddSignals component

note: 'right' and 'left' in test descriptions
       refer to the sides of the bit matrix
       as displayed to the user.
*/
import AddSignals from "../../components/AddSignals";
import React from "react";
import { shallow, mount, render } from "enzyme";
import { StyleSheetTestUtils } from "aphrodite";

// Prevents style injection from firing after test finishes
// and jsdom is torn down.
beforeEach(() => {
  StyleSheetTestUtils.suppressStyleInjection();
});
afterEach(() => {
  StyleSheetTestUtils.clearBufferAndResumeStyleInjection();
});

// signal creation

function createAddSignals(signals) {
  if (signals === undefined) {
    signals = {};
  }
  const message = {
    signals,
    address: 0,
    entries: [
      {
        relTime: 0,
        hexData: "0000000000000000"
      }
    ]
  };

  const component = shallow(
    <AddSignals
      message={message}
      messageIndex={0}
      onConfirmedSignalChange={() => {}}
    />
  );

  return component;
}
test("double clicking adds a signal", () => {
  const component = createAddSignals();

  const firstBit = component.find(".bit").first();

  firstBit.simulate("dblclick");
  const newSignal = Object.values(component.state("signals"))[0];

  expect(newSignal).toBeDefined();
  expect(newSignal.size).toBe(1);
});

test("dragging right to left across a byte creates a little endian signal", () => {
  const component = createAddSignals();
  const leftBitInByte = component.find(".bit").first();
  const rightBitInByte = component.find(".bit").at(7);
  rightBitInByte.simulate("mousedown");
  leftBitInByte.simulate("mouseup");

  const newSignal = Object.values(component.state("signals"))[0];
  expect(newSignal).toBeDefined();
  expect(newSignal.size).toBe(8);
  expect(newSignal.isLittleEndian).toBe(true);
  expect(newSignal.startBit).toBe(0);
});

test("dragging left to right across a byte creates a big endian signal", () => {
  const component = createAddSignals();
  const leftBitInByte = component.find(".bit").first();
  const rightBitInByte = component.find(".bit").at(7);
  leftBitInByte.simulate("mousedown");
  rightBitInByte.simulate("mouseup");

  const newSignal = Object.values(component.state("signals"))[0];
  expect(newSignal).toBeDefined();
  expect(newSignal.size).toBe(8);
  expect(newSignal.isLittleEndian).toBe(false);
  expect(newSignal.startBit).toBe(7);
});

test("dragging from the left of byte 0 to right of byte 1 creates a big endian signal spanning both bytes", () => {
  const component = createAddSignals();
  const leftBitInByte = component.find(".bit").first();
  const rightBitInByte = component.find(".bit").at(15);
  leftBitInByte.simulate("mousedown");
  rightBitInByte.simulate("mouseup");

  const newSignal = Object.values(component.state("signals"))[0];
  expect(newSignal).toBeDefined();
  expect(newSignal.size).toBe(16);
  expect(newSignal.isLittleEndian).toBe(false);
  expect(newSignal.startBit).toBe(7);
});

test("dragging from the right of byte 0 to the left of byte 1 creates a little endian signal spanning both bytes", () => {
  const component = createAddSignals();
  const leftBitInByteOne = component.find(".bit").at(8); // left of byte 1
  const rightBitInByteZero = component.find(".bit").at(7); // right of byte 0

  rightBitInByteZero.simulate("mousedown");
  leftBitInByteOne.simulate("mouseup");

  const newSignal = Object.values(component.state("signals"))[0];
  expect(newSignal).toBeDefined();
  expect(newSignal.size).toBe(16);
  expect(newSignal.isLittleEndian).toBe(true);
  expect(newSignal.startBit).toBe(0);
});

test("dragging from the left of byte 1 to the right of byte 0 creates a little endian signal spanning both bytes", () => {
  const component = createAddSignals();
  const leftBitInByteOne = component.find(".bit").at(8);
  const rightBitInByteZero = component.find(".bit").at(7);

  leftBitInByteOne.simulate("mousedown");
  rightBitInByteZero.simulate("mouseup");

  const signal = Object.values(component.state("signals"))[0];
  expect(signal).toBeDefined();
  expect(signal.size).toBe(16);
  expect(signal.isLittleEndian).toBe(true);
  expect(signal.startBit).toBe(0);
});

test("dragging from the right of byte 1 to the left of byte 0 creates a big endian signal spanning both bytes", () => {
  const component = createAddSignals();
  const leftBitInByteZero = component.find(".bit").at(0);
  const rightBitInByteOne = component.find(".bit").at(15);

  rightBitInByteOne.simulate("mousedown");
  leftBitInByteZero.simulate("mouseup");

  const signal = Object.values(component.state("signals"))[0];
  expect(signal).toBeDefined();
  expect(signal.size).toBe(16);
  expect(signal.isLittleEndian).toBe(false);
  expect(signal.startBit).toBe(7);
});

// signal mutation

test.skip("dragging a one-bit big-endian signal to the right should extend it to the right of the byte", () => {
  const component = createAddSignals();
  component
    .instance()
    .createSignal({ startBit: 7, size: 1, isLittleEndian: false });

  const signalBit = component.find(".bit").at(0);
  signalBit.simulate("mousedown");
  for (let i = 1; i < 8; i++) {
    component
      .find(".bit")
      .at(i)
      .simulate("mouseenter");
  }
  const bitAtRightOfFirstByte = component.find(".bit").at(7);
  bitAtRightOfFirstByte.simulate("mouseup");

  const signal = Object.values(component.state("signals"))[0];
  expect(signal).toBeDefined();
  expect(signal.size).toBe(8);
  expect(signal.isLittleEndian).toBe(false);
  expect(signal.startBit).toBe(7);
});

test.skip("dragging a one-bit little-endian signal to the right should extend it to the right of the byte", () => {
  const component = createAddSignals();
  component
    .instance()
    .createSignal({ startBit: 7, size: 1, isLittleEndian: true });

  const signalBit = component.find(".bit").at(0);
  signalBit.simulate("mousedown");
  for (let i = 1; i < 8; i++) {
    component
      .find(".bit")
      .at(i)
      .simulate("mouseenter");
  }
  const bitAtRightOfFirstByte = component.find(".bit").at(7);
  bitAtRightOfFirstByte.simulate("mouseup");

  const signal = Object.values(component.state("signals"))[0];
  expect(signal).toBeDefined();
  expect(signal.size).toBe(8);
  expect(signal.isLittleEndian).toBe(true);
  expect(signal.startBit).toBe(0);
});

test.skip("dragging a one-bit big-endian signal to the left should extend it to the left of the byte", () => {
  const component = createAddSignals();
  component
    .instance()
    .createSignal({ startBit: 0, size: 1, isLittleEndian: false });

  const signalBit = component.find(".bit").at(7);
  signalBit.simulate("mousedown");
  for (let i = 6; i > -1; i--) {
    component
      .find(".bit")
      .at(i)
      .simulate("mouseenter");
  }
  const bitAtRightOfFirstByte = component.find(".bit").at(0);
  bitAtRightOfFirstByte.simulate("mouseup");

  const signal = Object.values(component.state("signals"))[0];
  expect(signal).toBeDefined();
  expect(signal.size).toBe(8);
  expect(signal.isLittleEndian).toBe(false);
  expect(signal.startBit).toBe(7);
});

test.skip("extending a two-bit big-endian signal by its LSB should extend it to the right of the byte", () => {
  const component = createAddSignals();
  component
    .instance()
    .createSignal({ startBit: 7, size: 2, isLittleEndian: false });

  const lsb = component.find(".bit").at(1);
  lsb.simulate("mousedown");
  for (let i = 0; i < 8; i++) {
    component
      .find(".bit")
      .at(i)
      .simulate("mouseenter");
  }
  const bitAtRightOfFirstByte = component.find(".bit").at(7);
  bitAtRightOfFirstByte.simulate("mouseup");

  const signal = Object.values(component.state("signals"))[0];
  expect(signal).toBeDefined();
  expect(signal.size).toBe(8);
  expect(signal.isLittleEndian).toBe(false);
  expect(signal.startBit).toBe(7);
});

test.skip("a two-bit little-endian signal should extend by its LSB to the end of the byte", () => {
  const component = createAddSignals();
  component
    .instance()
    .createSignal({ startBit: 6, size: 2, isLittleEndian: true });

  const lsb = component.find(".bit").at(1);
  lsb.simulate("mousedown");
  for (let i = 0; i < 8; i++) {
    component
      .find(".bit")
      .at(i)
      .simulate("mouseenter");
  }
  const bitAtRightOfFirstByte = component.find(".bit").at(7);
  bitAtRightOfFirstByte.simulate("mouseup");

  const signal = Object.values(component.state("signals"))[0];
  expect(signal).toBeDefined();
  expect(signal.size).toBe(8);
  expect(signal.isLittleEndian).toBe(true);
  expect(signal.startBit).toBe(0);
});

test("dragging the lsb of a little-endian signal spanning an entire byte should not be allowed to pass the MSB", () => {
  const component = createAddSignals();
  component
    .instance()
    .createSignal({ startBit: 0, size: 8, isLittleEndian: true });

  const lsb = component.find(".bit").at(7);
  lsb.simulate("mousedown");

  const bitPastMsb = component.find(".bit").at(15);
  bitPastMsb.simulate("mouseenter");
  bitPastMsb.simulate("mouseup");

  const signal = Object.values(component.state("signals"))[0];
  expect(signal).toBeDefined();
  expect(signal.size).toBe(8);
  expect(signal.isLittleEndian).toBe(true);
  expect(signal.startBit).toBe(0);
});

test.skip("dragging the lsb of a big-endian signal towards the msb in the same byte should contract the signal", () => {
  const component = createAddSignals();
  component
    .instance()
    .createSignal({ startBit: 7, size: 8, isLittleEndian: false });

  const lsb = component.find(".bit").at(7);
  lsb.simulate("mousedown");
  for (let i = 6; i > 0; i--) {
    component
      .find(".bit")
      .at(i)
      .simulate("mouseenter");
  }
  component
    .find(".bit")
    .at(1)
    .simulate("mouseup");

  const signal = Object.values(component.state("signals"))[0];
  expect(signal).toBeDefined();
  expect(signal.size).toBe(2);
  expect(signal.isLittleEndian).toBe(false);
  expect(signal.startBit).toBe(7);
});

test("a big endian signal spanning one byte should switch to little endian preserving its bit coverage", () => {
  const component = createAddSignals();
  component
    .instance()
    .createSignal({ startBit: 0, size: 8, isLittleEndian: true });

  const lsb = component.find(".bit").at(7);
  lsb.simulate("mousedown");

  const bitPastMsb = component.find(".bit").at(15);
  bitPastMsb.simulate("mouseenter");
  bitPastMsb.simulate("mouseup");

  const signal = Object.values(component.state("signals"))[0];
  expect(signal).toBeDefined();
  expect(signal.size).toBe(8);
  expect(signal.isLittleEndian).toBe(true);
  expect(signal.startBit).toBe(0);
});

test("dragging the msb of a 2-bit little endian signal to a lower byte should not change the signal", () => {
  const component = createAddSignals();
  component
    .instance()
    .createSignal({ startBit: 14, size: 2, isLittleEndian: true });

  const msb = component.find(".bit").at(8);
  msb.simulate("mousedown");
  const bitOutOfBounds = component.find(".bit").at(0);
  bitOutOfBounds.simulate("mouseenter");
  bitOutOfBounds.simulate("mouseup");

  const signal = Object.values(component.state("signals"))[0];
  expect(signal).toBeDefined();
  expect(signal.size).toBe(2);
  expect(signal.isLittleEndian).toBe(true);
  expect(signal.startBit).toBe(14);
});
