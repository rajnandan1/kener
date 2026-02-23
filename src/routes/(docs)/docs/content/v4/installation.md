---
title: Installation
description: Complete guide to installing Kener via npm, Docker, or Docker Compose
---

This guide covers all the installation methods available for Kener.

## System Requirements

| Requirement | Minimum               | Recommended   |
| ----------- | --------------------- | ------------- |
| Node.js     | 18.x                  | 20.x or later |
| RAM         | 512 MB                | 1 GB          |
| Storage     | 500 MB                | 2 GB          |
| OS          | Linux, macOS, Windows | Linux         |

## Installation Methods

### Method 1: npm (Recommended for Development)

The simplest way to get started:

```bash
# Clone the repository
git clone https://github.com/rajnandan1/kener.git
cd kener

# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start development server
npm run dev
```

### Method 2: Docker

Perfect for production deployments:

```bash
# Pull the latest image
docker pull rajnandan1/kener:latest

# Run with volume mounts
docker run -d \
  --name kener \
  -p 3000:3000 \
  -v $(pwd)/database:/app/database \
  -e KENER_SECRET_KEY=your-secret-key \
  rajnandan1/kener:latest
```

### Method 3: Docker Compose

For easier management with Docker:

```yaml
# docker-compose.yml
version: "3.8"
services:
    kener:
        image: rajnandan1/kener:latest
        ports:
            - "3000:3000"
        volumes:
            - ./database:/app/database
        environment:
            - KENER_SECRET_KEY=your-secret-key
            - DATABASE_URL=sqlite://./database/kener.db
        restart: unless-stopped
```

Run with:

```bash
docker-compose up -d
```

## Database Setup

### SQLite (Default)

SQLite requires no additional setup. Just set:

```env
DATABASE_URL=sqlite://./database/kener.db
```

### PostgreSQL

For production, PostgreSQL is recommended:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/kener
```

### MySQL

MySQL is also supported:

```env
DATABASE_URL=mysql://user:password@localhost:3306/kener
```

## Running Migrations

After installation, run migrations to set up the database:

```bash
npm run migrate
```

## Verifying Installation

After starting Kener:

1. Open `http://localhost:3000` in your browser
2. You should see the status page
3. Navigate to `/manage` to access the admin panel
4. Create your admin account

## Troubleshooting

### Port Already in Use

```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process or use a different port
PORT=3001 npm run dev
```

### Permission Errors

```bash
# Fix folder permissions
chmod -R 755 ./database
```

### Database Connection Failed

Verify your `DATABASE_URL` is correct and the database server is running.

## Next Steps

- Configure your [environment variables](/docs/configuration)
- Set up your first [monitor](/docs/monitors)
- Customize your [status page](/docs/configuration)
