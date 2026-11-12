import { Ctx, el, esc, GameDef, norm, shuffle } from './kit';

const CATS = ['Nombre', 'Animal', 'Fruta o verdura', 'País o ciudad', 'Color', 'Cosa'];
const LETTERS = 'ABCDEFGHILMNOPRSTUV'.split('');
const ROUNDS = 1;
const SECONDS = 90;
const GRACE = 10;

type Phase = 'write' | 'wait' | 'reveal' | 'end';

function start(ctx: Ctx) {
  let letters: string[] = [];
  let ri = 0;
  const totals: [number, number] = [0, 0];
  let phase: Phase = 'write';
  let sent = false;
  let mine: string[] = [];
  let theirs: string[] | null = null;
  const disputed = new Set<string>();
  let timerId: number | undefined;
  let graceStarted = false;
  let graceFn: (() => void) | null = null;
  ctx.cleanup(() => window.clearInterval(timerId));

  const box = el('div', 'tf');
  ctx.root.append(box);

  const me = ctx.me;
  const other = (1 - me) as 0 | 1;

  const letter = () => letters[ri];

  const tick = (out: HTMLElement, from: number, zero: () => void) => {
    window.clearInterval(timerId);
    let left = from;
    out.textContent = String(left);
    out.classList.remove('low');
    timerId = window.setInterval(() => {
      left--;
      out.textContent = String(Math.max(0, left));
      out.classList.toggle('low', left <= 10);
      if (left <= 0) {
        window.clearInterval(timerId);
        zero();
      }
    }, 1000);
  };

  const startRound = () => {
    phase = 'write';
    sent = false;
    graceStarted = false;
    graceFn = null;
    mine = [];
    theirs = null;
    disputed.clear();
    box.innerHTML = '';
    ctx.turn(null);
    ctx.status(`Letra <b>${esc(letter())}</b> · llena las categorías`);

    const head = el('div', 'tf-head');
    const badge = el('div', 'tf-letter', esc(letter()));
    const timer = el('div', 'timer');
    const note = el('div', 'tf-note', 'Escribe una palabra con esta letra en cada categoría');
    const basta = el('button', 'gbtn gold', '¡BASTA!');
    head.append(badge, timer, note, basta);

    const grid = el('div', 'tf-grid');
    const inputs: HTMLInputElement[] = CATS.map((c, i) => {
      const wrap = el('label', 'tf-field');
      wrap.append(el('span', '', esc(c)));
      const inp = el('input', 'ginput plain tf-in');
      inp.maxLength = 24;
      inp.autocomplete = 'off';
      inp.setAttribute('autocapitalize', 'words');
      inp.placeholder = `${letter()}…`;
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') (inputs[i + 1] ?? inp).focus();
      });
      wrap.append(inp);
      grid.append(wrap);
      return inp;
    });
    box.append(head, grid);

    const submit = () => {
      if (sent) return;
      sent = true;
      mine = inputs.map((i) => i.value.trim());
      inputs.forEach((i) => (i.disabled = true));
      basta.disabled = true;
      ctx.send({ fin: mine });
      note.textContent = theirs ? '' : `Esperando a ${ctx.other}…`;
      window.clearInterval(timerId);
      phase = 'wait';
      check();
    };

    basta.onclick = () => {
      if (sent) return;
      ctx.send({ basta: 1 });
      submit();
    };
    graceFn = () => {
      if (sent || graceStarted) return;
      graceStarted = true;
      note.textContent = `¡${ctx.other} dijo BASTA! Termina rápido`;
      tick(timer, GRACE, submit);
    };
    tick(timer, SECONDS, submit);
    inputs[0].focus();
  };

  const owner = (who: 0 | 1) => (who === me ? mine : (theirs ?? []));

  const valid = (word: string) => {
    const n = norm(word);
    return n.length >= 2 && n[0] === norm(letter())[0];
  };

  const points = (i: number, who: 0 | 1) => {
    const mineW = owner(who)[i] ?? '';
    if (!valid(mineW) || disputed.has(`${i}:${who}`)) return 0;
    const oWho = (1 - who) as 0 | 1;
    const oW = owner(oWho)[i] ?? '';
    const oValid = valid(oW) && !disputed.has(`${i}:${oWho}`);
    return oValid && norm(oW) === norm(mineW) ? 5 : 10;
  };

  const roundTotal = (who: 0 | 1) => CATS.reduce((s, _c, i) => s + points(i, who), 0);

  const check = () => {
    if (sent && theirs && phase !== 'reveal') reveal();
  };

  const reveal = () => {
    phase = 'reveal';
    window.clearInterval(timerId);
    render();
  };

  const render = () => {
    box.innerHTML = '';
    const mt = roundTotal(me);
    const ot = roundTotal(other);
    ctx.status(`Letra <b>${esc(letter())}</b> · revisen las respuestas`);
    const table = el('div', 'tf-rev');
    table.append(el('b', '', ''), el('b', 'tf-who', 'Tú'), el('b', 'tf-who', esc(ctx.other)));
    CATS.forEach((c, i) => {
      table.append(el('span', 'tf-cat', esc(c)));
      const cell = (who: 0 | 1) => {
        const w = owner(who)[i] ?? '';
        const p = points(i, who);
        const off = disputed.has(`${i}:${who}`);
        const b = el('button', `tf-ans${p === 0 ? ' zero' : ''}${off ? ' off' : ''}`);
        b.innerHTML = `<i>${esc(w || '—')}</i><em>${p}</em>`;
        if (who === other && w) {
          b.title = 'Toca para anular o devolver esta respuesta';
          b.onclick = () => {
            const key = `${i}:${who}`;
            if (disputed.has(key)) disputed.delete(key);
            else disputed.add(key);
            ctx.send({ dis: key });
            render();
          };
        } else b.disabled = true;
        return b;
      };
      table.append(cell(me), cell(other));
    });
    const sum = el('div', 'tf-sum', `Ronda: <b>${mt}</b> - <b>${ot}</b> &nbsp;·&nbsp; Total: <b>${totals[me] + mt}</b> - <b>${totals[other] + ot}</b>`);
    const next = el('button', 'gbtn gold', ri + 1 >= ROUNDS ? 'Ver resultado' : 'Siguiente ronda');
    next.onclick = () => {
      ctx.send({ nx: 1 });
      advance();
    };
    const hint = el('div', 'tf-note', 'Toca una respuesta de tu pareja para anularla si no vale');
    const row = el('div', 'grow');
    row.append(next);
    box.append(table, sum, row, hint);
  };

  const advance = () => {
    if (phase !== 'reveal') return;
    totals[me] += roundTotal(me);
    totals[other] += roundTotal(other);
    ri++;
    if (ri >= ROUNDS) {
      phase = 'end';
      ctx.finish({
        winner: totals[0] === totals[1] ? null : totals[0] > totals[1] ? 0 : 1,
        sub: `Puntos finales: ${totals[me]} (tú) - ${totals[other]}`,
      });
    } else startRound();
  };

  ctx.on((d) => {
    if (d?.basta && phase === 'write') graceFn?.();
    else if (Array.isArray(d?.fin)) {
      theirs = (d.fin as string[]).map((x) => String(x));
      check();
    } else if (typeof d?.dis === 'string') {
      if (disputed.has(d.dis)) disputed.delete(d.dis);
      else disputed.add(d.dis);
      if (phase === 'reveal') render();
    } else if (d?.nx) advance();
  });

  ctx.init(
    () => shuffle(LETTERS).slice(0, ROUNDS),
    (l) => {
      letters = l;
      startRound();
    },
  );
}

export const tuti: GameDef = {
  id: 'tuti',
  name: 'Tutti Frutti',
  tagline: 'Palabras con la misma letra: ¡Basta!',
  icon: '🍉',
  from: '#4ade80',
  to: '#f43f5e',
  online: true,
  local: false,
  match: { target: 2 },
  start,
};
