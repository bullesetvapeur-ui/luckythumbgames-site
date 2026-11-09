/* Mini-casse jouable dans le hero : trace la fuite du voleur jusqu'au camion, en contournant la vitrine. */
(() => {
  "use strict";
  const fig = document.getElementById("stage"), cv = document.getElementById("stage-canvas");
  if (!fig || !cv) return;
  const say = document.getElementById("stage-say"), again = document.getElementById("stage-again");
  const ctx = cv.getContext("2d"), W = 600, H = 450;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const INK = "#1d1530", R = 30;
  const thief0 = { x: 110, y: 360 }, van = { x: 485, y: 100 }, glass = { x: 225, y: 165, w: 150, h: 120 };
  let scale = 1, dpr = 1, state, t = 0, last = performance.now(), particles = [];

  const MSG = {
    idle: "Get him to the van. Drag from the thief.",
    drawing: "Keep going, all the way to the van.",
    blocked: "That's the glass case. Go around it.",
    short: "Almost. Finish your line on the van.",
    running: "Go go go!",
    won: "Clean getaway! That was level 1.",
  };
  function reset() { state = { mode: "idle", path: [], runD: 0, pos: { ...thief0 }, dir: 0, enter: 0, vanPop: 0, flash: 0 }; particles = []; fig.classList.remove("is-won"); again.hidden = true; setSay("idle"); }
  function setSay(k) { if (say.textContent !== MSG[k]) say.textContent = MSG[k]; }

  function resize() {
    const r = cv.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); scale = cv.width / W;
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const inGlass = (p, pad = 20) => p.x > glass.x - pad && p.x < glass.x + glass.w + pad && p.y > glass.y - pad && p.y < glass.y + glass.h + pad;
  function toWorld(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }

  cv.addEventListener("pointerdown", (e) => {
    if (state.mode === "running" || state.mode === "won") return;
    const p = toWorld(e);
    if (dist(p, thief0) > R * 2.2) return;
    state.mode = "drawing"; state.path = [{ ...thief0 }]; setSay("drawing");
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  });
  cv.addEventListener("pointermove", (e) => {
    if (state.mode !== "drawing") return;
    const p = toWorld(e), l = state.path[state.path.length - 1];
    if (dist(p, l) < 8) return;
    if (inGlass(p)) { state.mode = "idle"; state.flash = 1; state.path = []; setSay("blocked"); return; }
    state.path.push(p);
    if (dist(p, van) < 52) { state.path.push({ ...van }); startRun(); }
  });
  const end = () => { if (state.mode === "drawing") { state.mode = "idle"; state.path = []; setSay("short"); } };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  again.addEventListener("click", reset);

  function startRun() {
    const pts = state.path, cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
    state.cum = cum; state.len = cum[cum.length - 1]; state.mode = "running"; state.runD = 0; setSay("running");
  }
  function at(d) {
    const p = state.path, c = state.cum;
    for (let i = 1; i < p.length; i++) if (d <= c[i]) { const k = (d - c[i - 1]) / ((c[i] - c[i - 1]) || 1); return { x: p[i - 1].x + (p[i].x - p[i - 1].x) * k, y: p[i - 1].y + (p[i].y - p[i - 1].y) * k, dir: Math.atan2(p[i].y - p[i - 1].y, p[i].x - p[i - 1].x) }; }
    return { ...p[p.length - 1], dir: state.dir };
  }
  function win() {
    state.mode = "won"; state.vanPop = 1; fig.classList.add("is-won"); again.hidden = false; setSay("won");
    if (!reduce) for (let i = 0; i < 46; i++) { const a = -Math.PI / 2 + (Math.random() - .5) * 2.6, v = 220 + Math.random() * 280; particles.push({ x: van.x, y: van.y - 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * 6, vr: (Math.random() - .5) * 12, life: 1.4, c: ["#ffc93c", "#ff4d5e", "#3d8bff", "#8be04e", "#a66cff"][i % 5], s: 8 + Math.random() * 8 }); }
  }

  function update(dt) {
    t += dt; state.flash = Math.max(0, state.flash - dt * 2.2); state.vanPop = Math.max(0, state.vanPop - dt * 2.4);
    if (state.mode === "running") {
      state.runD += dt * 430;
      const p = at(state.runD); state.pos = { x: p.x, y: p.y }; state.dir = p.dir;
      if (state.runD >= state.len) { state.enter += dt / 0.3; if (state.enter >= 1) win(); }
    }
    particles = particles.filter((q) => (q.life -= dt) > 0);
    particles.forEach((q) => { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 700 * dt; q.r += q.vr * dt; });
  }

  // ---- dessin (même style que le jeu) ----
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  const fs = (f, lw = 4) => { ctx.fillStyle = f; ctx.fill(); ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke(); };
  function floor() {
    ctx.fillStyle = "#f3e3c3"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#e8d3ab"; for (let y = 0; y < H; y += 75) for (let x = ((y / 75) % 2) * 75; x < W; x += 150) ctx.fillRect(x, y, 75, 75);
  }
  function drawGlass() {
    rr(glass.x, glass.y + 9, glass.w, glass.h, 14); ctx.fillStyle = "rgba(0,0,0,.16)"; ctx.fill();
    rr(glass.x, glass.y, glass.w, glass.h, 14); fs(state.flash ? "#ff4d5e" : "#6d4c41", 5);
    rr(glass.x + 10, glass.y + 10, glass.w - 20, glass.h - 20, 8); ctx.fillStyle = "rgba(173,216,255,.6)"; ctx.fill();
    // le diamant exposé
    ctx.save(); ctx.translate(glass.x + glass.w / 2, glass.y + glass.h / 2); ctx.scale(.8, .8);
    ctx.beginPath(); [[-30, -10], [-16, -28], [16, -28], [30, -10], [0, 30]].forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.closePath(); fs("#5ad1ff", 4); ctx.restore();
    ctx.save(); rr(glass.x + 10, glass.y + 10, glass.w - 20, glass.h - 20, 8); ctx.clip(); ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(glass.x + 24, glass.y + glass.h); ctx.lineTo(glass.x + 64, glass.y); ctx.stroke(); ctx.restore();
  }
  function drawVan() {
    const s = 1 + state.vanPop * .2, lit = state.mode === "won";
    ctx.save(); ctx.translate(van.x, van.y); ctx.scale(s, s);
    ctx.beginPath(); ctx.ellipse(0, 42, 64, 11, 0, 0, 6.283); ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fill();
    rr(-60, -32, 120, 68, 18); fs("#ff4d5e", 5); rr(10, -24, 40, 24, 6); fs("#bfe6ff", 3.5); rr(-48, -16, 42, 38, 6); fs(INK, 3.5);
    for (const wx of [-35, 37]) { ctx.beginPath(); ctx.arc(wx, 36, 12, 0, 6.283); fs("#2d2d2d", 4); }
    ctx.beginPath(); ctx.arc(54, 15, 6, 0, 6.283); ctx.fillStyle = lit ? "#fff59d" : "#9e9e9e"; ctx.fill();
    ctx.restore();
  }
  function line(pts, color, ghost) {
    if (pts.length < 2) return;
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    if (!ghost) { ctx.lineWidth = 20; ctx.strokeStyle = "rgba(29,21,48,.25)"; ctx.stroke(); }
    ctx.lineWidth = 12; ctx.strokeStyle = color; ctx.setLineDash([2, 22]); ctx.lineDashOffset = reduce ? 0 : -t * 60; ctx.stroke(); ctx.restore();
  }
  function hint() {
    if (state.mode !== "idle") return;
    const ghost = [thief0, { x: 125, y: 230 }, { x: 160, y: 110 }, { x: 330, y: 88 }, van];
    const k = reduce ? 1 : ((t % 2.6) / 2), n = Math.max(2, Math.ceil(ghost.length * Math.min(1, k)));
    ctx.globalAlpha = .55; line(ghost.slice(0, n), "#ffffff", true); ctx.globalAlpha = 1;
    const pr = reduce ? 0 : (t * 1.4) % 1; ctx.beginPath(); ctx.arc(thief0.x, thief0.y, R + 8 + pr * 26, 0, 6.283); ctx.lineWidth = 4; ctx.strokeStyle = `rgba(29,21,48,${.6 * (1 - pr)})`; ctx.stroke();
  }
  function thief() {
    if (state.mode === "won") return;
    const moving = state.mode === "running" && state.enter === 0, e = state.enter;
    const bob = moving && !reduce ? Math.abs(Math.sin(t * 14)) * 7 : Math.sin(t * 3) * 2;
    ctx.save(); ctx.translate(state.pos.x, state.pos.y);
    ctx.beginPath(); ctx.ellipse(0, R * .9, R * .9, R * .3, 0, 0, 6.283); ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fill();
    ctx.translate(0, -bob - Math.sin(e * Math.PI) * 36); const es = 1 - e * .8; ctx.scale(es, es);
    ctx.beginPath(); ctx.ellipse(R * .85, -R * .2, R * .5, R * .55, .3, 0, 6.283); fs("#d7ccc8", 4);
    ctx.font = "800 20px Bricolage, system-ui"; ctx.fillStyle = INK; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("$", R * .85, -R * .15);
    ctx.beginPath(); ctx.ellipse(0, 0, R, R * 1.05, 0, 0, 6.283); fs("#ff4d5e", 5);
    rr(-R - 2, -R * .5, R * 2 + 4, R * .62, 9); ctx.fillStyle = INK; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-R, -R * .2); ctx.quadraticCurveTo(-R - 16, -R * .1 + (reduce ? 0 : Math.sin(t * 10) * 5), -R - 24, R * .1); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();
    const lx = moving ? Math.cos(state.dir) * 4 : 0, ly = moving ? Math.sin(state.dir) * 3 : 0, blink = (t % 3.4) < .12;
    for (const ex of [-11, 11]) { ctx.beginPath(); ctx.ellipse(ex, -11, 7, blink ? 1.5 : 6.5, 0, 0, 6.283); ctx.fillStyle = "#fff"; ctx.fill(); if (!blink) { ctx.beginPath(); ctx.arc(ex + lx, -11 + ly, 3.6, 0, 6.283); ctx.fillStyle = INK; ctx.fill(); } }
    ctx.beginPath(); ctx.arc(4, 9, 8, .2, Math.PI - .6); ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.stroke();
    ctx.restore();
  }
  function confetti() { for (const q of particles) { ctx.save(); ctx.globalAlpha = Math.min(1, q.life * 1.6); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.fillStyle = q.c; ctx.fillRect(-q.s / 2, -q.s / 4, q.s, q.s / 2); ctx.restore(); } }

  function render() {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    floor(); drawGlass(); drawVan(); hint();
    if (state.path.length) line(state.path, "#ff4d5e", false);
    thief(); confetti();
  }
  function frame(now) { const dt = Math.min(.05, (now - last) / 1000); last = now; update(dt); render(); requestAnimationFrame(frame); }

  addEventListener("resize", resize);
  reset(); resize(); requestAnimationFrame(frame);
})();
