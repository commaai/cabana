import {
  ACTION_SEEK,
  ACTION_SELECT_PART,
  ACTION_AUTO_SEEK,
  ACTION_SET_LOADING,
  ACTION_SET_MAX_TIME
} from "../actions/types";
import { PART_SEGMENT_LENGTH } from "../config";
import { getUrlParameter } from "../utils/url";

var initialSeekTime = getUrlParameter("seekTime");

if (initialSeekTime) {
  initialSeekTime = Number(initialSeekTime);
} else {
  initialSeekTime = 0;
}

const initialState = {
  seekTime: initialSeekTime,
  selectedParts: [
    getPartForTime(initialSeekTime),
    getPartForTime(initialSeekTime) + PART_SEGMENT_LENGTH - 1
  ],
  maxParts: 0,
  isLoading: true,
  seekIndex: 0
};

export default function playback(state, action) {
  state = doThing(state, action);
  if (!state.seekTime && state.seekTime !== 0) {
    debugger;
  }
  return state;
  function doThing(state, action) {
    if (!state) {
      return initialState;
    }

    switch (action.type) {
      case ACTION_SEEK:
        return {
          ...state,
          seekTime: action.time,
          userSeekTime: action.time,
          selectedParts: action.selectedParts,
          seekIndex: action.index || 0
        };
      case ACTION_AUTO_SEEK:
        // auto-seek from video timestamp updates
        return {
          ...state,
          seekTime: action.time
        };
      case ACTION_SELECT_PART:
        return {
          ...state,
          seekTime: action.seekTime || state.seekTime,
          selectedParts: action.selectedParts
        };
      case ACTION_SET_LOADING:
        return {
          ...state,
          isLoading: action.isLoading
        };
      case ACTION_SET_MAX_TIME:
        return {
          ...state,
          maxTime: action.maxTime
        };
      default:
        break;
    }

    return state;
  }
}

function getPartForTime(time) {
  return Math.floor(time / 60);
}
