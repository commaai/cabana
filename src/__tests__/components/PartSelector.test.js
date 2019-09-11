global.__JEST__ = 1;

import PartSelector from "../../components/PartSelector";
import React from "react";
import { shallow, mount, render } from "enzyme";

test("PartSelector successfully mounts with minimal default props", () => {
  const component = shallow(
    <PartSelector onPartChange={() => {}} partsCount={0} selectedPart={0} />
  );
  expect(component.exists()).toBe(true);
});
