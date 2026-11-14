const { chromium } = require('playwright');
const STUB = `window.__calls=[];var store=window.__seed||{};function L(n){return function(a){__calls.push(a===undefined?n:n+'('+JSON.stringify(a)+')')}}window.CrazyGames={SDK:{environment:'local',init:function(){return Promise.resolve()},game:{settings:{muteAudio:false},addSettingsChangeListener:function(){},loadingStart:L('loadingStart'),loadingStop:L('loadingStop'),gameplayStart:L('gameplayStart'),gameplayStop:L('gameplayStop'),happytime:L('happytime'),reportGameCompletedPercentage:L('complete'),setGameContext:L('context')},data:{getItem:function(k){return k in store?store[k]:null},setItem:function(k,v){store[k]=String(v);window.__store=store},removeItem:function(k){delete store[k]},clear:function(){store={}}}}};`;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  await p.route('**/crazygames-sdk-v3.js', r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  // seed: 2 rulings on record so case 1 moves "Repeat offender"(3)
  await p.addInitScript(() => { window.__seed = { 'ec-record': JSON.stringify({ n: 2, g: 1, a: 1 }) }; });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/crazygames/build_full/index.html'); await p.waitForTimeout(1500);
  const pleas = ['blizzard', 'my flight was cancelled', 'I was abducted by aliens and the mothership was late', 'I had a root canal at the dentist', 'I was summoned for jury duty and it ran long, the judge would not let us go'];
  for (let i = 0; i < 5; i++) {
    await p.fill('#excuse', pleas[i]); await p.click('#bang'); await p.waitForTimeout(4600);
    await p.click('#next'); await p.waitForTimeout(400);
  }
  await p.waitForTimeout(300);
  console.log('after docket:', JSON.stringify(await p.evaluate(() => __calls)));
  await p.click('#next'); await p.waitForTimeout(400); // free play
  console.log('after free play:', JSON.stringify(await p.evaluate(() => __calls.slice(-3))));
  const store = await p.evaluate(() => window.__store);
  // reload with saved store: closed docket on load
  const p2 = await ctx.newPage();
  await p2.route('**/crazygames-sdk-v3.js', r => r.fulfill({ contentType: 'text/javascript', body: STUB }));
  await p2.addInitScript(s => { window.__seed = s; }, store);
  await p2.goto('http://localhost:8765/crazygames/build_full/index.html'); await p2.waitForTimeout(1500);
  console.log('reload:', JSON.stringify(await p2.evaluate(() => __calls)));
  console.log('errors', errs);
  await b.close();
})();
