
  /* ---------- CrazyGames build: iOS audio wake, ready to type ---------- */
  document.addEventListener("touchend", function () {
    if (ctx && ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }
  });
  if (CG.stage && !window.matchMedia("(pointer: coarse)").matches) { try { excuseEl.focus({ preventScroll: true }); } catch (e) {} }
