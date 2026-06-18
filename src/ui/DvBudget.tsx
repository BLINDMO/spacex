import { useSimStore } from '../store/useSimStore';
import { num } from './format';

/** Delta-v budget: ideal expended vs gravity/drag/steering losses + remaining. */
export default function DvBudget() {
  const sim = useSimStore((s) => s.sim);
  const derived = useSimStore((s) => s.derived);

  return (
    <div className="flex h-full flex-col bg-panel border border-edge">
      <div className="border-b border-edge px-2 py-1 text-[10px] tracking-[0.2em] text-dim">
        ΔV BUDGET
      </div>

      {!sim || !derived ? (
        <div className="flex flex-1 items-center justify-center py-6 text-[11px] tracking-[0.2em] text-dim">
          AWAITING TELEMETRY
        </div>
      ) : (
        (() => {
          const expended = sim.dvExpended;
          const lossTotal = sim.lossGravity + sim.lossDrag + sim.lossSteer;
          const remaining = derived.dvRemaining;
          const scaleMax = Math.max(expended, lossTotal, remaining, 1);
          return (
            <div className="flex flex-col gap-2 p-2">
              <Bar label="EXPENDED" value={expended} max={scaleMax} color="#39c0d6" />
              <Bar label="REMAINING" value={remaining} max={scaleMax} color="#35c66b" />
              <div className="my-1 border-t border-grid" />
              <Bar label="LOSS · GRAVITY" value={sim.lossGravity} max={scaleMax} color="#e0a020" />
              <Bar label="LOSS · DRAG" value={sim.lossDrag} max={scaleMax} color="#e0a020" />
              <Bar label="LOSS · STEER" value={sim.lossSteer} max={scaleMax} color="#e0a020" />
              <div className="mt-1 flex items-center justify-between border-t border-grid pt-1">
                <span className="text-[9px] tracking-[0.15em] text-dim">TOTAL LOSSES</span>
                <span className="tnum text-[12px] text-amber">{num(lossTotal, 0)} m/s</span>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const frac = Math.max(0, Math.min(1, value / max));
  return (
    <div>
      <div className="mb-[2px] flex items-center justify-between">
        <span className="text-[9px] tracking-[0.12em] text-dim">{label}</span>
        <span className="tnum text-[11px] text-ink">{num(value, 0)} m/s</span>
      </div>
      <div className="h-2 w-full bg-panel3">
        <div style={{ width: `${frac * 100}%`, backgroundColor: color }} className="h-full" />
      </div>
    </div>
  );
}
