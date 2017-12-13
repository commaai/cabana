global.__JEST__ = 1;
import DBC from "../../models/can/dbc";
import Signal from "../../models/can/signal";

test("setting signals should create a message", () => {
  const dbc = new DBC();
  dbc.setSignals(100, { "My Signal": new Signal({ name: "My Signal" }) });

  expect(dbc.messages.has(100)).toBe(true);
});

test("setting signals should update DBC.boardUnits", () => {
  const dbc = new DBC();
  dbc.setSignals(100, {
    "My Signal": new Signal({ name: "My Signal", receiver: ["NEO"] })
  });

  expect(dbc.boardUnits.map(bu => bu.name).indexOf("NEO")).toBe(0);
});

test("adding a signal should update DBC.boardUnits", () => {
  const dbc = new DBC();
  dbc.createFrame(100);
  dbc.addSignal(100, new Signal({ name: "My Signal", receiver: ["NEO"] }));

  expect(dbc.boardUnits.map(bu => bu.name).indexOf("NEO")).toBe(0);
});
