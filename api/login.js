import { USERS, PINS, makeSession, sessionCookie, json } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const user = String(body.user || '').toLowerCase().trim();
  const pin = String(body.pin || '').trim();
  if (!USERS[user]) return json(res, 400, { error: 'Unknown user' });
  if (!PINS[user]) return json(res, 500, { error: 'No PIN configured for this user (set PINS env var)' });
  if (pin !== PINS[user]) {
    await new Promise((r) => setTimeout(r, 600));
    return json(res, 401, { error: 'Wrong PIN' });
  }
  return json(res, 200, { ok: true, user, name: USERS[user].name, admin: !!USERS[user].admin, team: USERS[user].team || null }, {
    'Set-Cookie': sessionCookie(makeSession(user), 60 * 60 * 24 * 90),
  });
}
