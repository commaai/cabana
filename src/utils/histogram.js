const binTimeIntervals = [
  {
    seconds: 1,
    title: "second"
  },
  {
    seconds: 60,
    title: "minute"
  },
  {
    seconds: 300,
    title: "5 minutes"
  },
  {
    seconds: 3600,
    title: "hour"
  }
];

function prettyBinDuration(samplesDurationSeconds, maxBinCount = 100) {
  for (let i = 0; i < binTimeIntervals.length; i++) {
    const interval = binTimeIntervals[i];
    if (samplesDurationSeconds / interval.seconds <= maxBinCount) {
      return interval;
    }
  }

  // maxBinCount is exceeded.
  // This means sampleDurationSeconds > 100 hours with default args. Quite a long trip.
  // Just going to use hours.

  return binTimeIntervals[3];
}

export function binMessages(messageEntries, segmentIndices) {
  let startIdx = 0,
    endIdx = messageEntries.length - 1;
  if (segmentIndices && segmentIndices.length === 2) {
    [startIdx, endIdx] = segmentIndices;
  }
  const first = messageEntries[startIdx],
    last = messageEntries[endIdx];
  const binDuration = prettyBinDuration(last.time - first.time);

  const bins = [];
  const offset = first.time - first.relTime;

  for (let t = first.time; t < last.time; t += binDuration.seconds) {
    const binCutoffTime = t + binDuration.seconds;
    const previousBinEnd = startIdx;

    let entry = { time: -1 };
    while (entry !== undefined && entry.time < binCutoffTime) {
      entry = messageEntries[startIdx];
      ++startIdx;
    }

    bins.push({
      count: startIdx - previousBinEnd,
      startTime: t,
      endTime: binCutoffTime,
      relStartTime: t - offset
    });
  }

  return { bins: bins, binDuration };
}
