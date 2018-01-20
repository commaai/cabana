import styled from "react-emotion";

// color bar on the left side of the signals legend
export default styled("div")`
  display: block;
  height: 100%;
  left: 0;
  position: absolute;
  width: 1.5%;
  opacity: ${({ isHighlighted }) => (isHighlighted ? 0.5 : 0.3)};
  background-color: rgb(${({ rgb }) => rgb.join(",")});
`;
