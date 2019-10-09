/* eslint-env jest */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { shallow, mount, render } from 'enzyme';
import { StyleSheetTestUtils } from 'aphrodite';
import CanExplorer from '../../CanExplorer';
import Explorer from '../../components/Explorer';
import AcuraDbc from '../../acura-dbc';

jest.mock('aphrodite/lib/inject');
jest.mock('../../components/HLS.js');
jest.mock('hls.js');

global.document.querySelector = jest.fn();

describe('CanExplorer', () => {
  const props = {
    max: 12,
    url: 'https://chffrprivate.blob.core.windows.net/chffrprivate3-permanent/v2/cb38263377b873ee/78392b99580c5920227cc5b43dff8a70_2017-06-12--18-51-47',
    name: '2017-06-12--18-51-47',
    dongleId: 'cb38263377b873ee',
    dbc: AcuraDbc,
    isDemo: true,
    dbcFilename: 'acura_ilx_2016_can.dbc',
    autoplay: true
  };

  it('renders', () => {
    /*
    dongleId: PropTypes.string,
    name: PropTypes.string,
    dbc: PropTypes.instanceOf(DBC),
    dbcFilename: PropTypes.string,
    githubAuthToken: PropTypes.string,
    autoplay: PropTypes.bool,
    max: PropTypes.number,
    url: PropTypes.string,
    startTime: PropTypes.number,
    segments: PropTypes.array
    */
    const canExplorer = mount(<CanExplorer {...props} />);
    expect(canExplorer.exists()).toBe(true);
    expect(canExplorer.find(Explorer).length).toBe(1);
    canExplorer.unmount();
  });

  it('passes props to Explorer', () => {
    const canExplorer = mount(<CanExplorer {...props} segments={[123, 321]} startTime={150} />);
    expect(canExplorer.find(Explorer).length).toBe(1);
    expect(canExplorer.exists()).toBe(true);
    expect(canExplorer.find(Explorer).prop('startSegments')).toBe(canExplorer.prop('segments'));
    expect(canExplorer.find(Explorer).prop('startTime')).toBe(canExplorer.prop('startTime'));
    canExplorer.unmount();
  });
});
