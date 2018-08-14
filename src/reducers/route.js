import { ACTION_LOAD_ROUTES, ACTION_SELECT_ROUTE } from "../actions/types";

const initialState = {
  routes: [],
  route: null
};

export default function reducer(state, action) {
  if (!state) {
    return initialState;
  }

  switch (action.type) {
    case ACTION_LOAD_ROUTES:
      return {
        ...state,
        routes: action.routes
      };
      break;
    case ACTION_SELECT_ROUTE:
      return {
        ...state,
        route: action.route,
        maxParts: action.route.proclog
      };
      break;
  }

  return state;
}
