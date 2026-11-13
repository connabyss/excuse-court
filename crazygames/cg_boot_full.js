/* ---------- CrazyGames glue: safe everywhere, real only on CrazyGames or localhost ---------- */
var CG = (function () {
  var api = null, data = null, firstAcquittal = true;
  var cg = {
    stage: document.documentElement.classList.contains("cg"),
    muted: false,
    store: function () { return data || window.localStorage; },
    call: function (fn) { if (!api) return; try { fn(api); } catch (e) { /* SDK said no; the game goes on */ } }
  };
  function applySettings(st) { cg.muted = !!(st && st.muteAudio); }
  // the game calls these at its big moments
  var lastParty = 0, screen = "form", booted = false, DONE = "ec-cg-done";
  function celebrate() {
    // confetti stays special: never twice within a few seconds (a perfect docket can also bring a new rank)
    var now = Date.now(); if (now - lastParty < 5000) return; lastParty = now;
    cg.call(function (s) { s.game.happytime(); });
  }
  function done() { try { return cg.store().getItem(DONE) === "1"; } catch (e) { return false; } }
  function report(pct) { cg.call(function (s) { if (s.game.reportGameCompletedPercentage) s.game.reportGameCompletedPercentage(pct); }); }
  cg.ruled = function (result) {
    // a rare, genuinely good excuse gets the site's confetti once per visit
    if (firstAcquittal && result.ruling === "ACQUITTED" && result.score >= 85) { firstAcquittal = false; celebrate(); }
    // progress toward the first closed docket: 20% a case, 100% when the books close
    if (result.caseNum && !done() && result.caseNum < 5) report(result.caseNum * 20);
  };
  window.EC_HOOKS = {
    ruled: function (r) { cg.ruled(r); },
    perfect: function () { celebrate(); },
    rank: function (name) { if (name) celebrate(); },
    docketDone: function () {
      // closing a docket is this game's "completed": reported once, then 100 on every later visit
      if (!done()) { try { cg.store().setItem(DONE, "1"); } catch (e) {} }
      report(100);
    },
    screen: function (name) {
      // the closing card is a break in play; leaving it is play again
      if (name === screen) return;
      screen = name;
      if (!booted) return; // the first start/stop is sent once the game is up
      cg.call(function (s) { if (name === "closed") s.game.gameplayStop(); else s.game.gameplayStart(); });
    },
    context: function (ctx) { cg.call(function (s) { if (s.game.setGameContext) s.game.setGameContext(ctx); }); }
  };
  cg.boot = function (start) {
    var started = false;
    function go() {
      if (started) return; started = true;
      start();
      cg.call(function (s) { s.game.loadingStop(); s.game.gameplayStart(); });
      booted = true;
      if (screen === "closed") cg.call(function (s) { s.game.gameplayStop(); });
      if (done()) report(100);
    }
    var sdk = window.CrazyGames && window.CrazyGames.SDK;
    if (!sdk) { go(); return; }
    setTimeout(go, 4000); // never let a slow SDK hold the courtroom shut
    sdk.init().then(function () {
      var env = sdk.environment;
      if (env !== "crazygames" && env !== "local") { go(); return; }
      api = sdk;
      cg.call(function (s) { s.game.loadingStart(); });
      cg.call(function (s) { applySettings(s.game.settings); s.game.addSettingsChangeListener(applySettings); });
      // progress (record + sound choice) through the data module; falls back to localStorage if it is off
      try {
        var d = sdk.data;
        if (d) {
          d.getItem("ec-record");
          // carry over a record saved before the data module was used
          ["ec-record", "ec-sound", "ec-docket", "ec-streak", "ec-cg-done"].forEach(function (k) {
            try { if (d.getItem(k) === null && localStorage.getItem(k) !== null) d.setItem(k, localStorage.getItem(k)); } catch (e) {}
          });
          data = d;
        }
      } catch (e) { data = null; }
      var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      fontsReady.then(go, go);
    }).catch(function () { go(); });
  };
  return cg;
})();

/* ---------- fit the 1120x630 stage (630x1120 when tall) into any frame ---------- */
(function () {
  if (!CG.stage) return;
  var root = document.documentElement, lastH = 0, lastS = 1;
  function fit() {
    var w = window.innerWidth, h = window.innerHeight;
    var ae = document.activeElement;
    // phone keyboard opened: keep the size, slide the statement into view instead of shrinking everything
    if (ae && ae.tagName === "TEXTAREA" && lastH && h < lastH * 0.8) {
      var r = ae.getBoundingClientRect();
      var cur = parseFloat(root.style.getPropertyValue("--ky")) || 0;
      root.style.setProperty("--ky", (cur + (8 - r.top)) + "px");
      return;
    }
    root.style.setProperty("--ky", "0px");
    lastH = h;
    var tall = h > w * 1.1;
    root.classList.toggle("tall", tall);
    lastS = tall ? Math.min(w / 630, h / 1120) : Math.min(w / 1120, h / 630);
    root.style.setProperty("--s", lastS.toFixed(4));
  }
  window.addEventListener("resize", fit);
  document.addEventListener("focusout", function () { setTimeout(fit, 50); });
  fit();
})();
