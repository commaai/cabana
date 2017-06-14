function findTimeIndex(entries, time) {
    return entries.findIndex((e) => e.time >= time);
}

function findSegmentIndices(entries, [segmentTimeLow, segmentTimeHi]) {
    /*
    Finds pair of indices (inclusive, exclusive) within entries array
    whose timestamps match segmentTimeLow and segmentTimeHi.

    Returns `[segmentIdxLow, segmentIdxHigh]`
            (inclusive, exclusive)
    */

    const segmentIdxLow = findTimeIndex(entries, segmentTimeLow);

    const upperSegments = entries.slice(segmentIdxLow);
    let upperSegmentIdxHi = findTimeIndex(upperSegments, segmentTimeHi);
    const segmentIdxHi = (upperSegmentIdxHi ? upperSegmentIdxHi + segmentIdxLow + 1 : entries.length)

    return [segmentIdxLow, segmentIdxHi]
}

export default {findTimeIndex, findSegmentIndices};