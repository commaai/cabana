export function hash(str) {
  let hash = 5381;
  let i = str.length;

  while (i) {
    i -= 1;
    hash = (hash * 33) ^ str.charCodeAt(i);
  }

  // to positive number
  return (hash >>> 0).toString(16);
}
