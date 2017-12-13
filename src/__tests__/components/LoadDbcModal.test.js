global.__JEST__ = 1;

import React from "react";
import { shallow, mount, render } from "enzyme";

import LoadDbcModal from "../../components/LoadDbcModal";
import OpenDbc from "../../api/OpenDbc";

test("LoadDbcModal successfully mounts with minimal default props", () => {
  const openDbcClient = new OpenDbc(null);
  const component = shallow(
    <LoadDbcModal
      onDbcSelected={() => {}}
      handleClose={() => {}}
      openDbcClient={openDbcClient}
      loginWithGithub={<p>Login with github</p>}
    />
  );
  expect(component.exists()).toBe(true);
});
