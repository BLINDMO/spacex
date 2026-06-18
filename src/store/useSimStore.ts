import { create } from 'zustand';
import type {
  GameMode,
  CameraMode,
  TimeWarp,
  VehicleDesign,
  SimState,
  DerivedTelemetry,
  EventLogEntry,
  MissionId,
  MissionScore,
} from '../sim/types';
import { MISSIONS } from '../data/missions';
import { SITES } from '../data/sites';
import { VEHICLES, loadVehicle } from '../data/vehicles';
import { ENGINES } from '../data/engines';
import {
  initFlight,
  stepFrame,
  deriveTelemetry,
  evaluateMission,
  meetsTarget,
  type FlightRuntime,
} from '../sim/loop';
import { DEG } from '../sim/constants';

export interface ChartSample {
  t: number;
  alt: number;
  vel: number;
  q: number;
}

const MAX_SAMPLES = 1200;
const MAX_TRAJ = 2000;

interface Station {
  name: string;
  status: 'pending' | 'go' | 'nogo';
}

interface SimStore {
  // ---- mission slice ----
  mode: GameMode;
  missionId: MissionId;
  siteId: string;
  scores: Partial<Record<MissionId, MissionScore>>;

  // ---- design slice ----
  design: VehicleDesign;

  // ---- sim slice ----
  runtime: FlightRuntime | null;
  sim: SimState | null;
  derived: DerivedTelemetry | null;
  score: MissionScore | null;

  // ---- telemetry slice ----
  events: EventLogEntry[];
  samples: ChartSample[];
  trajectory: [number, number][]; // plane coords for the flown path
  lastSampleT: number;

  // ---- ui slice ----
  camera: CameraMode;
  warp: TimeWarp;
  paused: boolean;
  countdown: number; // seconds remaining; >0 during prelaunch
  holding: boolean;
  stations: Station[];

  // ---- actions ----
  selectMission: (id: MissionId) => void;
  setSite: (id: string) => void;
  enterVAB: () => void;
  loadPreset: (id: string) => void;
  setPayload: (kg: number) => void;
  setFairing: (kg: number) => void;
  updateStage: (idx: number, patch: Partial<VehicleDesign['stages'][number]>) => void;
  addStage: () => void;
  removeStage: (idx: number) => void;
  moveStage: (idx: number, dir: -1 | 1) => void;
  enterPrelaunch: () => void;
  beginCountdown: () => void;
  tickCountdown: () => void;
  toggleHold: () => void;
  launch: () => void;
  tick: (renderDt: number) => void;
  setThrottle: (v: number) => void;
  setPitch: (rad: number) => void;
  toggleAutopilot: () => void;
  stageNow: () => void;
  jettisonFairing: () => void;
  deployPayload: () => void;
  abort: () => void;
  setWarp: (w: TimeWarp) => void;
  togglePause: () => void;
  setCamera: (c: CameraMode) => void;
  toSummary: () => void;
  reset: () => void;
}

function defaultDesignFor(missionId: MissionId): VehicleDesign {
  return loadVehicle(MISSIONS[missionId].recommendedVehicle);
}

function freshStations(): Station[] {
  return [
    { name: 'GUIDANCE', status: 'pending' },
    { name: 'PROPULSION', status: 'pending' },
    { name: 'RANGE', status: 'pending' },
    { name: 'TELEMETRY', status: 'pending' },
    { name: 'FLIGHT', status: 'pending' },
  ];
}

export const useSimStore = create<SimStore>((set, get) => ({
  mode: 'select',
  missionId: 'tutorial',
  siteId: MISSIONS.tutorial.recommendedSite,
  scores: {},

  design: defaultDesignFor('tutorial'),

  runtime: null,
  sim: null,
  derived: null,
  score: null,

  events: [],
  samples: [],
  trajectory: [],
  lastSampleT: -1,

  camera: 'follow',
  warp: 1,
  paused: false,
  countdown: 0,
  holding: false,
  stations: freshStations(),

  selectMission: (id) =>
    set({
      missionId: id,
      siteId: MISSIONS[id].recommendedSite,
      design: defaultDesignFor(id),
    }),

  setSite: (id) => set({ siteId: id }),

  enterVAB: () => set({ mode: 'vab' }),

  loadPreset: (id) => set({ design: loadVehicle(id) }),

  setPayload: (kg) => set((s) => ({ design: { ...s.design, payloadMass: Math.max(0, kg) } })),
  setFairing: (kg) => set((s) => ({ design: { ...s.design, fairingMass: Math.max(0, kg) } })),

  updateStage: (idx, patch) =>
    set((s) => {
      const stages = s.design.stages.map((st, i) => (i === idx ? { ...st, ...patch } : st));
      return { design: { ...s.design, stages } };
    }),

  addStage: () =>
    set((s) => {
      const stages = [...s.design.stages];
      stages.push({
        id: `s${stages.length + 1}-${Date.now()}`,
        name: `Stage ${stages.length + 1}`,
        engineId: 'rl10',
        engineCount: 1,
        propMass: 20000,
        dryMass: 2000,
      });
      return { design: { ...s.design, stages } };
    }),

  removeStage: (idx) =>
    set((s) => {
      if (s.design.stages.length <= 1) return {};
      const stages = s.design.stages.filter((_, i) => i !== idx);
      return { design: { ...s.design, stages } };
    }),

  moveStage: (idx, dir) =>
    set((s) => {
      const j = idx + dir;
      if (j < 0 || j >= s.design.stages.length) return {};
      const stages = [...s.design.stages];
      [stages[idx], stages[j]] = [stages[j], stages[idx]];
      return { design: { ...s.design, stages } };
    }),

  enterPrelaunch: () => {
    const { design, missionId, siteId } = get();
    const { runtime, state } = initFlight(design, MISSIONS[missionId], SITES[siteId]);
    set({
      mode: 'prelaunch',
      runtime,
      sim: state,
      derived: deriveTelemetry(state, runtime),
      events: [],
      samples: [],
      trajectory: [],
      lastSampleT: -1,
      score: null,
      countdown: 0,
      holding: false,
      stations: freshStations(),
      warp: 1,
      paused: false,
      camera: 'follow',
    });
  },

  beginCountdown: () => set({ countdown: 15, holding: false }),

  toggleHold: () => set((s) => ({ holding: !s.holding })),

  tickCountdown: () => {
    const { countdown, holding, stations } = get();
    if (holding || countdown <= 0) return;
    const next = countdown - 1;
    // Poll stations GO as the count proceeds (one per second from T-12)
    const order = [12, 10, 8, 6, 4];
    const newStations = stations.map((st, i) =>
      next <= order[i] && st.status === 'pending' ? { ...st, status: 'go' as const } : st,
    );
    set({ countdown: next, stations: newStations });
    if (next <= 0) get().launch();
  },

  launch: () =>
    set((s) => {
      if (!s.sim) return {};
      const sim = { ...s.sim, launched: true, t: 0 };
      return {
        mode: 'flight',
        sim,
        countdown: 0,
        events: [...s.events, { t: 0, label: 'LAUNCH COMMIT', kind: 'good' as const }],
      };
    }),

  tick: (renderDt) => {
    const { sim, runtime, paused, warp, mode } = get();
    if (!sim || !runtime || mode !== 'flight' || paused || warp === 0) return;
    if (sim.failed || sim.payloadDeployed) return;

    const simSeconds = Math.min(renderDt, 0.05) * warp;
    const { events } = stepFrame(sim, runtime, simSeconds);
    const derived = deriveTelemetry(sim, runtime);

    // sample charts + trajectory at limited cadence
    const st = get();
    let samples = st.samples;
    let trajectory = st.trajectory;
    let lastSampleT = st.lastSampleT;
    if (sim.t - lastSampleT >= 0.2 || lastSampleT < 0) {
      samples = [
        ...samples,
        { t: sim.t, alt: derived.altitude, vel: derived.speedSurface, q: derived.q },
      ].slice(-MAX_SAMPLES);
      trajectory = [...trajectory, [sim.x, sim.y] as [number, number]].slice(-MAX_TRAJ);
      lastSampleT = sim.t;
    }

    const newEvents = events.length ? [...st.events, ...events] : st.events;

    // failure -> summary
    if (sim.failed) {
      const score = evaluateMission(sim, derived, runtime);
      set({
        sim: { ...sim },
        derived,
        events: newEvents,
        samples,
        trajectory,
        lastSampleT,
        score,
        scores: bestScore(st.scores, st.missionId, score),
      });
      return;
    }

    set({ sim: { ...sim }, derived, events: newEvents, samples, trajectory, lastSampleT });
  },

  setThrottle: (v) =>
    set((s) => (s.sim ? { sim: { ...s.sim, manualThrottle: Math.max(0, Math.min(1, v)) } } : {})),

  setPitch: (rad) => set((s) => (s.sim ? { sim: { ...s.sim, manualPitch: rad } } : {})),

  toggleAutopilot: () =>
    set((s) => {
      if (!s.sim) return {};
      const autopilot = !s.sim.autopilot;
      // when switching to manual, seed manual commands from current body state
      const manualPitch = autopilot ? s.sim.manualPitch : s.sim.bodyPitch;
      const manualThrottle = autopilot ? s.sim.manualThrottle : s.sim.throttle;
      return { sim: { ...s.sim, autopilot, manualPitch, manualThrottle } };
    }),

  stageNow: () =>
    set((s) => {
      if (!s.sim || !s.runtime) return {};
      if (s.sim.activeStage >= s.runtime.stages.length) return {};
      const idx = s.sim.activeStage;
      const sim = { ...s.sim, activeStage: idx + 1 };
      const label =
        idx + 1 < s.runtime.stages.length
          ? `Stage ${idx + 1} separation (manual) · Stage ${idx + 2} ignition`
          : 'Final stage separation (manual)';
      return { sim, events: [...s.events, { t: s.sim.t, label, kind: 'info' as const }] };
    }),

  jettisonFairing: () =>
    set((s) => {
      if (!s.sim || s.sim.fairingJettisoned) return {};
      return {
        sim: { ...s.sim, fairingJettisoned: true },
        events: [...s.events, { t: s.sim.t, label: 'Fairing jettison (manual)', kind: 'info' as const }],
      };
    }),

  deployPayload: () =>
    set((s) => {
      if (!s.sim || !s.runtime || !s.derived) return {};
      const sim = { ...s.sim, payloadDeployed: true };
      const score = evaluateMission(sim, s.derived, s.runtime);
      return {
        sim,
        score,
        mode: 'summary',
        events: [...s.events, { t: s.sim.t, label: 'Payload deployed', kind: 'good' as const }],
        scores: bestScore(s.scores, s.missionId, score),
      };
    }),

  abort: () =>
    set((s) => {
      if (!s.sim || !s.runtime || !s.derived) return {};
      const sim = { ...s.sim, failed: true, failReason: 'Mission aborted by Flight' };
      const score = evaluateMission(sim, s.derived, s.runtime);
      return {
        sim,
        score,
        events: [...s.events, { t: s.sim.t, label: 'ABORT', kind: 'bad' as const }],
        scores: bestScore(s.scores, s.missionId, score),
      };
    }),

  setWarp: (w) => set({ warp: w }),
  togglePause: () => set((s) => ({ paused: !s.paused })),
  setCamera: (c) => set({ camera: c }),

  toSummary: () => set({ mode: 'summary' }),

  reset: () =>
    set((s) => ({
      mode: 'select',
      runtime: null,
      sim: null,
      derived: null,
      score: null,
      events: [],
      samples: [],
      trajectory: [],
      lastSampleT: -1,
      warp: 1,
      paused: false,
      countdown: 0,
      holding: false,
      stations: freshStations(),
      design: defaultDesignFor(s.missionId),
    })),
}));

function bestScore(
  scores: Partial<Record<MissionId, MissionScore>>,
  id: MissionId,
  score: MissionScore,
): Partial<Record<MissionId, MissionScore>> {
  const prev = scores[id];
  if (!prev || score.total > prev.total) return { ...scores, [id]: score };
  return scores;
}

// Re-export catalog handles for UI convenience
export { MISSIONS, SITES, VEHICLES, ENGINES, DEG };

/** True if the current flight orbit meets the mission target (deploy enabled). */
export function selectCanDeploy(s: SimStore): boolean {
  if (!s.derived || !s.runtime || !s.sim) return false;
  if (s.sim.payloadDeployed || s.sim.failed) return false;
  return meetsTarget(s.derived, s.runtime);
}
