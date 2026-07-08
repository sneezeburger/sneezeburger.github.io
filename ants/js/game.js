// SimAnt - Main Game Module
import { World } from './world.js';
import { Colony } from './colony.js';
import { PlayerAnt } from './player.js';
import { PheromoneGrid } from './pheromone.js';
import { Renderer } from './renderer.js';
import { createPredators, Predator } from './predator.js';
import {
  TILE_SIZE, WORLD_COLS, WORLD_ROWS,
  SPEED, SURFACE, BEHAVIOR, COLORS,
} from './constants.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.world = new World();
    this.pheromones = new PheromoneGrid();

    // Colonies
    this.blackColony = new Colony('black', 15, 25);
    this.redColony = new Colony('red', 65, 25);
    this.blackColony.init();
    this.redColony.init();

    // Player ant is part of black colony
    this.player = new PlayerAnt(16, 24);
    this.blackColony.ants.push(this.player);

    // Predators
    this.predators = createPredators();
    this.lawnmowerActive = false;
    this.lawnmowerTimer = 0;

    // Game state
    this.speed = SPEED.NORMAL;
    this.paused = false;
    this.frame = 0;
    this.followPlayer = true;
    this.showPheromones = false;

    // Weather
    this.isRaining = false;
    this.rainTimer = 0;
    this.rainDrops = [];

    // Stats tracking
    this.stats = {
      foodCollected: 0,
      enemiesKilled: 0,
      antsLost: 0,
    };

    this.prevBlackCount = this.blackColony.getTotalAnts();
    this.prevRedCount = this.redColony.getTotalAnts();

    // Messages
    this.messages = [];
    this.addMessage('Welcome to SimAnt! You are the yellow ant. Use WASD to move.');
    this.addMessage('Collect food and bring it back to the nest (dark area).');

    this.setupInput();
    this.resize();
  }

  setupInput() {
    window.addEventListener('keydown', (e) => {
      switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup': this.player.keys.up = true; e.preventDefault(); break;
        case 's': case 'arrowdown': this.player.keys.down = true; e.preventDefault(); break;
        case 'a': case 'arrowleft': this.player.keys.left = true; e.preventDefault(); break;
        case 'd': case 'arrowright': this.player.keys.right = true; e.preventDefault(); break;
        case ' ': this.player.actions.dig = true; e.preventDefault(); break;
        case 'e': this.player.actions.drop = true; break;
        case 'f': this.player.actions.attack = true; break;
        case 'u': this.player.toggleUnderground(); this.world.isUnderground = this.player.underground; break;
        case 'p': this.togglePause(); break;
        case 'v': this.showPheromones = !this.showPheromones; break;
        case 'c': this.followPlayer = !this.followPlayer; break;
        case '1': this.speed = SPEED.SLOW; this.updateSpeedUI(); break;
        case '2': this.speed = SPEED.NORMAL; this.updateSpeedUI(); break;
        case '3': this.speed = SPEED.FAST; this.updateSpeedUI(); break;
        case '4': this.speed = SPEED.ULTRA; this.updateSpeedUI(); break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup': this.player.keys.up = false; break;
        case 's': case 'arrowdown': this.player.keys.down = false; break;
        case 'a': case 'arrowleft': this.player.keys.left = false; break;
        case 'd': case 'arrowright': this.player.keys.right = false; break;
      }
    });

    // Scroll to move camera
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (!this.followPlayer) {
        this.renderer.camX += e.deltaX * 0.5;
        this.renderer.camY += e.deltaY * 0.5;
        this.renderer.clampCamera();
      }
    });

    // Click to set camera target
    this.canvas.addEventListener('click', (e) => {
      if (!this.followPlayer) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left + this.renderer.camX;
        const clickY = e.clientY - rect.top + this.renderer.camY;
        this.renderer.centerOn(clickX, clickY);
      }
    });

    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const container = document.getElementById('game-container');
    if (container) {
      this.renderer.resize(container.clientWidth, container.clientHeight);
    }
  }

  togglePause() {
    this.paused = !this.paused;
    const btn = document.getElementById('btn-pause');
    if (btn) btn.textContent = this.paused ? '▶ Play' : '⏸ Pause';
  }

  updateSpeedUI() {
    document.querySelectorAll('.speed-btn').forEach(btn => btn.classList.remove('active'));
    const speedMap = { [SPEED.SLOW]: '1', [SPEED.NORMAL]: '2', [SPEED.FAST]: '3', [SPEED.ULTRA]: '4' };
    const btn = document.getElementById(`speed-${speedMap[this.speed]}`);
    if (btn) btn.classList.add('active');
  }

  addMessage(text) {
    this.messages.push({ text, time: Date.now() });
    if (this.messages.length > 5) this.messages.shift();
    this.updateMessageUI();
  }

  updateMessageUI() {
    const el = document.getElementById('messages');
    if (el) {
      el.innerHTML = this.messages.map(m => `<div class="msg">${m.text}</div>`).join('');
      el.scrollTop = el.scrollHeight;
    }
  }

  getAllAnts() {
    return [...this.blackColony.ants, ...this.redColony.ants];
  }

  update() {
    if (this.paused) return;

    const steps = Math.max(1, Math.round(this.speed));
    for (let s = 0; s < steps; s++) {
      this.frame++;
      this.tick();
    }
  }

  tick() {
    const allAnts = this.getAllAnts();

    // Update colonies
    this.blackColony.update(this.world, this.pheromones, allAnts);
    this.redColony.update(this.world, this.pheromones, allAnts);

    // Update player (already in blackColony.ants, so updated by colony)
    // But we need to pass allAnts for attack detection
    this.player.update(this.world, this.pheromones, this.blackColony, allAnts);

    // Update pheromones
    if (this.frame % 3 === 0) {
      this.pheromones.update();
    }

    // Update predators
    for (const pred of this.predators) {
      if (!pred.alive) continue;
      pred.update(allAnts);
    }

    // Lawn mower event
    this.lawnmowerTimer++;
    if (this.lawnmowerTimer > 12000 && !this.lawnmowerActive) {
      this.lawnmowerActive = true;
      this.lawnmowerTimer = 0;
      this.predators.push(new Predator('lawnmower', 2, 5));
      this.addMessage('⚠️ The lawn mower is coming!');
    }

    // Spawn new food
    this.world.spawnRandomFood();

    // Weather
    this.rainTimer++;
    if (this.rainTimer > 8000) {
      this.isRaining = !this.isRaining;
      this.rainTimer = 0;
      if (this.isRaining) {
        this.addMessage('🌧️ It starts to rain...');
      } else {
        this.addMessage('☀️ The rain has stopped.');
      }
    }

    // Track stats
    const newBlack = this.blackColony.getTotalAnts();
    const newRed = this.redColony.getTotalAnts();
    if (newBlack < this.prevBlackCount) {
      this.stats.antsLost += this.prevBlackCount - newBlack;
    }
    if (newRed < this.prevRedCount) {
      this.stats.enemiesKilled += this.prevRedCount - newRed;
    }
    this.prevBlackCount = newBlack;
    this.prevRedCount = newRed;

    // Win/lose conditions
    if (newRed === 0 && this.frame > 100) {
      this.addMessage('🎉 Victory! The red colony has been eliminated!');
      this.paused = true;
    }
    if (newBlack === 0 && this.frame > 100) {
      this.addMessage('💀 Defeat! Your colony has been destroyed.');
      this.paused = true;
    }
    if (!this.player.alive && this.frame > 100) {
      this.addMessage('You died! But your colony lives on...');
      this.respawnPlayer();
    }
  }

  respawnPlayer() {
    const nest = this.world.getNestEntrance('black');
    this.player = new PlayerAnt(nest.col, nest.row);
    this.blackColony.ants.push(this.player);
    this.addMessage('A new ant takes your place.');
  }

  draw() {
    this.renderer.clear();

    // Camera follows player
    if (this.followPlayer && this.player.alive) {
      this.renderer.centerOn(this.player.x, this.player.y);
    }

    // Draw world
    this.renderer.drawWorld(this.world);

    // Draw pheromones
    if (this.showPheromones) {
      this.renderer.drawPheromones(this.pheromones, 'black');
    }

    // Draw ants
    this.renderer.drawAnts(this.blackColony.ants, this.world.isUnderground);
    this.renderer.drawAnts(this.redColony.ants, this.world.isUnderground);

    // Draw predators (surface only)
    if (!this.world.isUnderground) {
      this.renderer.drawPredators(this.predators);
    }

    // Rain effect
    if (this.isRaining && !this.world.isUnderground) {
      this.drawRain();
    }

    // Minimap
    this.renderer.drawMinimap(this.world, this.player, this.blackColony, this.redColony);

    // HUD overlay
    this.drawHUD();

    // Update UI panel
    this.updateUI();
  }

  drawRain() {
    const ctx = this.renderer.ctx;
    ctx.strokeStyle = 'rgba(150, 180, 255, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 80; i++) {
      const rx = Math.random() * this.renderer.viewWidth;
      const ry = Math.random() * this.renderer.viewHeight;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 2, ry + 8);
      ctx.stroke();
    }
  }

  drawHUD() {
    const ctx = this.renderer.ctx;
    const vw = this.renderer.viewWidth;

    // Player status bar at bottom
    const barH = 32;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, this.renderer.viewHeight - barH, vw, barH);

    ctx.font = '13px "Press Start 2P", monospace';
    ctx.fillStyle = COLORS.UI_TEXT;

    const y = this.renderer.viewHeight - 10;
    ctx.fillText(`HP: ${Math.ceil(this.player.hp)}/${this.player.maxHp}`, 10, y);
    ctx.fillText(`Food: ${this.player.carrying > 0 ? '🍞' : '—'}`, 180, y);

    const layer = this.world.isUnderground ? '⛏ Underground' : '🌿 Surface';
    ctx.fillText(layer, 300, y);

    if (this.paused) {
      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', vw / 2, this.renderer.viewHeight / 2);
      ctx.textAlign = 'left';
    }
  }

  updateUI() {
    // Colony stats
    const setHtml = (id, html) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    };

    setHtml('black-pop', `${this.blackColony.getTotalAnts()}`);
    setHtml('black-food', `${Math.floor(this.blackColony.food)}`);
    setHtml('black-workers', `${this.blackColony.workerCount}`);
    setHtml('black-soldiers', `${this.blackColony.soldierCount}`);

    setHtml('red-pop', `${this.redColony.getTotalAnts()}`);
    setHtml('red-food', `${Math.floor(this.redColony.food)}`);

    setHtml('stat-food', `${this.stats.foodCollected}`);
    setHtml('stat-kills', `${this.stats.enemiesKilled}`);
    setHtml('stat-lost', `${this.stats.antsLost}`);
    setHtml('frame-count', `${this.frame}`);

    // Population balance bar
    const blackPop = this.blackColony.getTotalAnts();
    const redPop = this.redColony.getTotalAnts();
    const total = blackPop + redPop || 1;
    const blackPct = (blackPop / total) * 100;
    const redPct = (redPop / total) * 100;
    const blackBar = document.getElementById('pop-bar-black');
    const redBar = document.getElementById('pop-bar-red');
    if (blackBar) blackBar.style.width = `${blackPct}%`;
    if (redBar) redBar.style.width = `${redPct}%`;
  }

  // Called from UI sliders
  updateBehavior() {
    const forage = parseInt(document.getElementById('slider-forage')?.value || 50);
    const dig = parseInt(document.getElementById('slider-dig')?.value || 20);
    const nurse = parseInt(document.getElementById('slider-nurse')?.value || 20);
    const fight = parseInt(document.getElementById('slider-fight')?.value || 10);

    this.blackColony.setBehaviorAllocation(forage, dig, nurse, fight);

    // Update labels
    const setLabel = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setLabel('val-forage', forage);
    setLabel('val-dig', dig);
    setLabel('val-nurse', nurse);
    setLabel('val-fight', fight);
  }

  start() {
    this.updateSpeedUI();
    const loop = () => {
      this.update();
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
