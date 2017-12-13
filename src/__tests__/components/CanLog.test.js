global.__JEST__ = 1;

import CanLog from "../../components/CanLog";
import React from "react";
import { shallow, mount, render } from "enzyme";

test("CanLog successfully mounts with minimal default props", () => {
  const component = shallow(
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
  );
  expect(component.exists()).toBe(true);
});
