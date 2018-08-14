import {
  ACTION_SEEK,
  ACTION_SELECT_PART,
  ACTION_AUTO_SEEK,
  ACTION_SET_LOADING,
  ACTION_SELECT_ROUTE,
  ACTION_LOAD_ROUTES,
  ACTION_SET_MAX_TIME
} from "./types";
import { PART_SEGMENT_LENGTH } from "../config";

export function seek(time, index) {
  // console.log("Seek happened", time, index);
  return function(dispatch, getState) {
    const state = getState();
    let suggestedPart = state.playback.selectedParts[0];
    if (
      time / 60 < state.playback.selectedParts[0] ||
      Math.floor(time / 60) > state.playback.selectedParts[1]
    ) {
      suggestedPart = getPartForTime(time);
    }
    if (suggestedPart > state.route.maxParts - PART_SEGMENT_LENGTH + 1) {
      suggestedPart = state.route.maxParts - PART_SEGMENT_LENGTH + 1;
    }
    let maxPart = suggestedPart + PART_SEGMENT_LENGTH - 1;

    if (maxPart > state.route.maxParts) {
      maxPart = state.route.maxParts;
    }
    if (suggestedPart !== state.playback.selectedParts[0]) {
      console.log(
        "changing part in a seek",
        state.playback.selectedParts[0],
        suggestedPart
      );
    }
    dispatch({
      type: ACTION_SEEK,
      selectedParts: [suggestedPart, maxPart],
      time,
      index
    });
  };
}

export function autoSeek(time) {
  // console.log("autoSeek happened", time);
  return function(dispatch, getState) {
    const state = getState();

    let maxTime = Math.min(
      state.playback.maxTime,
      (1 + state.playback.selectedParts[1]) * 60
    );
    if (time >= maxTime) {
      time = state.playback.selectedParts[0] * 60;
      dispatch({
        type: ACTION_SEEK,
        selectedParts: state.playback.selectedParts,
        time
      });
    } else {
      dispatch({
        type: ACTION_AUTO_SEEK,
        time
      });
    }
  };
}

export function selectPart(part) {
  return function(dispatch, getState) {
    const state = getState();
    let selectedPart = part;
    if (selectedPart < 0) {
      selectedPart = state.playback.selectedParts[0];
    }
    if (selectedPart > state.route.maxParts - PART_SEGMENT_LENGTH + 1) {
      selectedPart = state.route.maxParts - PART_SEGMENT_LENGTH + 1;
    }
    let maxPart = selectedPart + PART_SEGMENT_LENGTH - 1;

    if (maxPart > state.route.maxParts) {
      maxPart = state.route.maxParts;
    }
    if (selectedPart !== state.playback.selectedParts[0]) {
      console.log(
        "selecting new part!",
        state.playback.selectedParts[0],
        selectedPart
      );
    }

    let seekTime = Math.min(
      getEndTimeForPart(selectedPart),
      state.playback.seekTime
    );
    seekTime = Math.max(getTimeForPart(selectedPart), seekTime);
    dispatch({
      type: ACTION_SELECT_PART,
      selectedParts: [selectedPart, maxPart],
      part,
      seekTime
    });
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

export function loadRoutes(routes) {
  return {
    type: ACTION_LOAD_ROUTES,
    routes
  };
}

export function setMaxTime(maxTime) {
  return {
    type: ACTION_SET_MAX_TIME,
    maxTime
  };
}

function getPartForTime(time) {
  return Math.floor(time / 60);
}

function getTimeForPart(part) {
  return Math.floor(part * 60);
}

function getEndTimeForPart(part) {
  return Math.floor((part + PART_SEGMENT_LENGTH) * 60 - 1);
}
