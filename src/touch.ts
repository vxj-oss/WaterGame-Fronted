export const touch = {
  left: false,
  right: false,
  up: false,
  enabled: false,
  role: 'fire' as 'fire' | 'water',
};

type Key = 'left' | 'right' | 'up';

const MIN_HOLD = 110;
const releasers: (() => void)[] = [];

function bind(el: HTMLElement, key: Key) {
  const active = new Set<number>();
  let since = 0;
  let timer: number | undefined;

  const release = () => {
    window.clearTimeout(timer);
    active.clear();
    touch[key] = false;
    el.classList.remove('on');
  };

  const on = (e: PointerEvent) => {
    e.preventDefault();
    window.clearTimeout(timer);
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      void 0;
    }
    if (!active.size) since = performance.now();
    active.add(e.pointerId);
    touch[key] = true;
    el.classList.add('on');
  };

  const off = (e: PointerEvent) => {
    e.preventDefault();
    if (!active.delete(e.pointerId) || active.size) return;
    const wait = MIN_HOLD - (performance.now() - since);
    if (wait > 0) timer = window.setTimeout(release, wait);
    else release();
  };

  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointercancel', off);
  el.addEventListener('lostpointercapture', off);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  releasers.push(release);
}

export function setupTouchControls() {
  const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (!isTouch) return;
  touch.enabled = true;

  const root = document.createElement('div');
  root.id = 'touch';
  root.innerHTML = `
    <div class="grp"><button data-k="left">‹</button><button data-k="right">›</button></div>
    <div class="grp"><button id="role">F</button><button data-k="up">↑</button></div>`;
  root.style.display = 'none';
  document.body.appendChild(root);

  root.querySelectorAll<HTMLElement>('button[data-k]').forEach((b) => bind(b, b.dataset.k as Key));

  window.addEventListener('blur', () => releasers.forEach((fn) => fn()));
  document.addEventListener('visibilitychange', () => releasers.forEach((fn) => fn()));

  const role = root.querySelector<HTMLElement>('#role')!;
  role.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    touch.role = touch.role === 'fire' ? 'water' : 'fire';
    role.textContent = touch.role === 'fire' ? 'F' : 'A';
  });
}

export function showTouch(on: boolean) {
  const el = document.getElementById('touch');
  if (el) el.style.display = on ? 'flex' : 'none';
  if (!on) releasers.forEach((fn) => fn());
}
