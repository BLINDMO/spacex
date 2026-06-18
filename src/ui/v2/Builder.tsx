import { useCallback, useEffect, useRef, useState } from 'react';
import { useSimStore, MISSIONS } from '../../store/useSimStore';
import { PART_LIST, PARTS, buildDesign, hasCrew } from '../../data/parts';
import { computeVehicleStats } from '../../sim/vehicle';
import { num } from '../format';
import RocketCanvas, { type ClientSlot } from './RocketCanvas';

const CATS: { cat: string; label: string }[] = [
  { cat: 'engine', label: 'ENGINES' },
  { cat: 'tank', label: 'TANKS' },
  { cat: 'structural', label: 'STRUCTURE' },
  { cat: 'fairing', label: 'FAIRING' },
  { cat: 'payload', label: 'PAYLOAD' },
];

interface Drag {
  kind: 'new' | 'move';
  defId?: string;
  uid?: string;
  label: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
}

function vibrate(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
}

/** Visual, drag-and-snap rocket workbench (KSP-style) for mobile portrait. */
export default function Builder() {
  const rocket = useSimStore((s) => s.rocket);
  const selected = useSimStore((s) => s.selectedPart);
  const missionId = useSimStore((s) => s.missionId);
  const addPart = useSimStore((s) => s.addPart);
  const addPartAt = useSimStore((s) => s.addPartAt);
  const movePartTo = useSimStore((s) => s.movePartTo);
  const selectPart = useSimStore((s) => s.selectPart);
  const removePart = useSimStore((s) => s.removePart);
  const setEngines = useSimStore((s) => s.setPartEngines);
  const setScale = useSimStore((s) => s.setPartScale);
  const movePart = useSimStore((s) => s.movePart);
  const loadPreset = useSimStore((s) => s.loadRocketPreset);
  const clearRocket = useSimStore((s) => s.clearRocket);
  const proceed = useSimStore((s) => s.proceedFromBuilder);

  const mission = MISSIONS[missionId];
  const design = buildDesign(rocket);
  const stats = computeVehicleStats(design);
  const dvFrac = Math.min(1.2, stats.totalDvVac / mission.advisoryDv);
  const dvOk = stats.totalDvVac >= mission.advisoryDv;
  const twrOk = stats.liftoffTWR >= 1.2;
  const hasEngine = design.stages.length > 0;
  const hasPayload = design.payloadMass > 0;
  const crewOk = !mission.crewed || hasCrew(rocket);
  const ready = dvOk && twrOk && hasEngine && hasPayload && crewOk;

  const sel = rocket.find((p) => p.uid === selected);
  const selDef = sel ? PARTS[sel.defId] : null;

  // ── drag-and-snap state ──────────────────────────────────────────────
  const slotsRef = useRef<ClientSlot[]>([]);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const onLayout = useCallback((s: ClientSlot[]) => { slotsRef.current = s; }, []);

  const overCanvas = (x: number, y: number) => {
    const r = canvasWrapRef.current?.getBoundingClientRect();
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };
  const insertIndex = (y: number, excludeUid?: string) =>
    slotsRef.current.filter((s) => s.uid !== excludeUid && s.yMid > y).length;
  const hitUid = (y: number) => slotsRef.current.find((s) => y >= s.yTop && y <= s.yBot)?.uid;

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      d.x = e.clientX;
      d.y = e.clientY;
      if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 8) {
        d.moved = true;
        vibrate(8);
      }
      setDrag({ ...d });
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!d) return;
      const on = overCanvas(e.clientX, e.clientY);
      if (d.kind === 'new') {
        if (d.moved && on) {
          addPartAt(d.defId!, insertIndex(e.clientY));
          vibrate(14);
        } else if (!d.moved) {
          addPart(d.defId!); // tap = add to a sensible default position
        }
      } else if (d.kind === 'move' && d.uid) {
        if (!d.moved) selectPart(d.uid); // tap = select
        else if (on) {
          movePartTo(d.uid, insertIndex(e.clientY, d.uid));
          vibrate(14);
        }
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [drag, addPart, addPartAt, movePartTo, selectPart]);

  const startDrag = (e: React.PointerEvent, init: Partial<Drag>) => {
    const d: Drag = {
      kind: init.kind!,
      defId: init.defId,
      uid: init.uid,
      label: init.label ?? '',
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      moved: false,
    };
    dragRef.current = d;
    setDrag(d);
  };

  const canvasPointerDown = (e: React.PointerEvent) => {
    const uid = hitUid(e.clientY);
    startDrag(e, { kind: 'move', uid, label: uid ? PARTS[rocket.find((p) => p.uid === uid)!.defId].name : '' });
    if (!uid && drag == null) selectPart(null);
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#05070a] text-ink">
      {/* header */}
      <div className="flex items-center gap-2 border-b border-edge bg-panel px-3 py-2">
        <span className="text-sm tracking-[0.2em] text-accent">VEHICLE BUILDER</span>
        <span className="text-[11px] text-dim truncate">· {mission.name}</span>
        <div className="ml-auto flex gap-1.5">
          <button onClick={() => loadPreset('vanguard')} className="dock-btn">PRESET</button>
          <button onClick={clearRocket} className="dock-btn">CLEAR</button>
        </div>
      </div>

      {/* specs bar */}
      <div className="border-b border-edge bg-panel2 px-3 py-2">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-dim">Δv <span className={`tnum ${dvOk ? 'text-go' : 'text-nogo'}`}>{num(stats.totalDvVac, 0)}</span> / {num(mission.advisoryDv, 0)}</span>
          <span className="text-dim">TWR <span className={`tnum ${twrOk ? 'text-go' : 'text-amber'}`}>{num(stats.liftoffTWR, 2)}</span></span>
          <span className="text-dim">MASS <span className="tnum text-ink">{num(stats.totalMass / 1000, 0)} t</span></span>
        </div>
        <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-grid">
          <div className={`h-full ${dvOk ? 'bg-go' : 'bg-amber'}`} style={{ width: `${Math.min(100, (dvFrac / 1.2) * 100)}%` }} />
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
          <Check ok={hasEngine} label="engine" />
          <Check ok={dvOk} label="Δv" />
          <Check ok={twrOk} label="TWR≥1.2" />
          <Check ok={hasPayload} label="payload" />
          {mission.crewed && <Check ok={crewOk} label="crew capsule" />}
        </div>
      </div>

      {/* rocket canvas (drag target) */}
      <div ref={canvasWrapRef} className="relative min-h-0 flex-1 touch-none" onPointerDown={canvasPointerDown}>
        <RocketCanvas
          rocket={rocket}
          selected={selected}
          onLayout={onLayout}
          snapY={drag?.moved ? drag.y : null}
          dragUid={drag?.kind === 'move' && drag.moved ? drag.uid : null}
        />
        {rocket.length > 0 && (
          <div className="pointer-events-none absolute left-2 top-2 text-[10px] text-dim">
            {design.stages.length} stage{design.stages.length === 1 ? '' : 's'} · drag parts to snap · tap to edit
          </div>
        )}

        {sel && selDef && (
          <div className="absolute inset-x-2 bottom-2 rounded border border-edge bg-panel/95 p-2.5 backdrop-blur-sm">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[13px] text-accent">{selDef.name}</span>
              <div className="flex gap-1">
                <button onClick={() => movePart(sel.uid, 1)} className="dock-btn w-9">▲</button>
                <button onClick={() => movePart(sel.uid, -1)} className="dock-btn w-9">▼</button>
                <button onClick={() => removePart(sel.uid)} className="dock-btn w-9 text-nogo">✕</button>
                <button onClick={() => selectPart(null)} className="dock-btn w-9">✓</button>
              </div>
            </div>
            <p className="mb-1 text-[11px] text-dim">{selDef.blurb}</p>
            {selDef.cat === 'engine' && (selDef.maxEngines ?? 1) > 1 && (
              <Slider label={`ENGINES · ${sel.engines ?? 1}`} min={1} max={selDef.maxEngines ?? 1} step={1}
                value={sel.engines ?? 1} onChange={(v) => setEngines(sel.uid, v)} />
            )}
            {selDef.cat === 'tank' && (
              <Slider label={`TANK SIZE · ${num(((selDef.propMass ?? 0) * (sel.scale ?? 1)) / 1000, 0)} t prop`} min={0.5} max={2} step={0.1}
                value={sel.scale ?? 1} onChange={(v) => setScale(sel.uid, v)} />
            )}
          </div>
        )}
      </div>

      {/* parts tray (drag from here) */}
      <div className="border-t border-edge bg-panel">
        <div className="flex gap-3 overflow-x-auto px-3 py-2 no-scrollbar">
          {CATS.map((c) => (
            <div key={c.cat} className="shrink-0">
              <div className="mb-1 text-[9px] tracking-[0.2em] text-dim">{c.label}</div>
              <div className="flex gap-1.5">
                {PART_LIST.filter((p) => p.cat === c.cat).map((p) => (
                  <button
                    key={p.id}
                    onPointerDown={(e) => startDrag(e, { kind: 'new', defId: p.id, label: p.name })}
                    className="flex h-14 w-16 flex-col items-center justify-center gap-0.5 rounded border border-edge bg-panel2 px-1 active:bg-panel3 touch-none select-none"
                  >
                    <PartGlyph cat={p.cat} color={p.color} flame={p.flame} />
                    <span className="text-[8.5px] leading-none text-ink text-center">{p.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* proceed */}
      <div className="border-t border-edge bg-panel p-2">
        <button
          onClick={proceed}
          disabled={!hasEngine}
          className={`dock-btn w-full min-h-[52px] text-[14px] tracking-[0.2em] ${ready ? 'border-go text-go' : 'border-amber text-amber'} disabled:opacity-40`}
        >
          {ready ? 'ROLL OUT TO PAD ▸' : hasEngine ? 'ROLL OUT ANYWAY ▸' : 'DRAG AN ENGINE TO BEGIN'}
        </button>
      </div>

      {/* drag ghost */}
      {drag?.moved && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded border border-accent bg-panel/95 px-2 py-1 text-[11px] text-accent shadow-lg"
          style={{ left: drag.x, top: drag.y }}
        >
          {drag.label}
        </div>
      )}
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return <span className={ok ? 'text-go' : 'text-dim'}>{ok ? '✓' : '○'} {label}</span>;
}

function Slider({ label, min, max, step, value, onChange }: {
  label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-0.5 text-[10px] tracking-[0.1em] text-dim">{label}</div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="hslider w-full" />
    </div>
  );
}

function PartGlyph({ cat, color, flame }: { cat: string; color: string; flame?: string }) {
  return (
    <svg width="22" height="20" viewBox="0 0 22 20">
      {cat === 'engine' && (
        <>
          <rect x="7" y="2" width="8" height="7" fill="#3a4048" />
          <path d="M7 9 L5 17 L17 17 L15 9 Z" fill={flame || '#52585f'} />
        </>
      )}
      {cat === 'tank' && <rect x="6" y="2" width="10" height="16" rx="2" fill={color} />}
      {cat === 'structural' && <path d="M5 2 H17 L14 18 H8 Z" fill={color} />}
      {cat === 'fairing' && <path d="M11 1 Q5 8 5 18 H17 Q17 8 11 1Z" fill={color} />}
      {cat === 'payload' && <rect x="7" y="4" width="8" height="12" rx="1" fill={color} />}
    </svg>
  );
}
