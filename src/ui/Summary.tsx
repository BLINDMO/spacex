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
          <SubScore label="ACCURACY" value={score.accuracy} />
          <SubScore label="EFFICIENCY" value={score.efficiency} />
          <SubScore label="MARGIN" value={score.margin} />

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

function SubScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-2">
      <div className="mb-[2px] flex items-center justify-between">
        <span className="text-[9px] tracking-[0.12em] text-dim">{label}</span>
        <span className="tnum text-[11px] text-ink">{pct(value, 0)}</span>
      </div>
      <div className="h-2 w-full bg-panel3">
        <div
          style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
          className="h-full bg-accent"
        />
      </div>
    </div>
  );
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
