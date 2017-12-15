import HLS from "../../components/HLS";
import React from "react";
import { shallow, mount, render } from "enzyme";

test("HLS successfully mounts with minimal default props", () => {
  const component = shallow(
    <HLS
      source={"http://comma.ai"}
      startTime={0}
      playbackSpeed={1}
      onVideoElementAvailable={() => {}}
      playing={false}
      onClick={() => {}}
      onLoadStart={() => {}}
      onLoadEnd={() => {}}
      onUserSeek={() => {}}
      onPlaySeek={() => {}}
      segmentProgress={() => {}}
      shouldRestart={false}
      onRestart={() => {}}
    />
  );
  expect(component.exists()).toBe(true);
});
