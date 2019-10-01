import Entries from "../../models/can/entries";

test("segment index low is inclusive and index high is exclusive", () => {
  const entries = [
    { time: 1.0 },
    { time: 3.45 },
    { time: 3.65 },
    { time: 5.55 }
  ];
  const [segmentIdxLow, segmentIdxHi] = Entries.findSegmentIndices(entries, [
    3.45,
    5.55
  ]);

  expect(segmentIdxLow).toBe(1);
  expect(segmentIdxHi).toBe(entries.length - 1);
});

test("segment index cant return negative indexes", () => {
  var indices = Entries.findSegmentIndices([], [123, 321], true);
  expect(indices[0]).toBe(0);
  expect(indices[1]).toBe(0);
});
