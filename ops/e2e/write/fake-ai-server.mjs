// A stand-in for the OpenAI Responses API for the write tests. Nothing here reaches the real
// provider. It answers translation requests only, and predictably: every value comes back with
// "EN " in front (inside the first tag for HTML). A value containing GAGAL-TERJEMAH makes the
// request fail, and so does any request to write or improve text, so the tests can see both
// the success and the fallback of English filled on save.
// GET /__requests lists what was asked; POST /__reset clears it.
import { createServer } from 'node:http';

const KEY = 'e2e-ai-key';
const requests = [];

const english = (value) => {
  if (!value) return '';
  if (value.trimStart().startsWith('<')) return value.replace('>', '>EN ');
  return `EN ${value}`;
};

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true });
  if (req.method === 'GET' && req.url === '/__requests') return send(res, 200, requests);
  if (req.method === 'POST' && req.url === '/__reset') {
    requests.length = 0;
    return send(res, 200, { ok: true });
  }
  if (req.method !== 'POST' || req.url !== '/v1/responses') {
    return send(res, 404, { error: { code: 'not_found' } });
  }
  if (req.headers.authorization !== `Bearer ${KEY}`) {
    return send(res, 401, { error: { code: 'invalid_api_key' } });
  }
  let raw = '';
  req.on('data', (chunk) => (raw += chunk));
  req.on('end', () => {
    let task = '';
    let fields = {};
    try {
      const body = JSON.parse(raw);
      const user = JSON.parse(body.input.find((item) => item.role === 'user').content);
      task = String(user.task ?? '');
      fields = user.fields ?? {};
    } catch {
      return send(res, 400, { error: { code: 'invalid_request' } });
    }
    requests.push({ task: task.slice(0, 40), fields });
    const translating = task.startsWith('Translate');
    const broken = Object.values(fields).some((value) => String(value).includes('GAGAL-TERJEMAH'));
    if (!translating || broken) return send(res, 500, { error: { code: 'server_error' } });
    const answer = {
      fields: Object.entries(fields).map(([key, value]) => ({
        key,
        value: english(String(value)),
      })),
    };
    return send(res, 200, { output_text: JSON.stringify(answer) });
  });
}).listen(3198, '127.0.0.1');
