import ArrayUtils from "../utils/array";
import { CAN_GRAPH_MAX_POINTS } from "../config";

function _calcGraphData(msg, signalUid, firstCanTime) {
  if (!msg) return null;

  const signal = Object.values(msg.frame.signals).find(
    s => s.uid === signalUid
  );
  if (!signal) {
    console.warn("_calcGraphData: no signal", signalUid, msg);
    return null;
  }
  let samples = [];
  let skip = Math.floor(msg.entries.length / CAN_GRAPH_MAX_POINTS);

  if (skip === 0) {
    samples = msg.entries;
  } else {
    for (let i = 0; i < msg.entries.length; i += skip) {
      samples.push(msg.entries[i]);
    }
    // Always include last message entry, which faciliates graphData comparison
    samples.push(msg.entries[msg.entries.length - 1]);
  }
  if (!samples.length) {
    return [];
  }
  // sorting these doesn't fix the phantom lines
  let lastEntry = samples[0].relTime;
  return samples
    .filter(e => e.signals[signal.name] !== undefined)
    .map(entry => {
      if (entry.relTime - lastEntry > 2) {
        signalUid = Math.random().toString(36);
      }
      lastEntry = entry.relTime;
      // console.log(entry.relTime - lastEntry);
      return {
        x: entry.time,
        relTime: entry.relTime,
        y: entry.signals[signal.name],
        unit: signal.unit,
        color: `rgba(${signal.colors.join(",")}, 0.5)`,
        signalName: signal.name,
        signalUid
      };
    });
}

function appendNewGraphData(plottedSignals, graphData, messages, firstCanTime) {
  const messagesPerPlot = plottedSignals.map(plottedMessages =>
    plottedMessages.reduce((messages, { messageId, signalUid }) => {
      messages.push(messageId);
      return messages;
    }, [])
  );

  const extendedPlots = messagesPerPlot
    .map((plottedMessageIds, index) => {
      return { plottedMessageIds, index };
    }) // preserve index so we can look up graphData
    .filter(({ plottedMessageIds, index }) => {
      if (index < graphData.length) {
        let maxGraphTime = 0;
        const { series } = graphData[index];
        if (series.length > 0) {
          maxGraphTime = series[graphData[index].series.length - 1].relTime;
        }

        return plottedMessageIds.some(
          messageId =>
            (messages[messageId].entries.length > 0 && series.length === 0) ||
            messages[messageId].entries.some(e => e.relTime > maxGraphTime)
        );
      } else {
        return false;
      }
    })
    .map(({ plottedMessageIds, index }) => {
      plottedMessageIds = plottedMessageIds.reduce((arr, messageId) => {
        if (arr.indexOf(messageId) === -1) {
          arr.push(messageId);
        }
        return arr;
      }, []);
      return { plottedMessageIds, index };
    });

  extendedPlots.forEach(({ plottedMessageIds, index }) => {
    const signalUidsByMessageId = plottedSignals[index].reduce(
      (obj, { messageId, signalUid }) => {
        if (!obj[messageId]) {
          obj[messageId] = [];
        }
        obj[messageId].push(signalUid);
        return obj;
      },
      {}
    );
    const { series } = graphData[index];
    const graphDataMaxMessageTimes = plottedMessageIds.reduce(
      (obj, messageId) => {
        const signalUids = signalUidsByMessageId[messageId];
        const maxIndex = ArrayUtils.findIndexRight(series, entry => {
          return signalUids.indexOf(entry.signalUid) !== -1;
        });
        if (maxIndex) {
          obj[messageId] = series[maxIndex].relTime;
        } else if (series.length > 0) {
          obj[messageId] = series[series.length - 1].relTime;
        } else {
          // Graph data is empty
          obj[messageId] = -1;
        }

        return obj;
      },
      {}
    );

    let newGraphData = [];
    plottedMessageIds
      .map(messageId => {
        return { messageId, entries: messages[messageId].entries };
      })
      .filter(
        (
          { messageId, entries } // Filter to only messages with stale graphData
        ) =>
          entries[entries.length - 1].relTime >
          graphDataMaxMessageTimes[messageId]
      )
      .forEach(({ messageId, entries }) => {
        // Compute and append new graphData
        let firstNewEntryIdx = entries.findIndex(
          entry => entry.relTime > graphDataMaxMessageTimes[messageId]
        );

        const newEntries = entries.slice(firstNewEntryIdx);
        signalUidsByMessageId[messageId].forEach(signalUid => {
          const signalGraphData = _calcGraphData(
            {
              ...messages[messageId],
              entries: newEntries
            },
            signalUid,
            firstCanTime
          );

          newGraphData = newGraphData.concat(signalGraphData);
        });
      });

    const messageIdOutOfBounds =
      series.length > 0 &&
      plottedMessageIds.find(
        messageId =>
          messages[messageId].entries.length > 0 &&
          series[0].relTime < messages[messageId].entries[0].relTime
      );
    graphData[index] = {
      series: graphData[index].series.concat(newGraphData),
      updated: Date.now()
    };

    if (messageIdOutOfBounds) {
      const graphDataLowerBound = graphData[index].series.findIndex(
        e => e.relTime > messages[messageIdOutOfBounds].entries[0].relTime
      );

      if (graphDataLowerBound) {
        graphData[index].series = graphData[index].series.slice(
          graphDataLowerBound
        );
      }
    }
  });

  return [...graphData];
}

export default { _calcGraphData, appendNewGraphData };
