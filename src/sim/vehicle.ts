import type { VehicleDesign, StageDesign } from './types';
import { ENGINES } from '../data/engines';
import { G0, MU_EARTH, R_EARTH } from './constants';

export interface StageStats {
  index: number;
  name: string;
  engineName: string;
  engineCount: number;
  propMass: number;
  /** dry mass including engines, kg */
  dryMass: number;
  /** mass of everything this stage must accelerate (this stage + everything above), kg */
  startMass: number;
  endMass: number;
  /** ideal dv this stage delivers (vacuum Isp), m/s */
  dvVac: number;
  /** thrust at full throttle (vacuum), N */
  thrustVac: number;
  thrustSL: number;
  ispVac: number;
  ispSL: number;
  burnTime: number; // s at full throttle
  twrSeaLevel: number; // at ignition, using sea-level thrust & local g (stage 0 only meaningful)
}

export interface VehicleStats {
  stages: StageStats[];
  totalMass: number; // fully fueled incl payload + fairing, kg
  totalDvVac: number; // sum of stage dv (vacuum), m/s
  liftoffTWR: number; // sea-level thrust / weight at pad
  payloadMass: number;
  fairingMass: number;
}

/** Dry mass of a stage including its engines. */
export function stageDryMass(s: StageDesign): number {
  const eng = ENGINES[s.engineId];
  return s.dryMass + eng.mass * s.engineCount;
}

export function stageWetMass(s: StageDesign): number {
  return stageDryMass(s) + s.propMass;
}

/**
 * Compute full vehicle statistics. Stages fire bottom (index 0) first; while a stage burns
 * it must lift its own mass plus the mass of all stages above plus payload + fairing.
 */
export function computeVehicleStats(v: VehicleDesign, gLocal = MU_EARTH / (R_EARTH * R_EARTH)): VehicleStats {
  const n = v.stages.length;
  // mass above stage i (everything that stays attached after stage i drops), per stage
  const stages: StageStats[] = [];
  let totalDv = 0;

  // mass carried above each stage = payload + fairing + stages above
  const massAbove: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let m = v.payloadMass + v.fairingMass;
    for (let j = i + 1; j < n; j++) m += stageWetMass(v.stages[j]);
    massAbove[i] = m;
  }

  for (let i = 0; i < n; i++) {
    const s = v.stages[i];
    const eng = ENGINES[s.engineId];
    const dry = stageDryMass(s);
    const startMass = dry + s.propMass + massAbove[i];
    const endMass = dry + massAbove[i];
    const dv = eng.ispVac * G0 * Math.log(startMass / endMass);
    const thrustVac = eng.thrustVac * s.engineCount;
    const thrustSL = eng.thrustSL * s.engineCount;
    const mdot = thrustVac / (eng.ispVac * G0); // full-throttle mass flow
    const burnTime = s.propMass / mdot;
    stages.push({
      index: i,
      name: s.name,
      engineName: eng.name,
      engineCount: s.engineCount,
      propMass: s.propMass,
      dryMass: dry,
      startMass,
      endMass,
      dvVac: dv,
      thrustVac,
      thrustSL,
      ispVac: eng.ispVac,
      ispSL: eng.ispSL,
      burnTime,
      twrSeaLevel: thrustSL / (startMass * gLocal),
    });
    totalDv += dv;
  }

  const totalMass = stages[0]?.startMass ?? v.payloadMass + v.fairingMass;
  const liftoffThrust = stages[0]?.thrustSL ?? 0;
  return {
    stages,
    totalMass,
    totalDvVac: totalDv,
    liftoffTWR: liftoffThrust / (totalMass * gLocal),
    payloadMass: v.payloadMass,
    fairingMass: v.fairingMass,
  };
}
