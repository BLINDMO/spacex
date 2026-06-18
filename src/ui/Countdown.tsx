import { useSimStore } from '../store/useSimStore';
import { MISSIONS, SITES } from '../store/useSimStore';

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: '· · ·', cls: 'text-dim border-edge' },
  go: { label: 'GO', cls: 'text-go border-go' },
  nogo: { label: 'NO-GO', cls: 'text-nogo border-nogo' },
};

function fmtCount(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `T-00:${s.toString().padStart(2, '0')}`;
}

/** Pre-launch countdown / GO-NO-GO poll (responsive; renders over the 3D scene). */
export default function Countdown() {
  const countdown = useSimStore((s) => s.countdown);
  const holding = useSimStore((s) => s.holding);
  const stations = useSimStore((s) => s.stations);
  const missionId = useSimStore((s) => s.missionId);
  const siteId = useSimStore((s) => s.siteId);
  const design = useSimStore((s) => s.design);
  const beginCountdown = useSimStore((s) => s.beginCountdown);
  const toggleHold = useSimStore((s) => s.toggleHold);
  const launch = useSimStore((s) => s.launch);
  const flightMode = useSimStore((s) => s.flightMode);
  const setFlightMode = useSimStore((s) => s.setFlightMode);

  const mission = MISSIONS[missionId];
  const site = SITES[siteId];
  const allGo = stations.every((s) => s.status === 'go');
  const counting = countdown > 0;

  return (
    <div className="w-full min-w-0 max-w-[440px] border border-edge bg-panel/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-edge px-3 py-2">
        <span className="text-xs tracking-[0.3em] text-accent">LAUNCH SEQUENCE</span>
        <span className="text-[10px] tracking-[0.2em] text-dim">
          {holding ? 'HOLD' : counting ? 'COUNTING' : 'STANDBY'}
        </span>
      </div>

      <div className="flex flex-col items-center border-b border-edge py-4">
        <div className={`tnum text-4xl sm:text-5xl tracking-[0.08em] ${holding ? 'text-amber' : counting ? 'text-ink' : 'text-dim'}`}>
          {fmtCount(countdown)}
        </div>
        <div className="mt-1 text-[10px] tracking-[0.2em] text-dim">
          {holding ? 'COUNT HELD' : counting ? 'AUTOSEQUENCE RUNNING' : 'AWAITING COMMIT'}
        </div>
      </div>

      <div className="border-b border-edge px-3 py-2 text-[11px] text-dim truncate">
        {mission.name} · {design.name} · {site ? site.name : siteId}
      </div>

      <div className="px-3 py-2">
        <div className="mb-1.5 text-[10px] tracking-[0.2em] text-dim">FLIGHT READINESS POLL</div>
        <div className="grid grid-cols-1 gap-1">
          {stations.map((st) => {
            const s = STATUS[st.status];
            return (
              <div key={st.name} className="flex items-center justify-between border-b border-grid py-1">
                <span className="text-[12px] text-ink">{st.name}</span>
                <span className={`tnum border px-2 py-[1px] text-[10px] tracking-[0.15em] ${s.cls}`}>{s.label}</span>
              </div>
            );
          })}
        </div>
        <div className={`mt-2 text-[10px] ${allGo ? 'text-go' : 'text-dim'}`}>
          {allGo ? '✓ ALL STATIONS GO FOR LAUNCH' : 'Stations report GO as the count proceeds.'}
        </div>
      </div>

      {/* flight mode picker */}
      <div className="border-t border-edge px-3 py-2">
        <div className="mb-1 text-[10px] tracking-[0.2em] text-dim">FLIGHT MODE</div>
        <div className="flex gap-1.5">
          {(['assist', 'guided', 'manual'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setFlightMode(m)}
              className={`dock-btn flex-1 ${flightMode === m ? 'border-accent text-accent' : ''}`}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="mt-1 text-[10px] text-dim">
          {flightMode === 'assist' && 'Autopilot flies attitude. You manage throttle & staging.'}
          {flightMode === 'guided' && 'Fly to the target pitch yourself. You handle everything.'}
          {flightMode === 'manual' && 'Full manual control. No aids. Highest skill, best score.'}
        </div>
      </div>

      <div className="flex gap-2 border-t border-edge p-3">
        {!counting ? (
          <button onClick={beginCountdown} className="dock-btn flex-1 border-accent text-accent text-[12px] min-h-[48px]">
            BEGIN COUNTDOWN
          </button>
        ) : (
          <button onClick={toggleHold} className={`dock-btn min-h-[48px] px-4 ${holding ? 'border-go text-go' : 'border-amber text-amber'}`}>
            {holding ? 'RESUME' : 'HOLD'}
          </button>
        )}
        <button onClick={launch} className="dock-btn flex-1 border-go text-go text-[13px] min-h-[48px] tracking-[0.2em]">
          LAUNCH ▸
        </button>
      </div>
    </div>
  );
}
