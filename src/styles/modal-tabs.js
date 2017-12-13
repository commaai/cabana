import { StyleSheet } from "aphrodite/no-important";

export default StyleSheet.create({
  tab: {
    display: "inline",
    marginRight: 20,
    cursor: "pointer"
  },
  selectedTab: {
    borderBottom: "2px solid #000",
    fontWeight: "bold"
  },
  tabContent: {
    paddingTop: 20
  }
});
