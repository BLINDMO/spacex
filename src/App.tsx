import { Suspense } from 'react';
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
import FlightControls from './ui/FlightControls';

// Top bar shown over the live 3D scene during prelaunch/flight.
function MissionBar() {
  const mission = useSimStore((s) => s.runtime?.mission ?? null);
  const site = useSimStore((s) => s.siteId);
  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-panel/90 border-b border-edge text-xs">
      <div className="text-accent tracking-[0.35em]">MISSION CONTROL</div>
      <div className="text-dim tnum">
        {mission ? mission.name : '—'} <span className="text-edge">·</span> SITE {site.toUpperCase()}
      </div>
    </div>
  );
}

/** The flight deck: live 3D scene with the instrument suite overlaid in a mission-ops layout. */
function FlightDeck({ prelaunch }: { prelaunch: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col">
      <MissionBar />
      <div className="relative flex-1 min-h-0">
        {/* 3D scene fills the deck */}
        <div className="absolute inset-0">
          <Suspense fallback={<div className="h-full w-full grid place-items-center text-dim text-xs">INITIALIZING SCENE…</div>}>
            <Scene />
          </Suspense>
        </div>

        {prelaunch ? (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="pointer-events-auto">
              <Countdown />
            </div>
          </div>
        ) : (
          <>
            {/* Left instrument column */}
            <div className="absolute top-0 left-0 h-full w-[300px] flex flex-col gap-px overflow-y-auto bg-panel/70 border-r border-edge">
              <AttitudeIndicator />
              <Telemetry />
              <DvBudget />
            </div>
            {/* Right instrument column */}
            <div className="absolute top-0 right-0 h-full w-[320px] flex flex-col gap-px overflow-y-auto bg-panel/70 border-l border-edge">
              <StageBoard />
              <StripCharts />
              <EventLog />
            </div>
            {/* Bottom control bar */}
            <div className="absolute bottom-0 left-[300px] right-[320px]">
              <FlightControls />
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
