---
title: Database Setup
description: Configure SQLite, PostgreSQL, or MySQL database for Kener
---

Kener uses a relational database to store monitors, incidents, subscriptions, and other data. It supports three database systems: SQLite, PostgreSQL, and MySQL.

## Supported Databases {#supported-databases}

- **SQLite** (default) - Zero configuration, file-based database
- **PostgreSQL** - Enterprise-grade relational database
- **MySQL** - Popular open-source database

## Default Configuration {#default-configuration}

Kener uses **SQLite** as the default database. No configuration is required to get started.

### Default Settings {#default-settings}

- **Database Type**: SQLite
- **Database File**: `./database/kener.sqlite.db`
- **Auto-migration**: Enabled on startup

The database file is automatically created in the `database` folder in your project root when you first start Kener.

## Database Configuration {#database-configuration}

All database configuration is done through the `DATABASE_URL` environment variable. The connection string format determines which database system Kener will use.

### Connection String Format {#connection-string-format}

```
<database-type>://<connection-details>
```

Kener automatically detects the database type from the URL prefix:

- `sqlite://` → SQLite
- `postgresql://` → PostgreSQL
- `mysql://` → MySQL

## SQLite Configuration {#sqlite-configuration}

SQLite is the simplest option and requires no external database server.

### Minimum Configuration {#sqlite-minimum}

**No configuration needed!** Kener will automatically use SQLite with default settings.

### Custom SQLite Path {#sqlite-custom-path}

To use a custom database file location:

```env
DATABASE_URL=sqlite://./database/my-kener.db
```

Or store it in a different directory:

```env
DATABASE_URL=sqlite:///var/lib/kener/kener.db
```

> **Note:** Ensure the directory exists and the Kener process has write permissions.

### SQLite Requirements {#sqlite-requirements}

- ✅ No external database server needed
- ✅ No additional dependencies
- ✅ Automatic file creation
- ⚠️ Directory must be writable by Kener process

## PostgreSQL Configuration {#postgresql-configuration}

PostgreSQL is recommended for production deployments with high traffic or multiple instances.

### Minimum Configuration {#postgresql-minimum}

```env
DATABASE_URL=postgresql://username:password@localhost:5432/kener
```

### Connection String Format {#postgresql-format}

```
postgresql://[user]:[password]@[host]:[port]/[database]
```

### Example Configurations {#postgresql-examples}

**Local PostgreSQL:**

```env
DATABASE_URL=postgresql://kener:secretpassword@localhost:5432/kenerdb
```

**Remote PostgreSQL:**

```env
DATABASE_URL=postgresql://dbuser:dbpass@db.example.com:5432/kener
```

**PostgreSQL with SSL:**

```env
DATABASE_URL=postgresql://user:pass@host:5432/kener?sslmode=require
```

**Cloud PostgreSQL (e.g., Supabase, Neon, Railway):**

```env
DATABASE_URL=postgresql://user:pass@db.project.supabase.co:5432/postgres?sslmode=require
```

### PostgreSQL Requirements {#postgresql-requirements}

- ✅ PostgreSQL 12 or higher
- ✅ Database must exist before starting Kener
- ✅ User must have CREATE and ALTER privileges for migrations
- ✅ Tables will be created automatically on first run

## MySQL Configuration {#mysql-configuration}

MySQL is a popular choice for many hosting environments.

### Minimum Configuration {#mysql-minimum}

```env
DATABASE_URL=mysql://username:password@localhost:3306/kener
```

### Connection String Format {#mysql-format}

```
mysql://[user]:[password]@[host]:[port]/[database]
```

### Example Configurations {#mysql-examples}

**Local MySQL:**

```env
DATABASE_URL=mysql://root:password@localhost:3306/kenerdb
```

**Remote MySQL:**

```env
DATABASE_URL=mysql://dbuser:dbpass@db.example.com:3306/kener
```

**MySQL with options:**

```env
DATABASE_URL=mysql://user:pass@host:3306/kener?charset=utf8mb4
```

### MySQL Requirements {#mysql-requirements}

- ✅ MySQL 5.7 or higher (or MariaDB 10.2+)
- ✅ Database must exist before starting Kener
- ✅ User must have CREATE and ALTER privileges for migrations
- ✅ Tables will be created automatically on first run

## Database Migrations {#database-migrations}

Kener uses migrations to manage database schema changes. Migrations run automatically when you start Kener, but you can also run them manually.

### Automatic Migrations {#automatic-migrations}

By default, Kener automatically runs migrations on startup:

```bash
npm start
```

This ensures your database schema is always up to date.

### Manual Migrations {#manual-migrations}

To run migrations manually:

```bash
npm run migrate
```

This is useful for:

- Debugging migration issues
- Pre-applying migrations in CI/CD pipelines
- Separating migration execution from application startup

## Switching Databases {#switching-databases}

To switch from one database to another:

1. **Export your data** (if needed)
2. **Update `DATABASE_URL`** in your `.env` file
3. **Restart Kener** - migrations will run automatically
4. **Reconfigure monitors and settings**

> **Warning:** Switching databases does not migrate data. You'll need to set up monitors and configurations again, or manually migrate data between databases.

## Production Recommendations {#production-recommendations}

### For Small to Medium Deployments {#small-medium}

**SQLite** is perfectly fine for:

- Single-instance deployments
- Up to 100 monitors
- Low to medium traffic
- Simple setup requirements

### For Large or Multi-Instance Deployments {#large-deployments}

Use **PostgreSQL** or **MySQL** for:

- Multiple Kener instances
- High availability setups
- 100+ monitors
- High traffic scenarios
- Cloud deployments

### Performance Tips {#performance-tips}

1. **PostgreSQL**: Enable connection pooling for better performance
2. **MySQL**: Use InnoDB engine (default)
3. **SQLite**: Store database on SSD for faster I/O
4. **All databases**: Regular backups are essential

## Troubleshooting {#troubleshooting}

### Database connection failed {#connection-failed}

1. Verify `DATABASE_URL` is correctly formatted
2. Ensure database server is running (PostgreSQL/MySQL)
3. Check username and password are correct
4. Verify database exists and user has permissions
5. Check firewall rules allow connection

### Migration errors {#migration-errors}

1. Check database user has CREATE and ALTER privileges
2. Ensure database exists before running migrations
3. Try running migrations manually: `npm run migrate`
4. Check migration logs for specific errors

### SQLite permissions error {#sqlite-permissions}

1. Ensure `database` folder exists
2. Check folder is writable: `chmod 755 database`
3. Verify Kener process user has write permissions

### PostgreSQL/MySQL "database does not exist" {#database-not-exist}

Create the database before starting Kener:

**PostgreSQL:**

```sql
CREATE DATABASE kener;
```

**MySQL:**

```sql
CREATE DATABASE kener CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Environment Variables Summary {#environment-variables}

| Variable       | Description                | Default                               | Required |
| -------------- | -------------------------- | ------------------------------------- | -------- |
| `DATABASE_URL` | Database connection string | `sqlite://./database/kener.sqlite.db` | No       |

## Examples by Platform {#platform-examples}

### Docker Compose with PostgreSQL {#docker-postgres}

```yaml
version: "3.8"
services:
    kener:
        image: rajnandan1/kener
        environment:
            - DATABASE_URL=postgresql://kener:password@postgres:5432/kener
        depends_on:
            - postgres

    postgres:
        image: postgres:15
        environment:
            - POSTGRES_DB=kener
            - POSTGRES_USER=kener
            - POSTGRES_PASSWORD=password
        volumes:
            - postgres_data:/var/lib/postgresql/data

volumes:
    postgres_data:
```

### Railway with PostgreSQL {#railway}

Railway automatically provides a `DATABASE_URL` environment variable when you add a PostgreSQL database. Simply use the provided URL.

### Vercel with Supabase {#vercel-supabase}

1. Create a Supabase project
2. Get the connection string from Supabase dashboard
3. Add to Vercel environment variables:
    ```
    DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres?sslmode=require
    ```
