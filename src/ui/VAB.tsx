import { useSimStore } from '../store/useSimStore';
import { MISSIONS } from '../store/useSimStore';
import { VEHICLE_LIST } from '../data/vehicles';
import { ENGINE_LIST } from '../data/engines';
import { computeVehicleStats } from '../sim/vehicle';
import { num, dv } from './format';

/** Vehicle Assembly Building: editable stack + live performance readouts. */
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
  const dvOk = stats.totalDvVac >= mission.advisoryDv;
  const twrOk = stats.liftoffTWR >= 1.2;

  const back = () => useSimStore.setState({ mode: 'select' });

  // render upper stage on top -> reverse indices for display
  const order = design.stages.map((_, i) => i).reverse();

  return (
    <div className="crt flex h-full w-full flex-col overflow-auto bg-[#05070a] text-ink">
      <div className="flex items-center justify-between border-b border-edge bg-panel px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm tracking-[0.35em] text-accent">VEHICLE ASSEMBLY</span>
          <span className="text-[10px] tracking-[0.2em] text-dim">{mission.name}</span>
        </div>
        <button
          type="button"
          onClick={back}
          className="rounded-[2px] border border-edge bg-panel2 px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-ink hover:bg-panel3"
        >
          ◂ BACK
        </button>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap items-center gap-2 border-b border-edge bg-panel px-4 py-2">
        <span className="text-[9px] tracking-[0.2em] text-dim">PRESETS</span>
        {VEHICLE_LIST.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => loadPreset(v.id)}
            className={`rounded-[2px] border px-2 py-1 text-[10px] uppercase tracking-[0.1em] hover:bg-panel3 ${
              design.id === v.id ? 'border-accent text-accent' : 'border-edge bg-panel2 text-ink'
            }`}
          >
            {v.name}
          </button>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-[1fr_320px] gap-px bg-edge">
        {/* Stack editor */}
        <div className="flex flex-col gap-px overflow-auto bg-edge">
          {/* Payload + fairing */}
          <div className="grid grid-cols-2 gap-px bg-edge">
            <NumField label="PAYLOAD MASS (kg)" value={design.payloadMass} onChange={setPayload} />
            <NumField label="FAIRING MASS (kg)" value={design.fairingMass} onChange={setFairing} />
          </div>

          {order.map((i, displayIdx) => {
            const st = design.stages[i];
            return (
              <div key={st.id} className="bg-panel p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] tracking-[0.2em] text-dim">
                    STAGE S{i + 1} {displayIdx === 0 ? '· UPPER' : i === 0 ? '· FIRST' : ''}
                  </span>
                  <div className="flex gap-1">
                    <MiniBtn onClick={() => moveStage(i, 1)}>▲</MiniBtn>
                    <MiniBtn onClick={() => moveStage(i, -1)}>▼</MiniBtn>
                    <MiniBtn onClick={() => removeStage(i)} danger>
                      ✕
                    </MiniBtn>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  <div className="col-span-2 md:col-span-1">
                    <Label>NAME</Label>
                    <input
                      type="text"
                      value={st.name}
                      onChange={(e) => updateStage(i, { name: e.target.value })}
                      className="w-full rounded-[2px] border border-edge bg-panel2 px-2 py-1 text-[12px] text-ink outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <Label>ENGINE</Label>
                    <select
                      value={st.engineId}
                      onChange={(e) => updateStage(i, { engineId: e.target.value })}
                      className="w-full rounded-[2px] border border-edge bg-panel2 px-2 py-1 text-[12px] text-ink outline-none focus:border-accent"
                    >
                      {ENGINE_LIST.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <InlineNum
                    label="ENGINE COUNT"
                    value={st.engineCount}
                    onChange={(v) => updateStage(i, { engineCount: Math.max(1, Math.round(v)) })}
                  />
                  <InlineNum
                    label="PROPELLANT (kg)"
                    value={st.propMass}
                    onChange={(v) => updateStage(i, { propMass: Math.max(0, v) })}
                  />
                  <InlineNum
                    label="DRY MASS (kg)"
                    value={st.dryMass}
                    onChange={(v) => updateStage(i, { dryMass: Math.max(0, v) })}
                  />
                </div>
              </div>
            );
          })}

          <div className="bg-panel p-3">
            <button
              type="button"
              onClick={addStage}
              className="rounded-[2px] border border-edge bg-panel2 px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-ink hover:bg-panel3"
            >
              + ADD STAGE
            </button>
          </div>
        </div>

        {/* Readouts */}
        <div className="flex flex-col gap-px overflow-auto bg-edge">
          <div className="bg-panel px-3 py-2 text-[10px] tracking-[0.2em] text-dim">PERFORMANCE</div>

          <StatRow label="TOTAL MASS" value={`${num(stats.totalMass / 1000, 1)} t`} />
          <StatRow
            label="TOTAL ΔV (VAC)"
            value={dv(stats.totalDvVac)}
            tone={dvOk ? 'go' : 'nogo'}
          />
          <StatRow
            label="REQUIRED ΔV"
            value={dv(mission.advisoryDv)}
          />
          <StatRow
            label="ΔV MARGIN"
            value={`${num(stats.totalDvVac - mission.advisoryDv, 0)} m/s`}
            tone={dvOk ? 'go' : 'nogo'}
          />
          <StatRow
            label="LIFTOFF TWR"
            value={num(stats.liftoffTWR, 2)}
            tone={twrOk ? 'go' : 'amber'}
          />
          {!twrOk && (
            <div className="bg-panel px-3 py-1 text-[10px] text-amber">
              ⚠ LIFTOFF TWR &lt; 1.20 — vehicle may not clear the pad cleanly.
            </div>
          )}
          {!dvOk && (
            <div className="bg-panel px-3 py-1 text-[10px] text-nogo">
              ⚠ TOTAL ΔV BELOW ADVISORY — orbit unlikely without margin.
            </div>
          )}

          <div className="bg-panel px-3 py-2 text-[10px] tracking-[0.2em] text-dim">
            PER-STAGE (VACUUM)
          </div>
          {stats.stages.map((s) => (
            <div key={s.index} className="bg-panel px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-ink">
                  S{s.index + 1} · {s.name}
                </span>
                <span className="text-[9px] text-dim">
                  {s.engineCount}× {s.engineName}
                </span>
              </div>
              <div className="mt-1 grid grid-cols-3 gap-1 text-[10px]">
                <KV k="ΔV" v={dv(s.dvVac)} />
                <KV
                  k="TWR(SL)"
                  v={num(s.twrSeaLevel, 2)}
                  tone={s.index === 0 && s.twrSeaLevel < 1.2 ? 'amber' : undefined}
                />
                <KV k="BURN" v={`${num(s.burnTime, 0)} s`} />
              </div>
            </div>
          ))}

          <div className="bg-panel px-3 py-2 text-[10px] text-dim">
            Propellant total:{' '}
            <span className="tnum text-ink">
              {num(stats.stages.reduce((a, s) => a + s.propMass, 0) / 1000, 1)} t
            </span>
          </div>

          <div className="bg-panel p-3">
            <button
              type="button"
              onClick={enterPrelaunch}
              className="w-full rounded-[2px] border border-accent bg-accent/10 px-4 py-2 text-[12px] uppercase tracking-[0.2em] text-accent transition-colors hover:bg-accent/20"
            >
              PROCEED TO PAD ▸
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-[2px] text-[9px] tracking-[0.15em] text-dim">{children}</div>;
}

function InlineNum({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="tnum w-full rounded-[2px] border border-edge bg-panel2 px-2 py-1 text-[12px] text-ink outline-none focus:border-accent"
      />
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="bg-panel p-3">
      <Label>{label}</Label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="tnum w-full rounded-[2px] border border-edge bg-panel2 px-2 py-1 text-[13px] text-ink outline-none focus:border-accent"
      />
    </div>
  );
}

function MiniBtn({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[2px] border border-edge bg-panel2 px-2 py-[2px] text-[10px] hover:bg-panel3 ${
        danger ? 'text-nogo' : 'text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function StatRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'go' | 'nogo' | 'amber';
}) {
  const color =
    tone === 'go' ? 'text-go' : tone === 'nogo' ? 'text-nogo' : tone === 'amber' ? 'text-amber' : 'text-ink';
  return (
    <div className="flex items-center justify-between bg-panel px-3 py-2">
      <span className="text-[9px] tracking-[0.15em] text-dim">{label}</span>
      <span className={`tnum text-[13px] ${color}`}>{value}</span>
    </div>
  );
}

function KV({ k, v, tone }: { k: string; v: string; tone?: 'amber' }) {
  return (
    <div>
      <div className="text-[8px] tracking-[0.1em] text-dim">{k}</div>
      <div className={`tnum text-[11px] ${tone === 'amber' ? 'text-amber' : 'text-ink'}`}>{v}</div>
    </div>
  );
}
