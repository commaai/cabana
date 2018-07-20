import Frame from "./frame";
import Signal from "./signal";

export const wheelSpeeds = {
  FrontLeftWheel: {
    name: "FrontLeftWheel",
    startBit: 7,
    size: 16,
    isLittleEndian: false,
    isSigned: true,
    isFloat: false,
    factor: 0.01,
    offset: 0,
    unit: "",
    receiver: ["XXX"],
    comment: null,
    multiplex: null,
    valueDescriptions: {},
    min: 0,
    max: 65535,
    uid: "0.qp354xsxc9",
    colors: [79, 162, 171]
  },
  FrontRightWheel: {
    name: "FrontRightWheel",
    startBit: 23,
    size: 16,
    isLittleEndian: false,
    isSigned: true,
    isFloat: false,
    factor: 0.01,
    offset: 0,
    unit: "",
    receiver: ["XXX"],
    comment: null,
    multiplex: null,
    valueDescriptions: {},
    min: 0,
    max: 65535,
    uid: "0.fv33m7aumrc",
    colors: [46, 79, 82]
  },
  RearLeftWheel: {
    name: "RearLeftWheel",
    startBit: 39,
    size: 16,
    isLittleEndian: false,
    isSigned: true,
    isFloat: false,
    factor: 0.01,
    offset: 0,
    unit: "",
    receiver: ["XXX"],
    comment: null,
    multiplex: null,
    valueDescriptions: {},
    min: 0,
    max: 65535,
    uid: "0.m4mn9rizvzs",
    colors: [193, 20, 64]
  },
  RearRightWheel: {
    name: "RearRightWheel",
    startBit: 55,
    size: 16,
    isLittleEndian: false,
    isSigned: true,
    isFloat: false,
    factor: 0.01,
    offset: 0,
    unit: "",
    receiver: ["XXX"],
    comment: null,
    multiplex: null,
    valueDescriptions: {},
    min: 0,
    max: 65535,
    uid: "0.e4evas26q7o",
    colors: [131, 125, 5]
  }
};

export const signalMap = {
  "CarState:WheelSpeeds": wheelSpeeds
};
const ADDRESS_LIST = [];

Object.keys(signalMap).forEach(function(name) {
  Object.keys(signalMap[name]).forEach(function(signal) {
    signalMap[name][signal] = new Signal(signalMap[name][signal]);
  });
  addressForName(name);
});

export function addressForName(name) {
  var i = ADDRESS_LIST.indexOf(name);
  if (i === -1) {
    ADDRESS_LIST.push(name);
    return ADDRESS_LIST.indexOf(name) + 0x1000;
  }
  return i + 0x1000;
}

export function nameForAddress(address) {
  if (address >= 0x1000) {
    return ADDRESS_LIST[address - 0x1000];
  }
  return null;
}

export function isLogAddress(address) {
  return !!nameForAddress(address);
}

export function frameForAddress(address) {
  let name = nameForAddress(address);
  return new Frame({
    id: name,
    name: name,
    size: 8,
    signals: signalMap[name]
  });
}
