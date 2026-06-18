import { useSimStore } from '../store/useSimStore';
import { MISSIONS, SITES } from '../store/useSimStore';
import { MISSION_LIST } from '../data/missions';
import { SITE_LIST } from '../data/sites';
import { VEHICLES } from '../data/vehicles';
import { dist, num } from './format';

/** Full-screen mission selection / briefing screen. */
export default function MissionSelect() {
  const missionId = useSimStore((s) => s.missionId);
  const siteId = useSimStore((s) => s.siteId);
  const scores = useSimStore((s) => s.scores);
  const selectMission = useSimStore((s) => s.selectMission);
  const setSite = useSimStore((s) => s.setSite);
  const enterVAB = useSimStore((s) => s.enterVAB);

  const mission = MISSIONS[missionId];
  const site = SITES[siteId];
  const best = scores[missionId];
  const recVehicle = VEHICLES[mission.recommendedVehicle];

  return (
    <div className="crt flex h-full w-full flex-col overflow-auto bg-[#05070a] text-ink">
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-edge bg-panel px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm tracking-[0.35em] text-accent">MISSION CONTROL</span>
          <span className="text-[10px] tracking-[0.2em] text-dim">ORBITAL LAUNCH SIMULATOR</span>
        </div>
        <span className="text-[10px] tracking-[0.2em] text-dim">FLIGHT DIRECTOR CONSOLE</span>
      </div>

      <div className="grid flex-1 grid-cols-[360px_1fr] gap-px bg-edge">
        {/* Mission list */}
        <div className="flex flex-col bg-panel">
          <div className="border-b border-edge px-3 py-2 text-[10px] tracking-[0.2em] text-dim">
            MISSION MANIFEST
          </div>
          <div className="flex flex-col">
            {MISSION_LIST.map((m) => {
              const sel = m.id === missionId;
              const ms = scores[m.id];
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => selectMission(m.id)}
                  className={`flex flex-col gap-1 border-b border-grid px-3 py-2 text-left transition-colors hover:bg-panel2 ${
                    sel ? 'border-l-2 border-l-accent bg-panel2' : 'border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[12px] ${sel ? 'text-accent' : 'text-ink'}`}>
                      {m.name}
                    </span>
                    <div className="flex items-center gap-1">
                      {m.tutorial && (
                        <span className="border border-edge px-1 text-[8px] tracking-[0.15em] text-amber">
                          TUTORIAL
                        </span>
                      )}
                      {m.crewed && (
                        <span className="border border-edge px-1 text-[8px] tracking-[0.15em] text-go">
                          CREW
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-dim">
                    <span>
                      {dist(m.targetApoapsis)} × {num(m.targetInclination, 1)}°
                    </span>
                    {ms && <span className="tnum text-go">BEST {num(ms.total, 0)}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Briefing */}
        <div className="flex flex-col gap-px overflow-auto bg-edge">
          <div className="bg-panel p-4">
            <div className="mb-1 flex items-center gap-2">
              <h2 className="text-lg tracking-[0.1em] text-ink">{mission.name}</h2>
              {mission.tutorial && (
                <span className="border border-edge px-1 text-[9px] tracking-[0.2em] text-amber">
                  TUTORIAL
                </span>
              )}
            </div>
            <p className="max-w-3xl text-[12px] leading-relaxed text-dim">{mission.summary}</p>
          </div>

          <div className="grid grid-cols-2 gap-px bg-edge md:grid-cols-3">
            <Stat label="TARGET APOAPSIS" value={dist(mission.targetApoapsis)} />
            <Stat label="TARGET PERIAPSIS" value={dist(mission.targetPeriapsis)} />
            <Stat label="TARGET INCLINATION" value={`${num(mission.targetInclination, 1)}°`} />
            <Stat label="PAYLOAD MASS" value={`${num(mission.payloadMass, 0)} kg`} />
            <Stat label="CREWED" value={mission.crewed ? 'YES' : 'NO'} tone={mission.crewed ? 'go' : undefined} />
            <Stat label="ADVISORY ΔV" value={`${num(mission.advisoryDv, 0)} m/s`} />
            <Stat label="ALT TOLERANCE" value={`± ${dist(mission.altTolerance)}`} />
            <Stat label="INC TOLERANCE" value={`± ${num(mission.incTolerance, 1)}°`} />
            <Stat label="TRANSFER BURN" value={mission.transfer ? 'REQUIRED' : 'NONE'} />
          </div>

          <div className="grid grid-cols-2 gap-px bg-edge">
            <div className="bg-panel p-3">
              <div className="text-[9px] tracking-[0.2em] text-dim">RECOMMENDED VEHICLE</div>
              <div className="mt-1 text-[13px] text-accent">
                {recVehicle ? recVehicle.name : mission.recommendedVehicle}
              </div>
            </div>
            <div className="bg-panel p-3">
              <div className="text-[9px] tracking-[0.2em] text-dim">BEST SCORE</div>
              <div className="mt-1 text-[13px] text-go tnum">
                {best ? `${num(best.total, 0)} / 1000 · ${best.passed ? 'PASS' : 'FAIL'}` : '— NO ATTEMPT'}
              </div>
            </div>
          </div>

          {/* Site selector */}
          <div className="bg-panel p-4">
            <div className="mb-2 text-[10px] tracking-[0.2em] text-dim">LAUNCH SITE SELECTION</div>
            <div className="flex flex-col gap-px bg-edge">
              {SITE_LIST.map((s) => {
                const sel = s.id === siteId;
                const rec = s.id === mission.recommendedSite;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSite(s.id)}
                    className={`flex items-start justify-between gap-3 bg-panel px-3 py-2 text-left transition-colors hover:bg-panel2 ${
                      sel ? 'border-l-2 border-l-accent' : 'border-l-2 border-l-transparent'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[12px] ${sel ? 'text-accent' : 'text-ink'}`}>
                          {s.name}
                        </span>
                        {rec && (
                          <span className="border border-edge px-1 text-[8px] tracking-[0.15em] text-go">
                            RECOMMENDED
                          </span>
                        )}
                      </div>
                      <div className="mt-[2px] max-w-2xl text-[10px] text-dim">{s.blurb}</div>
                    </div>
                    <span className="tnum shrink-0 text-[11px] text-dim">
                      LAT {num(s.latitude, 1)}°
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-panel p-4">
            <button
              type="button"
              onClick={enterVAB}
              className="rounded-[2px] border border-accent bg-accent/10 px-5 py-2 text-[12px] uppercase tracking-[0.2em] text-accent transition-colors hover:bg-accent/20"
            >
              PROCEED TO VEHICLE ASSEMBLY ▸
            </button>
            <div className="mt-2 text-[10px] text-dim">
              Selected site: {site ? site.name : siteId}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'go' }) {
  return (
    <div className="bg-panel p-3">
      <div className="text-[9px] tracking-[0.15em] text-dim">{label}</div>
      <div className={`tnum mt-1 text-[14px] ${tone === 'go' ? 'text-go' : 'text-ink'}`}>{value}</div>
    </div>
  );
}
