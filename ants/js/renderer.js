// Canvas renderer for SimAnt
import {
  TILE_SIZE, WORLD_COLS, WORLD_ROWS,
  SURFACE, UNDERGROUND, COLORS, CASTE,
} from './constants.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camX = 0;
    this.camY = 0;
    this.viewWidth = canvas.width;
    this.viewHeight = canvas.height;
    this.showPheromones = false;
    this.pheromoneType = 'food'; // 'food', 'home', 'alarm'
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.viewWidth = w;
    this.viewHeight = h;
  }

  centerOn(x, y) {
    this.camX = x - this.viewWidth / 2;
    this.camY = y - this.viewHeight / 2;
    this.clampCamera();
  }

  clampCamera() {
    this.camX = Math.max(0, Math.min(this.camX, WORLD_COLS * TILE_SIZE - this.viewWidth));
    this.camY = Math.max(0, Math.min(this.camY, WORLD_ROWS * TILE_SIZE - this.viewHeight));
  }

  clear() {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
  }

  drawWorld(world) {
    const ctx = this.ctx;
    const startCol = Math.max(0, Math.floor(this.camX / TILE_SIZE));
    const endCol = Math.min(WORLD_COLS, Math.ceil((this.camX + this.viewWidth) / TILE_SIZE) + 1);
    const startRow = Math.max(0, Math.floor(this.camY / TILE_SIZE));
    const endRow = Math.min(WORLD_ROWS, Math.ceil((this.camY + this.viewHeight) / TILE_SIZE) + 1);

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const sx = col * TILE_SIZE - this.camX;
        const sy = row * TILE_SIZE - this.camY;

        if (world.isUnderground) {
          this.drawUndergroundTile(ctx, col, row, sx, sy, world);
        } else {
          this.drawSurfaceTile(ctx, col, row, sx, sy, world);
        }
      }
    }
  }

  drawSurfaceTile(ctx, col, row, sx, sy, world) {
    const tile = world.getSurface(col, row);
    const checker = (col + row) % 2 === 0;

    switch (tile) {
      case SURFACE.GRASS:
        ctx.fillStyle = checker ? COLORS.GRASS_LIGHT : COLORS.GRASS_DARK;
        break;
      case SURFACE.DIRT:
        ctx.fillStyle = COLORS.DIRT;
        break;
      case SURFACE.ROCK:
        ctx.fillStyle = COLORS.ROCK;
        break;
      case SURFACE.SAND:
        ctx.fillStyle = COLORS.SAND;
        break;
      case SURFACE.WATER:
        ctx.fillStyle = COLORS.WATER;
        break;
      case SURFACE.NEST_ENTRANCE:
        ctx.fillStyle = COLORS.NEST_ENTRANCE;
        break;
      case SURFACE.FOOD_CRUMB:
        ctx.fillStyle = checker ? COLORS.GRASS_LIGHT : COLORS.GRASS_DARK;
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        // Draw food crumb on top
        ctx.fillStyle = COLORS.FOOD_CRUMB;
        ctx.beginPath();
        ctx.arc(sx + TILE_SIZE / 2, sy + TILE_SIZE / 2, 3, 0, Math.PI * 2);
        ctx.fill();
        return;
      case SURFACE.FOOD_BUG:
        ctx.fillStyle = checker ? COLORS.GRASS_LIGHT : COLORS.GRASS_DARK;
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        // Draw dead bug
        ctx.fillStyle = COLORS.FOOD_BUG;
        ctx.beginPath();
        ctx.ellipse(sx + TILE_SIZE / 2, sy + TILE_SIZE / 2, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        // Bug legs
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(sx + TILE_SIZE / 2 + i * 3, sy + TILE_SIZE / 2 - 3);
          ctx.lineTo(sx + TILE_SIZE / 2 + i * 3 - 2, sy + TILE_SIZE / 2 - 6);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(sx + TILE_SIZE / 2 + i * 3, sy + TILE_SIZE / 2 + 3);
          ctx.lineTo(sx + TILE_SIZE / 2 + i * 3 - 2, sy + TILE_SIZE / 2 + 6);
          ctx.stroke();
        }
        return;
      default:
        ctx.fillStyle = COLORS.GRASS_LIGHT;
    }
    ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);

    // Nest entrance marker
    if (tile === SURFACE.NEST_ENTRANCE) {
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      ctx.arc(sx + TILE_SIZE / 2, sy + TILE_SIZE / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawUndergroundTile(ctx, col, row, sx, sy, world) {
    const tile = world.getUnderground(col, row);

    switch (tile) {
      case UNDERGROUND.SOLID:
        ctx.fillStyle = COLORS.SOLID_EARTH;
        break;
      case UNDERGROUND.TUNNEL:
        ctx.fillStyle = COLORS.TUNNEL;
        break;
      case UNDERGROUND.CHAMBER:
        ctx.fillStyle = COLORS.CHAMBER;
        break;
      case UNDERGROUND.QUEEN_CHAMBER:
        ctx.fillStyle = '#7B6354';
        break;
      case UNDERGROUND.FOOD_STORE:
        ctx.fillStyle = '#6B6344';
        break;
      case UNDERGROUND.BROOD_CHAMBER:
        ctx.fillStyle = '#5B5374';
        break;
      default:
        ctx.fillStyle = COLORS.SOLID_EARTH;
    }
    ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);

    // Add some texture to tunnels
    if (tile !== UNDERGROUND.SOLID) {
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(sx, sy, TILE_SIZE, TILE_SIZE);
    }
  }

  drawPheromones(pheromones, team) {
    const ctx = this.ctx;
    const startCol = Math.max(0, Math.floor(this.camX / TILE_SIZE));
    const endCol = Math.min(WORLD_COLS, Math.ceil((this.camX + this.viewWidth) / TILE_SIZE) + 1);
    const startRow = Math.max(0, Math.floor(this.camY / TILE_SIZE));
    const endRow = Math.min(WORLD_ROWS, Math.ceil((this.camY + this.viewHeight) / TILE_SIZE) + 1);

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const sx = col * TILE_SIZE - this.camX;
        const sy = row * TILE_SIZE - this.camY;

        const foodVal = pheromones.get('food', col, row, team);
        const homeVal = pheromones.get('home', col, row, team);
        const alarmVal = pheromones.get('alarm', col, row);

        if (foodVal > 2) {
          ctx.fillStyle = `rgba(0, 255, 0, ${Math.min(foodVal / 100, 0.5)})`;
          ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        }
        if (homeVal > 2) {
          ctx.fillStyle = `rgba(0, 100, 255, ${Math.min(homeVal / 100, 0.4)})`;
          ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        }
        if (alarmVal > 2) {
          ctx.fillStyle = `rgba(255, 0, 0, ${Math.min(alarmVal / 100, 0.5)})`;
          ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  drawAnts(ants, isUnderground) {
    const ctx = this.ctx;
    for (const ant of ants) {
      if (!ant.alive) continue;
      if (ant.underground !== isUnderground) continue;

      const sx = ant.x - this.camX;
      const sy = ant.y - this.camY;

      // Cull offscreen
      if (sx < -20 || sx > this.viewWidth + 20 || sy < -20 || sy > this.viewHeight + 20) continue;

      this.drawAnt(ctx, ant, sx, sy);
    }
  }

  drawAnt(ctx, ant, sx, sy) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ant.angle);

    const s = ant.size;

    // Choose color
    let bodyColor;
    if (ant.isPlayer) {
      bodyColor = COLORS.PLAYER_ANT;
    } else if (ant.team === 'red') {
      bodyColor = COLORS.RED_ANT;
    } else {
      bodyColor = COLORS.BLACK_ANT;
    }

    if (ant.caste === CASTE.QUEEN) {
      bodyColor = ant.team === 'red' ? '#991111' : '#442200';
    }

    // Ant body (3 segments)
    ctx.fillStyle = bodyColor;

    // Head
    ctx.beginPath();
    ctx.ellipse(s * 0.8, 0, s * 0.35, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thorax
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.4, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Abdomen
    ctx.beginPath();
    ctx.ellipse(-s * 0.8, 0, s * 0.5, s * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 0.8;
    for (let i = -1; i <= 1; i++) {
      const lx = i * s * 0.3;
      ctx.beginPath();
      ctx.moveTo(lx, -s * 0.25);
      ctx.lineTo(lx - s * 0.1, -s * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(lx, s * 0.25);
      ctx.lineTo(lx - s * 0.1, s * 0.6);
      ctx.stroke();
    }

    // Antennae
    ctx.beginPath();
    ctx.moveTo(s * 0.9, -s * 0.2);
    ctx.quadraticCurveTo(s * 1.2, -s * 0.5, s * 1.4, -s * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.9, s * 0.2);
    ctx.quadraticCurveTo(s * 1.2, s * 0.5, s * 1.4, s * 0.3);
    ctx.stroke();

    // Mandibles for soldiers
    if (ant.caste === CASTE.SOLDIER) {
      ctx.strokeStyle = '#660000';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(s * 1.0, -s * 0.1);
      ctx.lineTo(s * 1.3, -s * 0.3);
      ctx.lineTo(s * 1.2, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 1.0, s * 0.1);
      ctx.lineTo(s * 1.3, s * 0.3);
      ctx.lineTo(s * 1.2, 0);
      ctx.stroke();
    }

    // Food carried indicator
    if (ant.carrying > 0) {
      ctx.fillStyle = COLORS.FOOD_CRUMB;
      ctx.beginPath();
      ctx.arc(s * 1.1, 0, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player glow
    if (ant.isPlayer) {
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Health bar for damaged ants
    if (ant.hp < ant.maxHp) {
      ctx.rotate(-ant.angle); // un-rotate for health bar
      const barW = s * 2;
      const barH = 2;
      const hpPct = ant.hp / ant.maxHp;
      ctx.fillStyle = '#333';
      ctx.fillRect(-barW / 2, -s * 1.5, barW, barH);
      ctx.fillStyle = hpPct > 0.5 ? '#0f0' : hpPct > 0.25 ? '#ff0' : '#f00';
      ctx.fillRect(-barW / 2, -s * 1.5, barW * hpPct, barH);
    }

    ctx.restore();
  }

  drawPredators(predators) {
    for (const pred of predators) {
      if (!pred.alive) continue;
      pred.draw(this.ctx, this.camX, this.camY);
    }
  }

  drawMinimap(world, playerAnt, blackColony, redColony) {
    const ctx = this.ctx;
    const mmW = 160;
    const mmH = 100;
    const mmX = this.viewWidth - mmW - 10;
    const mmY = 10;
    const scaleX = mmW / WORLD_COLS;
    const scaleY = mmH / WORLD_ROWS;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4);

    // Terrain (simplified)
    for (let row = 0; row < WORLD_ROWS; row += 2) {
      for (let col = 0; col < WORLD_COLS; col += 2) {
        const tile = world.getSurface(col, row);
        switch (tile) {
          case SURFACE.ROCK: ctx.fillStyle = '#666'; break;
          case SURFACE.WATER: ctx.fillStyle = '#44c'; break;
          case SURFACE.NEST_ENTRANCE: ctx.fillStyle = '#840'; break;
          case SURFACE.FOOD_CRUMB:
          case SURFACE.FOOD_BUG: ctx.fillStyle = '#cc0'; break;
          default: ctx.fillStyle = '#3a6b30'; break;
        }
        ctx.fillRect(mmX + col * scaleX, mmY + row * scaleY, scaleX * 2, scaleY * 2);
      }
    }

    // Colony positions
    // Black ants
    ctx.fillStyle = '#333';
    for (const ant of blackColony.ants) {
      if (!ant.alive || ant.underground) continue;
      ctx.fillRect(
        mmX + (ant.x / TILE_SIZE) * scaleX,
        mmY + (ant.y / TILE_SIZE) * scaleY,
        1, 1
      );
    }

    // Red ants
    ctx.fillStyle = '#c33';
    for (const ant of redColony.ants) {
      if (!ant.alive || ant.underground) continue;
      ctx.fillRect(
        mmX + (ant.x / TILE_SIZE) * scaleX,
        mmY + (ant.y / TILE_SIZE) * scaleY,
        1, 1
      );
    }

    // Player
    if (playerAnt.alive) {
      ctx.fillStyle = '#ff0';
      ctx.fillRect(
        mmX + (playerAnt.x / TILE_SIZE) * scaleX - 1,
        mmY + (playerAnt.y / TILE_SIZE) * scaleY - 1,
        3, 3
      );
    }

    // Viewport rectangle
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      mmX + (this.camX / TILE_SIZE) * scaleX,
      mmY + (this.camY / TILE_SIZE) * scaleY,
      (this.viewWidth / TILE_SIZE) * scaleX,
      (this.viewHeight / TILE_SIZE) * scaleY
    );

    // Border
    ctx.strokeStyle = COLORS.UI_BORDER;
    ctx.lineWidth = 2;
    ctx.strokeRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4);
  }
}
