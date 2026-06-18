import type { Propellant, PropellantId } from '../sim/types';

// Approximate bulk densities of the propellant *mixture* (oxidizer + fuel at flight ratios).
// tankFactor is a rough dry-tank mass per kg of propellant — lower-density props need bigger,
// heavier tanks, so LH2 is penalized vs dense RP-1.
export const PROPELLANTS: Record<PropellantId, Propellant> = {
  rp1lox: {
    id: 'rp1lox',
    name: 'RP-1 / LOX',
    bulkDensity: 1030,
    tankFactor: 0.045,
    color: '#9aa7b0',
  },
  methalox: {
    id: 'methalox',
    name: 'CH4 / LOX (methalox)',
    bulkDensity: 830,
    tankFactor: 0.055,
    color: '#7fd0e0',
  },
  lh2lox: {
    id: 'lh2lox',
    name: 'LH2 / LOX',
    bulkDensity: 360,
    tankFactor: 0.11,
    color: '#cfe3ff',
  },
  hypergolic: {
    id: 'hypergolic',
    name: 'MMH / NTO (hypergolic)',
    bulkDensity: 1200,
    tankFactor: 0.05,
    color: '#d8b06a',
  },
};
