import { combineReducers } from "redux";
import playback from "./playback";
import route from "./route";

export default combineReducers({
  playback: playback,
  route: route
});
