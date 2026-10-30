const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../app/src/main/assets/planner-core.js');
const C = require('../app/src/main/assets/core.js');

test('通用版：默认考研年份随日期推进，只填已核实的官方日期', () => {
  assert.equal(P.defaultYear('2026-10-28'), 2027);
  assert.equal(P.defaultYear('2026-12-20'), 2028);
  assert.equal(P.defaultYear('2027-12-28'), 2029);
  assert.deepEqual(P.normalize({}, '2026-12-20').exam, {year: 2028, date: ''});
  assert.equal(P.officialDate(2027), '2026-12-19');
  assert.equal(P.officialDate(2028), '');
});

test('通用版：备份不再假定词书总数', () => {
  assert.equal(C.backup({tasks: [], notes: [], mistakes: [], files: [], english: {}}).english.total, 0);
});

test('错题复习字段随轻量备份恢复，异常值被丢弃', () => {
  const data = {schema: 1, tasks: [], notes: [], files: [], mistakes: [
    {id: 'm1', title: '错题', body: '题目', reviewStage: 2, nextReview: '2026-11-05'},
    {id: 'm2', title: '错题', body: '题目', reviewStage: 'x', nextReview: '2026-02-30', reviewMastered: 1},
  ]};
  const r = C.restore(data);
  assert.equal(r.mistakes[0].reviewStage, 2);
  assert.equal(r.mistakes[0].nextReview, '2026-11-05');
  assert.equal(r.mistakes[1].reviewStage, undefined);
  assert.equal(r.mistakes[1].nextReview, undefined);
  assert.equal(r.mistakes[1].reviewMastered, undefined);
});
