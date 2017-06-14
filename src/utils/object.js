export function swapKeysAndValues(obj, f) {
  return Object.keys(obj).reduce(function(acc, k) {
    acc[obj[k]] = k;
    return acc
  },{})
};