import axios from 'axios';
import moment from 'moment';
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
async function activeIncident(tagName, githubConfig) {
  const sinceHours = githubConfig.incidentSince || 24;
  const since = moment().subtract(sinceHours, "hours").toISOString();
  const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues?labels=${tagName},incident&state=open&sort=created&direction=desc&since=${since}`;
  try {
    const response = await axios.request(getAxiosOptions(url));
    return response.data;
  } catch (error) {
    console.log(error.response.data);
    return [];
  }
}
async function pastIncident(tagName, githubConfig) {
  const sinceHours = githubConfig.incidentSince || 24;
  const since = moment().subtract(sinceHours, "hours").toISOString();
  const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues?labels=${tagName},incident&state=closed&sort=created&direction=desc&since=${since}`;
  try {
    const response = await axios.request(getAxiosOptions(url));
    return response.data;
  } catch (error) {
    console.log(error.response.data);
    return [];
  }
}
async function getCommentsForIssue(issueID, githubConfig) {
  const url = `https://api.github.com/repos/${githubConfig.owner}/${githubConfig.repo}/issues/${issueID}/comments`;
  try {
    const response = await axios.request(getAxiosOptions(url));
    return response.data;
  } catch (error) {
    console.log(error.response.data);
    return [];
  }
}
async function mapper(issue) {
  const ast = Markdoc.parse(issue.body);
  const content = Markdoc.transform(ast);
  const html = Markdoc.renderers.html(content);
  const comments = await getCommentsForIssue(issue.number, this.github);
  return {
    title: issue.title,
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

export { activeIncident as a, mapper as m, pastIncident as p };
//# sourceMappingURL=incident2-deedf712.js.map
