global.__JEST__ = 1;

import DbcUpload from "../../components/DbcUpload";
import React from "react";
import { shallow, mount, render } from "enzyme";

test("DbcUpload successfully mounts with minimal default props", () => {
  const component = shallow(<DbcUpload />);
  expect(component.exists()).toBe(true);
});
