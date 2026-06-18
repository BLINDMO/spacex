import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { SUN_DIR } from './coords';
import Starfield from './Starfield';
import Earth from './Earth';
import Atmosphere from './Atmosphere';
import Rocket from './Rocket';
import Exhaust from './Exhaust';
import LaunchPad from './LaunchPad';
import Trajectory from './Trajectory';
import OrbitOverlay from './OrbitOverlay';
import CameraRig from './CameraRig';

/** The 3D scene: quality Earth + atmosphere, starfield, proportioned rocket with reactive
 *  plume, flown trajectory + orbit overlay, and the multi-mode camera rig. Tasteful bloom is
 *  applied only to the bright plume/atmosphere. */
export default function Scene() {
  return (
    <Canvas
      gl={{ antialias: true, logarithmicDepthBuffer: true, toneMapping: THREE.ACESFilmicToneMapping }}
      camera={{ fov: 50, near: 0.02, far: 60000, position: [70, 0, 8] }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#05070a']} />
      <ambientLight intensity={0.12} />
      <directionalLight position={[SUN_DIR[0] * 1000, SUN_DIR[1] * 1000, SUN_DIR[2] * 1000]} intensity={2.4} />
      <Starfield />
      <Earth />
      <Atmosphere />
      <LaunchPad />
      <Trajectory />
      <OrbitOverlay />
      <Rocket />
      <Exhaust />
      <CameraRig />
      <EffectComposer>
        <Bloom intensity={0.7} luminanceThreshold={0.55} luminanceSmoothing={0.2} mipmapBlur radius={0.6} />
      </EffectComposer>
    </Canvas>
  );
}
