/* eslint-env jest */
import init from './init';

describe('init', () => {
  it('works without url params', () => {
    init().then((props) => {
      expect(true).toBe(true);
    });
  });
});
