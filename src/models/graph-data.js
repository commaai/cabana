import ArrayUtils from '../utils/array';
import {CAN_GRAPH_MAX_POINTS} from '../config';

function _calcGraphData(msg, signalName, firstCanTime) {
    if(!msg) return null;

    let samples = [];
    let skip = Math.floor(msg.entries.length / CAN_GRAPH_MAX_POINTS);

    if(skip === 0){
        samples = msg.entries;
    } else {
        for(let i = 0; i < msg.entries.length; i += skip) {
            samples.push(msg.entries[i]);
        }
    }
    return samples.filter((e) => e.signals[signalName] !== undefined)
                  .map((entry) => {
                return {x: entry.time,
                        relTime: entry.time - firstCanTime,
                        y: entry.signals[signalName],
                        unit: msg.frame.signals[signalName].unit,
                        color: `rgba(${msg.frame.signals[signalName].colors().join(",")}, 0.5)`,
                        signalName}
    });
}

function appendNewGraphData(plottedSignals, graphData, messages, firstCanTime) {
     const messagesPerPlot = plottedSignals.map((plottedMessages) =>
            plottedMessages.reduce((messages,
               {messageId, signalName}) => {
                   messages.push(messageId);
                   return messages;
            }, [])
        );

    const extendedPlots = messagesPerPlot
        .map((plottedMessageIds, index) => {return {plottedMessageIds, index}}) // preserve index so we can look up graphData
        .filter(({plottedMessageIds, index}) => {
            if(index < graphData.length) {
                let maxGraphTime = 0;
                if(graphData[index].length > 0) {
                    maxGraphTime = graphData[index][graphData[index].length - 1].relTime;
                }
                return plottedMessageIds.some((messageId) =>
                    (messages[messageId].entries.length > 0 && graphData[index].length === 0)
                    ||
                    messages[messageId].entries.some((e) => e.relTime > maxGraphTime));
            } else {
                return false;
            }
    }).map(({plottedMessageIds, index}) => {
        plottedMessageIds = plottedMessageIds.reduce((arr, messageId) => {
            if(arr.indexOf(messageId) === -1) {
                arr.push(messageId);
            }
            return arr;
        }, []);
        return {plottedMessageIds, index};
    });

    extendedPlots.forEach(({plottedMessageIds, index}) => {
        const signalNamesByMessageId = plottedSignals[index].reduce((obj, {messageId, signalName}) => {
            if(!obj[messageId]) {
                obj[messageId] = []
            }
            obj[messageId].push(signalName);
            return obj;
        }, {});
        const graphDataMaxMessageTimes = plottedMessageIds.reduce((obj, messageId) => {
            const signalNames = signalNamesByMessageId[messageId];
            const maxIndex = ArrayUtils.findIndexRight(graphData[index], (entry) => {
                return signalNames.indexOf(entry.signalName) !== -1
            });
            if(maxIndex) {
                obj[messageId] = graphData[index][maxIndex].relTime;
            } else if(graphData[index].length > 0) {
                obj[messageId] = graphData[index][graphData[index].length - 1].relTime;
            } else {
                // Graph data is empty
                obj[messageId] = -1;
            }

            return obj;
        }, {});

        let newGraphData = [];
        plottedMessageIds.map((messageId) => {
                return { messageId, entries: messages[messageId].entries }
            }).filter(({messageId, entries}) => // Filter to only messages with stale graphData
                entries[entries.length - 1].relTime > graphDataMaxMessageTimes[messageId])
            .forEach(({messageId, entries}) => { // Compute and append new graphData
                let firstNewEntryIdx =  entries.findIndex((entry) =>
                    entry.relTime > graphDataMaxMessageTimes[messageId]);

                const newEntries = entries.slice(firstNewEntryIdx);
                signalNamesByMessageId[messageId].forEach((signalName) => {
                    const signalGraphData = _calcGraphData({...messages[messageId],
                                                                 entries: newEntries},
                                                           signalName,
                                                           firstCanTime);

                    newGraphData = newGraphData.concat(signalGraphData);
                });
        });

        const messageIdOutOfBounds = (
            graphData[index].length > 0
            && plottedMessageIds.find((messageId) =>
                messages[messageId].entries.length > 0
                && graphData[index][0].relTime < messages[messageId].entries[0].relTime));
        graphData[index] = graphData[index].concat(newGraphData)

        if(messageIdOutOfBounds) {
            const graphDataLowerBound = graphData[index].findIndex(
                (e) => e.relTime > messages[messageIdOutOfBounds].entries[0].relTime);

            if(graphDataLowerBound) {
                graphData[index] = graphData[index].slice(graphDataLowerBound);
            }
        }
    });

    return graphData;
}

export default {_calcGraphData, appendNewGraphData};