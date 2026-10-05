/* Condition Planet V1.5 — one-day class logic (shared by the member page and the coach page).
   assign(): puts people with similar preferences and condition in the same team and gives each team an order of the three stations.
   report(): turns one person's start state + three checks into findings, a one-week plan and a cautious one-month outlook. */
(function (g) {
'use strict';
const ST = { cardio: { ko: '유산소' }, weights: { ko: '웨이트' }, stretch: { ko: '스트레칭' } };
const KEYS = ['cardio', 'weights', 'stretch'];
const TEAMS = [
  { id: 1, name: '달리기 팀', ord: ['cardio', 'weights', 'stretch'], line: '심박을 먼저 올리고, 힘을 쓰고, 풀면서 끝냅니다.' },
  { id: 2, name: '힘쓰기 팀', ord: ['weights', 'stretch', 'cardio'], line: '힘이 있을 때 먼저 들고, 풀어 준 뒤, 유산소로 끝냅니다.' },
  { id: 3, name: '깨우기 팀', ord: ['stretch', 'cardio', 'weights'], line: '몸을 먼저 깨우고, 심박을 올린 뒤, 마지막에 힘을 씁니다.' },
];
const jong = (w) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 : 0; };
const ro = (w) => w + (jong(w) === 0 || jong(w) === 8 ? '로' : '으로');
const un = (w) => w + (jong(w) ? '은' : '는');
const sg = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v);
const lowCount = (m) => (m.energy0 <= 2 ? 1 : 0) + (m.body0 <= 2 ? 1 : 0) + (m.mood0 <= 2 ? 1 : 0);

// how well a station order fits one person right now
function score(m, t) {
  const p = m.pref || {}, first = t.ord[0], last = t.ord[2], low = lowCount(m);
  let s = 1.5 * (p[first] || 0) + 0.5 * (p[last] || 0);
  if (first === 'stretch') s += 1.2 * low;
  if (first === 'cardio') s += (m.energy0 >= 4 ? 1 : 0) - 0.8 * low;
  if (first === 'weights') s += (m.energy0 >= 4 && m.body0 >= 3 ? 0.8 : 0) - (m.body0 <= 2 ? 1.2 : 0) - 0.4 * low;
  return s;
}
const bestTeam = (m) => TEAMS.slice().sort((a, b) => score(m, b) - score(m, a))[0];
function reason(m, t) {
  const p = m.pref || {}, low = lowCount(m), first = ST[t.ord[0]].ko;
  const state = low >= 2 ? `지금 에너지 ${m.energy0}, 몸 상태 ${m.body0}로 낮은 편이라` : m.energy0 >= 4 ? `에너지가 ${m.energy0}로 충분해서` : '컨디션이 무난해서';
  let s = low >= 2 && t.ord[0] !== 'stretch' && bestTeam(m) !== t
    ? `오늘은 세 명씩 팀을 맞추느라 ${ro(first)} 시작합니다. 지금 에너지 ${m.energy0}, 몸 상태 ${m.body0}로 낮은 편이니 첫 블록은 평소보다 가볍게 하세요.`
    : `${state} ${ro(first)} 시작합니다. ${t.line}`;
  const dis = KEYS.filter((k) => p[k] < 0), like = KEYS.filter((k) => p[k] > 0);
  dis.forEach((k) => { const i = t.ord.indexOf(k); s += ` 싫어한다고 고른 ${un(ST[k].ko)} ${['맨 먼저 끝내도록 앞에', '몸이 풀린 가운데에', '마지막에'][i]} 넣었습니다.`; });
  if (dis.length) s += ' 하고 난 뒤 기분이 어떻게 변하는지 보는 것이 오늘의 실험입니다.';
  else if (like.length) s += ` 좋아하는 ${like.map((k) => ST[k].ko).join('·')}${like.length ? '도' : ''} 숫자로 확인해 봅니다.`;
  return s;
}
// Best total fit with balanced team sizes (exhaustive search; a class is small)
function assign(members) {
  const n = members.length; if (!n) return [];
  const hi = Math.ceil(n / 3), lo = n >= 3 ? Math.floor(n / 3) : 0, sc = members.map((m) => TEAMS.map((t) => score(m, t)));
  const maxRest = new Array(n + 1).fill(0); for (let i = n - 1; i >= 0; i--) maxRest[i] = maxRest[i + 1] + Math.max(...sc[i]);
  let best = null, bestV = -1e9; const cur = new Array(n), cnt = [0, 0, 0];
  (function go(i, v) {
    if (v + maxRest[i] <= bestV) return;
    if (i === n) { if (cnt.every((c) => c >= lo)) { bestV = v; best = cur.slice(); } return; }
    for (let t = 0; t < 3; t++) { if (cnt[t] >= hi) continue; cnt[t]++; cur[i] = t; go(i + 1, v + sc[i][t]); cnt[t]--; }
  })(0, 0);
  if (!best) best = members.map((m) => TEAMS.indexOf(bestTeam(m)));
  return members.map((m, i) => { const t = TEAMS[best[i]]; return { id: m.id, team: t.id, ord: t.ord, kind: t.name, reason: reason(m, t) }; });
}
const one = (m) => { const t = bestTeam(m); return { id: m.id, team: t.id, ord: t.ord, kind: t.name, reason: reason(m, t) }; };

function rows(m) {
  const ch = (m.checks || []).slice().sort((a, b) => a.round - b.round); let pm = m.mood0, pb = m.body0;
  return ch.map((c) => { const r = { round: c.round, st: c.station, m0: pm, m1: c.mood, b0: pb, b1: c.body, dm: c.mood - pm, db: c.body - pb, pref: (m.pref || {})[c.station] || 0 }; pm = c.mood; pb = c.body; return r; });
}
function report(m) {
  const R = rows(m); if (R.length < 3) return null;
  const end = R[2], dmT = end.m1 - m.mood0, dbT = end.b1 - m.body0, name = (k) => ST[k].ko;
  const byMood = R.slice().sort((a, b) => b.dm - a.dm || b.db - a.db), byBody = R.slice().sort((a, b) => b.db - a.db || b.dm - a.dm), best = byMood[0];
  const F = [];
  F.push({ tone: dmT > 0 ? 'good' : dmT < 0 ? 'bad' : 'info', text: `45분 동안 기분 ${m.mood0} → ${end.m1}, 몸 상태 ${m.body0} → ${end.b1}.`, ev: `기분 ${sg(dmT)} · 몸 ${sg(dbT)}` });
  const even = best.dm > 0 && byMood[2].dm === best.dm;
  if (even) F.push({ tone: 'good', text: `세 블록 모두 기분이 ${sg(best.dm)}씩 올랐습니다.`, ev: '오늘의 순서 자체가 잘 맞았습니다.' });
  else if (best.dm > 0) F.push({ tone: 'good', text: `기분이 가장 많이 오른 건 ${name(best.st)} 15분이었습니다.`, ev: `${name(best.st)} 전 ${best.m0} → 후 ${best.m1} (${sg(best.dm)})` });
  else F.push({ tone: 'info', text: '오늘은 어느 블록에서도 기분이 뚜렷하게 오르지 않았습니다.', ev: '순서와 시간을 바꿔 가며 맞는 조합을 찾아야 하는 날입니다.' });
  R.forEach((r) => {
    if (r.pref < 0 && r.dm > 0) F.push({ tone: 'good', text: `싫어한다고 고른 ${name(r.st)} 뒤에 기분이 올랐습니다.`, ev: `${r.m0} → ${r.m1} (${sg(r.dm)}) · '싫어하는 운동'과 '안 맞는 운동'은 다를 수 있습니다.` });
    else if (r.pref < 0) F.push({ tone: 'info', text: `싫어한다고 고른 ${name(r.st)} 뒤에는 기분이 오르지 않았습니다.`, ev: `${r.m0} → ${r.m1} · 느낌과 숫자가 일치했습니다.` });
    else if (r.pref > 0 && r.dm <= 0) F.push({ tone: 'bad', text: `좋아한다고 고른 ${name(r.st)} 뒤에는 기분이 ${r.dm < 0 ? '내려갔습니다' : '그대로였습니다'}.`, ev: `${r.m0} → ${r.m1} · 익숙한 운동이라 자극이 적었을 수 있습니다.` });
    else if (r.dm < 0) F.push({ tone: 'bad', text: `${name(r.st)} 뒤에는 기분이 내려갔습니다.`, ev: `${r.m0} → ${r.m1} · 순서나 시간을 바꿔 볼 대상입니다.` });
  });
  if (byBody[0].db > 0) F.push({ tone: 'good', text: `몸은 ${name(byBody[0].st)} 뒤에 가장 가벼워졌습니다.`, ev: `몸 상태 ${byBody[0].b0} → ${byBody[0].b1} (${sg(byBody[0].db)})` });
  // one-week plan built from today's response: open with what loosened the body, close with what lifted the mood
  const closer = best.st, others = byBody.filter((r) => r.st !== closer), opener = others[0].st, mid = others[1].st;
  const weak = others.slice().sort((a, b) => a.dm - b.dm)[0].st, mins = (k) => (k === closer ? 20 : k === weak ? 10 : 15);
  const type = even ? '오늘의 순서가 잘 맞는 리듬' : best.dm > 0 ? `${ro(name(closer))} 기분이 올라가는 리듬` : '아직 맞는 순서를 찾는 중';
  const core = even ? R.map((r) => `${name(r.st)} 15분`).join(' → ') : `${name(opener)} ${mins(opener)}분 → ${name(mid)} ${mins(mid)}분 → ${name(closer)} 20분`;
  const week = [
    { d: '월', t: '기본 45분', x: core },
    { d: '수', t: '짧은 날 25분', x: `${name(opener)} 10분 → ${name(closer)} 15분` },
    { d: '금', t: '기본 45분', x: core },
    { d: '토', t: '바꿔 보기 45분', x: `${name(closer)} 15분 → ${name(mid)} 15분 → ${name(opener)} 15분` },
  ];
  const why = even ? '세 블록이 고르게 효과가 있었으니 오늘 순서를 그대로 기본으로 씁니다. 토요일은 순서를 뒤집어 차이가 있는지 확인합니다.' : `몸을 가장 풀어 준 ${ro(name(opener))} 시작하고, 기분을 가장 올린 ${ro(name(closer))} 끝내 좋은 기분으로 나갑니다. 기분이 가장 덜 올랐던 ${un(name(weak))} 10분으로 줄였습니다. 토요일은 순서를 뒤집어 차이가 있는지 확인합니다.`;
  const rule = `기분이 2 이하인 날은 ${name(closer)} 15분만 하고 가도 됩니다.`;
  const up = R.filter((r) => r.dm > 0).length;
  const month = [
    '한 달이면 16번, 640분입니다. 주 160분으로 세계보건기구 권장량(주 150분)을 채웁니다.',
    dmT > 0 ? `오늘 기분은 ${m.mood0} → ${end.m1}. 오늘처럼 반응한다면 한 달 동안 대부분의 날에 올 때보다 좋은 기분으로 헬스장을 나서게 됩니다.` : '오늘은 변화가 작았습니다. 한 달 동안 순서와 시간을 바꿔 가며 기분이 오르는 조합을 찾는 것이 목표입니다.',
    `오늘 세 블록 중 ${up}개에서 기분이 올랐습니다. 16번의 기록이 쌓이면 어느 요일, 어느 시간, 어느 순서가 맞는지 실제 숫자로 다시 짭니다.`,
  ];
  return { rows: R, dmT, dbT, findings: F, type, week, why, rule, month, closer, opener };
}
// class-level conclusions for the coach
function summary(members) {
  const done = members.filter((m) => (m.checks || []).length >= 3), all = [].concat(...done.map(rows));
  const avg = (a) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : null);
  return {
    n: done.length, up: done.filter((m) => m.checks[2].mood > m.mood0).length, same: done.filter((m) => m.checks[2].mood === m.mood0).length, down: done.filter((m) => m.checks[2].mood < m.mood0).length,
    mood0: avg(done.map((m) => m.mood0)), mood3: avg(done.map((m) => m.checks[2].mood)), body0: avg(done.map((m) => m.body0)), body3: avg(done.map((m) => m.checks[2].body)),
    stations: KEYS.map((k) => { const a = all.filter((r) => r.st === k); return { k, n: a.length, dm: avg(a.map((r) => r.dm)), db: avg(a.map((r) => r.db)) }; }),
    liked: { n: all.filter((r) => r.pref > 0).length, dm: avg(all.filter((r) => r.pref > 0).map((r) => r.dm)) },
    disliked: { n: all.filter((r) => r.pref < 0).length, dm: avg(all.filter((r) => r.pref < 0).map((r) => r.dm)) },
    rounds: [1, 2, 3].map((n) => avg(all.filter((r) => r.round === n).map((r) => r.dm))),
    optin: members.filter((m) => m.want_v2 === true).map((m) => m.name),
  };
}
g.CPClass = { ST, KEYS, TEAMS, score, bestTeam, assign, one, reason, rows, report, summary, sg };
})(typeof globalThis !== 'undefined' ? globalThis : this);
