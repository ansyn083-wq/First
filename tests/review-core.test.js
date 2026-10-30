const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../app/src/main/assets/review-core.js');

test('错题复习：新错题次日到期，旧数据按上次重做计算', () => {
  assert.equal(R.dueDate({id: 'a', created: '2026-10-27'}), '2026-10-28');
  assert.equal(R.dueDate({id: 'a', created: '2026-10-20', lastReview: '2026-10-26'}), '2026-10-27');
  assert.equal(R.dueDate({id: 'a', nextReview: '2026-11-03', created: '2026-10-01'}), '2026-11-03');
  assert.equal(R.dueDate({id: 'a'}), '');
  assert.equal(R.dueDate({id: 'a', created: 'not a date'}), '');
});

test('错题复习：做对按 2/4/7/15/30 天推进，第六次做对后完成', () => {
  let m = {id: 'a', created: '2026-10-27'};
  const seen = [];
  for (let i = 0; i < 6; i++) { m = {...m, ...R.advance(m, '2026-11-01', true)}; seen.push(m.nextReview || 'done'); }
  assert.deepEqual(seen, ['2026-11-03', '2026-11-05', '2026-11-08', '2026-11-16', '2026-12-01', 'done']);
  assert.equal(m.reviewMastered, true);
  assert.equal(R.isDue(m, '2030-01-01'), false);
});

test('错题复习：做错从头开始，明天再做', () => {
  const m = {id: 'a', reviewStage: 4, nextReview: '2026-11-01'};
  assert.deepEqual(R.advance(m, '2026-11-01', false), {reviewStage: 0, nextReview: '2026-11-02', reviewMastered: false});
});

test('错题复习：到期列表按到期日排序并跨月跨年', () => {
  const list = [
    {id: 'late', nextReview: '2026-12-31'},
    {id: 'early', nextReview: '2026-12-01'},
    {id: 'future', nextReview: '2027-01-02'},
    {id: 'done', reviewMastered: true, nextReview: '2026-01-01'},
  ];
  assert.deepEqual(R.due(list, '2027-01-01').map(m => m.id), ['early', 'late']);
  assert.equal(R.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(R.addDays('2028-02-28', 1), '2028-02-29');
});

test('错题复习：备份字段净化，异常值丢弃', () => {
  assert.deepEqual(R.clean({reviewStage: 3, nextReview: '2026-11-05', reviewMastered: true}), {reviewStage: 3, nextReview: '2026-11-05', reviewMastered: true});
  assert.deepEqual(R.clean({reviewStage: 99, nextReview: '2026-02-30', reviewMastered: 'yes'}), {});
});
