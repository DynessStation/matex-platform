// A stand-in for the Hostinger Mail API for the write tests, with the shape of its OpenAPI spec
// (api.mail.hostinger.com/openapi/openapi.json). Nothing here reaches the real service.
// GET /__sent shows what was sent; POST /__reset puts the mailbox back.
import { createServer } from 'node:http';

const TOKEN = 'e2e-mail-token';
const MAILBOX = 'AC-E2E-1';

const seed = () => [
  {
    uid: 3,
    path: 'INBOX',
    date: '2026-11-05T10:00:00.000Z',
    flags: [],
    unseen: true,
    size: 2000,
    subject: 'Tanya harga kasur',
    from: { name: 'Budi Pelanggan', address: 'budi@example.invalid' },
    replyTo: [],
    to: [{ address: 'info@example.invalid' }],
    cc: [],
    attachments: [
      {
        id: 'att-1',
        contentType: 'text/html',
        sizeBytes: 12,
        inline: false,
        filename: 'surat penawaran.html',
      },
    ],
    text: 'Halo, berapa harga kasur?',
    html: '<p id="isi">Halo, <b>berapa</b> harga kasur?</p><img src="https://example.invalid/track.png" alt="gambar luar"><script>window.parent.document.title="DIRETAS"</script>',
  },
  {
    uid: 2,
    path: 'INBOX',
    date: '2026-11-04T10:00:00.000Z',
    flags: ['\\Seen', '\\Answered'],
    unseen: false,
    size: 800,
    subject: 'Kerja sama distributor',
    from: { name: 'Sari', address: 'sari@example.invalid' },
    replyTo: [{ name: 'Sari Kantor', address: 'sari.kantor@example.invalid' }],
    to: [{ address: 'info@example.invalid' }],
    cc: [],
    attachments: [],
    text: 'Kami tertarik bekerja sama.',
    html: '',
  },
  {
    uid: 1,
    path: 'INBOX',
    date: '2026-11-03T10:00:00.000Z',
    flags: ['\\Seen'],
    unseen: false,
    size: 600,
    subject: 'Sudah dibaca',
    // The real service can answer with no sender at all.
    from: null,
    replyTo: [],
    to: [{ address: 'info@example.invalid' }],
    cc: [],
    attachments: [],
    text: 'Pesan lama.',
    html: '',
  },
];

let messages = seed();
let sent = [];

const folders = () =>
  [
    ['INBOX', 'Inbox', '\\Inbox'],
    ['INBOX.Sent', 'Sent', '\\Sent'],
    ['INBOX.Trash', 'Trash', '\\Trash'],
  ].map(([path, name, specialUse]) => {
    const inside = messages.filter((item) => item.path === path);
    return {
      path,
      name,
      delimiter: '.',
      specialUse,
      messageCount: inside.length,
      unreadCount: inside.filter((item) => item.unseen).length,
    };
  });

const header = ({ text: _text, html: _html, ...rest }) => rest;

const page = (items, url) => {
  const current = Number(url.searchParams.get('page') ?? 1);
  const perPage = Number(url.searchParams.get('perPage') ?? 25);
  return {
    data: items.slice((current - 1) * perPage, current * perPage).map(header),
    pagination: {
      page: current,
      perPage,
      total: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / perPage)),
    },
  };
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
  const send = (status, data) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(data === undefined ? '' : JSON.stringify(data));
  };

  if (url.pathname === '/health') return send(200, { ok: true });
  if (url.pathname === '/__sent') return send(200, sent);
  if (url.pathname === '/__reset') {
    messages = seed();
    sent = [];
    return send(200, {});
  }
  if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(401, { message: 'no' });
  if (url.pathname === '/api/v1/me') {
    return send(200, {
      data: {
        orderResourceId: 'ORDER',
        mailboxes: [{ resourceId: MAILBOX, address: 'info@example.invalid' }],
      },
    });
  }

  const parts = url.pathname.split('/').map(decodeURIComponent);
  // ['', 'api', 'v1', 'mailboxes', id, ...rest]
  if (parts[3] !== 'mailboxes' || parts[4] !== MAILBOX) return send(404, { message: 'no box' });
  const rest = parts.slice(5);
  if (rest[0] === 'send') {
    if (!body.subject) return send(422, { message: 'subject' });
    sent.push(body);
    return send(204);
  }
  if (rest[0] !== 'folders') return send(404, {});
  if (rest.length === 1) return send(200, { data: folders(), pagination: {} });

  const folder = rest[1];
  const inside = messages.filter((item) => item.path === folder);
  if (rest[2] !== 'messages') return send(404, {});
  if (rest.length === 3) return send(200, page(inside, url));
  if (rest[3] === 'search') {
    const flagged = (item) => (body.flags ?? []).every((flag) => item.flags.includes(flag));
    const text = String(body.text ?? '').toLowerCase();
    return send(
      200,
      page(
        inside.filter(
          (item) =>
            flagged(item) &&
            `${item.subject} ${item.text} ${item.from?.address ?? ''}`.toLowerCase().includes(text),
        ),
        url,
      ),
    );
  }
  const message = inside.find((item) => item.uid === Number(rest[3]));
  if (!message) return send(404, {});
  if (rest[4] === 'text') return send(200, { data: { text: message.text, html: message.html } });
  if (rest[4] === 'attachments') {
    res.writeHead(200, { 'content-type': 'application/octet-stream' });
    return res.end('<h1>isi</h1>');
  }
  if (rest[4] === 'move') {
    message.path = body.targetFolder;
    return send(204);
  }
  if (req.method === 'PATCH') {
    message.flags = [
      ...message.flags.filter((flag) => !(body.removeFlags ?? []).includes(flag)),
      ...(body.addFlags ?? []),
    ];
    message.unseen = !message.flags.includes('\\Seen');
    return send(200, { data: header(message) });
  }
  return send(200, { data: header(message) });
});

server.listen(3199, '127.0.0.1');
