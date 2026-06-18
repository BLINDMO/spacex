import { useSimStore } from '../store/useSimStore';
import { MISSIONS, SITES } from '../store/useSimStore';

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'PENDING', cls: 'text-dim border-edge' },
  go: { label: 'GO', cls: 'text-go border-go' },
  nogo: { label: 'NO-GO', cls: 'text-nogo border-nogo' },
};

function fmtCount(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `T-${pad(mm)}:${pad(ss)}`;
}

/** Pre-launch countdown / GO-NO-GO poll panel (renders over the 3D scene). */
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

  const mission = MISSIONS[missionId];
  const site = SITES[siteId];
  const allGo = stations.every((s) => s.status === 'go');

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="w-[520px] max-w-full border border-edge bg-panel/95 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-edge px-4 py-2">
          <span className="text-sm tracking-[0.3em] text-accent">LAUNCH SEQUENCE</span>
          <span className="text-[10px] tracking-[0.2em] text-dim">{holding ? 'HOLD' : countdown > 0 ? 'COUNTING' : 'STANDBY'}</span>
        </div>

        {/* Big clock */}
        <div className="flex flex-col items-center border-b border-edge py-5">
          <div className={`tnum text-5xl tracking-[0.1em] ${holding ? 'text-amber' : 'text-ink'}`}>
            {fmtCount(countdown)}
          </div>
          <div className="mt-1 text-[10px] tracking-[0.2em] text-dim">
            {holding ? 'COUNT HELD' : countdown > 0 ? 'AUTOSEQUENCE RUNNING' : 'AWAITING COMMIT'}
          </div>
        </div>

        {/* Summary line */}
        <div className="border-b border-edge px-4 py-2 text-[11px] text-dim">
          {mission.name} · {design.name} · {site ? site.name : siteId}
        </div>

        {/* GO/NO-GO poll */}
        <div className="px-4 py-3">
          <div className="mb-2 text-[10px] tracking-[0.2em] text-dim">FLIGHT READINESS POLL</div>
          <div className="grid grid-cols-1 gap-1">
            {stations.map((st) => {
              const s = STATUS[st.status];
              return (
                <div
                  key={st.name}
                  className="flex items-center justify-between border-b border-grid py-1"
                >
                  <span className="text-[12px] text-ink">{st.name}</span>
                  <span className={`border px-2 py-[1px] text-[10px] tracking-[0.15em] ${s.cls}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className={`mt-2 text-[10px] ${allGo ? 'text-go' : 'text-dim'}`}>
            {allGo ? 'ALL STATIONS GO FOR LAUNCH' : 'All stations must report GO before liftoff.'}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 border-t border-edge px-4 py-3">
          {countdown === 0 ? (
            <button
              type="button"
              onClick={beginCountdown}
              className="rounded-[2px] border border-accent bg-accent/10 px-4 py-2 text-[11px] uppercase tracking-[0.15em] text-accent hover:bg-accent/20"
            >
              BEGIN COUNTDOWN
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleHold}
              className={`rounded-[2px] border px-4 py-2 text-[11px] uppercase tracking-[0.15em] ${
                holding ? 'border-go text-go hover:bg-go/10' : 'border-amber text-amber hover:bg-amber/10'
              }`}
            >
              {holding ? 'RESUME' : 'HOLD'}
            </button>
          )}
          <button
            type="button"
            onClick={launch}
            className="ml-auto rounded-[2px] border border-go bg-go/10 px-5 py-2 text-[11px] uppercase tracking-[0.2em] text-go hover:bg-go/20"
          >
            LAUNCH NOW
          </button>
        </div>
      </div>
    </div>
  );
}
