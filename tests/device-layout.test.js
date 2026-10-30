const test=require('node:test'),assert=require('node:assert/strict');
const Layout=require('../app/src/main/assets/device-layout.js');
test('native tablet identity wins even in a narrow window',()=>assert.equal(Layout.resolve('tablet',400,800),'tablet'));
test('native phone identity stays phone in landscape',()=>assert.equal(Layout.resolve('phone',900,400),'phone'));
test('browser fallback uses shortest dimension',()=>{assert.equal(Layout.resolve('',800,1200),'tablet');assert.equal(Layout.resolve('',1200,400),'phone')});

test('startup applies native identity before rendering',()=>{const vm=require('node:vm'),fs=require('node:fs');const window={Android:{deviceLayout:()=> 'tablet'},document:{documentElement:{dataset:{}}},screen:{width:400,height:800}};vm.runInNewContext(fs.readFileSync(require.resolve('../app/src/main/assets/device-layout.js'),'utf8'),{window});assert.equal(window.document.documentElement.dataset.device,'tablet')});
