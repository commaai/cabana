import LoadingBar from "../../components/LoadingBar";
import React from "react";
import { shallow, mount, render } from "enzyme";

test("LoadingBar successfully mounts with minimal default props", () => {
  const component = shallow(<LoadingBar />);
  expect(component.exists()).toBe(true);
});
