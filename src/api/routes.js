import Cookies from 'js-cookie';

const ROUTES_ENDPOINT = 'https://api.commadotai.com/v1/{dongleId}/routes/';

const DEMO_ROUTES = {
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
    }
};

function getCommaAccessToken() {
    return Cookies.get('comma_access_token');
}

export async function fetchRoutes(dongleId) {
    if(dongleId === undefined) {
        dongleId = 'me';
    }

    const accessToken = getCommaAccessToken();
    if(accessToken) {
      const endpoint = ROUTES_ENDPOINT.replace('{dongleId}', dongleId);
      const headers = new Headers();
      headers.append('Authorization', `JWT ${getCommaAccessToken()}`);

      try {
          const request = new Request(endpoint, {headers});
          const resp = await fetch(request);
          const routes = await resp.json();
          if('routes' in routes) {
              return routes.routes;
          }
      } catch(err) {
          console.log(err);
      }
    }

    return DEMO_ROUTES;
}

export function cameraPath(routeUrl, frame) {
  return `${routeUrl}/sec${frame}.jpg`
}
