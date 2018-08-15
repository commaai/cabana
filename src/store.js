import window from "global/window";
import * as Redux from "redux";
import thunk from "redux-thunk";
import * as Actions from "./actions";
import reducer from "./reducers";

let composeEnhancers;

if (
  process.env.NODE_ENV !== "production" &&
  window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
) {
  composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
    actionCreators: Object.values(Actions).filter(f => f.name !== "updateState")
  });
} else {
  composeEnhancers = Redux.compose;
}

export default function createStore() {
  const store = Redux.createStore(
    reducer,
    composeEnhancers(Redux.applyMiddleware(thunk))
  );

  return store;
}
