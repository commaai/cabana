import React, {Component} from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import PropTypes from 'prop-types';

import Modal from './Modal';
import DBC from '../models/can/dbc';
import OpenDbcList from './OpenDbcList';
import DbcUpload from './DbcUpload';
import GithubDbcSelect from './GithubDbcSelect';

export default class LoadDbcModal extends Component {
  static propTypes = {
    onCancel: PropTypes.func.isRequired,
    onDbcSelected: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      tab: 'OpenDBC',
      dbc: null,
      dbcSource: null
    }

    this.onDbcLoaded = this.onDbcLoaded.bind(this);
    this.onContinue = this.onContinue.bind(this);
  }

  tabContent() {
    const {tab} = this.state;
    if(tab === 'OpenDBC') {
      return (<OpenDbcList
                onDbcLoaded={this.onDbcLoaded} />);
    } else if(tab === 'GitHub') {
      return (<GithubDbcSelect
                onDbcLoaded={this.onDbcLoaded}/>);
    } else if(tab === 'Upload') {
      return (<DbcUpload
                onDbcLoaded={this.onDbcLoaded} />);
    }
  }

  tab(tabName) {
    return <p className={css(Styles.tab, this.state.tab === tabName ? Styles.selectedTab : null)}
              onClick={() => {this.setState({tab: tabName, dbc: null})}}>
            {tabName}
           </p>
  }

  onDbcLoaded(dbcSource, dbcText) {
    const dbc = new DBC(dbcText);
    this.setState({dbcSource, dbc})
  }

  onContinue() {
    const {dbc, dbcSource} = this.state;
    if(dbc !== null) {
      this.props.onDbcSelected(dbcSource, dbc);
    }
  }

  render() {
    return  <Modal title={"Load DBC"}
                   continueEnabled={this.state.dbc !== null}
                   onCancel={this.props.onCancel}
                   onContinue={this.onContinue}>
                <div className={css(Styles.tabs)}>
                  {this.tab('OpenDBC')}
                  {this.tab('GitHub')}
                  {this.tab('Upload')}
                </div>
                <div className={css(Styles.tab)}>
                  {this.tabContent()}
                </div>
            </Modal>;
  }
}

const Styles = StyleSheet.create({
  tab: {
    display: 'inline',
    marginRight: 20,
    cursor: 'pointer'
  },
  selectedTab: {
    borderBottom: '2px solid #000',
    fontWeight: 'bold'
  },
});
