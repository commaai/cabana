import Cookies from 'js-cookie';
import Moment from 'moment';
import CommaAuth from './comma-auth';

const ROUTES_ENDPOINT = 'https://api.commadotai.com/v1/{dongleId}/routes/';

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

    return {};
}

export function cameraPath(routeUrl, frame) {
  return `${routeUrl}/sec${frame}.jpg`
}

export function parseRouteName(name) {
  const startTime = Moment(name, "YYYY-MM-DD--H-m-s");
  return {startTime};
}
