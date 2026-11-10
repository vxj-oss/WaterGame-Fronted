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
  const box = el('div', 'tod');
  ctx.root.append(box);

  const mine = () => (ctx.local ? true : turn === ctx.me);

  const label = () => {
    ctx.turn(turn);
    ctx.status(ctx.local ? `Turno de <b>${esc(ctx.names[turn])}</b>` : turn === ctx.me ? '<b>Tu turno</b>' : `Turno de ${esc(ctx.other)}`);
  };

  const draw = () => {
    box.innerHTML = '';
    label();
    const c = el('div', `todcard ${card ? card.k : 'n'}`);
    if (!card) {
      c.innerHTML = `<span class="emoji">🎲</span><p>${mine() ? '¿Verdad o reto?' : `${esc(ctx.other)} está eligiendo…`}</p>`;
    } else {
      const text = card.k === 'v' ? TRUTHS[card.i] : DARES[card.i];
      c.innerHTML = `<small>${card.k === 'v' ? 'Verdad' : 'Reto'}</small><p>${esc(text)}</p>`;
    }
    box.append(c);

    const row = el('div', 'grow');
    if (!card) {
      if (mine()) {
        const v = el('button', 'gbtn lagoon', 'Verdad');
        v.onclick = () => pick('v');
        const r = el('button', 'gbtn', 'Reto');
        r.onclick = () => pick('r');
        row.append(v, r);
      }
    } else if (mine()) {
      const ok = el('button', 'gbtn gold', 'Hecho ✓');
      ok.onclick = () => done(true);
      const swap = el('button', 'gbtn ghost', 'Otra carta');
      swap.onclick = () => pick(card!.k);
      row.append(ok, swap);
    }
    box.append(row);
  };

  const draw1 = (k: Kind, i: number) => {
    card = { k, i };
    draw();
  };

  const pick = (k: Kind) => {
    const list = k === 'v' ? TRUTHS : DARES;
    let i = rnd(list.length);
    if (card && card.k === k && list.length > 1) while (i === card.i) i = rnd(list.length);
    ctx.send({ p: k, i });
    draw1(k, i);
  };

  const done = (send: boolean) => {
    if (send) ctx.send({ d: 1 });
    card = null;
    turn = turn === 0 ? 1 : 0;
    draw();
  };

  ctx.on((d) => {
    if (d?.p && typeof d.i === 'number') draw1(d.p as Kind, d.i);
    else if (d?.d) done(false);
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
