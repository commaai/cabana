global.__JEST__ = 1;
import CanExplorer from "../../CanExplorer";
import React from "react";
import { shallow, mount, render } from "enzyme";
import { StyleSheetTestUtils } from "aphrodite";

import createStore from "../../store";
const store = createStore();

test("CanExplorer renders", () => {
  const canExplorer = shallow(<CanExplorer store={store} />);
});
