global.__JEST__ = 1;

import RouteVideoSync from "../../components/RouteVideoSync";
import React from "react";
import { shallow, mount, render } from "enzyme";
import { StyleSheetTestUtils } from "aphrodite";

import { Provider } from "react-redux";
import createStore from "../../store";
const store = createStore();

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
    <Provider store={store}>
      <RouteVideoSync
        message={null}
        secondsLoaded={0}
        startOffset={0}
        seekIndex={0}
        userSeekIndex={0}
        playing={false}
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
    </Provider>
  );
  expect(component.exists()).toBe(true);
});
