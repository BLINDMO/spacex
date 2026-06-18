import { R_EARTH, MU_EARTH, DEG, DEFAULT_QALPHA_SOFT } from './constants';
import { elementsFromState } from './orbit';

export interface GuidanceCtx {
  targetPeriR: number; // target periapsis radius, m
  targetApoR: number; // target apoapsis radius, m
  transfer: boolean; // elliptical target (apo >> peri)
  hasActiveEngine: boolean; // is there a stage that can fire
  omegaPlane: number; // co-rotating atmosphere angular rate, rad/s
}

export interface GuidanceOut {
  desiredPitch: number; // rad above local horizontal (90deg = straight up)
  throttle: number; // 0..1 (before engine min-throttle clamp by loop)
  phase: number;
  cutoff: boolean; // request engine cutoff (coast)
}

const PITCH_KICK = 87 * DEG; // initial tilt after vertical rise
const TURN_START_ALT = 600; // begin pitch program
const TURN_EXP = 2.6; // shape: steep low (climb out of atmosphere), flat high (build vel)
const Q_THROTTLE = 26e3; // Pa — begin throttle bucket
const Q_SPAN = 22e3; // Pa — throttle range of the bucket

/** Local up (radial) and prograde-horizontal unit vectors at a position. */
export function localFrame(x: number, y: number) {
  const r = Math.hypot(x, y);
  return { upx: x / r, upy: y / r, fwdx: -y / r, fwdy: x / r, r };
}

/** Flight-path angle (above local horizontal) of an arbitrary velocity vector at a point. */
function pathAngle(x: number, y: number, vx: number, vy: number): number {
  const f = localFrame(x, y);
  const vUp = vx * f.upx + vy * f.upy;
  const vFwd = vx * f.fwdx + vy * f.fwdy;
  return Math.atan2(vUp, vFwd);
}

/** Inertial flight-path angle of the velocity vector above local horizontal, rad. */
export function progradePitch(x: number, y: number, vx: number, vy: number): number {
  return pathAngle(x, y, vx, vy);
}

/** Surface-relative flight-path angle (atmosphere co-rotation removed) — the correct
 *  reference for an atmospheric gravity turn. */
function surfacePrograde(x: number, y: number, vx: number, vy: number, omega: number): number {
  const r = Math.hypot(x, y);
  const airVx = (-y / r) * omega * r;
  const airVy = (x / r) * omega * r;
  return pathAngle(x, y, vx - airVx, vy - airVy);
}

/**
 * Autopilot guidance. Atmospheric gravity turn driven by an altitude pitch schedule that is
 * kept close to the surface-relative velocity (limited angle of attack), then closed-loop
 * apoapsis targeting: an insertion/horizontal-hold burn for elliptical targets, or
 * coast-to-apoapsis + circularize for circular targets. Includes the Max-Q throttle bucket.
 */
export function autoGuidance(
  x: number,
  y: number,
  vx: number,
  vy: number,
  q: number,
  phase: number,
  ctx: GuidanceCtx,
): GuidanceOut {
  const f = localFrame(x, y);
  const alt = f.r - R_EARTH;
  const el = elementsFromState(x, y, vx, vy);
  const apoR = el.sma > 0 ? el.sma * (1 + el.ecc) : Infinity;
  const periR = el.sma * (1 - el.ecc);
  const vUp = vx * f.upx + vy * f.upy; // inertial radial (vertical) speed
  const progradeSurf = surfacePrograde(x, y, vx, vy, ctx.omegaPlane);
  const progradeIn = progradePitch(x, y, vx, vy);
  // surface-relative speed for the ascent schedule
  const airVx = (-y / f.r) * ctx.omegaPlane * f.r;
  const airVy = (x / f.r) * ctx.omegaPlane * f.r;
  const surfSpeed = Math.hypot(vx - airVx, vy - airVy);

  let desiredPitch = 90 * DEG;
  let throttle = 1;
  let cutoff = false;
  let p = phase;

  const periAltTarget = ctx.targetPeriR - R_EARTH;
  const apoAltTarget = ctx.targetApoR - R_EARTH;
  // Parking altitude: a low circular park (then Hohmann up) for high circular targets,
  // the perigee altitude for transfer targets, or the target itself if it's already low.
  const ascentAlt = ctx.transfer ? periAltTarget : apoAltTarget;
  const tol = Math.max(4e3, periAltTarget * 0.03); // periapsis tolerance, m
  const speed = Math.hypot(vx, vy);
  // Low circular orbits insert under continuous power (hold target altitude, raise periapsis);
  // high circular orbits use a coast to apoapsis + circularization burn.
  const lowCircular = !ctx.transfer && apoAltTarget <= 450e3;

  // ---- Phase transitions -------------------------------------------------
  if (p === 0 && alt > TURN_START_ALT) p = 1; // cleared tower -> pitch kick
  if (p === 1 && progradeSurf < 86 * DEG) p = 2; // kick took -> gravity turn
  if (p === 2 && ctx.transfer && alt >= periAltTarget * 0.9 && apoR >= ctx.targetPeriR - 8e3) p = 3;
  if (p === 2 && lowCircular && alt >= apoAltTarget * 0.94 && apoR >= ctx.targetApoR - 4e3) p = 7;
  if (p === 2 && !ctx.transfer && !lowCircular && apoR >= ctx.targetApoR - 3e3) p = 5;

  switch (p) {
    case 0:
      desiredPitch = 90 * DEG;
      break;
    case 1:
      desiredPitch = PITCH_KICK;
      break;
    case 2: {
      // Altitude-fraction gravity-turn schedule: steep low, flattening as we climb toward the
      // ascent target altitude. For circular targets, throttle down as the coast apoapsis nears
      // the target so we don't overshoot it (works for over-powered upper stages too).
      const frac = Math.max(0, Math.min(1, alt / ascentAlt));
      desiredPitch = (90 * DEG) * Math.pow(1 - frac, TURN_EXP);
      if (apoR >= R_EARTH + ascentAlt) {
        desiredPitch = Math.min(desiredPitch, insertionPitch(R_EARTH + ascentAlt, f.r, speed));
      }
      if (alt < 50e3) desiredPitch = Math.max(desiredPitch, 2 * DEG); // no nose-down in air
      throttle = 1;
      // Fine-trim apoapsis only on the high-circular coast path (low circular holds full
      // throttle through to the continuous-hold insertion).
      if (!ctx.transfer && !lowCircular && apoR > ctx.targetApoR - 45e3) {
        throttle = clamp((ctx.targetApoR - apoR) / 45e3, 0.12, 1);
      }
      break;
    }
    case 3: {
      // Transfer insertion (GTO/TLI): hold perigee altitude under power, burn prograde to
      // raise apoapsis to the target.
      desiredPitch = altitudeHold(vUp);
      throttle = 1;
      if (apoR >= ctx.targetApoR) {
        cutoff = true;
        p = 9;
      }
      break;
    }
    case 5: {
      // Coast to apoapsis with engines off.
      cutoff = true;
      throttle = 0;
      desiredPitch = progradeIn;
      if (vUp < 10) p = 6;
      break;
    }
    case 6: {
      // Circularize at apoapsis: strong altitude hold (wide pitch authority so a long, low-
      // velocity burn at apoapsis can keep altitude) while thrusting prograde to raise periapsis.
      desiredPitch = altitudeHold(vUp);
      throttle = 1;
      // Cut when periapsis reaches the target OR the orbit is already circular (periapsis has
      // caught up to apoapsis — important when we circularized slightly below the nominal alt).
      if (periR >= ctx.targetPeriR - tol || apoR - periR < 2 * tol) {
        cutoff = true;
        p = 9;
      }
      break;
    }
    case 7: {
      // Low circular insertion under continuous power: hold the target altitude (null vertical
      // speed) and thrust prograde to raise periapsis up to meet apoapsis — circularizing in
      // place without a coast (best for modest upper stages and low orbits).
      desiredPitch = altitudeHold(vUp);
      throttle = 1;
      if (periR >= ctx.targetPeriR - tol || apoR - periR < 2 * tol) {
        cutoff = true;
        p = 9;
      }
      break;
    }
    case 9:
    default:
      cutoff = true;
      throttle = 0;
      desiredPitch = progradeIn;
      break;
  }

  // ---- Max-Q throttle bucket --------------------------------------------
  if (!cutoff && q > Q_THROTTLE) {
    const reduce = Math.min(1, (q - Q_THROTTLE) / Q_SPAN);
    throttle = Math.min(throttle, Math.max(0.55, 1 - reduce * 0.45));
  }

  return { desiredPitch, throttle, phase: p, cutoff };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Flight-path angle (rad above horizon) that steers the vehicle toward a target hold radius
 * under power: command a vertical speed proportional to the altitude error (capped), then
 * convert to the body angle needed to achieve it at the current speed. As the vehicle nears
 * the target altitude the commanded climb -> 0, leaving thrust to build horizontal velocity.
 */
function insertionPitch(holdR: number, r: number, speed: number): number {
  const vVertTarget = clamp((holdR - r) * 0.025, -120, 150);
  const ratio = clamp(vVertTarget / Math.max(speed, 1), -0.5, 0.6);
  return Math.asin(ratio);
}

/**
 * Altitude-hold flight-path angle: drive vertical speed to zero with wide pitch authority so
 * that a long, low-velocity circularization burn at apoapsis can still hold altitude (pitch
 * up hard when sinking). Returns radians above horizon.
 */
function altitudeHold(vUp: number): number {
  return clamp(-vUp * 0.01, -22 * DEG, 55 * DEG);
}

/**
 * q·alpha soft-limit throttle clamp shared by manual & auto: if the product of dynamic
 * pressure and angle-of-attack exceeds the soft structural ceiling, throttle is reduced.
 */
export function qAlphaThrottleClamp(throttle: number, q: number, alpha: number): number {
  const qAlpha = q * Math.abs(alpha);
  if (qAlpha <= DEFAULT_QALPHA_SOFT) return throttle;
  const over = qAlpha / DEFAULT_QALPHA_SOFT;
  return Math.max(0.4, throttle / over);
}
