export interface NotificationEvent {
  eventURL: string;
  eventTitle: string;
  eventDate: string;
  eventType: string;
  eventStartDateTime: number;
  eventEndDateTime: number | null;
  eventStatus: string;
}
