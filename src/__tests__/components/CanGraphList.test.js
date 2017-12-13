global.__JEST__ = 1;

import CanGraphList from "../../components/CanGraphList";
import React from "react";
import { shallow, mount, render } from "enzyme";

test("CanGraphList successfully mounts with minimal default props", () => {
  const component = shallow(
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
  );
  expect(component.exists()).toBe(true);
});
