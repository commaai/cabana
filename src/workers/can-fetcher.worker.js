/* eslint-disable no-restricted-globals */
import Sentry from "../logging/Sentry";
import NumpyLoader from "../utils/loadnpy";
import DBC from "../models/can/dbc";
import DbcUtils from "../utils/dbc";
import * as CanApi from "../api/can";

var window = self;
require("core-js/fn/object/values");

const Int64LE = require("int64-buffer").Int64LE;

async function loadCanPart(
  dbc,
  base,
  num,
  canStartTime,
  prevMsgEntries,
  maxByteStateChangeCount
) {
  var messages = {};
  const { times, sources, addresses, datas } = await CanApi.fetchCanPart(
    base,
    num
  );

  for (var i = 0; i < times.length; i++) {
    var t = times[i];
    var src = Int64LE(sources, i * 8).toString(10);
    var address = Int64LE(addresses, i * 8);
    var addressHexStr = address.toString(16);
    var id = src + ":" + addressHexStr;

    var addressNum = address.toNumber();
    var data = datas.slice(i * 8, (i + 1) * 8);
    if (messages[id] === undefined)
      messages[id] = DbcUtils.createMessageSpec(
        dbc,
        address.toNumber(),
        id,
        src
      );

    const prevMsgEntry =
      messages[id].entries.length > 0
        ? messages[id].entries[messages[id].entries.length - 1]
        : prevMsgEntries[id] || null;

    const { msgEntry, byteStateChangeCounts } = DbcUtils.parseMessage(
      dbc,
      t,
      address.toNumber(),
      data,
      canStartTime,
      prevMsgEntry
    );
    messages[id].byteStateChangeCounts = byteStateChangeCounts.map(
      (count, idx) => messages[id].byteStateChangeCounts[idx] + count
    );

    messages[id].entries.push(msgEntry);
  }

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

  self.postMessage({
    newMessages: messages,
    maxByteStateChangeCount
  });
  self.close();
}

self.onmessage = function(e) {
  const {
    dbcText,
    base,
    num,
    canStartTime,
    prevMsgEntries,
    maxByteStateChangeCount
  } = e.data;

  const dbc = new DBC(dbcText);
  loadCanPart(
    dbc,
    base,
    num,
    canStartTime,
    prevMsgEntries,
    maxByteStateChangeCount
  );
};
