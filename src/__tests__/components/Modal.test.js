global.__JEST__ = 1;

import Modal from "../../components/Modal";
import React from "react";
import { shallow, mount, render } from "enzyme";

test("Modal successfully mounts with minimal default props", () => {
  const component = shallow(<Modal />);
  expect(component.exists()).toBe(true);
});
