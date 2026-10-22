import * as THREE from 'three';
import {
  BenchAndUrnItem,
  PedestrianPathSegment,
  PlayEquipmentItem,
  PlaygroundZone,
  SeasonId,
  VegetationItem,
} from '../generator/types';
import { createBirchBarkTexture, getSeasonPalette } from './SovietMaterials';

// Shared materials helper
function makeMat(color: THREE.ColorRepresentation, roughness = 0.65, metalness = 0.1) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

/**
 * 1. Советская ракета-горка («Восток») — 8-part composite THREE.Group
 * Pivoted at bottom center (y = 0)
 */
export function buildSovietRocketSlide(): THREE.Group {
  const group = new THREE.Group();

  const redPaint = makeMat('#c93b2b', 0.4, 0.35);
  const yellowPaint = makeMat('#e3a829', 0.45, 0.3);
  const bluePaint = makeMat('#2f6d9c', 0.45, 0.3);
  const steelMat = makeMat('#bfc5cc', 0.25, 0.75);
  const darkPlatform = makeMat('#42474d', 0.8, 0.2);

  // 1. Support legs (4 angled struts)
  const legGeo = new THREE.CylinderGeometry(0.08, 0.1, 2.2, 8);
  const legOffsets = [
    [-0.75, 1.0, -0.75, 0.18, 0, -0.18],
    [0.75, 1.0, -0.75, 0.18, 0, 0.18],
    [-0.75, 1.0, 0.75, -0.18, 0, -0.18],
    [0.75, 1.0, 0.75, -0.18, 0, 0.18],
  ];
  for (const [lx, ly, lz, rx, ry, rz] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, bluePaint);
    leg.position.set(lx, ly, lz);
    leg.rotation.set(rx, ry, rz);
    leg.castShadow = true;
    group.add(leg);
  }

  // 2. Launch platform at y = 2.0m
  const platMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.14, 12), darkPlatform);
  platMesh.position.y = 2.0;
  platMesh.castShadow = true;
  group.add(platMesh);

  // 3. Main fuselage cage / cylinder body
  const bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.98, 2.5, 12), yellowPaint);
  bodyMesh.position.y = 3.3;
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // 4. Nose cone (обтекатель ракеты) + spire
  const coneMesh = new THREE.Mesh(new THREE.ConeGeometry(0.96, 1.6, 12), redPaint);
  coneMesh.position.y = 5.35;
  coneMesh.castShadow = true;
  group.add(coneMesh);

  const spireMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.8, 6), steelMat);
  spireMesh.position.y = 6.45;
  group.add(spireMesh);

  // 5. Three stabilizer fins (стабилизаторы)
  const finGeo = new THREE.BoxGeometry(0.12, 1.6, 0.75);
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const fin = new THREE.Mesh(finGeo, redPaint);
    fin.position.set(Math.sin(angle) * 1.05, 1.4, Math.cos(angle) * 1.05);
    fin.rotation.y = angle;
    fin.castShadow = true;
    group.add(fin);
  }

  // 6. Porthole ring (иллюминатор)
  const porthole = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.06, 8, 16), bluePaint);
  porthole.position.set(0, 3.4, 0.92);
  group.add(porthole);

  // 7. Stainless steel slide chute (жёлоб горки)
  const slideGroup = new THREE.Group();
  const chuteBed = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 3.6), steelMat);
  const railLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 3.6), redPaint);
  railLeft.position.set(-0.38, 0.1, 0);
  const railRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 3.6), redPaint);
  railRight.position.set(0.38, 0.1, 0);
  slideGroup.add(chuteBed, railLeft, railRight);
  slideGroup.position.set(0, 1.05, 2.15);
  slideGroup.rotation.x = 0.56;
  group.add(slideGroup);

  // 8. Rear access stairs
  const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.65, 2.2, 0.18), bluePaint);
  ladder.position.set(0, 1.0, -1.35);
  ladder.rotation.x = -0.38;
  group.add(ladder);

  return group;
}

/**
 * 2. Геодезический купол «Паутинка» / «Сфера» — multi-part climbing dome
 */
export function buildGeodesicDome(): THREE.Group {
  const group = new THREE.Group();
  const radius = 1.95;

  const baseRing = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.06, 8, 20),
    makeMat('#3474a6', 0.4, 0.45)
  );
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.06;
  group.add(baseRing);

  // Upper geodesic rings and arches
  const colors = ['#d64535', '#e3a829', '#3474a6', '#468c56'];
  for (let i = 0; i < 4; i++) {
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.05, 8, 20, Math.PI),
      makeMat(colors[i % colors.length], 0.35, 0.5)
    );
    arch.rotation.y = (i * Math.PI) / 4;
    arch.position.y = 0.05;
    arch.castShadow = true;
    group.add(arch);
  }

  // Horizontal latitude rings
  const midRing = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.84, 0.048, 8, 18),
    makeMat('#e3a829', 0.4, 0.45)
  );
  midRing.rotation.x = Math.PI / 2;
  midRing.position.y = radius * 0.52;
  group.add(midRing);

  const topRing = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.48, 0.045, 8, 16),
    makeMat('#d64535', 0.4, 0.45)
  );
  topRing.rotation.x = Math.PI / 2;
  topRing.position.y = radius * 0.86;
  group.add(topRing);

  return group;
}

/**
 * 3. Двухместные советские качели на А-образных стойках
 */
export function buildSovietSwingSet(): THREE.Group {
  const group = new THREE.Group();
  const frameMat = makeMat('#2e6f9e', 0.45, 0.4);
  const rodMat = makeMat('#c4c9cf', 0.3, 0.7);
  const seatMat = makeMat('#d14334', 0.65, 0.1);

  const height = 2.45;
  const width = 3.2;

  // Top crossbar
  const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, width, 8), frameMat);
  topBar.rotation.z = Math.PI / 2;
  topBar.position.y = height;
  topBar.castShadow = true;
  group.add(topBar);

  // Left & Right A-frame legs
  const legLen = 2.65;
  const legGeo = new THREE.CylinderGeometry(0.055, 0.065, legLen, 8);
  [-width / 2 + 0.15, width / 2 - 0.15].forEach((xSide) => {
    const frontLeg = new THREE.Mesh(legGeo, frameMat);
    frontLeg.position.set(xSide, height / 2, 0.52);
    frontLeg.rotation.x = -0.39;
    frontLeg.castShadow = true;

    const backLeg = new THREE.Mesh(legGeo, frameMat);
    backLeg.position.set(xSide, height / 2, -0.52);
    backLeg.rotation.x = 0.39;
    backLeg.castShadow = true;

    group.add(frontLeg, backLeg);
  });

  // Two suspended swings (rigid steel rods, classic Soviet style)
  [-0.75, 0.75].forEach((sx, idx) => {
    const swingUnit = new THREE.Group();
    swingUnit.position.set(sx, height, 0);
    swingUnit.rotation.x = idx === 0 ? 0.12 : -0.08;

    const rodGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.85, 6);
    const r1 = new THREE.Mesh(rodGeo, rodMat);
    r1.position.set(-0.24, -0.92, 0);
    const r2 = new THREE.Mesh(rodGeo, rodMat);
    r2.position.set(0.24, -0.92, 0);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.06, 0.34), seatMat);
    seat.position.set(0, -1.85, 0);
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.22, 0.04), seatMat);
    backrest.position.set(0, -1.72, -0.15);

    swingUnit.add(r1, r2, seat, backrest);
    group.add(swingUnit);
  });

  return group;
}

/**
 * 4. Песочница с деревянным «Грибком» (мухомор)
 */
export function buildSandboxWithMushroom(): THREE.Group {
  const group = new THREE.Group();
  const woodBorderMat = makeMat('#d48e2b', 0.75, 0.05);
  const redSideMat = makeMat('#c73e2c', 0.75, 0.05);
  const sandMat = makeMat('#dec285', 0.95, 0.0);
  const stemMat = makeMat('#e8e4da', 0.7, 0.05);
  const capMat = makeMat('#cc3329', 0.55, 0.1);
  const spotMat = makeMat('#f5f3ed', 0.6, 0.05);

  const boxSize = 3.1;
  const borderH = 0.28;

  // Sand bed
  const sand = new THREE.Mesh(new THREE.BoxGeometry(boxSize - 0.2, 0.18, boxSize - 0.2), sandMat);
  sand.position.y = 0.09;
  sand.receiveShadow = true;
  group.add(sand);

  // 4 wooden border planks + corner seat triangles
  const plankLong = new THREE.BoxGeometry(boxSize, borderH, 0.14);
  const pNorth = new THREE.Mesh(plankLong, woodBorderMat);
  pNorth.position.set(0, borderH / 2, -boxSize / 2);
  const pSouth = new THREE.Mesh(plankLong, woodBorderMat);
  pSouth.position.set(0, borderH / 2, boxSize / 2);
  const pEast = new THREE.Mesh(plankLong, redSideMat);
  pEast.rotation.y = Math.PI / 2;
  pEast.position.set(boxSize / 2, borderH / 2, 0);
  const pWest = new THREE.Mesh(plankLong, redSideMat);
  pWest.rotation.y = Math.PI / 2;
  pWest.position.set(-boxSize / 2, borderH / 2, 0);
  group.add(pNorth, pSouth, pEast, pWest);

  // Central wooden post (ножка грибка)
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 2.15, 10), stemMat);
  stem.position.y = 1.075;
  stem.castShadow = true;
  group.add(stem);

  // Conical red mushroom cap (шляпка грибка)
  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.72, 14), capMat);
  cap.position.y = 2.38;
  cap.castShadow = true;
  group.add(cap);

  // White polka dots on the mushroom cap
  const dotGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.05, 8);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI * 2) / 6;
    const dot = new THREE.Mesh(dotGeo, spotMat);
    dot.position.set(Math.cos(a) * 0.72, 2.34, Math.sin(a) * 0.72);
    dot.rotation.z = -Math.cos(a) * 0.45;
    dot.rotation.x = Math.sin(a) * 0.45;
    group.add(dot);
  }

  return group;
}

/**
 * 5. Дворовая карусель «Солнышко»
 */
export function buildMerryGoRound(): THREE.Group {
  const group = new THREE.Group();
  const redMat = makeMat('#c93b2b', 0.5, 0.3);
  const yellowMat = makeMat('#e0a628', 0.5, 0.3);
  const blueMat = makeMat('#2f6e9e', 0.5, 0.3);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.85, 10), blueMat);
  hub.position.y = 0.425;
  group.add(hub);

  const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.08, 16), yellowMat);
  platform.position.y = 0.22;
  platform.castShadow = true;
  group.add(platform);

  const handrail = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.04, 8, 16), redMat);
  handrail.rotation.x = Math.PI / 2;
  handrail.position.y = 0.72;
  group.add(handrail);

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 6), blueMat);
    post.position.set(Math.cos(angle) * 0.95, 0.47, Math.sin(angle) * 0.95);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.28), redMat);
    seat.position.set(Math.cos(angle + 0.4) * 1.05, 0.42, Math.sin(angle + 0.4) * 1.05);
    seat.rotation.y = -angle;
    group.add(post, seat);
  }

  return group;
}

/**
 * 6. Рукоход «Радуга» и турники
 */
export function buildMonkeyBars(): THREE.Group {
  const group = new THREE.Group();
  const blueMat = makeMat('#326fa1', 0.45, 0.45);
  const yellowMat = makeMat('#de9f26', 0.45, 0.45);
  const redMat = makeMat('#c93d2e', 0.45, 0.45);

  // 4 vertical posts
  const postGeo = new THREE.CylinderGeometry(0.055, 0.055, 2.2, 8);
  const postCoords = [
    [-1.6, 1.1, -0.45],
    [1.6, 1.1, -0.45],
    [-1.6, 1.1, 0.45],
    [1.6, 1.1, 0.45],
  ];
  for (const [px, py, pz] of postCoords) {
    const post = new THREE.Mesh(postGeo, blueMat);
    post.position.set(px, py, pz);
    post.castShadow = true;
    group.add(post);
  }

  // Horizontal side rails
  const sideRailGeo = new THREE.CylinderGeometry(0.05, 0.05, 3.3, 8);
  [-0.45, 0.45].forEach((zPos) => {
    const rail = new THREE.Mesh(sideRailGeo, yellowMat);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, 2.15, zPos);
    group.add(rail);
  });

  // Cross rungs
  const rungGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.9, 6);
  for (let x = -1.35; x <= 1.35; x += 0.45) {
    const rung = new THREE.Mesh(rungGeo, redMat);
    rung.rotation.x = Math.PI / 2;
    rung.position.set(x, 2.15, 0);
    group.add(rung);
  }

  return group;
}

/**
 * 7. Выбивалка для ковров и сушилка для белья (дворовая классика)
 */
export function buildCarpetBeater(): THREE.Group {
  const group = new THREE.Group();
  const pipeMat = makeMat('#5a7a68', 0.5, 0.55);

  const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.05, 8);
  const pLeft = new THREE.Mesh(postGeo, pipeMat);
  pLeft.position.set(-1.3, 1.025, 0);
  const pRight = new THREE.Mesh(postGeo, pipeMat);
  pRight.position.set(1.3, 1.025, 0);

  const barTop = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.7, 8), pipeMat);
  barTop.rotation.z = Math.PI / 2;
  barTop.position.set(0, 2.0, 0);

  const barMid = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 8), pipeMat);
  barMid.rotation.z = Math.PI / 2;
  barMid.position.set(0, 1.35, 0);

  pLeft.castShadow = true;
  pRight.castShadow = true;
  barTop.castShadow = true;
  group.add(pLeft, pRight, barTop, barMid);
  return group;
}

/**
 * 8. Дворовая хоккейная / спортивная коробка
 */
export function buildHockeyBox(): THREE.Group {
  const group = new THREE.Group();
  const boardMat = makeMat('#e3e0d5', 0.7, 0.1);
  const trimBlue = makeMat('#2b6394', 0.6, 0.2);
  const goalMat = makeMat('#c93829', 0.45, 0.4);
  const courtMat = makeMat('#4b5863', 0.85, 0.05);

  const w = 14;
  const d = 9;
  const h = 1.05;

  const rinkSurface = new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, 0.08, d - 0.2), courtMat);
  rinkSurface.position.y = 0.04;
  rinkSurface.receiveShadow = true;
  group.add(rinkSurface);

  // Center line & circle markings
  const centerLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.09, d - 0.4),
    makeMat('#cc3b2b', 0.8, 0)
  );
  centerLine.position.y = 0.045;
  group.add(centerLine);

  // Wooden boards around perimeter
  const longWall = new THREE.BoxGeometry(w, h, 0.14);
  const shortWall = new THREE.BoxGeometry(0.14, h, d);
  const wNorth = new THREE.Mesh(longWall, boardMat);
  wNorth.position.set(0, h / 2, -d / 2);
  const wSouth = new THREE.Mesh(longWall, boardMat);
  wSouth.position.set(0, h / 2, d / 2);
  const wWest = new THREE.Mesh(shortWall, boardMat);
  wWest.position.set(-w / 2, h / 2, 0);
  const wEast = new THREE.Mesh(shortWall, boardMat);
  wEast.position.set(w / 2, h / 2, 0);

  // Blue top kick-rail
  const topRailLong = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.12, 0.18), trimBlue);
  topRailLong.position.set(0, h + 0.04, -d / 2);
  const topRailLong2 = topRailLong.clone();
  topRailLong2.position.set(0, h + 0.04, d / 2);

  // Two hockey goals
  [-w / 2 + 1.2, w / 2 - 1.2].forEach((gx) => {
    const goal = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.15, 1.7), goalMat);
    goal.position.set(gx, 0.58, 0);
    goal.castShadow = true;
    group.add(goal);
  });

  group.add(wNorth, wSouth, wWest, wEast, topRailLong, topRailLong2);
  return group;
}

/**
 * 9. Скамейка со спинкой и чугунно-бетонная урна (МАФ)
 */
export function buildBenchAndUrnGroup(item: BenchAndUrnItem): THREE.Group {
  const group = new THREE.Group();

  const colorMap: Record<BenchAndUrnItem['colorVariant'], string> = {
    ochre: '#cf8e30',
    green: '#3d7548',
    blue: '#366894',
    red: '#b53f31',
  };

  const slatMat = makeMat(colorMap[item.colorVariant], 0.72, 0.08);
  const castIronMat = makeMat('#25282c', 0.5, 0.65);
  const urnConcreteMat = makeMat('#8d9196', 0.85, 0.1);

  // Cast-iron legs (2 supports)
  [-0.78, 0.78].forEach((lx) => {
    const legSeat = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.44, 0.52), castIronMat);
    legSeat.position.set(lx, 0.22, 0);
    const legBack = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.52, 0.08), castIronMat);
    legBack.position.set(lx, 0.64, -0.24);
    legBack.rotation.x = -0.2;
    group.add(legSeat, legBack);
  });

  // 3 Wooden seat slats
  for (let i = 0; i < 3; i++) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.055, 0.14), slatMat);
    slat.position.set(0, 0.45, -0.14 + i * 0.15);
    slat.castShadow = true;
    group.add(slat);
  }

  // 2 Wooden backrest slats
  for (let i = 0; i < 2; i++) {
    const backSlat = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.13, 0.05), slatMat);
    backSlat.position.set(0, 0.64 + i * 0.17, -0.25 - i * 0.03);
    backSlat.rotation.x = -0.2;
    backSlat.castShadow = true;
    group.add(backSlat);
  }

  // Street trash urn next to the bench (чугунно-бетонная урна)
  if (item.hasUrn) {
    const urnX = item.urnOffsetSide === 'right' ? 1.32 : -1.32;
    const urnGroup = new THREE.Group();
    urnGroup.position.set(urnX, 0, 0.04);

    // Pedestal base
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.36), urnConcreteMat);
    base.position.y = 0.06;
    // Cylindrical body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.54, 10), urnConcreteMat);
    body.position.y = 0.36;
    body.castShadow = true;
    // Inner dark metal liner rim
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.16, 0.58, 10), castIronMat);
    rim.position.y = 0.37;

    urnGroup.add(base, body, rim);
    group.add(urnGroup);
  }

  group.position.set(item.x, 0.02, item.z);
  group.rotation.y = item.rotation;
  return group;
}

/**
 * 10. Полная сборка детской площадки с поребриком, покрытием и игровыми элементами
 */
export function buildPlaygroundMeshGroup(pg: PlaygroundZone): THREE.Group {
  const group = new THREE.Group();
  group.userData = { entityKind: 'playground', entityId: pg.id };

  const surfaceColors: Record<PlaygroundZone['surfaceType'], string> = {
    sand: '#d9be82',
    'crumb-red': '#a85242',
    'asphalt-sport': '#464d54',
  };

  // Base pad offset at y = 0.03m so it never Z-fights with grass or sidewalks
  const padGeo = new THREE.BoxGeometry(pg.width, 0.06, pg.depth);
  const padMat = makeMat(surfaceColors[pg.surfaceType], 0.92, 0.02);
  const padMesh = new THREE.Mesh(padGeo, padMat);
  padMesh.position.set(pg.x, 0.03, pg.z);
  padMesh.receiveShadow = true;
  padMesh.userData = { entityKind: 'playground', entityId: pg.id };
  group.add(padMesh);

  // Painted Soviet concrete curb blocks (поребрик бело-синий / бело-жёлтый)
  const curbH = 0.14;
  const curbMat = makeMat('#d8d6ce', 0.8, 0.05);
  const northCurb = new THREE.Mesh(new THREE.BoxGeometry(pg.width + 0.3, curbH, 0.2), curbMat);
  northCurb.position.set(pg.x, curbH / 2, pg.z - pg.depth / 2);
  const southCurb = new THREE.Mesh(new THREE.BoxGeometry(pg.width + 0.3, curbH, 0.2), curbMat);
  southCurb.position.set(pg.x, curbH / 2, pg.z + pg.depth / 2);
  const westCurb = new THREE.Mesh(new THREE.BoxGeometry(0.2, curbH, pg.depth), curbMat);
  westCurb.position.set(pg.x - pg.width / 2, curbH / 2, pg.z);
  const eastCurb = new THREE.Mesh(new THREE.BoxGeometry(0.2, curbH, pg.depth), curbMat);
  eastCurb.position.set(pg.x + pg.width / 2, curbH / 2, pg.z);
  group.add(northCurb, southCurb, westCurb, eastCurb);

  // Populate characteristic Soviet play equipment
  for (const eq of pg.equipment) {
    let eqMesh: THREE.Group;
    switch (eq.type) {
      case 'rocket-slide':
        eqMesh = buildSovietRocketSlide();
        break;
      case 'geodesic-dome':
        eqMesh = buildGeodesicDome();
        break;
      case 'swing-set':
        eqMesh = buildSovietSwingSet();
        break;
      case 'sandbox-mushroom':
        eqMesh = buildSandboxWithMushroom();
        break;
      case 'merry-go-round':
        eqMesh = buildMerryGoRound();
        break;
      case 'monkey-bars':
        eqMesh = buildMonkeyBars();
        break;
      case 'hockey-box':
        eqMesh = buildHockeyBox();
        break;
      case 'carpet-beater':
      default:
        eqMesh = buildCarpetBeater();
        break;
    }
    eqMesh.position.set(eq.x, 0.06, eq.z);
    eqMesh.rotation.y = eq.rotation;
    eqMesh.scale.setScalar(eq.scale);
    eqMesh.traverse((child) => {
      child.userData = { entityKind: 'playground', entityId: pg.id };
    });
    group.add(eqMesh);
  }

  return group;
}

/**
 * 11. Пешеходные дорожки (тротуары) с бордюрным камнем
 */
export function buildPedestrianPathsGroup(
  paths: PedestrianPathSegment[],
  season: SeasonId
): THREE.Group {
  const group = new THREE.Group();
  const palette = getSeasonPalette(season);

  const asphaltMat = makeMat(palette.sidewalkColor, 0.88, 0.04);
  const curbMat = makeMat(palette.curbColor, 0.8, 0.05);

  for (const seg of paths) {
    const dx = seg.x2 - seg.x1;
    const dz = seg.z2 - seg.z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.2) continue;

    const midX = (seg.x1 + seg.x2) / 2;
    const midZ = (seg.z1 + seg.z2) / 2;
    const angle = Math.atan2(dx, dz);

    // Offset Y by path kind so overlapping junctions never Z-fight
    const yHeight =
      seg.kind === 'main-alley' ? 0.05 : seg.kind === 'courtyard-walk' ? 0.042 : 0.036;

    const walkMesh = new THREE.Mesh(new THREE.BoxGeometry(seg.width, yHeight, len + 0.4), asphaltMat);
    walkMesh.position.set(midX, yHeight / 2, midZ);
    walkMesh.rotation.y = angle;
    walkMesh.receiveShadow = true;
    group.add(walkMesh);

    if (seg.hasCurb) {
      const curbLeft = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, yHeight + 0.04, len + 0.4),
        curbMat
      );
      curbLeft.position.set(
        midX + Math.cos(angle) * (seg.width / 2 + 0.08),
        (yHeight + 0.04) / 2,
        midZ - Math.sin(angle) * (seg.width / 2 + 0.08)
      );
      curbLeft.rotation.y = angle;

      const curbRight = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, yHeight + 0.04, len + 0.4),
        curbMat
      );
      curbRight.position.set(
        midX - Math.cos(angle) * (seg.width / 2 + 0.08),
        (yHeight + 0.04) / 2,
        midZ + Math.sin(angle) * (seg.width / 2 + 0.08)
      );
      curbRight.rotation.y = angle;

      group.add(curbLeft, curbRight);
    }
  }

  return group;
}

/**
 * 12. Зелёные насаждения: Деревья (Тополь, Берёза, Клён) и Кустарники (Сирень, Живая изгородь)
 */
export function buildVegetationGroup(
  items: VegetationItem[],
  season: SeasonId,
  maxAnisotropy: number
): THREE.Group {
  const group = new THREE.Group();
  const palette = getSeasonPalette(season);

  const darkBarkMat = makeMat('#4a3f37', 0.9, 0.02);
  const birchBarkTex = createBirchBarkTexture(maxAnisotropy);
  const birchBarkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: birchBarkTex,
    roughness: 0.8,
    metalness: 0.02,
  });

  items.forEach((v, idx) => {
    const vGroup = new THREE.Group();
    vGroup.position.set(v.x, 0, v.z);
    vGroup.rotation.y = v.rotation;

    if (v.type === 'poplar') {
      // Tall pyramidal Soviet poplar (Тополь пирамидальный): trunk + 3 tiered foliage cones/ellipsoids
      const trunkH = v.height * 0.35;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.34, trunkH, 7),
        darkBarkMat
      );
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      vGroup.add(trunk);

      const col = palette.poplarColors[idx % palette.poplarColors.length];
      const crownMat = makeMat(col, 0.85, 0.02);

      const lowerCrown = new THREE.Mesh(
        new THREE.ConeGeometry(v.crownRadius, v.height * 0.55, 8),
        crownMat
      );
      lowerCrown.position.y = trunkH + v.height * 0.22;
      lowerCrown.castShadow = true;

      const upperCrown = new THREE.Mesh(
        new THREE.ConeGeometry(v.crownRadius * 0.78, v.height * 0.5, 8),
        crownMat
      );
      upperCrown.position.y = trunkH + v.height * 0.46;
      upperCrown.castShadow = true;

      vGroup.add(lowerCrown, upperCrown);
    } else if (v.type === 'birch') {
      // Russian Birch (Берёза повислая): white mottled bark trunk + airy multi-lobe crown
      const trunkH = v.height * 0.48;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.24, trunkH, 8),
        birchBarkMat
      );
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      vGroup.add(trunk);

      const col = palette.birchColors[idx % palette.birchColors.length];
      const crownMat = makeMat(col, 0.82, 0.02);

      const lobes = [
        [0, trunkH + 1.8, 0, v.crownRadius * 0.85],
        [-0.9, trunkH + 0.9, 0.6, v.crownRadius * 0.65],
        [0.85, trunkH + 1.1, -0.5, v.crownRadius * 0.68],
      ];
      for (const [lx, ly, lz, lr] of lobes) {
        const lobe = new THREE.Mesh(new THREE.DodecahedronGeometry(lr, 1), crownMat);
        lobe.position.set(lx, ly, lz);
        lobe.castShadow = true;
        vGroup.add(lobe);
      }
    } else if (v.type === 'maple') {
      // Spreading Maple (Клён остролистный)
      const trunkH = v.height * 0.38;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.32, trunkH, 7),
        darkBarkMat
      );
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      vGroup.add(trunk);

      const col = palette.mapleColors[idx % palette.mapleColors.length];
      const crownMat = makeMat(col, 0.82, 0.02);

      const mainCanopy = new THREE.Mesh(
        new THREE.DodecahedronGeometry(v.crownRadius * 0.9, 1),
        crownMat
      );
      mainCanopy.position.y = trunkH + v.crownRadius * 0.65;
      mainCanopy.scale.set(1.15, 0.85, 1.15);
      mainCanopy.castShadow = true;
      vGroup.add(mainCanopy);
    } else if (v.type === 'lilac-bush') {
      // Multi-cluster Lilac / Spirea bush (Куст сирени у подъезда и площадки)
      const col = palette.shrubColors[idx % palette.shrubColors.length];
      const bushMat = makeMat(col, 0.88, 0.02);
      const offsets = [
        [0, 0.95, 0, v.crownRadius * 0.72],
        [-0.65, 0.75, 0.4, v.crownRadius * 0.56],
        [0.65, 0.78, -0.35, v.crownRadius * 0.58],
      ];
      for (const [bx, by, bz, br] of offsets) {
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(br, 1), bushMat);
        puff.position.set(bx, by, bz);
        puff.castShadow = true;
        vGroup.add(puff);
      }
    } else {
      // Trimmed Soviet courtyard hedgerow shrub (Живая изгородь вдоль дорожек)
      const col = palette.shrubColors[(idx + 1) % palette.shrubColors.length];
      const hedgeMat = makeMat(col, 0.9, 0.02);
      const hedgeBox = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, v.height, 0.85),
        hedgeMat
      );
      hedgeBox.position.y = v.height / 2;
      hedgeBox.castShadow = true;
      hedgeBox.receiveShadow = true;
      vGroup.add(hedgeBox);
    }

    group.add(vGroup);
  });

  return group;
}
