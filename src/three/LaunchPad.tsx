import { useMemo } from 'react';
import * as THREE from 'three';
import { EARTH_R, ROCKET_VISUAL_HEIGHT } from './coords';

// A small launch mount + tower at the pad so liftoff has visible context and scale.
const metal = new THREE.MeshStandardMaterial({ color: '#39424b', metalness: 0.7, roughness: 0.6 });
const dark = new THREE.MeshStandardMaterial({ color: '#20262c', metalness: 0.5, roughness: 0.8 });

export default function LaunchPad() {
  const quat = useMemo(() => {
    // mount's local +Y points along the surface normal at the launch site (+X in world)
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
  }, []);

  const h = ROCKET_VISUAL_HEIGHT;
  return (
    <group position={[EARTH_R, 0, 0]} quaternion={quat}>
      {/* concrete deck */}
      <mesh position={[0, h * 0.02, 0]}>
        <cylinderGeometry args={[h * 0.5, h * 0.55, h * 0.04, 24]} />
        <meshStandardMaterial color="#2a2f35" metalness={0.2} roughness={0.95} />
      </mesh>
      {/* launch ring / flame trench rim */}
      <mesh position={[0, h * 0.06, 0]}>
        <torusGeometry args={[h * 0.16, h * 0.03, 12, 24]} />
        <primitive object={metal} attach="material" />
      </mesh>
      {/* service tower beside the pad */}
      <group position={[h * 0.32, 0, 0]}>
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * h * 0.05, h * 0.45, Math.sin(a) * h * 0.05]}>
              <boxGeometry args={[h * 0.012, h * 0.9, h * 0.012]} />
              <primitive object={dark} attach="material" />
            </mesh>
          );
        })}
        {[0.2, 0.45, 0.7, 0.9].map((y) => (
          <mesh key={y} position={[0, h * y, 0]}>
            <boxGeometry args={[h * 0.11, h * 0.012, h * 0.11]} />
            <primitive object={dark} attach="material" />
          </mesh>
        ))}
      </group>
    </group>
  );
}
