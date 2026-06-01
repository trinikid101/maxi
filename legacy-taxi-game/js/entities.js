/* Entities: the Maxi taxi (recreated from the photo — white body, colour band
 * stripe, big windscreen), passengers, drop-offs and road hazards.
 * World space: +y = forward (north). Camera follows the maxi. */
window.GAME = window.GAME || {};

// rounded rect helper
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
GAME.rr = rr;

GAME.Maxi = class {
  constructor(band) {
    this.x = 0;            // lateral position (world units, 0 = road centre)
    this.y = 0;            // forward position
    this.w = 54;
    this.h = 96;
    this.speed = 0;        // forward speed (units/sec)
    this.steer = 0;        // -1..1 input
    this.band = band;
    this.passenger = null; // currently carried passenger archetype
  }

  setBand(band) { this.band = band; }

  // top-down maxi, drawn centred at screen (sx, sy)
  draw(ctx, sx, sy) {
    const w = this.w, h = this.h;
    ctx.save();
    ctx.translate(sx, sy);
    // tilt slightly into the steer for juice
    ctx.rotate(this.steer * 0.06);

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    rr(ctx, -w / 2 + 4, -h / 2 + 8, w, h, 12);
    ctx.fill();

    // body (white)
    ctx.fillStyle = '#f7f7f2';
    rr(ctx, -w / 2, -h / 2, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = '#d0d0c8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // colour band stripe (runs down both flanks, like the photo)
    ctx.fillStyle = this.band.stripe;
    ctx.fillRect(-w / 2, -h * 0.16, w, h * 0.16);
    // thin chrome line under stripe
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(-w / 2, h * 0.0, w, 3);

    // windscreen (front = top)
    ctx.fillStyle = '#3a4a5a';
    rr(ctx, -w / 2 + 7, -h / 2 + 6, w - 14, h * 0.2, 6);
    ctx.fill();
    // side windows
    ctx.fillStyle = '#54677a';
    ctx.fillRect(-w / 2 + 4, -h / 2 + 28, 6, h * 0.42);
    ctx.fillRect(w / 2 - 10, -h / 2 + 28, 6, h * 0.42);
    // rear window
    ctx.fillStyle = '#46586a';
    rr(ctx, -w / 2 + 9, h / 2 - 16, w - 18, 10, 4);
    ctx.fill();

    // headlights (front)
    ctx.fillStyle = '#fff6c2';
    ctx.fillRect(-w / 2 + 4, -h / 2 + 2, 9, 4);
    ctx.fillRect(w / 2 - 13, -h / 2 + 2, 9, 4);
    // tail lights
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(-w / 2 + 4, h / 2 - 5, 9, 4);
    ctx.fillRect(w / 2 - 13, h / 2 - 5, 9, 4);

    // wheels
    ctx.fillStyle = '#15161a';
    ctx.fillRect(-w / 2 - 4, -h / 2 + 18, 6, 18);
    ctx.fillRect(w / 2 - 2, -h / 2 + 18, 6, 18);
    ctx.fillRect(-w / 2 - 4, h / 2 - 36, 6, 18);
    ctx.fillRect(w / 2 - 2, h / 2 - 36, 6, 18);

    // "MAXI" tag on roof
    ctx.fillStyle = this.band.stripe;
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MAXI', 0, 4);

    // occupied indicator
    if (this.passenger) {
      ctx.fillStyle = this.passenger.color;
      ctx.beginPath();
      ctx.arc(0, -h * 0.05, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
};

// A waving passenger at the roadside
GAME.Passenger = class {
  constructor(archetype, x, y) {
    this.a = archetype;
    this.x = x;            // lateral (roadside)
    this.y = y;            // forward position
    this.r = 16;
    this.wave = Math.random() * Math.PI * 2;
    this.picked = false;
  }
  update(dt) { this.wave += dt * 6; }
  draw(ctx, sx, sy) {
    ctx.save();
    ctx.translate(sx, sy);
    // ground marker ring — turns green & solid when the maxi is lined up
    if (this._near) {
      ctx.fillStyle = 'rgba(16,185,129,0.30)';
      ctx.beginPath();
      ctx.arc(0, 6, this.r + 16 + Math.sin(this.wave) * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4;
    } else {
      ctx.strokeStyle = this.a.color;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 3;
    }
    ctx.beginPath();
    ctx.arc(0, 6, this.r + 6 + Math.sin(this.wave) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // body
    ctx.fillStyle = this.a.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fill();
    // head
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.arc(0, -this.r - 4, 7, 0, Math.PI * 2);
    ctx.fill();
    // waving arm
    const aw = Math.sin(this.wave) * 0.5;
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(this.r - 4, -2);
    ctx.lineTo(this.r + 6, -10 + aw * 8);
    ctx.stroke();
    ctx.restore();
  }
};

// Drop-off destination
GAME.Dropoff = class {
  constructor(x, y) { this.x = x; this.y = y; this.r = 30; this.t = 0; }
  update(dt) { this.t += dt * 3; }
  draw(ctx, sx, sy) {
    ctx.save();
    ctx.translate(sx, sy);
    const pulse = 1 + Math.sin(this.t) * 0.12;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(0, 0, this.r * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#063';
    ctx.font = 'bold 22px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏁', 0, 1);
    ctx.restore();
  }
};

// Road hazards: pothole, goat, limer, roadblock, flood-patch
GAME.Hazard = class {
  constructor(kind, x, y) {
    this.kind = kind; this.x = x; this.y = y; this.dead = false;
    this.r = kind === 'roadblock' ? 26 : 18;
    this.t = Math.random() * 6;
  }
  update(dt) { this.t += dt; if (this.kind === 'goat') this.x += Math.sin(this.t * 1.5) * 18 * dt; }
  draw(ctx, sx, sy) {
    ctx.save();
    ctx.translate(sx, sy);
    if (this.kind === 'pothole') {
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.ellipse(0, 0, this.r, this.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#444'; ctx.lineWidth = 2; ctx.stroke();
    } else if (this.kind === 'goat') {
      ctx.font = '30px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🐐', 0, 0);
    } else if (this.kind === 'limer') {
      ctx.font = '28px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🍺', 0, 0);
    } else if (this.kind === 'flood') {
      ctx.fillStyle = 'rgba(56,120,200,0.45)';
      ctx.beginPath(); ctx.ellipse(0, 0, this.r * 1.6, this.r, 0, 0, Math.PI * 2); ctx.fill();
      ctx.font = '20px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🌊', 0, 0);
    } else if (this.kind === 'roadblock') {
      ctx.fillStyle = '#1f6feb';
      rr(ctx, -this.r, -10, this.r * 2, 20, 4); ctx.fill();
      ctx.font = '22px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('👮', 0, -2);
    }
    ctx.restore();
  }
};
