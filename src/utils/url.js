/* eslint-disable no-restricted-globals*/
export function objToQuery(obj) {
  return Object.keys(obj)
    .map(k => k + "=" + encodeURIComponent(decodeURIComponent(obj[k])))
    .join("&");
}

export function getUrlParameter(name) {
  var location = window.location;
  name = name.replace(/[[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  var results = regex.exec(location.search);

  return results === null
    ? null
    : decodeURIComponent(results[1].replace(/\+/g, " "));
}

export function modifyQueryParameters({ add, remove = [] }) {
  var regex = new RegExp("[\\?&]([^&#]+)=([^&#]*)");
  var results = regex.exec(location.search);

  let params = {};
  if (results != null) {
    for (let i = 1; i < results.length - 1; i += 2) {
      let key = results[i],
        value = results[i + 1];
      params[key] = value;
    }
    for (let key in params) {
      if (remove.indexOf(key) !== -1) {
        delete params[key];
      }
    }
    params = { ...params, ...add };
  } else {
    params = add;
  }

  return location.origin + location.pathname + "?" + objToQuery(params);
}
