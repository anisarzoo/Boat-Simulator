// Glassmorphic HUD & Telemetry UI Controller
export class UIController {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

    this.dom = {
      speedVal: document.getElementById('speedVal'),
      speedBar: document.getElementById('speedBar'),
      compassVal: document.getElementById('compassVal'),
      compassDegree: document.getElementById('compassDegree'),
      compassRose: document.getElementById('compassRose'),
      throttleVal: document.getElementById('throttleVal'),
      throttleBar: document.getElementById('throttleBar'),
      rudderVal: document.getElementById('rudderVal'),
      rudderIndicator: document.getElementById('rudderIndicator'),
      waveHeightVal: document.getElementById('waveHeightVal'),
      windSpeedVal: document.getElementById('windSpeedVal'),
      rollVal: document.getElementById('rollVal'),
      pitchVal: document.getElementById('pitchVal'),
      toast: document.getElementById('toast'),
      muteBtn: document.getElementById('muteBtn'),
      hornBtn: document.getElementById('hornBtn'),
      fsBtn: document.getElementById('fsBtn'),
      weatherButtons: document.querySelectorAll('.weather-btn'),
      cameraButtons: document.querySelectorAll('.cam-btn'),
      touchControls: document.getElementById('touchControls')
    };

    this.toastTimer = null;
    this.initEvents();
  }

  initEvents() {
    // Weather preset buttons
    this.dom.weatherButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const weatherId = btn.dataset.weather;
        this.dom.weatherButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.callbacks.onWeatherChange) {
          const preset = this.callbacks.onWeatherChange(weatherId);
          if (preset) this.showToast(`${preset.icon} Weather: ${preset.name}`);
        }
      });
    });

    // Camera mode buttons
    this.dom.cameraButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const camMode = btn.dataset.cam;
        this.dom.cameraButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.callbacks.onCameraChange) {
          this.callbacks.onCameraChange(camMode);
          this.showToast(`🎥 Camera: ${btn.textContent.trim()}`);
        }
      });
    });

    // Fog Horn button
    if (this.dom.hornBtn) {
      this.dom.hornBtn.addEventListener('click', () => {
        if (this.callbacks.onHorn) {
          this.callbacks.onHorn();
          this.showToast('📯 Fog Horn Sounded');
        }
      });
    }

    // Fullscreen button
    if (this.dom.fsBtn) {
      this.dom.fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    // Audio Mute button
    if (this.dom.muteBtn) {
      this.dom.muteBtn.addEventListener('click', () => {
        if (this.callbacks.onToggleMute) {
          const isMuted = this.callbacks.onToggleMute();
          this.dom.muteBtn.innerHTML = isMuted ? '🔇 Unmute' : '🔊 Audio On';
          this.showToast(isMuted ? 'Audio Muted' : 'Audio Enabled');
        }
      });
    }

    // Mobile touch controls
    this.initTouchControls();
  }

  initTouchControls() {
    const throttleUp = document.getElementById('touchThrottleUp');
    const throttleDown = document.getElementById('touchThrottleDown');
    const portBtn = document.getElementById('touchPort');
    const stbdBtn = document.getElementById('touchStbd');

    if (!throttleUp) return;

    let touchThrottle = 0;
    let touchRudder = 0;

    const emitTouch = () => {
      if (this.callbacks.onTouchInput) {
        this.callbacks.onTouchInput(touchThrottle, touchRudder);
      }
    };

    throttleUp.addEventListener('touchstart', (e) => { e.preventDefault(); touchThrottle = 1.0; emitTouch(); });
    throttleUp.addEventListener('touchend', (e) => { e.preventDefault(); touchThrottle = 0; emitTouch(); });

    throttleDown.addEventListener('touchstart', (e) => { e.preventDefault(); touchThrottle = -0.5; emitTouch(); });
    throttleDown.addEventListener('touchend', (e) => { e.preventDefault(); touchThrottle = 0; emitTouch(); });

    portBtn.addEventListener('touchstart', (e) => { e.preventDefault(); touchRudder = -1.0; emitTouch(); });
    portBtn.addEventListener('touchend', (e) => { e.preventDefault(); touchRudder = 0; emitTouch(); });

    stbdBtn.addEventListener('touchstart', (e) => { e.preventDefault(); touchRudder = 1.0; emitTouch(); });
    stbdBtn.addEventListener('touchend', (e) => { e.preventDefault(); touchRudder = 0; emitTouch(); });
  }

  showToast(message) {
    if (!this.dom.toast) return;
    this.dom.toast.textContent = message;
    this.dom.toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.dom.toast.classList.remove('show');
    }, 2400);
  }

  update(physics, weather) {
    // Speed
    const spd = Math.max(0, physics.speedKnots);
    this.dom.speedVal.textContent = spd.toFixed(1);
    this.dom.speedBar.style.width = `${Math.min(100, (spd / 24.0) * 100)}%`;

    // Compass & Heading
    const deg = physics.headingDeg;
    this.dom.compassDegree.textContent = `${deg}°`;
    const cardinalIdx = Math.round(deg / 22.5) % 16;
    this.dom.compassVal.textContent = this.cardinals[cardinalIdx];
    if (this.dom.compassRose) {
      this.dom.compassRose.style.transform = `rotate(${-deg}deg)`;
    }

    // Engine Throttle
    const throttlePct = Math.round(physics.throttle * 100);
    this.dom.throttleVal.textContent = `${throttlePct > 0 ? '+' : ''}${throttlePct}%`;
    this.dom.throttleBar.style.width = `${Math.abs(throttlePct)}%`;
    this.dom.throttleBar.style.background = throttlePct >= 0 ? 'var(--accent-cyan)' : 'var(--accent-red)';

    // Rudder
    const rudderDeg = Math.round(physics.rudder * 32);
    const rudderSide = rudderDeg < 0 ? 'PORT' : (rudderDeg > 0 ? 'STBD' : 'MID');
    this.dom.rudderVal.textContent = `${Math.abs(rudderDeg)}° ${rudderSide}`;
    if (this.dom.rudderIndicator) {
      this.dom.rudderIndicator.style.transform = `translateX(${physics.rudder * 35}px)`;
    }

    // Sea State
    this.dom.waveHeightVal.textContent = `${(physics.currentWaveHeight * 1.8).toFixed(1)} m`;
    this.dom.windSpeedVal.textContent = `${weather.windSpeedKnots} kts`;

    // Roll & Pitch
    this.dom.rollVal.textContent = `${physics.rollDeg.toFixed(1)}°`;
    this.dom.pitchVal.textContent = `${physics.pitchDeg.toFixed(1)}°`;
  }
}
