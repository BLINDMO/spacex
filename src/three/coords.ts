import { R_EARTH } from '../sim/constants';

// World scale: 1 three.js unit = 100 km. Keeps Earth (~63.7 units) and orbits in a numerically
// comfortable range. The 2D ECI simulation plane (x,y) maps to the world XY plane (z = 0).
export const SCALE = 1e5;
export const EARTH_R = R_EARTH / SCALE; // ~63.71 units

/** Map a simulation plane position (meters) to scene units. */
export function toScene(x: number, y: number): [number, number, number] {
  return [x / SCALE, y / SCALE, 0];
}

// The rocket is physically tiny at this scale; exaggerate the model so it reads clearly and
// staging is visible (especially on small phone screens).
export const ROCKET_VISUAL_HEIGHT = 2.2; // scene units for the whole stack

// Fixed sun direction in world space (for Earth lighting + scene key light).
export const SUN_DIR: [number, number, number] = [0.6, 0.35, 0.72];

/** Unit thrust/nose direction (scene XY plane) from sim position and body pitch (rad above
 *  local horizontal). up = radial, fwd = prograde-horizontal. */
export function rocketDir(x: number, y: number, bodyPitch: number): [number, number, number] {
  const r = Math.hypot(x, y) || 1;
  const upx = x / r;
  const upy = y / r;
  const fwx = -y / r;
  const fwy = x / r;
  const c = Math.cos(bodyPitch);
  const s = Math.sin(bodyPitch);
  return [c * fwx + s * upx, c * fwy + s * upy, 0];
}

