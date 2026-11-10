window.__replay = async (levelNo, opts = {}) => {
  const g = window.__game;
  const sol = await fetch(`/tools/solutions/${levelNo}.json`).then((r) => r.json());
  for (const k of ['Menu', 'LevelSelect', 'Level']) g.scene.stop(k);
  g.loop.sleep();
  let t = performance.now();
  const DT = 1000 / 60;
  const fr = (n = 1) => { for (let i = 0; i < n; i++) { t += DT; g.step(t, DT); } };
  g.scene.start('Level', { level: levelNo - 1 });
  fr(3);
  const sc = g.scene.getScene('Level');

  const KEYS = {
    fire: { l: [65, 'KeyA', 'a'], r: [68, 'KeyD', 'd'], u: [87, 'KeyW', 'w'] },
    water: { l: [37, 'ArrowLeft', 'ArrowLeft'], r: [39, 'ArrowRight', 'ArrowRight'], u: [38, 'ArrowUp', 'ArrowUp'] },
  };
  const down = {};
  const key = (role, k, on) => {
    const id = role + k;
    if (!!down[id] === on) return;
    down[id] = on;
    const [keyCode, code, key2] = KEYS[role][k];
    window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { keyCode, code, key: key2, bubbles: true }));
  };
  const release = (role) => { key(role, 'l', false); key(role, 'r', false); key(role, 'u', false); };

  const settleWorld = () => {
    for (let i = 0; i < 600; i++) {
      const moving = sc.lifts.some((l) => Math.abs(l.rect.body.velocity.y) > 0.1) || sc.boxes.some((b) => Math.abs(b.body.velocity.x) > 1 || Math.abs(b.body.velocity.y) > 1);
      if (!moving && i > 2) break;
      fr();
    }
  };
  const sprite = (role) => (role === 'fire' ? sc.fire : sc.water);
  const place = (role, x, row) => { const s = sprite(role); s.body.reset(x, row * 32 - 15); fr(4); };
  const grounded = (s) => s.body.blocked.down || s.body.touching.down;
  const inf = (v) => (v === null || v === undefined ? Infinity : v);

  const problems = [];
  for (let i = 0; i < sol.length; i++) {
    const a = sol[i];
    if (sc.mode !== 'playing') { problems.push({ i, why: 'el nivel terminó antes de tiempo', mode: sc.mode }); break; }
    settleWorld();
    const s = sprite(a.role);
    const boxBefore = sc.boxes.map((b) => b.x);

    if (a.kind === 'walk') {
      place(a.role, a.x, a.row);
      key(a.role, a.d > 0 ? 'r' : 'l', true); fr(3); release(a.role); fr(4);
    } else if (a.kind === 'push') {
      place(a.role, a.x, a.row);
      const box = sc.boxes.reduce((b, c) => (Math.abs(c.x - s.x) < Math.abs(b.x - s.x) ? c : b));
      const start = box.x;
      key(a.role, a.d > 0 ? 'r' : 'l', true);
      for (let f = 0; f < 120 && Math.abs(box.x - start) < 30; f++) fr();
      release(a.role); fr(6);
    } else {
      const o = a.opts;
      const jump = a.kind === 'jump';
      const x0 = a.kind === 'fall' ? a.x + a.d * 8 : a.x;
      place(a.role, x0, a.row);
      const start = o.start, stop = inf(o.stop), cut = inf(o.cut);
      let airborne = false, stable = 0;
      for (let f = 0; f < 480; f++) {
        key(a.role, 'r', o.dir > 0 && f >= start && f < stop);
        key(a.role, 'l', o.dir < 0 && f >= start && f < stop);
        key(a.role, 'u', jump && f < Math.min(cut, 75));
        fr();
        if (!grounded(s) || sc.mode !== 'playing') airborne = true;
        if (airborne && grounded(s)) { if (++stable >= 3) break; } else stable = 0;
        if (sc.mode !== 'playing') break;
      }
      release(a.role); fr(4);
    }

    const row = Math.round((s.y + 15) / 32);
    const dir = a.kind === 'walk' || a.kind === 'push' ? a.d : a.opts.dir;
    const over = dir ? (s.x - a.tx) * dir : Math.abs(s.x - a.tx);
    const ok = sc.mode === 'playing' && row === a.trow && (dir ? over >= -14 && over <= 48 : over <= 14);
    if (!ok) {
      problems.push({
        i, kind: a.kind, role: a.role, from: [a.x, a.row], expected: [a.tx, a.trow],
        actual: [Math.round(s.x), row], mode: sc.mode, opts: a.opts, d: a.d,
        boxes: [boxBefore, sc.boxes.map((b) => Math.round(b.x))],
      });
      if (!opts.keepGoing) break;
    }
    if (sc.mode === 'playing') place(a.role, a.tx, a.trow);
  }
  settleWorld();
  const result = { level: levelNo, actions: sol.length, done: problems.length === 0 ? sc.mode : 'fallos', problems: problems.slice(0, 4), final: sc.mode };
  g.loop.wake();
  return result;
};
'replay listo';
