/*
  game.js
  Main game loop, state machine (title, levelintro, playing, paused, bossintro,
  boss, gameover, victory), camera, collisions, HUD, and all procedural
  Canvas background rendering. Ties together entities.js, player.js, levels.js,
  bosses.js and facts.js.
*/

const CANVAS_W = 960, CANVAS_H = 540;

const CAMPAIGN = (() => {
  const seq = [];
  for (let i = 0; i < 10; i++) {
    seq.push({ type: 'level', idx: i });
    if ((i + 1) % 2 === 0) seq.push({ type: 'boss', idx: (i + 1) / 2 - 1 });
  }
  seq.push({ type: 'victory' });
  return seq;
})();

const Game = {
  canvas: null, ctx: null,
  state: 'title',
  campaignPos: 0,
  lives: 3, score: 0,
  unlockedBonusFacts: [],
  treasureCount: 0,
  currentLevel: null,
  currentBossDef: null, bossState: null, bossDefeatTimer: 0,
  player: null,
  camera: { x: 0, y: 0 },
  particles: [],
  projectiles: [],
  gemPopup: null,
  toast: null,
  keys: {}, prevKeys: {},
  t: 0, lastTime: 0,
  levelElapsed: 0,
  introTimeout: null,
  prevOnGround: false,
  prevState: 'playing',
  isTouch: false,
  deathTimer: 0,
  continuesLeft: 3,
};

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------- init ----------------
window.addEventListener('load', init);

function init() {
  Game.canvas = document.getElementById('game-canvas');
  Game.ctx = Game.canvas.getContext('2d');

  window.addEventListener('keydown', (e) => {
    Game.keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    handleKeyAction(e.code);
  });
  window.addEventListener('keyup', (e) => { Game.keys[e.code] = false; });

  const btnStart = document.getElementById('btn-start');
  if (btnStart) btnStart.addEventListener('click', () => setState('instructions'));
  const btnBegin = document.getElementById('btn-begin');
  if (btnBegin) btnBegin.addEventListener('click', startNewRun);
  const btnRetry = document.getElementById('btn-retry');
  if (btnRetry) btnRetry.addEventListener('click', retryGame);
  const btnAgain = document.getElementById('btn-playagain');
  if (btnAgain) btnAgain.addEventListener('click', backToTitle);
  const btnResume = document.getElementById('btn-resume');
  if (btnResume) btnResume.addEventListener('click', togglePause);

  // level/boss intro cards have no button -- any tap on the card dismisses them,
  // mirroring the "press any key" keyboard behavior for touch-only devices
  const introScreen = document.getElementById('screen-intro');
  if (introScreen) introScreen.addEventListener('click', () => { clearTimeout(Game.introTimeout); dismissIntro(); });
  const bossIntroScreen = document.getElementById('screen-boss-intro');
  if (bossIntroScreen) bossIntroScreen.addEventListener('click', () => { clearTimeout(Game.introTimeout); dismissBossIntro(); });

  setupTouchControls();
  setState('title');
  requestAnimationFrame(loop);
}

// ---------------- touch controls ----------------
function setupTouchControls() {
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const panel = document.getElementById('touch-controls');
  if (!isTouch || !panel) return;
  Game.isTouch = true;

  const bind = (id, keyCode) => {
    const el = document.getElementById(id);
    if (!el) return;
    const press = (e) => { e.preventDefault(); Game.keys[keyCode] = true; el.classList.add('touch-active'); };
    const release = (e) => { if (e) e.preventDefault(); Game.keys[keyCode] = false; el.classList.remove('touch-active'); };
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('pointerleave', release);
  };
  bind('btn-left', 'ArrowLeft');
  bind('btn-right', 'ArrowRight');
  bind('btn-jump', 'Space');
  bind('btn-swipe', 'KeyX');

  const btnPause = document.getElementById('btn-pause-touch');
  if (btnPause) btnPause.addEventListener('click', (e) => { e.preventDefault(); togglePause(); });
}

function handleKeyAction(code) {
  switch (Game.state) {
    case 'title':
      if (code === 'Space' || code === 'Enter') setState('instructions');
      break;
    case 'instructions':
      if (code === 'Space' || code === 'Enter') startNewRun();
      break;
    case 'levelintro':
      clearTimeout(Game.introTimeout); dismissIntro();
      break;
    case 'bossintro':
      clearTimeout(Game.introTimeout); dismissBossIntro();
      break;
    case 'playing':
    case 'boss':
      if (code === 'Escape' || code === 'KeyP') togglePause();
      break;
    case 'paused':
      if (code === 'Escape' || code === 'KeyP') togglePause();
      break;
    case 'gameover':
      if (code === 'Space' || code === 'Enter') retryGame();
      break;
    case 'victory':
      if (code === 'Space' || code === 'Enter') backToTitle();
      break;
  }
}

// ---------------- state machine ----------------
function setState(newState) {
  Game.state = newState;
  document.querySelectorAll('.screen').forEach((s) => s.classList.add('hidden'));
  const map = {
    title: 'screen-title', instructions: 'screen-instructions', levelintro: 'screen-intro', bossintro: 'screen-boss-intro',
    paused: 'screen-pause', gameover: 'screen-gameover', victory: 'screen-victory',
  };
  if (map[newState]) document.getElementById(map[newState]).classList.remove('hidden');

  const hud = document.getElementById('hud');
  if (['playing', 'paused', 'boss', 'levelintro', 'bossintro'].includes(newState)) hud.classList.remove('hidden');
  else hud.classList.add('hidden');

  const bossWrap = document.getElementById('boss-health-wrap');
  if (newState === 'boss') bossWrap.classList.remove('hidden'); else bossWrap.classList.add('hidden');

  if (Game.isTouch) {
    const touchControls = document.getElementById('touch-controls');
    if (['playing', 'paused', 'boss'].includes(newState)) touchControls.classList.remove('hidden');
    else touchControls.classList.add('hidden');
  }
}

function togglePause() {
  if (Game.state === 'playing' || Game.state === 'boss') {
    Game.prevState = Game.state;
    setState('paused');
  } else if (Game.state === 'paused') {
    setState(Game.prevState);
  }
}

function startNewRun() {
  Game.lives = 3;
  Game.score = 0;
  Game.unlockedBonusFacts = [];
  Game.treasureCount = 0;
  Game.toast = null;
  Game.continuesLeft = 3;
  loadStage(0);
}

// Resumes at the level/boss the player just failed, rather than sending them
// all the way back to level 1 -- costs one of the run's 3 continues.
function continueRun() {
  Game.continuesLeft--;
  Game.lives = 3;
  Game.toast = null;
  loadStage(Game.campaignPos);
}

function retryGame() {
  if (Game.continuesLeft > 0) continueRun();
  else startNewRun();
}
function backToTitle() { setState('title'); }

function loadStage(pos) {
  Game.campaignPos = pos;
  const stage = CAMPAIGN[pos];
  if (stage.type === 'level') loadLevel(stage.idx);
  else if (stage.type === 'boss') loadBoss(stage.idx);
  else if (stage.type === 'victory') showVictory();
}
function advanceCampaign() { loadStage(Game.campaignPos + 1); }

// ---------------- level / boss loading ----------------
function loadLevel(idx) {
  const level = LEVEL_BUILDERS[idx]();
  level.gemsCollected = 0;
  level.checkpointReached = false;
  level.checkpointPos = { x: level.playerStart.x, y: level.playerStart.y };
  level.bonusFactPool = shuffle(FACTS[idx].bonus);
  Game.currentLevel = level;
  Game.currentBossDef = null; Game.bossState = null;
  Game.player = new Player(level.playerStart.x, level.playerStart.y);
  Game.camera = { x: 0, y: 0 };
  Game.projectiles = []; Game.particles = []; Game.gemPopup = null; Game.toast = null;
  Game.levelElapsed = 0;
  Game.prevOnGround = false;
  showLevelIntro(level, idx);
}

function showLevelIntro(level, idx) {
  document.getElementById('intro-title').textContent = `Level ${level.id}: ${level.name}`;
  document.getElementById('intro-fact').textContent = pickRandom(FACTS[idx].intro);
  setState('levelintro');
  clearTimeout(Game.introTimeout);
  Game.introTimeout = setTimeout(dismissIntro, 4500);
}
function dismissIntro() { if (Game.state === 'levelintro') setState('playing'); }

function loadBoss(idx) {
  const def = BOSSES[idx];
  Game.currentBossDef = def;
  Game.bossState = def.init();
  Game.currentLevel = null;
  Game.player = new Player(100, ARENA_GROUND_Y - 46);
  Game.camera = { x: 0, y: 0 };
  Game.projectiles = []; Game.particles = []; Game.gemPopup = null; Game.toast = null;
  Game.bossDefeatTimer = 0;
  Game.prevOnGround = false;
  showBossIntro(def, idx);
}

function showBossIntro(def, idx) {
  document.getElementById('boss-intro-title').textContent = def.name;
  document.getElementById('boss-intro-flavor').textContent = def.flavor + ' — ' + pickRandom(BOSS_FACTS[idx]);
  document.getElementById('boss-intro-tip').textContent = def.tip ? `💡 Tip: ${def.tip}` : '';
  setState('bossintro');
  // No auto-dismiss timer here (unlike the level intro card) -- the boss tip
  // is longer, so the player reads it at their own pace and advances with a
  // key press or tap, via handleKeyAction / the click listener on the card.
  clearTimeout(Game.introTimeout);
}
function dismissBossIntro() { if (Game.state === 'bossintro') setState('boss'); }

function showVictory() {
  setState('victory');
  document.getElementById('victory-score').textContent = `Final Score: ${Game.score}`;
  const n = Game.unlockedBonusFacts.length;
  document.getElementById('victory-facts').textContent =
    `You learned ${n} bonus fact${n === 1 ? '' : 's'} about Guyana on your journey!`;
}

// ---------------- main loop ----------------
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.033, (ts - Game.lastTime) / 1000 || 0);
  Game.lastTime = ts;
  Game.t += dt;

  if (Game.state === 'playing') updatePlaying(dt);
  else if (Game.state === 'boss') updateBoss(dt);

  render();
  updateHUD();
  Game.prevKeys = Object.assign({}, Game.keys);
}

function getInput() {
  const k = Game.keys, pk = Game.prevKeys;
  const jumpDown = !!(k['Space'] || k['ArrowUp'] || k['KeyW']);
  const jumpDownPrev = !!(pk['Space'] || pk['ArrowUp'] || pk['KeyW']);
  const swipeDown = !!(k['KeyX'] || k['ShiftLeft'] || k['ShiftRight']);
  const swipeDownPrev = !!(pk['KeyX'] || pk['ShiftLeft'] || pk['ShiftRight']);
  return {
    left: !!(k['ArrowLeft'] || k['KeyA']),
    right: !!(k['ArrowRight'] || k['KeyD']),
    jump: jumpDown,
    jumpJustPressed: jumpDown && !jumpDownPrev,
    swipeJustPressed: swipeDown && !swipeDownPrev,
  };
}

// ---------------- gameplay update ----------------
function updatePlaying(dt) {
  const level = Game.currentLevel, player = Game.player;
  if (player.dead) { updateDeathPause(dt); return; }
  Game.levelElapsed += dt;

  level.platforms.forEach((p) => p.update(dt, Game.t));
  level.hazards.forEach((h) => h.update(dt, Game.t));

  const world = { player, spawnProjectile: (p) => Game.projectiles.push(p) };
  level.enemies.forEach((e) => e.update(dt, Game.t, world));

  Game.projectiles.forEach((p) => p.update(dt));
  Game.projectiles = Game.projectiles.filter((p) => !p.dead && p.life > 0);

  player.update(dt, getInput(), level.platforms, Game.t);
  if (player.onGround && !Game.prevOnGround) spawnDust(player.x + player.w / 2, player.y + player.h);
  Game.prevOnGround = player.onGround;

  // hazards (instant fail regardless of invincibility)
  for (const hz of level.hazards) {
    if (aabbOverlap(player, hz)) { killPlayerInstant(); break; }
  }
  if (player.y > level.groundY + 400) killPlayerInstant();

  // enemies
  for (const e of level.enemies) {
    if (!e.alive) continue;
    if (!aabbOverlap(player, e)) continue;
    if (player.starPowerTimer > 0) {
      // star power plows through anything on contact, thieves included
      defeatEnemy(e);
      continue;
    }
    if (e.type === 'thief' && e.state === 'patrol') {
      stealFromPlayer(e);
      continue;
    }
    if (player.swipeTimer > 0 && aabbOverlap(player.swipeRect, e)) {
      defeatEnemy(e);
    } else if (player.vy > 0 && (player.y + player.h - e.y) < 22 && e.stompable !== false) {
      defeatEnemy(e);
      player.vy = -420;
    } else {
      hurtPlayerFromContact();
    }
  }

  // collectibles
  for (const c of level.collectibles) {
    if (c.collected) continue;
    if (aabbOverlap(player, c)) collectItem(c, level);
  }

  // projectiles vs player
  for (const p of Game.projectiles) {
    if (p.owner === 'player') continue;
    if (aabbOverlap(player, p)) { hurtPlayerFromContact(); p.dead = true; }
  }

  // checkpoint
  if (!level.checkpointReached && player.x >= level.checkpointX && player.onGround) {
    level.checkpointReached = true;
    level.checkpointPos = { x: player.x, y: player.y };
    spawnBurst(player.x + player.w / 2, player.y, '#FCD116', 10);
  }

  // level end
  if (player.x >= level.endX) completeLevel();

  updateParticles(dt);
  updateGemPopup(dt);
  updateToast(dt);
}

function updateBoss(dt) {
  const def = Game.currentBossDef, boss = Game.bossState, player = Game.player;
  if (player.dead) { updateDeathPause(dt); return; }

  def.arenaPlatforms.forEach((p) => p.update(dt, Game.t));
  const world = { player, spawnProjectile: (p) => Game.projectiles.push(p) };
  def.update(boss, dt, Game.t, world);

  Game.projectiles.forEach((p) => p.update(dt));
  Game.projectiles = Game.projectiles.filter((p) => !p.dead && p.life > 0);

  player.update(dt, getInput(), def.arenaPlatforms, Game.t);
  player.x = clamp(player.x, 10, ARENA_W - player.w - 10);
  if (player.onGround && !Game.prevOnGround) spawnDust(player.x + player.w / 2, player.y + player.h);
  Game.prevOnGround = player.onGround;

  if (!boss.defeated) {
    for (const r of def.getDangerRects(boss)) {
      if (aabbOverlap(player, r)) { hurtPlayerFromContact(); break; }
    }
    for (const p of Game.projectiles) {
      if (p.owner === 'player') continue;
      if (aabbOverlap(player, p)) { hurtPlayerFromContact(); p.dead = true; }
    }
    const targets = def.getVulnerableTargets(boss);
    for (const target of targets) {
      if (player.swipeTimer > 0 && aabbOverlap(player.swipeRect, target)) {
        def.onTargetHit(boss, target.id);
        spawnBurst(target.x + target.w / 2, target.y + target.h / 2, '#FCD116', 10);
        break;
      } else if (player.vy > 0 && aabbOverlap(player, target) && (player.y + player.h - target.y) < 26) {
        def.onTargetHit(boss, target.id);
        player.vy = -420;
        spawnBurst(target.x + target.w / 2, target.y + target.h / 2, '#FCD116', 10);
        break;
      }
    }
    for (const hz of (def.arenaHazards || [])) {
      if (aabbOverlap(player, hz)) { killPlayerInstant(); break; }
    }
    if (player.y > ARENA_GROUND_Y + 300) killPlayerInstant();
  }

  if (boss.defeated) {
    Game.bossDefeatTimer += dt;
    if (Game.bossDefeatTimer > 1.6) {
      Game.bossDefeatTimer = 0;
      addScore(200);
      advanceCampaign();
      return;
    }
  }

  updateParticles(dt);
  updateToast(dt);
}

// ---------------- gameplay helpers ----------------
function addScore(n) { Game.score = Math.max(0, Game.score + n); }

function defeatEnemy(e) {
  const bonus = (e.type === 'thief' && e.hasItem) ? 60 : 30;
  e.stomp();
  addScore(bonus);
  spawnBurst(e.x + e.w / 2, e.y + e.h / 2, '#ffffff', 8);
}

function stealFromPlayer(e) {
  addScore(-20);
  e.hasItem = true;
  e.state = 'fleeing';
  e.dir = (e.x < Game.player.x) ? -1 : 1;
  spawnBurst(e.x + e.w / 2, e.y, '#ff8ad1', 6);
}

const TREASURE_TYPES = ['nugget', 'starapple', 'cassava', 'sugarcane'];
const TREASURE_LIFE_THRESHOLD = 100;
const MAX_LIVES = 6;

function collectItem(c, level) {
  c.collected = true;
  switch (c.type) {
    case 'nugget': addScore(10); break;
    case 'starapple': addScore(15); break;
    case 'cassava': addScore(15); break;
    case 'sugarcane': addScore(20); break;
    case 'cutlass':
      Game.player.grantCutlass(); addScore(5);
      showToast('Cutlass! Press X / Shift to swipe');
      break;
    case 'starpower':
      Game.player.grantStarPower(); addScore(20);
      showToast('Star Power! Touch enemies to defeat them');
      break;
    case 'speedboost':
      Game.player.grantSpeedBoost(); addScore(20);
      showToast('Speed Boost!');
      break;
    case 'extralife':
      Game.lives = Math.min(MAX_LIVES, Game.lives + 1);
      addScore(100);
      showToast('Extra Life!');
      spawnBurst(c.x + c.w / 2, c.y + c.h / 2, '#ff3355', 12);
      break;
    case 'gem':
    case 'firefly':
      addScore(50);
      level.gemsCollected = (level.gemsCollected || 0) + 1;
      showGemFact(level);
      break;
  }
  if (TREASURE_TYPES.includes(c.type)) {
    Game.treasureCount++;
    if (Game.treasureCount % TREASURE_LIFE_THRESHOLD === 0) {
      Game.lives = Math.min(MAX_LIVES, Game.lives + 1);
      showToast(`${TREASURE_LIFE_THRESHOLD} Treasures — Extra Life!`, 3.2);
      spawnBurst(Game.player.x + Game.player.w / 2, Game.player.y, '#ff3355', 14);
    }
  }
  spawnSparkle(c.x + c.w / 2, c.y + c.h / 2);
}

function showGemFact(level) {
  const idx = clamp(level.gemsCollected - 1, 0, level.bonusFactPool.length - 1);
  const fact = level.bonusFactPool[idx];
  Game.gemPopup = { text: fact, timer: 4.2 };
  Game.unlockedBonusFacts.push(fact);
}

function updateGemPopup(dt) {
  if (Game.gemPopup) {
    Game.gemPopup.timer -= dt;
    if (Game.gemPopup.timer <= 0) Game.gemPopup = null;
  }
}

function showToast(text, duration) {
  Game.toast = { text, timer: duration || 2.4 };
}

function updateToast(dt) {
  if (Game.toast) {
    Game.toast.timer -= dt;
    if (Game.toast.timer <= 0) Game.toast = null;
  }
}

function hurtPlayerFromContact() {
  if (Game.player.dead) return;
  if (!Game.player.takeHit()) return;
  triggerDeath('#CE1126');
}

function killPlayerInstant() {
  if (Game.player.dead) return;
  triggerDeath('#1c6fbf');
}

// Freezes normal gameplay for a beat after any death: stops all hazard/enemy
// collision checks (see the `Game.player.dead` guards at the top of
// updatePlaying/updateBoss) so a single fall can't chain into several more
// hits before the respawn actually happens, gives the player a clear "you
// got hit" beat, and only resolves to a respawn or game-over once it's safe.
function triggerDeath(particleColor) {
  Game.lives--;
  spawnBurst(Game.player.x + Game.player.w / 2, Game.player.y + Game.player.h / 2, particleColor, 12);
  Game.player.dead = true;
  Game.player.vx = 0;
  Game.player.vy = -320;
  Game.player.state = 'fall';
  Game.deathTimer = Game.lives <= 0 ? 1.4 : 1.1;
}

function updateDeathPause(dt) {
  Game.deathTimer -= dt;
  Game.player.vy = Math.min(MAX_FALL_SPEED, Game.player.vy + GRAVITY * dt);
  Game.player.y += Game.player.vy * dt;
  updateParticles(dt);
  if (Game.deathTimer <= 0) {
    Game.player.dead = false;
    if (Game.lives <= 0) triggerGameOver();
    else respawnPlayer();
  }
}

function respawnPlayer() {
  if (Game.state === 'boss' || Game.currentBossDef) {
    Game.player.resetForCheckpoint(100, ARENA_GROUND_Y - 46);
  } else if (Game.currentLevel) {
    const pos = Game.currentLevel.checkpointReached ? Game.currentLevel.checkpointPos : Game.currentLevel.playerStart;
    Game.player.resetForCheckpoint(pos.x, pos.y);
  }
}

function triggerGameOver() {
  setState('gameover');
  document.getElementById('gameover-score').textContent = `Score: ${Game.score}`;
  const titleEl = document.getElementById('gameover-title');
  const continuesEl = document.getElementById('gameover-continues');
  const btnRetry = document.getElementById('btn-retry');
  const stageName = Game.currentLevel ? Game.currentLevel.name : (Game.currentBossDef ? Game.currentBossDef.name : '');
  if (Game.continuesLeft > 0) {
    titleEl.textContent = 'Continue?';
    continuesEl.textContent = `${Game.continuesLeft} continue${Game.continuesLeft === 1 ? '' : 's'} left`;
    btnRetry.textContent = `Tap to Continue at ${stageName}`;
  } else {
    titleEl.textContent = 'Game Over';
    continuesEl.textContent = 'Out of continues -- back to the beginning';
    btnRetry.textContent = 'Tap to Start Over';
  }
}

function completeLevel() {
  const timeBonus = Math.max(0, Math.round((100 - Game.levelElapsed) * 3));
  addScore(timeBonus);
  advanceCampaign();
}

// ---------------- particles ----------------
function spawnDust(x, y) {
  for (let i = 0; i < 5; i++) {
    Game.particles.push(new Particle({
      x, y, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 40,
      life: 0.35, color: '#e8d9b0', size: 2 + Math.random() * 2, gravity: 200,
    }));
  }
  trimParticles();
}
function spawnSparkle(x, y) {
  for (let i = 0; i < 8; i++) {
    const ang = Math.random() * Math.PI * 2;
    Game.particles.push(new Particle({
      x, y, vx: Math.cos(ang) * 70, vy: Math.sin(ang) * 70 - 30,
      life: 0.5, color: '#FCD116', size: 2 + Math.random() * 2, gravity: 150,
    }));
  }
  trimParticles();
}
function spawnBurst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 60 + Math.random() * 120;
    Game.particles.push(new Particle({
      x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      life: 0.5 + Math.random() * 0.3, color, size: 2 + Math.random() * 3, gravity: 260,
    }));
  }
  trimParticles();
}
function trimParticles() {
  if (Game.particles.length > 220) Game.particles.splice(0, Game.particles.length - 220);
}
function updateParticles(dt) {
  Game.particles.forEach((p) => p.update(dt));
  Game.particles = Game.particles.filter((p) => p.life > 0);
}

// ---------------- HUD ----------------
function bossHealthFraction(def, boss) {
  if (def.id === 5) {
    const total = 6;
    const done = (boss.phase - 1) * 2 + boss.phaseHits;
    return clamp(1 - done / total, 0, 1);
  }
  return clamp(1 - boss.hitsTaken / boss.hitsRequired, 0, 1);
}

function updateHUD() {
  if (!['playing', 'paused', 'boss', 'levelintro', 'bossintro'].includes(Game.state)) return;
  document.getElementById('hud-lives').textContent = '❤'.repeat(Math.max(0, Game.lives)) + '♡'.repeat(Math.max(0, 3 - Game.lives));
  document.getElementById('hud-score').textContent = `Score: ${Game.score}`;
  const lvlNameEl = document.getElementById('hud-level');
  const gemsEl = document.getElementById('hud-gems');
  if (Game.currentLevel) {
    lvlNameEl.textContent = `${Game.currentLevel.id}. ${Game.currentLevel.name}`;
    gemsEl.textContent = `Gems: ${Game.currentLevel.gemsCollected || 0}/3`;
    gemsEl.classList.remove('hidden');
  } else if (Game.currentBossDef) {
    lvlNameEl.textContent = `Boss Fight: ${Game.currentBossDef.name}`;
    gemsEl.classList.add('hidden');
  }
  if (Game.state === 'boss' && Game.currentBossDef && Game.bossState) {
    document.getElementById('boss-name').textContent = Game.currentBossDef.name;
    const frac = bossHealthFraction(Game.currentBossDef, Game.bossState);
    document.getElementById('boss-health-fill').style.width = `${frac * 100}%`;
  }
  const gp = document.getElementById('gem-popup');
  if (Game.gemPopup) {
    gp.textContent = '💎 ' + Game.gemPopup.text;
    gp.classList.remove('hidden');
  } else {
    gp.classList.add('hidden');
  }

  const toastEl = document.getElementById('toast-popup');
  if (Game.toast) {
    toastEl.textContent = Game.toast.text;
    toastEl.classList.remove('hidden');
  } else {
    toastEl.classList.add('hidden');
  }

  const puEl = document.getElementById('hud-powerups');
  if (Game.player) {
    const pu = [];
    if (Game.player.hasCutlass) pu.push(`🗡${Math.ceil(Game.player.cutlassTimer)}s`);
    if (Game.player.starPowerTimer > 0) pu.push(`⭐${Math.ceil(Game.player.starPowerTimer)}s`);
    if (Game.player.speedBoostTimer > 0) pu.push(`⚡${Math.ceil(Game.player.speedBoostTimer)}s`);
    if (pu.length) {
      puEl.textContent = pu.join('  ');
      puEl.classList.remove('hidden');
    } else {
      puEl.classList.add('hidden');
    }
  }
}

// ---------------- render ----------------
function render() {
  const ctx = Game.ctx;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  if (Game.state === 'title' || Game.state === 'instructions') {
    drawBackground(ctx, LEVELS[0], { x: Game.t * 12, y: 0 }, Game.t);
    return;
  }
  if (['levelintro', 'playing', 'paused'].includes(Game.state) && Game.currentLevel) {
    renderLevel();
    return;
  }
  if (['bossintro', 'boss'].includes(Game.state) && Game.currentBossDef) {
    renderBoss();
    return;
  }
  ctx.fillStyle = '#12210f';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function renderLevel() {
  const ctx = Game.ctx, level = Game.currentLevel, player = Game.player;
  Game.camera.x = clamp(player.x - CANVAS_W / 2 + player.w / 2, 0, Math.max(0, level.width - CANVAS_W));
  Game.camera.y = 0;

  drawBackground(ctx, level, Game.camera, Game.t);
  level.hazards.forEach((h) => h.draw(ctx, Game.camera, Game.t));
  level.platforms.forEach((p) => p.draw(ctx, Game.camera));
  level.collectibles.forEach((c) => c.draw(ctx, Game.camera, Game.t));
  level.enemies.forEach((e) => e.draw(ctx, Game.camera, Game.t));
  Game.projectiles.forEach((p) => p.draw(ctx, Game.camera));
  player.draw(ctx, Game.camera, Game.t);
  Game.particles.forEach((p) => p.draw(ctx, Game.camera));
  drawFlag(ctx, level.endX, level.groundY, Game.camera);
}

function renderBoss() {
  const ctx = Game.ctx, def = Game.currentBossDef, boss = Game.bossState;
  const camera = { x: 0, y: 0 };
  drawBossBackground(ctx, def, Game.t);
  def.arenaPlatforms.forEach((p) => p.draw(ctx, camera));
  if (def.arenaHazards) def.arenaHazards.forEach((h) => h.draw(ctx, camera, Game.t));
  def.draw(ctx, boss, camera, Game.t);
  Game.projectiles.forEach((p) => p.draw(ctx, camera));
  Game.player.draw(ctx, camera, Game.t);
  Game.particles.forEach((p) => p.draw(ctx, camera));
}

function drawFlag(ctx, x, groundY, camera) {
  const sx = x - camera.x;
  if (sx < -40 || sx > 1000) return;
  ctx.save();
  ctx.strokeStyle = '#e8e8e8';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(sx, groundY); ctx.lineTo(sx, groundY - 130); ctx.stroke();
  ctx.fillStyle = '#009E49';
  ctx.beginPath(); ctx.moveTo(sx, groundY - 130); ctx.lineTo(sx + 46, groundY - 112); ctx.lineTo(sx, groundY - 94); ctx.fill();
  ctx.fillStyle = '#FCD116';
  ctx.beginPath(); ctx.arc(sx, groundY - 130, 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---------------- backgrounds ----------------
function drawBackground(ctx, level, camera, t) {
  const p = level.palette;
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, p.sky1);
  grad.addColorStop(1, p.sky2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const sunX = 800 - (camera.x * 0.04) % 900;
  if (level.night) {
    const moonGlow = ctx.createRadialGradient(sunX, 90, 6, sunX, 90, 46);
    moonGlow.addColorStop(0, 'rgba(238,240,255,0.55)');
    moonGlow.addColorStop(1, 'rgba(238,240,255,0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath(); ctx.arc(sunX, 90, 46, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#eef0ff';
    ctx.beginPath(); ctx.arc(sunX, 90, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(200,205,235,0.5)';
    ctx.beginPath(); ctx.arc(sunX - 7, 84, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sunX + 6, 96, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 50; i++) {
      const sxr = (i * 137 - camera.x * 0.08) % 1000;
      const sx2 = sxr < 0 ? sxr + 1000 : sxr;
      const sy2 = (i * 71) % 260 + 10;
      ctx.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(t * 2 + i));
      ctx.fillRect(sx2, sy2, 2, 2);
    }
    ctx.globalAlpha = 1;
  } else {
    const sunGlow = ctx.createRadialGradient(sunX, 85, 8, sunX, 85, 52);
    sunGlow.addColorStop(0, 'rgba(255,246,200,0.65)');
    sunGlow.addColorStop(1, 'rgba(255,246,200,0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath(); ctx.arc(sunX, 85, 52, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FCD116';
    ctx.beginPath(); ctx.arc(sunX, 85, 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(sunX - 8, 76, 9, 0, Math.PI * 2); ctx.fill();
  }

  drawClouds(ctx, camera, level.night);
  drawParallaxLayer(ctx, camera, 0.15, 380, 55, p.accent2, 0.35);
  drawParallaxLayer(ctx, camera, 0.32, 415, 75, p.accent, 0.4);

  drawThemeDecor(ctx, level, camera, t);

  if (level.night) {
    ctx.fillStyle = 'rgba(5,8,24,0.32)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }
}

function drawCloudPuff(ctx, cx, cy, scale) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, 28 * scale, 13 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(cx - 19 * scale, cy + 4 * scale, 18 * scale, 10 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 20 * scale, cy + 5 * scale, 20 * scale, 11 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds(ctx, camera, night) {
  ctx.save();
  ctx.fillStyle = night ? 'rgba(200,205,235,0.10)' : 'rgba(255,255,255,0.8)';
  const spacing = 340;
  const off = camera.x * 0.06;
  const start = Math.floor(off / spacing) * spacing - spacing;
  for (let wx = start; wx < off + CANVAS_W + spacing; wx += spacing) {
    const sx = wx - off;
    const sy = 55 + Math.sin(wx * 0.01) * 18;
    drawCloudPuff(ctx, sx, sy, 1);
  }
  ctx.restore();
}

// Smooths the silhouette by curving through the midpoint of each sample
// pair instead of drawing raw straight segments -- removes the "cut paper"
// jaggedness the old lineTo-only version had.
function drawParallaxLayer(ctx, camera, factor, baseY, amp, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  const off = camera.x * factor;
  const pts = [];
  for (let x = -40; x <= CANVAS_W + 40; x += 24) {
    const worldX = x + off;
    const y = baseY - Math.sin(worldX * 0.006) * amp - Math.sin(worldX * 0.013 + 1) * amp * 0.4;
    pts.push({ x, y });
  }
  ctx.beginPath();
  ctx.moveTo(pts[0].x, CANVAS_H);
  ctx.lineTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.lineTo(last.x, CANVAS_H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function repeatWorld(camera, spacing, levelWidth, fn) {
  const w = levelWidth || 4000;
  const start = Math.floor(camera.x / spacing) * spacing - spacing;
  for (let wx = start; wx < camera.x + CANVAS_W + spacing; wx += spacing) {
    if (wx < -spacing || wx > w + spacing) continue;
    fn(wx - camera.x, wx);
  }
}

// Stylized Stabroek Market clock tower -- the real landmark is a Victorian
// cast-iron structure with a white/cream shaft, a red octagonal roof, and
// four clock faces. sx is already camera-relative.
function drawClockTower(ctx, sx, groundY) {
  if (sx < -80 || sx > 1040) return;
  const towerH = 185;
  const baseY = groundY - 34;
  const topY = baseY - towerH;
  const halfW = 19;
  const clockR = 21;
  ctx.save();
  // shaft, gently shaded for depth
  const shaftGrad = ctx.createLinearGradient(sx - halfW, 0, sx + halfW, 0);
  shaftGrad.addColorStop(0, '#e9e2cf');
  shaftGrad.addColorStop(0.5, '#f7f2e4');
  shaftGrad.addColorStop(1, '#d9d0b8');
  ctx.fillStyle = shaftGrad;
  ctx.fillRect(sx - halfW, topY, halfW * 2, towerH);
  ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1;
  ctx.strokeRect(sx - halfW, topY, halfW * 2, towerH);
  // decorative trim bands
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(sx - halfW, topY + towerH * 0.46, halfW * 2, 3);
  ctx.fillRect(sx - halfW, topY + towerH * 0.82, halfW * 2, 3);
  // clock housing -- a touch wider than the shaft so the bigger face doesn't
  // look like it's overhanging the tower
  ctx.fillStyle = shadeColor('#e9e2cf', -6);
  ctx.beginPath(); ctx.arc(sx, topY + 32, clockR + 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(sx, topY + 32, clockR + 4, 0, Math.PI * 2); ctx.stroke();
  // clock face
  ctx.fillStyle = '#fffdf5';
  ctx.beginPath(); ctx.arc(sx, topY + 32, clockR, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.arc(sx, topY + 32, clockR, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#2a2a2a';
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(sx + Math.sin(ang) * (clockR - 3), topY + 32 - Math.cos(ang) * (clockR - 3), 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  // hands show the player's real, current local time (read straight off the
  // browser's clock), so the tower doubles as a little functioning clock
  const cy = topY + 32;
  const now = new Date();
  const hourAngle = ((now.getHours() % 12) + now.getMinutes() / 60) / 12 * Math.PI * 2;
  const minuteAngle = (now.getMinutes() + now.getSeconds() / 60) / 60 * Math.PI * 2;
  const secondAngle = now.getSeconds() / 60 * Math.PI * 2;
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sx, cy);
  ctx.lineTo(sx + Math.sin(hourAngle) * clockR * 0.5, cy - Math.cos(hourAngle) * clockR * 0.5);
  ctx.stroke();
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(sx, cy);
  ctx.lineTo(sx + Math.sin(minuteAngle) * clockR * 0.76, cy - Math.cos(minuteAngle) * clockR * 0.76);
  ctx.stroke();
  ctx.strokeStyle = '#CE1126';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx, cy);
  ctx.lineTo(sx + Math.sin(secondAngle) * clockR * 0.82, cy - Math.cos(secondAngle) * clockR * 0.82);
  ctx.stroke();
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath(); ctx.arc(sx, cy, 1.6, 0, Math.PI * 2); ctx.fill();
  // red octagonal-ish roof
  ctx.fillStyle = '#CE1126';
  ctx.beginPath();
  ctx.moveTo(sx - 25, topY); ctx.lineTo(sx - 16, topY - 16); ctx.lineTo(sx + 16, topY - 16);
  ctx.lineTo(sx + 25, topY); ctx.lineTo(sx, topY - 45); ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.stroke();
  // gold finial
  ctx.fillStyle = '#FCD116';
  ctx.beginPath(); ctx.arc(sx, topY - 47, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(sx - 1, topY - 45, 2, 7);
  ctx.restore();
}

function drawThemeDecor(ctx, level, camera, t) {
  const p = level.palette;
  ctx.save();
  switch (level.theme) {
    case 'market':
      repeatWorld(camera, 260, level.width, (sx, wx) => {
        const roofColor = wx % 520 === 0 ? '#CE1126' : '#009E49';
        ctx.fillStyle = shadeColor('#8a5a2b', -10);
        ctx.fillRect(sx - 20, 300, 40, 24);
        ctx.fillStyle = '#e8e8e8';
        ctx.fillRect(sx - 20, 300, 40, 4);
        ctx.fillStyle = roofColor;
        ctx.beginPath();
        ctx.moveTo(sx - 24, 300); ctx.lineTo(sx, 270); ctx.lineTo(sx + 24, 300); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1;
        ctx.stroke();
      });
      // kite-flying kids: the string is anchored to a small silhouette on
      // the ground so it reads as "a kid flying a kite", not a stray line
      repeatWorld(camera, 400, level.width, (sx, wx) => {
        const ky = 120 + Math.sin(t + wx) * 15;
        const anchorX = sx - 30, anchorY = level.groundY - 40;
        ctx.strokeStyle = 'rgba(90,90,90,0.65)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx, ky); ctx.lineTo(anchorX, anchorY); ctx.stroke();
        ctx.fillStyle = wx % 800 === 0 ? '#CE1126' : '#FCD116';
        ctx.beginPath(); ctx.moveTo(sx, ky - 12); ctx.lineTo(sx + 10, ky); ctx.lineTo(sx, ky + 12); ctx.lineTo(sx - 10, ky); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
        ctx.stroke();
        // the kid holding the string
        ctx.fillStyle = 'rgba(50,38,26,0.75)';
        ctx.beginPath(); ctx.arc(anchorX, anchorY - 12, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(anchorX - 3, anchorY - 8, 6, 11);
      });
      // Stabroek Market clock tower -- a real Georgetown landmark, placed
      // once as a backdrop the player passes on their way through the level
      drawClockTower(ctx, 1500 - camera.x, level.groundY);
      break;
    case 'river':
      repeatWorld(camera, 500, level.width, (sx) => {
        ctx.fillStyle = shadeColor('#7a5230', -12);
        ctx.fillRect(sx - 40, 250, 80, 24);
        ctx.fillStyle = '#7a5230';
        ctx.fillRect(sx - 40, 250, 80, 18);
        ctx.fillStyle = '#e8e8e8';
        ctx.fillRect(sx - 4, 210, 8, 40);
        ctx.fillStyle = '#CE1126';
        ctx.beginPath(); ctx.moveTo(sx - 4, 210); ctx.lineTo(sx + 22, 220); ctx.lineTo(sx - 4, 230); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx - 44, 292); ctx.lineTo(sx + 44, 292); ctx.stroke();
      });
      break;
    case 'mangrove':
      repeatWorld(camera, 220, level.width, (sx) => {
        ctx.strokeStyle = '#2e4a1e'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx, level.groundY); ctx.quadraticCurveTo(sx - 9, level.groundY + 10, sx - 16, level.groundY + 22);
        ctx.moveTo(sx, level.groundY); ctx.quadraticCurveTo(sx + 9, level.groundY + 10, sx + 16, level.groundY + 22);
        ctx.stroke();
        ctx.fillStyle = shadeColor('#3fa34d', -14);
        ctx.beginPath(); ctx.arc(sx, level.groundY - 26, 24, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3fa34d';
        ctx.beginPath(); ctx.arc(sx - 8, level.groundY - 34, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = shadeColor('#3fa34d', 16);
        ctx.beginPath(); ctx.arc(sx + 7, level.groundY - 38, 13, 0, Math.PI * 2); ctx.fill();
      });
      break;
    case 'canopy':
      repeatWorld(camera, 180, level.width, (sx, wx) => {
        const ly = 80 + Math.sin(wx * 0.02) * 30;
        ctx.fillStyle = shadeColor('#2f6b3a', -12);
        ctx.beginPath(); ctx.arc(sx, ly, 46, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3f8b4a';
        ctx.beginPath(); ctx.arc(sx + 20, ly + 10, 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = shadeColor('#3f8b4a', 20);
        ctx.beginPath(); ctx.arc(sx - 16, ly - 10, 20, 0, Math.PI * 2); ctx.fill();
      });
      break;
    case 'falls': {
      repeatWorld(camera, 900, level.width, (sx) => {
        const mistGrad = ctx.createLinearGradient(sx - 70, 0, sx + 70, 0);
        mistGrad.addColorStop(0, 'rgba(255,255,255,0)');
        mistGrad.addColorStop(0.5, 'rgba(255,255,255,0.6)');
        mistGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = mistGrad;
        ctx.fillRect(sx - 70, 0, 140, CANVAS_H);
      });
      // faint distant rock ledges peeking through the mist
      repeatWorld(camera, 340, level.width, (sx, wx) => {
        ctx.fillStyle = 'rgba(120,120,120,0.25)';
        ctx.beginPath();
        ctx.moveTo(sx - 40, level.groundY);
        ctx.lineTo(sx - 10, level.groundY - 60 + Math.sin(wx) * 10);
        ctx.lineTo(sx + 40, level.groundY);
        ctx.fill();
      });
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      break;
    }
    case 'savannah':
      repeatWorld(camera, 260, level.width, (sx, wx) => {
        ctx.fillStyle = level.night ? 'rgba(10,20,10,0.7)' : shadeColor('#6b8a4a', -8);
        ctx.beginPath();
        ctx.ellipse(sx, level.groundY - 8, 34, 14, 0, 0, Math.PI * 2); ctx.fill();
        if (!level.night) {
          ctx.fillStyle = '#6b8a4a';
          ctx.beginPath(); ctx.ellipse(sx - 8, level.groundY - 12, 20, 9, 0, 0, Math.PI * 2); ctx.fill();
        }
        if (wx % 780 === 0) {
          ctx.fillStyle = 'rgba(10,10,10,0.55)';
          ctx.fillRect(sx - 26, level.groundY - 50, 40, 24);
          ctx.beginPath(); ctx.moveTo(sx - 30, level.groundY - 50); ctx.lineTo(sx - 18, level.groundY - 66); ctx.lineTo(sx - 6, level.groundY - 50); ctx.fill();
        }
      });
      break;
    case 'mining':
      repeatWorld(camera, 420, level.width, (sx, wx) => {
        ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sx - 26, level.groundY); ctx.lineTo(sx, 190); ctx.lineTo(sx + 26, level.groundY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx - 14, level.groundY - 60); ctx.lineTo(sx + 14, level.groundY - 60); ctx.stroke();
        ctx.fillStyle = `rgba(252,209,22,${0.4 + 0.4 * Math.abs(Math.sin(t * 3 + wx))})`;
        ctx.beginPath(); ctx.arc(sx - 8, level.groundY - 20, 2, 0, Math.PI * 2); ctx.fill();
      });
      break;
    case 'camp':
      repeatWorld(camera, 500, level.width, (sx) => {
        ctx.fillStyle = shadeColor('#c9ab6a', -10);
        ctx.beginPath(); ctx.moveTo(sx - 24, level.groundY); ctx.lineTo(sx, level.groundY - 46); ctx.lineTo(sx + 24, level.groundY); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#ff9a2e';
        ctx.beginPath(); ctx.arc(sx + 80, level.groundY - 8, 8 + Math.sin(t * 6) * 2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx + 80, level.groundY - 16);
        ctx.quadraticCurveTo(sx + 86, level.groundY - 30 - Math.sin(t * 2) * 4, sx + 78, level.groundY - 44);
        ctx.stroke();
      });
      break;
    case 'beach':
      repeatWorld(camera, 240, level.width, (sx, wx) => {
        ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, level.groundY + 30, 30, Math.PI, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(120,100,60,0.25)';
        ctx.beginPath(); ctx.arc(sx - 60, level.groundY - 6, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + 40, level.groundY - 12, 1.6, 0, Math.PI * 2); ctx.fill();
        if (wx % 720 === 0) {
          ctx.strokeStyle = '#5a4a2a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(sx, level.groundY); ctx.quadraticCurveTo(sx + 10, level.groundY - 60, sx + 4, level.groundY - 90); ctx.stroke();
          ctx.fillStyle = '#3fa34d';
          for (let i = 0; i < 5; i++) {
            const ang = -Math.PI / 2 + (i - 2) * 0.5;
            ctx.beginPath();
            ctx.ellipse(sx + 4 + Math.cos(ang) * 18, level.groundY - 90 + Math.sin(ang) * 10, 16, 6, ang, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
      break;
    case 'mountains':
      repeatWorld(camera, 480, level.width, (sx) => {
        const rockGrad = ctx.createLinearGradient(sx - 90, 140, sx + 90, level.groundY);
        rockGrad.addColorStop(0, shadeColor('#8fa87f', 12));
        rockGrad.addColorStop(1, shadeColor('#8fa87f', -18));
        ctx.fillStyle = rockGrad;
        ctx.beginPath(); ctx.moveTo(sx - 90, level.groundY); ctx.lineTo(sx, 140); ctx.lineTo(sx + 90, level.groundY); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(sx - 16, 170); ctx.lineTo(sx, 140); ctx.lineTo(sx + 16, 170); ctx.fill();
      });
      break;
  }
  ctx.restore();
}

function drawBossBackground(ctx, def, t) {
  const themes = {
    1: ['#3a2050', '#8a4a6a'],
    2: ['#0e3a4a', '#1c6fbf'],
    3: ['#05081a', '#1a2350'],
    4: ['#1e3a1e', '#3a6b3a'],
    5: ['#4a2a1a', '#c96a3a'],
  };
  const [c1, c2] = themes[def.id] || ['#222', '#444'];
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, c1); grad.addColorStop(1, c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (def.id === 3) {
    const glow = ctx.createRadialGradient(760, 100, 10, 760, 100, 80);
    glow.addColorStop(0, 'rgba(238,240,255,0.6)');
    glow.addColorStop(1, 'rgba(238,240,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(760, 100, 80, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#eef0ff';
    ctx.beginPath(); ctx.arc(760, 100, 46, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 60; i++) {
      ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 2 + i));
      ctx.fillRect((i * 91) % 960, (i * 53) % 300, 2, 2);
    }
    ctx.globalAlpha = 1;
  } else {
    const glow = ctx.createRadialGradient(150, 90, 6, 150, 90, 60);
    glow.addColorStop(0, 'rgba(255,255,255,0.3)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(150, 90, 60, 0, Math.PI * 2); ctx.fill();
  }
}
