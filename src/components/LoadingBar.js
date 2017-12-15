import styled, { keyframes } from "react-emotion";

const frames = keyframes`
  0% {
    transform: translateX(0)
  }
  to {
    transform: translateX(-400px)
  }
`;
const animationColor1 = "rgba(74, 242, 161, 1.00)";
const animationColor2 = "rgba(140, 169, 197, 1.00)";

export default styled("div")`
  display: block;
  animation-name: ${frames};
  animation-duration: 2s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  background-color: ${animationColor1};
  background-image: linear-gradient(
    to right,
    ${animationColor2} 0,
    ${animationColor2} 50%,
    ${animationColor1} 50%,
    ${animationColor1} 100%
  );
  background-repeat: repeat-x;
  background-size: 25pc 25pc;
  width: 200%;
  position: fixed;
  top: 0;
  left: 0;
  height: 2;
`;
