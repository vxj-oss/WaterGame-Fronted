import { api, net } from './net';

interface Sig {
  desc?: RTCSessionDescriptionInit;
  cand?: RTCIceCandidateInit | null;
  hang?: boolean;
}

const FALLBACK: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
const POS_KEY = 'wf-call-pos';
const FAB = 46;

let pc: RTCPeerConnection | null = null;
let iceServers: RTCIceServer[] | null = null;
let remote = new MediaStream();
let micTrack: MediaStreamTrack | null = null;
let camTrack: MediaStreamTrack | null = null;
let camSender: RTCRtpSender | null = null;
let micOn = false;
let camOn = false;
let makingOffer = false;
let ignoreOffer = false;
let answered = false;
let ringing = false;
let open = false;
let note = '';
let pos = { x: -1, y: -1 };

let root: HTMLElement;
let dock: HTMLElement;
let fab: HTMLButtonElement;
let menu: HTMLElement;
let vids: HTMLElement;
let ring: HTMLElement;
let audioEl: HTMLAudioElement;
let remoteVideo: HTMLVideoElement;
let localVideo: HTMLVideoElement;

const CSS = `
#call { position: fixed; inset: 0; z-index: 70; pointer-events: none; font: 800 14px Nunito, system-ui, sans-serif; color: #f7f3ea; }
#call .dock { position: absolute; left: 0; top: 0; pointer-events: none; }
#call .dock > * { pointer-events: auto; }
#call button { border: 0; cursor: pointer; color: #fff; font: 800 14px Nunito, system-ui, sans-serif; border-radius: 999px; padding: 0; display: grid; place-items: center; background: rgba(8, 24, 32, 0.9); }
#call button:active { transform: scale(0.92); }
#call .fab { width: 46px; height: 46px; font-size: 20px; touch-action: none; box-shadow: 0 0 0 2px rgba(46, 211, 230, 0.55), 0 8px 20px rgba(0, 0, 0, 0.5); }
#call .fab.live { background: linear-gradient(180deg, #62e8f4, #3b8cff); box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.6), 0 8px 20px rgba(0, 0, 0, 0.5); }
#call .fab.muted { background: linear-gradient(180deg, #ff9a5c, #e11d48); }
#call .menu { position: absolute; left: 3px; top: 52px; display: flex; flex-direction: column; gap: 6px; align-items: center; }
#call .dock.up .menu { top: auto; bottom: 52px; flex-direction: column-reverse; }
#call .menu button { width: 40px; height: 40px; font-size: 17px; box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.25), 0 6px 14px rgba(0, 0, 0, 0.45); }
#call .menu button.wide { width: auto; padding: 0 12px; font-size: 13px; height: 38px; white-space: nowrap; }
#call .menu button.on { background: linear-gradient(180deg, #62e8f4, #3b8cff); }
#call .menu button.end { background: linear-gradient(180deg, #ff7a8a, #e11d48); }
#call .menu button.go { background: linear-gradient(180deg, #ffe48f, #ffae2b); color: #3a2400; }
#call .menu .st { font-size: 11px; color: #cfe6ee; background: rgba(8, 24, 32, 0.85); padding: 3px 8px; border-radius: 999px; white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis; }
#call .vids { position: absolute; top: 0; display: flex; flex-direction: column; gap: 5px; align-items: flex-end; }
#call .vids.l { right: 54px; }
#call .vids.r { left: 54px; align-items: flex-start; }
#call video { width: 104px; height: 78px; object-fit: cover; border-radius: 14px; background: #0b1b24; box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.35), 0 8px 18px rgba(0, 0, 0, 0.5); transform: scaleX(-1); pointer-events: none; }
#call video.rv { transform: none; }
#call video.lv { width: 56px; height: 42px; border-radius: 10px; }
#call .ring { position: absolute; left: 50%; top: calc(14px + env(safe-area-inset-top)); transform: translateX(-50%); display: none; gap: 10px; align-items: center; padding: 8px 10px 8px 16px; border-radius: 999px; pointer-events: auto;
  background: rgba(8, 24, 32, 0.95); box-shadow: 0 0 0 2px #ffd166, 0 12px 30px rgba(0, 0, 0, 0.55); animation: cring 1.2s ease-in-out infinite; }
#call .ring button { height: 38px; min-width: 38px; padding: 0 14px; }
#call .ring button.go { background: linear-gradient(180deg, #ffe48f, #ffae2b); color: #3a2400; }
#call .ring button.end { background: linear-gradient(180deg, #ff7a8a, #e11d48); }
@keyframes cring { 50% { box-shadow: 0 0 0 2px #ffd166, 0 0 26px rgba(255, 209, 102, 0.55), 0 12px 30px rgba(0, 0, 0, 0.55); } }
`;

const polite = () => net.role === 'water';
const send = (s: Sig) => net.send('event', { t: 'rtc', s });

async function servers() {
  if (!iceServers) {
    try {
      const r = await api<{ iceServers: RTCIceServer[] }>('/rtc-config');
      iceServers = r.iceServers?.length ? r.iceServers : FALLBACK;
    } catch {
      iceServers = FALLBACK;
    }
  }
  return iceServers;
}

const hasRemoteVideo = () => remote.getVideoTracks().some((t) => !t.muted && t.readyState === 'live');

async function ensurePc() {
  if (pc) return pc;
  const p = new RTCPeerConnection({ iceServers: await servers() });
  pc = p;
  remote = new MediaStream();
  audioEl.srcObject = remote;
  remoteVideo.srcObject = remote;
  p.onicecandidate = (e) => {
    if (e.candidate) send({ cand: e.candidate.toJSON() });
  };
  p.onnegotiationneeded = async () => {
    try {
      makingOffer = true;
      await p.setLocalDescription();
      send({ desc: p.localDescription! });
    } catch {
      note = 'No se pudo iniciar la llamada';
    } finally {
      makingOffer = false;
    }
  };
  p.ontrack = (e) => {
    remote.addTrack(e.track);
    e.track.onmute = render;
    e.track.onunmute = render;
    e.track.onended = render;
    void audioEl.play().catch(() => undefined);
    render();
  };
  p.onconnectionstatechange = () => {
    if (p.connectionState === 'failed') note = 'No se pudo conectar';
    else if (p.connectionState === 'connected') note = '';
    render();
  };
  return p;
}

async function onSignal(s: Sig) {
  if (s.hang) {
    teardown(false);
    return;
  }
  const p = await ensurePc();
  if (s.desc?.type === 'offer' && !answered) ringing = true;
  try {
    if (s.desc) {
      const collision = s.desc.type === 'offer' && (makingOffer || p.signalingState !== 'stable');
      ignoreOffer = !polite() && collision;
      if (ignoreOffer) return;
      await p.setRemoteDescription(s.desc);
      if (s.desc.type === 'offer') {
        await p.setLocalDescription();
        send({ desc: p.localDescription! });
      }
    } else if (s.cand) {
      await p.addIceCandidate(s.cand);
    }
  } catch {
    if (!ignoreOffer) note = 'Problema de conexión';
  }
  render();
}

async function addMic() {
  const p = await ensurePc();
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    micTrack = s.getAudioTracks()[0];
    p.addTrack(micTrack, s);
    micOn = true;
    note = '';
  } catch {
    note = 'Sin permiso de micrófono';
  }
  render();
}

async function start() {
  answered = true;
  ringing = false;
  open = true;
  note = 'Llamando…';
  render();
  await addMic();
}

async function answer() {
  answered = true;
  ringing = false;
  open = true;
  void audioEl.play().catch(() => undefined);
  render();
  await addMic();
}

function toggleMic() {
  if (!micTrack) {
    void addMic();
    return;
  }
  micOn = !micOn;
  micTrack.enabled = micOn;
  render();
}

async function toggleCam() {
  answered = true;
  ringing = false;
  const p = await ensurePc();
  if (camSender) {
    camTrack?.stop();
    p.removeTrack(camSender);
    camSender = null;
    camTrack = null;
    camOn = false;
    localVideo.srcObject = null;
    render();
    return;
  }
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 20 } } });
    camTrack = s.getVideoTracks()[0];
    camSender = p.addTrack(camTrack, s);
    localVideo.srcObject = new MediaStream([camTrack]);
    camOn = true;
    note = '';
  } catch {
    note = 'Sin permiso de cámara';
  }
  render();
}

function teardown(notify: boolean) {
  if (notify && pc) send({ hang: true });
  micTrack?.stop();
  camTrack?.stop();
  pc?.close();
  pc = null;
  micTrack = null;
  camTrack = null;
  camSender = null;
  micOn = false;
  camOn = false;
  answered = false;
  ringing = false;
  makingOffer = false;
  ignoreOffer = false;
  open = false;
  note = '';
  remote = new MediaStream();
  audioEl.srcObject = null;
  remoteVideo.srcObject = null;
  localVideo.srcObject = null;
  render();
}

const clamp = () => {
  const maxX = Math.max(6, window.innerWidth - FAB - 6);
  const maxY = Math.max(6, window.innerHeight - FAB - 6);
  pos = { x: Math.min(maxX, Math.max(6, pos.x)), y: Math.min(maxY, Math.max(6, pos.y)) };
};

function place() {
  if (!window.innerWidth || !window.innerHeight) return;
  if (pos.x < 0) pos = { x: window.innerWidth - FAB - 8, y: Math.round(window.innerHeight * 0.3) };
  clamp();
  dock.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
  dock.style.visibility = 'visible';
  dock.classList.toggle('up', pos.y > window.innerHeight * 0.55);
  vids.className = `vids ${pos.x > window.innerWidth / 2 ? 'l' : 'r'}`;
}

const btn = (cls: string, html: string, label: string, fn: () => void) => {
  const b = document.createElement('button');
  b.className = cls;
  b.innerHTML = html;
  b.setAttribute('aria-label', label);
  b.onclick = fn;
  return b;
};

function render() {
  const inTable = !!net.code;
  root.style.display = inTable ? 'block' : 'none';
  if (!inTable) return;

  const active = answered || (!!pc && !ringing);
  const live = pc?.connectionState === 'connected';
  fab.className = `fab${live ? ' live' : ''}${active && !micOn ? ' muted' : ''}`;
  fab.textContent = active ? (micOn ? '🎧' : '🔇') : '📞';
  fab.setAttribute('aria-label', 'Llamada');

  ring.style.display = ringing ? 'flex' : 'none';

  menu.innerHTML = '';
  if (open && !ringing) {
    if (!active) {
      if (net.peerOnline) {
        menu.append(btn('wide go', '📞 Llamar', 'Llamar', () => void start()));
        menu.append(btn('wide', '📷 Video', 'Llamar con video', () => void toggleCam()));
      } else {
        const s = document.createElement('span');
        s.className = 'st';
        s.textContent = 'Tu pareja no está';
        menu.append(s);
      }
    } else {
      menu.append(btn(micOn ? 'on' : '', micOn ? '🎤' : '🔇', micOn ? 'Silenciar micrófono' : 'Activar micrófono', toggleMic));
      menu.append(btn(camOn ? 'on' : '', camOn ? '📷' : '🚫', camOn ? 'Apagar cámara' : 'Encender cámara', () => void toggleCam()));
      menu.append(btn('end', '📵', 'Colgar', () => teardown(true)));
      const s = document.createElement('span');
      s.className = 'st';
      s.textContent = live ? 'En llamada' : note || 'Conectando…';
      menu.append(s);
    }
  }

  vids.innerHTML = '';
  if (hasRemoteVideo()) {
    remoteVideo.className = 'rv';
    vids.append(remoteVideo);
    void remoteVideo.play().catch(() => undefined);
  }
  if (camOn) {
    localVideo.className = 'lv';
    vids.append(localVideo);
    void localVideo.play().catch(() => undefined);
  }
  place();
}

function drag() {
  let sx = 0;
  let sy = 0;
  let ox = 0;
  let oy = 0;
  let moved = false;
  let id = -1;
  fab.addEventListener('pointerdown', (e) => {
    id = e.pointerId;
    sx = e.clientX;
    sy = e.clientY;
    ox = pos.x;
    oy = pos.y;
    moved = false;
    try {
      fab.setPointerCapture(id);
    } catch {
      void 0;
    }
  });
  fab.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (!moved && Math.hypot(dx, dy) < 8) return;
    moved = true;
    pos = { x: ox + dx, y: oy + dy };
    place();
  });
  const end = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    id = -1;
    if (moved) {
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(pos));
      } catch {
        void 0;
      }
      return;
    }
    open = !open;
    render();
  };
  fab.addEventListener('pointerup', end);
  fab.addEventListener('pointercancel', () => {
    id = -1;
  });
}

export function initCall() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  try {
    const saved = JSON.parse(localStorage.getItem(POS_KEY) ?? 'null') as { x: number; y: number } | null;
    if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') pos = saved;
  } catch {
    void 0;
  }

  root = document.createElement('div');
  root.id = 'call';
  root.style.display = 'none';

  dock = document.createElement('div');
  dock.className = 'dock';
  dock.style.visibility = 'hidden';
  fab = document.createElement('button');
  fab.className = 'fab';
  menu = document.createElement('div');
  menu.className = 'menu';
  vids = document.createElement('div');
  vids.className = 'vids l';
  dock.append(vids, fab, menu);

  ring = document.createElement('div');
  ring.className = 'ring';
  ring.innerHTML = '<span>Tu pareja quiere hablar</span>';
  ring.append(
    btn('go', 'Contestar', 'Contestar', () => void answer()),
    btn('end', '✕', 'Rechazar', () => teardown(true)),
  );

  root.append(dock, ring);
  document.body.appendChild(root);

  audioEl = document.createElement('audio');
  audioEl.autoplay = true;
  audioEl.setAttribute('playsinline', '');
  remoteVideo = document.createElement('video');
  remoteVideo.autoplay = true;
  remoteVideo.muted = true;
  remoteVideo.setAttribute('playsinline', '');
  localVideo = document.createElement('video');
  localVideo.autoplay = true;
  localVideo.muted = true;
  localVideo.setAttribute('playsinline', '');

  drag();
  window.addEventListener('resize', place);

  let chain: Promise<void> = Promise.resolve();
  net.on('event', (e: { t?: string; s?: Sig }) => {
    if (e?.t !== 'rtc' || !e.s) return;
    const sig = e.s;
    chain = chain.then(() => onSignal(sig)).catch(() => undefined);
  });
  net.on('joined', render);
  net.on('peer-joined', render);
  net.on('peer-left', () => teardown(false));
  net.on('disconnected', () => teardown(false));
}
