import { MU_EARTH, R_EARTH, OMEGA_EARTH, DEG } from './constants';

export interface OrbitElements {
  sma: number; // semi-major axis, m
  ecc: number; // eccentricity
  apoapsis: number; // altitude above surface, m
  periapsis: number; // altitude above surface, m
  period: number; // s (NaN if not bound)
  energy: number; // specific orbital energy, J/kg
}

/**
 * Orbital elements from a 2D state vector (position & velocity in the orbital plane).
 * Standard two-body vis-viva / angular-momentum reduction.
 */
export function elementsFromState(x: number, y: number, vx: number, vy: number): OrbitElements {
  const r = Math.hypot(x, y);
  const v = Math.hypot(vx, vy);
  const energy = (v * v) / 2 - MU_EARTH / r;
  const sma = -MU_EARTH / (2 * energy); // negative energy -> positive sma (bound)
  // specific angular momentum (z component of r x v in 2D)
  const h = x * vy - y * vx;
  // eccentricity from h and energy: e = sqrt(1 + 2*E*h^2/mu^2)
  const eSq = 1 + (2 * energy * h * h) / (MU_EARTH * MU_EARTH);
  const ecc = Math.sqrt(Math.max(0, eSq));
  const rApo = sma * (1 + ecc);
  const rPeri = sma * (1 - ecc);
  const bound = energy < 0;
  return {
    sma,
    ecc,
    apoapsis: rApo - R_EARTH,
    periapsis: rPeri - R_EARTH,
    period: bound ? 2 * Math.PI * Math.sqrt((sma * sma * sma) / MU_EARTH) : NaN,
    energy,
  };
}

/** Circular orbital speed at radius r. */
export function circularSpeed(r: number): number {
  return Math.sqrt(MU_EARTH / r);
}

/** Vis-viva speed at radius r on an orbit of semi-major axis a. */
export function visViva(r: number, a: number): number {
  return Math.sqrt(MU_EARTH * (2 / r - 1 / a));
}

/**
 * Hohmann transfer between two circular orbits (radii r1 -> r2).
 * Returns the two burn dv's and the transfer semi-major axis.
 */
export function hohmann(r1: number, r2: number) {
  const aT = (r1 + r2) / 2;
  const v1 = circularSpeed(r1);
  const v2 = circularSpeed(r2);
  const vp = visViva(r1, aT); // speed at periapsis of transfer
  const va = visViva(r2, aT); // speed at apoapsis of transfer
  return {
    aT,
    dv1: vp - v1,
    dv2: v2 - va,
    total: vp - v1 + (v2 - va),
  };
}

/**
 * Launch azimuth (deg from north) required to reach a target inclination from a given
 * latitude, ignoring rotation correction. cos(i) = cos(lat)·sin(az).
 * Returns the azimuth and whether the inclination is achievable (i >= lat).
 */
export function requiredAzimuth(latDeg: number, incDeg: number) {
  const lat = latDeg * DEG;
  const inc = incDeg * DEG;
  let sinAz = Math.cos(inc) / Math.cos(lat);
  const achievable = Math.abs(sinAz) <= 1.0000001;
  sinAz = Math.max(-1, Math.min(1, sinAz));
  let az: number;
  if (incDeg <= 90) {
    az = Math.asin(sinAz); // 0..90 deg (north..east)
  } else {
    az = Math.PI - Math.asin(sinAz); // retrograde, south-going
  }
  return { azimuthDeg: az / DEG, achievable };
}

/**
 * Eastward inertial velocity contributed by Earth rotation along the launch azimuth.
 * v_rot = ω·R·cos(lat); the along-track (in-plane) component is v_rot·sin(azimuth).
 * Negative for retrograde launches (you fight the rotation).
 */
export function rotationVelocity(latDeg: number, azimuthDeg: number): number {
  const vRot = OMEGA_EARTH * R_EARTH * Math.cos(latDeg * DEG);
  return vRot * Math.sin(azimuthDeg * DEG);
}
