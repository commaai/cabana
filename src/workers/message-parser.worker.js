import DBC from '../models/can/dbc';
import DbcUtils from '../utils/dbc';

function reparseEntry(entry, address, dbc, canStartTime) {
    const data = Buffer.from(entry.hexData, 'hex');
    return DbcUtils.parseMessage(dbc, entry.time, address, data, canStartTime);
}

self.onmessage = function(e) {
    const {message, dbcText, canStartTime} = e.data;
    const dbc = new DBC(dbcText);
    for(var i = 0; i < message.entries.length; i++) {
        const entry = message.entries[i];
        const newEntry = reparseEntry(entry, message.address, dbc, canStartTime);

        message.entries[i] = newEntry;
    }

    self.postMessage(message);
    self.close();
}
