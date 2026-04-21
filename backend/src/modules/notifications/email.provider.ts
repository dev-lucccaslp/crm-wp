/**
 * Pluggable email provider — troque o binding no NotificationsModule.
 * Dev: ConsoleEmailProvider (log). Prod: ResendEmailProvider (lazy).
 */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export abstract class EmailProvider {
  abstract send(msg: EmailMessage): Promise<void>;
}
