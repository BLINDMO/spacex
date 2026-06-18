// Shared simulation, vehicle and mission types.

export type PropellantId = 'rp1lox' | 'methalox' | 'lh2lox' | 'hypergolic';

export interface Propellant {
  id: PropellantId;
  name: string;
  /** bulk density of the propellant mixture, kg/m^3 (affects tank/structure mass) */
  bulkDensity: number;
  /** structural mass fraction penalty: kg of dry tank per kg propellant (rough) */
  tankFactor: number;
  color: string;
}

export interface Engine {
  id: string;
  name: string;
  propellant: PropellantId;
  /** vacuum thrust per engine, N */
  thrustVac: number;
  /** sea-level thrust per engine, N (0 if vacuum-only / would not be operated at SL) */
  thrustSL: number;
  /** specific impulse at sea level, s (0 if vacuum-only engine) */
  ispSL: number;
  /** specific impulse in vacuum, s */
  ispVac: number;
  /** minimum throttle fraction (0..1) */
  minThrottle: number;
  /** dry mass of one engine, kg */
  mass: number;
  /** can this engine be lit/operated at sea level? */
  seaLevelCapable: boolean;
}

/** A stage as configured in the VAB (design-time). */
export interface StageDesign {
  id: string;
  name: string;
  engineId: string;
  engineCount: number;
  /** loaded propellant mass, kg */
  propMass: number;
  /** structural/dry mass excluding engines, kg */
  dryMass: number;
}

export interface VehicleDesign {
  id: string;
  name: string;
  /** ordered bottom (fires first) -> top */
  stages: StageDesign[];
  /** payload (satellite/crew) mass carried to orbit, kg */
  payloadMass: number;
  /** fairing mass, kg (jettisoned in flight) */
  fairingMass: number;
}

export interface LaunchSite {
  id: string;
  name: string;
  latitude: number; // degrees
  longitude: number; // degrees (informational)
  /** default launch azimuth in degrees from north (90 = due east) */
  defaultAzimuth: number;
  blurb: string;
}

export type MissionId =
  | 'tutorial'
  | 'leo'
  | 'iss'
  | 'sso'
  | 'gto'
  | 'crew'
  | 'lunar';

export interface Mission {
  id: MissionId;
  name: string;
  summary: string;
  /** target periapsis altitude above surface, m */
  targetPeriapsis: number;
  /** target apoapsis altitude above surface, m */
  targetApoapsis: number;
  /** target inclination, degrees */
  targetInclination: number;
  /** tolerances */
  altTolerance: number; // m on both apo & peri
  incTolerance: number; // deg
  payloadMass: number; // kg required to orbit
  crewed: boolean;
  recommendedSite: string;
  recommendedVehicle: string;
  /** minimum total dv that the VAB should warn below, m/s (advisory) */
  advisoryDv: number;
  /** does this mission require a second apoapsis-raising burn (GTO/Lunar)? */
  transfer: boolean;
  tutorial?: boolean;
}

/** Live physical state integrated by the simulator (2D ECI polar-ish, cartesian internally). */
export interface SimState {
  // Cartesian ECI position & velocity in the 2D orbital plane (m, m/s)
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number; // current total vehicle mass, kg
  // per-stage remaining propellant, kg (index aligns with active stack)
  stagePropRemaining: number[];
  activeStage: number; // index into the (current) stack; -1 = no powered stage
  t: number; // mission elapsed time, s (negative before launch)
  /** actual body pitch above local horizontal, rad (slewed toward commanded at turn-rate limit) */
  bodyPitch: number;
  /** autopilot internal phase: 0 vertical,1 pitchover,2 gravity turn,3 insertion burn,4 coast,5 circularize,6 done */
  autoPhase: number;
  /** is autopilot engaged (vs manual stick) */
  autopilot: boolean;
  /** manual commanded pitch above horizontal, rad, and throttle 0..1 */
  manualPitch: number;
  manualThrottle: number;
  /** last commanded throttle actually applied, 0..1 */
  throttle: number;
  // flags
  launched: boolean;
  fairingJettisoned: boolean;
  payloadDeployed: boolean;
  failed: boolean;
  failReason: string | null;
  succeeded: boolean;
  // bookkeeping
  maxQ: number;
  maxG: number;
  overGTime: number; // accumulated time over crew g-limit
  // dv loss accounting, m/s
  lossGravity: number;
  lossDrag: number;
  lossSteer: number;
  dvExpended: number; // total dv produced by engines so far
}

export interface DerivedTelemetry {
  altitude: number; // above surface, m
  r: number; // radius from center, m
  speedSurface: number; // relative to rotating surface, m/s
  speedOrbital: number; // inertial, m/s
  vVert: number; // radial component, m/s
  vHoriz: number; // tangential (inertial), m/s
  downrange: number; // along-surface distance from launch, m
  apoapsis: number; // altitude, m
  periapsis: number; // altitude, m
  sma: number; // semi-major axis, m
  ecc: number;
  inclination: number; // deg (derived from launch azimuth + plane)
  period: number; // s (NaN if not elliptical)
  q: number; // dynamic pressure, Pa
  qAlpha: number; // q * angle of attack, Pa·rad
  gLoad: number; // sensed g (thrust+drag accel / g0)
  throttle: number; // 0..1
  twr: number;
  thrust: number; // N
  airDensity: number;
  ambientPressure: number; // Pa
  flightPathAngle: number; // rad, velocity vector angle above local horizontal
  pitchAngle: number; // rad, commanded body pitch above local horizontal
  machAngle: number;
  stable: boolean; // periapsis above stable threshold
  dvRemaining: number; // m/s remaining across stack
}

export type GameMode = 'select' | 'vab' | 'prelaunch' | 'flight' | 'summary';

export type CameraMode = 'follow' | 'pad' | 'orbit';

export type TimeWarp = 0 | 1 | 5 | 20 | 100;

export interface EventLogEntry {
  t: number;
  label: string;
  kind: 'info' | 'good' | 'warn' | 'bad';
}

export interface MissionScore {
  passed: boolean;
  reason: string;
  total: number; // 0..1000
  accuracy: number;
  efficiency: number;
  margin: number;
  apoapsis: number;
  periapsis: number;
  inclination: number;
  maxQ: number;
  maxG: number;
  propMarginPct: number;
  met: number;
  lossGravity: number;
  lossDrag: number;
  lossSteer: number;
}
