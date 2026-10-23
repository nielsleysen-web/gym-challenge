import { put, list } from '@vercel/blob';
import { USERS, readSession, localDate, isYmd, json } from './_lib.js';

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  const user = readSession(req);
  if (!user) return json(res, 401, { error: 'Not logged in' });
  if (USERS[user].admin) return json(res, 403, { error: 'Admin account cannot upload' });

  const date = String(req.headers['x-date'] || '');
  const tz = Number(req.headers['x-tz'] || 'NaN');
  if (!isYmd(date) || !Number.isFinite(tz) || tz < -840 || tz > 720) return json(res, 400, { error: 'Bad date/timezone' });
  if (localDate(tz) !== date) return json(res, 400, { error: 'That date is not today in your timezone. Uploads only count on the day itself.' });

  const buf = Buffer.isBuffer(req.body) ? req.body : await readBody(req);
  if (buf.length < 1000) return json(res, 400, { error: 'Empty image' });
  if (buf.length > 4_000_000) return json(res, 413, { error: 'Image too large' });
  if (!(buf[0] === 0xff && buf[1] === 0xd8)) return json(res, 400, { error: 'Only JPEG images' });

  const prefix = `subs/${user}/${date}`;
  const existing = await list({ prefix, limit: 1 });
  if (existing.blobs.length) return json(res, 409, { error: 'Already uploaded today — one photo per day, and it cannot be changed.' });

  const blob = await put(`${prefix}-${Date.now().toString(36)}.jpg`, buf, {
    access: 'private',
    contentType: 'image/jpeg',
    addRandomSuffix: true,
  });
  return json(res, 200, { ok: true, pathname: blob.pathname, date });
}
