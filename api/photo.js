import { get } from '@vercel/blob';
import { readSession, json } from './_lib.js';

export default async function handler(req, res) {
  const user = readSession(req);
  if (!user) return json(res, 401, { error: 'Not logged in' });
  const url = new URL(req.url, 'http://x');
  const p = url.searchParams.get('p') || '';
  if (!/^subs\/[a-z]+\/[\w.-]+\.jpe?g$/.test(p)) return json(res, 400, { error: 'Bad path' });
  const r = await get(p, { access: 'private' });
  if (!r || r.statusCode !== 200) { res.statusCode = 404; return res.end(); }
  res.statusCode = 200;
  res.setHeader('Content-Type', r.blob.contentType || 'image/jpeg');
  res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
  const buf = Buffer.from(await new Response(r.stream).arrayBuffer());
  res.end(buf);
}
