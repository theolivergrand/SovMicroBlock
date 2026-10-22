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
import {
  AnimatedPedestrianHandle,
  buildPedestrianActor,
  buildStreetLampsGroup,
  updatePedestriansAtTime,
} from './PedestrianBuilder';
import { createConcreteBumpTexture, getSeasonPalette } from './SovietMaterials';
import {
  buildInstancedWindGrass,
  createGrassLawnShaderMaterial,
  createSovietSkyDome,
} from './SovietShaders';

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
    renderer.toneMappingExposure = 1.12;
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

    const camera = new THREE.PerspectiveCamera(45, width / height, 1.0, 950);
    camera.position.set(135, 92, 155);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 8, 0);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = 10;
    controls.maxDistance = 390;

    // 1. Custom GLSL Atmospheric Sky Dome
    const skyDome = createSovietSkyDome();
    scene.add(skyDome.mesh);

    // 2. Outdoor Atmospheric Lighting Rig + Evening Courtyard Point Lights
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

    // Warm sodium-vapor courtyard & boulevard point lights for evening/sunset authenticity
    const courtyardPointLights: THREE.PointLight[] = [];
    const courtyardLightCoords = [
      [-56, 14, -52],
      [56, 14, -52],
      [-56, 14, 52],
      [56, 14, 52],
      [0, 16, 0],
    ];
    for (const [lx, ly, lz] of courtyardLightCoords) {
      const pt = new THREE.PointLight(0xffa947, 0, 95, 1.35);
      pt.position.set(lx, ly, lz);
      scene.add(pt);
      courtyardPointLights.push(pt);
    }

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
    let activePedestrianHandles: AnimatedPedestrianHandle[] = [];
    let activeGrassShaderMat: THREE.ShaderMaterial | null = null;
    let activeWindGrassController: { mesh: THREE.InstancedMesh; updateTime: (t: number) => void } | null = null;

    // Camera transition state
    let transitionActive = false;
    const targetCamPos = new THREE.Vector3(135, 92, 155);
    const targetLookAt = new THREE.Vector3(0, 8, 0);

    let frameId = 0;
    let unmounted = false;
    const startTimeMs = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 85);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (unmounted) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 6);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 85);
        }
      };
      frameId = window.setTimeout(poll, 6);
    }

    function tick() {
      if (unmounted) return;

      const elapsed = (performance.now() - startTimeMs) * 0.001;

      // Update animated GLSL shaders (sky clouds, grass wind waves, 3D grass blades)
      skyDome.updateTime(elapsed);
      if (activeGrassShaderMat) {
        activeGrassShaderMat.uniforms.uTime.value = elapsed;
      }
      if (activeWindGrassController) {
        activeWindGrassController.updateTime(elapsed);
      }

      // Update walking pedestrians along sidewalk routes
      if (activePedestrianHandles.length > 0) {
        updatePedestriansAtTime(activePedestrianHandles, elapsed);
      }

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
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    controls.addEventListener('start', () => {
      transitionActive = false;
    });

    const rebuildScene = (
      d: GeneratedDistrict,
      p: GeneratorParams,
      sel: SelectedEntity | null
    ) => {
      while (contentRoot.children.length > 0) {
        const child = contentRoot.children[0];
        contentRoot.remove(child);
      }
      interactableMeshes = [];
      activePedestrianHandles = [];
      activeGrassShaderMat = null;
      activeWindGrassController = null;

      const palette = getSeasonPalette(p.season);

      // Update custom GLSL Sky Dome & Scene Lighting for timeOfDay & season
      skyDome.updateConfig(p.season, p.timeOfDay);

      let bgHex = palette.fogColor;
      if (p.timeOfDay === 'night') {
        bgHex = '#0d1524';
        scene.environmentIntensity = 0.16;
        renderer.toneMappingExposure = 1.16;
        sunLight.color.set('#5a82b8');
        sunLight.intensity = 0.34;
        sunLight.position.set(-95, 130, 85);
        hemiLight.color.set('#274066');
        hemiLight.groundColor.set('#121824');
        hemiLight.intensity = 0.42;
        rimLight.color.set('#ffaa54');
        rimLight.intensity = 0.32;
        for (const pt of courtyardPointLights) {
          pt.color.set('#ff9d3b');
          pt.intensity = 4.2;
        }
      } else if (p.timeOfDay === 'sunset') {
        bgHex = '#b8684d';
        scene.environmentIntensity = 0.48;
        renderer.toneMappingExposure = 1.12;
        sunLight.color.set('#ff8c42');
        sunLight.intensity = 1.55;
        sunLight.position.set(150, 52, 95);
        hemiLight.color.set('#d47b5d');
        hemiLight.groundColor.set('#382e2a');
        hemiLight.intensity = 0.68;
        rimLight.color.set('#6e85b0');
        rimLight.intensity = 0.38;
        for (const pt of courtyardPointLights) {
          pt.color.set('#ffae4d');
          pt.intensity = 2.1;
        }
      } else {
        bgHex = palette.fogColor;
        scene.environmentIntensity = 0.85;
        renderer.toneMappingExposure = 1.08;
        sunLight.color.set('#fff3db');
        sunLight.intensity = 1.65;
        sunLight.position.set(110, 145, 95);
        hemiLight.color.set(palette.skyTop);
        hemiLight.groundColor.set(palette.groundColor);
        hemiLight.intensity = 0.88;
        rimLight.color.set('#9bb8d9');
        rimLight.intensity = 0.45;
        for (const pt of courtyardPointLights) {
          pt.intensity = 0;
        }
      }

      scene.background = new THREE.Color(bgHex);
      scene.fog = new THREE.FogExp2(bgHex, p.timeOfDay === 'night' ? 0.0014 : 0.0019);

      // 1. Extended Ground Terrain & Natural Green Belt Perimeter (850m x 850m)
      const terrainColor =
        p.timeOfDay === 'night'
          ? new THREE.Color(palette.groundColor).multiplyScalar(0.38)
          : p.timeOfDay === 'sunset'
          ? new THREE.Color(palette.groundColor).multiplyScalar(0.72)
          : new THREE.Color(palette.groundColor);

      const terrainMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(850, 850),
        new THREE.MeshStandardMaterial({
          color: terrainColor,
          roughness: 0.95,
          metalness: 0.02,
        })
      );
      terrainMesh.rotation.x = -Math.PI / 2;
      terrainMesh.position.y = -0.05;
      terrainMesh.receiveShadow = true;
      contentRoot.add(terrainMesh);

      // 2. Microdistrict Turf Lawn Pad with Custom Wind & Streetlamp Shader
      activeGrassShaderMat = createGrassLawnShaderMaterial(p.season, p.timeOfDay, d.streetLamps);
      const turfPad = new THREE.Mesh(
        new THREE.PlaneGeometry(246, 246, 32, 32),
        activeGrassShaderMat
      );
      turfPad.rotation.x = -Math.PI / 2;
      turfPad.position.y = 0.0;
      turfPad.receiveShadow = true;
      contentRoot.add(turfPad);

      // 3. Instanced 3D Wind-Animated Grass Tufts across Courtyards
      if (p.layers.vegetation) {
        activeWindGrassController = buildInstancedWindGrass(p.season, p.timeOfDay);
        contentRoot.add(activeWindGrassController.mesh);
      }

      // Perimeter avenues (Проспекты вокруг микрорайона) at y = 0.015
      const roadMat = new THREE.MeshStandardMaterial({
        color: palette.asphaltColor,
        roughness: 0.85,
        metalness: 0.08,
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
          new THREE.BoxGeometry(
            av.w > av.d ? av.w - 16 : 0.25,
            0.036,
            av.d > av.w ? av.d - 16 : 0.25
          ),
          roadMarkingMat
        );
        stripe.position.set(av.x, 0.018, av.z);
        contentRoot.add(stripe);
      }

      // 4. Pedestrian Sidewalk & Courtyard Paths Layer
      if (p.layers.paths) {
        const pathsGroup = buildPedestrianPathsGroup(d.paths, p.season);
        contentRoot.add(pathsGroup);
      }

      // 5. Soviet Streetlamps ("Кобра" РКУ-250) with Evening Light Cones & Ground Pools
      if (d.streetLamps && d.streetLamps.length > 0) {
        const lampsGroup = buildStreetLampsGroup(d.streetLamps, p.timeOfDay);
        contentRoot.add(lampsGroup);
      }

      // 6. Courtyards & Playgrounds Layer (Детские площадки)
      if (p.layers.playgrounds) {
        for (const pg of d.playgrounds) {
          const pgGroup = buildPlaygroundMeshGroup(pg);
          contentRoot.add(pgGroup);
          interactableMeshes.push(pgGroup);
        }
      }

      // 7. Benches & Urns Layer (Скамейки и урны)
      if (p.layers.benchesAndUrns) {
        for (const bItem of d.benchesAndUrns) {
          const bGroup = buildBenchAndUrnGroup(bItem);
          contentRoot.add(bGroup);
        }
      }

      // 8. Green Landscaping Layer (Деревья и кустарники)
      if (p.layers.vegetation) {
        const vegGroup = buildVegetationGroup(d.vegetation, p.season, maxAnisotropy);
        contentRoot.add(vegGroup);
      }

      // 9. Animated Pedestrians Walking Along Sidewalk Network
      if (p.layers.pedestrians && d.pedestrians && d.pedestrians.length > 0) {
        const pedsGroup = new THREE.Group();
        for (const spec of d.pedestrians) {
          const handle = buildPedestrianActor(spec);
          activePedestrianHandles.push(handle);
          pedsGroup.add(handle.root);
        }
        updatePedestriansAtTime(
          activePedestrianHandles,
          (performance.now() - startTimeMs) * 0.001
        );
        contentRoot.add(pedsGroup);
      }

      // 10. Soviet Residential & Social Infrastructure Buildings Layers
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
    };

    sceneApiRef.current = {
      rebuildScene,
      flyToPreset,
    };

    // Initial scene build
    rebuildScene(district, params, selectedEntity);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Start continuous animation loop (paced via afterDraw on software WebGL)
    tick();

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
      renderer.render(scene, camera);
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
