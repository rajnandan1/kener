// Types for request/response payloads.
// Keep these decoupled from DB models (DTOs) so you can evolve DB without breaking the API.

import type { MonitorPublicView } from "$lib/types/monitor";

export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export type GetMonitorsResponse = ApiResponse<{ monitors: MonitorPublicView[] }>;
