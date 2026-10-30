const test = require('node:test');
const assert = require('node:assert/strict');
process.env.TZ = 'Asia/Shanghai';
const F = require('../app/src/main/assets/focus-core.js');
const R = require('../app/src/main/assets/review-core.js');
const Core = require('../app/src/main/assets/core.js');

const MIN = 60000;
const at = (d, h, m = 0) => new Date(`${d}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+08:00`).getTime();

test('专注：番茄钟按墙钟计时，暂停时间不计入', () => {
  const t0 = at('2026-10-29', 9);
  let f = F.start({}, {mode: 'pomodoro', minutes: 25, subject: '数学'}, t0);
  assert.equal(F.remainingMs(f.active, t0 + 10 * MIN), 15 * MIN);
  f = F.pause(f, t0 + 10 * MIN);
  assert.equal(F.remainingMs(f.active, t0 + 60 * MIN), 15 * MIN);
  assert.equal(F.overdue(f.active, t0 + 60 * MIN), false, '暂停中不会到点');
  f = F.resume(f, t0 + 15 * MIN);
  assert.equal(f.active.pausedMs, 5 * MIN);
  assert.equal(F.overdue(f.active, t0 + 29 * MIN), false);
  assert.equal(F.overdue(f.active, t0 + 30 * MIN), true);
  assert.equal(F.clock(F.remainingMs(f.active, t0 + 20 * MIN)), '10:00');
});

test('专注：后台超时的番茄钟按计划时长记录，结束时间为应结束时刻', () => {
  const t0 = at('2026-10-29', 9);
  let f = F.start({}, {mode: 'pomodoro', minutes: 25, subject: '英语', taskId: 't1#0', taskTitle: '阅读 Text 1'}, t0);
  const r = F.finish(f, t0 + 3 * 60 * MIN);
  assert.equal(r.reason, 'completed');
  assert.equal(r.session.minutes, 25);
  assert.equal(r.session.end, t0 + 25 * MIN);
  assert.equal(r.session.taskTitle, '阅读 Text 1');
  assert.equal(r.focus.active, null);
  assert.equal(r.focus.sessions.length, 1);
  assert.equal(r.focus.settings.minutes, 25);
});

test('专注：正计时提前结束按实际分钟，超过 4 小时封顶，不足 1 分钟不记录', () => {
  const t0 = at('2026-10-29', 9);
  const sw = F.start({}, {mode: 'stopwatch', subject: '政治'}, t0);
  assert.deepEqual([F.finish(sw, t0 + 42 * MIN + 59000).session.minutes, F.finish(sw, t0 + 42 * MIN + 59000).reason], [42, 'stopped']);
  const capped = F.finish(sw, t0 + 9 * 60 * MIN);
  assert.equal(capped.reason, 'capped');
  assert.equal(capped.session.minutes, F.STOPWATCH_CAP);
  const short = F.finish(sw, t0 + 50000);
  assert.equal(short.reason, 'short');
  assert.equal(short.session, null);
  assert.equal(short.focus.active, null);
  const pomo = F.start({}, {mode: 'pomodoro', minutes: 25}, t0);
  assert.equal(F.finish(pomo, t0 + 12 * MIN).session.minutes, 12, '番茄钟提前结束记录实际时长');
});

test('专注：同时只能有一个计时，参数无效时拒绝', () => {
  const t0 = at('2026-10-29', 9);
  const f = F.start({}, {mode: 'pomodoro', minutes: 25}, t0);
  assert.throws(() => F.start(f, {mode: 'stopwatch'}, t0), /正在进行/);
  assert.throws(() => F.start({}, {mode: 'pomodoro', minutes: 0}, t0), /分钟/);
  assert.equal(F.start({}, {mode: 'pomodoro', minutes: 999}, t0).active.minutes, F.POMODORO_MAX);
  assert.equal(F.start({}, {mode: 'pomodoro', minutes: 25, subject: '体育'}, t0).active.subject, '其他');
});

test('专注：补记不允许未来日期和越界时长，删除按 ID', () => {
  const now = at('2026-10-29', 9);
  assert.throws(() => F.addManual({}, {date: '2026-10-30', minutes: 30}, now), /未来/);
  assert.throws(() => F.addManual({}, {date: '2026-10-29', minutes: 0}, now), /时长/);
  assert.throws(() => F.addManual({}, {date: '2026-10-29', minutes: 601}, now), /时长/);
  assert.throws(() => F.addManual({}, {date: '2026-02-30', minutes: 30}, now), /日期/);
  let f = F.addManual({}, {date: '2026-10-27', minutes: 90, subject: '专业课', note: '数据结构'}, now);
  const s = f.sessions[0];
  assert.equal(F.localDay(s.start), '2026-10-27');
  assert.deepEqual([s.minutes, s.mode, s.note], [90, 'manual', '数据结构']);
  f = F.remove(f, s.id);
  assert.equal(f.sessions.length, 0);
});

test('专注：统计按开始当天归属，周从周一开始，连续天数可从昨天起算', () => {
  const sessions = F.normalize({sessions: [
    {id: 'a', subject: '数学', start: at('2026-10-26', 23, 50), minutes: 40},
    {id: 'b', subject: '英语', start: at('2026-10-27', 8), minutes: 30},
    {id: 'c', subject: '数学', start: at('2026-10-28', 8), minutes: 20},
    {id: 'd', subject: '数学', start: at('2026-10-25', 8), minutes: 60},
  ]}).sessions;
  assert.equal(F.weekStart('2026-10-29'), '2026-10-26');
  assert.equal(F.weekStart('2026-11-01'), '2026-10-26', '周日属于本周');
  const week = F.summary(sessions, '2026-10-26', '2026-11-01');
  assert.equal(week.total, 90);
  assert.deepEqual(week.bySubject, {数学: 60, 英语: 30, 政治: 0, 专业课: 0, 其他: 0});
  assert.equal(week.byDay['2026-10-26'].total, 40, '跨午夜的记录归入开始当天');
  assert.equal(Object.keys(week.byDay).length, 7);
  assert.equal(F.streak(sessions, '2026-10-29'), 4, '今天还没有记录时从昨天起算');
  assert.equal(F.streak(sessions, '2026-10-30'), 0);
  assert.equal(F.duration(125), '2 小时 5 分');
  assert.equal(F.duration(120), '2 小时');
  assert.equal(F.duration(7), '7 分钟');
});

test('专注：载入与恢复时净化数据，去重并丢弃无效记录', () => {
  const f = F.normalize({
    active: {mode: 'pomodoro', minutes: 25, startedAt: 'x'},
    sessions: [{id: 'a', start: 1e12, minutes: 30, subject: '数学', mode: 'pomodoro'}, {id: 'a', start: 1e12, minutes: 99}, {id: 'b', start: 1e12, minutes: 0}, {id: 'c', start: -5, minutes: 20}, null, {id: 'd', start: 2e12, minutes: '15', subject: '<b>', note: 5}],
    settings: {minutes: 'abc'},
  });
  assert.equal(f.active, null);
  assert.deepEqual(f.sessions.map(s => s.id), ['a', 'd']);
  assert.equal(f.sessions[1].subject, '其他');
  assert.equal(f.sessions[1].minutes, 15);
  assert.equal(f.sessions[1].note, '');
  assert.equal(f.settings.minutes, 25);
});

test('专注：备份包含记录但不含进行中的计时', () => {
  const t0 = at('2026-10-29', 9);
  let focus = F.addManual({}, {date: '2026-10-28', minutes: 45, subject: '数学'}, t0);
  focus = F.start(focus, {mode: 'stopwatch', subject: '英语'}, t0);
  const backup = JSON.parse(JSON.stringify(Core.backup({tasks: [], notes: [], mistakes: [], files: [], focus})));
  assert.equal(backup.focus.active, null);
  assert.equal(backup.focus.sessions.length, 1);
  const restored = Core.restore(backup);
  assert.equal(restored.focus.sessions[0].minutes, 45);
  assert.equal(restored.focus.active, null);
  const old = Core.restore({...backup, focus: undefined});
  assert.deepEqual(old.focus.sessions, [], '旧版本备份没有专注记录');
});

test('错题：复习对错累计次数与排期分开保存，并进入备份', () => {
  let m = {id: 'm', created: '2026-10-20'};
  m = {...m, ...R.advance(m, '2026-10-21', false), ...R.tally(m, false)};
  m = {...m, ...R.advance(m, '2026-10-22', false), ...R.tally(m, false)};
  m = {...m, ...R.advance(m, '2026-10-23', true), ...R.tally(m, true)};
  assert.deepEqual([m.reviewFails, m.reviewPasses, m.reviewStage], [2, 1, 1]);
  assert.deepEqual(R.clean({reviewFails: 2, reviewPasses: -1, reviewStage: 1}), {reviewStage: 1, reviewFails: 2});
  const restored = Core.restore(JSON.parse(JSON.stringify(Core.backup({tasks: [], notes: [], files: [], mistakes: [{...m, title: 't', body: 'b'}]}))));
  assert.deepEqual([restored.mistakes[0].reviewFails, restored.mistakes[0].reviewPasses], [2, 1]);
});

test('错题：薄弱知识点按未掌握、做错次数、到期数排序，知识点名称宽松归并', () => {
  const today = '2026-10-29';
  const list = [
    {id: '1', subject: '数学', chapter: '泰勒公式', created: '2026-10-01', reviewMastered: true},
    {id: '2', subject: '数学', chapter: ' 泰勒公式 ', created: '2026-10-20', nextReview: '2026-10-29', reviewFails: 3},
    {id: '3', subject: '数学', chapter: '定积分', created: '2026-10-28', nextReview: '2026-10-30'},
    {id: '4', subject: '数学', chapter: '定积分', created: '2026-10-28', nextReview: '2026-10-29'},
    {id: '5', subject: '英语', chapter: '', created: '2026-10-28'},
    {id: '6', subject: '英语', chapter: 'ＡＢＣ', created: '2026-10-28'},
    {id: '7', subject: '英语', chapter: 'abc', created: '2026-10-28', reviewFails: 1},
  ];
  const w = R.weakPoints(list, today);
  assert.deepEqual(w.points.map(p => [p.subject, p.chapter, p.open, p.fails, p.due]), [
    ['数学', '定积分', 2, 0, 1],
    ['英语', 'ＡＢＣ', 2, 1, 2],
    ['数学', '泰勒公式', 1, 3, 1],
    ['英语', R.NO_CHAPTER, 1, 0, 1],
  ].sort((a, b) => b[2] - a[2] || b[3] - a[3] || b[4] - a[4]));
  assert.deepEqual(w.subjects.map(s => [s.subject, s.total, s.mastered]), [['数学', 4, 1], ['英语', 3, 0]]);
  assert.throws(() => R.weakPoints(list, 'bad'), /日期/);
});
