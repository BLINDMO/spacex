import { Suspense, useState } from 'react';
import { useSimStore } from './store/useSimStore';
import { useGameLoop } from './useGameLoop';
import Scene from './three/Scene';
import MissionSelect from './ui/MissionSelect';
import Builder from './ui/v2/Builder';
import Scores from './ui/v2/Scores';
import BottomNav from './ui/v2/BottomNav';
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
            <div className="absolute top-0 left-0 right-14 lg:left-[300px] lg:right-[320px] z-10">
              <GuidanceCue />
            </div>

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

            <button
              onClick={() => setDrawer(true)}
              className="lg:hidden dock-btn absolute top-2 right-2 z-20 border-accent/60 text-accent bg-panel/90"
            >
              DATA ▾
            </button>
            {drawer && <div className="lg:hidden"><DataDrawer onClose={() => setDrawer(false)} /></div>}

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
  const showNav = mode === 'select' || mode === 'vab' || mode === 'scores';

  return (
    <div className="flex h-full w-full flex-col bg-[#05070a] text-ink font-mono overflow-hidden">
      <div className="relative min-h-0 flex-1">
        {mode === 'select' && <MissionSelect />}
        {mode === 'vab' && <Builder />}
        {mode === 'scores' && <Scores />}
        {(mode === 'prelaunch' || mode === 'flight') && <FlightDeck prelaunch={mode === 'prelaunch'} />}
        {mode === 'summary' && <Summary />}
      </div>
      {showNav && <BottomNav />}
    </div>
  );
}
