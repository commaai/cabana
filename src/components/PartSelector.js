import React, {Component} from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import PropTypes from 'prop-types';

import Images from '../styles/images';
import {PART_SEGMENT_LENGTH} from '../config';

export default class PartSelector extends Component {
    static selectorWidth = 150;
    static propTypes = {
        onPartChange: PropTypes.func.isRequired,
        partsCount: PropTypes.number.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            selectedPartStyle: this.makePartStyle(props.partsCount, 0),
            selectedPart: 0,
            isDragging: false,
        };

        this.selectNextPart = this.selectNextPart.bind(this);
        this.selectPrevPart = this.selectPrevPart.bind(this);
        this.onSelectedPartDragStart = this.onSelectedPartDragStart.bind(this);
        this.onSelectedPartMouseMove = this.onSelectedPartMouseMove.bind(this);
        this.onSelectedPartDragEnd = this.onSelectedPartDragEnd.bind(this);
        this.onClick = this.onClick.bind(this);
    }

    makePartStyle(partsCount, selectedPart) {
        return StyleSheet.create({
            selectedPart: {
                left: (selectedPart / partsCount) * PartSelector.selectorWidth,
                width: (PART_SEGMENT_LENGTH / partsCount) * PartSelector.selectorWidth
            }
        });
    }

    componentWillReceiveProps(nextProps) {
        if(nextProps.partsCount != this.props.partsCount) {
            const selectedPartStyle = this.makePartStyle(nextProps.partsCount, this.state.selectedPart);
            this.setState({selectedPartStyle});
        }
    }

    selectPart(part) {
        if(part + PART_SEGMENT_LENGTH - 1 >= this.props.partsCount) {
            return;
        }
        this.props.onPartChange(part);
        this.setState({selectedPart: part,
                       selectedPartStyle: this.makePartStyle(this.props.partsCount,
                                                             part)});
    }

    selectNextPart() {
        let {selectedPart} = this.state;
        selectedPart++;
        if(selectedPart + PART_SEGMENT_LENGTH >= this.props.partsCount) {
            return;
        }

        this.selectPart(selectedPart);
    }

    selectPrevPart() {
        let {selectedPart} = this.state;
        selectedPart--;
        if(selectedPart < 0) {
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
        this.setState({isDragging: true});
    }

    onSelectedPartMouseMove(e) {
        if(!this.state.isDragging) return;

        const part = this.partAtClientX(e.clientX);
        this.selectPart(part);
    }

    onSelectedPartDragEnd(e) {
        this.setState({isDragging: false});
    }

    onClick(e) {
        const part = this.partAtClientX(e.clientX);
        this.selectPart(part);
    }

    render() {
        const {selectedPartStyle} = this.state;

        return (<div className={css(Styles.root)}>
                    <div className={css(Styles.selector)}
                         ref={(selector) => this.selectorRect = selector}
                         onMouseMove={this.onSelectedPartMouseMove}
                         onClick={this.onClick}>
                        <div className={css(Styles.selectedPart, selectedPartStyle.selectedPart)}
                             onMouseDown={this.onSelectedPartDragStart}
                             onMouseUp={this.onSelectedPartDragEnd}></div>
                    </div>
                </div>);
    }
}

const Styles = StyleSheet.create({
    root: {
        flexDirection: 'row',
        display: 'flex',
        flex: 1,
        cursor: 'pointer',
    },
    selector: {
        width: PartSelector.selectorWidth,
        height: 30,
        border: '1px solid #000',
        position: 'relative'
    },
    selectedPart: {
        backgroundColor: 'black',
        height: '100%',
        position: 'absolute',
    },
    nudge: {
        width: 48,
    },
    nudgeButton: {
        cursor: 'pointer'
    }
});
