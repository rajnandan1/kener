---
title: Heartbeat Monitor
description: Monitor cron jobs, scheduled tasks, and background processes with push-based heartbeat checks
---

Heartbeat monitors work differently from other monitor types - instead of Kener actively checking your service, your service sends periodic "heartbeat" signals to Kener. If Kener doesn't receive a heartbeat within the expected timeframe, it marks the service as degraded or down. This is ideal for monitoring cron jobs, scheduled tasks, batch processes, and background workers.

## How Heartbeat Monitoring Works {#how-heartbeat-monitoring-works}

Kener's Heartbeat monitoring follows a push-based workflow:

1. **Kener Generates URL**: Each heartbeat monitor gets a unique URL.
2. **Your Service Pings URL**: Your cron job or service sends HTTP requests to this URL.
3. **Kener Records Heartbeat**: Each request records a timestamp.
4. **Monitor Checks**: Kener's cron compares the last heartbeat time against the time now.
5. **Status Determination**: Based on how late the heartbeat is, status is UP, DEGRADED, or DOWN.

### Heartbeat Check Process {#heartbeat-check-process}

```
┌─────────────┐                         ┌─────────────┐
│  Your Cron  │ ──── GET/POST ────────► │   Kener     │
│  Job/Task   │  /ext/heartbeat/tag:secret   │   Server    │
└─────────────┘                         └─────────────┘
       │                                       │
       │                                     Record
       │                                    Timestamp
       ▼                                       ▼
┌─────────────────────────────────────────────────────┐
│ Kener's Cron Check (every minute):                  │
│                                                     │
│ Last received heartbeat: 14:05:00                   │
│ Current time: 14:12:00                              │
│                                                     │
│ Time Since Last Heartbeat: 7 minutes                │
│ Degraded threshold: 5 minutes → DEGRADED            │
│ Down threshold: 10 minutes → Still DEGRADED         │
└─────────────────────────────────────────────────────┘
```

## Configuration Options {#configuration-options}

| Field                          | Type     | Description                                                      | Default |
| :----------------------------- | :------- | :--------------------------------------------------------------- | :------ |
| **Degraded Remaining Minutes** | `number` | Mark as DEGRADED if no heartbeat received for this many minutes. | `5`     |
| **Down Remaining Minutes**     | `number` | Mark as DOWN if no heartbeat received for this many minutes.     | `10`    |

> [!NOTE]
> Heartbeat status is evaluated using **time since the last received heartbeat**. The monitor's `cron` value is not used for heartbeat timing.

## Heartbeat URL {#heartbeat-url}

Each heartbeat monitor gets a unique URL with a secret token:

```
https://your-kener-instance.com/ext/heartbeat/{monitor-tag}:{secret-token}
```

- **Method**: `GET` or `POST` (both work)
- **Authentication**: No authentication required (URL contains the unique secret)
- **Response**: Returns success status json

## Status Evaluation Logic {#status-evaluation-logic}

The heartbeat monitor uses time-based evaluation:

```javascript
// Pseudocode for heartbeat status evaluation
const lastHeartbeatMs = getLastHeartbeatTimestamp(monitor.tag) // timestamp in ms
const nowMs = getCurrentTime() // timestamp in ms

// Calculate time since the last heartbeat
const minutesSince = (nowMs - lastHeartbeatMs) / (60 * 1000)
const latencyMs = nowMs - lastHeartbeatMs

if (minutesSince > downRemainingMinutes) {
    return { status: "DOWN", latency: latencyMs }
}

if (minutesSince > degradedRemainingMinutes) {
    return { status: "DEGRADED", latency: latencyMs }
}

return { status: "UP", latency: latencyMs }
```

### Status Conditions {#status-conditions}

| Status       | Condition                                               | Meaning                             |
| :----------- | :------------------------------------------------------ | :---------------------------------- |
| **UP**       | Heartbeat received on time or within degraded threshold | Service running normally            |
| **DEGRADED** | Late by more than degraded threshold but less than down | Service may be slow or struggling   |
| **DOWN**     | Late by more than down threshold                        | Service likely failed               |
| **DOWN**     | No heartbeat ever received                              | Service never started or configured |

## Examples {#examples}

### 1. Basic Cron Job Monitoring {#basic-cron-job-monitoring}

Monitor a cron job that runs every 5 minutes.

```json
{
    "tag": "data-sync",
    "name": "Data Sync",
    "image": "/uploads/cron.png",
    "cron": "*/5 * * * *",
    "type": "HEARTBEAT",
    "type_data": {
        "degradedRemainingMinutes": 6,
        "downRemainingMinutes": 10
    }
}
```

**Heartbeat URL**: `https://kener.example.com/ext/heartbeat/data-sync:SOME-SECRET-TOKEN`

**Add to your cron job**:

```bash
*/5 * * * * /path/to/your/script.sh && curl -s https://kener.example.com/ext/heartbeat/data-sync:SOME-SECRET-TOKEN
```

### 2. Hourly Backup Job {#hourly-backup-job}

Monitor a backup that runs every hour.

```json
{
    "tag": "hourly-backup",
    "name": "Hourly Backup",
    "image": "/uploads/backup.png",
    "cron": "* * * * *",
    "type": "HEARTBEAT",
    "type_data": {
        "degradedRemainingMinutes": 65,
        "downRemainingMinutes": 120
    }
}
```

### 3. Daily Report Generation {#daily-report-generation}

Monitor a daily report that runs at 2 AM.

```json
{
    "tag": "daily-report",
    "name": "Daily Report",
    "image": "/uploads/report.png",
    "cron": "* * * * *",
    "type": "HEARTBEAT",
    "type_data": {
        "degradedRemainingMinutes": 1500,
        "downRemainingMinutes": 3000
    }
}
```

### 4. Background Worker Process {#background-worker-process}

Monitor a continuously running worker that should check in every minute.

```json
{
    "tag": "queue-worker",
    "name": "Queue Worker",
    "image": "/uploads/queue.png",
    "cron": "* * * * *",
    "type": "HEARTBEAT",
    "type_data": {
        "degradedRemainingMinutes": 2,
        "downRemainingMinutes": 5
    }
}
```

### 5. Weekly Maintenance Task {#weekly-maintenance-task}

Monitor a weekly cleanup job that runs Sundays at 3 AM.

```json
{
    "tag": "weekly-cleanup",
    "name": "Weekly Cleanup",
    "image": "/uploads/cleanup.png",
    "cron": "* * * * *",
    "type": "HEARTBEAT",
    "type_data": {
        "degradedRemainingMinutes": 10100,
        "downRemainingMinutes": 20200
    }
}
```

## Integration Examples {#integration-examples}

### Bash/Shell Script {#bash-integration}

```bash
#!/bin/bash
# your-script.sh

# Your actual task
do_something_important

# Send heartbeat on success
if [ $? -eq 0 ]; then
    curl -s https://kener.example.com/ext/heartbeat/your-monitor-tag:Secret-Token
fi
```

### Cron with Heartbeat {#cron-integration}

```cron
# Run every 5 minutes, send heartbeat on success
*/5 * * * * /path/to/script.sh && curl -s https://kener.example.com/ext/heartbeat/task-name:Secret-Token

# Run hourly, send heartbeat regardless (for long-running tasks)
0 * * * * /path/to/backup.sh; curl -s https://kener.example.com/ext/heartbeat/backup:Secret-Token
```

### Python Script {#python-integration}

```python
import requests

def main():
    # Your task logic
    # ...
    requests.get("https://kener.example.com/ext/heartbeat/python-task:Secret-Token")

if __name__ == "__main__":
    main()
```

### Node.js Script {#nodejs-integration}

```javascript
const https = require("https")

async function main() {
    // Your task logic
    # ...
    https.get("https://kener.example.com/ext/heartbeat/node-task:Secret-Token")
}

main()
```

### Docker Container {#docker-integration}

```dockerfile
# In your Dockerfile or entrypoint
CMD ["sh", "-c", "node app.js && curl -s https://kener.example.com/ext/heartbeat/container-task:Secret-Token"]
```

### Kubernetes CronJob {#kubernetes-integration}

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
    name: data-sync
spec:
    schedule: "*/5 * * * *"
    jobTemplate:
        spec:
            template:
                spec:
                    containers:
                        - name: data-sync
                          image: your-image
                          command:
                              - /bin/sh
                              - -c
                              - |
                                  /app/sync.sh
                                  curl -s https://kener.example.com/ext/heartbeat/data-sync:Secret-Token
                    restartPolicy: OnFailure
```

### GitHub Actions {#github-actions-integration}

```yaml
name: Scheduled Task
on:
    schedule:
        - cron: "0 * * * *" # Every hour

jobs:
    task:
        runs-on: ubuntu-latest
        steps:
            - name: Run task
              run: |
                  # Your task here
                  echo "Running scheduled task"

            - name: Send heartbeat
              run: curl -s https://kener.example.com/ext/heartbeat/github-action:Secret-Token
```

## Threshold Configuration Guide {#threshold-configuration-guide}

Choose thresholds based on your job's schedule and criticality:

| Job Frequency   | Degraded Threshold | Down Threshold | Rationale                          |
| :-------------- | :----------------- | :------------- | :--------------------------------- |
| Every minute    | 2 minutes          | 5 minutes      | Quick detection for frequent jobs  |
| Every 5 minutes | 5 minutes          | 15 minutes     | Allow some variance                |
| Hourly          | 15 minutes         | 60 minutes     | Jobs may take time to complete     |
| Daily           | 60 minutes         | 240 minutes    | Long lead time for daily processes |
| Weekly          | 120 minutes        | 480 minutes    | Very long lead for weekly tasks    |

## Best Practices {#best-practices}

### Heartbeat Placement {#best-practices-placement}

1. **Send at end of task**: Only send heartbeat after successful completion.
2. **Handle errors**: Don't send heartbeat if task fails.
3. **Use conditional execution**: `&& curl` only runs on success.

### Threshold Selection {#best-practices-thresholds}

1. **Consider task duration**: Allow time for the task itself to run.
2. **Add buffer**: Account for system load and variability.
3. **Match criticality**: Critical jobs need tighter thresholds.
4. **Test with failures**: Verify alerts trigger appropriately.

## Troubleshooting {#troubleshooting}

### Common Issues {#common-issues}

| Issue                  | Possible Cause                   | Solution                             |
| :--------------------- | :------------------------------- | :----------------------------------- |
| Always DOWN            | Heartbeat URL incorrect          | Verify URL and monitor tag           |
| No data                | Cron job not running             | Check cron daemon and job schedule   |
| Intermittent DEGRADED  | Task taking longer than expected | Increase thresholds or optimize task |
| Always DEGRADED        | Thresholds too tight             | Adjust degraded threshold            |
| Heartbeat not recorded | Network issues or firewall       | Verify connectivity to Kener         |

### Debug Tips {#debug-tips}

1. **Test heartbeat URL manually**:

    ```bash
    curl -v https://kener.example.com/ext/heartbeat/your-tag:Secret-Token
    ```

2. **Check cron logs**:

    ```bash
    grep CRON /var/log/syslog
    ```

3. **Verify task execution**:

    ```bash
    # Add logging to your script
    echo "$(date): Task started" >> /var/log/mytask.log
    ```

4. **Monitor network**: Ensure Kener is reachable from task host.

## Use Cases {#use-cases}

| Use Case                 | Example                                   |
| :----------------------- | :---------------------------------------- |
| **Database Backups**     | Verify backup jobs complete successfully  |
| **Data Synchronization** | Monitor ETL pipelines and data imports    |
| **Report Generation**    | Ensure scheduled reports are created      |
| **Cleanup Tasks**        | Verify log rotation and temp file cleanup |
| **Queue Workers**        | Monitor background job processors         |
| **Health Checks**        | Services that can't be externally polled  |
| **IoT Devices**          | Devices that periodically check in        |
| **CI/CD Pipelines**      | Monitor scheduled builds and deployments  |
