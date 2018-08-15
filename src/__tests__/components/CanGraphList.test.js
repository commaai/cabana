global.__JEST__ = 1;

import CanGraphList from "../../components/CanGraphList";
import React from "react";
import { shallow, mount, render } from "enzyme";

import { Provider } from "react-redux";
import createStore from "../../store";
const store = createStore();

test("CanGraphList successfully mounts with minimal default props", () => {
  const component = shallow(
    <Provider store={store}>
      <CanGraphList
        plottedSignals={[]}
        messages={{}}
        graphData={[]}
        onGraphTimeClick={() => {}}
        seekTime={0}
        onSegmentChanged={() => {}}
        onSignalUnplotPressed={() => {}}
        segment={[]}
        mergePlots={() => {}}
        live={true}
      />
    </Provider>
  );
  expect(component.exists()).toBe(true);
});
