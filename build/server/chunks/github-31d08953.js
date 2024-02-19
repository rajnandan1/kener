import axios from 'axios';
import { b as GetMinuteStartNowTimestampUTC } from './tool-b4b3e524.js';
import { marked } from 'marked';

const GH_TOKEN = process.env.GH_TOKEN;
const GhnotconfireguredMsg = "owner or repo or GH_TOKEN is undefined. Read the docs to configure github: https://kener.ing/docs#h2github-setup";
function getAxiosOptions(url) {
  const options = {
    url,
    method: "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + GH_TOKEN,
      "X-GitHub-Api-Version": "2022-11-28"
    }
  };
  return options;
}
function postAxiosOptions(url, data) {
  const options = {
    url,
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + GH_TOKEN,
      "X-GitHub-Api-Version": "2022-11-28"
    },
    data
  };
  return options;
}
function patchAxiosOptions(url, data) {
  const options = {
    url,
    method: "PATCH",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + GH_TOKEN,
      "X-GitHub-Api-Version": "2022-11-28"
    },
    data
  };
  return options;
}
const GetStartTimeFromBody = function(text) {
  const pattern = /\[start_datetime:(\d+)\]/;
  const matches = pattern.exec(text);
  if (matches) {
    const timestamp = matches[1];
    return parseInt(timestamp);
  }
  return null;
};
const GetEndTimeFromBody = function(text) {
  const pattern = /\[end_datetime:(\d+)\]/;
  const matches = pattern.exec(text);
  if (matches) {
    const timestamp = matches[1];
    return parseInt(timestamp);
  }
  return null;
};
const GetIncidentByNumber = async function(githubConfig, incidentNumber) {
  if (githubConfig.owner === void 0 || githubConfig.repo === void 0 || GH_TOKEN === void 0) {
    console.log(GhnotconfireguredMsg);
    return null;
  }
  const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues/${incidentNumber}`;
  const options = getAxiosOptions(url);
  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    console.log(error.message, options, url);
    return null;
  }
};
const GetIncidents = async function(tagName, githubConfig, state = "all") {
  if (githubConfig.owner === void 0 || githubConfig.repo === void 0 || GH_TOKEN === void 0) {
    console.log(GhnotconfireguredMsg);
    return [];
  }
  if (tagName === void 0) {
    return [];
  }
  const since = GetMinuteStartNowTimestampUTC() - githubConfig.incidentSince * 60 * 60;
  const sinceISO = new Date(since * 1e3).toISOString();
  const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues?state=${state}&labels=${tagName},incident&sort=created&direction=desc&since=${sinceISO}`;
  const options = getAxiosOptions(url);
  try {
    const response = await axios.request(options);
    let issues = response.data;
    issues = issues.filter((issue) => {
      return new Date(issue.created_at) >= new Date(sinceISO);
    });
    return issues;
  } catch (error) {
    console.log(error.response.data);
    return [];
  }
};
const GetOpenIncidents = async function(githubConfig) {
  if (githubConfig.owner === void 0 || githubConfig.repo === void 0 || GH_TOKEN === void 0) {
    console.log(GhnotconfireguredMsg);
    return [];
  }
  const since = GetMinuteStartNowTimestampUTC() - githubConfig.incidentSince * 60 * 60;
  const sinceISO = new Date(since * 1e3).toISOString();
  const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues?state=open&labels=incident&sort=created&direction=desc&since=${sinceISO}`;
  const options = getAxiosOptions(url);
  try {
    const response = await axios.request(options);
    let issues = response.data;
    issues = issues.filter((issue) => {
      return new Date(issue.created_at) >= new Date(sinceISO);
    });
    return issues;
  } catch (error) {
    console.log(error.response.data);
    return [];
  }
};
function FilterAndInsertMonitorInIncident(openIncidentsReduced, monitorsActive) {
  let openIncidentExploded = [];
  for (let i = 0; i < openIncidentsReduced.length; i++) {
    for (let j = 0; j < monitorsActive.length; j++) {
      if (openIncidentsReduced[i].labels.includes(monitorsActive[j].tag)) {
        let incident = JSON.parse(JSON.stringify(openIncidentsReduced[i]));
        incident.monitor = {
          name: monitorsActive[j].name,
          tag: monitorsActive[j].tag,
          image: monitorsActive[j].image,
          description: monitorsActive[j].description
        };
        openIncidentExploded.push(incident);
      }
    }
  }
  return openIncidentExploded;
}
function Mapper(issue) {
  const html = marked.parse(issue.body);
  const issueCreatedAt = new Date(issue.created_at);
  const issueCreatedAtTimestamp = issueCreatedAt.getTime() / 1e3;
  let issueClosedAtTimestamp = null;
  if (issue.closed_at !== null) {
    const issueClosedAt = new Date(issue.closed_at);
    issueClosedAtTimestamp = issueClosedAt.getTime() / 1e3;
  }
  let labels = issue.labels.map(function(label) {
    return label.name;
  });
  let res = {
    title: issue.title,
    incident_start_time: GetStartTimeFromBody(issue.body) || issueCreatedAtTimestamp,
    incident_end_time: GetEndTimeFromBody(issue.body) || issueClosedAtTimestamp,
    number: issue.number,
    body: html,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    collapsed: true,
    // @ts-ignore
    state: issue.state,
    closed_at: issue.closed_at,
    // @ts-ignore
    labels,
    html_url: issue.html_url,
    comments: []
  };
  return res;
}
async function GetCommentsForIssue(issueID, githubConfig) {
  if (githubConfig.owner === void 0 || githubConfig.repo === void 0 || GH_TOKEN === void 0) {
    console.log(GhnotconfireguredMsg);
    return [];
  }
  const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues/${issueID}/comments`;
  try {
    const response = await axios.request(getAxiosOptions(url));
    return response.data;
  } catch (error) {
    console.log(error.response.data);
    return [];
  }
}
async function CreateIssue(githubConfig, issueTitle, issueBody, issueLabels) {
  if (githubConfig.owner === void 0 || githubConfig.repo === void 0 || GH_TOKEN === void 0) {
    console.log(GhnotconfireguredMsg);
    return null;
  }
  const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues`;
  try {
    const payload = {
      title: issueTitle,
      body: issueBody,
      labels: issueLabels
    };
    const response = await axios.request(postAxiosOptions(url, payload));
    return response.data;
  } catch (error) {
    console.log(error.response.data);
    return null;
  }
}
async function UpdateIssue(githubConfig, incidentNumber, issueTitle, issueBody, issueLabels, state = "open") {
  if (githubConfig.owner === void 0 || githubConfig.repo === void 0 || GH_TOKEN === void 0) {
    console.log(GhnotconfireguredMsg);
    return null;
  }
  const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues/${incidentNumber}`;
  try {
    const payload = {
      title: issueTitle,
      body: issueBody,
      labels: issueLabels,
      state
    };
    const response = await axios.request(patchAxiosOptions(url, payload));
    return response.data;
  } catch (error) {
    console.log(error.response.data);
    return null;
  }
}
async function AddComment(githubConfig, incidentNumber, commentBody) {
  if (githubConfig.owner === void 0 || githubConfig.repo === void 0 || GH_TOKEN === void 0) {
    console.log(GhnotconfireguredMsg);
    return null;
  }
  const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues/${incidentNumber}/comments`;
  try {
    const payload = {
      body: commentBody
    };
    const response = await axios.request(postAxiosOptions(url, payload));
    return response.data;
  } catch (error) {
    console.log(error.response.data);
    return null;
  }
}
async function UpdateIssueLabels(githubConfig, incidentNumber, issueLabels, body, state = "open") {
  if (githubConfig.owner === void 0 || githubConfig.repo === void 0 || GH_TOKEN === void 0) {
    console.log(GhnotconfireguredMsg);
    return null;
  }
  const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues/${incidentNumber}`;
  try {
    const payload = {
      labels: issueLabels,
      body,
      state
    };
    const response = await axios.request(patchAxiosOptions(url, payload));
    return response.data;
  } catch (error) {
    console.log(error.response.data);
    return null;
  }
}

export { AddComment as A, CreateIssue as C, FilterAndInsertMonitorInIncident as F, GetOpenIncidents as G, Mapper as M, UpdateIssue as U, GetIncidents as a, GetIncidentByNumber as b, GetCommentsForIssue as c, UpdateIssueLabels as d, GetStartTimeFromBody as e, GetEndTimeFromBody as f };
//# sourceMappingURL=github-31d08953.js.map
