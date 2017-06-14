import {elementWiseEquals} from '../../utils/array';

test('elementWiseEquals returns true for two arrays with same elements', () => {
    const arr1 = [1,2,3];
    const arr2 = [1,2,3];

    expect(elementWiseEquals(arr1, arr2)).toBe(true);
});

test('elementWiseEquals returns false for two arrays with different elements', () => {
    const arr1 = [1,2,3,4];
    const arr2 = [1,2,3];

    expect(elementWiseEquals(arr1, arr2)).toBe(false);
});