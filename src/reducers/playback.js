import {
  ACTION_SEEK,
  ACTION_SELECT_PART,
  ACTION_AUTO_SEEK,
  ACTION_SET_LOADING,
  ACTION_SELECT_ROUTE
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
    getPartForTime(initialSeekTime) + PART_SEGMENT_LENGTH
  ],
  maxParts: 0,
  isLoading: true,
  seekIndex: 0,
  route: null
};

export default function playback(state, action) {
  if (!state) {
    return initialState;
  }

  let maxPart = null;

  switch (action.type) {
    case ACTION_SELECT_ROUTE:
      return {
        ...state,
        route: action.route,
        maxParts: action.route.proclog
      };
      break;
    case ACTION_SEEK:
      // user seek gesture
      let suggestedPart = state.selectedParts[0];
      if (
        action.time / 60 < state.selectedParts[0] ||
        Math.floor(action.time / 60) > state.selectedParts[1]
      ) {
        suggestedPart = getPartForTime(action.time);
      }
      if (suggestedPart >= state.maxParts) {
        suggestedPart = state.maxParts - 1;
      }
      maxPart = suggestedPart + PART_SEGMENT_LENGTH;

      if (maxPart >= state.maxParts) {
        maxPart = state.maxParts - 1;
      }
      return {
        ...state,
        seekTime: action.time,
        selectedParts: [suggestedPart, maxPart],
        seekIndex: action.index || 0
      };
      break;
    case ACTION_AUTO_SEEK:
      // auto-seek from video timestamp updates
      return {
        ...state,
        seekTime: action.time
      };
      break;
    case ACTION_SELECT_PART:
      let selectedPart = action.part;
      if (selectedPart < 0) {
        selectedPart = state.selectedParts[0];
      }
      if (selectedPart >= state.maxParts) {
        selectedPart = state.maxParts - 1;
      }
      maxPart = selectedPart + PART_SEGMENT_LENGTH;

      if (maxPart >= state.maxParts) {
        maxPart = state.maxParts - 1;
      }

      let seekTime = Math.min(getEndTimeForPart(selectedPart), state.seekTime);
      seekTime = Math.max(getTimeForPart(selectedPart), seekTime);
      return {
        ...state,
        seekTime,
        selectedParts: [selectedPart, maxPart]
      };
      break;
    case ACTION_SET_LOADING:
      return {
        ...state,
        isLoading: action.isLoading
      };
      break;
  }

  return state;
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
