import { computeState, CHALLENGE } from '../api/_lib.js';
const mk=(u,d,t='10:00')=>({pathname:`subs/${u}/${d}-x.jpg`,url:'u',uploadedAt:`${d}T${t}:00Z`,size:1});
const blobs=[];
// team a: both upload nov 1-8 (streak 7 at day7 -> +3, 8 days), skip 9, both 10; genesis misses 11 while shawn uploads
for(let i=1;i<=8;i++){blobs.push(mk('shawn',`2026-11-0${i}`),mk('genesis',`2026-11-0${i}`));}
blobs.push(mk('shawn','2026-11-10'),mk('genesis','2026-11-10'),mk('shawn','2026-11-11'));
// team b: donna+aaron nov 1-14 all -> 14 days + 6 bonus = 20
for(let i=1;i<=14;i++){const d=`2026-11-${String(i).padStart(2,'0')}`;blobs.push(mk('donna',d),mk('aaron',d));}
// pre-challenge test upload shouldn't count
blobs.push(mk('donna','2026-10-25'),mk('aaron','2026-10-25'));
// duplicate same day for shawn: second ignored
blobs.push(mk('shawn','2026-11-01','12:00'));
const s=computeState(blobs,'2026-11-15');
for(const t of s.teams) console.log(t.name,{points:t.points,bonus:t.bonus,total:t.total,cur:t.currentStreak,best:t.longestStreak,next:t.toNextBonus,missed:t.missed});
console.log('leader',s.leader,'gap',s.gap,'daysLeft',s.daysLeft,'feed',s.feed.length);
// expectations
const a=s.teams[0], b=s.teams[1];
console.assert(a.points===9&&a.bonus===3&&a.total===12,'team a');
console.assert(b.points===14&&b.bonus===6&&b.total===20,'team b');
console.assert(a.currentStreak===0 && b.currentStreak===14, 'streaks');
console.assert(a.missed.length===1&&a.missed[0].slackers[0]==='Genesis','missed');
console.assert(b.toNextBonus===7,'next bonus b');
// today partially: both b upload today
const s2=computeState([...blobs,mk('donna','2026-11-15'),mk('aaron','2026-11-15')],'2026-11-15');
console.assert(s2.teams[1].points===15&&s2.teams[1].currentStreak===15,'live today');
// tie-break by longest streak
console.log('ok');
