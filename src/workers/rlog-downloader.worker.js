/* eslint-env worker */
/* eslint-disable no-restricted-globals, no-param-reassign */
import LogStream from '@commaai/log_reader';
import { timeout } from 'thyming';

import { getLogPart } from '../api/rlog';
import DbcUtils from '../utils/dbc';
import DBC from '../models/can/dbc';
import { addressForName } from '../models/can/logSignals';
import {
  getFlags,
  getUbloxGnss,
  getEgoData,
  getCarStateControls,
  getWheelSpeeds,
  getCarControlActuators,
  getRadarStateLeadOne,
  getRadarStateLeadTwo,
  getThermalFreeSpace,
  getThermalData,
  getThermalCPU,
  getHealth
} from './rlog-utils';

const DEBOUNCE_DELAY = 100;

function sendBatch(entry) {
  delete entry.batching;
  const { messages, thumbnails } = entry;
  entry.messages = {};
  entry.thumbnails = [];

  let { maxByteStateChangeCount, routeInitTime, firstFrameTime } = entry.options;
  const newMaxByteStateChangeCount = DbcUtils.findMaxByteStateChangeCount(
    messages
  );
  if (newMaxByteStateChangeCount > maxByteStateChangeCount) {
    maxByteStateChangeCount = newMaxByteStateChangeCount;
  }

  Object.keys(messages).forEach((key) => {
    // console.log(key);
    messages[key] = DbcUtils.setMessageByteColors(
      messages[key],
      maxByteStateChangeCount
    );
  });

  self.postMessage({
    newMessages: messages,
    newThumbnails: thumbnails,
    isFinished: entry.ended,
    maxByteStateChangeCount,
    routeInitTime,
    firstFrameTime,
  });

  if (entry.ended) {
    console.log('Sending finished');
    close();
  }
}

function queueBatch(entry) {
  if (!entry.batching) {
    entry.batching = timeout(entry.sendBatch, DEBOUNCE_DELAY);
  }
}

function getPrevMsgEntry(messages, prevMsgEntries, id) {
  if (messages[id].entries.length) {
    return messages[id].entries[messages[id].entries.length - 1];
  }
  return prevMsgEntries[id] || null;
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

  const msgEntry = {
    time: logTime,
    address,
    data: getData(),
    timeStart: entry.options.routeInitTime
  };

  entry.messages[id].entries.push(msgEntry);
}

function insertCanMessage(entry, logTime, msg) {
  const src = msg.Src;
  const address = Number(msg.Address);
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

  const msgEntry = {
    time: logTime,
    address,
    data: msg.Dat,
    timeStart: entry.options.routeInitTime
  };

  entry.messages[id].entries.push(msgEntry);

  // console.log(id);
}

async function loadData(entry) {
  let url = null;

  if (!entry.options.isLegacyShare) {
    url = entry.logUrls[entry.part];
  }

  if (!url || url.indexOf('.7z') !== -1) {
    self.postMessage({
      error: 'Invalid or missing log files'
    });
    return;
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

  logReader((msg) => {
    if (entry.ended) {
      console.log('You can get msgs after end', msg);
    }
    if ('InitData' in msg) {
      if (entry.options.routeInitTime == null) {
        entry.options.routeInitTime = msg.LogMonoTime / 1e9;
      }
    } else if (entry.part === 0 && 'Frame' in msg) {
      if (entry.options.firstFrameTime == null) {
        entry.options.firstFrameTime = msg.Frame.TimestampEof / 1e9;
      }
    } else if ('Can' in msg) {
      const monoTime = msg.LogMonoTime / 1000000000;
      msg.Can.forEach((m) => insertCanMessage(entry, monoTime, m));
    } else if ('CarState' in msg) {
      const monoTime = msg.LogMonoTime / 1000000000;
      insertEventData(
        'CarState',
        'Ego',
        entry,
        monoTime,
        (m) => getEgoData(msg.CarState, m)
      );
      insertEventData(
        'CarState',
        'Controls',
        entry,
        monoTime,
        (m) => getCarStateControls(msg.CarState, m)
      );
      insertEventData(
        'CarState',
        'Flags',
        entry,
        monoTime,
        (m) => getFlags(msg.CarState, m)
      );
      insertEventData(
        'CarState',
        'WheelSpeeds',
        entry,
        monoTime,
        (m) => getWheelSpeeds(msg.CarState, m)
      );
    } else if ('CarControl' in msg) {
      const monoTime = msg.LogMonoTime / 1000000000;
       insertEventData(
        'CarControl',
        'Actuators',
        entry,
        monoTime,
        (m) => getCarControlActuators(msg.CarControl, m)
      );
    } else if ('RadarState' in msg) {
      const monoTime = msg.LogMonoTime / 1000000000;
       insertEventData(
        'RadarState',
        'LeadOne',
        entry,
        monoTime,
        (m) => getRadarStateLeadOne(msg.RadarState, m)
      );
       insertEventData(
        'RadarState',
        'LeadTwo',
        entry,
        monoTime,
        (m) => getRadarStateLeadTwo(msg.RadarState, m)
      );
    } else if ('UbloxGnss' in msg) {
      const monoTime = msg.LogMonoTime / 1000000000;
      if (msg.UbloxGnss.MeasurementReport) {
        insertEventData(
          'UbloxGnss',
          'MeasurementReport',
          entry,
          monoTime,
          (m) => getUbloxGnss(msg.UbloxGnss.MeasurementReport, m)
        );
      }
    } else if ('Health' in msg) {
      const monoTime = msg.LogMonoTime / 1000000000;
      insertEventData(
        'Health',
        'Data',
        entry,
        monoTime,
        (m) => getHealth(msg.Health, m)
      );
    } else if ('Thermal' in msg) {
      const monoTime = msg.LogMonoTime / 1000000000;
      insertEventData(
        'Thermal',
        'CPU',
        entry,
        monoTime,
        (m) => getThermalCPU(msg.Thermal, m)
      );
      insertEventData(
        'Thermal',
        'Data',
        entry,
        monoTime,
        (m) => getThermalData(msg.Thermal, m)
      );
      insertEventData(
        'Thermal',
        'FreeSpace',
        entry,
        monoTime,
        (m) => getThermalFreeSpace(msg.Thermal, m)
      );
    } else if ('Thumbnail' in msg) {
      const monoTime = msg.LogMonoTime / 1000000000 - entry.options.routeInitTime;
      const data = new Uint8Array(msg.Thumbnail.Thumbnail);
      entry.thumbnails.push({ data, monoTime });
    } else {
      // console.log(Object.keys(msg));
      return;
    }
    queueBatch(entry);
  });
}

function CacheEntry(options) {
  options = options || {};
  this.options = options;

  const {
    route, part, dbc, logUrls
  } = options;

  this.messages = {};
  this.thumbnails = [];
  this.route = route;
  this.part = part;
  this.dbc = dbc;
  this.logUrls = logUrls;
  this.sendBatch = (m) => sendBatch(this, m);
  this.loadData = (m) => loadData(this, m);
}

function handleMessage(msg) {
  const options = msg.data;

  if (options.action === 'terminate') {
    close();
    return;
  }

  options.dbc = new DBC(options.dbcText);

  const entry = new CacheEntry(options);
  // load in the data!
  entry.loadData();
}

self.onmessage = handleMessage;
