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
  var minPart = currentPart;
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

  await prevPart;
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
    canStartTime,
    prevMsgEntries,
    maxByteStateChangeCount
  } = e.data;

  // const dbc = new DBC(dbcText);
  // saveDBC(dbc, base, num, canStartTime);
  fetchAndPostData(base, parts[0], parts, canStartTime);
};
