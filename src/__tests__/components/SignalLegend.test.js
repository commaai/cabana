import SignalLegend from '../../components/SignalLegend';
import React from 'react';
import { shallow, mount, render } from 'enzyme';
import {StyleSheetTestUtils} from 'aphrodite';

// Prevents style injection from firing after test finishes
// and jsdom is torn down.
beforeEach(() => {
  StyleSheetTestUtils.suppressStyleInjection();
});
afterEach(() => {
  StyleSheetTestUtils.clearBufferAndResumeStyleInjection();
});

test('a little endian signal spanning one byte should switch to big endian preserving its bit coverage', () => {



});

test('a big endian signal spanning two bytes should switch to little endian preserving its bit coverage', () => {

});

test("a big endian signal spanning one and a half bytes should switch to little endian preserving the first byte's coverage", () => {

});

