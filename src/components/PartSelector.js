import React, { Component } from "react";
import { connect } from "react-redux";
import Obstruction from "obstruction";
import PropTypes from "prop-types";

import { selectPart } from "../actions";

import { PART_SEGMENT_LENGTH } from "../config";

class PartSelector extends Component {
  static selectorWidth = 150;
  static propTypes = {
    maxParts: PropTypes.number.isRequired,
    selectedParts: PropTypes.array,
    seekTime: PropTypes.number
  };

  constructor(props) {
    super(props);

    this.state = {
      selectedPartStyle: this.makePartStyle(
        props.maxParts,
        props.selectedParts[0]
      ),
      isDragging: false
    };

    console.log("Constructing");

    this.selectNextPart = this.selectNextPart.bind(this);
    this.selectPrevPart = this.selectPrevPart.bind(this);
    this.onSelectedPartDragStart = this.onSelectedPartDragStart.bind(this);
    this.onSelectedPartMouseMove = this.onSelectedPartMouseMove.bind(this);
    this.onSelectedPartDragEnd = this.onSelectedPartDragEnd.bind(this);
    this.onClick = this.onClick.bind(this);
  }

  makePartStyle(maxParts, selectedPart) {
    console.log("Making styles for", maxParts, selectedPart);
    return {
      left: selectedPart / maxParts * PartSelector.selectorWidth,
      width: PART_SEGMENT_LENGTH / maxParts * PartSelector.selectorWidth
    };
  }

  componentWillReceiveProps(nextProps) {
    if (
      nextProps.maxParts !== this.props.maxParts ||
      nextProps.selectedParts[0] !== this.props.selectedParts[0]
    ) {
      const selectedPartStyle = this.makePartStyle(
        nextProps.maxParts,
        nextProps.selectedParts[0]
      );
      this.setState({ selectedPartStyle });
    }
  }

  selectPart(part) {
    part = Math.max(
      0,
      Math.min(this.props.maxParts - PART_SEGMENT_LENGTH, part)
    );
    if (part === this.props.selectedParts[0]) {
      return;
    }

    this.props.dispatch(selectPart(part));
  }

  selectNextPart() {
    let { selectedParts, maxParts } = this.props;
    let selectedPart = selectedParts[0] + 1;
    if (selectedPart + PART_SEGMENT_LENGTH >= maxParts) {
      return;
    }

    this.selectPart(selectedPart);
  }

  selectPrevPart() {
    let { selectedParts } = this.props;
    let selectedPart = selectedParts[0] - 1;
    if (selectedPart < 0) {
      return;
    }

    this.selectPart(selectedPart);
  }

  partAtClientX(clientX) {
    const rect = this.selectorRect.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.floor(x * this.props.maxParts / PartSelector.selectorWidth);
  }

  onSelectedPartDragStart(e) {
    this.setState({ isDragging: true });
    document.addEventListener("mouseup", this.onSelectedPartDragEnd);
  }

  onSelectedPartMouseMove(e) {
    if (!this.state.isDragging) return;

    const part = this.partAtClientX(e.clientX);
    this.selectPart(part);
  }

  onSelectedPartDragEnd(e) {
    this.setState({ isDragging: false });
    document.removeEventListener("mouseup", this.onSelectedPartDragEnd);
  }

  onClick(e) {
    const part = this.partAtClientX(e.clientX);
    this.selectPart(part);
  }

  render() {
    const { selectedPartStyle } = this.state;
    if (this.props.maxParts <= PART_SEGMENT_LENGTH) {
      // all parts are available so no need to render the partselector

      return null;
    }
    return (
      <div className="cabana-explorer-part-selector">
        <div
          className="cabana-explorer-part-selector-track"
          ref={selector => (this.selectorRect = selector)}
          style={{ width: PartSelector.selectorWidth }}
          onMouseMove={this.onSelectedPartMouseMove}
          onClick={this.onClick}
        >
          <div
            className="cabana-explorer-part-selector-track-active"
            style={selectedPartStyle}
            onMouseDown={this.onSelectedPartDragStart}
            onMouseUp={this.onSelectedPartDragEnd}
          />
        </div>
      </div>
    );
  }
}

const stateToProps = Obstruction({
  seekTime: "playback.seekTime",
  selectedParts: "playback.selectedParts",
  maxParts: "playback.maxParts"
});

export default connect(stateToProps)(PartSelector);
