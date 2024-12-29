---
title: Github Setup | Kener
description: Kener uses github for incident management. Issues created in github using certain tags go to kener as incidents.
---

# Github Setup

Kener uses github for incident management. Issues created in github using certain tags go to kener as incidents.

## Step 1: Create Github Repository

Create a [Github Repository](https://github.com/new). It can be either public or private.

## Step 2: Create Github Token

You can create either a classic token or personal access token

### Creating Classic Token

-   Go to [Tokens](https://github.com/settings/tokens/new)
-   Note: kener
-   Expiration: No Expiration
-   Scopes: write:packages
-   Click on generate Token

### Creating Personal Access Token

-   Go to [Personal Access Token](https://github.com/settings/personal-access-tokens/new)
-   Token Name: kener
-   Expiration: Use custom to select a calendar date
-   Description: My Kener
-   Repository access: Check Only Selected Repositories. Select your github repository
-   Repository Permission: Select Issues Read Write
-   Click on generate token

## Step 3: Set environment

```bash
export GH_TOKEN=github_pat_11AD3ZA3Y0
```

## Step 4: Add to Kener

Add your repository details to kener.

![Monitors API](/gh_s.png)

### Github API URL

If you are on github enterprise you can set the github api url. For most users, it will be `https://api.github.com`

### Github Repo

The repository name you created in step 1

### Github Username

Your github username

### Incident History

It is in hours. It means if an issue is created before X hours then kener would not honor it. What it means, is that kener would not show it under active incidents nor it will update the uptime. Default is 30\*24 hours = 720 hours.
