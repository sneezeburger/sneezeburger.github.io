// World generation and management
import {
  WORLD_COLS, WORLD_ROWS, TILE_SIZE,
  SURFACE, UNDERGROUND, COLORS,
} from './constants.js';

export class World {
  constructor() {
    this.surface = new Uint8Array(WORLD_COLS * WORLD_ROWS);
    this.underground = new Uint8Array(WORLD_COLS * WORLD_ROWS);
    this.foodMap = new Float32Array(WORLD_COLS * WORLD_ROWS); // food amount per tile
    this.isUnderground = false;
    this.generate();
  }

  idx(col, row) {
    return row * WORLD_COLS + col;
  }

  getSurface(col, row) {
    if (col < 0 || col >= WORLD_COLS || row < 0 || row >= WORLD_ROWS) return SURFACE.ROCK;
    return this.surface[this.idx(col, row)];
  }

  getUnderground(col, row) {
    if (col < 0 || col >= WORLD_COLS || row < 0 || row >= WORLD_ROWS) return UNDERGROUND.SOLID;
    return this.underground[this.idx(col, row)];
  }

  setUnderground(col, row, val) {
    if (col < 0 || col >= WORLD_COLS || row < 0 || row >= WORLD_ROWS) return;
    this.underground[this.idx(col, row)] = val;
  }

  setSurface(col, row, val) {
    if (col < 0 || col >= WORLD_COLS || row < 0 || row >= WORLD_ROWS) return;
    this.surface[this.idx(col, row)] = val;
  }

  getFood(col, row) {
    if (col < 0 || col >= WORLD_COLS || row < 0 || row >= WORLD_ROWS) return 0;
    return this.foodMap[this.idx(col, row)];
  }

  addFood(col, row, amount) {
    if (col < 0 || col >= WORLD_COLS || row < 0 || row >= WORLD_ROWS) return;
    this.foodMap[this.idx(col, row)] += amount;
  }

  removeFood(col, row, amount) {
    if (col < 0 || col >= WORLD_COLS || row < 0 || row >= WORLD_ROWS) return 0;
    const i = this.idx(col, row);
    const taken = Math.min(this.foodMap[i], amount);
    this.foodMap[i] -= taken;
    if (this.foodMap[i] <= 0) {
      this.foodMap[i] = 0;
      // Clear food terrain marker
      const s = this.surface[i];
      if (s === SURFACE.FOOD_CRUMB || s === SURFACE.FOOD_BUG) {
        this.surface[i] = SURFACE.GRASS;
      }
    }
    return taken;
  }

  isWalkableSurface(col, row) {
    const t = this.getSurface(col, row);
    return t !== SURFACE.ROCK && t !== SURFACE.WATER;
  }

  isWalkableUnderground(col, row) {
    const t = this.getUnderground(col, row);
    return t !== UNDERGROUND.SOLID;
  }

  isWalkable(col, row) {
    return this.isUnderground
      ? this.isWalkableUnderground(col, row)
      : this.isWalkableSurface(col, row);
  }

  isDiggable(col, row) {
    if (col < 0 || col >= WORLD_COLS || row < 0 || row >= WORLD_ROWS) return false;
    return this.underground[this.idx(col, row)] === UNDERGROUND.SOLID;
  }

  dig(col, row) {
    if (!this.isDiggable(col, row)) return false;
    this.underground[this.idx(col, row)] = UNDERGROUND.TUNNEL;
    return true;
  }

  generate() {
    // Generate surface terrain
    for (let row = 0; row < WORLD_ROWS; row++) {
      for (let col = 0; col < WORLD_COLS; col++) {
        const i = this.idx(col, row);
        // Mostly grass
        let terrain = SURFACE.GRASS;

        // Perlin-like noise using simple method
        const nx = col / WORLD_COLS;
        const ny = row / WORLD_ROWS;

        // Add some rocks
        if (this.noise(col * 0.15, row * 0.15) > 0.75) {
          terrain = SURFACE.ROCK;
        }
        // Add some dirt patches
        else if (this.noise(col * 0.08 + 50, row * 0.08 + 50) > 0.65) {
          terrain = SURFACE.DIRT;
        }
        // Add sand near edges
        else if (this.noise(col * 0.1 + 100, row * 0.1 + 100) > 0.72) {
          terrain = SURFACE.SAND;
        }
        // Small water puddles
        else if (this.noise(col * 0.12 + 200, row * 0.12 + 200) > 0.82) {
          terrain = SURFACE.WATER;
        }

        this.surface[i] = terrain;
        this.underground[i] = UNDERGROUND.SOLID;
      }
    }

    // Place food sources
    this.placeFood();

    // Create black colony nest
    this.createNest(15, 25, 'black');

    // Create red colony nest
    this.createNest(65, 25, 'red');
  }

  placeFood() {
    // Scatter food crumbs
    for (let i = 0; i < 30; i++) {
      const col = Math.floor(Math.random() * WORLD_COLS);
      const row = Math.floor(Math.random() * WORLD_ROWS);
      if (this.getSurface(col, row) === SURFACE.GRASS) {
        this.surface[this.idx(col, row)] = SURFACE.FOOD_CRUMB;
        this.foodMap[this.idx(col, row)] = 3 + Math.random() * 7;
      }
    }
    // Place dead bugs (larger food sources)
    for (let i = 0; i < 8; i++) {
      const col = Math.floor(Math.random() * WORLD_COLS);
      const row = Math.floor(Math.random() * WORLD_ROWS);
      if (this.getSurface(col, row) === SURFACE.GRASS) {
        this.surface[this.idx(col, row)] = SURFACE.FOOD_BUG;
        this.foodMap[this.idx(col, row)] = 15 + Math.random() * 20;
      }
    }
  }

  createNest(cx, cy, team) {
    // Surface entrance
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        this.setSurface(cx + dx, cy + dy, SURFACE.NEST_ENTRANCE);
      }
    }
    this.setSurface(cx, cy, SURFACE.NEST_ENTRANCE);

    // Underground chambers and tunnels
    // Queen chamber at center
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        this.setUnderground(cx + dx, cy + dy, UNDERGROUND.QUEEN_CHAMBER);
      }
    }

    // Tunnels radiating out
    const tunnelDirs = [
      { dx: 0, dy: -1 }, { dx: 1, dy: 0 },
      { dx: 0, dy: 1 }, { dx: -1, dy: 0 },
      { dx: 1, dy: -1 }, { dx: -1, dy: 1 },
    ];

    for (const dir of tunnelDirs) {
      const len = 5 + Math.floor(Math.random() * 8);
      for (let s = 3; s < len; s++) {
        const tc = cx + dir.dx * s;
        const tr = cy + dir.dy * s;
        this.setUnderground(tc, tr, UNDERGROUND.TUNNEL);
        // Slight random branching
        if (Math.random() < 0.3) {
          this.setUnderground(tc + (Math.random() > 0.5 ? 1 : -1), tr, UNDERGROUND.TUNNEL);
        }
      }
      // Chamber at end of tunnel
      const endC = cx + dir.dx * len;
      const endR = cy + dir.dy * len;
      const chamberType = Math.random() > 0.5 ? UNDERGROUND.FOOD_STORE : UNDERGROUND.BROOD_CHAMBER;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          this.setUnderground(endC + dx, endR + dy, chamberType);
        }
      }
    }

    return { col: cx, row: cy };
  }

  // Simple value noise
  noise(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;

    const hash = (a, b) => {
      let h = ((a * 2654435761) ^ (b * 2246822519)) & 0x7fffffff;
      h = ((h >> 13) ^ h) * 1274126177;
      return ((h >> 16) ^ h & 0x7fffffff) / 0x7fffffff;
    };

    const v00 = hash(xi, yi);
    const v10 = hash(xi + 1, yi);
    const v01 = hash(xi, yi + 1);
    const v11 = hash(xi + 1, yi + 1);

    const sx = xf * xf * (3 - 2 * xf);
    const sy = yf * yf * (3 - 2 * yf);

    const a = v00 + sx * (v10 - v00);
    const b = v01 + sx * (v11 - v01);
    return a + sy * (b - a);
  }

  // Spawn new food periodically
  spawnRandomFood() {
    if (Math.random() < 0.002) {
      const col = Math.floor(Math.random() * WORLD_COLS);
      const row = Math.floor(Math.random() * WORLD_ROWS);
      if (this.getSurface(col, row) === SURFACE.GRASS) {
        this.surface[this.idx(col, row)] = SURFACE.FOOD_CRUMB;
        this.foodMap[this.idx(col, row)] = 2 + Math.random() * 5;
      }
    }
  }

  getNestEntrance(team) {
    if (team === 'black') return { col: 15, row: 25 };
    return { col: 65, row: 25 };
  }
}
