import { Ctx, el, esc, GameDef, shuffle } from './kit';

type Q = [string, string, string, string, string];

const QUESTIONS: Q[] = [
  ['¿Cuál es la capital de Australia?', 'Canberra', 'Sídney', 'Melbourne', 'Perth'],
  ['¿Cuál es el río más largo de Sudamérica?', 'Amazonas', 'Orinoco', 'Paraná', 'Magdalena'],
  ['¿Cuál es el país más grande del mundo por superficie?', 'Rusia', 'Canadá', 'China', 'Estados Unidos'],
  ['¿En qué continente está Egipto?', 'África', 'Asia', 'Europa', 'Oceanía'],
  ['¿Cuál es el océano más grande?', 'Pacífico', 'Atlántico', 'Índico', 'Ártico'],
  ['¿Cuál es la capital de Canadá?', 'Ottawa', 'Toronto', 'Vancouver', 'Montreal'],
  ['¿Cuál es el desierto cálido más grande del mundo?', 'Sahara', 'Gobi', 'Atacama', 'Kalahari'],
  ['¿Qué país tiene forma de bota?', 'Italia', 'Grecia', 'Portugal', 'Chile'],
  ['¿Cuál es la montaña más alta del mundo?', 'Everest', 'K2', 'Aconcagua', 'Kilimanjaro'],
  ['¿Cuál es la capital de Japón?', 'Tokio', 'Osaka', 'Kioto', 'Seúl'],
  ['¿En qué país está Machu Picchu?', 'Perú', 'Bolivia', 'Ecuador', 'Chile'],
  ['¿Cuál es la capital de Colombia?', 'Bogotá', 'Medellín', 'Cali', 'Cartagena'],
  ['¿Cuál es la capital de Argentina?', 'Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza'],
  ['¿En qué ciudad está la Torre Eiffel?', 'París', 'Londres', 'Roma', 'Madrid'],
  ['¿Qué idioma se habla en Brasil?', 'Portugués', 'Español', 'Inglés', 'Francés'],
  ['¿Cuál es la moneda de Japón?', 'Yen', 'Won', 'Yuan', 'Dólar'],
  ['¿Cuál es el planeta más cercano al Sol?', 'Mercurio', 'Venus', 'Marte', 'Júpiter'],
  ['¿Cuál es el planeta más grande del sistema solar?', 'Júpiter', 'Saturno', 'Neptuno', 'Tierra'],
  ['¿Qué gas necesitamos respirar para vivir?', 'Oxígeno', 'Nitrógeno', 'Helio', 'Hidrógeno'],
  ['¿Cuántos huesos tiene un adulto?', '206', '106', '306', '256'],
  ['¿Cuál es el símbolo químico del oro?', 'Au', 'Ag', 'Or', 'Go'],
  ['¿Qué planeta se conoce como el planeta rojo?', 'Marte', 'Venus', 'Mercurio', 'Saturno'],
  ['¿Cuál es el animal terrestre más rápido?', 'Guepardo', 'León', 'Caballo', 'Leopardo'],
  ['¿Cuál es el órgano más grande del cuerpo humano?', 'La piel', 'El hígado', 'El corazón', 'El pulmón'],
  ['¿Qué vitamina produce el cuerpo con la luz del sol?', 'Vitamina D', 'Vitamina C', 'Vitamina A', 'Vitamina B12'],
  ['¿A cuántos grados hierve el agua al nivel del mar?', '100 °C', '90 °C', '120 °C', '80 °C'],
  ['¿Cuál es el mamífero más grande del mundo?', 'Ballena azul', 'Elefante africano', 'Jirafa', 'Tiburón ballena'],
  ['¿Cuántos corazones tiene un pulpo?', '3', '1', '2', '4'],
  ['¿Qué planeta es famoso por sus anillos?', 'Saturno', 'Marte', 'Venus', 'Mercurio'],
  ['¿Qué molécula es H₂O?', 'Agua', 'Oxígeno', 'Sal', 'Peróxido'],
  ['¿Cuál es el metal líquido a temperatura ambiente?', 'Mercurio', 'Plomo', 'Hierro', 'Cobre'],
  ['¿Cuál es el hueso más largo del cuerpo?', 'Fémur', 'Húmero', 'Tibia', 'Columna'],
  ['¿En qué año llegó Colón a América?', '1492', '1592', '1392', '1500'],
  ['¿Quién pintó la Mona Lisa?', 'Leonardo da Vinci', 'Miguel Ángel', 'Picasso', 'Van Gogh'],
  ['¿Qué civilización construyó las pirámides de Giza?', 'Egipcia', 'Maya', 'Romana', 'Azteca'],
  ['¿Quién fue el primer hombre en pisar la Luna?', 'Neil Armstrong', 'Buzz Aldrin', 'Yuri Gagarin', 'John Glenn'],
  ['¿En qué año terminó la Segunda Guerra Mundial?', '1945', '1918', '1939', '1950'],
  ['¿Qué país regaló la Estatua de la Libertad a Estados Unidos?', 'Francia', 'Inglaterra', 'España', 'Italia'],
  ['¿Quién escribió “Don Quijote de la Mancha”?', 'Miguel de Cervantes', 'Lope de Vega', 'Quevedo', 'Borges'],
  ['¿Qué imperio construyó Machu Picchu?', 'Inca', 'Azteca', 'Maya', 'Romano'],
  ['¿Quién escribió “Cien años de soledad”?', 'Gabriel García Márquez', 'Mario Vargas Llosa', 'Pablo Neruda', 'Julio Cortázar'],
  ['¿Quién escribió “El Principito”?', 'Antoine de Saint-Exupéry', 'Julio Verne', 'Víctor Hugo', 'Roald Dahl'],
  ['¿Qué película de Disney tiene a Simba?', 'El Rey León', 'Bambi', 'Tarzán', 'Aladdín'],
  ['¿Cuántos jugadores de un equipo de fútbol están en la cancha?', '11', '9', '10', '12'],
  ['¿En qué deporte se usa raqueta, red y pelota amarilla?', 'Tenis', 'Béisbol', 'Golf', 'Voleibol'],
  ['¿Qué país ganó el Mundial de fútbol de 2022?', 'Argentina', 'Francia', 'Brasil', 'Croacia'],
  ['¿Cuántos aros tiene el símbolo olímpico?', '5', '4', '6', '7'],
  ['¿Qué instrumento tiene teclas blancas y negras?', 'Piano', 'Guitarra', 'Violín', 'Flauta'],
  ['¿Cuántas cuerdas tiene una guitarra clásica?', '6', '4', '5', '8'],
  ['¿De qué color es la caja negra de un avión?', 'Naranja', 'Negra', 'Roja', 'Blanca'],
  ['¿Qué cantante colombiana canta “Waka Waka”?', 'Shakira', 'Karol G', 'Greeicy', 'Julieta Venegas'],
  ['¿Cuántos colores tiene el arcoíris?', '7', '6', '5', '8'],
  ['¿Cuántas patas tiene una araña?', '8', '6', '10', '4'],
  ['¿Qué animal se conoce como el rey de la selva?', 'León', 'Tigre', 'Elefante', 'Gorila'],
  ['¿Qué insecto produce la miel?', 'Abeja', 'Avispa', 'Hormiga', 'Mariposa'],
  ['¿Qué ave no vuela y vive en la Antártida?', 'Pingüino', 'Avestruz', 'Kiwi', 'Pelícano'],
  ['¿Cuántos días tiene un año bisiesto?', '366', '365', '364', '367'],
  ['¿Cuántos lados tiene un hexágono?', '6', '5', '8', '7'],
  ['¿Cuál es la raíz cuadrada de 144?', '12', '14', '11', '16'],
  ['¿Cuánto es 7 × 8?', '56', '54', '48', '63'],
  ['¿Qué planeta ocupa el tercer lugar desde el Sol?', 'Tierra', 'Venus', 'Marte', 'Mercurio'],
  ['¿Qué fruta se asocia con la historia de Newton?', 'Manzana', 'Pera', 'Naranja', 'Uva'],
  ['¿Qué país tiene como capital a Lima?', 'Perú', 'Chile', 'Bolivia', 'Paraguay'],
  ['¿Cuál es la capital de España?', 'Madrid', 'Barcelona', 'Sevilla', 'Valencia'],
  ['¿Qué mar separa Europa de África?', 'Mediterráneo', 'Rojo', 'Negro', 'Báltico'],
];

const TOTAL = 5;
const SECONDS = 15;

function start(ctx: Ctx) {
  let order: number[] = [];
  let qi = 0;
  const mine = new Map<number, { a: number; t: number }>();
  const theirs = new Map<number, { a: number; t: number }>();
  const score: [number, number] = [0, 0];
  const time: [number, number] = [0, 0];
  const me = ctx.me;
  const other = (1 - me) as 0 | 1;
  let startedAt = 0;
  let revealed = false;
  let timerId: number | undefined;
  let nextId: number | undefined;
  ctx.cleanup(() => {
    window.clearInterval(timerId);
    window.clearTimeout(nextId);
  });

  const box = el('div', 'trv');
  ctx.root.append(box);
  const q = () => QUESTIONS[order[qi]];

  const status = () => ctx.status(`Pregunta <b>${qi + 1}</b> de ${TOTAL} · aciertos ${score[0]} - ${score[1]}`);

  const answer = (a: number) => {
    if (mine.has(qi) || revealed) return;
    const t = Math.min(SECONDS * 1000, Date.now() - startedAt);
    mine.set(qi, { a, t });
    ctx.send({ q: qi, a, t });
    paint();
    check();
  };

  let shown: number[] = [];

  const paint = () => {
    const [text, ...opts] = q();
    const done = mine.get(qi);
    const them = theirs.get(qi);
    box.innerHTML = `<div class="trv-q">${esc(text)}</div><div class="trv-opts"></div>
      <div class="rc-meta"><span class="timer" id="trt">${Math.max(0, SECONDS - Math.floor((Date.now() - startedAt) / 1000))}</span><span>${done ? (them ? 'Revelando…' : `Esperando a ${esc(ctx.other)}…`) : 'Elige rápido, cuenta el tiempo'}</span></div>`;
    const list = box.querySelector<HTMLElement>('.trv-opts')!;
    shown.forEach((canon) => {
      const b = el('button', 'trv-opt', esc(opts[canon]));
      b.disabled = !!done || revealed;
      if (revealed) {
        if (canon === 0) b.classList.add('ok');
        else if (done?.a === canon) b.classList.add('bad');
        const tags: string[] = [];
        if (done?.a === canon) tags.push('Tú');
        if (them?.a === canon) tags.push(ctx.other);
        if (tags.length) b.innerHTML += `<em>${esc(tags.join(' · '))}</em>`;
      } else if (done?.a === canon) b.classList.add('picked');
      b.onclick = () => answer(canon);
      list.append(b);
    });
  };

  const check = () => {
    if (revealed || !mine.has(qi) || !theirs.has(qi)) return;
    revealed = true;
    window.clearInterval(timerId);
    const m = mine.get(qi)!;
    const t = theirs.get(qi)!;
    if (m.a === 0) {
      score[me]++;
      time[me] += m.t;
    }
    if (t.a === 0) {
      score[other]++;
      time[other] += t.t;
    }
    status();
    paint();
    nextId = window.setTimeout(next, 2400);
  };

  const next = () => {
    qi++;
    if (qi >= TOTAL) {
      const winner: 0 | 1 | null = score[0] !== score[1] ? (score[0] > score[1] ? 0 : 1) : time[0] !== time[1] ? (time[0] < time[1] ? 0 : 1) : null;
      ctx.finish({ winner, sub: `Aciertos: ${ctx.names[0]} ${score[0]} – ${score[1]} ${ctx.names[1]}` });
      return;
    }
    begin();
  };

  const begin = () => {
    revealed = false;
    startedAt = Date.now();
    shown = shuffle([0, 1, 2, 3]);
    status();
    paint();
    window.clearInterval(timerId);
    timerId = window.setInterval(() => {
      const left = Math.max(0, SECONDS - Math.floor((Date.now() - startedAt) / 1000));
      const t = box.querySelector<HTMLElement>('#trt');
      if (t && !revealed) {
        t.textContent = String(left);
        t.classList.toggle('low', left <= 5);
      }
      if (left <= 0 && !mine.has(qi) && !revealed) answer(-1);
    }, 500);
  };

  ctx.on((d) => {
    if (typeof d?.q === 'number' && typeof d.a === 'number') {
      theirs.set(d.q, { a: d.a, t: Number(d.t) || 0 });
      if (d.q === qi) {
        if (!revealed && mine.has(qi)) paint();
        check();
      }
    }
  });

  ctx.turn(null);
  ctx.init(
    () => shuffle(QUESTIONS.map((_, i) => i)).slice(0, TOTAL),
    (o) => {
      order = o;
      begin();
    },
  );
}

export const trivia: GameDef = {
  id: 'trivia',
  name: 'Trivia',
  tagline: 'Preguntas de cultura general: ¿quién sabe más?',
  icon: '❓',
  from: '#facc15',
  to: '#ea580c',
  online: true,
  local: false,
  match: { target: 2 },
  start,
};
