global.__JEST__ = 1;

import React from "react";
import { shallow, mount, render } from "enzyme";

import SaveDbcModal from "../../components/SaveDbcModal";
import OpenDbc from "../../api/OpenDbc";
import DBC from "../../models/can/dbc";

test("SaveDbcModal successfully mounts with minimal default props", () => {
  const openDbcClient = new OpenDbc(null);
  const dbc = new DBC();
  const component = shallow(
    <SaveDbcModal
      dbc={dbc}
      sourceDbcFilename={""}
      onDbcSaved={() => {}}
      handleClose={() => {}}
      openDbcClient={openDbcClient}
      hasGithubAuth={false}
      loginWithGithub={<p>Login with github</p>}
    />
  );
  expect(component.exists()).toBe(true);
});
