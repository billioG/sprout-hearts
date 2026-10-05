import { LEVELS } from './levels.js';
import { createRoom, joinRoom, saveAnswer, subscribeToRoom, updatePosition } from './supabase.js';
import { sound } from './sound.js';

const state = {
  playerId: 'p' + Math.random().toString(36).substr(2, 9),
  playerName: 'Jugador',
  avatar: 'lpc',
  room: null,
  isHost: false,
  currentLevel: 1,
  answers: {},
  partnerOnline: false
};

const touch = { up: false, down: false, left: false, right: false, action: false };

// Mapa grande
const MAP_W = 50;
const MAP_H = 40;
const TILE = 32;

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

let game, player, partner, cursors, wasd, hearts = [];
let walkTimer = 0, posSyncTimer = 0;
let nearbyHeart = null;
let facing = 'down';
let partnerLabel = null;
let zoneLabel = null;
let currentZoneName = '';
let minimapGfx = null;
let minimapBg = null;

const AVATAR_SHEETS = {
  lpc: 'char-lpc',
  partner: 'char-partner',
  green: 'char-green',
  purple: 'char-purple',
  orange: 'char-orange',
  teal: 'char-teal',
  red: 'char-red',
  gold: 'char-gold',
  sprout: 'char-sprout'
};

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

function avatarKey(av) {
  return AVATAR_SHEETS[av] || 'char-lpc';
}

function animPrefix(av) {
  return av === 'sprout' ? 'sprout' : (av || 'lpc');
}

function preload() {
  this.load.image('tiles-grass', 'assets/tiles/Grass.png');
  this.load.image('tiles-water', 'assets/tiles/Water.png');
  this.load.image('tiles-hills', 'assets/tiles/Hills.png');
  this.load.image('tiles-dirt', 'assets/tiles/Tilled_Dirt.png');
  this.load.image('tiles-paths', 'assets/tiles/Paths.png');
  this.load.image('tiles-plants', 'assets/tiles/Basic_Plants.png');
  this.load.image('tiles-things', 'assets/tiles/Grass_Things.png');

  this.load.spritesheet('char-sprout', 'assets/characters/Basic_Character.png', { frameWidth: 48, frameHeight: 48 });
  this.load.spritesheet('char-lpc', 'assets/characters/lpc_male_walk.png', { frameWidth: 48, frameHeight: 64 });
  this.load.spritesheet('char-partner', 'assets/characters/lpc_partner_walk.png', { frameWidth: 48, frameHeight: 64 });
  this.load.spritesheet('char-green', 'assets/characters/lpc_green_walk.png', { frameWidth: 48, frameHeight: 64 });
  this.load.spritesheet('char-purple', 'assets/characters/lpc_purple_walk.png', { frameWidth: 48, frameHeight: 64 });
  this.load.spritesheet('char-orange', 'assets/characters/lpc_orange_walk.png', { frameWidth: 48, frameHeight: 64 });
  this.load.spritesheet('char-teal', 'assets/characters/lpc_teal_walk.png', { frameWidth: 48, frameHeight: 64 });
  this.load.spritesheet('char-red', 'assets/characters/lpc_red_walk.png', { frameWidth: 48, frameHeight: 64 });
  this.load.spritesheet('char-gold', 'assets/characters/lpc_gold_walk.png', { frameWidth: 48, frameHeight: 64 });

  const g = this.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xff6b9d, 1);
  g.fillCircle(6, 5, 5);
  g.fillCircle(14, 5, 5);
  g.fillTriangle(2, 7, 18, 7, 10, 18);
  g.generateTexture('heart', 20, 20);
  g.destroy();
}

function createLpcAnims(scene, sheetKey, prefix) {
  scene.anims.create({ key: prefix + '-walk-up', frames: scene.anims.generateFrameNumbers(sheetKey, { start: 0, end: 2 }), frameRate: 8, repeat: -1 });
  scene.anims.create({ key: prefix + '-walk-left', frames: scene.anims.generateFrameNumbers(sheetKey, { start: 3, end: 5 }), frameRate: 8, repeat: -1 });
  scene.anims.create({ key: prefix + '-walk-down', frames: scene.anims.generateFrameNumbers(sheetKey, { start: 6, end: 8 }), frameRate: 8, repeat: -1 });
  scene.anims.create({ key: prefix + '-walk-right', frames: scene.anims.generateFrameNumbers(sheetKey, { start: 9, end: 11 }), frameRate: 8, repeat: -1 });
  scene.anims.create({ key: prefix + '-idle-up', frames: [{ key: sheetKey, frame: 1 }], frameRate: 1 });
  scene.anims.create({ key: prefix + '-idle-left', frames: [{ key: sheetKey, frame: 4 }], frameRate: 1 });
  scene.anims.create({ key: prefix + '-idle-down', frames: [{ key: sheetKey, frame: 7 }], frameRate: 1 });
  scene.anims.create({ key: prefix + '-idle-right', frames: [{ key: sheetKey, frame: 10 }], frameRate: 1 });
}

function isWater(x, y) {
  // Lago central + río + lagos laterales
  const cx = 25, cy = 18;
  const lake = (x - cx) * (x - cx) / 36 + (y - cy) * (y - cy) / 20 < 1;
  const river = (x > 22 && x < 28 && y > 18 && y < 38);
  const pond1 = (x - 8) * (x - 8) / 12 + (y - 32) * (y - 32) / 8 < 1;
  const pond2 = (x - 42) * (x - 42) / 10 + (y - 8) * (y - 8) / 8 < 1;
  return lake || river || pond1 || pond2;
}

function isPath(x, y) {
  // Red de caminos: horizontal principal, vertical, y caminos a zonas
  if (y === 12 && x >= 2 && x <= 47) return true;
  if (y === 25 && x >= 2 && x <= 47) return true;
  if (x === 12 && y >= 2 && y <= 37) return true;
  if (x === 25 && y >= 2 && y <= 37) return true;
  if (x === 38 && y >= 2 && y <= 37) return true;
  // diagonales suaves / accesos a lagos
  if (y === 18 && x >= 10 && x <= 20) return true;
  if (y === 18 && x >= 30 && x <= 40) return true;
  return false;
}

function isHill(x, y) {
  // Bordes montañosos (sólidos, sin random)
  if (y <= 1 || y >= MAP_H - 2) return true;
  if (x <= 0 || x >= MAP_W - 1) return true;
  // Colinas aisladas (deterministas)
  const hills = [[6, 6], [44, 5], [5, 35], [45, 34], [30, 3], [18, 37], [15, 20], [35, 28]];
  for (const [hx, hy] of hills) {
    if (Math.abs(x - hx) <= 1 && Math.abs(y - hy) <= 1) return true;
  }
  return false;
}

// Zonas con nombre (rectángulos en coords de tile)
const ZONES = [
  { name: 'Pradera del Norte', x1: 2, y1: 2, x2: 48, y2: 10, color: '#a8e6a0' },
  { name: 'Cruce Central', x1: 20, y1: 10, x2: 30, y2: 16, color: '#f0e68c' },
  { name: 'Lago del Corazón', x1: 18, y1: 14, x2: 32, y2: 24, color: '#87ceeb' },
  { name: 'Huerto Oeste', x1: 2, y1: 12, x2: 12, y2: 20, color: '#daa520' },
  { name: 'Sendero del Sur', x1: 2, y1: 22, x2: 48, y2: 28, color: '#c4a574' },
  { name: 'Estanque del Este', x1: 36, y1: 2, x2: 48, y2: 14, color: '#90e0ef' },
  { name: 'Jardín del Amor', x1: 36, y1: 26, x2: 48, y2: 36, color: '#ffb6c1' },
  { name: 'Colinas del Ocaso', x1: 2, y1: 30, x2: 18, y2: 38, color: '#dda0dd' }
];

function getZoneAt(tx, ty) {
  for (const z of ZONES) {
    if (tx >= z.x1 && tx <= z.x2 && ty >= z.y1 && ty <= z.y2) return z;
  }
  return null;
}

function isBlocked(x, y) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return true;
  return isWater(x, y) || isHill(x, y);
}

function create() {
  // --- Terreno ---
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const px = x * TILE + TILE / 2;
      const py = y * TILE + TILE / 2;

      if (isWater(x, y)) {
        const w = this.add.image(px, py, 'tiles-water');
        w.setDisplaySize(TILE, TILE);
        w.setDepth(0);
      } else if (isPath(x, y)) {
        const p = this.add.image(px, py, 'tiles-paths');
        p.setDisplaySize(TILE, TILE);
      } else if (isHill(x, y)) {
        // hierba debajo + colina
        const g = this.add.image(px, py, 'tiles-grass');
        g.setDisplaySize(TILE, TILE);
        const h = this.add.image(px, py - 4, 'tiles-hills');
        h.setDisplaySize(TILE * 1.15, TILE * 1.15);
        h.setDepth(2);
      } else {
        const g = this.add.image(px, py, 'tiles-grass');
        g.setDisplaySize(TILE, TILE);
        if ((x + y) % 7 === 0) g.setTint(0xd4f0a8);
        else if ((x * 3 + y) % 11 === 0) g.setTint(0xc8e89a);
      }
    }
  }

  // Decoración: plantas, flores, objetos
  const decor = [];
  for (let i = 0; i < 80; i++) {
    const dx = 2 + Math.floor(Math.random() * (MAP_W - 4));
    const dy = 2 + Math.floor(Math.random() * (MAP_H - 4));
    if (isWater(dx, dy) || isPath(dx, dy) || isHill(dx, dy)) continue;
    decor.push([dx, dy]);
  }
  decor.forEach(([dx, dy]) => {
    const key = Math.random() > 0.5 ? 'tiles-plants' : 'tiles-things';
    const d = this.add.image(dx * TILE + TILE / 2, dy * TILE + TILE / 2, key);
    d.setDisplaySize(TILE * 0.85, TILE * 0.85);
    d.setDepth(1);
  });

  // Zonas de tierra cultivada
  for (let y = 14; y <= 16; y++) {
    for (let x = 4; x <= 9; x++) {
      if (!isWater(x, y)) {
        const d = this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, 'tiles-dirt');
        d.setDisplaySize(TILE, TILE);
      }
    }
  }
  for (let y = 28; y <= 30; y++) {
    for (let x = 40; x <= 45; x++) {
      if (!isWater(x, y)) {
        const d = this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, 'tiles-dirt');
        d.setDisplaySize(TILE, TILE);
      }
    }
  }

  // Animaciones para todos los avatares LPC
  ['lpc', 'partner', 'green', 'purple', 'orange', 'teal', 'red', 'gold'].forEach(p => {
    createLpcAnims(this, AVATAR_SHEETS[p], p);
  });
  // Sprout
  this.anims.create({ key: 'sprout-walk-down', frames: this.anims.generateFrameNumbers('char-sprout', { start: 0, end: 3 }), frameRate: 8, repeat: -1 });
  this.anims.create({ key: 'sprout-walk-up', frames: this.anims.generateFrameNumbers('char-sprout', { start: 4, end: 7 }), frameRate: 8, repeat: -1 });
  this.anims.create({ key: 'sprout-walk-left', frames: this.anims.generateFrameNumbers('char-sprout', { start: 8, end: 11 }), frameRate: 8, repeat: -1 });
  this.anims.create({ key: 'sprout-walk-right', frames: this.anims.generateFrameNumbers('char-sprout', { start: 12, end: 15 }), frameRate: 8, repeat: -1 });
  this.anims.create({ key: 'sprout-idle-down', frames: [{ key: 'char-sprout', frame: 0 }], frameRate: 1 });
  this.anims.create({ key: 'sprout-idle-up', frames: [{ key: 'char-sprout', frame: 4 }], frameRate: 1 });
  this.anims.create({ key: 'sprout-idle-left', frames: [{ key: 'char-sprout', frame: 8 }], frameRate: 1 });
  this.anims.create({ key: 'sprout-idle-right', frames: [{ key: 'char-sprout', frame: 12 }], frameRate: 1 });

  // Spawn en cruce central de caminos
  const startX = 25 * TILE + TILE / 2;
  const startY = 12 * TILE + TILE / 2;
  const myKey = avatarKey(state.avatar);
  const myPref = animPrefix(state.avatar);

  player = this.physics.add.sprite(startX, startY, myKey, myPref === 'sprout' ? 0 : 7);
  player.setScale(myPref === 'sprout' ? 1.8 : 1.5);
  player.setCollideWorldBounds(true);
  player.body.setSize(18, 24);
  player.anims.play(myPref + '-idle-down');
  player.setDepth(10);
  player.animPrefix = myPref;

  partner = this.physics.add.sprite(startX + 48, startY, 'char-partner', 7);
  partner.setScale(1.5);
  partner.setDepth(9);
  partner.setVisible(false);
  partner.animPrefix = 'partner';
  partnerLabel = this.add.text(partner.x, partner.y - 36, '', {
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

  // Corazones de niveles
  hearts = [];
  LEVELS.forEach(level => {
    const hx = Math.min(level.x, MAP_W - 2) * TILE + TILE / 2;
    const hy = Math.min(level.y, MAP_H - 2) * TILE + TILE / 2;
    const hs = this.physics.add.staticImage(hx, hy, 'heart');
    hs.setScale(1.8).setDepth(5);
    hs.levelData = level;
    hearts.push(hs);
    this.add.text(hx, hy - 20, String(level.id), {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#ffffff',
      stroke: '#1a1c2c', strokeThickness: 3
    }).setOrigin(0.5).setDepth(6);
    this.tweens.add({
      targets: hs, scale: 2.15, duration: 700 + Math.random() * 300,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
  });

  this.cameras.main.startFollow(player, true, 0.08, 0.08);
  this.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
  this.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
  this.cameras.main.setZoom(1);

  // Etiquetas de zonas en el mundo
  ZONES.forEach(z => {
    const cx = ((z.x1 + z.x2) / 2) * TILE + TILE / 2;
    const cy = ((z.y1 + z.y2) / 2) * TILE + TILE / 2;
    this.add.text(cx, cy, z.name, {
      fontFamily: '"Press Start 2P"',
      fontSize: '8px',
      color: '#ffffff',
      stroke: '#1a1c2c',
      strokeThickness: 3,
      align: 'center'
    }).setOrigin(0.5).setDepth(3).setAlpha(0.85);
  });

  // Indicador de zona actual (HUD)
  zoneLabel = this.add.text(12, 36, '', {
    fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#ffd166',
    backgroundColor: '#1a1c2ccc', padding: { x: 8, y: 5 }
  }).setScrollFactor(0).setDepth(25);

  if (!isTouchDevice()) {
    this.add.text(12, 12, 'Mapa 50×40 · Flechas/WASD · Espacio=♥', {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#fff',
      backgroundColor: '#1a1c2c99', padding: { x: 6, y: 4 }
    }).setScrollFactor(0).setDepth(20);
  }

  // --- Minimapa ---
  const mmW = 120, mmH = 96, mmPad = 10;
  const mmX = config.width - mmW - mmPad;
  const mmY = mmPad;
  minimapBg = this.add.rectangle(mmX + mmW / 2, mmY + mmH / 2, mmW + 6, mmH + 6, 0x1a1c2c, 0.85)
    .setScrollFactor(0).setDepth(30).setStrokeStyle(2, 0x4a4a6a);
  minimapGfx = this.add.graphics().setScrollFactor(0).setDepth(31);
  // Pre-draw static terrain on minimap once into a texture
  const mmKey = 'minimap-terrain';
  if (!this.textures.exists(mmKey)) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const sx = mmW / MAP_W;
    const sy = mmH / MAP_H;
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        let color = 0x5daa3a; // grass
        if (isWater(tx, ty)) color = 0x4a9edb;
        else if (isHill(tx, ty)) color = 0x8b7355;
        else if (isPath(tx, ty)) color = 0xc4a574;
        g.fillStyle(color, 1);
        g.fillRect(tx * sx, ty * sy, Math.ceil(sx), Math.ceil(sy));
      }
    }
    // zone tint hints
    ZONES.forEach(z => {
      g.fillStyle(Phaser.Display.Color.HexStringToColor(z.color).color, 0.15);
      g.fillRect(z.x1 * sx, z.y1 * sy, (z.x2 - z.x1 + 1) * sx, (z.y2 - z.y1 + 1) * sy);
    });
    g.generateTexture(mmKey, mmW, mmH);
    g.destroy();
  }
  this.add.image(mmX + mmW / 2, mmY + mmH / 2, mmKey).setScrollFactor(0).setDepth(30);
  // dynamic layer (player, partner, hearts)
  minimapGfx = this.add.graphics().setScrollFactor(0).setDepth(32);
  this.minimapMeta = { x: mmX, y: mmY, w: mmW, h: mmH, sx: mmW / MAP_W, sy: mmH / MAP_H };

  // hearts on minimap (static dots)
  this.minimapHearts = LEVELS.map(l => ({ x: l.x, y: l.y }));

  if (state.room && state.room.player1_id && state.room.player2_id) {
    showPartnerFromRoom(state.room);
  }
}

function drawMinimap() {
  if (!minimapGfx || !this.minimapMeta) return;
  // bound to scene via call from update with .call(scene) - use global meta
}

function refreshMinimap(scene) {
  if (!minimapGfx || !scene.minimapMeta) return;
  const { x, y, w, h, sx, sy } = scene.minimapMeta;
  minimapGfx.clear();
  // hearts
  minimapGfx.fillStyle(0xff6b9d, 1);
  (scene.minimapHearts || []).forEach(hh => {
    minimapGfx.fillCircle(x + hh.x * sx + sx / 2, y + hh.y * sy + sy / 2, 1.5);
  });
  // partner
  if (partner && partner.visible) {
    minimapGfx.fillStyle(0xff8fab, 1);
    minimapGfx.fillCircle(x + (partner.x / TILE) * sx, y + (partner.y / TILE) * sy, 2.5);
  }
  // player
  minimapGfx.fillStyle(0xffffff, 1);
  minimapGfx.fillCircle(x + (player.x / TILE) * sx, y + (player.y / TILE) * sy, 3);
  minimapGfx.lineStyle(1, 0x1a1c2c, 1);
  minimapGfx.strokeCircle(x + (player.x / TILE) * sx, y + (player.y / TILE) * sy, 3);
}

function showPartnerFromRoom(room) {
  if (!partner) return;
  const otherAvatar = state.isHost ? (room.player2_avatar || 'partner') : (room.player1_avatar || 'lpc');
  const otherName = state.isHost ? (room.player2_name || 'Pareja') : (room.player1_name || 'Pareja');
  const ox = state.isHost ? (room.player2_x ?? 26) : (room.player1_x ?? 24);
  const oy = state.isHost ? (room.player2_y ?? 12) : (room.player1_y ?? 12);
  const key = avatarKey(otherAvatar);
  const prefix = animPrefix(otherAvatar);

  partner.setTexture(key);
  partner.animPrefix = prefix;
  partner.setScale(prefix === 'sprout' ? 1.8 : 1.5);
  partner.setPosition(ox * TILE + TILE / 2, oy * TILE + TILE / 2);
  partner.setVisible(true);
  partner.anims.play(prefix + '-idle-down');
  partnerLabel.setText(otherName);
  partnerLabel.setPosition(partner.x, partner.y - 36);
  partnerLabel.setVisible(true);
  state.partnerOnline = true;
}

function update(time) {
  if (!player || !player.active) return;
  const speed = 160;
  let vx = 0, vy = 0;
  const prefix = player.animPrefix || 'lpc';

  if (cursors.left.isDown || wasd.left.isDown || touch.left) vx = -speed;
  else if (cursors.right.isDown || wasd.right.isDown || touch.right) vx = speed;
  if (cursors.up.isDown || wasd.up.isDown || touch.up) vy = -speed;
  else if (cursors.down.isDown || wasd.down.isDown || touch.down) vy = speed;

  // Colisiones: agua + colinas
  const curTX = Math.floor(player.x / TILE);
  const curTY = Math.floor(player.y / TILE);
  const nextTX = Math.floor((player.x + vx * 0.02) / TILE);
  const nextTY = Math.floor((player.y + vy * 0.02) / TILE);
  if (isBlocked(nextTX, curTY)) vx = 0;
  if (isBlocked(curTX, nextTY)) vy = 0;
  if (isBlocked(nextTX, nextTY) && (vx !== 0 && vy !== 0)) { vx = 0; vy = 0; }

  player.setVelocity(vx, vy);

  // Zona actual
  const zone = getZoneAt(Math.floor(player.x / TILE), Math.floor(player.y / TILE));
  const zName = zone ? zone.name : 'Tierras Abiertas';
  if (zName !== currentZoneName && zoneLabel) {
    currentZoneName = zName;
    zoneLabel.setText('📍 ' + zName);
  }

  // Minimapa
  refreshMinimap(this);

  if (vx < 0) { facing = 'left'; player.anims.play(prefix + '-walk-left', true); }
  else if (vx > 0) { facing = 'right'; player.anims.play(prefix + '-walk-right', true); }
  else if (vy < 0) { facing = 'up'; player.anims.play(prefix + '-walk-up', true); }
  else if (vy > 0) { facing = 'down'; player.anims.play(prefix + '-walk-down', true); }
  else { player.anims.play(prefix + '-idle-' + facing, true); }

  if ((vx !== 0 || vy !== 0) && time > walkTimer) {
    sound.play('walk');
    walkTimer = time + 240;
  }

  if (state.room && time > posSyncTimer) {
    posSyncTimer = time + 400;
    updatePosition(state.room.id, state.isHost, player.x / TILE, player.y / TILE);
  }

  if (partner && partner.visible && partnerLabel) {
    partnerLabel.setPosition(partner.x, partner.y - 36);
  }

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

let currentHeart = null;
let cooldown = false;

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
  const partnerId = getPartnerId();
  if (partnerId && state.answers[level.id] && state.answers[level.id][partnerId]) {
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
    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('touchend', end, { passive: false });
    btn.addEventListener('touchcancel', end, { passive: false });
    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', end);
    btn.addEventListener('mouseleave', end);
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

  document.getElementById('sound-toggle').addEventListener('click', () => {
    const on = sound.toggle();
    document.getElementById('sound-toggle').textContent = on ? '🔊' : '🔇';
    sound.play('ui');
  });

  document.getElementById('btn-create').addEventListener('click', async () => {
    sound.play('click');
    document.getElementById('pin-create').classList.remove('hidden');
    document.getElementById('pin-join').classList.add('hidden');
    const room = await createRoom(state.playerId, state.playerName, state.avatar);
    state.room = room;
    state.isHost = true;
    document.getElementById('generated-pin').textContent = room.pin;
    sound.play('select');
  });

  document.getElementById('btn-start-create').addEventListener('click', () => {
    sound.play('click');
    showScreen('screen-customize');
  });

  document.getElementById('btn-join').addEventListener('click', () => {
    sound.play('click');
    document.getElementById('pin-join').classList.remove('hidden');
    document.getElementById('pin-create').classList.add('hidden');
  });

  document.getElementById('btn-join-confirm').addEventListener('click', async () => {
    sound.play('click');
    const pin = document.getElementById('input-pin').value.trim();
    if (pin.length !== 6) { sound.play('error'); alert('El PIN debe tener 6 dígitos'); return; }
    state._pendingPin = pin;
    showScreen('screen-customize');
  });

  document.getElementById('btn-ready').addEventListener('click', async () => {
    sound.play('select');
    state.playerName = document.getElementById('player-name').value || 'Jugador';

    if (state._pendingPin) {
      const room = await joinRoom(state._pendingPin, state.playerId, state.playerName, state.avatar);
      state.room = room;
      state.isHost = false;
      state._pendingPin = null;
    } else if (state.isHost) {
      state.room = await createRoom(state.playerId, state.playerName, state.avatar);
    }

    hideAllScreens();
    document.getElementById('hud-level').textContent = 'Nivel ' + state.currentLevel;
    document.getElementById('hud-pin').textContent = state.room ? 'PIN: ' + state.room.pin : '';
    document.getElementById('hud-partner').textContent = state.isHost ? 'Esperando a tu pareja...' : 'Conectado con tu pareja';

    if (!game) game = new Phaser.Game(config);
    setTimeout(() => sound.startMusic(), 500);

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
        if (partner && partner.visible) {
          const ox = state.isHost ? (updated.player2_x ?? partner.x / TILE) : (updated.player1_x ?? partner.x / TILE);
          const oy = state.isHost ? (updated.player2_y ?? partner.y / TILE) : (updated.player1_y ?? partner.y / TILE);
          const tx = ox * TILE + TILE / 2;
          const ty = oy * TILE + TILE / 2;
          const dx = tx - partner.x;
          const dy = ty - partner.y;
          if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            const pref = partner.animPrefix || 'partner';
            if (Math.abs(dx) > Math.abs(dy)) partner.anims.play(pref + (dx > 0 ? '-walk-right' : '-walk-left'), true);
            else partner.anims.play(pref + (dy > 0 ? '-walk-down' : '-walk-up'), true);
            partner.setPosition(tx, ty);
          } else {
            partner.anims.play((partner.animPrefix || 'partner') + '-idle-down', true);
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
    }, 1100);
  });

  document.getElementById('btn-close-q').addEventListener('click', () => {
    sound.play('ui');
    document.getElementById('question-panel').classList.add('hidden');
    document.body.classList.remove('question-open');
  });
});

console.log('Sprout Hearts – 9 avatares + mapa 50x40');
