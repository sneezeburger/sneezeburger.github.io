// Colony management
import {
  CASTE, BEHAVIOR, MAX_ANTS_PER_COLONY,
  FOOD_TO_SPAWN_ANT, DEFAULT_BEHAVIOR_ALLOC,
  LARVA_GROW_TIME, PUPA_GROW_TIME,
} from './constants.js';
import { Ant } from './ant.js';

export class Colony {
  constructor(team, nestCol, nestRow) {
    this.team = team;
    this.nestCol = nestCol;
    this.nestRow = nestRow;
    this.food = 50;
    this.ants = [];
    this.queen = null;
    this.pendingEggs = 0;

    this.behaviorAlloc = { ...DEFAULT_BEHAVIOR_ALLOC };

    // Population counts
    this.workerCount = 0;
    this.soldierCount = 0;

    this.spawnQueue = [];
    this.spawnTimer = 0;
  }

  init() {
    // Create queen
    this.queen = new Ant(this.nestCol, this.nestRow, this.team, CASTE.QUEEN);
    this.queen.underground = true;
    this.ants.push(this.queen);

    // Initial workers
    for (let i = 0; i < 25; i++) {
      const a = this.spawnAnt(CASTE.WORKER);
      if (a) this.assignRandomBehavior(a);
    }

    // Initial soldiers
    for (let i = 0; i < 5; i++) {
      const a = this.spawnAnt(CASTE.SOLDIER);
      if (a) a.behavior = BEHAVIOR.FIGHT;
    }
  }

  spawnAnt(caste) {
    if (this.ants.length >= MAX_ANTS_PER_COLONY) return null;

    const offsetX = (Math.random() - 0.5) * 4;
    const offsetY = (Math.random() - 0.5) * 4;
    const ant = new Ant(this.nestCol + offsetX, this.nestRow + offsetY, this.team, caste);
    this.ants.push(ant);
    return ant;
  }

  assignRandomBehavior(ant) {
    const r = Math.random() * 100;
    const { forage, dig, nurse, fight } = this.behaviorAlloc;

    if (r < forage) {
      ant.behavior = BEHAVIOR.FORAGE;
    } else if (r < forage + dig) {
      ant.behavior = BEHAVIOR.DIG;
    } else if (r < forage + dig + nurse) {
      ant.behavior = BEHAVIOR.WANDER; // nurse = stay near nest
    } else {
      ant.behavior = BEHAVIOR.FIGHT;
    }
  }

  update(world, pheromones, allAnts) {
    // Process eggs
    if (this.pendingEggs > 0 && this.ants.length < MAX_ANTS_PER_COLONY) {
      this.spawnTimer++;
      if (this.spawnTimer > 20) {
        this.pendingEggs--;
        this.spawnTimer = 0;

        // 80% workers, 20% soldiers
        const caste = Math.random() < 0.8 ? CASTE.WORKER : CASTE.SOLDIER;
        const ant = this.spawnAnt(caste);
        if (ant) this.assignRandomBehavior(ant);
      }
    }

    // Update all ants
    this.workerCount = 0;
    this.soldierCount = 0;
    for (let i = this.ants.length - 1; i >= 0; i--) {
      const ant = this.ants[i];
      if (!ant.alive) {
        this.ants.splice(i, 1);
        continue;
      }
      ant.update(world, pheromones, this, allAnts);

      if (ant.caste === CASTE.WORKER) this.workerCount++;
      else if (ant.caste === CASTE.SOLDIER) this.soldierCount++;
    }

    // Check if colony is dead
    if (!this.queen || !this.queen.alive) {
      // Queen dead - colony slowly dies
      if (Math.random() < 0.001) {
        for (const ant of this.ants) {
          if (ant.caste !== CASTE.QUEEN && Math.random() < 0.1) {
            ant.alive = false;
          }
        }
      }
    }
  }

  getTotalAnts() {
    return this.ants.filter(a => a.alive && a.caste !== CASTE.LARVA && a.caste !== CASTE.PUPA).length;
  }

  setBehaviorAllocation(forage, dig, nurse, fight) {
    const total = forage + dig + nurse + fight;
    if (total === 0) return;
    this.behaviorAlloc = {
      forage: (forage / total) * 100,
      dig: (dig / total) * 100,
      nurse: (nurse / total) * 100,
      fight: (fight / total) * 100,
    };

    // Reassign existing ants
    for (const ant of this.ants) {
      if (ant.caste === CASTE.WORKER && ant.behavior !== BEHAVIOR.RETURN_FOOD) {
        this.assignRandomBehavior(ant);
      }
    }
  }
}
