---
title: Github Setup | Kener
description: Kener uses github for incident management. Issues created in github using certain tags go to kener as incidents.
---

# Github Setup

Kener uses github for incident management. Issues created in github using certain tags go to kener as incidents.

## Step 1: Create Github Repository

Create a Github Repository. It can be either public or private. After you have created a repository open `site.yaml` and add them like this

```yaml
github:
    owner: "username"
    repo: "repository"
```

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

```shell
export GH_TOKEN=github_pat_11AD3ZA3Y0
```
