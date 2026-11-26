import './anniversary.css';
import { ANNIVERSARY, COUPONS, DREAMS, LETTER, LOVES, PROMISES, QUOTES, SLIDES, SONG } from '../data/anniversary';
import { app } from '../services/app';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** El botón aparece desde el 26 de noviembre; para probar antes, abre la página con ?mes=1. */
export function anniversaryUnlocked(): boolean {
  try {
    if (new URLSearchParams(location.search).has('mes')) return true;
  } catch {
    /* sin URL */
  }
  return Date.now() >= ANNIVERSARY.unlock.getTime();
}

export function openAnniversary() {
  if (document.getElementById('mes')) return;
  const root = document.createElement('div');
  root.id = 'mes';
  document.body.appendChild(root);
  app.game?.loop.sleep();
  history.pushState(null, '');

  const timers: number[] = [];
  let closed = false;
  const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));

  const close = () => {
    if (closed) return;
    closed = true;
    timers.forEach((t) => window.clearTimeout(t));
    audio.pause();
    audio.removeAttribute('src');
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('popstate', onPop);
    root.remove();
    app.game?.loop.wake();
  };
  const onPop = () => close();
  window.addEventListener('popstate', onPop);

  const x = document.createElement('button');
  x.className = 'mes-x';
  x.textContent = '×';
  x.setAttribute('aria-label', 'Cerrar');
  x.onclick = () => (history.state === null ? history.back() : close());
  root.append(x);

  const audio = new Audio(`${import.meta.env.BASE_URL}anniversary/song.m4a`);
  audio.loop = true;
  audio.volume = 0.7;
  const snd = document.createElement('button');
  snd.className = 'mes-x mes-snd';
  snd.setAttribute('aria-label', 'Música');
  const paintSnd = () => (snd.textContent = audio.paused ? '🔇' : '🔊');
  let muted = false;
  snd.onclick = (e) => {
    e.stopPropagation();
    muted = !audio.paused;
    if (muted) audio.pause();
    else void audio.play().then(paintSnd, paintSnd);
    paintSnd();
  };
  // Siempre sonando: si se pausa solo (llamada, pestaña en segundo plano), vuelve con el siguiente toque o al regresar.
  const keepOn = () => {
    if (!closed && started && !muted && audio.paused) void audio.play().then(paintSnd, paintSnd);
  };
  let started = false;
  root.addEventListener('pointerdown', keepOn);
  audio.addEventListener('pause', paintSnd);
  audio.addEventListener('play', paintSnd);
  const onVis = () => document.visibilityState === 'visible' && keepOn();
  document.addEventListener('visibilitychange', onVis);
  paintSnd();
  root.append(snd);
  const playMusic = () => void audio.play().then(paintSnd, paintSnd);

  const stage = document.createElement('div');
  stage.className = 'mes-stage';
  root.append(stage);

  const hearts = (n: number) => {
    const set = ['💗', '💖', '💕', '❤️', '🔥', '💧'];
    for (let i = 0; i < n; i++) {
      later(() => {
        if (closed) return;
        const h = document.createElement('span');
        h.className = 'mes-heart';
        h.textContent = set[Math.floor(Math.random() * set.length)];
        h.style.left = `${Math.random() * 96}%`;
        h.style.fontSize = `${18 + Math.random() * 26}px`;
        h.style.setProperty('--r', `${Math.round(Math.random() * 60 - 30)}deg`);
        h.style.animationDuration = `${5 + Math.random() * 5}s`;
        root.append(h);
        later(() => h.remove(), 10500);
      }, i * 260);
    }
  };

  // Temporizadores de la pantalla actual (se cancelan al cambiar de pantalla).
  let scr: number[] = [];
  const onScreen = (fn: () => void, ms: number) => scr.push(window.setTimeout(() => !closed && fn(), ms));
  let live = 0;
  const clear = () => {
    scr.forEach((t) => window.clearTimeout(t));
    scr = [];
    window.clearInterval(live);
    stage.innerHTML = '';
    root.querySelector('.mes-dots')?.remove();
    root.querySelector('.mes-nav')?.remove();
  };

  const intro = () => {
    clear();
    stage.innerHTML = `<div class="mes-pulse">💌</div>
      <h1 class="mes-big">${esc(ANNIVERSARY.title)}</h1>
      <p class="mes-name">${esc(ANNIVERSARY.name)}</p>
      <p class="mes-sub">Hice esto con mucho cariño, solo para ti.</p>`;
    const go = document.createElement('button');
    go.className = 'mes-btn';
    go.textContent = 'Abrir 💗';
    go.onclick = () => {
      started = true;
      if (audio.paused) playMusic();
      photos(0);
    };
    stage.append(go);
    hearts(10);
  };

  const photos = (i: number) => {
    clear();
    const dots = document.createElement('div');
    dots.className = 'mes-dots';
    dots.innerHTML = SLIDES.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('');
    root.append(dots);
    const s = SLIDES[i];
    stage.innerHTML = `<img class="mes-photo${i % 2 ? ' alt' : ''}" src="${import.meta.env.BASE_URL}anniversary/${s.photo}" alt="" />
      <p class="mes-sub">${esc(s.line)}</p>
      <p class="mes-sub" style="font-size:13px;opacity:.6">Toca para seguir</p>`;
    const nav = document.createElement('div');
    nav.className = 'mes-nav';
    const prev = document.createElement('b');
    const next = document.createElement('b');
    prev.onclick = () => (i > 0 ? photos(i - 1) : intro());
    next.onclick = () => (i + 1 < SLIDES.length ? photos(i + 1) : chapter(0));
    nav.append(prev, next);
    root.append(nav);
    onScreen(() => next.click(), 6500);
    if (i === 0 || i % 4 === 0) hearts(4);
  };

  const unit = (n: number, l: string) => `<div><b>${n}</b><span>${l}</span></div>`;

  const counter = () => {
    clear();
    const since = new Date(2026, 9, 26, 0, 0, 0).getTime();
    stage.innerHTML = `<p class="mes-sub">Desde el ${esc(ANNIVERSARY.met)} hasta este momento</p><div class="mes-count" id="mes-c"></div><p class="mes-sub" id="mes-cs" style="opacity:0">…y cada segundo contigo en mi mente vale la pena.</p>`;
    const paint = () => {
      const s = Math.max(0, Math.floor((Date.now() - since) / 1000));
      const c = root.querySelector('#mes-c');
      if (c) c.innerHTML = unit(Math.floor(s / 86400), 'días') + unit(Math.floor(s / 3600) % 24, 'horas') + unit(Math.floor(s / 60) % 60, 'min') + unit(s % 60, 'seg');
    };
    paint();
    live = window.setInterval(paint, 1000);
    onScreen(() => ((root.querySelector('#mes-cs') as HTMLElement).style.opacity = '1'), 2200);
    hearts(6);
    cont(8000);
  };

  /** Botón "Seguir" que también avanza solo tras un tiempo. */
  const cont = (ms: number) => {
    const b = document.createElement('button');
    b.className = 'mes-btn ghost';
    b.textContent = 'Seguir';
    b.onclick = () => chapter(chapterIdx + 1);
    stage.append(b);
    onScreen(() => b.click(), ms);
  };

  const list = (title: string, items: string[], icon: string) => {
    clear();
    stage.innerHTML = `<div class="mes-pulse" style="font-size:48px">${icon}</div><h2 class="mes-big" style="font-size:clamp(30px,7vw,46px)">${esc(title)}</h2><ul class="mes-list"></ul>`;
    const ul = stage.querySelector('ul')!;
    items.forEach((t, k) =>
      onScreen(() => {
        const li = document.createElement('li');
        li.textContent = t;
        ul.append(li);
      }, 900 + k * 1700),
    );
    hearts(5);
    const done = 900 + items.length * 1700;
    onScreen(() => cont(5500), done);
  };

  const coupons = () => {
    clear();
    stage.innerHTML = `<h2 class="mes-big" style="font-size:clamp(30px,7vw,46px)">Vales de amor</h2><p class="mes-sub">Toca cada uno para descubrirlo 💌</p><div class="mes-cards"></div>`;
    const box = stage.querySelector('.mes-cards')!;
    COUPONS.forEach((c) => {
      const d = document.createElement('button');
      d.className = 'mes-card';
      d.innerHTML = `<span>${c.icon}</span><b>${esc(c.title)}</b><small>?</small>`;
      d.onclick = () => {
        d.classList.add('open');
        d.innerHTML = `<span>${c.icon}</span><b>${esc(c.title)}</b><small>${esc(c.text)}</small>`;
      };
      box.append(d);
    });
    hearts(4);
    const b = document.createElement('button');
    b.className = 'mes-btn ghost';
    b.textContent = 'Seguir';
    b.onclick = () => chapter(chapterIdx + 1);
    stage.append(b);
  };

  const chapters: (() => void)[] = [
    counter,
    () => list('Lo que amo de ti', LOVES, '💖'),
    () => list('Mis promesas', PROMISES, '🤞'),
    coupons,
    () => list('Lo que viene', DREAMS, '🌠'),
    () => quotes(0),
  ];
  let chapterIdx = 0;
  const chapter = (k: number) => {
    chapterIdx = k;
    if (k >= chapters.length) return letter();
    chapters[k]();
  };

  const quotes = (i: number) => {
    if (i >= QUOTES.length) return letter();
    clear();
    stage.innerHTML = `<p class="mes-quote">“${esc(QUOTES[i])}”</p><p class="mes-sub" style="font-size:13px;opacity:.6">Toca para seguir</p>`;
    const nav = document.createElement('div');
    nav.className = 'mes-nav';
    const b = document.createElement('b');
    b.onclick = () => quotes(i + 1);
    nav.append(b);
    root.append(nav);
  };

  const letter = () => {
    clear();
    const box = document.createElement('div');
    box.className = 'mes-letter';
    box.innerHTML =
      `<p style="animation-delay:.1s;font-family:'Lilita One',system-ui,sans-serif;font-size:26px;color:#ff9fbd">Para ti, ${esc(ANNIVERSARY.nickname)}:</p>` +
      LETTER.map((p, k) => `<p style="animation-delay:${0.7 + k * 1.1}s">${esc(p)}</p>`).join('') +
      `<p class="mes-sign" style="animation-delay:${0.7 + LETTER.length * 1.1}s">${esc(ANNIVERSARY.sign)} 💗</p>`;
    stage.append(box);
    const more = document.createElement('button');
    more.className = 'mes-btn';
    more.textContent = 'Un último detalle ✨';
    more.style.opacity = '0';
    more.style.animation = `mesIn .8s ease ${1.2 + LETTER.length * 1.1}s forwards`;
    more.onclick = finale;
    stage.append(more);
    hearts(8);
  };

  const finale = () => {
    clear();
    stage.innerHTML = `<div class="mes-pulse">❤️‍🔥</div>
      <h1 class="mes-big">Feliz primer mes</h1>
      <p class="mes-sub">Te quiero muchísimo, ${esc(ANNIVERSARY.nickname)}. Gracias por cada momento.</p>`;
    const days = Math.max(1, Math.floor((Date.now() - new Date(2026, 9, 26).getTime()) / 86400000));
    const c = document.createElement('p');
    c.className = 'mes-sub';
    c.innerHTML = `Desde el ${esc(ANNIVERSARY.met)}: <b>${days}</b> días juntos 💞`;
    const again = document.createElement('button');
    again.className = 'mes-btn ghost';
    again.textContent = 'Verlo otra vez';
    again.onclick = intro;
    const song = document.createElement('a');
    song.className = 'mes-btn';
    song.href = SONG.url;
    song.target = '_blank';
    song.rel = 'noopener noreferrer';
    song.style.textDecoration = 'none';
    song.textContent = `🎵 Nuestra canción: ${SONG.title}`;
    const by = document.createElement('p');
    by.className = 'mes-sub';
    by.style.fontSize = '14px';
    by.textContent = SONG.artist;
    stage.append(c, song, by, again);
    hearts(40);
  };

  intro();
}
