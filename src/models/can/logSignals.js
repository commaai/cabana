import Frame from "./frame";
import Signal from "./signal";

export const wheelSpeeds = {
  FrontLeftWheel: shortSignal({
    index: 0,
    factor: 0.001
  }),
  FrontRightWheel: shortSignal({
    index: 1,
    factor: 0.001
  }),
  RearLeftWheel: shortSignal({
    index: 2,
    factor: 0.001
  }),
  RearRightWheel: shortSignal({
    index: 3,
    factor: 0.001
  })
};

export const ego = {
  VEgo: shortSignal({
    index: 0,
    factor: 0.001
  }),
  AEgo: shortSignal({
    index: 1,
    factor: 0.001
  }),
  VEgoRaw: shortSignal({
    index: 2,
    factor: 0.001
  }),
  YawRate: shortSignal({
    index: 3,
    factor: 0.001
  })
};

export const controls = {
  SteeringAngle: longSignal({
    index: 0,
    factor: 0.001
  }),
  Brake: shortSignal({
    index: 2,
    factor: 0.001
  }),
  Gas: shortSignal({
    index: 3,
    factor: 0.001
  })
};

export const flags = {
  LeftBlinker: boolSignal({
    index: 0
  }),
  RightBlinker: boolSignal({
    index: 1
  }),
  GenericToggle: boolSignal({
    index: 2
  }),
  DoorOpen: boolSignal({
    index: 3
  }),
  SeatbeltUnlatched: boolSignal({
    index: 4
  }),
  GasPressed: boolSignal({
    index: 5
  }),
  BrakeLights: boolSignal({
    index: 6
  }),
  SteeringPressed: boolSignal({
    index: 7
  }),
  Standstill: boolSignal({
    index: 8
  }),
  "CruiseState.Enabled": boolSignal({
    index: 9
  }),
  "CruiseState.Available": boolSignal({
    index: 10
  }),
  "CruiseState.Standstill": boolSignal({
    index: 11
  }),
  GearShifter: {
    startBit: 15,
    size: 4,
    unsigned: true
  },
  "CruiseState.Speed": charSignal({
    index: 2
  })
};

export const ubloxGnss = {
  RcvTow: longSignal({
    index: 0
  }),
  GpsWeek: shortSignal({
    index: 2
  }),
  LeapSeconds: {
    startBit: 55,
    size: 8
  },
  NumMeas: {
    startBit: 63,
    size: 8
  }
};

export const health = {
  Voltage: shortSignal({
    index: 0
  }),
  Current: charSignal({
    index: 2
  }),
  Started: boolSignal({
    index: 24
  }),
  ControlsAllowed: boolSignal({
    index: 25
  }),
  GasInterceptorDetected: boolSignal({
    index: 26
  }),
  StartedSignalDetected: boolSignal({
    index: 27
  })
};

export const thermalCPU = {
  Cpu0: shortSignal({
    index: 0,
    unsigned: true
  }),
  Cpu1: shortSignal({
    index: 1,
    unsigned: true
  }),
  Cpu2: shortSignal({
    index: 2,
    unsigned: true
  }),
  Cpu3: shortSignal({
    index: 3,
    unsigned: true
  })
};

export const thermalData = {
  Mem: shortSignal({
    index: 0,
    unsigned: true
  }),
  Gpu: shortSignal({
    index: 1,
    unsigned: true
  }),
  FanSpeed: shortSignal({
    index: 2,
    unsigned: true
  }),
  BatteryPercent: charSignal({
    index: 6,
    unsigned: true
  }),
  UsbOnline: boolSignal({
    index: 56
  }),
  Started: boolSignal({
    index: 57
  })
};

export const thermalFreeSpace = {
  FreeSpace: longSignal({
    index: 0,
    unsigned: true,
    factor: 0.000000001
  })
};

export const signalMap = {
  "CarState:WheelSpeeds": wheelSpeeds,
  "CarState:Ego": ego,
  "CarState:Controls": controls,
  "CarState:Flags": flags,
  "UbloxGnss:MeasurementReport": ubloxGnss,
  "Health:Data": health,
  "Thermal:CPU": thermalCPU,
  "Thermal:Data": thermalData,
  "Thermal:FreeSpace": thermalFreeSpace
};

const ADDRESS_LIST = [];

Object.keys(signalMap).forEach(function(name) {
  Object.keys(signalMap[name]).forEach(function(signal) {
    signalMap[name][signal] = createSignalEntry({
      name: signal,
      ...signalMap[name][signal]
    });
  });
  addressForName(name);
});

function createSignalEntry(options) {
  return new Signal({
    name: options.name,
    startBit: options.startBit,
    size: options.size,
    isLittleEndian: false,
    isSigned: !options.unsigned,
    factor: options.factor || 1,
    offset: options.offset || 0,
    unit: options.unit || ""
  });
}

function longSignal(options) {
  return {
    ...options,
    size: 32,
    startBit: options.index * 32 + 7
  };
}

function shortSignal(options) {
  return {
    ...options,
    size: 16,
    startBit: options.index * 16 + 7
  };
}

function charSignal(options) {
  return {
    ...options,
    size: 8,
    startBit: options.index * 8 + 7
  };
}

function boolSignal(options) {
  return {
    ...options,
    size: 1,
    startBit: options.index,
    unsigned: true
  };
}

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
