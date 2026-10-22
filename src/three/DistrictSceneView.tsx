import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CameraPresetId,
  GeneratedDistrict,
  GeneratorParams,
  SelectedEntity,
} from '../generator/types';
import { buildSovietBuildingMesh } from './BuildingBuilder';
import {
  buildBenchAndUrnGroup,
  buildPedestrianPathsGroup,
  buildPlaygroundMeshGroup,
  buildVegetationGroup,
} from './CourtyardBuilder';
import { createConcreteBumpTexture, getSeasonPalette } from './SovietMaterials';

interface DistrictSceneViewProps {
  district: GeneratedDistrict;
  params: GeneratorParams;
  cameraPreset: CameraPresetId;
  selectedEntity: SelectedEntity | null;
  onSelectEntity: (entity: SelectedEntity | null) => void;
}

const _raycaster = new THREE.Raycaster();
const _pointer = new THREE.Vector2();

export const DistrictSceneView: React.FC<DistrictSceneViewProps> = ({
  district,
  params,
  cameraPreset,
  selectedEntity,
  onSelectEntity,
}) => {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const districtRef = useRef(district);
  districtRef.current = district;
  const onSelectRef = useRef(onSelectEntity);
  onSelectRef.current = onSelectEntity;

  const sceneApiRef = useRef<{
    rebuildScene: (d: GeneratedDistrict, p: GeneratorParams, sel: SelectedEntity | null) => void;
    flyToPreset: (preset: CameraPresetId, d: GeneratedDistrict, sel: SelectedEntity | null) => void;
    requestRender: () => void;
  } | null>(null);

  useEffect(() => {
    const container = canvasMountRef.current;
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
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(45, width / height, 1.0, 900);
    camera.position.set(135, 92, 155);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 8, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = 12;
    controls.maxDistance = 380;

    // 3-Point + Warm/Cool Outdoor Atmospheric Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x9ec5eb, 0x576148, 0.85);
    hemiLight.position.set(0, 140, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff1d6, 1.65);
    sunLight.position.set(110, 145, 95);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    const d = 145;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 380;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x9bb8d9, 0.45);
    rimLight.position.set(-110, 75, -95);
    scene.add(rimLight);

    // Content Root & Selection Highlight Ring
    const contentRoot = new THREE.Group();
    scene.add(contentRoot);

    const highlightRing = new THREE.Mesh(
      new THREE.RingGeometry(1, 1.12, 32),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        side: THREE.DoubleSide,
      })
    );
    highlightRing.rotation.x = -Math.PI / 2;
    highlightRing.position.y = 0.25;
    highlightRing.visible = false;
    scene.add(highlightRing);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const sharedBumpTex = createConcreteBumpTexture(maxAnisotropy);
    let interactableMeshes: THREE.Object3D[] = [];

    // Camera transition state
    let transitionActive = false;
    const targetCamPos = new THREE.Vector3(135, 92, 155);
    const targetLookAt = new THREE.Vector3(0, 8, 0);

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let unmounted = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (unmounted) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (unmounted) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (unmounted) return;
        renderDirty = false;

        if (transitionActive) {
          const alpha = isSoftwareGl ? 0.45 : 0.16;
          camera.position.lerp(targetCamPos, alpha);
          controls.target.lerp(targetLookAt, alpha);
          if (
            camera.position.distanceToSquared(targetCamPos) < 0.25 &&
            controls.target.distanceToSquared(targetLookAt) < 0.25
          ) {
            camera.position.copy(targetCamPos);
            controls.target.copy(targetLookAt);
            transitionActive = false;
          } else {
            renderDirty = true;
          }
        }

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    controls.addEventListener('start', () => {
      transitionActive = false;
    });
    controls.addEventListener('change', () => {
      requestRender();
    });

    const rebuildScene = (
      d: GeneratedDistrict,
      p: GeneratorParams,
      sel: SelectedEntity | null
    ) => {
      // Clear previous contentRoot children
      while (contentRoot.children.length > 0) {
        const child = contentRoot.children[0];
        contentRoot.remove(child);
      }
      interactableMeshes = [];

      const palette = getSeasonPalette(p.season);

      // Update atmosphere & lighting for season and timeOfDay
      let bgHex = palette.fogColor;
      if (p.timeOfDay === 'night') {
        bgHex = '#101824';
        sunLight.color.set('#7aa2d4');
        sunLight.intensity = 0.55;
        hemiLight.color.set('#2c4466');
        hemiLight.groundColor.set('#18202c');
        hemiLight.intensity = 0.55;
      } else if (p.timeOfDay === 'sunset') {
        bgHex = '#cfa082';
        sunLight.color.set('#ff9b54');
        sunLight.intensity = 1.65;
        sunLight.position.set(150, 68, 95);
        hemiLight.color.set('#d98b6c');
        hemiLight.groundColor.set('#453d38');
        hemiLight.intensity = 0.8;
      } else {
        sunLight.color.set('#fff3db');
        sunLight.intensity = 1.65;
        sunLight.position.set(110, 145, 95);
        hemiLight.color.set(palette.skyTop);
        hemiLight.groundColor.set(palette.groundColor);
        hemiLight.intensity = 0.88;
      }

      scene.background = new THREE.Color(bgHex);
      scene.fog = new THREE.FogExp2(bgHex, 0.0021);

      // 1. Extended Ground Terrain & Natural Green Belt Perimeter (800m x 800m so never a floating box)
      const terrainMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(850, 850),
        new THREE.MeshStandardMaterial({
          color: palette.groundColor,
          roughness: 0.95,
          metalness: 0.02,
        })
      );
      terrainMesh.rotation.x = -Math.PI / 2;
      terrainMesh.position.y = -0.05;
      terrainMesh.receiveShadow = true;
      contentRoot.add(terrainMesh);

      // Microdistrict turf lawn pad (y = 0)
      const turfPad = new THREE.Mesh(
        new THREE.BoxGeometry(246, 0.04, 246),
        new THREE.MeshStandardMaterial({
          color: palette.grassColor,
          roughness: 0.92,
          metalness: 0.02,
        })
      );
      turfPad.position.y = -0.02;
      turfPad.receiveShadow = true;
      contentRoot.add(turfPad);

      // Perimeter avenues (Проспекты вокруг микрорайона) at y = 0.015
      const roadMat = new THREE.MeshStandardMaterial({
        color: palette.asphaltColor,
        roughness: 0.88,
        metalness: 0.05,
      });
      const roadMarkingMat = new THREE.MeshBasicMaterial({ color: '#e2ded3' });
      const avenueCoords = [
        { x: 0, z: -120, w: 260, d: 14 },
        { x: 0, z: 120, w: 260, d: 14 },
        { x: -120, z: 0, w: 14, d: 254 },
        { x: 120, z: 0, w: 14, d: 254 },
      ];
      for (const av of avenueCoords) {
        const road = new THREE.Mesh(new THREE.BoxGeometry(av.w, 0.03, av.d), roadMat);
        road.position.set(av.x, 0.015, av.z);
        road.receiveShadow = true;
        contentRoot.add(road);

        const stripe = new THREE.Mesh(
          new THREE.BoxGeometry(av.w > av.d ? av.w - 16 : 0.25, 0.036, av.d > av.w ? av.d - 16 : 0.25),
          roadMarkingMat
        );
        stripe.position.set(av.x, 0.018, av.z);
        contentRoot.add(stripe);
      }

      // 2. Pedestrian Sidewalk & Courtyard Paths Layer
      if (p.layers.paths) {
        const pathsGroup = buildPedestrianPathsGroup(d.paths, p.season);
        contentRoot.add(pathsGroup);
      }

      // 3. Courtyards & Playgrounds Layer (Детские площадки)
      if (p.layers.playgrounds) {
        for (const pg of d.playgrounds) {
          const pgGroup = buildPlaygroundMeshGroup(pg);
          contentRoot.add(pgGroup);
          interactableMeshes.push(pgGroup);
        }
      }

      // 4. Benches & Urns Layer (Скамейки и урны)
      if (p.layers.benchesAndUrns) {
        for (const bItem of d.benchesAndUrns) {
          const bGroup = buildBenchAndUrnGroup(bItem);
          contentRoot.add(bGroup);
        }
      }

      // 5. Green Landscaping Layer (Деревья и кустарники)
      if (p.layers.vegetation) {
        const vegGroup = buildVegetationGroup(d.vegetation, p.season, maxAnisotropy);
        contentRoot.add(vegGroup);
      }

      // 6. Soviet Residential & Social Infrastructure Buildings Layers
      for (const bld of d.buildings) {
        const isRes = bld.category === 'residential';
        if ((isRes && p.layers.buildings) || (!isRes && p.layers.socialInfra)) {
          const bldGroup = buildSovietBuildingMesh(bld, p.timeOfDay, maxAnisotropy, sharedBumpTex);
          contentRoot.add(bldGroup);
          interactableMeshes.push(bldGroup);
        }
      }

      // Update highlight ring for selected entity
      if (sel) {
        highlightRing.visible = true;
        if (sel.kind === 'building') {
          const r = Math.max(sel.data.width, sel.data.depth) * 0.58;
          highlightRing.scale.set(r, r, 1);
          highlightRing.position.set(sel.data.x, 0.18, sel.data.z);
        } else {
          const r = Math.max(sel.data.width, sel.data.depth) * 0.62;
          highlightRing.scale.set(r, r, 1);
          highlightRing.position.set(sel.data.x, 0.18, sel.data.z);
        }
      } else {
        highlightRing.visible = false;
      }

      requestRender();
    };

    const flyToPreset = (
      preset: CameraPresetId,
      d: GeneratedDistrict,
      sel: SelectedEntity | null
    ) => {
      if (preset === 'overview') {
        targetCamPos.set(135, 92, 155);
        targetLookAt.set(0, 8, 0);
      } else if (preset === 'courtyard') {
        // Focus directly inside the courtyard on the playground with the Soviet rocket slide & geodesic dome
        const pg =
          sel?.kind === 'playground'
            ? sel.data
            : d.playgrounds[0] ?? { x: -58, z: -54 };
        targetCamPos.set(pg.x + 9.8, 6.4, pg.z + 10.2);
        targetLookAt.set(pg.x - 1.2, 1.6, pg.z - 0.8);
      } else if (preset === 'topdown') {
        targetCamPos.set(0, 235, 18);
        targetLookAt.set(0, 0, 0);
      } else if (preset === 'pedestrian') {
        const pg = d.playgrounds[0] ?? { x: -58, z: -54 };
        targetCamPos.set(pg.x + 11, 2.4, pg.z + 13);
        targetLookAt.set(pg.x - 2, 3.0, pg.z - 2);
      }
      transitionActive = true;
      requestRender();
    };

    sceneApiRef.current = {
      rebuildScene,
      flyToPreset,
      requestRender,
    };

    // Initial scene build
    rebuildScene(district, params, selectedEntity);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    requestRender();

    // Pointer click raycasting for selecting buildings or playgrounds
    let downX = 0;
    let downY = 0;
    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_pointer, camera);
      const hits = _raycaster.intersectObjects(interactableMeshes, true);
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && !obj.userData?.entityId) {
          obj = obj.parent;
        }
        if (obj && obj.userData?.entityId) {
          const { entityKind, entityId } = obj.userData;
          const curDistrict = districtRef.current;
          if (entityKind === 'building') {
            const found = curDistrict.buildings.find((b) => b.id === entityId);
            if (found) {
              onSelectRef.current({ kind: 'building', data: found });
              return;
            }
          } else if (entityKind === 'playground') {
            const found = curDistrict.playgrounds.find((p) => p.id === entityId);
            if (found) {
              onSelectRef.current({ kind: 'playground', data: found });
              return;
            }
          }
        }
      }
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', onPointerDown);
    domElem.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', onResize);

    return () => {
      unmounted = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      domElem.removeEventListener('pointerdown', onPointerDown);
      domElem.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Sync scene when district, params, or selection changes
  useEffect(() => {
    sceneApiRef.current?.rebuildScene(district, params, selectedEntity);
  }, [district, params, selectedEntity]);

  // Sync camera preset changes
  useEffect(() => {
    sceneApiRef.current?.flyToPreset(cameraPreset, district, selectedEntity);
  }, [cameraPreset]);

  return (
    <div
      ref={canvasMountRef}
      data-testid="district-3d-canvas"
      className="fixed inset-0 w-full h-full z-0"
    />
  );
};
