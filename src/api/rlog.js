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

export async function getLogPart(logUrl) {
  return new Promise(async function(resolve, reject) {
    request(logUrl, function(err, res) {
      if (err) {
        return reject(err);
      }
      resolve(res);
    });
  });
}
