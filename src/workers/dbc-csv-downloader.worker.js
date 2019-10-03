/* eslint-env worker */
/* eslint-disable no-restricted-globals */
// import Sentry from '../logging/Sentry';

import NumpyLoader from "../utils/loadnpy";
import * as CanApi from "../api/can";

const MAX_CONNECTIONS = 8;

var window = self;

const Int64LE = require("int64-buffer").Int64LE;

function transformData(data) {}
async function fetchAndPostData(
  base,
  currentPart,
  [minPart, maxPart],
  canStartTime
) {
  console.log("starting fetchAndPostData process");

  var partList = [];
  minPart = currentPart;
  var prevPart = Promise.resolve();
  var promiseBuffer = [];
  var totalParts = maxPart - minPart;
  var currentProcess = 0;
  while (currentPart <= maxPart) {
    // post inc, pass the previous value then inc
    console.log("Starting download", currentPart - minPart, "of", totalParts);
    prevPart = downloadNextPart(
      base,
      canStartTime,
      currentProcess,
      prevPart,
      currentPart++
    );
    currentProcess = ~~(100 * ((currentPart - minPart) / totalParts));

    promiseBuffer.push(prevPart);
    if (promiseBuffer.length > MAX_CONNECTIONS) {
      await promiseBuffer.shift();
    }
  }

  await Promise.all(promiseBuffer);
  // processing is done!
  self.postMessage({
    progress: 100,
    shouldClose: true
  });
  self.close();
}

async function downloadNextPart(
  base,
  canStartTime,
  currentProcess,
  prevPartPromise,
  currentPart
) {
  var awaitedData = await CanApi.fetchCanPart(base, currentPart);
  await prevPartPromise;

  const { times, sources, addresses, datas } = awaitedData;

  // times is a float64array, which we want to be a normal array for now
  const logData = [].slice
    .call(times)
    .map((t, i) => {
      var src = Int64LE(sources, i * 8).toString(10);
      var address = Int64LE(addresses, i * 8);
      var addressHexStr = address.toString(16);
      var id = src + ":" + addressHexStr;

      var addressNum = address.toNumber();
      var data = datas.slice(i * 8, (i + 1) * 8);

      return `${t - canStartTime},${addressNum},${src},${Buffer.from(
        data
      ).toString("hex")}\n`;
    })
    .join("");

  console.log("posting message");
  self.postMessage({
    progress: currentProcess,
    logData,
    shouldClose: false
  });

  return awaitedData;
}

function transformAndSend(rawData) {
  var totalSize = 0;
  var maxTime = rawData.reduce(function(memo, sourceData) {
    totalSize += sourceData.entries.length;
    sourceData.entries = sourceData.entries.sort(function(a, b) {
      if (a.relTime > b.relTime) {
        return 1;
      }
      if (a.relTime < b.relTime) {
        return -1;
      }
      return 0;
    });
    return Math.max(memo, getLastTimeFromEntries(sourceData.entries));
  }, 0);

  var minTime = Math.max(0, maxTime - 30);
  console.log("Time span from", minTime, maxTime);
  var curIndexes = {};
  rawData.forEach(function(sourceData) {
    if (!sourceData.entries.length) {
      return;
    }
    var sourceId = sourceData.id;
    if (minTime === 0 || sourceData.entries[0].relTime > minTime) {
      curIndexes[sourceId] = 0;
      return;
    }
    curIndexes[sourceId] = findFirstEntryIndex(sourceData.entries, minTime);
  });

  var entryBuffer = [];
  var totalEntries = 0;

  while (!isAtEnd()) {
    let nextSource = rawData.reduce(function(memo, sourceData) {
      let curEntry = sourceData.entries[curIndexes[sourceData.id]];
      if (!curEntry) {
        return memo;
      }
      if (memo === -1) {
        return {
          entry: curEntry,
          address: sourceData.address,
          bus: sourceData.bus,
          id: sourceData.id
        };
      }
      if (curEntry.relTime < memo.entry.relTime) {
        return {
          entry: curEntry,
          address: sourceData.address,
          bus: sourceData.bus,
          id: sourceData.id
        };
      }
      return memo;
    }, -1);
    if (nextSource === -1) {
      break;
    }
    curIndexes[nextSource.id]++;
    totalEntries++;

    entryBuffer.push(makeEntry(nextSource));

    if (entryBuffer.length > 5000) {
      self.postMessage({
        progress: 100 * (totalEntries / totalSize),
        logData: entryBuffer.join("\n"),
        shouldClose: false
      });
      entryBuffer = [];
    }
  }
  if (entryBuffer.length > 0) {
    self.postMessage({
      progress: 99,
      logData: entryBuffer.join("\n"),
      shouldClose: false
    });
    entryBuffer = [];
  }

  console.log("Wrote", totalEntries, "lines of CSV");
  self.postMessage({
    progress: 100,
    shouldClose: true
  });

  function isAtEnd() {
    return rawData.reduce(
      (memo, sourceData) =>
        memo && curIndexes[sourceData.id] >= sourceData.entries.length
    );
  }
}

function makeEntry(nextSource) {
  return [
    nextSource.entry.relTime,
    nextSource.address,
    nextSource.bus,
    nextSource.entry.hexData
  ].join(",");
}

function findFirstEntryIndex(entries, minTime, start, length) {
  start = start || entries.length / 2;
  start = ~~start; // round down
  length = length || entries.length / 2;
  length = Math.round(length); // round up

  if (start === 0) {
    return 0;
  }
  if (start >= entries.length - 1) {
    return entries.length - 1;
  }

  if (entries[start].relTime < minTime) {
    // this entry is too early for the 30s window
    return findFirstEntryIndex(
      entries,
      minTime,
      ~~(start + length / 2),
      length / 2
    );
  }
  if (entries[start].relTime >= minTime) {
    // this entry is within the window! check if it's the first one in the window, else keep searching
    if (entries[start - 1].relTime >= minTime) {
      return findFirstEntryIndex(
        entries,
        minTime,
        ~~(start - length / 2),
        length / 2
      );
    }
    return start;
  }
}

function getLastTimeFromEntries(entries) {
  if (!entries.length) {
    return 0;
  }
  return entries[entries.length - 1].relTime;
}

self.onmessage = function(e) {
  console.log("onmessage worker");
  self.postMessage({
    progress: 0,
    logData: "time,addr,bus,data",
    shouldClose: false
  });
  const {
    base,
    parts,
    data,
    canStartTime,
    prevMsgEntries,
    maxByteStateChangeCount
  } = e.data;

  // const dbc = new DBC(dbcText);
  // saveDBC(dbc, base, num, canStartTime);
  if (data) {
    // has raw data from live mode, process this instead
    console.log("Using raw data from memory", canStartTime);
    transformAndSend(data, canStartTime);
  } else {
    console.log("Fetching data using CanApi");
    fetchAndPostData(base, parts[0], parts, canStartTime);
  }
};
