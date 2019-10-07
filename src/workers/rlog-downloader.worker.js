/* eslint-env worker */
/* eslint-disable no-restricted-globals */
import LogStream from '@commaai/log_reader';
import { timeout } from 'thyming';
import { partial } from 'ap';

import { getLogPart } from '../api/rlog';
import DbcUtils from '../utils/dbc';
import DBC from '../models/can/dbc';
import { addressForName } from '../models/can/logSignals';

const DEBOUNCE_DELAY = 100;

self.onmessage = handleMessage;

function handleMessage(msg) {
  const options = msg.data;

  if (options.action === 'terminate') {
    close();
    return;
  }

  options.dbc = new DBC(options.dbcText);

  const entry = new CacheEntry(options);
}

function CacheEntry(options) {
  options = options || {};
  this.options = options;

  const {
    route, part, dbc, logUrls
  } = options;

  this.messages = {};
  this.route = route;
  this.part = part;
  this.dbc = dbc;
  this.logUrls = logUrls;
  this.sendBatch = partial(sendBatch, this);

  // load in the data!
  loadData(this);
}

function sendBatch(entry) {
  delete entry.batching;
  const { messages } = entry;
  entry.messages = {};

  let { maxByteStateChangeCount } = entry.options;
  const newMaxByteStateChangeCount = DbcUtils.findMaxByteStateChangeCount(
    messages
  );
  if (newMaxByteStateChangeCount > maxByteStateChangeCount) {
    maxByteStateChangeCount = newMaxByteStateChangeCount;
  }

  Object.keys(messages).forEach((key) => {
    messages[key] = DbcUtils.setMessageByteColors(
      messages[key],
      maxByteStateChangeCount
    );
  });

  self.postMessage({
    newMessages: messages,
    maxByteStateChangeCount,
    isFinished: entry.ended
  });

  if (entry.ended) {
    console.log('Sending finished');
    close();
  }
}

async function loadData(entry) {
  let url = null;

  if (!entry.options.isDemo && !entry.options.isLegacyShare) {
    url = entry.logUrls[entry.part];
  }

  if (!url || url.indexOf('.7z') !== -1) {
    return self.postMessage({
      error: 'Invalid or missing log files'
    });
  }
  const res = await getLogPart(entry.logUrls[entry.part]);
  const logReader = new LogStream(res);

  entry.ended = false;

  res.on('end', () => {
    console.log('Stream ended');
    setTimeout(() => {
      entry.ended = true;
      queueBatch(entry);
    });
  });

  const msgArr = [];
  const startTime = Date.now();
  const i = 0;

  logReader((msg) => {
    if (entry.ended) {
      console.log('You can get msgs after end', msg);
    }
    if ('InitData' in msg) {
      const monoTime = msg.LogMonoTime / 1e9;
      if (entry.options.canStartTime == null) {
        entry.options.canStartTime = monoTime;
      }
    } else if ('Can' in msg) {
      const monoTime = msg.LogMonoTime / 1000000000;
      msg.Can.forEach(partial(insertCanMessage, entry, monoTime));
    } else if ('CarState' in msg) {
      const monoTime = msg.LogMonoTime / 1000000000;
      insertEventData(
        'CarState',
        'Ego',
        entry,
        monoTime,
        partial(getEgoData, msg.CarState)
      );
      insertEventData(
        'CarState',
        'Controls',
        entry,
        monoTime,
        partial(getCarStateControls, msg.CarState)
      );
      insertEventData(
        'CarState',
        'Flags',
        entry,
        monoTime,
        partial(getFlags, msg.CarState)
      );
      insertEventData(
        'CarState',
        'WheelSpeeds',
        entry,
        monoTime,
        partial(getWheelSpeeds, msg.CarState)
      );
    } else if ('UbloxGnss' in msg) {
      const monoTime = msg.LogMonoTime / 1000000000;
      if (msg.UbloxGnss.MeasurementReport) {
        insertEventData(
          'UbloxGnss',
          'MeasurementReport',
          entry,
          monoTime,
          partial(getUbloxGnss, msg.UbloxGnss.MeasurementReport)
        );
      }
    } else if ('Health' in msg) {
      const monoTime = msg.LogMonoTime / 1000000000;
      insertEventData(
        'Health',
        'Data',
        entry,
        monoTime,
        partial(getHealth, msg.Health)
      );
    } else if ('Thermal' in msg) {
      const monoTime = msg.LogMonoTime / 1000000000;
      insertEventData(
        'Thermal',
        'CPU',
        entry,
        monoTime,
        partial(getThermalCPU, msg.Thermal)
      );
      insertEventData(
        'Thermal',
        'Data',
        entry,
        monoTime,
        partial(getThermalData, msg.Thermal)
      );
      insertEventData(
        'Thermal',
        'FreeSpace',
        entry,
        monoTime,
        partial(getThermalFreeSpace, msg.Thermal)
      );
    } else {
      return;
    }
    queueBatch(entry);
  });
}

function queueBatch(entry) {
  if (!entry.batching) {
    entry.batching = timeout(entry.sendBatch, DEBOUNCE_DELAY);
  }
}

function insertEventData(src, part, entry, logTime, getData) {
  const id = `${src}:${part}`;
  const address = addressForName(id);

  if (!entry.messages[id]) {
    entry.messages[id] = DbcUtils.createMessageSpec(
      entry.dbc,
      address,
      id,
      src
    );
    entry.messages[id].isLogEvent = true;
  }
  const prevMsgEntry = getPrevMsgEntry(
    entry.messages,
    entry.options.prevMsgEntries,
    id
  );

  const { msgEntry, byteStateChangeCounts } = DbcUtils.parseMessage(
    entry.dbc,
    logTime,
    address,
    getData(),
    entry.options.canStartTime,
    prevMsgEntry
  );

  entry.messages[id].byteStateChangeCounts = byteStateChangeCounts.map(
    (count, idx) => entry.messages[id].byteStateChangeCounts[idx] + count
  );

  entry.messages[id].entries.push(msgEntry);
}

function getThermalFlags(state) {
  let flags = 0x00;

  if (state.UsbOnline) {
    flags |= 0x01;
  }
  if (state.Started) {
    flags |= 0x02;
  }

  return flags;
}

function getThermalFreeSpace(state) {
  return longToByteArray(state.FreeSpace * 1000000000);
}

function getThermalData(state) {
  return shortToByteArray(state.Mem)
    .concat(shortToByteArray(state.Gpu))
    .concat(shortToByteArray(state.FanSpeed))
    .concat(state.BatteryPercent)
    .concat(getThermalFlags(state));
}

function getThermalCPU(state) {
  return shortToByteArray(state.Cpu0)
    .concat(shortToByteArray(state.Cpu1))
    .concat(shortToByteArray(state.Cpu2))
    .concat(shortToByteArray(state.Cpu3));
}

function getHealth(state) {
  return signedShortToByteArray(state.Voltage)
    .concat(state.Current)
    .concat(getHealthFlags(state));
}

function getHealthFlags(state) {
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

function getUbloxGnss(state) {
  return signedLongToByteArray(state.RcvTow / 1000)
    .concat(signedShortToByteArray(state.GpsWeek))
    .concat([state.LeapSeconds])
    .concat([state.NumMeas]);
}

function getEgoData(state) {
  return signedShortToByteArray(state.VEgo * 1000)
    .concat(signedShortToByteArray(state.AEgo * 1000))
    .concat(signedShortToByteArray(state.VEgoRaw * 1000))
    .concat(signedShortToByteArray(state.YawRate * 1000));
}

function getCarStateControls(state) {
  return signedLongToByteArray(state.SteeringAngle * 1000)
    .concat(signedShortToByteArray(state.Brake * 1000))
    .concat(signedShortToByteArray(state.Gas * 1000));
}

function getWheelSpeeds(state) {
  return signedShortToByteArray(state.WheelSpeeds.Fl * 100)
    .concat(signedShortToByteArray(state.WheelSpeeds.Fr * 100))
    .concat(signedShortToByteArray(state.WheelSpeeds.Rl * 100))
    .concat(signedShortToByteArray(state.WheelSpeeds.Rr * 100));
}

function getFlags(state) {
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

function insertCanMessage(entry, logTime, msg) {
  const src = msg.Src;
  const address = Number(msg.Address);
  const busTime = msg.BusTime;
  const addressHexStr = address.toString(16);
  const id = `${src}:${addressHexStr}`;

  if (!entry.messages[id]) {
    entry.messages[id] = DbcUtils.createMessageSpec(
      entry.dbc,
      address,
      id,
      src
    );
    entry.messages[id].isLogEvent = false;
  }
  const prevMsgEntry = getPrevMsgEntry(
    entry.messages,
    entry.options.prevMsgEntries,
    id
  );

  const { msgEntry, byteStateChangeCounts } = DbcUtils.parseMessage(
    entry.dbc,
    logTime,
    address,
    msg.Dat,
    entry.options.canStartTime,
    prevMsgEntry
  );

  entry.messages[id].byteStateChangeCounts = byteStateChangeCounts.map(
    (count, idx) => entry.messages[id].byteStateChangeCounts[idx] + count
  );

  entry.messages[id].entries.push(msgEntry);

  // console.log(id);
}

function getPrevMsgEntry(messages, prevMsgEntries, id) {
  if (messages[id].entries.length) {
    return messages[id].entries[messages[id].entries.length - 1];
  }
  return prevMsgEntries[id] || null;
}

function signedShortToByteArray(short) {
  const byteArray = [0, 0];
  const isNegative = short < 0;
  if (isNegative) {
    short += Math.pow(2, 8 * byteArray.length);
  }

  for (let index = byteArray.length - 1; index >= 0; --index) {
    const byte = short & 0xff;
    byteArray[index] = byte;
    short >>= 8;
  }

  return byteArray;
}

function shortToByteArray(short) {
  const byteArray = [0, 0];

  for (let index = byteArray.length - 1; index >= 0; --index) {
    const byte = short & 0xff;
    byteArray[index] = byte;
    short >>= 8;
  }

  return byteArray;
}

function longToByteArray(long) {
  const byteArray = [0, 0, 0, 0];

  for (let index = byteArray.length - 1; index >= 0; --index) {
    const byte = long & 0xff;
    byteArray[index] = byte;
    long >>= 8;
  }

  return byteArray;
}

function signedLongToByteArray(long) {
  const byteArray = [0, 0, 0, 0];
  const isNegative = long < 0;
  if (isNegative) {
    long += Math.pow(2, 8 * byteArray.length);
  }

  for (let index = byteArray.length - 1; index >= 0; --index) {
    const byte = long & 0xff;
    byteArray[index] = byte;
    long >>= 8;
  }

  return byteArray;
}
