global.__JEST__ = 1;

import PartSelector from "../../components/PartSelector";
import React from "react";
import { shallow, mount, render } from "enzyme";

import { Provider } from "react-redux";
import createStore from "../../store";
const store = createStore();

test("PartSelector successfully mounts with minimal default props", () => {
  const component = shallow(
    <Provider store={store}>
      <PartSelector onPartChange={() => {}} partsCount={0} />
    </Provider>
  );
  expect(component.exists()).toBe(true);
});
