---
title: Get started | Kener
description: Get started with Kener
---

# Get Started

Here is a demonstration of how to get started with Kener in seconds

## Requirements

- Node.js Minimum version required is `v18`.
- Git
- sqlite3

## Clone the repository

```bash
git clone https://github.com/rajnandan1/kener.git
cd kener
```

## Install Dependencies

```bash
npm install
```

## Set up Environment Variables

Kener needs some environment variables to be set to run properly. [Here](/docs/environment-vars) are the list of environment variables that you need to set.

```bash
cp .env.example .env
```

## Start Kener

```bash
npm run dev
```

Kener Development Server would be running at PORT 3000. Go to [http://localhost:3000](http://localhost:3000) to see the Kener in action.

<div class="note info">

Status page will be at [http://localhost:3000](http://localhost:3000)

Status Page Manage Portal will be at [http://localhost:3000/manage/app/site](http://localhost:3000/manage/app/site)

</div>

## Create a new User

If this is the first time your are launching kener then you would be redirected to the [set up page](/manage/setup). Fill in the details and click on `Let's Go` button.

- **Name**: Your Name
- **Email**: Your Email
- **Password**: Your Password

Please note that the email should be a valid email address and password should be atleast 8 characters long with uppercase lowercase and numbers.

## Login

Once you have created the user, you can login with the credentials you have provided by going to the [login page](/manage/signin)

## Video Tutorial

You can watch the video tutorial on how to get started with Kener

[![Kener Video Tutorial](https://img.youtube.com/vi/4L9PnWPqMPw/0.jpg)](https://www.youtube.com/watch?v=4L9PnWPqMPw)

## Next Steps

Learn how to configure kener by going through one of the topics

- [Monitors](/docs/monitors): Learn how to set up and work with monitors in kener.
- [Triggers](/docs/triggers): Learn how to set up and work with triggers in kener.
- [Environment Variables](/docs/environment-vars): Learn how to set up and work with environment variables in kener.
- [API](/docs/kener-apis): Learn how to use the API in kener.
- [Databases](/docs/database): Learn how to set up and work with databases in kener.
- [Theme](/docs/theme): Learn how to set up and work with theme in kener.
