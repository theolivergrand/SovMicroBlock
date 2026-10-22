import * as THREE from 'three';
import { BuildingSeriesId, FacadeFinishVariant, SeasonId, TimeOfDayId } from '../generator/types';
import { BUILDING_SERIES_CATALOG } from '../generator/presets';

export function createPanelFacadeTexture(
  seriesId: BuildingSeriesId,
  facadeVariant: FacadeFinishVariant | undefined,
  timeOfDay: TimeOfDayId,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const spec = BUILDING_SERIES_CATALOG[seriesId];
  const primaryColor = facadeVariant?.primaryColor ?? spec.facadePrimaryColor;
  const secondaryColor = facadeVariant?.secondaryColor ?? spec.facadeSecondaryColor;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Base panel color
  ctx.fillStyle = primaryColor;
  ctx.fillRect(0, 0, 256, 256);

  // Colored ceramic tile ("кабанчик" / мозаика) bands per series
  ctx.fillStyle = secondaryColor;
  if (seriesId === 'P-44' || seriesId === 'OMR-Chertanovo') {
    ctx.fillRect(0, 148, 256, 92);
    ctx.fillRect(0, 0, 28, 256);
    ctx.fillRect(228, 0, 28, 256);
  } else if (seriesId === 'KOPE') {
    ctx.fillRect(16, 0, 56, 256);
    ctx.fillRect(184, 0, 56, 256);
  } else if (seriesId === '1605-AM' || seriesId === 'P-46') {
    // Mosaic spandrel bands + side piers
    ctx.fillRect(0, 152, 256, 88);
    ctx.fillRect(112, 0, 32, 256);
  } else if (
    seriesId === 'School-I-1158' ||
    seriesId === 'Kindergarten-I-1194' ||
    seriesId === 'Polyclinic-I-1169'
  ) {
    ctx.fillRect(0, 162, 256, 78);
  } else {
    ctx.fillRect(0, 172, 256, 68);
  }

  // Dark inter-panel expansion joints (межпанельные швы с герметиком)
  ctx.strokeStyle = 'rgba(38, 40, 44, 0.55)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 252);
  ctx.beginPath();
  ctx.moveTo(128, 0);
  ctx.lineTo(128, 256);
  ctx.stroke();

  // Subtle ceramic tile grid texture
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1;
  for (let y = 16; y < 256; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  const drawWindow = (wx: number, wy: number, ww: number, wh: number, litSeed: number) => {
    ctx.fillStyle = '#2b3036';
    ctx.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);

    const isNight = timeOfDay === 'night';
    const isSunset = timeOfDay === 'sunset';
    const isLit = (isNight && litSeed > 0.32) || (isSunset && litSeed > 0.62);

    if (isLit) {
      ctx.fillStyle = litSeed > 0.82 ? '#ffd27d' : litSeed > 0.48 ? '#ffba52' : '#9ad1f5';
    } else {
      ctx.fillStyle = isNight ? '#16202b' : '#2c4359';
    }
    ctx.fillRect(wx, wy, ww, wh);

    ctx.strokeStyle = '#e5e4df';
    ctx.lineWidth = 3;
    ctx.strokeRect(wx + 1.5, wy + 1.5, ww - 3, wh - 3);

    const col1 = wx + Math.round(ww * 0.36);
    const col2 = wx + Math.round(ww * 0.68);
    ctx.beginPath();
    ctx.moveTo(col1, wy);
    ctx.lineTo(col1, wy + wh);
    ctx.moveTo(col2, wy);
    ctx.lineTo(col2, wy + wh);
    ctx.moveTo(col2, wy + Math.round(wh * 0.38));
    ctx.lineTo(wx + ww, wy + Math.round(wh * 0.38));
    ctx.stroke();
  };

  if (
    seriesId === 'School-I-1158' ||
    seriesId === 'Polyclinic-I-1169' ||
    seriesId === 'Universam' ||
    seriesId === 'Produkti-Store'
  ) {
    drawWindow(16, 26, 98, 124, 0.75);
    drawWindow(142, 26, 98, 124, 0.45);
  } else {
    drawWindow(24, 36, 80, 102, 0.78);
    drawWindow(152, 36, 80, 102, 0.41);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createConcreteBumpTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 128, 128);

  let s = 1337;
  for (let y = 0; y < 128; y += 2) {
    for (let x = 0; x < 128; x += 2) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const v = 105 + ((s >>> 24) % 46);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  ctx.strokeStyle = '#404040';
  ctx.lineWidth = 3;
  ctx.strokeRect(1, 1, 126, 126);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createBirchBarkTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ece9e2';
  ctx.fillRect(0, 0, 64, 128);

  ctx.fillStyle = '#2d2b28';
  ctx.fillRect(0, 96, 64, 32);

  ctx.fillStyle = '#232220';
  const marks = [
    [8, 12, 22, 4],
    [34, 24, 18, 3],
    [4, 38, 28, 5],
    [28, 52, 24, 4],
    [10, 66, 20, 4],
    [36, 78, 22, 5],
    [6, 88, 30, 5],
  ];
  for (const [mx, my, mw, mh] of marks) {
    ctx.fillRect(mx, my, mw, mh);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function getSeasonPalette(season: SeasonId) {
  switch (season) {
    case 'winter':
      return {
        groundColor: '#dde4ec',
        grassColor: '#cfd8e3',
        asphaltColor: '#3f454d',
        sidewalkColor: '#767e87',
        curbColor: '#b8c0c8',
        poplarColors: ['#6e655f', '#7d746d', '#8c837b'],
        birchColors: ['#7a6e67', '#8f847c', '#b8c2cc'],
        mapleColors: ['#6b5e55', '#82756c', '#9c928b'],
        shrubColors: ['#5b534d', '#6e665f', '#aeb8c2'],
        skyTop: '#8fa5bd',
        fogColor: '#c8d4e0',
      };
    case 'autumn':
      return {
        groundColor: '#5c6144',
        grassColor: '#666b49',
        asphaltColor: '#36393e',
        sidewalkColor: '#6c6f73',
        curbColor: '#b5b2a8',
        poplarColors: ['#c79b3b', '#b87d2e', '#7a8238'],
        birchColors: ['#e0a82e', '#d48824', '#ebbc42'],
        mapleColors: ['#c94a29', '#db6e27', '#e09f2d'],
        shrubColors: ['#6e7838', '#8f5b2d', '#586935'],
        skyTop: '#7a93ad',
        fogColor: '#b8c2cc',
      };
    case 'spring':
      return {
        groundColor: '#527344',
        grassColor: '#5d824d',
        asphaltColor: '#383c42',
        sidewalkColor: '#73777c',
        curbColor: '#c7c5bc',
        poplarColors: ['#5e9447', '#6da653', '#7eb562'],
        birchColors: ['#6eb352', '#82c464', '#5fa145'],
        mapleColors: ['#578f42', '#6ba352', '#7bb360'],
        shrubColors: ['#8c5ca8', '#a16ebf', '#548544'],
        skyTop: '#6ca0dc',
        fogColor: '#bfd4eb',
      };
    case 'summer':
    default:
      return {
        groundColor: '#48663b',
        grassColor: '#527343',
        asphaltColor: '#373a40',
        sidewalkColor: '#707478',
        curbColor: '#c2bfb6',
        poplarColors: ['#3b692f', '#467838', '#315926'],
        birchColors: ['#4d803b', '#5a8f46', '#3f6e30'],
        mapleColors: ['#39632c', '#487539', '#568546'],
        shrubColors: ['#385e2b', '#477038', '#684c7a'],
        skyTop: '#5b92cf',
        fogColor: '#b5cbe3',
      };
  }
}
