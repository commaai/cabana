import React from "react";
import { StyleSheet, css } from "aphrodite/no-important";

import * as ObjectUtils from "../utils/object";

function createImageComponent(source, alt, styles) {
  if (styles === undefined) {
    styles = [];
  } else if (!Array.isArray(styles)) {
    styles = [styles];
  }

  return props => {
    let localStyles = styles.slice();
    if (Array.isArray(props.styles)) {
      localStyles = localStyles.concat(props.styles);
      // filter 'styles' from props, which is passed via spread to <img> tag.
      props = ObjectUtils.fromArray(
        Object.entries(props).filter(([k, v]) => k !== "styles")
      );
    }

    return (
      <img src={source} className={css(...localStyles)} alt={alt} {...props} />
    );
  };
}

const Styles = StyleSheet.create({
  materialIcon: {
    width: 24,
    height: 24
  },
  pointer: {
    cursor: "pointer"
  }
});

const leftArrow = createImageComponent(
  process.env.PUBLIC_URL + "/img/ic_arrow_left_black_24dp.png",
  "Left arrow",
  Styles.materialIcon
);
const rightArrow = createImageComponent(
  process.env.PUBLIC_URL + "/img/ic_arrow_right_black_24dp.png",
  "Right arrow",
  Styles.materialIcon
);

const downArrow = createImageComponent(
  process.env.PUBLIC_URL + "/img/ic_arrow_drop_down_black_24dp.png",
  "Down arrow",
  Styles.materialIcon
);

const clear = createImageComponent(
  process.env.PUBLIC_URL + "/img/ic_clear_black_24dp.png",
  "Clear",
  [Styles.materialIcon, Styles.pointer]
);

const panda = createImageComponent(
  process.env.PUBLIC_URL + "/img/panda.png",
  "Panda",
  []
);
export default { rightArrow, leftArrow, downArrow, clear, panda };
