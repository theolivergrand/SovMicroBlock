import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BuildingSeriesId, TimeOfDayId } from '../generator/types';
import {
  buildSovietBuildingMesh,
  createPreviewBuildingSpec,
} from './BuildingBuilder';
import { createConcreteBumpTexture } from './SovietMaterials';

interface Building3DPreviewCanvasProps {
  seriesId: BuildingSeriesId;
  variantIndex?: number;
  timeOfDay?: TimeOfDayId;
  autoRotate?: boolean;
  className?: string;
}

export const Building3DPreviewCanvas: React.FC<Building3DPreviewCanvasProps> = ({
  seriesId,
  variantIndex = 0,
  timeOfDay = 'day',
  autoRotate = true,
  className = 'w-full h-56',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{
    updateModel: (sid: BuildingSeriesId, vIdx: number, tod: TimeOfDayId, autoRot: boolean) => void;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));

    const w = container.clientWidth || 360;
    const h = container.clientHeight || 220;
    renderer.setSize(w, h);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(40, w / h, 0.5, 450);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 8;
    controls.maxDistance = 190;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.8;

    const hemiLight = new THREE.HemisphereLight(0x9ec5eb, 0x4b573e, 0.9);
    hemiLight.position.set(0, 90, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff2d9, 1.65);
    dirLight.position.set(65, 95, 75);
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x8fb3db, 0.55);
    rimLight.position.set(-65, 50, -65);
    scene.add(rimLight);

    const eveningPointLight = new THREE.PointLight(0xffa442, 0, 95, 1.25);
    eveningPointLight.position.set(16, 12, 24);
    scene.add(eveningPointLight);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const sharedBumpTex = createConcreteBumpTexture(maxAnisotropy);
    let lastSeriesId: BuildingSeriesId | null = null;

    let frameId = 0;
    let unmounted = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 200);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (unmounted) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 10);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 200);
        }
      };
      frameId = window.setTimeout(poll, 10);
    }

    function tick() {
      if (unmounted) return;
      controls.update();
      renderer.render(scene, camera);
      if (isSoftwareGl) {
        if (controls.autoRotate) {
          afterDraw(tick);
        }
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    controls.addEventListener('change', () => {
      if (isSoftwareGl && !controls.autoRotate) {
        renderer.render(scene, camera);
      }
    });

    const updateModel = (
      sid: BuildingSeriesId,
      vIdx: number,
      tod: TimeOfDayId,
      autoRot: boolean
    ) => {
      controls.autoRotate = autoRot;

      while (rootGroup.children.length > 0) {
        rootGroup.remove(rootGroup.children[0]);
      }

      const bldSpec = createPreviewBuildingSpec(sid, vIdx);

      // Update lighting & background for Day vs Evening preview
      if (tod === 'night') {
        scene.background = new THREE.Color('#0d1626');
        scene.environmentIntensity = 0.2;
        dirLight.color.set('#648cc4');
        dirLight.intensity = 0.42;
        hemiLight.color.set('#2c466e');
        hemiLight.groundColor.set('#141b29');
        hemiLight.intensity = 0.48;
        eveningPointLight.intensity = 3.8;
      } else {
        scene.background = new THREE.Color('#182230');
        scene.environmentIntensity = 0.85;
        dirLight.color.set('#fff3db');
        dirLight.intensity = 1.65;
        hemiLight.color.set('#8ab4de');
        hemiLight.groundColor.set('#44523b');
        hemiLight.intensity = 0.88;
        eveningPointLight.intensity = 0;
      }

      // Architectural presentation plinth & courtyard lawn pad
      const padW = bldSpec.width + 18;
      const padD = bldSpec.depth + 18;
      const lawnPad = new THREE.Mesh(
        new THREE.BoxGeometry(padW, 0.5, padD),
        new THREE.MeshStandardMaterial({
          color: tod === 'night' ? '#243624' : '#4a6e3d',
          roughness: 0.9,
        })
      );
      lawnPad.position.y = -0.25;
      rootGroup.add(lawnPad);

      const asphaltApron = new THREE.Mesh(
        new THREE.BoxGeometry(bldSpec.width + 6, 0.08, bldSpec.depth + 6),
        new THREE.MeshStandardMaterial({
          color: '#5a5f66',
          roughness: 0.85,
        })
      );
      asphaltApron.position.y = 0.02;
      rootGroup.add(asphaltApron);

      // Build the 16-bit textured Soviet building mesh
      const bldMesh = buildSovietBuildingMesh(
        bldSpec,
        tod,
        maxAnisotropy,
        sharedBumpTex
      );
      rootGroup.add(bldMesh);

      // Re-frame camera when series changes
      if (lastSeriesId !== sid) {
        lastSeriesId = sid;
        const targetY = bldSpec.height * 0.46;
        const maxSpan = Math.max(bldSpec.width * 0.82, bldSpec.height * 0.95, 18);
        const dist = maxSpan * 1.42;
        camera.position.set(dist * 0.82, targetY + dist * 0.42, dist * 0.95);
        controls.target.set(0, targetY, 0);
        controls.update();
      }
      renderer.render(scene, camera);
    };

    apiRef.current = { updateModel };
    updateModel(seriesId, variantIndex, timeOfDay, autoRotate);
    tick();

    const onResize = () => {
      if (!container) return;
      const nw = container.clientWidth || 360;
      const nh = container.clientHeight || 220;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      renderer.render(scene, camera);
    };
    window.addEventListener('resize', onResize);

    return () => {
      unmounted = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      renderer.forceContextLoss?.();
    };
  }, []);

  useEffect(() => {
    apiRef.current?.updateModel(seriesId, variantIndex, timeOfDay, autoRotate);
  }, [seriesId, variantIndex, timeOfDay, autoRotate]);

  return (
    <div
      ref={mountRef}
      data-testid={`building-3d-preview-${seriesId}`}
      className={`relative overflow-hidden rounded border border-stone-700 bg-stone-950 cursor-grab active:cursor-grabbing ${className}`}
    />
  );
};
