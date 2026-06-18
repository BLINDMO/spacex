import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useSimStore } from '../store/useSimStore';
import { MU_EARTH } from '../sim/constants';
import { SCALE } from './coords';

/** Sample an ellipse (focus at Earth center) given semi-major axis, eccentricity and the
 *  periapsis argument (rad), returned in scene units. */
function ellipse(a: number, e: number, omega: number): [number, number, number][] {
  if (!isFinite(a) || a <= 0) return [];
  const p = a * (1 - e * e);
  const pts: [number, number, number][] = [];
  const steps = 180;
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const r = p / (1 + e * Math.cos(theta));
    if (r <= 0) continue;
    const ang = omega + theta;
    pts.push([(r * Math.cos(ang)) / SCALE, (r * Math.sin(ang)) / SCALE, 0]);
  }
  return pts;
}

/** Current orbit ellipse + target orbit overlay (shown once the vehicle is in space). */
export default function OrbitOverlay() {
  const sim = useSimStore((s) => s.sim);
  const derived = useSimStore((s) => s.derived);
  const runtime = useSimStore((s) => s.runtime);

  const current = useMemo(() => {
    if (!sim || !derived || derived.altitude < 60e3 || !isFinite(derived.sma) || derived.sma <= 0) return [];
    // argument of periapsis from the eccentricity vector
    const r = Math.hypot(sim.x, sim.y);
    const v2 = sim.vx * sim.vx + sim.vy * sim.vy;
    const rv = sim.x * sim.vx + sim.y * sim.vy;
    const ex = ((v2 - MU_EARTH / r) * sim.x - rv * sim.vx) / MU_EARTH;
    const ey = ((v2 - MU_EARTH / r) * sim.y - rv * sim.vy) / MU_EARTH;
    const omega = Math.hypot(ex, ey) > 1e-4 ? Math.atan2(ey, ex) : Math.atan2(sim.y, sim.x);
    return ellipse(derived.sma, Math.min(derived.ecc, 0.999), omega);
  }, [sim, derived]);

  const target = useMemo(() => {
    if (!runtime) return [];
    // Only show the target orbit once climbing out of the lower atmosphere, otherwise the huge
    // ellipse streaks across the close-up pad/ascent view and just looks like noise.
    if (!derived || derived.altitude < 45e3) return [];
    const a = (runtime.targetApoR + runtime.targetPeriR) / 2;
    const e = (runtime.targetApoR - runtime.targetPeriR) / (runtime.targetApoR + runtime.targetPeriR);
    return ellipse(a, e, 0);
  }, [runtime, derived]);

  return (
    <>
      {target.length > 1 && (
        <Line points={target} color="#e0a020" lineWidth={1} dashed dashSize={2} gapSize={1.5} transparent opacity={0.6} />
      )}
      {current.length > 1 && <Line points={current} color="#7fe3f0" lineWidth={1.6} transparent opacity={0.9} />}
    </>
  );
}
