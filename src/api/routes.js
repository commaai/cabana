import Cookies from 'js-cookie';
import Moment from 'moment';
import CommaAuth from './comma-auth';

const ROUTES_ENDPOINT = 'https://api.commadotai.com/v1/{dongleId}/routes/';

let DEMO_ROUTES = {
  "2017-06-12--18-51-47": {
      "can": true,
      "device_type": 3,
      "end_geocode": "Los Altos",
      "end_lat": 37.4123,
      "end_lng": -122.12,
      "end_time": "2017-06-12T19:02:41",
      "fullname": "cb38263377b873ee|2017-06-12--18-51-47",
      "len": 2.82899,
      "maxcamera": 12,
      "maxlog": 12,
      "movie": true,
      "piececount": 12,
      "proccamera": 12,
      "proclog": 12,
      "sig_path": "cb38263377b873ee/78392b99580c5920227cc5b43dff8a70_2017-06-12--18-51-47",
      "start_geocode": "Stanford",
      "start_lat": 37.4267,
      "start_lng": -122.159,
      "start_time": "2017-06-12T18:51:47",
      "url": "https://chffrprivate.blob.core.windows.net/chffrprivate3/v2/cb38263377b873ee/78392b99580c5920227cc5b43dff8a70_2017-06-12--18-51-47"
    },

  "2017-06-30--17-37-49": { // prius
      "can": true,
      "device_type": 3,
      "end_geocode": "Daly City",
      "end_lat": 37.7391,
      "end_lng": -122.465,
      "end_time": "2017-06-30T17:54:07",
      "fullname": "b67ff0c1d78774da|2017-06-30--17-37-49",
      "len": 2.23534,
      "maxcamera": 18,
      "maxlog": 18,
      "movie": true,
      "piececount": 18,
      "proccamera": 18,
      "proclog": 18,
      "sig_path": "b67ff0c1d78774da/c130d5eaf04518c4d08ede29efbd519b_2017-06-30--17-37-49",
      "start_geocode": "Daly City",
      "start_lat": 37.7394,
      "start_lng": -122.465,
      "start_time": "2017-06-30T17:37:49",
      "url": "https://chffrprivate.blob.core.windows.net/chffrprivate3/v2/b67ff0c1d78774da/c130d5eaf04518c4d08ede29efbd519b_2017-06-30--17-37-49"
  },
  "2017-07-10--19-11-08": { // elikorh panda route with bad offset
      "can": true,
      "device_type": 2,
      "end_geocode": "Fargo",
      "end_lat": 46.9041,
      "end_lng": -96.8059,
      "end_time": "2017-07-10T19:19:34",
      "fullname": "03ad84b839400fdb|2017-07-10--19-11-08",
      "len": 5.4562,
      "maxcamera": 8,
      "maxlog": 8,
      "movie": true,
      "piececount": 8,
      "proccamera": 8,
      "proclog": 8,
      "sig_path": "03ad84b839400fdb/29176323acf8f30b6a09c188d8a3edb9_2017-07-10--19-11-08",
      "start_geocode": "Fargo",
      "start_lat": 46.8565,
      "start_lng": -96.8426,
      "start_time": "2017-07-10T19:11:08",
      "url": "https://chffrprivate.blob.core.windows.net/chffrprivate3/v2/03ad84b839400fdb/29176323acf8f30b6a09c188d8a3edb9_2017-07-10--19-11-08"
    }
};

DEMO_ROUTES = momentizeTimes(DEMO_ROUTES);

function momentizeTimes(routes) {
  for(let routeName in routes) {
    routes[routeName].start_time = Moment(routes[routeName].start_time);
    routes[routeName].end_time = Moment(routes[routeName].end_time);
  }
  return routes;
}

export async function fetchRoutes(dongleId) {
    // will throw errors from fetch() on HTTP failure

    if(dongleId === undefined) {
        dongleId = 'me';
    }

    const accessToken = CommaAuth.getCommaAccessToken();
    if(accessToken) {
      const endpoint = ROUTES_ENDPOINT.replace('{dongleId}', dongleId);
      const headers = new Headers();
      headers.append('Authorization', `JWT ${accessToken}`);


      const request = new Request(endpoint, {headers});
      const resp = await fetch(request);
      const routes = await resp.json();
      if('routes' in routes) {
          return momentizeTimes(routes.routes);
      }
    }

    return DEMO_ROUTES;
}

export function cameraPath(routeUrl, frame) {
  return `${routeUrl}/sec${frame}.jpg`
}

export function parseRouteName(name) {
  const startTime = Moment(name, "YYYY-MM-DD--H-m-s");
  return {startTime};
}
