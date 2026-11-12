let timer: number | undefined;

export function toast(text: string) {
  let box = document.getElementById('toast');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast';
    box.style.cssText =
      'position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:80;padding:12px 20px;border-radius:999px;max-width:90vw;text-align:center;' +
      'background:rgba(8,24,32,0.92);color:#f7f3ea;font:800 15px Nunito,system-ui,sans-serif;box-shadow:0 0 0 1.5px rgba(46,211,230,0.4),0 12px 30px rgba(0,0,0,0.5);' +
      'pointer-events:none;transition:opacity 0.3s';
    document.body.appendChild(box);
  }
  box.textContent = text;
  box.style.opacity = '1';
  window.clearTimeout(timer);
  const el = box;
  timer = window.setTimeout(() => {
    el.style.opacity = '0';
  }, 3200);
}
