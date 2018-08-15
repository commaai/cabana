import { combineReducers } from "redux";
import playback from "./playback";
import route from "./route";
import segment from "./segments";

export default combineReducers({
  playback: playback,
  route: route,
  segment: segment
});
