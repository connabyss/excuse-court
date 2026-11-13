/* ---------- CrazyGames glue: safe everywhere, real only on CrazyGames or localhost ---------- */
var CG = (function () {
  var api = null, data = null, firstAcquittal = true;
  var cg = {
    stage: document.documentElement.classList.contains("cg"),
    muted: false,
    store: function () { return data || window.localStorage; },
    call: function (fn) { if (!api) return; try { fn(api); } catch (e) { /* SDK said no; the game goes on */ } },
    ruled: function (result) {
      // a rare, genuinely good excuse gets the site's confetti once per visit
      if (firstAcquittal && result.ruling === "ACQUITTED" && result.score >= 85) {
        firstAcquittal = false;
        cg.call(function (s) { s.game.happytime(); });
      }
    }
  };
  function applySettings(st) { cg.muted = !!(st && st.muteAudio); }
  // the game calls these at its big moments
  window.EC_HOOKS = {
    ruled: function (r) { cg.ruled(r); },
    perfect: function () { cg.call(function (s) { s.game.happytime(); }); }
  };
  cg.boot = function (start) {
    var started = false;
    function go() {
      if (started) return; started = true;
      start();
      cg.call(function (s) { s.game.loadingStop(); s.game.gameplayStart(); });
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
          ["ec-record", "ec-sound", "ec-docket", "ec-streak"].forEach(function (k) {
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
