global.__JEST__ = 1;

import PlayButton from "../../components/PlayButton";
import React from "react";
import { shallow, mount, render } from "enzyme";

test("PlayButton successfully mounts with minimal default props", () => {
  const component = shallow(<PlayButton />);
  expect(component.exists()).toBe(true);
});
