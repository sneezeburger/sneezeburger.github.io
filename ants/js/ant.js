// Ant entity with AI behaviors
import {
  TILE_SIZE, WORLD_COLS, WORLD_ROWS,
  CASTE, BEHAVIOR, ANT_STATS,
  PHEROMONE_STRENGTH, ANT_VISION_RANGE,
  SURFACE, UNDERGROUND,
} from './constants.js';

let nextAntId = 1;

export class Ant {
  constructor(col, row, team, caste = CASTE.WORKER) {
    this.id = nextAntId++;
    this.x = col * TILE_SIZE + TILE_SIZE / 2;
    this.y = row * TILE_SIZE + TILE_SIZE / 2;
    this.team = team;
    this.caste = caste;

    const stats = ANT_STATS[caste] || ANT_STATS[CASTE.WORKER];
    this.speed = stats.speed;
    this.maxHp = stats.hp;
    this.hp = stats.hp;
    this.attack = stats.attack;
    this.size = stats.size;
    this.carryCapacity = stats.carryCapacity;

    this.behavior = BEHAVIOR.WANDER;
    this.carrying = 0; // food carried
    this.angle = Math.random() * Math.PI * 2;
    this.targetX = 0;
    this.targetY = 0;
    this.hasTarget = false;
    this.alive = true;
    this.underground = false;
    this.wanderTimer = 0;
    this.stuckTimer = 0;
    this.prevCol = -1;
    this.prevRow = -1;
    this.fightTarget = null;
    this.age = 0;
    this.maxAge = 8000 + Math.random() * 4000;

    // For queen
    this.layTimer = 0;
  }

  get col() {
    return Math.floor(this.x / TILE_SIZE);
  }

  get row() {
    return Math.floor(this.y / TILE_SIZE);
  }

  update(world, pheromones, colony, allAnts) {
    if (!this.alive) return;
    this.age++;

    // Age death (not queen)
    if (this.caste !== CASTE.QUEEN && this.age > this.maxAge) {
      this.alive = false;
      return;
    }

    // Larvae and pupae don't move
    if (this.caste === CASTE.LARVA || this.caste === CASTE.PUPA) return;

    // Queen mostly stays put
    if (this.caste === CASTE.QUEEN) {
      this.updateQueen(colony);
      return;
    }

    switch (this.behavior) {
      case BEHAVIOR.FORAGE: this.updateForage(world, pheromones); break;
      case BEHAVIOR.RETURN_FOOD: this.updateReturnFood(world, pheromones, colony); break;
      case BEHAVIOR.DIG: this.updateDig(world); break;
      case BEHAVIOR.FIGHT: this.updateFight(allAnts, pheromones); break;
      case BEHAVIOR.WANDER: this.updateWander(world); break;
      case BEHAVIOR.FOLLOW_TRAIL: this.updateFollowTrail(pheromones); break;
      case BEHAVIOR.FLEE: this.updateFlee(pheromones); break;
      default: this.updateWander(world); break;
    }

    this.clampPosition();
  }

  updateQueen(colony) {
    this.layTimer++;
    if (this.layTimer > 300 && colony.food >= 3) {
      colony.food -= 3;
      colony.pendingEggs++;
      this.layTimer = 0;
    }
  }

  updateForage(world, pheromones) {
    const col = this.col;
    const row = this.row;

    // Check for food at current position
    const food = world.getFood(col, row);
    if (food > 0 && this.carrying < this.carryCapacity) {
      const taken = world.removeFood(col, row, 1);
      this.carrying += taken;
      if (this.carrying >= this.carryCapacity) {
        this.behavior = BEHAVIOR.RETURN_FOOD;
        // Deposit food pheromone
        pheromones.deposit('food', col, row, PHEROMONE_STRENGTH, this.team);
        return;
      }
    }

    // Look for food nearby
    let nearestFood = null;
    let nearestDist = Infinity;
    for (let dx = -ANT_VISION_RANGE; dx <= ANT_VISION_RANGE; dx++) {
      for (let dy = -ANT_VISION_RANGE; dy <= ANT_VISION_RANGE; dy++) {
        const nc = col + dx;
        const nr = row + dy;
        if (world.getFood(nc, nr) > 0) {
          const d = dx * dx + dy * dy;
          if (d < nearestDist) {
            nearestDist = d;
            nearestFood = { col: nc, row: nr };
          }
        }
      }
    }

    if (nearestFood) {
      this.moveToward(nearestFood.col * TILE_SIZE + TILE_SIZE / 2,
                      nearestFood.row * TILE_SIZE + TILE_SIZE / 2, world);
    } else {
      // Follow food pheromone trail
      const grad = pheromones.getGradient('food', col, row, this.team);
      if (grad && grad.strength > 5) {
        this.moveInDirection(grad.dx, grad.dy, world);
      } else {
        this.randomWalk(world);
      }
    }

    // Deposit home pheromone trail
    pheromones.deposit('home', col, row, PHEROMONE_STRENGTH * 0.3, this.team);
  }

  updateReturnFood(world, pheromones, colony) {
    const col = this.col;
    const row = this.row;
    const nest = world.getNestEntrance(this.team);

    // Check if at nest
    const dist = Math.abs(col - nest.col) + Math.abs(row - nest.row);
    if (dist <= 2) {
      colony.food += this.carrying;
      this.carrying = 0;
      this.behavior = BEHAVIOR.FORAGE;
      return;
    }

    // Follow home pheromone or head to nest
    const grad = pheromones.getGradient('home', col, row, this.team);
    if (grad && grad.strength > 5) {
      this.moveInDirection(grad.dx, grad.dy, world);
    } else {
      this.moveToward(nest.col * TILE_SIZE + TILE_SIZE / 2,
                      nest.row * TILE_SIZE + TILE_SIZE / 2, world);
    }

    // Deposit food pheromone
    pheromones.deposit('food', col, row, PHEROMONE_STRENGTH * 0.5, this.team);
  }

  updateDig(world) {
    if (!this.underground) {
      // Go to nest entrance and go underground
      const nest = world.getNestEntrance(this.team);
      const dist = Math.abs(this.col - nest.col) + Math.abs(this.row - nest.row);
      if (dist <= 2) {
        this.underground = true;
      } else {
        this.moveToward(nest.col * TILE_SIZE + TILE_SIZE / 2,
                        nest.row * TILE_SIZE + TILE_SIZE / 2, world);
      }
      return;
    }

    // Underground: dig in random direction
    const dx = Math.floor(Math.random() * 3) - 1;
    const dy = Math.floor(Math.random() * 3) - 1;
    const nc = this.col + dx;
    const nr = this.row + dy;

    if (world.isDiggable(nc, nr)) {
      world.dig(nc, nr);
    }

    // Move through tunnels
    if (world.isWalkableUnderground(nc, nr)) {
      this.x = nc * TILE_SIZE + TILE_SIZE / 2;
      this.y = nr * TILE_SIZE + TILE_SIZE / 2;
    } else {
      this.randomWalk(world);
    }
  }

  updateFight(allAnts, pheromones) {
    // Find nearest enemy
    let nearest = null;
    let nearestDist = Infinity;
    const visionPx = ANT_VISION_RANGE * TILE_SIZE;

    for (const other of allAnts) {
      if (!other.alive || other.team === this.team) continue;
      if (other.caste === CASTE.LARVA || other.caste === CASTE.PUPA) continue;
      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const d = dx * dx + dy * dy;
      if (d < nearestDist && d < visionPx * visionPx) {
        nearestDist = d;
        nearest = other;
      }
    }

    if (nearest) {
      const dx = nearest.x - this.x;
      const dy = nearest.y - this.y;
      const d = Math.sqrt(dx * dx + dy * dy);

      if (d < TILE_SIZE) {
        // Attack!
        nearest.hp -= this.attack;
        if (nearest.hp <= 0) {
          nearest.alive = false;
        }
        // Also take some damage
        this.hp -= nearest.attack * 0.5;
        if (this.hp <= 0) {
          this.alive = false;
        }
        // Deposit alarm pheromone
        pheromones.deposit('alarm', this.col, this.row, PHEROMONE_STRENGTH * 2, this.team);
      } else {
        // Move toward enemy
        this.x += (dx / d) * this.speed * 1.5;
        this.y += (dy / d) * this.speed * 1.5;
      }
    } else {
      // No enemies, wander
      this.randomWalk(null);
    }
  }

  updateWander(world) {
    this.randomWalk(world);
  }

  updateFollowTrail(pheromones) {
    const grad = pheromones.getGradient('food', this.col, this.row, this.team);
    if (grad && grad.strength > 3) {
      this.moveInDirection(grad.dx, grad.dy, null);
    } else {
      this.randomWalk(null);
    }
  }

  updateFlee(pheromones) {
    // Move away from alarm pheromones
    const grad = pheromones.getGradient('alarm', this.col, this.row);
    if (grad) {
      this.moveInDirection(-grad.dx, -grad.dy, null);
    } else {
      this.behavior = BEHAVIOR.WANDER;
    }
  }

  moveToward(tx, ty, world) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1) return;

    const nx = dx / d;
    const ny = dy / d;
    this.moveInDirection(nx, ny, world);
  }

  moveInDirection(dx, dy, world) {
    const newX = this.x + dx * this.speed;
    const newY = this.y + dy * this.speed;
    const newCol = Math.floor(newX / TILE_SIZE);
    const newRow = Math.floor(newY / TILE_SIZE);

    if (world) {
      const walkable = this.underground
        ? world.isWalkableUnderground(newCol, newRow)
        : world.isWalkableSurface(newCol, newRow);
      if (walkable) {
        this.x = newX;
        this.y = newY;
        this.angle = Math.atan2(dy, dx);
      } else {
        // Try to slide along walls
        const slideX = this.x + dx * this.speed;
        const slideCol = Math.floor(slideX / TILE_SIZE);
        const canSlideX = this.underground
          ? world.isWalkableUnderground(slideCol, this.row)
          : world.isWalkableSurface(slideCol, this.row);
        if (canSlideX) {
          this.x = slideX;
          this.angle = Math.atan2(0, dx);
        } else {
          const slideY = this.y + dy * this.speed;
          const slideRow = Math.floor(slideY / TILE_SIZE);
          const canSlideY = this.underground
            ? world.isWalkableUnderground(this.col, slideRow)
            : world.isWalkableSurface(this.col, slideRow);
          if (canSlideY) {
            this.y = slideY;
            this.angle = Math.atan2(dy, 0);
          }
        }
        this.stuckTimer++;
        if (this.stuckTimer > 30) {
          this.angle = Math.random() * Math.PI * 2;
          this.stuckTimer = 0;
        }
      }
    } else {
      this.x = newX;
      this.y = newY;
      this.angle = Math.atan2(dy, dx);
    }
  }

  randomWalk(world) {
    this.wanderTimer--;
    if (this.wanderTimer <= 0) {
      this.angle += (Math.random() - 0.5) * 1.2;
      this.wanderTimer = 15 + Math.floor(Math.random() * 30);
    }
    const dx = Math.cos(this.angle);
    const dy = Math.sin(this.angle);
    this.moveInDirection(dx, dy, world);
  }

  clampPosition() {
    this.x = Math.max(TILE_SIZE, Math.min(this.x, (WORLD_COLS - 1) * TILE_SIZE));
    this.y = Math.max(TILE_SIZE, Math.min(this.y, (WORLD_ROWS - 1) * TILE_SIZE));
  }

  assignBehavior(behaviorType) {
    this.behavior = behaviorType;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.alive = false;
    }
  }
}
