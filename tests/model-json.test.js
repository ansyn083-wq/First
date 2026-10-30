const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../app/src/main/assets/core.js');
const F = '```';

test('模型JSON：容忍前后说明文字与代码块包裹', () => {
  assert.deepEqual(C.parseModelJSON('好的，计划如下：\n' + F + 'json\n{"days":[]}\n' + F + '\n希望有帮助'), {days: []});
  assert.equal(C.parseModelJSON('结果是 {"kind":"cover","confidence":0.9} 。').kind, 'cover');
  assert.equal(C.parseModelJSON(F + 'json\n{"subject":"数学"}\n' + F).subject, '数学');
});

test('模型JSON：非对象或无法解析时仍然报错', () => {
  assert.throws(() => C.parseModelJSON('不是JSON'));
  assert.throws(() => C.parseModelJSON('[1,2]'));
  assert.throws(() => C.parseModelJSON('说明 [1] 和 {坏的}'));
});
