import * as THREE from 'three';
import { BUILDING_SERIES_CATALOG } from '../generator/presets';
import {
  BuildingSeriesId,
  GeneratedBuilding,
  TimeOfDayId,
} from '../generator/types';
import {
  createEndWallPixelTexture,
  createLoggiaStackPixelTexture,
  createPanelFacadeTextures,
} from './SovietMaterials';

/**
 * Creates a canonical GeneratedBuilding descriptor for the 3D Encyclopedia Turntable Viewer
 */
export function createPreviewBuildingSpec(
  seriesId: BuildingSeriesId,
  variantIndex = 0
): GeneratedBuilding {
  const spec = BUILDING_SERIES_CATALOG[seriesId];
  const variant =
    spec.facadeVariants[variantIndex % spec.facadeVariants.length] ??
    spec.facadeVariants[0];

  const floors = spec.defaultFloors;
  const sections = Math.min(spec.defaultSections, seriesId === 'II-68' ? 1 : 3);
  const width = spec.sectionWidth * sections;
  const depth = spec.sectionDepth;
  const height = floors * (spec.category === 'social' ? 3.5 : 2.85) + 1.2;

  let shape: GeneratedBuilding['shape'] = 'slab';
  if (seriesId === 'II-68') shape = 'tower';
  else if (seriesId === 'OMR-Chertanovo') shape = 'triskele';
  else if (seriesId === 'P-3' || seriesId === 'P-46') shape = 'l-shape';
  else if (seriesId === 'School-I-1158') shape = 'h-school';
  else if (seriesId === 'Kindergarten-I-1194') shape = 'u-shape';
  else if (seriesId === 'Polyclinic-I-1169') shape = 'polyclinic-cross';
  else if (seriesId === 'Universam' || seriesId === 'Produkti-Store') shape = 'pavilion';

  return {
    id: `preview-${seriesId}-${variant.id}`,
    series: seriesId,
    category: spec.category,
    socialSubType: spec.socialSubType,
    name: spec.name,
    address: `Образец серии ${spec.code}`,
    yearBuilt: spec.yearRange[0],
    facadeVariant: variant,
    x: 0,
    z: 0,
    rotation: 0,
    floors,
    sections,
    width,
    depth,
    height,
    apartments:
      spec.category === 'residential'
        ? floors * sections * spec.apartmentsPerFloorPerSection
        : 0,
    residents:
      spec.category === 'residential'
        ? Math.round(floors * sections * spec.apartmentsPerFloorPerSection * 2.8)
        : 0,
    shape,
    snipNormRadiusMeters: spec.snipNormRadiusMeters,
    snipCapacityLabel: spec.snipCapacityLabel,
  };
}

export function buildSovietBuildingMesh(
  bld: GeneratedBuilding,
  timeOfDay: TimeOfDayId,
  maxAnisotropy: number,
  sharedBumpTex: THREE.CanvasTexture
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(bld.x, 0, bld.z);
  group.rotation.y = bld.rotation;
  group.userData = { entityKind: 'building', entityId: bld.id };

  const spec = BUILDING_SERIES_CATALOG[bld.series];
  const primaryColor = bld.facadeVariant?.primaryColor ?? spec.facadePrimaryColor;
  const secondaryColor = bld.facadeVariant?.secondaryColor ?? spec.facadeSecondaryColor;
  const accentColor = bld.facadeVariant?.accentColor ?? spec.accentColor;

  let seedHash = 1980 + bld.yearBuilt * 17;
  for (let i = 0; i < bld.id.length; i++) {
    seedHash = (seedHash * 31 + bld.id.charCodeAt(i)) >>> 0;
  }

  const { albedoTex, emissiveTex } = createPanelFacadeTextures(
    bld.series,
    bld.facadeVariant,
    timeOfDay,
    maxAnisotropy,
    seedHash
  );

  // 2x2 structural bays per 128x128 pixel texture
  const repX = Math.max(1, Math.round(bld.width / 12.5));
  const repY = Math.max(1, Math.round(bld.floors / 2));
  albedoTex.repeat.set(repX, repY);
  if (emissiveTex) {
    emissiveTex.repeat.set(repX, repY);
  }

  // 16-bit pixel-art end-wall texture
  const endWallTex = createEndWallPixelTexture(
    primaryColor,
    secondaryColor,
    maxAnisotropy
  );
  endWallTex.repeat.set(
    Math.max(1, Math.round(bld.depth / 8)),
    Math.max(1, Math.round(bld.floors / 2))
  );

  // 16-bit pixel-art glazed loggia stack textures
  const loggiaFrontTexSet = createLoggiaStackPixelTexture(
    secondaryColor,
    timeOfDay,
    maxAnisotropy,
    seedHash + 7
  );
  const loggiaBackTexSet = createLoggiaStackPixelTexture(
    accentColor,
    timeOfDay,
    maxAnisotropy,
    seedHash + 31
  );
  const loggiaRepY = Math.max(1, Math.round((bld.floors - 1) / 2));
  loggiaFrontTexSet.albedoTex.repeat.set(1, loggiaRepY);
  if (loggiaFrontTexSet.emissiveTex) {
    loggiaFrontTexSet.emissiveTex.repeat.set(1, loggiaRepY);
  }
  loggiaBackTexSet.albedoTex.repeat.set(1, loggiaRepY);
  if (loggiaBackTexSet.emissiveTex) {
    loggiaBackTexSet.emissiveTex.repeat.set(1, loggiaRepY);
  }

  const isNight = timeOfDay === 'night';
  const isSunset = timeOfDay === 'sunset';
  const wallTint = isNight ? 0x6e7f96 : isSunset ? 0xded4c8 : 0xffffff;

  const facadeMat = new THREE.MeshStandardMaterial({
    color: wallTint,
    map: albedoTex,
    emissive: new THREE.Color(isNight ? 0xffd685 : isSunset ? 0xffc88a : 0x000000),
    emissiveMap: emissiveTex,
    emissiveIntensity: isNight ? 2.15 : isSunset ? 0.95 : 0.0,
    bumpMap: sharedBumpTex,
    bumpScale: 0.03,
    roughness: 0.76,
    metalness: 0.06,
  });

  const endWallMat = new THREE.MeshStandardMaterial({
    color: wallTint,
    map: endWallTex,
    bumpMap: sharedBumpTex,
    bumpScale: 0.04,
    roughness: 0.8,
    metalness: 0.05,
  });

  const loggiaFrontMat = new THREE.MeshStandardMaterial({
    color: wallTint,
    map: loggiaFrontTexSet.albedoTex,
    emissive: new THREE.Color(isNight ? 0xffd685 : isSunset ? 0xffc88a : 0x000000),
    emissiveMap: loggiaFrontTexSet.emissiveTex,
    emissiveIntensity: isNight ? 1.85 : isSunset ? 0.8 : 0.0,
    roughness: 0.65,
    metalness: 0.1,
  });

  const loggiaBackMat = new THREE.MeshStandardMaterial({
    color: wallTint,
    map: loggiaBackTexSet.albedoTex,
    emissive: new THREE.Color(isNight ? 0xffd685 : isSunset ? 0xffc88a : 0x000000),
    emissiveMap: loggiaBackTexSet.emissiveTex,
    emissiveIntensity: isNight ? 1.85 : isSunset ? 0.8 : 0.0,
    roughness: 0.65,
    metalness: 0.1,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: secondaryColor,
    roughness: 0.58,
    metalness: 0.14,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.5,
    metalness: 0.18,
  });

  const roofTarMat = new THREE.MeshStandardMaterial({
    color: '#2b2e33',
    bumpMap: sharedBumpTex,
    bumpScale: 0.02,
    roughness: 0.92,
    metalness: 0.05,
  });

  const plinthMat = new THREE.MeshStandardMaterial({
    color: '#43474d',
    bumpMap: sharedBumpTex,
    bumpScale: 0.04,
    roughness: 0.88,
    metalness: 0.08,
  });

  // 1. Concrete plinth base (цоколь с отмосткой)
  const plinthH = 0.8;
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(bld.width + 0.5, plinthH, bld.depth + 0.5),
    plinthMat
  );
  plinth.position.y = plinthH / 2;
  plinth.receiveShadow = true;
  group.add(plinth);

  // 2. Main structural hull
  const bodyH = bld.height - plinthH;
  const boxMaterials = [
    endWallMat, // +x
    endWallMat, // -x
    roofTarMat, // +y roof
    plinthMat,  // -y bottom
    facadeMat,  // +z front
    facadeMat,  // -z back
  ];

  const mainHull = new THREE.Mesh(
    new THREE.BoxGeometry(bld.width, bodyH, bld.depth),
    boxMaterials
  );
  mainHull.position.y = plinthH + bodyH / 2;
  mainHull.castShadow = true;
  mainHull.receiveShadow = true;
  group.add(mainHull);

  // 3. Secondary wings based on Soviet architectural series shape
  if (bld.shape === 'l-shape') {
    const wingW = bld.depth;
    const wingD = Math.min(26, bld.width * 0.45);
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(wingW, bodyH, wingD),
      boxMaterials
    );
    wing.position.set(
      bld.width / 2 - wingW / 2,
      plinthH + bodyH / 2,
      -bld.depth / 2 - wingD / 2 + 0.2
    );
    wing.castShadow = true;
    wing.receiveShadow = true;
    group.add(wing);
  } else if (bld.shape === 'triskele') {
    const wingW = bld.width * 0.46;
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(wingW, bodyH + 2.8, bld.depth * 0.92),
      boxMaterials
    );
    wing.position.set(
      bld.width * 0.34,
      plinthH + (bodyH + 2.8) / 2,
      -bld.depth * 0.42
    );
    wing.rotation.y = 0.46;
    wing.castShadow = true;
    wing.receiveShadow = true;
    group.add(wing);
  } else if (bld.shape === 'h-school') {
    // School I-1158 rear gymnasium/workshops block + connecting recreation gallery
    const rearWing = new THREE.Mesh(
      new THREE.BoxGeometry(bld.width * 0.85, bodyH * 0.85, 11),
      boxMaterials
    );
    rearWing.position.set(0, plinthH + (bodyH * 0.85) / 2, -bld.depth / 2 - 4.5);
    rearWing.castShadow = true;

    const connector = new THREE.Mesh(
      new THREE.BoxGeometry(9, bodyH * 0.72, 6),
      boxMaterials
    );
    connector.position.set(0, plinthH + (bodyH * 0.72) / 2, -bld.depth / 2 - 1.2);

    // Entrance portico with columns
    const porticoRoof = new THREE.Mesh(
      new THREE.BoxGeometry(8.5, 0.35, 3.2),
      accentMat
    );
    porticoRoof.position.set(0, 3.4, bld.depth / 2 + 1.5);
    group.add(rearWing, connector, porticoRoof);
  } else if (bld.shape === 'polyclinic-cross') {
    // Polyclinic И-1169 entrance diagnostics wing + glowing Red Cross sign
    const frontWing = new THREE.Mesh(
      new THREE.BoxGeometry(14, bodyH * 0.78, 8),
      boxMaterials
    );
    frontWing.position.set(0, plinthH + (bodyH * 0.78) / 2, bld.depth / 2 + 3.8);
    frontWing.castShadow = true;
    group.add(frontWing);

    const crossMat = new THREE.MeshStandardMaterial({
      color: '#d93829',
      emissive: isNight || isSunset ? '#ff3b28' : '#000000',
      emissiveIntensity: isNight ? 1.65 : isSunset ? 0.85 : 0,
      roughness: 0.35,
    });
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.2, 0.25), crossMat);
    crossV.position.set(0, bld.height - 1.8, bld.depth / 2 + 0.2);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 0.25), crossMat);
    crossH.position.set(0, bld.height - 1.8, bld.depth / 2 + 0.2);
    group.add(crossV, crossH);
  } else if (bld.shape === 'u-shape') {
    [-bld.width * 0.34, bld.width * 0.34].forEach((wx) => {
      const pavilion = new THREE.Mesh(
        new THREE.BoxGeometry(9.5, bodyH, 10),
        boxMaterials
      );
      pavilion.position.set(wx, plinthH + bodyH / 2, bld.depth / 2 + 3.5);
      pavilion.castShadow = true;
      group.add(pavilion);
    });
  }

  // 4. Technical attic band ("технический чердак с продухами") & roof parapet
  const parapetH = 0.95;
  const parapet = new THREE.Mesh(
    new THREE.BoxGeometry(bld.width + 0.35, parapetH, bld.depth + 0.35),
    accentMat
  );
  parapet.position.y = bld.height + parapetH / 2 - 0.2;
  group.add(parapet);

  const porchBulbMat = new THREE.MeshBasicMaterial({
    color: isNight ? 0xffd27d : isSunset ? 0xffbe66 : 0xd6d3cd,
  });

  if (bld.category === 'residential') {
    const step = bld.width / Math.max(1, bld.sections);
    const startX = -bld.width / 2 + step / 2;

    for (let i = 0; i < bld.sections; i++) {
      const sx = startX + i * step;

      // Elevator machine room penthouse + TV antenna mast on roof
      const pent = new THREE.Mesh(
        new THREE.BoxGeometry(4.4, 2.6, 4.8),
        endWallMat
      );
      pent.position.set(sx, bld.height + 1.3, -0.5);
      pent.castShadow = true;
      const pentRoof = new THREE.Mesh(
        new THREE.BoxGeometry(4.9, 0.28, 5.3),
        roofTarMat
      );
      pentRoof.position.set(sx, bld.height + 2.7, -0.5);

      // Collective Soviet Yagi TV antenna on elevator penthouse
      const antMast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6),
        plinthMat
      );
      antMast.position.set(sx + 1.2, bld.height + 3.9, -0.5);
      const antCross = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.06, 0.06),
        plinthMat
      );
      antCross.position.set(sx + 1.2, bld.height + 4.7, -0.5);
      group.add(pent, pentRoof, antMast, antCross);

      const loggiaStackH = bodyH - 2.3;
      const loggiaBoxMaterialsFront = [
        accentMat,
        accentMat,
        roofTarMat,
        plinthMat,
        loggiaFrontMat,
        loggiaFrontMat,
      ];
      const loggiaBoxMaterialsBack = [
        trimMat,
        trimMat,
        roofTarMat,
        plinthMat,
        loggiaBackMat,
        loggiaBackMat,
      ];

      // Series-authentic 3D loggia / bay window (эркер) / "сапожок" balcony stacks
      if (bld.series === 'P-44') {
        // P-44 signature "boot-shaped" ("сапожок") stepped angular balcony stack
        const bootMain = new THREE.Mesh(
          new THREE.BoxGeometry(3.6, loggiaStackH, 1.45),
          loggiaBoxMaterialsFront
        );
        bootMain.position.set(
          sx - step * 0.24,
          plinthH + loggiaStackH / 2 + 1.4,
          bld.depth / 2 + 0.65
        );
        bootMain.castShadow = true;

        const bootBevel = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, loggiaStackH, 1.15),
          loggiaBoxMaterialsFront
        );
        bootBevel.position.set(
          sx - step * 0.24 + 2.1,
          plinthH + loggiaStackH / 2 + 1.4,
          bld.depth / 2 + 0.45
        );
        bootBevel.rotation.y = -0.35;
        group.add(bootMain, bootBevel);
      } else if (bld.series === 'KOPE') {
        // KOPE signature faceted triangular/trapezoidal bay windows (эркеры)
        const erker = new THREE.Mesh(
          new THREE.CylinderGeometry(2.1, 2.1, loggiaStackH, 5),
          loggiaFrontMat
        );
        erker.position.set(
          sx - step * 0.22,
          plinthH + loggiaStackH / 2 + 1.4,
          bld.depth / 2 + 0.45
        );
        erker.castShadow = true;
        group.add(erker);
      } else {
        const loggiaFront = new THREE.Mesh(
          new THREE.BoxGeometry(3.6, loggiaStackH, 1.4),
          loggiaBoxMaterialsFront
        );
        loggiaFront.position.set(
          sx - step * 0.24,
          plinthH + loggiaStackH / 2 + 1.4,
          bld.depth / 2 + 0.6
        );
        loggiaFront.castShadow = true;
        group.add(loggiaFront);
      }

      const loggiaBack = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, loggiaStackH, 1.4),
        loggiaBoxMaterialsBack
      );
      loggiaBack.position.set(
        sx + step * 0.2,
        plinthH + loggiaStackH / 2 + 1.4,
        -bld.depth / 2 - 0.6
      );
      loggiaBack.castShadow = true;

      // Residential entrance vestibule (подъезд с козырьком и стальной дверью)
      const porch = new THREE.Mesh(
        new THREE.BoxGeometry(3.3, 2.9, 1.9),
        plinthMat
      );
      porch.position.set(sx, 1.45, bld.depth / 2 + 0.85);

      const door = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 2.1, 0.12),
        trimMat
      );
      door.position.set(sx, 1.25, bld.depth / 2 + 1.82);

      const canopy = new THREE.Mesh(
        new THREE.BoxGeometry(3.9, 0.26, 2.5),
        accentMat
      );
      canopy.position.set(sx, 3.0, bld.depth / 2 + 1.15);
      canopy.castShadow = true;

      // Glowing entrance porch lamp under canopy + warm ground spill in evening/night
      const porchLamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.16, 0.35),
        porchBulbMat
      );
      porchLamp.position.set(sx, 2.84, bld.depth / 2 + 1.55);
      group.add(porchLamp);

      if (isNight || isSunset) {
        const porchPool = new THREE.Mesh(
          new THREE.CircleGeometry(2.8, 12),
          new THREE.MeshBasicMaterial({
            color: 0xffb84d,
            transparent: true,
            opacity: isNight ? 0.26 : 0.12,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        porchPool.rotation.x = -Math.PI / 2;
        porchPool.position.set(sx, 0.04, bld.depth / 2 + 2.1);
        group.add(porchPool);
      }

      group.add(loggiaBack, porch, door, canopy);
    }

    // Red signal aviation beacon on tall high-rise towers (14+ floors) in evening/night
    if (bld.floors >= 14 && (isNight || isSunset)) {
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff2e1f })
      );
      beacon.position.set(0, bld.height + 3.1, -0.5);
      group.add(beacon);
    }
  } else if (bld.series === 'Universam' || bld.series === 'Produkti-Store') {
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(bld.width * 0.78, 0.45, 3.2),
      trimMat
    );
    canopy.position.set(0, Math.min(3.5, bld.height - 0.6), bld.depth / 2 + 1.4);
    canopy.castShadow = true;

    // Rooftop Soviet neon signboard ("УНИВЕРСАМ" / "ПРОДУКТЫ") that glows in evening/night
    const neonColor = bld.series === 'Universam' ? '#ff5733' : '#38bdf8';
    const signBoardMat = new THREE.MeshStandardMaterial({
      color: isNight || isSunset ? neonColor : accentColor,
      emissive: isNight || isSunset ? neonColor : '#000000',
      emissiveIntensity: isNight ? 1.85 : isSunset ? 0.95 : 0,
      roughness: 0.3,
    });
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(bld.width * 0.56, 1.35, 0.38),
      signBoardMat
    );
    signBoard.position.set(0, bld.height + 1.15, bld.depth / 2 - 0.4);
    group.add(canopy, signBoard);
  } else if (bld.series === 'ATS-Post-Office') {
    // Brutalist vertical sun-breaker ribs
    for (let rx = -bld.width / 2 + 3; rx <= bld.width / 2 - 3; rx += 3.5) {
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, bodyH, 0.9),
        accentMat
      );
      rib.position.set(rx, plinthH + bodyH / 2, bld.depth / 2 + 0.35);
      group.add(rib);
    }
  } else if (bld.series === 'TP-Substation') {
    // Rooftop ventilation deflectors on transformer substation / heating unit
    [-2.0, 2.0].forEach((vx) => {
      const vent = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 0.9, 8),
        plinthMat
      );
      vent.position.set(vx, bld.height + 0.6, 0);
      group.add(vent);
    });
  }

  group.traverse((child) => {
    child.userData = { entityKind: 'building', entityId: bld.id };
  });

  return group;
}
