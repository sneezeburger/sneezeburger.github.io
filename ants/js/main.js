import { Game } from './game.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const game = new Game(canvas);

  // Wire up UI controls
  document.getElementById('btn-pause')?.addEventListener('click', () => game.togglePause());

  // Speed buttons
  document.getElementById('speed-1')?.addEventListener('click', () => { game.speed = 0.5; game.updateSpeedUI(); });
  document.getElementById('speed-2')?.addEventListener('click', () => { game.speed = 1; game.updateSpeedUI(); });
  document.getElementById('speed-3')?.addEventListener('click', () => { game.speed = 2; game.updateSpeedUI(); });
  document.getElementById('speed-4')?.addEventListener('click', () => { game.speed = 4; game.updateSpeedUI(); });

  // Behavior sliders
  ['forage', 'dig', 'nurse', 'fight'].forEach(name => {
    const slider = document.getElementById(`slider-${name}`);
    if (slider) {
      slider.addEventListener('input', () => game.updateBehavior());
    }
  });

  // View toggles
  document.getElementById('btn-pheromones')?.addEventListener('click', () => {
    game.showPheromones = !game.showPheromones;
    const btn = document.getElementById('btn-pheromones');
    btn.classList.toggle('active', game.showPheromones);
  });

  document.getElementById('btn-follow')?.addEventListener('click', () => {
    game.followPlayer = !game.followPlayer;
    const btn = document.getElementById('btn-follow');
    btn.classList.toggle('active', game.followPlayer);
  });

  document.getElementById('btn-underground')?.addEventListener('click', () => {
    game.player.toggleUnderground();
    game.world.isUnderground = game.player.underground;
    const btn = document.getElementById('btn-underground');
    btn.textContent = game.world.isUnderground ? '⛏ Underground' : '🌿 Surface';
  });

  // New game
  document.getElementById('btn-newgame')?.addEventListener('click', () => {
    if (confirm('Start a new game?')) {
      location.reload();
    }
  });

  game.start();
});
