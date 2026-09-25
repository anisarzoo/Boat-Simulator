# Nautilus 3D — Real-Time Ocean & Ship Hydrodynamics Simulation

An interactive, high-performance 3D maritime simulator built with **Three.js**, **GLSL Shaders**, and **Web Audio API**.

---

## 🌊 Key Features

- **Gerstner Wave Math & Micro-Ripple Shader:**
  - Multi-octave Gerstner ocean swells combined with analytical high-frequency micro-ripples.
  - Dynamic wave crest steepness detection for white turbulent foam.
  - Subsurface scattering (SSS) glowing emerald/turquoise through wave crests.
  - Blinn-Phong sun specular highlights and distance horizon fog blending.
  - Shared CPU wave sampling ensures 100% synchronization between visual waves and hull physics.

- **Multi-Point Hull Hydrodynamics & Buoyancy:**
  - 8-point physical hull probe array measuring submersion, buoyancy lift, righting torque, and water resistance.
  - Centrifugal turning heel: realistic banking into turns.
  - Realistic pitch, roll, and heave motion reacting to dynamic swells.
  - Progressive throttle acceleration, hydrodynamic lateral drag, and speed-dependent rudder turning.

- **Living Nautical Environment:**
  - **Floating Navigation Channel Buoys:** Red and green lateral markers bobbing and pitching on the waves with flashing strobe lanterns.
  - **Soaring Sea Bird Flock:** Animated seagulls circling overhead with wing flapping and gliding kinematics.
  - **Procedural 3D Drifting Clouds:** High-altitude cloud layers catching golden-hour sunset light or darkening into thunderheads.

- **Lighting & Searchlights:**
  - Forward-facing high-power marine searchlights cutting through fog and illuminating the waves ahead (`L` key).
  - Underwater mega-yacht stern transom LED glow lights illuminating the twin propeller wash.
  - Warm deck courtesy lights and illuminated bridge navigation screens.

- **Atmospheric Weather Presets:**
  - **☀️ Tropical Noon:** Bright sun, crystal-clear turquoise waters, gentle swells.
  - **🌅 Golden Hour (Sunset):** Rich amber/orange sky, long sun glints, moderate swells.
  - **⛈️ Midnight Tempest (Storm):** Dark churning 5m swells, heavy rain particles, howling gale winds, and lightning flashes.
  - **✨ Bioluminescent Night (Aurora):** Emerald/cyan glowing wake trails, calm mystical ocean, 1,800 twinkling stars, and glowing full moon.

- **Procedural Audio Engine (Web Audio API):**
  - Synthesized dual-oscillator marine diesel engine sound pitch-shifting with throttle and speed.
  - Dynamic wave impact crashes when slicing through rough wave swells.
  - Procedural water hull rush and ocean breeze.
  - Deep harmonic maritime fog horn (`H` key).

- **Glassmorphic Telemetry HUD:**
  - Marine Radar PPI scope with real-time range rings, crosshairs, and scanning sweep.
  - Digital Speedometer log (Knots).
  - Gyro Compass with heading in nautical degrees & cardinal directions.
  - Engine throttle meter and rudder angle indicator.
  - Autopilot Cruise control toggle (`C` key).
  - Sea state telemetry (Wave swell height, wind speed, hull roll & pitch).
  - Live FPS performance telemetry.
  - Multiple camera angles: **Chase [1]**, **Bridge [2]**, **Drone [3]**, and **Bow Spray [4]**.
  - Full mobile & tablet touch support with on-screen virtual levers and steering controls.

---

## 🚀 Quick Start

No build steps required. Simply serve the directory with any local static HTTP server:

```bash
# Using Python:
python -m http.server 8080

# Or using npx serve:
npx serve .
```

Open `http://localhost:8080` in any modern web browser.

---

## 🎮 Controls

| Action | Keyboard | Touch / Mouse |
| :--- | :--- | :--- |
| **Throttle Forward / Reverse** | `W` / `S` or `↑` / `↓` | On-Screen ▲ / ▼ Buttons |
| **Rudder Port / Starboard** | `A` / `D` or `←` / `→` | On-Screen ◀ / ▶ Buttons |
| **Autopilot Cruise (Full Ahead)** | `C` | Click ⚓ Cruise Button |
| **Toggle Searchlights** | `L` | Click 💡 Lights Button |
| **Sound Fog Horn** | `H` | Click 📯 Horn Button |
| **Toggle Audio** | `M` | Click 🔊 Audio Button |
| **Toggle Fullscreen** | `F` | Click ⛶ Fullscreen Button |
| **Camera Viewports** | `1`, `2`, `3`, `4` | Click Camera Dock |
| **Orbit Camera** | Left Mouse Drag | Touch Drag on Viewport |
| **Zoom In / Out** | Mouse Wheel | - |

---

## 🛠️ Tech Stack

- **Graphics:** [Three.js](https://threejs.org/) (r169)
- **Shaders:** GLSL (Gerstner waves, micro-normals, fresnel reflections, foam noise, sky dome)
- **Audio:** Web Audio API (`AudioContext`, `OscillatorNode`, `BiquadFilterNode`)
- **UI:** Modern CSS Glassmorphism (`backdrop-filter`) & Vanilla JavaScript (ES Modules)
