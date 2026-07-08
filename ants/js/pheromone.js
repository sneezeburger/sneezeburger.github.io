// Pheromone grid system
import { WORLD_COLS, WORLD_ROWS, PHEROMONE_DECAY_RATE } from './constants.js';

export class PheromoneGrid {
  constructor() {
    this.food = this.createGrid();
    this.home = this.createGrid();
    this.alarm = this.createGrid();
    this.homeRed = this.createGrid();
    this.foodRed = this.createGrid();
  }

  createGrid() {
    return new Float32Array(WORLD_COLS * WORLD_ROWS);
  }

  idx(col, row) {
    return row * WORLD_COLS + col;
  }

  deposit(type, col, row, strength, team = 'black') {
    if (col < 0 || col >= WORLD_COLS || row < 0 || row >= WORLD_ROWS) return;
    const i = this.idx(col, row);
    if (type === 'food') {
      const grid = team === 'red' ? this.foodRed : this.food;
      grid[i] = Math.min(grid[i] + strength, 255);
    } else if (type === 'home') {
      const grid = team === 'red' ? this.homeRed : this.home;
      grid[i] = Math.min(grid[i] + strength, 255);
    } else if (type === 'alarm') {
      this.alarm[i] = Math.min(this.alarm[i] + strength, 255);
    }
  }

  get(type, col, row, team = 'black') {
    if (col < 0 || col >= WORLD_COLS || row < 0 || row >= WORLD_ROWS) return 0;
    const i = this.idx(col, row);
    if (type === 'food') return team === 'red' ? this.foodRed[i] : this.food[i];
    if (type === 'home') return team === 'red' ? this.homeRed[i] : this.home[i];
    if (type === 'alarm') return this.alarm[i];
    return 0;
  }

  update() {
    const grids = [this.food, this.home, this.alarm, this.homeRed, this.foodRed];
    for (const grid of grids) {
      for (let i = 0; i < grid.length; i++) {
        grid[i] *= PHEROMONE_DECAY_RATE;
        if (grid[i] < 0.5) grid[i] = 0;
      }
    }
  }

  // Find strongest pheromone direction from a position
  getGradient(type, col, row, team = 'black') {
    let bestVal = 0;
    let bestDx = 0;
    let bestDy = 0;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (dx === 0 && dy === 0) continue;
        const val = this.get(type, col + dx, row + dy, team);
        if (val > bestVal) {
          bestVal = val;
          bestDx = dx;
          bestDy = dy;
        }
      }
    }
    if (bestVal > 0) {
      const len = Math.sqrt(bestDx * bestDx + bestDy * bestDy);
      return { dx: bestDx / len, dy: bestDy / len, strength: bestVal };
    }
    return null;
  }
}
