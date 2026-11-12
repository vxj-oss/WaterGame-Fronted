import { Ctx, el, esc, norm, shuffle } from './kit';

export interface RaceItem {
  a: string[];
  c: string[];
  big?: string;
  tag?: string;
}

interface Config {
  catalog: RaceItem[];
  count?: number;
  seconds?: number;
  levels?: number[];
  speed?: boolean;
  goal?: number;
  maxItems?: number;
}

const speedPoints = (ms: number) => Math.max(1, 5 - Math.floor(ms / 4000));

export function runRace(ctx: Ctx, cfg: Config) {
  const speed = !!cfg.speed;
  const goal = cfg.goal ?? 20;
  const COUNT = speed ? Math.min(cfg.maxItems ?? 40, cfg.catalog.length) : (cfg.count ?? 5);
  const SECONDS = cfg.seconds ?? 30;
  const LEVELS = cfg.levels ?? [10, 20];
  const host = ctx.me === 0;
  let order: number[] = [];
  let idx = 0;
  let level = 0;
  let elapsed = 0;
  let startedAt = 0;
  let resolved = false;
  let waiting = false;
  const totals: [number, number] = [0, 0];
  let timerId: number | undefined;
  let adv: number | undefined;
  ctx.cleanup(() => {
    window.clearInterval(timerId);
    window.clearTimeout(adv);
  });

  const box = el('div', 'race');
  ctx.root.append(box);

  const item = () => cfg.catalog[order[idx]];
  const worth = () => (speed ? speedPoints(Date.now() - startedAt) : 3 - level);

  const status = () =>
    ctx.status(speed ? `Meta <b>${goal}</b> puntos · ${totals[0]} - ${totals[1]}` : `Pregunta <b>${idx + 1}</b> de ${COUNT} · puntos ${totals[0]} - ${totals[1]}`);

  const paint = (note = '') => {
    const it = item();
    const clues = speed ? [it.c[it.c.length - 1]] : it.c.slice(0, level + 1);
    const lines = clues.map((t, k) => `<p class="rc-clue${!speed && k === level ? ' new' : ''}">${esc(t)}</p>`).join('');
    const left = Math.max(0, SECONDS - elapsed);
    const w = worth();
    box.innerHTML = `${it.tag ? `<small class="rc-tag">${esc(it.tag)}</small>` : ''}${it.big ? `<div class="rc-big">${it.big}</div>` : ''}${lines}
      <div class="rc-meta"><span class="timer${left <= 8 ? ' low' : ''}" id="rct">${left}</span><span id="rcw">Vale ${w} punto${w === 1 ? '' : 's'}${speed ? ' · más rápido, más puntos' : ''}</span></div>
      <div class="guessrow"><input class="ginput plain" id="rci" maxlength="40" autocomplete="off" placeholder="Escribe tu respuesta" ${resolved || waiting ? 'disabled' : ''} /><button class="gbtn lagoon" id="rcb" ${resolved || waiting ? 'disabled' : ''}>Responder</button></div>
      <div class="rc-note" id="rcn">${esc(note)}</div>`;
    const input = box.querySelector<HTMLInputElement>('#rci')!;
    const go = () => guess(input.value, input);
    box.querySelector<HTMLElement>('#rcb')!.onclick = go;
    input.addEventListener('keydown', (e) => e.key === 'Enter' && go());
    if (!resolved && !waiting) setTimeout(() => input.focus(), 30);
  };

  const result = (who: number, pts: number) => {
    resolved = true;
    waiting = false;
    window.clearInterval(timerId);
    const it = item();
    if (who === 0 || who === 1) totals[who] += pts;
    status();
    paint('');
    const who2 = who < 0 ? 'Nadie acertó' : ctx.local ? ctx.names[who] : who === ctx.me ? '¡Tú!' : ctx.names[who];
    const note = box.querySelector<HTMLElement>('#rcn')!;
    note.innerHTML = `<b>${esc(it.a[0])}</b><br>${who < 0 ? who2 : `${esc(who2)} acertó (+${pts})`}`;
    note.classList.add('show');
  };

  const decide = (who: number) => {
    if (resolved || !host) return;
    const pts = who < 0 ? 0 : worth();
    ctx.send({ r: { i: idx, w: who, p: pts } });
    result(who, pts);
    adv = window.setTimeout(next, 2400);
  };

  const guess = (text: string, input: HTMLInputElement) => {
    if (resolved || waiting) return;
    const g = norm(text);
    if (!g) return;
    const ok = item().a.some((a) => norm(a) === g);
    if (!ok) {
      input.value = '';
      input.classList.remove('shake');
      void input.offsetWidth;
      input.classList.add('shake');
      const n = box.querySelector<HTMLElement>('#rcn');
      if (n) n.textContent = 'Todavía no, ¡sigue intentando!';
      return;
    }
    if (host) decide(0);
    else {
      waiting = true;
      ctx.send({ c: idx });
      paint('Enviado… esperando confirmación');
    }
  };

  const repaintKeep = () => {
    const keep = box.querySelector<HTMLInputElement>('#rci')?.value ?? '';
    paint();
    const input = box.querySelector<HTMLInputElement>('#rci');
    if (input) input.value = keep;
  };

  const startItem = () => {
    resolved = false;
    waiting = false;
    level = 0;
    elapsed = 0;
    startedAt = Date.now();
    status();
    paint();
    window.clearInterval(timerId);
    timerId = window.setInterval(() => {
      elapsed++;
      if (!resolved) {
        const t = box.querySelector<HTMLElement>('#rct');
        if (t) {
          t.textContent = String(Math.max(0, SECONDS - elapsed));
          t.classList.toggle('low', SECONDS - elapsed <= 8);
        }
        const wEl = box.querySelector<HTMLElement>('#rcw');
        if (wEl && speed) {
          const w = worth();
          wEl.textContent = `Vale ${w} punto${w === 1 ? '' : 's'} · más rápido, más puntos`;
        }
      }
      if (!host || resolved) return;
      if (!speed) {
        const lv = LEVELS.filter((s) => elapsed >= s).length;
        if (lv !== level && lv < 3) {
          level = lv;
          ctx.send({ lv: { i: idx, l: level } });
          repaintKeep();
        }
      }
      if (elapsed >= SECONDS) decide(-1);
    }, 1000);
  };

  const finishGame = () => {
    window.clearInterval(timerId);
    ctx.finish({
      winner: totals[0] === totals[1] ? null : totals[0] > totals[1] ? 0 : 1,
      sub: `Puntos: ${ctx.names[0]} ${totals[0]} – ${totals[1]} ${ctx.names[1]}`,
    });
  };

  const proceed = () => {
    if (speed && (totals[0] >= goal || totals[1] >= goal)) return finishGame();
    idx++;
    if (idx >= COUNT) return finishGame();
    startItem();
  };

  const next = () => {
    if (host) ctx.send({ nx: idx });
    proceed();
  };

  ctx.on((d) => {
    if (host && typeof d?.c === 'number' && d.c === idx) decide(1);
    else if (!host && d?.lv && d.lv.i === idx && !resolved) {
      level = d.lv.l;
      repaintKeep();
    } else if (!host && d?.r && d.r.i === idx) result(d.r.w, Number(d.r.p) || 0);
    else if (!host && typeof d?.nx === 'number' && d.nx === idx) proceed();
  });

  ctx.init(
    () => shuffle(cfg.catalog.map((_, i) => i)).slice(0, COUNT),
    (o) => {
      order = o;
      ctx.turn(null);
      startItem();
    },
  );
}
