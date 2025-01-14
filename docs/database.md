---
title: Database Config - Server.yaml - Kener
description: Add database configuration to your kener server.yaml
---

# Databases

Kener uses relational database to store its data.

## Supported Database

-   Sqlite (default)
-   Postgres
-   Mysql

We will be adding more database support in the future.

## Sqlite

Sqlite is the default database for Kener. You don't need to do anything to use it. The database file will be created in the `database` folder which is present in the root of the project.

The name of the default database file is `kener.db`. The path will be `database/kener.sqlite.db`.

You can change the database file name by changing the environment variable `DATABASE_URL`. Prefix the connection string with `sqlite://` and add the path to the database file.

```bash
export DATABASE_URL=sqlite://./database/awesomeKener.db
```

In this case, the database file will be created in the `database` folder with the name `awesomeKener.db`.

Make sure the `database` folder is writable by the Kener process.

## Postgres

To use Postgres, you need to update the connection string details in the `DATABASE_URL` environment variable. The connection string has to with `postgresql`

```bash
export DATABASE_URL=postgresql://myuser:mypassword@your.host:5432/kenerdb
```

## Mysql

To use Mysql, you need to update the connection string details in the `DATABASE_URL` environment variable. The connection string has to with `mysql`

```bash
export DATABASE_URL=mysql://root:password@your.host:3306/kenerdb
```

## Migrations

To run migrations to latest, run

```bash
npm run migrate
```

When kener runs it will always migrate up to the latest version
