// Physical constants (SI). Single source of truth — never duplicate these numbers.

export const G0 = 9.80665; // standard gravity, m/s^2 (for Isp -> exhaust velocity)
export const MU_EARTH = 3.986004418e14; // Earth gravitational parameter, m^3/s^2
export const R_EARTH = 6.371e6; // mean Earth radius, m
export const RHO0 = 1.225; // sea-level air density, kg/m^3
export const OMEGA_EARTH = 7.2921159e-5; // Earth sidereal rotation rate, rad/s
export const P0 = 101325; // sea-level pressure, Pa
export const T0 = 288.15; // sea-level temperature, K

// Simulation timing
export const PHYS_DT = 1 / 240; // fixed integrator timestep, s (240 Hz)
export const MAX_SUBSTEPS = 4000; // cap substeps per render frame to avoid spirals

// Orbit / mission thresholds
export const KARMAN = 100e3; // 100 km — "space" boundary
export const STABLE_PERIAPSIS = R_EARTH + KARMAN; // periapsis above this => non-decaying
export const FAIRING_JETTISON_ALT = 110e3; // jettison fairing above ~110 km (q ~ 0)
export const ATMOSPHERE_TOP = 140e3; // above this, drag is negligible

// Structural / crew limits
export const DEFAULT_MAX_QALPHA = 4.0e6; // Pa·rad — gross q·alpha structural failure threshold
export const DEFAULT_QALPHA_SOFT = 1.2e6; // throttle-bucket target ceiling
export const CREW_G_LIMIT = 4.5; // sustained g-load that fails a crewed mission
export const CREW_G_DURATION = 3.0; // s of sustained over-limit before abort

// Distances of interest
export const MOON_DISTANCE = 384.4e6; // m, mean Earth-Moon distance (TLI target apoapsis)

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;
