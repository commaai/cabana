import React, {Component} from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import PropTypes from 'prop-types';
import FileSaver from 'file-saver';

import OpenDbc from '../api/opendbc';
import DBC from '../models/can/dbc';
import Modal from './Modal';
import TabStyles from '../styles/modal-tabs';

export default class SaveDbcModal extends Component {
    static propTypes = {
        dbc: PropTypes.instanceOf(DBC).isRequired,
        sourceDbcFilename: PropTypes.string.isRequired,
        onCancel: PropTypes.func.isRequired,
        onDbcSaved: PropTypes.func.isRequired,
        openDbcClient: PropTypes.instanceOf(OpenDbc).isRequired
    };

    constructor(props) {
        super(props);
        this.state = {
            tab: 'GitHub',
            openDbcFork: null,
            dbcFilename: this.props.sourceDbcFilename
        };

        this.onContinue = this.onContinue.bind(this);
        this.forkOpenDbcAndWait = this.forkOpenDbcAndWait.bind(this);
    }

    async componentWillMount() {
        const openDbcFork = await this.props.openDbcClient.getUserOpenDbcFork();
        this.setState({openDbcFork})
    }

    async onContinue() {
        const {tab} = this.state;
        if(tab === 'GitHub') {
            const {openDbcFork, dbcFilename} = this.state;
            const filename = this.state.dbcFilename.replace(/\.dbc/g, '') + '.dbc';
            const success = await this.props.openDbcClient.commitFile(openDbcFork,
                                                     filename,
                                                     this.props.dbc.text());
            if(success) {
                this.props.onDbcSaved(filename);
            }
        } else if(tab === 'Download') {
            const blob = new Blob([this.props.dbc.text()], {type: "text/plain;charset=utf-8"});


            const filename = this.state.dbcFilename.replace(/\.dbc/g, '') + '.dbc';
            FileSaver.saveAs(blob, filename, true);
        }
    }

    async forkOpenDbcAndWait() {
        const forkResponseSuccess = await this.props.openDbcClient.fork();
        if(forkResponseSuccess) {
            let isTimedOut = false;
            const interval = window.setInterval(() => {
                if(!isTimedOut) {
                    this.props.openDbcClient.getUserOpenDbcFork().then((openDbcFork) => {
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
                           value={this.state.dbcFilename.replace(/\.dbc/g, '')}
                           size={this.state.dbcFilename.length}
                           onChange={(e) =>
                            this.setState({dbcFilename: e.target.value})} />
                    <span className={css(Styles.fileExtension)}>.dbc</span>
                </div>);
    }

    tabContent() {
        const {tab} = this.state;
        if(tab === 'GitHub') {
            return (<div><p>Save your DBC modificiations to GitHub</p>
                    {this.forkStep()}
                    {this.nameStep()}</div>);
        } else if(tab === 'Download') {
            return (<div>
                        <p>Download your DBC</p>
                        {this.nameStep()}
                    </div>);
        }
    }

    tab(tabName) {
      return <p className={css(TabStyles.tab, this.state.tab === tabName ? TabStyles.selectedTab : null)}
                onClick={() => {this.setState({tab: tabName})}}>
              {tabName}
             </p>
    }

    continueText() {
        const {tab} = this.state;
        if(tab === 'GitHub'){
            return "Commit to GitHub";
        } else if(tab === 'Download') {
            return "Download";
        }
    }

    continueEnabled() {
        const {tab} = this.state;
        if(tab === 'GitHub') {
            return this.state.openDbcFork != null
                    && this.state.dbcFilename.length > 0
        } else if(tab === 'Download') {
            return true;
        }
    }

    render() {
        return (<Modal title={"Save DBC"}
                       continueText={this.continueText()}
                       continueEnabled={this.continueEnabled()}
                       onCancel={this.props.onCancel}
                       onContinue={this.onContinue}>
                   <div className={css(TabStyles.tabs)}>
                     {this.tab('GitHub')}
                     {this.tab('Download')}
                   </div>
                   <div className={css(TabStyles.tabContent)}>
                     {this.tabContent()}
                   </div>
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