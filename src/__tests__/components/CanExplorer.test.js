global.__JEST__ = 1;
import CanExplorer from "../../CanExplorer";
import React from "react";
import { shallow, mount, render } from "enzyme";
import { StyleSheetTestUtils } from "aphrodite";

test("CanExplorer renders", () => {
  const canExplorer = shallow(<CanExplorer />);
});
