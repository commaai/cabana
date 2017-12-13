function elementWiseEquals(arr1, arr2) {
  return (
    arr1.length === arr2.length && arr1.every((ele, idx) => arr2[idx] === ele)
  );
}

function findIndexRight(arr, condition) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (condition(arr[i])) {
      return i;
    }
  }
}

export default { elementWiseEquals, findIndexRight };
