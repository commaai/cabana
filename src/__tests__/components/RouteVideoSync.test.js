global.__JEST__ = 1;

import API from "@commaai/comma-api";
import RouteVideoSync from "../../components/RouteVideoSync";
import React from "react";
import { shallow, mount, render } from "enzyme";
import { StyleSheetTestUtils } from "aphrodite";

// Prevents style injection from firing after test finishes
// and jsdom is torn down.
beforeEach(() => {
  StyleSheetTestUtils.suppressStyleInjection();
});
afterEach(() => {
  StyleSheetTestUtils.clearBufferAndResumeStyleInjection();
});

test("RouteVideoSync successfully mounts with minimal default props", () => {
  const component = shallow(
    <RouteVideoSync
      message={null}
      secondsLoaded={0}
      startOffset={0}
      segment={[]}
      seekIndex={0}
      userSeekIndex={0}
      playing={false}
      playSpeed={1}
      url={"http://comma.ai"}
      canFrameOffset={0}
      firstCanTime={0}
      onVideoClick={() => {}}
      onPlaySeek={() => {}}
      onUserSeek={() => {}}
      onPlay={() => {}}
      onPause={() => {}}
      userSeekTime={0}
    />
  );
  expect(component.exists()).toBe(true);
});
