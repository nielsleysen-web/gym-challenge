import { json, sessionCookie } from './_lib.js';

export default async function handler(req, res) {
  return json(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) });
}
