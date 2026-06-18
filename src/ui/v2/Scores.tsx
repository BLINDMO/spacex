import { useSimStore, isMissionUnlocked, MISSION_LIST } from '../../store/useSimStore';
import { num, dist } from '../format';

/** Campaign progress + best scores. */
export default function Scores() {
  const scores = useSimStore((s) => s.scores);
  const selectMission = useSimStore((s) => s.selectMission);
  const goTo = useSimStore((s) => s.goTo);

  const total = MISSION_LIST.reduce((a, m) => a + (scores[m.id]?.total ?? 0), 0);
  const completed = MISSION_LIST.filter((m) => (scores[m.id]?.total ?? 0) >= 400).length;

  return (
    <div className="flex h-full w-full flex-col bg-[#05070a] text-ink">
      <div className="flex items-center justify-between border-b border-edge bg-panel px-4 py-3">
        <span className="text-base tracking-[0.25em] text-accent">CAMPAIGN</span>
        <span className="text-[12px] text-dim tnum">{completed}/{MISSION_LIST.length} cleared · {num(total, 0)} pts</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {MISSION_LIST.map((m) => {
          const ms = scores[m.id];
          const unlocked = isMissionUnlocked(scores, m.id);
          return (
            <button
              key={m.id}
              disabled={!unlocked}
              onClick={() => { selectMission(m.id); goTo('select'); }}
              className={`flex w-full items-center gap-3 border-b border-grid px-4 py-3 text-left ${unlocked ? 'active:bg-panel2' : 'opacity-50'}`}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[15px] text-ink truncate">{m.name}</div>
                <div className="text-[11px] text-dim">{dist(m.targetApoapsis)} × {num(m.targetInclination, 1)}°</div>
              </div>
              <div className="text-right">
                {ms ? (
                  <>
                    <div className={`tnum text-lg ${ms.passed ? 'text-go' : 'text-amber'}`}>{num(ms.total, 0)}</div>
                    <div className="text-[9px] text-dim">/ 1000</div>
                  </>
                ) : (
                  <div className="text-[12px] text-dim">{unlocked ? 'NOT FLOWN' : 'LOCKED'}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
