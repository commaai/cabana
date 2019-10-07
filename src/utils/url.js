/* eslint-disable no-restricted-globals */
export function objToQuery(obj) {
  return Object.keys(obj)
    .map(k => `${k}=${encodeURIComponent(decodeURIComponent(obj[k]))}`)
    .join("&");
}

export function getUrlParameter(name) {
  const { location } = window;
  name = name.replace(/[[]/, "\\[").replace(/[\]]/, "\\]");
  const regex = new RegExp(`[\\?&]${name}=([^&#]*)`);
  const results = regex.exec(location.search);

  return results === null
    ? null
    : decodeURIComponent(results[1].replace(/\+/g, " "));
}

export function modifyQueryParameters({ add, remove = [] }) {
  const regex = new RegExp("[\\?&]([^&#]+)=([^&#]*)");
  const results = regex.exec(location.search);

  let params = {};
  if (results != null) {
    for (let i = 1; i < results.length - 1; i += 2) {
      const key = results[i];
      const value = results[i + 1];
      params[key] = value;
    }
    for (const key in params) {
      if (remove.indexOf(key) !== -1) {
        delete params[key];
      }
    }
    params = { ...params, ...add };
  } else {
    params = add;
  }

  return `${location.origin + location.pathname}?${objToQuery(params)}`;
}
