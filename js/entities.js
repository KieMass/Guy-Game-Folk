/*
  entities.js
  Shared game object classes used across all levels and boss fights:
  Platform, Hazard, Enemy, Collectible, Projectile, Particle.
  All rendering is procedural Canvas 2D (no image assets).
*/

// ---------- Platform ----------
// type: 'solid' | 'moving' | 'crumble' | 'disappear'
class Platform {
  constructor(o) {
    this.x = o.x;
    this.y = o.y;
    this.w = o.w;
    this.h = o.h;
    this.type = o.type || 'solid';
    this.color = o.color || '#8a5a2b';
    this.topColor = o.topColor || '#3fa34d';
    this.startX = o.x;
    this.startY = o.y;
    this.axis = o.axis || 'x';       // for moving platforms
    this.range = o.range || 0;
    this.speed = o.speed || 1;
    this.phase = o.phase || 0;

    // crumble state
    this.crumbleState = 'idle';      // idle -> shaking -> gone -> respawning
    this.crumbleTimer = 0;

    // disappear state
    this.onTime = o.onTime !== undefined ? o.onTime : 2.2;
    this.offTime = o.offTime !== undefined ? o.offTime : 1.4;
    this.disappearTimer = o.phase || 0;
    this.visible = true;

    this.dx = 0;
    this.dy = 0;
  }

  isSolid() {
    if (this.type === 'crumble') return this.crumbleState !== 'gone';
    if (this.type === 'disappear') return this.visible;
    return true;
  }

  trigger() {
    if (this.type === 'crumble' && this.crumbleState === 'idle') {
      this.crumbleState = 'shaking';
      this.crumbleTimer = 0.45;
    }
  }

  update(dt, t) {
    const prevX = this.x, prevY = this.y;

    if (this.type === 'moving') {
      const off = Math.sin(t * this.speed + this.phase) * this.range;
      if (this.axis === 'x') this.x = this.startX + off;
      else this.y = this.startY + off;
    } else if (this.type === 'crumble') {
      if (this.crumbleState === 'shaking') {
        this.crumbleTimer -= dt;
        if (this.crumbleTimer <= 0) {
          this.crumbleState = 'gone';
          this.crumbleTimer = 3.2;
        }
      } else if (this.crumbleState === 'gone') {
        this.crumbleTimer -= dt;
        if (this.crumbleTimer <= 0) {
          this.crumbleState = 'idle';
        }
      }
    } else if (this.type === 'disappear') {
      this.disappearTimer += dt;
      const cycle = this.onTime + this.offTime;
      const phase = this.disappearTimer % cycle;
      this.visible = phase < this.onTime;
    }

    this.dx = this.x - prevX;
    this.dy = this.y - prevY;
  }

  draw(ctx, camera) {
    if (this.type === 'disappear' && !this.visible) return;
    if (this.type === 'crumble' && this.crumbleState === 'gone') return;

    const sx = this.x - camera.x;
    const sy = this.y - camera.y;
    if (sx + this.w < -20 || sx > 1000) return;

    let shake = 0;
    if (this.type === 'crumble' && this.crumbleState === 'shaking') {
      shake = (Math.random() - 0.5) * 4;
    }
    let alpha = 1;
    if (this.type === 'disappear') {
      const cycle = this.onTime + this.offTime;
      const phase = this.disappearTimer % cycle;
      if (phase > this.onTime - 0.5) alpha = Math.max(0.35, (this.onTime - phase) / 0.5);
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(sx + shake, sy, this.w, this.h);
    ctx.fillStyle = this.topColor;
    ctx.fillRect(sx + shake, sy, this.w, 6);
    ctx.restore();
  }
}

// ---------- Hazard ----------
// Instant-danger zone (river, pit, waterfall base, tide). Not standable.
class Hazard {
  constructor(o) {
    this.x = o.x;
    this.y = o.y;
    this.w = o.w;
    this.h = o.h;
    this.kind = o.kind || 'water'; // water | pit | tide
    this.color = o.color || '#1c6fbf';
    this.tideRange = o.tideRange || 0;
    this.tideSpeed = o.tideSpeed || 1;
    this.baseW = o.w;
  }
  update(dt, t) {
    if (this.kind === 'tide') {
      const off = (Math.sin(t * this.tideSpeed) * 0.5 + 0.5) * this.tideRange;
      this.w = this.baseW + off;
    }
  }
  draw(ctx, camera, t) {
    const sx = this.x - camera.x;
    const sy = this.y - camera.y;
    if (sx + this.w < -20 || sx > 1000) return;
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.fillRect(sx, sy, this.w, this.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let wx = 0; wx < this.w; wx += 16) {
      const wy = sy + Math.sin(t * 4 + (this.x + wx) * 0.05) * 3;
      if (wx === 0) ctx.moveTo(sx + wx, wy);
      else ctx.lineTo(sx + wx, wy);
    }
    ctx.stroke();
    ctx.restore();
  }
}

// ---------- Collectible ----------
// type: nugget | starapple | cassava | sugarcane | gem | firefly | cutlass
class Collectible {
  constructor(o) {
    this.x = o.x;
    this.y = o.y;
    this.w = 22;
    this.h = 22;
    this.type = o.type;
    this.collected = false;
    this.bobPhase = Math.random() * Math.PI * 2;
  }

  update(dt) {}

  draw(ctx, camera, t) {
    if (this.collected) return;
    const sx = this.x - camera.x;
    const sy = this.y - camera.y + Math.sin(t * 3 + this.bobPhase) * 4;
    if (sx < -30 || sx > 990) return;
    const cx = sx + this.w / 2, cy = sy + this.h / 2;

    ctx.save();
    switch (this.type) {
      case 'nugget':
        ctx.fillStyle = '#FCD116';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 11, 8, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e8b800';
        ctx.beginPath();
        ctx.ellipse(cx - 3, cy - 2, 3, 2, 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'starapple': {
        ctx.fillStyle = '#8e44ad';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const ang = -Math.PI / 2 + i * (Math.PI * 2 / 5);
          const ang2 = ang + Math.PI / 5;
          ctx.lineTo(cx + Math.cos(ang) * 10, cy + Math.sin(ang) * 10);
          ctx.lineTo(cx + Math.cos(ang2) * 4, cy + Math.sin(ang2) * 4);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'cassava':
        ctx.fillStyle = '#c98a4b';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 12, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#96602c';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx - 7, cy); ctx.lineTo(cx + 7, cy); ctx.stroke();
        break;
      case 'sugarcane':
        ctx.strokeStyle = '#CE1126';
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(cx, cy + 11); ctx.lineTo(cx, cy - 11); ctx.stroke();
        ctx.strokeStyle = '#009E49';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx, cy - 11); ctx.lineTo(cx - 5, cy - 16); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx + 5, cy - 13); ctx.stroke();
        break;
      case 'gem':
      case 'firefly': {
        const glow = this.type === 'firefly' ? '#FCD116' : '#00e5c9';
        ctx.shadowColor = glow;
        ctx.shadowBlur = 12;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 11);
        ctx.lineTo(cx + 9, cy - 2);
        ctx.lineTo(cx + 5, cy + 11);
        ctx.lineTo(cx - 5, cy + 11);
        ctx.lineTo(cx - 9, cy - 2);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'cutlass':
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#dcdcdc';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy + 10);
        ctx.quadraticCurveTo(cx + 8, cy + 2, cx + 6, cy - 12);
        ctx.stroke();
        ctx.strokeStyle = '#7a4a23';
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(cx - 8, cy + 10); ctx.lineTo(cx - 13, cy + 15); ctx.stroke();
        break;
      case 'extralife': {
        // a bright heart charm -- the "1-up" of Guyana Quest
        ctx.shadowColor = '#ff3355';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#ff3355';
        ctx.beginPath();
        ctx.moveTo(cx, cy + 10);
        ctx.bezierCurveTo(cx - 15, cy - 2, cx - 9, cy - 13, cx, cy - 5);
        ctx.bezierCurveTo(cx + 9, cy - 13, cx + 15, cy - 2, cx, cy + 10);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('+1', cx, cy + 2);
        break;
      }
      case 'starpower': {
        // spinning golden star -- temporary invincibility
        const spin = t * 3;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(spin);
        ctx.shadowColor = '#FCD116';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#FCD116';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const ang = -Math.PI / 2 + i * (Math.PI * 2 / 5);
          const ang2 = ang + Math.PI / 5;
          ctx.lineTo(Math.cos(ang) * 12, Math.sin(ang) * 12);
          ctx.lineTo(Math.cos(ang2) * 5, Math.sin(ang2) * 5);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'speedboost': {
        // cyan chevron swoosh -- temporary speed boost
        ctx.shadowColor = '#3ad6ff';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = '#3ad6ff';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        for (let i = 0; i < 2; i++) {
          const ox = -6 + i * 8;
          ctx.beginPath();
          ctx.moveTo(cx + ox - 6, cy - 9);
          ctx.lineTo(cx + ox + 4, cy);
          ctx.lineTo(cx + ox - 6, cy + 9);
          ctx.stroke();
        }
        break;
      }
    }
    ctx.restore();
  }
}

// ---------- Projectile ----------
class Projectile {
  constructor(o) {
    this.x = o.x;
    this.y = o.y;
    this.vx = o.vx || 0;
    this.vy = o.vy || 0;
    this.w = o.w || 14;
    this.h = o.h || 14;
    this.owner = o.owner || 'enemy'; // 'enemy' | 'boss' | 'player'
    this.kind = o.kind || 'fruit';
    this.gravity = o.gravity || 0;
    this.life = o.life || 6;
    this.dead = false;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
  draw(ctx, camera) {
    const sx = this.x - camera.x, sy = this.y - camera.y;
    if (sx < -30 || sx > 990) return;
    ctx.save();
    switch (this.kind) {
      case 'fruit':
        ctx.fillStyle = '#e05a2b';
        ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3fa34d';
        ctx.fillRect(sx - 1, sy - 10, 2, 5);
        break;
      case 'bolt':
        ctx.shadowColor = '#7CFC00';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#9BFF57';
        ctx.beginPath(); ctx.arc(sx, sy, 8, 0, Math.PI * 2); ctx.fill();
        break;
      case 'moonbeam':
        ctx.shadowColor = '#dfe9ff';
        ctx.shadowBlur = 14;
        ctx.fillStyle = 'rgba(223,233,255,0.85)';
        ctx.fillRect(sx - this.w / 2, sy - this.h / 2, this.w, this.h);
        break;
      case 'item':
        ctx.fillStyle = '#FCD116';
        ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.fill();
        break;
      default:
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

// Procedural walk-cycle legs shared by ground creatures: bent thigh/shin
// segments that swing and fold like the player's, scaled to a small body.
function drawCreatureLegs(ctx, cx, footBaseY, halfW, legReach, phase, color, pairCount, moving) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, halfW * 0.22);
  ctx.lineCap = 'round';
  const hipY = footBaseY - legReach;
  const thigh = legReach * 0.55, shin = legReach * 0.55;
  const pairOffsets = pairCount === 2 ? [-halfW * 0.5, halfW * 0.5] : [0];
  pairOffsets.forEach((offsetX, pairIdx) => {
    for (let side = -1; side <= 1; side += 2) {
      let hipAngle, kneeBend;
      if (moving) {
        const p = phase + (side > 0 ? Math.PI : 0) + pairIdx * Math.PI * 0.85;
        hipAngle = Math.sin(p) * 0.6;
        kneeBend = 0.22 + Math.max(0, -hipAngle) * 1.3;
      } else {
        hipAngle = side * 0.05;
        kneeBend = 0.3;
      }
      const hipX = cx + offsetX + side * halfW * 0.3;
      const kneeX = hipX + Math.sin(hipAngle) * thigh;
      const kneeY = hipY + Math.cos(hipAngle) * thigh;
      const shinAngle = hipAngle + kneeBend;
      const footX = kneeX + Math.sin(shinAngle) * shin;
      const footY = kneeY + Math.cos(shinAngle) * shin;
      ctx.beginPath();
      ctx.moveTo(hipX, hipY); ctx.lineTo(kneeX, kneeY); ctx.lineTo(footX, footY);
      ctx.stroke();
    }
  });
}

// ---------- Enemy ----------
// type: crawler | flyer | thrower | thief | roller | charger
class Enemy {
  constructor(o) {
    this.x = o.x;
    this.y = o.y;
    this.w = o.w || 30;
    this.h = o.h || 28;
    this.type = o.type;
    this.startX = o.x;
    this.startY = o.y;
    this.range = o.range !== undefined ? o.range : 70;
    this.speed = o.speed !== undefined ? o.speed : 45;
    this.dir = o.dir || -1;
    this.alive = true;
    this.stompable = o.stompable !== undefined ? o.stompable : true;
    this.color = o.color || '#CE1126';
    this.timer = o.timer !== undefined ? o.timer : 1 + Math.random() * 2;
    this.state = 'patrol';
    this.hasItem = false;
    this.deathTimer = 0;
    this.chargeCooldown = 0;
  }

  update(dt, t, world) {
    if (!this.alive) {
      this.deathTimer -= dt;
      return;
    }
    const player = world.player;

    switch (this.type) {
      case 'crawler': {
        this.x += this.dir * this.speed * dt;
        if (this.x < this.startX - this.range) { this.x = this.startX - this.range; this.dir = 1; }
        if (this.x > this.startX + this.range) { this.x = this.startX + this.range; this.dir = -1; }
        break;
      }
      case 'flyer': {
        this.x += this.dir * this.speed * dt;
        this.y = this.startY + Math.sin(t * 2.4 + this.startX) * 14;
        if (this.x < this.startX - this.range) { this.x = this.startX - this.range; this.dir = 1; }
        if (this.x > this.startX + this.range) { this.x = this.startX + this.range; this.dir = -1; }
        break;
      }
      case 'thrower': {
        this.dir = player.x > this.x ? 1 : -1;
        this.timer -= dt;
        if (this.timer <= 0 && Math.abs(player.x - this.x) < 420) {
          this.timer = 2.3 + Math.random() * 1.2;
          const vx = this.dir * 150;
          world.spawnProjectile(new Projectile({
            x: this.x + this.w / 2, y: this.y + 6, vx, vy: -160, gravity: 480,
            kind: 'fruit', owner: 'enemy'
          }));
        }
        break;
      }
      case 'thief': {
        if (this.state === 'patrol') {
          this.x += this.dir * this.speed * dt;
          if (this.x < this.startX - this.range) { this.x = this.startX - this.range; this.dir = 1; }
          if (this.x > this.startX + this.range) { this.x = this.startX + this.range; this.dir = -1; }
        } else if (this.state === 'fleeing') {
          this.x += this.dir * this.speed * 2.4 * dt;
        }
        break;
      }
      case 'roller': {
        this.x += this.dir * this.speed * dt;
        if (this.x < this.startX - this.range) { this.x = this.startX - this.range; this.dir = 1; }
        if (this.x > this.startX + this.range) { this.x = this.startX + this.range; this.dir = -1; }
        break;
      }
      case 'charger': {
        this.chargeCooldown -= dt;
        if (this.state === 'idle') {
          if (Math.abs(player.y - this.y) < 60 && Math.abs(player.x - this.x) < 320 && this.chargeCooldown <= 0) {
            this.state = 'telegraph';
            this.timer = 0.45;
            this.dir = player.x > this.x ? 1 : -1;
          }
        } else if (this.state === 'telegraph') {
          this.timer -= dt;
          if (this.timer <= 0) { this.state = 'charging'; }
        } else if (this.state === 'charging') {
          this.x += this.dir * this.speed * 3.2 * dt;
          if (Math.abs(this.x - this.startX) > this.range) {
            this.state = 'idle';
            this.chargeCooldown = 1.4;
          }
        }
        break;
      }
    }
  }

  stomp() {
    this.alive = false;
    this.deathTimer = 0.4;
  }

  draw(ctx, camera, t) {
    if (!this.alive && this.deathTimer <= 0) return;
    const sx = this.x - camera.x, sy = this.y - camera.y;
    if (sx + this.w < -30 || sx > 990) return;

    ctx.save();
    if (!this.alive) {
      ctx.globalAlpha = Math.max(0, this.deathTimer / 0.4);
      ctx.translate(sx + this.w / 2, sy + this.h / 2);
      ctx.scale(1, 0.3);
      ctx.translate(-(sx + this.w / 2), -(sy + this.h / 2));
    }

    const cx = sx + this.w / 2, cy = sy + this.h / 2;
    switch (this.type) {
      case 'crawler': {
        const legPhase = t * 9 + this.startX * 0.03;
        drawCreatureLegs(ctx, cx, cy + this.h / 2, this.w / 2, Math.max(6, this.h * 0.45), legPhase, this.color, 2, true);
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.ellipse(cx, cy, this.w / 2, this.h / 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(cx + this.dir * 6, cy - 4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(cx + this.dir * 7, cy - 4, 1.4, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'flyer':
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.ellipse(cx, cy, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        const wingFlap = Math.sin(t * 16) * 6;
        ctx.beginPath(); ctx.ellipse(cx - 10, cy - wingFlap, 8, 4, 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + 10, cy - wingFlap, 8, 4, -0.4, 0, Math.PI * 2); ctx.fill();
        break;
      case 'thrower':
        ctx.fillStyle = '#7a4a2b';
        ctx.beginPath(); ctx.ellipse(cx, cy, 12, 13, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5c3820';
        ctx.beginPath(); ctx.arc(cx + this.dir * 10, cy - 10, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(cx + this.dir * 12, cy - 11, 2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#5c3820'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - this.dir * 14, cy + 6); ctx.stroke();
        break;
      case 'thief': {
        const legPhase = t * (this.state === 'fleeing' ? 16 : 8) + this.startX * 0.02;
        drawCreatureLegs(ctx, cx, cy + 12, 6, 9, legPhase, this.state === 'fleeing' ? '#ff8ad1' : '#c94fbb', 1, true);
        ctx.fillStyle = this.state === 'fleeing' ? '#ff8ad1' : '#c94fbb';
        ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(cx - 4, cy - 3, 2.5, 0, Math.PI * 2); ctx.arc(cx + 4, cy - 3, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#c94fbb'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx - 8, cy - 12); ctx.lineTo(cx - 4, cy - 18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + 8, cy - 12); ctx.lineTo(cx + 4, cy - 18); ctx.stroke();
        if (this.hasItem) {
          ctx.fillStyle = '#FCD116';
          ctx.beginPath(); ctx.arc(cx, cy - 22, 4, 0, Math.PI * 2); ctx.fill();
        }
        break;
      }
      case 'roller':
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * 5 * this.dir);
        ctx.fillStyle = '#FCD116';
        ctx.beginPath(); ctx.arc(0, 0, this.w / 2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#CE1126'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-this.w / 2, 0); ctx.lineTo(this.w / 2, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -this.w / 2); ctx.lineTo(0, this.w / 2); ctx.stroke();
        ctx.restore();
        break;
      case 'charger': {
        const flash = this.state === 'telegraph' && Math.floor(t * 12) % 2 === 0;
        const chargeMoving = this.state === 'charging';
        const legPhase = t * (chargeMoving ? 22 : 6) + this.startX * 0.02;
        drawCreatureLegs(ctx, cx, cy + this.h / 2, this.w / 2, this.h * 0.5, legPhase, '#111', 2, true);
        ctx.fillStyle = flash ? '#ffcc00' : '#222';
        ctx.beginPath(); ctx.ellipse(cx, cy, this.w / 2, this.h / 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FCD116';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(cx - this.w / 2 + 6 + i * 10, cy - this.h / 2 + 4);
          ctx.lineTo(cx - this.w / 2 + 10 + i * 10, cy - this.h / 2 - 4);
          ctx.lineTo(cx - this.w / 2 + 14 + i * 10, cy - this.h / 2 + 4);
          ctx.fill();
        }
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(cx + this.dir * 8, cy - 2, 3, 0, Math.PI * 2); ctx.fill();
        break;
      }
    }
    ctx.restore();
  }
}

// ---------- Particle (dust / sparkle fx) ----------
class Particle {
  constructor(o) {
    this.x = o.x; this.y = o.y;
    this.vx = o.vx || 0; this.vy = o.vy || 0;
    this.life = o.life || 0.5;
    this.maxLife = this.life;
    this.color = o.color || '#ffffff';
    this.size = o.size || 3;
    this.gravity = o.gravity || 0;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.life -= dt;
  }
  draw(ctx, camera) {
    const sx = this.x - camera.x, sy = this.y - camera.y;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(sx, sy, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function aabbOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
