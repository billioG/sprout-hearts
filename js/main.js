import { LEVELS } from './levels.js';
import { createRoom, joinRoom, saveAnswer, subscribeToRoom, updatePosition } from './supabase.js';
import { sound } from './sound.js';

const state = {
  playerId: 'p' + Math.random().toString(36).substr(2, 9),
  playerName: 'Jugador',
  avatar: 'male-blue',
  room: null,
  isHost: false,
  currentLevel: 1,
  answers: {},
  partnerOnline: false
};

const touch = { up: false, down: false, left: false, right: false, action: false };
const MAP_W = 50, MAP_H = 40, TILE = 32;

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 960,
  height: 640,
  backgroundColor: '#5daa3a',
  pixelArt: true,
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scene: { preload, create, update },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 }
};

// avatar id -> { sheet, prefix, frameW }
const AVATARS = {
  'male-blue':   { sheet: 'char-male',   prefix: 'male',   tint: null },
  'male-pink':   { sheet: 'char-male',   prefix: 'male',   tint: 0xffa0c0 },
  'male-green':  { sheet: 'char-green',  prefix: 'green',  tint: null },
  'male-gold':   { sheet: 'char-gold',   prefix: 'gold',   tint: null },
  'female-pink': { sheet: 'char-female', prefix: 'female', tint: null },
  'female-blue': { sheet: 'char-female', prefix: 'female', tint: 0x90c0ff },
  'female-green':{ sheet: 'char-female', prefix: 'female', tint: 0x90e090 },
  'sprout':      { sheet: 'char-sprout', prefix: 'sprout', tint: null }
};

let game, player, partner, cursors, wasd, hearts = [];
let walkTimer = 0, posSyncTimer = 0;
let nearbyHeart = null, facing = 'down';
let partnerLabel = null, zoneLabel = null, currentZoneName = '';
let minimapGfx = null, helpText = null;

const ZONES = [
  { name: 'Pradera del Norte', x1: 2, y1: 2, x2: 48, y2: 10 },
  { name: 'Cruce Central', x1: 20, y1: 10, x2: 30, y2: 16 },
  { name: 'Lago del Corazón', x1: 18, y1: 14, x2: 32, y2: 24 },
  { name: 'Huerto Oeste', x1: 2, y1: 12, x2: 12, y2: 20 },
  { name: 'Sendero del Sur', x1: 2, y1: 22, x2: 48, y2: 28 },
  { name: 'Estanque del Este', x1: 36, y1: 2, x2: 48, y2: 14 },
  { name: 'Jardín del Amor', x1: 36, y1: 26, x2: 48, y2: 36 },
  { name: 'Colinas del Ocaso', x1: 2, y1: 30, x2: 18, y2: 38 }
];

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}
function hideAllScreens() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('hud').classList.remove('hidden');
}
function isTouchDevice() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}
function getZoneAt(tx, ty) {
  for (const z of ZONES) {
    if (tx >= z.x1 && tx <= z.x2 && ty >= z.y1 && ty <= z.y2) return z;
  }
  return null;
}
function isWater(x, y) {
  const lake = (x - 25) ** 2 / 36 + (y - 18) ** 2 / 20 < 1;
  const river = (x > 22 && x < 28 && y > 18 && y < 38);
  const pond1 = (x - 8) ** 2 / 12 + (y - 32) ** 2 / 8 < 1;
  const pond2 = (x - 42) ** 2 / 10 + (y - 8) ** 2 / 8 < 1;
  return lake || river || pond1 || pond2;
}
function isPath(x, y) {
  if (y === 12 && x >= 2 && x <= 47) return true;
  if (y === 25 && x >= 2 && x <= 47) return true;
  if (x === 12 && y >= 2 && y <= 37) return true;
  if (x === 25 && y >= 2 && y <= 37) return true;
  if (x === 38 && y >= 2 && y <= 37) return true;
  if (y === 18 && x >= 10 && x <= 20) return true;
  if (y === 18 && x >= 30 && x <= 40) return true;
  return false;
}
function isHill(x, y) {
  if (y <= 1 || y >= MAP_H - 2) return true;
  if (x <= 0 || x >= MAP_W - 1) return true;
  const hills = [[6,6],[44,5],[5,35],[45,34],[30,3],[18,37],[15,20],[35,28]];
  return hills.some(([hx, hy]) => Math.abs(x - hx) <= 1 && Math.abs(y - hy) <= 1);
}
function isBlocked(x, y) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return true;
  return isWater(x, y) || isHill(x, y);
}

function preload() {
  // Tiles as spritesheets (16x16)
  this.load.spritesheet('grass', 'assets/tiles/Grass.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('water', 'assets/tiles/Water.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('paths', 'assets/tiles/Paths.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('hills', 'assets/tiles/Hills.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('plants', 'assets/tiles/Basic_Plants.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('things', 'assets/tiles/Grass_Things.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('dirt', 'assets/tiles/Tilled_Dirt.png', { frameWidth: 16, frameHeight: 16 });

  // Characters
  this.load.spritesheet('char-male', 'assets/characters/lpc_male_walk.png', { frameWidth: 48, frameHeight: 64 });
  this.load.spritesheet('char-green', 'assets/characters/lpc_green_walk.png', { frameWidth: 48, frameHeight: 64 });
  this.load.spritesheet('char-gold', 'assets/characters/lpc_gold_walk.png', { frameWidth: 48, frameHeight: 64 });
  this.load.spritesheet('char-female', 'assets/characters/lpc_female_walk3.png', { frameWidth: 64, frameHeight: 64 });
  this.load.spritesheet('char-sprout', 'assets/characters/Basic_Character.png', { frameWidth: 48, frameHeight: 48 });

  const g = this.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xff6b9d, 1);
  g.fillCircle(6, 5, 5);
  g.fillCircle(14, 5, 5);
  g.fillTriangle(2, 7, 18, 7, 10, 18);
  g.generateTexture('heart', 20, 20);
  g.destroy();
}

function createLpcAnims(scene, sheet, prefix, is64) {
  // 3 frames x 4 dirs: rows up, left, down, right
  const mk = (name, start, end) => {
    scene.anims.create({
      key: prefix + '-' + name,
      frames: scene.anims.generateFrameNumbers(sheet, { start, end }),
      frameRate: name.startsWith('idle') ? 1 : 8,
      repeat: name.startsWith('idle') ? 0 : -1
    });
  };
  mk('walk-up', 0, 2);
  mk('walk-left', 3, 5);
  mk('walk-down', 6, 8);
  mk('walk-right', 9, 11);
  mk('idle-up', 1, 1);
  mk('idle-left', 4, 4);
  mk('idle-down', 7, 7);
  mk('idle-right', 10, 10);
}

function create() {
  // Terrain with correct 16x16 frames
  const grassFrames = [0, 1, 2, 11, 12, 13]; // variety from sheet
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const px = x * TILE + TILE / 2;
      const py = y * TILE + TILE / 2;
      if (isWater(x, y)) {
        const img = this.add.image(px, py, 'water', 0);
        img.setDisplaySize(TILE, TILE);
      } else if (isPath(x, y)) {
        const img = this.add.image(px, py, 'paths', 0);
        img.setDisplaySize(TILE, TILE);
      } else if (isHill(x, y)) {
        const g = this.add.image(px, py, 'grass', grassFrames[(x + y) % grassFrames.length]);
        g.setDisplaySize(TILE, TILE);
        const h = this.add.image(px, py - 2, 'hills', 0);
        h.setDisplaySize(TILE, TILE);
        h.setDepth(2);
      } else {
        const f = grassFrames[(x * 3 + y * 7) % grassFrames.length];
        const img = this.add.image(px, py, 'grass', f);
        img.setDisplaySize(TILE, TILE);
      }
    }
  }

  // Dirt patches
  for (let y = 14; y <= 16; y++)
    for (let x = 4; x <= 9; x++)
      if (!isWater(x, y)) this.add.image(x * TILE + 16, y * TILE + 16, 'dirt', 0).setDisplaySize(TILE, TILE);
  for (let y = 28; y <= 30; y++)
    for (let x = 40; x <= 45; x++)
      if (!isWater(x, y)) this.add.image(x * TILE + 16, y * TILE + 16, 'dirt', 0).setDisplaySize(TILE, TILE);

  // Plants / bushes (not stretched sheets)
  for (let i = 0; i < 90; i++) {
    const dx = 2 + Math.floor(Math.random() * (MAP_W - 4));
    const dy = 2 + Math.floor(Math.random() * (MAP_H - 4));
    if (isWater(dx, dy) || isPath(dx, dy) || isHill(dx, dy)) continue;
    const key = Math.random() > 0.45 ? 'plants' : 'things';
    const frame = Math.floor(Math.random() * 4);
    this.add.image(dx * TILE + 16, dy * TILE + 16, key, frame)
      .setDisplaySize(TILE * 0.9, TILE * 0.9).setDepth(1);
  }

  // Anims
  createLpcAnims(this, 'char-male', 'male');
  createLpcAnims(this, 'char-green', 'green');
  createLpcAnims(this, 'char-gold', 'gold');
  createLpcAnims(this, 'char-female', 'female');
  this.anims.create({ key: 'sprout-walk-down', frames: this.anims.generateFrameNumbers('char-sprout', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
  this.anims.create({ key: 'sprout-walk-up', frames: this.anims.generateFrameNumbers('char-sprout', { start: 4, end: 7 }), frameRate: 8, repeat: -1 });
  this.anims.create({ key: 'sprout-walk-left', frames: this.anims.generateFrameNumbers('char-sprout', { start: 8, end: 11 }), frameRate: 8, repeat: -1 });
  this.anims.create({ key: 'sprout-walk-right', frames: this.anims.generateFrameNumbers('char-sprout', { start: 12, end: 15 }), frameRate: 8, repeat: -1 });
  this.anims.create({ key: 'sprout-idle-down', frames: [{ key: 'char-sprout', frame: 0 }] });
  this.anims.create({ key: 'sprout-idle-up', frames: [{ key: 'char-sprout', frame: 4 }] });
  this.anims.create({ key: 'sprout-idle-left', frames: [{ key: 'char-sprout', frame: 8 }] });
  this.anims.create({ key: 'sprout-idle-right', frames: [{ key: 'char-sprout', frame: 12 }] });

  const av = AVATARS[state.avatar] || AVATARS['male-blue'];
  const startX = 25 * TILE + 16, startY = 12 * TILE + 16;
  player = this.physics.add.sprite(startX, startY, av.sheet, 7);
  player.setScale(av.sheet === 'char-sprout' ? 1.8 : (av.sheet === 'char-female' ? 1.35 : 1.5));
  if (av.tint) player.setTint(av.tint);
  player.setCollideWorldBounds(true);
  player.body.setSize(16, 20);
  player.animPrefix = av.prefix;
  player.anims.play(av.prefix + '-idle-down');
  player.setDepth(10);

  partner = this.physics.add.sprite(startX + 48, startY, 'char-female', 7);
  partner.setScale(1.35).setDepth(9).setVisible(false);
  partner.animPrefix = 'female';
  partnerLabel = this.add.text(0, 0, '', {
    fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#ff8fab',
    stroke: '#1a1c2c', strokeThickness: 2
  }).setOrigin(0.5).setDepth(11).setVisible(false);

  cursors = this.input.keyboard.createCursorKeys();
  wasd = this.input.keyboard.addKeys({
    up: Phaser.Input.Keyboard.KeyCodes.W,
    down: Phaser.Input.Keyboard.KeyCodes.S,
    left: Phaser.Input.Keyboard.KeyCodes.A,
    right: Phaser.Input.Keyboard.KeyCodes.D,
    space: Phaser.Input.Keyboard.KeyCodes.SPACE
  });

  hearts = [];
  LEVELS.forEach(level => {
    const hx = Math.min(level.x, MAP_W - 2) * TILE + 16;
    const hy = Math.min(level.y, MAP_H - 2) * TILE + 16;
    const hs = this.physics.add.staticImage(hx, hy, 'heart').setScale(1.8).setDepth(5);
    hs.levelData = level;
    hearts.push(hs);
    this.add.text(hx, hy - 20, String(level.id), {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#fff',
      stroke: '#1a1c2c', strokeThickness: 3
    }).setOrigin(0.5).setDepth(6);
    this.tweens.add({ targets: hs, scale: 2.15, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  });

  ZONES.forEach(z => {
    const cx = ((z.x1 + z.x2) / 2) * TILE + 16;
    const cy = ((z.y1 + z.y2) / 2) * TILE + 16;
    this.add.text(cx, cy, z.name, {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#fff',
      stroke: '#1a1c2c', strokeThickness: 3, align: 'center'
    }).setOrigin(0.5).setDepth(3).setAlpha(0.8);
  });

  this.cameras.main.startFollow(player, true, 0.08, 0.08);
  this.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
  this.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);

  zoneLabel = this.add.text(12, 36, '', {
    fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#ffd166',
    backgroundColor: '#1a1c2ccc', padding: { x: 8, y: 5 }
  }).setScrollFactor(0).setDepth(25);

  helpText = this.add.text(12, 12, 'Camina a un ♥ · Espacio o botón ♥ para responder', {
    fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#fff',
    backgroundColor: '#1a1c2c99', padding: { x: 6, y: 4 }
  }).setScrollFactor(0).setDepth(20);

  // Minimap
  const mmW = 120, mmH = 96, mmPad = 10;
  const mmX = config.width - mmW - mmPad, mmY = mmPad;
  this.add.rectangle(mmX + mmW / 2, mmY + mmH / 2, mmW + 6, mmH + 6, 0x1a1c2c, 0.85)
    .setScrollFactor(0).setDepth(30).setStrokeStyle(2, 0x4a4a6a);
  const sx = mmW / MAP_W, sy = mmH / MAP_H;
  const g = this.make.graphics({ x: 0, y: 0, add: false });
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      let c = 0x5daa3a;
      if (isWater(tx, ty)) c = 0x4a9edb;
      else if (isHill(tx, ty)) c = 0x8b7355;
      else if (isPath(tx, ty)) c = 0xc4a574;
      g.fillStyle(c, 1);
      g.fillRect(tx * sx, ty * sy, Math.ceil(sx), Math.ceil(sy));
    }
  }
  g.generateTexture('mm-terrain', mmW, mmH);
  g.destroy();
  this.add.image(mmX + mmW / 2, mmY + mmH / 2, 'mm-terrain').setScrollFactor(0).setDepth(30);
  minimapGfx = this.add.graphics().setScrollFactor(0).setDepth(32);
  this.minimapMeta = { x: mmX, y: mmY, sx, sy };
  this.minimapHearts = LEVELS.map(l => ({ x: l.x, y: l.y }));

  if (state.room?.player2_id) showPartnerFromRoom(state.room);
}

function refreshMinimap(scene) {
  if (!minimapGfx || !scene.minimapMeta) return;
  const { x, y, sx, sy } = scene.minimapMeta;
  minimapGfx.clear();
  minimapGfx.fillStyle(0xff6b9d, 1);
  (scene.minimapHearts || []).forEach(hh => {
    minimapGfx.fillCircle(x + hh.x * sx + sx / 2, y + hh.y * sy + sy / 2, 1.5);
  });
  if (partner?.visible) {
    minimapGfx.fillStyle(0xff8fab, 1);
    minimapGfx.fillCircle(x + (partner.x / TILE) * sx, y + (partner.y / TILE) * sy, 2.5);
  }
  minimapGfx.fillStyle(0xffffff, 1);
  minimapGfx.fillCircle(x + (player.x / TILE) * sx, y + (player.y / TILE) * sy, 3);
  minimapGfx.lineStyle(1, 0x1a1c2c, 1);
  minimapGfx.strokeCircle(x + (player.x / TILE) * sx, y + (player.y / TILE) * sy, 3);
}

function showPartnerFromRoom(room) {
  if (!partner) return;
  const otherAv = state.isHost ? (room.player2_avatar || 'female-pink') : (room.player1_avatar || 'male-blue');
  const otherName = state.isHost ? (room.player2_name || 'Pareja') : (room.player1_name || 'Pareja');
  const ox = state.isHost ? (room.player2_x ?? 26) : (room.player1_x ?? 24);
  const oy = state.isHost ? (room.player2_y ?? 12) : (room.player1_y ?? 12);
  const av = AVATARS[otherAv] || AVATARS['female-pink'];
  partner.setTexture(av.sheet);
  partner.animPrefix = av.prefix;
  partner.setScale(av.sheet === 'char-sprout' ? 1.8 : (av.sheet === 'char-female' ? 1.35 : 1.5));
  if (av.tint) partner.setTint(av.tint); else partner.clearTint();
  partner.setPosition(ox * TILE + 16, oy * TILE + 16);
  partner.setVisible(true);
  partner.anims.play(av.prefix + '-idle-down');
  partnerLabel.setText(otherName).setPosition(partner.x, partner.y - 36).setVisible(true);
  state.partnerOnline = true;
}

function update(time) {
  if (!player?.active) return;
  const speed = 160;
  let vx = 0, vy = 0;
  const prefix = player.animPrefix || 'male';

  if (cursors.left.isDown || wasd.left.isDown || touch.left) vx = -speed;
  else if (cursors.right.isDown || wasd.right.isDown || touch.right) vx = speed;
  if (cursors.up.isDown || wasd.up.isDown || touch.up) vy = -speed;
  else if (cursors.down.isDown || wasd.down.isDown || touch.down) vy = speed;

  const curTX = Math.floor(player.x / TILE), curTY = Math.floor(player.y / TILE);
  const nextTX = Math.floor((player.x + vx * 0.02) / TILE);
  const nextTY = Math.floor((player.y + vy * 0.02) / TILE);
  if (isBlocked(nextTX, curTY)) vx = 0;
  if (isBlocked(curTX, nextTY)) vy = 0;
  if (vx && vy && isBlocked(nextTX, nextTY)) { vx = 0; vy = 0; }

  player.setVelocity(vx, vy);

  // Direction: priority last pressed axis for diagonal
  if (vx < 0) { facing = 'left'; player.anims.play(prefix + '-walk-left', true); }
  else if (vx > 0) { facing = 'right'; player.anims.play(prefix + '-walk-right', true); }
  else if (vy < 0) { facing = 'up'; player.anims.play(prefix + '-walk-up', true); }
  else if (vy > 0) { facing = 'down'; player.anims.play(prefix + '-walk-down', true); }
  else {
    const idleKey = prefix + '-idle-' + facing;
    if (player.anims.currentAnim?.key !== idleKey) player.anims.play(idleKey, true);
  }

  if ((vx || vy) && time > walkTimer) { sound.play('walk'); walkTimer = time + 240; }

  if (state.room && time > posSyncTimer) {
    posSyncTimer = time + 400;
    updatePosition(state.room.id, state.isHost, player.x / TILE, player.y / TILE);
  }

  if (partner?.visible && partnerLabel) partnerLabel.setPosition(partner.x, partner.y - 36);

  const zone = getZoneAt(Math.floor(player.x / TILE), Math.floor(player.y / TILE));
  const zName = zone ? zone.name : 'Tierras Abiertas';
  if (zName !== currentZoneName && zoneLabel) {
    currentZoneName = zName;
    zoneLabel.setText('📍 ' + zName);
  }

  refreshMinimap(this);

  nearbyHeart = null;
  for (const h of hearts) {
    if (Phaser.Math.Distance.Between(player.x, player.y, h.x, h.y) < 44) {
      nearbyHeart = h.levelData;
      break;
    }
  }

  if (Phaser.Input.Keyboard.JustDown(wasd.space) || touch.action) {
    touch.action = false;
    if (nearbyHeart) openQuestion(nearbyHeart);
  }
}

let currentHeart = null, cooldown = false;

function openQuestion(level) {
  if (cooldown) return;
  cooldown = true;
  setTimeout(() => { cooldown = false; }, 700);
  currentHeart = level;
  sound.play('heart');
  document.getElementById('q-title').textContent = 'Nivel ' + level.id + ': ' + level.title;
  document.getElementById('q-book').textContent = level.book;
  document.getElementById('q-text').textContent = level.question;
  document.getElementById('q-answer').value = '';
  document.getElementById('partner-answer').classList.add('hidden');
  document.getElementById('question-panel').classList.remove('hidden');
  document.body.classList.add('question-open');
  // Scroll panel into view on mobile
  document.getElementById('question-panel').scrollIntoView({ behavior: 'smooth', block: 'end' });
  const partnerId = getPartnerId();
  if (partnerId && state.answers[level.id]?.[partnerId]) {
    document.getElementById('partner-answer-text').textContent = state.answers[level.id][partnerId].text;
    document.getElementById('partner-answer').classList.remove('hidden');
  }
}

function getPartnerId() {
  if (!state.room) return null;
  return state.isHost ? state.room.player2_id : state.room.player1_id;
}

function setupMobileControls() {
  const controls = document.getElementById('mobile-controls');
  if (isTouchDevice()) controls.classList.add('visible');
  document.querySelectorAll('.dpad-btn').forEach(btn => {
    const dir = btn.dataset.dir;
    const start = (e) => { e.preventDefault(); e.stopPropagation(); touch[dir] = true; btn.classList.add('active'); sound.init(); };
    const end = (e) => { e.preventDefault(); touch[dir] = false; btn.classList.remove('active'); };
    ['touchstart','mousedown'].forEach(ev => btn.addEventListener(ev, start, { passive: false }));
    ['touchend','touchcancel','mouseup','mouseleave'].forEach(ev => btn.addEventListener(ev, end, { passive: false }));
  });
  const actionBtn = document.getElementById('btn-action');
  const aStart = (e) => { e.preventDefault(); touch.action = true; actionBtn.classList.add('active'); sound.init(); };
  const aEnd = (e) => { e.preventDefault(); actionBtn.classList.remove('active'); };
  actionBtn.addEventListener('touchstart', aStart, { passive: false });
  actionBtn.addEventListener('touchend', aEnd, { passive: false });
  actionBtn.addEventListener('mousedown', aStart);
  actionBtn.addEventListener('mouseup', aEnd);
}

document.addEventListener('DOMContentLoaded', () => {
  setupMobileControls();

  document.querySelectorAll('.avatar-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      state.avatar = opt.dataset.avatar;
      sound.play('ui');
    });
  });

  const unlock = () => { sound.init(); document.removeEventListener('click', unlock); document.removeEventListener('touchstart', unlock); };
  document.addEventListener('click', unlock);
  document.addEventListener('touchstart', unlock);

  document.getElementById('sound-toggle')?.addEventListener('click', () => {
    const on = sound.toggle();
    document.getElementById('sound-toggle').textContent = on ? '🔊' : '🔇';
    sound.play('ui');
  });

  document.getElementById('btn-create').addEventListener('click', async () => {
    sound.play('click');
    document.getElementById('pin-create').classList.remove('hidden');
    document.getElementById('pin-join').classList.add('hidden');
    // Don't create room yet - wait for avatar on ready
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    state._tempPin = pin;
    document.getElementById('generated-pin').textContent = pin;
    sound.play('select');
  });

  document.getElementById('btn-start-create').addEventListener('click', () => {
    sound.play('click');
    state.isHost = true;
    showScreen('screen-customize');
  });

  document.getElementById('btn-join').addEventListener('click', () => {
    sound.play('click');
    document.getElementById('pin-join').classList.remove('hidden');
    document.getElementById('pin-create').classList.add('hidden');
  });

  document.getElementById('btn-join-confirm').addEventListener('click', () => {
    sound.play('click');
    const pin = document.getElementById('input-pin').value.trim();
    if (pin.length !== 6) { sound.play('error'); alert('El PIN debe tener 6 dígitos'); return; }
    state._pendingPin = pin;
    state.isHost = false;
    showScreen('screen-customize');
  });

  document.getElementById('btn-ready').addEventListener('click', async () => {
    sound.play('select');
    state.playerName = document.getElementById('player-name').value || 'Jugador';

    try {
      if (state._pendingPin) {
        state.room = await joinRoom(state._pendingPin, state.playerId, state.playerName, state.avatar);
        state.isHost = false;
        state._pendingPin = null;
      } else {
        // Host: create with chosen pin if we showed one, else generate
        state.room = await createRoom(state.playerId, state.playerName, state.avatar, state._tempPin);
        state.isHost = true;
        if (state._tempPin && state.room.offline) state.room.pin = state._tempPin;
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión. Jugarás en modo local.');
    }

    hideAllScreens();
    document.getElementById('hud-level').textContent = 'Nivel 1 / 22';
    document.getElementById('hud-pin').textContent = state.room ? 'PIN: ' + state.room.pin : '';
    document.getElementById('hud-partner').textContent = state.isHost ? 'Esperando pareja…' : 'Conectado';

    // Tutorial toast
    const tip = document.getElementById('tutorial-tip');
    if (tip) {
      tip.classList.remove('hidden');
      setTimeout(() => tip.classList.add('hidden'), 8000);
    }

    if (!game) game = new Phaser.Game(config);
    setTimeout(() => sound.startMusic(), 400);

    if (state.room && !state.room.offline) {
      subscribeToRoom(state.room.id, (updated) => {
        state.room = updated;
        state.answers = updated.answers || {};
        if (updated.player2_id) {
          if (!state.partnerOnline) {
            document.getElementById('hud-partner').textContent = '¡Pareja conectada! 💕';
            sound.play('partner');
          }
          showPartnerFromRoom(updated);
        }
        if (partner?.visible) {
          const ox = state.isHost ? (updated.player2_x ?? partner.x / TILE) : (updated.player1_x ?? partner.x / TILE);
          const oy = state.isHost ? (updated.player2_y ?? partner.y / TILE) : (updated.player1_y ?? partner.y / TILE);
          const tx = ox * TILE + 16, ty = oy * TILE + 16;
          const dx = tx - partner.x, dy = ty - partner.y;
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            const pref = partner.animPrefix || 'female';
            if (Math.abs(dx) > Math.abs(dy)) partner.anims.play(pref + (dx > 0 ? '-walk-right' : '-walk-left'), true);
            else partner.anims.play(pref + (dy > 0 ? '-walk-down' : '-walk-up'), true);
            partner.setPosition(tx, ty);
          }
        }
      });
    }
  });

  document.getElementById('btn-submit-answer').addEventListener('click', async () => {
    const answer = document.getElementById('q-answer').value.trim();
    if (!answer) { sound.play('error'); return; }
    sound.play('send');
    if (state.room) {
      const newAnswers = await saveAnswer(state.room.id, currentHeart.id, state.playerId, answer);
      state.answers = newAnswers || state.answers;
    }
    document.getElementById('btn-submit-answer').textContent = '¡Enviado! 💕';
    setTimeout(() => {
      document.getElementById('btn-submit-answer').textContent = 'Enviar';
      document.getElementById('question-panel').classList.add('hidden');
      document.body.classList.remove('question-open');
      sound.play('levelup');
    }, 1000);
  });

  document.getElementById('btn-close-q').addEventListener('click', () => {
    sound.play('ui');
    document.getElementById('question-panel').classList.add('hidden');
    document.body.classList.remove('question-open');
  });
});

console.log('Sprout Hearts v2 – tiles, género, tutorial');
