// Headless verification: fly each preset on its intended mission with the autopilot and
// report the achieved orbit + Δv budget. Run with `npm run simtest`.
import { initFlight, stepFrame, deriveTelemetry, evaluateMission } from './loop';
import { MISSIONS } from '../data/missions';
import { VEHICLES } from '../data/vehicles';
import { SITES } from '../data/sites';
import { computeVehicleStats } from './vehicle';
import type { MissionId } from './types';

interface Case {
  mission: MissionId;
  vehicle: string;
  site: string;
}

const CASES: Case[] = [
  { mission: 'tutorial', vehicle: 'vanguard9', site: 'lc39a' },
  { mission: 'leo', vehicle: 'vanguard9', site: 'lc39a' },
  { mission: 'iss', vehicle: 'vanguard9', site: 'lc39a' },
  { mission: 'sso', vehicle: 'aether', site: 'vandenberg' },
  { mission: 'gto', vehicle: 'cometgto', site: 'kourou' },
  { mission: 'crew', vehicle: 'vanguard9', site: 'lc39a' },
  { mission: 'lunar', vehicle: 'olympus', site: 'lc39a' },
];

function fmt(n: number, d = 1): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: d });
}

let pass = 0;
for (const c of CASES) {
  const mission = MISSIONS[c.mission];
  const vehicle = VEHICLES[c.vehicle];
  const site = SITES[c.site];
  const stats = computeVehicleStats(vehicle);
  const { runtime, state } = initFlight(vehicle, mission, site);
  state.launched = true;

  // Fly up to 60 minutes of model time at the fixed step, in 0.1 s frames.
  const dt = 0.1;
  let t = 0;
  const maxT = 60 * 60;
  while (t < maxT && !state.failed && !state.payloadDeployed) {
    stepFrame(state, runtime, dt);
    t += dt;
    const d = deriveTelemetry(state, runtime);
    // auto-deploy once a within-target stable orbit is reached and engines are idle
    if (d.stable && state.autoPhase >= 9 && state.throttle === 0) {
      // small settle, then deploy
      if (Math.abs(d.apoapsis - mission.targetApoapsis) <= mission.altTolerance &&
          Math.abs(d.periapsis - mission.targetPeriapsis) <= mission.altTolerance) {
        state.payloadDeployed = true;
      }
    }
    // safety: stop if clearly done burning and coasting in a high transfer
    if (runtime.transfer && state.autoPhase >= 9 && d.stable && d.apoapsis >= mission.targetApoapsis - mission.altTolerance) {
      state.payloadDeployed = true;
    }
  }

  const d = deriveTelemetry(state, runtime);
  const score = evaluateMission(state, d, runtime);
  const ok = score.passed;
  if (ok) pass++;
  console.log(
    `\n=== ${mission.name} | ${vehicle.name} @ ${site.name} ===\n` +
      `  vehicle: totalMass=${fmt(stats.totalMass / 1000)} t  dvVac=${fmt(stats.totalDvVac)} m/s  liftoffTWR=${fmt(stats.liftoffTWR, 2)}\n` +
      `  result : ${ok ? 'PASS' : 'FAIL'} — ${score.reason}\n` +
      `  orbit  : apo=${fmt(d.apoapsis / 1000)} km (tgt ${fmt(mission.targetApoapsis / 1000)})  peri=${fmt(d.periapsis / 1000)} km (tgt ${fmt(mission.targetPeriapsis / 1000)})  inc=${fmt(d.inclination)}°\n` +
      `  budget : expended=${fmt(state.dvExpended)}  grav=${fmt(state.lossGravity)}  drag=${fmt(state.lossDrag)}  steer=${fmt(state.lossSteer)}  m/s\n` +
      `  perf   : maxQ=${fmt(state.maxQ / 1000)} kPa  maxG=${fmt(state.maxG, 2)}  propMargin=${fmt(score.propMarginPct)}%  MET=${fmt(state.t)} s  score=${score.total}`,
  );
}

console.log(`\n${pass}/${CASES.length} missions passed.`);
