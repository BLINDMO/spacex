import {
  G0,
  R_EARTH,
  PHYS_DT,
  MAX_SUBSTEPS,
  STABLE_PERIAPSIS,
  FAIRING_JETTISON_ALT,
  DEFAULT_MAX_QALPHA,
  CREW_G_LIMIT,
  CREW_G_DURATION,
  DEG,
  KARMAN,
} from './constants';
import type {
  VehicleDesign,
  Mission,
  LaunchSite,
  SimState,
  DerivedTelemetry,
  EventLogEntry,
  MissionScore,
} from './types';
import { ENGINES } from '../data/engines';
import { elementsFromState, requiredAzimuth, rotationVelocity, circularSpeed } from './orbit';
import { atmosphere, pressureFraction } from './atmosphere';
import { rk4Step, acceleration, engineOutput, gravityAccel } from './physics';
import { autoGuidance, progradePitch, localFrame, qAlphaThrottleClamp } from './guidance';
import { gravityLoss, dragLoss, steeringLoss, idealDv } from './losses';

const TURN_RATE = 6 * DEG; // max body slew rate, rad/s (TVC turn-rate limit)

interface RuntimeStage {
  name: string;
  engineId: string;
  engineCount: number;
  dryMass: number; // including engines
  propInitial: number;
  thrustVac: number;
  thrustSL: number;
  ispVac: number;
  ispSL: number;
  minThrottle: number;
}

export interface FlightRuntime {
  stages: RuntimeStage[];
  payloadMass: number;
  fairingMass: number;
  cdA: number; // Cd*A reference (0.3 baseline baked in)
  cdANoFairing: number;
  omegaPlane: number; // co-rotating atmosphere angular rate, rad/s
  rotVel: number; // initial in-plane surface velocity, m/s
  targetPeriR: number;
  targetApoR: number;
  transfer: boolean;
  achievedInc: number; // inclination the launch geometry can deliver, deg
  incAchievable: boolean;
  crewed: boolean;
  mission: Mission;
  totalPropInitial: number;
}

export interface FrameResult {
  events: EventLogEntry[];
  derived: DerivedTelemetry;
}

/** Attached stack mass given remaining propellant and which stages are still attached. */
function currentMass(state: SimState, rt: FlightRuntime): number {
  let m = rt.payloadMass + (state.fairingJettisoned ? 0 : rt.fairingMass);
  for (let i = state.activeStage; i < rt.stages.length; i++) {
    m += rt.stages[i].dryMass + Math.max(0, state.stagePropRemaining[i]);
  }
  return m;
}

/** Build flight runtime + initial on-pad state from a design, mission and site. */
export function initFlight(
  vehicle: VehicleDesign,
  mission: Mission,
  site: LaunchSite,
): { runtime: FlightRuntime; state: SimState } {
  const stages: RuntimeStage[] = vehicle.stages.map((s) => {
    const e = ENGINES[s.engineId];
    return {
      name: s.name,
      engineId: s.engineId,
      engineCount: s.engineCount,
      dryMass: s.dryMass + e.mass * s.engineCount,
      propInitial: s.propMass,
      thrustVac: e.thrustVac * s.engineCount,
      thrustSL: e.thrustSL * s.engineCount,
      ispVac: e.ispVac,
      ispSL: e.ispSL,
      minThrottle: e.minThrottle,
    };
  });

  // Reference area from booster propellant volume (cylinder, L/D ~ 14).
  const eng0 = ENGINES[vehicle.stages[0].engineId];
  const dens = propellantDensity(eng0.propellant);
  const vol = vehicle.stages[0].propMass / dens;
  const diameter = Math.cbrt((4 * vol) / (Math.PI * 14));
  const area = (Math.PI / 4) * diameter * diameter;
  const cdA = 0.3 * area;

  const az = requiredAzimuth(site.latitude, mission.targetInclination);
  const rotVel = rotationVelocity(site.latitude, az.azimuthDeg);
  const achievedInc = az.achievable ? mission.targetInclination : site.latitude;

  const runtime: FlightRuntime = {
    stages,
    payloadMass: vehicle.payloadMass,
    fairingMass: vehicle.fairingMass,
    cdA,
    cdANoFairing: cdA * 0.55,
    omegaPlane: rotVel / R_EARTH,
    rotVel,
    targetPeriR: R_EARTH + mission.targetPeriapsis,
    targetApoR: R_EARTH + mission.targetApoapsis,
    transfer: mission.transfer,
    achievedInc,
    incAchievable: az.achievable,
    crewed: mission.crewed,
    mission,
    totalPropInitial: stages.reduce((a, s) => a + s.propInitial, 0),
  };

  const state: SimState = {
    x: R_EARTH,
    y: 0,
    vx: 0,
    vy: rotVel, // eastward (in-plane) surface motion
    mass: 0,
    stagePropRemaining: stages.map((s) => s.propInitial),
    activeStage: 0,
    t: 0,
    bodyPitch: 90 * DEG,
    autoPhase: 0,
    autopilot: true,
    manualPitch: 90 * DEG,
    manualThrottle: 1,
    throttle: 1,
    launched: false,
    fairingJettisoned: false,
    payloadDeployed: false,
    failed: false,
    failReason: null,
    succeeded: false,
    maxQ: 0,
    maxG: 0,
    overGTime: 0,
    lossGravity: 0,
    lossDrag: 0,
    lossSteer: 0,
    dvExpended: 0,
  };
  state.mass = currentMass(state, runtime);
  return { runtime, state };
}

function propellantDensity(id: string): number {
  switch (id) {
    case 'lh2lox':
      return 360;
    case 'methalox':
      return 830;
    case 'hypergolic':
      return 1200;
    default:
      return 1030; // rp1lox
  }
}

// Max-Q detection bookkeeping kept on the runtime-adjacent state via flags in SimState is
// awkward; we track transient detection with module-local memory keyed per state object.
const qPeakSeen = new WeakSet<SimState>();
const eventFlags = new WeakMap<SimState, Set<string>>();
function flagged(state: SimState, key: string): boolean {
  let s = eventFlags.get(state);
  if (!s) {
    s = new Set();
    eventFlags.set(state, s);
  }
  if (s.has(key)) return true;
  s.add(key);
  return false;
}

/**
 * Advance the simulation by `simSeconds` of model time using fixed PHYS_DT substeps.
 * Returns new events generated and fresh derived telemetry. Mutates `state` in place.
 */
export function stepFrame(
  state: SimState,
  rt: FlightRuntime,
  simSeconds: number,
): FrameResult {
  const events: EventLogEntry[] = [];
  if (!state.launched || state.failed || state.payloadDeployed) {
    return { events, derived: deriveTelemetry(state, rt) };
  }

  let remaining = simSeconds;
  let steps = 0;

  while (remaining > 1e-9 && steps < MAX_SUBSTEPS && !state.failed) {
    const dt = Math.min(PHYS_DT, remaining);
    substep(state, rt, dt, events);
    remaining -= dt;
    steps++;
  }

  // Max-Q event (once q has clearly peaked and we're supersonic-ish past it)
  const der = deriveTelemetry(state, rt);
  if (!qPeakSeen.has(state) && der.q < state.maxQ * 0.92 && state.maxQ > 8e3 && der.altitude > 6e3) {
    qPeakSeen.add(state);
    events.push({ t: state.t, label: `Max-Q (${(state.maxQ / 1000).toFixed(1)} kPa)`, kind: 'info' });
  }

  // Orbit achieved
  if (der.stable && withinTarget(der, rt) && !flaggedOrbit(state)) {
    events.push({ t: state.t, label: 'Orbital insertion confirmed — within target', kind: 'good' });
  }
  return { events, derived: der };
}

function flaggedOrbit(state: SimState): boolean {
  return flagged(state, 'orbit');
}

function substep(
  state: SimState,
  rt: FlightRuntime,
  dt: number,
  events: EventLogEntry[],
): void {
  const f = localFrame(state.x, state.y);
  const alt = f.r - R_EARTH;
  const prograde = progradePitch(state.x, state.y, state.vx, state.vy);
  const air = atmosphere(alt);
  const pFrac = pressureFraction(alt);

  // diagnostic acceleration (q, drag, gravity) at current state with zero thrust first;
  // we redo with thrust below for losses, but need q for guidance/throttle.
  const speedRel = relAirspeed(state, rt);
  const q = 0.5 * air.density * speedRel * speedRel;

  // ---- Guidance: desired pitch & throttle ------------------------------
  let desiredPitch: number;
  let cmdThrottle: number;
  let cutoff = false;
  const hasEngine = state.activeStage < rt.stages.length;
  if (state.autopilot) {
    const g = autoGuidance(state.x, state.y, state.vx, state.vy, q, state.autoPhase, {
      targetPeriR: rt.targetPeriR,
      targetApoR: rt.targetApoR,
      transfer: rt.transfer,
      hasActiveEngine: hasEngine,
      omegaPlane: rt.omegaPlane,
    });
    state.autoPhase = g.phase;
    desiredPitch = g.desiredPitch;
    cmdThrottle = g.throttle;
    cutoff = g.cutoff;
  } else {
    desiredPitch = state.manualPitch;
    cmdThrottle = state.manualThrottle;
    cutoff = state.manualThrottle <= 0.001;
  }

  // ---- Slew body toward desired pitch (turn-rate limited) --------------
  const maxStep = TURN_RATE * dt;
  let dp = desiredPitch - state.bodyPitch;
  if (dp > maxStep) dp = maxStep;
  if (dp < -maxStep) dp = -maxStep;
  state.bodyPitch += dp;

  // ---- Engine output ----------------------------------------------------
  const alpha = state.bodyPitch - prograde; // angle of attack between thrust & velocity
  let throttle = cutoff ? 0 : cmdThrottle;
  throttle = qAlphaThrottleClamp(throttle, q, alpha);

  const mass = currentMass(state, rt);
  state.mass = mass;

  let thrust = 0;
  const stage = hasEngine ? rt.stages[state.activeStage] : null;
  if (stage && throttle > 0.001 && state.stagePropRemaining[state.activeStage] > 0) {
    // clamp to engine minimum throttle
    throttle = Math.max(stage.minThrottle, Math.min(1, throttle));
    // G-load limiting throttle (autopilot): protect structure/crew by capping sensed accel.
    if (state.autopilot) {
      const gCap = (rt.crewed ? CREW_G_LIMIT * 0.9 : 3.5) * G0;
      const provisional = engineOutput(
        stage.thrustVac, stage.ispVac, stage.ispSL, stage.thrustSL, pFrac, throttle,
      ).thrust;
      if (provisional / mass > gCap) {
        const scaled = (gCap * mass) / provisional;
        throttle = Math.max(stage.minThrottle, throttle * scaled);
      }
    }
    const out = engineOutput(
      stage.thrustVac,
      stage.ispVac,
      stage.ispSL,
      stage.thrustSL,
      pFrac,
      throttle,
    );
    let consume = out.mdot * dt;
    if (consume >= state.stagePropRemaining[state.activeStage]) {
      consume = state.stagePropRemaining[state.activeStage];
    }
    state.stagePropRemaining[state.activeStage] -= consume;
    thrust = out.thrust;
  } else {
    throttle = 0;
  }
  state.throttle = throttle;
  const thrustDirX = Math.cos(state.bodyPitch) * f.fwdx + Math.sin(state.bodyPitch) * f.upx;
  const thrustDirY = Math.cos(state.bodyPitch) * f.fwdy + Math.sin(state.bodyPitch) * f.upy;
  const cdA = state.fairingJettisoned ? rt.cdANoFairing : rt.cdA;

  const params = {
    mass,
    thrust,
    thrustDirX,
    thrustDirY,
    cdA,
    omegaPlane: rt.omegaPlane,
  };

  const diag = acceleration(state.x, state.y, state.vx, state.vy, params);

  // ---- Δv loss accounting ----------------------------------------------
  const thrustAccel = mass > 0 ? thrust / mass : 0;
  state.lossGravity += gravityLoss(diag.gravMag, prograde, dt);
  state.lossDrag += dragLoss(diag.dragMag, dt);
  if (thrustAccel > 0) {
    state.lossSteer += steeringLoss(thrustAccel, alpha, dt);
    state.dvExpended += idealDv(thrustAccel, dt);
  }

  const next = rk4Step({ x: state.x, y: state.y, vx: state.vx, vy: state.vy }, params, dt);
  state.x = next.x;
  state.y = next.y;
  state.vx = next.vx;
  state.vy = next.vy;
  state.t += dt;

  // ---- G-load (sensed = non-gravitational accel) -----------------------
  const grav = gravityAccel(state.x, state.y);
  const sensedX = diag.ax - grav.ax;
  const sensedY = diag.ay - grav.ay;
  const gLoad = Math.hypot(sensedX, sensedY) / G0;
  if (gLoad > state.maxG) state.maxG = gLoad;
  if (q > state.maxQ) state.maxQ = q;

  if (rt.crewed) {
    if (gLoad > CREW_G_LIMIT) state.overGTime += dt;
    else state.overGTime = Math.max(0, state.overGTime - dt * 2);
  }

  // ---- Events: liftoff / tower clear -----------------------------------
  if (!flagged(state, 'liftoff')) events.push({ t: state.t, label: 'LIFTOFF', kind: 'good' });
  if (alt > 90 && !flagged(state, 'tower')) {
    events.push({ t: state.t, label: 'Tower clear', kind: 'info' });
  }

  // ---- Fairing jettison -------------------------------------------------
  if (!state.fairingJettisoned && alt > FAIRING_JETTISON_ALT && q < 800 && rt.fairingMass > 0) {
    state.fairingJettisoned = true;
    events.push({ t: state.t, label: 'Fairing jettison', kind: 'info' });
  }

  // ---- Staging: drop empty firing stage --------------------------------
  if (stage && state.stagePropRemaining[state.activeStage] <= 0) {
    const idx = state.activeStage;
    if (idx === 0) events.push({ t: state.t, label: 'MECO', kind: 'info' });
    state.activeStage += 1;
    if (state.activeStage < rt.stages.length) {
      events.push({
        t: state.t,
        label: `Stage ${idx + 1} separation · Stage ${idx + 2} ignition`,
        kind: 'info',
      });
    } else {
      events.push({ t: state.t, label: 'SECO — final stage depleted', kind: 'info' });
    }
  }

  // ---- SECO when autopilot cuts to orbit with prop remaining -----------
  if (cutoff && state.autoPhase >= 9 && !flagged(state, 'seco')) {
    events.push({ t: state.t, label: 'SECO — engines safe', kind: 'good' });
  }
  // ---- TLI annotation for transfer missions ----------------------------
  if (rt.transfer && rt.targetApoR > rt.targetPeriR * 3 && state.autoPhase === 3 && !flagged(state, 'tli')) {
    events.push({ t: state.t, label: 'Transfer burn underway', kind: 'info' });
  }

  // ---- Failure detection -----------------------------------------------
  if (q * Math.abs(alpha) > DEFAULT_MAX_QALPHA) {
    fail(state, events, `Max q·α exceeded — vehicle broke up (${(q * Math.abs(alpha) / 1e6).toFixed(2)} MPa·rad)`);
    return;
  }
  if (rt.crewed && state.overGTime > CREW_G_DURATION) {
    fail(state, events, `G-limit exceeded — abort triggered (${gLoad.toFixed(1)} g sustained)`);
    return;
  }
  if (f.r < R_EARTH - 1) {
    fail(state, events, 'Vehicle impacted the surface');
    return;
  }
  // Out of propellant and not in a viable orbit, falling back into atmosphere
  if (state.activeStage >= rt.stages.length) {
    const el = elementsFromState(state.x, state.y, state.vx, state.vy);
    const periAlt = el.sma * (1 - el.ecc) - R_EARTH;
    const apoAlt = el.sma > 0 ? el.sma * (1 + el.ecc) - R_EARTH : -1;
    const descending = state.x * state.vx + state.y * state.vy < 0;
    if (periAlt < KARMAN && apoAlt < rt.targetApoR - R_EARTH - 1e6 && descending && alt < 130e3) {
      const need = circularSpeed(f.r);
      const have = Math.hypot(state.vx, state.vy);
      fail(
        state,
        events,
        `Insufficient Δv — short by ${Math.max(0, need - have).toFixed(0)} m/s for orbit`,
      );
      return;
    }
  }
}

function fail(state: SimState, events: EventLogEntry[], reason: string): void {
  state.failed = true;
  state.failReason = reason;
  events.push({ t: state.t, label: reason, kind: 'bad' });
}

/** Airspeed relative to co-rotating atmosphere (for q). */
function relAirspeed(state: SimState, rt: FlightRuntime): number {
  const r = Math.hypot(state.x, state.y);
  const airVx = (-state.y / r) * rt.omegaPlane * r;
  const airVy = (state.x / r) * rt.omegaPlane * r;
  return Math.hypot(state.vx - airVx, state.vy - airVy);
}

function withinTarget(d: DerivedTelemetry, rt: FlightRuntime): boolean {
  const m = rt.mission;
  const apoOk = Math.abs(d.apoapsis - m.targetApoapsis) <= m.altTolerance;
  const periOk = Math.abs(d.periapsis - m.targetPeriapsis) <= m.altTolerance;
  const incOk = Math.abs(d.inclination - m.targetInclination) <= m.incTolerance;
  return apoOk && periOk && incOk && d.stable;
}

/** Compute the full derived telemetry block from current state. */
export function deriveTelemetry(state: SimState, rt: FlightRuntime): DerivedTelemetry {
  const r = Math.hypot(state.x, state.y);
  const alt = r - R_EARTH;
  const f = localFrame(state.x, state.y);
  const speedOrbital = Math.hypot(state.vx, state.vy);
  const vVert = state.vx * f.upx + state.vy * f.upy;
  const vHoriz = state.vx * f.fwdx + state.vy * f.fwdy;

  // surface-relative speed (subtract co-rotating atmosphere)
  const airVx = f.fwdx * rt.omegaPlane * r;
  const airVy = f.fwdy * rt.omegaPlane * r;
  const speedSurface = Math.hypot(state.vx - airVx, state.vy - airVy);

  const air = atmosphere(alt);
  const q = 0.5 * air.density * speedSurface * speedSurface;
  const el = elementsFromState(state.x, state.y, state.vx, state.vy);

  // downrange: arc length along surface from launch meridian (angle from +x axis)
  const theta = Math.atan2(state.y, state.x);
  const downrange = Math.abs(theta) * R_EARTH;

  const prograde = progradePitch(state.x, state.y, state.vx, state.vy);
  const alpha = state.bodyPitch - prograde;

  const grav = gravityAccel(state.x, state.y);
  // recompute current thrust for TWR/gLoad display
  const stage = state.activeStage < rt.stages.length ? rt.stages[state.activeStage] : null;
  const pFrac = pressureFraction(alt);
  let thrust = 0;
  if (stage && state.throttle > 0.001 && state.stagePropRemaining[state.activeStage] > 0) {
    thrust = engineOutput(
      stage.thrustVac,
      stage.ispVac,
      stage.ispSL,
      stage.thrustSL,
      pFrac,
      state.throttle,
    ).thrust;
  }
  const mass = state.mass || currentMass(state, rt);
  const thrustAccel = mass > 0 ? thrust / mass : 0;
  // sensed g ~ thrust accel + drag accel; approximate drag via q
  const speedRel = speedSurface;
  const cdA = state.fairingJettisoned ? rt.cdANoFairing : rt.cdA;
  const dragAccel = mass > 0 && speedRel > 1 ? (q * cdA) / mass : 0;
  const gLoad = Math.hypot(thrustAccel, dragAccel) / G0;

  const stable = el.sma * (1 - el.ecc) >= STABLE_PERIAPSIS;

  return {
    altitude: alt,
    r,
    speedSurface,
    speedOrbital,
    vVert,
    vHoriz,
    downrange,
    apoapsis: el.sma > 0 ? el.sma * (1 + el.ecc) - R_EARTH : Infinity,
    periapsis: el.sma * (1 - el.ecc) - R_EARTH,
    sma: el.sma,
    ecc: el.ecc,
    inclination: rt.achievedInc,
    period: el.period,
    q,
    qAlpha: q * Math.abs(alpha),
    gLoad,
    throttle: state.throttle,
    twr: thrust > 0 ? thrust / (mass * grav.g) : 0,
    thrust,
    airDensity: air.density,
    ambientPressure: air.pressure,
    flightPathAngle: prograde,
    pitchAngle: state.bodyPitch,
    machAngle: speedRel / air.speedOfSound,
    stable,
    dvRemaining: dvRemaining(state, rt),
  };
}

/** Remaining Δv across attached stages (vacuum Isp), m/s. */
export function dvRemaining(state: SimState, rt: FlightRuntime): number {
  let dv = 0;
  // mass above the current stage (payload + fairing + upper stages, fully fueled remaining)
  for (let i = state.activeStage; i < rt.stages.length; i++) {
    const s = rt.stages[i];
    let above = rt.payloadMass + (state.fairingJettisoned ? 0 : rt.fairingMass);
    for (let j = i + 1; j < rt.stages.length; j++) {
      above += rt.stages[j].dryMass + state.stagePropRemaining[j];
    }
    const prop = Math.max(0, state.stagePropRemaining[i]);
    const start = s.dryMass + prop + above;
    const end = s.dryMass + above;
    if (start > end && prop > 0) dv += s.ispVac * G0 * Math.log(start / end);
  }
  return dv;
}

/** Whether the current orbit meets the mission target (for enabling deploy). */
export function meetsTarget(d: DerivedTelemetry, rt: FlightRuntime): boolean {
  return withinTarget(d, rt);
}

/** Final mission scoring, called on deploy or failure. */
export function evaluateMission(
  state: SimState,
  d: DerivedTelemetry,
  rt: FlightRuntime,
): MissionScore {
  const m = rt.mission;
  const apoErr = Math.abs(d.apoapsis - m.targetApoapsis);
  const periErr = Math.abs(d.periapsis - m.targetPeriapsis);
  const incErr = Math.abs(d.inclination - m.targetInclination);

  const apoScore = clamp01(1 - apoErr / (m.altTolerance * 3));
  const periScore = clamp01(1 - periErr / (m.altTolerance * 3));
  const incScore = clamp01(1 - incErr / (m.incTolerance * 3));
  const accuracy = (apoScore + periScore + incScore) / 3;

  const totalLoss = state.lossGravity + state.lossDrag + state.lossSteer;
  const efficiency = clamp01(1 - totalLoss / 3000);

  const propRemaining = state.stagePropRemaining.reduce((a, p) => a + Math.max(0, p), 0);
  const propMarginPct = (propRemaining / rt.totalPropInitial) * 100;
  const marginScore = clamp01(propMarginPct / 30);

  const apoOk = apoErr <= m.altTolerance;
  const periOk = periErr <= m.altTolerance;
  const incOk = incErr <= m.incTolerance;
  const crewOk = !m.crewed || state.maxG <= CREW_G_LIMIT;
  const passed = !state.failed && d.stable && apoOk && periOk && incOk && crewOk;

  let reason: string;
  if (state.failed) reason = state.failReason ?? 'Vehicle lost';
  else if (!d.stable) reason = 'Periapsis below atmosphere — orbit will decay';
  else if (!apoOk) reason = `Apoapsis off by ${(apoErr / 1000).toFixed(0)} km`;
  else if (!periOk) reason = `Periapsis off by ${(periErr / 1000).toFixed(0)} km`;
  else if (!incOk) reason = `Inclination off by ${incErr.toFixed(1)}°`;
  else if (!crewOk) reason = `Crew exceeded ${CREW_G_LIMIT} g`;
  else reason = 'Target orbit achieved — payload delivered';

  const total = passed
    ? Math.round(1000 * (0.55 * accuracy + 0.3 * efficiency + 0.15 * marginScore))
    : Math.round(300 * accuracy);

  return {
    passed,
    reason,
    total,
    accuracy,
    efficiency,
    margin: marginScore,
    apoapsis: d.apoapsis,
    periapsis: d.periapsis,
    inclination: d.inclination,
    maxQ: state.maxQ,
    maxG: state.maxG,
    propMarginPct,
    met: state.t,
    lossGravity: state.lossGravity,
    lossDrag: state.lossDrag,
    lossSteer: state.lossSteer,
  };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
