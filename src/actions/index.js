import {
  ACTION_SEEK,
  ACTION_SELECT_PART,
  ACTION_AUTO_SEEK,
  ACTION_SET_LOADING,
  ACTION_SELECT_ROUTE
} from "./types";

export function seek(time, index) {
  console.log("Seek happened", time, index);
  debugger;
  return {
    type: ACTION_SEEK,
    time,
    index
  };
}

export function autoSeek(time) {
  console.log("autoSeek happened", time);
  return {
    type: ACTION_AUTO_SEEK,
    time
  };
}

export function selectPart(part) {
  return {
    type: ACTION_SELECT_PART,
    part
  };
}

export function setLoading(isLoading) {
  return {
    type: ACTION_SET_LOADING,
    isLoading
  };
}

export function selectRoute(route) {
  return function(dispatch, getState) {
    dispatch({
      type: ACTION_SELECT_ROUTE,
      route
    });
    dispatch(selectPart(-1));
  };
}
