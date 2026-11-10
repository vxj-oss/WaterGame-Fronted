import { Ctx, el, esc, GameDef, norm, rnd } from './kit';

const WORDS = [
  'CORAZON', 'ABRAZO', 'BESO', 'CARICIA', 'CHOCOLATE', 'MARIPOSA', 'ESTRELLA', 'ATARDECER', 'AVENTURA', 'SONRISA',
  'PLAYA', 'MONTAÑA', 'HELADO', 'PIZZA', 'GUITARRA', 'BICICLETA', 'PARAGUAS', 'CASTILLO', 'DRAGON', 'FANTASMA',
  'TORTUGA', 'ELEFANTE', 'JIRAFA', 'DELFIN', 'PINGUINO', 'CAFE', 'GALLETA', 'PANQUEQUE', 'FRESA', 'SANDIA',
  'CINE', 'MUSICA', 'BAILE', 'VIAJE', 'AVION', 'COHETE', 'PLANETA', 'LUNA', 'ARCOIRIS', 'TORMENTA',
  'LIBRO', 'CAMARA', 'TELEFONO', 'ESPEJO', 'VENTANA', 'JARDIN', 'SEMILLA', 'BOSQUE', 'CASCADA', 'VOLCAN',
];

const MAX = 6;
const LETTERS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

const GALLOWS = `<svg class="gal" viewBox="0 0 120 150" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round">
  <path d="M10 142h100M30 142V12h60v20" />
  <g class="part"><circle cx="90" cy="44" r="12" /></g>
  <g class="part"><path d="M90 56v38" /></g>
  <g class="part"><path d="M90 66l-16 16" /></g>
  <g class="part"><path d="M90 66l16 16" /></g>
  <g class="part"><path d="M90 94l-14 24" /></g>
  <g class="part"><path d="M90 94l14 24" /></g>
</svg>`;

function start(ctx: Ctx) {
  const setter: 0 | 1 = ctx.round % 2 === 0 ? 0 : 1;
  const iSet = ctx.me === setter;
  const box = el('div', 'hang');
  ctx.root.append(box);

  let word = '';
  let len = 0;
  let shown: string[] = [];
  const used = new Map<string, boolean>();
  let wrong = 0;
  let pending = false;
  let over = false;

  ctx.turn(setter);

  const picker = () => {
    ctx.status(`<b>${esc(ctx.names[setter])}</b> elige la palabra`);
    if (!iSet) {
      box.innerHTML = `<div class="gpanel"><h3>Espera</h3><p>${esc(ctx.other)} está pensando una palabra para ti.</p></div>`;
      return;
    }
    box.innerHTML = `<div class="gpanel"><h3>Tu palabra</h3><p>Escribe una palabra (solo letras, de 3 a 14) para que el otro jugador la adivine, o deja que el juego elija.</p>
      <input class="ginput" id="hw" maxlength="14" autocomplete="off" autocapitalize="characters" placeholder="PALABRA" />
      <p class="err" id="he" style="color:#ff9aa8;min-height:1.2em"></p>
      <div class="grow"><button class="gbtn" id="hok">Listo</button><button class="gbtn lagoon" id="hrnd">Al azar</button></div></div>`;
    const input = box.querySelector<HTMLInputElement>('#hw')!;
    const err = box.querySelector<HTMLElement>('#he')!;
    const go = (w: string) => {
      const clean = norm(w);
      if (clean.length < 3) {
        err.textContent = 'Necesita al menos 3 letras';
        return;
      }
      word = clean;
      len = clean.length;
      shown = Array(len).fill('');
      ctx.send({ w: len });
      play();
    };
    box.querySelector<HTMLElement>('#hok')!.onclick = () => go(input.value);
    box.querySelector<HTMLElement>('#hrnd')!.onclick = () => go(WORDS[rnd(WORDS.length)]);
    input.addEventListener('keydown', (e) => e.key === 'Enter' && go(input.value));
    setTimeout(() => input.focus(), 50);
  };

  const play = () => {
    box.innerHTML = `${GALLOWS}<div class="word" id="hword"></div><div class="keys" id="hkeys"></div>`;
    const keys = box.querySelector<HTMLElement>('#hkeys')!;
    LETTERS.forEach((l) => {
      const b = el('button', '', l);
      b.dataset.l = l;
      b.onclick = () => guess(l);
      keys.append(b);
    });
    draw();
  };

  const draw = (reveal?: string) => {
    const parts = box.querySelectorAll('.part');
    parts.forEach((p, i) => p.classList.toggle('on', i < wrong));
    const wEl = box.querySelector<HTMLElement>('#hword');
    if (wEl) {
      wEl.innerHTML = Array.from({ length: len }, (_, i) => {
        const ch = shown[i];
        if (ch) return `<span class="lit">${ch}</span>`;
        if (reveal) return `<span class="lost">${reveal[i]}</span>`;
        return '<span></span>';
      }).join('');
    }
    box.querySelectorAll<HTMLButtonElement>('#hkeys button').forEach((b) => {
      const l = b.dataset.l!;
      const res = used.get(l);
      b.classList.toggle('ok', res === true);
      b.classList.toggle('bad', res === false);
      b.disabled = over || res !== undefined || iSet || pending;
    });
    ctx.status(
      iSet
        ? `${esc(ctx.other)} adivina · fallos ${wrong}/${MAX}`
        : pending
          ? 'Esperando respuesta…'
          : `<b>Tu turno de adivinar</b> · fallos ${wrong}/${MAX}`,
    );
    ctx.turn((1 - setter) as 0 | 1);
  };

  const guess = (l: string) => {
    if (iSet || over || pending || used.has(l)) return;
    pending = true;
    ctx.send({ g: l });
    draw();
  };

  const settle = (l: string, pos: number[], done?: 'win' | 'lose', full?: string) => {
    const hit = pos.length > 0;
    used.set(l, hit);
    if (hit) pos.forEach((p) => (shown[p] = l));
    else wrong++;
    pending = false;
    if (done) {
      over = true;
      draw(full);
      const guesser = (1 - setter) as 0 | 1;
      setTimeout(
        () => ctx.finish({ winner: done === 'win' ? guesser : setter, sub: `La palabra era ${full ?? word}` }),
        1100,
      );
    } else draw();
  };

  ctx.on((d) => {
    if (iSet && typeof d?.g === 'string' && !over) {
      const l = d.g as string;
      if (used.has(l)) return;
      const pos: number[] = [];
      [...word].forEach((c, i) => c === l && pos.push(i));
      const hitsAfter = shown.filter(Boolean).length + pos.length;
      const wrongAfter = wrong + (pos.length ? 0 : 1);
      const done = hitsAfter === len ? 'win' : wrongAfter >= MAX ? 'lose' : undefined;
      ctx.send({ r: { l, pos, done, full: done ? word : undefined } });
      settle(l, pos, done, word);
    } else if (!iSet && d?.w !== undefined && !word && len === 0) {
      len = d.w as number;
      shown = Array(len).fill('');
      play();
    } else if (!iSet && d?.r) {
      settle(d.r.l, d.r.pos, d.r.done, d.r.full);
    }
  });

  picker();
}

export const hangman: GameDef = {
  id: 'hangman',
  name: 'Ahorcado',
  tagline: 'Piensa una palabra para el otro jugador',
  icon: '🔤',
  from: '#34d399',
  to: '#0ea5e9',
  online: true,
  local: false,
  start,
};
