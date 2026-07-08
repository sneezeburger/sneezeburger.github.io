// Predators: spider, antlion, lawn mower
import { TILE_SIZE, WORLD_COLS, WORLD_ROWS } from './constants.js';

export class Predator {
  constructor(type, col, row) {
    this.type = type;
    this.x = col * TILE_SIZE + TILE_SIZE / 2;
    this.y = row * TILE_SIZE + TILE_SIZE / 2;
    this.alive = true;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = type === 'spider' ? 0.8 : type === 'lawnmower' ? 1.5 : 0;
    this.size = type === 'spider' ? 12 : type === 'lawnmower' ? 20 : 8;
    this.wanderTimer = 0;
    this.killRadius = type === 'lawnmower' ? TILE_SIZE * 2 : TILE_SIZE * 1.5;
    this.cooldown = 0;
  }

  get col() { return Math.floor(this.x / TILE_SIZE); }
  get row() { return Math.floor(this.y / TILE_SIZE); }

  update(ants) {
    if (!this.alive) return;
    this.cooldown = Math.max(0, this.cooldown - 1);

    switch (this.type) {
      case 'spider': this.updateSpider(ants); break;
      case 'antlion': this.updateAntlion(ants); break;
      case 'lawnmower': this.updateLawnmower(ants); break;
    }
  }

  updateSpider(ants) {
    // Spider wanders and eats ants it walks over
    this.wanderTimer--;
    if (this.wanderTimer <= 0) {
      this.angle += (Math.random() - 0.5) * 1.5;
      this.wanderTimer = 40 + Math.floor(Math.random() * 60);
    }

    // Move toward nearest ant sometimes
    let nearestAnt = null;
    let nearestDist = Infinity;
    const huntRange = TILE_SIZE * 8;

    for (const ant of ants) {
      if (!ant.alive || ant.underground) continue;
      const dx = ant.x - this.x;
      const dy = ant.y - this.y;
      const d = dx * dx + dy * dy;
      if (d < nearestDist && d < huntRange * huntRange) {
        nearestDist = d;
        nearestAnt = ant;
      }
    }

    if (nearestAnt && Math.random() < 0.6) {
      const dx = nearestAnt.x - this.x;
      const dy = nearestAnt.y - this.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      this.angle = Math.atan2(dy, dx);
    }

    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    // Kill ants in range
    if (this.cooldown <= 0) {
      for (const ant of ants) {
        if (!ant.alive || ant.underground) continue;
        const dx = ant.x - this.x;
        const dy = ant.y - this.y;
        if (dx * dx + dy * dy < this.killRadius * this.killRadius) {
          ant.alive = false;
          this.cooldown = 30;
          break;
        }
      }
    }

    // Clamp
    this.x = Math.max(TILE_SIZE, Math.min(this.x, (WORLD_COLS - 1) * TILE_SIZE));
    this.y = Math.max(TILE_SIZE, Math.min(this.y, (WORLD_ROWS - 1) * TILE_SIZE));
  }

  updateAntlion(ants) {
    // Antlion stays in one place and kills ants that walk over its pit
    for (const ant of ants) {
      if (!ant.alive || ant.underground) continue;
      const dx = ant.x - this.x;
      const dy = ant.y - this.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < this.killRadius) {
        // Pull ant toward center
        ant.x -= (dx / d) * 0.5;
        ant.y -= (dy / d) * 0.5;
        if (d < TILE_SIZE * 0.5) {
          ant.alive = false;
        }
      }
    }
  }

  updateLawnmower(ants) {
    // Lawnmower moves in straight lines, turns at edges
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    // Bounce off edges
    if (this.x < TILE_SIZE * 2 || this.x > (WORLD_COLS - 2) * TILE_SIZE) {
      this.angle = Math.PI - this.angle;
      this.y += TILE_SIZE * 3;
    }
    if (this.y < TILE_SIZE * 2 || this.y > (WORLD_ROWS - 2) * TILE_SIZE) {
      this.angle = -this.angle;
    }

    // Kill ALL ants in path
    for (const ant of ants) {
      if (!ant.alive || ant.underground) continue;
      const dx = ant.x - this.x;
      const dy = ant.y - this.y;
      if (dx * dx + dy * dy < this.killRadius * this.killRadius) {
        ant.alive = false;
      }
    }

    this.x = Math.max(TILE_SIZE, Math.min(this.x, (WORLD_COLS - 1) * TILE_SIZE));
    this.y = Math.max(TILE_SIZE, Math.min(this.y, (WORLD_ROWS - 1) * TILE_SIZE));
  }

  draw(ctx, camX, camY) {
    const sx = this.x - camX;
    const sy = this.y - camY;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.angle);

    switch (this.type) {
      case 'spider':
        this.drawSpider(ctx);
        break;
      case 'antlion':
        ctx.rotate(-this.angle); // antlion doesn't rotate
        this.drawAntlion(ctx);
        break;
      case 'lawnmower':
        this.drawLawnmower(ctx);
        break;
    }

    ctx.restore();
  }

  drawSpider(ctx) {
    const s = this.size;
    // Body
    ctx.fillStyle = '#2a1a0a';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.6, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.beginPath();
    ctx.ellipse(s * 0.5, 0, s * 0.35, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Legs
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 1.5;
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      const lx = i * s * 0.15;
      const side = i > 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx + side * s * 0.1, -s * 0.7);
      ctx.lineTo(lx + side * s * 0.3, -s * 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx + side * s * 0.1, s * 0.7);
      ctx.lineTo(lx + side * s * 0.3, s * 0.9);
      ctx.stroke();
    }
    // Eyes
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(s * 0.6, -s * 0.12, 1.5, 0, Math.PI * 2);
    ctx.arc(s * 0.6, s * 0.12, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawAntlion(ctx) {
    const s = this.size;
    // Pit (concentric circles)
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 1;
    for (let r = s; r > 2; r -= 3) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Center mandibles
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(0, -4);
    ctx.lineTo(3, 0);
    ctx.lineTo(0, 4);
    ctx.fill();
  }

  drawLawnmower(ctx) {
    const s = this.size;
    // Body
    ctx.fillStyle = '#cc4444';
    ctx.fillRect(-s * 0.6, -s * 0.4, s * 1.2, s * 0.8);
    // Wheels
    ctx.fillStyle = '#333';
    ctx.fillRect(-s * 0.7, -s * 0.5, s * 0.15, s);
    ctx.fillRect(s * 0.55, -s * 0.5, s * 0.15, s);
    // Handle
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, 0);
    ctx.lineTo(-s * 1.2, 0);
    ctx.stroke();
    // Blade indicator
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function createPredators() {
  const predators = [];

  // Spider
  predators.push(new Predator('spider',
    10 + Math.floor(Math.random() * 60),
    5 + Math.floor(Math.random() * 40)));

  // Another spider
  predators.push(new Predator('spider',
    10 + Math.floor(Math.random() * 60),
    5 + Math.floor(Math.random() * 40)));

  // Antlion pits
  predators.push(new Predator('antlion',
    25 + Math.floor(Math.random() * 30),
    10 + Math.floor(Math.random() * 30)));

  predators.push(new Predator('antlion',
    25 + Math.floor(Math.random() * 30),
    10 + Math.floor(Math.random() * 30)));

  return predators;
}
