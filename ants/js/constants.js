// SimAnt Constants

export const TILE_SIZE = 16;
export const WORLD_COLS = 80;
export const WORLD_ROWS = 50;
export const WORLD_WIDTH = WORLD_COLS * TILE_SIZE;
export const WORLD_HEIGHT = WORLD_ROWS * TILE_SIZE;

// Yard grid (the full property)
export const YARD_COLS = 8;
export const YARD_ROWS = 6;

// Ant castes
export const CASTE = {
  WORKER: 'worker',
  SOLDIER: 'soldier',
  QUEEN: 'queen',
  MALE: 'male',
  LARVA: 'larva',
  PUPA: 'pupa',
};

// Ant behaviors
export const BEHAVIOR = {
  IDLE: 'idle',
  FORAGE: 'forage',
  DIG: 'dig',
  NURSE: 'nurse',
  FIGHT: 'fight',
  FOLLOW_TRAIL: 'follow_trail',
  RETURN_FOOD: 'return_food',
  FLEE: 'flee',
  WANDER: 'wander',
};

// Teams
export const TEAM = {
  BLACK: 'black',
  RED: 'red',
};

// Terrain types (surface)
export const SURFACE = {
  GRASS: 0,
  DIRT: 1,
  ROCK: 2,
  SAND: 3,
  WATER: 4,
  NEST_ENTRANCE: 5,
  FOOD_CRUMB: 6,
  FOOD_BUG: 7,
};

// Underground terrain
export const UNDERGROUND = {
  SOLID: 0,
  TUNNEL: 1,
  CHAMBER: 2,
  QUEEN_CHAMBER: 3,
  FOOD_STORE: 4,
  BROOD_CHAMBER: 5,
};

// Pheromone types
export const PHEROMONE = {
  FOOD: 'food',
  HOME: 'home',
  ALARM: 'alarm',
  TRAIL: 'trail',
};

// Predator types
export const PREDATOR = {
  SPIDER: 'spider',
  ANTLION: 'antlion',
  LAWNMOWER: 'lawnmower',
};

// Colors
export const COLORS = {
  GRASS_LIGHT: '#4a8c3f',
  GRASS_DARK: '#3d7534',
  DIRT: '#8B7355',
  ROCK: '#808080',
  SAND: '#C2B280',
  WATER: '#4488cc',
  TUNNEL: '#5C4033',
  SOLID_EARTH: '#3B2716',
  CHAMBER: '#6B5344',

  BLACK_ANT: '#1a1a1a',
  RED_ANT: '#cc3333',
  PLAYER_ANT: '#ffdd00',
  QUEEN_ANT: '#8B4513',

  FOOD_CRUMB: '#F5DEB3',
  FOOD_BUG: '#556B2F',

  PHEROMONE_FOOD: 'rgba(0, 255, 0, 0.3)',
  PHEROMONE_HOME: 'rgba(0, 100, 255, 0.3)',
  PHEROMONE_ALARM: 'rgba(255, 0, 0, 0.3)',

  NEST_ENTRANCE: '#2a1a0a',

  UI_BG: '#2c2c2c',
  UI_BORDER: '#555',
  UI_TEXT: '#eee',
  UI_ACCENT: '#4a9eff',
};

// Game speeds
export const SPEED = {
  PAUSED: 0,
  SLOW: 0.5,
  NORMAL: 1,
  FAST: 2,
  ULTRA: 4,
};

// Ant properties by caste
export const ANT_STATS = {
  [CASTE.WORKER]: { speed: 1.5, hp: 3, attack: 1, size: 3, carryCapacity: 1 },
  [CASTE.SOLDIER]: { speed: 1.2, hp: 6, attack: 3, size: 4, carryCapacity: 0 },
  [CASTE.QUEEN]: { speed: 0.5, hp: 20, attack: 0, size: 6, carryCapacity: 0 },
  [CASTE.MALE]: { speed: 2.0, hp: 1, attack: 0, size: 3, carryCapacity: 0 },
};

// Colony behavior allocation defaults (percentages)
export const DEFAULT_BEHAVIOR_ALLOC = {
  forage: 50,
  dig: 20,
  nurse: 20,
  fight: 10,
};

export const MAX_ANTS_PER_COLONY = 200;
export const FOOD_TO_SPAWN_ANT = 5;
export const PHEROMONE_DECAY_RATE = 0.995;
export const PHEROMONE_STRENGTH = 100;
export const ANT_VISION_RANGE = 5; // tiles
export const QUEEN_LAY_INTERVAL = 300; // frames
export const LARVA_GROW_TIME = 500;
export const PUPA_GROW_TIME = 400;
