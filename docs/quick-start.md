---
title: Get started | Kener
description: Get started with Kener
---

# Get Started

Here is a demonstration of how to get started with Kener in seconds

## Requirements

-   Node.js Minimum version required is `v18`.
-   Git
-   sqlite3

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

```bash
cp .env.example .env
```

## Start Kener

```bash
npm run dev
```

Kener Development Server would be running at PORT 3000. Go to [http://localhost:3000](http://localhost:3000)

## Create a new User

If this is the first time your are launching kener then you would be redirected to the [set up page](/setup). Fill in the details and click on `Let's Go` button.

-   **Name**: Your Name
-   **Email**: Your Email
-   **Password**: Your Password

Please note that the email should be a valid email address and password should be atleast 8 characters long with uppercase lowercase and numbers.

Please remember your password as it is not recoverable.

## Login

Once you have created the user, you can login with the credentials you have provided by going to the [login page](/signin)

## Next Steps

Learn how to manage kener by going through the [documentation](/docs/manage-kener)
