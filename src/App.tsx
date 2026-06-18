import { useSimStore } from './store/useSimStore';

// Phase 1 shell — mode routing scaffold. Each mode renders its screen; the screens are
// implemented in later phases. This boots cleanly with the store wired.
export default function App() {
  const mode = useSimStore((s) => s.mode);
  return (
    <div className="h-full w-full bg-[#05070a] text-ink font-mono flex items-center justify-center">
      <div className="text-center">
        <div className="text-accent tracking-[0.4em] text-sm mb-2">MISSION CONTROL</div>
        <div className="text-dim text-xs">Orbital Launch Simulator · boot ok · mode: {mode}</div>
      </div>
    </div>
  );
}
