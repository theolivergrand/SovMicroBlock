/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { BottomDock } from './components/BottomDock';
import { InspectorOverlay } from './components/InspectorOverlay';
import { ActiveModalType, TopBar } from './components/TopBar';
import { DISTRICT_PRESETS } from './generator/presets';
import { generateMicrodistrict } from './generator/procedural';
import {
  CameraPresetId,
  DistrictPresetId,
  GeneratorParams,
  SelectedEntity,
} from './generator/types';
import { DistrictSceneView } from './three/DistrictSceneView';

export default function App() {
  const [params, setParams] = useState<GeneratorParams>(() => ({
    preset: 'chertanovo',
    seed: 1980,
    ...DISTRICT_PRESETS.chertanovo.defaultParams,
  }));

  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('overview');
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModalType>('none');

  const district = useMemo(() => generateMicrodistrict(params), [params]);

  const handleSelectPreset = (preset: DistrictPresetId) => {
    setSelectedEntity(null);
    setParams((prev) => ({
      ...prev,
      preset,
      ...DISTRICT_PRESETS[preset].defaultParams,
    }));
  };

  const handleRandomizeSeed = () => {
    setSelectedEntity(null);
    setParams((prev) => ({
      ...prev,
      seed: Math.floor(1968 + ((prev.seed * 73 + 19) % 8000)),
    }));
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-stone-950 select-none">
      {/* Top Bar following the 3-Zone Top Bar Contract */}
      <TopBar
        activeModal={activeModal}
        onOpenModal={setActiveModal}
        onRandomizeSeed={handleRandomizeSeed}
      />

      {/* Main 3D Procedural Soviet Microdistrict Viewport */}
      <main className="relative w-full h-[calc(100vh-53px)]">
        <DistrictSceneView
          district={district}
          params={params}
          cameraPreset={cameraPreset}
          selectedEntity={selectedEntity}
          onSelectEntity={setSelectedEntity}
        />

        {/* Top-Left Spec Summary, Object Inspector & Modals */}
        <InspectorOverlay
          district={district}
          selectedEntity={selectedEntity}
          activeModal={activeModal}
          onSelectEntity={setSelectedEntity}
          onCloseModal={() => setActiveModal('none')}
          onFocusCamera={setCameraPreset}
        />

        {/* Unified Collapsible Bottom Control Dock */}
        <BottomDock
          params={params}
          district={district}
          cameraPreset={cameraPreset}
          selectedEntity={selectedEntity}
          onSelectPreset={handleSelectPreset}
          onUpdateParams={setParams}
          onChangeCameraPreset={setCameraPreset}
          onSelectEntity={setSelectedEntity}
        />
      </main>
    </div>
  );
}
