(() => {
  'use strict';

  // ================= CONFIGURAÇÃO =================
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const TILE = 32;
  const ROWS = 15;
  const SOLID = new Set(['#', 'B', '?', 'M', 'U', 'P', 'T', 'S']);
  const FONT = '"Press Start 2P", monospace';

  // ================= ÁUDIO (WebAudio, sem arquivos) =================
  let audioCtx = null;
  function beep(freq, dur, type = 'square', vol = 0.07, slideTo = null) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const t = audioCtx.currentTime;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(t);
      o.stop(t + dur);
    } catch (e) { /* áudio indisponível */ }
  }
  const seq = (notes, gap, dur = 0.12) =>
    notes.forEach((f, i) => setTimeout(() => beep(f, dur), i * gap));
  const sfx = {
    jump: () => beep(260, 0.18, 'square', 0.05, 640),
    coin: () => { beep(988, 0.07); setTimeout(() => beep(1319, 0.25), 70); },
    stomp: () => beep(220, 0.12, 'triangle', 0.12, 70),
    bump: () => beep(110, 0.08, 'square', 0.06),
    brick: () => beep(160, 0.15, 'sawtooth', 0.08, 40),
    sprout: () => beep(200, 0.3, 'square', 0.05, 800),
    power: () => seq([523, 659, 784, 1047, 1319], 60, 0.1),
    hurt: () => beep(500, 0.35, 'sawtooth', 0.05, 90),
    die: () => seq([494, 440, 392, 330, 262, 196], 140, 0.14),
    flag: () => seq([392, 523, 659, 784, 1047, 1319, 1568], 90, 0.14),
    oneUp: () => seq([659, 784, 1319, 1047, 1175, 1568], 80, 0.1),
  };

  // ================= ENTRADA =================
  const keys = {};
  const touch = { left: false, right: false, jump: false, run: false };
  const input = {
    get left() { return keys.ArrowLeft || keys.KeyA || touch.left; },
    get right() { return keys.ArrowRight || keys.KeyD || touch.right; },
    get jump() { return keys.Space || keys.ArrowUp || keys.KeyW || keys.KeyZ || touch.jump; },
    get run() { return keys.ShiftLeft || keys.ShiftRight || keys.KeyX || touch.run; },
  };

  addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'Enter' && !e.repeat) onEnter();
    keys[e.code] = true;
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  document.querySelectorAll('[data-btn]').forEach((btn) => {
    const k = btn.dataset.btn;
    const on = (e) => {
      e.preventDefault();
      touch[k] = true;
      btn.classList.add('on');
      if (k === 'jump' && ['title', 'gameover', 'win'].includes(state)) onEnter();
    };
    const off = (e) => {
      e.preventDefault();
      touch[k] = false;
      btn.classList.remove('on');
    };
    btn.addEventListener('pointerdown', on);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => btn.addEventListener(ev, off));
  });
  canvas.addEventListener('pointerdown', () => {
    if (['title', 'gameover', 'win', 'paused'].includes(state)) onEnter();
  });

  // ================= FASE 1-1 =================
  function buildLevel() {
    const cols = 212;
    const map = [];
    for (let y = 0; y < ROWS; y++) map.push(new Array(cols).fill('.'));
    const set = (x, y, t) => { if (x >= 0 && x < cols && y >= 0 && y < ROWS) map[y][x] = t; };
    const row = (x1, x2, y, t) => { for (let x = x1; x <= x2; x++) set(x, y, t); };
    const pipe = (x, h) => {
      for (let y = 13 - h; y < 13; y++) {
        const t = y === 13 - h ? 'T' : 'P';
        set(x, y, t);
        set(x + 1, y, t);
      }
    };
    const stairUp = (x, h) => {
      for (let i = 0; i < h; i++) for (let y = 12 - i; y <= 12; y++) set(x + i, y, 'S');
    };
    const stairDown = (x, h) => {
      for (let i = 0; i < h; i++) for (let y = 12 - (h - 1 - i); y <= 12; y++) set(x + i, y, 'S');
    };

    // chão com buracos
    const gaps = [[69, 70], [86, 88], [153, 154]];
    for (let x = 0; x < cols; x++) {
      if (gaps.some(([a, b]) => x >= a && x <= b)) continue;
      set(x, 13, '#');
      set(x, 14, '#');
    }

    // blocos
    set(16, 9, '?');
    row(20, 24, 9, 'B'); set(21, 9, 'M'); set(23, 9, '?');
    set(22, 5, '?');
    pipe(28, 2); pipe(38, 3); pipe(46, 4); pipe(57, 4);
    row(40, 44, 7, 'C');
    row(77, 79, 9, 'B'); set(78, 9, 'M');
    row(80, 87, 5, 'B');
    row(82, 85, 3, 'C');
    row(91, 93, 5, 'B'); set(94, 5, '?'); set(94, 9, 'B');
    row(100, 101, 9, 'B');
    set(106, 9, '?'); set(109, 9, '?'); set(109, 5, 'M'); set(112, 9, '?');
    row(113, 116, 8, 'C');
    set(118, 9, 'B');
    row(121, 123, 5, 'B');
    row(128, 131, 5, 'B'); set(129, 5, '?'); set(130, 5, '?');
    row(129, 130, 9, 'B');
    stairUp(134, 4); stairDown(140, 4);
    stairUp(148, 5); stairDown(155, 4);
    row(159, 162, 9, 'C');
    pipe(163, 2);
    row(168, 171, 9, 'B'); set(170, 9, '?');
    pipe(179, 2);
    stairUp(181, 8);
    for (let y = 5; y <= 12; y++) set(189, y, 'S');

    const enemySpawns = [
      [22, 12], [40, 12], [51, 12], [53, 12], [80, 4], [82, 4],
      [97, 12], [99, 12], [107, 12], [109, 12], [114, 12], [116, 12],
      [124, 12], [126, 12], [128, 12], [130, 12], [174, 12], [176, 12],
    ];

    return { map, cols, enemySpawns, flagX: 198, castleX: 202 };
  }

  // ================= ESTADO =================
  let level, map, cols, cam, player, enemies, items, effects, bumps, flag;
  let score = 0, coins = 0, lives = 3, time = 300, timeTick = 0;
  let state = 'title';
  let frame = 0, deathT = 0;

  function resetLevel() {
    level = buildLevel();
    map = level.map;
    cols = level.cols;
    cam = 0;
    player = {
      x: 3 * TILE, y: 13 * TILE - 30, w: 22, h: 30, vx: 0, vy: 0,
      big: false, facing: 1, onGround: false, inv: 0, anim: 0, jumpHeld: true, hidden: false,
    };
    enemies = level.enemySpawns.map(([tx, ty]) => ({
      x: tx * TILE + 2, y: (ty + 1) * TILE - 28, w: 28, h: 28, vx: -1, vy: 0,
      alive: true, active: false, squash: 0, flipped: false,
    }));
    items = [];
    effects = [];
    bumps = [];
    time = 300;
    timeTick = 0;
    flag = { y: 3 * TILE + 8, phase: 0 };
  }

  function newGame() {
    score = 0;
    coins = 0;
    lives = 3;
    resetLevel();
    state = 'play';
  }

  function onEnter() {
    if (state === 'title' || state === 'gameover' || state === 'win') newGame();
    else if (state === 'play') state = 'paused';
    else if (state === 'paused') state = 'play';
  }

  // ================= FÍSICA / COLISÃO =================
  function tileAt(tx, ty) {
    if (ty < 0 || ty >= ROWS) return '.';
    if (tx < 0) return '#';
    if (tx >= cols) return '.';
    return map[ty][tx];
  }
  const isSolid = (tx, ty) => SOLID.has(tileAt(tx, ty));
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function moveX(e) {
    e.x += e.vx;
    const top = Math.floor(e.y / TILE);
    const bot = Math.floor((e.y + e.h - 1) / TILE);
    if (e.vx > 0) {
      const tx = Math.floor((e.x + e.w - 1) / TILE);
      for (let ty = top; ty <= bot; ty++) {
        if (isSolid(tx, ty)) { e.x = tx * TILE - e.w; e.vx = 0; return true; }
      }
    } else if (e.vx < 0) {
      const tx = Math.floor(e.x / TILE);
      for (let ty = top; ty <= bot; ty++) {
        if (isSolid(tx, ty)) { e.x = (tx + 1) * TILE; e.vx = 0; return true; }
      }
    }
    return false;
  }

  // Retorna o bloco atingido com a cabeça (ou null)
  function moveY(e) {
    e.y += e.vy;
    e.onGround = false;
    const l = Math.floor(e.x / TILE);
    const r = Math.floor((e.x + e.w - 1) / TILE);
    if (e.vy > 0) {
      const ty = Math.floor((e.y + e.h - 1) / TILE);
      for (let tx = l; tx <= r; tx++) {
        if (isSolid(tx, ty)) { e.y = ty * TILE - e.h; e.vy = 0; e.onGround = true; break; }
      }
    } else if (e.vy < 0) {
      const ty = Math.floor(e.y / TILE);
      const c = Math.floor((e.x + e.w / 2) / TILE);
      let hit = null;
      if (isSolid(c, ty)) hit = c;
      else for (let tx = l; tx <= r; tx++) if (isSolid(tx, ty)) { hit = tx; break; }
      if (hit !== null) {
        e.y = (ty + 1) * TILE;
        e.vy = 0;
        return { tx: hit, ty };
      }
    }
    return null;
  }

  // ================= PONTUAÇÃO =================
  function addScore(n, x, y) {
    score += n;
    effects.push({ kind: 'text', text: String(n), x, y, t: 45 });
  }
  function addCoin() {
    coins++;
    score += 200;
    sfx.coin();
    if (coins >= 100) {
      coins -= 100;
      lives++;
      sfx.oneUp();
    }
  }

  // ================= BLOCOS =================
  function hitBlock(tx, ty) {
    const t = tileAt(tx, ty);
    const bx = tx * TILE, by = ty * TILE;
    if (t === '?') {
      map[ty][tx] = 'U';
      addCoin();
      effects.push({ kind: 'coin', x: bx + 16, y: by - 8, vy: -9, t: 30 });
      bumps.push({ tx, ty, t: 10 });
    } else if (t === 'M') {
      map[ty][tx] = 'U';
      items.push({ x: bx + 2, y: by, w: 28, h: 28, vx: 0, vy: 0, rise: 28 });
      bumps.push({ tx, ty, t: 10 });
      sfx.sprout();
    } else if (t === 'B') {
      if (player.big) {
        map[ty][tx] = '.';
        score += 50;
        sfx.brick();
        for (const [dx, dy, vx, vy] of [[0, 0, -2.5, -9], [16, 0, 2.5, -9], [0, 16, -2, -6], [16, 16, 2, -6]]) {
          effects.push({ kind: 'debris', x: bx + dx, y: by + dy, vx, vy, t: 70 });
        }
      } else {
        bumps.push({ tx, ty, t: 10 });
        sfx.bump();
      }
    } else {
      sfx.bump();
    }
    // inimigos em cima do bloco são derrubados
    for (const e of enemies) {
      if (e.alive && !e.flipped && !e.squash &&
          Math.abs(e.y + e.h - by) < 6 && e.x + e.w > bx && e.x < bx + TILE) {
        flipEnemy(e);
      }
    }
  }

  function flipEnemy(e) {
    e.flipped = true;
    e.vy = -7;
    e.vx = e.x < player.x ? -1.5 : 1.5;
    addScore(100, e.x, e.y);
    sfx.stomp();
  }

  // ================= JOGADOR =================
  function grow() {
    const p = player;
    if (!p.big) {
      p.big = true;
      p.y -= 28;
      p.h = 58;
    }
    sfx.power();
  }

  function hurt() {
    const p = player;
    if (p.big) {
      p.big = false;
      p.y += 28;
      p.h = 30;
      p.inv = 120;
      sfx.hurt();
    } else {
      die();
    }
  }

  function die() {
    if (state !== 'play') return;
    state = 'dying';
    deathT = 0;
    const p = player;
    p.big = false;
    p.y += p.h - 30;
    p.h = 30;
    p.vx = 0;
    p.vy = p.y > H ? 0 : -10;
    sfx.die();
  }

  function updatePlayer() {
    const p = player;
    const maxV = input.run ? 5.5 : 3.2;

    if (input.left && !input.right) {
      p.vx -= p.onGround ? 0.3 : 0.2;
      p.facing = -1;
    } else if (input.right && !input.left) {
      p.vx += p.onGround ? 0.3 : 0.2;
      p.facing = 1;
    } else {
      p.vx *= p.onGround ? 0.85 : 0.97;
      if (Math.abs(p.vx) < 0.1) p.vx = 0;
    }
    if (p.vx > maxV) p.vx = Math.max(maxV, p.vx - 0.5);
    if (p.vx < -maxV) p.vx = Math.min(-maxV, p.vx + 0.5);

    if (input.jump && !p.jumpHeld && p.onGround) {
      p.vy = -(10.5 + Math.abs(p.vx) * 0.35);
      p.onGround = false;
      sfx.jump();
    }
    p.jumpHeld = input.jump;

    // pulo variável: segurar o botão = pulo mais alto
    p.vy += input.jump && p.vy < 0 ? 0.4 : 0.9;
    if (p.vy > 13) p.vy = 13;

    moveX(p);
    if (p.x < cam) { p.x = cam; if (p.vx < 0) p.vx = 0; }
    const head = moveY(p);
    if (head) hitBlock(head.tx, head.ty);

    // moedas soltas
    const l = Math.floor(p.x / TILE), r = Math.floor((p.x + p.w - 1) / TILE);
    const t = Math.floor(p.y / TILE), b = Math.floor((p.y + p.h - 1) / TILE);
    for (let ty = t; ty <= b; ty++) {
      for (let tx = l; tx <= r; tx++) {
        if (tileAt(tx, ty) === 'C') { map[ty][tx] = '.'; addCoin(); }
      }
    }

    if (p.inv > 0) p.inv--;
    p.anim += Math.abs(p.vx);

    if (p.y > H + 20) { die(); return; }

    // câmera (só avança, como no clássico)
    const target = p.x - W * 0.4;
    if (target > cam) cam = Math.min(target, cols * TILE - W);

    // mastro da bandeira
    if (p.x + p.w >= level.flagX * TILE + 14) startFlag();
  }

  // ================= INIMIGOS =================
  function updateEnemies() {
    const p = player;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (!e.active) {
        if (e.x < cam + W + TILE) e.active = true;
        else continue;
      }
      if (e.squash > 0) { if (--e.squash === 0) e.alive = false; continue; }
      if (e.flipped) {
        e.vy += 0.5;
        e.y += e.vy;
        e.x += e.vx;
        if (e.y > H + 64) e.alive = false;
        continue;
      }

      e.vy = Math.min(e.vy + 0.6, 12);
      const dir = e.vx;
      if (moveX(e)) e.vx = -dir;
      moveY(e);
      if (e.y > H || e.x + e.w < cam - 96) { e.alive = false; continue; }

      if (state === 'play' && overlap(p, e)) {
        if (p.vy > 0 && p.y + p.h - e.y < 18) {
          e.squash = 30;
          p.vy = input.jump ? -11 : -7;
          addScore(100, e.x, e.y);
          sfx.stomp();
        } else if (p.inv === 0) {
          hurt();
        }
      }
    }

    // inimigos batendo entre si
    for (let i = 0; i < enemies.length; i++) {
      const a = enemies[i];
      if (!a.alive || !a.active || a.flipped || a.squash) continue;
      for (let j = i + 1; j < enemies.length; j++) {
        const b = enemies[j];
        if (!b.alive || !b.active || b.flipped || b.squash) continue;
        if (overlap(a, b)) {
          a.vx = a.x < b.x ? -1 : 1;
          b.vx = -a.vx;
        }
      }
    }
  }

  // ================= ITENS (cogumelo) =================
  function updateItems() {
    for (const m of items) {
      if (m.dead) continue;
      if (m.rise > 0) {
        m.y -= 1;
        if (--m.rise === 0) m.vx = 2;
        continue;
      }
      m.vy = Math.min(m.vy + 0.6, 12);
      const dir = m.vx;
      if (moveX(m)) m.vx = -dir;
      moveY(m);
      if (m.y > H) m.dead = true;
      if (state === 'play' && overlap(player, m)) {
        m.dead = true;
        grow();
        addScore(1000, m.x, m.y);
      }
    }
    items = items.filter((m) => !m.dead);
  }

  // ================= EFEITOS =================
  function updateEffects() {
    for (const f of effects) {
      f.t--;
      if (f.kind === 'coin') {
        f.y += f.vy;
        f.vy += 0.6;
        if (f.t === 0) effects.push({ kind: 'text', text: '200', x: f.x - 12, y: f.y, t: 35 });
      } else if (f.kind === 'debris') {
        f.x += f.vx;
        f.y += f.vy;
        f.vy += 0.5;
      } else if (f.kind === 'text') {
        f.y -= 0.8;
      }
    }
    effects = effects.filter((f) => f.t > 0);
    for (const b of bumps) b.t--;
    bumps = bumps.filter((b) => b.t > 0);
  }

  // ================= BANDEIRA / VITÓRIA =================
  function startFlag() {
    const p = player;
    state = 'flag';
    flag.phase = 0;
    p.vx = 0;
    p.vy = 0;
    p.x = level.flagX * TILE + 16 - p.w;
    const height = 13 * TILE - (p.y + p.h);
    const pts = height > 250 ? 5000 : height > 180 ? 2000 : height > 120 ? 800 : height > 60 ? 400 : 100;
    addScore(pts, p.x + 20, p.y);
    sfx.flag();
  }

  function updateFlag() {
    const p = player;
    const ground = 13 * TILE;
    if (flag.phase === 0) {
      if (p.y + p.h < ground) p.y = Math.min(p.y + 4, ground - p.h);
      if (flag.y < 11 * TILE) flag.y += 4;
      if (p.y + p.h >= ground && flag.y >= 11 * TILE) flag.phase = 1;
    } else if (flag.phase === 1) {
      p.facing = 1;
      p.vx = 2;
      p.vy = Math.min(p.vy + 0.9, 13);
      moveX(p);
      moveY(p);
      p.anim += 2;
      const target = p.x - W * 0.4;
      if (target > cam) cam = Math.min(target, cols * TILE - W);
      if (p.x + p.w / 2 >= level.castleX * TILE + 2.5 * TILE) {
        p.hidden = true;
        flag.phase = 2;
      }
    } else if (flag.phase === 2) {
      if (time > 0) {
        const d = Math.min(time, 2);
        time -= d;
        score += d * 50;
        if (frame % 3 === 0) beep(1400, 0.03, 'square', 0.03);
      } else {
        state = 'win';
      }
    }
  }

  // ================= LOOP DE ATUALIZAÇÃO =================
  function update() {
    frame++;
    if (state === 'play') {
      updatePlayer();
      if (state === 'play' || state === 'flag') {
        updateEnemies();
        updateItems();
      }
      if (++timeTick >= 24) {
        timeTick = 0;
        time--;
        if (time <= 0) { time = 0; die(); }
      }
    } else if (state === 'dying') {
      deathT++;
      if (deathT > 30) {
        player.vy += 0.5;
        player.y += player.vy;
      }
      if (deathT > 170) {
        lives--;
        if (lives <= 0) state = 'gameover';
        else { resetLevel(); state = 'play'; }
      }
    } else if (state === 'flag') {
      updateFlag();
      updateEnemies();
    }
    updateEffects();
  }

  // ================= DESENHO: CENÁRIO =================
  const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

  function hill(x, wT, hT) {
    const cx = x + (wT * TILE) / 2, base = 13 * TILE;
    ctx.fillStyle = '#00a800';
    ctx.strokeStyle = '#005800';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, base, (wT * TILE) / 2, hT * TILE, 0, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
    rect(cx - 10, base - hT * TILE + 26, 4, 10, '#005800');
    rect(cx + 6, base - hT * TILE + 26, 4, 10, '#005800');
  }

  function cloud(x, y, n) {
    ctx.fillStyle = '#fff';
    const puff = (cx, cy, r) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); };
    for (let i = 0; i < n; i++) puff(x + 28 + i * 32, y + 14, 18);
    puff(x + 14, y + 26, 14);
    puff(x + 42 + (n - 1) * 32, y + 26, 14);
    ctx.fillRect(x + 14, y + 22, 28 + (n - 1) * 32, 18);
  }

  function bush(x, n) {
    const base = 13 * TILE;
    ctx.fillStyle = '#58d858';
    const puff = (cx, cy, r) => { ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0); ctx.fill(); };
    for (let i = 0; i < n; i++) puff(x + 28 + i * 32, base - 10, 18);
    puff(x + 14, base - 4, 14);
    puff(x + 42 + (n - 1) * 32, base - 4, 14);
    ctx.fillRect(x + 14, base - 10, 28 + (n - 1) * 32, 10);
  }

  function drawBackground() {
    rect(0, 0, W, H, '#5c94fc');
    const start = Math.floor(cam / TILE) - 10;
    const end = start + Math.ceil(W / TILE) + 20;
    for (let tx = start; tx < end; tx++) {
      const m = ((tx % 48) + 48) % 48;
      const x = tx * TILE - cam;
      if (m === 0) hill(x, 5, 2.4);
      if (m === 16) hill(x, 3, 1.3);
      if (m === 8 || m === 36) cloud(x, 2 * TILE, 1);
      if (m === 19) cloud(x, TILE, 3);
      if (m === 27) cloud(x, 2 * TILE, 2);
      if (m === 11) bush(x, 3);
      if (m === 23) bush(x, 1);
      if (m === 41) bush(x, 2);
    }
  }

  // ================= DESENHO: TILES =================
  const isPipe = (t) => t === 'P' || t === 'T';

  function bevel(x, y, base, light, dark) {
    rect(x, y, TILE, TILE, base);
    rect(x, y, TILE, 3, light);
    rect(x, y, 3, TILE, light);
    rect(x, y + TILE - 3, TILE, 3, dark);
    rect(x + TILE - 3, y, 3, TILE, dark);
  }

  function drawTile(t, tx, ty, x, y) {
    switch (t) {
      case '#': {
        bevel(x, y, '#c84c0c', '#fcbcb0', '#5a1e00');
        rect(x + 14, y + 3, 2, 12, '#5a1e00');
        rect(x + 3, y + 15, 26, 2, '#5a1e00');
        rect(x + 22, y + 17, 2, 12, '#5a1e00');
        break;
      }
      case 'B': {
        rect(x, y, TILE, TILE, '#c84c0c');
        rect(x, y, TILE, 2, '#fcbcb0');
        const m = '#3a1400';
        for (let r = 0; r < 4; r++) {
          rect(x, y + r * 8 + 6, TILE, 2, m);
          if (r % 2 === 0) rect(x + 15, y + r * 8, 2, 8, m);
          else { rect(x + 7, y + r * 8, 2, 8, m); rect(x + 23, y + r * 8, 2, 8, m); }
        }
        break;
      }
      case '?':
      case 'M': {
        const glow = ['#f8b800', '#fcd850', '#f8b800', '#d89000'][Math.floor(frame / 10) % 4];
        rect(x, y, TILE, TILE, '#9c4a00');
        rect(x + 2, y + 2, TILE - 4, TILE - 4, glow);
        for (const [dx, dy] of [[4, 4], [25, 4], [4, 25], [25, 25]]) rect(x + dx, y + dy, 3, 3, '#9c4a00');
        ctx.fillStyle = '#9c4a00';
        ctx.font = `bold 16px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('?', x + 17, y + 25);
        break;
      }
      case 'U': {
        rect(x, y, TILE, TILE, '#3a1400');
        rect(x + 2, y + 2, TILE - 4, TILE - 4, '#9c4a00');
        for (const [dx, dy] of [[4, 4], [25, 4], [4, 25], [25, 25]]) rect(x + dx, y + dy, 3, 3, '#3a1400');
        break;
      }
      case 'S':
        bevel(x, y, '#c84c0c', '#fcbcb0', '#5a1e00');
        rect(x + 6, y + 6, TILE - 12, TILE - 12, '#b04000');
        break;
      case 'T': {
        const left = !isPipe(tileAt(tx - 1, ty));
        const x0 = left ? x - 3 : x;
        rect(x0, y, TILE + 3, TILE, '#005800');
        rect(x0 + (left ? 3 : 0), y + 3, TILE - (left ? 0 : 3), TILE - 6, '#00a800');
        if (left) { rect(x + 3, y + 3, 6, TILE - 6, '#80d010'); rect(x + 12, y + 3, 3, TILE - 6, '#80d010'); }
        else rect(x + 20, y + 3, 6, TILE - 6, '#006800');
        break;
      }
      case 'P': {
        const left = !isPipe(tileAt(tx - 1, ty));
        if (left) {
          rect(x + 2, y, TILE - 2, TILE, '#005800');
          rect(x + 5, y, TILE - 5, TILE, '#00a800');
          rect(x + 8, y, 6, TILE, '#80d010');
          rect(x + 17, y, 3, TILE, '#80d010');
        } else {
          rect(x, y, TILE - 2, TILE, '#005800');
          rect(x, y, TILE - 5, TILE, '#00a800');
          rect(x + 14, y, 6, TILE, '#006800');
        }
        break;
      }
      case 'C': {
        const sw = Math.abs(Math.cos(frame / 12)) * 8 + 2;
        ctx.fillStyle = '#f8d000';
        ctx.strokeStyle = '#9c4a00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x + 16, y + 16, sw, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      }
    }
  }

  function drawTiles() {
    const start = Math.max(0, Math.floor(cam / TILE));
    const end = Math.min(cols - 1, start + Math.ceil(W / TILE) + 1);
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = start; tx <= end; tx++) {
        const t = map[ty][tx];
        if (t === '.') continue;
        let off = 0;
        const b = bumps.find((bb) => bb.tx === tx && bb.ty === ty);
        if (b) off = -Math.sin(((10 - b.t) / 10) * Math.PI) * 10;
        drawTile(t, tx, ty, Math.round(tx * TILE - cam), ty * TILE + off);
      }
    }
  }

  // ================= DESENHO: CASTELO E BANDEIRA =================
  function drawCastle() {
    const x = Math.round(level.castleX * TILE - cam);
    const base = 13 * TILE;
    if (x > W || x + 5 * TILE < 0) return;
    const brick = (bx, by, bw, bh) => {
      rect(bx, by, bw, bh, '#c84c0c');
      for (let yy = by; yy < by + bh; yy += 16) {
        rect(bx, yy, bw, 2, '#3a1400');
        const shift = ((yy - by) / 16) % 2 ? 16 : 0;
        for (let xx = bx + shift; xx < bx + bw; xx += 32) rect(xx, yy, 2, 16, '#3a1400');
      }
    };
    brick(x, base - 3 * TILE, 5 * TILE, 3 * TILE);
    for (let i = 0; i < 5; i++) brick(x + i * TILE + 4, base - 3 * TILE - 16, 24, 16);
    brick(x + TILE, base - 5 * TILE, 3 * TILE, 2 * TILE);
    for (let i = 0; i < 3; i++) brick(x + TILE + i * TILE + 4, base - 5 * TILE - 16, 24, 16);
    // porta e janelas
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(x + 2 * TILE, base);
    ctx.lineTo(x + 2 * TILE, base - TILE);
    ctx.arc(x + 2.5 * TILE, base - TILE, TILE / 2, Math.PI, 0);
    ctx.lineTo(x + 3 * TILE, base);
    ctx.fill();
    rect(x + 1.5 * TILE, base - 4.5 * TILE, 14, 28, '#000');
    rect(x + 3.5 * TILE - 14, base - 4.5 * TILE, 14, 28, '#000');
  }

  function drawFlag() {
    const px = Math.round(level.flagX * TILE + 14 - cam);
    if (px < -60 || px > W + 60) return;
    rect(px, 3 * TILE, 4, 10 * TILE, '#9ae05a');
    rect(px + 1, 3 * TILE, 1, 10 * TILE, '#d8ffc0');
    ctx.fillStyle = '#00a800';
    ctx.beginPath();
    ctx.arc(px + 2, 3 * TILE - 6, 8, 0, Math.PI * 2);
    ctx.fill();
    const fy = flag.y;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(px, fy);
    ctx.lineTo(px - 36, fy + 2);
    ctx.lineTo(px, fy + 30);
    ctx.fill();
    ctx.fillStyle = '#00a800';
    ctx.beginPath();
    ctx.arc(px - 11, fy + 12, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // ================= DESENHO: PERSONAGENS =================
  function drawPlayer() {
    const p = player;
    if (p.hidden) return;
    if (p.inv > 0 && Math.floor(p.inv / 4) % 2 === 0) return;
    const VH = p.h + 2;
    const cx = Math.round(p.x - cam + p.w / 2);
    const top = Math.round(p.y + p.h - VH);
    ctx.save();
    ctx.translate(cx, top);
    ctx.scale(p.facing, 1);

    const RED = '#e52521', SKIN = '#fcb888', BROWN = '#6b3a10', BLUE = '#2448d8', YEL = '#f8d000';
    const dead = state === 'dying';

    // boné
    rect(-8, 0, 15, 5, RED);
    rect(-8, 4, 20, 3, RED);
    // rosto
    rect(-7, 7, 15, 9, SKIN);
    rect(-8, 7, 5, 7, BROWN);
    rect(3, 8, 2, 4, '#000');
    rect(8, 9, 3, 3, SKIN);
    rect(2, 12, 8, 2, BROWN);

    // corpo
    const b = VH - 16, y0 = 16;
    const moving = p.onGround && Math.abs(p.vx) > 0.2;
    const walk = moving ? Math.floor(p.anim / 10) % 3 : 0;
    const air = !p.onGround && !dead;
    rect(-9, y0, 18, b * 0.5, RED);
    rect(-6, y0 + b * 0.15, 12, b * 0.55, BLUE);
    rect(-5, y0 + b * 0.2, 2, 2, YEL);
    rect(3, y0 + b * 0.2, 2, 2, YEL);
    // braços
    if (air || dead) {
      rect(-12, y0 - 4, 4, 5, SKIN);
      rect(8, y0 - 4, 4, 5, SKIN);
    } else {
      rect(-12, y0 + b * 0.35, 4, 5, SKIN);
      rect(8, y0 + b * 0.35, 4, 5, SKIN);
    }
    // pernas
    const legY = y0 + b * 0.65, legH = b * 0.35 - 4;
    let lo = 0, ro = 0;
    if (air) { lo = -3; ro = 3; }
    else if (walk === 1) { lo = -3; ro = 2; }
    else if (walk === 2) { lo = 2; ro = -3; }
    rect(-7 + lo, legY, 6, legH, BLUE);
    rect(1 + ro, legY, 6, legH, BLUE);
    rect(-9 + lo, VH - 4, 8, 4, BROWN);
    rect(1 + ro, VH - 4, 9, 4, BROWN);
    ctx.restore();
  }

  function drawGoomba(e) {
    const cx = Math.round(e.x - cam + e.w / 2);
    if (cx < -40 || cx > W + 40) return;
    ctx.save();
    if (e.flipped) {
      ctx.translate(cx, Math.round(e.y));
      ctx.scale(1, -1);
    } else {
      ctx.translate(cx, Math.round(e.y + e.h));
    }

    if (e.squash) {
      ctx.fillStyle = '#b5651d';
      ctx.beginPath();
      ctx.ellipse(0, -6, 15, 6, 0, Math.PI, 0);
      ctx.fill();
      rect(-12, -4, 24, 4, '#000');
      ctx.restore();
      return;
    }

    const step = Math.floor(frame / 10) % 2 ? 3 : -3;
    // pés
    ctx.fillStyle = '#1a0a00';
    ctx.beginPath();
    ctx.ellipse(-7 + step, -3, 7, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(7 - step, -3, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // corpo
    rect(-7, -12, 14, 8, '#f0c890');
    // cabeça
    ctx.fillStyle = '#b5651d';
    ctx.beginPath();
    ctx.ellipse(0, -15, 15, 12, 0, Math.PI, 0);
    ctx.fill();
    rect(-15, -15, 30, 4, '#b5651d');
    // olhos
    rect(-8, -21, 5, 7, '#fff');
    rect(3, -21, 5, 7, '#fff');
    rect(-6, -19, 2, 4, '#000');
    rect(4, -19, 2, 4, '#000');
    // sobrancelhas
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -25); ctx.lineTo(-3, -22);
    ctx.moveTo(10, -25); ctx.lineTo(3, -22);
    ctx.stroke();
    ctx.restore();
  }

  function drawMushroom(m) {
    const x = Math.round(m.x - cam), y = Math.round(m.y);
    rect(x + 7, y + 14, 14, 14, '#f0d8a8');
    rect(x + 10, y + 17, 2, 5, '#000');
    rect(x + 16, y + 17, 2, 5, '#000');
    ctx.fillStyle = '#e52521';
    ctx.beginPath();
    ctx.ellipse(x + 14, y + 15, 14, 14, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + 14, y + 7, 4, 0, Math.PI * 2);
    ctx.arc(x + 5, y + 12, 3, 0, Math.PI * 2);
    ctx.arc(x + 23, y + 12, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawEffects() {
    for (const f of effects) {
      const x = Math.round(f.x - cam);
      if (f.kind === 'coin') {
        ctx.fillStyle = '#f8d000';
        ctx.beginPath();
        ctx.ellipse(x, f.y, Math.abs(Math.cos(frame / 3)) * 7 + 2, 11, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (f.kind === 'debris') {
        rect(x, f.y, 12, 12, '#c84c0c');
        rect(x, f.y, 12, 2, '#3a1400');
      } else if (f.kind === 'text') {
        ctx.fillStyle = '#fff';
        ctx.font = `10px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.fillText(f.text, x, f.y);
      }
    }
  }

  // ================= DESENHO: HUD E TELAS =================
  function shadowText(text, x, y, size, color = '#fff', align = 'left') {
    ctx.font = `${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.fillStyle = '#000';
    ctx.fillText(text, x + 2, y + 2);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function drawHUD() {
    shadowText('MARIO', 20, 28, 14);
    shadowText(String(score).padStart(6, '0'), 20, 50, 14);
    ctx.fillStyle = '#f8d000';
    ctx.beginPath();
    ctx.ellipse(232, 43, 5, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    shadowText('x' + String(coins).padStart(2, '0'), 244, 50, 14);
    shadowText('MUNDO', 390, 28, 14);
    shadowText(' 1-1', 390, 50, 14);
    shadowText('TEMPO', 560, 28, 14);
    shadowText(String(Math.max(0, time)).padStart(3, '0'), 574, 50, 14);
    shadowText('VIDAS', 706, 28, 14);
    shadowText('x' + lives, 720, 50, 14);
  }

  function overlay(alpha = 0.55) {
    rect(0, 0, W, H, `rgba(0,0,0,${alpha})`);
  }

  function drawScreens() {
    const blink = Math.floor(performance.now() / 500) % 2 === 0;
    if (state === 'title') {
      overlay(0.45);
      shadowText('SUPER MARIO', W / 2, 170, 40, '#e52521', 'center');
      shadowText('JS', W / 2, 225, 32, '#f8d000', 'center');
      if (blink) shadowText('PRESSIONE ENTER OU TOQUE', W / 2, 300, 14, '#fff', 'center');
      shadowText('SETAS: MOVER  ESPACO: PULAR  SHIFT: CORRER', W / 2, 360, 10, '#cfd8ff', 'center');
      shadowText('PISE NOS INIMIGOS E CHEGUE A BANDEIRA!', W / 2, 390, 10, '#cfd8ff', 'center');
    } else if (state === 'paused') {
      overlay(0.4);
      shadowText('PAUSADO', W / 2, H / 2, 28, '#fff', 'center');
      shadowText('ENTER PARA CONTINUAR', W / 2, H / 2 + 44, 12, '#cfd8ff', 'center');
    } else if (state === 'gameover') {
      overlay(0.8);
      shadowText('GAME OVER', W / 2, H / 2 - 10, 36, '#e52521', 'center');
      shadowText('PONTOS: ' + score, W / 2, H / 2 + 40, 14, '#fff', 'center');
      if (blink) shadowText('ENTER PARA JOGAR DE NOVO', W / 2, H / 2 + 90, 12, '#f8d000', 'center');
    } else if (state === 'win') {
      overlay(0.6);
      shadowText('PARABENS!', W / 2, H / 2 - 40, 36, '#f8d000', 'center');
      shadowText('FASE CONCLUIDA', W / 2, H / 2 + 5, 16, '#fff', 'center');
      shadowText('PONTOS: ' + score, W / 2, H / 2 + 45, 14, '#fff', 'center');
      if (blink) shadowText('ENTER PARA JOGAR DE NOVO', W / 2, H / 2 + 95, 12, '#cfd8ff', 'center');
    }
  }

  function draw() {
    drawBackground();
    drawCastle();
    for (const m of items) drawMushroom(m); // atrás dos blocos (efeito de "brotar")
    drawTiles();
    drawFlag();
    for (const e of enemies) if (e.alive && e.active) drawGoomba(e);
    drawPlayer();
    drawEffects();
    drawHUD();
    drawScreens();
  }

  // ================= LOOP PRINCIPAL (60 FPS fixo) =================
  const STEP = 1000 / 60;
  let last = performance.now();
  let acc = 0;
  function loop(now) {
    acc += Math.min(now - last, 250);
    last = now;
    while (acc >= STEP) {
      if (state !== 'paused' && state !== 'title') update();
      acc -= STEP;
    }
    draw();
    requestAnimationFrame(loop);
  }

  resetLevel();
  requestAnimationFrame(loop);
})();
