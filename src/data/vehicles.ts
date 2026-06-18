import type { VehicleDesign } from '../sim/types';

// Preset launch vehicles built from the real engine catalog. Masses in kg.
// dryMass is structure EXCLUDING engines — engine mass is added from the catalog
// in sim/vehicle.ts so engine count changes mass consistently.

function clone(v: VehicleDesign): VehicleDesign {
  return JSON.parse(JSON.stringify(v));
}

const vanguard9: VehicleDesign = {
  id: 'vanguard9',
  name: 'Vanguard-9 (RP-1 two-stage)',
  payloadMass: 9000,
  fairingMass: 1900,
  stages: [
    {
      id: 's1',
      name: 'Booster',
      engineId: 'merlin1d',
      engineCount: 9,
      propMass: 418000,
      dryMass: 20000,
    },
    {
      id: 's2',
      name: 'Upper',
      engineId: 'mvac',
      engineCount: 1,
      propMass: 113000,
      dryMass: 3900,
    },
  ],
};

const aether: VehicleDesign = {
  id: 'aether',
  name: 'Aether-M (methalox two-stage)',
  payloadMass: 1800,
  fairingMass: 1200,
  stages: [
    {
      id: 's1',
      name: 'Booster',
      engineId: 'raptor2',
      engineCount: 3,
      propMass: 360000,
      dryMass: 19000,
    },
    {
      id: 's2',
      name: 'Upper',
      engineId: 'raptor2',
      engineCount: 1,
      propMass: 92000,
      dryMass: 6000,
    },
  ],
};

const cometgto: VehicleDesign = {
  id: 'cometgto',
  name: 'Comet-GTO (RP-1 two-stage, GTO-optimized)',
  payloadMass: 4500,
  fairingMass: 1700,
  stages: [
    {
      id: 's1',
      name: 'Booster',
      engineId: 'merlin1d',
      engineCount: 9,
      propMass: 418000,
      dryMass: 20000,
    },
    {
      id: 's2',
      name: 'Upper',
      engineId: 'mvac',
      engineCount: 1,
      propMass: 132000,
      dryMass: 4300,
    },
  ],
};

const olympus: VehicleDesign = {
  id: 'olympus',
  name: 'Olympus-V (Saturn-class heavy)',
  payloadMass: 26000,
  fairingMass: 4000,
  stages: [
    {
      id: 's1',
      name: 'S-IC Booster',
      engineId: 'f1',
      engineCount: 5,
      propMass: 2077000,
      dryMass: 130000,
    },
    {
      id: 's2',
      name: 'S-II',
      engineId: 'j2',
      engineCount: 5,
      propMass: 451000,
      dryMass: 36000,
    },
    {
      id: 's3',
      name: 'S-IVB',
      engineId: 'j2',
      engineCount: 1,
      propMass: 109000,
      dryMass: 11000,
    },
  ],
};

export const VEHICLES: Record<string, VehicleDesign> = {
  vanguard9,
  aether,
  cometgto,
  olympus,
};

export const VEHICLE_LIST = Object.values(VEHICLES);

/** Deep copy a preset so the VAB can mutate it without touching the catalog. */
export function loadVehicle(id: string): VehicleDesign {
  return clone(VEHICLES[id] ?? vanguard9);
}
