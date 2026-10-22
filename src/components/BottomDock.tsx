import React, { useState } from 'react';
import {
  BUILDING_SERIES_CATALOG,
  DISTRICT_PRESETS,
  RESIDENTIAL_SERIES_IDS,
  SOCIAL_INFRA_SERIES_IDS,
} from '../generator/presets';
import {
  BuildingSeriesId,
  CameraPresetId,
  DistrictPresetId,
  GeneratedDistrict,
  GeneratorParams,
  SeasonId,
  SelectedEntity,
  TimeOfDayId,
} from '../generator/types';
import { Building3DPreviewCanvas } from '../three/Building3DPreviewCanvas';
import { ActiveModalType } from './TopBar';

type DockTabId = 'district' | 'social' | 'courtyard' | 'environment' | 'encyclopedia';

interface BottomDockProps {
  params: GeneratorParams;
  district: GeneratedDistrict;
  cameraPreset: CameraPresetId;
  selectedEntity: SelectedEntity | null;
  activeModal?: ActiveModalType;
  onSelectPreset: (preset: DistrictPresetId) => void;
  onUpdateParams: (updater: (prev: GeneratorParams) => GeneratorParams) => void;
  onChangeCameraPreset: (preset: CameraPresetId) => void;
  onSelectEntity: (entity: SelectedEntity | null) => void;
  onOpenModal?: (modal: ActiveModalType) => void;
}

const ALL_ENCYCLOPEDIA_SERIES: BuildingSeriesId[] = [
  ...RESIDENTIAL_SERIES_IDS,
  ...SOCIAL_INFRA_SERIES_IDS,
  'TP-Substation',
];

export const BottomDock: React.FC<BottomDockProps> = ({
  params,
  district,
  cameraPreset,
  selectedEntity,
  activeModal = 'none',
  onSelectPreset,
  onUpdateParams,
  onChangeCameraPreset,
  onSelectEntity,
  onOpenModal,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<DockTabId>('district');
  const [activeEncyclopediaSeries, setActiveEncyclopediaSeries] =
    useState<BuildingSeriesId>('P-44');
  const [dockVariantIdx, setDockVariantIdx] = useState(0);

  const toggleSeriesInPool = (seriesId: BuildingSeriesId) => {
    onUpdateParams((prev) => {
      const current =
        prev.allowedResidentialSeries.length > 0
          ? prev.allowedResidentialSeries
          : RESIDENTIAL_SERIES_IDS;
      const exists = current.includes(seriesId);
      const next = exists
        ? current.filter((id) => id !== seriesId)
        : [...current, seriesId];
      return {
        ...prev,
        allowedResidentialSeries: next.length > 0 ? next : [seriesId],
      };
    });
  };

  const toggleLayer = (layerKey: keyof GeneratorParams['layers']) => {
    onUpdateParams((prev) => ({
      ...prev,
      layers: {
        ...prev.layers,
        [layerKey]: !prev.layers[layerKey],
      },
    }));
  };

  const socialBuildings = district.buildings.filter((b) => b.category === 'social');
  const encSpec = BUILDING_SERIES_CATALOG[activeEncyclopediaSeries];
  const matchingInScene = district.buildings.filter(
    (b) => b.series === activeEncyclopediaSeries
  );

  return (
    <section
      aria-label="Панель управления генерацией микрорайона"
      style={{
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 'min(980px, 95vw)',
      }}
      className="fixed z-20 w-full pointer-events-auto"
    >
      {/* Collapse / Expand Handle */}
      <div className="flex justify-center mb-1.5">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="px-4 py-1.5 text-xs font-medium text-stone-200 bg-stone-900 border border-stone-700 rounded-md hover:bg-stone-800 transition-colors whitespace-nowrap shrink-0"
        >
          {collapsed ? '▴ Показать панель управления' : '▾ Скрыть панель'}
        </button>
      </div>

      {!collapsed && (
        <div className="bg-stone-950 border border-stone-800 rounded-lg p-3.5 sm:p-4 shadow-2xl text-stone-200 max-h-[46vh] sm:max-h-none overflow-y-auto">
          {/* Top Segmented Tab Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-stone-800">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-900 rounded-md">
              <button
                type="button"
                onClick={() => setActiveTab('district')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'district'
                    ? 'bg-amber-500 text-stone-950 font-semibold'
                    : 'text-stone-300 hover:text-stone-100'
                }`}
              >
                Район и серии домов
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('social')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'social'
                    ? 'bg-amber-500 text-stone-950 font-semibold'
                    : 'text-stone-300 hover:text-stone-100'
                }`}
              >
                Соцкультбыт СНиП
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('courtyard')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'courtyard'
                    ? 'bg-amber-500 text-stone-950 font-semibold'
                    : 'text-stone-300 hover:text-stone-100'
                }`}
              >
                Благоустройство двора
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('environment')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'environment'
                    ? 'bg-amber-500 text-stone-950 font-semibold'
                    : 'text-stone-300 hover:text-stone-100'
                }`}
              >
                Среда и камера
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('encyclopedia')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'encyclopedia'
                    ? 'bg-amber-500 text-stone-950 font-semibold'
                    : 'text-stone-300 hover:text-stone-100'
                }`}
              >
                Энциклопедия зданий
              </button>
            </div>

            {/* Quick Camera Angle Switcher always accessible */}
            <div className="flex items-center gap-1 bg-stone-900 p-1 rounded-md">
              {(
                [
                  ['overview', 'Панорама'],
                  ['courtyard', 'Двор и площадка'],
                  ['topdown', 'Сверху'],
                  ['pedestrian', 'У подъезда'],
                ] as [CameraPresetId, string][]
              ).map(([camId, label]) => (
                <button
                  key={camId}
                  type="button"
                  onClick={() => onChangeCameraPreset(camId)}
                  className={`px-2.5 py-1 text-xs rounded transition-colors whitespace-nowrap shrink-0 ${
                    cameraPreset === camId
                      ? 'bg-stone-700 text-amber-400 font-semibold'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* TAB 1: DISTRICT PRESETS & RESIDENTIAL SERIES */}
          {activeTab === 'district' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* District Reference Selector */}
                <div className="md:col-span-5">
                  <div className="text-xs text-stone-400 mb-1">
                    Эталонный район Москвы (референс)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {(['chertanovo', 'belyayevo', 'yasenevo', 'zyuzino'] as DistrictPresetId[]).map(
                      (pid) => (
                        <button
                          key={pid}
                          type="button"
                          onClick={() => onSelectPreset(pid)}
                          className={`px-2.5 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 truncate ${
                            params.preset === pid
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                          }`}
                        >
                          {DISTRICT_PRESETS[pid].name.split(' ')[0]}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Density Slider */}
                <div className="md:col-span-3">
                  <label
                    htmlFor="slider-building-density"
                    className="flex justify-between text-xs text-stone-400 mb-1"
                  >
                    <span>Плотность застройки</span>
                    <span className="font-mono text-stone-200">
                      {Math.round(params.buildingDensity * 100)}%
                    </span>
                  </label>
                  <input
                    id="slider-building-density"
                    type="range"
                    min={0.45}
                    max={0.95}
                    step={0.05}
                    value={params.buildingDensity}
                    onChange={(e) =>
                      onUpdateParams((p) => ({
                        ...p,
                        buildingDensity: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Floors Bias Slider */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="slider-floors-bias"
                    className="flex justify-between text-xs text-stone-400 mb-1"
                  >
                    <span>Высотность</span>
                    <span className="font-mono text-stone-200">
                      {params.maxFloorsBias > 0
                        ? `+${params.maxFloorsBias}`
                        : params.maxFloorsBias}{' '}
                      эт.
                    </span>
                  </label>
                  <input
                    id="slider-floors-bias"
                    type="range"
                    min={-3}
                    max={5}
                    step={1}
                    value={params.maxFloorsBias}
                    onChange={(e) =>
                      onUpdateParams((p) => ({
                        ...p,
                        maxFloorsBias: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Seed Input */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="input-seed"
                    className="block text-xs text-stone-400 mb-1"
                  >
                    Код генерации (Seed)
                  </label>
                  <input
                    id="input-seed"
                    type="number"
                    value={params.seed}
                    onChange={(e) =>
                      onUpdateParams((p) => ({
                        ...p,
                        seed: parseInt(e.target.value, 10) || 1980,
                      }))
                    }
                    className="w-full px-2.5 py-1 text-xs font-mono bg-stone-900 border border-stone-700 rounded text-stone-100"
                  />
                </div>
              </div>

              {/* Typical Soviet Residential Series Filter Buttons */}
              <div className="pt-2 border-t border-stone-800/80 flex flex-wrap items-center gap-2">
                <span className="text-xs text-stone-400 mr-1">
                  Типовые серии жилых домов:
                </span>
                {RESIDENTIAL_SERIES_IDS.map((seriesId) => {
                  const spec = BUILDING_SERIES_CATALOG[seriesId];
                  const active = params.allowedResidentialSeries.includes(seriesId);
                  return (
                    <button
                      key={seriesId}
                      type="button"
                      onClick={() => toggleSeriesInPool(seriesId)}
                      className={`px-2.5 py-1 text-xs rounded border transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-stone-800 border-amber-500/80 text-stone-100 font-medium'
                          : 'bg-stone-950 border-stone-800 text-stone-500 hover:text-stone-300'
                      }`}
                    >
                      {spec.code} · {spec.defaultFloors} эт.
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: SOCIAL INFRASTRUCTURE (ШКОЛЫ, ДЕТСАДЫ, ПОЛИКЛИНИКИ, МАГАЗИНЫ) */}
          {activeTab === 'social' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-4">
                  <label
                    htmlFor="slider-social-infra"
                    className="flex justify-between text-xs text-stone-400 mb-1"
                  >
                    <span>Обеспеченность соцкультбытом (СНиП II-60-75)</span>
                    <span className="font-mono text-stone-200">
                      {Math.round(params.socialInfraLevel * 100)}%
                    </span>
                  </label>
                  <input
                    id="slider-social-infra"
                    type="range"
                    min={0.5}
                    max={1.0}
                    step={0.05}
                    value={params.socialInfraLevel}
                    onChange={(e) =>
                      onUpdateParams((p) => ({
                        ...p,
                        socialInfraLevel: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="md:col-span-8 flex flex-wrap items-center gap-4 text-xs text-stone-300">
                  <span>
                    Школы И-1158:{' '}
                    <strong className="font-mono text-stone-100">
                      {district.metrics.schoolsCount}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Детские сады И-1194:{' '}
                    <strong className="font-mono text-stone-100">
                      {district.metrics.kindergartensCount}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Поликлиники И-1169:{' '}
                    <strong className="font-mono text-stone-100">
                      {district.metrics.polyclinicsCount}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Универсам / Магазины / Дом быта:{' '}
                    <strong className="font-mono text-stone-100">
                      {district.metrics.storesCount}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-800/80 flex flex-wrap items-center gap-2">
                <span className="text-xs text-stone-400">
                  Выбрать объект соцкультбыта на 3D-сцене:
                </span>
                {socialBuildings.map((sb) => {
                  const isSel =
                    selectedEntity?.kind === 'building' && selectedEntity.data.id === sb.id;
                  return (
                    <button
                      key={sb.id}
                      type="button"
                      onClick={() => onSelectEntity({ kind: 'building', data: sb })}
                      className={`px-2.5 py-1 text-xs rounded border transition-colors whitespace-nowrap shrink-0 ${
                        isSel
                          ? 'bg-amber-500 text-stone-950 border-amber-400 font-semibold'
                          : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      {BUILDING_SERIES_CATALOG[sb.series].code}: {sb.name.split('(')[0].trim()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: COURTYARD LANDSCAPING & PEDESTRIANS */}
          {activeTab === 'courtyard' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <div>
                  <label
                    htmlFor="slider-courtyard-maf"
                    className="flex justify-between text-xs text-stone-400 mb-1"
                  >
                    <span>Площадки, скамейки, урны</span>
                    <span className="font-mono text-stone-200">
                      {Math.round(params.courtyardComplexity * 100)}%
                    </span>
                  </label>
                  <input
                    id="slider-courtyard-maf"
                    type="range"
                    min={0.35}
                    max={1.0}
                    step={0.05}
                    value={params.courtyardComplexity}
                    onChange={(e) =>
                      onUpdateParams((p) => ({
                        ...p,
                        courtyardComplexity: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label
                    htmlFor="slider-greenery-density"
                    className="flex justify-between text-xs text-stone-400 mb-1"
                  >
                    <span>Озеленение и трава</span>
                    <span className="font-mono text-stone-200">
                      {Math.round(params.greeneryDensity * 100)}%
                    </span>
                  </label>
                  <input
                    id="slider-greenery-density"
                    type="range"
                    min={0.25}
                    max={1.0}
                    step={0.05}
                    value={params.greeneryDensity}
                    onChange={(e) =>
                      onUpdateParams((p) => ({
                        ...p,
                        greeneryDensity: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label
                    htmlFor="slider-sidewalk-density"
                    className="flex justify-between text-xs text-stone-400 mb-1"
                  >
                    <span>Тротуары и аллеи</span>
                    <span className="font-mono text-stone-200">
                      {Math.round(params.sidewalkDensity * 100)}%
                    </span>
                  </label>
                  <input
                    id="slider-sidewalk-density"
                    type="range"
                    min={0.35}
                    max={1.0}
                    step={0.05}
                    value={params.sidewalkDensity}
                    onChange={(e) =>
                      onUpdateParams((p) => ({
                        ...p,
                        sidewalkDensity: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label
                    htmlFor="slider-pedestrian-density"
                    className="flex justify-between text-xs text-stone-400 mb-1"
                  >
                    <span>Пешеходы ({district.metrics.pedestriansCount} чел.)</span>
                    <span className="font-mono text-stone-200">
                      {Math.round(params.pedestrianDensity * 100)}%
                    </span>
                  </label>
                  <input
                    id="slider-pedestrian-density"
                    type="range"
                    min={0.25}
                    max={1.0}
                    step={0.05}
                    value={params.pedestrianDensity}
                    onChange={(e) =>
                      onUpdateParams((p) => ({
                        ...p,
                        pedestrianDensity: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-stone-400 mr-1">Дворовые комплексы:</span>
                  {district.playgrounds.map((pg) => {
                    const isSel =
                      selectedEntity?.kind === 'playground' && selectedEntity.data.id === pg.id;
                    return (
                      <button
                        key={pg.id}
                        type="button"
                        onClick={() => {
                          onSelectEntity({ kind: 'playground', data: pg });
                          onChangeCameraPreset('courtyard');
                        }}
                        className={`px-2.5 py-1 text-xs rounded border transition-colors whitespace-nowrap shrink-0 ${
                          isSel
                            ? 'bg-amber-500 text-stone-950 border-amber-400 font-semibold'
                            : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                        }`}
                      >
                        Двор №{pg.courtyardIndex} ({pg.equipment.length} эл.)
                      </button>
                    );
                  })}
                </div>

                {/* Layer Visibility Toggles */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      ['playgrounds', 'Площадки'],
                      ['benchesAndUrns', 'Скамейки/урны'],
                      ['paths', 'Тротуары'],
                      ['vegetation', 'Деревья/трава'],
                      ['pedestrians', 'Пешеходы'],
                    ] as [keyof GeneratorParams['layers'], string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleLayer(key)}
                      className={`px-2 py-1 text-xs rounded border transition-colors whitespace-nowrap shrink-0 ${
                        params.layers[key]
                          ? 'bg-stone-800 border-stone-600 text-stone-200'
                          : 'bg-stone-950 border-stone-800 text-stone-500 line-through'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SEASON, TIME OF DAY & LAYER VISIBILITY */}
          {activeTab === 'environment' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <div className="text-xs text-stone-400 mb-1">Время года</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      ['autumn', 'Осень'],
                      ['winter', 'Зима'],
                      ['spring', 'Весна'],
                      ['summer', 'Лето'],
                    ] as [SeasonId, string][]
                  ).map(([sId, sLabel]) => (
                    <button
                      key={sId}
                      type="button"
                      onClick={() => onUpdateParams((p) => ({ ...p, season: sId }))}
                      className={`px-2.5 py-1.5 text-xs rounded border transition-colors whitespace-nowrap shrink-0 ${
                        params.season === sId
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                          : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      {sLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-stone-400 mb-1">Освещение и время суток</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      ['day', 'День'],
                      ['sunset', 'Закат'],
                      ['night', 'Вечер / Ночь'],
                    ] as [TimeOfDayId, string][]
                  ).map(([tId, tLabel]) => (
                    <button
                      key={tId}
                      type="button"
                      onClick={() => onUpdateParams((p) => ({ ...p, timeOfDay: tId }))}
                      className={`px-2.5 py-1.5 text-xs rounded border transition-colors whitespace-nowrap shrink-0 ${
                        params.timeOfDay === tId
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                          : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      {tLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-stone-400 mb-1">Слои застройки</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleLayer('buildings')}
                    className={`px-2.5 py-1.5 text-xs rounded border transition-colors whitespace-nowrap shrink-0 ${
                      params.layers.buildings
                        ? 'bg-stone-800 border-stone-600 text-stone-200'
                        : 'bg-stone-950 border-stone-800 text-stone-500 line-through'
                    }`}
                  >
                    Жилые корпуса
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleLayer('socialInfra')}
                    className={`px-2.5 py-1.5 text-xs rounded border transition-colors whitespace-nowrap shrink-0 ${
                      params.layers.socialInfra
                        ? 'bg-stone-800 border-stone-600 text-stone-200'
                        : 'bg-stone-950 border-stone-800 text-stone-500 line-through'
                    }`}
                  >
                    Соцкультбыт
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: BUILDING ENCYCLOPEDIA (ЭНЦИКЛОПЕДИЯ ЗДАНИЙ С 3D-МОДЕЛЬЮ) */}
          {activeTab === 'encyclopedia' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {ALL_ENCYCLOPEDIA_SERIES.map((sid) => {
                    const s = BUILDING_SERIES_CATALOG[sid];
                    const isSelected = activeEncyclopediaSeries === sid;
                    return (
                      <button
                        key={sid}
                        type="button"
                        onClick={() => {
                          setActiveEncyclopediaSeries(sid);
                          setDockVariantIdx(0);
                        }}
                        className={`px-2.5 py-1 text-xs rounded border transition-colors whitespace-nowrap shrink-0 ${
                          isSelected
                            ? 'bg-amber-500 text-stone-950 border-amber-400 font-semibold'
                            : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                        }`}
                      >
                        {s.code}
                      </button>
                    );
                  })}
                </div>

                {onOpenModal && (
                  <button
                    type="button"
                    onClick={() => onOpenModal('encyclopedia')}
                    className="px-3 py-1 text-xs font-semibold bg-stone-800 text-amber-400 border border-amber-500/50 rounded hover:bg-stone-700 transition-colors whitespace-nowrap shrink-0"
                  >
                    Открыть полную 3D-энциклопедию (16 серий)
                  </button>
                )}
              </div>

              <div className="p-3 bg-stone-900/90 border border-stone-800 rounded-md grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
                {/* Interactive 3D Rotatable Building Model inside the Dock */}
                <div className="md:col-span-4">
                  {activeModal !== 'encyclopedia' ? (
                    <div className="space-y-1">
                      <Building3DPreviewCanvas
                        seriesId={activeEncyclopediaSeries}
                        variantIndex={dockVariantIdx}
                        timeOfDay={params.timeOfDay}
                        autoRotate={false}
                        className="w-full h-36"
                      />
                      <div className="text-[11px] text-stone-400 text-center font-mono">
                        3D-макет (вращайте мышью / колёсиком)
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-36 flex items-center justify-center rounded border border-stone-800 bg-stone-950 text-xs text-stone-400">
                      3D-осмотр открыт в полном окне
                    </div>
                  )}
                </div>

                <div className="md:col-span-8 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-amber-400">
                    <span>Серия {encSpec.code}</span>
                    <span aria-hidden="true">·</span>
                    <span>Годы: {encSpec.years}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Этажность: {encSpec.minFloors}–{encSpec.maxFloors} эт.
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>В районе: {matchingInScene.length} зд.</span>
                  </div>
                  <div className="font-display text-base font-semibold text-stone-100">
                    {encSpec.name}
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    {encSpec.description}
                  </p>

                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-stone-400">16-бит текстура:</span>
                      {encSpec.facadeVariants.map((fv, idx) => (
                        <button
                          key={fv.id}
                          type="button"
                          onClick={() => setDockVariantIdx(idx)}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded border transition-colors ${
                            dockVariantIdx === idx
                              ? 'bg-stone-800 border-amber-500 text-stone-100 font-medium'
                              : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-sm border border-stone-600"
                            style={{ backgroundColor: fv.secondaryColor }}
                          />
                          {fv.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>

                    {matchingInScene.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          onSelectEntity({ kind: 'building', data: matchingInScene[0] })
                        }
                        className="px-3 py-1 text-xs font-semibold bg-amber-500 text-stone-950 rounded hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
                      >
                        Найти в районе ({matchingInScene[0].address})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
