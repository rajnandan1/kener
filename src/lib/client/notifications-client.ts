import { resolve } from "$app/paths";
import clientResolver from "$lib/client/resolver.js";
import type { NotificationEvent } from "$lib/server/controllers/dashboardController.js";

interface NotificationsResponse {
  notifications?: NotificationEvent[];
}

export async function requestNotifications(monitorTags: string[] = []): Promise<NotificationEvent[]> {
  const query = monitorTags.length > 0 ? `?tags=${encodeURIComponent(monitorTags.join(","))}` : "";
  const response = await fetch(clientResolver(resolve, "/dashboard-apis/notifications") + query);

  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }

  const payload = (await response.json()) as NotificationsResponse;
  return payload.notifications || [];
}
