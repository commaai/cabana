import DBC, { swapOrder } from "../../models/can/dbc";
import fs from "fs";
import path from "path";

const ACURA_DBC = fs.readFileSync("src/__tests__/res/acura.dbc", "utf-8");
//import { TESLA_DBC } from "../res/tesla.dbc";

test("DBC.text() for acura DBC should be equivalent to its original text", () => {
  const dbc = new DBC(ACURA_DBC);

  expect(dbc.text()).toBe(ACURA_DBC);
});
