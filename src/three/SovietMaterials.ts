import * as THREE from 'three';
import { BuildingSeriesId, FacadeFinishVariant, SeasonId, TimeOfDayId } from '../generator/types';
import { BUILDING_SERIES_CATALOG } from '../generator/presets';

export interface PanelFacadeTextures {
  albedoTex: THREE.CanvasTexture;
  emissiveTex: THREE.CanvasTexture | null;
}

// 4x4 Bayer matrix for authentic 16-bit pixel-art dithering
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}

function shiftHexColor(hex: string, delta: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + delta, g + delta, b + delta);
}

/**
 * Draws a 16-bit pixel-art dithered & tiled concrete panel cell (64x64 logical pixels per panel bay)
 */
export function createPanelFacadeTextures(
  seriesId: BuildingSeriesId,
  facadeVariant: FacadeFinishVariant | undefined,
  timeOfDay: TimeOfDayId,
  maxAnisotropy: number,
  buildingSeedHash = 1980
): PanelFacadeTextures {
  const spec = BUILDING_SERIES_CATALOG[seriesId];
  const primaryColor = facadeVariant?.primaryColor ?? spec.facadePrimaryColor;
  const secondaryColor = facadeVariant?.secondaryColor ?? spec.facadeSecondaryColor;
  const accentColor = facadeVariant?.accentColor ?? spec.accentColor;

  // 16-bit pixel art resolution: 128x128 logical pixels (2x2 structural bays of 64x64 px each)
  // Rendered with NearestFilter so every pixel-art tile, mortar joint, sill, and window mullion is crisp
  const W = 128;
  const H = 128;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const isNight = timeOfDay === 'night';
  const isSunset = timeOfDay === 'sunset';
  const hasEmissive = isNight || isSunset;

  let emCanvas: HTMLCanvasElement | null = null;
  let emCtx: CanvasRenderingContext2D | null = null;
  if (hasEmissive) {
    emCanvas = document.createElement('canvas');
    emCanvas.width = W;
    emCanvas.height = H;
    emCtx = emCanvas.getContext('2d')!;
    emCtx.imageSmoothingEnabled = false;
    emCtx.fillStyle = '#000000';
    emCtx.fillRect(0, 0, W, H);
  }

  let rng = (buildingSeedHash * 1664525 + 1013904223) >>> 0;
  const nextRand = () => {
    rng = (rng * 1664525 + 1013904223) >>> 0;
    return (rng >>> 8) / 16777216;
  };

  const primaryLight = shiftHexColor(primaryColor, 14);
  const primaryDark = shiftHexColor(primaryColor, -18);
  const secondaryLight = shiftHexColor(secondaryColor, 16);
  const secondaryDark = shiftHexColor(secondaryColor, -22);

  // Helper to paint 16-bit dithered ceramic tile ("кабанчик" or glass mosaic) region
  const fillPixelTileRect = (
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    baseHex: string,
    altHex: string,
    darkHex: string,
    mode: 'kabanchik' | 'mosaic' | 'concrete'
  ) => {
    for (let py = ry; py < ry + rh; py++) {
      for (let px = rx; px < rx + rw; px++) {
        const bayer = BAYER_4X4[py & 3][px & 3];
        if (mode === 'kabanchik') {
          // Brick-bond glazed ceramic tile pattern (4x2 px per tile group)
          const row = py >> 1;
          const offset = (row & 1) * 2;
          const isMortar = (py & 1) === 0 || ((px + offset) & 3) === 0;
          if (isMortar) {
            ctx.fillStyle = bayer > 7 ? altHex : baseHex;
          } else {
            ctx.fillStyle = bayer > 12 ? darkHex : baseHex;
          }
        } else if (mode === 'mosaic') {
          // 2x2 pixel glass mosaic ("стекломозаика") with sparkle dither
          const checker = (px + py) & 1;
          ctx.fillStyle = checker === 0 ? baseHex : bayer > 9 ? altHex : darkHex;
        } else {
          // Weathered precast concrete aggregate dither
          ctx.fillStyle = bayer > 11 ? darkHex : bayer < 3 ? altHex : baseHex;
        }
        ctx.fillRect(px, py, 1, 1);
      }
    }
  };

  // Draw 2x2 structural bays (each bay is 64x64 pixels)
  for (let cellY = 0; cellY < 2; cellY++) {
    for (let cellX = 0; cellX < 2; cellX++) {
      const ox = cellX * 64;
      const oy = cellY * 64;

      // 1. Base panel surface in 16-bit dithered concrete/tile
      fillPixelTileRect(
        ox,
        oy,
        64,
        64,
        primaryColor,
        primaryLight,
        primaryDark,
        seriesId === '1-515-9M' || seriesId === 'II-49' || seriesId === 'TP-Substation'
          ? 'concrete'
          : 'kabanchik'
      );

      // 2. Authentic series-specific colored tile bands, spandrels, and piers
      if (seriesId === 'P-44' || seriesId === 'OMR-Chertanovo') {
        // P-44 & Chertanovo: Colored glazed tile apron below windows + vertical side piers
        fillPixelTileRect(
          ox + 2,
          oy + 38,
          60,
          24,
          secondaryColor,
          secondaryLight,
          secondaryDark,
          'kabanchik'
        );
        fillPixelTileRect(
          ox + 1,
          oy + 1,
          7,
          62,
          secondaryColor,
          secondaryLight,
          secondaryDark,
          'kabanchik'
        );
        fillPixelTileRect(
          ox + 56,
          oy + 1,
          7,
          62,
          secondaryColor,
          secondaryLight,
          secondaryDark,
          'kabanchik'
        );
      } else if (seriesId === 'KOPE') {
        // KOPE: Contrast dark terracotta/brown vertical relief bands & spandrels
        fillPixelTileRect(
          ox + 3,
          oy + 1,
          15,
          62,
          secondaryColor,
          secondaryLight,
          secondaryDark,
          'kabanchik'
        );
        fillPixelTileRect(
          ox + 46,
          oy + 1,
          15,
          62,
          secondaryColor,
          secondaryLight,
          secondaryDark,
          'kabanchik'
        );
        fillPixelTileRect(
          ox + 18,
          oy + 42,
          28,
          18,
          accentColor,
          shiftHexColor(accentColor, 15),
          shiftHexColor(accentColor, -20),
          'kabanchik'
        );
      } else if (seriesId === '1605-AM' || seriesId === 'P-46') {
        // 1605-AM & P-46: Iconic checkerboard glass mosaic spandrels + central pier
        fillPixelTileRect(
          ox + 2,
          oy + 39,
          60,
          23,
          secondaryColor,
          secondaryLight,
          secondaryDark,
          'mosaic'
        );
        fillPixelTileRect(
          ox + 28,
          oy + 2,
          8,
          60,
          secondaryColor,
          secondaryLight,
          secondaryDark,
          'mosaic'
        );
      } else if (seriesId === 'P-3' || seriesId === 'II-68') {
        // P-3 & II-68: Molded relief frame around each panel module
        fillPixelTileRect(
          ox + 2,
          oy + 40,
          60,
          21,
          secondaryColor,
          secondaryLight,
          secondaryDark,
          'kabanchik'
        );
        // Vertical shadow ribs on spandrel
        for (let rx = ox + 6; rx < ox + 58; rx += 4) {
          ctx.fillStyle = secondaryDark;
          ctx.fillRect(rx, oy + 42, 1, 17);
          ctx.fillStyle = primaryLight;
          ctx.fillRect(rx + 1, oy + 42, 1, 17);
        }
      } else if (seriesId === '1-515-9M' || seriesId === 'II-49') {
        // Classic 9-story Brezhnevka: weathered spandrel band + rainwater streaks under sills
        fillPixelTileRect(
          ox + 2,
          oy + 41,
          60,
          21,
          secondaryColor,
          secondaryLight,
          secondaryDark,
          'concrete'
        );
      } else if (
        seriesId === 'School-I-1158' ||
        seriesId === 'Kindergarten-I-1194' ||
        seriesId === 'Polyclinic-I-1169'
      ) {
        // Social infrastructure: wide horizontal spandrel frieze + vertical pilasters
        fillPixelTileRect(
          ox + 1,
          oy + 42,
          62,
          20,
          secondaryColor,
          secondaryLight,
          secondaryDark,
          'kabanchik'
        );
        ctx.fillStyle = accentColor;
        ctx.fillRect(ox + 1, oy + 41, 62, 2);
      } else if (seriesId === 'Universam' || seriesId === 'Produkti-Store') {
        // Soviet trade pavilion: ribbed aluminum/mosaic frieze at top + dark terrazzo plinth
        fillPixelTileRect(
          ox + 1,
          oy + 2,
          62,
          12,
          secondaryColor,
          secondaryLight,
          secondaryDark,
          'mosaic'
        );
        for (let rx = ox + 3; rx < ox + 61; rx += 2) {
          ctx.fillStyle = accentColor;
          ctx.fillRect(rx, oy + 4, 1, 8);
        }
        fillPixelTileRect(ox + 1, oy + 52, 62, 11, '#3b4046', '#4a5058', '#262a2e', 'concrete');
      } else if (seriesId === 'TP-Substation') {
        // Transformer substation: whitewashed concrete + steel louvered doors + warning sign
        fillPixelTileRect(ox + 10, oy + 14, 18, 44, '#474e54', '#5c646c', '#2d3236', 'concrete');
        fillPixelTileRect(ox + 36, oy + 14, 18, 44, '#474e54', '#5c646c', '#2d3236', 'concrete');
        // Louver vents
        ctx.fillStyle = '#222629';
        for (let ly = oy + 18; ly < oy + 34; ly += 2) {
          ctx.fillRect(ox + 12, ly, 14, 1);
          ctx.fillRect(ox + 38, ly, 14, 1);
        }
        // Yellow warning triangle stencil ("Осторожно! Высокое напряжение")
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(ox + 17, oy + 38, 4, 4);
        ctx.fillRect(ox + 43, oy + 38, 4, 4);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(ox + 18, oy + 39, 2, 2);
        ctx.fillRect(ox + 44, oy + 39, 2, 2);
      }

      // 3. Pixel-Art Inter-Panel Expansion Joints (Межпанельные швы с мастикой и фаской)
      // Top & left highlight bevel
      ctx.fillStyle = primaryLight;
      ctx.fillRect(ox + 1, oy + 1, 62, 1);
      ctx.fillRect(ox + 1, oy + 1, 1, 62);
      // Outer dark rubber-mastic seam
      ctx.fillStyle = '#25282c';
      ctx.fillRect(ox, oy, 64, 1);
      ctx.fillRect(ox, oy + 63, 64, 1);
      ctx.fillRect(ox, oy, 1, 64);
      ctx.fillRect(ox + 63, oy, 1, 64);
      // Central vertical panel seam
      ctx.fillStyle = '#2c3035';
      ctx.fillRect(ox + 31, oy, 1, 64);
      ctx.fillStyle = primaryLight;
      ctx.fillRect(ox + 32, oy + 1, 1, 62);

      // 4. Pixel-Art Soviet Windows (with recessed jambs, galvanized steel sills, curtains, plants & 16-bit interior glow)
      const drawPixelWindow = (wx: number, wy: number, ww: number, wh: number, style: 'apt-3' | 'apt-2' | 'classroom' | 'vitrine') => {
        const rx = ox + wx;
        const ry = oy + wy;
        const rSeed = nextRand();
        const toneSeed = nextRand();
        const detailSeed = nextRand();

        // Deep 16-bit pixel bevel around window opening
        ctx.fillStyle = '#1b1f24'; // Top/left deep recess shadow
        ctx.fillRect(rx - 1, ry - 1, ww + 2, 1);
        ctx.fillRect(rx - 1, ry - 1, 1, wh + 2);
        ctx.fillStyle = primaryLight; // Right/bottom concrete reveal catchlight
        ctx.fillRect(rx + ww, ry, 1, wh + 1);

        // Galvanized steel windowsill ("оцинкованный отлив") + rainwater weathering below sill
        ctx.fillStyle = '#9aa3ad';
        ctx.fillRect(rx - 1, ry + wh, ww + 2, 1);
        ctx.fillStyle = '#3b4047';
        ctx.fillRect(rx - 1, ry + wh + 1, ww + 2, 1);
        // Subtle pixel weathering stain under sill corners
        ctx.fillStyle = secondaryDark;
        ctx.fillRect(rx, ry + wh + 2, 2, 2);
        ctx.fillRect(rx + ww - 2, ry + wh + 2, 2, 2);

        const isSocialEvening =
          seriesId === 'School-I-1158' || seriesId === 'Kindergarten-I-1194';
        const nightThreshold = style === 'vitrine' ? 0.15 : isSocialEvening ? 0.62 : 0.33;
        const sunsetThreshold = style === 'vitrine' ? 0.25 : isSocialEvening ? 0.55 : 0.50;

        const isLit =
          (isNight && rSeed > nightThreshold) || (isSunset && rSeed > sunsetThreshold);

        // Choose 16-bit pixel palette for window interior
        let topGlass = '#182432';
        let midGlass = '#24374a';
        let botGlass = '#15202b';
        let emTop = '#000000';
        let emBot = '#000000';

        if (isLit) {
          if (style === 'vitrine') {
            // Bright Soviet fluorescent store vitrine (daylight tubes 4000K + warm display counters)
            topGlass = '#e0f7fa';
            midGlass = '#fff3c4';
            botGlass = '#f5b041';
            emTop = '#c8f4f9';
            emBot = '#ffbe55';
          } else if (toneSeed > 0.72) {
            // Cozy Soviet orange kitchen pendant lampshade ("абажур")
            topGlass = '#ffe8a3';
            midGlass = '#ffb347';
            botGlass = '#d96b27';
            emTop = '#ffe49e';
            emBot = '#ff8c2b';
          } else if (toneSeed > 0.26) {
            // Classic warm 2700K incandescent bulb + lace тюль curtain
            topGlass = '#fff3c4';
            midGlass = '#ffd573';
            botGlass = '#c98a32';
            emTop = '#fff0b8';
            emBot = '#ffbe52';
          } else if (toneSeed > 0.10) {
            // Blue-cyan glow of a Soviet CRT TV ("Рубин-714") in a darkened living room
            topGlass = '#6497bf';
            midGlass = '#8ad4ff';
            botGlass = '#395d7d';
            emTop = '#6bb8f0';
            emBot = '#a3e0ff';
          } else {
            // Warm ruby-amber table lamp / phytolamp
            topGlass = '#ffc299';
            midGlass = '#ff8c66';
            botGlass = '#9e3d2b';
            emTop = '#ffa882';
            emBot = '#ff6f47';
          }
        } else if (!isNight) {
          // Daytime sky reflection with 16-bit diagonal sheen
          topGlass = '#3f5d7a';
          midGlass = '#2c445c';
          botGlass = '#1e3042';
        }

        // Paint pixel-by-pixel dithered window glass + lace curtains ("тюль")
        for (let py = 0; py < wh; py++) {
          const vRatio = py / Math.max(1, wh - 1);
          for (let px = 0; px < ww; px++) {
            const bayer = BAYER_4X4[py & 3][px & 3];
            let pixHex = vRatio < 0.35 ? topGlass : vRatio < 0.75 ? midGlass : botGlass;

            // Daytime diagonal sky reflection glint
            if (!isLit && !isNight && ((px + py) === 5 || (px + py) === 6 || (px + py) === 14)) {
              pixHex = '#6286a8';
            }

            // Lace curtain ("тюль") pixel pattern on left/right edges of apartment windows
            if (style !== 'vitrine' && (px <= 2 || px >= ww - 3) && py < wh - 2) {
              if (((px + py) & 1) === 0) {
                pixHex = isLit ? '#fff9e6' : isNight ? '#283646' : '#57738f';
              }
            }

            ctx.fillStyle = pixHex;
            ctx.fillRect(rx + px, ry + py, 1, 1);

            if (isLit && emCtx) {
              emCtx.fillStyle = vRatio < 0.5 && bayer > 4 ? emTop : emBot;
              emCtx.fillRect(rx + px, ry + py, 1, 1);
            }
          }
        }

        // Pixel-art interior details: hanging kitchen lamp or windowsill flowerpot
        if (style !== 'vitrine') {
          if (isLit && detailSeed > 0.45) {
            // Hanging orange/amber lampshade pixel sprite at top center
            const lx = rx + Math.floor(ww * 0.5) - 1;
            ctx.fillStyle = '#ff5722';
            ctx.fillRect(lx, ry + 2, 3, 2);
            ctx.fillStyle = '#fff9c4';
            ctx.fillRect(lx + 1, ry + 4, 1, 1);
          }
          if (detailSeed < 0.55) {
            // Terracotta flowerpot with green geranium on the windowsill
            const potX = rx + 3;
            ctx.fillStyle = '#a8432b';
            ctx.fillRect(potX, ry + wh - 3, 2, 2);
            ctx.fillStyle = '#2e6b34';
            ctx.fillRect(potX, ry + wh - 5, 3, 2);
          }
        }

        // Crisp 1-pixel wooden/white-painted Soviet window frames & transoms (переплёты с форточкой)
        const frameHex = isLit && isNight ? '#2a2118' : '#e6e4dc';
        ctx.fillStyle = frameHex;
        // Outer casement border
        ctx.fillRect(rx, ry, ww, 1);
        ctx.fillRect(rx, ry + wh - 1, ww, 1);
        ctx.fillRect(rx, ry, 1, wh);
        ctx.fillRect(rx + ww - 1, ry, 1, wh);

        const drawFrameMullions = (targetCtx: CanvasRenderingContext2D, color: string) => {
          targetCtx.fillStyle = color;
          if (style === 'apt-3' || style === 'classroom') {
            // 3-section Soviet window with top-right ventilation transom (форточка)
            const c1 = rx + Math.floor(ww * 0.35);
            const c2 = rx + Math.floor(ww * 0.68);
            const fy = ry + Math.floor(wh * 0.36);
            targetCtx.fillRect(c1, ry, 1, wh);
            targetCtx.fillRect(c2, ry, 1, wh);
            targetCtx.fillRect(c2, fy, ww - (c2 - rx), 1);
          } else if (style === 'apt-2') {
            // 2-section window with fortocka
            const c1 = rx + Math.floor(ww * 0.55);
            const fy = ry + Math.floor(wh * 0.36);
            targetCtx.fillRect(c1, ry, 1, wh);
            targetCtx.fillRect(c1, fy, ww - (c1 - rx), 1);
          } else if (style === 'vitrine') {
            // Storefront vertical aluminum mullions + horizontal transom
            for (let vx = rx + 6; vx < rx + ww - 3; vx += 6) {
              targetCtx.fillRect(vx, ry, 1, wh);
            }
            targetCtx.fillRect(rx, ry + 6, ww, 1);
          }
        };

        drawFrameMullions(ctx, frameHex);
        if (isLit && emCtx) {
          // Dark silhouette mullions on the emissive map so window frames stay super crisp at night
          emCtx.fillStyle = '#120d08';
          emCtx.fillRect(rx, ry, ww, 1);
          emCtx.fillRect(rx, ry + wh - 1, ww, 1);
          emCtx.fillRect(rx, ry, 1, wh);
          emCtx.fillRect(rx + ww - 1, ry, 1, wh);
          drawFrameMullions(emCtx, '#120d08');
        }
      };

      // Place windows according to building series
      if (seriesId === 'Universam' || seriesId === 'Produkti-Store') {
        drawPixelWindow(4, 16, 25, 34, 'vitrine');
        drawPixelWindow(35, 16, 25, 34, 'vitrine');
      } else if (
        seriesId === 'School-I-1158' ||
        seriesId === 'Polyclinic-I-1169' ||
        seriesId === 'Kindergarten-I-1194'
      ) {
        drawPixelWindow(4, 7, 24, 31, 'classroom');
        drawPixelWindow(36, 7, 24, 31, 'classroom');
      } else if (seriesId === 'ATS-Post-Office') {
        drawPixelWindow(5, 8, 22, 28, 'apt-2');
        drawPixelWindow(37, 8, 22, 28, 'apt-2');
      } else if (seriesId !== 'TP-Substation') {
        // Residential panel bay: left wide 3-leaf living room window + right 2-leaf kitchen/bedroom window
        drawPixelWindow(5, 9, 21, 26, 'apt-3');
        drawPixelWindow(38, 9, 19, 26, 'apt-2');
      }
    }
  }

  const albedoTex = new THREE.CanvasTexture(canvas);
  albedoTex.colorSpace = THREE.SRGBColorSpace;
  albedoTex.wrapS = THREE.RepeatWrapping;
  albedoTex.wrapT = THREE.RepeatWrapping;
  // NearestFilter magnification preserves the crisp 16-bit pixel-art aesthetic up close!
  albedoTex.magFilter = THREE.NearestFilter;
  albedoTex.minFilter = THREE.LinearMipmapLinearFilter;
  albedoTex.anisotropy = maxAnisotropy;

  let emissiveTex: THREE.CanvasTexture | null = null;
  if (emCanvas) {
    emissiveTex = new THREE.CanvasTexture(emCanvas);
    emissiveTex.colorSpace = THREE.SRGBColorSpace;
    emissiveTex.wrapS = THREE.RepeatWrapping;
    emissiveTex.wrapT = THREE.RepeatWrapping;
    emissiveTex.magFilter = THREE.NearestFilter;
    emissiveTex.minFilter = THREE.LinearMipmapLinearFilter;
    emissiveTex.anisotropy = maxAnisotropy;
  }

  return { albedoTex, emissiveTex };
}

/**
 * Creates a 16-bit pixel-art texture for blind end-walls (торцевые панели со швами и чердачными продухами)
 */
export function createEndWallPixelTexture(
  primaryColor: string,
  secondaryColor: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const W = 64;
  const H = 64;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const pLight = shiftHexColor(primaryColor, 12);
  const pDark = shiftHexColor(primaryColor, -16);
  const sDark = shiftHexColor(secondaryColor, -18);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const bayer = BAYER_4X4[y & 3][x & 3];
      // Vertical decorative side stripe on end walls
      const isBand = x < 8 || x >= 56;
      if (isBand) {
        ctx.fillStyle = bayer > 9 ? sDark : secondaryColor;
      } else {
        // Brick-bond kabanchik tile dither
        const isJoint = (y & 1) === 0 || ((x + ((y >> 1) & 1) * 2) & 3) === 0;
        ctx.fillStyle = isJoint ? (bayer > 8 ? pLight : primaryColor) : bayer > 11 ? pDark : primaryColor;
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Inter-panel expansion joints (2x2 end-wall panels per 64x64 tile)
  ctx.fillStyle = '#25282c';
  ctx.fillRect(0, 0, W, 1);
  ctx.fillRect(0, 31, W, 1);
  ctx.fillRect(0, 63, W, 1);
  ctx.fillRect(0, 0, 1, H);
  ctx.fillRect(31, 0, 1, H);
  ctx.fillRect(63, 0, 1, H);

  ctx.fillStyle = pLight;
  ctx.fillRect(1, 1, 62, 1);
  ctx.fillRect(1, 32, 62, 1);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Creates a 16-bit pixel-art texture for residential balcony / loggia stacks (остекление лоджий и экраны)
 */
export function createLoggiaStackPixelTexture(
  parapetColor: string,
  timeOfDay: TimeOfDayId,
  maxAnisotropy: number,
  seedHash = 1980
): PanelFacadeTextures {
  const W = 64;
  const H = 64;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const isNight = timeOfDay === 'night';
  const isSunset = timeOfDay === 'sunset';
  const hasEmissive = isNight || isSunset;

  let emCanvas: HTMLCanvasElement | null = null;
  let emCtx: CanvasRenderingContext2D | null = null;
  if (hasEmissive) {
    emCanvas = document.createElement('canvas');
    emCanvas.width = W;
    emCanvas.height = H;
    emCtx = emCanvas.getContext('2d')!;
    emCtx.imageSmoothingEnabled = false;
    emCtx.fillStyle = '#000000';
    emCtx.fillRect(0, 0, W, H);
  }

  const pLight = shiftHexColor(parapetColor, 16);
  const pDark = shiftHexColor(parapetColor, -22);
  let rng = (seedHash * 747796405 + 2891336453) >>> 0;
  const nextRand = () => {
    rng = (rng * 1664525 + 1013904223) >>> 0;
    return (rng >>> 8) / 16777216;
  };

  // 2 floors per 64px vertical tile (each floor = 32px)
  for (let fl = 0; fl < 2; fl++) {
    const oy = fl * 32;
    const isLit = (isNight && nextRand() > 0.42) || (isSunset && nextRand() > 0.58);

    // Upper glazed loggia zone (y: oy+2 .. oy+18)
    for (let y = oy + 1; y < oy + 19; y++) {
      for (let x = 2; x < 62; x++) {
        const bayer = BAYER_4X4[y & 3][x & 3];
        if (isLit) {
          ctx.fillStyle = bayer > 7 ? '#ffd478' : '#e09f45';
          if (emCtx) {
            emCtx.fillStyle = bayer > 6 ? '#ffc966' : '#c97d28';
            emCtx.fillRect(x, y, 1, 1);
          }
        } else {
          ctx.fillStyle = isNight ? '#131d29' : (x + y) % 9 === 0 ? '#5c7e9e' : '#25394d';
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // Wooden/aluminum loggia glazing frames
    ctx.fillStyle = isLit && isNight ? '#261e16' : '#dcdad2';
    ctx.fillRect(2, oy + 1, 60, 1);
    ctx.fillRect(2, oy + 18, 60, 1);
    for (let fx = 2; fx <= 62; fx += 12) {
      ctx.fillRect(fx, oy + 1, 1, 18);
      if (isLit && emCtx) {
        emCtx.fillStyle = '#120d08';
        emCtx.fillRect(fx, oy + 1, 1, 18);
      }
    }

    // Lower solid balcony parapet screen (y: oy+19 .. oy+31) with corrugated ribs
    for (let y = oy + 19; y < oy + 31; y++) {
      for (let x = 1; x < 63; x++) {
        const rib = x & 3;
        ctx.fillStyle = rib === 0 ? pDark : rib === 1 ? pLight : parapetColor;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // Concrete floor slab divider
    ctx.fillStyle = '#25282c';
    ctx.fillRect(0, oy, 64, 1);
    ctx.fillRect(0, oy + 31, 64, 1);
    ctx.fillStyle = '#9aa0a6';
    ctx.fillRect(1, oy + 19, 62, 1);
  }

  const albedoTex = new THREE.CanvasTexture(canvas);
  albedoTex.colorSpace = THREE.SRGBColorSpace;
  albedoTex.wrapS = THREE.RepeatWrapping;
  albedoTex.wrapT = THREE.RepeatWrapping;
  albedoTex.magFilter = THREE.NearestFilter;
  albedoTex.minFilter = THREE.LinearMipmapLinearFilter;
  albedoTex.anisotropy = maxAnisotropy;

  let emissiveTex: THREE.CanvasTexture | null = null;
  if (emCanvas) {
    emissiveTex = new THREE.CanvasTexture(emCanvas);
    emissiveTex.colorSpace = THREE.SRGBColorSpace;
    emissiveTex.wrapS = THREE.RepeatWrapping;
    emissiveTex.wrapT = THREE.RepeatWrapping;
    emissiveTex.magFilter = THREE.NearestFilter;
    emissiveTex.minFilter = THREE.LinearMipmapLinearFilter;
    emissiveTex.anisotropy = maxAnisotropy;
  }

  return { albedoTex, emissiveTex };
}

export function createPanelFacadeTexture(
  seriesId: BuildingSeriesId,
  facadeVariant: FacadeFinishVariant | undefined,
  timeOfDay: TimeOfDayId,
  maxAnisotropy: number
): THREE.CanvasTexture {
  return createPanelFacadeTextures(seriesId, facadeVariant, timeOfDay, maxAnisotropy).albedoTex;
}

export function createConcreteBumpTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  let s = 1337;
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const v = 105 + ((s >>> 24) % 48);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.strokeStyle = '#383838';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 62, 62);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createBirchBarkTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#ece9e2';
  ctx.fillRect(0, 0, 32, 64);

  ctx.fillStyle = '#2d2b28';
  ctx.fillRect(0, 48, 32, 16);

  ctx.fillStyle = '#232220';
  const marks = [
    [4, 6, 11, 2],
    [17, 12, 9, 2],
    [2, 19, 14, 2],
    [14, 26, 12, 2],
    [5, 33, 10, 2],
    [18, 39, 11, 2],
    [3, 44, 15, 2],
  ];
  for (const [mx, my, mw, mh] of marks) {
    ctx.fillRect(mx, my, mw, mh);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.NearestFilter;
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
