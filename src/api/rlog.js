import { raw as RawDataApi, request as Request } from "@commaai/comma-api";
import CommaAuth from "@commaai/my-comma-auth";
import request from "simple-get";

const urlStore = {};

var initPromise;
function ensureInit() {
  if (!initPromise) {
    initPromise = CommaAuth.init().then(function(token) {
      Request.configure(token);
      return Promise.resolve();
    });
  }
  return initPromise;
}

export async function getLogURLList(routeName) {
  if (urlStore[routeName]) {
    return urlStore[routeName];
  }
  await ensureInit();

  var data = await RawDataApi.getLogUrls(routeName);

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
