export const touch = {
  left: false,
  right: false,
  up: false,
  enabled: false,
  role: 'fire' as 'fire' | 'water',
};

type Key = 'left' | 'right' | 'up';

function bind(el: HTMLElement, key: Key) {
  const on = (e: Event) => {
    e.preventDefault();
    touch[key] = true;
    el.classList.add('on');
  };
  const off = (e: Event) => {
    e.preventDefault();
    touch[key] = false;
    el.classList.remove('on');
  };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointercancel', off);
  el.addEventListener('pointerleave', off);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
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
}
