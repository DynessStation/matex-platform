export interface IEmailMailboxes {
  /** False until the mail token is on the server. */
  configured: boolean;
  mailboxes: { id: string; address: string }[];
}

export interface IEmailFolder {
  path: string;
  name: string;
  special_use: string | null;
  total: number;
  unread: number;
}

export interface IEmailAddress {
  name?: string;
  address?: string;
}

export interface IEmailSummary {
  uid: number;
  date: string;
  unseen: boolean;
  answered: boolean;
  size: number;
  subject: string;
  from: IEmailAddress[];
  to: IEmailAddress[];
  cc: IEmailAddress[];
  attachments: {
    id: string;
    filename: string;
    content_type: string;
    size: number;
  }[];
}

export interface IEmailMessage extends IEmailSummary {
  text: string;
  html: string;
}

export interface IEmailMessagesResponse {
  data: IEmailSummary[];
  meta: { page: number; limit: number; total: number; total_pages: number };
}

export interface IEmailDraft {
  to: string;
  cc?: string;
  subject: string;
  text: string;
  in_reply_to?: { uid: number; folder: string };
  forward_of?: { uid: number; folder: string };
}
