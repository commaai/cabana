import React, {Component} from 'react';
import { StyleSheet, css } from 'aphrodite/no-important';
import PropTypes from 'prop-types';

import OpenDbc from '../api/opendbc';

export default class GithubDbcList extends Component {
  static propTypes = {
    onDbcLoaded: PropTypes.func.isRequired,
    repo: PropTypes.string
  };

  constructor(props){
    super(props);

    this.state = {
      paths: [],
      selectedPath: null,
    };

    this.rowForPath = this.rowForPath.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if(nextProps.repo != this.props.repo) {
        OpenDbc.list(nextProps.repo).then((paths) => {
          this.setState({paths})
        })
    }
  }

  componentWillMount() {
    OpenDbc.list(this.props.repo).then((paths) => {
      this.setState({paths})
    })
  }

  selectPath(path) {
    this.setState({selectedPath: path})
    OpenDbc.getDbcContents(path, this.props.repo).then((dbcContents) => {
      this.props.onDbcLoaded(path, dbcContents);
    })
  }

  rowForPath(path) {
    const textClassName = this.state.selectedPath === path ? css(Styles.selectedPath) : null
    return (<div
                 key={path}
                 className={css(Styles.row)}
                 onClick={() => {this.selectPath(path)}}>
              <p className={textClassName}>{path}</p>
            </div>);
  }

  render() {
    return (<div className={css(Styles.root)}>
              <input className={css(Styles.search)} type="text" />
              <div className={css(Styles.list)}>
                {this.state.paths.map(this.rowForPath)}
              </div>
            </div>)
  }
}

const Styles = StyleSheet.create({
  root: {

  },
  row: {
    width: '100%',
    borderBottom: '1px solid black',
    cursor: 'pointer',
    paddingTop: 10,
    paddingBottom: 10
  },
  selectedPath: {
    fontWeight: 'bold'
  }
})
