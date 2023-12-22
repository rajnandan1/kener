import axios from 'axios';
import { G as GetMinuteStartNowTimestampUTC } from './tool-5bef1c33.js';
import Markdoc from '@markdoc/markdoc';

const GH_TOKEN = process.env.GH_TOKEN;
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
const GetIncidents = async function(tagName, githubConfig, state = "all") {
  if (tagName === void 0) {
    return [];
  }
  if (githubConfig === void 0) {
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
    return [];
  }
};
async function Mapper(issue) {
  const ast = Markdoc.parse(issue.body);
  const content = Markdoc.transform(ast);
  const html = Markdoc.renderers.html(content);
  const comments = await GetCommentsForIssue(issue.number, this.github);
  const issueCreatedAt = new Date(issue.created_at);
  const issueCreatedAtTimestamp = issueCreatedAt.getTime() / 1e3;
  let issueClosedAtTimestamp = null;
  if (issue.closed_at !== null) {
    const issueClosedAt = new Date(issue.closed_at);
    issueClosedAtTimestamp = issueClosedAt.getTime() / 1e3;
  }
  return {
    title: issue.title,
    incident_start_time: GetStartTimeFromBody(issue.body) || issueCreatedAtTimestamp,
    incident_end_time: GetEndTimeFromBody(issue.body) || issueClosedAtTimestamp,
    number: issue.number,
    body: html,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    collapsed: true,
    comments: issue.comments,
    // @ts-ignore
    state: issue.state,
    closed_at: issue.closed_at,
    // @ts-ignore
    labels: issue.labels.map(function(label) {
      return label.name;
    }),
    html_url: issue.html_url,
    // @ts-ignore
    comments: comments.map((comment) => {
      const ast2 = Markdoc.parse(comment.body);
      const content2 = Markdoc.transform(ast2);
      const html2 = Markdoc.renderers.html(content2);
      return {
        body: html2,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        html_url: comment.html_url
      };
    })
  };
}
async function GetCommentsForIssue(issueID, githubConfig) {
  const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues/${issueID}/comments`;
  try {
    const response = await axios.request(getAxiosOptions(url));
    return response.data;
  } catch (error) {
    console.log(error.response.data);
    return [];
  }
}

export { GetIncidents as G, Mapper as M };
//# sourceMappingURL=github-3ae10cb0.js.map
