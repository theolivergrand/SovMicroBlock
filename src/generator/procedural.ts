import { BUILDING_SERIES_CATALOG, DISTRICT_PRESETS, RESIDENTIAL_SERIES_IDS } from './presets';
import {
  BenchAndUrnItem,
  BuildingSeriesId,
  DistrictMetrics,
  GeneratedBuilding,
  GeneratedDistrict,
  GeneratorParams,
  PedestrianAgentSpec,
  PedestrianPathSegment,
  PlayEquipmentItem,
  PlayEquipmentType,
  PlaygroundZone,
  StreetLampItem,
  VegetationItem,
} from './types';

export function createSeededRng(seed: number): () => number {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface CourtyardSlot {
  index: number;
  cx: number;
  cz: number;
  radius: number;
  name: string;
}

const PLAY_EQUIPMENT_LABELS: Record<PlayEquipmentType, string> = {
  'rocket-slide': 'Горка «Космическая ракета»',
  'geodesic-dome': 'Геодезический купол «Паутинка»',
  'swing-set': 'Двухместные качели на А-стойках',
  'sandbox-mushroom': 'Песочница с деревянным грибком',
  'merry-go-round': 'Карусель «Солнышко»',
  'monkey-bars': 'Рукоход «Радуга» и турники',
  'hockey-box': 'Дворовая хоккейная / спорткоробка',
  'carpet-beater': 'Стойка для выбивания ковров и сушки белья',
};

function computeBuildingEntrances(
  x: number,
  z: number,
  rotation: number,
  width: number,
  depth: number,
  sections: number,
  category: 'residential' | 'social' | 'utility'
): { x: number; z: number; angle: number }[] {
  if (category !== 'residential') {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const offsetZ = depth / 2 + 1.2;
    return [
      {
        x: x + sin * offsetZ,
        z: z + cos * offsetZ,
        angle: rotation,
      },
    ];
  }

  const entrances: { x: number; z: number; angle: number }[] = [];
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const step = width / Math.max(1, sections);
  const startLocalX = -width / 2 + step / 2;
  const frontLocalZ = depth / 2 + 0.8;

  for (let i = 0; i < sections; i++) {
    const lx = startLocalX + i * step;
    const lz = frontLocalZ;
    const wx = x + lx * cos + lz * sin;
    const wz = z - lx * sin + lz * cos;
    entrances.push({ x: wx, z: wz, angle: rotation });
  }
  return entrances;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function generateMicrodistrict(params: GeneratorParams): GeneratedDistrict {
  const rng = createSeededRng(params.seed);
  const presetSpec = DISTRICT_PRESETS[params.preset] ?? DISTRICT_PRESETS.chertanovo;
  const worldSize = 260;

  const buildings: GeneratedBuilding[] = [];
  const playgrounds: PlaygroundZone[] = [];
  const paths: PedestrianPathSegment[] = [];
  const benchesAndUrns: BenchAndUrnItem[] = [];
  const vegetation: VegetationItem[] = [];
  const streetLamps: StreetLampItem[] = [];
  const pedestrians: PedestrianAgentSpec[] = [];

  const activeResSeries: BuildingSeriesId[] =
    params.allowedResidentialSeries && params.allowedResidentialSeries.length > 0
      ? params.allowedResidentialSeries
      : presetSpec.defaultParams.allowedResidentialSeries.length > 0
      ? presetSpec.defaultParams.allowedResidentialSeries
      : RESIDENTIAL_SERIES_IDS;

  const pickResSeries = (preferred: BuildingSeriesId, fallbackIndex = 0): BuildingSeriesId => {
    if (activeResSeries.includes(preferred)) return preferred;
    return activeResSeries[fallbackIndex % activeResSeries.length];
  };

  const courtyards: CourtyardSlot[] = [
    { index: 1, cx: -58, cz: -54, radius: 34, name: 'Северо-западный жилой двор' },
    { index: 2, cx: 58, cz: -54, radius: 34, name: 'Северо-восточный жилой двор' },
    { index: 3, cx: -58, cz: 54, radius: 34, name: 'Юго-западный жилой двор' },
    { index: 4, cx: 58, cz: 54, radius: 34, name: 'Юго-восточный спортивно-игровой двор' },
  ];

  let buildingCounter = 1;
  const streetPool = presetSpec.streetNames;

  const addBuilding = (
    seriesId: BuildingSeriesId,
    x: number,
    z: number,
    rotation: number,
    customSections?: number,
    customShape?: GeneratedBuilding['shape']
  ) => {
    const spec = BUILDING_SERIES_CATALOG[seriesId];
    const sections =
      spec.category === 'residential'
        ? customSections ?? Math.max(1, Math.round(spec.defaultSections * (0.85 + rng() * 0.35)))
        : 1;

    const rawFloors =
      spec.category === 'residential'
        ? spec.defaultFloors + params.maxFloorsBias + Math.round((rng() - 0.5) * 2)
        : spec.defaultFloors;
    const floors =
      spec.category === 'residential'
        ? clamp(rawFloors, Math.max(5, spec.minFloors - 2), Math.min(25, spec.maxFloors + 4))
        : spec.defaultFloors;

    const width = spec.sectionWidth * sections;
    const depth = spec.sectionDepth;
    const height = floors * 3.0 + (spec.category === 'residential' ? 2.2 : 1.5);

    let shape: GeneratedBuilding['shape'] = customShape ?? 'linear';
    if (!customShape) {
      if (seriesId === 'OMR-Chertanovo') shape = rng() > 0.45 ? 'triskele' : 'l-shape';
      else if (seriesId === 'P-44' || seriesId === 'P-3' || seriesId === 'P-46')
        shape = sections >= 3 && rng() > 0.4 ? 'l-shape' : 'linear';
      else if (seriesId === 'II-68') shape = 'tower';
      else if (seriesId === 'School-I-1158') shape = 'h-school';
      else if (seriesId === 'Polyclinic-I-1169') shape = 'polyclinic-cross';
    }

    const apartments =
      spec.category === 'residential' ? floors * sections * spec.apartmentsPerFloorPerSection : 0;
    const residents = Math.round(apartments * (2.65 + rng() * 0.45));
    const street = streetPool[(buildingCounter - 1) % streetPool.length];
    const houseNum = 10 + buildingCounter * 2;
    const korpus = (buildingCounter % 4) + 1;

    const [minYear, maxYear] = spec.yearRange;
    const yearBuilt = minYear + Math.floor(rng() * (maxYear - minYear + 1));

    const variants = spec.facadeVariants;
    const facadeVariant = variants[Math.floor(rng() * variants.length)] ?? {
      id: 'default',
      name: 'Типовая отделка панели',
      materialType: 'Керамическая плитка и окрашенный бетон',
      primaryColor: spec.facadePrimaryColor,
      secondaryColor: spec.facadeSecondaryColor,
      accentColor: spec.accentColor,
    };

    const entrances = computeBuildingEntrances(x, z, rotation, width, depth, sections, spec.category);

    buildings.push({
      id: `bld-${buildingCounter}`,
      series: seriesId,
      category: spec.category,
      name: spec.name,
      address: `${street}, д. ${houseNum}${spec.category === 'residential' ? `, корп. ${korpus}` : ' (соцкультбыт)'}`,
      x,
      z,
      rotation,
      floors,
      sections,
      width,
      depth,
      height,
      shape,
      apartments,
      residents,
      yearBuilt,
      facadeVariant,
      snipNormRadiusMeters: spec.snipNormRadiusMeters,
      snipCapacityLabel: spec.snipCapacityLabel,
      entrances,
    });
    buildingCounter++;
  };

  // 1. Place Late-Soviet Social Infrastructure (по нормам СНиП II-60-75)
  addBuilding('School-I-1158', 0, -14, 0, 1, 'h-school');
  addBuilding('Kindergarten-I-1194', 2, 24, 0, 1, 'u-shape');

  addBuilding('Universam', -86, 100, 0, 1, 'linear');
  addBuilding('Polyclinic-I-1169', 84, 98, Math.PI, 1, 'polyclinic-cross');
  addBuilding('Produkti-Store', -98, -6, Math.PI / 2, 1, 'linear');

  if (params.socialInfraLevel >= 0.7) {
    addBuilding('Produkti-Store', 98, -10, -Math.PI / 2, 1, 'linear');
  }
  if (params.socialInfraLevel >= 0.8) {
    addBuilding('ATS-Post-Office', -84, -100, 0, 1, 'linear');
  }
  if (params.socialInfraLevel >= 0.9) {
    addBuilding('Kindergarten-I-1194', 82, -98, Math.PI, 1, 'u-shape');
  }

  addBuilding('TP-Substation', -25, 10, Math.PI / 2, 1, 'linear');
  if (params.buildingDensity > 0.55) {
    addBuilding('TP-Substation', 29, -20, 0, 1, 'linear');
  }

  // 2. Place Residential Buildings around the 4 Courtyards
  courtyards.forEach((cy, idx) => {
    const signX = cy.cx < 0 ? -1 : 1;
    const signZ = cy.cz < 0 ? -1 : 1;

    if (params.preset === 'chertanovo') {
      const baseAngle = signX * signZ * 0.22;
      addBuilding(
        pickResSeries('OMR-Chertanovo', idx),
        cy.cx + signX * 28,
        cy.cz + signZ * 26,
        baseAngle + (signZ > 0 ? Math.PI : 0),
        4,
        'triskele'
      );
      addBuilding(
        pickResSeries('P-44', idx + 1),
        cy.cx - signX * 24,
        cy.cz + signZ * 30,
        (signZ > 0 ? Math.PI : 0) - baseAngle * 0.5,
        3,
        'l-shape'
      );
      if (params.buildingDensity >= 0.55 || idx % 2 === 0) {
        addBuilding(
          pickResSeries(idx % 2 === 0 ? 'KOPE' : '1605-AM', idx + 2),
          cy.cx + signX * 36,
          cy.cz - signZ * 18,
          signX > 0 ? -Math.PI / 2 : Math.PI / 2,
          3,
          'linear'
        );
      }
    } else if (params.preset === 'belyayevo') {
      addBuilding(
        pickResSeries(idx % 2 === 0 ? '1-515-9M' : 'II-49', idx),
        cy.cx,
        cy.cz + signZ * 34,
        signZ > 0 ? Math.PI : 0,
        5,
        'linear'
      );
      addBuilding(
        pickResSeries(idx % 2 === 0 ? '1605-AM' : '1-515-9M', idx + 1),
        cy.cx + signX * 34,
        cy.cz - signZ * 4,
        signX > 0 ? -Math.PI / 2 : Math.PI / 2,
        4,
        'linear'
      );
      addBuilding(
        pickResSeries('II-68', idx + 2),
        cy.cx - signX * 30,
        cy.cz + signZ * 28,
        0,
        1,
        'tower'
      );
      if (params.buildingDensity >= 0.7) {
        addBuilding(
          pickResSeries('P-3', idx + 3),
          cy.cx + signX * 34,
          cy.cz + signZ * 34,
          0,
          2,
          'linear'
        );
      }
    } else if (params.preset === 'yasenevo') {
      addBuilding(
        pickResSeries('P-44', idx),
        cy.cx,
        cy.cz + signZ * 33,
        signZ > 0 ? Math.PI : 0,
        4,
        'l-shape'
      );
      addBuilding(
        pickResSeries(idx % 2 === 0 ? 'P-3' : 'P-46', idx + 1),
        cy.cx + signX * 35,
        cy.cz,
        signX > 0 ? -Math.PI / 2 : Math.PI / 2,
        4,
        'l-shape'
      );
      if (params.buildingDensity >= 0.62) {
        addBuilding(
          pickResSeries('KOPE', idx + 2),
          cy.cx - signX * 28,
          cy.cz - signZ * 26,
          signZ > 0 ? 0 : Math.PI,
          3,
          'linear'
        );
      }
    } else {
      addBuilding(
        pickResSeries(idx % 2 === 0 ? '1-515-9M' : 'II-49', idx),
        cy.cx - signX * 6,
        cy.cz + signZ * 32,
        signZ > 0 ? Math.PI : 0,
        4,
        'linear'
      );
      addBuilding(
        pickResSeries('KOPE', idx + 1),
        cy.cx + signX * 34,
        cy.cz + signZ * 4,
        signX > 0 ? -Math.PI / 2 : Math.PI / 2,
        3,
        'linear'
      );
      addBuilding(
        pickResSeries('P-44', idx + 2),
        cy.cx - signX * 30,
        cy.cz - signZ * 18,
        signX > 0 ? Math.PI / 2 : -Math.PI / 2,
        3,
        'l-shape'
      );
      if (params.buildingDensity >= 0.66) {
        addBuilding(
          pickResSeries('II-68', idx + 3),
          cy.cx + signX * 28,
          cy.cz - signZ * 28,
          0,
          1,
          'tower'
        );
      }
    }
  });

  if (params.buildingDensity >= 0.82) {
    const towerSeries = pickResSeries(params.preset === 'belyayevo' ? 'II-68' : 'KOPE', 0);
    addBuilding(towerSeries, 0, -100, 0, towerSeries === 'II-68' ? 1 : 2);
  }

  // 3. Generate Courtyards & Playgrounds
  courtyards.forEach((cy, idx) => {
    const isSportYard = idx === 3;
    const width = isSportYard ? 26 : 22;
    const depth = isSportYard ? 20 : 18;
    const equip: PlayEquipmentItem[] = [];

    if (isSportYard) {
      equip.push({
        id: `eq-${cy.index}-hockey`,
        type: 'hockey-box',
        name: PLAY_EQUIPMENT_LABELS['hockey-box'],
        x: cy.cx - 3,
        z: cy.cz,
        rotation: 0,
        scale: 1,
      });
      equip.push({
        id: `eq-${cy.index}-bars`,
        type: 'monkey-bars',
        name: PLAY_EQUIPMENT_LABELS['monkey-bars'],
        x: cy.cx + 9.5,
        z: cy.cz - 4,
        rotation: Math.PI / 2,
        scale: 1,
      });
      equip.push({
        id: `eq-${cy.index}-carpet`,
        type: 'carpet-beater',
        name: PLAY_EQUIPMENT_LABELS['carpet-beater'],
        x: cy.cx + 9.5,
        z: cy.cz + 5,
        rotation: 0,
        scale: 1,
      });
    } else {
      equip.push({
        id: `eq-${cy.index}-rocket`,
        type: idx % 2 === 0 ? 'rocket-slide' : 'geodesic-dome',
        name: PLAY_EQUIPMENT_LABELS[idx % 2 === 0 ? 'rocket-slide' : 'geodesic-dome'],
        x: cy.cx - 4.5,
        z: cy.cz - 2.5,
        rotation: rng() * Math.PI * 0.5,
        scale: 1,
      });
      equip.push({
        id: `eq-${cy.index}-sandbox`,
        type: 'sandbox-mushroom',
        name: PLAY_EQUIPMENT_LABELS['sandbox-mushroom'],
        x: cy.cx + 4.5,
        z: cy.cz - 3,
        rotation: 0,
        scale: 1,
      });
      equip.push({
        id: `eq-${cy.index}-swing`,
        type: 'swing-set',
        name: PLAY_EQUIPMENT_LABELS['swing-set'],
        x: cy.cx - 4.5,
        z: cy.cz + 4.2,
        rotation: 0,
        scale: 1,
      });

      if (params.courtyardComplexity >= 0.55) {
        equip.push({
          id: `eq-${cy.index}-carousel`,
          type: 'merry-go-round',
          name: PLAY_EQUIPMENT_LABELS['merry-go-round'],
          x: cy.cx + 4.2,
          z: cy.cz + 4.0,
          rotation: rng() * Math.PI,
          scale: 1,
        });
      }
      if (params.courtyardComplexity >= 0.75) {
        equip.push({
          id: `eq-${cy.index}-extra-dome`,
          type: idx % 2 === 0 ? 'geodesic-dome' : 'monkey-bars',
          name: PLAY_EQUIPMENT_LABELS[idx % 2 === 0 ? 'geodesic-dome' : 'monkey-bars'],
          x: cy.cx,
          z: cy.cz - 6.2,
          rotation: 0,
          scale: 0.95,
        });
      }
      if (params.courtyardComplexity >= 0.85) {
        equip.push({
          id: `eq-${cy.index}-carpet`,
          type: 'carpet-beater',
          name: PLAY_EQUIPMENT_LABELS['carpet-beater'],
          x: cy.cx + 9.2,
          z: cy.cz,
          rotation: Math.PI / 2,
          scale: 1,
        });
      }
    }

    const benchColors: BenchAndUrnItem['colorVariant'][] = ['ochre', 'green', 'blue', 'red'];
    const pgBenchPositions = [
      { x: cy.cx - width / 2 + 3.5, z: cy.cz - depth / 2 - 1.3, rot: 0 },
      { x: cy.cx + width / 2 - 3.5, z: cy.cz - depth / 2 - 1.3, rot: 0 },
      { x: cy.cx - width / 2 + 3.5, z: cy.cz + depth / 2 + 1.3, rot: Math.PI },
      { x: cy.cx + width / 2 - 3.5, z: cy.cz + depth / 2 + 1.3, rot: Math.PI },
    ];
    const activePgBenches = pgBenchPositions.slice(
      0,
      Math.max(2, Math.round(pgBenchPositions.length * params.courtyardComplexity))
    );

    activePgBenches.forEach((bPos, bIdx) => {
      benchesAndUrns.push({
        id: `bench-pg-${cy.index}-${bIdx}`,
        x: bPos.x,
        z: bPos.z,
        rotation: bPos.rot,
        hasUrn: true,
        urnOffsetSide: bIdx % 2 === 0 ? 'right' : 'left',
        locationType: 'playground',
        colorVariant: benchColors[(cy.index + bIdx) % benchColors.length],
      });
    });

    playgrounds.push({
      id: `pg-${cy.index}`,
      name: isSportYard
        ? `Спортивно-игровой комплекс двора №${cy.index}`
        : `Детская площадка двора №${cy.index} («Космос»)`,
      courtyardIndex: cy.index,
      x: cy.cx,
      z: cy.cz,
      width,
      depth,
      rotation: 0,
      surfaceType: isSportYard ? 'asphalt-sport' : idx % 2 === 0 ? 'sand' : 'crumb-red',
      equipment: equip,
      benchCount: activePgBenches.length,
      urnCount: activePgBenches.length,
    });
  });

  playgrounds.push({
    id: 'pg-kindergarten',
    name: 'Прогулочная площадка детского сада И-1194',
    courtyardIndex: 5,
    x: 2,
    z: 44,
    width: 24,
    depth: 11,
    rotation: 0,
    surfaceType: 'sand',
    equipment: [
      {
        id: 'eq-kg-1',
        type: 'sandbox-mushroom',
        name: PLAY_EQUIPMENT_LABELS['sandbox-mushroom'],
        x: -6,
        z: 44,
        rotation: 0,
        scale: 1,
      },
      {
        id: 'eq-kg-2',
        type: 'sandbox-mushroom',
        name: PLAY_EQUIPMENT_LABELS['sandbox-mushroom'],
        x: 10,
        z: 44,
        rotation: 0,
        scale: 1,
      },
      {
        id: 'eq-kg-3',
        type: 'merry-go-round',
        name: PLAY_EQUIPMENT_LABELS['merry-go-round'],
        x: 2,
        z: 44,
        rotation: 0.4,
        scale: 0.9,
      },
    ],
    benchCount: 2,
    urnCount: 2,
  });

  // 4. Generate Pedestrian Sidewalks & Courtyard Walkways
  let pathCounter = 1;
  const addPath = (
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    width: number,
    kind: PedestrianPathSegment['kind'],
    hasCurb = true
  ) => {
    paths.push({
      id: `path-${pathCounter++}`,
      x1,
      z1,
      x2,
      z2,
      width,
      kind,
      hasCurb,
    });
  };

  addPath(-115, -38, 115, -38, 3.6, 'main-alley', true);
  addPath(-115, 38, 115, 38, 3.6, 'main-alley', true);
  addPath(-38, -115, -38, 115, 3.6, 'main-alley', true);
  addPath(38, -115, 38, 115, 3.6, 'main-alley', true);

  courtyards.forEach((cy) => {
    const nearestBoulevardX = cy.cx < 0 ? -38 : 38;
    const nearestBoulevardZ = cy.cz < 0 ? -38 : 38;
    addPath(nearestBoulevardX, cy.cz, cy.cx, cy.cz, 2.4, 'courtyard-walk', true);
    addPath(cy.cx, nearestBoulevardZ, cy.cx, cy.cz, 2.4, 'courtyard-walk', true);

    if (params.sidewalkDensity >= 0.65) {
      const hw = 12;
      const hd = 10;
      addPath(cy.cx - hw, cy.cz - hd, cy.cx + hw, cy.cz - hd, 1.8, 'courtyard-walk', true);
      addPath(cy.cx - hw, cy.cz + hd, cy.cx + hw, cy.cz + hd, 1.8, 'courtyard-walk', true);
      addPath(cy.cx - hw, cy.cz - hd, cy.cx - hw, cy.cz + hd, 1.8, 'courtyard-walk', true);
      addPath(cy.cx + hw, cy.cz - hd, cy.cx + hw, cy.cz + hd, 1.8, 'courtyard-walk', true);
    }
  });

  const benchColors: BenchAndUrnItem['colorVariant'][] = ['green', 'ochre', 'blue', 'red'];
  buildings.forEach((bld, bIdx) => {
    bld.entrances.forEach((ent, eIdx) => {
      const cos = Math.cos(ent.angle);
      const sin = Math.sin(ent.angle);
      const walkLen = 5.5;
      const targetX = ent.x + sin * walkLen;
      const targetZ = ent.z + cos * walkLen;

      if (params.sidewalkDensity >= 0.4) {
        addPath(ent.x, ent.z, targetX, targetZ, 1.8, 'entrance-approach', false);
      }

      if (bld.category === 'residential' && (eIdx % 2 === 0 || params.courtyardComplexity >= 0.6)) {
        const sideOffset = 2.1;
        const forwardOffset = 1.6;
        const bx = ent.x + cos * sideOffset + sin * forwardOffset;
        const bz = ent.z - sin * sideOffset + cos * forwardOffset;

        benchesAndUrns.push({
          id: `bench-ent-${bld.id}-${eIdx}`,
          x: bx,
          z: bz,
          rotation: ent.angle - Math.PI / 2,
          hasUrn: true,
          urnOffsetSide: 'right',
          locationType: 'entrance',
          colorVariant: benchColors[(bIdx + eIdx) % benchColors.length],
        });
      }
    });
  });

  const alleyBenchCoords = [
    { x: -20, z: -40.4, rot: 0 },
    { x: 20, z: -40.4, rot: 0 },
    { x: -20, z: 40.4, rot: Math.PI },
    { x: 20, z: 40.4, rot: Math.PI },
    { x: -40.4, z: -18, rot: Math.PI / 2 },
    { x: -40.4, z: 18, rot: Math.PI / 2 },
    { x: 40.4, z: -18, rot: -Math.PI / 2 },
    { x: 40.4, z: 18, rot: -Math.PI / 2 },
  ];
  alleyBenchCoords.forEach((ab, idx) => {
    if (idx / alleyBenchCoords.length <= params.courtyardComplexity) {
      benchesAndUrns.push({
        id: `bench-alley-${idx}`,
        x: ab.x,
        z: ab.z,
        rotation: ab.rot,
        hasUrn: idx % 2 === 0,
        urnOffsetSide: 'left',
        locationType: 'path',
        colorVariant: benchColors[idx % benchColors.length],
      });
    }
  });

  // 5. Generate Soviet Streetlamps (Опоры освещения РКУ «Кобра» вдоль аллей и во дворах)
  let lampCounter = 1;
  const lampStops = [-92, -62, -28, 0, 28, 62, 92];
  lampStops.forEach((coord) => {
    // Along horizontal boulevards (z = -38 and z = 38)
    streetLamps.push({
      id: `lamp-${lampCounter++}`,
      x: coord,
      z: -35.6,
      rotation: Math.PI, // arm points to -z (-38)
      height: 6.4,
    });
    streetLamps.push({
      id: `lamp-${lampCounter++}`,
      x: coord,
      z: 35.6,
      rotation: 0, // arm points to +z (38)
      height: 6.4,
    });
  });
  // Courtyard playground corner lamps
  courtyards.forEach((cy) => {
    streetLamps.push({
      id: `lamp-cy-${cy.index}-a`,
      x: cy.cx - 11.5,
      z: cy.cz - 9.5,
      rotation: Math.PI * 0.25,
      height: 5.6,
    });
    streetLamps.push({
      id: `lamp-cy-${cy.index}-b`,
      x: cy.cx + 11.5,
      z: cy.cz + 9.5,
      rotation: -Math.PI * 0.75,
      height: 5.6,
    });
  });

  // 6. Generate Pedestrians Going About Their Daily Business (Пешеходы, идущие по своим делам)
  const pedDensity = params.pedestrianDensity ?? 0.8;
  const targetPedCount = Math.max(8, Math.round(38 * pedDensity));

  const coatPalette = [
    '#2c4359', // тёмно-синее пальто
    '#5e4332', // коричневое драповое пальто
    '#7a3b2e', // бордовая куртка
    '#3b5c4a', // тёмно-зелёный плащ
    '#8c6d46', // бежево-верблюжье пальто
    '#4a4d52', // графитовое пальто
    '#325e7a', // синяя советская «олимпийка»
  ];
  const pantsPalette = ['#23272e', '#343840', '#2b3648', '#3d352e'];
  const hatPalette = ['#2b2623', '#8c3b2b', '#385475', '#b89f7d', '#4a453f'];
  const bagPalette = ['#c95b2b', '#2e5d82', '#523b2a', '#d49b35'];

  // Define realistic closed-loop pedestrian routes along the sidewalk graph
  const routeTemplates: {
    activity: string;
    role: PedestrianAgentSpec['role'];
    waypoints: { x: number; z: number }[];
  }[] = [
    {
      activity: 'Идёт в Универсам за продуктами с авоськой',
      role: 'shopper',
      waypoints: [
        { x: -86, z: 88 },
        { x: -38, z: 88 },
        { x: -38, z: 38 },
        { x: -86, z: 38 },
      ],
    },
    {
      activity: 'Возвращается с работы от метро к подъезду',
      role: 'worker',
      waypoints: [
        { x: -112, z: -38 },
        { x: -38, z: -38 },
        { x: 38, z: -38 },
        { x: 112, z: -38 },
      ],
    },
    {
      activity: 'Идёт по южному бульвару мимо поликлиники и универсама',
      role: 'worker',
      waypoints: [
        { x: -112, z: 38 },
        { x: -38, z: 38 },
        { x: 38, z: 38 },
        { x: 112, z: 38 },
      ],
    },
    {
      activity: 'Спешит в булочную «Продукты» и обратно во двор',
      role: 'shopper',
      waypoints: [
        { x: -90, z: -6 },
        { x: -38, z: -6 },
        { x: -38, z: -54 },
        { x: -58, z: -54 },
        { x: -38, z: -54 },
        { x: -38, z: -6 },
      ],
    },
    {
      activity: 'Ведёт ребёнка из детского сада И-1194 через зелёный двор',
      role: 'parent',
      waypoints: [
        { x: 2, z: 38 },
        { x: 38, z: 38 },
        { x: 38, z: 54 },
        { x: 58, z: 54 },
        { x: 38, z: 54 },
        { x: 38, z: 38 },
      ],
    },
    {
      activity: 'Идёт из школы И-1158 к северо-восточному двору',
      role: 'student',
      waypoints: [
        { x: 0, z: -38 },
        { x: 38, z: -38 },
        { x: 58, z: -38 },
        { x: 58, z: -54 },
        { x: 38, z: -54 },
        { x: 38, z: -38 },
      ],
    },
    {
      activity: 'Направляется в районную поликлинику И-1169',
      role: 'pensioner',
      waypoints: [
        { x: 38, z: -38 },
        { x: 38, z: 38 },
        { x: 38, z: 88 },
        { x: 84, z: 88 },
        { x: 38, z: 88 },
        { x: 38, z: 38 },
      ],
    },
    {
      activity: 'Прогуливается вокруг детской площадки «Космос» (двор №1)',
      role: 'parent',
      waypoints: [
        { x: -70, z: -64 },
        { x: -46, z: -64 },
        { x: -46, z: -44 },
        { x: -70, z: -44 },
      ],
    },
    {
      activity: 'Прогуливается вокруг детской площадки двора №3',
      role: 'pensioner',
      waypoints: [
        { x: -70, z: 44 },
        { x: -46, z: 44 },
        { x: -46, z: 64 },
        { x: -70, z: 64 },
      ],
    },
    {
      activity: 'Идёт вдоль спортивной коробки двора №4 к Дому быта',
      role: 'worker',
      waypoints: [
        { x: -38, z: 105 },
        { x: -38, z: 38 },
        { x: -38, z: -38 },
        { x: -38, z: -96 },
      ],
    },
  ];

  const firstNames = [
    'Товарищ Соколов',
    'Нина Павловна',
    'Инженер Морозов',
    'Сергей Петрович',
    'Галина Ивановна',
    'Студентка Лена',
    'Товарищ Кузнецов',
    'Татьяна Борисовна',
    'Школьник Дима',
    'Виктор Андреевич',
  ];

  for (let i = 0; i < targetPedCount; i++) {
    const tpl = routeTemplates[i % routeTemplates.length];
    const reverse = i % 2 === 1;
    const waypoints = reverse ? [...tpl.waypoints].reverse() : tpl.waypoints;

    pedestrians.push({
      id: `ped-${i + 1}`,
      name: firstNames[i % firstNames.length],
      activity: tpl.activity,
      role: tpl.role,
      coatColor: coatPalette[(i + Math.floor(rng() * 3)) % coatPalette.length],
      pantsColor: pantsPalette[i % pantsPalette.length],
      hatColor: hatPalette[(i + 2) % hatPalette.length],
      hasBag: i % 3 !== 0,
      bagColor: bagPalette[i % bagPalette.length],
      speed: tpl.role === 'pensioner' ? 1.15 : tpl.role === 'student' ? 1.75 : 1.4 + (i % 3) * 0.12,
      initialPhase: (i / targetPedCount + rng() * 0.15) % 1,
      lateralOffset: (reverse ? 0.55 : -0.55) + (rng() - 0.5) * 0.25,
      waypoints,
    });
  }

  // 7. Generate Green Landscaping (Деревья и кустарники)
  const isTooCloseToBuildingOrPlayground = (x: number, z: number, minBldClearance = 4.5): boolean => {
    for (const b of buildings) {
      const dx = x - b.x;
      const dz = z - b.z;
      const cos = Math.cos(-b.rotation);
      const sin = Math.sin(-b.rotation);
      const lx = Math.abs(dx * cos - dz * sin);
      const lz = Math.abs(dx * sin + dz * cos);
      if (lx < b.width / 2 + minBldClearance && lz < b.depth / 2 + minBldClearance) {
        return true;
      }
    }
    for (const pg of playgrounds) {
      if (
        Math.abs(x - pg.x) < pg.width / 2 + 1.5 &&
        Math.abs(z - pg.z) < pg.depth / 2 + 1.5
      ) {
        return true;
      }
    }
    return false;
  };

  let vegCounter = 1;
  const addVegetation = (
    type: VegetationItem['type'],
    x: number,
    z: number,
    rotation = 0,
    scaleFactor = 1
  ) => {
    const names: Record<VegetationItem['type'], string> = {
      poplar: 'Тополь пирамидальный советской посадки',
      birch: 'Берёза повислая (дворовая аллея)',
      maple: 'Клён остролистный раскидистый',
      'lilac-bush': 'Куст сирени у подъезда',
      'hedgerow-shrub': 'Живая изгородь (спирея / кизильник)',
    };
    const defaultHeights: Record<VegetationItem['type'], number> = {
      poplar: 15.5,
      birch: 11.5,
      maple: 10.0,
      'lilac-bush': 2.6,
      'hedgerow-shrub': 1.25,
    };
    const defaultRadii: Record<VegetationItem['type'], number> = {
      poplar: 2.4,
      birch: 3.1,
      maple: 3.6,
      'lilac-bush': 1.6,
      'hedgerow-shrub': 1.1,
    };

    vegetation.push({
      id: `veg-${vegCounter++}`,
      type,
      name: names[type],
      x,
      z,
      rotation,
      height: defaultHeights[type] * scaleFactor,
      crownRadius: defaultRadii[type] * scaleFactor,
    });
  };

  const boulevardStops = [-96, -80, -64, -48, -26, -12, 12, 26, 48, 64, 80, 96];
  boulevardStops.forEach((coord, i) => {
    if (i % 3 === 0 && params.greeneryDensity < 0.45) return;

    const treeTypes: VegetationItem['type'][] = ['poplar', 'birch', 'maple'];
    const treeType = treeTypes[i % treeTypes.length];

    [-42.5, 42.5].forEach((zRow) => {
      if (!isTooCloseToBuildingOrPlayground(coord, zRow, 3.5)) {
        addVegetation(treeType, coord, zRow, rng() * Math.PI * 2, 0.88 + rng() * 0.28);
      }
      if (params.greeneryDensity >= 0.4 && !isTooCloseToBuildingOrPlayground(coord + 3.5, zRow * 0.96, 3.0)) {
        addVegetation('hedgerow-shrub', coord + 3.5, zRow > 0 ? 35.2 : -35.2, 0, 0.95 + rng() * 0.15);
      }
    });

    [-42.5, 42.5].forEach((xCol) => {
      if (!isTooCloseToBuildingOrPlayground(xCol, coord, 3.5)) {
        addVegetation(
          treeTypes[(i + 1) % treeTypes.length],
          xCol,
          coord,
          rng() * Math.PI * 2,
          0.88 + rng() * 0.28
        );
      }
      if (params.greeneryDensity >= 0.5 && !isTooCloseToBuildingOrPlayground(xCol * 0.96, coord + 3.5, 3.0)) {
        addVegetation(
          'hedgerow-shrub',
          xCol > 0 ? 35.2 : -35.2,
          coord + 3.5,
          Math.PI / 2,
          0.95 + rng() * 0.15
        );
      }
    });
  });

  courtyards.forEach((cy, cIdx) => {
    const ringCount = Math.round(10 * params.greeneryDensity);
    for (let i = 0; i < ringCount; i++) {
      const angle = (i / ringCount) * Math.PI * 2 + cIdx * 0.5;
      const normAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const isSightline = normAngle > 0.35 && normAngle < 1.25;
      const dist = 16.5 + (i % 2) * 3.2;
      const tx = cy.cx + Math.cos(angle) * dist;
      const tz = cy.cz + Math.sin(angle) * dist;
      if (!isSightline && !isTooCloseToBuildingOrPlayground(tx, tz, 3.2)) {
        const kind: VegetationItem['type'] =
          i % 3 === 0 ? 'birch' : i % 3 === 1 ? 'poplar' : 'maple';
        addVegetation(kind, tx, tz, angle, 0.85 + rng() * 0.3);
      }

      const bushDist = 12.8;
      const bx = cy.cx + Math.cos(angle + 0.3) * bushDist;
      const bz = cy.cz + Math.sin(angle + 0.3) * bushDist;
      if (i % 2 === 0 && !isTooCloseToBuildingOrPlayground(bx, bz, 2.5)) {
        addVegetation('lilac-bush', bx, bz, rng() * Math.PI, 0.9 + rng() * 0.25);
      }
    }
  });

  buildings.forEach((bld, bIdx) => {
    if (bld.category !== 'residential') return;
    bld.entrances.forEach((ent, eIdx) => {
      if ((bIdx + eIdx) % 2 !== 0 && params.greeneryDensity < 0.7) return;
      const cos = Math.cos(ent.angle);
      const sin = Math.sin(ent.angle);
      const lx = ent.x - cos * 3.2 + sin * 2.4;
      const lz = ent.z + sin * 3.2 + cos * 2.4;
      if (!isTooCloseToBuildingOrPlayground(lx, lz, 1.5)) {
        addVegetation('lilac-bush', lx, lz, ent.angle, 0.9 + rng() * 0.2);
      }
    });
  });

  // 8. Calculate Comprehensive District Passport Metrics
  const resBlds = buildings.filter((b) => b.category === 'residential');
  const socBlds = buildings.filter((b) => b.category === 'social');
  const utilBlds = buildings.filter((b) => b.category === 'utility');

  const schoolsCount = socBlds.filter((b) => b.series === 'School-I-1158').length;
  const kindergartensCount = socBlds.filter((b) => b.series === 'Kindergarten-I-1194').length;
  const polyclinicsCount = socBlds.filter((b) => b.series === 'Polyclinic-I-1169').length;
  const storesCount = socBlds.filter(
    (b) => b.series === 'Universam' || b.series === 'Produkti-Store' || b.series === 'ATS-Post-Office'
  ).length;

  const totalApartments = resBlds.reduce((sum, b) => sum + b.apartments, 0);
  const estimatedPopulation = resBlds.reduce((sum, b) => sum + b.residents, 0);
  const averageFloors =
    resBlds.length > 0
      ? Math.round((resBlds.reduce((sum, b) => sum + b.floors, 0) / resBlds.length) * 10) / 10
      : 0;

  const years = buildings.map((b) => b.yearBuilt);
  const yearBuiltMin = years.length > 0 ? Math.min(...years) : 1972;
  const yearBuiltMax = years.length > 0 ? Math.max(...years) : 1986;
  const distinctSeriesCount = new Set(buildings.map((b) => b.series)).size;

  const playEquipmentCount = playgrounds.reduce((sum, pg) => sum + pg.equipment.length, 0);
  const benchesCount = benchesAndUrns.length;
  const urnsCount = benchesAndUrns.filter((b) => b.hasUrn).length;
  const treesCount = vegetation.filter(
    (v) => v.type === 'poplar' || v.type === 'birch' || v.type === 'maple'
  ).length;
  const shrubsCount = vegetation.filter(
    (v) => v.type === 'lilac-bush' || v.type === 'hedgerow-shrub'
  ).length;

  const pedestrianPathsLengthMeters = Math.round(
    paths.reduce((sum, p) => sum + Math.hypot(p.x2 - p.x1, p.z2 - p.z1), 0)
  );

  const greenSpacePercentage = clamp(
    Math.round(32 + params.greeneryDensity * 22 - params.buildingDensity * 8),
    24,
    58
  );

  const snipComplianceScore = clamp(
    Math.round(
      72 +
        params.socialInfraLevel * 8 +
        params.courtyardComplexity * 8 +
        params.greeneryDensity * 6 +
        params.sidewalkDensity * 5
    ),
    75,
    99
  );

  const metrics: DistrictMetrics = {
    totalBuildings: buildings.length,
    residentialBuildings: resBlds.length,
    socialBuildings: socBlds.length,
    utilityBuildings: utilBlds.length,
    schoolsCount,
    kindergartensCount,
    polyclinicsCount,
    storesCount,
    totalApartments,
    estimatedPopulation,
    averageFloors,
    yearBuiltMin,
    yearBuiltMax,
    distinctSeriesCount,
    playgroundsCount: playgrounds.length,
    playEquipmentCount,
    benchesCount,
    urnsCount,
    treesCount,
    shrubsCount,
    pedestriansCount: pedestrians.length,
    streetLampsCount: streetLamps.length,
    pedestrianPathsLengthMeters,
    greenSpacePercentage,
    snipComplianceScore,
  };

  return {
    preset: params.preset,
    seed: params.seed,
    worldSize,
    buildings,
    playgrounds,
    paths,
    benchesAndUrns,
    vegetation,
    pedestrians,
    streetLamps,
    metrics,
  };
}
