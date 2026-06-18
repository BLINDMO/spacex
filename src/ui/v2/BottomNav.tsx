import { useSimStore } from '../../store/useSimStore';
import type { GameMode } from '../../sim/types';

type Tab = { id: string; label: string; mode: GameMode; icon: JSX.Element };

const icon = (path: string) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {path.split('|').map((d, i) => (
      <path key={i} d={d} />
    ))}
  </svg>
);

const TABS: Tab[] = [
  { id: 'mission', label: 'MISSION', mode: 'select', icon: icon('M12 2v3|M12 19v3|M2 12h3|M19 12h3|M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z') },
  { id: 'build', label: 'BUILD', mode: 'vab', icon: icon('M12 2c2 2 3 5 3 8 0 4-3 8-3 8s-3-4-3-8c0-3 1-6 3-8z|M9 16l-3 3|M15 16l3 3') },
  { id: 'scores', label: 'SCORES', mode: 'scores', icon: icon('M6 9a6 6 0 0 0 12 0V4H6z|M9 20h6|M12 15v5|M4 5h2v2a2 2 0 0 1-2-2z|M20 5h-2v2a2 2 0 0 0 2-2z') },
];

/** Persistent bottom tab bar for the setup screens (mission / build / flight / scores). */
export default function BottomNav() {
  const mode = useSimStore((s) => s.mode);
  const goTo = useSimStore((s) => s.goTo);
  const proceed = useSimStore((s) => s.proceedFromBuilder);

  return (
    <nav className="flex items-stretch border-t border-edge bg-panel pb-[max(0.25rem,env(safe-area-inset-bottom))]">
      {TABS.map((t) => {
        const active = mode === t.mode;
        return (
          <button
            key={t.id}
            onClick={() => goTo(t.mode)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] ${
              active ? 'text-accent' : 'text-dim'
            }`}
          >
            {t.icon}
            <span className="text-[10px] tracking-[0.12em]">{t.label}</span>
            {active && <span className="absolute top-0 h-0.5 w-10 bg-accent" />}
          </button>
        );
      })}
      {/* FLIGHT = build current rocket and go to the pad */}
      <button
        onClick={proceed}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-go"
      >
        {icon('M5 13l4 4L19 7|M12 19v3')}
        <span className="text-[10px] tracking-[0.12em]">FLIGHT</span>
      </button>
    </nav>
  );
}
