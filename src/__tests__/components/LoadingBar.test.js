import React from "react";
import { shallow, mount, render } from "enzyme";
import LoadingBar from "../../components/LoadingBar";

test("LoadingBar successfully mounts with minimal default props", () => {
  const component = shallow(<LoadingBar />);
  expect(component.exists()).toBe(true);
});
