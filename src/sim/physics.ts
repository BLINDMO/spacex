import { G0, MU_EARTH, R_EARTH } from './constants';
import { atmosphere, dynamicPressure } from './atmosphere';

export interface ForceParams {
  mass: number; // current vehicle mass, kg
  thrust: number; // current thrust magnitude, N (already throttle & pressure adjusted)
  // unit vector of thrust direction in the orbital plane
  thrustDirX: number;
  thrustDirY: number;
  cdA: number; // drag coefficient * reference area, m^2 (Cd*A)
  omegaPlane: number; // angular rate of the co-rotating atmosphere, rad/s (in-plane)
}

export interface Accel {
  ax: number;
  ay: number;
  // diagnostics (computed at the primary evaluation):
  gravMag: number; // gravity acceleration magnitude
  dragMag: number; // drag acceleration magnitude
  airspeed: number;
  q: number;
}

/** Gravity acceleration vector toward Earth center: g = μ/r^2. */
export function gravityAccel(x: number, y: number): { ax: number; ay: number; g: number } {
  const r = Math.hypot(x, y);
  const g = MU_EARTH / (r * r);
  return { ax: (-g * x) / r, ay: (-g * y) / r, g };
}

/**
 * Drag coefficient as a function of Mach number — subsonic plateau, transonic peak near
 * Mach 1, decaying supersonic tail. Keeps Max-Q drag physically reasonable.
 */
export function dragCoefficient(mach: number): number {
  if (mach < 0.8) return 0.3;
  if (mach < 1.2) return 0.3 + (mach - 0.8) * (0.55 - 0.3) / 0.4; // ramp to transonic peak
  if (mach < 5) return 0.55 - (mach - 1.2) * (0.55 - 0.28) / 3.8;
  return 0.28;
}

/**
 * Full acceleration at a state. Gravity + thrust + atmospheric drag (relative to the
 * co-rotating atmosphere). Thrust direction and magnitude are held constant across the
 * RK4 sub-evaluations (they are set by guidance once per substep).
 */
export function acceleration(
  x: number,
  y: number,
  vx: number,
  vy: number,
  p: ForceParams,
): Accel {
  const r = Math.hypot(x, y);
  const altitude = r - R_EARTH;
  const grav = gravityAccel(x, y);

  // Atmosphere velocity (rigid co-rotation in-plane), tangential direction = (-y, x)/r
  const airVx = (-y / r) * p.omegaPlane * r;
  const airVy = (x / r) * p.omegaPlane * r;
  const relVx = vx - airVx;
  const relVy = vy - airVy;
  const airspeed = Math.hypot(relVx, relVy);

  const air = atmosphere(altitude);
  const q = dynamicPressure(air.density, airspeed);
  const mach = airspeed / air.speedOfSound;
  const cd = dragCoefficient(mach);

  // Drag force magnitude = 1/2 ρ v^2 Cd A = q * Cd * A, opposing relative velocity
  let dragAx = 0;
  let dragAy = 0;
  let dragMag = 0;
  if (airspeed > 1e-3 && air.density > 1e-9) {
    const cdAeff = (cd / 0.3) * p.cdA; // scale the provided Cd*A reference by Mach factor
    const fDrag = q * cdAeff;
    dragMag = fDrag / p.mass;
    dragAx = (-relVx / airspeed) * dragMag;
    dragAy = (-relVy / airspeed) * dragMag;
  }

  const thrAx = p.mass > 0 ? (p.thrust * p.thrustDirX) / p.mass : 0;
  const thrAy = p.mass > 0 ? (p.thrust * p.thrustDirY) / p.mass : 0;

  return {
    ax: grav.ax + dragAx + thrAx,
    ay: grav.ay + dragAy + thrAy,
    gravMag: grav.g,
    dragMag,
    airspeed,
    q,
  };
}

export interface KinState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * One RK4 step of the translational state. Mass, thrust and direction are fixed across the
 * step (params); they are updated between steps by the loop. dt is the fixed physics step.
 */
export function rk4Step(s: KinState, p: ForceParams, dt: number): KinState {
  const deriv = (st: KinState) => {
    const a = acceleration(st.x, st.y, st.vx, st.vy, p);
    return { dx: st.vx, dy: st.vy, dvx: a.ax, dvy: a.ay };
  };

  const k1 = deriv(s);
  const s2: KinState = {
    x: s.x + (k1.dx * dt) / 2,
    y: s.y + (k1.dy * dt) / 2,
    vx: s.vx + (k1.dvx * dt) / 2,
    vy: s.vy + (k1.dvy * dt) / 2,
  };
  const k2 = deriv(s2);
  const s3: KinState = {
    x: s.x + (k2.dx * dt) / 2,
    y: s.y + (k2.dy * dt) / 2,
    vx: s.vx + (k2.dvx * dt) / 2,
    vy: s.vy + (k2.dvy * dt) / 2,
  };
  const k3 = deriv(s3);
  const s4: KinState = {
    x: s.x + k3.dx * dt,
    y: s.y + k3.dy * dt,
    vx: s.vx + k3.dvx * dt,
    vy: s.vy + k3.dvy * dt,
  };
  const k4 = deriv(s4);

  return {
    x: s.x + (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx),
    y: s.y + (dt / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy),
    vx: s.vx + (dt / 6) * (k1.dvx + 2 * k2.dvx + 2 * k3.dvx + k4.dvx),
    vy: s.vy + (dt / 6) * (k1.dvy + 2 * k2.dvy + 2 * k3.dvy + k4.dvy),
  };
}

/** Engine thrust & mass-flow at a given throttle and ambient pressure. */
export function engineOutput(
  thrustVac: number,
  ispVac: number,
  ispSL: number,
  thrustSL: number,
  pressureFrac: number,
  throttle: number,
): { thrust: number; mdot: number; isp: number } {
  // Mass flow is fixed by the turbopump setting (throttle); thrust = mdot * Isp(p) * g0.
  const mdotFull = thrustVac / (ispVac * G0);
  const mdot = mdotFull * throttle;
  // Isp interpolates with ambient pressure (sea-level weaker, vacuum stronger).
  const isp = ispSL > 0 ? ispVac - (ispVac - ispSL) * pressureFrac : ispVac;
  const thrust = mdot * isp * G0;
  return { thrust, mdot, isp };
}
