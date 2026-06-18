import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useSimStore } from '../store/useSimStore';
import { SCALE } from './coords';

/** The flown trajectory, drawn from the sampled plane positions in the store. */
export default function Trajectory() {
  const traj = useSimStore((s) => s.trajectory);
  const points = useMemo<[number, number, number][]>(
    () => traj.map(([x, y]) => [x / SCALE, y / SCALE, 0]),
    [traj],
  );
  if (points.length < 2) return null;
  return <Line points={points} color="#39c0d6" lineWidth={1.4} transparent opacity={0.85} />;
}
