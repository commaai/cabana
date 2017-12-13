export default class BoardUnit {
  constructor(name) {
    this.name = name;
    this.attributes = {};
    this.comment = null;
  }

  text() {
    return this.name;
  }
}
