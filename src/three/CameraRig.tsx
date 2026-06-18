import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimStore } from '../store/useSimStore';
import { toScene, rocketDir, EARTH_R, ROCKET_VISUAL_HEIGHT } from './coords';

const tmpPos = new THREE.Vector3();
const tmpTgt = new THREE.Vector3();

/** Smooth multi-mode camera: follow-cam, ground/pad tracking cam, and an orbital map view. */
export default function CameraRig() {
  const { camera } = useThree();
  const curTarget = useRef(new THREE.Vector3(EARTH_R + 2, 0, 0));
  const inited = useRef(false);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const st = useSimStore.getState();
    const sim = st.sim;
    const der = st.derived;
    const mode = st.camera;

    const rp = sim ? toScene(sim.x, sim.y) : [EARTH_R + 1, 0, 0];
    const rocket = tmpTgt.set(rp[0], rp[1], rp[2]);
    const dir = sim ? rocketDir(sim.x, sim.y, sim.bodyPitch) : [1, 0, 0];
    const dirV = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
    const radial = rocket.clone().normalize();

    if (mode === 'follow') {
      const side = new THREE.Vector3(dirV.y, -dirV.x, 0).normalize();
      const dist = ROCKET_VISUAL_HEIGHT * 4.5;
      tmpPos
        .copy(rocket)
        .addScaledVector(side, dist * 0.7)
        .addScaledVector(radial, dist * 0.35)
        .addScaledVector(new THREE.Vector3(0, 0, 1), dist * 0.7);
      curTarget.current.lerp(rocket, 0.2);
    } else if (mode === 'pad') {
      // fixed near the launch site, tracking the vehicle as it rises
      const ground = new THREE.Vector3(EARTH_R, 0, 0);
      const tang = new THREE.Vector3(0, 1, 0);
      tmpPos
        .copy(ground)
        .addScaledVector(tang, 6)
        .addScaledVector(new THREE.Vector3(1, 0, 0), 1.5)
        .addScaledVector(new THREE.Vector3(0, 0, 1), 4);
      curTarget.current.lerp(rocket, 0.1);
    } else {
      // orbital map: frame Earth + the orbit from out of plane
      const apoR = der && isFinite(der.apoapsis) ? (der.apoapsis + 6.371e6) / 1e5 : EARTH_R * 1.2;
      const dist = Math.max(EARTH_R * 2.6, apoR * 1.5);
      tmpPos.copy(new THREE.Vector3(0.25, 0.15, 1).normalize().multiplyScalar(dist));
      curTarget.current.lerp(new THREE.Vector3(0, 0, 0), 0.08);
    }

    if (!inited.current) {
      camera.position.copy(tmpPos);
      inited.current = true;
    } else {
      camera.position.lerp(tmpPos, mode === 'orbit' ? 0.06 : 0.12);
    }
    camera.lookAt(curTarget.current);
  });

  return null;
}
