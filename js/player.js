/*
  player.js
  Player physics, animation state, and controls.
  Standard Mario-style platforming: the player only moves when a direction is
  held (no auto-run), with gravity, variable jump height, and coyote time.
*/

const GRAVITY = 1800;
const MAX_FALL_SPEED = 900;
const JUMP_VELOCITY = -700;
const JUMP_CUT_MULT = 0.45;
const COYOTE_TIME = 0.1;
const MAX_RUN_SPEED = 260;

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
    this.hasBow = false;
    this.shootCooldown = 0;
    this.arrowRequested = false;
    this.starPowerTimer = 0;
    this.speedBoostTimer = 0;
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
    if (this.invincible > 0 || this.starPowerTimer > 0) return false;
    this.invincible = 1.7;
    return true;
  }

  // Cutlass and bow are alternate weapons -- only one is equipped at a time,
  // so picking one up replaces the other. Neither expires on a timer; the
  // player keeps whichever weapon they're holding until they lose a life
  // (see triggerDeath in game.js).
  grantCutlass() { this.hasCutlass = true; this.hasBow = false; }
  grantBow() { this.hasBow = true; this.hasCutlass = false; }
  grantStarPower() { this.starPowerTimer = 8; }
  grantSpeedBoost() { this.speedBoostTimer = 8; }

  resetForCheckpoint(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.invincible = 1.2;
    this.onGround = false;
  }

  update(dt, input, platforms, t) {
    if (this.state === 'victory') return; // frozen during the boss-defeat celebration pose
    this.invincible = Math.max(0, this.invincible - dt);
    this.swipeTimer = Math.max(0, this.swipeTimer - dt);
    this.swipeCooldown = Math.max(0, this.swipeCooldown - dt);
    this.starPowerTimer = Math.max(0, this.starPowerTimer - dt);
    this.speedBoostTimer = Math.max(0, this.speedBoostTimer - dt);

    // horizontal movement: only moves while a direction is actively held
    const maxSpeed = this.speedBoostTimer > 0 ? MAX_RUN_SPEED * 1.4 : MAX_RUN_SPEED;
    let target = 0;
    if (input.right) target = maxSpeed;
    else if (input.left) target = -maxSpeed;
    const accel = this.onGround ? (target === 0 ? 1900 : 1500) : 900;
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

    // attack button: fires an arrow if the bow is equipped, otherwise swipes
    // with the cutlass if that's equipped instead (only one weapon at a time)
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    this.arrowRequested = false;
    if (this.hasBow && input.swipeJustPressed && this.shootCooldown <= 0) {
      this.shootCooldown = 0.4;
      this.arrowRequested = true;
    } else if (this.hasCutlass && input.swipeJustPressed && this.swipeCooldown <= 0) {
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

    this.animTimer += dt * (this.onGround ? Math.max(0.6, Math.abs(this.vx) / 130) : 1);
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

  // ---------------- articulated limb drawing ----------------
  // Two-segment (thigh/shin or upper-arm/forearm) procedural limbs, posed
  // differently per animation state, for a more anatomical cartoon look.

  _legPose(phase, legIndex, facing) {
    let hipAngle, kneeBend;
    if (this.state === 'run') {
      hipAngle = Math.sin(phase) * 0.78;
      kneeBend = 0.18 + Math.max(0, -hipAngle) * 1.7;
    } else if (this.state === 'jump') {
      hipAngle = facing * (legIndex === 0 ? 0.55 : -0.3);
      kneeBend = legIndex === 0 ? 1.7 : 1.25;
    } else if (this.state === 'fall') {
      hipAngle = facing * (legIndex === 0 ? 0.32 : -0.18);
      kneeBend = legIndex === 0 ? 0.35 : 0.6;
    } else {
      hipAngle = 0;
      kneeBend = 0.2 + Math.sin(this.animTimer * 2.4) * 0.05;
    }
    return { hipAngle, kneeBend };
  }

  _drawLeg(ctx, hipX, hipY, phase, legIndex, facing) {
    const thigh = 11.5, shin = 12;
    const { hipAngle, kneeBend } = this._legPose(phase, legIndex, facing);
    const kneeX = hipX + Math.sin(hipAngle) * thigh;
    const kneeY = hipY + Math.cos(hipAngle) * thigh;
    const shinAngle = hipAngle + kneeBend;
    const footX = kneeX + Math.sin(shinAngle) * shin;
    const footY = kneeY + Math.cos(shinAngle) * shin;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.32)';
    ctx.lineWidth = 8.2;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY); ctx.lineTo(kneeX, kneeY); ctx.lineTo(footX, footY);
    ctx.stroke();
    // overalls-colored pant leg (stockier than before, matches the bib)
    ctx.strokeStyle = '#00893f';
    ctx.lineWidth = 6.6;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY); ctx.lineTo(kneeX, kneeY); ctx.lineTo(footX, footY);
    ctx.stroke();
    // big rounded shoe, Mario-style
    ctx.fillStyle = '#4a2f18';
    ctx.beginPath(); ctx.ellipse(footX + facing * 3, footY + 1, 6, 3.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(footX + facing * 3, footY + 1, 6, 3.6, 0, 0, Math.PI * 2); ctx.stroke();
  }

  // isBack: the far-side arm is drawn shorter, thinner, and with a smaller
  // muted (skin-tone, not bright glove-white) hand. Only ever one bright
  // white hand is on screen at a time this way -- with both arms full-size
  // and both white-gloved, the two hands could swing close enough together
  // (especially near the hip, opposite the shoulder) to read as more than
  // a two-armed silhouette.
  _drawArm(ctx, shX, shY, phase, facing, isBack) {
    const upper = isBack ? 6.5 : 8, lower = isBack ? 7 : 8.5;
    let shAngle, elbowBend;
    if (this.state === 'run') {
      shAngle = facing * Math.sin(phase) * 0.9;
      elbowBend = 0.35 + Math.max(0, Math.sin(phase)) * 0.55;
    } else if (this.state === 'jump') {
      shAngle = -facing * 0.5;
      elbowBend = 0.3;
    } else if (this.state === 'fall') {
      shAngle = facing * 0.15;
      elbowBend = 0.55;
    } else {
      shAngle = facing * Math.sin(this.animTimer * 2.4) * 0.09;
      elbowBend = 0.25;
    }
    const elbowX = shX + Math.sin(shAngle) * upper;
    const elbowY = shY + Math.cos(shAngle) * upper;
    const foreAngle = shAngle + elbowBend;
    const handX = elbowX + Math.sin(foreAngle) * lower;
    const handY = elbowY + Math.cos(foreAngle) * lower;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = isBack ? 5.2 : 6.2;
    ctx.beginPath();
    ctx.moveTo(shX, shY); ctx.lineTo(elbowX, elbowY); ctx.lineTo(handX, handY);
    ctx.stroke();
    // gold sleeve runs the full arm -- kept as one continuous stroke so the
    // elbow doesn't get its own rounded end-cap (that was reading as a
    // second, smaller "hand" at the elbow, doubling up per arm)
    ctx.strokeStyle = '#FCD116';
    ctx.lineWidth = isBack ? 3.6 : 4.6;
    ctx.beginPath();
    ctx.moveTo(shX, shY); ctx.lineTo(elbowX, elbowY); ctx.lineTo(handX, handY);
    ctx.stroke();
    if (isBack) {
      ctx.fillStyle = '#c99a6a';
      ctx.beginPath(); ctx.arc(handX, handY, 2.3, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.arc(handX, handY, 2.3, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.fillStyle = '#f5f5f0';
      ctx.beginPath(); ctx.arc(handX, handY, 3.1, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.arc(handX, handY, 3.1, 0, Math.PI * 2); ctx.stroke();
    }
  }

  _drawSwipeArm(ctx, shX, shY, facing) {
    const p = 1 - this.swipeTimer / 0.22;
    const ang = facing > 0 ? -1.1 + p * 2.0 : Math.PI + 1.1 - p * 2.0;
    const handX = shX + Math.cos(ang) * 19;
    const handY = shY + 4 + Math.sin(ang) * 19;
    ctx.strokeStyle = '#FCD116';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(shX, shY); ctx.lineTo(handX, handY); ctx.stroke();
    ctx.fillStyle = '#f5f5f0';
    ctx.beginPath(); ctx.arc(handX, handY, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e6e6e6';
    ctx.lineWidth = 3.5;
    const bladeAng = ang - facing * 0.5;
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(handX + Math.cos(bladeAng) * 20, handY + Math.sin(bladeAng) * 20);
    ctx.stroke();
  }

  // Post-boss celebration: fist raised with the thumb up, drawn separately
  // from _drawArm since it's a held pose rather than a swinging limb. Swung
  // out to the side (not straight up) so the head -- drawn afterward, on
  // top -- doesn't paint over and hide the fist.
  _drawThumbsUp(ctx, shX, shY, lift) {
    const elbowX = shX + 6, elbowY = shY - 2;
    const handX = shX + 11, handY = shY - 9 - lift;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 6.2;
    ctx.beginPath(); ctx.moveTo(shX, shY); ctx.lineTo(elbowX, elbowY); ctx.lineTo(handX, handY); ctx.stroke();
    ctx.strokeStyle = '#FCD116';
    ctx.lineWidth = 4.6;
    ctx.beginPath(); ctx.moveTo(shX, shY); ctx.lineTo(elbowX, elbowY); ctx.lineTo(handX, handY); ctx.stroke();
    ctx.fillStyle = '#f5f5f0';
    ctx.beginPath(); ctx.arc(handX, handY, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.arc(handX, handY, 3.4, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#f5f5f0'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(handX, handY - 1); ctx.lineTo(handX, handY - 6); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.moveTo(handX, handY - 1); ctx.lineTo(handX, handY - 6); ctx.stroke();
  }

  // Boss-defeat celebration pose: turns to face the camera (front-on head
  // instead of the usual profile), winks, and gives a thumbs up.
  _drawVictoryPose(ctx, sx, sy, cx, t) {
    const bob = Math.sin(t * 3) * 1.4;
    const hipY = sy + this.h - 15;
    const shoulderY = sy + 21 + bob * 0.4;

    if (this.onGround) drawGroundShadow(ctx, cx, sy + this.h + 1, this.w * 0.5);

    this._drawLeg(ctx, cx - 4, hipY, 0, 0, 1);
    this._drawLeg(ctx, cx + 4, hipY, Math.PI, 1, 1);

    const overallColor = '#009E49', shirtColor = '#FCD116';
    const tw = this.w - 4, th = this.h - 31;
    const tx = cx - tw / 2;
    ctx.beginPath();
    ctx.moveTo(tx, shoulderY + 1);
    ctx.quadraticCurveTo(tx - 2, shoulderY + th / 2, tx + 1, shoulderY + th);
    ctx.lineTo(tx + tw - 1, shoulderY + th);
    ctx.quadraticCurveTo(tx + tw + 2, shoulderY + th / 2, tx + tw, shoulderY + 1);
    ctx.closePath();
    ctx.fillStyle = shirtColor;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.stroke();

    const inset = tw * 0.14;
    const bibTop = shoulderY + th * 0.3;
    ctx.beginPath();
    ctx.moveTo(tx + inset, bibTop);
    ctx.lineTo(tx + tw - inset, bibTop);
    ctx.lineTo(tx + tw - inset * 0.4, shoulderY + th);
    ctx.lineTo(tx + inset * 0.4, shoulderY + th);
    ctx.closePath();
    ctx.fillStyle = overallColor;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.stroke();
    ctx.strokeStyle = overallColor;
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx + inset + 1, bibTop); ctx.lineTo(tx + tw * 0.3, shoulderY - 3);
    ctx.moveTo(tx + tw - inset - 1, bibTop); ctx.lineTo(tx + tw * 0.7, shoulderY - 3);
    ctx.stroke();
    ctx.fillStyle = '#FCD116';
    ctx.beginPath(); ctx.arc(tx + inset + 1, bibTop, 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(tx + tw - inset - 1, bibTop, 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath(); ctx.ellipse(tx + tw * 0.32, shoulderY + th * 0.6, tw * 0.16, th * 0.22, -0.2, 0, Math.PI * 2); ctx.fill();

    // relaxed arm at the player's side, thumbs-up arm raised on the other
    this._drawArm(ctx, cx - 4, shoulderY, 0, 1, true);
    this._drawThumbsUp(ctx, cx + 5, shoulderY, bob);

    // front-facing head -- both eyes visible (one winking) instead of the
    // usual side profile, so it clearly reads as "looking out of the screen"
    const headR = 12.5;
    const headCy = sy + 13 + bob * 0.3;
    const headCx = cx;
    ctx.fillStyle = '#c99a6a';
    ctx.beginPath(); ctx.arc(headCx, headCy, headR, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.arc(headCx, headCy, headR, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#2a1c10';
    ctx.beginPath(); ctx.arc(headCx, headCy - 1, headR, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#CE1126';
    ctx.beginPath(); ctx.arc(headCx, headCy - 2, headR - 1.6, Math.PI * 0.92, Math.PI * 2.08); ctx.fill();
    ctx.fillRect(headCx - (headR - 1.6), headCy - 4, (headR - 1.6) * 2, 4.5);
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.arc(headCx, headCy - 2, headR - 1.6, Math.PI * 0.92, Math.PI * 2.08); ctx.stroke();
    ctx.fillStyle = '#CE1126';
    ctx.beginPath(); ctx.ellipse(headCx, headCy + 1.5, 7.5, 2.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(headCx, headCy + 1.5, 7.5, 2.8, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.ellipse(headCx - 3, headCy - 5, 3, 2, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FCD116';
    ctx.beginPath(); ctx.arc(headCx, headCy - 7, 2.1, 0, Math.PI * 2); ctx.fill();

    // left eye open with a sparkle, right eye winking shut
    const eyeY = headCy + 3;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(headCx - 4.5, eyeY, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(headCx - 4, eyeY, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(headCx + 4.5, eyeY, 2.1, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();

    // big grin + a rosy cheek on the winking side
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(headCx, headCy + 4, 4.2, Math.PI * 0.12, Math.PI * 0.88); ctx.stroke();
    ctx.fillStyle = 'rgba(255,120,120,0.35)';
    ctx.beginPath(); ctx.ellipse(headCx + 7, headCy + 5, 2, 1.4, 0, 0, Math.PI * 2); ctx.fill();
  }

  draw(ctx, camera, t) {
    const sx = Math.round(this.x - camera.x);
    const sy = Math.round(this.y - camera.y);
    ctx.save();
    if (this.invincible > 0 && Math.floor(t * 16) % 2 === 0) ctx.globalAlpha = 0.35;

    const cx = sx + this.w / 2;

    if (this.state === 'victory') {
      this._drawVictoryPose(ctx, sx, sy, cx, t);
      ctx.restore();
      return;
    }

    const facing = this.facing;
    const speedRatio = Math.max(0, Math.min(1, Math.abs(this.vx) / MAX_RUN_SPEED));

    if (this.speedBoostTimer > 0 && Math.abs(this.vx) > 20) {
      ctx.strokeStyle = 'rgba(58,214,255,0.55)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const off = 8 + i * 8;
        ctx.beginPath();
        ctx.moveTo(cx - facing * (this.w / 2 + off), sy + 12 + i * 9);
        ctx.lineTo(cx - facing * (this.w / 2 + off + 13), sy + 12 + i * 9);
        ctx.stroke();
      }
    }
    if (this.starPowerTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.55 + Math.sin(t * 10) * 0.2;
      ctx.strokeStyle = `hsl(${(t * 260) % 360},90%,60%)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, sy + this.h / 2, this.h * 0.68, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    let squat = 0, lean = 0;
    if (this.state === 'run') { lean = facing * 3 * speedRatio; }
    else if (this.state === 'jump') { squat = -3; lean = facing * 2; }
    else if (this.state === 'fall') { squat = 2; lean = facing * 1; }
    else { squat = Math.sin(this.animTimer * 2.4) * 0.6; }

    const hipY = sy + this.h - 15;
    const shoulderY = sy + 23 + squat;
    const legPhase = this.animTimer * 11;

    // grounded contact shadow -- keeps the character from feeling like it's
    // floating over a flat-color background
    if (this.onGround) drawGroundShadow(ctx, cx, sy + this.h + 1, this.w * 0.5);

    // legs (drawn behind torso)
    this._drawLeg(ctx, cx - 4, hipY, legPhase, 0, facing);
    this._drawLeg(ctx, cx + 4, hipY, legPhase + Math.PI, 1, facing);

    // torso: a gold long-sleeve shirt with green dungaree-style overalls on
    // top (straps + buttons), evoking a classic platformer hero silhouette
    // while keeping the Guyana flag palette instead of red/blue.
    const overallColor = this.starPowerTimer > 0 ? `hsl(${(t * 300) % 360},75%,42%)` : '#009E49';
    const shirtColor = this.starPowerTimer > 0 ? `hsl(${(t * 300 + 55) % 360},85%,62%)` : '#FCD116';
    const tw = this.w - 4, th = this.h - 31;
    const tx = cx - tw / 2 + lean * 0.4;

    // shirt (wider, peeks out past the overalls at the shoulders/sides)
    ctx.beginPath();
    ctx.moveTo(tx, shoulderY + 1);
    ctx.quadraticCurveTo(tx - 2, shoulderY + th / 2, tx + 1, shoulderY + th);
    ctx.lineTo(tx + tw - 1, shoulderY + th);
    ctx.quadraticCurveTo(tx + tw + 2, shoulderY + th / 2, tx + tw, shoulderY + 1);
    ctx.closePath();
    ctx.fillStyle = shirtColor;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.stroke();

    // overalls bib (narrower, sits centered on top of the shirt)
    const inset = tw * 0.14;
    const bibTop = shoulderY + th * 0.3;
    ctx.beginPath();
    ctx.moveTo(tx + inset, bibTop);
    ctx.lineTo(tx + tw - inset, bibTop);
    ctx.lineTo(tx + tw - inset * 0.4, shoulderY + th);
    ctx.lineTo(tx + inset * 0.4, shoulderY + th);
    ctx.closePath();
    ctx.fillStyle = overallColor;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.stroke();
    // straps over the shoulders
    ctx.strokeStyle = overallColor;
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx + inset + 1, bibTop); ctx.lineTo(tx + tw * 0.3, shoulderY - 3);
    ctx.moveTo(tx + tw - inset - 1, bibTop); ctx.lineTo(tx + tw * 0.7, shoulderY - 3);
    ctx.stroke();
    // buttons where the straps meet the bib
    ctx.fillStyle = '#FCD116';
    ctx.beginPath(); ctx.arc(tx + inset + 1, bibTop, 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(tx + tw - inset - 1, bibTop, 1.7, 0, Math.PI * 2); ctx.fill();
    // rounded highlight for a touch of volume instead of flat color
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath(); ctx.ellipse(tx + tw * 0.32, shoulderY + th * 0.6, tw * 0.16, th * 0.22, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(tx + tw - 4, shoulderY, 4, th);

    // arms (front arm swipes with the cutlass when active)
    // Shoulder x-offsets follow facing, same as the head/nose below, so the
    // "front" arm sits toward the direction of travel and the "back" arm
    // tucks in behind it instead of both hanging off two points 4px apart
    // near dead center -- that fixed, facing-independent placement (plus the
    // run-cycle swing not accounting for facing either, fixed above) is what
    // made the two hands cluster together and read as more than two.
    const backShX = cx - facing * 2, frontShX = cx + facing * 4;
    if (this.swipeTimer > 0) {
      this._drawArm(ctx, backShX, shoulderY, legPhase + Math.PI, facing, true);
      this._drawSwipeArm(ctx, frontShX, shoulderY, facing);
    } else {
      this._drawArm(ctx, backShX, shoulderY, legPhase + Math.PI, facing, true);
      this._drawArm(ctx, frontShX, shoulderY, legPhase, facing, false);
    }

    // head -- bigger and rounder, with a nose bump and a backwards-turned
    // capped brim, closer to a classic platformer-hero read while staying
    // flag-gold/green/red instead of the reference's red-and-blue
    const headR = 12.5;
    const headCy = sy + 13 + squat + lean * 0.15;
    const headCx = cx + lean * 0.6;
    ctx.fillStyle = '#c99a6a';
    ctx.beginPath(); ctx.arc(headCx, headCy, headR, 0, Math.PI * 2); ctx.fill();
    // ear (back of head)
    ctx.beginPath(); ctx.arc(headCx - facing * 11, headCy + 3, 2.4, 0, Math.PI * 2); ctx.fill();
    // nose bump (front of face)
    ctx.beginPath(); ctx.arc(headCx + facing * 10.5, headCy + 4, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.arc(headCx + facing * 10.5, headCy + 4, 3.6, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.arc(headCx, headCy, headR, 0, Math.PI * 2); ctx.stroke();
    // hair (back/top, behind the cap)
    ctx.fillStyle = '#2a1c10';
    ctx.beginPath(); ctx.arc(headCx, headCy - 1, headR, Math.PI, Math.PI * 2); ctx.fill();
    // cap dome + band
    ctx.fillStyle = '#CE1126';
    ctx.beginPath(); ctx.arc(headCx, headCy - 2, headR - 1.6, Math.PI * 0.92, Math.PI * 2.08); ctx.fill();
    ctx.fillRect(headCx - (headR - 1.6), headCy - 4, (headR - 1.6) * 2, 4.5);
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.arc(headCx, headCy - 2, headR - 1.6, Math.PI * 0.92, Math.PI * 2.08); ctx.stroke();
    // cap brim, turned backwards (opposite the way the player is facing)
    ctx.fillStyle = '#CE1126';
    ctx.beginPath(); ctx.ellipse(headCx - facing * 8, headCy + 1.5, 7.5, 2.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(headCx - facing * 8, headCy + 1.5, 7.5, 2.8, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath(); ctx.ellipse(headCx - 3, headCy - 5, 3, 2, -0.3, 0, Math.PI * 2); ctx.fill();
    // gold emblem on the cap (nods to the flag's golden arrowhead)
    ctx.fillStyle = '#FCD116';
    ctx.beginPath(); ctx.arc(headCx, headCy - 7, 2.1, 0, Math.PI * 2); ctx.fill();
    // eyes -- the cap dome's fill only clears down to about headCy+0.7 (it's
    // a circle clipped flat along that line), so an eye any higher than that
    // was landing inside the dome's own red fill and disappearing into the
    // hat instead of reading on the face. Placed clearly below that line now,
    // with a white sclera behind the pupil so it pops against the skin tone.
    const eyeY = headCy + 3;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(headCx + facing * 5, eyeY, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(headCx + facing * 5.6, eyeY, 1.2, 0, Math.PI * 2); ctx.fill();

    // cutlass sheathed at the hip when carried but not mid-swipe -- hangs
    // down alongside the back leg (previously the blade tip pointed all the
    // way up near head height, which read as floating beside the face)
    if (this.hasCutlass && this.swipeTimer <= 0) {
      const hiltX = cx - facing * 9, hiltY = hipY - 2;
      const tipX = cx - facing * 4, tipY = hipY + 14;
      ctx.strokeStyle = '#cfcfcf'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hiltX, hiltY); ctx.lineTo(tipX, tipY); ctx.stroke();
      ctx.strokeStyle = '#7a4a23'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(hiltX, hiltY); ctx.lineTo(hiltX - facing * 3, hiltY - 5); ctx.stroke();
    }

    ctx.restore();
  }
}
