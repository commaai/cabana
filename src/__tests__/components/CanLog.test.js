global.__JEST__ = 1;

import CanLog from "../../components/CanLog";
import React from "react";
import { shallow, mount, render } from "enzyme";

import { Provider } from "react-redux";
import createStore from "../../store";
const store = createStore();

test("CanLog successfully mounts with minimal default props", () => {
  const component = shallow(
    <Provider store={store}>
      <CanLog
        message={null}
        messageIndex={0}
        segmentIndices={[]}
        plottedSignals={[]}
        onSignalPlotPressed={() => {}}
        onSignalUnplotPressed={() => {}}
        showAddSignal={() => {}}
        onMessageExpanded={() => {}}
      />
    </Provider>
  );
  expect(component.exists()).toBe(true);
});
