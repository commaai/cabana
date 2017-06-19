import React, {Component} from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import PropTypes from 'prop-types';

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
            selectedPart: 0
        };

        this.selectNextPart = this.selectNextPart.bind(this);
        this.selectPrevPart = this.selectPrevPart.bind(this);
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

    selectNextPart() {
        let {selectedPart} = this.state;
        selectedPart++;
        if(selectedPart >= this.props.partsCount) {
            return;
        }

        this.props.onPartChange(selectedPart);
        this.setState({selectedPart,
                       selectedPartStyle: this.makePartStyle(this.props.partsCount,
                                                             selectedPart)});
    }

    selectPrevPart() {
        let {selectedPart} = this.state;
        selectedPart--;
        if(selectedPart < 0) {
            return;
        }

        this.props.onPartChange(selectedPart);
        this.setState({selectedPart,
                       selectedPartStyle: this.makePartStyle(this.props.partsCount,
                                                             selectedPart)});
    }

    render() {
        const {selectedPartStyle} = this.state;

        return (<div className={css(Styles.root)}>
                    <div className={css(Styles.selector)}>
                        <div className={css(Styles.selectedPart, selectedPartStyle.selectedPart)}></div>
                    </div>
                    <div className={css(Styles.nudge)}>
                        <span className={css(Styles.nudgeButton)}
                              onClick={this.selectNextPart}>Next</span>
                        <span className={css(Styles.nudgeButton)}
                              onClick={this.selectPrevPart}>Prev</span>
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
    },
    nudgeButton: {
        cursor: 'pointer'
    }
});
