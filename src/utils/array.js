export function elementWiseEquals(arr1, arr2) {
    return arr1.length === arr2.length && arr1.every((ele, idx) => arr2[idx] === ele);
}
