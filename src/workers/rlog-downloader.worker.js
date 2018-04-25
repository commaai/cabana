import LogStream from "@commaai/log_reader";
import { timeout } from "thyming";
import { partial } from "ap";
import { getLogPart } from "../api/rlog";

const CACHE_TIME = 1000 * 60 * 2; // 2 minutes seems fine

console.log("Look at me im sandra dee");

self.onmessage = handleMessage;

const PART_CACHE = {};

function handleMessage(msg) {
  const { route, part } = msg.data;

  var entry = new CacheEntry(route, part);
}

function CacheEntry(route, part) {
  if (PART_CACHE[route] && PART_CACHE[route][part]) {
    return PART_CACHE[route][part];
  }
  this.route = route;
  this.part = part;
  this.remove = partial(clearCache, this);
  this.access = partial(accessCache, this);

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

  var msgArr = [];
  var startTime = Date.now();

  logReader(function(msg) {
    if ("Can" in msg) {
      let canMsgs = msg.Can.map(partial(parseCanMessage, msg.LogMonoTime));
    }
  });
}

function parseCanMessage(logTime, msg) {
  var src = msg.Src;
  var address = msg.Address;
  var busTime = msg.BusTime;
  var addressHexStr = address.toString(16);
  var id = src + ":" + addressHexStr;

  console.log(id);
}
