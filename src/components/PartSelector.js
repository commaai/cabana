import React, { Component } from "react";
import PropTypes from "prop-types";

import { PART_SEGMENT_LENGTH } from "../config";

export default class PartSelector extends Component {
  static selectorWidth = 150;
  static propTypes = {
    onPartChange: PropTypes.func.isRequired,
    partsCount: PropTypes.number.isRequired,
    selectedPart: PropTypes.number.isRequired
  };

  constructor(props) {
    super(props);

    this.state = {
      selectedPartStyle: this.makePartStyle(props.partsCount, 0),
      isDragging: false
    };

    this.selectNextPart = this.selectNextPart.bind(this);
    this.selectPrevPart = this.selectPrevPart.bind(this);
    this.onSelectedPartDragStart = this.onSelectedPartDragStart.bind(this);
    this.onSelectedPartMouseMove = this.onSelectedPartMouseMove.bind(this);
    this.onSelectedPartDragEnd = this.onSelectedPartDragEnd.bind(this);
    this.onClick = this.onClick.bind(this);
  }

  makePartStyle(partsCount, selectedPart) {
    return {
      left: selectedPart / partsCount * PartSelector.selectorWidth,
      width: PART_SEGMENT_LENGTH / partsCount * PartSelector.selectorWidth
    };
  }

  componentWillUpdate(nextProps, nextState) {
    if (nextProps.selectedPart !== this.props.selectedPart) {
      console.log("updating styles for part picker");
      const selectedPartStyle = this.makePartStyle(
        nextProps.partsCount,
        nextProps.selectedPart
      );
      this.setState({ selectedPartStyle });
    }
  }

  selectPart(part) {
    part = Math.max(
      0,
      Math.min(this.props.partsCount - PART_SEGMENT_LENGTH, part)
    );
    if (part === this.props.selectedPart) {
      return;
    }

    this.props.onPartChange(part);
  }

  selectNextPart() {
    let { selectedPart } = this.props;
    selectedPart++;
    if (selectedPart + PART_SEGMENT_LENGTH >= this.props.partsCount) {
      return;
    }

    this.selectPart(selectedPart);
  }

  selectPrevPart() {
    let { selectedPart } = this.props;
    selectedPart--;
    if (selectedPart < 0) {
      return;
    }

    this.selectPart(selectedPart);
  }

  partAtClientX(clientX) {
    const rect = this.selectorRect.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.floor(x * this.props.partsCount / PartSelector.selectorWidth);
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
    if (this.props.partsCount <= PART_SEGMENT_LENGTH) {
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
