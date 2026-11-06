import {
  IEmailAddress,
  IEmailMessage,
} from '../../shared/interface/email.interface';

// Pure rules of the Email page.

export const addressText = (items: IEmailAddress[] = []) =>
  items.map((item) => item.name || item.address || '').join(', ');

/** With the address: a name alone can claim to be anyone. */
export const addressFull = (items: IEmailAddress[] = []) =>
  items
    .map((item) =>
      item.name && item.address
        ? `${item.name} <${item.address}>`
        : item.address || item.name || '',
    )
    .join(', ');

const FOLDER_KEYS: Record<string, string> = {
  '\\inbox': 'inbox',
  '\\drafts': 'drafts',
  '\\junk': 'junk',
  '\\sent': 'sent',
  '\\trash': 'trash',
};

/** The word for a standard folder; other folders keep the name they have in the mailbox. */
export const folderKey = (specialUse: string | null) =>
  FOLDER_KEYS[(specialUse ?? '').toLowerCase()] ?? null;

export const addressList = (items: IEmailAddress[] = []) =>
  items
    .map((item) => item.address ?? '')
    .filter(Boolean)
    .join(', ');

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

/**
 * The document for the sandboxed frame. A mail's HTML comes from anyone: the frame has no scripts
 * and no same-origin rights, and the policy here stops it loading anything from outside (remote
 * pictures also tell the sender the mail was opened) until the reader allows pictures.
 */
export function mailDocument(
  message: Pick<IEmailMessage, 'html' | 'text'>,
  allowImages: boolean,
): string {
  const images = allowImages ? 'data: https:' : 'data:';
  const policy = `default-src 'none'; img-src ${images}; style-src 'unsafe-inline'; font-src data:`;
  const body =
    message.html ||
    `<pre style="white-space:pre-wrap;font:inherit;margin:0">${escapeHtml(message.text)}</pre>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><base target="_blank"><style>body{margin:12px;font:13px/1.5 Arial,sans-serif;color:#222;background:#fff;overflow-wrap:break-word}img{max-width:100%;height:auto}</style></head><body>${body}</body></html>`;
}

/** The mail has pictures that would load from outside. */
export const hasRemoteImages = (html: string) =>
  /<img\b[^>]*\ssrc\s*=\s*["']?https?:/i.test(html);

const withPrefix = (prefix: string, subject: string) =>
  new RegExp(`^${prefix}:`, 'i').test(subject)
    ? subject
    : `${prefix}: ${subject}`;

const quoted = (message: IEmailMessage) =>
  `\n\n--- ${addressText(message.from)}, ${new Date(message.date).toLocaleString('id-ID')} ---\n${message.text}`;

export const replySubject = (subject: string) => withPrefix('Re', subject);
export const forwardSubject = (subject: string) => withPrefix('Fwd', subject);
export const quotedBody = quoted;
