import React from "react";
import { shallow, mount, render } from "enzyme";
import PartSelector from "../../components/PartSelector";

global.__JEST__ = 1;

test("PartSelector successfully mounts with minimal default props", () => {
  const component = shallow(
    <PartSelector onPartChange={() => {}} partsCount={0} selectedPart={0} />
  );
  expect(component.exists()).toBe(true);
});
