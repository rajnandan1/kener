---
title: SQL Monitors | Kener
description: Monitor a SQL database
---

# SQL Monitors

SQL monitors are used to monitor a SQL database. You can monitor a SQL database by adding the database connection details to the monitor. The SQL monitor will check the database connection and notify you if the database connection is down.

<div class="border rounded-md">

![Monitors SQL](/documentation/m_sql.png)

</div>

## Database Type

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The database type is the type of the database you want to monitor. The database type should be one of the following values:

- mysql
- postgres

Instead of giving the connection string as plain text you can add environment variables to the connection string. The environment variables should be in the format of `$`. The environment variables should be defined in the `.env` file.

Example: `mysql://$MYSQL_USER:$MYSQL_PASSWORD@$MYSQL_HOST:$MYSQL_PORT/$MYSQL_DATABASE`

Make sure to define the environment variables in the `.env` file as shown below

```env
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=database
```

## Timeout

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The timeout is the time in milliseconds to wait for the database connection to respond.

## Connection String

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The connection string is the connection string of the database you want to monitor. The connection string should be a valid connection string for the database type you have selected.

## SQL Query

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The SQL query is the query you want to run on the database. The SQL query should be a valid SQL query for the database type you have selected.
