import React, {Component} from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import PropTypes from 'prop-types';

import OpenDbc from '../api/opendbc';
import DBC from '../models/can/dbc';
import Modal from './Modal';

export default class SaveDbcModal extends Component {
    static propTypes = {
        dbc: PropTypes.instanceOf(DBC).isRequired,
        sourceDbcFilename: PropTypes.string.isRequired,
        onCancel: PropTypes.func.isRequired,
        onDbcSaved: PropTypes.func.isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            openDbcFork: null,
            dbcFilename: this.props.sourceDbcFilename
        };

        this.onContinue = this.onContinue.bind(this);
        this.forkOpenDbcAndWait = this.forkOpenDbcAndWait.bind(this);
    }

    async componentWillMount() {
        const openDbcFork = await OpenDbc.getUserOpenDbcFork();
        this.setState({openDbcFork})
    }

    async onContinue() {
        const {openDbcFork, dbcFilename} = this.state;

        const success = await OpenDbc.commitFile(openDbcFork,
                                                 dbcFilename,
                                                 this.props.dbc.text());
        if(success) {
            this.props.onDbcSaved(dbcFilename);
        }
    }

    async forkOpenDbcAndWait() {
        const forkResponseSuccess = await OpenDbc.fork();
        if(forkResponseSuccess) {
            let isTimedOut = false;
            const interval = window.setInterval(() => {
                if(!isTimedOut) {
                    OpenDbc.getUserOpenDbcFork().then((openDbcFork) => {
                        if(openDbcFork !== null) {
                            this.setState({openDbcFork});
                            window.clearInterval(interval);
                        }
                    });
                } else {
                    window.clearInterval(interval);
                }
            }, 3000);

            const timeout = window.setTimeout(() => {
                isTimedOut = true;
            }, 30000);
        } else {
            // fork failed
        }
    }

    forkStep() {
        const {openDbcFork} = this.state;
        let content;
        if(openDbcFork !== null) {
            content = <p>Done! {openDbcFork}</p>;
        } else {
            content = <p className={css(Styles.pointer, Styles.forkOpenDbc)}
                         onClick={this.forkOpenDbcAndWait}>Fork OpenDBC</p>;
        }
        return (<div className={css(Styles.step, (openDbcFork !== null ? Styles.stepDone : null))}>
                    {openDbcFork !== null ? <p>Fork OpenDBC</p> : null}
                    {content}
                </div>);
    }

    nameStep() {
        return (<div className={css(Styles.step)}>
                    <p>Choose a filename</p>
                    <input type="text"
                           value={this.state.dbcFilename}
                           size={this.state.dbcFilename.length}
                           onChange={(e) =>
                            this.setState({dbcFilename: e.target.value})} />
                </div>);
    }

    render() {
        return (<Modal title={"Save DBC"}
                       continueText={"Commit to GitHub"}
                       continueEnabled={this.state.openDbcFork != null
                                        && this.state.dbcFilename.length > 0}
                       onCancel={this.props.onCancel}
                       onContinue={this.onContinue}>
                    <p>Save your DBC modificiations to GitHub</p>
                    {this.forkStep()}
                    {this.nameStep()}
                </Modal>);
    }
}

const Styles = StyleSheet.create({
    step: {
        borderBottom: '1px solid rgba(0,0,0,0.2)',
        flexDirection: 'row',
        paddingTop: 10,
        paddingBottom: 10
    },
    stepDone: {
        color: 'rgb(200,200,200)'
    },
    forkOpenDbc: {
        ':hover': {
            textDecoration: 'underline'
        }
    },
    pointer: {
        cursor: 'pointer'
    }
});