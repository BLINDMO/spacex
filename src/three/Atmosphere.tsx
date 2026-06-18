import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_R, SUN_DIR } from './coords';

// A physically-motivated atmospheric rim: a slightly larger additive shell whose brightness
// follows a fresnel term (limb glow) and the sun direction (brighter on the lit limb).
const vertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vWorld;
  void main(){
    vNormalW = normalize(mat3(modelMatrix)*normal);
    vWorld = (modelMatrix*vec4(position,1.0)).xyz;
    gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);
  }
`;
const fragment = /* glsl */ `
  precision highp float;
  varying vec3 vNormalW;
  varying vec3 vWorld;
  uniform vec3 uSunDir;
  uniform vec3 uCam;
  void main(){
    vec3 n=normalize(vNormalW);
    vec3 v=normalize(uCam - vWorld);
    float fres = pow(1.0 - max(dot(n,v),0.0), 2.5);
    float sun = smoothstep(-0.35,0.5,dot(n, normalize(uSunDir)));
    vec3 col = mix(vec3(0.15,0.32,0.7), vec3(0.4,0.6,1.0), sun);
    float a = fres * (0.25 + 0.75*sun);
    gl_FragColor = vec4(col, a);
  }
`;

export default function Atmosphere() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ uSunDir: { value: new THREE.Vector3(...SUN_DIR) }, uCam: { value: new THREE.Vector3() } }),
    [],
  );
  useFrame((state) => {
    if (matRef.current) matRef.current.uniforms.uCam.value.copy(state.camera.position);
  });
  return (
    <mesh>
      <sphereGeometry args={[EARTH_R * 1.03, 96, 96]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        side={THREE.FrontSide}
        depthWrite={false}
      />
    </mesh>
  );
}
