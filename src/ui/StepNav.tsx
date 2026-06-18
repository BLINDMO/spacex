import { useSimStore } from '../store/useSimStore';

type Step = 'mission' | 'vehicle' | 'pad';

/** Guided breadcrumb so the player always knows where they are in flight setup and can
 *  step back. MISSION ▸ VEHICLE ▸ PAD ▸ (FLIGHT). */
export default function StepNav({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'mission', label: '1 · MISSION' },
    { id: 'vehicle', label: '2 · VEHICLE' },
    { id: 'pad', label: '3 · PAD' },
  ];
  const order: Step[] = ['mission', 'vehicle', 'pad'];
  const curIdx = order.indexOf(current);

  const go = (s: Step) => {
    if (s === 'mission') useSimStore.setState({ mode: 'select' });
    else if (s === 'vehicle') useSimStore.setState({ mode: 'vab' });
    // 'pad' (prelaunch) requires initFlight — only reachable forward via VAB's proceed
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
      {steps.map((s, i) => {
        const done = i < curIdx;
        const active = i === curIdx;
        return (
          <div key={s.id} className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => (i <= curIdx ? go(s.id) : undefined)}
              disabled={i > curIdx}
              className={`px-2 py-1 text-[10px] tracking-[0.15em] border rounded-[2px] ${
                active
                  ? 'border-accent text-accent bg-accent/10'
                  : done
                    ? 'border-edge text-go'
                    : 'border-edge text-dim'
              } ${i <= curIdx ? 'cursor-pointer' : 'cursor-default opacity-60'}`}
            >
              {done ? '✓ ' : ''}
              {s.label}
            </button>
            {i < steps.length - 1 && <span className="text-edge text-[10px]">▸</span>}
          </div>
        );
      })}
    </div>
  );
}
