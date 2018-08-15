import { ACTION_SELECT_SEGMENT } from "../actions/types";

const initialState = {
  segment: [],
  segmentIndices: []
};

export default function reducer(state, action) {
  if (!state) {
    state = initialState;
  }

  switch (action.type) {
    case ACTION_SELECT_SEGMENT:
      console.log("Set segment", action);
      return {
        ...state,
        segment: action.segment,
        segmentIndices: action.segmentIndices
      };
    default:
      break;
  }

  return state;
}
