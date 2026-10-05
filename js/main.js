import { LEVELS } from './levels.js';
import { createRoom, joinRoom, saveAnswer, subscribeToRoom, updatePosition } from './supabase.js';
import { sound } from './sound.js';

const state = {
  playerId: 'p' + Math.random().toString(36).substr(2, 9),
  playerName: 'Jugador',
  avatar: 'male-blue',
  room: null,
  isHost: false,
  answers: {},
  partnerOnline: false
};

const touch = { up: false, down: false, left: false, right: false, action: false };
const MAP_W = 50, MAP_H = 40, TILE = 32;

const AVATARS = {
  'male-blue':   { sheet: 'char-male',   prefix: 'm', female: false, tint: null },
  'male-green':  { sheet: 'char-green',  prefix: 'g', female: false, tint: null },
  'male-gold':   { sheet: 'char-gold',   prefix: 'o', female: false, tint: null },
  'female-pink': { sheet: 'char-female', prefix: 'f', female: true,  tint: null },
  'female-blue': { sheet: 'char-female', prefix: 'f', female: true,  tint: 0xa0c8ff },
  'female-green':{ sheet: 'char-female', prefix: 'f', female: true,  tint: 0xa0e8a0 },
  'sprout':      { sheet: 'char-sprout', prefix: 's', female: false, tint: null }
};

let game, player, partner, cursors, wasd, hearts = [];
let walkTimer = 0, posSyncTimer = 0, nearbyHeart = null, facing = 'down';
let partnerLabel = null, zoneLabel = null, currentZoneName = '';
let minimapGfx = null;
let partnerTarget = null; // {x,y} for lerp
let dialogueOpen = false;
let dlgLevel = null, dlgIndex = 0;

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

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 960,
  height: 640,
  backgroundColor: '#6bb84a',
  pixelArt: true,
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scene: { preload, create, update },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 }
};

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}
function hideAllScreens() {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('hud').classList.remove('hidden');
}
function isTouchDevice() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}
function getZoneAt(tx, ty) {
  return ZONES.find(z => tx >= z.x1 && tx <= z.x2 && ty >= z.y1 && ty <= z.y2) || null;
}
function isWater(x, y) {
  return ((x-25)**2)/36 + ((y-18)**2)/20 < 1
    || (x > 22 && x < 28 && y > 18 && y < 38)
    || ((x-8)**2)/12 + ((y-32)**2)/8 < 1
    || ((x-42)**2)/10 + ((y-8)**2)/8 < 1;
}
function isPath(x, y) {
  return (y === 12 && x >= 2 && x <= 47)
    || (y === 25 && x >= 2 && x <= 47)
    || (x === 12 && y >= 2 && y <= 37)
    || (x === 25 && y >= 2 && y <= 37)
    || (x === 38 && y >= 2 && y <= 37)
    || (y === 18 && ((x >= 10 && x <= 20) || (x >= 30 && x <= 40)));
}
function isHill(x, y) {
  if (y <= 1 || y >= MAP_H - 2 || x <= 0 || x >= MAP_W - 1) return true;
  return [[6,6],[44,5],[5,35],[45,34],[30,3],[18,37]].some(([hx,hy]) => Math.abs(x-hx)<=1 && Math.abs(y-hy)<=1);
}
function isBlocked(x, y) {
  return x < 0 || y < 0 || x >= MAP_W || y >= MAP_H || isWater(x,y) || isHill(x,y);
}

function preload() {
  this.load.spritesheet('grass', 'assets/tiles/grass_solid.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('water', 'assets/tiles/Water.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('paths', 'assets/tiles/Paths.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('hills', 'assets/tiles/Hills.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('plants', 'assets/tiles/Basic_Plants.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('things', 'assets/tiles/Grass_Things.png', { frameWidth: 16, frameHeight: 16 });
  this.load.spritesheet('dirt', 'assets/tiles/Tilled_Dirt.png', { frameWidth: 16, frameHeight: 16 });
  this.load.image('house', 'assets/tiles/house.png');
  this.load.image('bush', 'assets/tiles/bush.png');

  this.load.spritesheet('char-male', 'assets/characters/lpc_male_walk.png', { frameWidth: 48, frameHeight: 64 });
  this.load.spritesheet('char-green', 'assets/characters/lpc_green_walk.png', { frameWidth: 48, frameHeight: 64 });
  this.load.spritesheet('char-gold', 'assets/characters/lpc_gold_walk.png', { frameWidth: 48, frameHeight: 64 });
  this.load.spritesheet('char-female', 'assets/characters/lpc_female_walk3.png', { frameWidth: 64, frameHeight: 64 });
  this.load.spritesheet('char-sprout', 'assets/characters/Basic_Character.png', { frameWidth: 48, frameHeight: 48 });

  const g = this.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xff6b9d, 1);
  g.fillCircle(6, 5, 5); g.fillCircle(14, 5, 5);
  g.fillTriangle(2, 7, 18, 7, 10, 18);
  g.generateTexture('heart', 20, 20);
  g.destroy();
}

/** LPC 3-frame sheet: row0=up, row1=left, row2=down, row3=right — but many sheets swap L/R */
function createAnims(scene, sheet, prefix, swapLR = true) {
  // frames: 0-2 up, 3-5 left, 6-8 down, 9-11 right
  const L = swapLR ? [9, 11] : [3, 5];
  const R = swapLR ? [3, 5] : [9, 11];
  const Li = swapLR ? 10 : 4;
  const Ri = swapLR ? 4 : 10;
  const add = (key, start, end, loop) => {
    scene.anims.create({
      key: prefix + '-' + key,
      frames: scene.anims.generateFrameNumbers(sheet, { start, end }),
      frameRate: loop ? 8 : 1,
      repeat: loop ? -1 : 0
    });
  };
  add('walk-up', 0, 2, true);
  add('walk-down', 6, 8, true);
  add('walk-left', L[0], L[1], true);
  add('walk-right', R[0], R[1], true);
  add('idle-up', 1, 1, false);
  add('idle-down', 7, 7, false);
  add('idle-left', Li, Li, false);
  add('idle-right', Ri, Ri, false);
}

function create() {
  // Solid grass only
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const px = x * TILE + 16, py = y * TILE + 16;
      if (isWater(x, y)) {
        this.add.image(px, py, 'water', 0).setDisplaySize(TILE, TILE);
      } else if (isPath(x, y)) {
        this.add.image(px, py, 'paths', 0).setDisplaySize(TILE, TILE);
      } else if (isHill(x, y)) {
        this.add.image(px, py, 'grass', (x + y) % 4).setDisplaySize(TILE, TILE);
        this.add.image(px, py - 2, 'hills', 0).setDisplaySize(TILE, TILE).setDepth(2);
      } else {
        this.add.image(px, py, 'grass', (x * 3 + y) % 4).setDisplaySize(TILE, TILE);
      }
    }
  }

  // Dirt gardens
  [[4,14,9,16],[40,28,45,30]].forEach(([x1,y1,x2,y2]) => {
    for (let y = y1; y <= y2; y++)
      for (let x = x1; x <= x2; x++)
        if (!isWater(x,y)) this.add.image(x*TILE+16, y*TILE+16, 'dirt', 0).setDisplaySize(TILE, TILE);
  });

  // Bushes / plants as single frames
  const bushSpots = [];
  for (let i = 0; i < 70; i++) {
    const dx = 3 + Math.floor(Math.random() * (MAP_W - 6));
    const dy = 3 + Math.floor(Math.random() * (MAP_H - 6));
    if (isWater(dx,dy) || isPath(dx,dy) || isHill(dx,dy)) continue;
    bushSpots.push([dx, dy]);
  }
  bushSpots.forEach(([dx, dy], i) => {
    if (i % 2 === 0) {
      this.add.image(dx * TILE + 16, dy * TILE + 16, 'bush')
        .setDisplaySize(28, 28).setDepth(1);
    } else {
      this.add.image(dx * TILE + 16, dy * TILE + 16, 'plants', i % 6)
        .setDisplaySize(24, 24).setDepth(1);
    }
  });

  // Houses
  const houses = [[7, 5], [40, 6], [8, 30], [42, 28], [30, 20]];
  houses.forEach(([hx, hy]) => {
    if (!isWater(hx, hy)) {
      this.add.image(hx * TILE + 16, hy * TILE + 8, 'house')
        .setDisplaySize(64, 48).setDepth(4);
    }
  });

  createAnims(this, 'char-male', 'm', true);
  createAnims(this, 'char-green', 'g', true);
  createAnims(this, 'char-gold', 'o', true);
  createAnims(this, 'char-female', 'f', true);
  // sprout
  ['down','up','left','right'].forEach((dir, i) => {
    const start = i * 4;
    this.anims.create({ key: 's-walk-' + dir, frames: this.anims.generateFrameNumbers('char-sprout', { start, end: start + 3 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: 's-idle-' + dir, frames: [{ key: 'char-sprout', frame: start }] });
  });

  const av = AVATARS[state.avatar] || AVATARS['male-blue'];
  const sx = 25 * TILE + 16, sy = 12 * TILE + 16;
  player = this.physics.add.sprite(sx, sy, av.sheet, 7);
  player.setScale(av.female ? 1.4 : (av.sheet === 'char-sprout' ? 1.8 : 1.5));
  if (av.tint) player.setTint(av.tint);
  player.setCollideWorldBounds(true);
  player.body.setSize(14, 18);
  player.animPrefix = av.prefix;
  player.anims.play(av.prefix + '-idle-down');
  player.setDepth(10);

  partner = this.physics.add.sprite(sx + 48, sy, 'char-female', 7);
  partner.setScale(1.4).setDepth(9).setVisible(false);
  partner.animPrefix = 'f';
  partnerLabel = this.add.text(0, 0, '', {
    fontFamily: '"Press Start 2P"', fontSize: '7px', color: '#ff8fab',
    stroke: '#1a1c2c', strokeThickness: 2
  }).setOrigin(0.5).setDepth(11).setVisible(false);

  cursors = this.input.keyboard.createCursorKeys();
  wasd = this.input.keyboard.addKeys({
    up: Phaser.Input.Keyboard.KeyCodes.W, down: Phaser.Input.Keyboard.KeyCodes.S,
    left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D,
    space: Phaser.Input.Keyboard.KeyCodes.SPACE
  });

  hearts = [];
  LEVELS.forEach(level => {
    const hx = Math.min(level.x, MAP_W - 2) * TILE + 16;
    const hy = Math.min(level.y, MAP_H - 2) * TILE + 16;
    const hs = this.physics.add.staticImage(hx, hy, 'heart').setScale(1.8).setDepth(5);
    hs.levelData = level;
    hearts.push(hs);
    this.add.text(hx, hy - 22, String(level.id), {
      fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#fff',
      stroke: '#1a1c2c', strokeThickness: 3
    }).setOrigin(0.5).setDepth(6);
    this.tweens.add({ targets: hs, scale: 2.1, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  });

  ZONES.forEach(z => {
    const cx = ((z.x1 + z.x2) / 2) * TILE + 16;
    const cy = ((z.y1 + z.y2) / 2) * TILE + 16;
    this.add.text(cx, cy, z.name, {
      fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#fff',
      stroke: '#1a1c2c', strokeThickness: 3
    }).setOrigin(0.5).setDepth(3).setAlpha(0.75);
  });

  this.cameras.main.startFollow(player, true, 0.1, 0.1);
  this.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
  this.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);

  zoneLabel = this.add.text(12, 36, '', {
    fontFamily: '"Press Start 2P"', fontSize: '9px', color: '#ffd166',
    backgroundColor: '#1a1c2ccc', padding: { x: 8, y: 5 }
  }).setScrollFactor(0).setDepth(25);

  this.add.text(12, 12, 'Acércate a un ♥ y pulsa 💬 / Espacio', {
    fontFamily: '"Press Start 2P"', fontSize: '8px', color: '#fff',
    backgroundColor: '#1a1c2c99', padding: { x: 6, y: 4 }
  }).setScrollFactor(0).setDepth(20);

  // minimap
  const mmW = 120, mmH = 96, mmX = 960 - mmW - 10, mmY = 10;
  this.add.rectangle(mmX + mmW/2, mmY + mmH/2, mmW+6, mmH+6, 0x1a1c2c, 0.85)
    .setScrollFactor(0).setDepth(30).setStrokeStyle(2, 0x4a4a6a);
  const sxm = mmW/MAP_W, sym = mmH/MAP_H;
  const gg = this.make.graphics({ x:0, y:0, add:false });
  for (let ty=0; ty<MAP_H; ty++) for (let tx=0; tx<MAP_W; tx++) {
    let c = 0x6bb84a;
    if (isWater(tx,ty)) c = 0x4a9edb;
    else if (isHill(tx,ty)) c = 0x8b7355;
    else if (isPath(tx,ty)) c = 0xc4a574;
    gg.fillStyle(c,1); gg.fillRect(tx*sxm, ty*sym, Math.ceil(sxm), Math.ceil(sym));
  }
  gg.generateTexture('mm', mmW, mmH); gg.destroy();
  this.add.image(mmX+mmW/2, mmY+mmH/2, 'mm').setScrollFactor(0).setDepth(30);
  minimapGfx = this.add.graphics().setScrollFactor(0).setDepth(32);
  this.minimapMeta = { x: mmX, y: mmY, sx: sxm, sy: sym };
  this.minimapHearts = LEVELS.map(l => ({ x: l.x, y: l.y }));

  if (state.room?.player2_id) showPartnerFromRoom(state.room);
}

function refreshMinimap(scene) {
  if (!minimapGfx || !scene.minimapMeta) return;
  const { x, y, sx, sy } = scene.minimapMeta;
  minimapGfx.clear();
  minimapGfx.fillStyle(0xff6b9d, 1);
  (scene.minimapHearts||[]).forEach(h => minimapGfx.fillCircle(x+h.x*sx+sx/2, y+h.y*sy+sy/2, 1.5));
  if (partner?.visible) {
    minimapGfx.fillStyle(0xff8fab, 1);
    minimapGfx.fillCircle(x+(partner.x/TILE)*sx, y+(partner.y/TILE)*sy, 2.5);
  }
  minimapGfx.fillStyle(0xffffff, 1);
  minimapGfx.fillCircle(x+(player.x/TILE)*sx, y+(player.y/TILE)*sy, 3);
}

function showPartnerFromRoom(room) {
  if (!partner) return;
  const otherAvId = state.isHost ? (room.player2_avatar || 'female-pink') : (room.player1_avatar || 'male-blue');
  const otherName = state.isHost ? (room.player2_name || 'Pareja') : (room.player1_name || 'Pareja');
  const ox = state.isHost ? (room.player2_x ?? 26) : (room.player1_x ?? 24);
  const oy = state.isHost ? (room.player2_y ?? 12) : (room.player1_y ?? 12);
  const av = AVATARS[otherAvId] || AVATARS['female-pink'];
  partner.setTexture(av.sheet, 7);
  partner.animPrefix = av.prefix;
  partner.setScale(av.female ? 1.4 : (av.sheet === 'char-sprout' ? 1.8 : 1.5));
  if (av.tint) partner.setTint(av.tint); else partner.clearTint();
  partnerTarget = { x: ox * TILE + 16, y: oy * TILE + 16 };
  partner.setVisible(true);
  partner.anims.play(av.prefix + '-idle-down');
  partnerLabel.setText(otherName).setVisible(true);
  state.partnerOnline = true;
}

function update(time, delta) {
  if (!player?.active) return;

  // Partner smooth move
  if (partner?.visible && partnerTarget) {
    const dx = partnerTarget.x - partner.x;
    const dy = partnerTarget.y - partner.y;
    const dist = Math.hypot(dx, dy);
    const pref = partner.animPrefix || 'f';
    if (dist > 2) {
      const speed = Math.min(dist * 0.12, 4.5);
      partner.x += (dx / dist) * speed;
      partner.y += (dy / dist) * speed;
      if (Math.abs(dx) > Math.abs(dy)) {
        partner.anims.play(pref + (dx > 0 ? '-walk-right' : '-walk-left'), true);
      } else {
        partner.anims.play(pref + (dy > 0 ? '-walk-down' : '-walk-up'), true);
      }
    } else {
      partner.anims.play(pref + '-idle-down', true);
    }
    partnerLabel.setPosition(partner.x, partner.y - 36);
  }

  if (dialogueOpen) {
    player.setVelocity(0, 0);
    refreshMinimap(this);
    return;
  }

  const speed = 160;
  let vx = 0, vy = 0;
  const prefix = player.animPrefix || 'm';

  if (cursors.left.isDown || wasd.left.isDown || touch.left) vx = -speed;
  else if (cursors.right.isDown || wasd.right.isDown || touch.right) vx = speed;
  if (cursors.up.isDown || wasd.up.isDown || touch.up) vy = -speed;
  else if (cursors.down.isDown || wasd.down.isDown || touch.down) vy = speed;

  const curTX = Math.floor(player.x / TILE), curTY = Math.floor(player.y / TILE);
  if (isBlocked(Math.floor((player.x + vx * 0.02) / TILE), curTY)) vx = 0;
  if (isBlocked(curTX, Math.floor((player.y + vy * 0.02) / TILE))) vy = 0;

  player.setVelocity(vx, vy);

  if (vx < 0) { facing = 'left'; player.anims.play(prefix + '-walk-left', true); }
  else if (vx > 0) { facing = 'right'; player.anims.play(prefix + '-walk-right', true); }
  else if (vy < 0) { facing = 'up'; player.anims.play(prefix + '-walk-up', true); }
  else if (vy > 0) { facing = 'down'; player.anims.play(prefix + '-walk-down', true); }
  else {
    const k = prefix + '-idle-' + facing;
    if (player.anims.currentAnim?.key !== k) player.anims.play(k, true);
  }

  if ((vx || vy) && time > walkTimer) { sound.play('walk'); walkTimer = time + 240; }

  if (state.room && time > posSyncTimer) {
    posSyncTimer = time + 350;
    updatePosition(state.room.id, state.isHost, player.x / TILE, player.y / TILE);
  }

  const zone = getZoneAt(Math.floor(player.x / TILE), Math.floor(player.y / TILE));
  const zName = zone ? zone.name : 'Tierras Abiertas';
  if (zName !== currentZoneName && zoneLabel) {
    currentZoneName = zName;
    zoneLabel.setText('📍 ' + zName);
  }

  refreshMinimap(this);

  nearbyHeart = null;
  for (const h of hearts) {
    if (Phaser.Math.Distance.Between(player.x, player.y, h.x, h.y) < 48) {
      nearbyHeart = h.levelData;
      break;
    }
  }

  if (Phaser.Input.Keyboard.JustDown(wasd.space) || touch.action) {
    touch.action = false;
    if (nearbyHeart) startDialogue(nearbyHeart);
  }
}

// ===== Diálogo Zelda =====
function startDialogue(level) {
  dlgLevel = level;
  dlgIndex = 0;
  dialogueOpen = true;
  document.body.classList.add('dialogue-open');
  document.getElementById('dialogue-box').classList.remove('hidden');
  document.getElementById('dlg-name').textContent = level.npc || level.title;
  document.getElementById('dlg-prompt').classList.add('hidden');
  document.getElementById('dlg-partner').classList.add('hidden');
  document.getElementById('dlg-next').classList.remove('hidden');
  // Liberar teclas A/S/D/W para poder escribir
  if (game && game.scene && game.scene.scenes[0] && game.scene.scenes[0].input) {
    game.scene.scenes[0].input.keyboard.enabled = false;
  }
  sound.play('heart');
  showDialogueLine();
}

function showDialogueLine() {
  const lines = dlgLevel.dialogue;
  if (dlgIndex >= lines.length) {
    closeDialogue();
    return;
  }
  const line = lines[dlgIndex];
  const promptEl = document.getElementById('dlg-prompt');
  const nextBtn = document.getElementById('dlg-next');
  const textEl = document.getElementById('dlg-text');

  if (typeof line === 'object' && line.prompt) {
    textEl.textContent = '…';
    promptEl.classList.remove('hidden');
    nextBtn.classList.add('hidden');
    document.getElementById('dlg-answer').value = '';
    document.getElementById('dlg-answer').placeholder = line.placeholder || 'Tu respuesta…';
    // partner answer if any
    const pid = getPartnerId();
    if (pid && state.answers[dlgLevel.id]?.[pid]) {
      document.getElementById('dlg-partner-text').textContent = state.answers[dlgLevel.id][pid].text;
      document.getElementById('dlg-partner').classList.remove('hidden');
    } else {
      document.getElementById('dlg-partner').classList.add('hidden');
    }
  } else {
    promptEl.classList.add('hidden');
    nextBtn.classList.remove('hidden');
    textEl.textContent = line;
    // typewriter optional skip - show full
  }
}

function nextDialogue() {
  if (!dialogueOpen) return;
  const line = dlgLevel.dialogue[dlgIndex];
  if (typeof line === 'object' && line.prompt) return; // must submit
  dlgIndex++;
  sound.play('ui');
  showDialogueLine();
}

function closeDialogue() {
  dialogueOpen = false;
  document.body.classList.remove('dialogue-open');
  document.getElementById('dialogue-box').classList.add('hidden');
  dlgLevel = null;
  if (game && game.scene && game.scene.scenes[0] && game.scene.scenes[0].input) {
    game.scene.scenes[0].input.keyboard.enabled = true;
  }
}

function showPartnerToast(msg) {
  let el = document.getElementById('partner-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'partner-toast';
    el.className = 'partner-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 4500);
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

  const unlock = () => { sound.init(); };
  document.addEventListener('click', unlock, { once: true });
  document.addEventListener('touchstart', unlock, { once: true });

  document.getElementById('sound-toggle')?.addEventListener('click', () => {
    const on = sound.toggle();
    document.getElementById('sound-toggle').textContent = on ? '🔊' : '🔇';
  });

  document.getElementById('btn-create').addEventListener('click', () => {
    sound.play('click');
    document.getElementById('pin-create').classList.remove('hidden');
    document.getElementById('pin-join').classList.add('hidden');
    state._tempPin = String(Math.floor(100000 + Math.random() * 900000));
    document.getElementById('generated-pin').textContent = state._tempPin;
  });

  document.getElementById('btn-start-create').addEventListener('click', () => {
    state.isHost = true;
    showScreen('screen-customize');
  });

  document.getElementById('btn-join').addEventListener('click', () => {
    document.getElementById('pin-join').classList.remove('hidden');
    document.getElementById('pin-create').classList.add('hidden');
  });

  document.getElementById('btn-join-confirm').addEventListener('click', () => {
    const pin = document.getElementById('input-pin').value.trim();
    if (pin.length !== 6) { alert('PIN de 6 dígitos'); return; }
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
      } else {
        state.room = await createRoom(state.playerId, state.playerName, state.avatar, state._tempPin);
        state.isHost = true;
      }
    } catch (e) { console.error(e); }

    hideAllScreens();
    document.getElementById('hud-level').textContent = 'Nivel 1 / 22';
    document.getElementById('hud-pin').textContent = state.room ? 'PIN: ' + state.room.pin : '';
    document.getElementById('hud-partner').textContent = state.isHost ? 'Esperando pareja…' : 'Conectado';
    if (state.room?.answers) state.answers = state.room.answers;
    // Contar niveles respondidos
    const answered = Object.keys(state.answers || {}).length;
    document.getElementById('hud-level').textContent = 'Respondidos ' + answered + ' / 22';

    if (!game) game = new Phaser.Game(config);
    setTimeout(() => sound.startMusic(), 400);

    if (state.room && !state.room.offline) {
      subscribeToRoom(state.room.id, (updated) => {
        state.room = updated;
        const prevAnswers = state.answers || {};
        state.answers = updated.answers || {};
        // Aviso si la pareja respondió algo nuevo
        const pid = state.isHost ? updated.player2_id : updated.player1_id;
        if (pid && state.answers) {
          for (const lid of Object.keys(state.answers)) {
            const now = state.answers[lid]?.[pid];
            const before = prevAnswers[lid]?.[pid];
            if (now && (!before || now.timestamp !== before.timestamp)) {
              showPartnerToast('💕 Tu pareja respondió el nivel ' + lid);
              sound.play('partner');
              break;
            }
          }
        }
        if (updated.player2_id) {
          if (!state.partnerOnline) {
            document.getElementById('hud-partner').textContent = '¡Pareja conectada! 💕';
            sound.play('partner');
          }
          showPartnerFromRoom(updated);
          const ox = state.isHost ? updated.player2_x : updated.player1_x;
          const oy = state.isHost ? updated.player2_y : updated.player1_y;
          if (ox != null) partnerTarget = { x: ox * TILE + 16, y: oy * TILE + 16 };
        }
      });
    }
  });

  document.getElementById('dlg-next').addEventListener('click', nextDialogue);
  document.addEventListener('keydown', (e) => {
    if (!dialogueOpen) return;
    // No interceptar si está escribiendo en el textarea
    if (document.activeElement && document.activeElement.id === 'dlg-answer') return;
    if (e.key === 'Enter' || e.key === ' ') {
      const line = dlgLevel?.dialogue[dlgIndex];
      if (!(typeof line === 'object' && line.prompt)) {
        e.preventDefault();
        nextDialogue();
      }
    }
  });

  document.getElementById('dlg-submit').addEventListener('click', async () => {
    const answer = document.getElementById('dlg-answer').value.trim();
    if (!answer) { sound.play('error'); return; }
    sound.play('send');
    if (state.room && dlgLevel) {
      const na = await saveAnswer(state.room.id, dlgLevel.id, state.playerId, answer, state.room.pin);
      state.answers = na || state.answers;
    }
    document.getElementById('dlg-prompt').classList.add('hidden');
    dlgIndex++;
    document.getElementById('dlg-next').classList.remove('hidden');
    showDialogueLine();
  });
});

console.log('Sprout Hearts v5 – Zelda dialogue, fixed dirs, houses, female');
