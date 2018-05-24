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
    setTimeout(() => (entry.ended = true));
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
      let monoTime = msg.LogMonoTime / 1000000000;
      msg.Can.forEach(partial(insertCanMessage, entry, monoTime));
      queueBatch(entry);
    }
  });
}

function queueBatch(entry) {
  if (!entry.batching) {
    entry.batching = timeout(entry.sendBatch, DEBOUNCE_DELAY);
  }
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
