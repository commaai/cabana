global.__JEST__ = 1;

import SignalLegend from "../../components/SignalLegend";
import React from "react";
import { shallow, mount, render } from "enzyme";

test("SignalLegend successfully mounts with minimal default props", () => {
  const component = shallow(
    <SignalLegend
      signals={{}}
      signalStyles={{}}
      highlightedSignal={null}
      onSignalHover={() => {}}
      onSignalHoverEnd={() => {}}
      onTentativeSignalChange={() => {}}
      onSignalChange={() => {}}
      onSignalRemove={() => {}}
      onSignalPlotChange={() => {}}
      plottedSignals={[]}
    />
  );
  expect(component.exists()).toBe(true);
});
