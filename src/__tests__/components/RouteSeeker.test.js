global.__JEST__ = 1;

import RouteSeeker from "../../components/RouteSeeker";
import React from "react";
import { shallow, mount, render } from "enzyme";

test("RouteSeeker successfully mounts with minimal default props", () => {
  const component = shallow(
    <RouteSeeker
      nearestFrameTime={0}
      segmentProgress={() => {}}
      videoLength={0}
      segmentIndices={[]}
      onUserSeek={() => {}}
      onPlaySeek={() => {}}
      videoElement={null}
      onPlay={() => {}}
      onPause={() => {}}
      playing={false}
      ratioTime={() => {}}
    />
  );
  expect(component.exists()).toBe(true);
});
