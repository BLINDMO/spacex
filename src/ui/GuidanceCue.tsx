import { useSimStore, selectCanDeploy } from '../store/useSimStore';

interface Cue {
  phase: string;
  hint: string;
  tone: 'info' | 'go' | 'amber' | 'nogo';
}

/** Coached flight director cue — always tells the player what's happening and what to do
 *  next (auto or manual), so flying feels guided rather than guesswork. */
export default function GuidanceCue() {
  const sim = useSimStore((s) => s.sim);
  const d = useSimStore((s) => s.derived);
  const rt = useSimStore((s) => s.runtime);
  const canDeploy = useSimStore(selectCanDeploy);
  if (!sim || !d || !rt) return null;

  const cue = computeCue();
  const color =
    cue.tone === 'go' ? 'text-go border-go/50 bg-go/10'
    : cue.tone === 'amber' ? 'text-amber border-amber/50 bg-amber/10'
    : cue.tone === 'nogo' ? 'text-nogo border-nogo/50 bg-nogo/10'
    : 'text-accent border-accent/40 bg-accent/5';

  return (
    <div className={`mx-2 mt-2 flex items-center gap-2.5 rounded-[3px] border px-3 py-1.5 ${color} pointer-events-none`}>
      <span className="text-[8px] leading-tight tracking-[0.15em] opacity-70 shrink-0 w-10">FLIGHT DIR</span>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-medium leading-tight truncate">{cue.phase}</div>
        <div className="text-[10px] text-dim leading-tight truncate">{cue.hint}</div>
      </div>
    </div>
  );

  function computeCue(): Cue {
    if (sim!.failed) return { phase: 'VEHICLE LOST', hint: sim!.failReason ?? '', tone: 'nogo' };
    if (sim!.payloadDeployed) return { phase: 'PAYLOAD DEPLOYED', hint: 'Mission complete', tone: 'go' };
    if (canDeploy) return { phase: 'TARGET ORBIT REACHED', hint: 'Tap DEPLOY to release payload', tone: 'go' };

    const alt = d!.altitude;
    const manual = !sim!.autopilot;
    const qHot = d!.q > 35e3;

    // crew warning takes priority
    if (rt!.crewed && d!.gLoad > 4) return { phase: 'HIGH G-LOAD', hint: 'Ease throttle to protect crew', tone: 'amber' };

    if (manual) {
      if (alt < 1000) return { phase: 'LIFTOFF', hint: 'Full throttle, hold pitch near 90°', tone: 'info' };
      if (qHot) return { phase: 'MAX-Q', hint: 'Ease throttle ~70% through max-Q', tone: 'amber' };
      if (alt < 70e3) return { phase: 'GRAVITY TURN', hint: 'Pitch down slowly toward 45°', tone: 'info' };
      if (d!.apoapsis < rt!.mission.targetApoapsis - rt!.mission.altTolerance)
        return { phase: 'BUILD APOAPSIS', hint: `Pitch ~10–20°, raise apoapsis to ${Math.round(rt!.mission.targetApoapsis / 1000)} km`, tone: 'info' };
      if (d!.periapsis < rt!.mission.targetPeriapsis - rt!.mission.altTolerance)
        return { phase: 'CIRCULARIZE', hint: 'Pitch ~0° (prograde), burn to raise periapsis', tone: 'info' };
      return { phase: 'TRIM ORBIT', hint: 'Fine-tune to target, then DEPLOY', tone: 'info' };
    }

    // autopilot phase narration
    switch (sim!.autoPhase) {
      case 0: return { phase: 'LIFTOFF', hint: 'Vertical climb — clearing the tower', tone: 'info' };
      case 1: return { phase: 'PITCH-OVER', hint: 'Starting the gravity turn', tone: 'info' };
      case 2: return { phase: 'GRAVITY TURN', hint: qHot ? 'Throttling through Max-Q' : 'Ascending downrange', tone: qHot ? 'amber' : 'info' };
      case 3: return { phase: 'TRANSFER BURN', hint: 'Raising apoapsis toward target', tone: 'info' };
      case 5: return { phase: 'COAST', hint: 'Engines idle — coasting to apoapsis', tone: 'info' };
      case 6: return { phase: 'CIRCULARIZING', hint: 'Burning to raise periapsis', tone: 'info' };
      case 7: return { phase: 'ORBIT INSERTION', hint: 'Building orbital velocity', tone: 'info' };
      case 9: return { phase: 'ENGINES SAFE', hint: d!.stable ? 'In orbit — ready to deploy' : 'Coasting', tone: d!.stable ? 'go' : 'info' };
      default: return { phase: 'FLIGHT', hint: 'Autopilot flying', tone: 'info' };
    }
  }
}
