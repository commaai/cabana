import NumpyLoader from '../utils/loadnpy';
import DBC from '../models/can/dbc';
import DbcUtils from '../utils/dbc';
import * as CanApi from '../api/can';

const Int64LE = require('int64-buffer').Int64LE

function createMessageSpec(dbc, address, id, bus) {
    return {address: address,
            id: id,
            bus: bus,
            entries: [],
            frame: dbc.messages.get(address)}
}

async function loadCanPart(dbc, base, num, canStartTime) {
    var messages = {};
    const {times,
           sources,
           addresses,
           datas} = await CanApi.fetchCanPart(base, num);


    for (var i = 0; i < times.length; i++) {
       var t = times[i];
       var src = Int64LE(sources, i*8).toString(10);
       var address = Int64LE(addresses, i*8);
       var addressHexStr = address.toString(16);
       var id = src + ":" + addressHexStr;

       var addressNum = address.toNumber();
       var data = datas.slice(i*8, (i+1)*8);
       if (messages[id] === undefined) messages[id] = createMessageSpec(dbc, address.toNumber(), id, src);

       const msg = DbcUtils.parseMessage(dbc, t, address.toNumber(), data, canStartTime);
       messages[id].entries.push(msg);
  }

  self.postMessage(messages);
  self.close();
}

self.onmessage = function(e) {
    const {dbcText, base, num, canStartTime} = e.data;

    const dbc = new DBC(dbcText);
    loadCanPart(dbc, base, num, canStartTime);
}
