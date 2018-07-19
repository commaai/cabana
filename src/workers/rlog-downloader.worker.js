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
      insertCarStateMessage(entry, monoTime, msg.CarState);
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
function insertCarStateMessage(entry, logTime, state) {
  var src = "CarState";
  var address = 0;
  var id = src;

  if (!entry.messages[id]) {
    entry.messages[id] = DbcUtils.createMessageSpec(
      entry.dbc,
      address,
      id,
      src
    );
  }
  let prevMsgEntry = getPrevMsgEntry(
    entry.messages,
    entry.options.prevMsgEntries,
    id
  );

  var arrBuf = longToByteArray(state.SteeringAngle * 10);
  var flags = 0x00;
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
  arrBuf = arrBuf.concat([flags]);

  let { msgEntry, byteStateChangeCounts } = DbcUtils.parseMessage(
    entry.dbc,
    logTime,
    address,
    arrBuf,
    entry.options.canStartTime,
    prevMsgEntry
  );

  // console.log(data, longToByteArray(data * 1000));

  entry.messages[id].byteStateChangeCounts = byteStateChangeCounts.map(function(
    count,
    idx
  ) {
    return entry.messages[id].byteStateChangeCounts[idx] + count;
  });

  entry.messages[id].entries.push(msgEntry);
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

function longToByteArray(long) {
  // we want to represent the input as a 4-bytes array
  var byteArray = [0, 0];
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
