global.__JEST__ = 1;

import CanGraph from "../../components/CanGraph";
import React from "react";
import { shallow, mount, render } from "enzyme";

test("CanGraph successfully mounts with minimal default props", () => {
  const component = shallow(
    <CanGraph
      onGraphRefAvailable={() => {}}
      unplot={() => {}}
      messages={{}}
      messageId={null}
      messageName={null}
      signalSpec={null}
      onSegmentChanged={() => {}}
      segment={[]}
      data={{}}
      onRelativeTimeClick={() => {}}
      currentTime={0}
      onDragStart={() => {}}
      onDragEnd={() => {}}
      container={null}
      dragPos={null}
      canReceiveGraphDrop={false}
      plottedSignals={[]}
      live={true}
    />
  );
  expect(component.exists()).toBe(true);
});
