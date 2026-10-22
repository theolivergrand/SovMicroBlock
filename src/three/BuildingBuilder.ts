import * as THREE from 'three';
import { BUILDING_SERIES_CATALOG } from '../generator/presets';
import { GeneratedBuilding, TimeOfDayId } from '../generator/types';
import { createPanelFacadeTexture } from './SovietMaterials';

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

  const facadeTex = createPanelFacadeTexture(
    bld.series,
    bld.facadeVariant,
    timeOfDay,
    maxAnisotropy
  );
  facadeTex.repeat.set(Math.max(1, Math.round(bld.width / 7.2)), Math.max(1, bld.floors));

  const facadeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: facadeTex,
    bumpMap: sharedBumpTex,
    bumpScale: 0.04,
    roughness: 0.72,
    metalness: 0.08,
  });

  const endWallMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    bumpMap: sharedBumpTex,
    bumpScale: 0.05,
    roughness: 0.78,
    metalness: 0.05,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: secondaryColor,
    roughness: 0.55,
    metalness: 0.15,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.48,
    metalness: 0.2,
  });

  const roofTarMat = new THREE.MeshStandardMaterial({
    color: '#2d3034',
    roughness: 0.92,
    metalness: 0.05,
  });

  const plinthMat = new THREE.MeshStandardMaterial({
    color: '#4a4e54',
    roughness: 0.88,
    metalness: 0.08,
  });

  // 1. Concrete plinth base (цоколь)
  const plinthH = 0.75;
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(bld.width + 0.4, plinthH, bld.depth + 0.4),
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
    const wingD = Math.min(28, bld.width * 0.45);
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(wingW, bodyH, wingD),
      boxMaterials
    );
    wing.position.set(bld.width / 2 - wingW / 2, plinthH + bodyH / 2, -bld.depth / 2 - wingD / 2 + 0.2);
    wing.castShadow = true;
    wing.receiveShadow = true;
    group.add(wing);
  } else if (bld.shape === 'triskele') {
    const wingW = bld.width * 0.45;
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(wingW, bodyH + 3.0, bld.depth * 0.92),
      boxMaterials
    );
    wing.position.set(bld.width * 0.36, plinthH + (bodyH + 3.0) / 2, -bld.depth * 0.45);
    wing.rotation.y = 0.48;
    wing.castShadow = true;
    wing.receiveShadow = true;
    group.add(wing);
  } else if (bld.shape === 'h-school') {
    const rearWing = new THREE.Mesh(
      new THREE.BoxGeometry(bld.width * 0.85, bodyH * 0.85, 11),
      boxMaterials
    );
    rearWing.position.set(0, plinthH + (bodyH * 0.85) / 2, -bld.depth / 2 - 4);
    rearWing.castShadow = true;
    group.add(rearWing);
  } else if (bld.shape === 'polyclinic-cross') {
    // Polyclinic И-1169 entrance diagnostics wing + Red Cross sign
    const frontWing = new THREE.Mesh(
      new THREE.BoxGeometry(14, bodyH * 0.78, 8),
      boxMaterials
    );
    frontWing.position.set(0, plinthH + (bodyH * 0.78) / 2, bld.depth / 2 + 3.8);
    frontWing.castShadow = true;
    group.add(frontWing);

    // Red Cross medical emblem on facade
    const crossMat = new THREE.MeshStandardMaterial({ color: '#c93429', roughness: 0.4 });
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

  // 4. Roof parapet, technical floor & elevator machine rooms
  const parapetH = 0.9;
  const parapet = new THREE.Mesh(
    new THREE.BoxGeometry(bld.width + 0.3, parapetH, bld.depth + 0.3),
    accentMat
  );
  parapet.position.y = bld.height + parapetH / 2 - 0.2;
  group.add(parapet);

  if (bld.category === 'residential') {
    const step = bld.width / Math.max(1, bld.sections);
    const startX = -bld.width / 2 + step / 2;
    for (let i = 0; i < bld.sections; i++) {
      const sx = startX + i * step;
      const pent = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.5, 4.8), endWallMat);
      pent.position.set(sx, bld.height + 1.25, -0.5);
      pent.castShadow = true;
      const pentRoof = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.25, 5.2), roofTarMat);
      pentRoof.position.set(sx, bld.height + 2.6, -0.5);
      group.add(pent, pentRoof);

      const loggiaStackH = bodyH - 2.4;
      const loggiaFront = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, loggiaStackH, 1.35),
        accentMat
      );
      loggiaFront.position.set(sx - step * 0.24, plinthH + loggiaStackH / 2 + 1.4, bld.depth / 2 + 0.55);
      loggiaFront.castShadow = true;

      const loggiaBack = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, loggiaStackH, 1.4),
        trimMat
      );
      loggiaBack.position.set(sx + step * 0.2, plinthH + loggiaStackH / 2 + 1.4, -bld.depth / 2 - 0.55);
      loggiaBack.castShadow = true;

      const porch = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.9, 1.8), plinthMat);
      porch.position.set(sx, 1.45, bld.depth / 2 + 0.8);
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.24, 2.4), accentMat);
      canopy.position.set(sx, 3.0, bld.depth / 2 + 1.1);
      canopy.castShadow = true;

      group.add(loggiaFront, loggiaBack, porch, canopy);
    }
  } else if (bld.series === 'Universam' || bld.series === 'Produkti-Store') {
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(bld.width * 0.78, 0.45, 3.2), trimMat);
    canopy.position.set(0, Math.min(3.5, bld.height - 0.6), bld.depth / 2 + 1.4);
    canopy.castShadow = true;
    // Rooftop Soviet neon signboard backing ("УНИВЕРСАМ" / "ПРОДУКТЫ")
    const signBoard = new THREE.Mesh(
      new THREE.BoxGeometry(bld.width * 0.55, 1.3, 0.35),
      trimMat
    );
    signBoard.position.set(0, bld.height + 1.1, bld.depth / 2 - 0.4);
    group.add(canopy, signBoard);
  } else if (bld.series === 'ATS-Post-Office') {
    // Brutalist vertical sun-breaker ribs
    for (let rx = -bld.width / 2 + 3; rx <= bld.width / 2 - 3; rx += 3.5) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.4, bodyH, 0.9), accentMat);
      rib.position.set(rx, plinthH + bodyH / 2, bld.depth / 2 + 0.35);
      group.add(rib);
    }
  }

  group.traverse((child) => {
    child.userData = { entityKind: 'building', entityId: bld.id };
  });

  return group;
}
