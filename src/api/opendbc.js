import GitHub from 'github-api';

import {OPENDBC_SOURCE_REPO} from '../config';
import {getUrlParameter} from '../utils/url';

const token = getUrlParameter('gh_access_token');
const github = new GitHub({token});
const openDbcSourceRepo = github.getRepo('commaai', 'opendbc');

let githubUsername = null;
async function setUser() {
    github.getUser().getProfile().then((resp) => {
        const profile = resp.data;
        githubUsername = profile.login;
    });
}
setUser();

async function list(repoFullName) {
  /*
  Lists files in a github repository.
  If no argument provided, assumes OpenDBC source repo
  (commaai/opendbc)
  */

  let repo;
  if(repoFullName === undefined) {
    repo = openDbcSourceRepo;
  } else {
    const [username, repoName] = repoFullName.split('/');
    repo = github.getRepo(username, repoName);
  }

  const response = await repo.getContents('master', '');

  return response.data.map((content) => content.path);
}

async function getDbcContents(dbcPath, repoFullName) {
  let repo;
  if(repoFullName === undefined) {
    repo = openDbcSourceRepo;
  } else {
    const [username, repoName] = repoFullName.split('/');
    repo = github.getRepo(username, repoName);
  }

  const fileContents = await repo.getContents('master', dbcPath);

  const rawContentsUrl = fileContents.data.download_url;
  const resp = await fetch(rawContentsUrl);

  return resp.text();
}

function repoSourceIsOpenDbc(repoDetails) {
    return repoDetails.source
            && repoDetails.source.full_name === OPENDBC_SOURCE_REPO;
}

async function getUserOpenDbcFork() {
    const openDbcFork = github.getRepo(githubUsername, 'opendbc');
    const repoDetailResp = await openDbcFork.getDetails();
    const repoDetails = repoDetailResp.data;

    if(repoSourceIsOpenDbc(repoDetails)) {
        return repoDetails.full_name;
    } else {
        return null;
    }
}

async function fork() {
    const forkResponse = await openDbcSourceRepo.fork();
    if(forkResponse.status === 202) {
        return true;
    } else {
        return false;
    }
}

async function commitFile(repoFullName, path, contents) {
    /*
    repo is of format username/reponame
    authenciated user must have write access to repo
    */
    const [user, repoName] = repoFullName.split('/');
    const repo = github.getRepo(user, repoName);
    const resp = await repo.writeFile('master', path, contents, 'OpenDBC updates', {});

    if(resp.status >= 200 && resp.status < 300) {
        return true;
    } else {
        return false;
    }
}

export default {list,
                getDbcContents,
                getUserOpenDbcFork,
                commitFile,
                fork};
