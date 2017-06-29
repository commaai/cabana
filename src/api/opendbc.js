import GitHub from 'github-api';

import {OPENDBC_SOURCE_REPO} from '../config';
import {getUrlParameter} from '../utils/url';

export default class OpenDBC {
  constructor(token) {
    this.token = token;
    this.github = new GitHub({token});
    this.sourceRepo = this.github.getRepo('commaai', 'opendbc');
    this.githubUsername = null;
  }

  hasAuth() {
    return this.token !== null;
  }

  async getGithubUsername() {
    if(this.githubUsername) {
      return this.githubUsername;
    } else {
      const githubUsername = await this.fetchGithubUsername();
      if(githubUsername) {
        return githubUsername;
      }
    }
  }

  async fetchGithubUsername() {
      const resp = await this.github.getUser().getProfile();
      if(resp) {
        return resp.data.login;
      }
  }

  async list(repoFullName) {
    /*
    Lists files in a github repository.
    If no argument provided, assumes OpenDBC source repo
    (commaai/opendbc)
    */

    let repo;
    if(repoFullName === undefined) {
      repo = this.sourceRepo;
    } else {
      const [username, repoName] = repoFullName.split('/');
      repo = this.github.getRepo(username, repoName);
    }

    const response = await repo.getContents('master', '');

    return response.data.map((content) => content.path);
  }

  async getDbcContents(dbcPath, repoFullName) {
    let repo;
    if(repoFullName === undefined) {
      repo = this.sourceRepo;
    } else {
      const [username, repoName] = repoFullName.split('/');
      repo = this.github.getRepo(username, repoName);
    }

    const fileContents = await repo.getContents('master', dbcPath);

    const rawContentsUrl = fileContents.data.download_url;
    const resp = await fetch(rawContentsUrl);

    return resp.text();
  }

  repoSourceIsOpenDbc(repoDetails) {
      return repoDetails.source
              && repoDetails.source.full_name === OPENDBC_SOURCE_REPO;
  }

  async getUserOpenDbcFork() {
      const githubUsername = await this.getGithubUsername();
      const openDbcFork = this.github.getRepo(githubUsername, 'opendbc');
      const repoDetailResp = await openDbcFork.getDetails();
      const repoDetails = repoDetailResp.data;

      if(this.repoSourceIsOpenDbc(repoDetails)) {
          return repoDetails.full_name;
      } else {
          return null;
      }
  }

  async fork() {
      const forkResponse = await this.sourceRepo.fork();
      if(forkResponse.status === 202) {
          return true;
      } else {
          return false;
      }
  }

  async commitFile(repoFullName, path, contents) {
      /*
      repo is of format username/reponame
      authenciated user must have write access to repo
      */
      const [user, repoName] = repoFullName.split('/');
      const repo = this.github.getRepo(user, repoName);
      const resp = await repo.writeFile('master', path, contents, 'OpenDBC updates', {});

      if(resp.status >= 200 && resp.status < 300) {
          return true;
      } else {
          return false;
      }
  }
}
