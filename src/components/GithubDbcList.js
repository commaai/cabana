import React, { Component } from "react";
import cx from "classnames";
import PropTypes from "prop-types";

import OpenDbc from "../api/OpenDbc";

export default class GithubDbcList extends Component {
  static propTypes = {
    onDbcLoaded: PropTypes.func.isRequired,
    repo: PropTypes.string.isRequired,
    openDbcClient: PropTypes.instanceOf(OpenDbc).isRequired
  };

  constructor(props) {
    super(props);

    this.state = {
      paths: [],
      selectedPath: null,
      pathQuery: ""
    };

    this.updatePathQuery = this.updatePathQuery.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.repo !== this.props.repo) {
      this.props.openDbcClient.list(nextProps.repo).then(paths => {
        this.setState({ paths, selectedPath: null });
      });
    }
  }

  componentWillMount() {
    this.props.openDbcClient.list(this.props.repo).then(paths => {
      paths = paths.filter(path => path.indexOf(".dbc") !== -1);
      this.setState({ paths });
    });
  }

  updatePathQuery(e) {
    this.setState({
      pathQuery: e.target.value
    });
  }

  selectPath(path) {
    this.setState({ selectedPath: path });
    this.props.openDbcClient
      .getDbcContents(path, this.props.repo)
      .then(dbcContents => {
        this.props.onDbcLoaded(path, dbcContents);
      });
  }

  render() {
    return (
      <div className="cabana-dbc-list">
        <div className="cabana-dbc-list-header">
          <a href={`https://github.com/${this.props.repo}`} target="_blank">
            <i className="fa fa-github" />
            <span>{this.props.repo}</span>
          </a>
          <div className="form-field form-field--small">
            <input
              type="text"
              placeholder="Search DBC Files"
              onChange={this.updatePathQuery}
            />
          </div>
        </div>
        <div className="cabana-dbc-list-files">
          {this.state.paths
            .filter(
              p =>
                (this.state.pathQuery === "") | p.includes(this.state.pathQuery)
            )
            .map(path => {
              return (
                <div
                  className={cx("cabana-dbc-list-file", {
                    "is-selected": this.state.selectedPath === path
                  })}
                  onClick={() => {
                    this.selectPath(path);
                  }}
                  key={path}
                >
                  <span>{path}</span>
                </div>
              );
            })}
        </div>
      </div>
    );
  }
}
