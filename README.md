# Nautilus 3D — Real-Time Ocean & Ship Hydrodynamics Simulation

An interactive, high-performance 3D maritime simulator built with **Three.js**, **GLSL Shaders**, and **Web Audio API**.

---

## 🌊 Key Features

- **Gerstner Wave Math & Shader:**
  - Multi-octave Gerstner ocean waves calculated in real-time on the GPU (GLSL vertex & fragment shaders).
  - Wave crest steepness detection for dynamic white foam.
  - Subsurface scattering (SSS) on wave tops and Blinn-Phong specular glints.
  - Shared CPU wave sampling ensures 100% synchronization between visual waves and hull physics.

- **Multi-Point Hull Hydrodynamics & Buoyancy:**
  - 8-point physical hull probe array measuring submersion, buoyancy lift, righting torque, and water resistance.
  - Realistic pitch, roll, and heave motion that dynamically reacts to wave swells.
  - Progressive throttle acceleration, hydrodynamic lateral drag, and speed-dependent rudder turning.

- **Atmospheric Weather Presets:**
  - **☀️ Tropical Noon:** Bright sun, crystal-clear turquoise waters, gentle swells.
  - **🌅 Golden Hour (Sunset):** Rich amber/orange sky, long sun glints, moderate swells.
  - **⛈️ Midnight Tempest (Storm):** Dark churning 5m swells, heavy rain particles, howling gale winds, and lightning flashes.
  - **✨ Bioluminescent Night (Aurora):** Emerald/cyan glowing wake trails, calm mystical ocean, and northern lights sky dome.

- **Procedural Audio Engine (Web Audio API):**
  - Synthesized dual-oscillator marine diesel engine sound pitch-shifting with throttle and speed.
  - Procedural water hull rush and ocean breeze.
  - Deep harmonic maritime fog horn (`H` key).

- **Glassmorphic Telemetry HUD:**
  - Digital Speedometer log (Knots).
  - Gyro Compass with heading in nautical degrees & cardinal directions.
  - Engine throttle meter and rudder angle indicator.
  - Sea state telemetry (Wave swell height, wind speed, hull roll & pitch).
  - Multiple camera angles: **Chase [1]**, **Bridge [2]**, **Drone [3]**, and **Bow Spray [4]**.
  - Full mobile & tablet touch support with on-screen virtual levers and steering controls.

---

## 🚀 Quick Start

No heavy installation or build steps required. Simply serve the directory with any local static HTTP server:

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
| **Sound Fog Horn** | `H` | Click 📯 Horn Button |
| **Toggle Audio** | `M` | Click 🔊 Audio Button |
| **Camera Viewports** | `1`, `2`, `3`, `4` | Click Camera Dock |
| **Orbit Camera** | Left Mouse Drag | Touch Drag on Viewport |
| **Zoom In / Out** | Mouse Wheel | - |

---

## 🛠️ Tech Stack

- **Graphics:** [Three.js](https://threejs.org/) (r169)
- **Shaders:** GLSL (Gerstner waves, fresnel reflections, foam noise, sky dome)
- **Audio:** Web Audio API (`AudioContext`, `OscillatorNode`, `BiquadFilterNode`)
- **UI:** Modern CSS Glassmorphism (`backdrop-filter`) & Vanilla JavaScript (ES Modules)
