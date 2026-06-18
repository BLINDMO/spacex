import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimStore } from '../store/useSimStore';
import { toScene, rocketDir, ROCKET_VISUAL_HEIGHT } from './coords';

// PBR-ish materials (metallic, restrained — not toy plastic)
const matBody = new THREE.MeshStandardMaterial({ color: '#c8ccd2', metalness: 0.7, roughness: 0.4 });
const matDark = new THREE.MeshStandardMaterial({ color: '#3a4048', metalness: 0.6, roughness: 0.5 });
const matNozzle = new THREE.MeshStandardMaterial({ color: '#5a5e64', metalness: 0.9, roughness: 0.3 });
const matFairing = new THREE.MeshStandardMaterial({ color: '#e6e8ec', metalness: 0.3, roughness: 0.55 });
const matPayload = new THREE.MeshStandardMaterial({ color: '#caa23a', metalness: 0.5, roughness: 0.4, emissive: '#1a1405' });

interface Debris {
  mesh: THREE.Group;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  life: number;
}

const UP = new THREE.Vector3(0, 1, 0);

/** Build a stage segment (body + a couple of detail bands). radius/height in scene units. */
function stageMesh(radius: number, height: number, withFins: boolean, nozzles: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), matBody);
  g.add(body);
  // dark band near top (interstage look)
  const band = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.01, radius * 1.01, height * 0.06, 24), matDark);
  band.position.y = height * 0.45;
  g.add(band);
  // nozzles at the base
  for (let i = 0; i < nozzles; i++) {
    const noz = new THREE.Mesh(new THREE.ConeGeometry(radius * (nozzles > 1 ? 0.22 : 0.4), height * 0.12, 16, 1, true), matNozzle);
    noz.position.y = -height / 2 - height * 0.05;
    if (nozzles > 1) {
      const a = (i / nozzles) * Math.PI * 2;
      noz.position.x = Math.cos(a) * radius * 0.5;
      noz.position.z = Math.sin(a) * radius * 0.5;
    }
    g.add(noz);
  }
  if (withFins) {
    for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.08, height * 0.16, radius * 0.9), matDark);
      const a = (i / 4) * Math.PI * 2;
      fin.position.set(Math.cos(a) * radius, -height * 0.4, Math.sin(a) * radius);
      fin.rotation.y = -a;
      g.add(fin);
    }
  }
  return g;
}

export default function Rocket() {
  const group = useRef<THREE.Group>(null);
  const stackRef = useRef<THREE.Group>(null);
  const debrisRef = useRef<Debris[]>([]);
  const debrisParent = useRef<THREE.Group>(null);
  const prevStage = useRef<number>(0);
  const prevFairing = useRef<boolean>(false);

  const nStages = useSimStore((s) => s.runtime?.stages.length ?? 2);
  const engineCounts = useSimStore(
    (s) => s.runtime?.stages.map((st) => st.engineCount).join(',') ?? '9,1',
  );
  const activeStage = useSimStore((s) => s.sim?.activeStage ?? 0);
  const fairingJettisoned = useSimStore((s) => s.sim?.fairingJettisoned ?? false);
  const payloadDeployed = useSimStore((s) => s.sim?.payloadDeployed ?? false);

  // Layout for the full stack (bottom -> top). Recomputed when the stack/active stage changes.
  const layout = useMemo(() => {
    const counts = engineCounts.split(',').map((n) => parseInt(n, 10) || 1);
    const h = ROCKET_VISUAL_HEIGHT;
    const segs: { y: number; radius: number; height: number; fins: boolean; nozzles: number; idx: number }[] = [];
    // distribute height: lower stages larger
    const weights = Array.from({ length: nStages }, (_, i) => Math.pow(0.62, i));
    const wsum = weights.reduce((a, b) => a + b, 0);
    let y = 0;
    const baseR = h * 0.085;
    for (let i = 0; i < nStages; i++) {
      const sh = (weights[i] / wsum) * h * 0.78;
      const radius = baseR * Math.pow(0.82, i);
      segs.push({ y: y + sh / 2, radius, height: sh, fins: i === 0, nozzles: counts[i] ?? 1, idx: i });
      y += sh + h * 0.01;
    }
    return { segs, topY: y, baseR };
  }, [nStages, engineCounts]);

  // Build current attached stack (stages >= activeStage) + fairing/payload nose
  const stackContent = useMemo(() => {
    const g = new THREE.Group();
    for (const s of layout.segs) {
      if (s.idx < activeStage) continue;
      const m = stageMesh(s.radius, s.height, s.fins && s.idx === activeStage, s.nozzles);
      m.position.y = s.y;
      g.add(m);
    }
    // nose: fairing (splittable) or deployed payload
    const noseY = layout.topY;
    const topR = layout.segs[layout.segs.length - 1].radius;
    if (!fairingJettisoned) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(topR, ROCKET_VISUAL_HEIGHT * 0.14, 24), matFairing);
      cone.position.y = noseY + ROCKET_VISUAL_HEIGHT * 0.07;
      g.add(cone);
    } else if (!payloadDeployed) {
      const pl = new THREE.Mesh(new THREE.BoxGeometry(topR * 1.1, ROCKET_VISUAL_HEIGHT * 0.08, topR * 1.1), matPayload);
      pl.position.y = noseY + ROCKET_VISUAL_HEIGHT * 0.04;
      g.add(pl);
    }
    return g;
  }, [layout, activeStage, fairingJettisoned, payloadDeployed]);

  // attach stack content to the stack group
  useMemo(() => {
    const parent = stackRef.current;
    if (parent) {
      while (parent.children.length) parent.remove(parent.children[0]);
      parent.add(stackContent);
    }
  }, [stackContent]);

  function spawnDebris(maker: () => THREE.Group, vel: THREE.Vector3) {
    const parent = debrisParent.current;
    if (!parent) return;
    const mesh = maker();
    const g = group.current;
    if (g) {
      // place at current rocket world transform
      mesh.position.copy(g.position);
      mesh.quaternion.copy(g.quaternion);
    }
    parent.add(mesh);
    debrisRef.current.push({
      mesh,
      vel,
      spin: new THREE.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5),
      life: 8,
    });
    while (debrisRef.current.length > 6) {
      const d = debrisRef.current.shift()!;
      d.mesh.parent?.remove(d.mesh);
    }
  }

  useFrame((_, dt) => {
    const st = useSimStore.getState();
    const sim = st.sim;
    const g = group.current;
    if (!g || !sim) return;

    // transform from sim state
    const p = toScene(sim.x, sim.y);
    g.position.set(p[0], p[1], p[2]);
    const d = rocketDir(sim.x, sim.y, sim.bodyPitch);
    g.quaternion.setFromUnitVectors(UP, new THREE.Vector3(d[0], d[1], d[2]).normalize());

    // detect staging -> spawn tumbling spent booster
    if (sim.activeStage > prevStage.current) {
      const droppedIdx = prevStage.current;
      const seg = layout.segs[droppedIdx];
      if (seg) {
        const velDir = new THREE.Vector3(d[0], d[1], d[2]).multiplyScalar(-0.18);
        spawnDebris(() => stageMesh(seg.radius, seg.height, seg.fins, seg.nozzles), velDir.add(
          new THREE.Vector3((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1),
        ));
      }
      prevStage.current = sim.activeStage;
    }
    // detect fairing jettison -> two half shells fly off sideways
    if (sim.fairingJettisoned && !prevFairing.current) {
      const side = new THREE.Vector3(d[1], -d[0], 0).normalize();
      const topR = layout.segs[layout.segs.length - 1].radius;
      for (const s of [1, -1]) {
        spawnDebris(() => {
          const half = new THREE.Mesh(
            new THREE.ConeGeometry(topR, ROCKET_VISUAL_HEIGHT * 0.14, 12, 1, false, 0, Math.PI),
            matFairing,
          );
          half.position.y = layout.topY + ROCKET_VISUAL_HEIGHT * 0.07;
          const grp = new THREE.Group();
          grp.add(half);
          return grp;
        }, side.clone().multiplyScalar(0.12 * s));
      }
      prevFairing.current = sim.fairingJettisoned;
    }
    // reset latches when a new flight starts (activeStage back to 0)
    if (sim.activeStage === 0 && prevStage.current !== 0) prevStage.current = 0;
    if (!sim.fairingJettisoned && prevFairing.current) prevFairing.current = false;

    // integrate debris (drift + gentle fall toward planet + tumble, then fade out)
    const list = debrisRef.current;
    for (let i = list.length - 1; i >= 0; i--) {
      const o = list[i];
      o.life -= dt;
      const toCenter = o.mesh.position.clone().multiplyScalar(-1).normalize().multiplyScalar(0.05 * dt);
      o.vel.add(toCenter);
      o.mesh.position.addScaledVector(o.vel, dt * 6);
      o.mesh.rotation.x += o.spin.x * dt;
      o.mesh.rotation.y += o.spin.y * dt;
      o.mesh.rotation.z += o.spin.z * dt;
      if (o.life <= 0) {
        o.mesh.parent?.remove(o.mesh);
        list.splice(i, 1);
      }
    }
  });

  return (
    <>
      <group ref={group}>
        <group ref={stackRef} />
      </group>
      <group ref={debrisParent} />
    </>
  );
}
