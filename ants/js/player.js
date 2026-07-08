// Player-controlled ant
import { Ant } from './ant.js';
import {
  TILE_SIZE, CASTE, BEHAVIOR,
  PHEROMONE_STRENGTH, SURFACE, WORLD_COLS, WORLD_ROWS,
} from './constants.js';

export class PlayerAnt extends Ant {
  constructor(col, row) {
    super(col, row, 'black', CASTE.WORKER);
    this.isPlayer = true;
    this.speed = 2.5;
    this.maxHp = 10;
    this.hp = 10;
    this.attack = 2;
    this.size = 4;
    this.behavior = BEHAVIOR.IDLE;

    // Input state
    this.keys = { up: false, down: false, left: false, right: false };
    this.actions = { dig: false, drop: false, attack: false };
  }

  update(world, pheromones, colony, allAnts) {
    if (!this.alive) return;

    let dx = 0;
    let dy = 0;

    if (this.keys.up) dy = -1;
    if (this.keys.down) dy = 1;
    if (this.keys.left) dx = -1;
    if (this.keys.right) dx = 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
      this.moveInDirection(dx, dy, world);
    }

    // Dig action
    if (this.actions.dig) {
      this.actions.dig = false;
      if (this.underground) {
        const digCol = this.col + Math.round(Math.cos(this.angle));
        const digRow = this.row + Math.round(Math.sin(this.angle));
        world.dig(digCol, digRow);
      }
    }

    // Pick up food
    if (!this.underground) {
      const food = world.getFood(this.col, this.row);
      if (food > 0 && this.carrying < 1) {
        const taken = world.removeFood(this.col, this.row, 1);
        this.carrying += taken;
      }
    }

    // Drop food / deposit at nest
    if (this.actions.drop) {
      this.actions.drop = false;
      if (this.carrying > 0) {
        const nest = world.getNestEntrance(this.team);
        const dist = Math.abs(this.col - nest.col) + Math.abs(this.row - nest.row);
        if (dist <= 3) {
          colony.food += this.carrying;
          this.carrying = 0;
        } else {
          // Just drop food on ground
          world.addFood(this.col, this.row, this.carrying);
          if (world.getSurface(this.col, this.row) === SURFACE.GRASS) {
            world.setSurface(this.col, this.row, SURFACE.FOOD_CRUMB);
          }
          this.carrying = 0;
        }
      }
    }

    // Drop pheromone trail while moving
    if (dx !== 0 || dy !== 0) {
      if (this.carrying > 0) {
        pheromones.deposit('food', this.col, this.row, PHEROMONE_STRENGTH * 0.8, this.team);
      } else {
        pheromones.deposit('home', this.col, this.row, PHEROMONE_STRENGTH * 0.3, this.team);
      }
    }

    // Attack nearby enemies
    if (this.actions.attack) {
      this.actions.attack = false;
      const attackRange = TILE_SIZE * 1.5;
      for (const other of allAnts) {
        if (!other.alive || other.team === this.team || other === this) continue;
        const adx = other.x - this.x;
        const ady = other.y - this.y;
        if (adx * adx + ady * ady < attackRange * attackRange) {
          other.takeDamage(this.attack);
          break;
        }
      }
    }

    // Toggle underground at nest entrance
    const surfaceTile = world.getSurface(this.col, this.row);
    if (surfaceTile === SURFACE.NEST_ENTRANCE) {
      this.canToggleUnderground = true;
    } else if (!this.underground) {
      this.canToggleUnderground = false;
    }

    this.clampPosition();
  }

  toggleUnderground() {
    if (this.canToggleUnderground || this.underground) {
      this.underground = !this.underground;
    }
  }
}
