import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_R, SUN_DIR } from './coords';

// Procedural Earth: fbm-noise continents, day/night terminator from a sun direction, emissive
// city lights on the night side, subtle ocean tint. No external textures (runs fully offline).
const vertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vDir;
  void main() {
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  varying vec3 vNormalW;
  varying vec3 vDir;
  uniform vec3 uSunDir;

  // hash / value-noise / fbm
  float hash(vec3 p){ p = fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float vnoise(vec3 x){
    vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                   mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                   mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p){
    float a=0.5, s=0.0;
    for(int i=0;i<6;i++){ s+=a*vnoise(p); p*=2.02; a*=0.5; }
    return s;
  }

  void main(){
    vec3 n = normalize(vNormalW);
    vec3 d = normalize(vDir);
    // continents
    float c = fbm(d*2.4);
    c += 0.5*fbm(d*6.0);
    float land = smoothstep(0.55, 0.62, c);
    float coast = smoothstep(0.5,0.55,c);

    vec3 ocean = mix(vec3(0.02,0.07,0.16), vec3(0.04,0.13,0.27), coast);
    float veg = fbm(d*9.0+11.0);
    vec3 landCol = mix(vec3(0.20,0.26,0.13), vec3(0.32,0.27,0.18), veg);
    landCol = mix(landCol, vec3(0.85,0.85,0.88), smoothstep(0.78,0.86,c)); // ice/peaks
    vec3 albedo = mix(ocean, landCol, land);

    float sun = dot(n, normalize(uSunDir));
    float day = smoothstep(-0.12, 0.18, sun);

    // city lights on the night side (clustered on land)
    float city = smoothstep(0.6,0.63,c) * step(0.55, fbm(d*42.0));
    vec3 night = vec3(1.0,0.8,0.45) * city * 0.9;

    vec3 col = albedo * (0.06 + 0.94*day);
    col += night * (1.0-day);
    // specular sheen on ocean dayside
    col += (1.0-land) * day * pow(max(sun,0.0),3.0) * vec3(0.1,0.12,0.13);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function Earth() {
  const ref = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({ uSunDir: { value: new THREE.Vector3(...SUN_DIR) } }), []);

  // very slow spin about the orbital-plane normal (Z) — eastward, matching the sim convention
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * 0.004;
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[EARTH_R, 128, 128]} />
      <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} />
    </mesh>
  );
}
