import { Suspense, useState } from 'react';
import { useSimStore } from './store/useSimStore';
import { useGameLoop } from './useGameLoop';
import Scene from './three/Scene';
import MissionSelect from './ui/MissionSelect';
import VAB from './ui/VAB';
import Countdown from './ui/Countdown';
import Summary from './ui/Summary';
import AttitudeIndicator from './ui/AttitudeIndicator';
import Telemetry from './ui/Telemetry';
import StripCharts from './ui/StripCharts';
import DvBudget from './ui/DvBudget';
import StageBoard from './ui/StageBoard';
import EventLog from './ui/EventLog';
import HudBar from './ui/HudBar';
import ControlDock from './ui/ControlDock';
import DataDrawer from './ui/DataDrawer';
import StepNav from './ui/StepNav';
import GuidanceCue from './ui/GuidanceCue';

function MissionBar() {
  const mission = useSimStore((s) => s.runtime?.mission ?? null);
  const site = useSimStore((s) => s.siteId);
  const reset = useSimStore((s) => s.reset);
  return (
    <div className="flex items-center justify-between px-3 py-1 bg-panel/90 border-b border-edge text-[11px]">
      <button onClick={reset} className="text-accent tracking-[0.3em] hover:text-ink">◂ MC</button>
      <div className="text-dim tnum truncate ml-2">
        {mission ? mission.name : '—'} <span className="text-edge">·</span> {site.toUpperCase()}
      </div>
    </div>
  );
}

/** Live 3D flight deck. Desktop shows persistent instrument columns; phones show a compact
 *  HUD + a toggleable data drawer, with a large touch control dock on every size. */
function FlightDeck({ prelaunch }: { prelaunch: boolean }) {
  const [drawer, setDrawer] = useState(false);
  return (
    <div className="absolute inset-0 flex flex-col">
      <MissionBar />
      <HudBar />
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0">
          <Suspense fallback={<div className="h-full w-full grid place-items-center text-dim text-xs">INITIALIZING SCENE…</div>}>
            <Scene />
          </Suspense>
        </div>

        {prelaunch ? (
          <div className="absolute inset-0 flex flex-col items-center justify-start sm:justify-center gap-2 p-3 overflow-y-auto">
            <div className="w-full max-w-[440px]"><StepNav current="pad" /></div>
            <Countdown />
          </div>
        ) : (
          <>
            {/* Coached flight-director cue (leaves room for the DATA toggle on mobile) */}
            <div className="absolute top-0 left-0 right-14 lg:left-[300px] lg:right-[320px] z-10">
              <GuidanceCue />
            </div>

            {/* Desktop instrument columns (only on genuinely large screens) */}
            <div className="hidden lg:flex absolute top-0 left-0 h-full w-[300px] flex-col gap-px overflow-y-auto bg-panel/70 border-r border-edge">
              <AttitudeIndicator />
              <Telemetry />
              <DvBudget />
            </div>
            <div className="hidden lg:flex absolute top-0 right-0 h-full w-[320px] flex-col gap-px overflow-y-auto bg-panel/70 border-l border-edge">
              <StageBoard />
              <StripCharts />
              <EventLog />
            </div>

            {/* Mobile/tablet: floating DATA toggle */}
            <button
              onClick={() => setDrawer(true)}
              className="lg:hidden dock-btn absolute top-2 right-2 z-20 border-accent/60 text-accent bg-panel/90"
            >
              DATA ▾
            </button>

            {drawer && <div className="lg:hidden"><DataDrawer onClose={() => setDrawer(false)} /></div>}

            {/* Control dock: bottom bar between columns on desktop, full-width on mobile */}
            <div className="absolute bottom-0 left-0 right-0 lg:left-[300px] lg:right-[320px] z-20">
              <ControlDock />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  useGameLoop();
  const mode = useSimStore((s) => s.mode);
  return (
    <div className="h-full w-full bg-[#05070a] text-ink font-mono overflow-hidden">
      {mode === 'select' && <MissionSelect />}
      {mode === 'vab' && <VAB />}
      {(mode === 'prelaunch' || mode === 'flight') && <FlightDeck prelaunch={mode === 'prelaunch'} />}
      {mode === 'summary' && <Summary />}
    </div>
  );
}
