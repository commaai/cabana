/* eslint-disable no-param-reassign, no-bitwise */

export function signedShortToByteArray(short) {
  const byteArray = [0, 0];
  const isNegative = short < 0;
  if (isNegative) {
    short += 2 ** (8 * byteArray.length);
  }

  for (let index = byteArray.length - 1; index >= 0; --index) {
    const byte = short & 0xff;
    byteArray[index] = byte;
    short >>= 8;
  }

  return byteArray;
}

export function shortToByteArray(short) {
  const byteArray = [0, 0];

  for (let index = byteArray.length - 1; index >= 0; --index) {
    const byte = short & 0xff;
    byteArray[index] = byte;
    short >>= 8;
  }

  return byteArray;
}

export function longToByteArray(long) {
  const byteArray = [0, 0, 0, 0];

  for (let index = byteArray.length - 1; index >= 0; --index) {
    const byte = long & 0xff;
    byteArray[index] = byte;
    long >>= 8;
  }

  return byteArray;
}

export function signedLongToByteArray(long) {
  const byteArray = [0, 0, 0, 0];
  const isNegative = long < 0;
  if (isNegative) {
    long += 2 ** (8 * byteArray.length);
  }

  for (let index = byteArray.length - 1; index >= 0; --index) {
    const byte = long & 0xff;
    byteArray[index] = byte;
    long >>= 8;
  }

  return byteArray;
}

export function getThermalFlags(state) {
  let flags = 0x00;

  if (state.UsbOnline) {
    flags |= 0x01;
  }
  if (state.Started) {
    flags |= 0x02;
  }

  return flags;
}

export function getHealthFlags(state) {
  let flags = 0x00;

  if (state.Started) {
    flags |= 0x01;
  }
  if (state.ControlsAllowed) {
    flags |= 0x02;
  }
  if (state.GasInterceptorDetected) {
    flags |= 0x04;
  }
  if (state.StartedSignalDetected) {
    flags |= 0x08;
  }

  return flags;
}

export function getFlags(state) {
  let flags = 0x00;
  const arr = [0, 0, 0];

  if (state.LeftBlinker) {
    flags |= 0x01;
  }
  if (state.RightBlinker) {
    flags |= 0x02;
  }
  if (state.GenericToggle) {
    flags |= 0x04;
  }
  if (state.DoorOpen) {
    flags |= 0x08;
  }
  if (state.SeatbeltUnlatched) {
    flags |= 0x10;
  }
  if (state.GasPressed) {
    flags |= 0x20;
  }
  if (state.BrakeLights) {
    flags |= 0x40;
  }
  if (state.SteeringPressed) {
    flags |= 0x80;
  }

  arr[0] = flags;
  flags = 0x00;

  if (state.Standstill) {
    flags |= 0x01;
  }
  if (state.CruiseState.Enabled) {
    flags |= 0x02;
  }
  if (state.CruiseState.Available) {
    flags |= 0x04;
  }
  if (state.CruiseState.Standstill) {
    flags |= 0x08;
  }
  if (state.GearShifter) {
    flags |= state.GearShifter << 4;
  }

  arr[1] = flags;
  arr[2] = state.CruiseState.Speed;
  return arr;
}

export function getUbloxGnss(state) {
  return signedLongToByteArray(state.RcvTow / 1000)
    .concat(signedShortToByteArray(state.GpsWeek))
    .concat([state.LeapSeconds])
    .concat([state.NumMeas]);
}

export function getEgoData(state) {
  return signedShortToByteArray(state.VEgo * 1000)
    .concat(signedShortToByteArray(state.AEgo * 1000))
    .concat(signedShortToByteArray(state.VEgoRaw * 1000))
    .concat(signedShortToByteArray(state.YawRate * 1000));
}

export function getCarStateControls(state) {
  return signedLongToByteArray(state.SteeringAngle * 1000)
    .concat(signedShortToByteArray(state.Brake * 1000))
    .concat(signedShortToByteArray(state.Gas * 1000));
}

export function getWheelSpeeds(state) {
  return signedShortToByteArray(state.WheelSpeeds.Fl * 100)
    .concat(signedShortToByteArray(state.WheelSpeeds.Fr * 100))
    .concat(signedShortToByteArray(state.WheelSpeeds.Rl * 100))
    .concat(signedShortToByteArray(state.WheelSpeeds.Rr * 100));
}

export function getCarControlActuators(state) {
  return signedShortToByteArray(state.Actuators.Steer * 1000)
    .concat(signedShortToByteArray(state.Actuators.SteerAngle * 1000))
    .concat(signedShortToByteArray(state.Actuators.Brake * 1000))
    .concat(signedShortToByteArray(state.Actuators.Gas * 1000));
}

export function getRadarStateLeadOne(state) {
  return signedShortToByteArray(state.LeadOne.DRel * 1000)
    .concat(signedShortToByteArray(state.LeadOne.VRel * 1000));
}

export function getRadarStateLeadTwo(state) {
  return signedShortToByteArray(state.LeadTwo.DRel * 1000)
    .concat(signedShortToByteArray(state.LeadTwo.VRel * 1000));
}

export function getThermalFreeSpace(state) {
  return longToByteArray(state.FreeSpace * 1000000000);
}

export function getThermalData(state) {
  return shortToByteArray(state.Mem)
    .concat(shortToByteArray(state.Gpu))
    .concat(shortToByteArray(state.FanSpeed))
    .concat(state.BatteryPercent)
    .concat(getThermalFlags(state));
}

export function getThermalCPU(state) {
  return shortToByteArray(state.Cpu0)
    .concat(shortToByteArray(state.Cpu1))
    .concat(shortToByteArray(state.Cpu2))
    .concat(shortToByteArray(state.Cpu3));
}

export function getHealth(state) {
  return signedShortToByteArray(state.Voltage)
    .concat(state.Current)
    .concat(getHealthFlags(state));
}
