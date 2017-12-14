import React, { Component } from "react";
import cx from "classnames";
import PropTypes from "prop-types";
import FileSaver from "file-saver";

import OpenDbc from "../api/OpenDbc";
import DBC from "../models/can/dbc";
import Modal from "./Modals/baseModal";
// import TabStyles from '../styles/modal-tabs';

export default class SaveDbcModal extends Component {
  static propTypes = {
    dbc: PropTypes.instanceOf(DBC).isRequired,
    sourceDbcFilename: PropTypes.string.isRequired,
    handleClose: PropTypes.func.isRequired,
    onDbcSaved: PropTypes.func.isRequired,
    openDbcClient: PropTypes.instanceOf(OpenDbc).isRequired,
    hasGithubAuth: PropTypes.bool.isRequired,
    loginWithGithub: PropTypes.element.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      tab: "GitHub",
      openDbcFork: null,
      dbcFilename: this.props.sourceDbcFilename,
      tabs: ["GitHub", "Download"],
      commitMessage: "OpenDBC updates"
    };

    this.commitToGitHub = this.commitToGitHub.bind(this);
    this.downloadDbcFile = this.downloadDbcFile.bind(this);
    this.forkOpenDbcAndWait = this.forkOpenDbcAndWait.bind(this);
    this.renderForkButton = this.renderForkButton.bind(this);
    this.renderTabNavigation = this.renderTabNavigation.bind(this);
    this.renderActions = this.renderActions.bind(this);
  }

  async componentWillMount() {
    const openDbcFork = await this.props.openDbcClient.getUserOpenDbcFork();
    this.setState({ openDbcFork });
  }

  async commitToGitHub() {
    const { openDbcFork, dbcFilename } = this.state;
    const filename = dbcFilename.replace(/\.dbc/g, "") + ".dbc";
    const success = await this.props.openDbcClient.commitFile(
      openDbcFork,
      filename,
      this.props.dbc.text(),
      this.state.commitMessage
    );
    if (success) {
      this.props.onDbcSaved(filename);
    }
  }

  async downloadDbcFile() {
    const blob = new Blob([this.props.dbc.text()], {
      type: "text/plain;charset=utf-8"
    });
    const filename = this.state.dbcFilename.replace(/\.dbc/g, "") + ".dbc";
    FileSaver.saveAs(blob, filename, true);
  }

  async forkOpenDbcAndWait() {
    const forkResponseSuccess = await this.props.openDbcClient.fork();
    if (forkResponseSuccess) {
      let isTimedOut = false;
      const timeout = window.setTimeout(() => {
        isTimedOut = true;
      }, 30000);

      const interval = window.setInterval(() => {
        if (!isTimedOut) {
          this.props.openDbcClient.getUserOpenDbcFork().then(openDbcFork => {
            if (openDbcFork !== null) {
              this.setState({ openDbcFork });
              window.clearInterval(interval);
              window.clearTimeout(timeout);
            }
          });
        } else {
          window.clearInterval(interval);
        }
      }, 3000);
    } else {
      // fork failed
    }
  }

  primaryActionDisabled() {
    const { tab } = this.state;
    if (tab === "GitHub") {
      return (
        this.state.openDbcFork != null && this.state.dbcFilename.length > 0
      );
    } else if (tab === "Download") {
      return true;
    }
  }

  renderForkButton() {
    return (
      <button onClick={this.forkOpenDbcAndWait}>
        <i className="fa fa-code-fork" />
        <span> Fork OpenDBC</span>
      </button>
    );
  }

  renderForkStep() {
    const { openDbcFork } = this.state;
    let content;
    if (openDbcFork !== null) {
      content = (
        <button disabled>
          <i className="fa fa-code-fork" />
          <span> Forked: {openDbcFork}</span>
        </button>
      );
    } else if (this.props.hasGithubAuth) {
      content = this.renderForkButton();
    } else {
      content = this.props.loginWithGithub;
    }
    return (
      <div>
        {openDbcFork !== null ? this.renderForkButton() : null}
        {content}
        <hr />
      </div>
    );
  }

  renderFilenameField() {
    return (
      <div className="form-field" data-extension=".dbc">
        <label htmlFor="filename">
          <span>Choose a filename:</span>
          <sup>Pick a unique name for your car DBC file</sup>
        </label>
        <input
          type="text"
          id="filename"
          value={this.state.dbcFilename.replace(/\.dbc/g, "")}
          size={this.state.dbcFilename.length + 2}
          onChange={e => this.setState({ dbcFilename: e.target.value })}
        />
      </div>
    );
  }

  renderTabNavigation() {
    return (
      <div className="cabana-tabs-navigation">
        {this.state.tabs.map(tab => {
          return (
            <a
              className={cx({ "is-active": this.state.tab === tab })}
              onClick={() => {
                this.setState({ tab });
              }}
              key={tab}
            >
              <span>{tab}</span>
            </a>
          );
        })}
      </div>
    );
  }

  renderCommitMessage() {
    return (
      <div className="form-field">
        <label htmlFor="commit-message">
          <span>Commit Message:</span>
          <sup>Message appears in git logs</sup>
        </label>
        <input
          type="text"
          id="commit-message"
          value={this.state.commitMessage}
          onChange={e => this.setState({ commitMessage: e.target.value })}
        />
      </div>
    );
  }

  renderTabContent() {
    const { tab } = this.state;
    if (tab === "GitHub") {
      return (
        <div>
          {this.renderForkStep()}
          {this.renderFilenameField()}
          {this.renderCommitMessage()}
        </div>
      );
    } else if (tab === "Download") {
      return <div>{this.renderFilenameField()}</div>;
    }
  }

  renderActions() {
    const { tab } = this.state;
    if (tab === "GitHub") {
      return (
        <div>
          <button className="button--inverted" onClick={this.props.handleClose}>
            <span>Cancel</span>
          </button>
          <button className="button--primary" onClick={this.commitToGitHub}>
            <span>Commit to GitHub</span>
          </button>
        </div>
      );
    } else if (tab === "Download") {
      return (
        <div>
          <button className="button--inverted" onClick={this.props.handleClose}>
            <span>Cancel</span>
          </button>
          <button className="button--primary" onClick={this.downloadDbcFile}>
            <span>Download</span>
          </button>
        </div>
      );
    }
  }

  render() {
    return (
      <Modal
        title="Save DBC File"
        subtitle="Save your progress and output to a DBC file"
        handleClose={this.props.handleClose}
        navigation={this.renderTabNavigation()}
        actions={this.renderActions()}
      >
        {this.renderTabContent()}
      </Modal>
    );
  }
}
