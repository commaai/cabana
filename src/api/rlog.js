import * as CommaAPI from "./comma-api";
import request from "simple-get";

const urlStore = {};

export async function getLogURLList(routeName) {
  if (urlStore[routeName]) {
    return urlStore[routeName];
  }
  var data = await CommaAPI.get("route/" + routeName + "/log_urls");

  urlStore[routeName] = data;

  setTimeout(function() {
    delete urlStore[routeName];
  }, 1000 * 60 * 45); // expires in 1h, lets reset in 45m

  return urlStore[routeName];
}

export async function getLogPart(routeName, part) {
  return new Promise(async function(resolve, reject) {
    var logUrls = await getLogURLList(routeName);

    request(logUrls[part], function(err, res) {
      if (err) {
        return reject(err);
      }
      resolve(res);
    });
  });
}
