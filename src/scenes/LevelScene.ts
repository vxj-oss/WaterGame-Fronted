import Phaser from 'phaser';
import { COLS, GROUP_COLORS, ROWS, TILE, TOP } from '../config';
import { LEVELS } from '../levels';
import { MESSAGES } from '../messages';
import { showTouch, touch } from '../touch';
import { sfx } from '../audio';
import { record } from '../save';
import { api, net } from '../net';
import { CSS } from '../theme';
import { button, circleButton, display, modal, Modal, pill, text } from '../ui';
import { applyCamera, VIEW } from '../view';
import { backgroundTexture } from '../gfx';

const SPEED = 160;
const JUMP = -450;
const COYOTE = 90;
const BUFFER = 110;
const LIFT_SPEED = 110;
const PUSH = 95;
const NET_MS = 50;
const W = COLS * TILE;
const H = ROWS * TILE;
const CX = W / 2;
const CY = TOP + H / 2;

type Role = 'fire' | 'water';
type Keys = Record<'up' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
type Spr = Phaser.Physics.Arcade.Sprite;
type Img = Phaser.Physics.Arcade.Image;
type Body = Phaser.Physics.Arcade.Body;
type Rect = Phaser.GameObjects.Rectangle;
type NetEvent = { t: string; [k: string]: any };

interface Button { group: number; zone: Phaser.Geom.Rectangle; sprite: Rect; pressed: boolean }
interface Lever { group: number; zone: Phaser.Geom.Rectangle; stick: Rect; inside: boolean }
interface Gate { group: number; rect: Rect }
interface Lift { group: number; rect: Rect; baseY: number; topY: number }

export class LevelScene extends Phaser.Scene {
  private levelIndex = 0;
  private online = false;
  private role: Role = 'fire';
  private fire!: Spr;
  private water!: Spr;
  private players: Spr[] = [];
  private boxes: Img[] = [];
  private fireDoor?: Phaser.GameObjects.Image;
  private waterDoor?: Phaser.GameObjects.Image;
  private atDoor: Record<Role, boolean> = { fire: false, water: false };
  private buttons: Button[] = [];
  private levers: Lever[] = [];
  private gates: Gate[] = [];
  private lifts: Lift[] = [];
  private gemById = new Map<string, Phaser.GameObjects.Image>();
  private leverOn: Record<number, boolean> = {};
  private leverCool = 0;
  private wasd!: Keys;
  private arrows!: Keys;
  private mode: 'playing' | 'dead' | 'won' = 'playing';
  private paused = false;
  private pauseModal: Modal | null = null;
  private bg!: Phaser.GameObjects.Image;
  private hudLeft!: { img: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text };
  private hudRight: Phaser.GameObjects.GameObject[] = [];
  private tagW = 0;
  private gems = 0;
  private totalGems = 0;
  private elapsed = 0;
  private hud!: Phaser.GameObjects.Text;
  private coyote: Record<Role, number> = { fire: 0, water: 0 };
  private buffer: Record<Role, number> = { fire: 0, water: 0 };
  private prevUp: Record<Role, boolean> = { fire: false, water: false };
  private trails: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private remoteState: { x: number; y: number; f: boolean; d: number } | null = null;
  private remoteAtDoor = false;
  private netActive: Record<number, boolean> = {};
  private boxTargets: { x: number; y: number }[] = [];
  private activeNow: boolean[] = [false, false, false, false];
  private netTimer = 0;
  private offs: (() => void)[] = [];

  constructor() {
    super('Level');
  }

  init(data: { level?: number; online?: boolean }) {
    this.levelIndex = data.level ?? 0;
    this.online = !!data.online && !!net.role;
    this.role = net.role ?? 'fire';
    this.players = [];
    this.boxes = [];
    this.fireDoor = undefined;
    this.waterDoor = undefined;
    this.atDoor = { fire: false, water: false };
    this.buttons = [];
    this.levers = [];
    this.gates = [];
    this.lifts = [];
    this.gemById = new Map();
    this.leverOn = {};
    this.leverCool = 0;
    this.mode = 'playing';
    this.paused = false;
    this.pauseModal = null;
    this.gems = 0;
    this.totalGems = 0;
    this.elapsed = 0;
    this.coyote = { fire: 0, water: 0 };
    this.buffer = { fire: 0, water: 0 };
    this.prevUp = { fire: false, water: false };
    this.trails = [];
    this.remoteState = null;
    this.remoteAtDoor = false;
    this.netActive = {};
    this.boxTargets = [];
    this.activeNow = [false, false, false, false];
    this.netTimer = 0;
    this.offs = [];
  }

  private get isHost() {
    return !this.online || this.role === 'fire';
  }
  private get remoteRole(): Role {
    return this.role === 'fire' ? 'water' : 'fire';
  }
  private get local(): Spr {
    return this.role === 'fire' ? this.fire : this.water;
  }
  private get remote(): Spr {
    return this.role === 'fire' ? this.water : this.fire;
  }

  create() {
    const level = LEVELS[this.levelIndex];
    applyCamera(this, W / 2, H / 2 - TOP / 2);
    this.cameras.main.setBackgroundColor('#0b1b24');
    this.physics.world.setBounds(0, 0, W, H);
    this.bg = this.add.image(-VIEW.ox, -VIEW.oy - TOP, backgroundTexture(this, VIEW.w, VIEW.h)).setOrigin(0).setDepth(-10).setDisplaySize(VIEW.w, VIEW.h);

    const walls = this.physics.add.staticGroup();
    const lava = this.physics.add.staticGroup();
    const pool = this.physics.add.staticGroup();
    const goo = this.physics.add.staticGroup();
    const redGems = this.physics.add.staticGroup();
    const blueGems = this.physics.add.staticGroup();
    let fireSpawn = { x: 64, y: 64 };
    let waterSpawn = { x: 96, y: 64 };

    level.map.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        const x = c * TILE + TILE / 2;
        const y = r * TILE + TILE / 2;
        const puddleY = (r + 1) * TILE - 6;
        const gem = (grp: Phaser.Physics.Arcade.StaticGroup, key: string) => {
          const s = grp.create(x, y, key) as Spr;
          this.gemById.set(`${r},${c}`, s.setData('id', `${r},${c}`));
          this.totalGems++;
        };
        switch (ch) {
          case '#': walls.create(x, y, 'wall'); break;
          case 'r': lava.create(x, puddleY, 'lava'); break;
          case 'w': pool.create(x, puddleY, 'pool'); break;
          case 'g': goo.create(x, puddleY, 'goo'); break;
          case 'R': gem(redGems, 'gem-red'); break;
          case 'B': gem(blueGems, 'gem-blue'); break;
          case 'D': this.fireDoor = this.add.image(x, (r + 1) * TILE - 20, 'door-fire'); break;
          case 'E': this.waterDoor = this.add.image(x, (r + 1) * TILE - 20, 'door-water'); break;
          case 'F': fireSpawn = { x, y }; break;
          case 'W': waterSpawn = { x, y }; break;
          case 'X': this.addBox(x, y); break;
          default:
            if (ch >= '1' && ch <= '4') this.addButton(x, r, Number(ch));
            else if (ch >= '5' && ch <= '8') this.addLever(x, r, Number(ch) - 4);
            else if (ch >= 'a' && ch <= 'd') this.addGate(x, y, ch.charCodeAt(0) - 96);
        }
      });
    });

    for (const def of level.lifts ?? []) this.addLift(def.col, def.row, def.width, def.rise, def.group);

    this.fire = this.physics.add.sprite(fireSpawn.x, fireSpawn.y, 'fire');
    this.water = this.physics.add.sprite(waterSpawn.x, waterSpawn.y, 'water');
    this.players = [this.fire, this.water];
    for (const p of this.players) {
      p.setCollideWorldBounds(true);
      p.setDepth(5);
    }
    this.trails = [
      this.makeTrail(this.fire, [0xff4a1c, 0xffa02a, 0xffd23f]),
      this.makeTrail(this.water, [0x2fa8ff, 0x9fe0ff, 0xffffff]),
    ];

    if (this.online) {
      const rb = this.remote.body as Body;
      rb.setAllowGravity(false);
      rb.setImmovable(true);
      this.remote.setCollideWorldBounds(false);
      if (!this.isHost) {
        for (const b of this.boxes) {
          b.setImmovable(true);
          (b.body as Body).setAllowGravity(false);
        }
      }
    }

    const movers: (Spr | Img)[] = this.online
      ? [this.local, ...(this.isHost ? this.boxes : [])]
      : [...this.players, ...this.boxes];
    this.physics.add.collider(movers, walls);
    if (this.lifts.length) this.physics.add.collider(movers, this.lifts.map((l) => l.rect));
    if (this.gates.length) this.physics.add.collider(movers, this.gates.map((g) => g.rect));
    if (!this.online) this.physics.add.collider(this.fire, this.water);
    if (this.boxes.length) {
      const pushers = this.online ? [this.local] : this.players;
      if (this.isHost) {
        this.physics.add.collider(pushers, this.boxes, (p, b) => this.pushBox(p as Spr, b as Img));
        this.physics.add.collider(this.boxes, this.boxes);
      } else {
        this.physics.add.collider(this.local, this.boxes);
      }
    }

    const die = () => this.die(true);
    const mine = (r: Role) => !this.online || this.role === r;
    if (mine('fire')) {
      this.physics.add.overlap(this.fire, pool, die);
      this.physics.add.overlap(this.fire, redGems, (_p, g) => this.takeGem(g as Phaser.GameObjects.Image, 0xff3355, true));
    }
    if (mine('water')) {
      this.physics.add.overlap(this.water, lava, die);
      this.physics.add.overlap(this.water, blueGems, (_p, g) => this.takeGem(g as Phaser.GameObjects.Image, 0x33b6ff, true));
    }
    this.physics.add.overlap(this.online ? this.local : this.players, goo, die);

    const kb = this.input.keyboard!;
    this.wasd = kb.addKeys({ up: 'W', left: 'A', right: 'D' }) as Keys;
    const c = kb.createCursorKeys();
    this.arrows = { up: c.up, left: c.left, right: c.right };
    kb.on('keydown-ESC', () => (this.online ? this.toSelect() : this.togglePause()));
    kb.on('keydown-P', () => !this.online && this.togglePause());
    kb.on('keydown-R', () => this.goto(this.levelIndex));
    kb.on('keydown-M', () => sfx.toggleMute());

    const who = this.online ? (this.role === 'fire' ? '  🔥' : '  💧') : '';
    const tag = `Nivel ${this.levelIndex + 1} · ${level.name}${who}`;
    const probe = text(this, 0, -99, tag, { fontSize: '15px' });
    const tagW = probe.width + 34;
    probe.destroy();
    const hy = -TOP / 2;
    this.tagW = tagW;
    this.hudLeft = pill(this, -VIEW.ox + 12, hy, tagW, 30, tag, { size: '15px', depth: 31, originX: 0 });
    this.hud = pill(this, W / 2, hy, 210, 30, '', { size: '16px', depth: 31 }).label;
    this.hudRight = circleButton(this, W + VIEW.ox - 28, hy, this.online ? '☰' : '❚❚', () => (this.online ? this.toSelect() : this.togglePause()), { size: 32, depth: 31 });
    this.scale.on(Phaser.Scale.Events.RESIZE, this.relayout, this);
    this.events.once('shutdown', () => this.scale.off(Phaser.Scale.Events.RESIZE, this.relayout, this));

    showTouch(true);
    this.events.once('shutdown', () => showTouch(false));
    if (this.online) this.setupOnline();
  }

  private relayout() {
    applyCamera(this, W / 2, H / 2 - TOP / 2);
    this.bg.setTexture(backgroundTexture(this, VIEW.w, VIEW.h)).setPosition(-VIEW.ox, -VIEW.oy - TOP).setDisplaySize(VIEW.w, VIEW.h);
    const lx = -VIEW.ox + 12 + this.tagW / 2;
    this.hudLeft.img.setX(lx);
    this.hudLeft.label.setX(lx);
    this.hudRight.forEach((o) => (o as Phaser.GameObjects.Image).setX(W + VIEW.ox - 28));
  }

  private addBox(x: number, y: number) {
    const box = this.physics.add.image(x, y, 'box');
    box.setPushable(false).setDragX(1500).setMaxVelocity(PUSH, 700).setDepth(4);
    this.boxes.push(box);
  }

  private addButton(x: number, r: number, group: number) {
    const bottom = (r + 1) * TILE;
    this.add.rectangle(x, bottom - 1, 32, 4, 0x2a211c).setDepth(1);
    const sprite = this.add.rectangle(x, bottom - 2, 26, 6, GROUP_COLORS[group]).setOrigin(0.5, 1).setDepth(2);
    this.buttons.push({ group, sprite, pressed: false, zone: new Phaser.Geom.Rectangle(x - 14, bottom - 10, 28, 12) });
  }

  private addLever(x: number, r: number, group: number) {
    const bottom = (r + 1) * TILE;
    this.add.rectangle(x, bottom - 3, 22, 6, 0x555555).setDepth(1);
    const stick = this.add.rectangle(x, bottom - 5, 4, 20, GROUP_COLORS[group]).setOrigin(0.5, 1).setAngle(-35).setDepth(2);
    this.levers.push({ group, stick, inside: false, zone: new Phaser.Geom.Rectangle(x - 10, r * TILE + 6, 20, 26) });
  }

  private addGate(x: number, y: number, group: number) {
    const rect = this.add.rectangle(x, y, 28, 32, GROUP_COLORS[group], 0.95).setStrokeStyle(2, 0x000000, 0.4).setDepth(3);
    this.physics.add.existing(rect, true);
    this.gates.push({ group, rect });
  }

  private addLift(col: number, row: number, width: number, rise: number, group: number) {
    const x = col * TILE + (width * TILE) / 2;
    const y = row * TILE + 8;
    const rect = this.add.rectangle(x, y, width * TILE, 16, GROUP_COLORS[group]).setStrokeStyle(2, 0x000000, 0.4).setDepth(3);
    this.physics.add.existing(rect);
    const body = rect.body as Body;
    body.setImmovable(true);
    body.setAllowGravity(false);
    this.lifts.push({ group, rect, baseY: y, topY: y - rise * TILE });
  }

  private makeTrail(p: Spr, tint: number[]) {
    return this.add
      .particles(0, 0, 'spark', {
        follow: p,
        followOffset: { x: 0, y: 8 },
        frequency: 70,
        lifespan: 450,
        speedY: { min: -50, max: -15 },
        speedX: { min: -10, max: 10 },
        scale: { start: 1, end: 0 },
        alpha: { start: 0.8, end: 0 },
        tint,
        blendMode: 'ADD',
      })
      .setDepth(4);
  }

  update(_t: number, dt: number) {
    if (this.mode !== 'playing' || this.paused) return;
    this.elapsed += dt;

    const on = touch.enabled;
    const readKeys = (k: Keys, role: Role) => ({
      l: k.left.isDown || (on && touch.role === role && touch.left),
      r: k.right.isDown || (on && touch.role === role && touch.right),
      u: k.up.isDown || (on && touch.role === role && touch.up),
    });
    if (this.online) {
      const a = readKeys(this.wasd, this.role);
      const b = readKeys(this.arrows, this.role);
      this.drive(this.role, this.local, a.l || b.l, a.r || b.r, a.u || b.u, dt);
      this.netStep(dt);
    } else {
      const f = readKeys(this.wasd, 'fire');
      const w = readKeys(this.arrows, 'water');
      this.drive('fire', this.fire, f.l, f.r, f.u, dt);
      this.drive('water', this.water, w.l, w.r, w.u, dt);
    }

    this.updateMechanics(dt);
    this.checkDoors();

    const secs = Math.floor(this.elapsed / 1000);
    const mm = String(Math.floor(secs / 60)).padStart(2, '0');
    const ss = String(secs % 60).padStart(2, '0');
    this.hud.setText(`${mm}:${ss}    ◆ ${this.gems}/${this.totalGems}`);
  }

  private drive(role: Role, p: Spr, left: boolean, right: boolean, up: boolean, dt: number) {
    const body = p.body as Body;
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    p.setVelocityX(dir * SPEED);
    p.setData('dir', dir);
    if (dir) p.setFlipX(dir < 0);

    const grounded = body.blocked.down || body.touching.down;
    this.coyote[role] = grounded ? COYOTE : Math.max(0, this.coyote[role] - dt);
    if (up && !this.prevUp[role]) this.buffer[role] = BUFFER;
    else this.buffer[role] = Math.max(0, this.buffer[role] - dt);
    this.prevUp[role] = up;

    if (this.buffer[role] > 0 && this.coyote[role] > 0) {
      p.setVelocityY(JUMP);
      this.buffer[role] = 0;
      this.coyote[role] = 0;
      sfx.jump();
    }
    if (!up && body.velocity.y < -200) p.setVelocityY(-200);
  }

  private pushBox(p: Spr, b: Img) {
    const dir = p.getData('dir') as number;
    const pb = p.body as Body;
    if (dir > 0 && pb.touching.right) b.setVelocityX(PUSH);
    else if (dir < 0 && pb.touching.left) b.setVelocityX(-PUSH);
  }

  private ghostPush() {
    const d = this.remote.getData('dir') as number;
    if (!d) return;
    const g = this.remote.getBounds();
    for (const b of this.boxes) {
      const bb = b.getBounds();
      if (g.bottom <= bb.top + 4 || g.top >= bb.bottom - 4) continue;
      if (d > 0 && g.right <= bb.left + 6 && g.right >= bb.left - 6) b.setVelocityX(PUSH);
      if (d < 0 && g.left >= bb.right - 6 && g.left <= bb.right + 6) b.setVelocityX(-PUSH);
    }
  }

  private updateMechanics(dt: number) {
    const bounds = [...this.players, ...this.boxes].map((o) => o.getBounds());
    const pressed: Record<number, number> = {};
    const guest = this.online && !this.isHost;

    for (const b of this.buttons) {
      const now = bounds.some((r) => Phaser.Geom.Rectangle.Overlaps(r, b.zone));
      if (now !== b.pressed) {
        b.pressed = now;
        b.sprite.setScale(1, now ? 0.4 : 1);
        sfx.click();
      }
      if (now) pressed[b.group] = (pressed[b.group] ?? 0) + 1;
    }

    this.leverCool -= dt;
    for (const lv of this.levers) {
      if (guest) {
        lv.stick.setAngle(this.leverOn[lv.group] ? 35 : -35);
        continue;
      }
      const inside = this.players.some((p) => Phaser.Geom.Rectangle.Overlaps(p.getBounds(), lv.zone));
      if (inside && !lv.inside && this.leverCool <= 0) {
        const next = !this.leverOn[lv.group];
        this.leverOn[lv.group] = next;
        this.levers.filter((l) => l.group === lv.group).forEach((l) => l.stick.setAngle(next ? 35 : -35));
        this.leverCool = 500;
        sfx.lever();
      }
      lv.inside = inside;
    }

    const active = (g: number) => (guest ? !!this.netActive[g] : (pressed[g] ?? 0) > 0 || !!this.leverOn[g]);
    this.activeNow = [1, 2, 3, 4].map(active);

    for (const g of this.gates) {
      const open = active(g.group);
      (g.rect.body as Phaser.Physics.Arcade.StaticBody).enable = !open;
      g.rect.setAlpha(open ? 0.15 : 0.95);
    }

    for (const l of this.lifts) {
      const body = l.rect.body as Body;
      const target = active(l.group) ? l.topY : l.baseY;
      const dy = target - l.rect.y;
      if (Math.abs(dy) <= 3) {
        if (l.rect.y !== target) body.reset(l.rect.x, target);
      } else {
        body.setVelocityY(Math.sign(dy) * LIFT_SPEED);
      }
    }

    if (this.online) {
      if (this.isHost) this.ghostPush();
      else this.boxes.forEach((b, i) => {
        const t = this.boxTargets[i];
        if (t) b.setPosition(b.x + (t.x - b.x) * 0.4, b.y + (t.y - b.y) * 0.4);
      });
    }
  }

  private checkDoors() {
    const overlap = (p: Spr, d?: Phaser.GameObjects.Image) => !!d && Phaser.Geom.Rectangle.Overlaps(p.getBounds(), d.getBounds());
    const doorOf = (r: Role) => (r === 'fire' ? this.fireDoor : this.waterDoor);

    if (!this.online) {
      const atF = overlap(this.fire, this.fireDoor);
      const atW = overlap(this.water, this.waterDoor);
      if ((atF && !this.atDoor.fire) || (atW && !this.atDoor.water)) sfx.door();
      this.atDoor = { fire: atF, water: atW };
      this.paintDoors();
      if (atF && atW) this.win();
      return;
    }

    const mineAt = overlap(this.local, doorOf(this.role));
    if (mineAt !== this.atDoor[this.role]) {
      this.atDoor[this.role] = mineAt;
      if (mineAt) sfx.door();
      net.send('event', { t: 'door', at: mineAt });
    }
    this.atDoor[this.remoteRole] = this.remoteAtDoor;
    this.paintDoors();
    if (this.isHost && this.atDoor.fire && this.atDoor.water) {
      net.send('event', { t: 'win', ms: this.elapsed });
      this.win(this.elapsed);
    }
  }

  private paintDoors() {
    this.fireDoor?.setTint(this.atDoor.fire ? 0xffffff : 0x999999);
    this.waterDoor?.setTint(this.atDoor.water ? 0xffffff : 0x999999);
  }

  private takeGem(g: Phaser.GameObjects.Image, color: number, mine: boolean) {
    if (!g.active) return;
    const id = g.getData('id') as string;
    this.gemById.delete(id);
    const burst = this.add
      .particles(g.x, g.y, 'spark', { speed: { min: 60, max: 160 }, lifespan: 450, scale: { start: 1.2, end: 0 }, tint: color, emitting: false })
      .setDepth(6);
    burst.explode(12);
    this.time.delayedCall(700, () => burst.destroy());
    g.destroy();
    this.gems++;
    sfx.gem();
    if (this.online && mine) net.send('event', { t: 'gem', id });
  }

  private setupOnline() {
    touch.role = this.role;
    const roleBtn = document.getElementById('role');
    if (roleBtn) roleBtn.style.display = 'none';

    this.offs.push(
      net.on('state', (s) => (this.remoteState = s)),
      net.on('event', (e: NetEvent) => this.onNetEvent(e)),
      net.on('peer-left', () => this.onPeerLeft()),
      net.on('disconnected', () => this.onPeerLeft()),
    );
    this.events.once('shutdown', () => {
      this.offs.forEach((o) => o());
      this.offs = [];
      if (roleBtn) roleBtn.style.display = '';
    });
  }

  private netStep(dt: number) {
    const g = this.remote;
    const rs = this.remoteState;
    if (rs) {
      const dx = rs.x - g.x;
      const dy = rs.y - g.y;
      if (Math.abs(dx) > 120 || Math.abs(dy) > 120) (g.body as Body).reset(rs.x, rs.y);
      else g.setVelocity(dx * 12, dy * 12);
      g.setFlipX(rs.f);
      g.setData('dir', rs.d);
    }

    this.netTimer += dt;
    if (this.netTimer < NET_MS) return;
    this.netTimer = 0;
    const me = this.local;
    net.send('state', { x: Math.round(me.x), y: Math.round(me.y), f: me.flipX, d: me.getData('dir') ?? 0 });
    if (this.isHost) {
      net.send('event', {
        t: 'w',
        a: this.activeNow,
        l: [1, 2, 3, 4].map((g2) => !!this.leverOn[g2]),
        b: this.boxes.map((b) => ({ x: Math.round(b.x), y: Math.round(b.y) })),
      });
    }
  }

  private onNetEvent(e: NetEvent) {
    switch (e.t) {
      case 'w':
        if (this.isHost) return;
        [1, 2, 3, 4].forEach((g, i) => {
          this.netActive[g] = !!e.a[i];
          this.leverOn[g] = !!e.l[i];
        });
        this.boxTargets = e.b;
        break;
      case 'door':
        this.remoteAtDoor = !!e.at;
        break;
      case 'gem': {
        const g = this.gemById.get(e.id);
        if (g) this.takeGem(g, this.remoteRole === 'fire' ? 0xff3355 : 0x33b6ff, false);
        break;
      }
      case 'dead':
        this.die(false);
        break;
      case 'win':
        if (!this.isHost) this.win(e.ms);
        break;
      case 'goto':
        this.scene.restart({ level: e.level, online: true });
        break;
      case 'select':
        this.scene.start('LevelSelect', { online: true });
        break;
    }
  }

  private onPeerLeft() {
    if (this.mode !== 'playing') return;
    this.mode = 'dead';
    this.physics.pause();
    const m = modal(this, { w: 520, h: 270, title: 'Tu pareja salió', subtitle: 'Se desconectó de la partida', depth: 50, closable: false });
    m.track(...button(this, m.cx, m.cy + 62, 'Volver a la mesa', () => {
      net.reopenLobby = true;
      this.scene.start('Menu');
    }, { w: 300, h: 56, depth: 53, fixed: true }));
  }

  private goto(level: number) {
    if (this.online) net.send('event', { t: 'goto', level });
    this.scene.restart({ level, online: this.online });
  }

  private toSelect() {
    if (this.online) net.send('event', { t: 'select' });
    this.scene.start('LevelSelect', { online: this.online });
  }

  private die(mine: boolean) {
    if (this.mode !== 'playing') return;
    this.mode = 'dead';
    if (this.online && mine) net.send('event', { t: 'dead' });
    this.physics.pause();
    this.trails.forEach((t) => t.stop());
    this.fire.setTint(0x555555);
    this.water.setTint(0x555555);
    this.cameras.main.shake(220, 0.012);
    sfx.die();
    const banner = pill(this, W / 2, H / 2 - TOP / 2, 460, 72, 'Inténtenlo otra vez', { size: '28px', fill: 'rgba(255,77,109,0.94)', edge: 'rgba(255,255,255,0.5)', depth: 40, fixed: true });
    [banner.img, banner.label].forEach((o) => {
      o.setScale(0.6).setAlpha(0);
      this.tweens.add({ targets: o, scale: 1, alpha: 1, duration: 260, ease: 'Back.out' });
    });
    this.time.delayedCall(900, () => this.scene.restart({ level: this.levelIndex, online: this.online }));
  }

  private win(ms = this.elapsed) {
    if (this.mode !== 'playing') return;
    this.mode = 'won';
    this.elapsed = ms;
    this.physics.pause();
    this.trails.forEach((t) => t.stop());
    sfx.win();

    const level = LEVELS[this.levelIndex];
    const secs = Math.floor(ms / 1000);
    const allGems = this.gems >= this.totalGems;
    const stars = 1 + (allGems ? 1 : 0) + (secs <= level.par ? 1 : 0);
    record(this.levelIndex, ms, this.gems, stars);
    if (this.online) void api('/progress', 'POST', { level: this.levelIndex, timeMs: ms, gems: this.gems, stars }).catch(() => undefined);

    const last = this.levelIndex + 1 >= LEVELS.length;
    const next = () => (last ? this.toSelect() : this.goto(this.levelIndex + 1));

    const m = modal(this, { w: 700, h: 470, title: '¡Nivel completado!', subtitle: `Nivel ${this.levelIndex + 1} · ${level.name}`, depth: 40, closable: false });
    const d = m.depth + 3;

    for (let i = 0; i < 3; i++) {
      const s = text(this, m.cx + (i - 1) * 96, m.cy - 92, '★', { fontFamily: 'sans-serif', fontStyle: '700', fontSize: '84px', color: i < stars ? CSS.gold : '#2d5668' }).setOrigin(0.5).setDepth(d);
      s.setScale(0).setAngle(-20);
      this.tweens.add({ targets: s, scale: 1, angle: 0, duration: 420, delay: 260 + i * 240, ease: 'Back.out' });
      m.track(s);
    }

    const chips: [string, string][] = [['Tiempo', `${secs} s`], ['Meta', `${level.par} s`], ['Gemas', `${this.gems}/${this.totalGems}`]];
    chips.forEach(([k, v], i) => {
      const p = pill(this, m.cx + (i - 1) * 200, m.cy - 6, 184, 40, `${k}  ${v}`, { size: '17px', depth: d, fixed: true });
      m.track(p.img, p.label);
    });

    const msg = display(this, m.cx, m.cy + 62, MESSAGES[this.levelIndex % MESSAGES.length], '22px', { color: CSS.text, align: 'center', wordWrap: { width: 560 }, lineSpacing: 6, fontFamily: 'Nunito, sans-serif', fontStyle: '700' }).setOrigin(0.5).setDepth(d);
    m.track(msg);

    const by = m.cy + 168;
    m.track(
      ...button(this, m.cx - 214, by, 'Reintentar', () => this.goto(this.levelIndex), { w: 190, h: 56, variant: 'ghost', size: '19px', depth: d, fixed: true }),
      ...button(this, m.cx, by, 'Niveles', () => this.toSelect(), { w: 190, h: 56, variant: 'lagoon', size: '19px', depth: d, fixed: true }),
      ...button(this, m.cx + 214, by, last ? 'Terminar' : 'Siguiente', next, { w: 190, h: 56, size: '19px', depth: d, fixed: true }),
    );

    this.time.delayedCall(500, () => this.input.keyboard!.once('keydown-ENTER', next));
  }

  private togglePause() {
    if (this.mode !== 'playing') return;
    if (this.pauseModal) {
      this.pauseModal.close();
      return;
    }
    this.paused = true;
    this.physics.pause();
    const m = modal(this, {
      w: 460,
      h: 440,
      title: 'Pausa',
      subtitle: 'Respiren un momento',
      depth: 40,
      onClose: () => {
        this.pauseModal = null;
        this.paused = false;
        this.physics.resume();
      },
    });
    this.pauseModal = m;
    const d = m.depth + 3;
    const o = { w: 340, h: 56, size: '20px', depth: d, fixed: true };
    const sound = button(this, m.cx, m.cy + 150, sfx.isMuted() ? 'Sonido apagado' : 'Sonido encendido', () => {
      sfx.toggleMute();
      (sound[1] as Phaser.GameObjects.Text).setText(sfx.isMuted() ? 'Sonido apagado' : 'Sonido encendido');
    }, { ...o, variant: 'ghost', h: 50, size: '17px' });
    m.track(
      ...button(this, m.cx, m.cy - 50, 'Continuar', () => m.close(), o),
      ...button(this, m.cx, m.cy + 20, 'Reiniciar', () => this.goto(this.levelIndex), { ...o, variant: 'lagoon' }),
      ...button(this, m.cx, m.cy + 90, 'Niveles', () => this.toSelect(), { ...o, variant: 'ghost', h: 50, size: '17px' }),
      ...sound,
    );
  }
}
