import { P0, T0, RHO0 } from './constants';

// Layered International Standard Atmosphere (ISA) up to ~86 km, exponential tail above.
// Each layer: base geopotential altitude (m), base temperature (K), lapse rate (K/m),
// base pressure (Pa). Computed bottom-up so pressures are continuous.

interface Layer {
  h0: number; // base altitude, m
  T0: number; // base temperature, K
  L: number; // lapse rate, K/m
  P0: number; // base pressure, Pa (filled in below)
}

const R_AIR = 287.05; // specific gas constant for air, J/(kg·K)
const G = 9.80665;

// Standard atmosphere layers (lapse rates per ISA)
const RAW: Omit<Layer, 'P0'>[] = [
  { h0: 0, T0: 288.15, L: -0.0065 }, // troposphere
  { h0: 11000, T0: 216.65, L: 0.0 }, // tropopause
  { h0: 20000, T0: 216.65, L: 0.001 }, // stratosphere 1
  { h0: 32000, T0: 228.65, L: 0.0028 }, // stratosphere 2
  { h0: 47000, T0: 270.65, L: 0.0 }, // stratopause
  { h0: 51000, T0: 270.65, L: -0.0028 }, // mesosphere 1
  { h0: 71000, T0: 214.65, L: -0.002 }, // mesosphere 2
  { h0: 84852, T0: 186.946, L: 0.0 }, // ~mesopause
];

const LAYERS: Layer[] = (() => {
  const out: Layer[] = [];
  let P = P0;
  for (let i = 0; i < RAW.length; i++) {
    const l = RAW[i];
    out.push({ ...l, P0: P });
    // pressure at top of this layer becomes base pressure of next
    const next = RAW[i + 1];
    if (!next) break;
    const dh = next.h0 - l.h0;
    if (l.L === 0) {
      P = P * Math.exp((-G * dh) / (R_AIR * l.T0));
    } else {
      const Ttop = l.T0 + l.L * dh;
      P = P * Math.pow(Ttop / l.T0, -G / (R_AIR * l.L));
    }
  }
  return out;
})();

const TOP = LAYERS[LAYERS.length - 1];
const TOP_ALT = 84852;
// Scale height for the exponential tail above the modeled layers
const TAIL_H = (R_AIR * TOP.T0) / G;

export interface AirProps {
  density: number; // kg/m^3
  pressure: number; // Pa
  temperature: number; // K
  speedOfSound: number; // m/s
}

export function atmosphere(altitude: number): AirProps {
  if (altitude <= 0) {
    return { density: RHO0, pressure: P0, temperature: T0, speedOfSound: soundSpeed(T0) };
  }
  if (altitude > TOP_ALT) {
    // Above the modeled layers: exponential pressure/density tail, fixed T.
    const T = TOP.T0;
    // base pressure at TOP_ALT:
    const Ptop = layerPressure(TOP, TOP_ALT);
    const P = Ptop * Math.exp(-(altitude - TOP_ALT) / TAIL_H);
    const rho = P / (R_AIR * T);
    return { density: rho, pressure: P, temperature: T, speedOfSound: soundSpeed(T) };
  }
  // Find the layer containing this altitude
  let layer = LAYERS[0];
  for (let i = 0; i < LAYERS.length; i++) {
    if (altitude >= LAYERS[i].h0) layer = LAYERS[i];
    else break;
  }
  const T = layer.T0 + layer.L * (altitude - layer.h0);
  const P = layerPressure(layer, altitude);
  const rho = P / (R_AIR * T);
  return { density: rho, pressure: P, temperature: T, speedOfSound: soundSpeed(T) };
}

function layerPressure(layer: Layer, altitude: number): number {
  const dh = altitude - layer.h0;
  if (layer.L === 0) {
    return layer.P0 * Math.exp((-G * dh) / (R_AIR * layer.T0));
  }
  const T = layer.T0 + layer.L * dh;
  return layer.P0 * Math.pow(T / layer.T0, -G / (R_AIR * layer.L));
}

function soundSpeed(T: number): number {
  const gamma = 1.4;
  return Math.sqrt(gamma * R_AIR * T);
}

/** Dynamic pressure q = 1/2 ρ v^2 (Pa). */
export function dynamicPressure(density: number, speed: number): number {
  return 0.5 * density * speed * speed;
}

/** Fraction 0..1 of "how sea-level" the ambient pressure is, for Isp interpolation. */
export function pressureFraction(altitude: number): number {
  return Math.min(1, Math.max(0, atmosphere(altitude).pressure / P0));
}
