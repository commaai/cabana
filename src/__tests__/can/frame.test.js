import Frame from "../../models/can/frame";

const FRAME_HEADER = "BO_ 255 SOME_FRAME: 5 ADAS";

test("Frame.header() returns spec compliant representation", () => {
  const frame = new Frame({
    name: "SOME_FRAME",
    id: 255,
    size: 5,
    transmitters: ["ADAS"]
  });
  expect(frame.header()).toEqual(FRAME_HEADER);
});
