import { Ctx, el, esc, GameDef, rnd } from './kit';

const TRUTHS = [
  '¿Cuál fue tu primer pensamiento cuando me conociste?',
  '¿Qué es lo que más te gusta de mí?',
  '¿Cuál es tu recuerdo favorito de nosotros?',
  '¿Qué canción te recuerda a mí?',
  '¿Qué te hizo reír más conmigo?',
  '¿Cuál es tu mayor miedo en una relación?',
  '¿Qué es lo más tonto que has hecho por mí?',
  '¿Qué lugar sueñas con visitar conmigo?',
  '¿Qué es lo primero que notaste de mí?',
  '¿Cuál es tu plan perfecto para una cita?',
  '¿Qué hábito mío te parece más gracioso?',
  '¿Qué es algo que nunca me has dicho y quisieras decirme?',
  '¿En qué momento supiste que te gustaba?',
  '¿Qué apodo cariñoso te gustaría que te pusiera?',
  '¿Qué película o serie verías conmigo mil veces?',
  '¿Qué es lo que más extrañas cuando estamos lejos?',
  '¿Cuál ha sido tu mejor día conmigo?',
  '¿Qué meta quisieras que cumplamos juntos este año?',
  '¿Qué comida me pedirías que te cocinara?',
  '¿Qué es lo que más admiras de mí?',
  '¿Cómo te imaginas nuestro próximo año?',
  '¿Qué te da más ternura de mí?',
  '¿Qué sueño tienes que aún no me has contado?',
  '¿Qué es lo más bonito que alguien te ha dicho y quién fue?',
];

const DARES = [
  'Mándale un audio diciéndole algo bonito.',
  'Haz tu mejor imitación de un animal durante 10 segundos.',
  'Cántale un pedacito de tu canción favorita.',
  'Dile tres cosas que te encantan de tu pareja.',
  'Haz tu mejor cara de enamorado o enamorada.',
  'Baila 15 segundos sin música.',
  'Escribe un poema de dos líneas para tu pareja.',
  'Cuenta un chiste y no te rías.',
  'Dibuja a tu pareja en una hoja en 30 segundos y muéstrala.',
  'Dile "te quiero" en tres idiomas distintos.',
  'Haz tu mejor imitación de tu pareja.',
  'Mándale una foto de lo que tienes cerca ahora mismo.',
  'Hablen solo con rimas durante un minuto.',
  'Inventa una canción corta sobre tu pareja.',
  'Haz tu voz más graciosa y di "te extraño".',
  'Cuéntale cómo imaginas su día perfecto.',
  'Pon una canción y dediquénsela mutuamente.',
  'Describe a tu pareja usando solo tres emojis.',
  'Hazle un cumplido distinto cada 5 segundos por medio minuto.',
  'Dile qué plan harías si estuvieran juntos esta noche.',
  'Aguanta la risa mientras tu pareja te hace caras.',
  'Cuéntale tu primer recuerdo de ella o de él.',
  'Prométele algo pequeño y tierno para la próxima vez que se vean.',
  'Imita cómo crees que se ríe tu pareja.',
];

type Kind = 'v' | 'r';

function start(ctx: Ctx) {
  let turn: 0 | 1 = ctx.round % 2 === 0 ? 0 : 1;
  let card: { k: Kind; i: number } | null = null;
  let phase: 'pick' | 'card' | 'review' = 'pick';
  let answer = '';
  let note = '';
  const tally: [number, number] = [0, 0];
  const box = el('div', 'tod');
  ctx.root.append(box);

  const turnPlays = () => ctx.local || turn === ctx.me;
  const reviewer = () => ctx.local || turn !== ctx.me;
  const turnName = () => (ctx.local ? ctx.names[turn] : turn === ctx.me ? 'Tú' : ctx.other);

  const label = () => {
    ctx.turn(turn);
    const who = ctx.local ? `Turno de <b>${esc(ctx.names[turn])}</b>` : turn === ctx.me ? '<b>Tu turno</b>' : `Turno de ${esc(ctx.other)}`;
    ctx.status(`${who} · cumplidos ${tally[0]} - ${tally[1]}`);
  };

  const draw = () => {
    box.innerHTML = '';
    label();
    const c = el('div', `todcard ${card ? card.k : 'n'}`);
    if (!card) {
      c.innerHTML = `<span class="emoji">🎲</span><p>${turnPlays() ? '¿Verdad o reto?' : `${esc(ctx.other)} está eligiendo…`}</p>`;
    } else {
      const text = card.k === 'v' ? TRUTHS[card.i] : DARES[card.i];
      const extra = phase === 'review' && card.k === 'v' && answer ? `<p class="ans">“${esc(answer)}”</p>` : '';
      c.innerHTML = `<small>${card.k === 'v' ? 'Verdad' : 'Reto'}</small><p>${esc(text)}</p>${extra}`;
    }
    box.append(c);
    if (note) box.append(el('div', 'tf-note', esc(note)));

    const row = el('div', 'grow');
    if (!card) {
      if (turnPlays()) {
        const v = el('button', 'gbtn lagoon', 'Verdad');
        v.onclick = () => pick('v');
        const r = el('button', 'gbtn', 'Reto');
        r.onclick = () => pick('r');
        row.append(v, r);
      }
    } else if (phase === 'card') {
      if (turnPlays()) {
        if (card.k === 'v') {
          const input = el('input', 'ginput plain');
          input.placeholder = 'Escribe tu respuesta (o cuéntala por llamada)';
          input.maxLength = 160;
          input.value = answer;
          input.addEventListener('input', () => (answer = input.value));
          box.append(input);
        }
        const ok = el('button', 'gbtn gold', card.k === 'v' ? 'Responder ✓' : 'Ya lo cumplí ✓');
        ok.onclick = () => claim(card!.k === 'v' ? answer.trim() : '', true);
        const swap = el('button', 'gbtn ghost', 'Otra carta');
        swap.onclick = () => pick(card!.k);
        row.append(ok, swap);
      } else {
        box.append(el('div', 'tf-note', `Esperando a que ${esc(turnName())} ${card.k === 'v' ? 'responda' : 'cumpla el reto'}…`));
      }
    } else if (phase === 'review') {
      if (reviewer()) {
        const yes = el('button', 'gbtn gold', card.k === 'v' ? '✓ Me convence' : '✓ Sí lo cumplió');
        yes.onclick = () => verdict(true, true);
        const no = el('button', 'gbtn ghost', card.k === 'v' ? '✗ No me convence' : '✗ No lo cumplió');
        no.onclick = () => verdict(false, true);
        row.append(yes, no);
      } else {
        box.append(el('div', 'tf-note', `Esperando a que ${esc(ctx.other)} confirme…`));
      }
    }
    box.append(row);
  };

  const showCard = (k: Kind, i: number) => {
    card = { k, i };
    phase = 'card';
    answer = '';
    note = '';
    draw();
  };

  const pick = (k: Kind) => {
    const list = k === 'v' ? TRUTHS : DARES;
    let i = rnd(list.length);
    if (card && card.k === k && list.length > 1) while (i === card.i) i = rnd(list.length);
    ctx.send({ p: k, i });
    showCard(k, i);
  };

  const claim = (a: string, send: boolean) => {
    if (phase !== 'card') return;
    phase = 'review';
    answer = a;
    note = '';
    if (send) ctx.send({ rs: { a } });
    draw();
  };

  const verdict = (ok: boolean, send: boolean) => {
    if (phase !== 'review') return;
    if (send) ctx.send({ v: ok ? 1 : 0 });
    if (ok) {
      tally[turn]++;
      card = null;
      phase = 'pick';
      note = '';
      turn = turn === 0 ? 1 : 0;
    } else {
      phase = 'card';
      answer = '';
      note = ctx.local || turn !== ctx.me ? 'No quedó convencido. Inténtenlo otra vez.' : 'Tu pareja no quedó convencida. Inténtalo otra vez.';
    }
    draw();
  };

  ctx.on((d) => {
    if (d?.p && typeof d.i === 'number') showCard(d.p as Kind, d.i);
    else if (d?.rs) claim(String(d.rs.a ?? ''), false);
    else if (typeof d?.v === 'number') verdict(!!d.v, false);
  });

  draw();
}

export const truth: GameDef = {
  id: 'truth',
  name: 'Verdad o reto',
  tagline: 'Preguntas y retos tiernos por turnos',
  icon: '💌',
  from: '#f472b6',
  to: '#e11d48',
  online: true,
  local: true,
  start,
};
