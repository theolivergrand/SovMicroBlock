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
  GeneratedDistrict,
  SelectedEntity,
} from '../generator/types';
import { ActiveModalType } from './TopBar';

interface InspectorOverlayProps {
  district: GeneratedDistrict;
  selectedEntity: SelectedEntity | null;
  activeModal: ActiveModalType;
  onSelectEntity: (entity: SelectedEntity | null) => void;
  onCloseModal: () => void;
  onFocusCamera: (preset: CameraPresetId) => void;
}

export const InspectorOverlay: React.FC<InspectorOverlayProps> = ({
  district,
  selectedEntity,
  activeModal,
  onSelectEntity,
  onCloseModal,
  onFocusCamera,
}) => {
  const [showSnipRadii, setShowSnipRadii] = useState(true);
  const presetSpec = DISTRICT_PRESETS[district.preset];
  const m = district.metrics;

  return (
    <>
      {/* Minimal Top-Left Spec Badge (leaves central 3D viewport 100% unobstructed) */}
      <aside
        aria-label="Сводка микрорайона и выбранного объекта"
        className="fixed top-15 left-3 right-3 sm:right-auto z-10 sm:max-w-sm pointer-events-auto space-y-2"
      >
        <div
          className={`bg-stone-950/90 border border-stone-800 rounded-lg px-4 py-2.5 text-stone-200 shadow-lg ${
            selectedEntity ? 'hidden sm:block' : 'block'
          }`}
        >
          <div className="text-xs text-stone-400">
            Референс · {presetSpec.years} · СНиП II-60-75 ({m.snipComplianceScore}%)
          </div>
          <h1 className="font-display text-xl font-bold text-stone-100 tracking-wide mt-0.5">
            {presetSpec.name}
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">{presetSpec.subtitle}</p>

          {/* Clean unboxed metadata with typographic separators */}
          <div className="mt-2.5 pt-2 border-t border-stone-800/90 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-300 font-mono">
            <span>{m.residentialBuildings} жил. корп.</span>
            <span aria-hidden="true">·</span>
            <span>{m.socialBuildings} соцкультбыт</span>
            <span aria-hidden="true">·</span>
            <span>{m.estimatedPopulation.toLocaleString('ru-RU')} жит.</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-400 font-mono">
            <span>{m.playgroundsCount} площ. ({m.playEquipmentCount} МАФ)</span>
            <span aria-hidden="true">·</span>
            <span>{m.benchesCount} скам.</span>
            <span aria-hidden="true">·</span>
            <span>{m.treesCount + m.shrubsCount} дер./куст.</span>
          </div>
        </div>

        {/* Selected Building or Courtyard Playground Card */}
        {selectedEntity && (
          <div className="bg-stone-950/95 border border-amber-500/60 rounded-lg px-4 py-3 text-stone-200 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-amber-400 font-medium">
                  {selectedEntity.kind === 'building'
                    ? BUILDING_SERIES_CATALOG[selectedEntity.data.series].code
                    : `Дворовый комплекс №${selectedEntity.data.courtyardIndex}`}
                </div>
                <h2 className="font-display text-base font-semibold text-stone-100">
                  {selectedEntity.data.name}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Скрыть карточку объекта"
                onClick={() => onSelectEntity(null)}
                className="px-2 py-0.5 text-xs text-stone-400 hover:text-stone-100 bg-stone-900 rounded whitespace-nowrap shrink-0"
              >
                Скрыть
              </button>
            </div>

            {selectedEntity.kind === 'building' ? (
              <div className="mt-2 space-y-1.5 text-xs text-stone-300">
                <div className="text-stone-400">
                  {selectedEntity.data.address} · Построен в{' '}
                  <strong className="font-mono text-stone-200">
                    {selectedEntity.data.yearBuilt} г.
                  </strong>
                </div>
                <div className="flex items-center gap-2 font-mono text-stone-200">
                  <span>{selectedEntity.data.floors} эт.</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedEntity.data.sections} секц.</span>
                  {selectedEntity.data.apartments > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{selectedEntity.data.apartments} кв.</span>
                      <span aria-hidden="true">·</span>
                      <span>~{selectedEntity.data.residents} жит.</span>
                    </>
                  )}
                </div>

                {/* Facade Finish Variant */}
                <div className="pt-1.5 border-t border-stone-800">
                  <div className="text-stone-400">Отделка фасада:</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="inline-block w-3 h-3 rounded-sm border border-stone-600 shrink-0"
                      style={{
                        backgroundColor: selectedEntity.data.facadeVariant.secondaryColor,
                      }}
                    />
                    <span className="font-medium text-stone-200">
                      {selectedEntity.data.facadeVariant.name}
                    </span>
                  </div>
                  <div className="text-stone-400 mt-0.5">
                    {selectedEntity.data.facadeVariant.materialType}
                  </div>
                </div>

                {selectedEntity.data.snipCapacityLabel && (
                  <div className="pt-1.5 border-t border-stone-800 text-amber-300/90">
                    Норма СНиП II-60-75: {selectedEntity.data.snipCapacityLabel} (радиус{' '}
                    {selectedEntity.data.snipNormRadiusMeters} м)
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2 space-y-1.5 text-xs text-stone-300">
                <div className="flex items-center gap-2 font-mono text-stone-200">
                  <span>
                    Размер {selectedEntity.data.width}×{selectedEntity.data.depth} м
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedEntity.data.benchCount} скам.</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedEntity.data.urnCount} урн</span>
                </div>
                <div className="text-stone-400">
                  Игровые элементы и МАФ ({selectedEntity.data.equipment.length} шт.):
                </div>
                <ul className="space-y-0.5 text-stone-200">
                  {selectedEntity.data.equipment.map((eq) => (
                    <li key={eq.id}>— {eq.name}</li>
                  ))}
                </ul>
                <div className="pt-1.5">
                  <button
                    type="button"
                    onClick={() => onFocusCamera('courtyard')}
                    className="px-3 py-1 text-xs font-medium bg-amber-500 text-stone-950 rounded hover:bg-amber-400 transition-colors"
                  >
                    Приблизить камеру к площадке
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* ===================================================================== */}
      {/* MODAL 1: ПАСПОРТ МИКРОРАЙОНА (DISTRICT PASSPORT)                      */}
      {/* ===================================================================== */}
      {activeModal === 'passport' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Паспорт позднесоветского микрорайона"
          className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-stone-950/80"
        >
          <div className="bg-stone-950 border border-stone-800 rounded-lg max-w-3xl w-full max-h-[82vh] overflow-y-auto p-6 text-stone-200 shadow-2xl">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-800">
              <div>
                <div className="text-xs text-amber-400">
                  Градостроительный паспорт · {presetSpec.years}
                </div>
                <h2 className="font-display text-2xl font-bold text-stone-100 mt-0.5">
                  Микрорайон «{presetSpec.name}» (Seed #{district.seed})
                </h2>
                <p className="text-sm text-stone-400 mt-1">
                  Архитектурная мастерская: {presetSpec.architects}
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseModal}
                className="px-3 py-1.5 text-xs font-medium bg-stone-900 border border-stone-700 rounded hover:bg-stone-800"
              >
                Закрыть
              </button>
            </div>

            <p className="mt-4 text-sm text-stone-300 leading-relaxed">
              {presetSpec.planningConcept}
            </p>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <div className="p-3 bg-stone-900 border border-stone-800 rounded">
                <div className="text-xs text-stone-400">Жилой фонд</div>
                <div className="font-mono text-xl font-semibold text-stone-100 mt-1">
                  {m.totalApartments.toLocaleString('ru-RU')} кв.
                </div>
                <div className="text-xs text-stone-400 mt-0.5">
                  {m.residentialBuildings} корп. · ср. {m.averageFloors} эт.
                </div>
              </div>

              <div className="p-3 bg-stone-900 border border-stone-800 rounded">
                <div className="text-xs text-stone-400">Расчётное население</div>
                <div className="font-mono text-xl font-semibold text-stone-100 mt-1">
                  {m.estimatedPopulation.toLocaleString('ru-RU')} чел.
                </div>
                <div className="text-xs text-stone-400 mt-0.5">
                  Годы постройки: {m.yearBuiltMin}–{m.yearBuiltMax}
                </div>
              </div>

              <div className="p-3 bg-stone-900 border border-stone-800 rounded">
                <div className="text-xs text-stone-400">Детские площадки и МАФ</div>
                <div className="font-mono text-xl font-semibold text-amber-400 mt-1">
                  {m.playgroundsCount} площ. / {m.playEquipmentCount} эл.
                </div>
                <div className="text-xs text-stone-400 mt-0.5">
                  {m.benchesCount} скамеек · {m.urnsCount} урн
                </div>
              </div>

              <div className="p-3 bg-stone-900 border border-stone-800 rounded">
                <div className="text-xs text-stone-400">Озеленение и тротуары</div>
                <div className="font-mono text-xl font-semibold text-emerald-400 mt-1">
                  {m.greenSpacePercentage}% зел. зон
                </div>
                <div className="text-xs text-stone-400 mt-0.5">
                  {m.treesCount} дер. · {m.shrubsCount} куст. · {m.pedestrianPathsLengthMeters} м дорожек
                </div>
              </div>
            </div>

            {/* Full Building Registry Table */}
            <div className="mt-6">
              <h3 className="font-display text-base font-semibold text-stone-100 mb-2">
                Экспликация корпусов и объектов микрорайона ({district.buildings.length})
              </h3>
              <div className="overflow-x-auto border border-stone-800 rounded">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-stone-900 text-stone-400 border-b border-stone-800">
                    <tr>
                      <th className="py-2 px-3">Адрес / Объект</th>
                      <th className="py-2 px-3">Серия</th>
                      <th className="py-2 px-3">Год</th>
                      <th className="py-2 px-3">Этажность</th>
                      <th className="py-2 px-3">Отделка фасада</th>
                      <th className="py-2 px-3 text-right">Квартир / Мощность</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/70">
                    {district.buildings.map((b) => (
                      <tr
                        key={b.id}
                        onClick={() => {
                          onSelectEntity({ kind: 'building', data: b });
                          onCloseModal();
                        }}
                        className="hover:bg-stone-900/80 cursor-pointer transition-colors"
                      >
                        <td className="py-2 px-3 font-sans text-stone-200">{b.address}</td>
                        <td className="py-2 px-3 text-amber-400">
                          {BUILDING_SERIES_CATALOG[b.series].code}
                        </td>
                        <td className="py-2 px-3 text-stone-300">{b.yearBuilt}</td>
                        <td className="py-2 px-3 text-stone-300">
                          {b.floors} эт. ({b.sections} секц.)
                        </td>
                        <td className="py-2 px-3 font-sans text-stone-300">
                          {b.facadeVariant.name}
                        </td>
                        <td className="py-2 px-3 text-right text-stone-200">
                          {b.apartments > 0
                            ? `${b.apartments} кв.`
                            : b.snipCapacityLabel ?? 'Инженерный объект'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: КАТАЛОГ ТИПОВЫХ СЕРИЙ И ОТДЕЛКИ ФАСАДОВ                      */}
      {/* ===================================================================== */}
      {activeModal === 'catalog' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Каталог типовых серий домов и вариантов отделки фасадов"
          className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-stone-950/80"
        >
          <div className="bg-stone-950 border border-stone-800 rounded-lg max-w-4xl w-full max-h-[82vh] overflow-y-auto p-6 text-stone-200 shadow-2xl">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-800">
              <div>
                <div className="text-xs text-amber-400">
                  Единый каталог строительных деталей и серий МНИИТЭП / Моспроект
                </div>
                <h2 className="font-display text-2xl font-bold text-stone-100 mt-0.5">
                  Типовые серии жилых домов и варианты отделки фасадов
                </h2>
              </div>
              <button
                type="button"
                onClick={onCloseModal}
                className="px-3 py-1.5 text-xs font-medium bg-stone-900 border border-stone-700 rounded hover:bg-stone-800"
              >
                Закрыть
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {RESIDENTIAL_SERIES_IDS.map((sid: BuildingSeriesId) => {
                const spec = BUILDING_SERIES_CATALOG[sid];
                const countInDistrict = district.buildings.filter((b) => b.series === sid).length;
                return (
                  <div
                    key={sid}
                    className="p-4 bg-stone-900/90 border border-stone-800 rounded-lg flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-stone-400">
                        <span className="font-mono text-amber-400 font-semibold">
                          Серия {spec.code}
                        </span>
                        <span className="font-mono">
                          Годы: {spec.years} · {spec.minFloors}–{spec.maxFloors} эт.
                        </span>
                      </div>
                      <h3 className="font-display text-lg font-semibold text-stone-100 mt-1">
                        {spec.name}
                      </h3>
                      <p className="text-xs text-stone-300 mt-1.5 leading-relaxed">
                        {spec.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-stone-800 space-y-1.5">
                      <div className="text-xs text-stone-400">
                        Типичные варианты отделки фасадов ({spec.facadeVariants.length}):
                      </div>
                      {spec.facadeVariants.map((fv) => (
                        <div key={fv.id} className="flex items-center gap-2 text-xs text-stone-200">
                          <span
                            className="w-3.5 h-3.5 rounded-sm border border-stone-600 shrink-0"
                            style={{ backgroundColor: fv.primaryColor }}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-sm border border-stone-600 shrink-0"
                            style={{ backgroundColor: fv.secondaryColor }}
                          />
                          <span className="font-medium">{fv.name}</span>
                          <span className="text-stone-400 truncate">({fv.materialType})</span>
                        </div>
                      ))}
                      <div className="text-xs font-mono text-stone-400 pt-1">
                        Корпусов данной серии в текущем микрорайоне: {countInDistrict}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: СОЦКУЛЬТБЫТ И ГРАДОСТРОИТЕЛЬНЫЕ НОРМЫ СНиП II-60-75          */}
      {/* ===================================================================== */}
      {activeModal === 'snip' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Объекты социальной инфраструктуры и нормы СНиП II-60-75"
          className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-stone-950/80"
        >
          <div className="bg-stone-950 border border-stone-800 rounded-lg max-w-4xl w-full max-h-[82vh] overflow-y-auto p-6 text-stone-200 shadow-2xl">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-800">
              <div>
                <div className="text-xs text-amber-400">
                  Ступенчатая система культурно-бытового обслуживания (СНиП II-60-75)
                </div>
                <h2 className="font-display text-2xl font-bold text-stone-100 mt-0.5">
                  Объекты социальной инфраструктуры микрорайона
                </h2>
              </div>
              <button
                type="button"
                onClick={onCloseModal}
                className="px-3 py-1.5 text-xs font-medium bg-stone-900 border border-stone-700 rounded hover:bg-stone-800"
              >
                Закрыть
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {SOCIAL_INFRA_SERIES_IDS.map((sid) => {
                const spec = BUILDING_SERIES_CATALOG[sid];
                const instances = district.buildings.filter((b) => b.series === sid);
                return (
                  <div
                    key={sid}
                    className="p-4 bg-stone-900 border border-stone-800 rounded-lg flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-stone-400 font-mono">
                        <span className="text-amber-400">{spec.code}</span>
                        <span>Радиус доступности ≤ {spec.snipNormRadiusMeters} м</span>
                      </div>
                      <h3 className="font-display text-lg font-semibold text-stone-100 mt-1">
                        {spec.name}
                      </h3>
                      <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                        {spec.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-stone-800 flex items-center justify-between text-xs">
                      <span className="text-stone-400">
                        Нормативная мощность:{' '}
                        <strong className="text-stone-200">{spec.snipCapacityLabel}</strong>
                      </span>
                      <span className="font-mono text-amber-400">
                        В районе: {instances.length} зд.
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: ГЕНПЛАН 2D (СХЕМА МИКРОРАЙОНА И РАДИУСОВ ДОСТУПНОСТИ СНиП)   */}
      {/* ===================================================================== */}
      {activeModal === 'plan2d' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Двумерный генеральный план микрорайона"
          className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-stone-950/80"
        >
          <div className="bg-stone-950 border border-stone-800 rounded-lg max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 text-stone-200 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-800">
              <div>
                <div className="text-xs text-amber-400">
                  Чертёж планировки и благоустройства · М 1:2000
                </div>
                <h2 className="font-display text-xl font-bold text-stone-100">
                  Генеральный план микрорайона «{presetSpec.name}»
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSnipRadii((v) => !v)}
                  className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                    showSnipRadii
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-stone-900 border-stone-700 text-stone-400'
                  }`}
                >
                  Радиусы СНиП II-60-75
                </button>
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="px-3 py-1.5 text-xs font-medium bg-stone-900 border border-stone-700 rounded hover:bg-stone-800"
                >
                  Закрыть
                </button>
              </div>
            </div>

            <div className="mt-4 flex justify-center bg-stone-900 border border-stone-800 rounded p-3">
              <svg
                viewBox="-130 -130 260 260"
                className="w-full max-w-[520px] aspect-square bg-stone-950 rounded"
              >
                {/* Grid lines */}
                {[-100, -50, 0, 50, 100].map((g) => (
                  <g key={g} stroke="#262624" strokeWidth="0.5">
                    <line x1={-130} y1={g} x2={130} y2={g} />
                    <line x1={g} y1={-130} x2={g} y2={130} />
                  </g>
                ))}

                {/* Pedestrian Sidewalks */}
                {district.paths.map((p) => (
                  <line
                    key={p.id}
                    x1={p.x1}
                    y1={p.z1}
                    x2={p.x2}
                    y2={p.z2}
                    stroke="#666560"
                    strokeWidth={p.width * 0.65}
                    strokeLinecap="round"
                  />
                ))}

                {/* Courtyards & Playgrounds */}
                {district.playgrounds.map((pg) => (
                  <g
                    key={pg.id}
                    onClick={() => {
                      onSelectEntity({ kind: 'playground', data: pg });
                      onCloseModal();
                    }}
                    className="cursor-pointer"
                  >
                    <rect
                      x={pg.x - pg.width / 2}
                      y={pg.z - pg.depth / 2}
                      width={pg.width}
                      height={pg.depth}
                      fill="#b8863b"
                      fillOpacity={0.35}
                      stroke="#d99f43"
                      strokeWidth="0.8"
                    />
                  </g>
                ))}

                {/* Green Landscaping (Trees & Shrubs) */}
                {district.vegetation.map((v) => (
                  <circle
                    key={v.id}
                    cx={v.x}
                    cy={v.z}
                    r={Math.max(1.2, v.crownRadius * 0.7)}
                    fill="#3f7a4d"
                    fillOpacity={0.65}
                  />
                ))}

                {/* СНиП II-60-75 Service Radii for Social Infrastructure */}
                {showSnipRadii &&
                  district.buildings
                    .filter((b) => b.category === 'social')
                    .map((sb) => (
                      <circle
                        key={`rad-${sb.id}`}
                        cx={sb.x}
                        cy={sb.z}
                        r={sb.series === 'Kindergarten-I-1194' ? 45 : sb.series === 'Produkti-Store' ? 38 : 68}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="0.6"
                        strokeDasharray="3 2"
                        opacity={0.6}
                      />
                    ))}

                {/* Buildings */}
                {district.buildings.map((b) => {
                  const deg = (-b.rotation * 180) / Math.PI;
                  const normDeg = ((deg % 360) + 360) % 360;
                  const textFlip = normDeg > 95 && normDeg < 265 ? 180 : 0;
                  const isSocial = b.category === 'social';
                  return (
                    <g
                      key={b.id}
                      transform={`translate(${b.x}, ${b.z}) rotate(${deg})`}
                      onClick={() => {
                        onSelectEntity({ kind: 'building', data: b });
                        onCloseModal();
                      }}
                      className="cursor-pointer"
                    >
                      <rect
                        x={-b.width / 2}
                        y={-b.depth / 2}
                        width={b.width}
                        height={b.depth}
                        fill={isSocial ? '#d97706' : '#d6d3cd'}
                        stroke="#1c1917"
                        strokeWidth="0.8"
                      />
                      <text
                        x={0}
                        y={1.2}
                        transform={`rotate(${textFlip})`}
                        textAnchor="middle"
                        fontSize="3.4"
                        fill={isSocial ? '#1c1917' : '#292524'}
                        fontWeight="bold"
                      >
                        {BUILDING_SERIES_CATALOG[b.series].code.split(' ')[0]}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400">
              <span>Светло-серый: жилые серии (П-44, КОПЭ, 1-515, II-49)</span>
              <span>Янтарный: объекты соцкультбыта (Школа, Детсад, Поликлиника, Универсам)</span>
              <span>Зелёный: деревья и кустарники</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
