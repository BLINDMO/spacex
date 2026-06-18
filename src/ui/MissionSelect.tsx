import { useSimStore, isMissionUnlocked } from '../store/useSimStore';
import { MISSIONS, SITES } from '../store/useSimStore';
import { MISSION_LIST } from '../data/missions';
import { SITE_LIST } from '../data/sites';
import { VEHICLES } from '../data/vehicles';
import { dist, num } from './format';
import StepNav from './StepNav';

/** Full-screen mission selection / briefing screen. */
export default function MissionSelect() {
  const missionId = useSimStore((s) => s.missionId);
  const siteId = useSimStore((s) => s.siteId);
  const scores = useSimStore((s) => s.scores);
  const selectMission = useSimStore((s) => s.selectMission);
  const setSite = useSimStore((s) => s.setSite);
  const enterVAB = useSimStore((s) => s.enterVAB);
  const loadPreset = useSimStore((s) => s.loadPreset);
  const enterPrelaunch = useSimStore((s) => s.enterPrelaunch);

  const quickStart = () => {
    loadPreset(mission.recommendedVehicle);
    setSite(mission.recommendedSite);
    enterPrelaunch();
  };

  const mission = MISSIONS[missionId];
  const site = SITES[siteId];
  const best = scores[missionId];
  const recVehicle = VEHICLES[mission.recommendedVehicle];

  return (
    <div className="crt flex h-full w-full flex-col overflow-auto bg-[#05070a] text-ink">
      {/* Title bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-edge bg-panel px-4 py-2">
        <span className="text-sm tracking-[0.35em] text-accent">MISSION CONTROL</span>
        <span className="hidden sm:inline text-[10px] tracking-[0.2em] text-dim">ORBITAL LAUNCH SIMULATOR</span>
        <div className="ml-auto"><StepNav current="mission" /></div>
      </div>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[340px_1fr] gap-px bg-edge">
        {/* Mission list */}
        <div className="flex flex-col bg-panel">
          <div className="border-b border-edge px-3 py-2 text-[10px] tracking-[0.2em] text-dim">
            MISSION MANIFEST
          </div>
          <div className="flex flex-col">
            {MISSION_LIST.map((m) => {
              const sel = m.id === missionId;
              const ms = scores[m.id];
              const unlocked = isMissionUnlocked(scores, m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => unlocked && selectMission(m.id)}
                  className={`flex items-center gap-3 border-b border-grid px-4 py-3 text-left transition-colors ${
                    unlocked ? 'active:bg-panel3 hover:bg-panel2' : 'opacity-50'
                  } ${sel ? 'border-l-[3px] border-l-accent bg-panel2' : 'border-l-[3px] border-l-transparent'}`}
                >
                  <MissionGlyph mission={m} active={sel} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${sel ? 'text-accent' : 'text-ink'}`}>{m.name}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        {!unlocked && <span className="border border-edge px-1 text-[8px] tracking-[0.15em] text-dim">LOCKED</span>}
                        {m.tutorial && <span className="border border-edge px-1 text-[8px] tracking-[0.15em] text-amber">TUT</span>}
                        {m.crewed && <span className="border border-edge px-1 text-[8px] tracking-[0.15em] text-go">CREW</span>}
                      </div>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-[10px] text-dim">
                      <span className="truncate">
                        {unlocked ? `${dist(m.targetApoapsis)} × ${num(m.targetInclination, 1)}°` : 'Score 400+ on the prior mission to unlock'}
                      </span>
                      {ms && <span className="tnum shrink-0 text-go">BEST {num(ms.total, 0)}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Briefing */}
        <div className="flex flex-col gap-px overflow-auto bg-edge">
          <div className="bg-panel p-4">
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-lg tracking-[0.1em] text-ink">{mission.name}</h2>
              {mission.tutorial && (
                <span className="border border-edge px-1 text-[9px] tracking-[0.2em] text-amber">TUTORIAL</span>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <MiniOrbit mission={mission} />
              <p className="flex-1 text-[12.5px] leading-relaxed text-dim">{mission.summary}</p>
            </div>
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

          <div className="bg-panel p-4 flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={quickStart} className="dock-btn flex-1 min-h-[48px] border-go text-go text-[12px] tracking-[0.15em]">
                QUICK START — RECOMMENDED SETUP ▸
              </button>
              <button onClick={enterVAB} className="dock-btn flex-1 min-h-[48px] border-accent text-accent text-[12px] tracking-[0.15em]">
                BUILD VEHICLE ▸
              </button>
            </div>
            <div className="text-[10px] text-dim">
              Quick Start flies the recommended {VEHICLES[mission.recommendedVehicle]?.name?.split(' (')[0] ?? 'vehicle'} from{' '}
              {SITES[mission.recommendedSite]?.name ?? mission.recommendedSite}. Or build your own.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// log-scaled orbit radius (scene px) from an apsis altitude — keeps LEO..lunar all on screen
function orbitR(earthR: number, altM: number, span: number): number {
  const km = Math.max(0, altM) / 1000;
  return earthR + 4 + span * Math.min(1, Math.log10(1 + km / 150) / Math.log10(1 + 400000 / 150));
}

/** Tiny per-mission orbit glyph shown on each manifest card. */
function MissionGlyph({ mission, active }: { mission: (typeof MISSION_LIST)[number]; active: boolean }) {
  const c = 17;
  const er = 6;
  const rA = orbitR(er, mission.targetApoapsis, 9);
  const rP = orbitR(er, mission.targetPeriapsis, 9);
  const col = active ? '#39c0d6' : '#6b7c88';
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" className="shrink-0">
      <circle cx={c} cy={c} r={er} fill="#16323f" stroke="#2a3742" />
      <ellipse cx={c} cy={c} rx={(rA + rP) / 2} ry={rP} fill="none" stroke={col} strokeWidth="1.2" opacity="0.9" />
    </svg>
  );
}

/** Larger target-orbit diagram for the briefing: Earth + the target ellipse + apsis markers. */
function MiniOrbit({ mission }: { mission: (typeof MISSION_LIST)[number] }) {
  const S = 116;
  const c = S / 2;
  const er = 16;
  const span = 36;
  const rA = orbitR(er, mission.targetApoapsis, span);
  const rP = orbitR(er, mission.targetPeriapsis, span);
  const rx = (rA + rP) / 2;
  const cx = c - (rA - rP) / 2; // offset so Earth sits at a focus-ish point
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="shrink-0 self-center rounded border border-edge bg-[#070b0f]">
      <defs>
        <radialGradient id="eg" cx="40%" cy="40%">
          <stop offset="0%" stopColor="#1d4a63" />
          <stop offset="100%" stopColor="#0c2230" />
        </radialGradient>
      </defs>
      <ellipse cx={cx} cy={c} rx={rx} ry={rP} fill="none" stroke="#39c0d6" strokeWidth="1.4" opacity="0.9" />
      <circle cx={c} cy={c} r={er} fill="url(#eg)" stroke="#2a3742" />
      {/* apsis markers */}
      <circle cx={cx - rx} cy={c} r="2.2" fill="#e0a020" />
      <circle cx={cx + rx} cy={c} r="2.2" fill="#35c66b" />
      <text x={c} y={S - 5} textAnchor="middle" fontSize="8" fill="#6b7c88" fontFamily="monospace">
        {num(mission.targetInclination, 1)}° INC
      </text>
    </svg>
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
