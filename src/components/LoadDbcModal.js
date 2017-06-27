import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {css} from 'aphrodite/no-important';

import Modal from './Modal';
import DBC from '../models/can/dbc';
import OpenDbcList from './OpenDbcList';
import DbcUpload from './DbcUpload';
import GithubDbcList from './GithubDbcList';
import OpenDbc from '../api/opendbc';
import TabStyles from '../styles/modal-tabs';

export default class LoadDbcModal extends Component {
  static propTypes = {
    onCancel: PropTypes.func.isRequired,
    onDbcSelected: PropTypes.func.isRequired,
    hasGithubAuth: PropTypes.bool.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      tab: 'OpenDBC',
      dbc: null,
      dbcSource: null,
      userOpenDbcRepo: null
    }

    this.onDbcLoaded = this.onDbcLoaded.bind(this);
    this.onContinue = this.onContinue.bind(this);
  }

  componentWillMount() {
    OpenDbc.getUserOpenDbcFork().then((userOpenDbcRepo) => {
      this.setState({userOpenDbcRepo});
    });
  }

  tabContent() {
    const {tab} = this.state;
    if(tab === 'OpenDBC') {
      return (<GithubDbcList
                onDbcLoaded={this.onDbcLoaded}
                repo={"commaai/opendbc"} />);
    } else if(tab === 'GitHub') {
      if(!this.props.hasGithubAuth) {
        return (<div>Need to auth</div>);
      } else if(this.state.userOpenDbcRepo === null) {
        return (<div>Fork it</div>);
      } else {
        return (<GithubDbcList
                  onDbcLoaded={this.onDbcLoaded}
                  repo={this.state.userOpenDbcRepo } />);
      }
    } else if(tab === 'Upload') {
      return (<DbcUpload
                onDbcLoaded={this.onDbcLoaded} />);
    }
  }

  tab(tabName) {
    return <p className={css(TabStyles.tab, this.state.tab === tabName ? TabStyles.selectedTab : null)}
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
                <div className={css(TabStyles.tabs)}>
                  {this.tab('OpenDBC')}
                  {this.tab('GitHub')}
                  {this.tab('Upload')}
                </div>
                <div className={css(TabStyles.tabContent)}>
                  {this.tabContent()}
                </div>
            </Modal>;
  }
}
