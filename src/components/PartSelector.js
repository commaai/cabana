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

    render() {
        const {selectedPartStyle} = this.state;

        return (<div className={css(Styles.root)}>
                    <div className={css(Styles.selectedPart, selectedPartStyle.selectedPart)}></div>
                    <span>Next</span>
                    <span>Prev</span>
                </div>);
    }
}

const Styles = StyleSheet.create({
    root: {
        width: PartSelector.selectorWidth,
        height: 30,
        border: '1px solid #000',
        flexDirection: 'row'
    },
    selectedPart: {
        backgroundColor: 'black',
        height: '100%'
    }
});
