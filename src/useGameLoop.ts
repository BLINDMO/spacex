import { useEffect } from 'react';
import { useSimStore } from './store/useSimStore';

/**
 * Drives the simulation from a requestAnimationFrame loop, DECOUPLED from rendering: each
 * animation frame we hand the wall-clock delta to the store, which sub-steps the fixed-rate
 * (240 Hz) physics integrator internally. Also runs the 1 Hz prelaunch countdown.
 */
export function useGameLoop(): void {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      // clamp pathological deltas (tab switches) so we never integrate a huge jump
      useSimStore.getState().tick(Math.min(dt, 0.1));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // 1 Hz countdown timer (only advances during prelaunch, respecting holds)
  useEffect(() => {
    const id = setInterval(() => {
      const s = useSimStore.getState();
      if (s.mode === 'prelaunch' && s.countdown > 0 && !s.holding) {
        s.tickCountdown();
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);
}
