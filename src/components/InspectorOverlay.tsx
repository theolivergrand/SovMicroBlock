import React, { useState } from 'react';
import {
  BUILDING_SERIES_CATALOG,
  DISTRICT_PRESETS,
  RESIDENTIAL_SERIES_IDS,
  SOCIAL_INFRA_SERIES_IDS,
} from '../generator/presets';
import {
  BuildingCategory,
  BuildingSeriesId,
  CameraPresetId,
  GeneratedDistrict,
  SelectedEntity,
  TimeOfDayId,
} from '../generator/types';
import { Building3DPreviewCanvas } from '../three/Building3DPreviewCanvas';
import { ActiveModalType } from './TopBar';

interface InspectorOverlayProps {
  district: GeneratedDistrict;
  selectedEntity: SelectedEntity | null;
  activeModal: ActiveModalType;
  onSelectEntity: (entity: SelectedEntity | null) => void;
  onCloseModal: () => void;
  onFocusCamera: (preset: CameraPresetId) => void;
}

const ALL_BUILDING_SERIES_IDS: BuildingSeriesId[] = [
  ...RESIDENTIAL_SERIES_IDS,
  ...SOCIAL_INFRA_SERIES_IDS,
  'TP-Substation',
];

const SERIES_ENGINEERING_METADATA: Record<
  BuildingSeriesId,
  {
    institute: string;
    structuralGrid: string;
    ceilingHeight: string;
    elevators: string;
    typicalLayout: string;
  }
> = {
  'P-44': {
    institute: 'МНИИТЭП (ДСК-1)',
    structuralGrid: 'Шаг поперечных стен 3,0 и 3,6 м',
    ceilingHeight: '2,64 м',
    elevators: 'Пассажирский 400 кг + грузопассажирский 630 кг',
    typicalLayout: '1-, 2-, 3-комнатные квартиры с просторными кухнями 8,3–10,1 м² и лоджиями «сапожок»',
  },
  KOPE: {
    institute: 'Моспроект-1 / МНИИТЭП (авт. А. Д. Рочегов, В. П. Баженов)',
    structuralGrid: 'Компоновочные каталожные объёмно-планировочные элементы (шаг 3,6 и 6,0 м)',
    ceilingHeight: '2,64 м',
    elevators: '2 пассажирских + 1 грузопассажирский лифт, незадымляемая лестница Н1',
    typicalLayout: '1–4-комнатные квартиры повышенной комфортности с полукруглыми и треугольными эркерами',
  },
  '1-515-9M': {
    institute: 'МНИИТЭП',
    structuralGrid: 'Поперечные и продольные несущие панели с шагом 3,2 м',
    ceilingHeight: '2,50 м',
    elevators: '1 пассажирский лифт 320 кг, мусоропровод на межэтажной площадке',
    typicalLayout: 'Массовые 1-, 2-, 3-комнатные квартиры с кухнями 6,0–6,5 м² и внешними балконами',
  },
  'II-49': {
    institute: 'МНИИТЭП (ДСК-1)',
    structuralGrid: 'Поперечные несущие стены с шагом 2,6 и 3,2 м',
    ceilingHeight: '2,50 м',
    elevators: '1 пассажирский лифт 320 кг',
    typicalLayout: 'Четыре квартиры на этаже, компактные лоджии и спаренные балконные плиты',
  },
  'P-3': {
    institute: 'МНИИТЭП (ДСК-3, к Олимпиаде-80)',
    structuralGrid: 'Единый шаг несущих панелей 3,0 и 3,6 м (наружные трёхслойные панели 350 мм)',
    ceilingHeight: '2,64 м',
    elevators: 'Пассажирский + грузопассажирский лифт в выделенном лифтовом холле',
    typicalLayout: 'Изолированные комнаты, поворотные блок-секции 90°, большие угловые лоджии',
  },
  'II-68': {
    institute: 'Моспроект-1 / МНИИТЭП',
    structuralGrid: 'Крупноблочно-панельный каркас с керамзитобетонными блоками 400 мм',
    ceilingHeight: '2,50–2,70 м',
    elevators: '2 скоростных лифта (пассажирский и грузопассажирский)',
    typicalLayout: 'Одноподъездная башня (7–8 квартир на этаже) с глубокими сплошными лоджиями',
  },
  '1605-AM': {
    institute: 'МНИИТЭП (ДСК-2)',
    structuralGrid: 'Поперечные железобетонные стены с шагом 2,6 и 3,2 м',
    ceilingHeight: '2,50 м',
    elevators: '2 пассажирских лифта 320 кг',
    typicalLayout: 'Шахматный ритм спаренных лоджий, облицовка цветной стеклянной мозаикой',
  },
  'P-46': {
    institute: 'МНИИТЭП',
    structuralGrid: 'Широкий шаг несущих стен 3,6 м и 4,2 м',
    ceilingHeight: '2,64 м',
    elevators: 'Пассажирский + грузопассажирский лифт',
    typicalLayout: 'Увеличенные 1- и 2-комнатные квартиры с кухнями 8,6 м² и мощными лоджиями-эркерами',
  },
  'OMR-Chertanovo': {
    institute: 'Мастерская №11 Моспроекта-1 (руководитель М. В. Посохин)',
    structuralGrid: 'Смешанный железобетонный каркас и безригельные перекрытия 6,0×6,0 м',
    ceilingHeight: '2,75 м (первый общественный ярус — 4,20 м)',
    elevators: 'Группы из 3 скоростных лифтов, подземные проезды и вакуумное мусороудаление Centralsug',
    typicalLayout: 'Свободная трансформируемая планировка квартир (5 вариантов на один конструктивный модуль)',
  },
  'School-I-1158': {
    institute: 'МНИИТЭП (совместно с ЦНИИЭП учебных зданий)',
    structuralGrid: 'Железобетонный каркас ИИ-04 с шагом колонн 6,0×6,0 м и пролётом спортзала 12,0 м',
    ceilingHeight: '3,30 м (актовый и спортивный залы — 6,00 м)',
    elevators: 'Три рассредоточенные парадные лестничные клетки',
    typicalLayout: 'Н-образная композиция: учебный корпус, рекреации, блок мастерских, столовая и спортзал',
  },
  'Kindergarten-I-1194': {
    institute: 'МНИИТЭП',
    structuralGrid: 'Крупнопанельно-каркасная схема с шагом 3,0 и 6,0 м',
    ceilingHeight: '3,00 м',
    elevators: 'Отдельные входы в каждую возрастную ячейку (ясли и группы)',
    typicalLayout: '12 групповых ячеек со спальнями, игровыми, сушильными шкафами, залом ритмики и пищеблоком',
  },
  'Polyclinic-I-1169': {
    institute: 'МНИИТЭП / Гипроздрав',
    structuralGrid: 'Сборный железобетонный каркас ИИ-04 (6,0×6,0 м)',
    ceilingHeight: '3,30 м',
    elevators: '2 больничных лифта + 2 пассажирских лифта',
    typicalLayout: 'Центральный вестибюль-регистратура, рентген-диагностическое крыло, физиотерапия и кабинеты врачей',
  },
  Universam: {
    institute: 'Гипроторг / ЦНИИЭП торгово-бытовых зданий',
    structuralGrid: 'Большепролётный железобетонный каркас с сеткой колонн 12,0×12,0 м',
    ceilingHeight: '4,80–6,00 м',
    elevators: 'Грузовые дебаркадеры и подъёмники со стороны хозяйственного двора',
    typicalLayout: 'Единый торговый зал самообслуживания 1200 м² с узлом расчёта, фасовочными и холодильными камерами',
  },
  'Produkti-Store': {
    institute: 'Моспроект-1',
    structuralGrid: 'Сборный железобетонный каркас 6,0×6,0 м с витражным остеклением',
    ceilingHeight: '4,20 м',
    elevators: 'Разгрузочный пандус в торце здания',
    typicalLayout: 'Отделы «Гастрономия», «Булочная-кондитерская», «Молоко» и пункт приёма стеклотары',
  },
  'ATS-Post-Office': {
    institute: 'Гипросвязь / Моспроект',
    structuralGrid: 'Усиленный каркас под нагрузку релейных и координатных телефонных станций (6,0×6,0 м)',
    ceilingHeight: '4,50 м',
    elevators: 'Грузовой лифт 1000 кг',
    typicalLayout: '1-й этаж: операционный зал Почты СССР, переговорный пункт и Сберкасса; 2–4-й этажи: машзалы АТС',
  },
  'TP-Substation': {
    institute: 'Мосинжпроект',
    structuralGrid: 'Одноэтажный сборный железобетонный модуль 8,0×6,0 м',
    ceilingHeight: '3,60 м',
    elevators: 'Технологические ворота для замены трансформаторов и бойлеров ЦТП',
    typicalLayout: 'Два силовых трансформатора 630 кВА, распределительные щиты 10/0,4 кВ и узел теплового пункта',
  },
};

export const InspectorOverlay: React.FC<InspectorOverlayProps> = ({
  district,
  selectedEntity,
  activeModal,
  onSelectEntity,
  onCloseModal,
  onFocusCamera,
}) => {
  const [showSnipRadii, setShowSnipRadii] = useState(true);
  const [encCategory, setEncCategory] = useState<'all' | BuildingCategory>('all');
  const [inspected3DSeries, setInspected3DSeries] = useState<BuildingSeriesId>('P-44');
  const [inspected3DVariantIdx, setInspected3DVariantIdx] = useState(0);
  const [inspected3DTimeOfDay, setInspected3DTimeOfDay] = useState<TimeOfDayId>('day');
  const [inspected3DAutoRotate, setInspected3DAutoRotate] = useState(true);
  const presetSpec = DISTRICT_PRESETS[district.preset];
  const m = district.metrics;

  const filteredEncyclopediaSeries = ALL_BUILDING_SERIES_IDS.filter((sid) => {
    if (encCategory === 'all') return true;
    return BUILDING_SERIES_CATALOG[sid].category === encCategory;
  });

  const active3DSpec = BUILDING_SERIES_CATALOG[inspected3DSeries];
  const active3DMeta = SERIES_ENGINEERING_METADATA[inspected3DSeries];
  const active3DInstances = district.buildings.filter((b) => b.series === inspected3DSeries);

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
            <span>{m.pedestriansCount} пеш.</span>
            <span aria-hidden="true">·</span>
            <span>{m.streetLampsCount} фонарей</span>
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
                  Пешеходов на маршрутах: {m.pedestriansCount}
                </div>
              </div>

              <div className="p-3 bg-stone-900 border border-stone-800 rounded">
                <div className="text-xs text-stone-400">Площадки, МАФ и свет</div>
                <div className="font-mono text-xl font-semibold text-amber-400 mt-1">
                  {m.playgroundsCount} площ. / {m.playEquipmentCount} эл.
                </div>
                <div className="text-xs text-stone-400 mt-0.5">
                  {m.benchesCount} скам. · {m.streetLampsCount} мачт РКУ-250
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
      {/* MODAL 2: ЭНЦИКЛОПЕДИЯ ЗДАНИЙ (ARCHITECTURAL ENCYCLOPEDIA OF 16 SERIES)*/}
      {/* ===================================================================== */}
      {activeModal === 'encyclopedia' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Энциклопедия типовых серий зданий и объектов микрорайона"
          className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-stone-950/85"
        >
          <div
            id="encyclopedia-modal-scroll"
            className="bg-stone-950 border border-stone-800 rounded-lg max-w-5xl w-full max-h-[88vh] overflow-y-auto p-6 text-stone-200 shadow-2xl"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-stone-800">
              <div>
                <div className="text-xs text-amber-400">
                  Архитектурно-строительная энциклопедия МНИИТЭП · Моспроект-1 · 16-битные текстуры панелей
                </div>
                <h2 className="font-display text-2xl font-bold text-stone-100 mt-0.5">
                  Энциклопедия зданий с интерактивным 3D-осмотром (16 проектов)
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

            {/* INTERACTIVE 3D BUILDING TURNTABLE STAGE (Повертеть-покрутить любую серию дома) */}
            <div className="mt-4 p-4 bg-stone-900/95 border border-amber-500/40 rounded-lg">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-800">
                <div>
                  <span className="text-xs font-mono text-amber-400 font-semibold">
                    Интерактивный 3D-макет · Серия {active3DSpec.code}
                  </span>
                  <h3 className="font-display text-lg font-bold text-stone-100">
                    {active3DSpec.name}
                  </h3>
                </div>

                {/* 3D Viewport Controls: Day/Night & Auto-Rotate */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setInspected3DTimeOfDay((t) => (t === 'day' ? 'night' : 'day'))
                    }
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                      inspected3DTimeOfDay === 'night'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                        : 'bg-stone-950 border-stone-700 text-stone-300 hover:border-stone-500'
                    }`}
                  >
                    {inspected3DTimeOfDay === 'night'
                      ? 'Освещение: Вечер (окна светятся)'
                      : 'Освещение: День'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspected3DAutoRotate((r) => !r)}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                      inspected3DAutoRotate
                        ? 'bg-stone-800 border-stone-600 text-stone-200'
                        : 'bg-stone-950 border-stone-800 text-stone-400'
                    }`}
                  >
                    {inspected3DAutoRotate ? 'Автовращение: Вкл' : 'Автовращение: Пауза'}
                  </button>
                </div>
              </div>

              {/* Quick Series Switcher Bar for the 3D Turntable */}
              <div className="flex flex-wrap items-center gap-1.5 py-2.5 border-b border-stone-800/80">
                <span className="text-xs text-stone-400 mr-1">Выбрать 3D-модель:</span>
                {ALL_BUILDING_SERIES_IDS.map((sid) => {
                  const s = BUILDING_SERIES_CATALOG[sid];
                  const active = inspected3DSeries === sid;
                  return (
                    <button
                      key={sid}
                      type="button"
                      onClick={() => {
                        setInspected3DSeries(sid);
                        setInspected3DVariantIdx(0);
                      }}
                      className={`px-2 py-1 text-xs rounded border transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-amber-500 text-stone-950 border-amber-400 font-semibold'
                          : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-600'
                      }`}
                    >
                      {s.code}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-3 items-center">
                {/* 3D WebGL Turntable Canvas */}
                <div className="lg:col-span-7 space-y-1.5">
                  <Building3DPreviewCanvas
                    seriesId={inspected3DSeries}
                    variantIndex={inspected3DVariantIdx}
                    timeOfDay={inspected3DTimeOfDay}
                    autoRotate={inspected3DAutoRotate}
                    className="w-full h-64 sm:h-72"
                  />
                  <div className="flex items-center justify-between text-xs text-stone-400 font-mono px-1">
                    <span>Зажмите ЛКМ и двигайте мышь, чтобы покрутить дом на 360°</span>
                    <span>Колёсико — масштаб</span>
                  </div>
                </div>

                {/* Selected 3D Model Details & 16-bit Facade Variant Selector */}
                <div className="lg:col-span-5 space-y-2.5 text-xs">
                  <p className="text-stone-200 leading-relaxed">{active3DSpec.description}</p>

                  <div className="p-2.5 bg-stone-950 border border-stone-800 rounded space-y-1 text-stone-300">
                    <div>
                      <span className="text-stone-400">Годы строительства:</span>{' '}
                      <span className="font-mono text-stone-100">{active3DSpec.years}</span> ·{' '}
                      <span className="font-mono text-stone-100">
                        {active3DSpec.minFloors}–{active3DSpec.maxFloors} эт.
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400">Институт:</span>{' '}
                      <span className="text-stone-200">{active3DMeta.institute}</span>
                    </div>
                    <div>
                      <span className="text-stone-400">Конструктив:</span>{' '}
                      <span className="text-stone-200">{active3DMeta.structuralGrid}</span>
                    </div>
                    <div>
                      <span className="text-stone-400">Высота потолков:</span>{' '}
                      <span className="font-mono text-stone-200">{active3DMeta.ceilingHeight}</span>
                    </div>
                  </div>

                  {/* Interactive 16-bit Facade Variant Switcher */}
                  <div className="space-y-1.5">
                    <div className="text-stone-400">
                      Переключить 16-битную текстуру фасада на 3D-модели:
                    </div>
                    <div className="space-y-1">
                      {active3DSpec.facadeVariants.map((fv, idx) => (
                        <button
                          key={fv.id}
                          type="button"
                          onClick={() => setInspected3DVariantIdx(idx)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded border text-left transition-colors ${
                            inspected3DVariantIdx === idx
                              ? 'bg-stone-800 border-amber-500 text-stone-100 font-medium'
                              : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-sm border border-stone-600 shrink-0"
                            style={{ backgroundColor: fv.primaryColor }}
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-sm border border-stone-600 shrink-0"
                            style={{ backgroundColor: fv.secondaryColor }}
                          />
                          <span className="truncate">{fv.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {active3DInstances.length > 0 && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectEntity({ kind: 'building', data: active3DInstances[0] });
                          onCloseModal();
                        }}
                        className="w-full py-2 px-3 text-xs font-semibold bg-amber-500 text-stone-950 rounded hover:bg-amber-400 transition-colors"
                      >
                        Найти и выделить этот дом в микрорайоне ({active3DInstances[0].address})
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Category Filter Tabs inside Encyclopedia */}
            <div className="flex flex-wrap items-center gap-2 mt-5 pb-3 border-b border-stone-800">
              {(
                [
                  ['all', `Все проекты (${ALL_BUILDING_SERIES_IDS.length})`],
                  ['residential', `Жилые серии (${RESIDENTIAL_SERIES_IDS.length})`],
                  ['social', `Соцкультбыт СНиП (${SOCIAL_INFRA_SERIES_IDS.length})`],
                  ['utility', 'Инженерные сооружения (1)'],
                ] as ['all' | BuildingCategory, string][]
              ).map(([catId, label]) => (
                <button
                  key={catId}
                  type="button"
                  onClick={() => setEncCategory(catId)}
                  className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors ${
                    encCategory === catId
                      ? 'bg-amber-500 text-stone-950 border-amber-400 font-semibold'
                      : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              {filteredEncyclopediaSeries.map((sid: BuildingSeriesId) => {
                const spec = BUILDING_SERIES_CATALOG[sid];
                const meta = SERIES_ENGINEERING_METADATA[sid];
                const instances = district.buildings.filter((b) => b.series === sid);
                const isCurrentlyIn3D = inspected3DSeries === sid;

                return (
                  <article
                    key={sid}
                    className={`p-4 rounded-lg border flex flex-col justify-between gap-3 transition-colors ${
                      isCurrentlyIn3D
                        ? 'bg-stone-900 border-amber-500/80'
                        : 'bg-stone-900/90 border-stone-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-stone-400">
                        <span className="font-mono text-amber-400 font-semibold">
                          Проект / Серия {spec.code}
                        </span>
                        <span className="font-mono">
                          Годы: {spec.years} · {spec.minFloors}–{spec.maxFloors} эт.
                        </span>
                      </div>

                      <h3 className="font-display text-lg font-semibold text-stone-100 mt-1">
                        {spec.name}
                      </h3>

                      {/* Schematic Architectural Elevation & Plan Blueprint Preview */}
                      <div className="mt-2.5 p-2.5 bg-stone-950 border border-stone-800 rounded flex items-center gap-3">
                        <svg
                          viewBox="0 0 110 64"
                          className="w-28 h-16 shrink-0 bg-stone-900/80 rounded border border-stone-800"
                        >
                          {/* Ground line */}
                          <line x1="4" y1="58" x2="106" y2="58" stroke="#57534e" strokeWidth="1" />
                          {/* Schematic building elevation silhouette */}
                          {(() => {
                            const h = Math.min(46, Math.max(16, spec.defaultFloors * 2.2));
                            const w = Math.min(
                              82,
                              Math.max(32, spec.sectionWidth * spec.defaultSections * 0.9)
                            );
                            const x0 = 55 - w / 2;
                            const y0 = 58 - h;
                            return (
                              <g>
                                <rect
                                  x={x0}
                                  y={y0}
                                  width={w}
                                  height={h}
                                  fill={spec.facadePrimaryColor}
                                  stroke={spec.facadeSecondaryColor}
                                  strokeWidth="1.5"
                                />
                                {/* Ceramic tile bands & window grid */}
                                <rect
                                  x={x0 + 2}
                                  y={y0 + 2}
                                  width={w - 4}
                                  height={Math.max(4, h - 6)}
                                  fill={spec.facadeSecondaryColor}
                                  fillOpacity="0.45"
                                />
                                {/* Roof elevator room */}
                                <rect
                                  x={55 - 8}
                                  y={y0 - 4}
                                  width={16}
                                  height={4}
                                  fill={spec.accentColor}
                                />
                              </g>
                            );
                          })()}
                        </svg>

                        <p className="text-xs text-stone-300 leading-relaxed">
                          {spec.description}
                        </p>
                      </div>

                      {/* Technical & Constructive Specifications */}
                      <div className="mt-3 space-y-1 text-xs text-stone-300 border-t border-stone-800 pt-2.5">
                        <div>
                          <span className="text-stone-400">Проектный институт:</span>{' '}
                          <span className="text-stone-200">{meta.institute}</span>
                        </div>
                        <div>
                          <span className="text-stone-400">Конструктивная схема:</span>{' '}
                          <span className="text-stone-200">{meta.structuralGrid}</span>
                        </div>
                        <div>
                          <span className="text-stone-400">Высота этажа и узлы:</span>{' '}
                          <span className="font-mono text-stone-200">{meta.ceilingHeight}</span> ·{' '}
                          <span>{meta.elevators}</span>
                        </div>
                        <div>
                          <span className="text-stone-400">Планировка:</span>{' '}
                          <span className="text-stone-200">{meta.typicalLayout}</span>
                        </div>
                        {spec.snipCapacityLabel && (
                          <div className="text-amber-300/90">
                            Норматив СНиП II-60-75: {spec.snipCapacityLabel} (радиус обслуживания ≤{' '}
                            {spec.snipNormRadiusMeters} м)
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Facade Finish Variants & 3D Actions */}
                    <div className="pt-2.5 border-t border-stone-800 space-y-2">
                      <div className="text-xs text-stone-400">
                        Варианты заводской отделки панелей ({spec.facadeVariants.length}):
                      </div>
                      <div className="space-y-1">
                        {spec.facadeVariants.map((fv, vIdx) => (
                          <div
                            key={fv.id}
                            onClick={() => {
                              setInspected3DSeries(sid);
                              setInspected3DVariantIdx(vIdx);
                              document
                                .getElementById('encyclopedia-modal-scroll')
                                ?.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="flex items-center gap-2 text-xs text-stone-200 cursor-pointer hover:text-amber-300"
                          >
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
                      </div>

                      <div className="pt-1.5 flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setInspected3DSeries(sid);
                            setInspected3DVariantIdx(0);
                            document
                              .getElementById('encyclopedia-modal-scroll')
                              ?.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`px-3 py-1 text-xs font-semibold rounded border transition-colors ${
                            isCurrentlyIn3D
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-stone-800 border-stone-700 text-stone-100 hover:border-amber-500/60'
                          }`}
                        >
                          {isCurrentlyIn3D
                            ? '✓ Сейчас на 3D-стенде'
                            : 'Покрутить 3D-модель ↑'}
                        </button>

                        {instances.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectEntity({ kind: 'building', data: instances[0] });
                              onCloseModal();
                            }}
                            className="px-3 py-1 text-xs font-semibold bg-amber-500 text-stone-950 rounded hover:bg-amber-400 transition-colors"
                          >
                            Выделить в районе ({instances[0].address})
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
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
