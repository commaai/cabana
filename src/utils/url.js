export function objToQuery(obj) {
  return Object.keys(obj).map(k => k + '=' + encodeURIComponent(obj[k])).join('&');
}

export function getUrlParameter(name) {
    var location = location || window.location;
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);

    return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

export function addQueryParameters(newParams) {
    var location = window.location;
    var regex = new RegExp('[\\?&]([^&#]+)=([^&#]*)');
    var results = regex.exec(location.search);

    let params = {};
    if(results != null) {
        for(let i = 1; i < results.length - 1; i+=2) {
            let key = results[i], value = results[i+1];
            params[key] = value;
        }
        params = {...params, ...newParams};
    } else {
        params = newParams;
    }
    return location.origin + location.pathname + '?' + objToQuery(params);
}