import React, {Component} from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import PropTypes from 'prop-types';

import Images from '../styles/images';

export default class PartSelector extends Component {
    static selectorWidth = 150;
    static propTypes = {
        onPartChange: PropTypes.func.isRequired,
        partsCount: PropTypes.number.isRequired
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
    }

    makePartStyle(partsCount, selectedPart) {
        return StyleSheet.create({
            selectedPart: {
                left: (selectedPart / partsCount) * PartSelector.selectorWidth,
                width: (1 / partsCount) * PartSelector.selectorWidth
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
        this.props.onPartChange(part);
        this.setState({part,
                       selectedPartStyle: this.makePartStyle(this.props.partsCount,
                                                             part)});
    }

    selectNextPart() {
        let {selectedPart} = this.state;
        selectedPart++;
        if(selectedPart >= this.props.partsCount) {
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

    onSelectedPartDragStart(e) {
        this.setState({isDragging: true});
    }

    onSelectedPartMouseMove(e) {
        if(!this.state.isDragging) return;

        const rect = this.selectorRect.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const part = Math.floor(x * this.props.partsCount / PartSelector.selectorWidth);
        this.selectPart(part);
    }

    onSelectedPartDragEnd(e) {
        this.setState({isDragging: false});
    }

    render() {
        const {selectedPartStyle} = this.state;

        return (<div className={css(Styles.root)}>
                    <div className={css(Styles.selector)}
                         ref={(selector) => this.selectorRect = selector}
                         onMouseMove={this.onSelectedPartMouseMove}>
                        <div className={css(Styles.selectedPart, selectedPartStyle.selectedPart)}
                             onMouseDown={this.onSelectedPartDragStart}
                             onMouseUp={this.onSelectedPartDragEnd}></div>
                    </div>
                    <div className={css(Styles.nudge)}>
                        <span className={css(Styles.nudgeButton)}
                              onClick={this.selectPrevPart}><Images.leftArrow /></span>
                        <span className={css(Styles.nudgeButton)}
                              onClick={this.selectNextPart}><Images.rightArrow /></span>
                    </div>
                </div>);
    }
}

const Styles = StyleSheet.create({
    root: {
        flexDirection: 'row',
        display: 'flex',
        flex: 1
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
