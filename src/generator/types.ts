export type DistrictPresetId = 'chertanovo' | 'belyayevo' | 'yasenevo' | 'zyuzino';

export type BuildingSeriesId =
  | 'P-44'
  | 'P-3'
  | 'KOPE'
  | 'OMR-Chertanovo'
  | 'II-49'
  | '1-515-9M'
  | '1605-AM'
  | 'P-46'
  | 'II-68'
  | 'School-I-1158'
  | 'Kindergarten-I-1194'
  | 'Polyclinic-I-1169'
  | 'Universam'
  | 'Produkti-Store'
  | 'ATS-Post-Office'
  | 'TP-Substation';

export type SeasonId = 'autumn' | 'summer' | 'winter' | 'spring';
export type TimeOfDayId = 'day' | 'sunset' | 'night';
export type CameraPresetId = 'overview' | 'courtyard' | 'topdown' | 'pedestrian';

export interface FacadeFinishVariant {
  id: string;
  name: string;
  materialType: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export interface GeneratorParams {
  preset: DistrictPresetId;
  seed: number;
  buildingDensity: number; // 0.4 to 1.0
  maxFloorsBias: number; // -4 to +6 floors adjustment
  socialInfraLevel: number; // 0.5 to 1.0 (controls schools, kindergartens, polyclinics, stores)
  courtyardComplexity: number; // 0.3 to 1.0 (controls playgrounds, benches, paths)
  greeneryDensity: number; // 0.2 to 1.0 (controls trees & shrubs)
  sidewalkDensity: number; // 0.3 to 1.0 (controls pedestrian path network)
  pedestrianDensity: number; // 0.2 to 1.0 (controls active pedestrians walking on sidewalks)
  season: SeasonId;
  timeOfDay: TimeOfDayId;
  allowedResidentialSeries: BuildingSeriesId[]; // empty = preset default
  layers: {
    buildings: boolean;
    socialInfra: boolean;
    playgrounds: boolean;
    paths: boolean;
    benchesAndUrns: boolean;
    vegetation: boolean;
    pedestrians: boolean;
  };
}

export interface BuildingSeriesSpec {
  id: BuildingSeriesId;
  code: string;
  name: string;
  years: string;
  yearRange: [number, number];
  category: 'residential' | 'social' | 'utility';
  socialSubType?: 'school' | 'kindergarten' | 'polyclinic' | 'universam' | 'produkti' | 'service-center';
  snipNormRadiusMeters?: number; // СНиП II-60-75 service radius
  snipCapacityLabel?: string; // e.g. "1176 учащихся", "280 мест", "750 посещений/смену"
  defaultFloors: number;
  minFloors: number;
  maxFloors: number;
  sectionWidth: number; // meters
  sectionDepth: number; // meters
  defaultSections: number;
  apartmentsPerFloorPerSection: number;
  facadePrimaryColor: string;
  facadeSecondaryColor: string;
  accentColor: string;
  facadeVariants: FacadeFinishVariant[];
  description: string;
}

export interface GeneratedBuilding {
  id: string;
  series: BuildingSeriesId;
  category: 'residential' | 'social' | 'utility';
  name: string;
  address: string;
  x: number;
  z: number;
  rotation: number; // radians
  floors: number;
  sections: number;
  width: number;
  depth: number;
  height: number;
  shape: 'linear' | 'l-shape' | 'u-shape' | 'tower' | 'triskele' | 'h-school' | 'polyclinic-cross';
  apartments: number;
  residents: number;
  yearBuilt: number;
  facadeVariant: FacadeFinishVariant;
  snipNormRadiusMeters?: number;
  snipCapacityLabel?: string;
  entrances: { x: number; z: number; angle: number }[];
}

export type PlayEquipmentType =
  | 'rocket-slide'
  | 'geodesic-dome'
  | 'swing-set'
  | 'sandbox-mushroom'
  | 'merry-go-round'
  | 'monkey-bars'
  | 'hockey-box'
  | 'carpet-beater';

export interface PlayEquipmentItem {
  id: string;
  type: PlayEquipmentType;
  name: string;
  x: number;
  z: number;
  rotation: number;
  scale: number;
}

export interface PlaygroundZone {
  id: string;
  name: string;
  courtyardIndex: number;
  x: number;
  z: number;
  width: number;
  depth: number;
  rotation: number;
  surfaceType: 'sand' | 'crumb-red' | 'asphalt-sport';
  equipment: PlayEquipmentItem[];
  benchCount: number;
  urnCount: number;
}

export interface PedestrianPathSegment {
  id: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  width: number;
  kind: 'main-alley' | 'courtyard-walk' | 'entrance-approach';
  hasCurb: boolean;
}

export interface BenchAndUrnItem {
  id: string;
  x: number;
  z: number;
  rotation: number;
  hasUrn: boolean;
  urnOffsetSide: 'left' | 'right';
  locationType: 'entrance' | 'path' | 'playground';
  colorVariant: 'ochre' | 'green' | 'blue' | 'red';
}

export type VegetationType =
  | 'poplar'
  | 'birch'
  | 'maple'
  | 'lilac-bush'
  | 'hedgerow-shrub';

export interface VegetationItem {
  id: string;
  type: VegetationType;
  name: string;
  x: number;
  z: number;
  rotation: number;
  height: number;
  crownRadius: number;
}

export interface PedestrianWaypoint {
  x: number;
  z: number;
}

export interface PedestrianAgentSpec {
  id: string;
  name: string;
  activity: string;
  role: 'worker' | 'shopper' | 'student' | 'pensioner' | 'parent';
  coatColor: string;
  pantsColor: string;
  hatColor: string;
  hasBag: boolean;
  bagColor: string;
  speed: number; // m/s
  initialPhase: number; // 0 to 1
  lateralOffset: number; // m offset from path centerline
  waypoints: PedestrianWaypoint[];
}

export interface StreetLampItem {
  id: string;
  x: number;
  z: number;
  rotation: number;
  height: number;
}

export interface DistrictMetrics {
  totalBuildings: number;
  residentialBuildings: number;
  socialBuildings: number;
  utilityBuildings: number;
  schoolsCount: number;
  kindergartensCount: number;
  polyclinicsCount: number;
  storesCount: number;
  totalApartments: number;
  estimatedPopulation: number;
  averageFloors: number;
  yearBuiltMin: number;
  yearBuiltMax: number;
  distinctSeriesCount: number;
  playgroundsCount: number;
  playEquipmentCount: number;
  benchesCount: number;
  urnsCount: number;
  treesCount: number;
  shrubsCount: number;
  pedestriansCount: number;
  streetLampsCount: number;
  pedestrianPathsLengthMeters: number;
  greenSpacePercentage: number;
  snipComplianceScore: number; // % compliance with СНиП II-60-75
}

export interface GeneratedDistrict {
  preset: DistrictPresetId;
  seed: number;
  worldSize: number; // e.g. 260m x 260m
  buildings: GeneratedBuilding[];
  playgrounds: PlaygroundZone[];
  paths: PedestrianPathSegment[];
  benchesAndUrns: BenchAndUrnItem[];
  vegetation: VegetationItem[];
  pedestrians: PedestrianAgentSpec[];
  streetLamps: StreetLampItem[];
  metrics: DistrictMetrics;
}

export type SelectedEntity =
  | { kind: 'building'; data: GeneratedBuilding }
  | { kind: 'playground'; data: PlaygroundZone };
