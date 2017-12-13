import { StyleSheet } from "aphrodite/no-important";

export default StyleSheet.create({
  root: {
    flexDirection: "row"
  },
  button: {
    cursor: "pointer",
    backgroundColor: "RGB(63, 135, 255)",
    borderRadius: 5,
    minWidth: 80,
    paddingLeft: 20,
    paddingRight: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    ":hover": {
      backgroundColor: "RGBA(63, 135, 255, 0.5)"
    }
  }
});
