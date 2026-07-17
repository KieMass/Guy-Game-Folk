/*
  player.js
  Player physics, animation state, and controls.
  Sonic-style auto-run (drifts toward a forward speed on its own, can be held back
  or sped up) combined with Mario-style gravity/jump/stomp platforming.
*/

const GRAVITY = 1900;
const MAX_FALL_SPEED = 900;
const JUMP_VELOCITY = -640;
const JUMP_CUT_MULT = 0.45;
const COYOTE_TIME = 0.1;
const AUTO_RUN_SPEED = 150;
const MAX_RUN_SPEED = 270;
const BACK_SPEED = 110;

class Player {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.w = 32; this.h = 46;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.facing = 1;
    this.coyoteTimer = 0;
    this.jumping = false;
    this.invincible = 0;
    this.hasCutlass = false;
    this.cutlassTimer = 0;
    this.swipeTimer = 0;
    this.swipeCooldown = 0;
    this.standingOn = null;
    this.animTimer = 0;
    this.state = 'idle';
    this.dead = false;
  }

  get swipeRect() {
    const w = 30;
    return this.facing > 0
      ? { x: this.x + this.w, y: this.y + 6, w, h: this.h - 12 }
      : { x: this.x - w, y: this.y + 6, w, h: this.h - 12 };
  }

  takeHit() {
    if (this.invincible > 0) return false;
    this.invincible = 1.7;
    return true;
  }

  grantCutlass() { this.hasCutlass = true; this.cutlassTimer = 14; }

  resetForCheckpoint(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.invincible = 1.2;
    this.onGround = false;
  }

  update(dt, input, platforms, t) {
    this.invincible = Math.max(0, this.invincible - dt);
    this.swipeTimer = Math.max(0, this.swipeTimer - dt);
    this.swipeCooldown = Math.max(0, this.swipeCooldown - dt);
    if (this.hasCutlass) {
      this.cutlassTimer -= dt;
      if (this.cutlassTimer <= 0) this.hasCutlass = false;
    }

    // horizontal: auto-run drift toward target speed
    let target = AUTO_RUN_SPEED;
    if (input.right) target = MAX_RUN_SPEED;
    else if (input.left) target = -BACK_SPEED;
    const accel = this.onGround ? 1500 : 850;
    if (this.vx < target) this.vx = Math.min(target, this.vx + accel * dt);
    else if (this.vx > target) this.vx = Math.max(target, this.vx - accel * dt);

    if (this.vx > 6) this.facing = 1;
    else if (this.vx < -6) this.facing = -1;

    // coyote time + jump
    if (this.onGround) this.coyoteTimer = COYOTE_TIME;
    else this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);

    if (input.jumpJustPressed && this.coyoteTimer > 0) {
      this.vy = JUMP_VELOCITY;
      this.onGround = false;
      this.coyoteTimer = 0;
      this.jumping = true;
    }
    if (!input.jump && this.vy < 0 && this.jumping) {
      this.vy *= JUMP_CUT_MULT;
      this.jumping = false;
    }
    if (this.onGround) this.jumping = false;

    // swipe (only meaningful while cutlass power-up is active)
    if (this.hasCutlass && input.swipeJustPressed && this.swipeCooldown <= 0) {
      this.swipeTimer = 0.22;
      this.swipeCooldown = 0.4;
    }

    // gravity
    this.vy = Math.min(MAX_FALL_SPEED, this.vy + GRAVITY * dt);

    // carry along a moving platform we were standing on last frame
    if (this.standingOn && this.standingOn.isSolid()) {
      this.x += this.standingOn.dx;
      this.y += Math.min(0, this.standingOn.dy);
    }
    this.standingOn = null;

    this.x += this.vx * dt;
    this._resolveAxis('x', platforms);

    this.y += this.vy * dt;
    this.onGround = false;
    this._resolveAxis('y', platforms);

    if (!this.onGround) this.state = this.vy < 0 ? 'jump' : 'fall';
    else this.state = Math.abs(this.vx) > 4 ? 'run' : 'idle';

    this.animTimer += dt * (this.onGround ? Math.max(0.6, Math.abs(this.vx) / 140) : 1);
  }

  _resolveAxis(axis, platforms) {
    for (const p of platforms) {
      if (!p.isSolid || !p.isSolid()) continue;
      if (!aabbOverlap(this, p)) continue;
      if (axis === 'x') {
        if (this.vx > 0) this.x = p.x - this.w;
        else if (this.vx < 0) this.x = p.x + p.w;
        this.vx = 0;
      } else {
        if (this.vy > 0) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.onGround = true;
          this.standingOn = p;
          if (p.trigger) p.trigger();
        } else if (this.vy < 0) {
          this.y = p.y + p.h;
          this.vy = 0;
        }
      }
    }
  }

  draw(ctx, camera, t) {
    const sx = Math.round(this.x - camera.x);
    const sy = Math.round(this.y - camera.y);
    ctx.save();
    if (this.invincible > 0 && Math.floor(t * 16) % 2 === 0) ctx.globalAlpha = 0.35;

    const cx = sx + this.w / 2;
    const legPhase = this.onGround && this.state === 'run' ? Math.sin(this.animTimer * 12) : 0;
    const squat = this.state === 'idle' ? 0 : (this.state === 'jump' ? -3 : this.state === 'fall' ? 2 : 0);

    // legs
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 6, sy + this.h - 14);
    ctx.lineTo(cx - 6 + legPhase * 7, sy + this.h - 1);
    ctx.moveTo(cx + 6, sy + this.h - 14);
    ctx.lineTo(cx + 6 - legPhase * 7, sy + this.h - 1);
    ctx.stroke();

    // body
    ctx.fillStyle = '#009E49';
    ctx.fillRect(sx + 3, sy + 15 + squat, this.w - 6, this.h - 26);
    // gold sash
    ctx.fillStyle = '#FCD116';
    ctx.fillRect(sx + 3, sy + 24 + squat, this.w - 6, 5);

    // head
    ctx.fillStyle = '#c99a6a';
    ctx.beginPath(); ctx.arc(cx, sy + 12 + squat, 11, 0, Math.PI * 2); ctx.fill();
    // hair
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath(); ctx.arc(cx, sy + 8 + squat, 11, Math.PI, Math.PI * 2); ctx.fill();
    // cap
    ctx.fillStyle = '#CE1126';
    ctx.beginPath(); ctx.arc(cx, sy + 7 + squat, 9, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
    ctx.fillRect(cx - 9, sy + 5 + squat, 18, 4);
    // eyes
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx + this.facing * 4, sy + 13 + squat, 1.6, 0, Math.PI * 2); ctx.fill();

    // arm / cutlass
    if (this.swipeTimer > 0) {
      const p = 1 - this.swipeTimer / 0.22;
      const ang = this.facing > 0 ? -0.9 + p * 1.8 : Math.PI + 0.9 - p * 1.8;
      ctx.strokeStyle = '#e6e6e6';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx + this.facing * 8, sy + 24 + squat);
      ctx.lineTo(cx + this.facing * 8 + Math.cos(ang) * 22, sy + 24 + squat + Math.sin(ang) * 22);
      ctx.stroke();
    } else if (this.hasCutlass) {
      ctx.strokeStyle = '#cfcfcf';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + this.facing * 9, sy + 28 + squat);
      ctx.lineTo(cx + this.facing * 18, sy + 16 + squat);
      ctx.stroke();
      ctx.strokeStyle = '#7a4a23'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx + this.facing * 9, sy + 28 + squat); ctx.lineTo(cx + this.facing * 5, sy + 33 + squat); ctx.stroke();
    }

    ctx.restore();
  }
}
