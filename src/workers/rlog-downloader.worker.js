import LogStream from "@commaai/log_reader";
import { timeout } from "thyming";
import { partial } from "ap";

import { getLogPart } from "../api/rlog";
import DbcUtils from "../utils/dbc";
import DBC from "../models/can/dbc";

const CACHE_TIME = 1000 * 60 * 2; // 2 minutes seems fine

self.onmessage = handleMessage;

const PART_CACHE = {};

function handleMessage(msg) {
  const options = msg.data;

  options.dbc = new DBC(options.dbcText);

  var entry = new CacheEntry(options);
}

function CacheEntry(options) {
  console.log("Downloading logs...", options);
  options = options || {};
  this.options = options;

  let { route, part, dbc } = options;

  if (PART_CACHE[route] && PART_CACHE[route][part]) {
    return PART_CACHE[route][part];
  }
  this.messages = {};
  this.route = route;
  this.part = part;
  this.dbc = dbc;
  this.remove = partial(clearCache, this);
  this.access = partial(accessCache, this);
  this.sendBatch = partial(sendBatch, this);

  if (!PART_CACHE[route]) {
    PART_CACHE[route] = {};
  }

  // store entry in global store
  PART_CACHE[route][part] = this;

  // bump the cache invalidation code
  this.access();
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

function accessCache(entry) {
  if (entry.removed) {
    throw new Error("Cannot attempt to access an invalidated cache item");
  }
  if (entry.stop) {
    entry.stop();
  }

  entry.stop = timeout(entry.remove, CACHE_TIME);
}

function clearCache(entry) {
  if (!PART_CACHE[entry.route] || !PART_CACHE[entry.route][entry.part]) {
    return; // already cleaned up?
  }

  if (entry.stop) {
    entry.stop();
  }
  entry.removed = true;

  delete PART_CACHE[entry.route][entry.part];
}

async function loadData(entry) {
  var res = await getLogPart(entry.route, entry.part);
  var logReader = new LogStream(res);

  entry.ended = false;

  res.on("end", function() {
    console.log("Stream ended");
    entry.ended = true;
    queueBatch(entry);
  });

  var msgArr = [];
  var startTime = Date.now();
  var i = 0;

  logReader(function(msg) {
    if (entry.ended) {
      console.log("You can get msgs after end", msg);
    }
    if ("Can" in msg) {
      queueBatch(entry);
      msg.Can.forEach(
        partial(parseCanMessage, entry, msg.LogMonoTime / 1000000000)
      );
    }
  });
}

function queueBatch(entry) {
  if (!entry.batching) {
    entry.batching = timeout(entry.sendBatch, 100);
  }
}

function parseCanMessage(entry, logTime, msg) {
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
