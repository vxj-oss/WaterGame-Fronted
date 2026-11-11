import { api, net } from './net';

interface Sig {
  desc?: RTCSessionDescriptionInit;
  cand?: RTCIceCandidateInit | null;
  hang?: boolean;
}

const FALLBACK: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];

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
let note = '';

let root: HTMLElement;
let audioEl: HTMLAudioElement;
let remoteVideo: HTMLVideoElement;
let localVideo: HTMLVideoElement;

const CSS = `
#call { position: fixed; inset: 0; z-index: 70; pointer-events: none; font: 800 15px Nunito, system-ui, sans-serif; color: #f7f3ea; }
#call > * { pointer-events: auto; }
#call .cb { position: absolute; left: 50%; bottom: calc(12px + env(safe-area-inset-bottom)); transform: translateX(-50%); display: flex; gap: 8px; align-items: center; padding: 6px; border-radius: 999px;
  background: rgba(8, 24, 32, 0.9); box-shadow: 0 0 0 1.5px rgba(46, 211, 230, 0.4), 0 10px 26px rgba(0, 0, 0, 0.5); }
#call button { border: 0; cursor: pointer; color: #fff; font: 800 15px Nunito, system-ui, sans-serif; border-radius: 999px; padding: 0; min-width: 44px; height: 44px; display: grid; place-items: center; background: rgba(255, 255, 255, 0.12); }
#call button:active { transform: scale(0.93); }
#call button.on { background: linear-gradient(180deg, #62e8f4, #3b8cff); }
#call button.off { background: rgba(255, 255, 255, 0.12); opacity: 0.8; }
#call button.end { background: linear-gradient(180deg, #ff7a8a, #e11d48); }
#call button.go { background: linear-gradient(180deg, #ffe48f, #ffae2b); color: #3a2400; padding: 0 16px; }
#call button.pill { padding: 0 16px; }
#call .st { padding: 0 10px; color: #8fb4c0; font-size: 13px; max-width: 150px; line-height: 1.1; }
#call .ring { position: absolute; left: 50%; top: calc(14px + env(safe-area-inset-top)); transform: translateX(-50%); display: flex; gap: 10px; align-items: center; padding: 10px 12px 10px 18px; border-radius: 999px;
  background: rgba(8, 24, 32, 0.95); box-shadow: 0 0 0 2px #ffd166, 0 12px 30px rgba(0, 0, 0, 0.55); animation: cring 1.2s ease-in-out infinite; }
@keyframes cring { 50% { box-shadow: 0 0 0 2px #ffd166, 0 0 26px rgba(255, 209, 102, 0.55), 0 12px 30px rgba(0, 0, 0, 0.55); } }
#call .vids { position: absolute; right: calc(8px + env(safe-area-inset-right)); top: calc(54px + env(safe-area-inset-top)); display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
#call video { width: 132px; height: 99px; object-fit: cover; border-radius: 16px; background: #0b1b24; box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.35), 0 8px 20px rgba(0, 0, 0, 0.5); transform: scaleX(-1); }
#call video.rv { transform: none; }
#call video.lv { width: 72px; height: 54px; border-radius: 12px; }
@media (max-height: 460px) { #call video { width: 104px; height: 78px; } #call video.lv { width: 56px; height: 42px; } }
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
    if (p.connectionState === 'failed') note = 'No se pudo conectar. Prueben de nuevo';
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
    note = 'Sin permiso para el micrófono';
  }
  render();
}

async function start() {
  answered = true;
  ringing = false;
  note = 'Llamando…';
  render();
  await addMic();
}

async function answer() {
  answered = true;
  ringing = false;
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
    note = 'Sin permiso para la cámara';
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
  note = '';
  remote = new MediaStream();
  audioEl.srcObject = null;
  remoteVideo.srcObject = null;
  localVideo.srcObject = null;
  render();
}

function render() {
  const inTable = !!net.code;
  root.style.display = inTable ? 'block' : 'none';
  if (!inTable) return;
  const bar = !net.peerOnline && !pc ? '' : answered || pc ? 'active' : 'idle';
  root.innerHTML = '';
  const add = (tag: string, cls: string, html: string, fn?: () => void) => {
    const b = document.createElement(tag);
    b.className = cls;
    b.innerHTML = html;
    if (fn) (b as HTMLButtonElement).onclick = fn;
    return b;
  };

  if (ringing) {
    const box = add('div', 'ring', '<span>Tu pareja quiere hablar</span>');
    const yes = add('button', 'go', 'Contestar', () => void answer());
    const no = add('button', 'end', '✕', () => teardown(true));
    no.setAttribute('aria-label', 'Rechazar');
    box.append(yes, no);
    root.append(box);
  }

  const showVideo = hasRemoteVideo() || camOn;
  if (showVideo) {
    const v = add('div', 'vids', '');
    if (hasRemoteVideo()) {
      remoteVideo.className = 'rv';
      v.append(remoteVideo);
      void remoteVideo.play().catch(() => undefined);
    }
    if (camOn) {
      localVideo.className = 'lv';
      v.append(localVideo);
      void localVideo.play().catch(() => undefined);
    }
    root.append(v);
  }

  if (!net.peerOnline && !pc) return;
  const cb = add('div', 'cb', '');
  if (bar === 'idle' && !ringing) {
    cb.append(add('button', 'go', '📞 Hablar', () => void start()));
    cb.append(add('button', 'pill', '📷', () => void toggleCam()));
  } else if (!ringing) {
    const mic = add('button', micOn ? 'on' : 'off', micOn ? '🎤' : '🔇', toggleMic);
    mic.setAttribute('aria-label', micOn ? 'Silenciar micrófono' : 'Activar micrófono');
    const cam = add('button', camOn ? 'on' : 'off', camOn ? '📷' : '🚫', () => void toggleCam());
    cam.setAttribute('aria-label', camOn ? 'Apagar cámara' : 'Encender cámara');
    const end = add('button', 'end', '📵', () => teardown(true));
    end.setAttribute('aria-label', 'Colgar');
    cb.append(mic, cam, end);
    const state = pc?.connectionState === 'connected' ? 'En llamada' : note || 'Conectando…';
    cb.append(add('span', 'st', state));
  }
  if (cb.childElementCount) root.append(cb);
}

export function initCall() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  root = document.createElement('div');
  root.id = 'call';
  root.style.display = 'none';
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
