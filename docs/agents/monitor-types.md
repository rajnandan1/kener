# Monitor Types

A monitor type is one value of `MONITOR_TYPES` (for example `PROMETHEUS`), a check class in `src/lib/server/services/`, and a settings form in the admin dashboard. `src/lib/server/services/service.ts` picks the check class by `monitor.monitor_type`. An unknown type falls through to `NoneCall`, so a type with no branch there runs no checks and reports no error.

## Add a Monitor Type

Copy the existing type closest to yours. A new type `FOO` touches these places:

1. `src/lib/types/monitor.ts`: add `"FOO"` to `MONITOR_TYPES`.
2. `src/lib/server/types/monitor.ts`: add `FooMonitorTypeData`, add it to the `MonitorTypeData` union, and add `export type FooMonitor = Monitor<FooMonitorTypeData>`.
3. `src/lib/server/services/fooCall.ts`: the check class. Put `fooCall.test.ts` next to it.
4. `src/lib/server/services/service.ts`: import `FooCall`, add it to the `ServiceCall` union, and add a `monitor.monitor_type === "FOO"` branch.
5. `src/routes/(manage)/manage/app/monitors/[tag]/types/monitor-foo.svelte`: the settings form.
6. `src/routes/(manage)/manage/app/monitors/[tag]/types/index.ts`: export the form as `MonitorFoo`.
7. `src/routes/(manage)/manage/app/monitors/[tag]/components/MonitorTypeCard.svelte`: import `MonitorFoo`, add a `monitorTypeLabels` entry, add a `case "FOO"` to `isTypeSettingsValid`, and add an `{:else if monitor.monitor_type === "FOO"}` branch that renders the form.
8. Docs, with the documentation-writer skill: `src/routes/(docs)/docs/content/v4/monitors/foo.md`, an entry in `src/routes/(docs)/docs.json`, a line in `v4/monitors/overview.md`, and a row in the services table in `v4/architecture.md`.

`npm run check` catches a missing label: `monitorTypeLabels` is a `Record<MonitorType, string>`. It does not catch a missing branch in `service.ts`.

A type that stores its own records, like the Docker hosts behind `DOCKER`, also needs a migration, a repository, a controller, and a manage page. `git show --stat 71093d4d` lists every file that the Docker type added.
