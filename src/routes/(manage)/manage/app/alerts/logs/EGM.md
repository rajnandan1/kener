# Alert Logs

## Overview

This folder has no page of its own, so `/manage/app/alerts/logs` serves nothing. It groups the alert log route, which lists the alerts that one alert config raised. An alert config is a rule in `monitor_alerts_config`. An alert is one raised event in `monitor_alerts_v2`.

## Subdirectories & Boundaries

- [[alert_config_id]](<./[alert_config_id]/EGM.md>): This route serves `/manage/app/alerts/logs/[alert_config_id]`. It lists the alerts of one alert config, marks an alert as `TRIGGERED` or `RESOLVED`, and deletes an alert and, if the user picks it, the linked incident. It needs `alerts.read` to open and `alerts.write` to change data.
