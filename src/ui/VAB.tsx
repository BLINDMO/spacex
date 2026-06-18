import { useSimStore } from '../store/useSimStore';
import { MISSIONS } from '../store/useSimStore';
import { VEHICLE_LIST } from '../data/vehicles';
import { ENGINE_LIST, ENGINES } from '../data/engines';
import { computeVehicleStats } from '../sim/vehicle';
import { G0 } from '../sim/constants';
import { num, dv } from './format';
import StepNav from './StepNav';

/** Vehicle Assembly — a guided "is this rocket ready for the mission?" workbench:
 *  one-tap presets, easy ± controls, a live readiness checklist (GO/NO-GO), a visual stack,
 *  and a proceed gate that tells you plainly whether you're flight-ready. */
export default function VAB() {
  const design = useSimStore((s) => s.design);
  const missionId = useSimStore((s) => s.missionId);
  const loadPreset = useSimStore((s) => s.loadPreset);
  const setPayload = useSimStore((s) => s.setPayload);
  const setFairing = useSimStore((s) => s.setFairing);
  const updateStage = useSimStore((s) => s.updateStage);
  const addStage = useSimStore((s) => s.addStage);
  const removeStage = useSimStore((s) => s.removeStage);
  const moveStage = useSimStore((s) => s.moveStage);
  const enterPrelaunch = useSimStore((s) => s.enterPrelaunch);

  const mission = MISSIONS[missionId];
  const stats = computeVehicleStats(design);

  // ---- readiness checks ----
  const dvMargin = stats.totalDvVac - mission.advisoryDv;
  const dvOk = dvMargin >= 0;
  const twrOk = stats.liftoffTWR >= 1.2;
  const payloadOk = design.payloadMass >= mission.payloadMass;
  const upperTwr = stats.stages.slice(1).map((s) => s.thrustVac / (s.startMass * G0));
  const upperOk = upperTwr.every((t) => t >= 0.5);
  const checks = [
    { label: 'Δv vs mission requirement', ok: dvOk, detail: dvOk ? `+${num(dvMargin, 0)} m/s margin` : `short ${num(-dvMargin, 0)} m/s` },
    { label: 'Liftoff thrust-to-weight ≥ 1.2', ok: twrOk, detail: `${num(stats.liftoffTWR, 2)}` },
    { label: 'Upper stage(s) can push in vacuum', ok: upperOk, detail: upperTwr.length ? upperTwr.map((t) => num(t, 2)).join(' / ') : 'n/a' },
    { label: `Payload ≥ mission (${num(mission.payloadMass, 0)} kg)`, ok: payloadOk, detail: `${num(design.payloadMass, 0)} kg` },
  ];
  const ready = dvOk && twrOk && payloadOk && upperOk;

  const recId = mission.recommendedVehicle;
  const order = design.stages.map((_, i) => i).reverse(); // upper stage on top

  // visual stack widths (relative to the widest stage)
  const maxStart = Math.max(...stats.stages.map((s) => s.startMass), 1);

  return (
    <div className="crt flex h-full w-full flex-col overflow-auto bg-[#05070a] text-ink">
      {/* Header + step nav */}
      <div className="flex flex-wrap items-center gap-2 border-b border-edge bg-panel px-3 py-2">
        <StepNav current="vehicle" />
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:inline text-[10px] tracking-[0.2em] text-dim">{mission.name}</span>
          <button onClick={() => loadPreset(recId)} className="dock-btn border-accent/60 text-accent">
            LOAD RECOMMENDED
          </button>
        </div>
      </div>

      {/* Readiness banner */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${ready ? 'border-go/40 bg-go/10' : 'border-amber/40 bg-amber/10'}`}>
        <span className={`text-sm tracking-[0.2em] ${ready ? 'text-go' : 'text-amber'}`}>
          {ready ? '◉ FLIGHT READY' : '△ NOT YET FLIGHT-READY'}
        </span>
        <span className="text-[10px] text-dim">{ready ? 'All checks pass' : 'Resolve the amber checks below (or proceed anyway)'}</span>
      </div>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_340px] gap-px bg-edge">
        {/* ---- LEFT: builder ---- */}
        <div className="flex flex-col gap-px overflow-auto bg-edge">
          {/* Presets */}
          <div className="flex flex-wrap items-center gap-1.5 bg-panel px-3 py-2">
            <span className="text-[9px] tracking-[0.2em] text-dim mr-1">PRESETS</span>
            {VEHICLE_LIST.map((v) => (
              <button
                key={v.id}
                onClick={() => loadPreset(v.id)}
                className={`dock-btn ${design.id === v.id ? 'border-accent text-accent' : ''}`}
              >
                {v.name.split(' (')[0]}
              </button>
            ))}
          </div>

          {/* Payload + fairing */}
          <div className="grid grid-cols-2 gap-px bg-edge">
            <Stepper label="PAYLOAD (kg)" value={design.payloadMass} step={500} onChange={setPayload} warn={!payloadOk} />
            <Stepper label="FAIRING (kg)" value={design.fairingMass} step={200} onChange={setFairing} />
          </div>

          {/* Stages (upper on top) */}
          {order.map((i, displayIdx) => {
            const st = design.stages[i];
            const eng = ENGINES[st.engineId];
            return (
              <div key={st.id} className="bg-panel p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] tracking-[0.2em] text-dim">
                    STAGE S{i + 1} {displayIdx === 0 ? '· UPPER' : i === 0 ? '· BOOSTER' : ''}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => moveStage(i, 1)} className="dock-btn w-9">▲</button>
                    <button onClick={() => moveStage(i, -1)} className="dock-btn w-9">▼</button>
                    <button onClick={() => removeStage(i)} className="dock-btn w-9 text-nogo">✕</button>
                  </div>
                </div>
                {/* engine selector */}
                <div className="mb-2">
                  <Label>ENGINE</Label>
                  <select
                    value={st.engineId}
                    onChange={(e) => updateStage(i, { engineId: e.target.value })}
                    className="w-full rounded-[2px] border border-edge bg-panel2 px-2 py-2 text-[13px] text-ink outline-none focus:border-accent"
                  >
                    {ENGINE_LIST.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} · {e.propellant}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1 text-[9px] text-dim">
                    {num(eng.thrustVac / 1000, 0)} kN vac · Isp {num(eng.ispVac, 0)}s · {Math.round(eng.minThrottle * 100)}–100%
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Stepper label="ENGINES" value={st.engineCount} step={1} min={1}
                    onChange={(v) => updateStage(i, { engineCount: Math.max(1, Math.round(v)) })} compact />
                  <Stepper label="PROPELLANT (kg)" value={st.propMass} step={5000}
                    onChange={(v) => updateStage(i, { propMass: Math.max(0, v) })} compact />
                  <Stepper label="DRY MASS (kg)" value={st.dryMass} step={1000}
                    onChange={(v) => updateStage(i, { dryMass: Math.max(0, v) })} compact />
                </div>
              </div>
            );
          })}

          <div className="bg-panel p-3">
            <button onClick={addStage} className="dock-btn">+ ADD STAGE</button>
          </div>
        </div>

        {/* ---- RIGHT: readiness + stack + performance ---- */}
        <div className="flex flex-col gap-px overflow-auto bg-edge">
          {/* checklist */}
          <div className="bg-panel p-3">
            <div className="mb-2 text-[10px] tracking-[0.2em] text-dim">READINESS CHECKLIST</div>
            <div className="flex flex-col gap-1.5">
              {checks.map((c) => (
                <div key={c.label} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[11px]">
                    <span className={c.ok ? 'text-go' : 'text-amber'}>{c.ok ? '✓' : '△'}</span>
                    <span className={c.ok ? 'text-ink' : 'text-amber'}>{c.label}</span>
                  </span>
                  <span className={`tnum text-[10px] ${c.ok ? 'text-dim' : 'text-amber'}`}>{c.detail}</span>
                </div>
              ))}
            </div>
          </div>

          {/* visual stack */}
          <div className="bg-panel p-3">
            <div className="mb-2 text-[10px] tracking-[0.2em] text-dim">STACK (top → bottom)</div>
            <div className="flex flex-col items-center gap-[3px]">
              <div className="h-3 w-8 rounded-t-[6px] bg-edge" title="fairing/payload" />
              {[...stats.stages].reverse().map((s) => {
                const w = 30 + (s.startMass / maxStart) * 130;
                return (
                  <div
                    key={s.index}
                    style={{ width: `${w}px` }}
                    className="flex items-center justify-between border border-edge bg-panel2 px-2 py-1.5 text-[9px]"
                  >
                    <span className="text-dim">S{s.index + 1}</span>
                    <span className="tnum text-ink">{num(s.dvVac, 0)}</span>
                  </div>
                );
              })}
              <div className="h-1 w-10 bg-amber/40" />
            </div>
          </div>

          {/* performance numbers */}
          <StatRow label="TOTAL MASS" value={`${num(stats.totalMass / 1000, 1)} t`} />
          <StatRow label="TOTAL Δv (VAC)" value={dv(stats.totalDvVac)} tone={dvOk ? 'go' : 'nogo'} />
          <StatRow label="REQUIRED Δv" value={dv(mission.advisoryDv)} />
          <StatRow label="LIFTOFF TWR" value={num(stats.liftoffTWR, 2)} tone={twrOk ? 'go' : 'amber'} />

          {/* proceed gate */}
          <div className="bg-panel p-3 mt-auto">
            <button
              onClick={enterPrelaunch}
              className={`dock-btn w-full min-h-[52px] text-[13px] tracking-[0.2em] ${
                ready ? 'border-go text-go' : 'border-amber text-amber'
              }`}
            >
              {ready ? 'PROCEED TO PAD ▸' : 'PROCEED ANYWAY ▸'}
            </button>
            {!ready && (
              <div className="mt-2 text-[10px] text-amber">
                Tip: tap <span className="text-accent">LOAD RECOMMENDED</span> for a vehicle tuned to this mission.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-[2px] text-[9px] tracking-[0.15em] text-dim">{children}</div>;
}

function Stepper({
  label,
  value,
  step,
  onChange,
  min = 0,
  compact,
  warn,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
  min?: number;
  compact?: boolean;
  warn?: boolean;
}) {
  return (
    <div className={`bg-panel ${compact ? '' : 'p-3'}`}>
      <Label>{label}</Label>
      <div className="flex items-stretch gap-1">
        <button onClick={() => onChange(Math.max(min, value - step))} className="dock-btn w-10 text-base">−</button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`tnum min-w-0 flex-1 rounded-[2px] border bg-panel2 px-2 py-1 text-center text-[13px] text-ink outline-none focus:border-accent ${
            warn ? 'border-amber' : 'border-edge'
          }`}
        />
        <button onClick={() => onChange(value + step)} className="dock-btn w-10 text-base">+</button>
      </div>
    </div>
  );
}

function StatRow({ label, value, tone }: { label: string; value: string; tone?: 'go' | 'nogo' | 'amber' }) {
  const color = tone === 'go' ? 'text-go' : tone === 'nogo' ? 'text-nogo' : tone === 'amber' ? 'text-amber' : 'text-ink';
  return (
    <div className="flex items-center justify-between bg-panel px-3 py-2">
      <span className="text-[9px] tracking-[0.15em] text-dim">{label}</span>
      <span className={`tnum text-[13px] ${color}`}>{value}</span>
    </div>
  );
}
