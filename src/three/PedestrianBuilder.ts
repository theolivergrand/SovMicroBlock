import * as THREE from 'three';
import { PedestrianAgentSpec, StreetLampItem, TimeOfDayId } from '../generator/types';
import { createLampConeShaderMaterial } from './SovietShaders';

export interface AnimatedPedestrianHandle {
  spec: PedestrianAgentSpec;
  root: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  segmentLengths: number[];
  totalRouteLength: number;
}

function makeMat(color: THREE.ColorRepresentation, roughness = 0.72, metalness = 0.08) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

/**
 * Builds a composite 7-part 3D Soviet pedestrian (head + hat, torso coat, 2 legs, 2 arms + bag/avoska)
 * Grounded at y = 0
 */
export function buildPedestrianActor(spec: PedestrianAgentSpec): AnimatedPedestrianHandle {
  const root = new THREE.Group();

  const coatMat = makeMat(spec.coatColor, 0.78, 0.05);
  const pantsMat = makeMat(spec.pantsColor, 0.82, 0.05);
  const skinMat = makeMat('#e8bfa2', 0.65, 0.02);
  const hatMat = makeMat(spec.hatColor, 0.8, 0.05);
  const bagMat = makeMat(spec.bagColor, 0.6, 0.15);

  const scale = spec.role === 'student' ? 0.84 : 1.0;

  // 1. Left & Right Legs (pivoted at hip y = 0.76)
  const legGeo = new THREE.BoxGeometry(0.17, 0.72, 0.18);
  legGeo.translate(0, -0.36, 0);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.set(-0.12, 0.74, 0);
  leftLeg.castShadow = true;

  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.position.set(0.12, 0.74, 0);
  rightLeg.castShadow = true;

  // 2. Torso (Soviet coat / jacket)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.74, 0.28), coatMat);
  torso.position.set(0, 1.08, 0);
  torso.castShadow = true;

  // 3. Head + Soviet Ushanka / Knit Cap / Beret
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), skinMat);
  head.position.set(0, 1.61, 0);
  head.castShadow = true;

  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.16, 10), hatMat);
  hat.position.set(0, 1.72, 0);
  hat.castShadow = true;

  // 4. Left & Right Swinging Arms (pivoted at shoulder y = 1.38)
  const armGeo = new THREE.BoxGeometry(0.13, 0.6, 0.14);
  armGeo.translate(0, -0.28, 0);
  const leftArm = new THREE.Mesh(armGeo, coatMat);
  leftArm.position.set(-0.31, 1.38, 0);
  leftArm.castShadow = true;

  const rightArm = new THREE.Mesh(armGeo, coatMat);
  rightArm.position.set(0.31, 1.38, 0);
  rightArm.castShadow = true;

  // 5. Optional Briefcase («Дипломат») or String Bag («Авоська») attached to right arm
  if (spec.hasBag) {
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.28), bagMat);
    bag.position.set(0.06, -0.56, 0.04);
    rightArm.add(bag);
  }

  // Soft ground contact shadow disc
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.36, 12),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.06;

  root.add(leftLeg, rightLeg, torso, head, hat, leftArm, rightArm, shadowDisc);
  root.scale.setScalar(scale);

  // Precalculate closed-loop route segment lengths
  const pts = spec.waypoints;
  const segmentLengths: number[] = [];
  let totalRouteLength = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const len = Math.max(0.1, Math.hypot(b.x - a.x, b.z - a.z));
    segmentLengths.push(len);
    totalRouteLength += len;
  }

  return {
    spec,
    root,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    segmentLengths,
    totalRouteLength: Math.max(1, totalRouteLength),
  };
}

/**
 * Advances all pedestrians along their sidewalk routes and animates their walking stride
 */
export function updatePedestriansAtTime(
  handles: AnimatedPedestrianHandle[],
  elapsedSeconds: number
): void {
  for (let i = 0; i < handles.length; i++) {
    const h = handles[i];
    const pts = h.spec.waypoints;
    if (pts.length < 2) continue;

    const distTraveled =
      (h.spec.initialPhase * h.totalRouteLength + elapsedSeconds * h.spec.speed) %
      h.totalRouteLength;

    let acc = 0;
    let segIdx = 0;
    for (let s = 0; s < h.segmentLengths.length; s++) {
      if (acc + h.segmentLengths[s] >= distTraveled) {
        segIdx = s;
        break;
      }
      acc += h.segmentLengths[s];
    }

    const segLen = h.segmentLengths[segIdx];
    const localT = (distTraveled - acc) / segLen;
    const pA = pts[segIdx];
    const pB = pts[(segIdx + 1) % pts.length];

    const dx = pB.x - pA.x;
    const dz = pB.z - pA.z;
    const heading = Math.atan2(dx, dz);

    // Normal vector for lateral sidewalk lane offset
    const nx = Math.cos(heading) * h.spec.lateralOffset;
    const nz = -Math.sin(heading) * h.spec.lateralOffset;

    const wx = pA.x + dx * localT + nx;
    const wz = pA.z + dz * localT + nz;

    // Subtle vertical bobbing while walking
    const stridePhase = elapsedSeconds * h.spec.speed * 4.2 + i * 1.7;
    const bob = Math.abs(Math.sin(stridePhase)) * 0.045;

    h.root.position.set(wx, 0.05 + bob, wz);
    h.root.rotation.y = heading;

    // Swing legs and arms in opposition
    const swing = Math.sin(stridePhase) * 0.52;
    h.leftLeg.rotation.x = swing;
    h.rightLeg.rotation.x = -swing;
    h.leftArm.rotation.x = -swing * 0.75;
    h.rightArm.rotation.x = swing * 0.75;
  }
}

/**
 * Builds Soviet Boulevard & Courtyard Streetlamps (Фонари РКУ «Кобра») with glowing bulbs,
 * volumetric evening light cones, and ground pools
 */
export function buildStreetLampsGroup(
  lamps: StreetLampItem[],
  timeOfDay: TimeOfDayId
): THREE.Group {
  const group = new THREE.Group();
  const isEvening = timeOfDay === 'night' || timeOfDay === 'sunset';

  const poleMat = makeMat('#6b7278', 0.55, 0.55);
  const baseMat = makeMat('#4b5056', 0.8, 0.2);
  const hoodMat = makeMat('#8d959c', 0.4, 0.65);

  const bulbMat = new THREE.MeshBasicMaterial({
    color: isEvening ? '#ffd480' : '#d8dde3',
  });

  const coneShaderMat = isEvening ? createLampConeShaderMaterial() : null;
  if (coneShaderMat && timeOfDay === 'sunset') {
    coneShaderMat.uniforms.uOpacity.value = 0.12;
  }

  const poolMat = isEvening
    ? new THREE.MeshBasicMaterial({
        color: '#ff9d3b',
        transparent: true,
        opacity: timeOfDay === 'night' ? 0.28 : 0.14,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    : null;

  for (const lamp of lamps) {
    const lGroup = new THREE.Group();
    lGroup.position.set(lamp.x, 0, lamp.z);
    lGroup.rotation.y = lamp.rotation;

    const h = lamp.height;

    // 1. Concrete foundation collar
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 8), baseMat);
    collar.position.y = 0.35;
    lGroup.add(collar);

    // 2. Vertical galvanized steel pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, h, 8), poleMat);
    pole.position.y = h / 2;
    pole.castShadow = true;
    lGroup.add(pole);

    // 3. Curved bracket arm («Кобра»)
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.55, 6), poleMat);
    arm.position.set(0, h - 0.1, 0.65);
    arm.rotation.x = Math.PI / 2 - 0.22;
    lGroup.add(arm);

    // 4. Cobra lamp housing & glowing sodium/mercury bulb
    const cobraHead = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.68), hoodMat);
    cobraHead.position.set(0, h + 0.04, 1.35);
    lGroup.add(cobraHead);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), bulbMat);
    bulb.position.set(0, h - 0.04, 1.35);
    lGroup.add(bulb);

    // 5. Volumetric Evening Light Cone & Ground Pool
    if (isEvening && coneShaderMat && poolMat) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(2.8, h - 0.2, 16, 1, true), coneShaderMat);
      cone.position.set(0, (h - 0.2) / 2, 1.35);
      lGroup.add(cone);

      const pool = new THREE.Mesh(new THREE.CircleGeometry(4.2, 18), poolMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(0, 0.065, 1.35);
      lGroup.add(pool);
    }

    group.add(lGroup);
  }

  return group;
}
