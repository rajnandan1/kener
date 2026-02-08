---
title: Quick Start
description: Get Kener up and running in under 5 minutes
---

Get Kener up and running in under 5 minutes with this quick start guide.

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18 or higher installed
- **npm** or **pnpm** package manager
- A terminal or command prompt

## Installation

### Option 1: Clone from GitHub

```bash
# Clone the repository
git clone https://github.com/rajnandan1/kener.git

# Navigate to the directory
cd kener

# Install dependencies
npm install
```

### Option 2: Using Docker

```bash
docker pull rajnandan1/kener:latest

docker run -d \
  -p 3000:3000 \
  -v ./database:/app/database \
  rajnandan1/kener:latest
```

## Configuration

Create a `.env` file in the root directory:

```env
# Required
KENER_SECRET_KEY=your-secret-key-here

# Database (SQLite is default)
DATABASE_URL=sqlite://./database/kener.db

# Optional: Email notifications
RESEND_API_KEY=your-resend-api-key
RESEND_SENDER_EMAIL=noreply@yourdomain.com
```

## Running Kener

### Development Mode

```bash
npm run dev
```

This starts the development server with hot reload at `http://localhost:3000`.

### Production Mode

```bash
# Build the application
npm run build

# Start the server
npm start
```

## First Steps

Once Kener is running:

1. Navigate to `http://localhost:3000/manage`
2. Create your first admin account
3. Add a monitor to start tracking
4. View your status page at `http://localhost:3000`

## What's Next?

- Learn about [Monitors](/docs/monitors) and their configuration
- Understand how to manage [Incidents](/docs/incidents)
- Explore the full [Configuration](/docs/configuration) options
- Check out the [API Reference](/docs/api-reference) for integrations
