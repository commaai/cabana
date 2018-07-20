import LogStream from "@commaai/log_reader";
import { timeout } from "thyming";
import { partial } from "ap";

import { getLogPart, getLogURLList } from "../api/rlog";
import DbcUtils from "../utils/dbc";
import DBC from "../models/can/dbc";
import { loadCanPart } from "./can-fetcher";

const DEBOUNCE_DELAY = 100;

self.onmessage = handleMessage;

function handleMessage(msg) {
  const options = msg.data;

  options.dbc = new DBC(options.dbcText);

  var entry = new CacheEntry(options);
}

function CacheEntry(options) {
  options = options || {};
  this.options = options;

  let { route, part, dbc } = options;

  this.messages = {};
  this.route = route;
  this.part = part;
  this.dbc = dbc;
  this.sendBatch = partial(sendBatch, this);

  // load in the data!
  loadData(this);
}

function sendBatch(entry) {
  delete entry.batching;
  let messages = entry.messages;
  entry.messages = {};

  let maxByteStateChangeCount = entry.options.maxByteStateChangeCount;
  const newMaxByteStateChangeCount = DbcUtils.findMaxByteStateChangeCount(
    messages
  );
  if (newMaxByteStateChangeCount > maxByteStateChangeCount) {
    maxByteStateChangeCount = newMaxByteStateChangeCount;
  }

  Object.keys(messages).forEach(key => {
    messages[key] = DbcUtils.setMessageByteColors(
      messages[key],
      maxByteStateChangeCount
    );
  });

  if (entry.ended) {
    console.log("Sending finished");
  }

  self.postMessage({
    newMessages: messages,
    maxByteStateChangeCount,
    isFinished: entry.ended
  });
}

async function loadData(entry) {
  var url = null;

  if (!entry.options.isDemo && !entry.options.isShare) {
    url = (await getLogURLList(entry.route))[entry.part];
  }
  if (!url || url.indexOf(".7z") !== -1) {
    // this is a shit log we can't read...
    var data = await loadCanPart(
      entry.dbc,
      entry.options.base,
      entry.options.num,
      entry.options.canStartTime,
      entry.options.prevMsgEntries,
      entry.options.maxByteStateChangeCount
    );
    data.isFinished = true;

    return self.postMessage(data);
  }
  var res = await getLogPart(entry.route, entry.part);
  var logReader = new LogStream(res);

  entry.ended = false;

  res.on("end", function() {
    console.log("Stream ended");
    setTimeout(() => {
      entry.ended = true;
      queueBatch(entry);
    });
  });

  var msgArr = [];
  var startTime = Date.now();
  var i = 0;

  logReader(function(msg) {
    if (entry.ended) {
      console.log("You can get msgs after end", msg);
    }
    if ("Can" in msg) {
      let monoTime = msg.LogMonoTime / 1000000000;
      msg.Can.forEach(partial(insertCanMessage, entry, monoTime));
    } else if ("CarState" in msg) {
      let monoTime = msg.LogMonoTime / 1000000000;
      insertEventData(
        "CarState",
        "Ego",
        entry,
        monoTime,
        partial(getEgoData, msg.CarState)
      );
      insertEventData(
        "CarState",
        "Controls",
        entry,
        monoTime,
        partial(getCarStateControls, msg.CarState)
      );
      insertEventData(
        "CarState",
        "Flags",
        entry,
        monoTime,
        partial(getFlags, msg.CarState)
      );
      insertEventData(
        "CarState",
        "WheelSpeeds",
        entry,
        monoTime,
        partial(getWheelSpeeds, msg.CarState)
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
  var address = addressForPart(part);
  var id = src + ":" + part;

  if (!entry.messages[id]) {
    entry.messages[id] = DbcUtils.createMessageSpec(
      entry.dbc,
      address,
      id,
      src
    );
    // entry.messages[id].isLogEvent = true;
  }
  let prevMsgEntry = getPrevMsgEntry(
    entry.messages,
    entry.options.prevMsgEntries,
    id
  );

  var arrBuf = getData();

  // var arrBuf = signedLongToByteArray(state.SteeringAngle * 1000);
  // arrBuf = arrBuf.concat(longToByteArray(state.VEgoRaw * 1000000));
  // arrBuf = arrBuf.concat(longToByteArray(state.YawRate * 1000000));

  let { msgEntry, byteStateChangeCounts } = DbcUtils.parseMessage(
    entry.dbc,
    logTime,
    address,
    arrBuf,
    entry.options.canStartTime,
    prevMsgEntry
  );

  entry.messages[id].byteStateChangeCounts = byteStateChangeCounts.map(function(
    count,
    idx
  ) {
    return entry.messages[id].byteStateChangeCounts[idx] + count;
  });

  entry.messages[id].entries.push(msgEntry);
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

const ADDRESS_LIST = [];
function addressForPart(part) {
  var i = ADDRESS_LIST.indexOf(part);
  if (i === -1) {
    ADDRESS_LIST.push(part);
    return ADDRESS_LIST.indexOf(part);
  }
  return i;
}

function getWheelSpeeds(state) {
  return shortToByteArray(state.WheelSpeeds.Fl * 100)
    .concat(shortToByteArray(state.WheelSpeeds.Fr * 100))
    .concat(shortToByteArray(state.WheelSpeeds.Rl * 100))
    .concat(shortToByteArray(state.WheelSpeeds.Rr * 100));
}

function getFlags(state) {
  var flags = 0x00;
  var arr = [0, 0, 0];

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
  var src = msg.Src;
  var address = Number(msg.Address);
  var busTime = msg.BusTime;
  var addressHexStr = address.toString(16);
  var id = src + ":" + addressHexStr;

  if (!entry.messages[id]) {
    entry.messages[id] = DbcUtils.createMessageSpec(
      entry.dbc,
      address,
      id,
      src
    );
    entry.messages[id].isLogEvent = false;
  }
  let prevMsgEntry = getPrevMsgEntry(
    entry.messages,
    entry.options.prevMsgEntries,
    id
  );

  let { msgEntry, byteStateChangeCounts } = DbcUtils.parseMessage(
    entry.dbc,
    logTime,
    address,
    msg.Dat,
    entry.options.canStartTime,
    prevMsgEntry
  );

  entry.messages[id].byteStateChangeCounts = byteStateChangeCounts.map(function(
    count,
    idx
  ) {
    return entry.messages[id].byteStateChangeCounts[idx] + count;
  });

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
  var byteArray = [0, 0];
  var isNegative = short < 0;
  if (isNegative) {
    short += Math.pow(2, 8 * byteArray.length);
  }

  for (var index = byteArray.length - 1; index >= 0; --index) {
    var byte = short & 0xff;
    byteArray[index] = byte;
    short = short >> 8;
  }

  return byteArray;
}

function shortToByteArray(short) {
  var byteArray = [0, 0];

  for (var index = byteArray.length - 1; index >= 0; --index) {
    var byte = short & 0xff;
    byteArray[index] = byte;
    short = short >> 8;
  }

  return byteArray;
}

function longToByteArray(long) {
  var byteArray = [0, 0, 0, 0];

  for (var index = byteArray.length - 1; index >= 0; --index) {
    var byte = long & 0xff;
    byteArray[index] = byte;
    long = long >> 8;
  }

  return byteArray;
}

function signedLongToByteArray(long) {
  var byteArray = [0, 0, 0, 0];
  var isNegative = long < 0;
  if (isNegative) {
    long += Math.pow(2, 8 * byteArray.length);
  }

  for (var index = byteArray.length - 1; index >= 0; --index) {
    var byte = long & 0xff;
    byteArray[index] = byte;
    long = long >> 8;
  }

  return byteArray;
}
