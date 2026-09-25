// Clean Minimalist HUD Controller (No emojis, Collapsible Popovers, SVG Icons)
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
      depthVal: document.getElementById('depthVal'),
      wpVal: document.getElementById('wpVal'),
      toast: document.getElementById('toast'),
      muteBtn: document.getElementById('muteBtn'),
      audioIcon: document.getElementById('audioIcon'),
      hornBtn: document.getElementById('hornBtn'),
      fsBtn: document.getElementById('fsBtn'),
      lightsBtn: document.getElementById('lightsBtn'),
      cruiseBtn: document.getElementById('cruiseBtn'),
      hudToggleBtn: document.getElementById('hudToggleBtn'),
      bottomDashboard: document.getElementById('bottomDashboard'),
      weatherToggleBtn: document.getElementById('weatherToggleBtn'),
      weatherDrawer: document.getElementById('weatherDrawer'),
      camToggleBtn: document.getElementById('camToggleBtn'),
      camDrawer: document.getElementById('camDrawer'),
      fpsVal: document.getElementById('fpsVal'),
      weatherButtons: document.querySelectorAll('.weather-btn'),
      cameraButtons: document.querySelectorAll('.cam-btn'),
      touchControls: document.getElementById('touchControls'),
      controlsHint: document.querySelector('.controls-hint'),
      controlsBtn: document.getElementById('controlsBtn'),
      controlsModal: document.getElementById('controlsModal'),
      closeControlsBtn: document.getElementById('closeControlsBtn'),
      gotItBtn: document.getElementById('gotItBtn'),
      simClockVal: document.getElementById('simClockVal')
    };

    this.toastTimer = null;
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();
    this.initEvents();
  }

  initEvents() {
    // 1. Collapsible Weather Drawer
    if (this.dom.weatherToggleBtn && this.dom.weatherDrawer) {
      this.dom.weatherToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dom.camDrawer.classList.remove('open');
        this.dom.weatherDrawer.classList.toggle('open');
      });
    }

    // 2. Collapsible Camera Drawer
    if (this.dom.camToggleBtn && this.dom.camDrawer) {
      this.dom.camToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dom.weatherDrawer.classList.remove('open');
        this.dom.camDrawer.classList.toggle('open');
      });
    }

    // Close drawers on outside click
    document.addEventListener('click', () => {
      if (this.dom.weatherDrawer) this.dom.weatherDrawer.classList.remove('open');
      if (this.dom.camDrawer) this.dom.camDrawer.classList.remove('open');
    });

    // 3. Weather Preset Selection
    this.dom.weatherButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const weatherId = btn.dataset.weather;
        this.dom.weatherButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.dom.weatherDrawer) this.dom.weatherDrawer.classList.remove('open');
        if (this.callbacks.onWeatherChange) {
          const preset = this.callbacks.onWeatherChange(weatherId);
          if (preset) this.showToast(`Atmosphere: ${preset.name}`);
        }
      });
    });

    // 4. Camera Perspectives Selection
    this.dom.cameraButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const camMode = btn.dataset.cam;
        this.dom.cameraButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.dom.camDrawer) this.dom.camDrawer.classList.remove('open');
        if (this.callbacks.onCameraChange) {
          this.callbacks.onCameraChange(camMode);
          this.showToast(`Camera: ${btn.textContent.trim()}`);
        }
      });
    });

    // 5. Searchlights Button
    if (this.dom.lightsBtn) {
      this.dom.lightsBtn.addEventListener('click', () => {
        if (this.callbacks.onToggleLights) {
          const isOn = this.callbacks.onToggleLights();
          this.dom.lightsBtn.classList.toggle('active', isOn);
        }
      });
    }

    // 6. Autopilot Cruise Button
    if (this.dom.cruiseBtn) {
      this.dom.cruiseBtn.addEventListener('click', () => {
        if (this.callbacks.onToggleAutopilot) {
          const isCruise = this.callbacks.onToggleAutopilot();
          this.dom.cruiseBtn.classList.toggle('active', isCruise);
        }
      });
    }

    // 7. Fog Horn Button
    if (this.dom.hornBtn) {
      this.dom.hornBtn.addEventListener('click', () => {
        if (this.callbacks.onHorn) {
          this.callbacks.onHorn();
          this.showToast('Fog Horn Sounded');
        }
      });
    }

    // 8. Fullscreen Button
    if (this.dom.fsBtn) {
      this.dom.fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });

      document.addEventListener('fullscreenchange', () => {
        this.dom.fsBtn.classList.toggle('active', !!document.fullscreenElement);
      });
    }

    // 9. Hide / Show HUD Display
    if (this.dom.hudToggleBtn && this.dom.bottomDashboard) {
      this.dom.hudToggleBtn.addEventListener('click', () => {
        const isCollapsed = this.dom.bottomDashboard.classList.toggle('collapsed');
        this.dom.hudToggleBtn.classList.toggle('active', isCollapsed);
        if (this.dom.controlsHint) {
          this.dom.controlsHint.classList.toggle('hidden', isCollapsed);
        }
        this.showToast(isCollapsed ? 'HUD Minimized' : 'HUD Restored');
      });
    }

    // 10. Audio Mute Toggle Button
    if (this.dom.muteBtn) {
      this.dom.muteBtn.addEventListener('click', () => {
        if (this.callbacks.onToggleMute) {
          const isMuted = this.callbacks.onToggleMute();
          this.setAudioIcon(isMuted);
          this.showToast(isMuted ? 'Audio Muted' : 'Audio Enabled');
        }
      });
    }

    // 11. Keyboard Controls Modal Trigger & Handlers
    if (this.dom.controlsBtn) {
      this.dom.controlsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleControlsModal();
      });
    }

    if (this.dom.closeControlsBtn) {
      this.dom.closeControlsBtn.addEventListener('click', () => {
        this.toggleControlsModal(false);
      });
    }

    if (this.dom.gotItBtn) {
      this.dom.gotItBtn.addEventListener('click', () => {
        this.toggleControlsModal(false);
      });
    }

    if (this.dom.controlsModal) {
      this.dom.controlsModal.addEventListener('click', (e) => {
        if (e.target === this.dom.controlsModal) {
          this.toggleControlsModal(false);
        }
      });
    }

    this.initTouchControls();
  }

  toggleControlsModal(force) {
    if (!this.dom.controlsModal) return;
    const isHidden = this.dom.controlsModal.classList.contains('hidden');
    const shouldOpen = force !== undefined ? force : isHidden;
    this.dom.controlsModal.classList.toggle('hidden', !shouldOpen);
    if (this.dom.controlsBtn) {
      this.dom.controlsBtn.classList.toggle('active', shouldOpen);
    }
  }

  setAudioIcon(isMuted) {
    if (!this.dom.audioIcon) return;
    if (isMuted) {
      this.dom.audioIcon.innerHTML = `
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <line x1="22" y1="9" x2="16" y2="15"></line>
        <line x1="16" y1="9" x2="22" y2="15"></line>
      `;
      this.dom.muteBtn.classList.remove('active');
    } else {
      this.dom.audioIcon.innerHTML = `
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
      `;
      this.dom.muteBtn.classList.add('active');
    }
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
    }, 2200);
  }

  update(physics, weather) {
    if (!physics || !weather) return;

    // Speed
    const spd = Math.max(0, physics.speedKnots || 0);
    if (this.dom.speedVal) this.dom.speedVal.textContent = spd.toFixed(1);
    if (this.dom.speedBar) this.dom.speedBar.style.width = `${Math.min(100, (spd / 24.0) * 100)}%`;

    // Compass & Heading
    const deg = physics.headingDeg || 0;
    if (this.dom.compassDegree) this.dom.compassDegree.textContent = `${deg}°`;
    const cardinalIdx = Math.round(deg / 22.5) % 16;
    if (this.dom.compassVal) this.dom.compassVal.textContent = this.cardinals[cardinalIdx];
    if (this.dom.compassRose) {
      this.dom.compassRose.style.transform = `rotate(${-deg}deg)`;
    }

    // Engine Throttle
    const throttlePct = Math.round((physics.throttle || 0) * 100);
    if (this.dom.throttleVal) this.dom.throttleVal.textContent = `${throttlePct > 0 ? '+' : ''}${throttlePct}%`;
    if (this.dom.throttleBar) {
      this.dom.throttleBar.style.width = `${Math.abs(throttlePct)}%`;
      this.dom.throttleBar.style.background = throttlePct >= 0 ? 'var(--accent-cyan)' : 'var(--accent-red)';
    }

    // Rudder
    const rudderDeg = Math.round((physics.rudder || 0) * 32);
    const rudderSide = rudderDeg < 0 ? 'PORT' : (rudderDeg > 0 ? 'STBD' : 'MID');
    if (this.dom.rudderVal) this.dom.rudderVal.textContent = `${Math.abs(rudderDeg)}° ${rudderSide}`;
    if (this.dom.rudderIndicator) {
      this.dom.rudderIndicator.style.transform = `translateX(${(physics.rudder || 0) * 32}px)`;
    }

    // Sea State & Weather
    if (this.dom.simClockVal && weather && weather.name) {
      this.dom.simClockVal.textContent = weather.name;
    }
    if (this.dom.waveHeightVal) this.dom.waveHeightVal.textContent = `${((physics.currentWaveHeight || 0) * 1.8).toFixed(1)} m`;
    if (this.dom.windSpeedVal) this.dom.windSpeedVal.textContent = `${weather.windSpeedKnots || 0} kts`;

    // Roll & Pitch (defensively guarded)
    if (this.dom.rollVal && physics.rollDeg !== undefined) {
      this.dom.rollVal.textContent = `${physics.rollDeg.toFixed(1)}°`;
    }
    if (this.dom.pitchVal && physics.pitchDeg !== undefined) {
      this.dom.pitchVal.textContent = `${physics.pitchDeg.toFixed(1)}°`;
    }

    // Live Marine Depth Sounder
    if (this.dom.depthVal && physics.currentDepthMeters !== undefined) {
      const d = physics.currentDepthMeters.toFixed(1);
      this.dom.depthVal.textContent = `${d} m`;
      if (physics.shallowAlarm) {
        this.dom.depthVal.style.color = '#ff1744';
        this.dom.depthVal.style.textShadow = '0 0 8px rgba(255, 23, 68, 0.8)';
      } else {
        this.dom.depthVal.style.color = '#00e5ff';
        this.dom.depthVal.style.textShadow = 'none';
      }
    }

    // Active Waypoint & Navigation Track
    if (this.dom.wpVal && physics.waypoints) {
      if (physics.autopilot) {
        const wp = physics.waypoints[physics.activeWaypointIndex];
        const dist = Math.round(physics.distToWaypoint || 0);
        this.dom.wpVal.textContent = `${wp.name.split(' ')[0]} ${dist}m`;
        this.dom.wpVal.style.color = '#ffb300';
      } else {
        this.dom.wpVal.textContent = 'MANUAL';
        this.dom.wpVal.style.color = '#90a4ae';
      }
    }

    // Live FPS readout
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 500) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      if (this.dom.fpsVal) this.dom.fpsVal.textContent = fps;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }
}
