import * as THREE from 'three';
import { SeasonId, StreetLampItem, TimeOfDayId } from '../generator/types';
import { getSeasonPalette } from './SovietMaterials';

export interface SkyDomeController {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  updateConfig: (season: SeasonId, timeOfDay: TimeOfDayId) => void;
  updateTime: (elapsed: number) => void;
}

/**
 * 1. Procedural Atmospheric Sky Dome Shader (Шейдер неба с облаками, закатным/вечерним заревом и звёздами)
 */
export function createSovietSkyDome(): SkyDomeController {
  const uniforms = {
    uTime: { value: 0 },
    uZenithColor: { value: new THREE.Color('#10192b') },
    uHorizonColor: { value: new THREE.Color('#2b3954') },
    uGlowColor: { value: new THREE.Color('#e07a38') },
    uCloudColor: { value: new THREE.Color('#32415c') },
    uSunDir: { value: new THREE.Vector3(0.55, 0.25, 0.45).normalize() },
    uStarIntensity: { value: 0.85 },
    uCloudDensity: { value: 0.55 },
  };

  const vertexShader = `
    varying vec3 vWorldPos;
    varying vec3 vDir;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      vDir = normalize(position);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    uniform vec3 uZenithColor;
    uniform vec3 uHorizonColor;
    uniform vec3 uGlowColor;
    uniform vec3 uCloudColor;
    uniform vec3 uSunDir;
    uniform float uStarIntensity;
    uniform float uCloudDensity;

    varying vec3 vWorldPos;
    varying vec3 vDir;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    float noise2D(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash21(i);
      float b = hash21(i + vec2(1.0, 0.0));
      float c = hash21(i + vec2(0.0, 1.0));
      float d = hash21(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float amp = 0.5;
      for (int i = 0; i < 4; i++) {
        v += amp * noise2D(p);
        p *= 2.04;
        amp *= 0.5;
      }
      return v;
    }

    void main() {
      vec3 dir = normalize(vDir);
      float elev = clamp(dir.y, 0.0, 1.0);

      // Vertical sky gradient from horizon to zenith
      float horizonFactor = pow(1.0 - elev, 2.4);
      vec3 skyCol = mix(uZenithColor, uHorizonColor, horizonFactor);

      // Warm sodium city-glow band along low horizon + solar/lunar directional glow
      float sunAlignment = max(0.0, dot(dir, uSunDir));
      float directionalGlow = pow(sunAlignment, 6.0) * 0.55 + pow(sunAlignment, 48.0) * 0.65;
      float cityHorizonBand = exp(-elev * 9.5) * 0.65;
      skyCol += uGlowColor * (directionalGlow + cityHorizonBand * 0.55);

      // Procedural stars in upper hemisphere during evening/night
      if (uStarIntensity > 0.01 && elev > 0.08) {
        vec2 starUv = dir.xz / (dir.y + 0.35) * 95.0;
        vec2 starCell = floor(starUv);
        float starRnd = hash21(starCell);
        if (starRnd > 0.965) {
          vec2 starCenter = fract(starUv) - 0.5;
          float dist = length(starCenter);
          float twinkle = 0.65 + 0.35 * sin(uTime * 2.4 + starRnd * 62.8);
          float starSpark = smoothstep(0.18, 0.02, dist) * twinkle * smoothstep(0.08, 0.35, elev);
          skyCol += vec3(0.92, 0.95, 1.0) * starSpark * uStarIntensity;
        }
      }

      // Drifting FBM Cumulus / Stratocumulus clouds
      if (elev > 0.03) {
        vec2 cloudUv = dir.xz / (dir.y + 0.22) * 1.45 + vec2(uTime * 0.012, uTime * 0.006);
        float n = fbm(cloudUv);
        float cloudMask = smoothstep(1.0 - uCloudDensity, 1.0, n) * smoothstep(0.03, 0.22, elev);
        vec3 litCloud = mix(uCloudColor, uGlowColor * 1.15, directionalGlow * 0.65);
        skyCol = mix(skyCol, litCloud, cloudMask * 0.72);
      }

      gl_FragColor = vec4(skyCol, 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(460, 32, 20), material);

  const updateConfig = (season: SeasonId, timeOfDay: TimeOfDayId) => {
    const palette = getSeasonPalette(season);
    if (timeOfDay === 'night') {
      // Authentic late-Soviet evening sky: deep indigo zenith, warm sodium city glow on horizon
      uniforms.uZenithColor.value.set('#0a111f');
      uniforms.uHorizonColor.value.set('#1b273d');
      uniforms.uGlowColor.value.set('#d97836');
      uniforms.uCloudColor.value.set('#1f2c42');
      uniforms.uSunDir.value.set(-0.55, 0.35, -0.45).normalize();
      uniforms.uStarIntensity.value = 0.95;
      uniforms.uCloudDensity.value = 0.48;
    } else if (timeOfDay === 'sunset') {
      uniforms.uZenithColor.value.set('#283654');
      uniforms.uHorizonColor.value.set('#b85d43');
      uniforms.uGlowColor.value.set('#ff9947');
      uniforms.uCloudColor.value.set('#cf7959');
      uniforms.uSunDir.value.set(0.75, 0.16, 0.48).normalize();
      uniforms.uStarIntensity.value = 0.25;
      uniforms.uCloudDensity.value = 0.58;
    } else {
      uniforms.uZenithColor.value.set(palette.skyTop);
      uniforms.uHorizonColor.value.set(palette.fogColor);
      uniforms.uGlowColor.value.set('#fff2d6');
      uniforms.uCloudColor.value.set('#f2f4f7');
      uniforms.uSunDir.value.set(0.55, 0.65, 0.45).normalize();
      uniforms.uStarIntensity.value = 0.0;
      uniforms.uCloudDensity.value = season === 'autumn' || season === 'winter' ? 0.65 : 0.52;
    }
  };

  const updateTime = (elapsed: number) => {
    uniforms.uTime.value = elapsed;
  };

  return { mesh, material, updateConfig, updateTime };
}

/**
 * 2. Procedural Wind-Rippled Grass & Courtyard Lawn Shader (Шейдер газона с ветровыми волнами и пятнами света от фонарей)
 */
export function createGrassLawnShaderMaterial(
  season: SeasonId,
  timeOfDay: TimeOfDayId,
  streetLamps: StreetLampItem[]
): THREE.ShaderMaterial {
  const palette = getSeasonPalette(season);
  const isEvening = timeOfDay === 'night' || timeOfDay === 'sunset';

  // Pack up to 22 streetlamp XZ positions into vec3 array (x, z, radius)
  const maxLamps = 22;
  const lampArray: THREE.Vector3[] = [];
  for (let i = 0; i < maxLamps; i++) {
    const l = streetLamps[i];
    if (l) {
      // Lamp head projects slightly forward along rotation
      const lx = l.x + Math.sin(l.rotation) * 1.2;
      const lz = l.z + Math.cos(l.rotation) * 1.2;
      lampArray.push(new THREE.Vector3(lx, lz, 14.5));
    } else {
      lampArray.push(new THREE.Vector3(9999, 9999, 1.0));
    }
  }

  const baseColor = new THREE.Color(
    season === 'winter'
      ? '#cfd8e3'
      : season === 'autumn'
      ? '#3d5734'
      : '#3b6132'
  );
  const tipColor = new THREE.Color(
    season === 'winter'
      ? '#e8f0f8'
      : season === 'autumn'
      ? '#6e7838'
      : '#659648'
  );

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBaseColor: { value: baseColor },
      uTipColor: { value: tipColor },
      uAmbientDim: {
        value: timeOfDay === 'night' ? 0.36 : timeOfDay === 'sunset' ? 0.68 : 1.0,
      },
      uLampIntensity: {
        value: timeOfDay === 'night' ? 1.25 : timeOfDay === 'sunset' ? 0.55 : 0.0,
      },
      uLampColor: { value: new THREE.Color('#ffa847') },
      uLamps: { value: lampArray },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uBaseColor;
      uniform vec3 uTipColor;
      uniform float uAmbientDim;
      uniform float uLampIntensity;
      uniform vec3 uLampColor;
      uniform vec3 uLamps[${maxLamps}];

      varying vec2 vUv;
      varying vec3 vWorldPos;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      void main() {
        vec2 wp = vWorldPos.xz;

        // Multi-scale grass patch variation + wind wave ripple
        float patchNoise = noise(wp * 0.14);
        float microBlade = noise(wp * 2.8 + vec2(sin(uTime * 1.5 + wp.x * 0.2) * 0.35, cos(uTime * 1.2 + wp.y * 0.2) * 0.35));
        float windWave = 0.5 + 0.5 * sin(wp.x * 0.18 + wp.y * 0.14 + uTime * 1.9 + patchNoise * 3.0);

        vec3 col = mix(uBaseColor, uTipColor, patchNoise * 0.52 + microBlade * 0.38);
        col *= (0.90 + windWave * 0.18);
        col *= uAmbientDim;

        // Warm sodium streetlamp pools on the courtyard lawn in evening/night mode
        if (uLampIntensity > 0.01) {
          float totalLamp = 0.0;
          for (int i = 0; i < ${maxLamps}; i++) {
            vec2 lPos = uLamps[i].xy;
            float lRad = uLamps[i].z;
            float d = distance(wp, lPos);
            float atten = smoothstep(lRad, 0.6, d);
            totalLamp += atten * atten;
          }
          col += uLampColor * min(totalLamp, 1.45) * uLampIntensity * 0.58;
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

/**
 * 3. 3D Instanced Wind-Swaying Grass Blades (Инстансированные пучки травы с вершинным шейдером ветра)
 */
export function buildInstancedWindGrass(
  season: SeasonId,
  timeOfDay: TimeOfDayId
): { mesh: THREE.InstancedMesh; updateTime: (elapsed: number) => void } {
  const bladeCount = 850;

  // Delicate tapered grass tuft geometry pivoted at y = 0
  const bladeGeo = new THREE.ConeGeometry(0.08, 0.36, 4);
  bladeGeo.translate(0, 0.18, 0);

  const grassColor = new THREE.Color(
    season === 'winter'
      ? '#cfd8e3'
      : season === 'autumn'
      ? '#3d5734'
      : '#3b6132'
  );
  const tipColor = new THREE.Color(
    season === 'winter'
      ? '#edf3fa'
      : season === 'autumn'
      ? '#8b9442'
      : '#74ad52'
  );
  const ambientFactor = timeOfDay === 'night' ? 0.58 : timeOfDay === 'sunset' ? 0.82 : 1.0;

  const uniforms = {
    uTime: { value: 0 },
    uBaseColor: { value: grassColor.clone().multiplyScalar(ambientFactor) },
    uTipColor: { value: tipColor.clone().multiplyScalar(ambientFactor) },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform float uTime;
      varying float vHeightRatio;
      varying vec3 vInstanceColor;

      void main() {
        vHeightRatio = clamp(position.y / 0.36, 0.0, 1.0);
        #ifdef USE_INSTANCING_COLOR
          vInstanceColor = instanceColor;
        #else
          vInstanceColor = vec3(1.0);
        #endif

        vec4 worldBase = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float swayPhase = uTime * 2.5 + worldBase.x * 0.35 + worldBase.z * 0.28;
        float swayOffset = sin(swayPhase) * 0.11 * vHeightRatio * vHeightRatio;

        vec3 displaced = position;
        displaced.x += swayOffset;
        displaced.z += cos(swayPhase * 0.85) * 0.08 * vHeightRatio * vHeightRatio;

        vec4 mvPosition = viewMatrix * modelMatrix * instanceMatrix * vec4(displaced, 1.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uBaseColor;
      uniform vec3 uTipColor;
      varying float vHeightRatio;
      varying vec3 vInstanceColor;

      void main() {
        vec3 col = mix(uBaseColor, uTipColor, vHeightRatio) * vInstanceColor;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const instanced = new THREE.InstancedMesh(bladeGeo, mat, bladeCount);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  // Distribute grass tufts around the 4 green courtyards & central park core
  const zones = [
    { cx: -58, cz: -54, rMin: 12.0, rMax: 24 },
    { cx: 58, cz: -54, rMin: 12.0, rMax: 24 },
    { cx: -58, cz: 54, rMin: 12.0, rMax: 24 },
    { cx: 58, cz: 54, rMin: 13.0, rMax: 24 },
    { cx: 0, cz: 6, rMin: 14, rMax: 30 },
  ];

  let s = 4219;
  const nextRand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s >>> 8) / 16777216;
  };

  for (let i = 0; i < bladeCount; i++) {
    const zZone = zones[i % zones.length];
    const angle = nextRand() * Math.PI * 2;
    const radius = zZone.rMin + nextRand() * (zZone.rMax - zZone.rMin);
    const gx = zZone.cx + Math.cos(angle) * radius;
    const gz = zZone.cz + Math.sin(angle) * radius;

    dummy.position.set(gx, 0.0, gz);
    dummy.rotation.set(
      (nextRand() - 0.5) * 0.18,
      nextRand() * Math.PI * 2,
      (nextRand() - 0.5) * 0.18
    );
    const sc = 0.7 + nextRand() * 0.55;
    dummy.scale.set(sc, sc * (0.85 + nextRand() * 0.35), sc);
    dummy.updateMatrix();
    instanced.setMatrixAt(i, dummy.matrix);

    const tint = 0.9 + nextRand() * 0.22;
    color.setRGB(tint, tint, tint);
    instanced.setColorAt(i, color);
  }

  instanced.instanceMatrix.needsUpdate = true;
  if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  instanced.computeBoundingSphere();

  return {
    mesh: instanced,
    updateTime: (elapsed: number) => {
      uniforms.uTime.value = elapsed;
    },
  };
}

/**
 * 4. Volumetric Streetlamp Light Cone Shader (Объёмные конусы тёплого света от советских уличных фонарей)
 */
export function createLampConeShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color('#ffaa44') },
      uOpacity: { value: 0.22 },
    },
    vertexShader: `
      varying float vY;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        // ConeGeometry has height 5.6 centered at 0 (-2.8..+2.8)
        vY = (position.y + 2.8) / 5.6;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vY;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vec3 viewDir = normalize(vViewPosition);
        float edgeSoftness = abs(dot(viewDir, vNormal));
        float verticalFade = smoothstep(0.0, 0.95, vY) * (1.0 - smoothstep(0.92, 1.0, vY));
        float alpha = uOpacity * verticalFade * pow(edgeSoftness, 0.85);
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}
