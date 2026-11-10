import { io, Socket } from 'socket.io-client';

// URL del backend: VITE_API_URL en producción; en local, el mismo host que sirve el juego (así funciona desde el celular).
export const API = (import.meta.env.VITE_API_URL as string | undefined) ?? `http://${location.hostname}:4010`;

export type Role = 'fire' | 'water';
type Fn = (payload: any) => void;

class Net {
  token: string | null = null;
  user: { name: string; picture?: string | null } | null = null;
  role: Role | null = null;
  code: string | null = null;
  peerOnline = false;
  /** Al volver al menú, reabrir la pantalla de la mesa. */
  reopenLobby = false;

  private socket: Socket | null = null;
  private subs = new Map<string, Set<Fn>>();

  constructor() {
    try {
      this.token = localStorage.getItem('wf-token');
      const u = localStorage.getItem('wf-user');
      if (u) this.user = JSON.parse(u);
    } catch {
      /* sin localStorage */
    }
  }

  setSession(token: string, user: { name: string; picture?: string | null }) {
    this.token = token;
    this.user = user;
    try {
      localStorage.setItem('wf-token', token);
      localStorage.setItem('wf-user', JSON.stringify(user));
    } catch {
      /* sin localStorage */
    }
  }

  logout() {
    this.disconnect();
    this.token = null;
    this.user = null;
    try {
      localStorage.removeItem('wf-token');
      localStorage.removeItem('wf-user');
    } catch {
      /* sin localStorage */
    }
  }

  /** Suscribe un manejador. Devuelve la función para cancelar la suscripción. */
  on(ev: string, fn: Fn): () => void {
    if (!this.subs.has(ev)) this.subs.set(ev, new Set());
    this.subs.get(ev)!.add(fn);
    return () => this.subs.get(ev)?.delete(fn);
  }

  private fire(ev: string, payload: unknown) {
    this.subs.get(ev)?.forEach((f) => f(payload));
  }

  connect() {
    if (this.socket || !this.token) return;
    const s = io(API, { auth: { token: this.token }, transports: ['websocket', 'polling'] });
    this.socket = s;
    s.on('joined', (p: { role: Role; code: string; peerOnline: boolean }) => {
      this.role = p.role;
      this.code = p.code;
      this.peerOnline = p.peerOnline;
      this.fire('joined', p);
    });
    s.on('peer-joined', () => {
      this.peerOnline = true;
      this.fire('peer-joined', null);
    });
    s.on('peer-left', () => {
      this.peerOnline = false;
      this.fire('peer-left', null);
    });
    for (const ev of ['state', 'event', 'emote']) s.on(ev, (p) => this.fire(ev, p));
    s.on('connect_error', (e) => this.fire('error', e.message));
    s.on('disconnect', () => {
      this.peerOnline = false;
      this.fire('disconnected', null);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.role = null;
    this.code = null;
    this.peerOnline = false;
  }

  send(ev: 'state' | 'event' | 'emote', payload: unknown) {
    this.socket?.emit(ev, payload);
  }
}

export const net = new Net();

export async function api<T = any>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(net.token ? { Authorization: `Bearer ${net.token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}) as { error?: string });
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}
