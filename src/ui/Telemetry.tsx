import { useSimStore } from '../store/useSimStore';
import { dist, speed, deg, num, pct, clock, pressure, dv } from './format';

/** Dense telemetry block read entirely from derived + sim. */
export default function Telemetry() {
  const derived = useSimStore((s) => s.derived);
  const sim = useSimStore((s) => s.sim);

  return (
    <div className="flex h-full flex-col bg-panel border border-edge">
      <div className="flex items-center justify-between border-b border-edge px-2 py-1">
        <span className="text-[10px] tracking-[0.2em] text-dim">TELEMETRY</span>
        <span className="tnum text-[10px] text-accent">{sim ? clock(sim.t) : 'T-00:00:00'}</span>
      </div>

      {!derived || !sim ? (
        <div className="flex flex-1 items-center justify-center py-8 text-[11px] tracking-[0.2em] text-dim">
          AWAITING TELEMETRY
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-0">
          <Row label="ALTITUDE" value={dist(derived.altitude)} />
          <Row label="DOWNRANGE" value={dist(derived.downrange)} />
          <Row label="SURF VEL" value={speed(derived.speedSurface)} />
          <Row label="ORB VEL" value={speed(derived.speedOrbital)} />
          <Row label="VERT VEL" value={speed(derived.vVert)} />
          <Row label="HORIZ VEL" value={speed(derived.vHoriz)} />
          <Row label="APOAPSIS" value={dist(derived.apoapsis)} />
          <Row label="PERIAPSIS" value={dist(derived.periapsis)} />
          <Row label="INCLINATION" value={deg(derived.inclination * (Math.PI / 180))} />
          <Row label="ECCENTRICITY" value={num(derived.ecc, 4)} />
          <Row
            label="PERIOD"
            value={isFinite(derived.period) ? clock(derived.period).replace('T+', '') : '—'}
          />
          <Row label="MACH" value={num(derived.machAngle, 2)} />
          <Row
            label="DYN PRESS Q"
            value={pressure(derived.q)}
            tone={derived.q > 30000 ? 'amber' : derived.q > 20000 ? 'amber' : undefined}
          />
          <Row label="MAX-Q" value={pressure(sim.maxQ)} tone="amber" />
          <Row
            label="G-LOAD"
            value={`${num(derived.gLoad, 2)} g`}
            tone={derived.gLoad > 4 ? 'red' : undefined}
          />
          <Row label="MAX-G" value={`${num(sim.maxG, 2)} g`} />
          <Row label="THROTTLE" value={pct(derived.throttle, 0)} />
          <Row label="TWR" value={num(derived.twr, 2)} />
          <Row label="ACTIVE STAGE" value={sim.activeStage >= 0 ? `S${sim.activeStage + 1}` : '—'} />
          <Row label="ΔV REMAIN" value={dv(derived.dvRemaining)} />
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'amber' | 'red';
}) {
  const color = tone === 'red' ? 'text-nogo' : tone === 'amber' ? 'text-amber' : 'text-ink';
  return (
    <div className="flex items-center justify-between border-b border-grid px-2 py-[3px] odd:bg-panel2/40">
      <span className="text-[9px] tracking-[0.12em] text-dim">{label}</span>
      <span className={`tnum text-[12px] ${color}`}>{value}</span>
    </div>
  );
}
