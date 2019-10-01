function findTimeIndex(entries, time) {
  return entries.findIndex(e => e.time >= time);
}

function findRelativeTimeIndex(entries, relTime) {
  return entries.findIndex(e => e.relTime >= relTime);
}

function findSegmentIndices(
  entries,
  [segmentTimeLow, segmentTimeHi],
  isRelative
) {
  /*
    Finds pair of indices (inclusive, exclusive) within entries array
    whose timestamps match segmentTimeLow and segmentTimeHi.
    if isRelative === true, then the segment times
    are assumed to correspond to the `relTime` field of each entry.

    Returns `[segmentIdxLow, segmentIdxHigh]`
             (inclusive, exclusive)
    */
  let timeIndexFunc =
    isRelative === true ? findRelativeTimeIndex : findTimeIndex;

  const segmentIdxLow = Math.max(0, timeIndexFunc(entries, segmentTimeLow));

  const upperSegments = entries.slice(segmentIdxLow);
  let upperSegmentIdxHi = timeIndexFunc(upperSegments, segmentTimeHi);
  const segmentIdxHi =
    upperSegmentIdxHi >= 0
      ? upperSegmentIdxHi + segmentIdxLow + 1
      : entries.length - 1;

  return [
    segmentIdxLow,
    Math.max(0, Math.min(segmentIdxHi, entries.length - 1))
  ];
}

export default { findTimeIndex, findRelativeTimeIndex, findSegmentIndices };
