// Wrapper of aphrodite css() function
// that supports string class names in
// addition to style objects.

// Useful for component testing

import { css } from "aphrodite";
import classNames from "classnames";

export default function() {
  const styles = [];
  const classes = [];

  [].forEach.call(arguments, it => {
    if (it && it._definition && it._name) styles.push(it);
    else classes.push(it);
  });

  return classNames.apply(null, [...classes, css(styles)]);
}
