import { list } from '@vercel/blob';
import { USERS, readSession, computeState, isYmd, json } from './_lib.js';

export async function listAll() {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix: 'subs/', limit: 1000, cursor });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

export default async function handler(req, res) {
  const user = readSession(req);
  if (!user) return json(res, 401, { error: 'Not logged in' });
  const url = new URL(req.url, 'http://x');
  const today = url.searchParams.get('today');
  const blobs = await listAll();
  const state = computeState(blobs, isYmd(today) ? today : new Date().toISOString().slice(0, 10));
  state.me = { id: user, name: USERS[user].name, team: USERS[user].team || null, admin: !!USERS[user].admin };
  if (!state.me.admin) {
    // non-admins don't need the raw per-day matrix beyond their view, but it is harmless; keep it lean
  }
  return json(res, 200, state);
}
