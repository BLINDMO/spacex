import type { VehicleDesign, StageDesign } from '../sim/types';
import { ENGINES } from './engines';

// ── Parts schema ──────────────────────────────────────────────────────────────
// A rocket is an ordered array of PartInstance, BOTTOM (index 0) → TOP. Engines begin a
// stage; tanks/structure above an engine feed that stage until the next engine. Payload &
// fairing parts contribute to those totals. buildDesign() collapses the parts into the
// existing VehicleDesign the physics engine already understands.

export type PartCat = 'engine' | 'tank' | 'structural' | 'fairing' | 'payload';

export interface PartDef {
  id: string;
  name: string;
  cat: PartCat;
  blurb: string;
  mass: number; // dry mass, kg (engines handled via engineId in the sim)
  propMass?: number; // tank propellant at scale 1, kg
  engineId?: string; // maps to ENGINES catalog
  maxEngines?: number;
  scalable?: boolean; // tanks stretch 0.5–2.0×
  jettison?: boolean; // fairing
  crew?: boolean;
  // visual proportions (diameter units; height at scale 1)
  w: number;
  h: number;
  color: string;
  flame?: string;
}

export interface PartInstance {
  uid: string;
  defId: string;
  engines?: number; // engine clustering
  scale?: number; // tank stretch
}

export const PARTS: Record<string, PartDef> = {
  // engines
  merlin9: { id: 'merlin9', name: 'Merlin Cluster', cat: 'engine', engineId: 'merlin1d', maxEngines: 9,
    blurb: 'RP-1/LOX. Throttleable 40–100%. Classic 9-engine booster.', mass: 0, w: 1.0, h: 0.5, color: '#c8ccd2', flame: '#ffb066' },
  raptor: { id: 'raptor', name: 'Raptor (methalox)', cat: 'engine', engineId: 'raptor2', maxEngines: 3,
    blurb: 'CH4/LOX. High thrust, blue flame.', mass: 0, w: 1.0, h: 0.5, color: '#c8ccd2', flame: '#8fd0ff' },
  mvac: { id: 'mvac', name: 'Vacuum Engine', cat: 'engine', engineId: 'mvac', maxEngines: 1,
    blurb: 'Big bell nozzle tuned for vacuum. Best as an upper stage.', mass: 0, w: 0.8, h: 0.6, color: '#c8ccd2', flame: '#ffd9a0' },
  srb: { id: 'srb', name: 'Solid Booster', cat: 'engine', engineId: 'srb', maxEngines: 2,
    blurb: 'Huge thrust, no throttle, cannot shut down. Light it and hold on.', mass: 0, w: 1.1, h: 0.55, color: '#d8d2c2', flame: '#ffcf6b' },

  // tanks
  tankS: { id: 'tankS', name: 'Small Tank', cat: 'tank', propMass: 20000, scalable: true,
    blurb: '20 t propellant. Good for upper stages.', mass: 900, w: 1.0, h: 0.7, color: '#e6e8ec' },
  tankM: { id: 'tankM', name: 'Medium Tank', cat: 'tank', propMass: 90000, scalable: true,
    blurb: '90 t propellant.', mass: 3600, w: 1.0, h: 1.4, color: '#e6e8ec' },
  tankL: { id: 'tankL', name: 'Large Tank', cat: 'tank', propMass: 200000, scalable: true,
    blurb: '200 t propellant. Core booster tankage.', mass: 8000, w: 1.0, h: 2.4, color: '#e6e8ec' },

  // structural
  interstage: { id: 'interstage', name: 'Interstage', cat: 'structural', mass: 1500,
    blurb: 'Tapered adapter joining stages.', w: 0.9, h: 0.3, color: '#d6b25a' },

  // fairing
  fairing: { id: 'fairing', name: 'Payload Fairing', cat: 'fairing', jettison: true, mass: 1900,
    blurb: 'Clamshell shroud; jettisoned above the atmosphere.', w: 0.95, h: 0.9, color: '#eef0f3' },

  // payloads
  satellite: { id: 'satellite', name: 'Smallsat', cat: 'payload', mass: 4000,
    blurb: 'Communications/observation satellite with solar wings.', w: 0.6, h: 0.5, color: '#caa23a' },
  comsat: { id: 'comsat', name: 'Comsat (heavy)', cat: 'payload', mass: 6000,
    blurb: 'Large geostationary communications satellite.', w: 0.65, h: 0.6, color: '#caa23a' },
  capsule: { id: 'capsule', name: 'Crew Capsule', cat: 'payload', crew: true, mass: 12500,
    blurb: 'Crewed capsule. Keep sustained G under 4.5.', w: 0.85, h: 0.6, color: '#aab4bd' },
  telescope: { id: 'telescope', name: 'Space Telescope', cat: 'payload', mass: 6000,
    blurb: 'Observatory with a mirror dish.', w: 0.7, h: 0.7, color: '#9fb0bd' },
};

export const PART_LIST = Object.values(PARTS);

let uidc = 0;
export function mkInstance(defId: string): PartInstance {
  const def = PARTS[defId];
  return {
    uid: `p${Date.now()}_${uidc++}`,
    defId,
    engines: def.cat === 'engine' ? Math.min(def.maxEngines ?? 1, def.id === 'merlin9' ? 9 : 1) : undefined,
    scale: def.scalable ? 1 : undefined,
  };
}

/** Collapse a parts stack (bottom→top) into a VehicleDesign for the physics engine. */
export function buildDesign(rocket: PartInstance[]): VehicleDesign {
  const stages: StageDesign[] = [];
  let payloadMass = 0;
  let fairingMass = 0;
  let cur: StageDesign | null = null;

  for (const inst of rocket) {
    const def = PARTS[inst.defId];
    if (!def) continue;
    if (def.cat === 'engine') {
      cur = {
        id: inst.uid,
        name: `Stage ${stages.length + 1}`,
        engineId: def.engineId!,
        engineCount: inst.engines ?? 1,
        propMass: 0,
        dryMass: 0,
      };
      stages.push(cur);
    } else if (def.cat === 'tank') {
      const scale = inst.scale ?? 1;
      const prop = (def.propMass ?? 0) * scale;
      if (cur) {
        cur.propMass += prop;
        cur.dryMass += def.mass * scale + prop * 0.045; // tank structural mass
      }
    } else if (def.cat === 'structural') {
      if (cur) cur.dryMass += def.mass;
    } else if (def.cat === 'fairing') {
      fairingMass += def.mass;
    } else if (def.cat === 'payload') {
      payloadMass += def.mass;
    }
  }

  return { id: 'custom', name: 'Custom Vehicle', stages, payloadMass, fairingMass };
}

export function hasCrew(rocket: PartInstance[]): boolean {
  return rocket.some((i) => PARTS[i.defId]?.crew);
}

// Starter rockets (parts, bottom→top) the player can load and modify.
export const PRESET_ROCKETS: Record<string, PartInstance[]> = {
  vanguard: ['merlin9', 'tankL', 'tankM', 'interstage', 'mvac', 'tankM', 'fairing', 'satellite'].map(mkInstance),
  heavy: ['srb', 'tankL', 'tankL', 'interstage', 'mvac', 'tankM', 'fairing', 'comsat'].map(mkInstance),
};
