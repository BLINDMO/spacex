import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimStore } from '../store/useSimStore';
import { toScene, rocketDir, EARTH_R, ROCKET_VISUAL_HEIGHT } from './coords';

const tmpPos = new THREE.Vector3();

/** Smooth multi-mode camera: a cinematic liftoff/chase cam that keeps the whole vehicle and
 *  its plume framed against the Earth, a fixed ground/pad cam, and an orbital map view. */
export default function CameraRig() {
  const { camera } = useThree();
  const curTarget = useRef(new THREE.Vector3(EARTH_R + 2, 0, 0));
  const curPos = useRef(new THREE.Vector3(EARTH_R + 6, 6, 6));
  const inited = useRef(false);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const st = useSimStore.getState();
    const sim = st.sim;
    const der = st.derived;
    const mode = st.camera;

    const rp = sim ? toScene(sim.x, sim.y) : [EARTH_R + 1, 0, 0];
    const rocket = new THREE.Vector3(rp[0], rp[1], rp[2]);
    const dir = sim ? rocketDir(sim.x, sim.y, sim.bodyPitch) : [1, 0, 0];
    const up = rocket.clone().normalize(); // local "up" (radial, away from Earth)
    const fwd = new THREE.Vector3(-up.y, up.x, 0).normalize(); // prograde-horizontal
    const outOfPlane = new THREE.Vector3(0, 0, 1); // view the ascent in profile
    const alt = der ? der.altitude : 0;

    let wantPos = tmpPos;
    let wantTarget = new THREE.Vector3();

    if (mode === 'follow') {
      // Cinematic chase: stand off to the side (mostly out-of-plane for a profile view), a
      // touch below the vehicle's altitude so the Earth fills the lower frame and the rocket
      // rises through it. Pull back as we climb so the whole stack + plume stay in shot.
      const D = ROCKET_VISUAL_HEIGHT * (3.6 + Math.min(2.5, alt / 120e3));
      wantPos
        .copy(rocket)
        .addScaledVector(outOfPlane, D * 0.92)
        .addScaledVector(fwd, D * 0.32)
        .addScaledVector(up, -D * 0.12);
      // aim a little above the base so the vehicle sits centre-frame with plume below
      wantTarget.copy(rocket).addScaledVector(up, ROCKET_VISUAL_HEIGHT * 0.15);
    } else if (mode === 'pad') {
      // Fixed ground camera beside the pad, tracking the vehicle as it climbs away.
      const ground = up.clone().multiplyScalar(EARTH_R);
      wantPos
        .copy(ground)
        .addScaledVector(fwd, ROCKET_VISUAL_HEIGHT * 2.2)
        .addScaledVector(outOfPlane, ROCKET_VISUAL_HEIGHT * 4.5)
        .addScaledVector(up, ROCKET_VISUAL_HEIGHT * 1.2);
      wantTarget.copy(rocket);
    } else {
      // Orbital map: frame Earth + the orbit from out of plane.
      const apoR = der && isFinite(der.apoapsis) ? (der.apoapsis + 6.371e6) / 1e5 : EARTH_R * 1.2;
      const D = Math.max(EARTH_R * 2.6, apoR * 1.5);
      wantPos.copy(new THREE.Vector3(0.25, 0.15, 1).normalize().multiplyScalar(D));
      wantTarget.set(0, 0, 0);
    }

    if (!inited.current) {
      curPos.current.copy(wantPos);
      curTarget.current.copy(wantTarget);
      inited.current = true;
    } else {
      const lp = mode === 'orbit' ? 0.06 : 0.1;
      curPos.current.lerp(wantPos, lp);
      curTarget.current.lerp(wantTarget, mode === 'follow' ? 0.18 : 0.1);
    }
    camera.position.copy(curPos.current);
    camera.up.copy(up); // keep "up" pointing away from Earth so the horizon reads correctly
    camera.lookAt(curTarget.current);
  });

  return null;
}
