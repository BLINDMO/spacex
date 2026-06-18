import { useSimStore, selectCanDeploy } from '../store/useSimStore';
import type { TimeWarp, CameraMode } from '../sim/types';
import { num, pct } from './format';

const RAD = 180 / Math.PI;
const DEG = Math.PI / 180;

/** Flight controls bar: autopilot, throttle, pitch, staging, warp, camera. */
export default function FlightControls() {
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

  if (!sim) {
    return (
      <div className="flex items-center justify-center bg-panel border border-edge px-3 py-3 text-[11px] tracking-[0.2em] text-dim">
        FLIGHT CONTROLS OFFLINE
      </div>
    );
  }

  const auto = sim.autopilot;
  const throttleDisplay = auto ? sim.throttle : sim.manualThrottle;
  const pitchDeg = auto ? sim.bodyPitch * RAD : sim.manualPitch * RAD;
  const warps: TimeWarp[] = [1, 5, 20, 100];
  const cameras: CameraMode[] = ['follow', 'pad', 'orbit'];

  return (
    <div className="flex flex-wrap items-stretch gap-2 bg-panel border border-edge p-2">
      {/* Guidance mode */}
      <Group label="GUIDANCE">
        <Btn
          active={auto}
          onClick={toggleAutopilot}
          className={auto ? 'border-accent text-accent' : ''}
        >
          {auto ? 'AUTOPILOT · ENGAGED' : 'MANUAL'}
        </Btn>
      </Group>

      {/* Throttle */}
      <Group label={`THROTTLE · ${pct(throttleDisplay, 0)}`}>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(throttleDisplay * 100)}
          disabled={auto}
          onChange={(e) => setThrottle(Number(e.target.value) / 100)}
          className="w-40 accent-[#39c0d6] disabled:opacity-50"
        />
      </Group>

      {/* Pitch */}
      <Group label={`PITCH · ${num(pitchDeg, 1)}°`}>
        <div className="flex items-center gap-1">
          <Btn
            disabled={auto}
            onClick={() => setPitch(Math.max(0, sim.manualPitch - 1 * DEG))}
          >
            −
          </Btn>
          <input
            type="range"
            min={0}
            max={90}
            step={0.5}
            value={Math.max(0, Math.min(90, pitchDeg))}
            disabled={auto}
            onChange={(e) => setPitch(Number(e.target.value) * DEG)}
            className="w-32 accent-[#39c0d6] disabled:opacity-50"
          />
          <Btn
            disabled={auto}
            onClick={() => setPitch(Math.min(90 * DEG, sim.manualPitch + 1 * DEG))}
          >
            +
          </Btn>
        </div>
      </Group>

      {/* Sequencing */}
      <Group label="SEQUENCE">
        <div className="flex gap-1">
          <Btn onClick={stageNow}>STAGE</Btn>
          <Btn disabled={sim.fairingJettisoned} onClick={jettisonFairing}>
            FAIRING JETT
          </Btn>
          <Btn
            disabled={!canDeploy}
            onClick={deployPayload}
            className={canDeploy ? 'border-go text-go' : ''}
          >
            DEPLOY
          </Btn>
          <Btn onClick={abort} className="border-nogo text-nogo hover:bg-nogo/20">
            ABORT
          </Btn>
        </div>
      </Group>

      {/* Time warp */}
      <Group label="TIME">
        <div className="flex gap-1">
          <Btn active={paused} onClick={togglePause} className={paused ? 'border-amber text-amber' : ''}>
            {paused ? 'PAUSED' : 'PAUSE'}
          </Btn>
          {warps.map((w) => (
            <Btn
              key={w}
              active={!paused && warp === w}
              onClick={() => {
                if (paused) togglePause();
                setWarp(w);
              }}
              className={!paused && warp === w ? 'border-accent text-accent' : ''}
            >
              {w}×
            </Btn>
          ))}
        </div>
      </Group>

      {/* Camera */}
      <Group label="CAMERA">
        <div className="flex gap-1">
          {cameras.map((c) => (
            <Btn
              key={c}
              active={camera === c}
              onClick={() => setCamera(c)}
              className={camera === c ? 'border-accent text-accent' : ''}
            >
              {c.toUpperCase()}
            </Btn>
          ))}
        </div>
      </Group>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] tracking-[0.15em] text-dim">{label}</span>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  active,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-[2px] border border-edge bg-panel2 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-ink transition-colors hover:bg-panel3 disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'bg-panel3' : ''
      } ${className}`}
    >
      {children}
    </button>
  );
}
