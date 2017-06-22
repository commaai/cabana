export function swapKeysAndValues(obj, f) {
  return Object.keys(obj).reduce(function(acc, k) {
    acc[obj[k]] = k;
    return acc
  },{})
};

export function fromArray(arr) {
    // arr is an array of array key-value pairs
    // like [['a', 1], ['b', 2]]
    const pairs = arr.map( ([k,v]) => ({[k]: v}));
    return Object.assign(...pairs);
}