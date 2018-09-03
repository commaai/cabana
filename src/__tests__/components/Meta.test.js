global.__JEST__ = 1;

import Meta from "../../components/Meta";
import React from "react";
import { shallow, mount, render } from "enzyme";

test("Meta successfully mounts with minimal default props", () => {
  const component = shallow(
    <Meta
      url={null}
      messages={{}}
      selectedMessages={[]}
      updateSelectedMessages={() => {}}
      showEditMessageModal={() => {}}
      currentParts={[]}
      onMessageSelected={() => {}}
      onMessageUnselected={() => {}}
      showLoadDbc={() => {}}
      showSaveDbc={() => {}}
      dbcFilename={null}
      dbcLastSaved={null}
      dongleId={null}
      name={null}
      route={null}
      seekTime={0}
      seekIndex={0}
      maxByteStateChangeCount={0}
      isDemo={false}
      live={true}
    />
  );
  expect(component.exists()).toBe(true);
});
