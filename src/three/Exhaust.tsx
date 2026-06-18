import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimStore } from '../store/useSimStore';
import { toScene, rocketDir, ROCKET_VISUAL_HEIGHT } from './coords';

// Throttle-reactive engine plume built from recycled additive particles (instanced via a
// single Points buffer). Cuts sharply at MECO/SECO; widens in near-vacuum (mach-diamond-ish
// look from the bright banded core). Bloom is applied by the post-processing pass in Scene.
const N = 260;

export default function Exhaust() {
  const pts = useRef<THREE.Points>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  const { geom, pos, age, vel, col } = useMemo(() => {
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const age = new Float32Array(N).fill(999);
    const vel = new Float32Array(N * 3);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return { geom, pos, age, vel, col };
  }, []);

  let cursor = 0;

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const st = useSimStore.getState();
    const sim = st.sim;
    const der = st.derived;
    const firing =
      !!sim &&
      sim.launched &&
      !sim.failed &&
      sim.throttle > 0.02 &&
      st.runtime != null &&
      sim.activeStage < st.runtime.stages.length &&
      (sim.stagePropRemaining[sim.activeStage] ?? 0) > 0;

    const thr = firing ? sim!.throttle : 0;
    const base = sim ? toScene(sim.x, sim.y) : [0, 0, 0];
    const d = sim ? rocketDir(sim.x, sim.y, sim.bodyPitch) : [0, 1, 0];
    // plume shoots opposite the nose direction
    const back = new THREE.Vector3(-d[0], -d[1], -d[2]);
    const vacuum = der ? 1 - Math.min(1, der.ambientPressure / 101325) : 0;

    // emit
    if (firing) {
      const emit = Math.ceil(thr * 10);
      const len = ROCKET_VISUAL_HEIGHT * (0.5 + thr * 0.7);
      for (let k = 0; k < emit; k++) {
        const i = cursor % N;
        cursor++;
        const o = base;
        const spread = ROCKET_VISUAL_HEIGHT * (0.02 + vacuum * 0.05);
        pos[i * 3] = o[0] + (Math.random() - 0.5) * spread;
        pos[i * 3 + 1] = o[1] + (Math.random() - 0.5) * spread;
        pos[i * 3 + 2] = o[2] + (Math.random() - 0.5) * spread;
        const sp = len * (0.7 + Math.random() * 0.6);
        vel[i * 3] = back.x * sp + (Math.random() - 0.5) * spread * 4;
        vel[i * 3 + 1] = back.y * sp + (Math.random() - 0.5) * spread * 4;
        vel[i * 3 + 2] = back.z * sp + (Math.random() - 0.5) * spread * 4;
        age[i] = 0;
      }
    }

    // integrate + color by age (white-hot core -> orange -> smoke)
    for (let i = 0; i < N; i++) {
      if (age[i] > 1.2) {
        col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0;
        continue;
      }
      age[i] += dt;
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      const a = age[i];
      const f = Math.max(0, 1 - a / 1.2);
      // hot bluish-white near nozzle, orange mid, dark fade
      col[i * 3] = (1.0) * f;
      col[i * 3 + 1] = (0.55 + 0.35 * f) * f;
      col[i * 3 + 2] = (0.25 + 0.6 * Math.max(0, 1 - a * 4)) * f;
    }
    geom.attributes.position.needsUpdate = true;
    geom.attributes.color.needsUpdate = true;

    // bright core cone right at the nozzle, scaled by throttle
    const core = coreRef.current;
    if (core) {
      core.visible = firing;
      if (firing && sim) {
        core.position.set(base[0], base[1], base[2]);
        core.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), back);
        const s = 0.5 + thr * 0.8;
        core.scale.set(s, s * (0.7 + vacuum * 0.6), s);
      }
    }
  });

  return (
    <>
      <points ref={pts} geometry={geom}>
        <pointsMaterial
          size={ROCKET_VISUAL_HEIGHT * 0.12}
          sizeAttenuation
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <mesh ref={coreRef} visible={false}>
        <coneGeometry args={[ROCKET_VISUAL_HEIGHT * 0.07, ROCKET_VISUAL_HEIGHT * 0.5, 16, 1, true]} />
        <meshBasicMaterial color={'#bfe0ff'} transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </>
  );
}
