import { useEffect, useRef } from 'react';
import { useSimStore } from '../store/useSimStore';
import { clock } from './format';

const KIND_COLOR: Record<string, string> = {
  good: 'text-go',
  warn: 'text-amber',
  bad: 'text-nogo',
  info: 'text-dim',
};

/** Scrolling flight event log, newest at the bottom, auto-scrolled. */
export default function EventLog() {
  const events = useSimStore((s) => s.events);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length]);

  return (
    <div className="flex h-full flex-col bg-panel border border-edge">
      <div className="border-b border-edge px-2 py-1 text-[10px] tracking-[0.2em] text-dim">
        EVENT LOG
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
        {events.length === 0 ? (
          <div className="py-4 text-center text-[10px] tracking-[0.2em] text-dim">NO EVENTS</div>
        ) : (
          events.map((e, i) => (
            <div key={i} className="flex gap-2 py-[1px] text-[11px] leading-tight">
              <span className="tnum shrink-0 text-dim">{clock(e.t)}</span>
              <span className={KIND_COLOR[e.kind] ?? 'text-ink'}>{e.label}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
