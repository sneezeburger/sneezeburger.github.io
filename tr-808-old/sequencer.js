// TR-808 Sequencer Controller
class Sequencer {
    constructor(audioEngine) {
        this.engine = audioEngine;
        this.playing = false;
        this.tempo = 120;
        this.swing = 0;
        this.currentStep = 0;
        this.scheduleAheadTime = 0.1;
        this.lookahead = 25; // ms
        this.nextNoteTime = 0;
        this.timerID = null;
        this.currentPattern = 0;

        this.instruments = [
            'kick', 'snare', 'clap', 'rim',
            'tom_low', 'tom_mid', 'tom_hi',
            'hihat_closed', 'hihat_open', 'cymbal',
            'cowbell', 'conga_hi', 'conga_mid', 'conga_low',
            'maracas', 'claves'
        ];

        // 4 patterns, each with 16 instruments x 16 steps
        this.patterns = Array.from({ length: 4 }, () =>
            Object.fromEntries(this.instruments.map(inst => [inst, new Array(16).fill(false)]))
        );

        this.initUI();
        this.bindEvents();
    }

    get pattern() {
        return this.patterns[this.currentPattern];
    }

    initUI() {
        const tracks = document.querySelectorAll('.track');
        tracks.forEach(track => {
            const inst = track.dataset.instrument;
            const stepsRow = track.querySelector('.steps-row');
            for (let i = 0; i < 16; i++) {
                const step = document.createElement('div');
                step.className = 'step';
                step.dataset.step = i;
                step.dataset.instrument = inst;
                if (i % 4 === 0) step.classList.add('beat-1');
                stepsRow.appendChild(step);
            }
        });
    }

    bindEvents() {
        // Step clicks
        document.querySelector('.sequencer').addEventListener('click', (e) => {
            const step = e.target.closest('.step');
            if (!step) return;
            const inst = step.dataset.instrument;
            const idx = parseInt(step.dataset.step);
            this.pattern[inst][idx] = !this.pattern[inst][idx];
            step.classList.toggle('active');

            // Preview sound on activation
            if (this.pattern[inst][idx] && !this.playing) {
                this.engine.init();
                this.engine.play(inst);
            }
        });

        // Transport
        document.getElementById('play').addEventListener('click', () => this.start());
        document.getElementById('stop').addEventListener('click', () => this.stop());
        document.getElementById('clear').addEventListener('click', () => this.clearPattern());

        // Tempo
        const tempoSlider = document.getElementById('tempo');
        const tempoDisplay = document.getElementById('tempo-display');
        tempoSlider.addEventListener('input', (e) => {
            this.tempo = parseInt(e.target.value);
            tempoDisplay.textContent = this.tempo;
        });

        // Volume
        document.getElementById('volume').addEventListener('input', (e) => {
            this.engine.init();
            this.engine.setVolume(parseInt(e.target.value) / 100);
        });

        // Swing
        document.getElementById('swing').addEventListener('input', (e) => {
            this.swing = parseInt(e.target.value) / 100;
        });

        // Instrument parameter controls
        document.querySelectorAll('.inst-control').forEach(ctrl => {
            const inst = ctrl.dataset.instrument;
            ctrl.querySelectorAll('input[type="range"]').forEach(input => {
                input.addEventListener('input', (e) => {
                    this.engine.setParam(inst, e.target.dataset.param, parseInt(e.target.value));
                });
            });
        });

        // Pattern buttons
        document.querySelectorAll('.pattern-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.pattern-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentPattern = parseInt(btn.dataset.pattern);
                this.updateGridDisplay();
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.playing ? this.stop() : this.start();
            }
        });
    }

    start() {
        if (this.playing) return;
        this.engine.init();
        this.playing = true;
        this.currentStep = 0;
        this.nextNoteTime = this.engine.ctx.currentTime;
        this.scheduler();
        document.getElementById('play').classList.add('active');
    }

    stop() {
        this.playing = false;
        if (this.timerID) {
            clearTimeout(this.timerID);
            this.timerID = null;
        }
        this.currentStep = 0;
        document.getElementById('play').classList.remove('active');
        document.querySelectorAll('.step.current').forEach(s => s.classList.remove('current'));
    }

    clearPattern() {
        this.instruments.forEach(inst => {
            this.pattern[inst].fill(false);
        });
        this.updateGridDisplay();
    }

    updateGridDisplay() {
        document.querySelectorAll('.step').forEach(step => {
            const inst = step.dataset.instrument;
            const idx = parseInt(step.dataset.step);
            step.classList.toggle('active', this.pattern[inst][idx]);
        });
    }

    scheduler() {
        while (this.nextNoteTime < this.engine.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleStep(this.currentStep, this.nextNoteTime);
            this.advanceStep();
        }
        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
    }

    scheduleStep(step, time) {
        // Update UI
        requestAnimationFrame(() => {
            document.querySelectorAll('.step.current').forEach(s => s.classList.remove('current'));
            document.querySelectorAll(`.step[data-step="${step}"]`).forEach(s => s.classList.add('current'));
        });

        // Play active instruments
        this.instruments.forEach(inst => {
            if (this.pattern[inst][step]) {
                this.engine.play(inst, time);
            }
        });
    }

    advanceStep() {
        const secondsPerBeat = 60.0 / this.tempo;
        const secondsPer16th = secondsPerBeat / 4;

        // Apply swing to even-numbered steps (off-beats)
        let swingOffset = 0;
        if (this.currentStep % 2 === 1) {
            swingOffset = this.swing * secondsPer16th * 0.5;
        }

        this.nextNoteTime += secondsPer16th + swingOffset;
        this.currentStep = (this.currentStep + 1) % 16;
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.sequencer = new Sequencer(window.audioEngine);
});
