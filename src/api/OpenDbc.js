import GitHub from "github-api";

import { OPENDBC_SOURCE_REPO } from "../config";

export default class OpenDBC {
  constructor(token) {
    this.token = token;
    this.github = new GitHub({ token });
    this.sourceRepo = this.github.getRepo("commaai", "opendbc");
    this.githubUsername = null;
  }

  hasAuth() {
    return this.token !== null;
  }

  async getGithubUsername() {
    if (this.githubUsername) {
      return this.githubUsername;
    } else {
      const githubUsername = await this.fetchGithubUsername();
      if (githubUsername) {
        return githubUsername;
      }
    }
  }

  async fetchGithubUsername() {
    try {
      const user = await this.github.getUser();
      if (user) {
        const profile = await user.getProfile();
        if (profile) {
          return profile.data.login;
        }
      }
    } catch (e) {
      return null;
    }
  }

  async list(repoFullName) {
    /*
    Lists files in a github repository.
    If no argument provided, assumes OpenDBC source repo
    (commaai/opendbc)
    */

    let repo;
    if (repoFullName === undefined) {
      repo = this.sourceRepo;
    } else {
      const [username, repoName] = repoFullName.split("/");
      repo = this.github.getRepo(username, repoName);
    }
    try {
      const response = await repo.getContents("master", "");

      return response.data.map(content => content.path);
    } catch (e) {
      return [];
    }
  }

  async getDbcContents(dbcPath, repoFullName) {
    let repo;
    if (repoFullName === undefined) {
      repo = this.sourceRepo;
    } else {
      const [username, repoName] = repoFullName.split("/");
      repo = this.github.getRepo(username, repoName);
    }

    const fileContents = await repo.getContents("master", dbcPath);

    const rawContentsUrl = fileContents.data.download_url;

    const resp = await fetch(rawContentsUrl, { cache: "no-cache" });

    return resp.text();
  }

  repoSourceIsOpenDbc(repoDetails) {
    return (
      repoDetails.source && repoDetails.source.full_name === OPENDBC_SOURCE_REPO
    );
  }

  async getUserOpenDbcFork() {
    const githubUsername = await this.getGithubUsername();
    if (!githubUsername) return null;

    const openDbcFork = this.github.getRepo(githubUsername, "opendbc");
    const repoDetailResp = await openDbcFork.getDetails();
    const repoDetails = repoDetailResp.data;

    if (this.repoSourceIsOpenDbc(repoDetails)) {
      return repoDetails.full_name;
    } else {
      return null;
    }
  }

  async fork() {
    const forkResponse = await this.sourceRepo.fork();
    if (forkResponse.status === 202) {
      return true;
    } else {
      return false;
    }
  }

  async commitFile(repoFullName, path, contents, commitMessage) {
    /*
      repo is of format username/reponame
      authenciated user must have write access to repo
      */
    const [user, repoName] = repoFullName.split("/");
    const repo = this.github.getRepo(user, repoName);

    // get HEAD reference
    const refResp = await repo.getRef("heads/master");
    const ref = refResp.data;

    // get HEAD commit sha
    const headCommitResp = await repo.getCommit(ref.object.sha);
    const headCommit = headCommitResp.data;

    // get HEAD tree
    const headTreeResp = await repo.getTree(headCommit.tree.sha);
    const headTree = headTreeResp.data;

    // create new tree
    const tree = [
      {
        mode: "100644",
        path: path,
        type: "blob",
        content: contents
      }
    ];

    const createTreeResp = await repo.createTree(tree, headTree.sha);
    const createdTree = createTreeResp.data;

    // commit
    const commitResp = await repo.commit(
      headCommit.sha,
      createdTree.sha,
      commitMessage || "OpenDBC updates"
    );
    const commit = commitResp.data;

    // update HEAD
    const updateHeadResp = await repo.updateHead(
      "heads/master",
      commit.sha,
      false
    );

    return updateHeadResp.status === 200;
  }
}
