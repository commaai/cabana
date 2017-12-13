/* eslint-env worker */
/* eslint-disable no-restricted-globals */
// import Sentry from '../logging/Sentry';

import NumpyLoader from "../utils/loadnpy";
import * as CanApi from "../api/can";

var window = self;

const Int64LE = require("int64-buffer").Int64LE;

function transformData(data) {}
async function fetchAndPostData(
  base,
  currentPart,
  [minPart, maxPart],
  canStartTime
) {
  console.log("\n\nfetchAndPostData", `${currentPart} of ${maxPart}`);

  // if we've exhausted the parts, close up shop
  if (currentPart > maxPart) {
    self.postMessage({
      progress: 100,
      shouldClose: true
    });
    self.close();
    return;
  }

  let awaitedData = null;
  try {
    awaitedData = await CanApi.fetchCanPart(base, currentPart);
  } catch (e) {
    console.log("fetchCanPart missing part", e);
    return fetchAndPostData(
      base,
      currentPart + 1,
      [minPart, maxPart],
      canStartTime
    );
  }
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
    progress: 10,
    logData,
    shouldClose: false
  });

  fetchAndPostData(base, currentPart + 1, [minPart, maxPart], canStartTime);
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
