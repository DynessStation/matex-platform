// The one place that talks to the mail provider (Hostinger Mail API, a beta at the time of
// writing), so another one (IMAP/SMTP) can replace it. Mail stays at the provider: nothing here
// is stored. The token is read from the environment and never leaves the server.
import { HttpError } from '../helper/http-error.helper';

const TIMEOUT_MS = 15_000;

const baseUrl = () =>
  (process.env.MAIL_API_URL || 'https://api.mail.hostinger.com').replace(/\/+$/, '');

const token = () => (process.env.HOSTINGER_MAIL_API_TOKEN || '').trim();

export const isMailConfigured = () => Boolean(token());

export interface MailPagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

const request = async (path: string, init: RequestInit = {}): Promise<Response> => {
  if (!isMailConfigured()) {
    throw new HttpError(503, 'MAIL_NOT_CONFIGURED', 'Email is not set up yet');
  }
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      ...init,
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${token()}`,
        ...(init.body ? { 'content-type': 'application/json' } : {}),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new HttpError(502, 'MAIL_UNAVAILABLE', 'The mail service cannot be reached');
  }
  if (response.ok) return response;
  if (response.status === 404) throw new HttpError(404, 'MAIL_NOT_FOUND', 'Message not found');
  if (response.status === 429) {
    throw new HttpError(429, 'MAIL_BUSY', 'The mail service is busy. Try again shortly');
  }
  if (response.status === 401 || response.status === 403) {
    throw new HttpError(502, 'MAIL_TOKEN_REJECTED', 'The mail service refused the token');
  }
  if (response.status === 400 || response.status === 422) {
    throw new HttpError(400, 'MAIL_REQUEST_REFUSED', 'The mail service refused this request');
  }
  throw new HttpError(502, 'MAIL_UNAVAILABLE', 'The mail service cannot be reached');
};

const json = async <T>(path: string, init?: RequestInit): Promise<T> =>
  (await (await request(path, init)).json()) as T;

const box = (mailbox: string) => `/api/v1/mailboxes/${encodeURIComponent(mailbox)}`;
const inFolder = (mailbox: string, folder: string) =>
  `${box(mailbox)}/folders/${encodeURIComponent(folder)}`;

export const listMailboxes = async () =>
  (await json<{ data: { mailboxes: { resourceId: string; address: string }[] } }>('/api/v1/me'))
    .data.mailboxes;

export const listFolders = async (mailbox: string) =>
  (
    await json<{
      data: {
        path: string;
        name: string;
        specialUse?: string | null;
        messageCount: number;
        unreadCount: number;
      }[];
    }>(`${box(mailbox)}/folders?perPage=100`)
  ).data;

export interface MailSummary {
  uid: number;
  date: string;
  flags: string[];
  unseen: boolean;
  size: number;
  subject?: string;
  from?: { name?: string; address?: string }[];
  to?: { name?: string; address?: string }[];
  cc?: { name?: string; address?: string }[];
  attachments?: {
    id: string;
    contentType: string;
    sizeBytes: number;
    inline: boolean;
    filename?: string;
  }[];
}

export const listMessages = (mailbox: string, folder: string, page: number, perPage: number) =>
  json<{ data: MailSummary[]; pagination: MailPagination }>(
    `${inFolder(mailbox, folder)}/messages?page=${page}&perPage=${perPage}&sort=-date`,
  );

export const searchMessages = (
  mailbox: string,
  folder: string,
  query: { text?: string; flags?: string[] },
  page: number,
  perPage: number,
) =>
  json<{ data: MailSummary[]; pagination: MailPagination }>(
    `${inFolder(mailbox, folder)}/messages/search?page=${page}&perPage=${perPage}&sort=-date`,
    { method: 'POST', body: JSON.stringify(query) },
  );

export const getMessage = async (mailbox: string, folder: string, uid: number) => {
  const [message, content] = await Promise.all([
    json<{ data: MailSummary }>(`${inFolder(mailbox, folder)}/messages/${uid}`),
    json<{ data: { text?: string; html?: string } }>(
      `${inFolder(mailbox, folder)}/messages/${uid}/text`,
    ),
  ]);
  return { ...message.data, text: content.data.text ?? '', html: content.data.html ?? '' };
};

export const setSeen = (mailbox: string, folder: string, uid: number, seen: boolean) =>
  json<{ data: MailSummary }>(`${inFolder(mailbox, folder)}/messages/${uid}`, {
    method: 'PATCH',
    body: JSON.stringify(seen ? { addFlags: ['\\Seen'] } : { removeFlags: ['\\Seen'] }),
  });

export const moveMessage = async (
  mailbox: string,
  folder: string,
  uid: number,
  targetFolder: string,
) => {
  await request(`${inFolder(mailbox, folder)}/messages/${uid}/move`, {
    method: 'POST',
    body: JSON.stringify({ targetFolder }),
  });
};

export const getAttachment = (mailbox: string, folder: string, uid: number, id: string) =>
  request(`${inFolder(mailbox, folder)}/messages/${uid}/attachments/${encodeURIComponent(id)}`);

export interface MailOutgoing {
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  inReplyTo?: { uid: number; folder: string };
  forwardOf?: { uid: number; folder: string };
}

export const sendMessage = async (mailbox: string, message: MailOutgoing) => {
  await request(`${box(mailbox)}/send`, { method: 'POST', body: JSON.stringify(message) });
};
