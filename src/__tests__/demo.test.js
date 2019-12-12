/* eslint-env jest */
import { demoLogUrls, demoProps, demoRoute } from '../demo';
import { getLogPart } from '../api/rlog';
import { StyleSheetTestUtils } from 'aphrodite';

beforeEach(() => {
  StyleSheetTestUtils.suppressStyleInjection();
});
afterEach(() => {
  StyleSheetTestUtils.clearBufferAndResumeStyleInjection();
});

describe('demo fixtures', () => {
  it('demo log urls are valid', async () => {
    const data = await getLogPart(demoLogUrls[0]);
    expect(data.statusCode).toBe(200);
  });
});
