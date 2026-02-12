export interface SiteAnnouncement {
  title: string;
  message: string;
  type: "INFO" | "WARNING" | "ERROR";
  reshowAfterInHours: number | null;
  cancellable: boolean;
  cta: string | null;
}
