import { useSimStore } from '../store/useSimStore';
import { dist, speed, clock, num, pct } from './format';

/** Compact, always-visible heads-up readout strip (horizontally scrollable on phones).
 *  Gives the player constant situational awareness without opening the data panels. */
export default function HudBar() {
  const d = useSimStore((s) => s.derived);
  const sim = useSimStore((s) => s.sim);
  const rt = useSimStore((s) => s.runtime);
  if (!d || !sim) return null;

  const within = rt
    ? Math.abs(d.apoapsis - rt.mission.targetApoapsis) <= rt.mission.altTolerance &&
      Math.abs(d.periapsis - rt.mission.targetPeriapsis) <= rt.mission.altTolerance &&
      d.stable
    : false;

  return (
    <div className="flex items-stretch gap-px overflow-x-auto bg-panel/85 border-b border-edge text-[11px] no-scrollbar">
      <Chip k="MET" v={clock(sim.t)} accent />
      <Chip k="MODE" v={sim.autopilot ? 'AUTO' : 'MANUAL'} tone={sim.autopilot ? 'accent' : 'amber'} />
      <Chip k="ALT" v={dist(d.altitude)} />
      <Chip k="SPD" v={speed(d.speedSurface)} />
      <Chip k="V/S" v={speed(d.vVert)} />
      <Chip k="APO" v={dist(d.apoapsis)} tone={within ? 'go' : undefined} />
      <Chip k="PERI" v={dist(d.periapsis)} tone={d.periapsis > 100e3 ? 'go' : 'amber'} />
      <Chip k="THR" v={pct(d.throttle, 0)} />
      <Chip k="STG" v={`S${sim.activeStage + 1}`} />
      <Chip k="G" v={`${num(d.gLoad, 1)}`} tone={d.gLoad > 4 ? 'nogo' : undefined} />
      <Chip k="Q" v={`${num(d.q / 1000, 0)}k`} tone={d.q > 40e3 ? 'amber' : undefined} />
    </div>
  );
}

function Chip({
  k,
  v,
  accent,
  tone,
}: {
  k: string;
  v: string;
  accent?: boolean;
  tone?: 'go' | 'amber' | 'nogo' | 'accent';
}) {
  const color =
    tone === 'go'
      ? 'text-go'
      : tone === 'amber'
        ? 'text-amber'
        : tone === 'nogo'
          ? 'text-nogo'
          : tone === 'accent' || accent
            ? 'text-accent'
            : 'text-ink';
  return (
    <div className="flex shrink-0 flex-col items-center justify-center px-2.5 py-1 border-r border-grid min-w-[58px]">
      <span className="text-[8px] tracking-[0.15em] text-dim leading-none">{k}</span>
      <span className={`tnum leading-tight ${color}`}>{v}</span>
    </div>
  );
}
