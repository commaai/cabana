// appendNewGraphData(plottedSignals, graphData, messages) {
global.__JEST__ = 1;

import GraphData from '../../models/graph-data';
import Signal from '../../models/can/signal';
import DBC from '../../models/can/dbc';
import DbcUtils from '../../utils/dbc';

function appendMockGraphData(existingGraphData) {
    const dbc = new DBC();
    const signal = new Signal({name: 'NEW_SIGNAL_1'});
    dbc.setSignals(0, {[signal.name]: signal});
    const message = DbcUtils.createMessageSpec(dbc, 0, '0', 0);
    //  time, relTime, data, byteStateChangeTimes) {
    message.entries = [DbcUtils.createMessageEntry(dbc, 0, 0, 0, Buffer.alloc(8), [])];
    const messages = {[message.id]: message};

    const plottedSignals = [[{signalName: 'NEW_SIGNAL_1', messageId: '0'}]];

    return GraphData.appendNewGraphData(plottedSignals, existingGraphData, messages, 0);
}

test('GraphData.appendNewGraphData adds messages to empty GraphData array', () => {
    const graphData = appendMockGraphData([[]]);
    expect(graphData.length).toEqual(1); // 1 plot
    expect(graphData[0].length).toEqual(1); // 1 message entry
    expect(graphData[0][0].x).toEqual(0); // message entry X value corresponds to provided time in createMessageEntry
});

test('GraphData.appendNewGraphData does not change graph data when entries are unchanged', () => {
    let graphData = [[]];
    for(let i = 0; i < 100; i++) {
        graphData = appendMockGraphData(graphData);
    }

    expect(graphData.length).toEqual(1);
    expect(graphData[0].length).toEqual(1);
});