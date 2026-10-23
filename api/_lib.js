import crypto from 'node:crypto';

// ---------- Challenge configuration ----------
export const CHALLENGE = {
  title: 'November Gym Challenge',
  start: '2026-11-01',
  end: '2026-11-30',
  streakLength: 7,
  streakBonus: 3,
  prize: '€100 sportswear budget per person + you keep your gym membership',
};

export const TEAMS = [
  { id: 'a', name: 'Creative Crushers', color: '#ff5e3a', members: ['shawn', 'genesis'] },
  { id: 'b', name: 'Support Squad', color: '#2ec4b6', members: ['donna', 'aaron'] },
];

export const USERS = {
  shawn: { name: 'Shawn', team: 'a' },
  genesis: { name: 'Genesis', team: 'a' },
  donna: { name: 'Donna', team: 'b' },
  aaron: { name: 'Aaron', team: 'b' },
  niels: { name: 'Niels', admin: true },
};

// PINs: set PINS="shawn=1234,genesis=2345,donna=3456,aaron=4567,niels=9999" in Vercel env.
function loadPins() {
  const raw = process.env.PINS || '';
  const pins = {};
  for (const part of raw.split(',')) {
    const [u, p] = part.split('=').map((s) => (s || '').trim());
    if (u && p) pins[u.toLowerCase()] = p;
  }
  return pins;
}
export const PINS = loadPins();

const SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update('gym|' + (process.env.PINS || 'dev')).digest('hex');

// ---------- Sessions (signed cookie) ----------
function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}
export function makeSession(user) {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 90;
  const payload = `${user}.${exp}`;
  return `${payload}.${sign(payload)}`;
}
export function readSession(req) {
  const cookie = req.headers.cookie || '';
  const m = cookie.match(/(?:^|;\s*)gc_session=([^;]+)/);
  if (!m) return null;
  const [user, exp, sig] = m[1].split('.');
  if (!user || !exp || !sig) return null;
  const payload = `${user}.${exp}`;
  const good = sign(payload);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  if (Number(exp) < Date.now()) return null;
  if (!USERS[user]) return null;
  return user;
}
export function sessionCookie(value, maxAge) {
  return `gc_session=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

// ---------- Dates ----------
export function addDays(ymd, n) {
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function daysBetween(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}
export function localDate(tzOffsetMinutes, now = Date.now()) {
  // tzOffsetMinutes as JS getTimezoneOffset() (HK = -480)
  return new Date(now - tzOffsetMinutes * 60000).toISOString().slice(0, 10);
}
export const isYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

// ---------- Blob pathnames ----------
// subs/<user>/<YYYY-MM-DD>-<random>.jpg
export function parseEntry(blob) {
  const m = blob.pathname.match(/^subs\/([a-z]+)\/(\d{4}-\d{2}-\d{2})(?:-[^/]*)?\.jpe?g$/);
  if (!m || !USERS[m[1]] || USERS[m[1]].admin) return null;
  return { user: m[1], date: m[2], url: blob.url, uploadedAt: blob.uploadedAt, size: blob.size };
}

// ---------- Scoring ----------
export function computeState(blobs, today) {
  const entries = blobs.map(parseEntry).filter(Boolean);
  entries.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));

  // first upload per user per day counts
  const byUserDay = {};
  const feed = [];
  for (const e of entries) {
    byUserDay[e.user] ||= {};
    if (!byUserDay[e.user][e.date]) {
      byUserDay[e.user][e.date] = e;
      feed.push(e);
    }
  }

  const inWindow = (d) => d >= CHALLENGE.start && d <= CHALLENGE.end;
  const lastCountable = today < CHALLENGE.end ? today : CHALLENGE.end;

  const teams = TEAMS.map((t) => {
    const days = [];
    let points = 0, bonus = 0, run = 0, longest = 0, current = 0;
    const missed = [];
    for (let d = CHALLENGE.start; d <= CHALLENGE.end; d = addDays(d, 1)) {
      const ups = t.members.map((u) => byUserDay[u]?.[d] || null);
      const scored = ups.every(Boolean);
      const day = { date: d, scored, uploads: {} };
      t.members.forEach((u, i) => (day.uploads[u] = !!ups[i]));
      if (d <= lastCountable && d !== today) {
        // a closed day
        if (scored) {
          points += 1;
          run += 1;
          if (run % CHALLENGE.streakLength === 0) { bonus += CHALLENGE.streakBonus; day.bonus = true; }
          longest = Math.max(longest, run);
        } else {
          if (ups.some(Boolean)) {
            const slackers = t.members.filter((u, i) => !ups[i]).map((u) => USERS[u].name);
            missed.push({ date: d, slackers });
          }
          run = 0;
        }
      } else if (d === today && scored) {
        // today already fully in → count it live
        points += 1;
        run += 1;
        if (run % CHALLENGE.streakLength === 0) { bonus += CHALLENGE.streakBonus; day.bonus = true; }
        longest = Math.max(longest, run);
        day.today = true;
      } else if (d === today) {
        day.today = true;
      }
      days.push(day);
    }
    current = run; // run is alive as long as yesterday scored (or today scored)
    const todayScored = inWindow(today) && t.members.every((u) => byUserDay[u]?.[today]);
    if (inWindow(today) && !todayScored && today > CHALLENGE.start) {
      // run must include yesterday to be alive
      const y = addDays(today, -1);
      const yScored = t.members.every((u) => byUserDay[u]?.[y]);
      if (!yScored) current = 0;
    }
    const toNextBonus = CHALLENGE.streakLength - (current % CHALLENGE.streakLength);
    const memberStats = t.members.map((u) => ({
      id: u,
      name: USERS[u].name,
      uploads: Object.keys(byUserDay[u] || {}).filter(inWindow).length,
      today: !!byUserDay[u]?.[today],
    }));
    return {
      id: t.id, name: t.name, color: t.color, members: memberStats,
      points, bonus, total: points + bonus, currentStreak: current, longestStreak: longest,
      toNextBonus,
      missed, days,
    };
  });

  const sorted = [...teams].sort((a, b) => b.total - a.total || b.longestStreak - a.longestStreak);
  const leader = sorted[0].total === sorted[1].total && sorted[0].longestStreak === sorted[1].longestStreak ? null : sorted[0].id;

  return {
    challenge: CHALLENGE,
    today,
    daysLeft: Math.max(0, daysBetween(today, CHALLENGE.end) + (today <= CHALLENGE.end ? 1 : 0)),
    started: today >= CHALLENGE.start,
    finished: today > CHALLENGE.end,
    leader,
    gap: Math.abs(teams[0].total - teams[1].total),
    teams,
    feed: feed.slice().reverse().slice(0, 400).map((e) => ({
      user: e.user, name: USERS[e.user].name, team: USERS[e.user].team, date: e.date, url: e.url, uploadedAt: e.uploadedAt,
    })),
    users: Object.fromEntries(Object.entries(USERS).map(([k, v]) => [k, { name: v.name, team: v.team || null, admin: !!v.admin }])),
  };
}

export function json(res, status, body, extraHeaders = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}
