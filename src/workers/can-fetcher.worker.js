import NumpyLoader from '../utils/loadnpy';
import DBC from '../models/can/dbc';
import DbcUtils from '../utils/dbc';
const Int64LE = require('int64-buffer').Int64LE

function createMessageSpec(dbc, address, id, bus) {
    return {name: dbc.getMessageName(address),
            address: address,
            id: id,
            bus: bus,
            entries: [],
            frame: dbc.messages.get(address)}
}

function loadCanPart(dbc, base, num, canStartTime) {
    var urls = [  base+"/Log/"+num+"/can/t",
                  base+"/Log/"+num+"/can/src",
                  base+"/Log/"+num+"/can/address",
                  base+"/Log/"+num+"/can/data"];

    var messages = {};

      Promise.all(urls.map(NumpyLoader.promise)).then((da) => {
          for (var i = 0; i < da[0].data.length; i++) {
               var t = da[0].data[i];
               var src = Int64LE(da[1].data, i*8).toString(10);
               var address = Int64LE(da[2].data, i*8);
               var addressHexStr = address.toString(16);
               var id = src + ":" + addressHexStr;

               var addressNum = address.toNumber();
               var data = da[3].data.slice(i*8, (i+1)*8);
               if (messages[id] === undefined) messages[id] = createMessageSpec(dbc, address.toNumber(), id, src);

               if(canStartTime === null) {
                  canStartTime = t;
               }
               const msg = DbcUtils.parseMessage(dbc, t, address.toNumber(), data, canStartTime);
               messages[id].entries.push(msg);
          }

          self.postMessage(messages);
          self.close();
      })
}

self.onmessage = function(e) {
    const {dbcText, base, num, canStartTime} = e.data;

    const dbc = new DBC(dbcText);
    loadCanPart(dbc, base, num, canStartTime);
}
