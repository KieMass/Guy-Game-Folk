/*
  bosses.js
  Data + behavior for the 5 boss fights. Each boss fight happens in its own
  fixed single-screen arena (960x540, camera does not scroll horizontally).

  Each entry in BOSSES exposes a small, consistent interface that game.js drives:
    init()                          -> fresh runtime state object for the fight
    update(boss, dt, t, world)      -> advance AI (world = {player, spawnProjectile, spawnParticles})
    draw(ctx, boss, camera, t)      -> render the boss
    getDangerRects(boss)            -> array of {x,y,w,h} zones that hurt the player on contact
    getVulnerableTargets(boss)      -> array of {id,x,y,w,h} currently stomp/swipe-able hitboxes
    onTargetHit(boss, id)           -> apply a successful hit; may change phase or set boss.defeated
  Contact damage from projectiles (bolts/beams/fruit) is handled generically by game.js
  using the shared Projectile list, so bosses just call world.spawnProjectile(...).
*/

const ARENA_W = 960;
const ARENA_GROUND_Y = 460;

function arenaGround(color, topColor) {
  return [new Platform({ x: -50, y: ARENA_GROUND_Y, w: ARENA_W + 100, h: 200, type: 'solid', color, topColor })];
}

// ================= BOSS 1 : OLE HIGUE =================
const OleHigueBoss = {
  id: 1, name: 'Ole Higue', afterLevel: 2,
  flavor: "By night she sheds her skin and flies as a ball of fire. Knock her down when she lands!",
  arenaPlatforms: arenaGround('#c9a15a', '#3fa34d'),

  init() {
    return {
      x: 100, y: 220, w: 42, h: 42,
      phase: 'swoop', timer: 0, arcDir: 1,
      hitsTaken: 0, hitsRequired: 3,
      vulnerable: false, invuln: 0, defeated: false, health: 3,
    };
  },

  update(b, dt, t, world) {
    if (b.defeated) return;
    b.invuln = Math.max(0, b.invuln - dt);
    if (b.phase === 'swoop') {
      b.timer += dt;
      const dur = 2.8;
      const p = Math.min(1, b.timer / dur);
      b.x = b.arcDir > 0 ? 60 + p * 840 : 900 - p * 840;
      b.y = 150 + Math.abs(Math.sin(p * Math.PI * 2.5)) * 220;
      if (b.timer >= dur) {
        b.phase = 'landing'; b.timer = 0;
        b.landedX = 150 + Math.random() * 660;
        b.arcDir *= -1;
      }
    } else if (b.phase === 'landing') {
      b.timer += dt;
      b.x += (b.landedX - b.x) * 0.12;
      b.y += (ARENA_GROUND_Y - b.h - b.y) * 0.18;
      if (b.timer > 0.5) { b.phase = 'landed'; b.timer = 0; b.vulnerable = true; }
    } else if (b.phase === 'landed') {
      b.timer += dt;
      b.y = ARENA_GROUND_Y - b.h;
      if (b.timer > 2.3) { b.vulnerable = false; b.phase = 'swoop'; b.timer = 0; }
    } else if (b.phase === 'stunned') {
      b.timer += dt;
      b.y = ARENA_GROUND_Y - b.h;
      if (b.timer > 0.8) { b.phase = 'swoop'; b.timer = 0; }
    }
  },

  getDangerRects(b) {
    if (b.defeated) return [];
    if (b.phase === 'swoop' || b.phase === 'landing') return [{ x: b.x - b.w / 2, y: b.y - b.h / 2, w: b.w, h: b.h }];
    return [];
  },

  getVulnerableTargets(b) {
    if (b.defeated || !b.vulnerable || b.invuln > 0) return [];
    return [{ id: 'main', x: b.x - b.w / 2, y: b.y - b.h / 2, w: b.w, h: b.h }];
  },

  onTargetHit(b) {
    b.hitsTaken++;
    b.invuln = 1.2;
    b.vulnerable = false;
    if (b.hitsTaken >= b.hitsRequired) { b.defeated = true; }
    else { b.phase = 'stunned'; b.timer = 0; }
  },

  draw(ctx, b, camera, t) {
    const sx = b.x - camera.x, sy = b.y - camera.y;
    ctx.save();
    if (b.phase === 'swoop' || b.phase === 'landing') {
      ctx.shadowColor = '#ff7a1a'; ctx.shadowBlur = 22;
      const grad = ctx.createRadialGradient(sx, sy, 4, sx, sy, 22);
      grad.addColorStop(0, '#fff3c4'); grad.addColorStop(0.5, '#ff9a2e'); grad.addColorStop(1, '#CE1126');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(sx, sy, 22, 0, Math.PI * 2); ctx.fill();
    } else {
      const flash = b.invuln > 0 && Math.floor(t * 14) % 2 === 0;
      ctx.fillStyle = flash ? '#ffffff' : '#6b4a8a';
      ctx.beginPath(); ctx.ellipse(sx, sy + 14, 20, 24, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8c9a0';
      ctx.beginPath(); ctx.arc(sx, sy - 12, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a2a4a';
      ctx.beginPath(); ctx.moveTo(sx - 16, sy - 20); ctx.lineTo(sx + 16, sy - 20); ctx.lineTo(sx, sy - 44); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(sx - 5, sy - 12, 2, 0, Math.PI * 2); ctx.arc(sx + 5, sy - 12, 2, 0, Math.PI * 2); ctx.fill();
      if (b.vulnerable) {
        ctx.strokeStyle = 'rgba(255,255,0,0.7)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(sx, sy, 30, 34, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.restore();
  }
};

// ================= BOSS 2 : MASSACOORAMAN =================
const MassacooramanBoss = {
  id: 2, name: 'Massacoraman', afterLevel: 4,
  flavor: "The great river spirit guards these waters. Dodge his slams and strike back when his arm gets stuck!",
  arenaPlatforms: [
    new Platform({ x: -50, y: ARENA_GROUND_Y + 40, w: 250, h: 200, type: 'solid', color: '#8a6a3a', topColor: '#7a5230' }),
    new Platform({ x: 760, y: ARENA_GROUND_Y + 40, w: 250, h: 200, type: 'solid', color: '#8a6a3a', topColor: '#7a5230' }),
    new Platform({ x: 210, y: 380, w: 110, h: 22, type: 'solid', color: '#8a6a3a', topColor: '#7a5230' }),
    new Platform({ x: 425, y: 380, w: 110, h: 22, type: 'solid', color: '#8a6a3a', topColor: '#7a5230' }),
    new Platform({ x: 640, y: 380, w: 110, h: 22, type: 'solid', color: '#8a6a3a', topColor: '#7a5230' }),
  ],
  arenaHazards: [new Hazard({ x: 200, y: 460, w: 560, h: 140, kind: 'water', color: '#0e5aa6' })],
  platformXs: [210, 425, 640],
  platformY: 380,

  init() {
    return {
      x: 480, y: 460, w: 90, h: 40,
      phase: 'idle', timer: 1.6, targetIdx: 1,
      hitsTaken: 0, hitsRequired: 3, defeated: false,
      armX: 480, armY: 460, waveOn: false,
    };
  },

  update(b, dt, t, world) {
    if (b.defeated) return;
    const xs = this.platformXs, py = this.platformY;
    if (b.phase === 'idle') {
      b.timer -= dt;
      b.armY = ARENA_GROUND_Y + 30 + Math.sin(t * 2) * 6;
      if (b.timer <= 0) {
        let idx;
        do { idx = Math.floor(Math.random() * 3); } while (idx === b.targetIdx);
        b.targetIdx = idx;
        b.phase = 'telegraph'; b.timer = 0.75;
        b.armX = xs[idx];
      }
    } else if (b.phase === 'telegraph') {
      b.timer -= dt;
      b.armY += (py - 20 - b.armY) * 0.15;
      if (b.timer <= 0) { b.phase = 'slam'; b.timer = 0.3; b.armY = py - 6; }
    } else if (b.phase === 'slam') {
      b.timer -= dt;
      if (b.timer <= 0) { b.phase = 'stuck'; b.timer = 1.6; }
    } else if (b.phase === 'stuck') {
      b.timer -= dt;
      if (b.timer <= 0) { b.phase = 'retract'; b.timer = 0.4; }
    } else if (b.phase === 'retract') {
      b.timer -= dt;
      b.armY += (ARENA_GROUND_Y + 60 - b.armY) * 0.2;
      if (b.timer <= 0) { b.phase = 'idle'; b.timer = 1.4 + Math.random() * 0.8; }
    }
  },

  getDangerRects(b) {
    if (b.defeated) return [];
    if (b.phase === 'slam') {
      const x = this.platformXs[b.targetIdx];
      return [{ x: x - 10, y: this.platformY - 40, w: 130, h: 60 }];
    }
    return [];
  },

  getVulnerableTargets(b) {
    if (b.defeated || b.phase !== 'stuck') return [];
    const x = this.platformXs[b.targetIdx];
    return [{ id: 'arm', x: x - 5, y: this.platformY - 46, w: 120, h: 46 }];
  },

  onTargetHit(b) {
    b.hitsTaken++;
    if (b.hitsTaken >= b.hitsRequired) { b.defeated = true; }
    else { b.phase = 'retract'; b.timer = 0.3; }
  },

  draw(ctx, b, camera, t) {
    ctx.save();
    // body hump in the water
    const bx = 480 - camera.x, by = ARENA_GROUND_Y + 60;
    ctx.fillStyle = '#3a5a3a';
    ctx.beginPath(); ctx.ellipse(bx, by, 120, 40, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a4a2a';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.arc(bx + i * 30, by - 20, 8, 0, Math.PI * 2); ctx.fill();
    }
    if (b.phase !== 'idle') {
      const sx = b.armX - camera.x, sy = b.armY - camera.y;
      const flash = b.phase === 'stuck' && Math.floor(t * 10) % 2 === 0;
      ctx.fillStyle = flash ? '#ffdd66' : '#3a5a3a';
      ctx.fillRect(sx - 18, sy, 36, 90);
      ctx.fillStyle = '#2a4a2a';
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) { ctx.moveTo(sx + i * 14 - 6, sy); ctx.lineTo(sx + i * 14, sy - 22); ctx.lineTo(sx + i * 14 + 6, sy); }
      ctx.fill();
      if (b.phase === 'telegraph') {
        ctx.strokeStyle = 'rgba(255,60,60,0.8)'; ctx.lineWidth = 3;
        ctx.strokeRect(this.platformXs[b.targetIdx] - camera.x - 15, this.platformY - camera.y - 5, 140, 30);
      }
    }
    ctx.restore();
  }
};

// ================= BOSS 3 : MOONGAZER =================
const MoongazerBoss = {
  id: 3, name: 'Moongazer', afterLevel: 6,
  flavor: "A tall misty figure watches the crossroads. Strike when he flickers into view!",
  arenaPlatforms: arenaGround('#20263f', '#2a3a63'),
  spotXs: [180, 480, 780],

  init() {
    return {
      x: 480, y: ARENA_GROUND_Y - 90, w: 46, h: 90,
      spotIdx: 1, phase: 'appear', timer: 0.4,
      hitsTaken: 0, hitsRequired: 3, defeated: false, alpha: 0,
    };
  },

  update(b, dt, t, world) {
    if (b.defeated) return;
    b.x = this.spotXs[b.spotIdx];
    if (b.phase === 'appear') {
      b.timer -= dt;
      b.alpha = Math.min(1, b.alpha + dt * 3);
      if (b.timer <= 0) { b.phase = 'vulnerable'; b.timer = 1.7; }
    } else if (b.phase === 'vulnerable') {
      b.timer -= dt;
      b.alpha = 1;
      if (b.timer <= 0) { b.phase = 'channel'; b.timer = 0.6; }
    } else if (b.phase === 'channel') {
      b.timer -= dt;
      if (b.timer <= 0) {
        world.spawnProjectile(new Projectile({
          x: b.x, y: b.y + 30, vx: 0, vy: 0, w: 900, h: 16, kind: 'moonbeam', owner: 'boss', life: 1.4,
        }));
        b.phase = 'fire'; b.timer = 0.2;
      }
    } else if (b.phase === 'fire') {
      b.timer -= dt;
      if (b.timer <= 0) { b.phase = 'teleport'; b.timer = 0.35; }
    } else if (b.phase === 'teleport') {
      b.timer -= dt;
      b.alpha = Math.max(0, b.alpha - dt * 4);
      if (b.timer <= 0) {
        let idx;
        do { idx = Math.floor(Math.random() * 3); } while (idx === b.spotIdx);
        b.spotIdx = idx;
        b.phase = 'appear'; b.timer = 0.4; b.alpha = 0;
      }
    }
  },

  getDangerRects() { return []; }, // danger comes from the moonbeam projectile, handled generically

  getVulnerableTargets(b) {
    if (b.defeated || b.phase !== 'vulnerable') return [];
    return [{ id: 'main', x: b.x - b.w / 2, y: b.y, w: b.w, h: b.h }];
  },

  onTargetHit(b) {
    b.hitsTaken++;
    if (b.hitsTaken >= b.hitsRequired) { b.defeated = true; }
    else { b.phase = 'teleport'; b.timer = 0.35; }
  },

  draw(ctx, b, camera, t) {
    const sx = b.x - camera.x, sy = b.y - camera.y;
    ctx.save();
    ctx.globalAlpha = b.alpha;
    ctx.shadowColor = '#dfe9ff'; ctx.shadowBlur = 20;
    const grad = ctx.createLinearGradient(sx, sy, sx, sy + b.h);
    grad.addColorStop(0, 'rgba(223,233,255,0.9)');
    grad.addColorStop(1, 'rgba(160,180,220,0.4)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx - 26, sy + b.h * 0.6, sx - 14, sy + b.h);
    ctx.lineTo(sx + 14, sy + b.h);
    ctx.quadraticCurveTo(sx + 26, sy + b.h * 0.6, sx, sy);
    ctx.fill();
    ctx.fillStyle = '#dfe9ff';
    ctx.beginPath(); ctx.arc(sx, sy - 8, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#20263f';
    ctx.beginPath(); ctx.arc(sx - 4, sy - 9, 1.8, 0, Math.PI * 2); ctx.arc(sx + 4, sy - 9, 1.8, 0, Math.PI * 2); ctx.fill();
    // crescent moon emblem
    ctx.fillStyle = '#FCD116';
    ctx.beginPath(); ctx.arc(sx, sy + b.h * 0.35, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = (b.phase === 'appear') ? 'rgba(32,38,63,0.9)' : 'rgba(32,38,63,0.0)';
    ctx.beginPath(); ctx.arc(sx + 3, sy + b.h * 0.35 - 1, 6, 0, Math.PI * 2); ctx.fill();
    if (b.phase === 'vulnerable') {
      ctx.strokeStyle = 'rgba(255,255,0,0.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(sx, sy + b.h / 2, 30, b.h / 2 + 8, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
};

// ================= BOSS 4 : BACCOO =================
const BaccooBoss = {
  id: 4, name: 'Baccoo', afterLevel: 8,
  flavor: "A bottle full of mischief! Find the real Baccoo among his tricky decoys and stomp him!",
  arenaPlatforms: arenaGround('#4a6b3a', '#6b8a4a'),

  init() {
    const imps = [];
    for (let i = 0; i < 4; i++) {
      imps.push({
        x: 200 + i * 190, y: ARENA_GROUND_Y - 30 - Math.random() * 80,
        vx: (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 40),
        vy: (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 30),
        w: 30, h: 30,
      });
    }
    return {
      imps, realIdx: Math.floor(Math.random() * 4),
      hitsTaken: 0, hitsRequired: 3, defeated: false,
      throwTimer: 2.0,
    };
  },

  update(b, dt, t, world) {
    if (b.defeated) return;
    for (const imp of b.imps) {
      imp.x += imp.vx * dt;
      imp.y += imp.vy * dt;
      if (imp.x < 60 || imp.x > 900) imp.vx *= -1;
      if (imp.y < 150 || imp.y > ARENA_GROUND_Y - 20) imp.vy *= -1;
    }
    b.throwTimer -= dt;
    if (b.throwTimer <= 0) {
      b.throwTimer = 1.8 + Math.random() * 1.0;
      const thrower = b.imps[Math.floor(Math.random() * 4)];
      const player = world.player;
      const dx = player.x - thrower.x;
      world.spawnProjectile(new Projectile({
        x: thrower.x, y: thrower.y, vx: Math.sign(dx || 1) * 190, vy: -220, gravity: 520,
        kind: 'item', owner: 'boss', life: 3,
      }));
    }
  },

  getDangerRects() { return []; }, // danger is only the thrown item projectiles

  getVulnerableTargets(b) {
    if (b.defeated) return [];
    return b.imps.map((imp, i) => ({ id: i, x: imp.x - imp.w / 2, y: imp.y - imp.h / 2, w: imp.w, h: imp.h }));
  },

  onTargetHit(b, id) {
    if (id === b.realIdx) {
      b.hitsTaken++;
      const imp = b.imps[id];
      imp.x = 100 + Math.random() * 760; imp.y = 200 + Math.random() * 200;
      if (b.hitsTaken >= b.hitsRequired) { b.defeated = true; }
      else { b.realIdx = Math.floor(Math.random() * 4); }
    } else {
      const imp = b.imps[id];
      imp.x = 100 + Math.random() * 760; imp.y = 200 + Math.random() * 200;
    }
  },

  draw(ctx, b, camera, t) {
    ctx.save();
    b.imps.forEach((imp, i) => {
      const sx = imp.x - camera.x, sy = imp.y - camera.y;
      if (i === b.realIdx) {
        const pulse = 4 + Math.sin(t * 8) * 2;
        ctx.shadowColor = '#FCD116'; ctx.shadowBlur = 14 + pulse;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = '#3a8a4a';
      ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(sx - 4, sy - 2, 3, 0, Math.PI * 2); ctx.arc(sx + 4, sy - 2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(sx - 4, sy - 2, 1.4, 0, Math.PI * 2); ctx.arc(sx + 4, sy - 2, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3a8a4a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(sx - 8, sy - 12); ctx.lineTo(sx - 4, sy - 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx + 8, sy - 12); ctx.lineTo(sx + 4, sy - 18); ctx.stroke();
      ctx.shadowBlur = 0;
    });
    ctx.restore();
  }
};

// ================= BOSS 5 : KANAIMA (final boss) =================
const KanaimaBoss = {
  id: 5, name: 'Kanaima', afterLevel: 10,
  flavor: "The spirit of justice himself. Face all three of his forms to complete your journey!",
  arenaPlatforms: arenaGround('#5a6b4a', '#3fa34d'),

  init() {
    return {
      x: 700, y: ARENA_GROUND_Y - 60, w: 40, h: 60,
      phase: 1, phaseHits: 0, phaseHitsRequired: [2, 2, 2],
      state: 'idle', timer: 1.2, boltCount: 0,
      dir: -1, chargeRange: [120, 840], defeated: false, vulnerable: false,
    };
  },

  update(b, dt, t, world) {
    if (b.defeated) return;
    const player = world.player;

    if (b.phase === 1) {
      if (b.state === 'idle') {
        b.timer -= dt;
        b.x += (700 - b.x) * 0.02;
        if (b.timer <= 0) { b.state = 'throw'; b.timer = 0.5; }
      } else if (b.state === 'throw') {
        b.timer -= dt;
        if (b.timer <= 0) {
          const dx = player.x - b.x;
          world.spawnProjectile(new Projectile({ x: b.x, y: b.y + 10, vx: Math.sign(dx || 1) * 240, vy: -60, gravity: 260, kind: 'bolt', owner: 'boss', life: 3 }));
          b.boltCount++;
          if (b.boltCount >= 3) { b.boltCount = 0; b.state = 'vulnerable'; b.timer = 2.0; b.vulnerable = true; }
          else { b.state = 'idle'; b.timer = 0.9; }
        }
      } else if (b.state === 'vulnerable') {
        b.timer -= dt;
        if (b.timer <= 0) { b.vulnerable = false; b.state = 'idle'; b.timer = 1.0; }
      }
    } else if (b.phase === 2) {
      if (b.state === 'idle') {
        b.timer -= dt;
        if (b.timer <= 0) { b.state = 'telegraph'; b.timer = 0.5; b.dir = player.x > b.x ? 1 : -1; }
      } else if (b.state === 'telegraph') {
        b.timer -= dt;
        if (b.timer <= 0) { b.state = 'charge'; }
      } else if (b.state === 'charge') {
        b.x += b.dir * 620 * dt;
        if (b.x < b.chargeRange[0] || b.x > b.chargeRange[1]) {
          b.x = Math.max(b.chargeRange[0], Math.min(b.chargeRange[1], b.x));
          b.state = 'vulnerable'; b.timer = 1.3; b.vulnerable = true;
        }
      } else if (b.state === 'vulnerable') {
        b.timer -= dt;
        if (b.timer <= 0) { b.vulnerable = false; b.state = 'idle'; b.timer = 0.8; }
      }
    } else if (b.phase === 3) {
      if (b.state === 'idle') {
        b.timer -= dt;
        b.x += (600 - b.x) * 0.02;
        if (b.timer <= 0) { b.state = 'windup'; b.timer = 1.1; }
      } else if (b.state === 'windup') {
        b.timer -= dt;
        if (b.timer <= 0) {
          const dx = player.x - b.x;
          world.spawnProjectile(new Projectile({ x: b.x, y: b.y + 10, vx: Math.sign(dx || 1) * 170, vy: -50, gravity: 220, kind: 'bolt', owner: 'boss', life: 3 }));
          b.state = 'vulnerable'; b.timer = 2.6; b.vulnerable = true;
        }
      } else if (b.state === 'vulnerable') {
        b.timer -= dt;
        if (b.timer <= 0) { b.vulnerable = false; b.state = 'idle'; b.timer = 1.0; }
      }
    }
  },

  getDangerRects(b) {
    if (b.defeated) return [];
    if (b.phase === 2 && b.state === 'charge') {
      return [{ x: b.x - b.w / 2, y: ARENA_GROUND_Y - 42, w: b.w, h: 42 }];
    }
    return [];
  },

  getVulnerableTargets(b) {
    if (b.defeated || !b.vulnerable) return [];
    let y = b.phase === 2 ? ARENA_GROUND_Y - 42 : b.y;
    let h = b.phase === 2 ? 42 : b.h;
    return [{ id: 'main', x: b.x - b.w / 2, y, w: b.w, h }];
  },

  onTargetHit(b) {
    b.phaseHits++;
    b.vulnerable = false;
    if (b.phaseHits >= b.phaseHitsRequired[b.phase - 1]) {
      if (b.phase >= 3) {
        b.defeated = true;
      } else {
        b.phase++; b.phaseHits = 0; b.state = 'idle'; b.timer = 1.0;
        b.x = 700; b.y = ARENA_GROUND_Y - (b.phase === 2 ? 40 : 60);
        b.w = b.phase === 2 ? 70 : 40; b.h = b.phase === 2 ? 40 : 60;
      }
    } else {
      b.state = 'idle'; b.timer = b.phase === 2 ? 0.6 : 0.9;
    }
  },

  draw(ctx, b, camera, t) {
    const sx = b.x - camera.x, sy = b.y - camera.y;
    ctx.save();
    const flash = b.vulnerable && Math.floor(t * 12) % 2 === 0;
    if (b.phase === 1 || b.phase === 3) {
      ctx.fillStyle = flash ? '#ffffff' : (b.phase === 1 ? '#2e6b4a' : '#7a9a6a');
      ctx.beginPath(); ctx.ellipse(sx, sy + b.h / 2, b.w / 2, b.h / 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8c9a0';
      ctx.beginPath(); ctx.arc(sx, sy - 6, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#FCD116'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx - 12, sy - 14); ctx.lineTo(sx + 12, sy - 14); ctx.stroke();
      if (b.state === 'throw' || b.state === 'windup') {
        ctx.fillStyle = '#9BFF57';
        ctx.beginPath(); ctx.arc(sx + 14, sy, 5, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      // jaguar form
      ctx.fillStyle = flash ? '#ffffff' : '#d9a84a';
      ctx.beginPath(); ctx.ellipse(sx, sy + b.h / 2, b.w / 2, b.h / 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a2a1a';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.arc(sx + i * 10, sy + b.h / 2 - 4 + (i % 2) * 4, 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#d9a84a';
      ctx.beginPath(); ctx.arc(sx + b.dir * b.w / 2, sy + 6, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(sx + b.dir * (b.w / 2 + 4), sy + 4, 1.6, 0, Math.PI * 2); ctx.fill();
      if (b.state === 'telegraph') {
        ctx.strokeStyle = 'rgba(255,80,80,0.7)'; ctx.lineWidth = 3;
        ctx.strokeRect(sx - b.w / 2 - 4, sy - 4, b.w + 8, b.h + 8);
      }
    }
    if (b.vulnerable) {
      ctx.strokeStyle = 'rgba(255,255,0,0.65)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(sx, sy + b.h / 2, b.w / 2 + 12, b.h / 2 + 12, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
};

const BOSSES = [OleHigueBoss, MassacooramanBoss, MoongazerBoss, BaccooBoss, KanaimaBoss];
