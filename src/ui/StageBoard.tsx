import { useSimStore } from '../store/useSimStore';
import { ENGINES } from '../store/useSimStore';
import { mass, pct } from './format';

/** Stage/engine status board from runtime + live sim state. */
export default function StageBoard() {
  const runtime = useSimStore((s) => s.runtime);
  const sim = useSimStore((s) => s.sim);

  return (
    <div className="flex h-full flex-col bg-panel border border-edge">
      <div className="border-b border-edge px-2 py-1 text-[10px] tracking-[0.2em] text-dim">
        STAGE BOARD
      </div>

      {!runtime || !sim ? (
        <div className="flex flex-1 items-center justify-center py-6 text-[11px] tracking-[0.2em] text-dim">
          AWAITING TELEMETRY
        </div>
      ) : (
        <div className="flex flex-col">
          {runtime.stages.map((st, i) => {
            const initial = st.propInitial || 1;
            const remaining = sim.stagePropRemaining[i] ?? 0;
            const frac = Math.max(0, Math.min(1, remaining / initial));
            const active = i === sim.activeStage;
            const spent = i < sim.activeStage;
            const eng = ENGINES[st.engineId];
            const engName = eng ? eng.name : st.engineId;

            let state: string;
            let stateColor: string;
            if (spent) {
              state = 'SEP/SPENT';
              stateColor = 'text-dim';
            } else if (active) {
              if (sim.throttle > 0.001) {
                state = 'BURN';
                stateColor = 'text-go';
              } else {
                state = 'IDLE';
                stateColor = 'text-amber';
              }
            } else {
              state = 'STBY';
              stateColor = 'text-dim';
            }

            const barColor = spent ? '#3a4750' : active ? '#39c0d6' : '#4a5a66';

            return (
              <div
                key={i}
                className={`border-b border-grid px-2 py-[5px] ${active ? 'bg-panel2/60' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] ${spent ? 'text-dim' : 'text-ink'}`}>
                    S{i + 1} · {st.name}
                  </span>
                  <span className={`tnum text-[10px] tracking-[0.1em] ${stateColor}`}>{state}</span>
                </div>
                <div className="flex items-center justify-between text-[9px] text-dim">
                  <span>
                    {st.engineCount} × {engName}
                  </span>
                  {active && (
                    <span className="tnum text-accent">THR {pct(sim.throttle, 0)}</span>
                  )}
                </div>
                <div className="mt-[3px] flex items-center gap-2">
                  <div className="h-2 flex-1 bg-panel3">
                    <div
                      style={{ width: `${frac * 100}%`, backgroundColor: barColor }}
                      className="h-full"
                    />
                  </div>
                  <span className="tnum w-[68px] text-right text-[9px] text-dim">
                    {mass(remaining)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
