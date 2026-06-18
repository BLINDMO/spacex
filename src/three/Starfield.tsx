import { useMemo } from 'react';
import * as THREE from 'three';

/** A large inverted sphere of points — a calm, realistic starfield (no twinkle, varied mag). */
export default function Starfield() {
  const geom = useMemo(() => {
    const N = 4000;
    const positions = new Float32Array(N * 3);
    const colors = new Float32Array(N * 3);
    const R = 8000;
    for (let i = 0; i < N; i++) {
      // uniform on sphere
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const x = R * Math.sin(phi) * Math.cos(theta);
      const y = R * Math.sin(phi) * Math.sin(theta);
      const z = R * Math.cos(phi);
      positions.set([x, y, z], i * 3);
      // mostly white-blue, a few warm, varied brightness
      const mag = 0.4 + Math.pow(Math.random(), 3) * 0.6;
      const warm = Math.random() < 0.15;
      colors.set(warm ? [mag, mag * 0.85, mag * 0.7] : [mag * 0.85, mag * 0.92, mag], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);

  return (
    <points geometry={geom}>
      <pointsMaterial size={6} sizeAttenuation vertexColors transparent depthWrite={false} />
    </points>
  );
}
