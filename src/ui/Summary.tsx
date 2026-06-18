import { useSimStore } from '../store/useSimStore';
import { MISSIONS } from '../store/useSimStore';
import { dist, num, pct, clock, pressure, dv } from './format';

/** Post-flight summary / scorecard. */
export default function Summary() {
  const score = useSimStore((s) => s.score);
  const missionId = useSimStore((s) => s.missionId);
  const scores = useSimStore((s) => s.scores);
  const reset = useSimStore((s) => s.reset);
  const enterPrelaunch = useSimStore((s) => s.enterPrelaunch);

  const mission = MISSIONS[missionId];
  const best = scores[missionId];

  if (!score) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#05070a] text-[12px] tracking-[0.2em] text-dim">
        NO FLIGHT DATA
      </div>
    );
  }

  const passed = score.passed;
  const lossTotal = score.lossGravity + score.lossDrag + score.lossSteer;
  const scaleMax = Math.max(score.lossGravity, score.lossDrag, score.lossSteer, 1);

  return (
    <div className="crt flex h-full w-full flex-col overflow-auto bg-[#05070a] text-ink">
      {/* Banner */}
      <div
        className={`flex items-center justify-between border-b-2 px-6 py-4 ${
          passed ? 'border-go bg-go/10' : 'border-nogo bg-nogo/10'
        }`}
      >
        <div>
          <div className={`text-3xl tracking-[0.3em] ${passed ? 'text-go' : 'text-nogo'}`}>
            {passed ? 'MISSION SUCCESS' : 'MISSION FAILURE'}
          </div>
          <div className="mt-1 text-[12px] text-dim">{score.reason}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] tracking-[0.2em] text-dim">FINAL SCORE</div>
          <div className="tnum text-4xl text-accent">{num(score.total, 0)}</div>
          <div className="text-[10px] text-dim">/ 1000</div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-edge bg-panel px-6 py-2 text-[11px] text-dim">
        {mission.name}
        {best && (
          <span className="ml-auto tnum text-go">
            BEST {num(best.total, 0)} / 1000
          </span>
        )}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-px overflow-auto bg-edge md:grid-cols-2">
        {/* Orbit results */}
        <div className="bg-panel p-4">
          <div className="mb-2 text-[10px] tracking-[0.2em] text-dim">ORBIT ACHIEVED vs TARGET</div>
          <Compare
            label="APOAPSIS"
            achieved={dist(score.apoapsis)}
            target={dist(mission.targetApoapsis)}
          />
          <Compare
            label="PERIAPSIS"
            achieved={dist(score.periapsis)}
            target={dist(mission.targetPeriapsis)}
          />
          <Compare
            label="INCLINATION"
            achieved={`${num(score.inclination, 2)}°`}
            target={`${num(mission.targetInclination, 1)}°`}
          />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <KV k="MAX-Q" v={pressure(score.maxQ)} />
            <KV k="MAX-G" v={`${num(score.maxG, 2)} g`} />
            <KV k="MET" v={clock(score.met).replace('T+', '')} />
          </div>
          <div className="mt-2">
            <KV k="PROP MARGIN" v={pct(score.propMarginPct / 100, 1)} />
          </div>
        </div>

        {/* Score breakdown */}
        <div className="bg-panel p-4">
          <div className="mb-2 text-[10px] tracking-[0.2em] text-dim">SCORE BREAKDOWN</div>
          <PointRow label="Orbit achieved" pts={score.orbitPts} max={400} />
          <PointRow label="Inclination match" pts={score.incPts} max={200} />
          <PointRow label="Fuel efficiency" pts={score.fuelPts} max={200} />
          <PointRow label="Staging timing" pts={score.stagePts} max={100} />
          <PointRow label="No aborts" pts={score.abortPts} max={100} />
          <div className="mt-1 flex items-center justify-between border-t border-grid pt-1.5">
            <span className="text-[11px] tracking-[0.1em] text-ink">TOTAL</span>
            <span className="tnum text-[15px] text-accent">{num(score.total, 0)} / 1000</span>
          </div>

          <div className="mb-2 mt-4 text-[10px] tracking-[0.2em] text-dim">ΔV LOSS BUDGET</div>
          <Bar label="GRAVITY" value={score.lossGravity} max={scaleMax} />
          <Bar label="DRAG" value={score.lossDrag} max={scaleMax} />
          <Bar label="STEERING" value={score.lossSteer} max={scaleMax} />
          <div className="mt-2 flex items-center justify-between border-t border-grid pt-1">
            <span className="text-[9px] tracking-[0.15em] text-dim">TOTAL LOSSES</span>
            <span className="tnum text-[12px] text-amber">{dv(lossTotal)}</span>
          </div>
        </div>
      </div>

      {/* What went wrong — teaching post-mortem */}
      {!score.passed && (
        <div className="border-t border-edge bg-panel px-6 py-3">
          <div className="text-[10px] tracking-[0.2em] text-amber">WHAT WENT WRONG</div>
          <div className="mt-1 text-[13px] leading-relaxed text-ink">{fixTip(score.reason)}</div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 border-t border-edge bg-panel px-6 py-4">
        <button
          type="button"
          onClick={enterPrelaunch}
          className="rounded-[2px] border border-accent bg-accent/10 px-5 py-2 text-[11px] uppercase tracking-[0.2em] text-accent hover:bg-accent/20"
        >
          FLY AGAIN ▸
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-[2px] border border-edge bg-panel2 px-5 py-2 text-[11px] uppercase tracking-[0.2em] text-ink hover:bg-panel3"
        >
          NEW MISSION
        </button>
      </div>
    </div>
  );
}

function Compare({
  label,
  achieved,
  target,
}: {
  label: string;
  achieved: string;
  target: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-grid py-[5px]">
      <span className="text-[10px] tracking-[0.12em] text-dim">{label}</span>
      <div className="flex items-baseline gap-3">
        <span className="tnum text-[13px] text-ink">{achieved}</span>
        <span className="tnum text-[10px] text-dim">/ {target}</span>
      </div>
    </div>
  );
}

function PointRow({ label, pts, max }: { label: string; pts: number; max: number }) {
  const frac = Math.max(0, Math.min(1, pts / max));
  const tone = frac > 0.85 ? 'bg-go' : frac > 0.4 ? 'bg-accent' : 'bg-amber';
  return (
    <div className="mb-2">
      <div className="mb-[2px] flex items-center justify-between">
        <span className="text-[11px] text-dim">{label}</span>
        <span className="tnum text-[12px] text-ink">{pts} / {max}</span>
      </div>
      <div className="h-2 w-full bg-panel3">
        <div style={{ width: `${frac * 100}%` }} className={`h-full ${tone}`} />
      </div>
    </div>
  );
}

function fixTip(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes('g-limit') || r.includes('g sustained') || r.includes('crew exceeded'))
    return 'Throttle back during peak ascent — for crewed flights keep sustained G-force below 4.5. Watch the G gauge and ease the throttle as it climbs.';
  if (r.includes('q·α') || r.includes('broke up'))
    return 'You pushed too hard through Max-Q. Ease the throttle to ~70% around 10–14 km altitude, then throttle back up once dynamic pressure drops.';
  if (r.includes('insufficient'))
    return 'Not enough Δv to reach orbit. Add propellant or engines in the builder, stage more cleanly, or fly a more efficient gravity turn.';
  if (r.includes('periapsis below'))
    return 'Your periapsis is inside the atmosphere, so the orbit will decay. Keep burning prograde at apoapsis to raise periapsis above 100 km before deploying.';
  if (r.includes('impacted'))
    return 'The vehicle pitched over too early and fell back. Hold a steeper pitch in the first ~60 s, then turn gradually.';
  if (r.includes('apoapsis off') || r.includes('periapsis off') || r.includes('inclination off'))
    return 'Close! Trim your burn — cut throttle as the orbit reaches the target, and match the inclination by launching toward the right azimuth.';
  return 'Review the telemetry and try a cleaner ascent. Small throttle and staging adjustments make a big difference.';
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const frac = Math.max(0, Math.min(1, value / max));
  return (
    <div className="mb-2">
      <div className="mb-[2px] flex items-center justify-between">
        <span className="text-[9px] tracking-[0.12em] text-dim">{label}</span>
        <span className="tnum text-[11px] text-ink">{num(value, 0)} m/s</span>
      </div>
      <div className="h-2 w-full bg-panel3">
        <div style={{ width: `${frac * 100}%` }} className="h-full bg-amber" />
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[8px] tracking-[0.1em] text-dim">{k}</div>
      <div className="tnum text-[12px] text-ink">{v}</div>
    </div>
  );
}
