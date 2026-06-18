import { useSimStore, selectCanDeploy } from '../store/useSimStore';
import type { TimeWarp, CameraMode } from '../sim/types';
import { num, pct } from './format';

const RAD = 180 / Math.PI;
const DEG = Math.PI / 180;

/** Touch-friendly flight control surface used on every viewport. Large hit targets, a
 *  full-width throttle, direct pitch steering in manual, and clear sequencing/time/camera. */
export default function ControlDock() {
  const sim = useSimStore((s) => s.sim);
  const warp = useSimStore((s) => s.warp);
  const paused = useSimStore((s) => s.paused);
  const camera = useSimStore((s) => s.camera);
  const canDeploy = useSimStore(selectCanDeploy);

  const setThrottle = useSimStore((s) => s.setThrottle);
  const setPitch = useSimStore((s) => s.setPitch);
  const toggleAutopilot = useSimStore((s) => s.toggleAutopilot);
  const stageNow = useSimStore((s) => s.stageNow);
  const jettisonFairing = useSimStore((s) => s.jettisonFairing);
  const deployPayload = useSimStore((s) => s.deployPayload);
  const abort = useSimStore((s) => s.abort);
  const setWarp = useSimStore((s) => s.setWarp);
  const togglePause = useSimStore((s) => s.togglePause);
  const setCamera = useSimStore((s) => s.setCamera);

  if (!sim) return null;
  const auto = sim.autopilot;
  const thr = auto ? sim.throttle : sim.manualThrottle;
  const pitchDeg = (auto ? sim.bodyPitch : sim.manualPitch) * RAD;
  const warps: TimeWarp[] = [1, 5, 20, 100];
  const cams: CameraMode[] = ['follow', 'pad', 'orbit'];

  return (
    <div className="bg-panel/90 border-t border-edge px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
      {/* Top row: guidance + time + camera */}
      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
        <button
          onClick={toggleAutopilot}
          className={`dock-btn flex-1 min-w-[120px] ${auto ? 'border-accent text-accent' : 'border-amber text-amber'}`}
        >
          {auto ? 'AUTOPILOT ◉' : 'MANUAL FLY'}
        </button>
        <div className="flex gap-1">
          <button onClick={togglePause} className={`dock-btn ${paused ? 'border-amber text-amber' : ''}`}>
            {paused ? '▶' : '❚❚'}
          </button>
          {warps.map((w) => (
            <button
              key={w}
              onClick={() => { if (paused) togglePause(); setWarp(w); }}
              className={`dock-btn ${!paused && warp === w ? 'border-accent text-accent' : ''}`}
            >
              {w}×
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {cams.map((c) => (
            <button key={c} onClick={() => setCamera(c)} className={`dock-btn ${camera === c ? 'border-accent text-accent' : ''}`}>
              {c === 'follow' ? 'CHASE' : c === 'pad' ? 'PAD' : 'ORBIT'}
            </button>
          ))}
        </div>
      </div>

      {/* Throttle */}
      <div className="mb-1.5">
        <div className="flex items-center justify-between text-[10px] text-dim mb-0.5">
          <span className="tracking-[0.15em]">THROTTLE</span>
          <span className={`tnum text-sm ${auto ? 'text-dim' : 'text-accent'}`}>{pct(thr, 0)}</span>
        </div>
        <input
          type="range" min={0} max={100} step={1}
          value={Math.round(thr * 100)}
          disabled={auto}
          onChange={(e) => setThrottle(Number(e.target.value) / 100)}
          className="hslider w-full disabled:opacity-40"
        />
      </div>

      {/* Pitch (manual) */}
      <div className={`mb-1.5 ${auto ? 'opacity-40' : ''}`}>
        <div className="flex items-center justify-between text-[10px] text-dim mb-0.5">
          <span className="tracking-[0.15em]">PITCH (above horizon)</span>
          <span className="tnum text-sm text-ink">{num(pitchDeg, 0)}°</span>
        </div>
        <div className="flex items-center gap-2">
          <button disabled={auto} onClick={() => setPitch(Math.max(0, sim.manualPitch - 5 * DEG))} className="dock-btn w-12 text-base">−</button>
          <input
            type="range" min={0} max={90} step={1}
            value={Math.max(0, Math.min(90, pitchDeg))}
            disabled={auto}
            onChange={(e) => setPitch(Number(e.target.value) * DEG)}
            className="hslider flex-1"
          />
          <button disabled={auto} onClick={() => setPitch(Math.min(90 * DEG, sim.manualPitch + 5 * DEG))} className="dock-btn w-12 text-base">+</button>
        </div>
      </div>

      {/* Sequencing actions */}
      <div className="grid grid-cols-4 gap-1.5">
        <button onClick={stageNow} className="dock-btn">STAGE</button>
        <button disabled={sim.fairingJettisoned} onClick={jettisonFairing} className="dock-btn">FAIRING</button>
        <button disabled={!canDeploy} onClick={deployPayload} className={`dock-btn ${canDeploy ? 'border-go text-go animate-pulse' : ''}`}>DEPLOY</button>
        <button onClick={abort} className="dock-btn border-nogo/60 text-nogo">ABORT</button>
      </div>
    </div>
  );
}
