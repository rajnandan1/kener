---
title: Database Config - Server.yaml - Kener
description: Add database configuration to your kener server.yaml
---

# Database Config

Use the `config/server.yaml` file to configure the database settings.

## Supported Database

-   Sqlite (default)
-   Postgres

We are adding more database support in the future.

## Sqlite

Sqlite is the default database for Kener. You don't need to do anything to use it. The database file will be created in the `database` folder.

The name of the default database file is `kener.db`. The path will be `database/kener.db`.

You can change the database file name by changing the `database` key in the `server.yaml` file.

```yaml
database:
    sqlite:
        dbName: awesomeKener.db
```

In this case, the database file will be created in the `database` folder with the name `awesomeKener.db`.

Make sure the `database` folder is writable by the Kener process.

## Postgres

To use Postgres, you need to provide the connection details in the `server.yaml` file.

```yaml
database:
	postgres:
		host: localhost
		port: 5432
		user: kener
		password: kener
		database: kener
```

Or if you want to use environment variables, you can do that as well. Make sure the environment variables are set before starting the Kener process. The environment variables should be `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_PASSWORD`, and `PG_DB`.

```yaml
database:
	postgres:
		host: $PG_HOST
		port: $PG_PORT
		user: $PG_USER
		password: $PG_PASSWORD
		database: $PG_DB
```
