import * as THREE from 'three';
import {
  createRukmini,
  CharacterGLBManager,
  HumanoidCharacter,
} from './characters';
import { buildRoyalPalaceDecorations } from './royalPalaceDecor';
import { buildExpandedRoomsProps } from './expandedRoomsProps';
import { buildBasementLabyrinthProps } from './basementLabyrinthProps';
import {
  buildRoyalHorrorRoomProps,
  decorateExistingFourPosterBed,
} from './royalHorrorRoomProps';
import {
  attachProximityGlow,
  type ProximityGlowHandle,
} from './itemProximityGlow';
import {
  buildIndoor1992HorrorDetails,
  createFlashlightReactiveDustMotes,
} from './indoorHorrorAtmosphere';
import {
  buildCorridorAndBareRoomHorrorProps,
  createAntiqueIndianBed,
} from './antiqueBedsAndCorridorProps';
import {
  StormWeatherSystem,
  type StormRainAcousticSample,
  type WeatherGraphicsQuality,
} from './stormWeather';

export type FloorSurfaceType = 'mud' | 'stone' | 'tiles' | 'wood' | 'red_oxide';

export interface HaveliRoomZone {
  id: string;
  nameHi: string;
  nameEn: string;
  floorLevel: -1 | 0 | 1 | 2; // -1 = Basement (-4.0m), 0 = Ground (0m), 1 = Second Floor (+4.5m), 2 = Third Floor (+9.0m)
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
  surface: FloorSurfaceType;
  ambientFreq: number;
}

export interface HaveliDoor {
  id: string;
  nameHi: string;
  pivot: THREE.Group;
  leafCenterNode?: THREE.Object3D;
  leafTipNode?: THREE.Object3D;
  position: THREE.Vector3; // World/Haveli-local doorway center position
  floorY: number;
  axis: 'x' | 'z'; // Wall orientation
  doorWidth: number;
  initialOpen: boolean;
  isRoomDoor: boolean;
  isOpen: boolean;
  targetAngle: number;
  currentAngle: number;
  closedAngle: number;
  openAngle: number;
  animFromAngle: number;
  animToAngle: number;
  animElapsed: number;
  animDuration: number;
  isAnimating: boolean;
  openProgress: number; // 0 = closed, 1 = fully open
  rattleOffset: number;
  lockedUntilRelics: number; // 0 = unlocked, >0 = requires N relics found/collected
  autoCreak: boolean;
  nextAutoCreakTime: number;
  archwayOnly?: boolean;
  colliderBox: { minX: number; maxX: number; minZ: number; maxZ: number; floorLevel: number };
}

export interface WallAABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}

export interface FlickeringLightEntry {
  light?: THREE.PointLight;
  flameMesh?: THREE.Mesh;
  lanternGroup?: THREE.Object3D;
  baseIntensity: number;
  baseColor: number;
  phase: number;
}

export interface HaveliNavNode {
  id: string;
  x: number;
  y: number;
  z: number;
}

export interface HaveliHidingSpot {
  id: string;
  nameHi: string;
  nameEn: string;
  roomNameHi: string;
  group: THREE.Group;
  doorPivot: THREE.Object3D;
  animType: 'lid_x' | 'door_y' | 'curtain_scale' | 'panel_rotate';
  position: THREE.Vector3;
  hideViewPos: THREE.Vector3;
  exitPos: THREE.Vector3;
  floorY: number;
  lookYaw: number;
  isOccupied: boolean;
  openPulse: number;
  pendulumMesh?: THREE.Object3D;
  hideEyeOffsetY?: number;
}

export interface HauntedMirrorInstance {
  id: string;
  locationHi: string;
  locationEn: string;
  group: THREE.Group;
  reflectionGroup: THREE.Group;
  reflectionOverlayMat: THREE.MeshBasicMaterial;
  scareLight: THREE.PointLight | null;
  position: THREE.Vector3;
  normal: THREE.Vector3;
  floorY: number;
  flashTimer: number;
  cooldownTimer: number;
}

export interface GlassBanglePatchInstance {
  id: string;
  locationHi: string;
  locationEn: string;
  group: THREE.Group;
  position: THREE.Vector3;
  floorY: number;
  radius: number;
  cooldownTimer: number;
}

export interface MansionBuildResult {
  root: THREE.Group;
  wellGroup: THREE.Group;
  centralCourtyardWell: THREE.Group;
  wellFireLight: THREE.PointLight | null;
  wellInnerFlames: THREE.Mesh[];
  wellSmokeParticles: THREE.Mesh[];
  lanterns: THREE.Group[];
  flickeringLights: FlickeringLightEntry[];
  doors: HaveliDoor[];
  hidingSpots: HaveliHidingSpot[];
  hauntedMirrors: HauntedMirrorInstance[];
  banglePatches: GlassBanglePatchInstance[];
  roomZones: HaveliRoomZone[];
  wallColliders: WallAABB[];
  navigationNodes: HaveliNavNode[];
  swayingCurtains: THREE.Mesh[];
  watchingEyes: THREE.Mesh[];
  nurseryCradle: THREE.Group | null;
  dustPoints: THREE.Points;
  dripParticles: THREE.Mesh[];
  lightningLight: THREE.DirectionalLight | null;
  guardhouseGroup: THREE.Group;
  mansionKeyGroup: THREE.Group;
  wellCourtyardKeyGroup: THREE.Group;
  setBlackoutMode: (active: boolean) => void;
  setLightLevelMultiplier: (multiplier: number) => void;
  triggerRedLightningFlash: (duration?: number) => void;
  setBloodHandprintsVisible: (visible: boolean) => void;
  setSunriseProgress: (progress: number) => void;
  setWeatherQuality: (quality: WeatherGraphicsQuality) => void;
  setLightBudgetMode: (minimal: boolean) => void;
  isPlayerOutdoors: (playerLocalPos: THREE.Vector3) => boolean;
  sampleRainAcoustics: (
    playerLocalPos: THREE.Vector3,
    camForward: THREE.Vector3,
    camRight: THREE.Vector3,
  ) => StormRainAcousticSample;
  stormWeather: StormWeatherSystem;
  getElevationAt: (x: number, z: number, currentY: number) => number;
  getRoomAt: (x: number, y: number, z: number) => HaveliRoomZone;
  resolveCollision: (
    prevX: number,
    prevZ: number,
    nextX: number,
    nextZ: number,
    playerY: number,
    radius?: number,
  ) => { x: number; z: number };
  isLineOfSightClear: (
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    y: number,
    radius?: number,
  ) => boolean;
  setDoorOpen: (door: HaveliDoor, open: boolean, duration?: number) => void;
  findNavigationPath: (
    start: THREE.Vector3,
    target: THREE.Vector3,
    allowClosedRoomDoors?: boolean,
  ) => THREE.Vector3[];
  updateAtmosphere: (
    elapsed: number,
    dt: number,
    witchProximity: number,
    playerLocalPos: THREE.Vector3,
    onCreakSound?: () => void,
    onThunderSound?: (outdoorFactor?: number) => void,
    rageStage?: number,
    witchDistToPlayer?: number,
    flashlightState?: {
      origin: THREE.Vector3;
      dir: THREE.Vector3;
      intensity: number;
    },
  ) => number; // returns current lightning flash intensity (0..1)
}

export type RelicState = 'hidden' | 'carried' | 'burned';

export interface RelicRoomRespawnSpot {
  roomId: string;
  roomNameHi: string;
  x: number;
  y: number;
  z: number;
}

export interface RelicInstance {
  index: number;
  name: string;
  hindiName: string;
  roomNameHi: string;
  state: RelicState;
  lastRoomId: string;
  group: THREE.Group;
  collected: boolean;
  burned: boolean;
  basePos: THREE.Vector3;
  proximityGlow?: ProximityGlowHandle;
}

export interface ThrowablePickupInstance {
  index: number;
  kind: 'kulhad' | 'stone';
  hindiName: string;
  englishName: string;
  roomNameHi: string;
  group: THREE.Group;
  collected: boolean;
  basePos: THREE.Vector3;
  respawnTimer: number;
}

// ============================================================================
// PROCEDURAL CANVAS TEXTURES + NOISE + BUMP MAPS (ZERO EXTERNAL ASSETS)
// ============================================================================

function createMidnightStormSkyTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // 1. Deep stormy midnight gradient from zenith (#02040a) to misty horizon (#070c18)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0.0, '#020409');
  skyGrad.addColorStop(0.35, '#050a16');
  skyGrad.addColorStop(0.7, '#091224');
  skyGrad.addColorStop(1.0, '#050811');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Subtle distant stars in upper midnight vault
  for (let i = 0; i < 220; i++) {
    const sx = (i * 173 + 29) % w;
    const sy = (i * 97 + 13) % Math.floor(h * 0.58);
    const alpha = 0.25 + ((i * 37) % 55) / 100;
    ctx.fillStyle = `rgba(210, 228, 255, ${alpha})`;
    const r = i % 7 === 0 ? 1.8 : 1.1;
    ctx.fillRect(sx, sy, r, r);
  }

  // 3. Pale Full Moon with eerie silver-blue misty corona
  const moonX = w * 0.28;
  const moonY = h * 0.22;
  const corona = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 135);
  corona.addColorStop(0.0, 'rgba(235, 245, 255, 0.95)');
  corona.addColorStop(0.14, 'rgba(185, 215, 250, 0.55)');
  corona.addColorStop(0.42, 'rgba(72, 105, 158, 0.22)');
  corona.addColorStop(1.0, 'rgba(10, 18, 36, 0.0)');
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 135, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#dceaff';
  ctx.beginPath();
  ctx.arc(moonX, moonY, 18, 0, Math.PI * 2);
  ctx.fill();

  // 4. Layered dark stormy midnight clouds with silver-lit edges
  for (let c = 0; c < 65; c++) {
    const cx = (c * 149) % w;
    const cy = h * 0.14 + ((c * 67) % Math.floor(h * 0.52));
    const rx = 65 + (c % 5) * 28;
    const ry = 18 + (c % 4) * 10;

    // Silver-blue moonlit cloud rim near the moon
    const distToMoon = Math.hypot(cx - moonX, cy - moonY);
    const rimAlpha = distToMoon < 260 ? 0.22 : 0.08;
    const cloudGrad = ctx.createRadialGradient(cx, cy - ry * 0.3, 4, cx, cy, rx);
    cloudGrad.addColorStop(0, `rgba(46, 66, 98, ${rimAlpha})`);
    cloudGrad.addColorStop(0.55, 'rgba(12, 18, 32, 0.65)');
    cloudGrad.addColorStop(1, 'rgba(6, 10, 20, 0)');
    ctx.fillStyle = cloudGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBrickLimePlasterTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  // 1. Base weathered Rajasthani sandstone & aged chuna mortar (dark buff-charcoal stone, NO red brick boxes)
  ctx.fillStyle = '#3d352e';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // 2. Ashlar Dressed Sandstone Block Courses (authentic Haveli masonry)
  const stoneRows = 10;
  const rowH = size / stoneRows;

  for (let r = 0; r < stoneRows; r++) {
    const by = r * rowH;
    const colsInRow = r % 2 === 0 ? 4 : 5;
    const colW = size / colsInRow;
    const offset = (r % 2) * (colW * 0.35);

    for (let c = -1; c <= colsInRow; c++) {
      const bx = c * colW + offset;
      const hash = (r * 23 + c * 41 + 100) % 28;
      const baseR = 54 + hash;
      const baseG = 47 + Math.floor(hash * 0.85);
      const baseB = 39 + Math.floor(hash * 0.72);

      // Chiseled stone block face
      ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
      ctx.fillRect(bx + 3, by + 3, colW - 6, rowH - 6);

      // Raised stone face & recessed mortar joint in bump map
      bCtx.fillStyle = '#242424';
      bCtx.fillRect(bx, by, colW, rowH);
      bCtx.fillStyle = '#a8a8a8';
      bCtx.fillRect(bx + 4, by + 4, colW - 8, rowH - 8);

      // Subtle dark mortar lines
      ctx.strokeStyle = '#1b1714';
      ctx.lineWidth = 3;
      ctx.strokeRect(bx + 1.5, by + 1.5, colW - 3, rowH - 3);
    }
  }

  // 3. Carved Traditional Rajasthani Horizontal Frieze Band across the stone course
  const bandY = Math.floor(size * 0.48);
  ctx.fillStyle = '#2b241e';
  ctx.fillRect(0, bandY, size, 26);
  bCtx.fillStyle = '#d4d4d4';
  bCtx.fillRect(0, bandY + 3, size, 20);
  for (let x = 8; x < size; x += 32) {
    ctx.fillStyle = '#4c4136';
    ctx.beginPath();
    ctx.arc(x + 8, bandY + 13, 7, 0, Math.PI * 2);
    ctx.fill();
    bCtx.fillStyle = '#404040';
    bCtx.beginPath();
    bCtx.arc(x + 8, bandY + 13, 7, 0, Math.PI * 2);
    bCtx.fill();
  }

  // 4. Dark monsoon rain streaks, soot stains & damp fungal patina
  for (let i = 0; i < 52; i++) {
    const x = (i * 97) % size;
    const y = (i * 151) % size;
    const rad = 28 + (i % 55);
    const grad = ctx.createRadialGradient(x, y, 4, x, y, rad);
    grad.addColorStop(0, 'rgba(10, 9, 8, 0.58)');
    grad.addColorStop(1, 'rgba(10, 9, 8, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Deep jagged structural cracks
  ctx.strokeStyle = '#0c0a09';
  bCtx.strokeStyle = '#0e0e0e';
  for (let c = 0; c < 10; c++) {
    let cx = ((c * 137) % (size - 80)) + 40;
    let cy = ((c * 89) % (size - 120)) + 20;
    ctx.lineWidth = 1.5 + (c % 2);
    bCtx.lineWidth = 3.0;
    ctx.beginPath();
    bCtx.beginPath();
    ctx.moveTo(cx, cy);
    bCtx.moveTo(cx, cy);
    for (let s = 0; s < 8; s++) {
      cx += ((c * 29 + s * 43) % 34) - 17;
      cy += 14 + ((c * 13 + s * 19) % 18);
      ctx.lineTo(cx, cy);
      bCtx.lineTo(cx, cy);
    }
    ctx.stroke();
    bCtx.stroke();
  }

  // 6. Dark damp moss near the base of the sandstone wall
  const mossGrad = ctx.createLinearGradient(0, size * 0.74, 0, size);
  mossGrad.addColorStop(0, 'rgba(14, 24, 14, 0.0)');
  mossGrad.addColorStop(0.6, 'rgba(12, 22, 12, 0.55)');
  mossGrad.addColorStop(1, 'rgba(8, 16, 8, 0.85)');
  ctx.fillStyle = mossGrad;
  ctx.fillRect(0, size * 0.74, size, size * 0.26);

  for (let i = 0; i < 3500; i++) {
    const nx = (i * 73) % size;
    const ny = (i * 199) % size;
    const v = i % 2 === 0 ? 185 : 45;
    bCtx.fillStyle = `rgba(${v},${v},${v},0.18)`;
    bCtx.fillRect(nx, ny, 2, 2);
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  return { map, bumpMap };
}

function createFloorSurfaceTextures(surface: FloorSurfaceType): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  if (surface === 'tiles') {
    // Dark stone & slate-marble chequered Haveli floor tiles with diamond inlays
    const grid = 4;
    const tileW = size / grid;
    for (let r = 0; r < grid; r++) {
      for (let c = 0; c < grid; c++) {
        const isDark = (r + c) % 2 === 0;
        ctx.fillStyle = isDark ? '#1e2024' : '#3a352f';
        ctx.fillRect(c * tileW, r * tileW, tileW, tileW);

        // Chiseled tile bevel & deep grout in bump map
        bCtx.fillStyle = '#181818';
        bCtx.fillRect(c * tileW, r * tileW, tileW, tileW);
        bCtx.fillStyle = '#b8b8b8';
        bCtx.fillRect(c * tileW + 5, r * tileW + 5, tileW - 10, tileW - 10);

        // Subtle stone border inlay
        ctx.strokeStyle = isDark ? '#2d3036' : '#24201c';
        ctx.lineWidth = 2;
        ctx.strokeRect(c * tileW + 8, r * tileW + 8, tileW - 16, tileW - 16);

        // Deep grout lines
        ctx.strokeStyle = '#100e0d';
        ctx.lineWidth = 4;
        ctx.strokeRect(c * tileW, r * tileW, tileW, tileW);
      }
    }
  } else if (surface === 'wood') {
    // Dusty aged teakwood planks
    ctx.fillStyle = '#543624';
    ctx.fillRect(0, 0, size, size);
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, size, size);

    const planks = 8;
    const pH = size / planks;
    for (let p = 0; p < planks; p++) {
      const y = p * pH;
      const tone = 68 + ((p * 13) % 22);
      ctx.fillStyle = `rgb(${tone + 26}, ${tone + 6}, ${Math.floor(tone * 0.68)})`;
      ctx.fillRect(0, y + 2, size, pH - 4);

      bCtx.fillStyle = '#202020';
      bCtx.fillRect(0, y, size, 3);

      // Wood grain lines
      ctx.strokeStyle = 'rgba(28, 15, 8, 0.35)';
      bCtx.strokeStyle = '#606060';
      for (let g = 0; g < 6; g++) {
        ctx.beginPath();
        bCtx.beginPath();
        const gy = y + 6 + g * (pH / 7);
        ctx.moveTo(0, gy);
        bCtx.moveTo(0, gy);
        ctx.bezierCurveTo(size * 0.33, gy + 4, size * 0.66, gy - 4, size, gy);
        bCtx.bezierCurveTo(size * 0.33, gy + 4, size * 0.66, gy - 4, size, gy);
        ctx.stroke();
        bCtx.stroke();
      }
    }
  } else if (surface === 'red_oxide') {
    // Traditional Indian Red Oxide (Lalgeru) floor with aged patina & cracks
    ctx.fillStyle = '#752624';
    ctx.fillRect(0, 0, size, size);
    bCtx.fillStyle = '#989898';
    bCtx.fillRect(0, 0, size, size);

    // Subtle border & worn center sheen
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      20,
      size / 2,
      size / 2,
      size * 0.65,
    );
    grad.addColorStop(0, 'rgba(135, 42, 36, 0.45)');
    grad.addColorStop(1, 'rgba(52, 16, 16, 0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  } else if (surface === 'mud') {
    // Rich dark earthy forest soil with scattered grit, pebbles & mossy dirt patches
    ctx.fillStyle = '#29221b';
    ctx.fillRect(0, 0, size, size);
    bCtx.fillStyle = '#6c6c6c';
    bCtx.fillRect(0, 0, size, size);

    // Organic dark soil & mossy earth mottling
    for (let m = 0; m < 85; m++) {
      const mx = (m * 73 + 19) % size;
      const my = (m * 127 + 41) % size;
      const mr = 14 + (m % 28);
      ctx.fillStyle =
        m % 4 === 0
          ? 'rgba(20, 28, 17, 0.28)'
          : m % 2 === 0
            ? 'rgba(54, 43, 33, 0.24)'
            : 'rgba(18, 14, 11, 0.30)';
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fine pebbles & earthy stone grit
    for (let p = 0; p < 700; p++) {
      const px = (p * 193 + 11) % size;
      const py = (p * 307 + 23) % size;
      const pr = 1 + (p % 3);
      ctx.fillStyle =
        p % 5 === 0
          ? 'rgba(84, 77, 68, 0.34)'
          : p % 2 === 0
            ? 'rgba(48, 39, 30, 0.38)'
            : 'rgba(16, 13, 10, 0.42)';
      ctx.fillRect(px, py, pr, pr);
      bCtx.fillStyle = p % 3 === 0 ? '#a8a8a8' : '#404040';
      bCtx.fillRect(px, py, pr, pr);
    }
  } else {
    // 'stone' — Dark Kota/Slate stone floor tiles with chiseled bevel joints
    ctx.fillStyle = '#26282c';
    ctx.fillRect(0, 0, size, size);
    bCtx.fillStyle = '#888888';
    bCtx.fillRect(0, 0, size, size);

    const slabs = 4;
    const sW = size / slabs;
    for (let r = 0; r < slabs; r++) {
      for (let c = 0; c < slabs; c++) {
        const ox = (r % 2) * (sW * 0.5);
        const shade = 32 + ((r * 7 + c * 13) % 14);
        ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 5})`;
        ctx.fillRect(c * sW + ox + 3, r * sW + 3, sW - 6, sW - 6);

        ctx.strokeStyle = '#111214';
        ctx.lineWidth = 4;
        ctx.strokeRect(c * sW + ox, r * sW, sW, sW);

        bCtx.strokeStyle = '#181818';
        bCtx.lineWidth = 6;
        bCtx.strokeRect(c * sW + ox, r * sW, sW, sW);
      }
    }
  }

  // Common weathering: dust, stains, and cracks across all floors
  for (let i = 0; i < 60; i++) {
    const x = (i * 83) % size;
    const y = (i * 139) % size;
    const r = 10 + (i % 35);
    ctx.fillStyle =
      i % 3 === 0 ? 'rgba(24, 34, 22, 0.18)' : 'rgba(20, 16, 14, 0.2)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    bCtx.fillStyle = i % 2 === 0 ? 'rgba(40,40,40,0.3)' : 'rgba(190,190,190,0.25)';
    bCtx.beginPath();
    ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
    bCtx.fill();
  }

  // Cracks
  ctx.strokeStyle = 'rgba(18, 14, 12, 0.55)';
  bCtx.strokeStyle = '#141414';
  ctx.lineWidth = 1.5;
  bCtx.lineWidth = 2.5;
  for (let k = 0; k < 9; k++) {
    let x = (k * 113) % size;
    let y = (k * 71) % size;
    ctx.beginPath();
    bCtx.beginPath();
    ctx.moveTo(x, y);
    bCtx.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += ((k * 19 + s * 37) % 40) - 20;
      y += ((k * 23 + s * 29) % 40) - 10;
      ctx.lineTo(x, y);
      bCtx.lineTo(x, y);
    }
    ctx.stroke();
    bCtx.stroke();
  }

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  return { map, bumpMap };
}

function createCarvedWoodTextures(): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const bump = document.createElement('canvas');
  bump.width = size;
  bump.height = size;
  const bCtx = bump.getContext('2d')!;

  ctx.fillStyle = '#5c3822';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#787878';
  bCtx.fillRect(0, 0, size, size);

  // Carved vertical flutes & traditional lotus rosette motifs
  for (let x = 0; x < size; x += 16) {
    ctx.fillStyle = x % 32 === 0 ? '#422615' : '#6e452b';
    ctx.fillRect(x, 0, 8, size);
    bCtx.fillStyle = x % 32 === 0 ? '#303030' : '#c0c0c0';
    bCtx.fillRect(x, 0, 8, size);
  }

  // Horizontal carved band
  ctx.fillStyle = '#381e0f';
  ctx.fillRect(0, size * 0.45, size, size * 0.1);
  bCtx.fillStyle = '#e0e0e0';
  bCtx.fillRect(0, size * 0.46, size, size * 0.08);

  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(bump);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  return { map, bumpMap };
}

// ============================================================================
// PIECEWISE PALACE COORDINATE REMAPPER (48x44 -> 64x56 PALACE & -12m BASEMENT)
// ============================================================================

export function mapPalaceX(oldX: number): number {
  if (oldX <= -11.0) return -19.0 + (oldX + 11.0);
  if (oldX >= 11.0) return 19.0 + (oldX - 11.0);
  return oldX * (19.0 / 11.0);
}

export function mapPalaceZ(oldZ: number): number {
  if (oldZ >= 10.0) return oldZ;
  if (oldZ >= -4.5) return 10.0 + (oldZ - 10.0) * (18.5 / 14.5);
  if (oldZ >= -19.5) return -8.5 + (oldZ + 4.5) * (19.0 / 15.0);
  if (oldZ >= -34.0) return -27.5 + (oldZ + 19.5) * (18.5 / 14.5);
  return oldZ - 12.0;
}

export function mapRoomPropXZ(
  oldX: number,
  oldY: number,
  oldZ: number,
): { x: number; z: number } {
  if (oldY < -0.5) return { x: oldX, z: oldZ - 12.0 };
  if (Math.abs(oldX) < 10.95 && oldZ >= 3.0 && oldZ <= 10.0 && oldY >= 4.5) {
    return { x: mapPalaceX(oldX), z: oldZ };
  }
  return { x: mapPalaceX(oldX), z: mapPalaceZ(oldZ) };
}

// ============================================================================
// MAIN MULTI-FLOOR THAKUR HAVELI BUILDER
// ============================================================================

export function buildThakurHaveli(buildOptions?: {
  disableExtraLights?: boolean;
}): MansionBuildResult {
  const disableExtraLights = Boolean(buildOptions?.disableExtraLights);
  const root = new THREE.Group();
  root.name = 'ThakurHaveliRoot';

  const lanterns: THREE.Group[] = [];
  const flickeringLights: FlickeringLightEntry[] = [];
  const doors: HaveliDoor[] = [];
  const hidingSpots: HaveliHidingSpot[] = [];
  const wallColliders: WallAABB[] = [];
  const cylinderColliders: Array<{
    x: number;
    z: number;
    radius: number;
    minY: number;
    maxY: number;
  }> = [];
  const swayingCurtains: THREE.Mesh[] = [];
  const watchingEyes: THREE.Mesh[] = [];
  const dripParticles: THREE.Mesh[] = [];
  const windowLightningMats: THREE.MeshBasicMaterial[] = [];
  const decorativeDynamicLights: THREE.Light[] = [];
  const _flWorldPos = new THREE.Vector3();
  const _rootWorldPos = new THREE.Vector3();
  let lowLightBudgetMode = false;
  const stormWeather = new StormWeatherSystem(root);
  let currentSunriseProgress = 0;

  // Shared Procedural Materials (bright, high-visibility Rajasthani sandstone, stone floor tiles & carved wood)
  const wallTex = createBrickLimePlasterTextures();
  wallTex.map.repeat.set(3, 1.5);
  wallTex.bumpMap.repeat.set(3, 1.5);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x9c8b78,
    emissive: 0x241e18,
    emissiveIntensity: 0.22,
    map: wallTex.map,
    bumpMap: wallTex.bumpMap,
    bumpScale: 0.055,
    roughness: 0.85,
    metalness: 0.03,
  });

  // Carved Jaisalmer/Jodhpur Sandstone material for arches, pillars, Jharokhas & Chhatri domes
  const carvedSandstoneMat = new THREE.MeshStandardMaterial({
    color: 0xb89f86,
    emissive: 0x292119,
    emissiveIntensity: 0.22,
    map: wallTex.map,
    bumpMap: wallTex.bumpMap,
    bumpScale: 0.045,
    roughness: 0.82,
    metalness: 0.04,
  });

  const darkStoneTex = createFloorSurfaceTextures('stone');
  darkStoneTex.map.repeat.set(6, 6);
  darkStoneTex.bumpMap.repeat.set(6, 6);
  const stoneFloorMat = new THREE.MeshStandardMaterial({
    color: 0x7d828c,
    emissive: 0x1c1e22,
    emissiveIntensity: 0.2,
    map: darkStoneTex.map,
    bumpMap: darkStoneTex.bumpMap,
    bumpScale: 0.04,
    roughness: 0.8,
    metalness: 0.06,
  });

  const tileTex = createFloorSurfaceTextures('tiles');
  tileTex.map.repeat.set(6, 6);
  tileTex.bumpMap.repeat.set(6, 6);
  const tileFloorMat = new THREE.MeshStandardMaterial({
    color: 0x8a8f99,
    emissive: 0x1e2024,
    emissiveIntensity: 0.2,
    map: tileTex.map,
    bumpMap: tileTex.bumpMap,
    bumpScale: 0.035,
    roughness: 0.78,
    metalness: 0.07,
  });

  const woodFloorTex = createFloorSurfaceTextures('wood');
  woodFloorTex.map.repeat.set(4, 4);
  woodFloorTex.bumpMap.repeat.set(4, 4);
  const woodFloorMat = new THREE.MeshStandardMaterial({
    color: 0x8a6548,
    emissive: 0x22160c,
    emissiveIntensity: 0.2,
    map: woodFloorTex.map,
    bumpMap: woodFloorTex.bumpMap,
    bumpScale: 0.035,
    roughness: 0.82,
    metalness: 0.04,
  });

  const redOxideTex = createFloorSurfaceTextures('red_oxide');
  redOxideTex.map.repeat.set(4, 4);
  redOxideTex.bumpMap.repeat.set(4, 4);
  const redOxideMat = new THREE.MeshStandardMaterial({
    color: 0x944f4b,
    emissive: 0x261010,
    emissiveIntensity: 0.2,
    map: redOxideTex.map,
    bumpMap: redOxideTex.bumpMap,
    bumpScale: 0.025,
    roughness: 0.76,
    metalness: 0.05,
  });

  const mudTex = createFloorSurfaceTextures('mud');
  mudTex.map.repeat.set(16, 16);
  mudTex.bumpMap.repeat.set(16, 16);
  const mudFloorMat = new THREE.MeshStandardMaterial({
    color: 0x5c5043,
    emissive: 0x110e0b,
    emissiveIntensity: 0.14,
    map: mudTex.map,
    bumpMap: mudTex.bumpMap,
    bumpScale: 0.06,
    roughness: 0.94,
    metalness: 0.01,
  });

  const carvedWoodTex = createCarvedWoodTextures();
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x825839,
    emissive: 0x21140b,
    emissiveIntensity: 0.2,
    map: carvedWoodTex.map,
    bumpMap: carvedWoodTex.bumpMap,
    bumpScale: 0.045,
    roughness: 0.78,
    metalness: 0.05,
  });

  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x4a4644,
    emissive: 0x141212,
    emissiveIntensity: 0.16,
    roughness: 0.48,
    metalness: 0.72,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xc89b3c,
    emissive: 0x221604,
    emissiveIntensity: 0.08,
    roughness: 0.32,
    metalness: 0.86,
  });

  // Carved Antique Dark-Wood Door Materials & Aged Brass Ring Hardware
  const antiqueDarkWoodMat = new THREE.MeshStandardMaterial({
    color: 0x3a2215,
    emissive: 0x0f0703,
    emissiveIntensity: 0.14,
    map: carvedWoodTex.map,
    bumpMap: carvedWoodTex.bumpMap,
    bumpScale: 0.068,
    roughness: 0.72,
    metalness: 0.08,
  });

  const antiqueDarkWoodTrimMat = new THREE.MeshStandardMaterial({
    color: 0x24130b,
    emissive: 0x080402,
    emissiveIntensity: 0.1,
    map: carvedWoodTex.map,
    bumpMap: carvedWoodTex.bumpMap,
    bumpScale: 0.055,
    roughness: 0.68,
    metalness: 0.12,
  });

  const agedBrassRingMat = new THREE.MeshStandardMaterial({
    color: 0xd6a642,
    emissive: 0x2a1b05,
    emissiveIntensity: 0.12,
    roughness: 0.28,
    metalness: 0.88,
  });

  const clayMat = new THREE.MeshStandardMaterial({
    color: 0x613422,
    emissive: 0x0d0502,
    emissiveIntensity: 0.04,
    roughness: 0.88,
    metalness: 0.03,
  });

  const cobwebMat = new THREE.MeshBasicMaterial({
    color: 0xc8c2b8,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const curtainMat = new THREE.MeshStandardMaterial({
    color: 0x5c0a10,
    roughness: 0.9,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.88,
  });

  // ==========================================================================
  // 0. DARK STORMY MIDNIGHT SKY DOME & MOONLIT CLOUDS
  // ==========================================================================
  const skyDomeTex = createMidnightStormSkyTexture();
  const skyDomeMat = new THREE.MeshBasicMaterial({
    map: skyDomeTex,
    color: 0xffffff,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const skyDomeMesh = new THREE.Mesh(
    new THREE.SphereGeometry(180, 36, 24),
    skyDomeMat,
  );
  skyDomeMesh.position.set(0, 2, 0);
  skyDomeMesh.renderOrder = -10;
  root.add(skyDomeMesh);

  // Visible Glowing Full Moon (Purnima Moon) hanging prominently in the night sky above the Haveli skyline
  const purnimaMoonGroup = new THREE.Group();
  purnimaMoonGroup.name = 'PurnimaFullMoon';
  purnimaMoonGroup.position.set(-28, 43, -94);

  const moonDiscCanvas = document.createElement('canvas');
  moonDiscCanvas.width = 256;
  moonDiscCanvas.height = 256;
  const mCtx = moonDiscCanvas.getContext('2d')!;
  mCtx.clearRect(0, 0, 256, 256);
  const moonDiscGrad = mCtx.createRadialGradient(122, 120, 8, 128, 128, 118);
  moonDiscGrad.addColorStop(0.0, '#fbfdff');
  moonDiscGrad.addColorStop(0.55, '#e9f1ff');
  moonDiscGrad.addColorStop(0.84, '#cad8ef');
  moonDiscGrad.addColorStop(0.95, 'rgba(186, 206, 238, 0.72)');
  moonDiscGrad.addColorStop(1.0, 'rgba(160, 185, 226, 0.0)');
  mCtx.fillStyle = moonDiscGrad;
  mCtx.beginPath();
  mCtx.arc(128, 128, 118, 0, Math.PI * 2);
  mCtx.fill();

  // Subtle realistic lunar maria & soft crater shading inside the Full Moon disc
  mCtx.save();
  mCtx.beginPath();
  mCtx.arc(128, 128, 108, 0, Math.PI * 2);
  mCtx.clip();
  const moonCraters: Array<[number, number, number, number]> = [
    [94, 92, 34, 0.16],
    [152, 86, 28, 0.14],
    [164, 138, 36, 0.18],
    [104, 158, 26, 0.13],
    [134, 118, 22, 0.11],
    [78, 132, 18, 0.12],
    [146, 172, 20, 0.1],
  ];
  moonCraters.forEach(([cx, cy, cr, alpha]) => {
    const cGrad = mCtx.createRadialGradient(cx, cy, cr * 0.15, cx, cy, cr);
    cGrad.addColorStop(0.0, `rgba(118, 134, 162, ${alpha})`);
    cGrad.addColorStop(0.7, `rgba(136, 152, 178, ${alpha * 0.55})`);
    cGrad.addColorStop(1.0, 'rgba(150, 165, 190, 0.0)');
    mCtx.fillStyle = cGrad;
    mCtx.beginPath();
    mCtx.arc(cx, cy, cr, 0, Math.PI * 2);
    mCtx.fill();
  });
  mCtx.restore();

  const purnimaMoonDiscTex = new THREE.CanvasTexture(moonDiscCanvas);
  purnimaMoonDiscTex.colorSpace = THREE.SRGBColorSpace;
  const purnimaMoonDiscMat = new THREE.SpriteMaterial({
    map: purnimaMoonDiscTex,
    transparent: true,
    opacity: 0.96,
    depthWrite: false,
    fog: false,
  });
  const purnimaMoonDisc = new THREE.Sprite(purnimaMoonDiscMat);
  purnimaMoonDisc.scale.set(13.8, 13.8, 1);
  purnimaMoonDisc.renderOrder = -8;
  purnimaMoonGroup.add(purnimaMoonDisc);

  const moonHaloCanvas = document.createElement('canvas');
  moonHaloCanvas.width = 256;
  moonHaloCanvas.height = 256;
  const mhCtx = moonHaloCanvas.getContext('2d')!;
  const mhGrad = mhCtx.createRadialGradient(128, 128, 14, 128, 128, 126);
  mhGrad.addColorStop(0.0, 'rgba(225, 238, 255, 0.52)');
  mhGrad.addColorStop(0.24, 'rgba(176, 205, 248, 0.28)');
  mhGrad.addColorStop(0.55, 'rgba(92, 128, 186, 0.11)');
  mhGrad.addColorStop(1.0, 'rgba(30, 48, 86, 0.0)');
  mhCtx.fillStyle = mhGrad;
  mhCtx.fillRect(0, 0, 256, 256);
  const purnimaMoonHaloTex = new THREE.CanvasTexture(moonHaloCanvas);
  purnimaMoonHaloTex.colorSpace = THREE.SRGBColorSpace;
  const purnimaMoonHaloMat = new THREE.SpriteMaterial({
    map: purnimaMoonHaloTex,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const purnimaMoonHalo = new THREE.Sprite(purnimaMoonHaloMat);
  purnimaMoonHalo.scale.set(44, 44, 1);
  purnimaMoonHalo.renderOrder = -9;
  purnimaMoonGroup.add(purnimaMoonHalo);
  root.add(purnimaMoonGroup);

  // Drifting 3D Moonlit Storm Cloud Layers overhead
  const stormCloudLayers: THREE.Mesh[] = [];
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = 256;
  cloudCanvas.height = 256;
  const cCtx = cloudCanvas.getContext('2d')!;
  const cGrad = cCtx.createRadialGradient(128, 128, 12, 128, 128, 120);
  cGrad.addColorStop(0, 'rgba(58, 76, 108, 0.52)');
  cGrad.addColorStop(0.45, 'rgba(26, 36, 56, 0.36)');
  cGrad.addColorStop(1, 'rgba(6, 10, 18, 0.0)');
  cCtx.fillStyle = cGrad;
  cCtx.fillRect(0, 0, 256, 256);
  const cloudTex = new THREE.CanvasTexture(cloudCanvas);
  const stormCloudMat = new THREE.MeshBasicMaterial({
    map: cloudTex,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  for (let cl = 0; cl < 14; cl++) {
    const cloudPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(26 + (cl % 4) * 6, 18 + (cl % 3) * 5),
      stormCloudMat,
    );
    const angle = (cl / 14) * Math.PI * 2;
    const dist = 12 + (cl % 3) * 14;
    cloudPlane.position.set(
      Math.cos(angle) * dist,
      25 + (cl % 4) * 2.2,
      Math.sin(angle) * dist - 2,
    );
    cloudPlane.rotation.x = Math.PI / 2;
    cloudPlane.rotation.z = angle;
    root.add(cloudPlane);
    stormCloudLayers.push(cloudPlane);
  }

  // ==========================================================================
  // 16 ROOMS (4 BASEMENT + 4 GF + 4 2F + 4 3F) + CORRIDORS & EXTERIOR ZONES
  // ==========================================================================
  const roomZones: HaveliRoomZone[] = [
    // OUTSIDE (6 Zones wrapping all 4 sides of the 64m x 56m Grand Royal Palace + 24m Royal Front Forecourt)
    {
      id: 'courtyard_front',
      nameHi: 'हवेली का शाही आगे का आँगन और मुख्य फाटक',
      nameEn: 'Grand Royal Front Forecourt & Outer Iron Gate',
      floorLevel: 0,
      minX: -32.0,
      maxX: 32.0,
      minZ: 10.0,
      maxZ: 34.0,
      minY: -0.5,
      maxY: 10.0,
      surface: 'stone',
      ambientFreq: 48,
    },
    {
      id: 'haveli_west_yard',
      nameHi: 'हवेली का पश्चिमी जंगल अहाता (Left Side)',
      nameEn: 'Haveli West Side Yard & Jungle Trail',
      floorLevel: 0,
      minX: -52.0,
      maxX: -32.0,
      minZ: -48.0,
      maxZ: 35.0,
      minY: -0.5,
      maxY: 18.0,
      surface: 'mud',
      ambientFreq: 43,
    },
    {
      id: 'haveli_east_yard',
      nameHi: 'हवेली का पूर्वी जंगल अहाता (Right Side)',
      nameEn: 'Haveli East Side Yard & Jungle Trail',
      floorLevel: 0,
      minX: 32.0,
      maxX: 52.0,
      minZ: -48.0,
      maxZ: 35.0,
      minY: -0.5,
      maxY: 18.0,
      surface: 'mud',
      ambientFreq: 43,
    },
    {
      id: 'forest_road_jungle',
      nameHi: 'काली घाटी जंगल सड़क और खराब SUV',
      nameEn: 'Forest Road, Broken SUV & Exterior Jungle',
      floorLevel: 0,
      minX: -52.0,
      maxX: 52.0,
      minZ: 34.0,
      maxZ: 96.0,
      minY: -0.5,
      maxY: 18.0,
      surface: 'mud',
      ambientFreq: 42,
    },
    {
      id: 'back_well_courtyard',
      nameHi: 'पिछला बंद आँगन और शापित कुआँ (Walled Well Courtyard)',
      nameEn: 'Walled Back Well Courtyard',
      floorLevel: 0,
      minX: -18.0,
      maxX: 18.0,
      minZ: -76.0,
      maxZ: -46.0,
      minY: -0.5,
      maxY: 12.0,
      surface: 'stone',
      ambientFreq: 47,
    },
    {
      id: 'courtyard_well',
      nameHi: 'पिछला उजाड़ बगीचा (Exterior Backyard)',
      nameEn: 'Overgrown Exterior Backyard',
      floorLevel: 0,
      minX: -52.0,
      maxX: 52.0,
      minZ: -88.0,
      maxZ: -46.0,
      minY: -0.5,
      maxY: 18.0,
      surface: 'mud',
      ambientFreq: 44,
    },
    // GROUND FLOOR (y = 0.0m, floorLevel = 0): Massive 38m x 33m x 17m Central Royal Darbar Atrium, Rear Gallery & 6 Side-Wing Rooms (G1–G6)
    {
      id: 'entrance_hall',
      nameHi: 'शाही दरबार केंद्रीय कक्ष (Grand Royal Atrium)',
      nameEn: 'Grand Royal Darbar Atrium',
      floorLevel: 0,
      minX: -19.0,
      maxX: 19.0,
      minZ: -23.0,
      maxZ: 10.0,
      minY: -0.5,
      maxY: 4.5,
      surface: 'stone',
      ambientFreq: 55,
    },
    {
      id: 'gf_corridor',
      nameHi: 'भूतल पिछला गलियारा और शाही सीढ़ी (Rear Corridor)',
      nameEn: 'Ground Floor Rear Gallery',
      floorLevel: 0,
      minX: -19.0,
      maxX: 19.0,
      minZ: -46.0,
      maxZ: -23.0,
      minY: -0.5,
      maxY: 4.5,
      surface: 'stone',
      ambientFreq: 51,
    },
    {
      id: 'gf_g1_shastragar',
      nameHi: 'G1: शाही शस्त्रागार (Shahi Shastragar)',
      nameEn: 'G1: Shahi Shastragar (Armory)',
      floorLevel: 0,
      minX: -32.0,
      maxX: -19.0,
      minZ: -8.5,
      maxZ: 10.0,
      minY: -0.5,
      maxY: 4.6,
      surface: 'stone',
      ambientFreq: 62,
    },
    {
      id: 'gf_g2_kitchen',
      nameHi: 'G2: पुरानी रसोई और अन्न-कोठी (Old Kitchen)',
      nameEn: 'G2: Purani Rasoi & Anna-Kothi',
      floorLevel: 0,
      minX: -32.0,
      maxX: -19.0,
      minZ: -27.5,
      maxZ: -8.5,
      minY: -0.5,
      maxY: 4.6,
      surface: 'stone',
      ambientFreq: 56,
    },
    {
      id: 'gf_g5_baithak',
      nameHi: 'G5: मेहमान बैठक (Mehmaan Baithak)',
      nameEn: 'G5: Mehmaan Baithak (Drawing Room)',
      floorLevel: 0,
      minX: -32.0,
      maxX: -19.0,
      minZ: -46.0,
      maxZ: -27.5,
      minY: -0.5,
      maxY: 4.6,
      surface: 'tiles',
      ambientFreq: 58,
    },
    {
      id: 'gf_g3_munim',
      nameHi: 'G3: मुनीम बही-खाता कक्ष (Munim Room)',
      nameEn: 'G3: Munim Record Room',
      floorLevel: 0,
      minX: 19.0,
      maxX: 32.0,
      minZ: -8.5,
      maxZ: 10.0,
      minY: -0.5,
      maxY: 4.6,
      surface: 'wood',
      ambientFreq: 52,
    },
    {
      id: 'gf_g4_pooja',
      nameHi: 'G4: प्राचीन पूजा घर (Prachin Pooja Ghar)',
      nameEn: 'G4: Prachin Pooja Ghar (Temple)',
      floorLevel: 0,
      minX: 19.0,
      maxX: 32.0,
      minZ: -27.5,
      maxZ: -8.5,
      minY: -0.5,
      maxY: 4.6,
      surface: 'tiles',
      ambientFreq: 73,
    },
    {
      id: 'gf_g6_sevak',
      nameHi: 'G6: सेवक कक्ष (Sevak Kaksh)',
      nameEn: 'G6: Sevak Kaksh (Servant Quarters)',
      floorLevel: 0,
      minX: 19.0,
      maxX: 32.0,
      minZ: -46.0,
      maxZ: -27.5,
      minY: -0.5,
      maxY: 4.6,
      surface: 'stone',
      ambientFreq: 48,
    },
    // SECOND FLOOR (y = +5.0m, floorLevel = 1): Open 4-Sided Wrap-Around Jharokha Balconies & 8 Rooms (2F-1–2F-8)
    {
      id: 'f2_jharokha_balcony',
      nameHi: 'दूसरी मंजिल झरोखा गैलरी (2F Wrap-Around Balcony)',
      nameEn: '2F Wrap-Around Jharokha Balcony',
      floorLevel: 1,
      minX: -19.0,
      maxX: 19.0,
      minZ: -31.3,
      maxZ: 5.8,
      minY: 4.5,
      maxY: 9.5,
      surface: 'wood',
      ambientFreq: 64,
    },
    {
      id: 'f2_corridor',
      nameHi: 'दूसरी मंजिल उत्तरी गलियारा (2F Rear Gallery)',
      nameEn: '2F Rear Stair Gallery',
      floorLevel: 1,
      minX: -19.0,
      maxX: 19.0,
      minZ: -46.0,
      maxZ: -31.3,
      minY: 4.5,
      maxY: 9.5,
      surface: 'wood',
      ambientFreq: 57,
    },
    {
      id: 'f2_1_bridal',
      nameHi: '2F-1: रुक्मिणी का सुहागरात कक्ष (Bridal Room)',
      nameEn: "2F-1: Rukmini's Suhaagraat Bridal Room",
      floorLevel: 1,
      minX: 19.0,
      maxX: 32.0,
      minZ: -8.5,
      maxZ: 10.0,
      minY: 4.5,
      maxY: 9.5,
      surface: 'red_oxide',
      ambientFreq: 86,
    },
    {
      id: 'f2_5_rani_shringar',
      nameHi: '2F-5: रानी का श्रृंगार कक्ष (Rani Shringar Kaksh)',
      nameEn: "2F-5: Rani's Shringar Kaksh",
      floorLevel: 1,
      minX: 19.0,
      maxX: 32.0,
      minZ: -27.5,
      maxZ: -8.5,
      minY: 4.5,
      maxY: 9.5,
      surface: 'red_oxide',
      ambientFreq: 78,
    },
    {
      id: 'f2_3_guest1',
      nameHi: '2F-3: अतिथि कक्ष १ (Guest Suite 1)',
      nameEn: '2F-3: Guest Suite 1',
      floorLevel: 1,
      minX: 19.0,
      maxX: 32.0,
      minZ: -46.0,
      maxZ: -27.5,
      minY: 4.5,
      maxY: 9.5,
      surface: 'tiles',
      ambientFreq: 68,
    },
    {
      id: 'f2_2_master_bed',
      nameHi: '2F-2: ठाकुर साहब का शयनकक्ष (Master Bedroom)',
      nameEn: "2F-2: Thakur Saheb's Master Bedroom",
      floorLevel: 1,
      minX: -32.0,
      maxX: -19.0,
      minZ: -8.5,
      maxZ: 10.0,
      minY: 4.5,
      maxY: 9.5,
      surface: 'wood',
      ambientFreq: 46,
    },
    {
      id: 'f2_6_royal_dining',
      nameHi: '2F-6: शाही भोजशाला (Royal Dining Room)',
      nameEn: '2F-6: Royal Dining Room',
      floorLevel: 1,
      minX: -32.0,
      maxX: -19.0,
      minZ: -27.5,
      maxZ: -8.5,
      minY: 4.5,
      maxY: 9.5,
      surface: 'tiles',
      ambientFreq: 61,
    },
    {
      id: 'f2_4_sangeet',
      nameHi: '2F-4: संगीत और झरोखा हॉल (Sangeet Hall)',
      nameEn: '2F-4: Sangeet Hall',
      floorLevel: 1,
      minX: -32.0,
      maxX: -19.0,
      minZ: -46.0,
      maxZ: -27.5,
      minY: 4.5,
      maxY: 9.5,
      surface: 'wood',
      ambientFreq: 75,
    },
    {
      id: 'f2_7_guest2',
      nameHi: '2F-7: अतिथि कक्ष २ (Guest Suite 2)',
      nameEn: '2F-7: Guest Suite 2',
      floorLevel: 1,
      minX: -19.0,
      maxX: 0.0,
      minZ: 5.8,
      maxZ: 10.0,
      minY: 4.5,
      maxY: 9.5,
      surface: 'wood',
      ambientFreq: 60,
    },
    {
      id: 'f2_8_portrait_gallery',
      nameHi: '2F-8: पूर्वज चित्र वीथिका (Portrait Gallery)',
      nameEn: '2F-8: Ancestor Portrait Gallery',
      floorLevel: 1,
      minX: 0.0,
      maxX: 19.0,
      minZ: 5.8,
      maxZ: 10.0,
      minY: 4.5,
      maxY: 9.5,
      surface: 'wood',
      ambientFreq: 69,
    },
    // THIRD FLOOR (y = +10.0m, floorLevel = 2): Open 4-Sided Wrap-Around Jharokha Balconies & 8 Rooms (3F-1–3F-8)
    {
      id: 'f3_skywell_walkway',
      nameHi: 'तीसरी मंजिल शाही झरोखा गैलरी (3F Wrap-Around Balcony)',
      nameEn: '3F Wrap-Around Jharokha Balcony',
      floorLevel: 2,
      minX: -19.0,
      maxX: 19.0,
      minZ: -34.5,
      maxZ: 5.8,
      minY: 9.5,
      maxY: 17.5,
      surface: 'wood',
      ambientFreq: 66,
    },
    {
      id: 'f3_corridor',
      nameHi: 'तीसरी मंजिल उत्तरी गलियारा (3F Upper Corridor)',
      nameEn: '3F Upper Corridor',
      floorLevel: 2,
      minX: -19.0,
      maxX: 19.0,
      minZ: -46.0,
      maxZ: -34.5,
      minY: 9.5,
      maxY: 17.5,
      surface: 'wood',
      ambientFreq: 60,
    },
    {
      id: 'f3_1_library',
      nameHi: '3F-1: तांत्रिक ग्रंथ पुस्तकालय (Tantrik Library)',
      nameEn: '3F-1: Tantrik Granth Library',
      floorLevel: 2,
      minX: -32.0,
      maxX: -19.0,
      minZ: -8.5,
      maxZ: 10.0,
      minY: 9.5,
      maxY: 17.5,
      surface: 'wood',
      ambientFreq: 54,
    },
    {
      id: 'f3_5_jyotish',
      nameHi: '3F-5: ज्योतिष एवं नक्षत्र कक्ष (Jyotish Room)',
      nameEn: '3F-5: Jyotish / Astrology Room',
      floorLevel: 2,
      minX: -32.0,
      maxX: -19.0,
      minZ: -27.5,
      maxZ: -8.5,
      minY: 9.5,
      maxY: 17.5,
      surface: 'stone',
      ambientFreq: 71,
    },
    {
      id: 'f3_3_attic1',
      nameHi: '3F-3: अटारी भंडार १ (Attic Store 1)',
      nameEn: '3F-3: Attic Store 1',
      floorLevel: 2,
      minX: -32.0,
      maxX: -19.0,
      minZ: -46.0,
      maxZ: -27.5,
      minY: 9.5,
      maxY: 17.5,
      surface: 'wood',
      ambientFreq: 49,
    },
    {
      id: 'f3_2_aaina',
      nameHi: '3F-2: आईना महल (Hall of Mirrors)',
      nameEn: '3F-2: Aaina Mahal (Hall of Mirrors)',
      floorLevel: 2,
      minX: 19.0,
      maxX: 32.0,
      minZ: -8.5,
      maxZ: 10.0,
      minY: 9.5,
      maxY: 17.5,
      surface: 'tiles',
      ambientFreq: 88,
    },
    {
      id: 'f3_6_doll_room',
      nameHi: '3F-6: पुरानी गुड़िया और खिलौना कक्ष (Old Doll Room)',
      nameEn: '3F-6: Old Doll / Toy Room',
      floorLevel: 2,
      minX: 19.0,
      maxX: 32.0,
      minZ: -27.5,
      maxZ: -8.5,
      minY: 9.5,
      maxY: 17.5,
      surface: 'wood',
      ambientFreq: 82,
    },
    {
      id: 'f3_4_barsati',
      nameHi: '3F-4: बरसाती छत मंडप कक्ष (Barsati Terrace Room)',
      nameEn: '3F-4: Barsati Terrace Room',
      floorLevel: 2,
      minX: 19.0,
      maxX: 32.0,
      minZ: -46.0,
      maxZ: -27.5,
      minY: 9.5,
      maxY: 17.5,
      surface: 'stone',
      ambientFreq: 58,
    },
    {
      id: 'f3_7_attic2',
      nameHi: '3F-7: अटारी भंडार २ (Attic Store 2)',
      nameEn: '3F-7: Attic Store 2',
      floorLevel: 2,
      minX: -19.0,
      maxX: 0.0,
      minZ: 5.8,
      maxZ: 10.0,
      minY: 9.5,
      maxY: 17.5,
      surface: 'wood',
      ambientFreq: 50,
    },
    {
      id: 'f3_8_watchtower',
      nameHi: '3F-8: अग्र बुर्ज प्रहरी कक्ष (Front Watchtower)',
      nameEn: '3F-8: Front Watchtower Room',
      floorLevel: 2,
      minX: 0.0,
      maxX: 19.0,
      minZ: 5.8,
      maxZ: 10.0,
      minY: 9.5,
      maxY: 17.5,
      surface: 'stone',
      ambientFreq: 63,
    },
    // UNDERGROUND BASEMENT LABYRINTH (y = -4.5m, floorLevel = -1): Shifted ΔZ = -12.0m cleanly under expanded 64m x 56m palace
    {
      id: 'basement_u1_kalkothri',
      nameHi: 'U1: काल-कोठरी 1 — देव कैद (Dungeon Cell 1)',
      nameEn: 'U1: Dungeon Cell 1',
      floorLevel: -1,
      minX: -13.0,
      maxX: -2.0,
      minZ: -52.0,
      maxZ: -42.0,
      minY: -5.8,
      maxY: -0.5,
      surface: 'stone',
      ambientFreq: 36,
    },
    {
      id: 'basement_u2_kalkothri2',
      nameHi: 'U2: काल-कोठरी 2 (Dungeon Cell 2)',
      nameEn: 'U2: Dungeon Cell 2',
      floorLevel: -1,
      minX: -28.0,
      maxX: -17.0,
      minZ: -52.0,
      maxZ: -42.0,
      minY: -5.8,
      maxY: -0.5,
      surface: 'stone',
      ambientFreq: 35,
    },
    {
      id: 'basement_u3_havan',
      nameHi: 'U3: तांत्रिक हवन कक्ष (Tantrik Ritual Room)',
      nameEn: 'U3: Tantrik Ritual Room',
      floorLevel: -1,
      minX: 2.0,
      maxX: 13.0,
      minZ: -52.0,
      maxZ: -45.0,
      minY: -5.8,
      maxY: -0.5,
      surface: 'red_oxide',
      ambientFreq: 42,
    },
    {
      id: 'basement_u4_vault',
      nameHi: 'U4: गुप्त खज़ाना तिजोरी (Secret Gold Vault)',
      nameEn: 'U4: Secret Gold Vault',
      floorLevel: -1,
      minX: 13.0,
      maxX: 28.0,
      minZ: -66.0,
      maxZ: -56.0,
      minY: -5.8,
      maxY: -0.5,
      surface: 'stone',
      ambientFreq: 37,
    },
    {
      id: 'basement_u5_cellar',
      nameHi: 'U5: पुराना तेल व अनाज भंडार (Old Oil & Grain Cellar)',
      nameEn: 'U5: Old Oil & Grain Cellar',
      floorLevel: -1,
      minX: 17.0,
      maxX: 28.0,
      minZ: -52.0,
      maxZ: -42.0,
      minY: -5.8,
      maxY: -0.5,
      surface: 'stone',
      ambientFreq: 40,
    },
    {
      id: 'basement_u6_torture',
      nameHi: 'U6: ज़ंजीर व यातना कक्ष (Chain & Torture Chamber)',
      nameEn: 'U6: Chain & Torture Chamber',
      floorLevel: -1,
      minX: -28.0,
      maxX: -13.0,
      minZ: -66.0,
      maxZ: -56.0,
      minY: -5.8,
      maxY: -0.5,
      surface: 'stone',
      ambientFreq: 34,
    },
    {
      id: 'basement_u7_well_shaft',
      nameHi: 'U7: कुएं की निचली सुरंग (Underground Well Shaft Room)',
      nameEn: 'U7: Underground Well Shaft Room',
      floorLevel: -1,
      minX: -9.0,
      maxX: 9.0,
      minZ: -66.0,
      maxZ: -56.0,
      minY: -5.8,
      maxY: -0.5,
      surface: 'stone',
      ambientFreq: 33,
    },
    {
      id: 'basement_u8_idols',
      nameHi: 'U8: टूटी मूर्तियों का कक्ष (Broken Idols Room)',
      nameEn: 'U8: Broken Idols Room',
      floorLevel: -1,
      minX: -26.0,
      maxX: -11.0,
      minZ: -80.0,
      maxZ: -70.0,
      minY: -5.8,
      maxY: -0.5,
      surface: 'stone',
      ambientFreq: 39,
    },
    {
      id: 'basement_u9_collapsed',
      nameHi: 'U9: धंसी हुई सुरंग (Collapsed Tunnel Chamber)',
      nameEn: 'U9: Collapsed Tunnel Chamber',
      floorLevel: -1,
      minX: -11.0,
      maxX: 2.0,
      minZ: -80.0,
      maxZ: -70.0,
      minY: -5.8,
      maxY: -0.5,
      surface: 'stone',
      ambientFreq: 35,
    },
    {
      id: 'basement_u10_crypt',
      nameHi: 'U10: प्राचीन अस्थि कक्ष (Ancient Crypt)',
      nameEn: 'U10: Ancient Crypt',
      floorLevel: -1,
      minX: 2.0,
      maxX: 16.0,
      minZ: -80.0,
      maxZ: -70.0,
      minY: -5.8,
      maxY: -0.5,
      surface: 'stone',
      ambientFreq: 32,
    },
    // Underground Labyrinth Maze Corridors & Junctions (shifted ΔZ = -12.0m)
    {
      id: 'basement_stair_foyer',
      nameHi: 'तहखाना सीढ़ी द्वार (Basement Stairs Foyer)',
      nameEn: 'Basement Stairs Foyer',
      floorLevel: -1,
      minX: 2.0,
      maxX: 10.4,
      minZ: -45.0,
      maxZ: -41.5,
      minY: -5.8,
      maxY: -0.5,
      surface: 'stone',
      ambientFreq: 39,
    },
    {
      id: 'basement_hallway',
      nameHi: 'तहखाना भूल-भुलैया मुख्य गलियारा (Central Maze Spine)',
      nameEn: 'Labyrinth Central Spine',
      floorLevel: -1,
      minX: -2.0,
      maxX: 2.0,
      minZ: -56.0,
      maxZ: -41.8,
      minY: -5.8,
      maxY: -0.5,
      surface: 'stone',
      ambientFreq: 38,
    },
    {
      id: 'basement_mid_corridor',
      nameHi: 'मध्य भूल-भुलैया चौराहा (Central Maze Crossroads)',
      nameEn: 'Mid Labyrinth Cross-Corridor',
      floorLevel: -1,
      minX: -17.0,
      maxX: 17.0,
      minZ: -56.0,
      maxZ: -52.0,
      minY: -5.8,
      maxY: -0.5,
      surface: 'stone',
      ambientFreq: 37,
    },
    {
      id: 'basement_west_corridor',
      nameHi: 'पश्चिम भूल-भुलैया सुरंग (West Maze Corridor)',
      nameEn: 'West Labyrinth Corridor',
      floorLevel: -1,
      minX: -17.0,
      maxX: -13.0,
      minZ: -52.0,
      maxZ: -42.0,
      minY: -5.8,
      maxY: -0.5,
      surface: 'stone',
      ambientFreq: 36,
    },
    {
      id: 'basement_west_north_corridor',
      nameHi: 'पश्चिम मोड़ सुरंग (West Twist Corridor)',
      nameEn: 'West Twist Maze Corridor',
      floorLevel: -1,
      minX: -13.0,
      maxX: -9.0,
      minZ: -66.0,
      maxZ: -56.0,
      minY: -5.8,
      maxY: -0.5,
      surface: 'stone',
      ambientFreq: 36,
    },
    {
      id: 'basement_east_corridor',
      nameHi: 'पूर्व भूल-भुलैया सुरंग (East Maze Corridor)',
      nameEn: 'East Labyrinth Corridor',
      floorLevel: -1,
      minX: 13.0,
      maxX: 17.0,
      minZ: -52.0,
      maxZ: -42.0,
      minY: -5.8,
      maxY: -0.5,
      surface: 'stone',
      ambientFreq: 36,
    },
    {
      id: 'basement_east_north_corridor',
      nameHi: 'पूर्व मोड़ सुरंग (East Twist Corridor)',
      nameEn: 'East Twist Maze Corridor',
      floorLevel: -1,
      minX: 9.0,
      maxX: 13.0,
      minZ: -66.0,
      maxZ: -56.0,
      minY: -5.8,
      maxY: -0.5,
      surface: 'stone',
      ambientFreq: 36,
    },
    {
      id: 'basement_north_corridor',
      nameHi: 'उत्तरी अस्थि गलियारा (Deep North Maze Corridor)',
      nameEn: 'Deep North Labyrinth Corridor',
      floorLevel: -1,
      minX: -26.0,
      maxX: 21.0,
      minZ: -70.0,
      maxZ: -66.0,
      minY: -5.8,
      maxY: -0.5,
      surface: 'stone',
      ambientFreq: 34,
    },
  ];

  // ==========================================================================
  // HELPER FUNCTIONS FOR RAJASTHANI HAVELI WALLS, CUSPED ARCHES, PILLARS & DOORS
  // ==========================================================================

  const addWallSegment = (
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    yBottom: number,
    height: number,
    thickness = 0.38,
    addCollider = true,
  ) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.05) return;

    const wallGroup = new THREE.Group();
    wallGroup.position.set(
      (x1 + x2) * 0.5,
      yBottom,
      (z1 + z2) * 0.5,
    );
    wallGroup.rotation.y = -Math.atan2(dz, dx);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(len, height, thickness),
      wallMat,
    );
    mesh.position.y = height * 0.5;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    wallGroup.add(mesh);

    // Carved Rajasthani sandstone plinth base moulding & upper cornice band so walls have architectural relief
    if (height >= 2.2) {
      const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(len + 0.04, 0.24, thickness + 0.08),
        carvedSandstoneMat,
      );
      plinth.position.y = 0.12;
      plinth.receiveShadow = true;
      wallGroup.add(plinth);

      const cornice = new THREE.Mesh(
        new THREE.BoxGeometry(len + 0.04, 0.2, thickness + 0.1),
        carvedSandstoneMat,
      );
      cornice.position.y = height - 0.1;
      cornice.castShadow = true;
      wallGroup.add(cornice);
    }

    root.add(wallGroup);

    if (addCollider) {
      const isHorizontalX = Math.abs(dx) >= Math.abs(dz);
      const minX = isHorizontalX
        ? Math.min(x1, x2)
        : Math.min(x1, x2) - thickness * 0.5;
      const maxX = isHorizontalX
        ? Math.max(x1, x2)
        : Math.max(x1, x2) + thickness * 0.5;
      const minZ = isHorizontalX
        ? Math.min(z1, z2) - thickness * 0.5
        : Math.min(z1, z2);
      const maxZ = isHorizontalX
        ? Math.max(z1, z2) + thickness * 0.5
        : Math.max(z1, z2);
      wallColliders.push({
        minX,
        maxX,
        minZ,
        maxZ,
        minY: yBottom,
        maxY: yBottom + height,
      });
    }
  };

  // Builds a traditional Rajasthani Multi-Cusped Sandstone Arch (Mehrab / Kaman)
  const buildRajasthaniCuspedArch = (
    spanWidth: number,
    archHeight: number,
    depth = 0.42,
    mat: THREE.Material = carvedSandstoneMat,
  ): THREE.Group => {
    const g = new THREE.Group();
    const pierW = Math.min(0.42, spanWidth * 0.15);
    const springY = archHeight * 0.58;
    const crownH = archHeight - springY;

    // Left & Right Carved Sandstone Piers with stepped bases & lotus capitals
    [-1, 1].forEach((side) => {
      const px = side * (spanWidth * 0.5 - pierW * 0.5);
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(pierW * 1.25, 0.34, depth * 1.2),
        mat,
      );
      base.position.set(px, 0.17, 0);
      g.add(base);

      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(pierW * 0.46, pierW * 0.52, springY - 0.5, 8),
        mat,
      );
      shaft.position.set(px, springY * 0.5, 0);
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      g.add(shaft);

      const capital = new THREE.Mesh(
        new THREE.BoxGeometry(pierW * 1.3, 0.24, depth * 1.22),
        mat,
      );
      capital.position.set(px, springY - 0.12, 0);
      g.add(capital);
    });

    // Top Spandrel Header Beam & Carved Cornice Trim
    const spandrelTop = new THREE.Mesh(
      new THREE.BoxGeometry(spanWidth, 0.36, depth),
      mat,
    );
    spandrelTop.position.set(0, archHeight - 0.18, 0);
    spandrelTop.castShadow = true;
    g.add(spandrelTop);

    // Multi-foil Cusped Arch Scallops (7 segments forming a pointed Rajasthani arch)
    const innerSpan = spanWidth - pierW * 1.8;
    const numFoil = 7;
    for (let i = 0; i < numFoil; i++) {
      const t = i / (numFoil - 1);
      const angle = Math.PI * (1 - t);
      const cx = Math.cos(angle) * (innerSpan * 0.48);
      const cy =
        springY +
        Math.sin(angle) * (crownH * 0.78) +
        (1 - Math.abs(t - 0.5) * 2) * 0.18;
      const voussoir = new THREE.Mesh(
        new THREE.BoxGeometry(innerSpan * 0.24, 0.28, depth * 1.05),
        mat,
      );
      voussoir.position.set(cx, cy, 0);
      voussoir.rotation.z = (0.5 - t) * 1.45;
      voussoir.castShadow = true;
      g.add(voussoir);

      // Hanging lotus cusp droplet on the underside of each foil
      const cusp = new THREE.Mesh(
        new THREE.ConeGeometry(0.065, 0.16, 6),
        mat,
      );
      cusp.rotation.x = Math.PI;
      cusp.position.set(cx * 0.92, cy - 0.14, 0);
      g.add(cusp);
    }

    return g;
  };

  const addCarvedPillar = (x: number, yBottom: number, z: number, height = 4.0) => {
    const g = new THREE.Group();
    g.position.set(x, yBottom, z);

    // Stepped Rajasthani sandstone pedestal (Pitha)
    const baseLower = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.22, 0.58),
      carvedSandstoneMat,
    );
    baseLower.position.y = 0.11;
    const baseUpper = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.2, 0.46),
      carvedSandstoneMat,
    );
    baseUpper.position.y = 0.32;
    g.add(baseLower, baseUpper);

    // Octagonal fluted sandstone shaft (Stambha)
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.23, height - 0.85, 8),
      carvedSandstoneMat,
    );
    shaft.position.y = height * 0.5;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    g.add(shaft);

    // Carved decorative brass & stone ring band at mid-height
    const midBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.235, 0.235, 0.14, 8),
      woodMat,
    );
    midBand.position.y = height * 0.55;
    g.add(midBand);

    // Lotus capital & 4-way corbel bracket (Sirsa)
    const capitalNeck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.19, 0.22, 8),
      carvedSandstoneMat,
    );
    capitalNeck.position.y = height - 0.34;
    const corbelX = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.22, 0.32),
      carvedSandstoneMat,
    );
    corbelX.position.y = height - 0.12;
    const corbelZ = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.22, 0.76),
      carvedSandstoneMat,
    );
    corbelZ.position.y = height - 0.12;
    g.add(capitalNeck, corbelX, corbelZ);

    root.add(g);

    // Strict AABB collider for every carved pillar
    wallColliders.push({
      minX: x - 0.24,
      maxX: x + 0.24,
      minZ: z - 0.24,
      maxZ: z + 0.24,
      minY: yBottom,
      maxY: yBottom + height,
    });
  };

  const addCobwebCorner = (x: number, y: number, z: number, rotY = 0) => {
    const web = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), cobwebMat);
    web.position.set(x, y, z);
    web.rotation.set(0.35, rotY, 0.2);
    root.add(web);
  };

  const addSwayingCurtain = (x: number, yTop: number, z: number, rotY = 0) => {
    const geo = new THREE.PlaneGeometry(1.1, 2.35, 4, 8);
    geo.translate(0, -1.175, 0);
    const curtain = new THREE.Mesh(geo, curtainMat);
    curtain.position.set(x, yTop, z);
    curtain.rotation.y = rotY;
    root.add(curtain);
    swayingCurtains.push(curtain);
  };

  const addJaliWindowWithMoonRay = (
    x: number,
    yCenter: number,
    z: number,
    facingAxis: 'x' | 'z',
    rayDirSign = 1,
  ) => {
    const g = new THREE.Group();
    g.position.set(x, yCenter, z);
    if (facingAxis === 'x') g.rotation.y = Math.PI / 2;

    // Carved Rajasthani sandstone Jali window frame & overhanging Chhajja hood
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 1.75, 0.22),
      carvedSandstoneMat,
    );
    g.add(frame);

    const chhajjaHood = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.12, 0.48),
      carvedSandstoneMat,
    );
    chhajjaHood.position.set(0, 0.92, 0);
    chhajjaHood.rotation.x = 0.2;
    g.add(chhajjaHood);

    // Pierced lattice bars
    for (let i = -2; i <= 2; i++) {
      const vBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 1.55, 0.24),
        woodMat,
      );
      vBar.position.x = i * 0.22;
      g.add(vBar);
    }

    // Translucent interior window pane & inward beam glow that briefly flares during storm lightning
    const winFlashMat = new THREE.MeshBasicMaterial({
      color: 0xcbe4ff,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const winFlashPane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.16, 1.54),
      winFlashMat,
    );
    winFlashPane.position.z = rayDirSign * 0.13;
    g.add(winFlashPane);
    windowLightningMats.push(winFlashMat);

    root.add(g);
  };

  const nameplateBoardGeo = new THREE.BoxGeometry(1.52, 0.34, 0.05);
  const nameplateFaceGeo = new THREE.PlaneGeometry(1.44, 0.28);

  const addDoorwayHindiNameplate = (
    titleHi: string,
    x: number,
    yBottom: number,
    z: number,
    axis: 'x' | 'z',
  ) => {
    const cleanTitle = titleHi
      .replace(/\s*\(([A-Za-z][^)]*)\)/g, '')
      .trim();
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 112;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1b0f08';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#d4a348';
      ctx.lineWidth = 5;
      ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

      ctx.strokeStyle = 'rgba(212, 163, 72, 0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

      ctx.fillStyle = '#fff0d0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 34px "Noto Sans Devanagari", "Mukta", sans-serif';
      let fontSize = 34;
      while (ctx.measureText(cleanTitle).width > canvas.width - 42 && fontSize > 20) {
        fontSize -= 2;
        ctx.font = `bold ${fontSize}px "Noto Sans Devanagari", "Mukta", sans-serif`;
      }
      ctx.fillText(cleanTitle, canvas.width / 2, canvas.height / 2 + 2);
    }

    const plaqueTex = new THREE.CanvasTexture(canvas);
    plaqueTex.colorSpace = THREE.SRGBColorSpace;
    const plaqueMat = new THREE.MeshBasicMaterial({ map: plaqueTex });

    const plaqueGroup = new THREE.Group();
    plaqueGroup.position.set(x, yBottom + 3.34, z);
    if (axis === 'z') plaqueGroup.rotation.y = Math.PI / 2;

    const board = new THREE.Mesh(nameplateBoardGeo, woodMat);
    const frontFace = new THREE.Mesh(nameplateFaceGeo, plaqueMat);
    frontFace.position.z = 0.028;
    const backFace = new THREE.Mesh(nameplateFaceGeo, plaqueMat);
    backFace.rotation.y = Math.PI;
    backFace.position.z = -0.028;

    plaqueGroup.add(board, frontFace, backFace);
    root.add(plaqueGroup);
  };

  // Shared door hardware geometries for high-FPS carved antique dark-wood room doors
  const doorBrassStudGeo = new THREE.SphereGeometry(0.022, 8, 6);
  const doorBrassRosetteGeo = new THREE.CylinderGeometry(0.072, 0.084, 0.024, 12);
  const doorBrassMountGeo = new THREE.BoxGeometry(0.026, 0.044, 0.036);
  const doorBrassRingGeo = new THREE.TorusGeometry(0.082, 0.014, 10, 22);
  const doorIronStrapGeo = new THREE.BoxGeometry(0.46, 0.068, 0.118);
  const doorIronBoltGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.128, 6);

  const setDoorOpen = (door: HaveliDoor, open: boolean, duration = 0.45) => {
    if (door.archwayOnly) return;
    door.isOpen = open;
    door.animFromAngle = door.currentAngle;
    door.animToAngle = open ? door.openAngle : door.closedAngle;
    door.targetAngle = door.animToAngle;
    door.animElapsed = 0;
    door.animDuration = Math.max(0.05, duration);
    door.isAnimating = true;
  };

  const createDoorwayWithDoor = (opts: {
    id: string;
    nameHi: string;
    x: number;
    yBottom: number;
    z: number;
    axis: 'x' | 'z'; // 'x' means wall runs along X, 'z' means wall runs along Z
    floorLevel: number;
    width?: number;
    initialOpen?: boolean;
    autoCreak?: boolean;
    lockedUntilRelics?: number;
    archwayOnly?: boolean;
    isRoomDoor?: boolean;
  }) => {
    const doorW = opts.width ?? 2.45;
    const doorH = 3.1;

    // Carved Rajasthani Sandstone Cusped Arch Frame around doorway (wide piers sit outside clear 2.45m opening)
    const archSurround = buildRajasthaniCuspedArch(
      doorW + 0.78,
      opts.yBottom < 0 ? 3.55 : 3.68,
      0.46,
      carvedSandstoneMat,
    );
    archSurround.position.set(opts.x, opts.yBottom, opts.z);
    if (opts.axis === 'z') {
      archSurround.rotation.y = Math.PI / 2;
    }
    root.add(archSurround);

    // Clear Hindi nameplate plaque mounted directly above every doorway
    addDoorwayHindiNameplate(opts.nameHi, opts.x, opts.yBottom, opts.z, opts.axis);

    // Hinged carved wooden door pivot
    const pivot = new THREE.Group();
    const hingeOffset = doorW * 0.5;
    if (opts.axis === 'x') {
      pivot.position.set(opts.x - hingeOffset, opts.yBottom, opts.z);
    } else {
      pivot.position.set(opts.x, opts.yBottom, opts.z - hingeOffset);
    }

    if (opts.archwayOnly) {
      root.add(pivot);
      doors.push({
        id: opts.id,
        nameHi: opts.nameHi,
        pivot,
        position: new THREE.Vector3(opts.x, opts.yBottom + 1.2, opts.z),
        floorY: opts.yBottom,
        axis: opts.axis,
        doorWidth: doorW,
        initialOpen: true,
        isRoomDoor: false,
        isOpen: true,
        targetAngle: 0,
        currentAngle: 0,
        closedAngle: 0,
        openAngle: 0,
        animFromAngle: 0,
        animToAngle: 0,
        animElapsed: 0,
        animDuration: 0.45,
        isAnimating: false,
        openProgress: 1,
        rattleOffset: 0,
        lockedUntilRelics: 0,
        autoCreak: false,
        nextAutoCreakTime: 999999,
        archwayOnly: true,
        colliderBox: {
          minX: opts.x - 0.05,
          maxX: opts.x + 0.05,
          minZ: opts.z - 0.05,
          maxZ: opts.z + 0.05,
          floorLevel: opts.floorLevel,
        },
      });
      return;
    }

    // Local door leaf group oriented along +X in local space then rotated if axis === 'z'
    const leafGroup = new THREE.Group();
    if (opts.axis === 'z') {
      leafGroup.rotation.y = -Math.PI / 2;
    }
    pivot.add(leafGroup);

    // Main antique dark-wood carved door slab
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(doorW, doorH, 0.095),
      antiqueDarkWoodMat,
    );
    panel.position.set(doorW * 0.5, doorH * 0.5, 0);
    panel.castShadow = true;
    panel.receiveShadow = true;
    leafGroup.add(panel);

    // Raised dark-wood frame stiles (hinge edge, center muntin, lock edge) & cross rails
    const stileW = 0.14;
    const railH = 0.15;
    for (const sx of [stileW * 0.5, doorW * 0.5, doorW - stileW * 0.5]) {
      const stile = new THREE.Mesh(
        new THREE.BoxGeometry(stileW, doorH, 0.118),
        antiqueDarkWoodTrimMat,
      );
      stile.position.set(sx, doorH * 0.5, 0);
      leafGroup.add(stile);
    }
    for (const ry of [railH * 0.5, 1.08, 2.02, doorH - railH * 0.5]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(doorW, railH, 0.12),
        antiqueDarkWoodTrimMat,
      );
      rail.position.set(doorW * 0.5, ry, 0);
      leafGroup.add(rail);
    }

    // 6 Carved Coffered Rajputana Relief Panels & Antique Brass Bosses on both faces
    const cofferW = doorW * 0.34;
    const cofferH = 0.68;
    const cofferGeo = new THREE.BoxGeometry(cofferW, cofferH, 0.132);
    const cofferInnerGeo = new THREE.BoxGeometry(cofferW * 0.74, cofferH * 0.72, 0.144);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const cx = doorW * (0.275 + col * 0.45);
        const cy = 0.6 + row * 0.94;
        const coffer = new THREE.Mesh(cofferGeo, antiqueDarkWoodMat);
        coffer.position.set(cx, cy, 0);
        leafGroup.add(coffer);

        const cofferInner = new THREE.Mesh(cofferInnerGeo, antiqueDarkWoodTrimMat);
        cofferInner.position.set(cx, cy, 0);
        leafGroup.add(cofferInner);

        const brassStud = new THREE.Mesh(doorBrassStudGeo, agedBrassRingMat);
        brassStud.scale.z = 3.6;
        brassStud.position.set(cx, cy, 0);
        leafGroup.add(brassStud);
      }
    }

    // 3 Heavy Wrought-Iron Strap Hinges along the hinge edge (x = 0)
    for (const hy of [0.46, 1.55, 2.64]) {
      const strap = new THREE.Mesh(doorIronStrapGeo, ironMat);
      strap.position.set(0.24, hy, 0);
      leafGroup.add(strap);

      for (const bx of [0.12, 0.36]) {
        const bolt = new THREE.Mesh(doorIronBoltGeo, ironMat);
        bolt.rotation.x = Math.PI / 2;
        bolt.position.set(bx, hy, 0);
        leafGroup.add(bolt);
      }
    }

    // Ornate Antique Brass Ring Handles (पीतल का कड़ा) mounted on both front and back faces
    const handleX = doorW - 0.28;
    const handleY = 1.32;
    [-1, 1].forEach((faceSign) => {
      const rosette = new THREE.Mesh(doorBrassRosetteGeo, agedBrassRingMat);
      rosette.rotation.x = Math.PI / 2;
      rosette.position.set(handleX, handleY, faceSign * 0.062);
      leafGroup.add(rosette);

      const mountLoop = new THREE.Mesh(doorBrassMountGeo, agedBrassRingMat);
      mountLoop.position.set(handleX, handleY - 0.015, faceSign * 0.085);
      leafGroup.add(mountLoop);

      const brassRing = new THREE.Mesh(doorBrassRingGeo, agedBrassRingMat);
      brassRing.position.set(handleX, handleY - 0.095, faceSign * 0.098);
      brassRing.rotation.x = faceSign * 0.14;
      leafGroup.add(brassRing);
    });

    // Anchor nodes for accurate gaze targeting whether the door is closed or swung open
    const leafCenterNode = new THREE.Object3D();
    leafCenterNode.position.set(doorW * 0.5, 1.45, 0);
    leafGroup.add(leafCenterNode);

    const leafTipNode = new THREE.Object3D();
    leafTipNode.position.set(doorW - 0.26, 1.35, 0);
    leafGroup.add(leafTipNode);

    const closedAngle = 0;
    const openAngle = Math.PI * 0.56;
    const isOpen = Boolean(opts.initialOpen);
    const startAngle = isOpen ? openAngle : closedAngle;
    pivot.rotation.y = startAngle;

    root.add(pivot);

    const colliderBox = {
      minX: opts.x - (opts.axis === 'x' ? doorW * 0.52 : 0.24),
      maxX: opts.x + (opts.axis === 'x' ? doorW * 0.52 : 0.24),
      minZ: opts.z - (opts.axis === 'z' ? doorW * 0.52 : 0.24),
      maxZ: opts.z + (opts.axis === 'z' ? doorW * 0.52 : 0.24),
      floorLevel: opts.floorLevel,
    };

    const isRoomDoor =
      opts.isRoomDoor ??
      (opts.id !== 'door_main_entrance' &&
        opts.id !== 'door_front_iron_gate' &&
        opts.id !== 'door_back_well');

    doors.push({
      id: opts.id,
      nameHi: opts.nameHi,
      pivot,
      leafCenterNode,
      leafTipNode,
      position: new THREE.Vector3(opts.x, opts.yBottom + 1.45, opts.z),
      floorY: opts.yBottom,
      axis: opts.axis,
      doorWidth: doorW,
      initialOpen: isOpen,
      isRoomDoor,
      isOpen,
      targetAngle: startAngle,
      currentAngle: startAngle,
      closedAngle,
      openAngle,
      animFromAngle: startAngle,
      animToAngle: startAngle,
      animElapsed: 0,
      animDuration: 0.45,
      isAnimating: false,
      openProgress: isOpen ? 1 : 0,
      rattleOffset: 0,
      lockedUntilRelics: opts.lockedUntilRelics ?? 0,
      autoCreak: Boolean(opts.autoCreak),
      nextAutoCreakTime: 6 + Math.random() * 14,
      colliderBox,
    });
  };

  const addWallWithDoor = (
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    yBottom: number,
    height: number,
    doorCenterRatio: number,
    doorOpts: {
      id: string;
      nameHi: string;
      floorLevel: number;
      initialOpen?: boolean;
      autoCreak?: boolean;
      lockedUntilRelics?: number;
    },
  ) => {
    const doorW = 2.45;
    const dx = x2 - x1;
    const dz = z2 - z1;
    const totalLen = Math.hypot(dx, dz);
    const ux = dx / totalLen;
    const uz = dz / totalLen;

    const centerDist = totalLen * doorCenterRatio;
    const d1 = Math.max(0, centerDist - doorW * 0.5);
    const d2 = Math.min(totalLen, centerDist + doorW * 0.5);

    // Segment 1
    if (d1 > 0.22) {
      addWallSegment(
        x1,
        z1,
        x1 + ux * d1,
        z1 + uz * d1,
        yBottom,
        height,
      );
    }
    // Segment 2
    if (totalLen - d2 > 0.22) {
      addWallSegment(
        x1 + ux * d2,
        z1 + uz * d2,
        x2,
        z2,
        yBottom,
        height,
      );
    }
    // Transom wall above door
    const doorH = 3.1;
    if (height > doorH) {
      addWallSegment(
        x1 + ux * d1,
        z1 + uz * d1,
        x1 + ux * d2,
        z1 + uz * d2,
        yBottom + doorH,
        height - doorH,
        0.38,
        false,
      );
    }

    const cx = x1 + ux * centerDist;
    const cz = z1 + uz * centerDist;
    const axis: 'x' | 'z' = Math.abs(dx) > Math.abs(dz) ? 'x' : 'z';

    createDoorwayWithDoor({
      id: doorOpts.id,
      nameHi: doorOpts.nameHi,
      x: cx,
      yBottom,
      z: cz,
      axis,
      floorLevel: doorOpts.floorLevel,
      initialOpen: doorOpts.initialOpen,
      autoCreak: doorOpts.autoCreak,
      lockedUntilRelics: doorOpts.lockedUntilRelics,
    });
  };

  // Authentic Flickering Rajasthani Wall मशाल (Iron Torch Sconce with Subtle Warm Point Light)
  const addHangingLantern = (
    x: number,
    y: number,
    z: number,
    _color = 0xff943d,
    intensity = 1.0,
    distance = 8.5,
  ) => {
    const mashaalGroup = new THREE.Group();
    mashaalGroup.position.set(x, y, z);

    // Wrought-iron wall/ceiling mounting ring & bracket arm
    const mountPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.05, 8),
      ironMat,
    );
    mountPlate.position.y = 0.28;
    mashaalGroup.add(mountPlate);

    // Torch wooden/iron handle shaft (मशाल दंड)
    const torchShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.022, 0.56, 8),
      woodMat,
    );
    torchShaft.position.y = 0.02;
    mashaalGroup.add(torchShaft);

    // Wrought-iron clamping rings around the मशाल shaft
    [-0.1, 0.14].forEach((ry) => {
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.036, 0.008, 6, 12),
        brassMat,
      );
      band.rotation.x = Math.PI / 2;
      band.position.y = ry;
      mashaalGroup.add(band);
    });

    // Flared iron brazier cup (मशाल कटोरी) holding oil-soaked cloth & embers
    const brazierCup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.045, 0.18, 10),
      ironMat,
    );
    brazierCup.position.y = -0.18;
    mashaalGroup.add(brazierCup);

    const emberBed = new THREE.Mesh(
      new THREE.SphereGeometry(0.082, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff4400 }),
    );
    emberBed.scale.y = 0.5;
    emberBed.position.y = -0.1;
    mashaalGroup.add(emberBed);

    // Multi-layered flickering मशाल flame
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa33 });
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.075, 0.26, 8),
      flameMat,
    );
    flame.position.y = 0.04;
    mashaalGroup.add(flame);

    const innerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.042, 0.16, 6),
      new THREE.MeshBasicMaterial({ color: 0xffeeaa }),
    );
    innerFlame.position.y = 0.02;
    flame.add(innerFlame);

    root.add(mashaalGroup);
    lanterns.push(mashaalGroup);
    flickeringLights.push({
      flameMesh: flame,
      lanternGroup: mashaalGroup,
      baseIntensity: Math.min(0.85, intensity * 0.19),
      baseColor: 0xff8c38,
      phase: lanterns.length * 1.37,
    });
  };

  // Shared Geometries & Materials for Neatly Mounted Exterior Antique Wall Lanterns
  const wallLanternBackplateGeo = new THREE.BoxGeometry(0.18, 0.44, 0.05);
  const wallLanternArmGeo = new THREE.BoxGeometry(0.045, 0.045, 0.4);
  const wallLanternBraceGeo = new THREE.BoxGeometry(0.032, 0.032, 0.34);
  const wallLanternCapGeo = new THREE.ConeGeometry(0.17, 0.15, 6);
  const wallLanternFinialGeo = new THREE.SphereGeometry(0.032, 8, 6);
  const wallLanternBaseGeo = new THREE.CylinderGeometry(0.11, 0.075, 0.06, 6);
  const wallLanternGlassGeo = new THREE.CylinderGeometry(0.115, 0.088, 0.28, 6);
  const wallLanternRibGeo = new THREE.BoxGeometry(0.018, 0.3, 0.018);
  const wallLanternFlameGeo = new THREE.ConeGeometry(0.034, 0.11, 6);
  const wallLanternGlassMat = new THREE.MeshStandardMaterial({
    color: 0xffd58a,
    emissive: 0xff9d2e,
    emissiveIntensity: 1.35,
    roughness: 0.32,
    metalness: 0.05,
    transparent: true,
    opacity: 0.88,
  });
  const wallLanternFlameMat = new THREE.MeshBasicMaterial({ color: 0xfff0b8 });

  const addMountedAntiqueWallLantern = (
    x: number,
    y: number,
    z: number,
    facingYaw = 0,
    intensity = 3.2,
    distance = 15,
    attachPointLight = false,
  ) => {
    const lGroup = new THREE.Group();
    lGroup.position.set(x, y, z);
    lGroup.rotation.y = facingYaw;

    // Wrought-iron wall shield backplate mounted flush against stone wall
    const backplate = new THREE.Mesh(wallLanternBackplateGeo, ironMat);
    backplate.position.set(0, 0.08, 0.025);
    lGroup.add(backplate);

    // Horizontal wrought-iron cantilever arm + angled scroll support brace
    const arm = new THREE.Mesh(wallLanternArmGeo, ironMat);
    arm.position.set(0, 0.22, 0.21);
    lGroup.add(arm);

    const brace = new THREE.Mesh(wallLanternBraceGeo, ironMat);
    brace.position.set(0, 0.08, 0.16);
    brace.rotation.x = -0.68;
    lGroup.add(brace);

    // Hanging hexagonal lantern cage suspended cleanly from bracket tip
    const cageGroup = new THREE.Group();
    cageGroup.position.set(0, 0.02, 0.36);

    const cap = new THREE.Mesh(wallLanternCapGeo, ironMat);
    cap.position.y = 0.19;
    cageGroup.add(cap);

    const finial = new THREE.Mesh(wallLanternFinialGeo, brassMat);
    finial.position.y = 0.27;
    cageGroup.add(finial);

    const glass = new THREE.Mesh(wallLanternGlassGeo, wallLanternGlassMat);
    glass.position.y = 0.0;
    cageGroup.add(glass);

    for (let r = 0; r < 6; r++) {
      const ang = (r / 6) * Math.PI * 2;
      const rib = new THREE.Mesh(wallLanternRibGeo, ironMat);
      rib.position.set(Math.cos(ang) * 0.115, 0, Math.sin(ang) * 0.115);
      cageGroup.add(rib);
    }

    const baseCup = new THREE.Mesh(wallLanternBaseGeo, ironMat);
    baseCup.position.y = -0.16;
    cageGroup.add(baseCup);

    const flame = new THREE.Mesh(wallLanternFlameGeo, wallLanternFlameMat);
    flame.position.y = -0.02;
    cageGroup.add(flame);

    let ptLight: THREE.PointLight | undefined;
    if (attachPointLight && !disableExtraLights) {
      ptLight = new THREE.PointLight(0xffaa44, intensity, distance, 1.4);
      ptLight.position.set(0, -0.02, 0.08);
      cageGroup.add(ptLight);
    }

    lGroup.add(cageGroup);
    root.add(lGroup);
    lanterns.push(lGroup);
    // Register exterior & courtyard hanging lantern cages for rhythmic storm wind sway
    if (z > 10.0 || z < -45.8 || Math.abs(x) > 31.8) {
      stormWeather.registerSwayLantern(cageGroup, lanterns.length * 1.13);
    }
    flickeringLights.push({
      light: ptLight,
      flameMesh: flame,
      lanternGroup: lGroup,
      baseIntensity: attachPointLight ? intensity : Math.min(0.85, intensity * 0.2),
      baseColor: 0xffaa44,
      phase: lanterns.length * 1.43,
    });
  };

  // ==========================================================================
  // 1. FLOOR SLABS & CEILINGS FOR ALL 3 LEVELS (DARK STONE FLOOR TILES)
  // ==========================================================================

  const addFloorPatch = (
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    y: number,
    mat: THREE.Material,
    thickness = 0.16,
  ) => {
    const w = maxX - minX;
    const d = maxZ - minZ;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, d), mat);
    mesh.position.set((minX + maxX) * 0.5, y - thickness * 0.5, (minZ + maxZ) * 0.5);
    mesh.receiveShadow = true;
    root.add(mesh);
  };

  // Vast Exterior Forest Earth split cleanly outside the 48m x 44m Palace footprint [-24..24] x [-34..10]
  // so the Basement Stairwell & Underground Basement never get blocked by an exterior mud slab
  addFloorPatch(-135, -32, -100, 120, 0, mudFloorMat, 0.24);
  addFloorPatch(32, 135, -100, 120, 0, mudFloorMat, 0.24);
  addFloorPatch(-32, 32, -100, -46, 0, mudFloorMat, 0.24);
  addFloorPatch(-32, 32, 10, 120, 0, mudFloorMat, 0.24);
  addFloorPatch(-4.2, 4.2, 10, 34.4, 0.018, stoneFloorMat, 0.14); // Wide 24m Stone-Paved Royal Forecourt Walkway from Outer Gate (z=34) to Haveli Portal (z=10)
  addFloorPatch(-31.6, 31.6, 10.2, 33.8, 0.008, mudFloorMat, 0.08); // Forecourt packed earth courtyard flanks
  addFloorPatch(-18.0, 18.0, -76.0, -46.0, 0.015, stoneFloorMat, 0.14); // Expansive 36m x 30m stone floor inside enclosed Back Well Courtyard

  // Feathered dark earthy stone & packed-dirt 360° walking trail wrapping cleanly around all 4 sides
  // of the 64m x 56m Palace + 24m Forecourt + Walled Well Courtyard
  const createEarthyTrailMaterials = () => {
    const buildTrailTexture = (horizontal: boolean) => {
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      const bumpCanvas = document.createElement('canvas');
      bumpCanvas.width = size;
      bumpCanvas.height = size;
      const bCtx = bumpCanvas.getContext('2d')!;
      bCtx.fillStyle = '#707070';
      bCtx.fillRect(0, 0, size, size);

      // Base dark earthy dirt strip
      ctx.fillStyle = '#2d251d';
      ctx.fillRect(0, 0, size, size);

      // Subtle darker worn center track + warm earthy mottling
      const centerGrad = horizontal
        ? ctx.createLinearGradient(0, 0, 0, size)
        : ctx.createLinearGradient(0, 0, size, 0);
      centerGrad.addColorStop(0.0, '#1e1913');
      centerGrad.addColorStop(0.22, '#2d241c');
      centerGrad.addColorStop(0.5, '#3b3025');
      centerGrad.addColorStop(0.78, '#2d241c');
      centerGrad.addColorStop(1.0, '#1e1913');
      ctx.fillStyle = centerGrad;
      ctx.fillRect(0, 0, size, size);

      // Embedded weathered dark stone pavers & natural flagstones along the middle band
      for (let i = 0; i < 42; i++) {
        const u = ((i * 137 + 29) % 440) + 36;
        const v = ((i * 97 + 53) % 270) + 121;
        const px = horizontal ? u : v;
        const py = horizontal ? v : u;
        const rw = 24 + (i % 4) * 10;
        const rh = 18 + ((i * 3) % 4) * 8;
        const shade = 44 + ((i * 17) % 18);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(((i % 7) - 3) * 0.14);
        ctx.fillStyle = `rgba(${shade + 6}, ${shade + 2}, ${shade - 4}, 0.58)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, rw * 0.5, rh * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(18, 14, 11, 0.45)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        bCtx.save();
        bCtx.translate(px, py);
        bCtx.rotate(((i % 7) - 3) * 0.14);
        bCtx.fillStyle = '#a8a8a8';
        bCtx.beginPath();
        bCtx.ellipse(0, 0, rw * 0.48, rh * 0.48, 0, 0, Math.PI * 2);
        bCtx.fill();
        bCtx.restore();
      }

      // Fine earthy gravel & dark soil grain
      for (let g = 0; g < 1600; g++) {
        const gx = (g * 197 + 13) % size;
        const gy = (g * 313 + 7) % size;
        const rad = 1 + (g % 3);
        ctx.fillStyle =
          g % 3 === 0 ? 'rgba(84, 72, 58, 0.30)' : 'rgba(18, 14, 10, 0.38)';
        ctx.fillRect(gx, gy, rad, rad);
      }

      // Soft alpha feather along both outer edges so the trail blends seamlessly into the dark earth
      ctx.globalCompositeOperation = 'destination-in';
      const alphaGrad = horizontal
        ? ctx.createLinearGradient(0, 0, 0, size)
        : ctx.createLinearGradient(0, 0, size, 0);
      alphaGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
      alphaGrad.addColorStop(0.18, 'rgba(0, 0, 0, 0.72)');
      alphaGrad.addColorStop(0.32, 'rgba(0, 0, 0, 0.96)');
      alphaGrad.addColorStop(0.68, 'rgba(0, 0, 0, 0.96)');
      alphaGrad.addColorStop(0.82, 'rgba(0, 0, 0, 0.72)');
      alphaGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = alphaGrad;
      ctx.fillRect(0, 0, size, size);
      ctx.globalCompositeOperation = 'source-over';

      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = horizontal ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
      map.wrapT = horizontal ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;

      const bumpMap = new THREE.CanvasTexture(bumpCanvas);
      bumpMap.wrapS = map.wrapS;
      bumpMap.wrapT = map.wrapT;

      return { map, bumpMap };
    };

    const horizTex = buildTrailTexture(true);
    horizTex.map.repeat.set(12, 1);
    horizTex.bumpMap.repeat.set(12, 1);
    const vertTex = buildTrailTexture(false);
    vertTex.map.repeat.set(1, 14);
    vertTex.bumpMap.repeat.set(1, 14);

    const makeMat = (tex: { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture }) =>
      new THREE.MeshStandardMaterial({
        map: tex.map,
        bumpMap: tex.bumpMap,
        bumpScale: 0.04,
        color: 0x8f8375,
        roughness: 0.95,
        metalness: 0.02,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });

    return {
      horizMat: makeMat(horizTex),
      vertMat: makeMat(vertTex),
    };
  };

  const { horizMat: trailHorizMat, vertMat: trailVertMat } = createEarthyTrailMaterials();
  const trailSegments: Array<[number, number, number, number, boolean]> = [
    [-38.8, 38.8, 35.8, 39.4, true], // South front cross-path outside Outer Iron Gate (z=34) linking road to West & East sides
    [-38.6, -34.8, -82.2, 39.2, false], // West side earthy stone/dirt path
    [34.8, 38.6, -82.2, 39.2, false], // East side earthy stone/dirt path
    [-38.8, 38.8, -82.4, -78.8, true], // North backyard trail curving behind the 36m x 30m enclosed well courtyard walls
  ];
  for (const [tminX, tmaxX, tminZ, tmaxZ, isHoriz] of trailSegments) {
    const tMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(tmaxX - tminX, tmaxZ - tminZ),
      isHoriz ? trailHorizMat : trailVertMat,
    );
    tMesh.rotation.x = -Math.PI / 2;
    tMesh.position.set(
      (tminX + tmaxX) * 0.5,
      isHoriz ? 0.011 : 0.013,
      (tminZ + tmaxZ) * 0.5,
    );
    tMesh.receiveShadow = true;
    root.add(tMesh);
  }

  // GROUND FLOOR SLABS (y = 0.0): Enlarged 38m x 33m Central Royal Darbar Atrium (+44% more open floor!), Rear Gallery & 6 Side-Wing Rooms (G1–G6)
  addFloorPatch(-19, 19, -23, 10, 0, tileFloorMat); // Massive 38m x 33m Open Central Royal Darbar Hall
  addFloorPatch(-19, 6.7, -46, -23, 0, stoneFloorMat); // Rear Ground Gallery West & Center
  addFloorPatch(6.7, 19, -34.0, -23, 0, stoneFloorMat); // East Rear Gallery south of Basement stairwell
  addFloorPatch(10.3, 19, -41.5, -34.0, 0, stoneFloorMat); // East Rear Gallery east of Basement stairwell
  addFloorPatch(6.7, 19, -46, -41.5, 0, stoneFloorMat); // East Rear Gallery north of Basement stairwell (leads to G6 doorway)
  addFloorPatch(-32, -19, -8.5, 10, 0, stoneFloorMat); // G1: Shahi Shastragar (Armory)
  addFloorPatch(-32, -19, -27.5, -8.5, 0, stoneFloorMat); // G2: Purani Rasoi & Anna-Kothi
  addFloorPatch(-32, -19, -46, -27.5, 0, tileFloorMat); // G5: Mehmaan Baithak
  addFloorPatch(19, 32, -8.5, 10, 0, woodFloorMat); // G3: Munim Record Room
  addFloorPatch(19, 32, -27.5, -8.5, 0, tileFloorMat); // G4: Prachin Pooja Ghar
  addFloorPatch(19, 32, -46, -27.5, 0, stoneFloorMat); // G6: Sevak Kaksh

  // SECOND FLOOR SLABS (y = +5.0): 4-Sided Wrap-Around Jharokha Balconies overlooking Enlarged Open Central Atrium (x: -15.2..15.2, z: -31.3..3.2) + 8 Rooms
  addFloorPatch(-32, -19, -8.5, 10, 5.0, woodFloorMat, 0.24); // F2-2: Thakur Saheb's Master Bedroom
  addFloorPatch(-32, -19, -27.5, -8.5, 5.0, tileFloorMat, 0.24); // F2-6: Royal Dining Room
  addFloorPatch(-32, -19, -46, -27.5, 5.0, woodFloorMat, 0.24); // F2-4: Sangeet Hall
  addFloorPatch(19, 32, -8.5, 10, 5.0, redOxideMat, 0.24); // F2-1: Rukmini's Suhaagraat Bridal Room
  addFloorPatch(19, 32, -27.5, -8.5, 5.0, redOxideMat, 0.24); // F2-5: Rani's Shringar Kaksh
  addFloorPatch(19, 32, -46, -27.5, 5.0, tileFloorMat, 0.24); // F2-3: Guest Suite 1
  addFloorPatch(-19, -15.2, -46, 10, 5.0, woodFloorMat, 0.24); // 2F West Wrap-Around Balcony (3.8m wide)
  addFloorPatch(15.2, 19, -46, 10, 5.0, woodFloorMat, 0.24); // 2F East Wrap-Around Balcony (3.8m wide)
  addFloorPatch(-15.2, 15.2, 3.2, 10, 5.0, woodFloorMat, 0.24); // 2F South Jharokha Balcony (z: 3.2..5.8) + 2 Front Suites (z: 5.8..10)
  addFloorPatch(-15.2, 15.2, -46, -31.3, 5.0, woodFloorMat, 0.24); // 2F North Rear Gallery (base of 2F->3F Grand Staircase)

  // THIRD FLOOR SLABS (y = +10.0): 4-Sided Wrap-Around Jharokha Balconies overlooking Enlarged Open Central Atrium (x: -15.2..15.2, z: -29.5..3.2) + 8 Rooms
  addFloorPatch(-32, -19, -8.5, 10, 10.0, woodFloorMat, 0.24); // F3-1: Tantrik Granth Library
  addFloorPatch(-32, -19, -27.5, -8.5, 10.0, stoneFloorMat, 0.24); // F3-5: Jyotish / Astrology Room
  addFloorPatch(-32, -19, -46, -27.5, 10.0, woodFloorMat, 0.24); // F3-3: Attic Store 1
  addFloorPatch(19, 32, -8.5, 10, 10.0, tileFloorMat, 0.24); // F3-2: Aaina Mahal
  addFloorPatch(19, 32, -27.5, -8.5, 10.0, woodFloorMat, 0.24); // F3-6: Old Doll / Toy Room
  addFloorPatch(19, 32, -46, -27.5, 10.0, stoneFloorMat, 0.24); // F3-4: Barsati Terrace Room
  addFloorPatch(-19, -15.2, -46, 10, 10.0, woodFloorMat, 0.24); // 3F West Wrap-Around Balcony (3.8m wide)
  addFloorPatch(15.2, 19, -46, 10, 10.0, woodFloorMat, 0.24); // 3F East Wrap-Around Balcony (3.8m wide)
  addFloorPatch(-15.2, 15.2, 3.2, 10, 10.0, woodFloorMat, 0.24); // 3F South Wrap-Around Balcony (z: 3.2..5.8) + 2 Front Watchtower Suites (z: 5.8..10)
  addFloorPatch(-15.2, 15.2, -34.5, -29.5, 10.0, woodFloorMat, 0.24); // 3F North Atrium Overlook Deck (5m deep)
  addFloorPatch(-15.2, -3.0, -42.5, -34.5, 10.0, woodFloorMat, 0.24); // 3F West Walkway flanking 2F->3F stairwell
  addFloorPatch(3.0, 15.2, -42.5, -34.5, 10.0, woodFloorMat, 0.24); // 3F East Walkway flanking 2F->3F stairwell
  addFloorPatch(-15.2, 15.2, -46, -42.5, 10.0, woodFloorMat, 0.24); // 3F North Stair Landing (3.5m wide turnaround)

  // GRAND ROYAL COFFERED CEILING ABOVE 3-STORY PALACE ATRIUM & SIDE WINGS (y = +17.0m)
  addFloorPatch(-32.2, 32.2, -46.2, 10.2, 17.0, woodFloorMat, 0.36);

  // Heavy Carved Teak Roof Beams & Coffered Atrium Medallion Vault at y = 16.72
  for (let z = -44; z <= 8; z += 4.0) {
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(64.0, 0.38, 0.38),
      woodMat,
    );
    beam.position.set(0, 16.72, z);
    root.add(beam);
  }
  [-19.0, -14.8, 14.8, 19.0].forEach((bx) => {
    const longBeam = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.4, 56.0),
      woodMat,
    );
    longBeam.position.set(bx, 16.7, -18.0);
    root.add(longBeam);
  });

  // 10-ROOM UNDERGROUND LABYRINTH STONE FLOOR & VAULTED CEILING (y = -4.5, ceiling y = -0.35)
  // Shifted ΔZ = -12.0m: spans x in [-28.5, 28.5], z in [-80.5, -41.6]
  addFloorPatch(-28.5, 28.5, -80.5, -41.6, -4.5, stoneFloorMat, 0.36);
  // Basement ceiling (leaves Ground Floor Basement stairwell cutout x: 6.7..10.3, z: -41.5..-34.0 open!)
  addFloorPatch(-28.5, 28.5, -80.5, -41.8, -0.35, stoneFloorMat, 0.26);

  // ==========================================================================
  // 2. GRAND DOUBLE-WING ROYAL STAIRCASE (GF->2F), UPPER STAIRCASE (2F->3F) & BASEMENT STAIRS
  // ==========================================================================
  const stairCarpetMat = new THREE.MeshStandardMaterial({
    color: 0x7c0e1c,
    emissive: 0x1e0306,
    emissiveIntensity: 0.22,
    roughness: 0.78,
    metalness: 0.06,
  });

  // A) GRAND DOUBLE-WING ROYAL STAIRCASE PUSHED BACK INTO REAR ATRIUM (starts z = -21.5, 31.5m from Front Door!)
  // A1) Central Lower Flight: GF (y = 0.0) -> Grand Mid Landing (y = 2.5), x in [-3.4, 3.4] (6.8m wide!), z from -21.5 to -27.0
  const lowerFlightSteps = 14;
  for (let i = 0; i < lowerFlightSteps; i++) {
    const t = (i + 0.5) / lowerFlightSteps;
    const sz = -21.5 - t * 5.5;
    const sy = t * 2.5;
    const stepMesh = new THREE.Mesh(
      new THREE.BoxGeometry(6.8, 0.24, 0.48),
      carvedSandstoneMat,
    );
    stepMesh.position.set(0, sy - 0.1, sz);
    stepMesh.castShadow = true;
    stepMesh.receiveShadow = true;
    root.add(stepMesh);

    // Crimson royal carpet runner + brass stair rod on each step
    const carpetStrip = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.03, 0.44),
      stairCarpetMat,
    );
    carpetStrip.position.set(0, sy + 0.03, sz);
    const stairRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 4.9, 8),
      brassMat,
    );
    stairRod.rotation.z = Math.PI / 2;
    stairRod.position.set(0, sy + 0.02, sz + 0.18);
    root.add(carpetStrip, stairRod);
  }
  // Inclined side balustrades & colliders for Central Lower Flight
  [-3.42, 3.42].forEach((bx) => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.96, 6.05),
      carvedSandstoneMat,
    );
    rail.position.set(bx, 1.72, -24.25);
    rail.rotation.x = Math.atan2(2.5, 5.5);
    root.add(rail);

    const newelPost = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 1.42, 0.48),
      carvedSandstoneMat,
    );
    newelPost.position.set(bx, 0.71, -21.45);
    const newelCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 10),
      brassMat,
    );
    newelCap.position.set(bx, 1.54, -21.45);
    root.add(newelPost, newelCap);

    wallColliders.push({
      minX: bx - 0.15,
      maxX: bx + 0.15,
      minZ: -27.0,
      maxZ: -21.35,
      minY: 0.0,
      maxY: 3.6,
    });
  });

  // A2) Grand Mid Landing (y = 2.5): x in [-3.8, 3.8], z in [-31.0, -27.0]
  addFloorPatch(-3.8, 3.8, -31.0, -27.0, 2.5, carvedSandstoneMat, 0.28);
  const landingCarpet = new THREE.Mesh(
    new THREE.BoxGeometry(6.2, 0.03, 3.2),
    stairCarpetMat,
  );
  landingCarpet.position.set(0, 2.515, -29.0);
  root.add(landingCarpet);

  // Masonry support enclosure strictly beneath Central Flight & Mid Landing (leaves x < -3.8 & x > +3.8 wide open on GF!)
  addWallSegment(-3.6, -31.0, 3.6, -31.0, 0.0, 2.5, 0.26, true);
  addWallSegment(-3.6, -31.0, -3.6, -27.0, 0.0, 2.5, 0.26, true);
  addWallSegment(3.6, -31.0, 3.6, -27.0, 0.0, 2.5, 0.26, true);
  // North parapet railing on Mid Landing (y = 2.5..3.6) so climbers cannot step off the back edge
  addWallSegment(-3.8, -31.0, 3.8, -31.0, 2.5, 1.08, 0.2, true);

  // A3) Left & Right Split Flights: Mid Landing (y = 2.5) -> 2F Wrap-Around Balconies (y = 5.0)
  // Left Wing: x from -3.8 to -15.2, z in [-31.0, -27.0]; Right Wing: x from +3.8 to +15.2, z in [-31.0, -27.0]
  const splitFlightSteps = 22;
  [-1, 1].forEach((dirSign) => {
    for (let i = 0; i < splitFlightSteps; i++) {
      const t = (i + 0.5) / splitFlightSteps;
      const sx = dirSign * (3.8 + t * 11.4);
      const sy = 2.5 + t * 2.5;
      const stepMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.58, 0.24, 4.0),
        carvedSandstoneMat,
      );
      stepMesh.position.set(sx, sy - 0.1, -29.0);
      stepMesh.castShadow = true;
      stepMesh.receiveShadow = true;
      root.add(stepMesh);

      const carpetStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.54, 0.03, 2.7),
        stairCarpetMat,
      );
      carpetStrip.position.set(sx, sy + 0.03, -29.0);
      root.add(carpetStrip);
    }

    // Sloped South & North balustrades flanking each Split Wing (minY = 2.5 so GF walkers pass cleanly underneath!)
    [-31.02, -26.98].forEach((bz) => {
      const wingRail = new THREE.Mesh(
        new THREE.BoxGeometry(11.8, 0.96, 0.22),
        carvedSandstoneMat,
      );
      wingRail.position.set(dirSign * 9.5, 4.22, bz);
      wingRail.rotation.z = dirSign * Math.atan2(2.5, 11.4);
      root.add(wingRail);

      wallColliders.push({
        minX: dirSign < 0 ? -15.2 : 3.8,
        maxX: dirSign < 0 ? -3.8 : 15.2,
        minZ: bz - 0.12,
        maxZ: bz + 0.12,
        minY: 2.5,
        maxY: 6.1,
      });
    });

    // Decorative sandstone arch support pillar under outer elbow of each split wing
    addCarvedPillar(dirSign * 15.0, 0.0, -31.05, 4.95);
  });

  // B) Upper Grand Staircase: 2F North Gallery (y = 5.0) <-> 3F North Landing (y = 10.0)
  //    x in [-3.0, 3.0] (6.0m wide!), z from -34.5 to -42.5 (8.0m run)
  const upperSteps = 22;
  for (let i = 0; i < upperSteps; i++) {
    const t = (i + 0.5) / upperSteps;
    const sz = -34.5 - t * 8.0;
    const sy = 5.0 + t * 5.0;
    const stepMesh = new THREE.Mesh(
      new THREE.BoxGeometry(6.0, 0.24, 0.44),
      carvedSandstoneMat,
    );
    stepMesh.position.set(0, sy - 0.1, sz);
    stepMesh.castShadow = true;
    stepMesh.receiveShadow = true;
    root.add(stepMesh);

    const carpetStrip = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, 0.03, 0.4),
      stairCarpetMat,
    );
    carpetStrip.position.set(0, sy + 0.03, sz);
    root.add(carpetStrip);
  }
  // Solid masonry backing under top end of 2F->3F staircase on 2F
  addWallSegment(-2.95, -42.5, 2.95, -42.5, 5.0, 3.4, 0.24, true);
  [-3.02, 3.02].forEach((bx) => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.96, 9.45),
      carvedSandstoneMat,
    );
    rail.position.set(bx, 7.95, -38.5);
    rail.rotation.x = Math.atan2(5.0, 8.0);
    root.add(rail);

    wallColliders.push({
      minX: bx - 0.12,
      maxX: bx + 0.12,
      minZ: -42.5,
      maxZ: -34.5,
      minY: 5.0,
      maxY: 11.1,
    });
  });

  // C) Descending Stone Staircase: GF (y = 0.0) <-> 10-Room Underground Basement (y = -4.5)
  //    East Rear GF Corridor: x in [6.8, 10.2] (3.4m wide!), z from -34.0 to -41.5 (7.5m run, shifted ΔZ = -12.0m)
  const baseSteps = 24;
  for (let i = 0; i < baseSteps; i++) {
    const t = (i + 0.5) / baseSteps;
    const sz = -34.0 - t * 7.5;
    const sy = -t * 4.5;
    const stepMesh = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.26, 0.42),
      carvedSandstoneMat,
    );
    stepMesh.position.set(8.5, sy - 0.1, sz);
    stepMesh.castShadow = true;
    stepMesh.receiveShadow = true;
    root.add(stepMesh);
  }
  // Basement stairwell west & east retaining walls below Ground Floor
  addWallSegment(6.7, -34.0, 6.7, -41.8, -4.5, 4.5, 0.24, true);
  addWallSegment(10.3, -34.0, 10.3, -44.5, -4.5, 4.5, 0.24, true);
  // Ground-floor stone parapet guardrails around the basement stairwell cutout (y = 0 to 1.08)
  addWallSegment(6.7, -34.0, 6.7, -41.5, 0.0, 1.08, 0.2, true);
  addWallSegment(6.7, -41.5, 10.3, -41.5, 0.0, 1.08, 0.2, true);

  // Open Underground Basement Entrance Archway on Ground Floor (x = 8.5, y = 0, z = -33.85)
  createDoorwayWithDoor({
    id: 'door_basement_entrance',
    nameHi: 'तहखाने की सीढ़ियाँ (Basement Stairs)',
    x: 8.5,
    yBottom: 0,
    z: -33.85,
    axis: 'x',
    width: 3.2,
    floorLevel: 0,
    initialOpen: true,
    autoCreak: false,
    archwayOnly: true,
  });

  // ==========================================================================
  // 3. GRAND 24m ROYAL FRONT FORECOURT, OUTER IRON GATE (z=34.0) & 64m FACADE
  // ==========================================================================

  // Outer Compound Iron Gate pushed 24.0 meters forward from Haveli Main Door (z = 10.0 -> z = 34.0)
  const createHaveliFrontIronGate = () => {
    const gateZ = 34.0;
    const gateW = 3.8;
    const gateH = 3.35;

    // Massive Carved Sandstone Gate Pillars on both sides of the Outer Compound Iron Gate
    [-2.35, 2.35].forEach((px) => {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 4.15, 0.92),
        carvedSandstoneMat,
      );
      pillar.position.set(px, 2.075, gateZ);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      root.add(pillar);

      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(1.18, 0.34, 1.18),
        carvedSandstoneMat,
      );
      cap.position.set(px, 4.24, gateZ);
      root.add(cap);

      const domeFinial = new THREE.Mesh(
        new THREE.SphereGeometry(0.38, 12, 10),
        carvedSandstoneMat,
      );
      domeFinial.position.set(px, 4.56, gateZ);
      root.add(domeFinial);

      const spire = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.32, 8),
        brassMat,
      );
      spire.position.set(px, 5.02, gateZ);
      root.add(spire);

      wallColliders.push({
        minX: px - 0.45,
        maxX: px + 0.45,
        minZ: gateZ - 0.45,
        maxZ: gateZ + 0.45,
        minY: 0,
        maxY: 4.5,
      });
    });

    // Grand Front Compound Boundary Walls spanning x = ±2.35 out to ±32.0 with weathered sandstone piers
    addWallSegment(-32.0, gateZ, -2.35, gateZ, 0, 2.6, 0.46, true);
    addWallSegment(2.35, gateZ, 32.0, gateZ, 0, 2.6, 0.46, true);
    // Solid continuous Forecourt West & East stone boundary walls (x = ±32.0, z: 10.0 -> 34.0)
    // Both side gaps are completely sealed with solid stone walls + colliders so the Outer Iron Gate is the ONLY entrance.
    [-32.0, 32.0].forEach((sx) => {
      addWallSegment(sx, 10.0, sx, gateZ, 0, 2.6, 0.46, true);
      // Carved sandstone coping cap running continuously along the top of each side boundary wall
      const sideCoping = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.16, gateZ - 10.0 + 0.4),
        carvedSandstoneMat,
      );
      sideCoping.position.set(sx, 2.66, (10.0 + gateZ) * 0.5);
      sideCoping.castShadow = true;
      sideCoping.receiveShadow = true;
      root.add(sideCoping);

      // Decorative sandstone piers along the sealed side boundary walls (z = 16, 22, 28)
      [16.0, 22.0, 28.0].forEach((pz) => {
        const sidePier = new THREE.Mesh(
          new THREE.BoxGeometry(0.74, 3.05, 0.74),
          carvedSandstoneMat,
        );
        sidePier.position.set(sx, 1.525, pz);
        sidePier.castShadow = true;
        sidePier.receiveShadow = true;
        const sideCap = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 10, 8),
          carvedSandstoneMat,
        );
        sideCap.position.set(sx, 3.2, pz);
        root.add(sidePier, sideCap);
        wallColliders.push({
          minX: sx - 0.42,
          maxX: sx + 0.42,
          minZ: pz - 0.42,
          maxZ: pz + 0.42,
          minY: 0,
          maxY: 3.3,
        });
      });
    });
    // Ornamental Sandstone Piers along the Front Boundary Wall
    [-32.0, -22.0, -12.0, 12.0, 22.0, 32.0].forEach((epx) => {
      const endPier = new THREE.Mesh(
        new THREE.BoxGeometry(0.76, 3.1, 0.76),
        carvedSandstoneMat,
      );
      endPier.position.set(epx, 1.55, gateZ);
      endPier.castShadow = true;
      root.add(endPier);
      const endCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.29, 10, 8),
        carvedSandstoneMat,
      );
      endCap.position.set(epx, 3.24, gateZ);
      root.add(endCap);
      wallColliders.push({
        minX: epx - 0.42,
        maxX: epx + 0.42,
        minZ: gateZ - 0.42,
        maxZ: gateZ + 0.42,
        minY: 0,
        maxY: 3.3,
      });
    });

    // Ornate wrought-iron & sandstone archway header above the Outer Compound Iron Gate
    const archHeader = buildRajasthaniCuspedArch(
      4.9,
      1.25,
      0.44,
      carvedSandstoneMat,
    );
    archHeader.position.set(0, 3.35, gateZ);
    root.add(archHeader);

    // Hinged wrought-iron gate pivot
    const pivot = new THREE.Group();
    pivot.position.set(-gateW * 0.5, 0, gateZ);

    const topRail = new THREE.Mesh(
      new THREE.BoxGeometry(gateW, 0.11, 0.11),
      ironMat,
    );
    topRail.position.set(gateW * 0.5, gateH - 0.16, 0);
    pivot.add(topRail);

    const midRail = new THREE.Mesh(
      new THREE.BoxGeometry(gateW, 0.09, 0.09),
      ironMat,
    );
    midRail.position.set(gateW * 0.5, 1.25, 0);
    pivot.add(midRail);

    const botRail = new THREE.Mesh(
      new THREE.BoxGeometry(gateW, 0.13, 0.11),
      ironMat,
    );
    botRail.position.set(gateW * 0.5, 0.22, 0);
    pivot.add(botRail);

    // Vertical iron bars across the hinged gate
    const numBars = 15;
    for (let i = 0; i < numBars; i++) {
      const bx = 0.12 + (i / (numBars - 1)) * (gateW - 0.24);
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.032, gateH, 8),
        ironMat,
      );
      bar.position.set(bx, gateH * 0.5, 0);
      pivot.add(bar);

      const finial = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 8, 8),
        brassMat,
      );
      finial.position.set(bx, gateH + 0.07, 0);
      pivot.add(finial);
    }

    // Simple unlatched iron handle ring
    const latchRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.085, 0.018, 8, 16),
      brassMat,
    );
    latchRing.position.set(gateW - 0.28, 1.25, 0.08);
    pivot.add(latchRing);

    const openAngle = Math.PI * 0.68;
    pivot.rotation.y = 0;
    root.add(pivot);

    doors.push({
      id: 'door_front_iron_gate',
      nameHi: 'बाहरी अहाते का लोहे का फाटक (Outer Gate)',
      pivot,
      position: new THREE.Vector3(0, 1.2, gateZ),
      floorY: 0,
      axis: 'x',
      doorWidth: gateW,
      initialOpen: false,
      isRoomDoor: false,
      isOpen: false,
      targetAngle: 0,
      currentAngle: 0,
      closedAngle: 0,
      openAngle,
      animFromAngle: 0,
      animToAngle: 0,
      animElapsed: 0,
      animDuration: 0.45,
      isAnimating: false,
      openProgress: 0,
      rattleOffset: 0,
      lockedUntilRelics: 0,
      autoCreak: false,
      nextAutoCreakTime: 999999,
      colliderBox: {
        minX: -1.95,
        maxX: 1.95,
        minZ: gateZ - 0.3,
        maxZ: gateZ + 0.3,
        floorLevel: 0,
      },
    });
  };
  createHaveliFrontIronGate();

  // GRAND 24m ROYAL FRONT FORECOURT ARCHITECTURE (z in [10.0, 34.0]):
  // 1) Carved Sandstone Walkway Kerbs along both sides of the 8.4m-wide Royal Processional Walkway
  [-4.35, 4.35].forEach((kx) => {
    const kerb = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.16, 23.6),
      carvedSandstoneMat,
    );
    kerb.position.set(kx, 0.08, 22.0);
    kerb.receiveShadow = true;
    root.add(kerb);
  });

  // 2) 8 Flickering Royal Forecourt Mashal Pillars (4 symmetrical pairs lining the 24m walkway)
  const forecourtFlameMat = new THREE.MeshBasicMaterial({ color: 0xffa634 });
  const forecourtInnerFlameMat = new THREE.MeshBasicMaterial({ color: 0xffefb0 });
  const forecourtMashalZ = [14.0, 19.5, 25.0, 30.5];
  for (let mi = 0; mi < forecourtMashalZ.length; mi++) {
    const mz = forecourtMashalZ[mi];
    for (const side of [-1, 1]) {
      const mx = side * 4.9;
      const mpGroup = new THREE.Group();
      mpGroup.position.set(mx, 0, mz);

      const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(0.76, 0.42, 0.76),
        carvedSandstoneMat,
      );
      plinth.position.y = 0.21;
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.25, 2.05, 8),
        carvedSandstoneMat,
      );
      shaft.position.y = 1.44;
      shaft.castShadow = true;
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.2, 0.62),
        carvedSandstoneMat,
      );
      cap.position.y = 2.52;
      const brazier = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.14, 0.26, 10),
        ironMat,
      );
      brazier.position.y = 2.75;
      const embers = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xff4200 }),
      );
      embers.scale.y = 0.45;
      embers.position.y = 2.86;
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.14, 0.42, 8),
        forecourtFlameMat,
      );
      flame.position.y = 3.06;
      const innerFlame = new THREE.Mesh(
        new THREE.ConeGeometry(0.075, 0.25, 6),
        forecourtInnerFlameMat,
      );
      innerFlame.position.y = 0.02;
      flame.add(innerFlame);

      mpGroup.add(plinth, shaft, cap, brazier, embers, flame);
      root.add(mpGroup);

      // Add warm flickering point lights on alternating pairs to bathe the 24m forecourt in royal torchlight
      let mLight: THREE.PointLight | undefined;
      if (!disableExtraLights && (mi === 0 || mi === 2 || (mi === 3 && side === 1))) {
        mLight = new THREE.PointLight(0xff8e36, 2.4, 15.5, 1.7);
        mLight.position.set(mx, 3.2, mz);
        root.add(mLight);
      }
      flickeringLights.push({
        light: mLight,
        flameMesh: flame,
        lanternGroup: mpGroup,
        baseIntensity: 2.35,
        baseColor: 0xff8e36,
        phase: mi * 1.9 + (side > 0 ? 0.8 : 2.3),
      });

      wallColliders.push({
        minX: mx - 0.4,
        maxX: mx + 0.4,
        minZ: mz - 0.4,
        maxZ: mz + 0.4,
        minY: 0,
        maxY: 3.1,
      });
    }
  }

  // 3) Symmetrical Weathered Royal Forecourt Garden Beds, Stone Benches & Dry Lotus Fountain
  const gardenSoilMat = new THREE.MeshStandardMaterial({
    color: 0x241d15,
    roughness: 0.98,
    metalness: 0.0,
  });
  const dryFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x26311d,
    roughness: 0.94,
    metalness: 0.0,
  });
  const forecourtGardenBeds: Array<[number, number, number, number]> = [
    [-24.0, -7.2, 13.0, 31.0], // West Forecourt Garden Court
    [7.2, 24.0, 13.0, 21.8], // East Forecourt North Garden Court (cleanly north of Guardhouse at z=26.5)
  ];
  for (const [gx1, gx2, gz1, gz2] of forecourtGardenBeds) {
    const gw = gx2 - gx1;
    const gd = gz2 - gz1;
    const gcx = (gx1 + gx2) * 0.5;
    const gcz = (gz1 + gz2) * 0.5;

    const soil = new THREE.Mesh(
      new THREE.BoxGeometry(gw - 0.5, 0.14, gd - 0.5),
      gardenSoilMat,
    );
    soil.position.set(gcx, 0.07, gcz);
    soil.receiveShadow = true;
    root.add(soil);

    // Low sandstone garden curb edging
    const northCurb = new THREE.Mesh(
      new THREE.BoxGeometry(gw, 0.24, 0.26),
      carvedSandstoneMat,
    );
    northCurb.position.set(gcx, 0.12, gz1);
    const southCurb = northCurb.clone();
    southCurb.position.set(gcx, 0.12, gz2);
    const westCurb = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.24, gd),
      carvedSandstoneMat,
    );
    westCurb.position.set(gx1, 0.12, gcz);
    const eastCurb = westCurb.clone();
    eastCurb.position.set(gx2, 0.12, gcz);
    root.add(northCurb, southCurb, westCurb, eastCurb);

    // Corner dry weathered shrubs inside each garden bed
    const shrubCorners: Array<[number, number]> = [
      [gx1 + 1.6, gz1 + 1.6],
      [gx2 - 1.6, gz1 + 1.6],
      [gx1 + 1.6, gz2 - 1.6],
      [gx2 - 1.6, gz2 - 1.6],
    ];
    for (const [sx, sz] of shrubCorners) {
      const bush = new THREE.Group();
      bush.position.set(sx, 0.15, sz);
      for (let b = 0; b < 4; b++) {
        const ang = (b / 4) * Math.PI * 2 + sx * 0.3;
        const puff = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.45 + (b % 2) * 0.16, 0),
          dryFoliageMat,
        );
        puff.position.set(Math.cos(ang) * 0.28, 0.34 + (b % 2) * 0.14, Math.sin(ang) * 0.28);
        puff.scale.y = 0.85;
        bush.add(puff);
      }
      root.add(bush);
      stormWeather.registerSwayBush(bush, sx * 0.7 + sz * 0.4);
    }
  }

  // Carved Stone Garden Benches flanking the Royal Forecourt walkway
  [
    [-6.1, 16.8, Math.PI / 2],
    [-6.1, 27.5, Math.PI / 2],
    [6.1, 16.8, -Math.PI / 2],
  ].forEach(([bx, bz, rotY]) => {
    const bench = new THREE.Group();
    bench.position.set(bx, 0, bz);
    bench.rotation.y = rotY;
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.14, 0.62),
      carvedSandstoneMat,
    );
    seat.position.y = 0.54;
    seat.castShadow = true;
    const legL = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.52, 0.54),
      carvedSandstoneMat,
    );
    legL.position.set(-0.78, 0.26, 0);
    const legR = legL.clone();
    legR.position.x = 0.78;
    bench.add(seat, legL, legR);
    root.add(bench);
    wallColliders.push({
      minX: bx - 0.38,
      maxX: bx + 0.38,
      minZ: bz - 1.08,
      maxZ: bz + 1.08,
      minY: 0,
      maxY: 0.75,
    });
  });

  // Flowing Royal Lotus Stone Fountain in West Forecourt Garden (-14.5, 0, 22.0)
  // Features recessed shimmering translucent water pools & rising/falling animated water-spray particle streams (फुहारा)
  const fountainGroup = new THREE.Group();
  fountainGroup.name = 'ForecourtFlowingFountain';
  fountainGroup.position.set(-14.5, 0, 22.0);

  // Hollow carved sandstone outer basin rim (12 curved wall segments so water sits inside a real stone basin)
  const fOuterWall = new THREE.Mesh(
    new THREE.CylinderGeometry(2.48, 2.66, 0.74, 16, 1, true),
    carvedSandstoneMat,
  );
  fOuterWall.position.y = 0.37;
  fOuterWall.castShadow = true;
  fOuterWall.receiveShadow = true;
  const fInnerWall = new THREE.Mesh(
    new THREE.CylinderGeometry(2.16, 2.16, 0.72, 16, 1, true),
    carvedSandstoneMat,
  );
  fInnerWall.position.y = 0.37;
  fInnerWall.material = carvedSandstoneMat.clone();
  fInnerWall.material.side = THREE.BackSide;
  const fBasinLip = new THREE.Mesh(
    new THREE.TorusGeometry(2.33, 0.19, 10, 24),
    carvedSandstoneMat,
  );
  fBasinLip.rotation.x = Math.PI / 2;
  fBasinLip.position.y = 0.72;
  fBasinLip.castShadow = true;
  const fInnerFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(2.18, 2.18, 0.16, 16),
    new THREE.MeshStandardMaterial({ color: 0x162d36, roughness: 0.78, metalness: 0.05 }),
  );
  fInnerFloor.position.y = 0.16;

  // Center stone pedestal, upper carved lotus bowl & top spout bud
  const fPedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.56, 1.48, 12),
    carvedSandstoneMat,
  );
  fPedestal.position.y = 1.02;
  const fLowerBowl = new THREE.Mesh(
    new THREE.CylinderGeometry(1.22, 0.44, 0.38, 16),
    carvedSandstoneMat,
  );
  fLowerBowl.position.y = 1.82;
  const fBowlRim = new THREE.Mesh(
    new THREE.TorusGeometry(1.17, 0.085, 8, 20),
    carvedSandstoneMat,
  );
  fBowlRim.rotation.x = Math.PI / 2;
  fBowlRim.position.y = 2.0;
  const fUpperStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.3, 0.78, 12),
    carvedSandstoneMat,
  );
  fUpperStem.position.y = 2.38;
  const fLotusBud = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 12, 10),
    carvedSandstoneMat,
  );
  fLotusBud.scale.set(1, 1.28, 1);
  fLotusBud.position.y = 2.92;
  const fNozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 0.18, 10),
    brassMat,
  );
  fNozzle.position.y = 3.24;

  // Procedural shimmering concentric water ripple texture
  const fountainWaterTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (ctx) {
      const bg = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
      bg.addColorStop(0, '#5ec8e5');
      bg.addColorStop(0.55, '#2b7c9c');
      bg.addColorStop(1, '#15445c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 256, 256);
      for (let r = 16; r < 126; r += 16) {
        ctx.strokeStyle = `rgba(185, 240, 255, ${0.26 - (r / 126) * 0.16})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(128, 128, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  })();

  const fountainWaterMat = new THREE.MeshStandardMaterial({
    map: fountainWaterTex,
    color: 0x72d4ee,
    emissive: 0x164d68,
    emissiveIntensity: 0.55,
    roughness: 0.08,
    metalness: 0.18,
    transparent: true,
    opacity: 0.8,
  });

  // Lower & Upper Shimmering Translucent Water Pools
  const fLowerWaterPool = new THREE.Mesh(
    new THREE.CircleGeometry(2.22, 24),
    fountainWaterMat,
  );
  fLowerWaterPool.rotation.x = -Math.PI / 2;
  fLowerWaterPool.position.y = 0.62;

  const fUpperWaterPool = new THREE.Mesh(
    new THREE.CircleGeometry(1.1, 20),
    fountainWaterMat,
  );
  fUpperWaterPool.rotation.x = -Math.PI / 2;
  fUpperWaterPool.position.y = 1.98;

  // Translucent cascading water sheet spilling from the upper lotus bowl rim into the lower basin
  const fountainVeilMat = new THREE.MeshBasicMaterial({
    color: 0xaef0ff,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const fCascadeVeil = new THREE.Mesh(
    new THREE.CylinderGeometry(1.16, 1.46, 1.34, 18, 1, true),
    fountainVeilMat,
  );
  fCascadeVeil.position.y = 1.31;

  // Expanding concentric splash ripple rings on the lower basin water surface
  const fountainRippleRings: THREE.Mesh[] = [];
  for (let ri = 0; ri < 3; ri++) {
    const rMat = new THREE.MeshBasicMaterial({
      color: 0xcff8ff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.27, 24), rMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.635 + ri * 0.002;
    fountainGroup.add(ring);
    fountainRippleRings.push(ring);
  }

  // Animated Water-Spray Particle Streams (फुहारा):
  // 140 upper crown jet + 8 parabolic radial arc streams + 120 spilling bowl-to-basin waterfall droplets
  const FOUNTAIN_PARTICLE_COUNT = 260;
  const fountainPositions = new Float32Array(FOUNTAIN_PARTICLE_COUNT * 3);
  const fountainParticleMeta = new Float32Array(FOUNTAIN_PARTICLE_COUNT * 4); // [phase, angle, tier(0=crown,1=topArc,2=cascade), speed]
  for (let pi = 0; pi < FOUNTAIN_PARTICLE_COUNT; pi++) {
    const phase = (pi / FOUNTAIN_PARTICLE_COUNT + Math.random() * 0.15) % 1;
    let tier = 1;
    let angle = 0;
    let speed = 0.72 + Math.random() * 0.22;
    if (pi < 40) {
      // Central shimmering vertical plume shooting upward from the top nozzle
      tier = 0;
      angle = Math.random() * Math.PI * 2;
      speed = 0.85 + Math.random() * 0.2;
    } else if (pi < 140) {
      // 8 symmetrical arcing streams spraying from the lotus bud into the upper bowl
      tier = 1;
      const streamIdx = (pi - 40) % 8;
      angle = (streamIdx / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.08;
      speed = 0.74 + Math.random() * 0.12;
    } else {
      // 12 graceful cascading streams pouring over the upper bowl lip into the lower basin
      tier = 2;
      const spillIdx = (pi - 140) % 12;
      angle = (spillIdx / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.14;
      speed = 0.82 + Math.random() * 0.18;
    }
    fountainParticleMeta[pi * 4 + 0] = phase;
    fountainParticleMeta[pi * 4 + 1] = angle;
    fountainParticleMeta[pi * 4 + 2] = tier;
    fountainParticleMeta[pi * 4 + 3] = speed;
  }

  const fountainDropTex = (() => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
      grad.addColorStop(0, 'rgba(235, 252, 255, 1.0)');
      grad.addColorStop(0.45, 'rgba(135, 224, 252, 0.82)');
      grad.addColorStop(1, 'rgba(70, 175, 220, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();

  const fountainParticleGeo = new THREE.BufferGeometry();
  fountainParticleGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(fountainPositions, 3),
  );
  const fountainParticleMat = new THREE.PointsMaterial({
    map: fountainDropTex,
    color: 0xc2f4ff,
    size: 0.22,
    transparent: true,
    opacity: 0.86,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const fountainSprayPoints = new THREE.Points(
    fountainParticleGeo,
    fountainParticleMat,
  );
  fountainSprayPoints.frustumCulled = false;

  // Soft moonlit aqua glow illuminating the flowing fountain water & spray at night
  let fountainGlowLight: THREE.PointLight | null = null;
  if (!disableExtraLights) {
    fountainGlowLight = new THREE.PointLight(0x6ad6ff, 1.6, 10.5, 1.7);
    fountainGlowLight.position.set(0, 2.35, 0);
    decorativeDynamicLights.push(fountainGlowLight);
    fountainGroup.add(fountainGlowLight);
  }

  fountainGroup.add(
    fOuterWall,
    fInnerWall,
    fBasinLip,
    fInnerFloor,
    fPedestal,
    fLowerBowl,
    fBowlRim,
    fUpperStem,
    fLotusBud,
    fNozzle,
    fLowerWaterPool,
    fUpperWaterPool,
    fCascadeVeil,
    fountainSprayPoints,
  );
  root.add(fountainGroup);
  wallColliders.push({
    minX: -17.1,
    maxX: -11.9,
    minZ: 19.4,
    maxZ: 24.6,
    minY: 0,
    maxY: 2.2,
  });

  // ==========================================================================
  // TRADITIONAL STONE SHIVA TEMPLE (शिव जी का मंदिर) ON EAST FORECOURT (13.2, 0, 27.2)
  // Replaces the old wooden key shack with a grand stone temple with carved Shikhar spire,
  // carved stone pillars, sacred Shivling, brass Trishul, flickering oil diyas, and the
  // glowing Haveli Entrance Key placed on an offering pedestal right in front of the temple!
  // ==========================================================================
  const guardhouseGroup = new THREE.Group();
  guardhouseGroup.name = 'CourtyardShivaTemple';
  guardhouseGroup.position.set(13.2, 0, 27.2);
  root.add(guardhouseGroup);

  // Flagstone processional walkway spur connecting Royal Walkway (x = 4.2) straight to Shiva Temple steps (x = 10.2)
  addFloorPatch(4.2, 10.5, 25.4, 29.0, 0.016, stoneFloorMat, 0.14);

  const templeStoneMat = carvedSandstoneMat;
  const templeDarkStoneMat = new THREE.MeshStandardMaterial({
    color: 0x4b3f35,
    roughness: 0.82,
    metalness: 0.06,
  });
  const shivlingGraniteMat = new THREE.MeshStandardMaterial({
    color: 0x16171a,
    roughness: 0.18,
    metalness: 0.22,
  });
  const sacredBrassMat = new THREE.MeshStandardMaterial({
    color: 0xe3b848,
    emissive: 0x452c04,
    emissiveIntensity: 0.25,
    roughness: 0.22,
    metalness: 0.9,
  });
  const saffronFlagMat = new THREE.MeshStandardMaterial({
    color: 0xff6a14,
    emissive: 0x7a2400,
    emissiveIntensity: 0.32,
    roughness: 0.68,
    side: THREE.DoubleSide,
  });
  const clayDiyaMat = new THREE.MeshStandardMaterial({
    color: 0x8f4624,
    roughness: 0.85,
  });

  // 1) Stepped Stone Jagati Platform (5.6m x 5.6m) & West Entrance Stairs facing the walkway
  const jagatiTier1 = new THREE.Mesh(
    new THREE.BoxGeometry(5.6, 0.26, 5.6),
    templeDarkStoneMat,
  );
  jagatiTier1.position.set(0, 0.13, 0);
  jagatiTier1.receiveShadow = true;
  jagatiTier1.castShadow = true;
  const jagatiTier2 = new THREE.Mesh(
    new THREE.BoxGeometry(4.9, 0.28, 4.9),
    templeStoneMat,
  );
  jagatiTier2.position.set(0.15, 0.4, 0);
  jagatiTier2.receiveShadow = true;
  jagatiTier2.castShadow = true;
  guardhouseGroup.add(jagatiTier1, jagatiTier2);

  // Carved stone steps on the West face (-X) leading up into the open temple mandapa
  for (let st = 0; st < 3; st++) {
    const stepMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.18, 2.35),
      templeStoneMat,
    );
    stepMesh.position.set(-2.95 + st * 0.36, 0.09 + st * 0.16, 0);
    stepMesh.receiveShadow = true;
    guardhouseGroup.add(stepMesh);
  }

  // 2) Sanctum (Garbhagriha) Back & Side Stone Walls (East, North, South — wide open on West face)
  const sanctumBackWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 3.05, 3.6),
    templeStoneMat,
  );
  sanctumBackWall.position.set(1.98, 2.05, 0);
  sanctumBackWall.castShadow = true;
  sanctumBackWall.receiveShadow = true;

  const sanctumNorthWall = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 3.05, 0.34),
    templeStoneMat,
  );
  sanctumNorthWall.position.set(0.95, 2.05, -1.72);
  sanctumNorthWall.castShadow = true;

  const sanctumSouthWall = sanctumNorthWall.clone();
  sanctumSouthWall.position.set(0.95, 2.05, 1.72);
  guardhouseGroup.add(sanctumBackWall, sanctumNorthWall, sanctumSouthWall);

  // 3) 8 Carved Stone Pillars (4 Sanctum + 4 Front Mandapa Porch) with bases, shafts & bracket capitals
  const templePillarCoords: Array<[number, number]> = [
    [-2.0, -1.75],
    [-2.0, 1.75],
    [-2.0, -0.82],
    [-2.0, 0.82],
    [-0.25, -1.75],
    [-0.25, 1.75],
    [1.82, -1.75],
    [1.82, 1.75],
  ];
  for (const [px, pz] of templePillarCoords) {
    const pBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.28, 0.44),
      templeDarkStoneMat,
    );
    pBase.position.set(px, 0.68, pz);
    const pShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.145, 0.175, 2.48, 8),
      templeStoneMat,
    );
    pShaft.position.set(px, 2.04, pz);
    pShaft.castShadow = true;
    const pCapital = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.24, 0.48),
      templeStoneMat,
    );
    pCapital.position.set(px, 3.36, pz);
    guardhouseGroup.add(pBase, pShaft, pCapital);
  }

  // Carved stone Rajasthani archways framing the front West temple entrance & side porch bays
  const frontTempleArch = buildRajasthaniCuspedArch(
    1.72,
    2.78,
    0.34,
    templeStoneMat,
  );
  frontTempleArch.rotation.y = Math.PI / 2;
  frontTempleArch.position.set(-2.0, 0.56, 0);
  guardhouseGroup.add(frontTempleArch);

  // Stone entablature roof cornice over both Mandapa & Garbhagriha
  const roofCornice = new THREE.Mesh(
    new THREE.BoxGeometry(4.85, 0.34, 4.45),
    templeStoneMat,
  );
  roofCornice.position.set(0.05, 3.62, 0);
  roofCornice.castShadow = true;
  guardhouseGroup.add(roofCornice);

  // 4) Traditional Multi-Tiered Nagara Domed Spire (Shikhar / शिखर) + Amalaka + Brass Kalash + Saffron Flag
  const shikharCenterX = 0.82;
  const shikharTiers: Array<{ w: number; h: number; y: number }> = [
    { w: 3.15, h: 0.65, y: 4.1 },
    { w: 2.68, h: 0.65, y: 4.72 },
    { w: 2.18, h: 0.62, y: 5.32 },
    { w: 1.66, h: 0.58, y: 5.88 },
    { w: 1.15, h: 0.52, y: 6.38 },
  ];
  for (const tier of shikharTiers) {
    const block = new THREE.Mesh(
      new THREE.CylinderGeometry(
        tier.w * 0.46,
        tier.w * 0.56,
        tier.h,
        8,
      ),
      templeStoneMat,
    );
    block.rotation.y = Math.PI / 8;
    block.position.set(shikharCenterX, tier.y, 0);
    block.castShadow = true;
    guardhouseGroup.add(block);

    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(
        tier.w * 0.58,
        tier.w * 0.58,
        0.09,
        8,
      ),
      templeDarkStoneMat,
    );
    band.rotation.y = Math.PI / 8;
    band.position.set(shikharCenterX, tier.y - tier.h * 0.42, 0);
    guardhouseGroup.add(band);
  }
  // 4 Miniature Urushringa corner spirelets flanking the main Shikhar
  for (const [ux, uz] of [
    [-1.1, -1.1],
    [-1.1, 1.1],
    [1.1, -1.1],
    [1.1, 1.1],
  ]) {
    const miniSpire = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 1.35, 8),
      templeStoneMat,
    );
    miniSpire.position.set(shikharCenterX + ux, 4.45, uz);
    guardhouseGroup.add(miniSpire);
  }
  // Ribbed stone Amalaka crown & gleaming Brass Kalash finial atop the Shikhar
  const amalaka = new THREE.Mesh(
    new THREE.TorusGeometry(0.46, 0.16, 10, 16),
    templeStoneMat,
  );
  amalaka.rotation.x = Math.PI / 2;
  amalaka.position.set(shikharCenterX, 6.76, 0);
  const kalashPot = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 12, 10),
    sacredBrassMat,
  );
  kalashPot.scale.set(1, 1.3, 1);
  kalashPot.position.set(shikharCenterX, 7.1, 0);
  const kalashTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.38, 10),
    sacredBrassMat,
  );
  kalashTip.position.set(shikharCenterX, 7.46, 0);
  guardhouseGroup.add(amalaka, kalashPot, kalashTip);

  // Saffron Temple Flag (भगवा ध्वज) fluttering from the Shikhar
  const flagPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.032, 1.65, 8),
    sacredBrassMat,
  );
  flagPole.position.set(shikharCenterX + 0.36, 7.35, 0);
  flagPole.rotation.z = -0.14;
  const templeFlagShape = new THREE.Shape();
  templeFlagShape.moveTo(0, 0);
  templeFlagShape.lineTo(1.05, 0.24);
  templeFlagShape.lineTo(0, 0.52);
  templeFlagShape.closePath();
  const shivaTempleFlag = new THREE.Mesh(
    new THREE.ShapeGeometry(templeFlagShape),
    saffronFlagMat,
  );
  shivaTempleFlag.position.set(shikharCenterX + 0.45, 7.62, 0);
  guardhouseGroup.add(flagPole, shivaTempleFlag);

  // Stepped pyramidal Mandapa porch dome over the front entrance bay
  const mandapaDome1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.92, 1.38, 0.55, 8),
    templeStoneMat,
  );
  mandapaDome1.rotation.y = Math.PI / 8;
  mandapaDome1.position.set(-1.12, 4.06, 0);
  const mandapaDome2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.88, 0.48, 8),
    templeStoneMat,
  );
  mandapaDome2.rotation.y = Math.PI / 8;
  mandapaDome2.position.set(-1.12, 4.54, 0);
  const mandapaKalash = new THREE.Mesh(
    new THREE.ConeGeometry(0.11, 0.34, 8),
    sacredBrassMat,
  );
  mandapaKalash.position.set(-1.12, 4.94, 0);
  guardhouseGroup.add(mandapaDome1, mandapaDome2, mandapaKalash);

  // 5) Sacred Garbhagriha Interior: Black-Granite Shivling, Yoni Peeth, Garland, Jaladhari, Brass Trishul & Temple Bell
  const shivlingAltar = new THREE.Group();
  shivlingAltar.position.set(0.72, 0.54, 0);

  const yoniBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.72, 0.28, 16),
    shivlingGraniteMat,
  );
  yoniBase.position.y = 0.14;
  const yoniRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.56, 0.08, 10, 20),
    shivlingGraniteMat,
  );
  yoniRim.rotation.x = Math.PI / 2;
  yoniRim.position.y = 0.28;
  // Traditional Jalhari spout extending North (-Z)
  const yoniSpout = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.14, 0.62),
    shivlingGraniteMat,
  );
  yoniSpout.position.set(0, 0.24, -0.68);
  // Glossy black-granite Lingam shaft + rounded dome top
  const lingamShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.26, 0.62, 18),
    shivlingGraniteMat,
  );
  lingamShaft.position.y = 0.58;
  const lingamCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 18, 14),
    shivlingGraniteMat,
  );
  lingamCap.position.y = 0.89;
  // Sacred white Vibhuti Tripundra (3 horizontal marks) & vermilion red Tilak dot facing West (-X)
  const tripundraMat = new THREE.MeshBasicMaterial({ color: 0xf6f3ea });
  for (let ti = 0; ti < 3; ti++) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.022, 0.22),
      tripundraMat,
    );
    bar.position.set(-0.242, 0.76 - ti * 0.055, 0);
    shivlingAltar.add(bar);
  }
  const tilakDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xd92121 }),
  );
  tilakDot.position.set(-0.248, 0.705, 0);
  // Marigold flower garland ring draped around the Shivling base
  const garlandRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.29, 0.055, 8, 18),
    new THREE.MeshStandardMaterial({ color: 0xff9214, roughness: 0.72 }),
  );
  garlandRing.rotation.x = Math.PI / 2;
  garlandRing.position.y = 0.34;
  // Suspended brass Jaladhari drip vessel hanging above the Shivling
  const jalChain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 1.32, 6),
    sacredBrassMat,
  );
  jalChain.position.y = 2.38;
  const jalPot = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 10),
    sacredBrassMat,
  );
  jalPot.position.y = 1.66;
  shivlingAltar.add(
    yoniBase,
    yoniRim,
    yoniSpout,
    lingamShaft,
    lingamCap,
    tilakDot,
    garlandRing,
    jalChain,
    jalPot,
  );
  guardhouseGroup.add(shivlingAltar);

  // Gleaming Brass Trishul (त्रिशूल) with Damaru standing upright beside the Shivling
  const trishulGroup = new THREE.Group();
  trishulGroup.position.set(1.22, 0.54, -0.92);
  const tShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.032, 2.25, 10),
    sacredBrassMat,
  );
  tShaft.position.y = 1.125;
  const tCenterBlade = new THREE.Mesh(
    new THREE.ConeGeometry(0.06, 0.48, 8),
    sacredBrassMat,
  );
  tCenterBlade.position.y = 2.48;
  const tCrossbar = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.026, 8, 16, Math.PI),
    sacredBrassMat,
  );
  tCrossbar.rotation.z = Math.PI;
  tCrossbar.position.y = 2.24;
  const tLeftProng = new THREE.Mesh(
    new THREE.ConeGeometry(0.036, 0.32, 8),
    sacredBrassMat,
  );
  tLeftProng.position.set(-0.22, 2.38, 0);
  tLeftProng.rotation.z = 0.14;
  const tRightProng = new THREE.Mesh(
    new THREE.ConeGeometry(0.036, 0.32, 8),
    sacredBrassMat,
  );
  tRightProng.position.set(0.22, 2.38, 0);
  tRightProng.rotation.z = -0.14;
  // Miniature Damaru hourglass tied below the trident fork
  const damaruTop = new THREE.Mesh(
    new THREE.ConeGeometry(0.075, 0.11, 10),
    new THREE.MeshStandardMaterial({ color: 0x7c3b18, roughness: 0.6 }),
  );
  damaruTop.rotation.z = Math.PI / 2;
  damaruTop.position.set(0.08, 1.86, 0.05);
  const damaruBot = damaruTop.clone();
  damaruBot.rotation.z = -Math.PI / 2;
  damaruBot.position.set(0.18, 1.86, 0.05);
  trishulGroup.add(
    tShaft,
    tCenterBlade,
    tCrossbar,
    tLeftProng,
    tRightProng,
    damaruTop,
    damaruBot,
  );
  trishulGroup.rotation.y = Math.PI / 2;
  guardhouseGroup.add(trishulGroup);

  // Hanging Brass Temple Bell (घंटी) in the West Mandapa entrance archway
  const bellRod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.72, 6),
    sacredBrassMat,
  );
  bellRod.position.set(-1.35, 3.08, 0);
  const bellBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.16, 0.24, 12),
    sacredBrassMat,
  );
  bellBody.position.set(-1.35, 2.64, 0);
  guardhouseGroup.add(bellRod, bellBody);

  // 6) 4 Flickering Clay Oil Diyas (मिट्टी के दीये) inside the sanctum & on the front entrance steps
  const diyaFlameMat = new THREE.MeshBasicMaterial({ color: 0xffb838 });
  const diyaCoords: Array<[number, number, number, boolean]> = [
    [0.05, 0.56, -0.52, true], // Sanctum left of Shivling (with warm PointLight)
    [0.05, 0.56, 0.52, false], // Sanctum right of Shivling
    [-2.42, 0.44, -1.02, false], // Entrance step North diya
    [-2.42, 0.44, 1.02, true], // Entrance step South diya (with warm PointLight)
  ];
  diyaCoords.forEach(([dx, dy, dz, hasLight], di) => {
    const diyaGroup = new THREE.Group();
    diyaGroup.position.set(dx, dy, dz);
    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.06, 0.06, 10),
      clayDiyaMat,
    );
    bowl.position.y = 0.03;
    const oilGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.015, 10),
      new THREE.MeshBasicMaterial({ color: 0xff7a1a }),
    );
    oilGlow.position.y = 0.062;
    const dFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.042, 0.16, 8),
      diyaFlameMat,
    );
    dFlame.position.y = 0.15;
    diyaGroup.add(bowl, oilGlow, dFlame);
    guardhouseGroup.add(diyaGroup);

    let dLight: THREE.PointLight | undefined;
    if (hasLight && !disableExtraLights) {
      dLight = new THREE.PointLight(0xffa63d, 3.6, 14.5, 1.6);
      dLight.position.set(13.2 + dx, dy + 0.55, 27.2 + dz);
      root.add(dLight);
    }
    flickeringLights.push({
      light: dLight,
      flameMesh: dFlame,
      lanternGroup: diyaGroup,
      baseIntensity: 3.5,
      baseColor: 0xffa842,
      phase: 3.2 + di * 1.4,
    });
  });

  // Dedicated warm golden overhead temple light bathing the Shivling & front Key Pedestal
  if (!disableExtraLights) {
    const templeKeySpotlight = new THREE.PointLight(0xffbd55, 3.8, 15.0, 1.5);
    templeKeySpotlight.position.set(10.6, 2.75, 27.2);
    root.add(templeKeySpotlight);
    decorativeDynamicLights.push(templeKeySpotlight);
  }

  // 7) Carved Stone Offering Pedestal & Brass Thali RIGHT IN FRONT of the Shiva Temple for the Glowing Haveli Entrance Key
  const keyPedestalGroup = new THREE.Group();
  keyPedestalGroup.position.set(-3.65, 0, 0); // World-local (9.55, 0, 27.2) right in front of the Shiva Temple steps!
  const kpBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.18, 0.76),
    templeDarkStoneMat,
  );
  kpBase.position.y = 0.09;
  const kpShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.26, 0.62, 8),
    templeStoneMat,
  );
  kpShaft.position.y = 0.49;
  const kpTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.12, 0.68),
    templeStoneMat,
  );
  kpTop.position.y = 0.84;
  const brassThali = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.23, 0.04, 16),
    sacredBrassMat,
  );
  brassThali.position.y = 0.92;
  keyPedestalGroup.add(kpBase, kpShaft, kpTop, brassThali);
  guardhouseGroup.add(keyPedestalGroup);

  // Clean colliders for the Shiva Temple's solid walls & back/side platform so players can walk right up to the front steps & key pedestal
  wallColliders.push(
    { minX: 14.95, maxX: 15.65, minZ: 25.1, maxZ: 29.3, minY: 0, maxY: 4.5 }, // East back sanctum wall
    { minX: 12.7, maxX: 15.65, minZ: 25.1, maxZ: 25.75, minY: 0, maxY: 4.5 }, // North sanctum wall
    { minX: 12.7, maxX: 15.65, minZ: 28.65, maxZ: 29.3, minY: 0, maxY: 4.5 }, // South sanctum wall
    { minX: 13.15, maxX: 14.65, minZ: 26.45, maxZ: 27.95, minY: 0, maxY: 2.2 }, // Shivling altar collider
    { minX: 9.22, maxX: 9.88, minZ: 26.86, maxZ: 27.54, minY: 0, maxY: 1.0 }, // Front key pedestal collider
  );

  // Ornate 3D Antique-Gold Haveli Entrance Key (हवेली प्रवेश चाबी) glowing right in front of the Shiva Temple!
  const mansionKeyGroup = new THREE.Group();
  mansionKeyGroup.name = 'MansionFrontDoorKey';
  mansionKeyGroup.position.set(9.55, 0.98, 27.2);
  root.add(mansionKeyGroup);

  const masterKeyMat = new THREE.MeshStandardMaterial({
    color: 0xe0b240,
    emissive: 0xffba32,
    emissiveIntensity: 0.52,
    roughness: 0.24,
    metalness: 0.88,
  });

  const keyBow = new THREE.Mesh(
    new THREE.TorusGeometry(0.085, 0.02, 10, 24),
    masterKeyMat,
  );
  keyBow.rotation.x = Math.PI / 2;
  keyBow.position.set(0, 0, -0.14);
  mansionKeyGroup.add(keyBow);

  const keyCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.035, 12),
    masterKeyMat,
  );
  keyCollar.rotation.x = Math.PI / 2;
  keyCollar.position.set(0, 0, -0.045);
  mansionKeyGroup.add(keyCollar);

  const keyShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 0.26, 12),
    masterKeyMat,
  );
  keyShaft.rotation.x = Math.PI / 2;
  keyShaft.position.set(0, 0, 0.08);
  mansionKeyGroup.add(keyShaft);

  const keyBit1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.075, 0.018, 0.036),
    masterKeyMat,
  );
  keyBit1.position.set(0.038, 0, 0.16);
  const keyBit2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.018, 0.028),
    masterKeyMat,
  );
  keyBit2.position.set(0.03, 0, 0.11);
  mansionKeyGroup.add(keyBit1, keyBit2);

  const masterKeyGlow = attachProximityGlow({
    group: mansionKeyGroup,
    targetMaterials: [masterKeyMat],
    theme: 'key',
    phaseOffset: 0.65,
  });

  // --- GROUND FLOOR SOUTH FACADE (64m wide: x in [-32, 32], y = 0 to 5.0) ---
  addWallSegment(-32, 10, -1.75, 10, 0, 5.0);
  addWallSegment(1.75, 10, 32, 10, 0, 5.0);
  createDoorwayWithDoor({
    id: 'door_main_entrance',
    nameHi: 'हवेली का मुख्य शाही दरवाज़ा (Main Palace Door)',
    x: 0,
    yBottom: 0,
    z: 10,
    axis: 'x',
    width: 3.4,
    floorLevel: 0,
    initialOpen: false,
    autoCreak: false,
  });

  // ==========================================================================
  // 3B. GRAND 3-STORY RAJASTHANI ROYAL PALACE EXTERIOR FACADE (64m x 56m x 17m)
  // ==========================================================================
  const buildGrandRajasthaniHaveliFacade = () => {
    const facadeGroup = new THREE.Group();
    facadeGroup.name = 'GrandRajasthaniHaveliFacade';

    // 1. GRAND ARCHED MAIN ENTRANCE DOORWAY (Royal Pol Portal at x=0, z=10.34)
    const grandPolPortal = buildRajasthaniCuspedArch(
      5.2,
      4.85,
      0.78,
      carvedSandstoneMat,
    );
    grandPolPortal.position.set(0, 0, 10.34);
    facadeGroup.add(grandPolPortal);

    // Projecting sloped Sandstone Chhajja eaves across 2F (4.92m), 3F (9.92m) & Roofline (16.92m)
    [4.92, 9.92, 16.92].forEach((cy) => {
      const chhajjaWest = new THREE.Mesh(
        new THREE.BoxGeometry(29.6, 0.18, 0.96),
        carvedSandstoneMat,
      );
      chhajjaWest.position.set(-17.2, cy, 10.52);
      chhajjaWest.rotation.x = 0.22;
      chhajjaWest.castShadow = true;
      facadeGroup.add(chhajjaWest);

      const chhajjaEast = new THREE.Mesh(
        new THREE.BoxGeometry(29.6, 0.18, 0.96),
        carvedSandstoneMat,
      );
      chhajjaEast.position.set(17.2, cy, 10.52);
      chhajjaEast.rotation.x = 0.22;
      chhajjaEast.castShadow = true;
      facadeGroup.add(chhajjaEast);

      for (let bx = -30.5; bx <= 30.5; bx += 2.5) {
        if (Math.abs(bx) < 2.6 && cy < 5.5) continue;
        const bracket = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.36, 0.58),
          carvedSandstoneMat,
        );
        bracket.position.set(bx, cy - 0.22, 10.36);
        bracket.rotation.x = -0.35;
        facadeGroup.add(bracket);
      }
    });

    // 2. GROUND-FLOOR WEATHERED SANDSTONE ARCHED VERANDA ARCADE (64m wide facade)
    const arcadeBayCenters = [
      -28.4, -24.0, -19.6, -15.2, -10.8, -5.8, 5.8, 10.8, 15.2, 19.6, 24.0, 28.4,
    ];
    arcadeBayCenters.forEach((bx) => {
      const verandaArch = buildRajasthaniCuspedArch(
        3.9,
        4.35,
        0.5,
        carvedSandstoneMat,
      );
      verandaArch.position.set(bx, 0, 10.52);
      facadeGroup.add(verandaArch);
    });

    // 2F & 3F blind cusped sandstone arches between the projecting Jharokhas
    [5.0, 10.0].forEach((fy) => {
      [-28.5, -18.5, -6.2, 6.2, 18.5, 28.5].forEach((ubx) => {
        const upperArch = buildRajasthaniCuspedArch(
          3.4,
          4.0,
          0.38,
          carvedSandstoneMat,
        );
        upperArch.position.set(ubx, fy, 10.24);
        facadeGroup.add(upperArch);
      });
    });

    // 3. PROJECTING JHAROKHA BALCONIES ON BOTH 2F (y=5.0) AND 3F (y=10.0)
    const buildProjectingJharokha = (jx: number, baseY: number, width = 3.6) => {
      const jGroup = new THREE.Group();
      jGroup.position.set(jx, baseY, 10.8);

      [-width * 0.36, 0, width * 0.36].forEach((cx) => {
        const corbel1 = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 0.44, 0.96),
          carvedSandstoneMat,
        );
        corbel1.position.set(cx, -0.24, -0.12);
        const corbel2 = new THREE.Mesh(
          new THREE.BoxGeometry(0.26, 0.38, 0.66),
          carvedSandstoneMat,
        );
        corbel2.position.set(cx, -0.58, -0.26);
        jGroup.add(corbel1, corbel2);
      });

      const floorSlab = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.24, 1.18),
        carvedSandstoneMat,
      );
      floorSlab.position.set(0, 0.08, 0);
      floorSlab.castShadow = true;
      jGroup.add(floorSlab);

      const frontBalustrade = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.96, 0.14),
        carvedSandstoneMat,
      );
      frontBalustrade.position.set(0, 0.64, 0.52);
      jGroup.add(frontBalustrade);

      for (let i = -4; i <= 4; i++) {
        const jaliStile = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 1.55, 0.09),
          woodMat,
        );
        jaliStile.position.set(i * (width * 0.1), 1.85, 0.5);
        jGroup.add(jaliStile);
      }

      [-width * 0.44, -width * 0.15, width * 0.15, width * 0.44].forEach(
        (colX) => {
          const col = new THREE.Mesh(
            new THREE.CylinderGeometry(0.09, 0.11, 2.45, 8),
            carvedSandstoneMat,
          );
          col.position.set(colX, 1.98, 0.5);
          col.castShadow = true;
          jGroup.add(col);
        },
      );

      const jharokhaArch = buildRajasthaniCuspedArch(
        width,
        3.2,
        0.28,
        carvedSandstoneMat,
      );
      jharokhaArch.position.set(0, 0.2, 0.5);
      jGroup.add(jharokhaArch);

      const canopyBase = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.38, 0.22, 1.38),
        carvedSandstoneMat,
      );
      canopyBase.position.set(0, 3.38, 0);
      jGroup.add(canopyBase);

      const bangaldarVault = new THREE.Mesh(
        new THREE.CylinderGeometry(0.64, 0.74, width + 0.18, 12, 1, false, 0, Math.PI),
        carvedSandstoneMat,
      );
      bangaldarVault.rotation.z = Math.PI / 2;
      bangaldarVault.scale.set(0.65, 1.0, 1.15);
      bangaldarVault.position.set(0, 3.48, 0);
      jGroup.add(bangaldarVault);

      [-0.7, 0, 0.7].forEach((kx) => {
        const kalash = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.36, 8),
          brassMat,
        );
        kalash.position.set(kx, 4.05, 0);
        jGroup.add(kalash);
      });

      facadeGroup.add(jGroup);
    };

    // Second Floor & Third Floor Front Jharokhas across the 64m Royal Palace Facade
    [-23.5, -12.4, 0.0, 12.4, 23.5].forEach((jx, idx) => {
      const w = idx === 2 ? 4.6 : 3.6;
      buildProjectingJharokha(jx, 5.0, w);
      buildProjectingJharokha(jx, 10.0, w - 0.15);
    });

    // 4. ROOFTOP CRENELLATED PARAPET (KANGURAS) AROUND ALL 4 EDGES VIA INSTANCEDMESH & ROYAL CHHATRI DOMES (y = 17.0m)
    const merlonPositions: Array<{ x: number; z: number; rotY: number }> = [];
    for (let kx = -31.2; kx <= 31.2; kx += 1.05) {
      merlonPositions.push({ x: kx, z: 10.14, rotY: 0 }); // Front parapet
      merlonPositions.push({ x: kx, z: -46.14, rotY: 0 }); // Back parapet
    }
    for (let kz = -45.0; kz <= 9.0; kz += 1.05) {
      merlonPositions.push({ x: -32.14, z: kz, rotY: Math.PI / 2 }); // West parapet
      merlonPositions.push({ x: 32.14, z: kz, rotY: Math.PI / 2 }); // East parapet
    }
    const merlonBaseGeo = new THREE.BoxGeometry(0.58, 0.78, 0.28);
    const merlonTipGeo = new THREE.ConeGeometry(0.36, 0.38, 4);
    const merlonBasesInst = new THREE.InstancedMesh(
      merlonBaseGeo,
      carvedSandstoneMat,
      merlonPositions.length,
    );
    const merlonTipsInst = new THREE.InstancedMesh(
      merlonTipGeo,
      carvedSandstoneMat,
      merlonPositions.length,
    );
    const merlonDummy = new THREE.Object3D();
    merlonPositions.forEach((mp, idx) => {
      merlonDummy.position.set(mp.x, 17.4, mp.z);
      merlonDummy.rotation.set(0, mp.rotY, 0);
      merlonDummy.updateMatrix();
      merlonBasesInst.setMatrixAt(idx, merlonDummy.matrix);

      merlonDummy.position.set(mp.x, 17.96, mp.z);
      merlonDummy.rotation.set(0, mp.rotY + Math.PI / 4, 0);
      merlonDummy.updateMatrix();
      merlonTipsInst.setMatrixAt(idx, merlonDummy.matrix);
    });
    merlonBasesInst.instanceMatrix.needsUpdate = true;
    merlonTipsInst.instanceMatrix.needsUpdate = true;
    facadeGroup.add(merlonBasesInst, merlonTipsInst);

    // Ornate sandstone rooftop parapet cornice strips wrapping all 4 sides (64.6m x 56.6m at y = 17.08)
    const parapetFrontBackGeo = new THREE.BoxGeometry(64.6, 0.34, 0.44);
    const parapetSideGeo = new THREE.BoxGeometry(0.44, 0.34, 56.6);
    [10.14, -46.14].forEach((pz) => {
      const strip = new THREE.Mesh(parapetFrontBackGeo, carvedSandstoneMat);
      strip.position.set(0, 17.08, pz);
      facadeGroup.add(strip);
    });
    [-32.14, 32.14].forEach((px) => {
      const strip = new THREE.Mesh(parapetSideGeo, carvedSandstoneMat);
      strip.position.set(px, 17.08, -18.0);
      facadeGroup.add(strip);
    });

    // Shared geometries for Rooftop Rajputana Chhatri Pavilions
    const chhatriLotusGeo = new THREE.ConeGeometry(0.32, 0.28, 10);
    const chhatriKalashGeo = new THREE.ConeGeometry(0.13, 0.85, 10);
    const chhatriColGeo = new THREE.CylinderGeometry(0.12, 0.15, 1.0, 8);

    const buildRooftopChhatri = (cx: number, cz: number, radius = 1.95, height = 3.5) => {
      const cGroup = new THREE.Group();
      cGroup.position.set(cx, 17.0, cz);

      const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 1.05, radius * 1.15, 0.44, 8),
        carvedSandstoneMat,
      );
      plinth.position.y = 0.22;
      cGroup.add(plinth);

      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const px = Math.cos(ang) * (radius * 0.82);
        const pz = Math.sin(ang) * (radius * 0.82);
        const col = new THREE.Mesh(chhatriColGeo, carvedSandstoneMat);
        col.scale.set(1, height, 1);
        col.position.set(px, 0.44 + height * 0.5, pz);
        col.castShadow = true;
        cGroup.add(col);
      }

      const eaveRing = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 1.02, radius * 1.32, 0.28, 8),
        carvedSandstoneMat,
      );
      eaveRing.position.y = 0.44 + height;
      cGroup.add(eaveRing);

      const drum = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.88, radius * 0.94, 0.46, 16),
        carvedSandstoneMat,
      );
      drum.position.y = 0.68 + height;
      cGroup.add(drum);

      // Graceful Rajasthani fluted lotus onion dome silhouette
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(
          radius * 0.9,
          20,
          14,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.56,
        ),
        carvedSandstoneMat,
      );
      dome.scale.set(1.0, 1.12, 1.0);
      dome.position.y = 0.86 + height;
      dome.castShadow = true;
      cGroup.add(dome);

      const lotusApex = new THREE.Mesh(chhatriLotusGeo, carvedSandstoneMat);
      lotusApex.rotation.x = Math.PI;
      lotusApex.position.y = 0.86 + height + radius * 1.0;
      cGroup.add(lotusApex);

      const kalashSpire = new THREE.Mesh(chhatriKalashGeo, brassMat);
      kalashSpire.position.y = 1.26 + height + radius * 1.0;
      cGroup.add(kalashSpire);

      facadeGroup.add(cGroup);
    };

    // Front royal skyline Chhatris (5 grand pavilions across 64m width)
    buildRooftopChhatri(-25.5, 8.2, 2.1, 3.6);
    buildRooftopChhatri(-12.6, 8.4, 1.85, 3.3);
    buildRooftopChhatri(0.0, 8.4, 2.7, 4.3);
    buildRooftopChhatri(12.6, 8.4, 1.85, 3.3);
    buildRooftopChhatri(25.5, 8.2, 2.1, 3.6);
    // Grand Central Royal Palace Crown Dome Pavilion towering above the 17m Atrium Roof
    buildRooftopChhatri(0.0, -4.5, 4.8, 5.2);
    // West & East mid-roofline flanking Chhatris + Rear rooftop Chhatris
    buildRooftopChhatri(-28.4, -18.0, 1.9, 3.4);
    buildRooftopChhatri(28.4, -18.0, 1.9, 3.4);
    buildRooftopChhatri(-25.5, -44.0, 2.0, 3.5);
    buildRooftopChhatri(25.5, -44.0, 2.0, 3.5);

    // 3-Story Corner Bastion Turrets at ALL FOUR CORNERS (±32, z = 10.1 & z = -46.1)
    [
      [-32.0, 10.1],
      [32.0, 10.1],
      [-32.0, -46.1],
      [32.0, -46.1],
    ].forEach(([tx, tz]) => {
      const turret = new THREE.Mesh(
        new THREE.CylinderGeometry(1.08, 1.28, 17.4, 12),
        carvedSandstoneMat,
      );
      turret.position.set(tx, 8.7, tz);
      turret.castShadow = true;
      facadeGroup.add(turret);

      const turretDome = new THREE.Mesh(
        new THREE.SphereGeometry(1.12, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
        carvedSandstoneMat,
      );
      turretDome.position.set(tx, 17.4, tz);
      facadeGroup.add(turretDome);

      const turretKalash = new THREE.Mesh(
        new THREE.ConeGeometry(0.13, 0.64, 8),
        brassMat,
      );
      turretKalash.position.set(tx, 18.68, tz);
      facadeGroup.add(turretKalash);
    });

    // 5. FULL 360-DEGREE DETAILING FOR LEFT (x=-32), RIGHT (x=+32) & BACK (z=-46) EXTERIOR FACES
    const windowGlassMat = new THREE.MeshStandardMaterial({
      color: 0x0b0f17,
      roughness: 0.25,
      metalness: 0.6,
    });
    const ivyStemMat = new THREE.MeshStandardMaterial({
      color: 0x1a2013,
      roughness: 0.96,
      metalness: 0.0,
    });
    const ivyLeafMats = [
      new THREE.MeshStandardMaterial({
        color: 0x1e2a16,
        roughness: 0.93,
        metalness: 0.0,
        side: THREE.DoubleSide,
      }),
      new THREE.MeshStandardMaterial({
        color: 0x26341c,
        roughness: 0.92,
        metalness: 0.0,
        side: THREE.DoubleSide,
      }),
      new THREE.MeshStandardMaterial({
        color: 0x172112,
        roughness: 0.95,
        metalness: 0.0,
        side: THREE.DoubleSide,
      }),
    ];
    const sharedIvyLeafGeo = new THREE.CircleGeometry(0.11, 5);

    const addExteriorCarvedWindow = (
      wx: number,
      wyCenter: number,
      wz: number,
      rotY: number,
    ) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(wx, wyCenter, wz);
      wGroup.rotation.y = rotY;

      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(1.72, 2.1, 0.22),
        carvedSandstoneMat,
      );
      wGroup.add(frame);

      const glass = new THREE.Mesh(
        new THREE.BoxGeometry(1.26, 1.68, 0.25),
        windowGlassMat,
      );
      wGroup.add(glass);

      [-0.3, 0, 0.3].forEach((mx) => {
        const mullion = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 1.68, 0.28),
          woodMat,
        );
        mullion.position.x = mx;
        wGroup.add(mullion);
      });

      [-0.72, 0.72].forEach((sx, idx) => {
        const shutter = new THREE.Mesh(
          new THREE.BoxGeometry(0.48, 1.7, 0.08),
          woodMat,
        );
        shutter.position.set(sx, 0, 0.2);
        shutter.rotation.y = idx === 0 ? -0.45 : 0.45;
        wGroup.add(shutter);
      });

      const hood = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 0.15, 0.6),
        carvedSandstoneMat,
      );
      hood.position.set(0, 1.12, 0.2);
      hood.rotation.x = 0.24;
      const sill = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 0.16, 0.34),
        carvedSandstoneMat,
      );
      sill.position.set(0, -1.08, 0.08);
      wGroup.add(hood, sill);

      facadeGroup.add(wGroup);
    };

    // Organic dark-olive hanging ivy draping naturally along stone masonry
    const addHangingVineCluster = (
      vx: number,
      vTopY: number,
      vz: number,
      dropLen: number,
      rotY: number,
    ) => {
      const vGroup = new THREE.Group();
      vGroup.position.set(vx, vTopY, vz);
      vGroup.rotation.y = rotY;
      const seed = Math.abs(vx * 7.3 + vz * 5.9 + vTopY * 3.1);

      const tendrilCount = 3;
      for (let s = 0; s < tendrilCount; s++) {
        const hLen = dropLen * (0.48 + (((s * 37 + Math.floor(seed)) % 10) / 16));
        const startX = (s - 1) * (0.28 + ((s + Math.floor(seed)) % 3) * 0.11);
        const pts: THREE.Vector3[] = [];
        const segs = 6;
        let curX = startX;
        for (let k = 0; k <= segs; k++) {
          const t = k / segs;
          curX += Math.sin(seed + s * 2.1 + k * 1.45) * 0.16;
          const zOut = 0.04 + Math.sin(t * Math.PI) * 0.05 + (s % 2) * 0.015;
          pts.push(new THREE.Vector3(curX, -t * hLen, zOut));
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        const stemGeo = new THREE.TubeGeometry(curve, 12, 0.014, 4, false);
        const stemMesh = new THREE.Mesh(stemGeo, ivyStemMat);
        vGroup.add(stemMesh);

        const tuftCount = Math.max(5, Math.floor(hLen * 2.6));
        for (let l = 0; l < tuftCount; l++) {
          const u = Math.pow(l / tuftCount, 0.85) * 0.96;
          const pt = curve.getPoint(u);
          const leafScale = THREE.MathUtils.lerp(1.15, 0.52, u) * (0.8 + ((l + s) % 3) * 0.18);
          const leaf = new THREE.Mesh(
            sharedIvyLeafGeo,
            ivyLeafMats[(l + s + Math.floor(seed)) % ivyLeafMats.length],
          );
          leaf.position.set(
            pt.x + Math.sin(seed + l * 2.7 + s) * 0.12,
            pt.y + Math.cos(seed + l * 1.9) * 0.06,
            pt.z + 0.03 + (l % 3) * 0.015,
          );
          leaf.rotation.set(
            0.25 + Math.sin(l * 1.7 + seed) * 0.45,
            Math.cos(l * 2.3 + s) * 0.65,
            Math.sin(l * 3.1 + seed) * 1.1,
          );
          leaf.scale.set(leafScale * 1.15, leafScale * 0.85, 1);
          vGroup.add(leaf);
        }
      }
      facadeGroup.add(vGroup);
    };

    // North Back Wall (z = -46) Chhajja eaves, windows, 2F/3F Jharokhas & vines
    [4.92, 9.92, 16.92].forEach((cy) => {
      const backChhajja = new THREE.Mesh(
        new THREE.BoxGeometry(63.8, 0.18, 0.94),
        carvedSandstoneMat,
      );
      backChhajja.position.set(0, cy, -46.48);
      backChhajja.rotation.x = -0.22;
      backChhajja.castShadow = true;
      facadeGroup.add(backChhajja);

      for (let bx = -30.0; bx <= 30.0; bx += 2.8) {
        const bracket = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.36, 0.58),
          carvedSandstoneMat,
        );
        bracket.position.set(bx, cy - 0.22, -46.34);
        bracket.rotation.x = 0.35;
        facadeGroup.add(bracket);
      }
    });
    // Back windows across GF, 2F & 3F
    [-26.5, -18.5, -8.5, 8.5, 18.5, 26.5].forEach((wx) => {
      addExteriorCarvedWindow(wx, 2.45, -46.14, Math.PI);
    });
    [-26.5, -17.5, -8.0, 0, 8.0, 17.5, 26.5].forEach((wx) => {
      addExteriorCarvedWindow(wx, 7.45, -46.14, Math.PI);
      addExteriorCarvedWindow(wx, 13.0, -46.14, Math.PI);
    });
    // Back Jharokha Balconies (2F & 3F)
    [-21.5, 21.5].forEach((jx) => {
      [5.0, 10.0].forEach((jy) => {
        const jBack = new THREE.Group();
        jBack.position.set(jx, jy, -46.8);
        jBack.rotation.y = Math.PI;
        const floorSlab = new THREE.Mesh(
          new THREE.BoxGeometry(3.4, 0.24, 1.18),
          carvedSandstoneMat,
        );
        floorSlab.position.set(0, 0.08, 0);
        const frontBal = new THREE.Mesh(
          new THREE.BoxGeometry(3.4, 0.96, 0.14),
          carvedSandstoneMat,
        );
        frontBal.position.set(0, 0.64, 0.52);
        const canopy = new THREE.Mesh(
          new THREE.BoxGeometry(3.7, 0.22, 1.32),
          carvedSandstoneMat,
        );
        canopy.position.set(0, 3.25, 0);
        const archB = buildRajasthaniCuspedArch(3.4, 3.05, 0.26, carvedSandstoneMat);
        archB.position.set(0, 0.2, 0.5);
        jBack.add(floorSlab, frontBal, canopy, archB);
        facadeGroup.add(jBack);
      });
    });

    // West (x=-32) & East (x=+32) Exterior Faces (56m long): Chhajjas, Windows, 2F/3F Jharokhas & Vines
    [-1, 1].forEach((sideSign) => {
      const wallX = sideSign * 32.0;
      const rotY = sideSign > 0 ? Math.PI / 2 : -Math.PI / 2;

      [4.92, 9.92, 16.92].forEach((cy) => {
        const sideChhajja = new THREE.Mesh(
          new THREE.BoxGeometry(0.94, 0.18, 55.8),
          carvedSandstoneMat,
        );
        sideChhajja.position.set(wallX + sideSign * 0.48, cy, -18.0);
        sideChhajja.rotation.z = -sideSign * 0.22;
        sideChhajja.castShadow = true;
        facadeGroup.add(sideChhajja);

        for (let bz = -44.6; bz <= 8.6; bz += 2.8) {
          const bracket = new THREE.Mesh(
            new THREE.BoxGeometry(0.58, 0.36, 0.18),
            carvedSandstoneMat,
          );
          bracket.position.set(wallX + sideSign * 0.36, cy - 0.22, bz);
          bracket.rotation.z = sideSign * 0.35;
          facadeGroup.add(bracket);
        }
      });

      // Carved windows across GF, 2F, 3F along both 56m side facades
      [-40.5, -32.0, -23.0, -13.0, -3.5, 5.5].forEach((wz) => {
        addExteriorCarvedWindow(wallX + sideSign * 0.14, 2.45, wz, rotY);
        addExteriorCarvedWindow(wallX + sideSign * 0.14, 7.45, wz, rotY);
        addExteriorCarvedWindow(wallX + sideSign * 0.14, 13.0, wz, rotY);
      });

      // Projecting 2F & 3F Jharokha balconies overlooking West & East yards
      [-36.5, -18.0, 1.0].forEach((jz) => {
        [5.0, 10.0].forEach((jy) => {
          const jSide = new THREE.Group();
          jSide.position.set(wallX + sideSign * 0.8, jy, jz);
          jSide.rotation.y = rotY;
          const floorSlab = new THREE.Mesh(
            new THREE.BoxGeometry(3.2, 0.24, 1.15),
            carvedSandstoneMat,
          );
          floorSlab.position.set(0, 0.08, 0);
          const frontBal = new THREE.Mesh(
            new THREE.BoxGeometry(3.2, 0.94, 0.14),
            carvedSandstoneMat,
          );
          frontBal.position.set(0, 0.62, 0.5);
          const canopy = new THREE.Mesh(
            new THREE.BoxGeometry(3.5, 0.22, 1.3),
            carvedSandstoneMat,
          );
          canopy.position.set(0, 3.2, 0);
          const archS = buildRajasthaniCuspedArch(3.2, 3.0, 0.26, carvedSandstoneMat);
          archS.position.set(0, 0.2, 0.48);
          [-0.95, 0, 0.95].forEach((cx) => {
            const corb = new THREE.Mesh(
              new THREE.BoxGeometry(0.28, 0.42, 0.9),
              carvedSandstoneMat,
            );
            corb.position.set(cx, -0.22, -0.1);
            jSide.add(corb);
          });
          jSide.add(floorSlab, frontBal, canopy, archS);
          facadeGroup.add(jSide);
        });
      });

      // Hanging jungle vines down West & East stone walls
      [-42.0, -29.0, -15.0, -2.0, 7.8].forEach((vz, idx) => {
        addHangingVineCluster(
          wallX + sideSign * 0.22,
          16.6 - (idx % 2) * 5.0,
          vz,
          5.6 + (idx % 2) * 1.6,
          rotY,
        );
      });
    });

    // Subtle dark-olive hanging ivy along outer front eaves corners & back wall
    [
      [-29.2, 16.7, 10.22, 4.8],
      [-17.4, 9.75, 10.22, 3.8],
      [17.4, 16.7, 10.22, 4.4],
      [29.2, 9.75, 10.22, 4.0],
    ].forEach(([fx, fy, fz, flen]) => {
      addHangingVineCluster(fx, fy, fz, flen, 0);
    });

    [-27.5, -19.5, -9.5, 9.5, 19.5, 27.5].forEach((vx, idx) => {
      addHangingVineCluster(
        vx,
        16.6 - (idx % 2) * 4.8,
        -46.22,
        4.8 + (idx % 2) * 1.3,
        Math.PI,
      );
    });

    // Very faint eerie warm/reddish haunted glow behind 3 upper-floor Haveli front Jharokha windows
    const eerieWinGlowCanvas = document.createElement('canvas');
    eerieWinGlowCanvas.width = 128;
    eerieWinGlowCanvas.height = 128;
    const ewCtx = eerieWinGlowCanvas.getContext('2d')!;
    const ewGrad = ewCtx.createRadialGradient(64, 64, 6, 64, 64, 60);
    ewGrad.addColorStop(0.0, 'rgba(220, 74, 34, 0.55)');
    ewGrad.addColorStop(0.45, 'rgba(148, 28, 16, 0.24)');
    ewGrad.addColorStop(1.0, 'rgba(80, 10, 8, 0.0)');
    ewCtx.fillStyle = ewGrad;
    ewCtx.fillRect(0, 0, 128, 128);
    const eerieWinGlowTex = new THREE.CanvasTexture(eerieWinGlowCanvas);
    eerieWinGlowTex.colorSpace = THREE.SRGBColorSpace;

    const hauntedUpperWindows: Array<{ x: number; y: number; z: number; w: number; h: number; tint: number }> = [
      { x: -12.4, y: 6.85, z: 10.28, w: 2.5, h: 1.85, tint: 0xa62e14 }, // 2F West-Center Jharokha
      { x: 0.0, y: 12.15, z: 10.28, w: 3.1, h: 2.05, tint: 0x9c1e16 }, // 3F Central Royal Jharokha
      { x: 23.5, y: 6.85, z: 10.28, w: 2.5, h: 1.85, tint: 0xb04218 }, // 2F East Jharokha
    ];
    hauntedUpperWindows.forEach((hw, idx) => {
      const paneMat = new THREE.MeshStandardMaterial({
        color: 0x1a0705,
        emissive: hw.tint,
        emissiveIntensity: 0.62,
        roughness: 0.4,
        metalness: 0.1,
      });
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(hw.w, hw.h), paneMat);
      pane.position.set(hw.x, hw.y, hw.z);
      facadeGroup.add(pane);

      const haloMat = new THREE.MeshBasicMaterial({
        map: eerieWinGlowTex,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(hw.w * 1.45, hw.h * 1.45), haloMat);
      halo.position.set(hw.x, hw.y, hw.z + 0.18);
      facadeGroup.add(halo);

      eerieUpperWindowGlows.push({
        paneMat,
        haloMat,
        baseEmissive: 0.58 + (idx === 1 ? 0.12 : 0),
        baseOpacity: 0.3 + (idx === 1 ? 0.06 : 0),
        phase: idx * 2.15,
      });
    });

    root.add(facadeGroup);
  };
  const eerieUpperWindowGlows: Array<{
    paneMat: THREE.MeshStandardMaterial;
    haloMat: THREE.MeshBasicMaterial;
    baseEmissive: number;
    baseOpacity: number;
    phase: number;
  }> = [];
  buildGrandRajasthaniHaveliFacade();

  // North Facade of Palace Building (z = -46.0) opening under the rear staircase landing into Walled Back Well Courtyard
  addWallSegment(-32, -46, -1.65, -46, 0, 5.0);
  addWallSegment(1.65, -46, 32, -46, 0, 5.0);
  createDoorwayWithDoor({
    id: 'door_back_well',
    nameHi: 'पिछला आँगन द्वार (Back Well Courtyard)',
    x: 0,
    yBottom: 0,
    z: -46,
    axis: 'x',
    width: 3.2,
    floorLevel: 0,
    initialOpen: false,
  });

  // West & East Exterior Palace Walls spanning all 3 above-ground floors (64m wide x 56m deep x 17m tall)
  addWallSegment(-32, -46, -32, 10, 0, 17.0);
  addWallSegment(32, -46, 32, 10, 0, 17.0);

  // --- GROUND FLOOR 6 OUTER SIDE-WING ROOMS (y = 0.0 to 5.0, 3 Left Wing + 3 Right Wing) ---
  // West Wing: G1 Shahi Shastragar (z: -8.5..10), G2 Purani Rasoi (z: -27.5..-8.5), G5 Mehmaan Baithak (z: -46..-27.5)
  addWallWithDoor(-19, -8.5, -19, 10, 0, 5.0, 0.5, {
    id: 'door_g1_shastragar',
    nameHi: 'शाही शस्त्रागार (G1)',
    floorLevel: 0,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(-19, -27.5, -19, -8.5, 0, 5.0, 0.5, {
    id: 'door_g2_kitchen',
    nameHi: 'पुरानी रसोई और अन्न-कोठी (G2)',
    floorLevel: 0,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(-19, -46, -19, -27.5, 0, 5.0, 0.5, {
    id: 'door_g5_baithak',
    nameHi: 'मेहमान बैठक (G5)',
    floorLevel: 0,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(-32, -8.5, -19, -8.5, 0, 5.0, 0.5, {
    id: 'door_g1_g2_inner',
    nameHi: 'शस्त्रागार-रसोई आंतरिक द्वार',
    floorLevel: 0,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(-32, -27.5, -19, -27.5, 0, 5.0, 0.5, {
    id: 'door_g2_g5_inner',
    nameHi: 'रसोई-बैठक आंतरिक द्वार',
    floorLevel: 0,
    initialOpen: false,
    autoCreak: false,
  });

  // East Wing: G3 Munim Room (z: -8.5..10), G4 Prachin Pooja Ghar (z: -27.5..-8.5), G6 Sevak Kaksh (z: -46..-27.5)
  addWallWithDoor(19, -8.5, 19, 10, 0, 5.0, 0.5, {
    id: 'door_g3_munim',
    nameHi: 'मुनीम बही-खाता कक्ष (G3)',
    floorLevel: 0,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(19, -27.5, 19, -8.5, 0, 5.0, 0.5, {
    id: 'door_g4_pooja',
    nameHi: 'प्राचीन पूजा घर (G4)',
    floorLevel: 0,
    initialOpen: false,
    autoCreak: false,
  });
  // Solid wall flanking basement stairwell (z = -41.5 to -27.5) + wide doorway north of stairwell (z = -43.75)
  addWallSegment(19, -41.5, 19, -27.5, 0, 5.0);
  addWallWithDoor(19, -46, 19, -41.5, 0, 5.0, 0.5, {
    id: 'door_g6_sevak',
    nameHi: 'सेवक कक्ष (G6)',
    floorLevel: 0,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(19, -8.5, 32, -8.5, 0, 5.0, 0.5, {
    id: 'door_g3_g4_inner',
    nameHi: 'मुनीम-पूजा आंतरिक द्वार',
    floorLevel: 0,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(19, -27.5, 32, -27.5, 0, 5.0, 0.5, {
    id: 'door_g4_g6_inner',
    nameHi: 'पूजा-सेवक आंतरिक द्वार',
    floorLevel: 0,
    initialOpen: false,
    autoCreak: false,
  });

  // Shared lathe-turned Rajputana sandstone baluster spindle & newel geometries for high-FPS ornate balconies
  const sharedBalusterGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.065, 0.0),
      new THREE.Vector2(0.065, 0.09),
      new THREE.Vector2(0.036, 0.18),
      new THREE.Vector2(0.068, 0.36),
      new THREE.Vector2(0.034, 0.56),
      new THREE.Vector2(0.056, 0.68),
      new THREE.Vector2(0.064, 0.74),
    ],
    8,
  );
  const sharedBalusterPostGeo = new THREE.BoxGeometry(0.32, 1.18, 0.32);
  const sharedBalusterKnobGeo = new THREE.SphereGeometry(0.115, 8, 8);
  const balusterDummy = new THREE.Object3D();

  // Helper to build ornate Rajasthani Jharokha Sandstone Balcony Balustrades (solid collision + carved open stone balusters)
  const addJharokhaBalconyRailing = (
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    floorY: number,
  ) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.1) return;
    const midX = (x1 + x2) * 0.5;
    const midZ = (z1 + z2) * 0.5;
    const rotY = Math.atan2(dx, dz);

    const railGroup = new THREE.Group();
    railGroup.position.set(midX, floorY, midZ);
    railGroup.rotation.y = rotY;

    // Lower sandstone plinth & carved coping handrail
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.24, len),
      carvedSandstoneMat,
    );
    plinth.position.y = 0.12;
    const topRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.14, len),
      carvedSandstoneMat,
    );
    topRail.position.y = 1.03;
    const goldRailAccent = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.035, len),
      brassMat,
    );
    goldRailAccent.position.y = 1.11;
    railGroup.add(plinth, topRail, goldRailAccent);

    // Ornate carved open sandstone balusters every 0.34m via InstancedMesh
    const spindleCount = Math.max(2, Math.floor(len / 0.34));
    const spindles = new THREE.InstancedMesh(
      sharedBalusterGeo,
      carvedSandstoneMat,
      spindleCount,
    );
    for (let s = 0; s < spindleCount; s++) {
      const sz = -len * 0.5 + ((s + 0.5) / spindleCount) * len;
      balusterDummy.position.set(0, 0.23, sz);
      balusterDummy.rotation.set(0, 0, 0);
      balusterDummy.updateMatrix();
      spindles.setMatrixAt(s, balusterDummy.matrix);
    }
    spindles.instanceMatrix.needsUpdate = true;
    railGroup.add(spindles);

    // Carved stone newel posts & brass lotus finials every 2.0m
    const postCount = Math.max(2, Math.round(len / 2.0) + 1);
    for (let i = 0; i < postCount; i++) {
      const pz = -len * 0.5 + (i / (postCount - 1)) * len;
      const post = new THREE.Mesh(sharedBalusterPostGeo, carvedSandstoneMat);
      post.position.set(0, 0.59, pz);
      const knob = new THREE.Mesh(sharedBalusterKnobGeo, brassMat);
      knob.position.set(0, 1.26, pz);
      railGroup.add(post, knob);
    }

    root.add(railGroup);

    // Strict AABB guardrail collider so players never fall off the 2F / 3F open balconies into the atrium void
    wallColliders.push({
      minX: Math.min(x1, x2) - 0.14,
      maxX: Math.max(x1, x2) + 0.14,
      minZ: Math.min(z1, z2) - 0.14,
      maxZ: Math.max(z1, z2) + 0.14,
      minY: floorY,
      maxY: floorY + 1.18,
    });
  };

  // --- SECOND FLOOR WALLS, 4-SIDED WRAP-AROUND BALCONY RAILINGS & 8 ROOMS (y = 5.0 to 10.0) ---
  addWallSegment(-32, 10, 32, 10, 5.0, 5.0); // South exterior 2F wall
  addWallSegment(-32, -46, 32, -46, 5.0, 5.0); // North exterior 2F wall

  // 2F Open 4-Sided Wrap-Around Sandstone Jharokha Balcony Railings (leaves z in [-31.0, -27.0] at x=±15.2 open for Split Staircase arrivals!)
  addJharokhaBalconyRailing(-15.2, 3.2, 15.2, 3.2, 5.0); // South Atrium Rim (front of South Balcony z: 3.2..5.8)
  addJharokhaBalconyRailing(-15.2, -27.0, -15.2, 3.2, 5.0); // West Atrium Rim (South of Left Split Stair)
  addJharokhaBalconyRailing(15.2, -27.0, 15.2, 3.2, 5.0); // East Atrium Rim (South of Right Split Stair)
  addJharokhaBalconyRailing(-15.2, -31.3, 15.2, -31.3, 5.0); // North Atrium Rim overlooking Double-Wing Staircase

  // 2F West Wing (3 rooms): 2F-2 Master Bedroom, 2F-6 Royal Dining Room, 2F-4 Sangeet Hall
  addWallWithDoor(-19, -8.5, -19, 10, 5.0, 5.0, 0.5, {
    id: 'door_f2_2_master_bed',
    nameHi: 'ठाकुर साहब का शयनकक्ष (2F-2)',
    floorLevel: 1,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(-19, -27.5, -19, -8.5, 5.0, 5.0, 0.5, {
    id: 'door_f2_6_royal_dining',
    nameHi: 'शाही भोजशाला (2F-6)',
    floorLevel: 1,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(-19, -46, -19, -27.5, 5.0, 5.0, 0.5, {
    id: 'door_f2_4_sangeet',
    nameHi: 'संगीत और झरोखा हॉल (2F-4)',
    floorLevel: 1,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(-32, -8.5, -19, -8.5, 5.0, 5.0, 0.5, {
    id: 'door_f2_west_inner_1',
    nameHi: 'शयनकक्ष-भोजशाला आंतरिक द्वार',
    floorLevel: 1,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(-32, -27.5, -19, -27.5, 5.0, 5.0, 0.5, {
    id: 'door_f2_west_inner_2',
    nameHi: 'भोजशाला-संगीत आंतरिक द्वार',
    floorLevel: 1,
    initialOpen: false,
    autoCreak: false,
  });

  // 2F East Wing (3 rooms): 2F-1 Rukmini's Bridal Room, 2F-5 Rani's Shringar Kaksh, 2F-3 Guest Suite 1
  addWallWithDoor(19, -8.5, 19, 10, 5.0, 5.0, 0.5, {
    id: 'door_f2_1_bridal',
    nameHi: 'रुक्मिणी का सुहागरात कक्ष (2F-1)',
    floorLevel: 1,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(19, -27.5, 19, -8.5, 5.0, 5.0, 0.5, {
    id: 'door_f2_5_rani_shringar',
    nameHi: 'रानी का श्रृंगार कक्ष (2F-5)',
    floorLevel: 1,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(19, -46, 19, -27.5, 5.0, 5.0, 0.5, {
    id: 'door_f2_3_guest1',
    nameHi: 'अतिथि कक्ष १ — कबीर कैद (2F-3)',
    floorLevel: 1,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(19, -8.5, 32, -8.5, 5.0, 5.0, 0.5, {
    id: 'door_f2_east_inner_1',
    nameHi: 'सुहाग-श्रृंगार आंतरिक द्वार',
    floorLevel: 1,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(19, -27.5, 32, -27.5, 5.0, 5.0, 0.5, {
    id: 'door_f2_east_inner_2',
    nameHi: 'श्रृंगार-अतिथि आंतरिक द्वार',
    floorLevel: 1,
    initialOpen: false,
    autoCreak: false,
  });

  // 2F Front Palace Suites (2 rooms overlooking Front Yard, z: 5.8..10, opening onto South Balcony z: 3.2..5.8)
  addWallWithDoor(-19, 5.8, 0, 5.8, 5.0, 5.0, 0.6, {
    id: 'door_f2_7_guest2',
    nameHi: 'अतिथि कक्ष २ (2F-7)',
    floorLevel: 1,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(0, 5.8, 19, 5.8, 5.0, 5.0, 0.4, {
    id: 'door_f2_8_portrait_gallery',
    nameHi: 'पूर्वज चित्र वीथिका (2F-8)',
    floorLevel: 1,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(0, 5.8, 0, 10, 5.0, 5.0, 0.5, {
    id: 'door_f2_front_inner',
    nameHi: 'अतिथि-वीथिका आंतरिक द्वार',
    floorLevel: 1,
    initialOpen: false,
    autoCreak: false,
  });

  // --- THIRD FLOOR WALLS, 4-SIDED WRAP-AROUND BALCONY RAILINGS & 8 ROOMS (y = 10.0 to 17.0, height 7.0m) ---
  addWallSegment(-32, 10, 32, 10, 10.0, 7.0); // South exterior 3F wall
  addWallSegment(-32, -46, 32, -46, 10.0, 7.0); // North exterior 3F wall

  // 3F Open 4-Sided Wrap-Around Sandstone Jharokha Balcony Railings overlooking the 17m Royal Atrium + 2F->3F Stairwell Safety Railings
  addJharokhaBalconyRailing(-15.2, 3.2, 15.2, 3.2, 10.0); // South Atrium Rim (front of South Balcony z: 3.2..5.8)
  addJharokhaBalconyRailing(-15.2, -29.5, 15.2, -29.5, 10.0); // North Atrium Overlook Deck Rim
  addJharokhaBalconyRailing(-15.2, -29.5, -15.2, 3.2, 10.0); // West Atrium Rim
  addJharokhaBalconyRailing(15.2, -29.5, 15.2, 3.2, 10.0); // East Atrium Rim
  // 2F->3F Stairwell Cutout Railings (keeps north landing z=-46..-42.5 wide open!)
  addJharokhaBalconyRailing(-3.0, -34.5, 3.0, -34.5, 10.0);
  addJharokhaBalconyRailing(-3.0, -42.5, -3.0, -34.5, 10.0);
  addJharokhaBalconyRailing(3.0, -42.5, 3.0, -34.5, 10.0);

  // 3F West Wing (3 rooms): 3F-1 Tantrik Library, 3F-5 Jyotish Room, 3F-3 Attic Store 1
  addWallWithDoor(-19, -8.5, -19, 10, 10.0, 7.0, 0.5, {
    id: 'door_f3_1_library',
    nameHi: 'तांत्रिक ग्रंथ पुस्तकालय (3F-1)',
    floorLevel: 2,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(-19, -27.5, -19, -8.5, 10.0, 7.0, 0.5, {
    id: 'door_f3_5_jyotish',
    nameHi: 'ज्योतिष एवं नक्षत्र कक्ष (3F-5)',
    floorLevel: 2,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(-19, -46, -19, -27.5, 10.0, 7.0, 0.5, {
    id: 'door_f3_3_attic1',
    nameHi: 'अटारी भंडार १ — रिया कैद (3F-3)',
    floorLevel: 2,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(-32, -8.5, -19, -8.5, 10.0, 7.0, 0.5, {
    id: 'door_f3_west_inner_1',
    nameHi: 'पुस्तकालय-ज्योतिष आंतरिक द्वार',
    floorLevel: 2,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(-32, -27.5, -19, -27.5, 10.0, 7.0, 0.5, {
    id: 'door_f3_west_inner_2',
    nameHi: 'ज्योतिष-अटारी आंतरिक द्वार',
    floorLevel: 2,
    initialOpen: false,
    autoCreak: false,
  });

  // 3F East Wing (3 rooms): 3F-2 Aaina Mahal, 3F-6 Old Doll Room, 3F-4 Barsati Terrace Room
  addWallWithDoor(19, -8.5, 19, 10, 10.0, 7.0, 0.5, {
    id: 'door_f3_2_aaina',
    nameHi: 'आईना महल (3F-2)',
    floorLevel: 2,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(19, -27.5, 19, -8.5, 10.0, 7.0, 0.5, {
    id: 'door_f3_6_doll_room',
    nameHi: 'पुरानी गुड़िया और खिलौना कक्ष (3F-6)',
    floorLevel: 2,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(19, -46, 19, -27.5, 10.0, 7.0, 0.5, {
    id: 'door_f3_4_barsati',
    nameHi: 'बरसाती छत मंडप कक्ष (3F-4)',
    floorLevel: 2,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(19, -8.5, 32, -8.5, 10.0, 7.0, 0.5, {
    id: 'door_f3_east_inner_1',
    nameHi: 'आईना-खिलौना आंतरिक द्वार',
    floorLevel: 2,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(19, -27.5, 32, -27.5, 10.0, 7.0, 0.5, {
    id: 'door_f3_east_inner_2',
    nameHi: 'खिलौना-बरसाती आंतरिक द्वार',
    floorLevel: 2,
    initialOpen: false,
    autoCreak: false,
  });

  // 3F Front Watchtower Suites (2 rooms overlooking Front Yard, z: 5.8..10, opening onto South Balcony z: 3.2..5.8)
  addWallWithDoor(-19, 5.8, 0, 5.8, 10.0, 7.0, 0.6, {
    id: 'door_f3_7_attic2',
    nameHi: 'अटारी भंडार २ (3F-7)',
    floorLevel: 2,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(0, 5.8, 19, 5.8, 10.0, 7.0, 0.4, {
    id: 'door_f3_8_watchtower',
    nameHi: 'अग्र बुर्ज प्रहरी कक्ष (3F-8)',
    floorLevel: 2,
    initialOpen: false,
    autoCreak: false,
  });
  addWallWithDoor(0, 5.8, 0, 10, 10.0, 7.0, 0.5, {
    id: 'door_f3_front_inner',
    nameHi: 'अटारी-बुर्ज आंतरिक द्वार',
    floorLevel: 2,
    initialOpen: false,
    autoCreak: false,
  });

  // --- 10-ROOM UNDERGROUND LABYRINTH MAZE WALLS (shifted ΔZ = -12.0m, y = -4.5 to -0.35, height 4.15m) ---
  // Stairwell South Backing Wall (leaves 1.5m headroom at top step) & East Retaining Closure
  addWallSegment(6.7, -34.0, 10.3, -34.0, -4.5, 3.0);
  addWallSegment(10.3, -45.0, 10.3, -44.5, -4.5, 4.15);

  // TIER 1 (South Tier, z in [-52, -42]): U2 | W-Corr (+Dead-End #1) | U1 | Central Spine | Foyer/U3 | E-Corr | U5
  addWallSegment(-28.0, -42.0, 6.7, -42.0, -4.5, 4.15);
  addWallSegment(13.0, -42.0, 28.0, -42.0, -4.5, 4.15);
  addWallSegment(13.0, -45.0, 13.0, -42.0, -4.5, 4.15);

  // Outer West & East Perimeter Walls (Tier 1)
  addWallSegment(-28.0, -52.0, -28.0, -42.0, -4.5, 4.15);
  addWallSegment(28.0, -52.0, 28.0, -42.0, -4.5, 4.15);

  // Room U2 (काल-कोठरी 2, x: -28..-17, z: -52..-42)
  addWallSegment(-28.0, -52.0, -17.0, -52.0, -4.5, 4.15);
  addWallWithDoor(-17.0, -52.0, -17.0, -42.0, -4.5, 4.15, 0.35, {
    id: 'door_u2_kalkothri2',
    nameHi: 'काल-कोठरी 2 (U2)',
    floorLevel: -1,
    initialOpen: false,
    autoCreak: false,
  });

  // Room U1 (काल-कोठरी 1 — Trapped Friend Dev, x: -13..-2, z: -52..-42)
  addWallSegment(-13.0, -52.0, -13.0, -42.0, -4.5, 4.15);
  addWallSegment(-13.0, -52.0, -2.0, -52.0, -4.5, 4.15);
  addWallWithDoor(-2.0, -52.0, -2.0, -42.0, -4.5, 4.15, 0.5, {
    id: 'door_u1_kalkothri',
    nameHi: 'काल-कोठरी 1 — देव कैद (U1)',
    floorLevel: -1,
    initialOpen: false,
    autoCreak: false,
  });

  // Room U3 (तांत्रिक हवन कक्ष — Cursed Relic #1, x: 2..13, z: -52..-45)
  addWallSegment(2.0, -45.0, 13.0, -45.0, -4.5, 4.15);
  addWallSegment(2.0, -52.0, 13.0, -52.0, -4.5, 4.15);
  addWallSegment(13.0, -52.0, 13.0, -45.0, -4.5, 4.15);
  addWallWithDoor(2.0, -52.0, 2.0, -45.0, -4.5, 4.15, 0.5, {
    id: 'door_u3_havan',
    nameHi: 'तांत्रिक हवन कक्ष (U3)',
    floorLevel: -1,
    initialOpen: false,
    autoCreak: false,
  });

  // Room U5 (पुराना तेल व अनाज भंडार, x: 17..28, z: -52..-42)
  addWallSegment(17.0, -52.0, 28.0, -52.0, -4.5, 4.15);
  addWallWithDoor(17.0, -52.0, 17.0, -42.0, -4.5, 4.15, 0.5, {
    id: 'door_u5_cellar',
    nameHi: 'पुराना तेल व अनाज भंडार (U5)',
    floorLevel: -1,
    initialOpen: false,
    autoCreak: false,
  });

  // MID CROSS-CORRIDOR END CAPS (z in [-56, -52], x in [-17, +17])
  addWallSegment(-17.0, -56.0, -17.0, -52.0, -4.5, 4.15);
  addWallSegment(17.0, -56.0, 17.0, -52.0, -4.5, 4.15);

  // TIER 2 (Middle Tier, z in [-66, -56]): U6 | Jogged W-North-Corr | U7 (Well Shaft) | Jogged E-North-Corr | U4
  addWallSegment(-28.0, -56.0, -13.0, -56.0, -4.5, 4.15);
  addWallSegment(-28.0, -66.0, -13.0, -66.0, -4.5, 4.15);
  addWallSegment(-28.0, -66.0, -28.0, -56.0, -4.5, 4.15);
  addWallWithDoor(-13.0, -66.0, -13.0, -56.0, -4.5, 4.15, 0.5, {
    id: 'door_u6_torture',
    nameHi: 'ज़ंजीर व यातना कक्ष (U6)',
    floorLevel: -1,
    initialOpen: false,
    autoCreak: false,
  });

  // Room U7 (कुएं की निचली सुरंग, x: -9..+9, z: -66..-56)
  addWallSegment(-9.0, -66.0, -9.0, -56.0, -4.5, 4.15);
  addWallSegment(9.0, -66.0, 9.0, -56.0, -4.5, 4.15);
  addWallSegment(-9.0, -66.0, 9.0, -66.0, -4.5, 4.15);
  addWallWithDoor(-9.0, -56.0, 9.0, -56.0, -4.5, 4.15, 0.5, {
    id: 'door_u7_well_shaft',
    nameHi: 'कुएं की निचली सुरंग (U7)',
    floorLevel: -1,
    initialOpen: false,
    autoCreak: false,
  });

  // Room U4 (गुप्त खज़ाना तिजोरी, x: 13..28, z: -66..-56)
  addWallSegment(13.0, -56.0, 28.0, -56.0, -4.5, 4.15);
  addWallSegment(13.0, -66.0, 28.0, -66.0, -4.5, 4.15);
  addWallSegment(28.0, -66.0, 28.0, -56.0, -4.5, 4.15);
  addWallWithDoor(13.0, -66.0, 13.0, -56.0, -4.5, 4.15, 0.5, {
    id: 'door_u4_vault',
    nameHi: 'गुप्त खज़ाना तिजोरी (U4)',
    floorLevel: -1,
    initialOpen: false,
    autoCreak: false,
  });

  // NORTH CROSS-CORRIDOR END CAPS & DEAD-END #2 (z in [-70, -66], x in [-26, +21])
  addWallSegment(-26.0, -70.0, -26.0, -66.0, -4.5, 4.15);
  addWallSegment(21.0, -70.0, 21.0, -66.0, -4.5, 4.15);
  addWallSegment(16.0, -70.0, 21.0, -70.0, -4.5, 4.15);

  // TIER 3 (Deep North Tier, z in [-80, -70]): U8 | U9 | U10
  addWallSegment(-26.0, -80.0, 16.0, -80.0, -4.5, 4.15);
  addWallSegment(-26.0, -80.0, -26.0, -70.0, -4.5, 4.15);
  addWallSegment(-11.0, -80.0, -11.0, -70.0, -4.5, 4.15);
  addWallSegment(2.0, -80.0, 2.0, -70.0, -4.5, 4.15);
  addWallSegment(16.0, -80.0, 16.0, -70.0, -4.5, 4.15);

  // Room U8 (टूटी मूर्तियों का कक्ष, x: -26..-11, z: -80..-70)
  addWallWithDoor(-26.0, -70.0, -11.0, -70.0, -4.5, 4.15, 0.5, {
    id: 'door_u8_idols',
    nameHi: 'टूटी मूर्तियों का कक्ष (U8)',
    floorLevel: -1,
    initialOpen: false,
    autoCreak: false,
  });

  // Room U9 (धंसी हुई सुरंग, x: -11..+2, z: -80..-70)
  addWallWithDoor(-11.0, -70.0, 2.0, -70.0, -4.5, 4.15, 0.5, {
    id: 'door_u9_collapsed',
    nameHi: 'धंसी हुई सुरंग (U9)',
    floorLevel: -1,
    initialOpen: false,
    autoCreak: false,
  });

  // Room U10 (प्राचीन अस्थि कक्ष, x: +2..+16, z: -80..-70)
  addWallWithDoor(2.0, -70.0, 16.0, -70.0, -4.5, 4.15, 0.5, {
    id: 'door_u10_crypt',
    nameHi: 'प्राचीन अस्थि कक्ष (U10)',
    floorLevel: -1,
    initialOpen: false,
    autoCreak: false,
  });

  // Open Archway Portal at bottom of descending basement stairs (x = 8.5, z = -41.8)
  createDoorwayWithDoor({
    id: 'door_tehkhana',
    nameHi: 'तहखाना भूल-भुलैया मुख्य द्वार (Labyrinth Entrance)',
    x: 8.5,
    yBottom: -4.5,
    z: -41.8,
    axis: 'x',
    width: 3.2,
    floorLevel: -1,
    initialOpen: true,
    autoCreak: false,
    archwayOnly: true,
  });

  // ==========================================================================
  // 4. MASSIVE 3-STORY OPEN CENTRAL ROYAL DARBAR ATRIUM (32m WIDE x 28m DEEP x 17m HIGH)
  //    Long Crimson Royal Carpet, 8 Towering 15m Carved Sandstone Pillars & Giant 12m Chandelier!
  // ==========================================================================

  // 4.1 LONG CRIMSON ROYAL CARPET WITH GOLD ZARI BORDER (runs 19.6m from Front Door to Grand Double-Wing Staircase)
  const buildRoyalCarpetTexture = (): THREE.CanvasTexture => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 1024;
    const ctx = c.getContext('2d')!;
    // Deep royal crimson velvet base
    ctx.fillStyle = '#5a0914';
    ctx.fillRect(0, 0, 512, 1024);

    // Subtle woven fabric striation
    for (let y = 0; y < 1024; y += 6) {
      ctx.fillStyle = y % 12 === 0 ? 'rgba(120, 14, 28, 0.35)' : 'rgba(38, 4, 10, 0.25)';
      ctx.fillRect(0, y, 512, 3);
    }

    // Double antique gold zari side borders
    ctx.fillStyle = '#c49438';
    ctx.fillRect(14, 0, 18, 1024);
    ctx.fillRect(480, 0, 18, 1024);
    ctx.fillStyle = '#8b5e1a';
    ctx.fillRect(42, 0, 10, 1024);
    ctx.fillRect(460, 0, 10, 1024);

    // Repeating Rajasthani lotus diamond medallions down the royal aisle
    ctx.strokeStyle = 'rgba(214, 166, 68, 0.62)';
    ctx.lineWidth = 4;
    for (let my = 128; my < 1024; my += 256) {
      ctx.beginPath();
      ctx.moveTo(256, my - 72);
      ctx.lineTo(356, my);
      ctx.lineTo(256, my + 72);
      ctx.lineTo(156, my);
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = 'rgba(166, 20, 38, 0.55)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(256, my, 24, 0, Math.PI * 2);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 3);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  const royalCarpetMat = new THREE.MeshStandardMaterial({
    map: buildRoyalCarpetTexture(),
    roughness: 0.86,
    metalness: 0.08,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const royalCarpetMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(7.4, 31.1),
    royalCarpetMat,
  );
  royalCarpetMesh.rotation.x = -Math.PI / 2;
  royalCarpetMesh.position.set(0, 0.018, -6.05); // z = +9.50 straight back to z = -21.60 (foot of Grand Staircase!)
  royalCarpetMesh.receiveShadow = true;
  root.add(royalCarpetMesh);

  // 4.2 TWELVE TOWERING 17m CARVED SANDSTONE ROYAL PILLARS (6 on the Left at x = -14.8, 6 on the Right at x = +14.8)
  const addToweringRoyalPillar = (px: number, pz: number) => {
    const pGroup = new THREE.Group();
    pGroup.position.set(px, 0, pz);

    // Heavy stepped square royal plinth
    const plinth1 = new THREE.Mesh(
      new THREE.BoxGeometry(1.24, 0.45, 1.24),
      carvedSandstoneMat,
    );
    plinth1.position.y = 0.225;
    const plinth2 = new THREE.Mesh(
      new THREE.BoxGeometry(1.02, 0.42, 1.02),
      carvedSandstoneMat,
    );
    plinth2.position.y = 0.66;
    pGroup.add(plinth1, plinth2);

    // Fluted 12-sided towering sandstone shaft rising 16.8m from GF straight to the 17m atrium ceiling
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.46, 15.4, 12),
      carvedSandstoneMat,
    );
    shaft.position.y = 8.55;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    pGroup.add(shaft);

    // Ornate carved lotus collar bands & brass rings at 2F (y=5.0), 3F (y=10.0) & Ceiling Capital (y=16.4)
    [4.95, 9.95, 16.4].forEach((ry) => {
      const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.58, 0.48, 0.44, 12),
        carvedSandstoneMat,
      );
      collar.position.y = ry;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.47, 0.048, 8, 16),
        brassMat,
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = ry - 0.24;
      pGroup.add(collar, ring);
    });

    // Grand corbel capital supporting the 17m coffered ceiling beams
    const capital = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.44, 1.42),
      carvedSandstoneMat,
    );
    capital.position.y = 16.72;
    pGroup.add(capital);

    root.add(pGroup);

    // Strict AABB collider spanning all 3 stories
    wallColliders.push({
      minX: px - 0.48,
      maxX: px + 0.48,
      minZ: pz - 0.48,
      maxZ: pz + 0.48,
      minY: 0.0,
      maxY: 17.0,
    });
  };

  [-14.8, 14.8].forEach((px) => {
    [5.5, 0.1, -5.3, -10.7, -16.1, -21.5].forEach((pz) => {
      addToweringRoyalPillar(px, pz);
    });
  });

  // Grand Interior Cusped Sandstone Arches spanning between the towering pillars along both sides of the Royal Hall
  [-14.8, 14.8].forEach((sideX) => {
    [2.8, -2.6, -8.0, -13.4, -18.8].forEach((az) => {
      [0.0, 5.0, 10.0].forEach((ay) => {
        const spanArch = buildRajasthaniCuspedArch(
          4.8,
          4.45,
          0.44,
          carvedSandstoneMat,
        );
        spanArch.position.set(sideX, ay, az);
        spanArch.rotation.y = Math.PI / 2;
        root.add(spanArch);
      });
    });
  });

  // 4.3 GIANT ORNATE ANTIQUE BRASS/GOLD CHANDELIER SUSPENDED 13.8 METERS HIGH IN THE 17m OPEN ATRIUM VOID
  let grandChandelierGroup: THREE.Group | null = null;
  const buildGiantRoyalChandelier = () => {
    const chandGroup = new THREE.Group();
    grandChandelierGroup = chandGroup;
    chandGroup.name = 'GiantAntiqueRoyalChandelier';
    chandGroup.position.set(0, 13.8, -6.5);
    chandGroup.scale.setScalar(1.38);

    const antiqueBrassGoldMat = new THREE.MeshStandardMaterial({
      color: 0xe0ae45,
      emissive: 0x382206,
      emissiveIntensity: 0.22,
      roughness: 0.24,
      metalness: 0.9,
    });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xfff3de,
      emissive: 0xffb24c,
      emissiveIntensity: 0.65,
      roughness: 0.1,
      metalness: 0.35,
      transparent: true,
      opacity: 0.9,
    });
    const candleWaxMat = new THREE.MeshStandardMaterial({
      color: 0xf7eed8,
      roughness: 0.7,
    });

    // Shared geometries across all 28 chandelier candles, arms, and crystal prism drops
    const candleFlameGeo = new THREE.ConeGeometry(0.06, 0.21, 6);
    const cupGeo = new THREE.CylinderGeometry(0.13, 0.065, 0.09, 10);
    const waxGeo = new THREE.CylinderGeometry(0.046, 0.052, 0.3, 8);
    const dropGeo = new THREE.OctahedronGeometry(0.115, 0);
    const garlandBeadGeo = new THREE.SphereGeometry(0.055, 6, 6);

    // Ornate antique brass suspension rod, ceiling lotus medallion & turned royal baluster stem
    const suspChain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.072, 3.1, 10),
      antiqueBrassGoldMat,
    );
    suspChain.position.y = 1.55;
    const ceilingRose = new THREE.Mesh(
      new THREE.CylinderGeometry(0.86, 0.52, 0.32, 16),
      antiqueBrassGoldMat,
    );
    ceilingRose.position.y = 2.9;
    const crownRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.065, 8, 24),
      antiqueBrassGoldMat,
    );
    crownRing.rotation.x = Math.PI / 2;
    crownRing.position.y = 1.18;

    const stemLatheGeo = new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.0, -1.8),
        new THREE.Vector2(0.24, -1.55),
        new THREE.Vector2(0.11, -1.15),
        new THREE.Vector2(0.28, -0.55),
        new THREE.Vector2(0.12, 0.05),
        new THREE.Vector2(0.22, 0.65),
        new THREE.Vector2(0.09, 1.15),
      ],
      14,
    );
    const centralStem = new THREE.Mesh(stemLatheGeo, antiqueBrassGoldMat);
    const lowerFinial = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.36, 1),
      crystalMat,
    );
    lowerFinial.scale.set(0.75, 1.5, 0.75);
    lowerFinial.position.y = -2.18;
    chandGroup.add(suspChain, ceilingRose, crownRing, centralStem, lowerFinial);

    // 4 Sweeping antique brass support chains from upper crown to outer tier ring
    const chainStrutGeo = new THREE.CylinderGeometry(0.025, 0.025, 3.65, 6);
    for (let c = 0; c < 4; c++) {
      const ang = (c / 4) * Math.PI * 2 + Math.PI / 4;
      const strut = new THREE.Mesh(chainStrutGeo, antiqueBrassGoldMat);
      strut.position.set(Math.cos(ang) * 1.38, -0.02, Math.sin(ang) * 1.38);
      strut.rotation.z = Math.cos(ang) * 0.74;
      strut.rotation.x = -Math.sin(ang) * 0.74;
      chandGroup.add(strut);
    }

    // 3 Concentric Ornate Antique Brass/Gold Tiers with Scroll Arms, Crystal Garlands & 28 Flickering Candles
    const tiers = [
      { y: -1.18, radius: 2.75, candles: 14 },
      { y: -0.24, radius: 1.85, candles: 8 },
      { y: 0.6, radius: 1.02, candles: 6 },
    ];
    tiers.forEach((tier, tIdx) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(tier.radius, 0.085, 10, 36),
        antiqueBrassGoldMat,
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = tier.y;
      chandGroup.add(ring);

      const innerBand = new THREE.Mesh(
        new THREE.TorusGeometry(tier.radius * 0.94, 0.036, 8, 30),
        ironMat,
      );
      innerBand.rotation.x = Math.PI / 2;
      innerBand.position.y = tier.y + 0.09;
      chandGroup.add(innerBand);

      const armGeo = new THREE.BoxGeometry(tier.radius, 0.06, 0.06);
      for (let i = 0; i < tier.candles; i++) {
        const ang = (i / tier.candles) * Math.PI * 2 + tIdx * 0.35;
        const cx = Math.cos(ang) * tier.radius;
        const cz = Math.sin(ang) * tier.radius;

        const arm = new THREE.Mesh(armGeo, antiqueBrassGoldMat);
        arm.position.set(cx * 0.5, tier.y - 0.04, cz * 0.5);
        arm.rotation.y = -ang;
        chandGroup.add(arm);

        const cup = new THREE.Mesh(cupGeo, antiqueBrassGoldMat);
        cup.position.set(cx, tier.y + 0.09, cz);
        const wax = new THREE.Mesh(waxGeo, candleWaxMat);
        wax.position.set(cx, tier.y + 0.25, cz);
        const fMat = new THREE.MeshBasicMaterial({ color: 0xffc058 });
        const flame = new THREE.Mesh(candleFlameGeo, fMat);
        flame.position.set(cx, tier.y + 0.49, cz);
        chandGroup.add(cup, wax, flame);

        // Hanging crystal prism drop & garland bead beneath each candle arm
        const drop = new THREE.Mesh(dropGeo, crystalMat);
        drop.scale.set(0.65, 1.9, 0.65);
        drop.position.set(cx * 0.94, tier.y - 0.3, cz * 0.94);
        const bead = new THREE.Mesh(garlandBeadGeo, crystalMat);
        bead.position.set(cx * 0.72, tier.y - 0.16, cz * 0.72);
        chandGroup.add(drop, bead);

        flickeringLights.push({
          light: undefined,
          baseIntensity: 1.0,
          phase: tIdx * 2.1 + i * 0.72,
          flameMesh: flame,
          baseColor: 0xffc058,
        });
      }
    });

    // Warm grand atrium chandelier illumination washing all 3 stories & the crimson carpet below
    if (!disableExtraLights) {
      const chandMainLight = new THREE.PointLight(0xffbe68, 7.5, 62, 0.88);
      chandMainLight.position.set(0, -1.2, 0);
      chandGroup.add(chandMainLight);
      flickeringLights.push({
        light: chandMainLight,
        baseIntensity: 7.5,
        phase: 1.35,
        flameMesh: undefined,
        baseColor: 0xffbe68,
      });
    }

    root.add(chandGroup);
  };
  buildGiantRoyalChandelier();

  // 4.4 GRAND HAUNTED RAJASTHANI ROYAL PALACE INTERIOR & EXTERIOR DECORATIONS
  // (Thakur Throne Dais + Brass Deepstambhs, Antique Spears/Shields, Tattered Velvet Curtains,
  //  Glowing Iron Wall Mashals, Rajputana Scalloped Mehrab Arches, Thakur & Bride Rukmini Portraits,
  //  and Exterior Weathered Stone Guardian Statues)
  buildRoyalPalaceDecorations({
    root,
    wallColliders,
    flickeringLights,
    swayingCurtains,
    watchingEyes,
    disableExtraLights,
    materials: {
      carvedSandstoneMat,
      brassMat,
      ironMat,
      woodMat,
      stairCarpetMat,
    },
  });

  // Subtle 1992 indoor horror details: translucent ceiling-corner cobwebs,
  // faded red handprint smudges near staircases, and swaying torn corridor curtains
  buildIndoor1992HorrorDetails({
    root,
    swayingCurtains,
    brassMat,
  });

  // Keep exported centralCourtyardWell anchor aligned with the Walled Back Courtyard Well (0, 0, -52.5)
  const centralCourtyardWell = new THREE.Group();
  centralCourtyardWell.name = 'CentralCourtyardWellAnchor';
  centralCourtyardWell.position.set(0, 0, -52.5);
  root.add(centralCourtyardWell);

  // Jali Windows with Moonlight Spill across Ground Floor, 2F, and 3F (scaled to x = ±31.88, z = -45.88 / +9.88)
  addJaliWindowWithMoonRay(-31.88, 2.4, 0.75, 'x', 1); // G1: Armory
  addJaliWindowWithMoonRay(31.88, 2.4, 0.75, 'x', -1); // G3: Munim Room
  addJaliWindowWithMoonRay(31.88, 2.4, -18.0, 'x', -1); // G4: Pooja Room
  addJaliWindowWithMoonRay(-31.88, 7.4, 0.75, 'x', 1); // F2-2: Master Bedroom
  addJaliWindowWithMoonRay(31.88, 7.4, 0.75, 'x', -1); // F2-1: Bridal Room
  addJaliWindowWithMoonRay(0.0, 7.4, -45.88, 'z', 1); // 2F North Gallery window
  addJaliWindowWithMoonRay(0.0, 7.4, 9.88, 'z', -1); // 2F South Jharokha window
  addJaliWindowWithMoonRay(-31.88, 12.6, 0.75, 'x', 1); // F3-1: Tantrik Library
  addJaliWindowWithMoonRay(31.88, 12.6, 0.75, 'x', -1); // F3-2: Aaina Mahal
  addJaliWindowWithMoonRay(0.0, 12.6, -45.88, 'z', 1); // 3F North window
  addJaliWindowWithMoonRay(0.0, 12.6, 9.88, 'z', -1); // 3F South window

  // Swaying Torn Curtains across royal hall arches & chambers
  addSwayingCurtain(-10.2, 4.1, 6.2, 0);
  addSwayingCurtain(10.2, 4.1, 6.2, 0);
  addSwayingCurtain(20.5, 8.6, 2.5, 0.4);
  addSwayingCurtain(26.5, 8.6, 2.5, -0.4);
  addSwayingCurtain(22.5, 14.6, -7.5, 0.2);

  // Cobwebs in Room Corners across Basement, GF, 2F, and 3F
  [
    [-31.1, 4.3, 9.1, 0.7],
    [-31.1, 4.3, -45.1, 2.1],
    [31.1, 4.3, 9.1, -0.7],
    [31.1, 4.3, -45.1, -2.1],
    [-31.1, 9.3, 9.1, 0.7],
    [-31.1, 9.3, -45.1, -2.1],
    [-31.1, 16.1, 9.1, 0.7],
    [-31.1, 16.1, -45.1, -2.1],
    [-15.1, -0.7, -58.1, 0.8],
  ].forEach(([cx, cy, cz, cr]) => addCobwebCorner(cx, cy, cz, cr));

  // ==========================================================================
  // 4B. EXTERIOR DIRT FOREST ROAD, BROKEN-DOWN SUV, SEMI-OPEN JUNGLE & DISTANT VILLAGE VISTA
  // ==========================================================================

  // Inner courtyard garden border fences around front yard corners (keeping path to Guardhouse & Main Door open)
  const addDarkGardenFence = (
    xStart: number,
    zStart: number,
    xEnd: number,
    zEnd: number,
    posts = 8,
  ) => {
    const fenceGroup = new THREE.Group();
    const dx = xEnd - xStart;
    const dz = zEnd - zStart;
    const len = Math.hypot(dx, dz);
    const angle = -Math.atan2(dz, dx);

    const railTop = new THREE.Mesh(
      new THREE.BoxGeometry(len, 0.06, 0.06),
      ironMat,
    );
    railTop.position.set((xStart + xEnd) * 0.5, 1.35, (zStart + zEnd) * 0.5);
    railTop.rotation.y = angle;
    const railBot = new THREE.Mesh(
      new THREE.BoxGeometry(len, 0.06, 0.06),
      ironMat,
    );
    railBot.position.set((xStart + xEnd) * 0.5, 0.45, (zStart + zEnd) * 0.5);
    railBot.rotation.y = angle;
    fenceGroup.add(railTop, railBot);

    for (let p = 0; p <= posts; p++) {
      const t = p / posts;
      const px = xStart + dx * t;
      const pz = zStart + dz * t;
      const picket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.03, 1.55, 6),
        ironMat,
      );
      picket.position.set(px, 0.775, pz);
      const finial = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.16, 6),
        ironMat,
      );
      finial.position.set(px, 1.6, pz);
      fenceGroup.add(picket, finial);
    }
    root.add(fenceGroup);

    const isHoriz = Math.abs(dx) >= Math.abs(dz);
    wallColliders.push({
      minX: isHoriz ? Math.min(xStart, xEnd) : Math.min(xStart, xEnd) - 0.12,
      maxX: isHoriz ? Math.max(xStart, xEnd) : Math.max(xStart, xEnd) + 0.12,
      minZ: isHoriz ? Math.min(zStart, zEnd) - 0.12 : Math.min(zStart, zEnd),
      maxZ: isHoriz ? Math.max(zStart, zEnd) + 0.12 : Math.max(zStart, zEnd),
      minY: 0,
      maxY: 2.2,
    });
  };

  // Crumbling sandstone heritage garden pillars tucked off the 360° walking paths
  [
    [-12.2, -58.8, 2.2],
    [12.2, -58.8, 1.9],
    [-33.4, -48.5, 2.5],
    [33.4, -48.5, 2.1],
    [-33.4, -18.0, 1.8],
    [33.4, -18.0, 2.0],
  ].forEach(([px, pz, ph], idx) => {
    const colGroup = new THREE.Group();
    colGroup.position.set(px, 0, pz);
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.42, 0.82),
      carvedSandstoneMat,
    );
    plinth.position.y = 0.21;
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.3, ph, 8),
      carvedSandstoneMat,
    );
    shaft.position.y = 0.42 + ph * 0.5;
    shaft.rotation.z = idx % 2 === 0 ? 0.04 : -0.05;
    shaft.castShadow = true;
    colGroup.add(plinth, shaft);
    root.add(colGroup);
    wallColliders.push({
      minX: px - 0.42,
      maxX: px + 0.42,
      minZ: pz - 0.42,
      maxZ: pz + 0.42,
      minY: 0,
      maxY: ph + 0.5,
    });
  });

  // Dry Tulsi Chaura (sacred courtyard altar) inside the west front forecourt garden
  const tulsiGroup = new THREE.Group();
  tulsiGroup.position.set(-10.5, 0, 14.5);
  const tulsiBase1 = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.45, 1.3),
    carvedSandstoneMat,
  );
  tulsiBase1.position.y = 0.225;
  const tulsiBase2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.75, 0.85),
    carvedSandstoneMat,
  );
  tulsiBase2.position.y = 0.825;
  const deadStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.03, 0.55, 6),
    woodMat,
  );
  deadStem.position.y = 1.45;
  deadStem.rotation.z = 0.18;
  tulsiGroup.add(tulsiBase1, tulsiBase2, deadStem);
  root.add(tulsiGroup);
  wallColliders.push({
    minX: -11.2,
    maxX: -9.8,
    minZ: 13.8,
    maxZ: 15.2,
    minY: 0,
    maxY: 2.0,
  });

  // 1) DIRT / GRAVEL FOREST ROAD WITH MUDDY TIRE TRACKS (z = 34.0 back to z = 96.0)
  const buildDirtForestRoad = () => {
    const roadCanvas = document.createElement('canvas');
    roadCanvas.width = 512;
    roadCanvas.height = 512;
    const rCtx = roadCanvas.getContext('2d')!;

    // Dark muddy jungle verges blending into a packed ochre-brown gravel track
    const vergeGrad = rCtx.createLinearGradient(0, 0, 512, 0);
    vergeGrad.addColorStop(0.0, '#181a12');
    vergeGrad.addColorStop(0.14, '#2f261c');
    vergeGrad.addColorStop(0.28, '#463829');
    vergeGrad.addColorStop(0.5, '#524130');
    vergeGrad.addColorStop(0.72, '#463829');
    vergeGrad.addColorStop(0.86, '#2f261c');
    vergeGrad.addColorStop(1.0, '#181a12');
    rCtx.fillStyle = vergeGrad;
    rCtx.fillRect(0, 0, 512, 512);

    // Distinct dark wet tire tracks along left & right wheel lanes
    [176, 336].forEach((laneX) => {
      const rutGrad = rCtx.createLinearGradient(laneX - 38, 0, laneX + 38, 0);
      rutGrad.addColorStop(0.0, 'rgba(20, 14, 10, 0.0)');
      rutGrad.addColorStop(0.32, 'rgba(22, 15, 10, 0.72)');
      rutGrad.addColorStop(0.5, 'rgba(14, 10, 7, 0.88)');
      rutGrad.addColorStop(0.68, 'rgba(22, 15, 10, 0.72)');
      rutGrad.addColorStop(1.0, 'rgba(20, 14, 10, 0.0)');
      rCtx.fillStyle = rutGrad;
      rCtx.fillRect(laneX - 38, 0, 76, 512);

      // Tire tread cross-ribs
      rCtx.fillStyle = 'rgba(10, 7, 5, 0.35)';
      for (let ty = 0; ty < 512; ty += 14) {
        rCtx.fillRect(laneX - 18, ty, 36, 4);
      }
    });

    // Gravel speckles & pebbles across road surface
    for (let i = 0; i < 2600; i++) {
      const gx = (i * 197 + 13) % 512;
      const gy = (i * 313 + 7) % 512;
      const rad = 1 + (i % 3);
      rCtx.fillStyle =
        i % 3 === 0 ? 'rgba(115, 98, 78, 0.36)' : 'rgba(28, 22, 16, 0.42)';
      rCtx.fillRect(gx, gy, rad, rad);
    }

    const roadTex = new THREE.CanvasTexture(roadCanvas);
    roadTex.wrapS = THREE.ClampToEdgeWrapping;
    roadTex.wrapT = THREE.RepeatWrapping;
    roadTex.repeat.set(1, 8);
    roadTex.colorSpace = THREE.SRGBColorSpace;

    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.94,
      metalness: 0.02,
    });

    const roadLen = 62;
    const roadMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(7.2, roadLen),
      roadMat,
    );
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0.012, 34.0 + roadLen * 0.5);
    roadMesh.receiveShadow = true;
    root.add(roadMesh);

    // Subtle 3D tire-rut wheel tracks extending from deep forest straight to the broken-down SUV rear wheels
    const rutStripMat = new THREE.MeshStandardMaterial({
      color: 0x1a130e,
      roughness: 0.98,
    });
    [-2.05, -0.85].forEach((rx) => {
      const rut = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.018, 44),
        rutStripMat,
      );
      rut.position.set(rx + 0.15, 0.014, 63.6);
      rut.rotation.y = 0.03;
      root.add(rut);
    });

    // Natural low bush clusters & weathered roadside stone clusters framing the forest road
    // (Zero pointy green cones; skips the South 360° cross-path turnoff z in [15.0..19.4] so walking paths stay 100% clear!)
    const roadsideRockMats = [
      new THREE.MeshStandardMaterial({ color: 0x34312d, roughness: 0.94, metalness: 0.02 }),
      new THREE.MeshStandardMaterial({ color: 0x423d36, roughness: 0.92, metalness: 0.03 }),
    ];
    const roadsideBushMats = [
      new THREE.MeshStandardMaterial({ color: 0x101e11, roughness: 0.95, metalness: 0.01 }),
      new THREE.MeshStandardMaterial({ color: 0x162716, roughness: 0.94, metalness: 0.01 }),
      new THREE.MeshStandardMaterial({ color: 0x1c2e19, roughness: 0.93, metalness: 0.02 }),
    ];
    const sharedRoadRockGeo = new THREE.DodecahedronGeometry(0.24, 0);
    const makeLowBushGeo = (seed: number) => {
      const geo = new THREE.IcosahedronGeometry(0.38, 1);
      const posAttr = geo.attributes.position;
      for (let vi = 0; vi < posAttr.count; vi++) {
        const vx = posAttr.getX(vi);
        const vy = posAttr.getY(vi);
        const vz = posAttr.getZ(vi);
        const n =
          1 +
          0.2 * Math.sin(vx * 5.2 + seed) * Math.cos(vz * 4.8 - seed * 0.7) +
          0.12 * Math.sin(vy * 6.4 + seed * 1.3);
        // Slightly flatten bottom so bushes hug the earth organically
        const yMul = vy < 0 ? 0.58 : 0.84;
        posAttr.setXYZ(vi, vx * n, vy * n * yMul, vz * n);
      }
      geo.computeVertexNormals();
      return geo;
    };
    const roadBushGeos = [makeLowBushGeo(1.1), makeLowBushGeo(3.4)];

    const placeRoadsideCluster = (z: number, side: number, sIdx: number) => {
      const seed = Math.round(z * 3) + sIdx * 17;
      const edgeX = side * (4.05 + (seed % 5) * 0.24);

      // Weathered stone cluster (main rock + 1-2 nested companion pebbles grounded flush)
      const rockGroup = new THREE.Group();
      rockGroup.position.set(edgeX, 0, z);
      const mainRock = new THREE.Mesh(
        sharedRoadRockGeo,
        roadsideRockMats[seed % roadsideRockMats.length],
      );
      const rScale = 0.78 + (seed % 3) * 0.28;
      mainRock.scale.set(rScale * 1.35, rScale * 0.56, rScale * 1.12);
      mainRock.position.y = rScale * 0.09;
      mainRock.rotation.set(0.12, seed * 0.85, -0.08);
      mainRock.receiveShadow = true;
      rockGroup.add(mainRock);

      const subRock = new THREE.Mesh(
        sharedRoadRockGeo,
        roadsideRockMats[(seed + 1) % roadsideRockMats.length],
      );
      subRock.scale.set(rScale * 0.68, rScale * 0.42, rScale * 0.62);
      subRock.position.set(side * 0.28, rScale * 0.06, 0.24);
      subRock.rotation.set(-0.1, seed * 1.4, 0.14);
      rockGroup.add(subRock);
      root.add(rockGroup);

      // Natural low multi-lobe bush cluster tucked along the road verge (never pointy cones)
      const bushGroup = new THREE.Group();
      bushGroup.position.set(edgeX + side * (0.62 + (seed % 3) * 0.18), 0, z + 0.9);
      const lobeCount = 3 + (seed % 2);
      for (let b = 0; b < lobeCount; b++) {
        const ang = (b / lobeCount) * Math.PI * 2 + seed * 0.5;
        const rad = b === 0 ? 0 : 0.26 + (b % 2) * 0.14;
        const lobe = new THREE.Mesh(
          roadBushGeos[(seed + b) % roadBushGeos.length],
          roadsideBushMats[(seed + b) % roadsideBushMats.length],
        );
        const sc = b === 0 ? 1.05 + (seed % 3) * 0.14 : 0.72 + ((seed + b) % 3) * 0.12;
        lobe.scale.set(sc * 1.18, sc * 0.68, sc * 1.08);
        lobe.position.set(Math.cos(ang) * rad, sc * 0.19, Math.sin(ang) * rad);
        lobe.rotation.y = ang + b * 0.9;
        lobe.receiveShadow = true;
        bushGroup.add(lobe);
      }
      root.add(bushGroup);
      stormWeather.registerSwayBush(bushGroup, z * 0.37 + side * 1.4);
    };

    // Flanking pairs right by the outer gate corners (z = 34.7, south of outer gate)
    placeRoadsideCluster(34.7, -1, 0);
    placeRoadsideCluster(34.7, 1, 1);

    // Along the incoming dirt forest road south of the 360° cross-path junction (z = 40.4 .. 84.4)
    for (let z = 40.4; z <= 84.4; z += 3.0) {
      [-1, 1].forEach((side, sIdx) => {
        placeRoadsideCluster(z, side, sIdx);
      });
    }

    // Weathered Kali Ghati milestone post beside the road
    const mileStone = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.78, 0.24),
      carvedSandstoneMat,
    );
    mileStone.position.set(4.1, 0.36, 46.9);
    mileStone.rotation.y = -0.18;
    root.add(mileStone);
    const mileCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.24, 12, 1, false, 0, Math.PI),
      carvedSandstoneMat,
    );
    mileCap.rotation.x = Math.PI / 2;
    mileCap.rotation.z = -0.18;
    mileCap.position.set(4.1, 0.75, 46.9);
    root.add(mileCap);
  };
  buildDirtForestRoad();

  // 2) BROKEN-DOWN 3D SUV OUTSIDE THE OUTER HAVELI GATE (x = -1.45, z = 41.0)
  // Refined SUV with sloped windshield, cleaner open hood, wheel arches, side mirrors,
  // blinking 4-way amber hazard lights, faint warm interior dashboard glow & soft rising steam!
  const bonnetSteamParticles: Array<{
    sprite: THREE.Sprite;
    mat: THREE.SpriteMaterial;
    phase: number;
    baseX: number;
    baseZ: number;
    driftX: number;
    driftZ: number;
    speed: number;
    baseScale: number;
    maxScale: number;
    baseRot: number;
    rotSpeed: number;
  }> = [];

  let suvHazardLensMat: THREE.MeshStandardMaterial | null = null;
  let suvHazardFrontLight: THREE.PointLight | null = null;
  let suvHazardRearLight: THREE.PointLight | null = null;
  const suvHazardGlowMats: THREE.SpriteMaterial[] = [];

  const createSoftSmokeSpriteTexture = (): THREE.CanvasTexture => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);

    // Layered feathered radial puffs for an organic wispy steam/smoke cloud
    const puffs: Array<[number, number, number, number]> = [
      [64, 64, 54, 0.52],
      [48, 56, 38, 0.36],
      [80, 60, 36, 0.34],
      [62, 46, 34, 0.3],
      [58, 76, 36, 0.28],
    ];
    puffs.forEach(([px, py, rad, alpha]) => {
      const grad = ctx.createRadialGradient(px, py, rad * 0.08, px, py, rad);
      grad.addColorStop(0, `rgba(226, 234, 244, ${alpha})`);
      grad.addColorStop(0.45, `rgba(196, 208, 222, ${alpha * 0.55})`);
      grad.addColorStop(0.78, `rgba(165, 178, 194, ${alpha * 0.16})`);
      grad.addColorStop(1, 'rgba(148, 163, 184, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, rad, 0, Math.PI * 2);
      ctx.fill();
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  };
  const sharedBonnetSmokeTex = createSoftSmokeSpriteTexture();

  const createAmberHazardSpriteTexture = (): THREE.CanvasTexture => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0.0, 'rgba(255, 210, 95, 0.95)');
    grad.addColorStop(0.32, 'rgba(255, 132, 18, 0.58)');
    grad.addColorStop(0.7, 'rgba(235, 86, 0, 0.18)');
    grad.addColorStop(1.0, 'rgba(180, 50, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };
  const sharedAmberHazardTex = createAmberHazardSpriteTexture();

  const buildBrokenDownSUV = () => {
    const suvGroup = new THREE.Group();
    suvGroup.name = 'BrokenDownSUV';
    suvGroup.position.set(-1.45, 0, 41.0);
    suvGroup.rotation.y = 0.08; // Angled slightly toward the Outer Gate (-Z)

    const bodyPaintMat = new THREE.MeshStandardMaterial({
      color: 0x252d38,
      roughness: 0.42,
      metalness: 0.52,
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x1a1e24,
      roughness: 0.62,
      metalness: 0.65,
    });
    const bumperTrimMat = new THREE.MeshStandardMaterial({
      color: 0x15171b,
      roughness: 0.82,
      metalness: 0.25,
    });
    const tireRubberMat = new THREE.MeshStandardMaterial({
      color: 0x101113,
      roughness: 0.94,
      metalness: 0.06,
    });
    const rimMetalMat = new THREE.MeshStandardMaterial({
      color: 0x868e98,
      roughness: 0.32,
      metalness: 0.88,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x101b28,
      roughness: 0.12,
      metalness: 0.82,
      transparent: true,
      opacity: 0.58,
    });
    const mirrorGlassMat = new THREE.MeshStandardMaterial({
      color: 0x90a4ba,
      roughness: 0.12,
      metalness: 0.95,
    });
    const headlightGlowMat = new THREE.MeshStandardMaterial({
      color: 0xfff8dc,
      emissive: 0xffeaad,
      emissiveIntensity: 2.3,
      roughness: 0.15,
      metalness: 0.1,
    });
    const tailLightMat = new THREE.MeshStandardMaterial({
      color: 0x550808,
      emissive: 0xd81b14,
      emissiveIntensity: 1.4,
      roughness: 0.25,
    });
    suvHazardLensMat = new THREE.MeshStandardMaterial({
      color: 0x5c2900,
      emissive: 0xff7b00,
      emissiveIntensity: 0.0,
      roughness: 0.2,
      metalness: 0.15,
    });

    // Lower body chassis (split rear + front fenders around recessed engine bay)
    const lowerMainBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.94, 0.68, 3.06),
      bodyPaintMat,
    );
    lowerMainBody.position.set(0, 0.72, 0.66);
    lowerMainBody.castShadow = true;
    lowerMainBody.receiveShadow = true;
    suvGroup.add(lowerMainBody);

    // Front left & right engine-bay side fenders + front nose fascia
    [-0.82, 0.82].forEach((fx) => {
      const fenderSide = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.62, 1.38),
        bodyPaintMat,
      );
      fenderSide.position.set(fx, 0.71, -1.52);
      fenderSide.castShadow = true;
      suvGroup.add(fenderSide);
    });
    const frontNose = new THREE.Mesh(
      new THREE.BoxGeometry(1.92, 0.56, 0.26),
      bodyPaintMat,
    );
    frontNose.position.set(0, 0.68, -2.14);
    frontNose.castShadow = true;
    suvGroup.add(frontNose);

    // Side running boards / off-road step bars between front and rear wheel arches
    [-1.02, 1.02].forEach((sx) => {
      const stepBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.07, 1.95),
        bumperTrimMat,
      );
      stepBar.position.set(sx, 0.36, -0.02);
      suvGroup.add(stepBar);
    });

    // Cabin greenhouse with cleanly sloped front windshield, A/B/C pillars & tapered roofline
    const roofPanel = new THREE.Mesh(
      new THREE.BoxGeometry(1.76, 0.1, 2.28),
      bodyPaintMat,
    );
    roofPanel.position.set(0, 1.72, 0.68);
    roofPanel.castShadow = true;
    suvGroup.add(roofPanel);

    const rearCabinQuarter = new THREE.Mesh(
      new THREE.BoxGeometry(1.82, 0.64, 0.58),
      bodyPaintMat,
    );
    rearCabinQuarter.position.set(0, 1.38, 1.6);
    rearCabinQuarter.castShadow = true;
    suvGroup.add(rearCabinQuarter);

    // Sloped A-pillars framing the angled front windshield
    [-0.86, 0.86].forEach((px) => {
      const aPillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.78, 0.1),
        bodyPaintMat,
      );
      aPillar.position.set(px, 1.39, -0.64);
      aPillar.rotation.x = -0.46;
      suvGroup.add(aPillar);

      const bPillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.68, 0.11),
        bumperTrimMat,
      );
      bPillar.position.set(px, 1.38, 0.36);
      suvGroup.add(bPillar);

      const cPillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.68, 0.14),
        bodyPaintMat,
      );
      cPillar.position.set(px, 1.38, 1.24);
      suvGroup.add(cPillar);

      const roofRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 2.26),
        bodyPaintMat,
      );
      roofRail.position.set(px, 1.7, 0.68);
      suvGroup.add(roofRail);
    });

    // Cleanly sloped front windshield
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(1.66, 0.74, 0.05),
      glassMat,
    );
    windshield.position.set(0, 1.39, -0.64);
    windshield.rotation.x = -0.46;
    suvGroup.add(windshield);

    // Side windows & rear window
    [-0.88, 0.88].forEach((wx) => {
      const sideGlass = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.54, 1.88),
        glassMat,
      );
      sideGlass.position.set(wx, 1.39, 0.44);
      suvGroup.add(sideGlass);
    });
    const rearGlass = new THREE.Mesh(
      new THREE.BoxGeometry(1.52, 0.48, 0.05),
      glassMat,
    );
    rearGlass.position.set(0, 1.4, 1.89);
    rearGlass.rotation.x = 0.14;
    suvGroup.add(rearGlass);

    // Interior Cabin Floor, Front Seats, Steering Wheel & Faint Warm Illuminated Dashboard Glow
    const dashBoard = new THREE.Mesh(
      new THREE.BoxGeometry(1.64, 0.24, 0.46),
      bumperTrimMat,
    );
    dashBoard.position.set(0, 1.12, -0.56);
    suvGroup.add(dashBoard);

    const dashClusterMat = new THREE.MeshStandardMaterial({
      color: 0x3b1f08,
      emissive: 0xff8f2a,
      emissiveIntensity: 1.55,
      roughness: 0.3,
    });
    const dashCluster = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 0.11),
      dashClusterMat,
    );
    dashCluster.position.set(0.38, 1.19, -0.32); // Right-hand drive Indian SUV instrument gauge cluster!
    dashCluster.rotation.x = -0.18;
    suvGroup.add(dashCluster);

    const centerConsoleGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.14),
      dashClusterMat,
    );
    centerConsoleGlow.position.set(0, 1.14, -0.32);
    centerConsoleGlow.rotation.x = -0.15;
    suvGroup.add(centerConsoleGlow);

    const steeringWheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.022, 8, 16),
      bumperTrimMat,
    );
    steeringWheel.position.set(0.38, 1.22, -0.22);
    steeringWheel.rotation.x = -0.32;
    suvGroup.add(steeringWheel);

    // Faint warm interior dashboard PointLight softly illuminating the cabin through windshield & side glass
    if (!disableExtraLights) {
      const cabinDashLight = new THREE.PointLight(0xff8c32, 0.95, 3.2, 1.8);
      cabinDashLight.position.set(0.16, 1.32, -0.26);
      suvGroup.add(cabinDashLight);
      decorativeDynamicLights.push(cabinDashLight);
    }

    // Sculpted Left & Right Side Wing Mirrors
    [-1, 1].forEach((sideSign) => {
      const mirrorGroup = new THREE.Group();
      mirrorGroup.position.set(sideSign * 0.98, 1.14, -0.58);
      const stalk = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.05, 0.06),
        bumperTrimMat,
      );
      stalk.position.set(sideSign * 0.06, 0, 0);
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.14, 0.11),
        bodyPaintMat,
      );
      housing.position.set(sideSign * 0.16, 0.02, -0.02);
      const mirrorGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(0.17, 0.11),
        mirrorGlassMat,
      );
      mirrorGlass.position.set(sideSign * 0.16, 0.02, 0.04);
      mirrorGroup.add(stalk, housing, mirrorGlass);
      suvGroup.add(mirrorGroup);
    });

    // Roof luggage rack
    const rackFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.48, 0.07, 1.78),
      bumperTrimMat,
    );
    rackFrame.position.set(0, 1.8, 0.72);
    suvGroup.add(rackFrame);

    // Heavy front & rear off-road bumpers + slatted radiator grille
    const frontBumper = new THREE.Mesh(
      new THREE.BoxGeometry(2.04, 0.26, 0.24),
      bumperTrimMat,
    );
    frontBumper.position.set(0, 0.44, -2.26);
    const rearBumper = new THREE.Mesh(
      new THREE.BoxGeometry(2.04, 0.26, 0.22),
      bumperTrimMat,
    );
    rearBumper.position.set(0, 0.44, 2.24);
    const grille = new THREE.Mesh(
      new THREE.BoxGeometry(1.06, 0.34, 0.08),
      bumperTrimMat,
    );
    grille.position.set(0, 0.78, -2.24);
    suvGroup.add(frontBumper, rearBumper, grille);
    for (let s = -2; s <= 2; s++) {
      const slat = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.3, 0.09),
        rimMetalMat,
      );
      slat.position.set(s * 0.18, 0.78, -2.25);
      suvGroup.add(slat);
    }

    // Rear-mounted spare tire on tailgate
    const spareTire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.22, 18),
      tireRubberMat,
    );
    spareTire.rotation.x = Math.PI / 2;
    spareTire.position.set(0, 0.9, 2.3);
    suvGroup.add(spareTire);

    // 4 Off-road Wheels + Sculpted Flared Wheel Arches
    const wheelArchGeo = new THREE.TorusGeometry(0.47, 0.075, 8, 16, Math.PI);
    const wheelPositions: Array<[number, number]> = [
      [-0.98, -1.42],
      [0.98, -1.42],
      [-0.98, 1.38],
      [0.98, 1.38],
    ];
    wheelPositions.forEach(([wx, wz]) => {
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.38, 0.26, 18),
        tireRubberMat,
      );
      tire.rotation.z = Math.PI / 2;
      tire.position.set(wx, 0.38, wz);
      tire.castShadow = true;
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.28, 10),
        rimMetalMat,
      );
      rim.rotation.z = Math.PI / 2;
      rim.position.set(wx, 0.38, wz);

      // Sculpted dark flared wheel arch framing each wheel well
      const arch = new THREE.Mesh(wheelArchGeo, bumperTrimMat);
      arch.rotation.y = Math.PI / 2;
      arch.position.set(wx < 0 ? -0.97 : 0.97, 0.43, wz);
      suvGroup.add(tire, rim, arch);
    });

    // Detailed Engine Bay Cavity + Cleaner Open Hinged Hood (with thin steel prop rod!)
    const engineBayFloor = new THREE.Mesh(
      new THREE.BoxGeometry(1.36, 0.12, 1.28),
      bumperTrimMat,
    );
    engineBayFloor.position.set(0, 0.58, -1.52);
    const engineBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.84, 0.34, 0.78),
      darkMetalMat,
    );
    engineBlock.position.set(0, 0.8, -1.46);
    const engineManifold = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.1, 0.56),
      rimMetalMat,
    );
    engineManifold.position.set(0, 0.99, -1.46);
    const batteryBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.22, 0.22),
      bumperTrimMat,
    );
    batteryBox.position.set(-0.5, 0.78, -1.24);
    const radiatorCore = new THREE.Mesh(
      new THREE.BoxGeometry(1.12, 0.34, 0.1),
      darkMetalMat,
    );
    radiatorCore.position.set(0, 0.78, -2.0);
    suvGroup.add(engineBayFloor, engineBlock, engineManifold, batteryBox, radiatorCore);

    // Open hinged bonnet pivoted cleanly at the base of the windshield with steel prop rod
    const bonnetPivot = new THREE.Group();
    bonnetPivot.position.set(0, 1.07, -0.84);
    bonnetPivot.rotation.x = 0.36; // Cleanly propped open
    const bonnetOuter = new THREE.Mesh(
      new THREE.BoxGeometry(1.66, 0.055, 1.32),
      bodyPaintMat,
    );
    bonnetOuter.position.set(0, 0.025, -0.66);
    bonnetOuter.castShadow = true;
    const bonnetLiner = new THREE.Mesh(
      new THREE.BoxGeometry(1.48, 0.02, 1.14),
      bumperTrimMat,
    );
    bonnetLiner.position.set(0, -0.005, -0.66);
    bonnetPivot.add(bonnetOuter, bonnetLiner);
    suvGroup.add(bonnetPivot);

    // Thin metal hood prop rod holding the open bonnet up
    const hoodPropRod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.011, 0.68, 6),
      rimMetalMat,
    );
    hoodPropRod.position.set(0.62, 1.15, -1.78);
    hoodPropRod.rotation.x = -0.18;
    suvGroup.add(hoodPropRod);

    // Headlights (dual SpotLight beams aimed at front gate) + Tail Lights + Blinking 4-Way Amber Hazard Lights
    [-0.66, 0.66].forEach((hx) => {
      const bezel = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.2, 0.07),
        bumperTrimMat,
      );
      bezel.position.set(hx, 0.78, -2.23);
      suvGroup.add(bezel);

      const headLens = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.14, 0.08),
        headlightGlowMat,
      );
      headLens.position.set(hx, 0.78, -2.25);
      suvGroup.add(headLens);

      // Individual left/right halogen SpotLight beam casting realistic pools of light onto the road & iron gate
      if (!disableExtraLights) {
        const headSpot = new THREE.SpotLight(0xfff2cc, 6.0, 28, 0.44, 0.72, 1.35);
        headSpot.position.set(hx, 0.8, -2.3);
        const headTarget = new THREE.Object3D();
        headTarget.position.set(hx * 0.78 + 0.32, 0.55, -11.5);
        suvGroup.add(headSpot, headTarget);
        headSpot.target = headTarget;
        decorativeDynamicLights.push(headSpot);
      }

      const tailLens = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.2, 0.08),
        tailLightMat,
      );
      tailLens.position.set(hx, 0.86, 2.21);
      suvGroup.add(tailLens);
    });

    // 4-Way Blinking Amber/Orange Hazard Warning Lights at all 4 exterior corners + side markers
    const hazardCornerSpecs: Array<[number, number, number, number]> = [
      [-0.89, 0.78, -2.23, -1], // Front-left corner
      [0.89, 0.78, -2.23, -1],  // Front-right corner
      [-0.89, 0.86, 2.21, 1],   // Rear-left corner
      [0.89, 0.86, 2.21, 1],    // Rear-right corner
    ];
    hazardCornerSpecs.forEach(([lx, ly, lz, zDir]) => {
      const cornerLens = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.14, 0.09),
        suvHazardLensMat!,
      );
      cornerLens.position.set(lx, ly, lz);
      suvGroup.add(cornerLens);

      // Wraparound side fender repeater lens so blinkers read clearly from side angles too
      const sideMarker = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.09, 0.14),
        suvHazardLensMat!,
      );
      sideMarker.position.set(lx < 0 ? -0.97 : 0.97, ly, lz - zDir * 0.08);
      suvGroup.add(sideMarker);

      const hSpriteMat = new THREE.SpriteMaterial({
        map: sharedAmberHazardTex,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const hSprite = new THREE.Sprite(hSpriteMat);
      hSprite.position.set(lx * 1.04, ly, lz + zDir * 0.12);
      hSprite.scale.set(0.75, 0.75, 1);
      suvGroup.add(hSprite);
      suvHazardGlowMats.push(hSpriteMat);
    });

    if (!disableExtraLights) {
      suvHazardFrontLight = new THREE.PointLight(0xff7b00, 0, 9.0, 1.5);
      suvHazardFrontLight.position.set(0, 0.82, -2.6);
      suvHazardRearLight = new THREE.PointLight(0xff7b00, 0, 9.0, 1.5);
      suvHazardRearLight.position.set(0, 0.88, 2.6);
      suvGroup.add(suvHazardFrontLight, suvHazardRearLight);
      decorativeDynamicLights.push(suvHazardFrontLight, suvHazardRearLight);
    }

    // Soft, translucent, rising & smoothly fading steam/smoke Sprite particles from the popped engine bay
    const numSmokeSprites = 18;
    for (let i = 0; i < numSmokeSprites; i++) {
      const sMat = new THREE.SpriteMaterial({
        map: sharedBonnetSmokeTex,
        color: i % 3 === 0 ? 0xdbe5f0 : 0xc6d2e0,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(sMat);
      const baseX = ((i % 5) - 2) * 0.18;
      const baseZ = -1.62 + ((i % 3) - 1) * 0.18;
      sprite.position.set(baseX, 1.08, baseZ);
      sprite.scale.set(0.42, 0.42, 1);
      suvGroup.add(sprite);

      bonnetSteamParticles.push({
        sprite,
        mat: sMat,
        phase: i / numSmokeSprites,
        baseX,
        baseZ,
        driftX: ((i % 5) - 2) * 0.11,
        driftZ: ((i % 3) - 1) * 0.08 - 0.12,
        speed: 0.28 + (i % 4) * 0.04,
        baseScale: 0.36 + (i % 3) * 0.08,
        maxScale: 1.25 + (i % 4) * 0.22,
        baseRot: (i * 1.13) % (Math.PI * 2),
        rotSpeed: (i % 2 === 0 ? 1 : -1) * (0.22 + (i % 3) * 0.12),
      });
    }

    root.add(suvGroup);

    // Physical collider around the SUV so the player walks around it cleanly
    wallColliders.push({
      minX: -2.62,
      maxX: -0.28,
      minZ: 38.65,
      maxZ: 43.35,
      minY: 0,
      maxY: 2.2,
    });
  };
  buildBrokenDownSUV();

  // 3) SEMI-OPEN INDIAN JUNGLE TREES, UNDERGROWTH, BOULDERS & NATURAL PERIMETER BARRIERS
  const banyanBarkMat = new THREE.MeshStandardMaterial({
    color: 0x1c1511,
    roughness: 0.96,
    metalness: 0.01,
  });
  const gnarledBarkMat = new THREE.MeshStandardMaterial({
    color: 0x16120e,
    roughness: 0.98,
    metalness: 0.0,
  });
  // Varied dark-green horror foliage palette (reused across all trees for smooth FPS)
  const horrorCanopyMats = [
    new THREE.MeshStandardMaterial({
      color: 0x09160c,
      roughness: 0.97,
      metalness: 0.0,
    }),
    new THREE.MeshStandardMaterial({
      color: 0x0e2012,
      roughness: 0.95,
      metalness: 0.0,
    }),
    new THREE.MeshStandardMaterial({
      color: 0x142715,
      roughness: 0.96,
      metalness: 0.0,
    }),
    new THREE.MeshStandardMaterial({
      color: 0x192e1a,
      roughness: 0.94,
      metalness: 0.0,
    }),
  ];

  // Shared organically displaced horror crown geometries (jagged gnarled silhouettes, zero uniform spheres)
  const createOrganicFoliageGeo = (
    radius: number,
    seed: number,
    ySquash: number,
  ): THREE.BufferGeometry => {
    const geo = new THREE.IcosahedronGeometry(radius, 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const wave =
        Math.sin(vx * 2.3 + seed) * 0.16 +
        Math.cos(vz * 2.7 - seed * 1.4) * 0.15 +
        Math.sin((vx + vy + vz) * 3.1 + seed * 0.7) * 0.1;
      const droop = vy < 0 ? 1.0 + Math.abs(vy / radius) * 0.18 : 1.0;
      const factor = 1.0 + wave;
      pos.setXYZ(i, vx * factor, vy * factor * ySquash * droop, vz * factor);
    }
    geo.computeVertexNormals();
    return geo;
  };

  const sharedCanopyGeos = [
    createOrganicFoliageGeo(1.75, 1.3, 0.72),
    createOrganicFoliageGeo(1.95, 4.1, 0.62),
    createOrganicFoliageGeo(1.55, 7.6, 0.92),
    createOrganicFoliageGeo(2.35, 11.2, 0.66),
  ];
  const sharedBanyanTrunkGeo = new THREE.CylinderGeometry(0.46, 0.92, 5.6, 10);
  const sharedButtressGeo = new THREE.CylinderGeometry(0.14, 0.36, 3.4, 6);
  const sharedBoughGeo = new THREE.CylinderGeometry(0.09, 0.27, 1.0, 7);
  const sharedSalTrunkGeo = new THREE.CylinderGeometry(0.2, 0.46, 1.0, 8);
  const sharedSalBranchGeo = new THREE.CylinderGeometry(0.055, 0.15, 2.5, 6);

  // Spawns a massive Haunted Indian Banyan Tree (बरगद का पेड़) with gnarled boughs, varied organic horror canopy & solid cylinder trunk collision (NO jail-bar hanging aerial roots!)
  const addHauntedBanyanTree = (
    tx: number,
    tz: number,
    scale = 1.0,
    rotY = 0,
    addCollider = true,
  ) => {
    const tGroup = new THREE.Group();
    tGroup.position.set(tx, 0, tz);
    tGroup.rotation.y = rotY;
    tGroup.scale.setScalar(scale);

    const seed = Math.abs(tx * 13.7 + tz * 7.3);

    const mainTrunk = new THREE.Mesh(sharedBanyanTrunkGeo, banyanBarkMat);
    mainTrunk.position.y = 2.8;
    mainTrunk.rotation.z = Math.sin(seed) * 0.05;
    mainTrunk.castShadow = true;
    mainTrunk.receiveShadow = true;
    tGroup.add(mainTrunk);

    // Flared base buttress roots hugging the trunk tightly (grounded, never blocking paths)
    for (let r = 0; r < 5; r++) {
      const rAng = (r / 5) * Math.PI * 2 + (seed % 1.2);
      const buttress = new THREE.Mesh(sharedButtressGeo, gnarledBarkMat);
      buttress.position.set(
        Math.cos(rAng) * 0.48,
        1.55,
        Math.sin(rAng) * 0.48,
      );
      buttress.rotation.z = -Math.cos(rAng) * 0.2;
      buttress.rotation.x = Math.sin(rAng) * 0.2;
      tGroup.add(buttress);
    }

    const numBoughs = 6;
    for (let b = 0; b < numBoughs; b++) {
      const ang = (b / numBoughs) * Math.PI * 2 + 0.25 + ((b % 3) - 1) * 0.14;
      const boughLen = 3.9 + ((b + Math.floor(seed)) % 3) * 0.65;
      const bough = new THREE.Mesh(sharedBoughGeo, banyanBarkMat);
      bough.scale.set(1, boughLen, 1);
      const midDist = boughLen * 0.42;
      const boughY = 4.65 + (b % 3) * 0.52;
      bough.position.set(
        Math.cos(ang) * midDist,
        boughY,
        Math.sin(ang) * midDist,
      );
      bough.rotation.z = -Math.cos(ang) * (1.06 + (b % 2) * 0.18);
      bough.rotation.x = Math.sin(ang) * (1.06 + (b % 2) * 0.18);
      bough.castShadow = true;
      tGroup.add(bough);

      // Varied multi-layered dark-green horror foliage clusters (asymmetric silhouettes)
      const matIdx = (b + Math.floor(seed)) % horrorCanopyMats.length;
      const geoIdx = (b + Math.floor(seed * 2)) % sharedCanopyGeos.length;
      const canopyCluster = new THREE.Mesh(
        sharedCanopyGeos[geoIdx],
        horrorCanopyMats[matIdx],
      );
      canopyCluster.scale.set(
        1.12 + ((b % 3) * 0.18),
        0.78 + (((b + 1) % 3) * 0.16),
        1.08 + (((b + 2) % 3) * 0.16),
      );
      canopyCluster.rotation.set(
        Math.sin(seed + b) * 0.18,
        ang + b * 0.6,
        Math.cos(seed + b) * 0.18,
      );
      canopyCluster.position.set(
        Math.cos(ang) * (boughLen * 0.72),
        boughY + 0.85 + (b % 2) * 0.42,
        Math.sin(ang) * (boughLen * 0.72),
      );
      tGroup.add(canopyCluster);

      // Secondary offset upper/outer frond cluster for jagged natural treetop outline
      if (b % 2 === 0) {
        const subCanopy = new THREE.Mesh(
          sharedCanopyGeos[(geoIdx + 2) % sharedCanopyGeos.length],
          horrorCanopyMats[(matIdx + 1) % horrorCanopyMats.length],
        );
        subCanopy.scale.set(0.82, 0.96, 0.85);
        subCanopy.rotation.y = ang * 1.4;
        subCanopy.position.set(
          Math.cos(ang + 0.22) * (boughLen * 0.88),
          boughY + 1.55,
          Math.sin(ang + 0.22) * (boughLen * 0.88),
        );
        tGroup.add(subCanopy);
      }
    }

    // Layered gnarled upper crown dome (2 offset organic clusters)
    const topCrown = new THREE.Mesh(
      sharedCanopyGeos[3],
      horrorCanopyMats[Math.floor(seed) % horrorCanopyMats.length],
    );
    topCrown.scale.set(1.28, 0.84, 1.18);
    topCrown.rotation.set(0.08, seed, -0.06);
    topCrown.position.set(0.18, 6.55, -0.14);
    tGroup.add(topCrown);

    const upperSpireCrown = new THREE.Mesh(
      sharedCanopyGeos[2],
      horrorCanopyMats[(Math.floor(seed) + 2) % horrorCanopyMats.length],
    );
    upperSpireCrown.scale.set(1.05, 1.12, 0.95);
    upperSpireCrown.rotation.y = seed * 1.7;
    upperSpireCrown.position.set(-0.35, 7.65, 0.25);
    tGroup.add(upperSpireCrown);

    root.add(tGroup);
    stormWeather.registerSwayTree(tGroup, seed, scale);

    // Solid cylinder collision around the Banyan trunk so the player never walks through it
    if (addCollider) {
      cylinderColliders.push({
        x: tx,
        z: tz,
        radius: 0.92 * scale,
        minY: 0,
        maxY: 6.0 * scale,
      });
    }
  };

  // Tall Indian Sal / Neem Forest Trees with varied dark-green horror silhouettes & solid cylinder trunk collision
  const addTallJungleTree = (
    tx: number,
    tz: number,
    scale = 1.0,
    deadTree = false,
    addCollider = true,
  ) => {
    const g = new THREE.Group();
    g.position.set(tx, 0, tz);
    g.scale.setScalar(scale);

    const seed = Math.abs(tx * 9.1 + tz * 11.7);
    const trunkH = 5.4 + ((Math.abs(Math.round(tx + tz)) % 3) * 1.15);
    const trunk = new THREE.Mesh(
      sharedSalTrunkGeo,
      Math.floor(seed) % 2 === 0 ? banyanBarkMat : gnarledBarkMat,
    );
    trunk.scale.set(1, trunkH, 1);
    trunk.position.y = trunkH * 0.5;
    trunk.rotation.z = Math.sin(seed) * 0.045;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    g.add(trunk);

    const branchCount = deadTree ? 5 : 4;
    for (let b = 0; b < branchCount; b++) {
      const ang = (b / branchCount) * Math.PI * 2 + tx * 0.17;
      const branch = new THREE.Mesh(sharedSalBranchGeo, gnarledBarkMat);
      branch.position.set(
        Math.cos(ang) * 0.88,
        trunkH * 0.72 + b * 0.24,
        Math.sin(ang) * 0.88,
      );
      branch.rotation.z = -Math.cos(ang) * (0.72 + (b % 2) * 0.18);
      branch.rotation.x = Math.sin(ang) * (0.72 + (b % 2) * 0.18);
      g.add(branch);

      if (!deadTree) {
        const matIdx = (b + Math.floor(seed)) % horrorCanopyMats.length;
        const geoIdx = (b + Math.floor(seed)) % 3;
        const crown = new THREE.Mesh(
          sharedCanopyGeos[geoIdx],
          horrorCanopyMats[matIdx],
        );
        crown.scale.set(
          0.95 + (b % 2) * 0.3,
          0.82 + ((b + 1) % 3) * 0.22,
          0.92 + ((b + 2) % 2) * 0.28,
        );
        crown.rotation.set(
          Math.sin(seed + b) * 0.2,
          ang + seed * 0.4,
          Math.cos(seed + b) * 0.16,
        );
        crown.position.set(
          Math.cos(ang) * (1.35 + (b % 2) * 0.42),
          trunkH + 0.42 + (b % 3) * 0.52,
          Math.sin(ang) * (1.35 + (b % 2) * 0.42),
        );
        g.add(crown);
      }
    }

    if (!deadTree) {
      // Tapered uneven horror peak crown (tall haunted cypress / twisted neem silhouette)
      const top = new THREE.Mesh(
        sharedCanopyGeos[2],
        horrorCanopyMats[Math.floor(seed) % horrorCanopyMats.length],
      );
      top.scale.set(1.05, 1.32, 0.98);
      top.rotation.set(0.06, seed, -0.05);
      top.position.set(Math.sin(seed) * 0.22, trunkH + 1.55, Math.cos(seed) * 0.22);
      g.add(top);

      const peakTip = new THREE.Mesh(
        sharedCanopyGeos[0],
        horrorCanopyMats[(Math.floor(seed) + 1) % horrorCanopyMats.length],
      );
      peakTip.scale.set(0.68, 1.15, 0.65);
      peakTip.position.set(-Math.sin(seed) * 0.18, trunkH + 2.65, 0);
      g.add(peakTip);
    }

    root.add(g);
    stormWeather.registerSwayTree(g, seed, scale);

    // Solid cylinder collision around every jungle tree trunk
    if (addCollider) {
      cylinderColliders.push({
        x: tx,
        z: tz,
        radius: 0.48 * scale,
        minY: 0,
        maxY: Math.max(4.5, trunkH * scale),
      });
    }
  };

  // Haunted Banyan & Jungle Trees inside playable 360° exterior clearing & back garden
  // (All trunks cleanly clear of 64x56 Palace, 24m Forecourt z:10..34, and 360° walking trails!)
  addHauntedBanyanTree(-12.8, 43.4, 1.05, 0.2, true);
  addHauntedBanyanTree(12.8, 43.6, 1.05, -0.6, true);
  addHauntedBanyanTree(-16.2, 47.6, 1.22, 0.8, true);
  addHauntedBanyanTree(16.0, 48.0, 1.2, -0.9, true);
  addHauntedBanyanTree(-24.5, -56.5, 1.15, 0.5, true);
  addHauntedBanyanTree(24.5, -56.5, 1.15, -0.7, true);
  addHauntedBanyanTree(-42.2, 4.5, 1.45, 0.4, true);
  addHauntedBanyanTree(42.2, 4.5, 1.45, -0.4, true);
  addHauntedBanyanTree(-23.5, -78.8, 1.25, 0.9, true);
  addHauntedBanyanTree(23.5, -78.8, 1.25, -0.8, true);

  // Scattered Tall Jungle Trees in the semi-open 360° clearing around the Palace (completely off the walking trails)
  [
    [-8.8, 48.9, 1.05, false],
    [9.4, 49.9, 1.0, true],
    [-41.6, 26.4, 1.15, false],
    [41.6, 25.8, 1.1, false],
    [-41.5, 45.5, 1.25, false],
    [41.5, 47.0, 1.15, true],
    [-10.5, 58.4, 1.15, false],
    [11.0, 59.9, 1.1, false],
    [-42.2, -20.5, 1.3, false],
    [42.2, -20.5, 1.3, false],
    [-42.0, -46.5, 1.25, true],
    [42.0, -46.5, 1.25, false],
  ].forEach(([tx, tz, sc, isDead]) => {
    addTallJungleTree(
      tx as number,
      tz as number,
      sc as number,
      Boolean(isDead),
      true,
    );
  });

  // Dense Outer Jungle Perimeter Ring + Natural Boulder Barriers (framing the 64m x 56m Palace + 24m Forecourt + 36m x 30m Well Courtyard!)
  const jungleBoulderMat = new THREE.MeshStandardMaterial({
    color: 0x242220,
    roughness: 0.94,
  });
  const densePerimeterSpots: Array<[number, number, number]> = [];
  // West dense forest wall (x = -49..-52, z = -84..74)
  for (let z = -84; z <= 74; z += 6.5) {
    densePerimeterSpots.push([-49.2 - (Math.abs(z) % 3), z, 1.3 + (Math.abs(z) % 3) * 0.12]);
  }
  // East dense forest wall (leaving low scenic overlook gap at z = 24..42 toward distant village vista!)
  for (let z = -84; z <= 74; z += 6.5) {
    if (z >= 24 && z <= 42) continue;
    densePerimeterSpots.push([49.2 + (Math.abs(z) % 3), z, 1.3 + (Math.abs(z) % 3) * 0.12]);
  }
  // North deep jungle behind the expanded 36m x 30m enclosed well courtyard (z = -84.8..-87.8)
  for (let x = -48; x <= 48; x += 6.5) {
    densePerimeterSpots.push([x, -84.8 - (Math.abs(x) % 3), 1.32]);
  }
  // South deep forest flanking the incoming dirt road (z = 73.0..86)
  for (let x = -48; x <= 48; x += 6.0) {
    if (Math.abs(x) < 5.0) continue;
    densePerimeterSpots.push([x, 73.0 + (Math.abs(x) % 4), 1.3]);
  }
  // Deep forest backdrop trees continuing along the incoming road beyond z = 75
  [-7.2, 7.2, -9.8, 9.8, -6.4, 6.4].forEach((rx, idx) => {
    addTallJungleTree(rx, 77 + idx * 2.4, 1.28, idx === 3, true);
  });

  densePerimeterSpots.forEach(([tx, tz, sc], idx) => {
    addTallJungleTree(tx, tz, sc, idx % 6 === 0, true);
    if (idx % 2 === 0) {
      const boulder = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.15 + (idx % 3) * 0.35, 1),
        jungleBoulderMat,
      );
      boulder.scale.set(1.3, 0.85, 1.15);
      boulder.position.set(tx * 0.95, 0.45, tz * 0.96);
      root.add(boulder);
    }
  });

  // 3B) DENSE 360° OUTER BACKGROUND RING OF DARK TREE SILHOUETTES + LOW MISTY HORIZON HILLS
  const buildOuterHorizonForestAndHills = () => {
    const horizonGroup = new THREE.Group();
    horizonGroup.name = 'OuterHorizonTreelineAndHills';

    const bgTreeSpecs: Array<{
      x: number;
      z: number;
      trunkH: number;
      crownR: number;
      crownH: number;
      tint: number;
    }> = [];

    const centerZ = 2.0;
    // Two staggered concentric outer silhouette tree rings (inner ring r=66..78m, deep ring r=84..102m)
    const ringConfigs: Array<{ count: number; rMin: number; rMax: number; hMin: number; hMax: number }> = [
      { count: 84, rMin: 66, rMax: 78, hMin: 10.0, hMax: 16.5 },
      { count: 96, rMin: 84, rMax: 102, hMin: 13.0, hMax: 22.0 },
    ];

    ringConfigs.forEach((cfg, rIdx) => {
      for (let i = 0; i < cfg.count; i++) {
        const baseAngle = (i / cfg.count) * Math.PI * 2 + rIdx * 0.04;
        const jitterA = Math.sin(i * 12.7 + rIdx * 5.3) * 0.025;
        const ang = baseAngle + jitterA;
        const radius =
          cfg.rMin + (((Math.sin(i * 7.1 + rIdx * 19.3) + 1) * 0.5) * (cfg.rMax - cfg.rMin));
        const x = Math.cos(ang) * radius;
        const z = centerZ + Math.sin(ang) * (radius * 1.12);

        // Keep the East-Southeast distant village clearing unobstructed in the inner ring
        if (rIdx === 0 && x > 48 && x < 84 && z > 16 && z < 48) continue;
        // Keep the incoming South dirt road corridor cleanly framed in the inner ring
        if (rIdx === 0 && Math.abs(x) < 6.8 && z > 60 && z < 92) continue;

        const hNorm = (Math.sin(i * 5.3 + rIdx * 11.1) + 1) * 0.5;
        const trunkH = THREE.MathUtils.lerp(cfg.hMin * 0.45, cfg.hMax * 0.45, hNorm);
        const crownH = THREE.MathUtils.lerp(cfg.hMin * 0.65, cfg.hMax * 0.7, hNorm);
        const crownR = 3.4 + hNorm * 2.8;
        bgTreeSpecs.push({
          x,
          z,
          trunkH,
          crownR,
          crownH,
          tint: (i + rIdx) % 3,
        });
      }
    });

    const bgTrunkGeo = new THREE.CylinderGeometry(0.24, 0.42, 1.0, 6);
    const bgTrunkMat = new THREE.MeshStandardMaterial({
      color: 0x0c0b0a,
      roughness: 0.98,
    });
    const bgLowerCrownGeo = new THREE.DodecahedronGeometry(1.0, 1);
    const bgUpperCrownGeo = new THREE.ConeGeometry(0.95, 1.65, 7);
    const bgSilhouetteMat = new THREE.MeshStandardMaterial({
      color: 0x0b140e,
      roughness: 0.98,
      metalness: 0.0,
    });

    const trunkInst = new THREE.InstancedMesh(bgTrunkGeo, bgTrunkMat, bgTreeSpecs.length);
    const lowerCrownInst = new THREE.InstancedMesh(
      bgLowerCrownGeo,
      bgSilhouetteMat,
      bgTreeSpecs.length,
    );
    const upperCrownInst = new THREE.InstancedMesh(
      bgUpperCrownGeo,
      bgSilhouetteMat,
      bgTreeSpecs.length,
    );

    const dummy = new THREE.Object3D();
    const tintPalette = [
      new THREE.Color(0x09110c),
      new THREE.Color(0x0e1812),
      new THREE.Color(0x0b1215),
    ];

    bgTreeSpecs.forEach((spec, i) => {
      dummy.position.set(spec.x, spec.trunkH * 0.5, spec.z);
      dummy.rotation.set(0, (i * 1.3) % (Math.PI * 2), 0);
      dummy.scale.set(1.0, spec.trunkH, 1.0);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(spec.x, spec.trunkH + spec.crownH * 0.34, spec.z);
      dummy.rotation.set(0, (i * 2.1) % (Math.PI * 2), 0);
      dummy.scale.set(spec.crownR * 1.05, spec.crownH * 0.55, spec.crownR * 0.95);
      dummy.updateMatrix();
      lowerCrownInst.setMatrixAt(i, dummy.matrix);
      lowerCrownInst.setColorAt(i, tintPalette[spec.tint]);

      dummy.position.set(spec.x, spec.trunkH + spec.crownH * 0.78, spec.z);
      dummy.rotation.set(0, (i * 1.7) % (Math.PI * 2), 0);
      dummy.scale.set(spec.crownR * 0.78, spec.crownH * 0.52, spec.crownR * 0.78);
      dummy.updateMatrix();
      upperCrownInst.setMatrixAt(i, dummy.matrix);
      upperCrownInst.setColorAt(i, tintPalette[(spec.tint + 1) % tintPalette.length]);
    });

    trunkInst.instanceMatrix.needsUpdate = true;
    lowerCrownInst.instanceMatrix.needsUpdate = true;
    upperCrownInst.instanceMatrix.needsUpdate = true;
    if (lowerCrownInst.instanceColor) lowerCrownInst.instanceColor.needsUpdate = true;
    if (upperCrownInst.instanceColor) upperCrownInst.instanceColor.needsUpdate = true;
    trunkInst.computeBoundingSphere();
    lowerCrownInst.computeBoundingSphere();
    upperCrownInst.computeBoundingSphere();
    horizonGroup.add(trunkInst, lowerCrownInst, upperCrownInst);

    // 360° Low Undulating Misty Hills ringing the entire far perimeter
    const perimeterHillGeo = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const perimeterHillMat = new THREE.MeshStandardMaterial({
      color: 0x080d16,
      roughness: 0.99,
      metalness: 0.0,
    });
    const hillCount = 30;
    for (let h = 0; h < hillCount; h++) {
      const ang = (h / hillCount) * Math.PI * 2;
      const rDist = 110 + (h % 3) * 11;
      const hx = Math.cos(ang) * rDist;
      const hz = centerZ + Math.sin(ang) * (rDist * 1.06);
      const rx = 26 + (h % 4) * 7.5;
      const ry = 11.5 + (h % 5) * 3.2;
      const rz = 24 + ((h + 2) % 4) * 6.5;
      const hill = new THREE.Mesh(perimeterHillGeo, perimeterHillMat);
      hill.scale.set(rx, ry, rz);
      hill.rotation.y = ang + 0.4;
      hill.position.set(hx, -0.6, hz);
      horizonGroup.add(hill);
    }

    // Soft 360° low horizon mist collar blending tree silhouettes & distant hills smoothly into midnight fog
    const mistCollarCanvas = document.createElement('canvas');
    mistCollarCanvas.width = 64;
    mistCollarCanvas.height = 128;
    const mcCtx = mistCollarCanvas.getContext('2d')!;
    const mcGrad = mcCtx.createLinearGradient(0, 128, 0, 0);
    mcGrad.addColorStop(0.0, 'rgba(9, 15, 28, 0.92)');
    mcGrad.addColorStop(0.32, 'rgba(13, 21, 38, 0.56)');
    mcGrad.addColorStop(0.7, 'rgba(15, 24, 42, 0.16)');
    mcGrad.addColorStop(1.0, 'rgba(10, 16, 30, 0.0)');
    mcCtx.fillStyle = mcGrad;
    mcCtx.fillRect(0, 0, 64, 128);
    const mistCollarTex = new THREE.CanvasTexture(mistCollarCanvas);
    mistCollarTex.colorSpace = THREE.SRGBColorSpace;
    const mistCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(102, 102, 18, 48, 1, true),
      new THREE.MeshBasicMaterial({
        map: mistCollarTex,
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        fog: false,
      }),
    );
    mistCollar.position.set(0, 8.2, centerZ);
    mistCollar.renderOrder = -4;
    horizonGroup.add(mistCollar);

    root.add(horizonGroup);
  };
  buildOuterHorizonForestAndHills();

  // Low rock ridge along the East scenic overlook (x = 48.2, z = 24..42)
  wallColliders.push({
    minX: 47.5,
    maxX: 49.5,
    minZ: 23.0,
    maxZ: 43.0,
    minY: 0,
    maxY: 3.0,
  });
  for (let oz = 24.5; oz <= 42.0; oz += 3.2) {
    const ridgeRock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.95, 1),
      jungleBoulderMat,
    );
    ridgeRock.scale.set(1.2, 0.55, 1.4);
    ridgeRock.position.set(48.2, 0.25, oz);
    root.add(ridgeRock);
  }

  // Overgrown Thorny Jungle Shrubs & Weathered Gravestones positioned cleanly OFF all 360° walking paths
  const shrubMat = new THREE.MeshStandardMaterial({
    color: 0x0f1c10,
    roughness: 0.95,
  });
  const shrubMatAlt = new THREE.MeshStandardMaterial({
    color: 0x162616,
    roughness: 0.94,
  });
  const sharedShrubGeo = new THREE.DodecahedronGeometry(0.62, 1);
  [
    [-11.5, 42.4],
    [11.5, 42.4],
    [-15.2, 46.5],
    [15.4, 46.5],
    [-16.5, -51.5],
    [16.8, -51.5],
    [-22.0, -57.8],
    [22.0, -57.8],
    [-42.0, -10.5],
    [42.0, -10.5],
    [-42.2, -32.5],
    [42.2, -32.5],
    [-12.5, -66.8],
    [12.5, -66.8],
    [-14.0, 50.0],
    [14.2, 49.5],
    [-18.0, 56.4],
    [18.2, 57.9],
    [-7.6, 53.9],
    [7.8, 54.9],
    [-42.2, 20.5],
    [42.2, 19.8],
  ].forEach(([sx, sz], idx) => {
    const bushGroup = new THREE.Group();
    bushGroup.position.set(sx, 0, sz);
    const scBase = 0.85 + (idx % 3) * 0.2;
    for (let lobe = 0; lobe < 3; lobe++) {
      const ang = (lobe / 3) * Math.PI * 2 + idx * 0.7;
      const r = lobe === 0 ? 0 : 0.42 * scBase;
      const bMesh = new THREE.Mesh(
        sharedShrubGeo,
        (idx + lobe) % 2 === 0 ? shrubMat : shrubMatAlt,
      );
      const lsc = lobe === 0 ? scBase : scBase * 0.72;
      bMesh.position.set(Math.cos(ang) * r, 0.28 * lsc, Math.sin(ang) * r);
      bMesh.scale.set(1.25 * lsc, 0.68 * lsc, 1.15 * lsc);
      bMesh.rotation.y = ang;
      bushGroup.add(bMesh);
    }
    root.add(bushGroup);
    stormWeather.registerSwayBush(bushGroup, idx * 0.91 + sx * 0.2);

    if (idx < 10 && idx % 2 === 0) {
      const headstone = new THREE.Mesh(
        new THREE.BoxGeometry(0.58, 0.95, 0.18),
        stoneFloorMat,
      );
      const stoneOffX = sx < 0 ? -0.95 : 0.95;
      headstone.position.set(sx + stoneOffX, 0.45, sz - 0.35);
      headstone.rotation.set(0.06, (idx - 3) * 0.15, -0.08);
      root.add(headstone);
    }
  });

  // Low Eerie Ground Mist / Fog Patches drifting around the Left, Right & Overgrown Backyard
  const exteriorMistCanvas = document.createElement('canvas');
  exteriorMistCanvas.width = 256;
  exteriorMistCanvas.height = 256;
  const eCtx = exteriorMistCanvas.getContext('2d');
  if (eCtx) {
    const eGrad = eCtx.createRadialGradient(128, 128, 10, 128, 128, 124);
    eGrad.addColorStop(0.0, 'rgba(135, 162, 196, 0.34)');
    eGrad.addColorStop(0.45, 'rgba(82, 104, 134, 0.18)');
    eGrad.addColorStop(1.0, 'rgba(24, 34, 52, 0.0)');
    eCtx.fillStyle = eGrad;
    eCtx.fillRect(0, 0, 256, 256);
  }
  const exteriorMistTex = new THREE.CanvasTexture(exteriorMistCanvas);
  const exteriorMistMat = new THREE.MeshBasicMaterial({
    map: exteriorMistTex,
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const exteriorMistPatches: Array<{
    mesh: THREE.Mesh;
    baseX: number;
    baseZ: number;
    phase: number;
  }> = [];
  [
    [-37.5, -12.0],
    [-38.5, 22.0],
    [-37.5, -36.5],
    [37.5, -12.0],
    [38.5, 22.0],
    [37.5, -36.5],
    [-14.5, -60.0],
    [0.0, -62.5],
    [14.5, -60.0],
  ].forEach(([mx, mz], idx) => {
    const mist = new THREE.Mesh(
      new THREE.PlaneGeometry(14.5, 14.5),
      exteriorMistMat,
    );
    mist.rotation.x = -Math.PI / 2;
    mist.position.set(mx, 0.32 + (idx % 2) * 0.18, mz);
    root.add(mist);
    exteriorMistPatches.push({
      mesh: mist,
      baseX: mx,
      baseZ: mz,
      phase: idx * 0.9,
    });
  });

  // 4) DISTANT RURAL INDIAN VILLAGE VISTA ON THE EAST-SOUTHEAST HORIZON (x = 56..84, z = 20..44)
  //    Blends seamlessly into the dark night sky and soft exponential fog (THREE.FogExp2) with ZERO blue rectangular backdrop wall!
  const buildDistantVillageVista = () => {
    const vistaGroup = new THREE.Group();
    vistaGroup.name = 'DistantVillageVista';

    const ridgeMat = new THREE.MeshStandardMaterial({
      color: 0x090e17,
      roughness: 0.98,
    });
    const hutWallMat = new THREE.MeshStandardMaterial({
      color: 0x1b1512,
      roughness: 0.95,
    });
    const hutThatchMat = new THREE.MeshStandardMaterial({
      color: 0x241c13,
      roughness: 0.96,
    });
    const templeStoneMat = new THREE.MeshStandardMaterial({
      color: 0x201a17,
      roughness: 0.92,
    });
    const warmWindowMat = new THREE.MeshBasicMaterial({
      color: 0xffcc5c,
      fog: false,
    });
    const warmLanternOrbMat = new THREE.MeshBasicMaterial({
      color: 0xffd56e,
      fog: false,
    });

    // Soft radial glow sprite texture for distant warm yellow village lights shimmering gently in the night mist
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 64;
    glowCanvas.height = 64;
    const gCtx = glowCanvas.getContext('2d')!;
    const gGrad = gCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
    gGrad.addColorStop(0.0, 'rgba(255, 214, 102, 0.72)');
    gGrad.addColorStop(0.45, 'rgba(255, 168, 48, 0.24)');
    gGrad.addColorStop(1.0, 'rgba(255, 140, 20, 0.0)');
    gCtx.fillStyle = gGrad;
    gCtx.fillRect(0, 0, 64, 64);
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    glowTex.colorSpace = THREE.SRGBColorSpace;
    const villageGlowSpriteMat = new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });

    // Soft rolling distant horizon hills behind the village (rounded low dark hills blending smoothly into FogExp2)
    const hillGeo = new THREE.SphereGeometry(1, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
    [
      [88, 18, 18, 6.5, 22],
      [92, 34, 22, 8.0, 26],
      [86, 49, 17, 5.8, 20],
    ].forEach(([hx, hz, rx, ry, rz]) => {
      const hill = new THREE.Mesh(hillGeo, ridgeMat);
      hill.scale.set(rx, ry, rz);
      hill.position.set(hx, -0.3, hz);
      vistaGroup.add(hill);
    });

    // Cluster of distant Indian village mud huts / houses with sloped thatch roofs & warm yellow lantern lights
    const hutSpecs: Array<[number, number, number, number]> = [
      [58, 22, 0.2, 1.0],
      [62, 26.5, -0.35, 1.1],
      [65, 20.5, 0.45, 0.95],
      [60, 32, -0.15, 1.05],
      [67, 30.5, 0.25, 1.15],
      [63, 37, -0.4, 0.95],
      [71, 24.5, 0.1, 1.0],
      [70, 35.5, -0.25, 1.08],
      [57, 29, 0.5, 0.9],
    ];

    const sharedHutBaseGeo = new THREE.BoxGeometry(2.8, 1.7, 2.3);
    const sharedHutRoofGeo = new THREE.ConeGeometry(2.35, 1.45, 4);
    const sharedWinGlowGeo = new THREE.PlaneGeometry(0.48, 0.44);
    const sharedLanternOrbGeo = new THREE.SphereGeometry(0.18, 8, 8);

    hutSpecs.forEach(([vx, vz, rotY, sc], idx) => {
      const hut = new THREE.Group();
      hut.position.set(vx, 0.0, vz);
      hut.rotation.y = rotY;
      hut.scale.setScalar(sc);

      const base = new THREE.Mesh(sharedHutBaseGeo, hutWallMat);
      base.position.y = 0.85;
      hut.add(base);

      const roof = new THREE.Mesh(sharedHutRoofGeo, hutThatchMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 2.4;
      hut.add(roof);

      // Tiny warm yellow window glow facing the Haveli side (-X), shining gently through the night fog
      const winGlow = new THREE.Mesh(sharedWinGlowGeo, warmWindowMat);
      winGlow.rotation.y = -Math.PI / 2;
      winGlow.position.set(-1.42, 0.92, 0);
      hut.add(winGlow);

      const winHalo = new THREE.Sprite(villageGlowSpriteMat);
      winHalo.position.set(-1.55, 0.92, 0);
      winHalo.scale.set(1.35, 1.35, 1);
      hut.add(winHalo);

      // Warm flickering village lantern outside every alternate hut
      if (idx % 2 === 0) {
        const lOrb = new THREE.Mesh(sharedLanternOrbGeo, warmLanternOrbMat);
        lOrb.position.set(-1.75, 1.25, 0.75);
        hut.add(lOrb);

        const lHalo = new THREE.Sprite(villageGlowSpriteMat);
        lHalo.position.copy(lOrb.position);
        lHalo.scale.set(1.85, 1.85, 1);
        hut.add(lHalo);

        flickeringLights.push({
          flameMesh: lOrb,
          baseIntensity: 0.65,
          baseColor: 0xffcc55,
          phase: idx * 1.43,
        });
      }

      vistaGroup.add(hut);
    });

    // Distant Village Temple Spire (मंदिर का शिखर) silhouette with flickering brass diya glow
    const templeGroup = new THREE.Group();
    templeGroup.position.set(69, 0.0, 28.5);
    const mandapa = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 2.3, 3.4),
      templeStoneMat,
    );
    mandapa.position.y = 1.15;
    templeGroup.add(mandapa);

    const shikhara1 = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.75, 3.6, 8),
      templeStoneMat,
    );
    shikhara1.position.y = 4.0;
    const shikhara2 = new THREE.Mesh(
      new THREE.ConeGeometry(1.15, 2.5, 8),
      templeStoneMat,
    );
    shikhara2.position.y = 6.95;
    const kalashTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 8, 8),
      brassMat,
    );
    kalashTop.position.y = 8.3;
    const templeDiya = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 8, 8),
      warmLanternOrbMat,
    );
    templeDiya.position.set(-2.05, 1.4, 0);
    const templeHalo = new THREE.Sprite(villageGlowSpriteMat);
    templeHalo.position.copy(templeDiya.position);
    templeHalo.scale.set(2.4, 2.4, 1);
    let templeGlow: THREE.PointLight | undefined;
    if (!disableExtraLights) {
      templeGlow = new THREE.PointLight(0xffb844, 2.4, 24, 1.4);
      templeGlow.position.set(-2.4, 1.8, 0);
      templeGroup.add(templeGlow);
    }
    templeGroup.add(shikhara1, shikhara2, kalashTop, templeDiya, templeHalo);

    flickeringLights.push({
      light: templeGlow,
      flameMesh: templeDiya,
      baseIntensity: 2.4,
      baseColor: 0xffb844,
      phase: 2.7,
    });

    vistaGroup.add(templeGroup);
    root.add(vistaGroup);
  };
  buildDistantVillageVista();

  // 4B) GOLDEN SUNRISE GLOW & RISING SUN BEHIND THE DISTANT VILLAGE HORIZON (East-Southeast)
  const sunriseGroup = new THREE.Group();
  sunriseGroup.name = 'DistantVillageSunrise';
  sunriseGroup.visible = false;

  const sunHorizonCanvas = document.createElement('canvas');
  sunHorizonCanvas.width = 512;
  sunHorizonCanvas.height = 256;
  const sCtx = sunHorizonCanvas.getContext('2d')!;
  const sGrad = sCtx.createRadialGradient(256, 210, 12, 256, 210, 250);
  sGrad.addColorStop(0.0, 'rgba(255, 242, 175, 0.98)');
  sGrad.addColorStop(0.22, 'rgba(255, 175, 72, 0.86)');
  sGrad.addColorStop(0.55, 'rgba(240, 102, 54, 0.45)');
  sGrad.addColorStop(1.0, 'rgba(120, 42, 68, 0.0)');
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 512, 256);
  const sunHorizonTex = new THREE.CanvasTexture(sunHorizonCanvas);

  const sunHorizonMat = new THREE.MeshBasicMaterial({
    map: sunHorizonTex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const sunHorizonMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(130, 68),
    sunHorizonMat,
  );
  sunHorizonMesh.position.set(126, 11, 32);
  sunHorizonMesh.rotation.y = -Math.PI / 2 + 0.14;
  sunHorizonMesh.renderOrder = -6;

  const sunDiscMat = new THREE.MeshBasicMaterial({
    color: 0xffe694,
    transparent: true,
    opacity: 0,
    fog: false,
  });
  const sunDiscMesh = new THREE.Mesh(
    new THREE.SphereGeometry(6.8, 24, 18),
    sunDiscMat,
  );
  sunDiscMesh.position.set(122, -6, 32);
  sunDiscMesh.renderOrder = -5;

  const sunCoronaMat = new THREE.MeshBasicMaterial({
    color: 0xff9a3c,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  });
  const sunCoronaMesh = new THREE.Mesh(
    new THREE.SphereGeometry(13.5, 24, 18),
    sunCoronaMat,
  );
  sunCoronaMesh.position.copy(sunDiscMesh.position);
  sunCoronaMesh.renderOrder = -5;

  sunriseGroup.add(sunHorizonMesh, sunCoronaMesh, sunDiscMesh);
  root.add(sunriseGroup);

  const _midnightSkyTint = new THREE.Color(0xffffff);
  const _dawnSkyTint = new THREE.Color(0xffcfa6);
  const _midnightCloudColor = new THREE.Color(0xffffff);
  const _dawnCloudColor = new THREE.Color(0xffb88c);

  const setSunriseProgress = (rawProgress: number) => {
    const p = THREE.MathUtils.clamp(rawProgress, 0, 1);
    currentSunriseProgress = p;
    if (p <= 0.001) {
      sunriseGroup.visible = false;
      sunHorizonMat.opacity = 0;
      sunDiscMat.opacity = 0;
      sunCoronaMat.opacity = 0;
      purnimaMoonGroup.visible = true;
      purnimaMoonDiscMat.opacity = 0.96;
      purnimaMoonHaloMat.opacity = 0.88;
      skyDomeMat.color.copy(_midnightSkyTint);
      skyDomeMat.opacity = 1;
      skyDomeMat.transparent = false;
      stormCloudMat.color.copy(_midnightCloudColor);
      stormCloudMat.opacity = 0.68;
      return;
    }
    sunriseGroup.visible = true;
    const ease = p * p * (3 - 2 * p);
    const moonFade = Math.max(0, 1 - ease * 1.45);
    purnimaMoonGroup.visible = moonFade > 0.02;
    purnimaMoonDiscMat.opacity = 0.96 * moonFade;
    purnimaMoonHaloMat.opacity = 0.88 * moonFade;
    const sunY = THREE.MathUtils.lerp(-5.2, 16.5, ease);
    sunDiscMesh.position.set(122, sunY, 32);
    sunCoronaMesh.position.set(122, sunY, 32);
    sunCoronaMesh.scale.setScalar(0.85 + ease * 0.45);
    sunHorizonMesh.position.set(126, THREE.MathUtils.lerp(4.0, 14.5, ease), 32);

    sunDiscMat.opacity = THREE.MathUtils.clamp(p * 2.1, 0, 0.98);
    sunCoronaMat.opacity = THREE.MathUtils.clamp(p * 1.4, 0, 0.44);
    sunHorizonMat.opacity = THREE.MathUtils.clamp(p * 1.35, 0, 0.92);

    skyDomeMat.color.copy(_midnightSkyTint).lerp(_dawnSkyTint, ease);
    skyDomeMat.transparent = true;
    skyDomeMat.opacity = THREE.MathUtils.lerp(1.0, 0.28, ease);
    stormCloudMat.color.copy(_midnightCloudColor).lerp(_dawnCloudColor, ease);
    stormCloudMat.opacity = THREE.MathUtils.lerp(0.68, 0.42, ease);
  };

  // --- WATCHING PORTRAITS (G1 Shahi Shastragar & F2-2 Thakur Saheb's Master Bedroom) ---
  const addWatchingPortrait = (x: number, y: number, z: number, rotY: number) => {
    const pGroup = new THREE.Group();
    pGroup.position.set(x, y, z);
    pGroup.rotation.y = rotY;
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 1.75, 0.08),
      woodMat,
    );
    const canvasMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 1.52),
      new THREE.MeshStandardMaterial({ color: 0x1b1210, roughness: 0.8 }),
    );
    canvasMesh.position.z = 0.045;
    pGroup.add(frame, canvasMesh);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    [-0.13, 0.13].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), eyeMat);
      eye.position.set(ex, 0.24, 0.055);
      pGroup.add(eye);
      watchingEyes.push(eye);
    });
    root.add(pGroup);
  };
  addWatchingPortrait(-31.68, 2.4, 0.75, Math.PI / 2);
  addWatchingPortrait(-24.0, 7.3, 9.68, Math.PI);

  // --- ROOM G2 PROPS: PURANI RASOI & ANNA-KOTHI (Clay chulha stoves, stacked brass pots & wooden spice shelves built via buildRoyalHorrorRoomProps) ---

  // --- ROOM G3 PROPS: MUNIM RECORD ROOM (y = 0.0, x in [16,32], z in [-8.5,10], Ledgers Desk where Relic #2 sits; tall bookshelves & scattered scrolls/ledgers built via buildRoyalHorrorRoomProps) ---
  const munimDesk = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.78, 1.15),
    woodMat,
  );
  munimDesk.position.set(24.0, 0.39, 0.75);
  root.add(munimDesk);
  wallColliders.push({
    minX: 23.05,
    maxX: 24.95,
    minZ: 0.17,
    maxZ: 1.33,
    minY: 0,
    maxY: 1.2,
  });

  // --- ROOM G4 PROPS: PRACHIN POOJA GHAR (y = 0.0, x in [16,32], z in [-27.5,-8.5], Carved Stone Altar & Fractured Idol) ---
  const altar = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.88, 1.45),
    stoneFloorMat,
  );
  altar.position.set(24.0, 0.44, -18.0);
  root.add(altar);

  const brokenIdol = new THREE.Mesh(
    new THREE.ConeGeometry(0.36, 0.85, 7),
    stoneFloorMat,
  );
  brokenIdol.position.set(24.0, 1.22, -18.1);
  brokenIdol.rotation.z = 0.42;
  root.add(brokenIdol);

  // --- ROOM F2-1 PROPS: RUKMINI'S SUHAAGRAAT BRIDAL ROOM (y = 5.0, x in [16,32], z in [-8.5,10], Carved Octagonal Pedestal for Relic #3) ---
  const bridalPedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.78, 0.92, 0.62, 8),
    carvedSandstoneMat,
  );
  bridalPedestal.position.set(24.0, 5.31, 0.75);
  root.add(bridalPedestal);

  // --- ROOM F2-4 PROPS: SANGEET HALL (y = 5.0, x in [-32,-16], z in [-46,-27.5], Jhoola Swing & Brass Chains) ---
  const jhoolaSeat = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.1, 0.78),
    woodMat,
  );
  jhoolaSeat.position.set(-24.0, 5.85, -36.75);
  root.add(jhoolaSeat);
  [-0.95, 0.95].forEach((cx) => {
    const jChain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 4.05, 6),
      brassMat,
    );
    jChain.position.set(-24.0 + cx, 7.88, -36.75);
    root.add(jChain);
  });

  // --- ROOM F3-1 PROPS: TANTRIK GRANTH LIBRARY (y = 10.0, x in [-32,-16], z in [-8.5,10], Reading Desk + tall bookshelves & scattered scrolls built via buildRoyalHorrorRoomProps) ---
  const tantrikDesk = new THREE.Mesh(
    new THREE.BoxGeometry(1.85, 0.78, 1.1),
    woodMat,
  );
  tantrikDesk.position.set(-24.0, 10.39, 0.75);
  root.add(tantrikDesk);
  wallColliders.push({
    minX: -24.95,
    maxX: -23.05,
    minZ: 0.2,
    maxZ: 1.3,
    minY: 10.0,
    maxY: 11.2,
  });

  // --- ROOM F3-2 PROPS: AAINA MAHAL / HALL OF MIRRORS (y = 10.0, x in [16,32], z in [-8.5,10], Stone Dais for Relic #4 + Hall Mirrors) ---
  const aainaPedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82, 0.94, 0.62, 8),
    carvedSandstoneMat,
  );
  aainaPedestal.position.set(24.0, 10.31, 0.75);
  root.add(aainaPedestal);

  // Additional Hall of Mirrors arched glass panels lining F3-2 walls (strictly inside z in [-8.5, 10.0])
  const hallMirrorBackingMat = new THREE.MeshStandardMaterial({
    color: 0x6f8498,
    metalness: 0.92,
    roughness: 0.12,
  });
  [
    { x: 31.72, z: -5.2, rotY: -Math.PI / 2 },
    { x: 31.72, z: 0.75, rotY: -Math.PI / 2 },
    { x: 31.72, z: 5.5, rotY: -Math.PI / 2 },
    { x: 20.0, z: 9.72, rotY: Math.PI },
    { x: 28.0, z: 9.72, rotY: Math.PI },
    { x: 20.0, z: -8.22, rotY: 0 },
  ].forEach((hm) => {
    const mGroup = new THREE.Group();
    mGroup.position.set(hm.x, 11.85, hm.z);
    mGroup.rotation.y = hm.rotY;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.35, 0.08), woodMat);
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.02, 2.08),
      hallMirrorBackingMat,
    );
    glass.position.z = 0.045;
    const goldBorder = new THREE.Mesh(
      new THREE.BoxGeometry(1.14, 2.22, 0.04),
      brassMat,
    );
    goldBorder.position.z = 0.024;
    mGroup.add(frame, goldBorder, glass);
    root.add(mGroup);
  });

  // --- ROOM F3-3 PROPS: ATTIC STORE 1 (y = 10.0, x in [-32,-16], z in [-46,-27.5], Dusty Cradle, Vintage Crates & Rolled Rugs) ---
  const nurseryCradle = new THREE.Group();
  nurseryCradle.position.set(-24.0, 10.45, -41.5);
  const cradleBasket = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.48, 0.72),
    woodMat,
  );
  nurseryCradle.add(cradleBasket);
  root.add(nurseryCradle);

  [
    [-29.8, 10.42, -30.2, 1.05, 0.84, 1.05],
    [-29.6, 11.12, -30.25, 0.68, 0.56, 0.68],
    [-29.9, 10.38, -32.2, 0.95, 0.76, 0.95],
    [-21.0, 10.38, -43.0, 0.95, 0.76, 0.85],
  ].forEach(([cx, cy, cz, w, h, d], idx) => {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMat);
    crate.position.set(cx, cy, cz);
    crate.rotation.y = idx * 0.22;
    crate.castShadow = true;
    root.add(crate);
  });
  const rolledRug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 2.2, 10),
    curtainMat,
  );
  rolledRug.rotation.z = Math.PI / 2;
  rolledRug.rotation.y = 0.35;
  rolledRug.position.set(-28.6, 10.2, -42.5);
  root.add(rolledRug);

  // --- ROOM F3-4 PROPS: BARSATI TERRACE ROOM (y = 10.0, x in [19,32], z in [-46,-27.5], Carved Stone Chowki & Pavilion Pillars) ---
  const barsatiChowki = new THREE.Mesh(
    new THREE.CylinderGeometry(0.88, 0.98, 0.58, 8),
    carvedSandstoneMat,
  );
  barsatiChowki.position.set(24.0, 10.29, -36.75);
  root.add(barsatiChowki);
  [
    [21.0, -30.5],
    [28.5, -30.5],
    [21.0, -42.5],
    [28.5, -42.5],
  ].forEach(([px, pz]) => addCarvedPillar(px, 10.0, pz, 6.75));

  // Piecewise remapper wrapper so all external room-prop modules cleanly fit the expanded 64m x 56m palace rooms
  const runWithRoomPropRemap = (
    fn: (proxyRoot: THREE.Group, proxyColliders: WallAABB[]) => void,
  ) => {
    const proxyRoot = new THREE.Group();
    const proxyColliders: WallAABB[] = [];
    fn(proxyRoot, proxyColliders);
    while (proxyRoot.children.length > 0) {
      const child = proxyRoot.children[0];
      proxyRoot.remove(child);
      const mapped = mapRoomPropXZ(child.position.x, child.position.y, child.position.z);
      child.position.x = mapped.x;
      child.position.z = mapped.z;
      root.add(child);
    }
    for (const c of proxyColliders) {
      const cx = (c.minX + c.maxX) * 0.5;
      const cz = (c.minZ + c.maxZ) * 0.5;
      const cy = (c.minY + c.maxY) * 0.5;
      const mapped = mapRoomPropXZ(cx, cy, cz);
      const dx = mapped.x - cx;
      const dz = mapped.z - cz;
      wallColliders.push({
        minX: c.minX + dx,
        maxX: c.maxX + dx,
        minZ: c.minZ + dz,
        maxZ: c.maxZ + dz,
        minY: c.minY,
        maxY: c.maxY,
      });
    }
  };

  // Furnish all 11 new & expanded rooms across GF, 2F, and 3F using shared geometries/materials
  runWithRoomPropRemap((proxyRoot, proxyColliders) =>
    buildExpandedRoomsProps({
      root: proxyRoot,
      wallColliders: proxyColliders,
      materials: {
        carvedSandstoneMat,
        brassMat,
        ironMat,
        woodMat,
        clayMat,
        curtainMat,
        stairCarpetMat,
        stoneFloorMat,
      },
    }),
  );

  // Decorate Kitchen (G2), Munim Room (G3), Tantrik Library (3F-1), Bridal Room (2F-1),
  // Master Bedroom (2F-2), and Guest Suite (2F-3) with lightweight Royal Indian Horror props
  // while strictly preserving >= 2.0m walkable clearance around doorways, stairs & hiding spots.
  runWithRoomPropRemap((proxyRoot, proxyColliders) =>
    buildRoyalHorrorRoomProps({
      root: proxyRoot,
      wallColliders: proxyColliders,
      materials: {
        carvedSandstoneMat,
        brassMat,
        ironMat,
        woodMat,
        clayMat,
        curtainMat,
        stoneFloorMat,
      },
    }),
  );

  // Fill empty 2nd/3rd-floor corridors and bare rooms with vintage rugs, wooden side tables,
  // antique brass vases, faded royal wall tapestries, fallen wooden chairs & old wooden trunks
  // (placed in direct world coordinates, strictly clear of doors, stairs, friends & hiding spots)
  buildCorridorAndBareRoomHorrorProps({
    root,
    wallColliders,
    materials: {
      woodMat,
      brassMat,
      ironMat,
      carvedSandstoneMat,
      curtainMat,
      clayMat,
    },
  });

  // ==========================================================================
  // 4B-2. HAUNTED HAVELI ORNATE WALL MIRRORS (Main Corridors & Bedrooms)
  //       Briefly flash Bride Rukmini's reflection standing behind the player
  // ==========================================================================
  const hauntedMirrors: HauntedMirrorInstance[] = [];

  const createMirrorReflectionTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 384;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 256, 384);

      // Eerie cold crimson-violet aura inside mirror glass
      const aura = ctx.createRadialGradient(128, 152, 18, 128, 172, 148);
      aura.addColorStop(0, 'rgba(135, 10, 24, 0.85)');
      aura.addColorStop(0.55, 'rgba(42, 6, 16, 0.65)');
      aura.addColorStop(1, 'rgba(4, 6, 12, 0.0)');
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, 256, 384);

      // Bride Rukmini's shrouded silhouette towering behind player's shoulder
      ctx.fillStyle = '#12060a';
      ctx.beginPath();
      ctx.moveTo(46, 380);
      ctx.quadraticCurveTo(64, 178, 92, 134);
      ctx.lineTo(164, 134);
      ctx.quadraticCurveTo(192, 178, 210, 380);
      ctx.closePath();
      ctx.fill();

      // Crimson bridal saree drape & gold zari edge
      const sareeGrad = ctx.createLinearGradient(72, 145, 184, 370);
      sareeGrad.addColorStop(0, 'rgba(138, 12, 26, 0.92)');
      sareeGrad.addColorStop(1, 'rgba(55, 4, 10, 0.96)');
      ctx.fillStyle = sareeGrad;
      ctx.beginPath();
      ctx.moveTo(64, 378);
      ctx.quadraticCurveTo(78, 168, 102, 138);
      ctx.lineTo(154, 138);
      ctx.quadraticCurveTo(176, 168, 192, 378);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(235, 182, 74, 0.72)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(96, 144);
      ctx.quadraticCurveTo(132, 232, 172, 344);
      ctx.stroke();

      // Wild disheveled black hair & ghoonghat veil
      ctx.fillStyle = '#070507';
      ctx.beginPath();
      ctx.ellipse(128, 104, 38, 48, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let h = 0; h < 12; h++) {
        const hx = 92 + h * 6.5;
        ctx.beginPath();
        ctx.moveTo(hx, 82);
        ctx.quadraticCurveTo(hx + (h % 2 === 0 ? -10 : 10), 135, hx + (h % 2 === 0 ? -4 : 6), 192);
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(8, 5, 8, 0.9)';
        ctx.stroke();
      }

      // Gaunt ash-pale face tilted eerily to one side
      ctx.save();
      ctx.translate(128, 108);
      ctx.rotate(-0.14);
      ctx.fillStyle = '#a89f9a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 29, 0, 0, Math.PI * 2);
      ctx.fill();

      // Blood-streaked tears & hollow dark eye sockets
      ctx.fillStyle = '#12080a';
      ctx.beginPath();
      ctx.ellipse(-9, -4, 5.5, 4.2, 0.1, 0, Math.PI * 2);
      ctx.ellipse(9, -4, 5.5, 4.2, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // Glowing crimson eyes staring straight at the viewer
      ctx.fillStyle = '#ff1c28';
      ctx.shadowColor = '#ff0018';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(-9, -4, 2.5, 0, Math.PI * 2);
      ctx.arc(9, -4, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Sindoor streak & grim jagged grin
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(-1.5, -24, 3, 12);
      ctx.strokeStyle = '#220608';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 11, 9, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.restore();

      // Subtle foreground shoulder shadow of the player at bottom edge
      ctx.fillStyle = 'rgba(4, 6, 10, 0.72)';
      ctx.beginPath();
      ctx.ellipse(128, 376, 86, 54, 0, Math.PI, 0);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  const mirrorReflectionTex = createMirrorReflectionTexture();
  const mirrorFrameMat = new THREE.MeshStandardMaterial({
    color: 0x2b170e,
    roughness: 0.52,
    metalness: 0.25,
  });
  const mirrorBrassTrimMat = new THREE.MeshStandardMaterial({
    color: 0xb68b3e,
    roughness: 0.34,
    metalness: 0.82,
  });
  const mirrorSurfaceMat = new THREE.MeshStandardMaterial({
    color: 0x7c8ea0,
    metalness: 0.94,
    roughness: 0.14,
    transparent: true,
    opacity: 0.76,
  });
  const mirrorBackingMat = new THREE.MeshBasicMaterial({
    color: 0x05080f,
  });

  const mirrorPlacements: Array<{
    id: string;
    locationHi: string;
    locationEn: string;
    x: number;
    y: number;
    z: number;
    rotY: number;
    floorY: number;
  }> = [
    {
      id: 'mirror_ground_west_corridor',
      locationHi: 'शाही दरबार पश्चिमी दीवार (GF)',
      locationEn: 'Grand Atrium West Wall',
      x: -18.72,
      y: 1.75,
      z: 5.5,
      rotY: Math.PI / 2,
      floorY: 0,
    },
    {
      id: 'mirror_ground_east_corridor',
      locationHi: 'शाही दरबार पूर्वी दीवार (GF)',
      locationEn: 'Grand Atrium East Wall',
      x: 18.72,
      y: 1.75,
      z: 5.5,
      rotY: -Math.PI / 2,
      floorY: 0,
    },
    {
      id: 'mirror_ground_north_corridor',
      locationHi: 'भूतल उत्तरी दीवार (कुएँ के द्वार के पास)',
      locationEn: 'Ground North Walkway',
      x: -6.2,
      y: 1.75,
      z: -45.72,
      rotY: 0,
      floorY: 0,
    },
    {
      id: 'mirror_upper_west_corridor',
      locationHi: 'दूसरी मंज़िल पश्चिमी झरोखा बालकनी (2F)',
      locationEn: '2F West Balcony',
      x: -18.72,
      y: 6.75,
      z: 5.5,
      rotY: Math.PI / 2,
      floorY: 5.0,
    },
    {
      id: 'mirror_upper_east_corridor',
      locationHi: 'दूसरी मंज़िल पूर्वी झरोखा बालकनी (2F)',
      locationEn: '2F East Balcony',
      x: 18.72,
      y: 6.75,
      z: -12.5,
      rotY: -Math.PI / 2,
      floorY: 5.0,
    },
    {
      id: 'mirror_thakur_bedroom',
      locationHi: 'ठाकुर का शयनकक्ष (2F-2)',
      locationEn: "Thakur's Master Bedroom",
      x: -19.28,
      y: 6.75,
      z: 5.8,
      rotY: -Math.PI / 2,
      floorY: 5.0,
    },
    {
      id: 'mirror_rukmini_bridal',
      locationHi: 'रुक्मिणी का सुहाग कक्ष (2F-1)',
      locationEn: "Rukmini's Bridal Room",
      x: 31.72,
      y: 6.75,
      z: 4.0,
      rotY: -Math.PI / 2,
      floorY: 5.0,
    },
    {
      id: 'mirror_aaina_mahal_3f_1',
      locationHi: 'आईना महल (3F-2)',
      locationEn: '3F Aaina Mahal East Wall',
      x: 31.72,
      y: 11.75,
      z: 3.0,
      rotY: -Math.PI / 2,
      floorY: 10.0,
    },
    {
      id: 'mirror_aaina_mahal_3f_2',
      locationHi: 'आईना महल दक्षिणी दर्पण (3F-2)',
      locationEn: '3F Aaina Mahal South Wall',
      x: 24.0,
      y: 11.75,
      z: 9.72,
      rotY: Math.PI,
      floorY: 10.0,
    },
    {
      id: 'mirror_third_floor_corridor',
      locationHi: 'तीसरी मंज़िल पश्चिमी झरोखा बालकनी (3F)',
      locationEn: '3F West Balcony',
      x: -18.72,
      y: 11.75,
      z: -12.5,
      rotY: Math.PI / 2,
      floorY: 10.0,
    },
  ];

  for (const mp of mirrorPlacements) {
    const mirrorGroup = new THREE.Group();
    mirrorGroup.name = `HauntedMirror_${mp.id}`;
    mirrorGroup.position.set(mp.x, mp.y, mp.z);
    mirrorGroup.rotation.y = mp.rotY;

    // Carved ornate outer frame + brass filigree inner molding + arch crown
    const backFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.12, 1.78, 0.06),
      mirrorFrameMat,
    );
    backFrame.position.z = -0.025;
    mirrorGroup.add(backFrame);

    const sideBorderL = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 1.78, 0.08),
      mirrorFrameMat,
    );
    sideBorderL.position.set(-0.505, 0, 0.005);
    const sideBorderR = sideBorderL.clone();
    sideBorderR.position.x = 0.505;
    const topBorder = new THREE.Mesh(
      new THREE.BoxGeometry(1.12, 0.12, 0.085),
      mirrorFrameMat,
    );
    topBorder.position.set(0, 0.83, 0.005);
    const bottomBorder = topBorder.clone();
    bottomBorder.position.y = -0.83;
    mirrorGroup.add(sideBorderL, sideBorderR, topBorder, bottomBorder);

    // Ornate Mughal/Rajasthani brass arch crest & corner studs
    const crownCrest = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.44, 0.06, 6, 1, false, 0, Math.PI),
      mirrorBrassTrimMat,
    );
    crownCrest.rotation.z = Math.PI / 2;
    crownCrest.rotation.y = Math.PI / 2;
    crownCrest.scale.set(0.25, 1.0, 0.52);
    crownCrest.position.set(0, 0.92, 0.01);
    mirrorGroup.add(crownCrest);

    const innerBrassL = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, 1.54, 0.02),
      mirrorBrassTrimMat,
    );
    innerBrassL.position.set(-0.44, 0, 0.022);
    const innerBrassR = innerBrassL.clone();
    innerBrassR.position.x = 0.44;
    const innerBrassT = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.024, 0.02),
      mirrorBrassTrimMat,
    );
    innerBrassT.position.set(0, 0.76, 0.022);
    const innerBrassB = innerBrassT.clone();
    innerBrassB.position.y = -0.76;
    mirrorGroup.add(innerBrassL, innerBrassR, innerBrassT, innerBrassB);

    // Deep dark backing behind the glass
    const mirrorVoid = new THREE.Mesh(
      new THREE.PlaneGeometry(0.88, 1.52),
      mirrorBackingMat,
    );
    mirrorVoid.position.z = 0.008;
    mirrorGroup.add(mirrorVoid);

    // Spooky Bride Rukmini reflection recessed inside the mirror (hidden until triggered)
    const reflectionGroup = new THREE.Group();
    reflectionGroup.visible = false;
    reflectionGroup.position.set(0, -0.02, 0.014);
    const reflectionOverlayMat = new THREE.MeshBasicMaterial({
      map: mirrorReflectionTex,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const reflectionPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.86, 1.48),
      reflectionOverlayMat,
    );
    reflectionGroup.add(reflectionPlane);
    mirrorGroup.add(reflectionGroup);

    // Reflective glass pane on the front face
    const glassPane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.88, 1.52),
      mirrorSurfaceMat,
    );
    glassPane.position.z = 0.024;
    mirrorGroup.add(glassPane);

    // Cold crimson mirror flash point light (off unless reflection is active)
    let scareLight: THREE.PointLight | null = null;
    if (!disableExtraLights) {
      scareLight = new THREE.PointLight(0xff2238, 0, 3.8, 2);
      scareLight.position.set(0, 0.08, 0.48);
      mirrorGroup.add(scareLight);
    }

    root.add(mirrorGroup);

    const normal = new THREE.Vector3(0, 0, 1)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), mp.rotY)
      .normalize();

    hauntedMirrors.push({
      id: mp.id,
      locationHi: mp.locationHi,
      locationEn: mp.locationEn,
      group: mirrorGroup,
      reflectionGroup,
      reflectionOverlayMat,
      scareLight,
      position: new THREE.Vector3(mp.x, mp.y, mp.z),
      normal,
      floorY: mp.floorY,
      flashTimer: 0,
      cooldownTimer: 0,
    });
  }

  // ==========================================================================
  // 4B-3. CORRIDOR BROKEN GLASS BANGLE (टूटी लाल चूड़ियां) & DRY LEAF FLOOR TRAPS
  //       Stepping without crouching creates a sharp glass-crunch + 18m noise alert!
  // ==========================================================================
  const banglePatches: GlassBanglePatchInstance[] = [];

  const brokenBangleMat = new THREE.MeshStandardMaterial({
    color: 0xd9142b,
    emissive: 0x4b040d,
    emissiveIntensity: 0.45,
    roughness: 0.16,
    metalness: 0.62,
  });
  const brokenBangleGoldMat = new THREE.MeshStandardMaterial({
    color: 0xe2a832,
    emissive: 0x3b2204,
    emissiveIntensity: 0.35,
    roughness: 0.24,
    metalness: 0.85,
  });
  const dryLeafBrownMat = new THREE.MeshStandardMaterial({
    color: 0x5c3b1e,
    roughness: 0.9,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const dryLeafOchreMat = new THREE.MeshStandardMaterial({
    color: 0x7c5328,
    roughness: 0.88,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  const bangleArcGeoA = new THREE.TorusGeometry(0.055, 0.0065, 6, 14, Math.PI * 1.15);
  const bangleArcGeoB = new THREE.TorusGeometry(0.048, 0.0058, 6, 12, Math.PI * 0.8);
  const glassShardGeo = new THREE.ConeGeometry(0.018, 0.055, 3);
  const dryLeafShape = new THREE.Shape();
  dryLeafShape.moveTo(0, -0.065);
  dryLeafShape.quadraticCurveTo(0.048, -0.02, 0.028, 0.04);
  dryLeafShape.quadraticCurveTo(0, 0.085, 0, 0.092);
  dryLeafShape.quadraticCurveTo(0, 0.085, -0.028, 0.04);
  dryLeafShape.quadraticCurveTo(-0.048, -0.02, 0, -0.065);
  const dryLeafGeo = new THREE.ShapeGeometry(dryLeafShape);

  const banglePatchSpecs: Array<{
    id: string;
    locationHi: string;
    locationEn: string;
    x: number;
    y: number;
    z: number;
    floorY: number;
    radius: number;
  }> = [
    {
      id: 'bangles_ground_west',
      locationHi: 'शाही दरबार पश्चिमी गलियारा (GF)',
      locationEn: 'Grand Atrium West Aisle',
      x: -17.0,
      y: 0.015,
      z: 3.0,
      floorY: 0,
      radius: 1.05,
    },
    {
      id: 'bangles_ground_east',
      locationHi: 'शाही दरबार पूर्वी गलियारा (GF)',
      locationEn: 'Grand Atrium East Aisle',
      x: 17.0,
      y: 0.015,
      z: -6.0,
      floorY: 0,
      radius: 1.05,
    },
    {
      id: 'bangles_ground_main',
      locationHi: 'भूतल उत्तरी पथ (GF)',
      locationEn: 'Ground Rear Walkway',
      x: -5.5,
      y: 0.015,
      z: -35.0,
      floorY: 0,
      radius: 1.1,
    },
    {
      id: 'bangles_2f_west',
      locationHi: 'दूसरी मंज़िल पश्चिमी बालकनी (2F)',
      locationEn: '2F West Balcony',
      x: -17.0,
      y: 5.015,
      z: -6.5,
      floorY: 5.0,
      radius: 0.95,
    },
    {
      id: 'bangles_2f_east',
      locationHi: 'दूसरी मंज़िल पूर्वी बालकनी (2F)',
      locationEn: '2F East Balcony',
      x: 17.0,
      y: 5.015,
      z: 3.5,
      floorY: 5.0,
      radius: 0.95,
    },
    {
      id: 'bangles_3f_main',
      locationHi: 'तीसरी मंज़िल दक्षिणी बालकनी (3F)',
      locationEn: '3F South Balcony',
      x: 0.0,
      y: 10.015,
      z: 4.5,
      floorY: 10.0,
      radius: 1.05,
    },
    {
      id: 'bangles_3f_east',
      locationHi: 'तीसरी मंज़िल पूर्वी बालकनी (3F)',
      locationEn: '3F East Balcony',
      x: 17.0,
      y: 10.015,
      z: -8.5,
      floorY: 10.0,
      radius: 0.95,
    },
    {
      id: 'bangles_basement_hall',
      locationHi: 'भूमिगत तहखाना गलियारा (B1)',
      locationEn: 'Basement Stone Hallway',
      x: 0.0,
      y: -4.485,
      z: -51.0,
      floorY: -4.5,
      radius: 1.05,
    },
  ];

  for (let pIdx = 0; pIdx < banglePatchSpecs.length; pIdx++) {
    const spec = banglePatchSpecs[pIdx];
    const patchGroup = new THREE.Group();
    patchGroup.name = `BangleTrap_${spec.id}`;
    patchGroup.position.set(spec.x, spec.y, spec.z);

    // Subtle dark dust/grit stain beneath the broken bangles & leaves
    const stainDisk = new THREE.Mesh(
      new THREE.CircleGeometry(spec.radius * 0.92, 20),
      new THREE.MeshBasicMaterial({
        color: 0x1e0e0b,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      }),
    );
    stainDisk.rotation.x = -Math.PI / 2;
    stainDisk.position.y = 0.002;
    patchGroup.add(stainDisk);

    // 18 broken red bridal bangle arcs + gold lac fragments
    for (let b = 0; b < 18; b++) {
      const seed = (pIdx + 1) * 31 + b * 17;
      const angle = ((seed * 1.37) % (Math.PI * 2));
      const dist = Math.sqrt(((seed * 29) % 100) / 100) * (spec.radius * 0.86);
      const isGoldTrim = b % 5 === 0;
      const arcMesh = new THREE.Mesh(
        b % 2 === 0 ? bangleArcGeoA : bangleArcGeoB,
        isGoldTrim ? brokenBangleGoldMat : brokenBangleMat,
      );
      arcMesh.position.set(
        Math.cos(angle) * dist,
        0.007 + (b % 3) * 0.002,
        Math.sin(angle) * dist,
      );
      arcMesh.rotation.set(
        Math.PI / 2 + (((seed % 7) - 3) * 0.06),
        0,
        angle * 1.9,
      );
      arcMesh.scale.setScalar(0.95 + (b % 4) * 0.14);
      patchGroup.add(arcMesh);
    }

    // 12 sharp red glass splinters catching lantern light
    for (let s = 0; s < 12; s++) {
      const seed = (pIdx + 3) * 43 + s * 19;
      const angle = ((seed * 2.11) % (Math.PI * 2));
      const dist = ((seed * 37) % 100) / 100 * (spec.radius * 0.85);
      const shard = new THREE.Mesh(glassShardGeo, brokenBangleMat);
      shard.position.set(Math.cos(angle) * dist, 0.008, Math.sin(angle) * dist);
      shard.rotation.set(Math.PI / 2 - 0.15, angle, (s % 5) * 0.4);
      shard.scale.set(1.0, 1.0, 0.35);
      patchGroup.add(shard);
    }

    // 14 scattered dry brittle leaves mixed with the broken bangles
    for (let l = 0; l < 14; l++) {
      const seed = (pIdx + 5) * 53 + l * 23;
      const angle = ((seed * 1.73) % (Math.PI * 2));
      const dist = Math.sqrt(((seed * 41) % 100) / 100) * (spec.radius * 0.92);
      const leaf = new THREE.Mesh(
        dryLeafGeo,
        l % 2 === 0 ? dryLeafBrownMat : dryLeafOchreMat,
      );
      leaf.position.set(
        Math.cos(angle) * dist,
        0.009 + (l % 3) * 0.003,
        Math.sin(angle) * dist,
      );
      leaf.rotation.set(-Math.PI / 2 + (((l % 5) - 2) * 0.09), 0, angle * 2.4);
      leaf.scale.setScalar(1.0 + (l % 4) * 0.22);
      patchGroup.add(leaf);
    }

    root.add(patchGroup);

    banglePatches.push({
      id: spec.id,
      locationHi: spec.locationHi,
      locationEn: spec.locationEn,
      group: patchGroup,
      position: new THREE.Vector3(spec.x, spec.y, spec.z),
      floorY: spec.floorY,
      radius: spec.radius,
      cooldownTimer: 0,
    });
  }

  // ==========================================================================
  // 4C. STRICTLY 16 UNIQUE TRADITIONAL HAVELI HIDING SPOTS (1 PER ROOM)
  //     4 Basement Rooms (U1-U4) + 4 Ground (G1-G4) + 4 Second (2F) + 4 Third (3F)
  // ==========================================================================
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xb85d38,
    emissive: 0x261006,
    emissiveIntensity: 0.16,
    roughness: 0.36,
    metalness: 0.82,
  });
  const silkVelvetMat = new THREE.MeshStandardMaterial({
    color: 0x8a0f1d,
    emissive: 0x240408,
    emissiveIntensity: 0.18,
    roughness: 0.72,
    side: THREE.DoubleSide,
  });
  const darkHollowMat = new THREE.MeshBasicMaterial({
    color: 0x090708,
    side: THREE.DoubleSide,
  });

  // Reusable Builders for Traditional Indian Haveli Hiding Props
  const createSandookSpot = (
    id: string,
    nameHi: string,
    nameEn: string,
    roomNameHi: string,
    x: number,
    floorY: number,
    z: number,
    rotY: number,
    hideViewPos: THREE.Vector3,
    exitPos: THREE.Vector3,
    lookYaw: number,
  ) => {
    const sandookGroup = new THREE.Group();
    sandookGroup.name = `HidingSpot_${id}`;
    sandookGroup.position.set(x, floorY, z);
    sandookGroup.rotation.y = rotY;
    root.add(sandookGroup);

    const trunkBase = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.98, 1.08), woodMat);
    trunkBase.position.y = 0.52;
    trunkBase.castShadow = true;
    sandookGroup.add(trunkBase);

    const hollowInterior = new THREE.Mesh(
      new THREE.BoxGeometry(1.68, 0.1, 0.92),
      darkHollowMat,
    );
    hollowInterior.position.y = 1.02;
    sandookGroup.add(hollowInterior);

    [-0.64, 0, 0.64].forEach((bx) => {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 1.12), brassMat);
      strap.position.set(bx, 0.52, 0);
      sandookGroup.add(strap);
    });

    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 1.02, 0.54);
    const lidBox = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.26, 1.12), woodMat);
    lidBox.position.set(0, 0.13, -0.54);
    const lidBrassTrim = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.08, 1.16), brassMat);
    lidBrassTrim.position.set(0, 0.05, -0.54);
    lidPivot.add(lidBox, lidBrassTrim);
    sandookGroup.add(lidPivot);

    hidingSpots.push({
      id,
      nameHi,
      nameEn,
      roomNameHi,
      group: sandookGroup,
      doorPivot: lidPivot,
      animType: 'lid_x',
      position: new THREE.Vector3(x, floorY, z),
      hideViewPos,
      exitPos,
      floorY,
      lookYaw,
      isOccupied: false,
      openPulse: 0,
    });
  };

  const createWallNicheSpot = (
    id: string,
    nameHi: string,
    nameEn: string,
    roomNameHi: string,
    x: number,
    floorY: number,
    z: number,
    rotY: number,
    style: 'jaali_curtain' | 'stone_door' | 'wood_almirah' | 'rotating_panel',
    hideViewPos: THREE.Vector3,
    exitPos: THREE.Vector3,
    lookYaw: number,
  ) => {
    const g = new THREE.Group();
    g.name = `HidingSpot_${id}`;
    g.position.set(x, floorY, z);
    g.rotation.y = rotY;
    root.add(g);

    const cavityArch = buildRajasthaniCuspedArch(
      2.15,
      2.75,
      0.58,
      carvedSandstoneMat,
    );
    g.add(cavityArch);

    [-0.98, 0.98].forEach((sx) => {
      const sideStone = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 2.7, 1.05),
        style === 'wood_almirah' ? woodMat : carvedSandstoneMat,
      );
      sideStone.position.set(sx, 1.35, -0.32);
      g.add(sideStone);
    });

    const backVoid = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 2.55, 0.1),
      darkHollowMat,
    );
    backVoid.position.set(0, 1.32, -0.36);
    g.add(backVoid);

    if (style === 'jaali_curtain') {
      for (let j = -3; j <= 3; j++) {
        const bar = new THREE.Mesh(
          new THREE.BoxGeometry(0.055, 2.1, 0.07),
          carvedSandstoneMat,
        );
        bar.position.set(j * 0.22, 1.2, 0.16);
        g.add(bar);
      }
      const curtainPivot = new THREE.Group();
      curtainPivot.position.set(0, 2.45, 0.24);
      const lCurt = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.35, 0.05), silkVelvetMat);
      lCurt.position.set(-0.48, -1.17, 0);
      const rCurt = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.35, 0.05), silkVelvetMat);
      rCurt.position.set(0.48, -1.17, 0);
      curtainPivot.add(lCurt, rCurt);
      g.add(curtainPivot);
      hidingSpots.push({
        id,
        nameHi,
        nameEn,
        roomNameHi,
        group: g,
        doorPivot: curtainPivot,
        animType: 'curtain_scale',
        position: new THREE.Vector3(x, floorY, z),
        hideViewPos,
        exitPos,
        floorY,
        lookYaw,
        isOccupied: false,
        openPulse: 0,
      });
    } else if (style === 'rotating_panel') {
      const panelPivot = new THREE.Group();
      panelPivot.position.set(0, 1.35, 0.12);
      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.72, 2.45, 0.14), woodMat);
      const medallion = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.18, 16), brassMat);
      medallion.rotation.x = Math.PI / 2;
      medallion.position.y = 0.22;
      panelPivot.add(slab, medallion);
      g.add(panelPivot);
      hidingSpots.push({
        id,
        nameHi,
        nameEn,
        roomNameHi,
        group: g,
        doorPivot: panelPivot,
        animType: 'panel_rotate',
        position: new THREE.Vector3(x, floorY, z),
        hideViewPos,
        exitPos,
        floorY,
        lookYaw,
        isOccupied: false,
        openPulse: 0,
      });
    } else {
      const doorPivot = new THREE.Group();
      doorPivot.position.set(-0.56, 0.22, 0.36);
      const slabMat = style === 'wood_almirah' ? woodMat : carvedSandstoneMat;
      const doorSlab = new THREE.Mesh(new THREE.BoxGeometry(1.12, 2.28, 0.12), slabMat);
      doorSlab.position.set(0.56, 1.14, 0);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), brassMat);
      knob.position.set(0.95, 1.15, 0.08);
      doorPivot.add(doorSlab, knob);
      g.add(doorPivot);
      hidingSpots.push({
        id,
        nameHi,
        nameEn,
        roomNameHi,
        group: g,
        doorPivot,
        animType: 'door_y',
        position: new THREE.Vector3(x, floorY, z),
        hideViewPos,
        exitPos,
        floorY,
        lookYaw,
        isOccupied: false,
        openPulse: 0,
      });
    }
  };

  // --- UNDERGROUND LABYRINTH (y = -4.5): STRICTLY 1 UNIQUE HIDING SPOT PER ROOM (U1–U10) ---
  // Reusable helpers for Wooden Barrel & Iron Cage Corner underground hiding spots
  const createBasementBarrelSpot = (
    id: string,
    nameHi: string,
    nameEn: string,
    roomNameHi: string,
    x: number,
    z: number,
    hideViewPos: THREE.Vector3,
    exitPos: THREE.Vector3,
    lookYaw: number,
  ) => {
    const barrelGroup = new THREE.Group();
    barrelGroup.name = `HidingSpot_${id}`;
    barrelGroup.position.set(x, -4.5, z);
    root.add(barrelGroup);

    const barrelBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 0.88, 1.95, 18, 1, true),
      woodMat,
    );
    barrelBody.position.y = 1.02;
    const barrelFloorMat = new THREE.MeshBasicMaterial({ color: 0x090708 });
    const barrelInner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.84, 0.82, 1.9, 16, 1, true),
      barrelFloorMat,
    );
    barrelInner.position.y = 1.0;
    const barrelBase = new THREE.Mesh(
      new THREE.CircleGeometry(0.84, 16),
      barrelFloorMat,
    );
    barrelBase.rotation.x = -Math.PI / 2;
    barrelBase.position.y = 0.08;
    barrelGroup.add(barrelBody, barrelInner, barrelBase);

    [0.45, 1.05, 1.65].forEach((hy) => {
      const ironHoop = new THREE.Mesh(
        new THREE.TorusGeometry(0.93, 0.04, 8, 20),
        ironMat,
      );
      ironHoop.rotation.x = Math.PI / 2;
      ironHoop.position.y = hy;
      barrelGroup.add(ironHoop);
    });

    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 2.02, -0.9);
    const woodLid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.94, 0.94, 0.1, 18),
      woodMat,
    );
    woodLid.position.set(0, 0.05, 0.9);
    lidPivot.add(woodLid);
    barrelGroup.add(lidPivot);

    hidingSpots.push({
      id,
      nameHi,
      nameEn,
      roomNameHi,
      group: barrelGroup,
      doorPivot: lidPivot,
      animType: 'lid_x',
      position: new THREE.Vector3(x, -4.5, z),
      hideViewPos,
      exitPos,
      floorY: -4.5,
      lookYaw,
      isOccupied: false,
      openPulse: 0,
    });
  };

  const createBasementIronCageSpot = (
    id: string,
    nameHi: string,
    nameEn: string,
    roomNameHi: string,
    x: number,
    z: number,
    rotY: number,
    hideViewPos: THREE.Vector3,
    exitPos: THREE.Vector3,
    lookYaw: number,
  ) => {
    const cageGroup = new THREE.Group();
    cageGroup.name = `HidingSpot_${id}`;
    cageGroup.position.set(x, -4.5, z);
    cageGroup.rotation.y = rotY;
    root.add(cageGroup);

    const framePostGeo = new THREE.CylinderGeometry(0.045, 0.045, 2.25, 8);
    const barMeshGeo = new THREE.CylinderGeometry(0.022, 0.022, 2.15, 6);
    const darkInteriorMat = new THREE.MeshBasicMaterial({ color: 0x080709 });

    // Corner posts + roof plate + dark shadow backing
    [
      [-0.65, -0.65],
      [0.65, -0.65],
      [-0.65, 0.65],
      [0.65, 0.65],
    ].forEach(([px, pz]) => {
      const post = new THREE.Mesh(framePostGeo, ironMat);
      post.position.set(px, 1.125, pz);
      cageGroup.add(post);
    });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.1, 1.42), ironMat);
    roof.position.y = 2.25;
    const backShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.28, 2.2),
      darkInteriorMat,
    );
    backShadow.position.set(0, 1.1, -0.62);
    cageGroup.add(roof, backShadow);

    // Side & back bars
    for (let i = -2; i <= 2; i++) {
      const bBack = new THREE.Mesh(barMeshGeo, ironMat);
      bBack.position.set(i * 0.24, 1.12, -0.65);
      const bLeft = new THREE.Mesh(barMeshGeo, ironMat);
      bLeft.position.set(-0.65, 1.12, i * 0.24);
      const bRight = new THREE.Mesh(barMeshGeo, ironMat);
      bRight.position.set(0.65, 1.12, i * 0.24);
      cageGroup.add(bBack, bLeft, bRight);
    }

    // Hinged iron bar front gate
    const gatePivot = new THREE.Group();
    gatePivot.position.set(-0.65, 0, 0.65);
    const gateTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.08, 0.07),
      ironMat,
    );
    gateTop.position.set(0.65, 2.12, 0);
    const gateBot = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.08, 0.07),
      ironMat,
    );
    gateBot.position.set(0.65, 0.12, 0);
    gatePivot.add(gateTop, gateBot);
    for (let i = 1; i <= 4; i++) {
      const gBar = new THREE.Mesh(barMeshGeo, ironMat);
      gBar.position.set(i * 0.26, 1.12, 0);
      gatePivot.add(gBar);
    }
    cageGroup.add(gatePivot);

    hidingSpots.push({
      id,
      nameHi,
      nameEn,
      roomNameHi,
      group: cageGroup,
      doorPivot: gatePivot,
      animType: 'door_y',
      position: new THREE.Vector3(x, -4.5, z),
      hideViewPos,
      exitPos,
      floorY: -4.5,
      lookYaw,
      isOccupied: false,
      openPulse: 0,
    });
  };

  // U1 (काल-कोठरी 1, x: -13..-2, z: -52..-42): Stone Coffin Alcove (-11.8, -4.5, -43.5)
  createWallNicheSpot(
    'hide_u1_stone_coffin',
    'प्राचीन पत्थर का ताबूत कोना (Stone Coffin Alcove)',
    'Stone Coffin Alcove',
    'काल-कोठरी 1 (U1)',
    -11.8,
    -4.5,
    -43.5,
    Math.PI / 2,
    'stone_door',
    new THREE.Vector3(-11.2, -4.5, -43.5),
    new THREE.Vector3(-9.7, -4.5, -43.5),
    -Math.PI / 2,
  );

  // U2 (काल-कोठरी 2, x: -28..-17, z: -52..-42): Iron Cage Corner (-26.3, -4.5, -44.2)
  createBasementIronCageSpot(
    'hide_u2_iron_cage',
    'जंग लगा लोहे का पिंजरा कोना (Iron Cage Corner)',
    'Iron Cage Corner',
    'काल-कोठरी 2 (U2)',
    -26.3,
    -44.2,
    Math.PI / 2,
    new THREE.Vector3(-25.95, -4.5, -44.2),
    new THREE.Vector3(-24.1, -4.5, -44.2),
    -Math.PI / 2,
  );

  // U3 (तांत्रिक हवन कक्ष, x: 2..13, z: -52..-45): Cracked Ritual Wall Niche (11.8, -4.5, -50.4)
  createWallNicheSpot(
    'hide_u3_havan_niche',
    'तांत्रिक वेदी दरार कोना (Cracked Ritual Wall Niche)',
    'Cracked Ritual Wall Niche',
    'तांत्रिक हवन कक्ष (U3)',
    11.8,
    -4.5,
    -50.4,
    -Math.PI / 2,
    'stone_door',
    new THREE.Vector3(11.2, -4.5, -50.4),
    new THREE.Vector3(9.7, -4.5, -50.4),
    Math.PI / 2,
  );

  // U4 (गुप्त खज़ाना तिजोरी, x: 13..28, z: -66..-56): Cracked Stone Vault Niche (26.8, -4.5, -61.0)
  createWallNicheSpot(
    'hide_u4_vault_niche',
    'टूटी पत्थर की तिजोरी कोना (Cracked Vault Wall Niche)',
    'Cracked Vault Wall Niche',
    'गुप्त खज़ाना तिजोरी (U4)',
    26.8,
    -4.5,
    -61.0,
    -Math.PI / 2,
    'stone_door',
    new THREE.Vector3(26.2, -4.5, -61.0),
    new THREE.Vector3(24.6, -4.5, -61.0),
    Math.PI / 2,
  );

  // U5 (पुराना तेल व अनाज भंडार, x: 17..28, z: -52..-42): Giant Wooden Oil Barrel (25.6, -4.5, -47.0)
  createBasementBarrelSpot(
    'hide_u5_wooden_barrel',
    'लकड़ी का विशाल तेल पीपा (Giant Wooden Barrel)',
    'Wooden Barrel',
    'पुराना तेल व अनाज भंडार (U5)',
    25.6,
    -47.0,
    new THREE.Vector3(25.2, -4.5, -47.0),
    new THREE.Vector3(23.4, -4.5, -47.0),
    Math.PI / 2,
  );

  // U6 (ज़ंजीर व यातना कक्ष, x: -28..-13, z: -66..-56): Iron Torture Cage Corner (-26.3, -4.5, -61.0)
  createBasementIronCageSpot(
    'hide_u6_torture_cage',
    'यातना लोहे का पिंजरा कोना (Iron Torture Cage)',
    'Iron Cage Corner',
    'ज़ंजीर व यातना कक्ष (U6)',
    -26.3,
    -61.0,
    Math.PI / 2,
    new THREE.Vector3(-25.95, -4.5, -61.0),
    new THREE.Vector3(-24.1, -4.5, -61.0),
    -Math.PI / 2,
  );

  // U7 (कुएं की निचली सुरंग, x: -9..+9, z: -66..-56): Cracked Stone Shaft Wall Niche (7.8, -4.5, -61.0)
  createWallNicheSpot(
    'hide_u7_well_niche',
    'कुएं की दरार पत्थर कोना (Cracked Well-Shaft Niche)',
    'Cracked Wall Niche',
    'कुएं की निचली सुरंग (U7)',
    7.8,
    -4.5,
    -61.0,
    -Math.PI / 2,
    'stone_door',
    new THREE.Vector3(7.2, -4.5, -61.0),
    new THREE.Vector3(5.6, -4.5, -61.0),
    Math.PI / 2,
  );

  // U8 (टूटी मूर्तियों का कक्ष, x: -26..-11, z: -80..-70): Stone Coffin Alcove (-24.8, -4.5, -75.0)
  createWallNicheSpot(
    'hide_u8_idol_coffin',
    'मूर्ति कक्ष पत्थर ताबूत कोना (Stone Coffin Alcove)',
    'Stone Coffin Alcove',
    'टूटी मूर्तियों का कक्ष (U8)',
    -24.8,
    -4.5,
    -75.0,
    Math.PI / 2,
    'stone_door',
    new THREE.Vector3(-24.2, -4.5, -75.0),
    new THREE.Vector3(-22.6, -4.5, -75.0),
    -Math.PI / 2,
  );

  // U9 (धंसी हुई सुरंग, x: -11..+2, z: -80..-70): Supply Wooden Barrel (-9.2, -4.5, -77.2)
  createBasementBarrelSpot(
    'hide_u9_tunnel_barrel',
    'सुरंग लकड़ी का पीपा (Tunnel Wooden Barrel)',
    'Wooden Barrel',
    'धंसी हुई सुरंग (U9)',
    -9.2,
    -77.2,
    new THREE.Vector3(-8.8, -4.5, -77.2),
    new THREE.Vector3(-7.0, -4.5, -77.2),
    -Math.PI / 2,
  );

  // U10 (प्राचीन अस्थि कक्ष, x: +2..+16, z: -80..-70): Ancient Stone Sarcophagus Alcove (14.8, -4.5, -75.0)
  createWallNicheSpot(
    'hide_u10_crypt_coffin',
    'अस्थि कक्ष पत्थर ताबूत कोना (Ancient Coffin Alcove)',
    'Stone Coffin Alcove',
    'प्राचीन अस्थि कक्ष (U10)',
    14.8,
    -4.5,
    -75.0,
    -Math.PI / 2,
    'stone_door',
    new THREE.Vector3(14.2, -4.5, -75.0),
    new THREE.Vector3(12.6, -4.5, -75.0),
    Math.PI / 2,
  );

  // --- GROUND FLOOR (y = 0.0): STRICTLY 1 HIDING SPOT PER ROOM (G1–G6) ---
  // G1 (Shahi Shastragar / Armory, x: -32..-16, z: -8.5..10): Secret Armory Wall Niche (-30.8, 0.0, 5.2)
  createWallNicheSpot(
    'hide_g1_wall_niche',
    'शस्त्रागार का गुप्त जाली झरोखा (Armory Wall Niche)',
    'Armory Wall Niche',
    'शाही शस्त्रागार (G1)',
    -30.8,
    0.0,
    5.2,
    Math.PI / 2,
    'jaali_curtain',
    new THREE.Vector3(-30.2, 0.0, 5.2),
    new THREE.Vector3(-28.6, 0.0, 5.2),
    -Math.PI / 2,
  );

  // G2 (Purani Rasoi & Anna-Kothi, x: -32..-16, z: -27.5..-8.5): Giant Clay Grain Kothi (-29.2, 0.0, -22.5)
  {
    const kothiGroup = new THREE.Group();
    kothiGroup.name = 'HidingSpot_hide_g2_clay_kothi';
    kothiGroup.position.set(-29.2, 0.0, -22.5);
    root.add(kothiGroup);

    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(0.96, 1.06, 0.24, 20),
      carvedSandstoneMat,
    );
    plinth.position.y = 0.12;
    const siloBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.84, 0.92, 2.1, 22, 1, true),
      clayMat,
    );
    siloBody.position.y = 1.25;
    siloBody.castShadow = true;
    const siloInner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.78, 0.82, 2.05, 18),
      darkHollowMat,
    );
    siloInner.position.y = 1.24;
    kothiGroup.add(plinth, siloBody, siloInner);

    [0.65, 1.25, 1.85].forEach((ry) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.89, 0.045, 10, 24),
        carvedSandstoneMat,
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = ry;
      kothiGroup.add(ring);
    });

    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 2.3, -0.84);
    const woodLid = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.12, 20), woodMat);
    woodLid.position.set(0, 0.06, 0.84);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 16), brassMat);
    handle.position.set(0, 0.16, 0.84);
    lidPivot.add(woodLid, handle);
    kothiGroup.add(lidPivot);

    hidingSpots.push({
      id: 'hide_g2_clay_kothi',
      nameHi: 'मिट्टी की विशाल अनाज कोठी (Giant Clay Grain Kothi)',
      nameEn: 'Clay Grain Kothi',
      roomNameHi: 'पुरानी रसोई और अन्न-कोठी (G2)',
      group: kothiGroup,
      doorPivot: lidPivot,
      animType: 'lid_x',
      position: new THREE.Vector3(-29.2, 0.0, -22.5),
      hideViewPos: new THREE.Vector3(-28.2, 0.0, -22.5),
      exitPos: new THREE.Vector3(-26.8, 0.0, -22.5),
      floorY: 0.0,
      lookYaw: -Math.PI / 2,
      isOccupied: false,
      openPulse: 0,
    });
  }

  // G5 (Mehmaan Baithak / Drawing Room, x: -32..-16, z: -46..-27.5): Royal Velvet Diwan Alcove (-30.8, 0.0, -37.5)
  createWallNicheSpot(
    'hide_g5_baithak_alcove',
    'बैठक का मखमली जाली पर्दा कोना (Baithak Velvet Alcove)',
    'Baithak Velvet Alcove',
    'मेहमान बैठक (G5)',
    -30.8,
    0.0,
    -37.5,
    Math.PI / 2,
    'jaali_curtain',
    new THREE.Vector3(-30.2, 0.0, -37.5),
    new THREE.Vector3(-28.6, 0.0, -37.5),
    -Math.PI / 2,
  );

  // G3 (Munim Record Room, x: 16..32, z: -8.5..10): Vintage Wooden Almirah (30.8, 0.0, 5.2)
  createWallNicheSpot(
    'hide_g3_wooden_almirah',
    'प्राचीन सागौन की अलमारी (Vintage Wooden Almirah)',
    'Wooden Almirah',
    'मुनीम बही-खाता कक्ष (G3)',
    30.8,
    0.0,
    5.2,
    -Math.PI / 2,
    'wood_almirah',
    new THREE.Vector3(30.2, 0.0, 5.2),
    new THREE.Vector3(28.6, 0.0, 5.2),
    Math.PI / 2,
  );

  // G4 (Prachin Pooja Ghar, x: 16..32, z: -27.5..-8.5): Mandir Velvet Curtain Alcove (30.8, 0.0, -18.0)
  createWallNicheSpot(
    'hide_g4_mandir_curtain',
    'मंदिर का मखमली पर्दा कोना (Mandir Curtain Alcove)',
    'Mandir Curtain',
    'प्राचीन पूजा घर (G4)',
    30.8,
    0.0,
    -18.0,
    -Math.PI / 2,
    'jaali_curtain',
    new THREE.Vector3(30.2, 0.0, -18.0),
    new THREE.Vector3(28.6, 0.0, -18.0),
    Math.PI / 2,
  );

  // G6 (Sevak Kaksh / Servant Quarters, x: 16..32, z: -46..-27.5): Servant's Iron-Bound Linen Sandook (29.6, 0.0, -36.75)
  createSandookSpot(
    'hide_g6_sevak_trunk',
    'सेवकों का बड़ा लकड़ी का संदूक (Servant Linen Trunk)',
    'Servant Linen Trunk',
    'सेवक कक्ष (G6)',
    29.6,
    0.0,
    -36.75,
    -Math.PI / 2,
    new THREE.Vector3(28.95, 0.0, -36.75),
    new THREE.Vector3(27.4, 0.0, -36.75),
    Math.PI / 2,
  );

  // --- SECOND FLOOR (y = 5.0): STRICTLY 1 HIDING SPOT PER ROOM (2F-1 to 2F-8) ---
  // F2-1 (Rukmini's Bridal Room, x: 16..32, z: -8.5..10): Royal Bridal Palki (29.2, 5.0, 4.8)
  {
    const palkiGroup = new THREE.Group();
    palkiGroup.name = 'HidingSpot_hide_f2_1_royal_palki';
    palkiGroup.position.set(29.2, 5.0, 4.8);
    palkiGroup.rotation.y = -Math.PI / 2;
    root.add(palkiGroup);

    const baseBox = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.24, 1.3), woodMat);
    baseBox.position.y = 0.28;
    palkiGroup.add(baseBox);

    for (const [lx, lz] of [
      [-0.92, -0.52],
      [0.92, -0.52],
      [-0.92, 0.52],
      [0.92, 0.52],
    ]) {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.2, 8), brassMat);
      foot.position.set(lx, 0.1, lz);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 1.65, 8), woodMat);
      post.position.set(lx, 1.18, lz);
      palkiGroup.add(foot, post);
    }

    const roofRim = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.16, 1.38), brassMat);
    roofRim.position.y = 2.02;
    const roofVault = new THREE.Mesh(
      new THREE.CylinderGeometry(0.66, 0.76, 2.2, 12, 1, false, 0, Math.PI),
      woodMat,
    );
    roofVault.rotation.z = Math.PI / 2;
    roofVault.scale.set(0.55, 1.0, 0.95);
    roofVault.position.y = 2.08;
    palkiGroup.add(roofRim, roofVault);

    const backPanel = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.55, 0.08), woodMat);
    backPanel.position.set(0, 1.18, -0.6);
    palkiGroup.add(backPanel);

    const curtainPivot = new THREE.Group();
    curtainPivot.position.set(0, 1.96, 0.6);
    const leftSilk = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.52, 0.05), silkVelvetMat);
    leftSilk.position.set(-0.48, -0.76, 0);
    const rightSilk = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.52, 0.05), silkVelvetMat);
    rightSilk.position.set(0.48, -0.76, 0);
    curtainPivot.add(leftSilk, rightSilk);
    palkiGroup.add(curtainPivot);

    hidingSpots.push({
      id: 'hide_f2_1_royal_palki',
      nameHi: 'शाही दुल्हन पालकी (Royal Bridal Palki)',
      nameEn: 'Royal Palki',
      roomNameHi: 'रुक्मिणी का सुहाग कक्ष (2F-1)',
      group: palkiGroup,
      doorPivot: curtainPivot,
      animType: 'curtain_scale',
      position: new THREE.Vector3(29.2, 5.0, 4.8),
      hideViewPos: new THREE.Vector3(28.4, 5.0, 4.8),
      exitPos: new THREE.Vector3(26.8, 5.0, 4.8),
      floorY: 5.0,
      lookYaw: Math.PI / 2,
      isOccupied: false,
      openPulse: 0,
    });
  }

  // F2-2 (Thakur's Master Bedroom, x: -32..-19, z: -8.5..10): Hide Under Carved Four-Poster Maharaja Bed flush against West wall (-30.85, 5.0, 4.6)
  {
    const bedGroup = new THREE.Group();
    bedGroup.name = 'HidingSpot_hide_f2_2_four_poster_bed';
    bedGroup.position.set(-30.85, 5.0, 4.6);
    bedGroup.rotation.y = Math.PI / 2;
    root.add(bedGroup);

    // Upgraded realistic antique Indian wooden four-poster bed (elevated for 0.72m hollow under-bed crawl space)
    const antiqueMasterBed = createAntiqueIndianBed({
      variant: 'royal_crimson',
      width: 2.22,
      length: 1.56,
      withCanopy: true,
      withGarlands: false,
      elevatedForHiding: true,
      materials: {
        woodMat,
        brassMat,
        curtainMat: silkVelvetMat,
      },
    });
    bedGroup.add(antiqueMasterBed);

    const underShadow = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.04, 1.28), darkHollowMat);
    underShadow.position.y = 0.02;
    bedGroup.add(underShadow);

    decorateExistingFourPosterBed(bedGroup, {
      crimsonCanopyMat: silkVelvetMat,
      brassMat,
    });

    // Velvet under-bed valance curtains hanging across the front gap so player peeks out from UNDER the bed
    const curtainPivot = new THREE.Group();
    curtainPivot.position.set(0, 0.76, 0.74);
    const lDrape = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.7, 0.05), silkVelvetMat);
    lDrape.position.set(-0.49, -0.35, 0);
    const rDrape = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.7, 0.05), silkVelvetMat);
    rDrape.position.set(0.49, -0.35, 0);
    curtainPivot.add(lDrape, rDrape);
    bedGroup.add(curtainPivot);

    hidingSpots.push({
      id: 'hide_f2_2_four_poster_bed',
      nameHi: 'नक्काशीदार चारपायी पलंग के नीचे (Under Carved Four-Poster Bed)',
      nameEn: 'Under Carved Four-Poster Bed',
      roomNameHi: 'ठाकुर का शयनकक्ष (2F-2)',
      group: bedGroup,
      doorPivot: curtainPivot,
      animType: 'curtain_scale',
      position: new THREE.Vector3(-30.85, 5.0, 4.6),
      hideViewPos: new THREE.Vector3(-30.75, 5.0, 4.6),
      exitPos: new THREE.Vector3(-28.4, 5.0, 4.6),
      floorY: 5.0,
      lookYaw: -Math.PI / 2,
      isOccupied: false,
      openPulse: 0,
      hideEyeOffsetY: -0.98,
    });
  }

  // F2-3 (Guest Room / Mehmaan Khana, x: 16..32, z: -46..-27.5): Brass-Bound Wooden Sandook (29.6, 5.0, -37.5)
  createSandookSpot(
    'hide_f2_3_sandook_chest',
    'पीतल-जड़ा शाही संदूक (Brass-Bound Sandook)',
    'Guest Sandook Chest',
    'मेहमान ख़ाना (2F-3)',
    29.6,
    5.0,
    -37.5,
    -Math.PI / 2,
    new THREE.Vector3(28.95, 5.0, -37.5),
    new THREE.Vector3(27.4, 5.0, -37.5),
    Math.PI / 2,
  );

  // F2-4 (Sangeet Hall, x: -32..-16, z: -46..-27.5): Carved Deewan Jharokha Partition (-30.8, 5.0, -36.75)
  createWallNicheSpot(
    'hide_f2_4_jharokha_partition',
    'नक्काशीदार दीवान झरोखा ओट (Carved Jharokha Partition)',
    'Jharokha Partition',
    'संगीत और झरोखा हॉल (2F-4)',
    -30.8,
    5.0,
    -36.75,
    Math.PI / 2,
    'rotating_panel',
    new THREE.Vector3(-30.2, 5.0, -36.75),
    new THREE.Vector3(-28.6, 5.0, -36.75),
    -Math.PI / 2,
  );

  // F2-5 (Rani's Shringar Kaksh, x: 16..32, z: -27.5..-8.5): Carved Ivory-Inlaid Wardrobe (30.8, 5.0, -18.0)
  createWallNicheSpot(
    'hide_f2_5_shringar_cabinet',
    'रानी की नक्काशीदार श्रृंगार अलमारी (Rani Shringar Wardrobe)',
    'Rani Shringar Wardrobe',
    'रानी का श्रृंगार कक्ष (2F-5)',
    30.8,
    5.0,
    -18.0,
    -Math.PI / 2,
    'wood_almirah',
    new THREE.Vector3(30.2, 5.0, -18.0),
    new THREE.Vector3(28.6, 5.0, -18.0),
    Math.PI / 2,
  );

  // F2-6 (Royal Dining Room, x: -32..-16, z: -27.5..-8.5): Royal Silverware Sideboard Cupboard (-30.8, 5.0, -18.0)
  createWallNicheSpot(
    'hide_f2_6_dining_cupboard',
    'शाही चाँदी-बर्तन की अलमारी (Royal Sideboard Cupboard)',
    'Royal Dining Cupboard',
    'शाही भोजशाला (2F-6)',
    -30.8,
    5.0,
    -18.0,
    Math.PI / 2,
    'wood_almirah',
    new THREE.Vector3(-30.2, 5.0, -18.0),
    new THREE.Vector3(-28.6, 5.0, -18.0),
    -Math.PI / 2,
  );

  // F2-7 (Guest Suite 2, x: -16..0, z: 5.8..10.0): Carved Balcony Silk Curtain Alcove (-14.6, 5.0, 8.2)
  createWallNicheSpot(
    'hide_f2_7_guest2_alcove',
    'अतिथि कक्ष का रेशमी झरोखा पर्दा (Guest Silk Alcove)',
    'Guest Silk Alcove',
    'अतिथि कक्ष २ (2F-7)',
    -14.6,
    5.0,
    8.2,
    Math.PI / 2,
    'jaali_curtain',
    new THREE.Vector3(-14.0, 5.0, 8.2),
    new THREE.Vector3(-12.4, 5.0, 8.2),
    -Math.PI / 2,
  );

  // F2-8 (Ancestor Portrait Gallery, x: 0..16, z: 5.8..10.0): Rotating Ancestor Portrait Panel (14.6, 5.0, 8.2)
  createWallNicheSpot(
    'hide_f2_8_portrait_panel',
    'घूमने वाला पूर्वज चित्र पट (Rotating Portrait Panel)',
    'Rotating Portrait Panel',
    'पूर्वज चित्र वीथिका (2F-8)',
    14.6,
    5.0,
    8.2,
    -Math.PI / 2,
    'rotating_panel',
    new THREE.Vector3(14.0, 5.0, 8.2),
    new THREE.Vector3(12.4, 5.0, 8.2),
    Math.PI / 2,
  );

  // --- THIRD FLOOR (y = 10.0): STRICTLY 1 HIDING SPOT PER ROOM (3F-1 to 3F-8) ---
  // F3-1 (Tantrik Granth Library, x: -32..-16, z: -8.5..10): Hollow Bookshelf Cabinet (-30.6, 10.0, 6.2)
  createWallNicheSpot(
    'hide_f3_1_bookshelf_cabinet',
    'खोखली तांत्रिक किताबों की अलमारी (Hollow Bookshelf Cabinet)',
    'Bookshelf Cabinet',
    'तांत्रिक ग्रंथ पुस्तकालय (3F-1)',
    -30.6,
    10.0,
    6.2,
    Math.PI / 2,
    'wood_almirah',
    new THREE.Vector3(-30.0, 10.0, 6.2),
    new THREE.Vector3(-28.4, 10.0, 6.2),
    -Math.PI / 2,
  );

  // F3-2 (Aaina Mahal, x: 16..32, z: -8.5..10): Behind Giant Ornate Mirror Frame (30.6, 10.0, 6.2)
  {
    const gMirrorSpot = new THREE.Group();
    gMirrorSpot.name = 'HidingSpot_hide_f3_2_mirror_frame';
    gMirrorSpot.position.set(30.6, 10.0, 6.2);
    gMirrorSpot.rotation.y = -Math.PI / 2;
    root.add(gMirrorSpot);

    const nicheArch = buildRajasthaniCuspedArch(2.25, 2.85, 0.56, carvedSandstoneMat);
    gMirrorSpot.add(nicheArch);

    [-1.02, 1.02].forEach((sx) => {
      const sideStone = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 2.75, 1.08),
        carvedSandstoneMat,
      );
      sideStone.position.set(sx, 1.375, -0.34);
      gMirrorSpot.add(sideStone);
    });
    const backVoid = new THREE.Mesh(
      new THREE.BoxGeometry(1.86, 2.6, 0.1),
      darkHollowMat,
    );
    backVoid.position.set(0, 1.35, -0.38);
    gMirrorSpot.add(backVoid);

    // Swinging Giant Ornate Mirror Door Frame hiding the secret alcove behind it
    const mirrorDoorPivot = new THREE.Group();
    mirrorDoorPivot.position.set(-0.74, 0.14, 0.24);
    const ornateBack = new THREE.Mesh(
      new THREE.BoxGeometry(1.48, 2.48, 0.09),
      mirrorFrameMat,
    );
    ornateBack.position.set(0.74, 1.24, 0);
    const goldTrim = new THREE.Mesh(
      new THREE.BoxGeometry(1.36, 2.34, 0.04),
      mirrorBrassTrimMat,
    );
    goldTrim.position.set(0.74, 1.24, 0.045);
    const reflectiveGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.22, 2.18),
      mirrorSurfaceMat,
    );
    reflectiveGlass.position.set(0.74, 1.24, 0.072);
    const crestArch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.56, 0.08, 8, 1, false, 0, Math.PI),
      mirrorBrassTrimMat,
    );
    crestArch.rotation.z = Math.PI / 2;
    crestArch.rotation.y = Math.PI / 2;
    crestArch.scale.set(0.25, 1.0, 0.65);
    crestArch.position.set(0.74, 2.52, 0.03);
    mirrorDoorPivot.add(ornateBack, goldTrim, reflectiveGlass, crestArch);
    gMirrorSpot.add(mirrorDoorPivot);

    hidingSpots.push({
      id: 'hide_f3_2_mirror_frame',
      nameHi: 'विशाल शाही आईने के पीछे (Behind Giant Ornate Mirror Frame)',
      nameEn: 'Behind Giant Ornate Mirror Frame',
      roomNameHi: 'आईना महल (3F-2)',
      group: gMirrorSpot,
      doorPivot: mirrorDoorPivot,
      animType: 'door_y',
      position: new THREE.Vector3(30.6, 10.0, 6.2),
      hideViewPos: new THREE.Vector3(30.0, 10.0, 6.2),
      exitPos: new THREE.Vector3(28.3, 10.0, 6.2),
      floorY: 10.0,
      lookYaw: Math.PI / 2,
      isOccupied: false,
      openPulse: 0,
    });
  }

  // F3-3 (Attic Store 1, x: -32..-16, z: -46..-27.5): Large Vintage Trunk (-29.6, 10.0, -37.5)
  createSandookSpot(
    'hide_f3_3_vintage_trunk',
    'अटारी का बड़ा पुराना संदूक (Large Vintage Trunk)',
    'Large Vintage Trunk',
    'अटारी भंडार १ (3F-3)',
    -29.6,
    10.0,
    -37.5,
    Math.PI / 2,
    new THREE.Vector3(-28.95, 10.0, -37.5),
    new THREE.Vector3(-27.4, 10.0, -37.5),
    -Math.PI / 2,
  );

  // F3-4 (Barsati Terrace Room, x: 16..32, z: -46..-27.5): Stone Pillar Pavilion Alcove (30.8, 10.0, -36.75)
  {
    const pavilionGroup = new THREE.Group();
    pavilionGroup.name = 'HidingSpot_hide_f3_4_pavilion_alcove';
    pavilionGroup.position.set(30.8, 10.0, -36.75);
    pavilionGroup.rotation.y = -Math.PI / 2;
    root.add(pavilionGroup);

    const pavArch = buildRajasthaniCuspedArch(2.3, 2.9, 0.58, carvedSandstoneMat);
    pavilionGroup.add(pavArch);

    // Stone pavilion front pillars & recessed sandstone alcove walls
    [-1.08, 1.08].forEach((px) => {
      const colPed = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.32, 0.42),
        carvedSandstoneMat,
      );
      colPed.position.set(px, 0.16, 0.24);
      const colShaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.17, 2.45, 8),
        carvedSandstoneMat,
      );
      colShaft.position.set(px, 1.54, 0.24);
      const sideStone = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 2.8, 1.1),
        carvedSandstoneMat,
      );
      sideStone.position.set(px, 1.4, -0.32);
      pavilionGroup.add(colPed, colShaft, sideStone);
    });
    const domeCapopy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.25, 0.45, 8),
      carvedSandstoneMat,
    );
    domeCapopy.position.set(0, 3.08, 0.08);
    const backVoid = new THREE.Mesh(
      new THREE.BoxGeometry(1.88, 2.65, 0.1),
      darkHollowMat,
    );
    backVoid.position.set(0, 1.32, -0.38);
    pavilionGroup.add(domeCapopy, backVoid);

    const pavCurtainPivot = new THREE.Group();
    pavCurtainPivot.position.set(0, 2.52, 0.22);
    const lCurt = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.4, 0.05), silkVelvetMat);
    lCurt.position.set(-0.48, -1.2, 0);
    const rCurt = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.4, 0.05), silkVelvetMat);
    rCurt.position.set(0.48, -1.2, 0);
    pavCurtainPivot.add(lCurt, rCurt);
    pavilionGroup.add(pavCurtainPivot);

    hidingSpots.push({
      id: 'hide_f3_4_pavilion_alcove',
      nameHi: 'पत्थर स्तंभ बरसाती मंडप कोना (Stone Pillar Pavilion Alcove)',
      nameEn: 'Stone Pillar Pavilion Alcove',
      roomNameHi: 'बरसाती छत मंडप कक्ष (3F-4)',
      group: pavilionGroup,
      doorPivot: pavCurtainPivot,
      animType: 'curtain_scale',
      position: new THREE.Vector3(30.8, 10.0, -36.75),
      hideViewPos: new THREE.Vector3(30.2, 10.0, -36.75),
      exitPos: new THREE.Vector3(28.5, 10.0, -36.75),
      floorY: 10.0,
      lookYaw: Math.PI / 2,
      isOccupied: false,
      openPulse: 0,
    });
  }

  // F3-5 (Jyotish / Astrology Room, x: -32..-16, z: -27.5..-8.5): Celestial Scroll Cabinet (-30.8, 10.0, -18.0)
  createWallNicheSpot(
    'hide_f3_5_jyotish_cabinet',
    'ज्योतिष पांडुलिपि अलमारी (Astrology Scroll Cabinet)',
    'Astrology Scroll Cabinet',
    'ज्योतिष एवं नक्षत्र कक्ष (3F-5)',
    -30.8,
    10.0,
    -18.0,
    Math.PI / 2,
    'wood_almirah',
    new THREE.Vector3(-30.2, 10.0, -18.0),
    new THREE.Vector3(-28.6, 10.0, -18.0),
    -Math.PI / 2,
  );

  // F3-6 (Old Doll / Toy Room, x: 16..32, z: -27.5..-8.5): Antique Painted Toy Chest (29.6, 10.0, -18.0)
  createSandookSpot(
    'hide_f3_6_toy_chest',
    'पुरानी गुड़ियों का विशाल संदूक (Antique Toy Chest)',
    'Antique Toy Chest',
    'पुरानी गुड़िया और खिलौना कक्ष (3F-6)',
    29.6,
    10.0,
    -18.0,
    -Math.PI / 2,
    new THREE.Vector3(28.95, 10.0, -18.0),
    new THREE.Vector3(27.4, 10.0, -18.0),
    Math.PI / 2,
  );

  // F3-7 (Attic Store 2, x: -16..0, z: 5.8..10.0): Dusty Heirloom Brass Trunk (-14.2, 10.0, 8.2)
  createSandookSpot(
    'hide_f3_7_attic2_trunk',
    'धूल भरा शाही बक्सा (Dusty Heirloom Trunk)',
    'Dusty Heirloom Trunk',
    'अटारी भंडार २ (3F-7)',
    -14.2,
    10.0,
    8.2,
    Math.PI / 2,
    new THREE.Vector3(-13.55, 10.0, 8.2),
    new THREE.Vector3(-12.0, 10.0, 8.2),
    -Math.PI / 2,
  );

  // F3-8 (Front Watchtower Room, x: 0..16, z: 5.8..10.0): Stone Guard Watchtower Niche (14.6, 10.0, 8.2)
  createWallNicheSpot(
    'hide_f3_8_watchtower_niche',
    'बुर्ज प्रहरी पत्थर झरोखा (Watchtower Guard Niche)',
    'Watchtower Guard Niche',
    'अग्र बुर्ज प्रहरी कक्ष (3F-8)',
    14.6,
    10.0,
    8.2,
    -Math.PI / 2,
    'stone_door',
    new THREE.Vector3(14.0, 10.0, 8.2),
    new THREE.Vector3(12.4, 10.0, 8.2),
    Math.PI / 2,
  );

  // --- UNDERGROUND 10-ROOM LABYRINTH PROPS, CORRIDOR ARCHES, COBWEBS, DEAD-ENDS & RETURN STAIRS BEACON ---
  // Shifted cleanly by ΔZ = -12.0m to match the expanded 64m x 56m palace north wall & basement labyrinth
  const basementPropsGroup = new THREE.Group();
  basementPropsGroup.name = 'BasementLabyrinthPropsShifted';
  basementPropsGroup.position.set(0, 0, -12.0);
  root.add(basementPropsGroup);

  buildBasementLabyrinthProps({
    root: basementPropsGroup,
    stoneFloorMat,
    carvedSandstoneMat,
    woodMat,
    ironMat,
    brassMat,
    copperMat,
    dripParticles,
    disableExtraLights,
  });

  // (Room U7 obstructing central cylinder shaft & collider removed so U7 is completely open & cleanly navigable)

  // ==========================================================================
  // 5. ORNATE CURSED STONE WELL / HAVAN KUND IN MASSIVE 36m x 30m BACK COURTYARD (0, 0, -61.0)
  //    Carved mossy cracked brickwork, rusted iron pulley & hanging chains,
  //    glowing bed of coals, realistic GLSL rising/flickering fire flames,
  //    floating hot embers, and swirling dark cursed mist (ZERO geometric orange balls!).
  // ==========================================================================
  const wellGroup = new THREE.Group();
  wellGroup.name = 'OrnateCursedWell';
  wellGroup.position.set(0, 0, -61.0);
  root.add(wellGroup);

  // Procedural weathered mossy cracked stone-brick CanvasTexture + BumpMap
  const createMossyWellStoneTexture = (): THREE.CanvasTexture => {
    const w = 512;
    const h = 256;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#26211c';
    ctx.fillRect(0, 0, w, h);

    const rows = 8;
    const rowH = h / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      const cols = 8;
      const colW = w / cols;
      const offset = (r % 2) * (colW * 0.5);
      for (let col = -1; col <= cols; col++) {
        const x = col * colW + offset;
        const hash = Math.sin(r * 17.3 + col * 31.7) * 43758.5453;
        const rnd = hash - Math.floor(hash);
        const shade = Math.floor(48 + rnd * 34);
        const warm = Math.floor(shade * 0.88);
        const cool = Math.floor(shade * 0.72);
        ctx.fillStyle = `rgb(${shade}, ${warm}, ${cool})`;
        ctx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);

        // Chipped weathered stone highlight on upper brick edge
        ctx.fillStyle = `rgba(175, 152, 126, ${0.1 + rnd * 0.12})`;
        ctx.fillRect(x + 3, y + 2, colW - 6, 3);

        // Dark mortar recess & weathered crack lines
        ctx.strokeStyle = 'rgba(12, 10, 9, 0.78)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, colW - 2, rowH - 2);
        if (rnd > 0.58) {
          ctx.strokeStyle = 'rgba(10, 8, 8, 0.65)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x + colW * 0.25, y + 3);
          ctx.lineTo(x + colW * 0.48, y + rowH * 0.55);
          ctx.lineTo(x + colW * 0.68, y + rowH - 3);
          ctx.stroke();
        }
      }
    }

    // Damp mossy olive-green overgrowth clinging to lower bricks & mortar seams
    for (let i = 0; i < 65; i++) {
      const mx = ((i * 83) % w);
      const my = h * 0.42 + ((i * 59) % (h * 0.58));
      const mr = 10 + (i % 5) * 6;
      const mg = ctx.createRadialGradient(mx, my, 1, mx, my, mr);
      mg.addColorStop(0, 'rgba(34, 58, 28, 0.72)');
      mg.addColorStop(0.55, 'rgba(26, 46, 22, 0.36)');
      mg.addColorStop(1, 'rgba(20, 34, 18, 0)');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Soot & fire-blackening along the top coping rim
    const sootGrad = ctx.createLinearGradient(0, 0, 0, h * 0.4);
    sootGrad.addColorStop(0, 'rgba(12, 8, 7, 0.72)');
    sootGrad.addColorStop(1, 'rgba(12, 8, 7, 0)');
    ctx.fillStyle = sootGrad;
    ctx.fillRect(0, 0, w, h * 0.4);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 1);
    return tex;
  };

  // Procedural glowing cracked burning coal bed CanvasTexture
  const createGlowingCoalBedTexture = (): {
    map: THREE.CanvasTexture;
    emissiveMap: THREE.CanvasTexture;
  } => {
    const size = 256;
    const cMap = document.createElement('canvas');
    cMap.width = size;
    cMap.height = size;
    const ctxM = cMap.getContext('2d')!;

    const cEm = document.createElement('canvas');
    cEm.width = size;
    cEm.height = size;
    const ctxE = cEm.getContext('2d')!;

    // Deep charred bed base with hot glowing center
    const coreGrad = ctxE.createRadialGradient(
      size / 2,
      size / 2,
      8,
      size / 2,
      size / 2,
      size * 0.49,
    );
    coreGrad.addColorStop(0, '#fff2a6');
    coreGrad.addColorStop(0.28, '#ff7315');
    coreGrad.addColorStop(0.65, '#c22208');
    coreGrad.addColorStop(0.92, '#3a0802');
    coreGrad.addColorStop(1, '#080302');
    ctxE.fillStyle = coreGrad;
    ctxE.fillRect(0, 0, size, size);

    ctxM.fillStyle = '#180c08';
    ctxM.fillRect(0, 0, size, size);

    // Scatter dark irregular charcoal lumps so glowing molten cracks shine between them
    for (let i = 0; i < 150; i++) {
      const a = i * 2.39996;
      const r = Math.sqrt(i / 150) * (size * 0.46);
      const cx = size / 2 + Math.cos(a) * r;
      const cy = size / 2 + Math.sin(a) * r;
      const rx = 5 + (i % 5) * 2.4;
      const ry = 4 + ((i * 3) % 4) * 2.1;
      const rot = (i * 0.7) % Math.PI;

      // Dark coal surface
      ctxM.save();
      ctxM.translate(cx, cy);
      ctxM.rotate(rot);
      ctxM.fillStyle = i % 4 === 0 ? '#2b1610' : '#140c0a';
      ctxM.beginPath();
      ctxM.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctxM.fill();
      ctxM.restore();

      // Occlude emissive glow across coal tops while leaving hot fiery seams around edges
      ctxE.save();
      ctxE.translate(cx, cy);
      ctxE.rotate(rot);
      const heatAlpha = Math.max(0.42, 0.92 - (1 - r / (size * 0.48)) * 0.35);
      ctxE.fillStyle = `rgba(12, 4, 2, ${heatAlpha})`;
      ctxE.beginPath();
      ctxE.ellipse(0, 0, rx * 0.78, ry * 0.78, 0, 0, Math.PI * 2);
      ctxE.fill();
      ctxE.restore();
    }

    const map = new THREE.CanvasTexture(cMap);
    map.colorSpace = THREE.SRGBColorSpace;
    const emissiveMap = new THREE.CanvasTexture(cEm);
    emissiveMap.colorSpace = THREE.SRGBColorSpace;
    return { map, emissiveMap };
  };

  const mossyWellStoneTex = createMossyWellStoneTexture();
  const mossyWellStoneMat = new THREE.MeshStandardMaterial({
    map: mossyWellStoneTex,
    bumpMap: mossyWellStoneTex,
    bumpScale: 0.085,
    roughness: 0.93,
    metalness: 0.05,
  });
  const rustedChainIronMat = new THREE.MeshStandardMaterial({
    color: 0x3b261d,
    roughness: 0.76,
    metalness: 0.72,
  });
  const charredWellWoodMat = new THREE.MeshStandardMaterial({
    color: 0x261a14,
    roughness: 0.92,
    metalness: 0.08,
  });

  // Stepped circular stone dais & mossy flagstone apron around the Cursed Well
  const wellApron = new THREE.Mesh(
    new THREE.CylinderGeometry(3.45, 3.65, 0.14, 16),
    mossyWellStoneMat,
  );
  wellApron.position.y = 0.07;
  wellApron.receiveShadow = true;
  wellGroup.add(wellApron);

  const wellPlinth = new THREE.Mesh(
    new THREE.CylinderGeometry(2.68, 2.86, 0.28, 16),
    carvedSandstoneMat,
  );
  wellPlinth.position.y = 0.24;
  wellPlinth.castShadow = true;
  wellPlinth.receiveShadow = true;
  wellGroup.add(wellPlinth);

  // Main weathered mossy stone masonry drum (outer wall)
  const wellOuterWall = new THREE.Mesh(
    new THREE.CylinderGeometry(2.38, 2.52, 1.18, 32, 1, true),
    mossyWellStoneMat,
  );
  wellOuterWall.position.y = 0.76;
  wellOuterWall.castShadow = true;
  wellOuterWall.receiveShadow = true;
  wellGroup.add(wellOuterWall);

  // 12 Sculpted protruding weathered stone quoins/buttress ribs + ancient carvings around drum
  const quoinGeo = new THREE.BoxGeometry(0.32, 1.16, 0.26);
  for (let qi = 0; qi < 12; qi++) {
    const a = (qi / 12) * Math.PI * 2;
    const quoin = new THREE.Mesh(quoinGeo, carvedSandstoneMat);
    quoin.position.set(Math.cos(a) * 2.44, 0.76, Math.sin(a) * 2.44);
    quoin.rotation.y = -a + Math.PI / 2;
    quoin.castShadow = true;
    quoin.receiveShadow = true;
    wellGroup.add(quoin);
  }

  // Soot-charred interior stone lining strictly above the burning coal bed (y = 0.42..1.36)
  // so it NEVER protrudes below ground into the underground basement rooms!
  const wellInnerWall = new THREE.Mesh(
    new THREE.CylinderGeometry(1.88, 1.88, 0.94, 28, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x0b0708,
      roughness: 0.96,
      side: THREE.BackSide,
    }),
  );
  wellInnerWall.position.y = 0.89;
  wellGroup.add(wellInnerWall);

  // Thick carved sandstone coping lip & segmented weathered rim blocks
  const wellLip = new THREE.Mesh(
    new THREE.TorusGeometry(2.14, 0.29, 12, 32),
    mossyWellStoneMat,
  );
  wellLip.rotation.x = Math.PI / 2;
  wellLip.position.y = 1.32;
  wellLip.castShadow = true;
  wellLip.receiveShadow = true;
  wellGroup.add(wellLip);

  const wellRimCapGeo = new THREE.BoxGeometry(0.84, 0.16, 0.62);
  for (let ri = 0; ri < 16; ri++) {
    const a = (ri / 16) * Math.PI * 2;
    const capBlock = new THREE.Mesh(wellRimCapGeo, carvedSandstoneMat);
    capBlock.position.set(
      Math.cos(a) * 2.15,
      1.36 + ((ri % 3) - 1) * 0.012,
      Math.sin(a) * 2.15,
    );
    capBlock.rotation.y = -a + Math.PI / 2;
    capBlock.rotation.z = ((ri % 5) - 2) * 0.014;
    capBlock.castShadow = true;
    capBlock.receiveShadow = true;
    wellGroup.add(capBlock);
  }

  // Twin Carved Stone & Iron Pulley Piers + Charred Timber Crossbeam & Gable Frame
  [-2.24, 2.24].forEach((px) => {
    const pier = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 3.45, 0.42),
      mossyWellStoneMat,
    );
    pier.position.set(px, 1.78, 0);
    pier.castShadow = true;
    pier.receiveShadow = true;
    wellGroup.add(pier);

    // Corbel cap & rusted iron reinforcement collars
    const pierCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.2, 0.54),
      carvedSandstoneMat,
    );
    pierCap.position.set(px, 3.55, 0);
    wellGroup.add(pierCap);

    [1.6, 2.95].forEach((bandY) => {
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.09, 0.46),
        rustedChainIronMat,
      );
      band.position.set(px, bandY, 0);
      wellGroup.add(band);
    });
  });

  const crossbeam = new THREE.Mesh(
    new THREE.BoxGeometry(5.25, 0.26, 0.28),
    charredWellWoodMat,
  );
  crossbeam.position.set(0, 3.66, 0);
  crossbeam.castShadow = true;
  wellGroup.add(crossbeam);

  // Sloped weathered timber canopy eaves capping the pulley beam
  [-0.58, 0.58].forEach((rz) => {
    const eave = new THREE.Mesh(
      new THREE.BoxGeometry(5.45, 0.1, 0.88),
      charredWellWoodMat,
    );
    eave.position.set(0, 4.02, rz * 0.62);
    eave.rotation.x = rz > 0 ? 0.38 : -0.38;
    eave.castShadow = true;
    wellGroup.add(eave);
  });

  // Rusted Iron Spoked Pulley Wheel mounted beneath the crossbeam
  const pulleyGroup = new THREE.Group();
  pulleyGroup.position.set(0, 3.24, 0);
  const pulleyYoke = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.42, 0.34),
    rustedChainIronMat,
  );
  pulleyYoke.position.y = 0.22;
  pulleyGroup.add(pulleyYoke);

  const pulleyWheel = new THREE.Group();
  const pulleyRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.048, 10, 24),
    rustedChainIronMat,
  );
  const pulleyHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.075, 0.18, 12),
    rustedChainIronMat,
  );
  pulleyHub.rotation.x = Math.PI / 2;
  pulleyWheel.add(pulleyRim, pulleyHub);
  for (let si = 0; si < 6; si++) {
    const spoke = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6),
      rustedChainIronMat,
    );
    spoke.rotation.z = (si / 6) * Math.PI;
    pulleyWheel.add(spoke);
  }
  pulleyGroup.add(pulleyWheel);
  wellGroup.add(pulleyGroup);

  // Interlocking Rusted Iron Pulley Chains (main hanging chain + slack side chain) + Charred Iron Bucket
  const chainLinkGeo = new THREE.TorusGeometry(0.042, 0.013, 6, 12);
  const hangingChainGroup = new THREE.Group();
  hangingChainGroup.position.set(0, 3.18, 0);
  for (let li = 0; li < 18; li++) {
    const link = new THREE.Mesh(chainLinkGeo, rustedChainIronMat);
    link.position.y = -li * 0.068;
    link.rotation.y = (li % 2) * (Math.PI / 2);
    hangingChainGroup.add(link);
  }
  // Dented charred iron bucket suspended above the raging well fire
  const wellBucket = new THREE.Group();
  wellBucket.position.set(0, -1.32, 0);
  wellBucket.rotation.z = 0.14;
  const bucketBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.18, 0.34, 14, 1, true),
    rustedChainIronMat,
  );
  const bucketBottom = new THREE.Mesh(
    new THREE.CircleGeometry(0.18, 14),
    rustedChainIronMat,
  );
  bucketBottom.rotation.x = -Math.PI / 2;
  bucketBottom.position.y = -0.17;
  const bucketBail = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.014, 6, 16, Math.PI),
    rustedChainIronMat,
  );
  bucketBail.position.y = 0.14;
  wellBucket.add(bucketBody, bucketBottom, bucketBail);
  hangingChainGroup.add(wellBucket);
  wellGroup.add(hangingChainGroup);

  // Second draped rusted iron chain running from pulley to east stone pier hook
  for (let ci = 0; ci < 22; ci++) {
    const t = ci / 21;
    const cx = THREE.MathUtils.lerp(0.28, 2.02, t);
    const cy = THREE.MathUtils.lerp(3.22, 1.95, t) - Math.sin(t * Math.PI) * 0.42;
    const link = new THREE.Mesh(chainLinkGeo, rustedChainIronMat);
    link.position.set(cx, cy, 0.04);
    link.rotation.y = (ci % 2) * (Math.PI / 2);
    link.rotation.z = 0.52;
    wellGroup.add(link);
  }

  // --- GLOWING BURNING COAL BED INSIDE THE WELL PIT (y = 0.48) ---
  const coalTextures = createGlowingCoalBedTexture();
  const wellCoalBedMat = new THREE.MeshStandardMaterial({
    map: coalTextures.map,
    emissive: new THREE.Color(0xff5212),
    emissiveMap: coalTextures.emissiveMap,
    emissiveIntensity: 2.35,
    roughness: 0.92,
    metalness: 0.05,
  });
  const wellCoalBed = new THREE.Mesh(
    new THREE.CircleGeometry(1.86, 28),
    wellCoalBedMat,
  );
  wellCoalBed.rotation.x = -Math.PI / 2;
  wellCoalBed.position.y = 0.48;
  wellGroup.add(wellCoalBed);

  // Clustered jagged glowing charcoal chunks piled at the heart of the pit
  const glowingCoalChunkMat = new THREE.MeshStandardMaterial({
    color: 0x1a0b08,
    emissive: 0xff3b08,
    emissiveIntensity: 1.55,
    roughness: 0.94,
  });
  const coalChunkGeo = new THREE.BoxGeometry(0.32, 0.16, 0.26);
  for (let ki = 0; ki < 14; ki++) {
    const a = ki * 2.39996;
    const r = (ki / 14) * 1.18;
    const chunk = new THREE.Mesh(coalChunkGeo, glowingCoalChunkMat);
    chunk.position.set(
      Math.cos(a) * r,
      0.52 + (1 - r / 1.4) * 0.14,
      Math.sin(a) * r,
    );
    chunk.rotation.set(
      (ki % 3) * 0.25,
      a * 1.4,
      ((ki + 1) % 3) * 0.22,
    );
    chunk.scale.set(
      0.7 + (ki % 4) * 0.22,
      0.65 + (ki % 3) * 0.25,
      0.75 + ((ki + 2) % 4) * 0.2,
    );
    wellGroup.add(chunk);
  }

  // --- REALISTIC RISING, FLICKERING ANIMATED FIRE FLAMES (CUSTOM GLSL MULTI-SHEET VOLUMETRIC SHADER) ---
  const wellFireUniforms = {
    uTime: { value: 0 },
    uIntensity: { value: 1.0 },
  };

  const wellFireMat = new THREE.ShaderMaterial({
    uniforms: wellFireUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vSeed;
      attribute float aSeed;
      uniform float uTime;

      void main() {
        vUv = uv;
        vSeed = aSeed;
        vec3 pos = position;
        // Organic wind-flicker & curling sway near flame tips
        float tipFactor = pow(uv.y, 1.65);
        pos.x += sin(uTime * 4.4 + uv.y * 5.2 + aSeed * 11.3) * 0.16 * tipFactor;
        pos.z += cos(uTime * 3.8 + uv.y * 4.7 + aSeed * 7.9) * 0.14 * tipFactor;
        // Vertical breath pulse
        pos.y *= 0.92 + 0.14 * sin(uTime * 5.5 + aSeed * 6.28);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying float vSeed;
      uniform float uTime;
      uniform float uIntensity;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 4; i++) {
          v += amp * noise(p);
          p = p * 2.08 + vec2(13.7, 7.3);
          amp *= 0.5;
        }
        return v;
      }

      void main() {
        // Horizontal center distance (0 at spine, 1 at left/right edge)
        float dx = abs(vUv.x - 0.5) * 2.0;
        float y = vUv.y;

        // Rising turbulent distortion scrolling rapidly upward
        vec2 flowUv = vec2(vUv.x * 3.2 + vSeed * 5.7, y * 2.8 - uTime * 2.45);
        float n1 = fbm(flowUv);
        float n2 = fbm(vec2(vUv.x * 6.0 - vSeed * 3.1, y * 5.2 - uTime * 3.8));
        float turb = n1 * 0.68 + n2 * 0.32;

        // Natural teardrop-to-licking-tongues fire silhouette (wide at coals, tapered & split at tips)
        float sway = (turb - 0.5) * 0.58 * pow(y, 0.85);
        float distFromCenter = abs((vUv.x - 0.5) * 2.0 + sway);
        float widthProfile = mix(0.92, 0.06, pow(y, 0.78));
        float shape = smoothstep(widthProfile, widthProfile * 0.18, distFromCenter);

        // Wispy licking flame tongues cut by rising noise
        float licks = smoothstep(0.18 + y * 0.52, 0.72 + y * 0.18, turb + (1.0 - y) * 0.48);
        float bottomFade = smoothstep(0.0, 0.14, y);
        float topFade = 1.0 - smoothstep(0.66, 1.0, y);
        float edgeGuard = 1.0 - smoothstep(0.74, 1.0, dx);

        float alpha = shape * licks * bottomFade * topFade * edgeGuard;
        if (alpha < 0.015) discard;

        // Authentic blackbody fire temperature gradient: white-gold base -> bright orange body -> crimson tips
        float heat = clamp((1.0 - y * 0.85) * 0.7 + turb * 0.45 - distFromCenter * 0.32, 0.0, 1.0);
        vec3 deepRed = vec3(0.78, 0.09, 0.02);
        vec3 vividOrange = vec3(1.0, 0.42, 0.04);
        vec3 goldenYellow = vec3(1.0, 0.86, 0.32);
        vec3 whiteHot = vec3(1.0, 0.98, 0.82);

        vec3 col = mix(deepRed, vividOrange, smoothstep(0.12, 0.48, heat));
        col = mix(col, goldenYellow, smoothstep(0.46, 0.78, heat));
        col = mix(col, whiteHot, smoothstep(0.76, 0.98, heat));

        gl_FragColor = vec4(col * (1.05 * uIntensity), clamp(alpha * 0.88 * uIntensity, 0.0, 0.96));
      }
    `,
  });

  // Build 18 radially arranged & offset crossing flame sheets inside the well mouth
  for (let fi = 0; fi < 18; fi++) {
    const isCore = fi < 6;
    const flameW = isCore ? 1.55 + (fi % 3) * 0.22 : 1.12 + (fi % 4) * 0.18;
    const flameH = isCore ? 2.15 + (fi % 3) * 0.28 : 1.52 + (fi % 4) * 0.24;
    const fGeo = new THREE.PlaneGeometry(flameW, flameH, 4, 8);
    // Shift origin to bottom edge of flame sheet
    fGeo.translate(0, flameH * 0.5, 0);
    const seedArr = new Float32Array(fGeo.attributes.position.count).fill(
      (fi + 1) * 0.371,
    );
    fGeo.setAttribute('aSeed', new THREE.BufferAttribute(seedArr, 1));

    const flameSheet = new THREE.Mesh(fGeo, wellFireMat);
    const angle = (fi / (isCore ? 6 : 12)) * Math.PI * 2 + (isCore ? 0 : 0.27);
    const rad = isCore ? 0.14 + (fi % 2) * 0.18 : 0.56 + (fi % 3) * 0.22;
    flameSheet.position.set(
      Math.cos(angle) * rad,
      0.46,
      Math.sin(angle) * rad,
    );
    flameSheet.rotation.y = angle + (isCore ? Math.PI * 0.18 : Math.PI * 0.42);
    wellGroup.add(flameSheet);
  }

  // --- FLOATING HOT EMBERS & GLOWING SPARKS (160 GPU-ANIMATED PARTICLES) ---
  const WELL_EMBER_COUNT = 160;
  const emberOrigin = new Float32Array(WELL_EMBER_COUNT * 3);
  const emberPhase = new Float32Array(WELL_EMBER_COUNT);
  const emberSpeed = new Float32Array(WELL_EMBER_COUNT);
  const emberSize = new Float32Array(WELL_EMBER_COUNT);
  for (let ei = 0; ei < WELL_EMBER_COUNT; ei++) {
    const a = ei * 2.39996;
    const r = Math.sqrt(((ei * 37) % 100) / 100) * 1.48;
    emberOrigin[ei * 3 + 0] = Math.cos(a) * r;
    emberOrigin[ei * 3 + 1] = 0.58;
    emberOrigin[ei * 3 + 2] = Math.sin(a) * r;
    emberPhase[ei] = (ei * 0.6180339) % 1.0;
    emberSpeed[ei] = 0.24 + (ei % 7) * 0.045;
    emberSize[ei] = 0.75 + (ei % 5) * 0.34;
  }
  const wellEmberGeo = new THREE.BufferGeometry();
  wellEmberGeo.setAttribute('position', new THREE.BufferAttribute(emberOrigin, 3));
  wellEmberGeo.setAttribute('aPhase', new THREE.BufferAttribute(emberPhase, 1));
  wellEmberGeo.setAttribute('aSpeed', new THREE.BufferAttribute(emberSpeed, 1));
  wellEmberGeo.setAttribute('aSize', new THREE.BufferAttribute(emberSize, 1));

  const wellEmberUniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
  };
  const wellEmberMat = new THREE.ShaderMaterial({
    uniforms: wellEmberUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aPhase;
      attribute float aSpeed;
      attribute float aSize;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vLife;
      varying float vSparkle;

      void main() {
        float life = fract(aPhase + uTime * aSpeed);
        vLife = life;
        vSparkle = 0.65 + 0.35 * sin(uTime * 11.0 + aPhase * 42.0);

        // Spiral upward out of the burning well mouth
        float swirlAngle = life * 3.8 + aPhase * 6.28318;
        float driftR = 0.14 + life * 0.55;
        vec3 p = position;
        p.x += cos(swirlAngle) * driftR + sin(uTime * 2.1 + aPhase * 19.0) * 0.18 * life;
        p.z += sin(swirlAngle) * driftR + cos(uTime * 1.9 + aPhase * 13.0) * 0.18 * life;
        p.y += life * 4.85;

        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float ptSize = (24.0 * aSize * (1.0 - life * 0.52)) * uPixelRatio;
        gl_PointSize = clamp(ptSize / max(-mvPosition.z, 0.7), 1.8, 18.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vLife;
      varying float vSparkle;

      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;
        float glow = pow(smoothstep(0.5, 0.04, d), 1.6);
        // Bright yellow-white hot spark at birth -> orange -> deep red cooling ember
        vec3 hotCol = vec3(1.0, 0.92, 0.45);
        vec3 midCol = vec3(1.0, 0.42, 0.06);
        vec3 coolCol = vec3(0.82, 0.12, 0.02);
        vec3 col = mix(hotCol, midCol, smoothstep(0.05, 0.42, vLife));
        col = mix(col, coolCol, smoothstep(0.42, 0.92, vLife));
        float fadeIn = smoothstep(0.0, 0.08, vLife);
        float fadeOut = 1.0 - smoothstep(0.65, 1.0, vLife);
        gl_FragColor = vec4(col, glow * fadeIn * fadeOut * vSparkle * 0.95);
      }
    `,
  });
  const wellEmberPoints = new THREE.Points(wellEmberGeo, wellEmberMat);
  wellEmberPoints.frustumCulled = false;
  wellGroup.add(wellEmberPoints);

  // --- SWIRLING DARK CURSED MIST & SMOKE RISING FROM THE WELL (56 SOFT VOLUMETRIC BILLBOARD PUFFS) ---
  const WELL_MIST_COUNT = 56;
  const mistOrigin = new Float32Array(WELL_MIST_COUNT * 3);
  const mistPhase = new Float32Array(WELL_MIST_COUNT);
  const mistSize = new Float32Array(WELL_MIST_COUNT);
  for (let mi = 0; mi < WELL_MIST_COUNT; mi++) {
    const a = mi * 2.39996;
    const isRimSpill = mi < 22;
    const r = isRimSpill ? 1.55 + (mi % 5) * 0.22 : 0.35 + ((mi * 19) % 100) / 100 * 1.15;
    mistOrigin[mi * 3 + 0] = Math.cos(a) * r;
    mistOrigin[mi * 3 + 1] = isRimSpill ? 1.18 : 1.38;
    mistOrigin[mi * 3 + 2] = Math.sin(a) * r;
    mistPhase[mi] = (mi / WELL_MIST_COUNT);
    mistSize[mi] = isRimSpill ? 1.25 + (mi % 4) * 0.28 : 1.15 + (mi % 5) * 0.32;
  }
  const wellMistGeo = new THREE.BufferGeometry();
  wellMistGeo.setAttribute('position', new THREE.BufferAttribute(mistOrigin, 3));
  wellMistGeo.setAttribute('aPhase', new THREE.BufferAttribute(mistPhase, 1));
  wellMistGeo.setAttribute('aSize', new THREE.BufferAttribute(mistSize, 1));

  const wellMistUniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
  };
  const wellMistMat = new THREE.ShaderMaterial({
    uniforms: wellMistUniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      attribute float aPhase;
      attribute float aSize;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vLife;
      varying float vSeed;

      void main() {
        float life = fract(aPhase + uTime * 0.135);
        vLife = life;
        vSeed = aPhase * 12.0;

        float theta = uTime * 0.55 + aPhase * 6.28318 + life * 2.4;
        float expand = 0.25 + life * 1.35;
        vec3 p = position;
        p.x += cos(theta) * expand * 0.45;
        p.z += sin(theta) * expand * 0.45;
        p.y += life * 3.65;

        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float ptSize = (185.0 * aSize * (0.65 + life * 0.95)) * uPixelRatio;
        gl_PointSize = clamp(ptSize / max(-mvPosition.z, 1.2), 10.0, 145.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vLife;
      varying float vSeed;

      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d = length(uv);
        if (d > 0.5) discard;
        // Soft wispy smoky puff with organic density wobble
        float angle = atan(uv.y, uv.x);
        float wisp = 0.88 + 0.12 * sin(angle * 3.0 + vSeed);
        float soft = pow(smoothstep(0.5 * wisp, 0.04, d), 2.1);
        float fadeIn = smoothstep(0.0, 0.18, vLife);
        float fadeOut = 1.0 - smoothstep(0.48, 1.0, vLife);
        // Dark charcoal-indigo cursed smoke faintly underlit by the fire near the base
        vec3 fireUnderlit = vec3(0.24, 0.08, 0.07);
        vec3 darkMist = vec3(0.07, 0.05, 0.09);
        vec3 col = mix(fireUnderlit, darkMist, smoothstep(0.05, 0.48, vLife));
        gl_FragColor = vec4(col, soft * fadeIn * fadeOut * 0.34);
      }
    `,
  });
  const wellMistPoints = new THREE.Points(wellMistGeo, wellMistMat);
  wellMistPoints.frustumCulled = false;
  wellGroup.add(wellMistPoints);

  // Preserve interface fields as empty arrays (all flames & mist are now driven by GPU shaders above)
  const wellInnerFlames: THREE.Mesh[] = [];
  const wellSmokeParticles: THREE.Mesh[] = [];

  let wellFireLight: THREE.PointLight | null = null;
  if (!disableExtraLights) {
    wellFireLight = new THREE.PointLight(0xff5e1a, 3.4, 24, 1.45);
    wellFireLight.position.set(0, 2.35, 0);
    wellGroup.add(wellFireLight);
  }

  // Glowing Golden "Well Courtyard Key (कुएं के आंगन की चाबी)" resting visibly on the North stone rim of the Cursed Well
  // Shown whenever the player respawns alone in the Well Courtyard with the back door locked.
  const wellCourtyardKeyGroup = new THREE.Group();
  wellCourtyardKeyGroup.name = 'WellCourtyardEscapeKey';
  const WELL_KEY_BASE_Y = 1.66;
  wellCourtyardKeyGroup.position.set(0.0, WELL_KEY_BASE_Y, -63.42);
  wellCourtyardKeyGroup.visible = false;
  root.add(wellCourtyardKeyGroup);

  const wellKeyGoldMat = new THREE.MeshStandardMaterial({
    color: 0xffd24c,
    emissive: 0xffb700,
    emissiveIntensity: 0.95,
    roughness: 0.2,
    metalness: 0.9,
  });
  const wellKeyGemMat = new THREE.MeshStandardMaterial({
    color: 0xff4422,
    emissive: 0xff5500,
    emissiveIntensity: 0.85,
    roughness: 0.18,
    metalness: 0.25,
  });

  const wkBowOuter = new THREE.Mesh(
    new THREE.TorusGeometry(0.105, 0.024, 12, 24),
    wellKeyGoldMat,
  );
  wkBowOuter.rotation.x = Math.PI / 2;
  wkBowOuter.position.set(0, 0, -0.17);
  wellCourtyardKeyGroup.add(wkBowOuter);

  const wkBowGem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.036, 0),
    wellKeyGemMat,
  );
  wkBowGem.position.set(0, 0.01, -0.17);
  wellCourtyardKeyGroup.add(wkBowGem);

  const wkCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.032, 0.045, 12),
    wellKeyGoldMat,
  );
  wkCollar.rotation.x = Math.PI / 2;
  wkCollar.position.set(0, 0, -0.055);
  wellCourtyardKeyGroup.add(wkCollar);

  const wkShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.019, 0.019, 0.31, 12),
    wellKeyGoldMat,
  );
  wkShaft.rotation.x = Math.PI / 2;
  wkShaft.position.set(0, 0, 0.095);
  wellCourtyardKeyGroup.add(wkShaft);

  const wkBit1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.092, 0.022, 0.042),
    wellKeyGoldMat,
  );
  wkBit1.position.set(0.046, 0, 0.2);
  const wkBit2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.072, 0.022, 0.034),
    wellKeyGoldMat,
  );
  wkBit2.position.set(0.036, 0, 0.135);
  wellCourtyardKeyGroup.add(wkBit1, wkBit2);

  let wkGlowLight: THREE.PointLight | null = null;
  if (!disableExtraLights) {
    wkGlowLight = new THREE.PointLight(0xffcb45, 1.45, 6.2, 1.8);
    wkGlowLight.position.set(0, 0.16, 0);
    wellCourtyardKeyGroup.add(wkGlowLight);
    decorativeDynamicLights.push(wkGlowLight);
  }

  const wellCourtyardKeyGlow = attachProximityGlow({
    group: wellCourtyardKeyGroup,
    targetMaterials: [wellKeyGoldMat, wellKeyGemMat],
    theme: 'key',
    phaseOffset: 1.45,
  });

  // Physical collider for the ornate Cursed Well at (0, 0, -61.0) so players walk around it cleanly
  wallColliders.push({
    minX: -2.62,
    maxX: 2.62,
    minZ: -63.62,
    maxZ: -58.38,
    minY: 0,
    maxY: 2.6,
  });

  // ==========================================================================
  // 5B. MASSIVE FULLY ENCLOSED 36m x 30m WALLED BACK WELL COURTYARD (AANGAN)
  //     Open-air to the stormy sky above; 4 solid 8.8m Haveli walls with zero escape gaps.
  //     x in [-18.0, 18.0], z in [-76.0, -46.0] — South side is Palace North Wall (door_back_well).
  // ==========================================================================
  const WELL_COURT_MIN_X = -18.0;
  const WELL_COURT_MAX_X = 18.0;
  const WELL_COURT_MIN_Z = -76.0;
  const WELL_COURT_MAX_Z = -46.0;
  const WELL_COURT_WALL_H = 8.8;
  const WELL_COURT_WALL_T = 0.72;

  // 3 tall solid weathered-stone walls enclosing West, East, and North sides (South side is z = -46 Palace facade)
  addWallSegment(
    WELL_COURT_MIN_X,
    WELL_COURT_MIN_Z,
    WELL_COURT_MIN_X,
    WELL_COURT_MAX_Z,
    0,
    WELL_COURT_WALL_H,
    WELL_COURT_WALL_T,
    true,
  );
  addWallSegment(
    WELL_COURT_MAX_X,
    WELL_COURT_MIN_Z,
    WELL_COURT_MAX_X,
    WELL_COURT_MAX_Z,
    0,
    WELL_COURT_WALL_H,
    WELL_COURT_WALL_T,
    true,
  );
  addWallSegment(
    WELL_COURT_MIN_X,
    WELL_COURT_MIN_Z,
    WELL_COURT_MAX_X,
    WELL_COURT_MIN_Z,
    0,
    WELL_COURT_WALL_H,
    WELL_COURT_WALL_T,
    true,
  );

  // Strict overlapping AABB colliders on all 4 enclosing courtyard boundaries so players can NEVER escape from the well courtyard
  wallColliders.push(
    // West enclosing wall collider (x = -18.0)
    {
      minX: WELL_COURT_MIN_X - 0.46,
      maxX: WELL_COURT_MIN_X + 0.46,
      minZ: WELL_COURT_MIN_Z - 0.46,
      maxZ: WELL_COURT_MAX_Z + 0.35,
      minY: 0,
      maxY: WELL_COURT_WALL_H + 1.0,
    },
    // East enclosing wall collider (x = +18.0)
    {
      minX: WELL_COURT_MAX_X - 0.46,
      maxX: WELL_COURT_MAX_X + 0.46,
      minZ: WELL_COURT_MIN_Z - 0.46,
      maxZ: WELL_COURT_MAX_Z + 0.35,
      minY: 0,
      maxY: WELL_COURT_WALL_H + 1.0,
    },
    // North back enclosing wall collider (z = -76.0 — solid, zero gate or opening)
    {
      minX: WELL_COURT_MIN_X - 0.46,
      maxX: WELL_COURT_MAX_X + 0.46,
      minZ: WELL_COURT_MIN_Z - 0.46,
      maxZ: WELL_COURT_MIN_Z + 0.46,
      minY: 0,
      maxY: WELL_COURT_WALL_H + 1.0,
    },
    // South flanking seals connecting Palace North Facade cleanly into West/East courtyard corners (leaves only door_back_well x in [-1.65..1.65] open)
    {
      minX: WELL_COURT_MIN_X - 0.46,
      maxX: -1.65,
      minZ: WELL_COURT_MAX_Z - 0.34,
      maxZ: WELL_COURT_MAX_Z + 0.34,
      minY: 0,
      maxY: WELL_COURT_WALL_H + 1.0,
    },
    {
      minX: 1.65,
      maxX: WELL_COURT_MAX_X + 0.46,
      minZ: WELL_COURT_MAX_Z - 0.34,
      maxZ: WELL_COURT_MAX_Z + 0.34,
      minY: 0,
      maxY: WELL_COURT_WALL_H + 1.0,
    },
  );

  // Heavy Rajasthani corner stone bastions / buttress piers sealing all 4 corners seamlessly
  const wellCourtDetailGroup = new THREE.Group();
  wellCourtDetailGroup.name = 'WalledBackWellCourtyardDetails';

  // Flagstone ceremonial stone path connecting door_back_well (z=-46) directly to the Cursed Well (z=-61.0)
  const wellApproachPath = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 0.05, 13.0),
    carvedSandstoneMat,
  );
  wellApproachPath.position.set(0, 0.025, -52.5);
  wellApproachPath.receiveShadow = true;
  wellCourtDetailGroup.add(wellApproachPath);

  // Subtle cross-axis flagstone strips framing the huge 36m x 30m courtyard floor
  const wellCrossPathX = new THREE.Mesh(
    new THREE.BoxGeometry(31.0, 0.04, 3.2),
    carvedSandstoneMat,
  );
  wellCrossPathX.position.set(0, 0.02, -61.0);
  wellCrossPathX.receiveShadow = true;
  const wellNorthPathZ = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.04, 12.2),
    carvedSandstoneMat,
  );
  wellNorthPathZ.position.set(0, 0.02, -69.5);
  wellNorthPathZ.receiveShadow = true;
  wellCourtDetailGroup.add(wellCrossPathX, wellNorthPathZ);

  const bastionGeo = new THREE.BoxGeometry(1.55, WELL_COURT_WALL_H + 0.75, 1.55);
  const bastionCapGeo = new THREE.BoxGeometry(1.82, 0.4, 1.82);
  const bastionFinialGeo = new THREE.ConeGeometry(0.48, 1.1, 6);
  [
    [WELL_COURT_MIN_X, WELL_COURT_MIN_Z],
    [WELL_COURT_MAX_X, WELL_COURT_MIN_Z],
    [WELL_COURT_MIN_X, WELL_COURT_MAX_Z],
    [WELL_COURT_MAX_X, WELL_COURT_MAX_Z],
  ].forEach(([bx, bz]) => {
    const bastion = new THREE.Mesh(bastionGeo, carvedSandstoneMat);
    bastion.position.set(bx, (WELL_COURT_WALL_H + 0.75) * 0.5, bz);
    bastion.castShadow = true;
    bastion.receiveShadow = true;
    wellCourtDetailGroup.add(bastion);

    const cap = new THREE.Mesh(bastionCapGeo, carvedSandstoneMat);
    cap.position.set(bx, WELL_COURT_WALL_H + 0.92, bz);
    wellCourtDetailGroup.add(cap);

    const finial = new THREE.Mesh(bastionFinialGeo, carvedSandstoneMat);
    finial.position.set(bx, WELL_COURT_WALL_H + 1.62, bz);
    wellCourtDetailGroup.add(finial);
  });

  // Kangura battlements / merlons crowning the 8.8m stone parapet walls (West, East & North)
  const merlonGeo = new THREE.BoxGeometry(0.76, 0.68, 0.54);
  for (let mx = WELL_COURT_MIN_X + 1.3; mx <= WELL_COURT_MAX_X - 1.3; mx += 1.45) {
    const m = new THREE.Mesh(merlonGeo, carvedSandstoneMat);
    m.position.set(mx, WELL_COURT_WALL_H + 0.34, WELL_COURT_MIN_Z);
    m.castShadow = true;
    wellCourtDetailGroup.add(m);
  }
  const sideMerlonGeo = new THREE.BoxGeometry(0.54, 0.68, 0.76);
  for (let mz = WELL_COURT_MIN_Z + 1.3; mz <= WELL_COURT_MAX_Z - 1.3; mz += 1.45) {
    const mW = new THREE.Mesh(sideMerlonGeo, carvedSandstoneMat);
    mW.position.set(WELL_COURT_MIN_X, WELL_COURT_WALL_H + 0.34, mz);
    mW.castShadow = true;
    const mE = new THREE.Mesh(sideMerlonGeo, carvedSandstoneMat);
    mE.position.set(WELL_COURT_MAX_X, WELL_COURT_WALL_H + 0.34, mz);
    mE.castShadow = true;
    wellCourtDetailGroup.add(mW, mE);
  }

  // Inner Rajasthani blind-arch arcade (mehrab niches + carved pilasters) lining all 3 massive courtyard walls
  const innerNicheMat = new THREE.MeshStandardMaterial({
    color: 0x1c1512,
    roughness: 0.94,
    metalness: 0.04,
  });
  const addCourtyardInnerArch = (
    cx: number,
    cz: number,
    rotY: number,
  ) => {
    const archGroup = new THREE.Group();
    archGroup.position.set(cx, 0, cz);
    archGroup.rotation.y = rotY;

    // Dark recessed stone niche backing
    const recess = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 3.8, 0.14),
      innerNicheMat,
    );
    recess.position.set(0, 2.15, 0.04);
    archGroup.add(recess);

    // Left & right carved sandstone pilasters
    const pilasterGeo = new THREE.BoxGeometry(0.34, 4.4, 0.36);
    const leftPilaster = new THREE.Mesh(pilasterGeo, carvedSandstoneMat);
    leftPilaster.position.set(-1.3, 2.2, 0.14);
    const rightPilaster = new THREE.Mesh(pilasterGeo, carvedSandstoneMat);
    rightPilaster.position.set(1.3, 2.2, 0.14);
    archGroup.add(leftPilaster, rightPilaster);

    // Pointed cusped arch lintel & sandstone header moulding
    const archHeader = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 0.36, 0.4),
      carvedSandstoneMat,
    );
    archHeader.position.set(0, 4.46, 0.16);
    const archCrown = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.17, 8, 18, Math.PI),
      carvedSandstoneMat,
    );
    archCrown.position.set(0, 3.25, 0.16);
    archGroup.add(archHeader, archCrown);

    // Upper blind gallery frieze band (y = 6.0m)
    const upperBand = new THREE.Mesh(
      new THREE.BoxGeometry(2.85, 0.26, 0.28),
      carvedSandstoneMat,
    );
    upperBand.position.set(0, 6.05, 0.12);
    archGroup.add(upperBand);

    wellCourtDetailGroup.add(archGroup);
  };

  // North inner wall arches (7 arches facing south toward the well)
  [-13.5, -9.0, -4.5, 0.0, 4.5, 9.0, 13.5].forEach((ax) => {
    addCourtyardInnerArch(ax, WELL_COURT_MIN_Z + 0.38, 0);
  });
  // West inner wall arches (6 arches facing east toward the well)
  [-49.5, -54.0, -58.5, -63.0, -67.5, -72.0].forEach((az) => {
    addCourtyardInnerArch(WELL_COURT_MIN_X + 0.38, az, Math.PI / 2);
  });
  // East inner wall arches (6 arches facing west toward the well)
  [-49.5, -54.0, -58.5, -63.0, -67.5, -72.0].forEach((az) => {
    addCourtyardInnerArch(WELL_COURT_MAX_X - 0.38, az, -Math.PI / 2);
  });

  // 4 Weathered Sandstone Pedestal Urns framing the grand 36m x 30m courtyard corners
  const urnBaseGeo = new THREE.BoxGeometry(0.95, 0.72, 0.95);
  const urnBowlGeo = new THREE.CylinderGeometry(0.56, 0.3, 0.62, 12);
  [
    [-12.2, -52.2],
    [12.2, -52.2],
    [-12.2, -69.8],
    [12.2, -69.8],
  ].forEach(([ux, uz]) => {
    const uBase = new THREE.Mesh(urnBaseGeo, mossyWellStoneMat);
    uBase.position.set(ux, 0.36, uz);
    uBase.castShadow = true;
    uBase.receiveShadow = true;
    const uBowl = new THREE.Mesh(urnBowlGeo, carvedSandstoneMat);
    uBowl.position.set(ux, 1.02, uz);
    uBowl.castShadow = true;
    wellCourtDetailGroup.add(uBase, uBowl);
    wallColliders.push({
      minX: ux - 0.55,
      maxX: ux + 0.55,
      minZ: uz - 0.55,
      maxZ: uz + 0.55,
      minY: 0,
      maxY: 1.5,
    });
  });

  root.add(wellCourtDetailGroup);

  // Flickering Wall मशाल Torches mounted along all inner walls of the massive 36m x 30m Back Well Courtyard
  addHangingLantern(-17.35, 3.55, -51.8, 0xff8822, 4.0, 22);
  addHangingLantern(-17.35, 3.55, -61.0, 0xff8822, 4.0, 22);
  addHangingLantern(-17.35, 3.55, -70.2, 0xff8822, 4.0, 22);
  addHangingLantern(17.35, 3.55, -51.8, 0xff8822, 4.0, 22);
  addHangingLantern(17.35, 3.55, -61.0, 0xff8822, 4.0, 22);
  addHangingLantern(17.35, 3.55, -70.2, 0xff8822, 4.0, 22);
  addHangingLantern(-9.0, 3.65, -75.35, 0xff9933, 4.2, 22);
  addHangingLantern(0.0, 3.65, -75.35, 0xff9933, 4.2, 22);
  addHangingLantern(9.0, 3.65, -75.35, 0xff9933, 4.2, 22);
  addHangingLantern(-5.2, 3.35, -46.55, 0xff8822, 4.0, 20);
  addHangingLantern(5.2, 3.35, -46.55, 0xff8822, 4.0, 20);

  // ==========================================================================
  // 6. LIGHTING: FLICKERING WALL मशाल (TORCHES) AT REGULAR INTERVALS
  // ==========================================================================
  // Neat, Properly Mounted Antique Wall Lanterns flanking the Outer Iron Gate (z=34.0), Main Palace Portal & Front Balconies
  addMountedAntiqueWallLantern(-2.35, 3.15, 34.47, 0, 3.8, 18, true);
  addMountedAntiqueWallLantern(2.35, 3.15, 34.47, 0, 3.8, 18, true);
  addMountedAntiqueWallLantern(-2.85, 3.15, 10.22, 0, 4.0, 18, true);
  addMountedAntiqueWallLantern(2.85, 3.15, 10.22, 0, 4.0, 18, true);
  // 2F & 3F Front Balcony Mounted Antique Wall Lanterns
  addMountedAntiqueWallLantern(-4.5, 7.0, 10.22, 0, 2.8, 14, false);
  addMountedAntiqueWallLantern(4.5, 7.0, 10.22, 0, 2.8, 14, false);
  addMountedAntiqueWallLantern(-18.0, 7.0, 10.22, 0, 2.6, 14, false);
  addMountedAntiqueWallLantern(18.0, 7.0, 10.22, 0, 2.6, 14, false);
  addMountedAntiqueWallLantern(-4.5, 12.2, 10.22, 0, 2.6, 14, false);
  addMountedAntiqueWallLantern(4.5, 12.2, 10.22, 0, 2.6, 14, false);

  // West (Left) Exterior Palace Wall Mounted Antique Lanterns (flush on x = -32.22, clear of 360° side path)
  addMountedAntiqueWallLantern(-32.22, 3.0, 2.5, -Math.PI / 2, 3.2, 16, false);
  addMountedAntiqueWallLantern(-32.22, 3.0, -18.0, -Math.PI / 2, 3.2, 16, false);
  addMountedAntiqueWallLantern(-32.22, 3.0, -36.5, -Math.PI / 2, 3.2, 16, false);
  addMountedAntiqueWallLantern(-32.22, 7.2, -18.0, -Math.PI / 2, 2.8, 15, false);

  // East (Right) Exterior Palace Wall Mounted Antique Lanterns (flush on x = +32.22, clear of 360° side path)
  addMountedAntiqueWallLantern(32.22, 3.0, 2.5, Math.PI / 2, 3.2, 16, false);
  addMountedAntiqueWallLantern(32.22, 3.0, -18.0, Math.PI / 2, 3.2, 16, false);
  addMountedAntiqueWallLantern(32.22, 3.0, -36.5, Math.PI / 2, 3.2, 16, false);
  addMountedAntiqueWallLantern(32.22, 7.2, -18.0, Math.PI / 2, 2.8, 15, false);

  // North (Back) Exterior Palace Wall & Outer 36m x 30m Well Courtyard Wall Lanterns (flush-mounted, zero floating torches)
  addMountedAntiqueWallLantern(-25.0, 3.0, -46.22, Math.PI, 3.2, 16, false);
  addMountedAntiqueWallLantern(25.0, 3.0, -46.22, Math.PI, 3.2, 16, false);
  addMountedAntiqueWallLantern(-18.38, 3.1, -61.0, -Math.PI / 2, 3.0, 15, false);
  addMountedAntiqueWallLantern(18.38, 3.1, -61.0, Math.PI / 2, 3.0, 15, false);
  addMountedAntiqueWallLantern(-8.5, 3.1, -76.38, Math.PI, 3.0, 15, false);
  addMountedAntiqueWallLantern(8.5, 3.1, -76.38, Math.PI, 3.0, 15, false);

  // Ground Floor Massive 38m x 31.5m Royal Darbar Atrium, Side Pillars & 6 Side-Wing Rooms (y = 0.0 -> 5.0)
  addHangingLantern(-14.8, 3.4, 5.5, 0xff9933, 4.4, 24);
  addHangingLantern(14.8, 3.4, 5.5, 0xff9933, 4.4, 24);
  addHangingLantern(-14.8, 3.4, -5.3, 0xff9933, 4.4, 24);
  addHangingLantern(14.8, 3.4, -5.3, 0xff9933, 4.4, 24);
  addHangingLantern(-14.8, 3.4, -16.1, 0xff9933, 4.4, 24);
  addHangingLantern(14.8, 3.4, -16.1, 0xff9933, 4.4, 24);
  addHangingLantern(0, 3.6, -36.5, 0xff8822, 4.0, 20);
  addHangingLantern(-24.0, 3.4, 0.75, 0xff9933, 4.2, 20); // G1: Shahi Shastragar
  addHangingLantern(-24.0, 3.4, -18.0, 0xff8822, 4.0, 19); // G2: Purani Rasoi
  addHangingLantern(-24.0, 3.4, -36.75, 0xff9933, 4.0, 19); // G5: Mehmaan Baithak
  addHangingLantern(24.0, 3.4, 0.75, 0xff9933, 4.2, 20); // G3: Munim Room
  addHangingLantern(24.0, 3.4, -18.0, 0xffaa33, 4.2, 20); // G4: Prachin Pooja Ghar
  addHangingLantern(24.0, 3.4, -36.75, 0xff8822, 3.9, 18); // G6: Sevak Kaksh

  // Second Floor Wrap-Around Jharokha Balconies, Double-Wing Landing & 8 Rooms (y = 5.0 -> 10.0)
  addHangingLantern(0, 6.2, -29.0, 0xff9933, 4.2, 20); // Grand Mid-Landing
  addHangingLantern(0, 8.2, 4.5, 0xff9933, 4.0, 19); // 2F South Balcony
  addHangingLantern(-17.0, 8.2, -4.0, 0xff8822, 4.0, 19); // 2F West Balcony
  addHangingLantern(17.0, 8.2, -4.0, 0xff8822, 4.0, 19); // 2F East Balcony
  addHangingLantern(24.0, 8.2, 0.75, 0xff4433, 4.2, 20); // 2F-1: Bridal Room
  addHangingLantern(24.0, 8.2, -18.0, 0xff7744, 4.0, 19); // 2F-5: Rani Shringar Kaksh
  addHangingLantern(24.0, 8.2, -36.75, 0xff7722, 4.0, 19); // 2F-3: Guest Suite 1
  addHangingLantern(-24.0, 8.2, 0.75, 0xff9933, 4.2, 20); // 2F-2: Master Bedroom
  addHangingLantern(-24.0, 8.2, -18.0, 0xff9933, 4.1, 19); // 2F-6: Royal Dining Room
  addHangingLantern(-24.0, 8.2, -36.75, 0xff8822, 4.0, 19); // 2F-4: Sangeet Hall
  addHangingLantern(-8.0, 8.2, 7.9, 0xff8822, 3.8, 17); // 2F-7: Guest Suite 2
  addHangingLantern(8.0, 8.2, 7.9, 0xff9933, 3.8, 17); // 2F-8: Ancestor Portrait Gallery

  // Third Floor Wrap-Around Jharokha Balconies & 8 Rooms (y = 10.0 -> 17.0)
  addHangingLantern(0, 12.0, -38.5, 0xff8822, 4.0, 19); // 2F->3F Staircase
  addHangingLantern(0, 13.6, 4.5, 0xff8822, 4.0, 19); // 3F South Balcony
  addHangingLantern(-17.0, 13.6, -4.0, 0xff8822, 4.0, 19); // 3F West Balcony
  addHangingLantern(17.0, 13.6, -4.0, 0xff8822, 4.0, 19); // 3F East Balcony
  addHangingLantern(-24.0, 13.6, 0.75, 0xff9933, 4.0, 19); // 3F-1: Tantrik Library
  addHangingLantern(-24.0, 13.6, -18.0, 0xff8833, 3.9, 18); // 3F-5: Jyotish Room
  addHangingLantern(-24.0, 13.6, -36.75, 0xff8822, 3.9, 18); // 3F-3: Attic Store 1
  addHangingLantern(24.0, 13.6, 0.75, 0xff7755, 4.0, 19); // 3F-2: Aaina Mahal
  addHangingLantern(24.0, 13.6, -18.0, 0xff7744, 3.9, 18); // 3F-6: Old Doll Room
  addHangingLantern(24.0, 13.6, -36.75, 0xff8822, 3.9, 18); // 3F-4: Barsati Terrace Room
  addHangingLantern(-8.0, 13.6, 7.9, 0xff7722, 3.7, 17); // 3F-7: Attic Store 2
  addHangingLantern(8.0, 13.6, 7.9, 0xff9933, 3.8, 17); // 3F-8: Front Watchtower Room

  // 10-Room Underground Labyrinth Corridors, Dead-Ends, Descending Stairs & Chambers (y = -4.5 -> -0.35, shifted ΔZ = -12.0m)
  addHangingLantern(8.5, -1.6, -38.0, 0xffaa44, 4.0, 18); // Descending Stairs bright amber lantern
  addHangingLantern(8.5, -1.7, -43.2, 0xffbb55, 4.2, 18); // Foot of Stairs Return Lantern
  addHangingLantern(0.0, -1.7, -46.5, 0xff6622, 3.6, 16); // Central Spine
  addHangingLantern(0.0, -1.7, -54.0, 0xff6622, 3.8, 17); // Central Maze Crossroads
  addHangingLantern(-15.0, -1.7, -54.0, 0xff5518, 3.5, 15); // West T-Junction
  addHangingLantern(-15.0, -1.7, -43.2, 0xd93818, 3.0, 12); // Eerie Dead-End #1 dim red-orange torch
  addHangingLantern(15.0, -1.7, -54.0, 0xff5518, 3.5, 15); // East T-Junction
  addHangingLantern(-11.0, -1.7, -61.0, 0xff5a1e, 3.5, 15); // West S-Bend Corridor
  addHangingLantern(11.0, -1.7, -61.0, 0xff5a1e, 3.5, 15); // East S-Bend Corridor
  addHangingLantern(-11.0, -1.7, -68.0, 0xff5518, 3.5, 15); // North-West T-Junction
  addHangingLantern(11.0, -1.7, -68.0, 0xff5518, 3.5, 15); // North-East T-Junction
  addHangingLantern(19.2, -1.7, -68.0, 0xd93818, 3.0, 12); // Eerie Dead-End #2 dim red-orange torch
  // All 10 Underground Chambers
  addHangingLantern(-7.5, -1.6, -47.0, 0xff6622, 3.6, 16); // U1: Dungeon Cell 1
  addHangingLantern(-22.5, -1.6, -47.0, 0xff6020, 3.6, 16); // U2: Dungeon Cell 2
  addHangingLantern(8.0, -1.6, -48.5, 0xff4c12, 3.9, 16); // U3: Tantrik Ritual Room
  addHangingLantern(20.5, -1.6, -61.0, 0xff8828, 3.8, 16); // U4: Secret Gold Vault
  addHangingLantern(22.5, -1.6, -47.0, 0xff7722, 3.6, 16); // U5: Oil & Grain Cellar
  addHangingLantern(-20.5, -1.6, -61.0, 0xff4518, 3.6, 16); // U6: Chain & Torture Chamber
  addHangingLantern(0.0, -1.6, -58.2, 0x77b8cc, 3.8, 17); // U7: Underground Well Shaft Room
  addHangingLantern(-18.5, -1.6, -75.0, 0xff6824, 3.6, 16); // U8: Broken Idols Room
  addHangingLantern(-4.5, -1.6, -74.5, 0xff5d20, 3.6, 16); // U9: Collapsed Tunnel Chamber
  addHangingLantern(9.0, -1.6, -75.0, 0xff6022, 3.6, 16); // U10: Ancient Crypt

  // Back Courtyard Approach Flanking Mashals
  addHangingLantern(-7.2, 3.1, -55.0, 0xff8822, 4.0, 20);
  addHangingLantern(7.2, 3.1, -55.0, 0xff8822, 4.0, 20);

  // ==========================================================================
  // 6B. BRIGHT CEILING POINTLIGHTS INSIDE ALL ROOMS & 3-STORY 17m ROYAL ATRIUM
  // ==========================================================================
  const ceilingFixtureMat = new THREE.MeshBasicMaterial({
    color: 0xfffef8,
  });
  const ceilingFixtureGeo = new THREE.SphereGeometry(0.16, 12, 10);

  const addBrightCeilingLight = (
    x: number,
    y: number,
    z: number,
    intensity = 3.2,
    distance = 26,
    attachPointLight = false,
  ) => {
    const bulb = new THREE.Mesh(ceilingFixtureGeo, ceilingFixtureMat);
    bulb.position.set(x, y, z);
    root.add(bulb);

    if (attachPointLight && !disableExtraLights) {
      // Soft antique warm-parchment fill so rooms remain moody & readable without washing out flickering mashals
      const ptLight = new THREE.PointLight(0xffe0b5, intensity, distance, 0.92);
      ptLight.position.set(x, y - 0.15, z);
      root.add(ptLight);
    }
  };

  // Ground Floor (y = 4.65; Atrium central void rises 17m open above!)
  addBrightCeilingLight(0, 4.65, -34.0, 4.0, 56, true); // Central Ground Rear moody warm fill
  addBrightCeilingLight(-24.0, 4.65, 0.75, 3.4, 32); // G1
  addBrightCeilingLight(-24.0, 4.65, -30.0, 3.4, 32); // G2/G5
  addBrightCeilingLight(24.0, 4.65, 0.75, 3.4, 32); // G3
  addBrightCeilingLight(24.0, 4.65, -30.0, 3.4, 32); // G4/G6

  // Second Floor (y = 9.65)
  addBrightCeilingLight(0, 9.65, -34.0, 4.0, 56, true); // Central 2F Zone moody warm fill
  addBrightCeilingLight(24.0, 9.65, 0.75, 3.4, 32); // F2-1
  addBrightCeilingLight(-24.0, 9.65, 0.75, 3.4, 32); // F2-2
  addBrightCeilingLight(24.0, 9.65, -30.0, 3.4, 32); // F2-3
  addBrightCeilingLight(-24.0, 9.65, -30.0, 3.4, 32); // F2-4
  addBrightCeilingLight(0, 9.65, 7.9, 3.2, 30);

  // Third Floor & Grand 17m Atrium Dome Light (y = 16.55)
  addBrightCeilingLight(0, 16.55, -3.5, 4.6, 64, true); // Grand 17m Open Atrium Chandelier Canopy warm fill
  addBrightCeilingLight(-24.0, 16.55, 0.75, 3.4, 32); // F3-1
  addBrightCeilingLight(24.0, 16.55, 0.75, 3.4, 32); // F3-2
  addBrightCeilingLight(-24.0, 16.55, -30.0, 3.4, 32); // F3-3
  addBrightCeilingLight(24.0, 16.55, -30.0, 3.4, 32); // F3-4
  addBrightCeilingLight(0, 16.55, 7.9, 3.2, 30);

  // 10-Room Underground Labyrinth Ceiling Lights (y = -0.65, shifted ΔZ = -12.0m)
  addBrightCeilingLight(0, -0.65, -54.0, 3.7, 46, true); // Central Maze Crossroads moody warm fill
  addBrightCeilingLight(0, -0.65, -68.0, 3.4, 42, true); // Deep North Labyrinth moody warm fill
  addBrightCeilingLight(-7.5, -0.65, -47.0, 3.0, 24); // U1
  addBrightCeilingLight(-22.5, -0.65, -47.0, 3.0, 24); // U2
  addBrightCeilingLight(8.0, -0.65, -48.5, 3.2, 24); // U3
  addBrightCeilingLight(20.5, -0.65, -61.0, 3.2, 24); // U4
  addBrightCeilingLight(22.5, -0.65, -47.0, 3.0, 24); // U5
  addBrightCeilingLight(-20.5, -0.65, -61.0, 3.0, 24); // U6
  addBrightCeilingLight(0.0, -0.65, -58.5, 3.2, 26); // U7
  addBrightCeilingLight(-18.5, -0.65, -75.0, 3.0, 24); // U8
  addBrightCeilingLight(-4.5, -0.65, -74.5, 3.0, 24); // U9
  addBrightCeilingLight(9.0, -0.65, -75.0, 3.0, 24); // U10

  // 24-meter Royal Front Forecourt (z = 10..34) subtle moonlight-torch fill
  addBrightCeilingLight(0, 5.8, 16.0, 3.4, 40, true);
  addBrightCeilingLight(0, 5.8, 28.0, 3.4, 40, true);

  let lightningLight: THREE.DirectionalLight | null = null;
  if (!disableExtraLights) {
    lightningLight = new THREE.DirectionalLight(0xaaccff, 0.0);
    lightningLight.position.set(16, 38, 28);
    root.add(lightningLight);
  }

  // ==========================================================================
  // 7. LIGHTWEIGHT FLOATING DUST-MOTE PARTICLES (FLASHLIGHT-REACTIVE SHADER)
  // ==========================================================================
  const indoorDustMotes = createFlashlightReactiveDustMotes(root);
  const dustPoints = indoorDustMotes.points;

  // ==========================================================================
  // 8. NAVIGATION HELPERS: ELEVATION (STAIRS), ROOM LOOKUP & COLLISION
  // ==========================================================================

  const getElevationAt = (x: number, z: number, currentY: number): number => {
    // 1. Upper Grand Staircase Ramp (2F y=5.0 <-> 3F y=10.0): x in [-3.05, 3.05], z in [-42.6, -34.4]
    if (
      currentY >= 4.0 &&
      currentY <= 10.8 &&
      x >= -3.05 &&
      x <= 3.05 &&
      z >= -42.6 &&
      z <= -34.4
    ) {
      const t = Math.max(0, Math.min(1, (-34.5 - z) / 8.0));
      const rampY = 5.0 + t * 5.0;
      if (Math.abs(rampY - currentY) <= 2.3) {
        return rampY;
      }
    }

    // 2A. Grand Double-Wing Staircase — Central Lower Flight (GF y=0.0 <-> Mid Landing y=2.5):
    //     x in [-3.45, 3.45], z in [-27.05, -21.45]
    if (
      currentY >= -0.4 &&
      currentY <= 4.3 &&
      x >= -3.45 &&
      x <= 3.45 &&
      z >= -27.05 &&
      z <= -21.45
    ) {
      const t = Math.max(0, Math.min(1, (-21.5 - z) / 5.5));
      const rampY = t * 2.5;
      if (Math.abs(rampY - currentY) <= 1.95) {
        return rampY;
      }
    }

    // 2B. Grand Double-Wing Staircase — Mid Landing (y=2.5):
    //     x in [-3.85, 3.85], z in [-31.05, -26.95]
    if (
      currentY >= 0.8 &&
      currentY <= 4.35 &&
      x >= -3.85 &&
      x <= 3.85 &&
      z >= -31.05 &&
      z <= -26.95
    ) {
      return 2.5;
    }

    // 2C. Grand Double-Wing Staircase — Left Split Wing (Mid Landing y=2.5 <-> 2F West Balcony y=5.0):
    //     x in [-15.35, -3.75], z in [-31.05, -26.95] (stays at y=0 if player walks underneath!)
    if (
      currentY >= 1.2 &&
      currentY <= 6.2 &&
      x >= -15.35 &&
      x <= -3.75 &&
      z >= -31.05 &&
      z <= -26.95
    ) {
      const t = Math.max(0, Math.min(1, (-3.8 - x) / 11.4));
      const rampY = 2.5 + t * 2.5;
      if (Math.abs(rampY - currentY) <= 1.85) {
        return rampY;
      }
    }

    // 2D. Grand Double-Wing Staircase — Right Split Wing (Mid Landing y=2.5 <-> 2F East Balcony y=5.0):
    //     x in [3.75, 15.35], z in [-31.05, -26.95] (stays at y=0 if player walks underneath!)
    if (
      currentY >= 1.2 &&
      currentY <= 6.2 &&
      x >= 3.75 &&
      x <= 15.35 &&
      z >= -31.05 &&
      z <= -26.95
    ) {
      const t = Math.max(0, Math.min(1, (x - 3.8) / 11.4));
      const rampY = 2.5 + t * 2.5;
      if (Math.abs(rampY - currentY) <= 1.85) {
        return rampY;
      }
    }

    // 3. Underground Basement Staircase Ramp (GF y=0.0 <-> Basement y=-4.5):
    //    x in [6.7, 10.3], z in [-41.7, -33.8]
    if (
      currentY <= 1.2 &&
      x >= 6.7 &&
      x <= 10.3 &&
      z >= -41.7 &&
      z <= -33.8
    ) {
      const t = Math.max(0, Math.min(1, (-34.0 - z) / 7.5));
      const rampY = -t * 4.5;
      if (Math.abs(rampY - currentY) <= 2.3) {
        return rampY;
      }
    }

    // 4A. Basement Stairwell Bottom Foyer (y = -4.5): catches players/AI transitioning off bottom step
    if (
      currentY < -0.75 &&
      x >= 2.5 &&
      x <= 10.35 &&
      z >= -44.6 &&
      z <= -41.2
    ) {
      return -4.5;
    }

    // 4B. 10-Room Underground Labyrinth Maze Footprint (y = -4.5): x in [-28.8, 28.8], z in [-80.8, -41.2]
    if (
      currentY < -1.1 &&
      x >= -28.8 &&
      x <= 28.8 &&
      z >= -80.8 &&
      z <= -41.2
    ) {
      return -4.5;
    }

    // 5. Third Floor (y = +10.0), Second Floor (y = +5.0), or Ground Floor (y = 0.0)
    if (
      currentY >= 7.5 &&
      x >= -32.2 &&
      x <= 32.2 &&
      z >= -46.2 &&
      z <= 10.2
    ) {
      return 10.0;
    }
    if (
      currentY >= 2.5 &&
      x >= -32.2 &&
      x <= 32.2 &&
      z >= -46.2 &&
      z <= 10.2
    ) {
      return 5.0;
    }
    return 0.0;
  };

  const getRoomAt = (x: number, y: number, z: number): HaveliRoomZone => {
    // Dedicated staircase transition zones so HUD floor/room name stays accurate mid-stair
    if (y < -0.45 && y > -4.05 && x >= 6.7 && x <= 10.3 && z >= -41.7 && z <= -33.8) {
      return {
        id: 'stairs_basement',
        nameHi: 'तहखाना सीढ़ियाँ (Basement Stairs)',
        nameEn: 'Basement Stone Stairs',
        floorLevel: y <= -2.25 ? -1 : 0,
        minX: 6.7,
        maxX: 10.3,
        minZ: -41.7,
        maxZ: -33.8,
        minY: -4.7,
        maxY: 0.2,
        surface: 'stone',
        ambientFreq: 48,
      };
    }
    if (
      y >= 0.45 &&
      y <= 4.6 &&
      ((x >= -3.45 && x <= 3.45 && z >= -31.05 && z <= -21.45) ||
        (x >= -15.35 && x <= 15.35 && z >= -31.05 && z <= -26.95))
    ) {
      return {
        id: 'stairs_gf_2f',
        nameHi: 'शाही दोहरी सीढ़ियाँ (Grand Double-Wing Stairs)',
        nameEn: 'Grand Double-Wing Staircase',
        floorLevel: y >= 2.5 ? 1 : 0,
        minX: -15.35,
        maxX: 15.35,
        minZ: -31.05,
        maxZ: -21.45,
        minY: 0,
        maxY: 5.0,
        surface: 'stone',
        ambientFreq: 56,
      };
    }
    if (y >= 5.45 && y <= 9.6 && x >= -3.05 && x <= 3.05 && z >= -42.6 && z <= -34.4) {
      return {
        id: 'stairs_2f_3f',
        nameHi: 'ऊपरी शाही सीढ़ियाँ (2F–3F Stairs)',
        nameEn: 'Upper Grand Staircase',
        floorLevel: y >= 7.5 ? 2 : 1,
        minX: -3.05,
        maxX: 3.05,
        minZ: -42.6,
        maxZ: -34.4,
        minY: 5.0,
        maxY: 10.0,
        surface: 'stone',
        ambientFreq: 60,
      };
    }

    for (const zone of roomZones) {
      if (
        x >= zone.minX &&
        x <= zone.maxX &&
        z >= zone.minZ &&
        z <= zone.maxZ &&
        y >= zone.minY &&
        y <= zone.maxY
      ) {
        return zone;
      }
    }
    return roomZones[0];
  };

  // Strict Circle-vs-AABB depenetration helper: pushes (px, pz) cleanly out of box [minX, maxX] x [minZ, maxZ]
  const pushOutFromAABB = (
    px: number,
    pz: number,
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    radius: number,
  ): { x: number; z: number } => {
    const cx = Math.max(minX, Math.min(px, maxX));
    const cz = Math.max(minZ, Math.min(pz, maxZ));
    const dx = px - cx;
    const dz = pz - cz;
    const distSq = dx * dx + dz * dz;

    if (distSq >= radius * radius) {
      return { x: px, z: pz };
    }

    if (distSq > 1e-6) {
      const dist = Math.sqrt(distSq);
      const overlap = radius - dist;
      return {
        x: px + (dx / dist) * overlap,
        z: pz + (dz / dist) * overlap,
      };
    }

    // Center is inside the AABB: push out along the minimum penetration axis
    const dLeft = px - minX;
    const dRight = maxX - px;
    const dFront = pz - minZ;
    const dBack = maxZ - pz;
    const minPen = Math.min(dLeft, dRight, dFront, dBack);
    if (minPen === dLeft) return { x: minX - radius, z: pz };
    if (minPen === dRight) return { x: maxX + radius, z: pz };
    if (minPen === dFront) return { x: px, z: minZ - radius };
    return { x: px, z: maxZ + radius };
  };

  const isDoorBlocking = (d: HaveliDoor): boolean => {
    if (d.archwayOnly) return false;
    // Dynamically enable collision when closed/closing and release cleanly when swung open
    return d.isOpen ? d.openProgress < 0.22 : d.openProgress < 0.78;
  };

  const depenetrateAt = (
    px: number,
    pz: number,
    py: number,
    radius: number,
  ): { x: number; z: number } => {
    const minWorldZ = py < -1.8 ? -80.5 : -82.5;
    let x = Math.max(-47.5 + radius + 0.22, Math.min(47.5 - radius - 0.22, px));
    let z = Math.max(minWorldZ + radius + 0.22, Math.min(71.5 - radius - 0.22, pz));

    const floorLevel = py >= 7.5 ? 2 : py >= 2.5 ? 1 : py < -1.8 ? -1 : 0;
    const pMinY = py + 0.15;
    const pMaxY = py + 1.65;

    for (let iter = 0; iter < 3; iter++) {
      // 1. Push out of closed / locked doors on the current floor (100% passable when open)
      for (const d of doors) {
        if (isDoorBlocking(d) && d.colliderBox.floorLevel === floorLevel) {
          const pushed = pushOutFromAABB(
            x,
            z,
            d.colliderBox.minX,
            d.colliderBox.maxX,
            d.colliderBox.minZ,
            d.colliderBox.maxZ,
            radius,
          );
          x = pushed.x;
          z = pushed.z;
        }
      }

      // 2. Push out of all walls, pillars, stair railings, and fences overlapping player elevation
      for (const w of wallColliders) {
        if (pMaxY > w.minY && pMinY < w.maxY) {
          const pushed = pushOutFromAABB(
            x,
            z,
            w.minX,
            w.maxX,
            w.minZ,
            w.maxZ,
            radius,
          );
          x = pushed.x;
          z = pushed.z;
        }
      }
      // 3. Solid cylinder pushout around all exterior jungle tree trunks
      for (const c of cylinderColliders) {
        if (pMaxY > c.minY && pMinY < c.maxY) {
          const dx = x - c.x;
          const dz = z - c.z;
          const minDist = c.radius + radius;
          const distSq = dx * dx + dz * dz;
          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq);
            if (dist > 1e-4) {
              const push = (minDist - dist) / dist;
              x += dx * push;
              z += dz * push;
            } else {
              x += minDist;
            }
          }
        }
      }
    }

    return { x, z };
  };

  const resolveCollision = (
    prevX: number,
    prevZ: number,
    nextX: number,
    nextZ: number,
    playerY: number,
    radius = 0.65,
  ): { x: number; z: number } => {
    const moveDx = nextX - prevX;
    const moveDz = nextZ - prevZ;
    const moveDist = Math.hypot(moveDx, moveDz);
    const steps = Math.max(1, Math.ceil(moveDist / 0.15));

    let curX = prevX;
    let curZ = prevZ;
    const stepDx = moveDx / steps;
    const stepDz = moveDz / steps;

    for (let s = 1; s <= steps; s++) {
      const resolved = depenetrateAt(
        curX + stepDx,
        curZ + stepDz,
        playerY,
        radius,
      );
      curX = resolved.x;
      curZ = resolved.z;
    }

    return { x: curX, z: curZ };
  };

  const isLineOfSightClear = (
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    y: number,
    radius = 0.52,
  ): boolean => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) return true;
    const steps = Math.max(2, Math.ceil(dist / 0.2));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const sx = x1 + dx * t;
      const sz = z1 + dz * t;
      const dep = depenetrateAt(sx, sz, y, radius);
      if (Math.hypot(dep.x - sx, dep.z - sz) > 0.025) {
        return false;
      }
    }
    return true;
  };

  // ==========================================================================
  // 8B. DOORWAY, GRAND ATRIUM & 3-STAIRCASE WAYPOINT GRAPH (64m x 56m PALACE, 38m CENTRAL HALL, 22 ABOVE-GROUND + 10 BASEMENT ROOMS)
  // ==========================================================================
  const navigationNodes: HaveliNavNode[] = [
    // Ground Floor (y = 0.0): Massive 38m x 31.5m Royal Darbar Atrium, Side Aisles, Rear Walkway & 6 Wing Rooms (G1–G6)
    { id: 'gf_foyer_center', x: 0.0, y: 0.0, z: 7.5 },
    { id: 'gf_atrium_mid', x: 0.0, y: 0.0, z: -5.5 },
    { id: 'gf_stairs_bottom', x: 0.0, y: 0.0, z: -19.5 },
    { id: 'gf_aisle_sw', x: -10.0, y: 0.0, z: 7.5 },
    { id: 'gf_aisle_se', x: 10.0, y: 0.0, z: 7.5 },
    { id: 'gf_door_g1_out', x: -17.0, y: 0.0, z: 0.75 },
    { id: 'gf_door_g3_out', x: 17.0, y: 0.0, z: 0.75 },
    { id: 'gf_aisle_w_mid', x: -10.0, y: 0.0, z: 0.75 },
    { id: 'gf_aisle_e_mid', x: 10.0, y: 0.0, z: 0.75 },
    { id: 'gf_aisle_w_north', x: -10.0, y: 0.0, z: -18.0 },
    { id: 'gf_aisle_e_north', x: 10.0, y: 0.0, z: -18.0 },
    { id: 'gf_door_g2_out', x: -17.0, y: 0.0, z: -18.0 },
    { id: 'gf_door_g4_out', x: 17.0, y: 0.0, z: -18.0 },
    { id: 'gf_rear_w', x: -10.0, y: 0.0, z: -36.75 },
    { id: 'gf_rear_center', x: 0.0, y: 0.0, z: -35.5 },
    { id: 'gf_rear_e', x: 5.5, y: 0.0, z: -35.5 },
    { id: 'gf_door_g5_out', x: -17.0, y: 0.0, z: -36.75 },
    { id: 'gf_corridor_back_center', x: 0.0, y: 0.0, z: -43.75 },
    { id: 'gf_door_g6_out', x: 17.0, y: 0.0, z: -43.75 },
    { id: 'gf_back_well', x: 0.0, y: 0.0, z: -50.0 },
    { id: 'gf_well_west', x: -9.5, y: 0.0, z: -58.5 },
    { id: 'gf_well_east', x: 9.5, y: 0.0, z: -58.5 },
    { id: 'gf_well_north_w', x: -8.0, y: 0.0, z: -69.5 },
    { id: 'gf_well_north_e', x: 8.0, y: 0.0, z: -69.5 },

    // GF West Wing: G1 (z: -8.5..10), G2 (z: -27.5..-8.5), G5 (z: -46..-27.5)
    { id: 'gf_door_g1_in', x: -21.0, y: 0.0, z: 0.75 },
    { id: 'gf_g1_center', x: -24.0, y: 0.0, z: 0.75 },
    { id: 'gf_door_g1_g2_s', x: -24.0, y: 0.0, z: -7.0 },
    { id: 'gf_door_g1_g2_n', x: -24.0, y: 0.0, z: -10.0 },
    { id: 'gf_door_g2_in', x: -21.0, y: 0.0, z: -18.0 },
    { id: 'gf_g2_center', x: -24.0, y: 0.0, z: -18.0 },
    { id: 'gf_door_g2_g5_s', x: -24.0, y: 0.0, z: -26.0 },
    { id: 'gf_door_g2_g5_n', x: -24.0, y: 0.0, z: -29.0 },
    { id: 'gf_door_g5_in', x: -21.0, y: 0.0, z: -36.75 },
    { id: 'gf_g5_center', x: -24.0, y: 0.0, z: -36.75 },

    // GF East Wing: G3 (z: -8.5..10), G4 (z: -27.5..-8.5), G6 (z: -46..-27.5)
    { id: 'gf_door_g3_in', x: 21.0, y: 0.0, z: 0.75 },
    { id: 'gf_g3_center', x: 24.0, y: 0.0, z: 0.75 },
    { id: 'gf_door_g3_g4_s', x: 24.0, y: 0.0, z: -7.0 },
    { id: 'gf_door_g3_g4_n', x: 24.0, y: 0.0, z: -10.0 },
    { id: 'gf_door_g4_in', x: 21.0, y: 0.0, z: -18.0 },
    { id: 'gf_g4_center', x: 24.0, y: 0.0, z: -18.0 },
    { id: 'gf_door_g4_g6_s', x: 24.0, y: 0.0, z: -26.0 },
    { id: 'gf_door_g4_g6_n', x: 24.0, y: 0.0, z: -29.0 },
    { id: 'gf_door_g6_in', x: 21.0, y: 0.0, z: -43.75 },
    { id: 'gf_g6_center', x: 24.0, y: 0.0, z: -36.75 },

    // Grand Double-Wing Royal Staircase (GF y=0.0 -> Mid Landing y=2.5 -> Split Left/Right Wings -> 2F y=5.0)
    { id: 'stairs1_lower', x: 0.0, y: 1.25, z: -24.25 },
    { id: 'stairs1_mid_landing', x: 0.0, y: 2.5, z: -29.0 },
    { id: 'stairs1_left_mid', x: -9.5, y: 3.75, z: -29.0 },
    { id: 'stairs1_right_mid', x: 9.5, y: 3.75, z: -29.0 },

    // Second Floor (y = 5.0): 4-Sided Wrap-Around Jharokha Balconies & 8 Rooms (2F-1 to 2F-8)
    { id: 'f2_balcony_w_stair', x: -17.0, y: 5.0, z: -29.0 },
    { id: 'f2_balcony_e_stair', x: 17.0, y: 5.0, z: -29.0 },
    { id: 'f2_door_f2_4_out', x: -17.0, y: 5.0, z: -36.75 },
    { id: 'f2_door_f2_3_out', x: 17.0, y: 5.0, z: -36.75 },
    { id: 'f2_door_f2_6_out', x: -17.0, y: 5.0, z: -18.0 },
    { id: 'f2_door_f2_5_out', x: 17.0, y: 5.0, z: -18.0 },
    { id: 'f2_north_nw', x: -10.0, y: 5.0, z: -33.2 },
    { id: 'f2_north_ne', x: 10.0, y: 5.0, z: -33.2 },
    { id: 'f2_stairs2_bottom', x: 0.0, y: 5.0, z: -33.6 },
    { id: 'f2_north_back_w', x: -10.0, y: 5.0, z: -44.0 },
    { id: 'f2_north_back_c', x: 0.0, y: 5.0, z: -44.0 },
    { id: 'f2_north_back_e', x: 10.0, y: 5.0, z: -44.0 },
    { id: 'f2_door_f2_2_out', x: -17.0, y: 5.0, z: 0.75 },
    { id: 'f2_door_f2_1_out', x: 17.0, y: 5.0, z: 0.75 },
    { id: 'f2_jharokha_w', x: -17.0, y: 5.0, z: 4.5 },
    { id: 'f2_door_f2_7_out', x: -7.2, y: 5.0, z: 4.5 },
    { id: 'f2_jharokha_c', x: 0.0, y: 5.0, z: 4.5 },
    { id: 'f2_door_f2_8_out', x: 7.2, y: 5.0, z: 4.5 },
    { id: 'f2_jharokha_e', x: 17.0, y: 5.0, z: 4.5 },

    // 2F East Wing Rooms: 2F-1, 2F-5, 2F-3
    { id: 'f2_door_f2_1_in', x: 21.0, y: 5.0, z: 0.75 },
    { id: 'f2_1_center', x: 24.0, y: 5.0, z: 0.75 },
    { id: 'f2_1_north', x: 24.0, y: 5.0, z: -7.0 },
    { id: 'f2_5_south', x: 24.0, y: 5.0, z: -10.0 },
    { id: 'f2_door_f2_5_in', x: 21.0, y: 5.0, z: -18.0 },
    { id: 'f2_5_center', x: 24.0, y: 5.0, z: -18.0 },
    { id: 'f2_5_north', x: 24.0, y: 5.0, z: -26.0 },
    { id: 'f2_3_south', x: 24.0, y: 5.0, z: -29.0 },
    { id: 'f2_door_f2_3_in', x: 21.0, y: 5.0, z: -36.75 },
    { id: 'f2_3_center', x: 24.0, y: 5.0, z: -36.75 },

    // 2F West Wing Rooms: 2F-2, 2F-6, 2F-4
    { id: 'f2_door_f2_2_in', x: -21.0, y: 5.0, z: 0.75 },
    { id: 'f2_2_center', x: -24.0, y: 5.0, z: 0.75 },
    { id: 'f2_2_north', x: -24.0, y: 5.0, z: -7.0 },
    { id: 'f2_6_south', x: -24.0, y: 5.0, z: -10.0 },
    { id: 'f2_door_f2_6_in', x: -21.0, y: 5.0, z: -18.0 },
    { id: 'f2_6_center', x: -24.0, y: 5.0, z: -18.0 },
    { id: 'f2_6_north', x: -24.0, y: 5.0, z: -26.0 },
    { id: 'f2_4_south', x: -24.0, y: 5.0, z: -29.0 },
    { id: 'f2_door_f2_4_in', x: -21.0, y: 5.0, z: -36.75 },
    { id: 'f2_4_center', x: -24.0, y: 5.0, z: -36.75 },

    // 2F Front Palace Suites: 2F-7 (West Front) & 2F-8 (East Front)
    { id: 'f2_door_f2_7_in', x: -7.2, y: 5.0, z: 7.6 },
    { id: 'f2_7_center', x: -8.5, y: 5.0, z: 7.9 },
    { id: 'f2_door_f2_8_in', x: 7.2, y: 5.0, z: 7.6 },
    { id: 'f2_8_center', x: 8.5, y: 5.0, z: 7.9 },

    // Upper Grand Staircase (2F y=5.0 -> 3F y=10.0, x=0, z: -34.5 -> -42.5)
    { id: 'stairs2_lower', x: 0.0, y: 6.25, z: -36.5 },
    { id: 'stairs2_mid', x: 0.0, y: 7.5, z: -38.5 },
    { id: 'stairs2_upper', x: 0.0, y: 8.75, z: -40.5 },
    { id: 'f3_stairs2_top', x: 0.0, y: 10.0, z: -44.2 },

    // Third Floor (y = 10.0): 4-Sided Wrap-Around Jharokha Balconies & 8 Rooms (3F-1 to 3F-8)
    { id: 'f3_nw_corner', x: -17.0, y: 10.0, z: -44.2 },
    { id: 'f3_ne_corner', x: 17.0, y: 10.0, z: -44.2 },
    { id: 'f3_door_f3_3_out', x: -17.0, y: 10.0, z: -36.75 },
    { id: 'f3_door_f3_4_out', x: 17.0, y: 10.0, z: -36.75 },
    { id: 'f3_bridge_w', x: -17.0, y: 10.0, z: -32.0 },
    { id: 'f3_bridge_c', x: 0.0, y: 10.0, z: -32.0 },
    { id: 'f3_bridge_e', x: 17.0, y: 10.0, z: -32.0 },
    { id: 'f3_door_f3_5_out', x: -17.0, y: 10.0, z: -18.0 },
    { id: 'f3_door_f3_6_out', x: 17.0, y: 10.0, z: -18.0 },
    { id: 'f3_door_f3_1_out', x: -17.0, y: 10.0, z: 0.75 },
    { id: 'f3_door_f3_2_out', x: 17.0, y: 10.0, z: 0.75 },
    { id: 'f3_jharokha_w', x: -17.0, y: 10.0, z: 4.5 },
    { id: 'f3_door_f3_7_out', x: -7.2, y: 10.0, z: 4.5 },
    { id: 'f3_jharokha_c', x: 0.0, y: 10.0, z: 4.5 },
    { id: 'f3_door_f3_8_out', x: 7.2, y: 10.0, z: 4.5 },
    { id: 'f3_jharokha_e', x: 17.0, y: 10.0, z: 4.5 },

    // 3F West Wing Rooms: 3F-1, 3F-5, 3F-3
    { id: 'f3_door_f3_1_in', x: -21.0, y: 10.0, z: 0.75 },
    { id: 'f3_1_center', x: -24.0, y: 10.0, z: 0.75 },
    { id: 'f3_1_north', x: -24.0, y: 10.0, z: -7.0 },
    { id: 'f3_5_south', x: -24.0, y: 10.0, z: -10.0 },
    { id: 'f3_door_f3_5_in', x: -21.0, y: 10.0, z: -18.0 },
    { id: 'f3_5_center', x: -24.0, y: 10.0, z: -18.0 },
    { id: 'f3_5_north', x: -24.0, y: 10.0, z: -26.0 },
    { id: 'f3_3_south', x: -24.0, y: 10.0, z: -29.0 },
    { id: 'f3_door_f3_3_in', x: -21.0, y: 10.0, z: -36.75 },
    { id: 'f3_3_center', x: -24.0, y: 10.0, z: -36.75 },

    // 3F East Wing Rooms: 3F-2, 3F-6, 3F-4
    { id: 'f3_door_f3_2_in', x: 21.0, y: 10.0, z: 0.75 },
    { id: 'f3_2_center', x: 24.0, y: 10.0, z: 0.75 },
    { id: 'f3_2_north', x: 24.0, y: 10.0, z: -7.0 },
    { id: 'f3_6_south', x: 24.0, y: 10.0, z: -10.0 },
    { id: 'f3_door_f3_6_in', x: 21.0, y: 10.0, z: -18.0 },
    { id: 'f3_6_center', x: 24.0, y: 10.0, z: -18.0 },
    { id: 'f3_6_north', x: 24.0, y: 10.0, z: -26.0 },
    { id: 'f3_4_south', x: 24.0, y: 10.0, z: -29.0 },
    { id: 'f3_door_f3_4_in', x: 21.0, y: 10.0, z: -36.75 },
    { id: 'f3_4_center', x: 24.0, y: 10.0, z: -36.75 },

    // 3F Front Watchtower Suites: 3F-7 (West Front) & 3F-8 (East Front)
    { id: 'f3_door_f3_7_in', x: -7.2, y: 10.0, z: 7.6 },
    { id: 'f3_7_center', x: -8.5, y: 10.0, z: 7.9 },
    { id: 'f3_door_f3_8_in', x: 7.2, y: 10.0, z: 7.6 },
    { id: 'f3_8_center', x: 8.5, y: 10.0, z: 7.9 },

    // GF <-> 10-Room Underground Labyrinth Maze (y = 0.0 down to -4.5, x = 8.5, z: -34 -> -41.5)
    { id: 'gf_basement_stairs_top', x: 8.5, y: 0.0, z: -32.5 },
    { id: 'basement_stairs_mid', x: 8.5, y: -2.25, z: -37.75 },
    { id: 'basement_stairs_bottom', x: 8.5, y: -4.5, z: -43.2 },
    { id: 'b_foyer_west', x: 3.5, y: -4.5, z: -43.4 },

    // Central Spine & Mid Cross-Corridor Junctions
    { id: 'b_hall_south', x: 0.0, y: -4.5, z: -43.4 },
    { id: 'b_hall_u1', x: 0.0, y: -4.5, z: -47.0 },
    { id: 'b_hall_u3', x: 0.0, y: -4.5, z: -48.5 },
    { id: 'b_mid_cross_c', x: 0.0, y: -4.5, z: -54.0 },
    { id: 'b_mid_w_bend', x: -11.0, y: -4.5, z: -54.0 },
    { id: 'b_mid_w_t', x: -15.0, y: -4.5, z: -54.0 },
    { id: 'b_mid_e_bend', x: 11.0, y: -4.5, z: -54.0 },
    { id: 'b_mid_e_t', x: 15.0, y: -4.5, z: -54.0 },

    // West & East South Corridors + Dead-End #1
    { id: 'b_w_corr_u2', x: -15.0, y: -4.5, z: -48.5 },
    { id: 'b_deadend_1', x: -15.0, y: -4.5, z: -44.0 },
    { id: 'b_e_corr_u5', x: 15.0, y: -4.5, z: -47.0 },

    // West & East Jogged North S-Bend Corridors
    { id: 'b_wn_corr_u6', x: -11.0, y: -4.5, z: -61.0 },
    { id: 'b_en_corr_u4', x: 11.0, y: -4.5, z: -61.0 },

    // Deep North Cross-Corridor Junctions + Dead-End #2
    { id: 'b_north_u8', x: -18.5, y: -4.5, z: -68.0 },
    { id: 'b_north_w_t', x: -11.0, y: -4.5, z: -68.0 },
    { id: 'b_north_u9', x: -4.5, y: -4.5, z: -68.0 },
    { id: 'b_north_u10', x: 9.0, y: -4.5, z: -68.0 },
    { id: 'b_north_e_t', x: 11.0, y: -4.5, z: -68.0 },
    { id: 'b_deadend_2', x: 17.5, y: -4.5, z: -68.0 },

    // All 10 Underground Chambers (doorway-inside + center waypoints)
    { id: 'b_u1_in', x: -4.0, y: -4.5, z: -47.0 },
    { id: 'b_u1_center', x: -8.0, y: -4.5, z: -47.0 },
    { id: 'b_u2_in', x: -19.0, y: -4.5, z: -48.5 },
    { id: 'b_u2_center', x: -22.5, y: -4.5, z: -47.0 },
    { id: 'b_u3_in', x: 4.0, y: -4.5, z: -48.5 },
    { id: 'b_u3_center', x: 8.2, y: -4.5, z: -48.5 },
    { id: 'b_u4_in', x: 15.0, y: -4.5, z: -61.0 },
    { id: 'b_u4_center', x: 20.5, y: -4.5, z: -61.0 },
    { id: 'b_u5_in', x: 19.0, y: -4.5, z: -47.0 },
    { id: 'b_u5_center', x: 22.5, y: -4.5, z: -47.0 },
    { id: 'b_u6_in', x: -15.0, y: -4.5, z: -61.0 },
    { id: 'b_u6_center', x: -20.0, y: -4.5, z: -58.8 },
    { id: 'b_u7_in', x: 0.0, y: -4.5, z: -57.6 },
    { id: 'b_u7_west', x: -4.5, y: -4.5, z: -61.0 },
    { id: 'b_u7_east', x: 4.5, y: -4.5, z: -61.0 },
    { id: 'b_u8_in', x: -18.5, y: -4.5, z: -72.0 },
    { id: 'b_u8_center', x: -18.5, y: -4.5, z: -75.0 },
    { id: 'b_u9_in', x: -4.5, y: -4.5, z: -72.0 },
    { id: 'b_u9_center', x: -4.5, y: -4.5, z: -74.5 },
    { id: 'b_u10_in', x: 9.0, y: -4.5, z: -72.0 },
    { id: 'b_u10_center', x: 9.0, y: -4.5, z: -74.5 },
  ];

  const navNodeById = new Map<string, HaveliNavNode>();
  for (const n of navigationNodes) {
    navNodeById.set(n.id, n);
  }

  const navAdjacency = new Map<
    string,
    Array<{ to: string; weight: number; doorId?: string }>
  >();
  const linkNavNodes = (idA: string, idB: string, doorId?: string) => {
    const a = navNodeById.get(idA);
    const b = navNodeById.get(idB);
    if (!a || !b) return;
    const w = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    if (!navAdjacency.has(idA)) navAdjacency.set(idA, []);
    if (!navAdjacency.has(idB)) navAdjacency.set(idB, []);
    navAdjacency.get(idA)!.push({ to: idB, weight: w, doorId });
    navAdjacency.get(idB)!.push({ to: idA, weight: w, doorId });
  };

  // Ground Floor Royal Darbar Atrium Connections
  linkNavNodes('gf_foyer_center', 'gf_atrium_mid');
  linkNavNodes('gf_foyer_center', 'gf_aisle_sw');
  linkNavNodes('gf_foyer_center', 'gf_aisle_se');
  linkNavNodes('gf_atrium_mid', 'gf_stairs_bottom');
  linkNavNodes('gf_atrium_mid', 'gf_aisle_w_mid');
  linkNavNodes('gf_atrium_mid', 'gf_aisle_e_mid');
  linkNavNodes('gf_aisle_sw', 'gf_aisle_w_mid');
  linkNavNodes('gf_aisle_se', 'gf_aisle_e_mid');
  linkNavNodes('gf_aisle_w_mid', 'gf_door_g1_out');
  linkNavNodes('gf_aisle_e_mid', 'gf_door_g3_out');
  linkNavNodes('gf_aisle_w_mid', 'gf_aisle_w_north');
  linkNavNodes('gf_aisle_e_mid', 'gf_aisle_e_north');
  linkNavNodes('gf_stairs_bottom', 'gf_aisle_w_north');
  linkNavNodes('gf_stairs_bottom', 'gf_aisle_e_north');
  linkNavNodes('gf_aisle_w_north', 'gf_door_g2_out');
  linkNavNodes('gf_aisle_e_north', 'gf_door_g4_out');
  linkNavNodes('gf_aisle_w_north', 'gf_rear_w');
  linkNavNodes('gf_aisle_e_north', 'gf_rear_e');
  linkNavNodes('gf_rear_w', 'gf_door_g5_out');
  linkNavNodes('gf_rear_w', 'gf_rear_center');
  linkNavNodes('gf_rear_center', 'gf_rear_e');
  linkNavNodes('gf_rear_center', 'gf_corridor_back_center');
  linkNavNodes('gf_rear_w', 'gf_corridor_back_center');
  linkNavNodes('gf_corridor_back_center', 'gf_door_g6_out');
  linkNavNodes('gf_corridor_back_center', 'gf_back_well', 'door_back_well');
  linkNavNodes('gf_back_well', 'gf_well_west');
  linkNavNodes('gf_back_well', 'gf_well_east');
  linkNavNodes('gf_well_west', 'gf_well_north_w');
  linkNavNodes('gf_well_north_w', 'gf_well_north_e');
  linkNavNodes('gf_well_north_e', 'gf_well_east');

  // GF Wing Rooms G1..G6
  linkNavNodes('gf_door_g1_out', 'gf_door_g1_in', 'door_g1_shastragar');
  linkNavNodes('gf_door_g1_in', 'gf_g1_center');
  linkNavNodes('gf_g1_center', 'gf_door_g1_g2_s');
  linkNavNodes('gf_door_g1_g2_s', 'gf_door_g1_g2_n', 'door_g1_g2_inner');
  linkNavNodes('gf_door_g1_g2_n', 'gf_g2_center');
  linkNavNodes('gf_door_g2_out', 'gf_door_g2_in', 'door_g2_kitchen');
  linkNavNodes('gf_door_g2_in', 'gf_g2_center');
  linkNavNodes('gf_g2_center', 'gf_door_g2_g5_s');
  linkNavNodes('gf_door_g2_g5_s', 'gf_door_g2_g5_n', 'door_g2_g5_inner');
  linkNavNodes('gf_door_g2_g5_n', 'gf_g5_center');
  linkNavNodes('gf_door_g5_out', 'gf_door_g5_in', 'door_g5_baithak');
  linkNavNodes('gf_door_g5_in', 'gf_g5_center');

  linkNavNodes('gf_door_g3_out', 'gf_door_g3_in', 'door_g3_munim');
  linkNavNodes('gf_door_g3_in', 'gf_g3_center');
  linkNavNodes('gf_g3_center', 'gf_door_g3_g4_s');
  linkNavNodes('gf_door_g3_g4_s', 'gf_door_g3_g4_n', 'door_g3_g4_inner');
  linkNavNodes('gf_door_g3_g4_n', 'gf_g4_center');
  linkNavNodes('gf_door_g4_out', 'gf_door_g4_in', 'door_g4_pooja');
  linkNavNodes('gf_door_g4_in', 'gf_g4_center');
  linkNavNodes('gf_g4_center', 'gf_door_g4_g6_s');
  linkNavNodes('gf_door_g4_g6_s', 'gf_door_g4_g6_n', 'door_g4_g6_inner');
  linkNavNodes('gf_door_g4_g6_n', 'gf_g6_center');
  linkNavNodes('gf_door_g6_out', 'gf_door_g6_in', 'door_g6_sevak');
  linkNavNodes('gf_door_g6_in', 'gf_g6_center');

  // Grand Double-Wing Staircase (GF -> Mid Landing -> Left & Right Split Wings -> 2F Balconies)
  linkNavNodes('gf_stairs_bottom', 'stairs1_lower');
  linkNavNodes('stairs1_lower', 'stairs1_mid_landing');
  linkNavNodes('stairs1_mid_landing', 'stairs1_left_mid');
  linkNavNodes('stairs1_mid_landing', 'stairs1_right_mid');
  linkNavNodes('stairs1_left_mid', 'f2_balcony_w_stair');
  linkNavNodes('stairs1_right_mid', 'f2_balcony_e_stair');

  // 2F 4-Sided Wrap-Around Balcony Connections
  linkNavNodes('f2_balcony_w_stair', 'f2_door_f2_4_out');
  linkNavNodes('f2_balcony_w_stair', 'f2_door_f2_6_out');
  linkNavNodes('f2_door_f2_6_out', 'f2_door_f2_2_out');
  linkNavNodes('f2_balcony_e_stair', 'f2_door_f2_3_out');
  linkNavNodes('f2_balcony_e_stair', 'f2_door_f2_5_out');
  linkNavNodes('f2_door_f2_5_out', 'f2_door_f2_1_out');
  linkNavNodes('f2_door_f2_4_out', 'f2_north_nw');
  linkNavNodes('f2_door_f2_3_out', 'f2_north_ne');
  linkNavNodes('f2_north_nw', 'f2_stairs2_bottom');
  linkNavNodes('f2_north_ne', 'f2_stairs2_bottom');
  linkNavNodes('f2_door_f2_4_out', 'f2_north_back_w');
  linkNavNodes('f2_door_f2_3_out', 'f2_north_back_e');
  linkNavNodes('f2_north_back_w', 'f2_north_back_c');
  linkNavNodes('f2_north_back_c', 'f2_north_back_e');
  linkNavNodes('f2_door_f2_2_out', 'f2_jharokha_w');
  linkNavNodes('f2_door_f2_1_out', 'f2_jharokha_e');
  linkNavNodes('f2_jharokha_w', 'f2_door_f2_7_out');
  linkNavNodes('f2_door_f2_7_out', 'f2_jharokha_c');
  linkNavNodes('f2_jharokha_c', 'f2_door_f2_8_out');
  linkNavNodes('f2_door_f2_8_out', 'f2_jharokha_e');

  // 2F Rooms (2F-1..2F-8)
  linkNavNodes('f2_door_f2_1_out', 'f2_door_f2_1_in', 'door_f2_1_bridal');
  linkNavNodes('f2_door_f2_1_in', 'f2_1_center');
  linkNavNodes('f2_1_center', 'f2_1_north');
  linkNavNodes('f2_1_north', 'f2_5_south', 'door_f2_east_inner_1');
  linkNavNodes('f2_5_south', 'f2_5_center');
  linkNavNodes('f2_door_f2_5_out', 'f2_door_f2_5_in', 'door_f2_5_rani_shringar');
  linkNavNodes('f2_door_f2_5_in', 'f2_5_center');
  linkNavNodes('f2_5_center', 'f2_5_north');
  linkNavNodes('f2_5_north', 'f2_3_south', 'door_f2_east_inner_2');
  linkNavNodes('f2_3_south', 'f2_3_center');
  linkNavNodes('f2_door_f2_3_out', 'f2_door_f2_3_in', 'door_f2_3_guest1');
  linkNavNodes('f2_door_f2_3_in', 'f2_3_center');

  linkNavNodes('f2_door_f2_2_out', 'f2_door_f2_2_in', 'door_f2_2_master_bed');
  linkNavNodes('f2_door_f2_2_in', 'f2_2_center');
  linkNavNodes('f2_2_center', 'f2_2_north');
  linkNavNodes('f2_2_north', 'f2_6_south', 'door_f2_west_inner_1');
  linkNavNodes('f2_6_south', 'f2_6_center');
  linkNavNodes('f2_door_f2_6_out', 'f2_door_f2_6_in', 'door_f2_6_royal_dining');
  linkNavNodes('f2_door_f2_6_in', 'f2_6_center');
  linkNavNodes('f2_6_center', 'f2_6_north');
  linkNavNodes('f2_6_north', 'f2_4_south', 'door_f2_west_inner_2');
  linkNavNodes('f2_4_south', 'f2_4_center');
  linkNavNodes('f2_door_f2_4_out', 'f2_door_f2_4_in', 'door_f2_4_sangeet');
  linkNavNodes('f2_door_f2_4_in', 'f2_4_center');

  linkNavNodes('f2_door_f2_7_out', 'f2_door_f2_7_in', 'door_f2_7_guest2');
  linkNavNodes('f2_door_f2_7_in', 'f2_7_center');
  linkNavNodes('f2_door_f2_8_out', 'f2_door_f2_8_in', 'door_f2_8_portrait_gallery');
  linkNavNodes('f2_door_f2_8_in', 'f2_8_center');
  linkNavNodes('f2_door_f2_7_in', 'f2_door_f2_8_in', 'door_f2_front_inner');

  // 2F <-> 3F Upper Grand Staircase
  linkNavNodes('f2_stairs2_bottom', 'stairs2_lower');
  linkNavNodes('stairs2_lower', 'stairs2_mid');
  linkNavNodes('stairs2_mid', 'stairs2_upper');
  linkNavNodes('stairs2_upper', 'f3_stairs2_top');

  // 3F 4-Sided Wrap-Around Balcony Connections
  linkNavNodes('f3_stairs2_top', 'f3_nw_corner');
  linkNavNodes('f3_stairs2_top', 'f3_ne_corner');
  linkNavNodes('f3_nw_corner', 'f3_door_f3_3_out');
  linkNavNodes('f3_ne_corner', 'f3_door_f3_4_out');
  linkNavNodes('f3_door_f3_3_out', 'f3_bridge_w');
  linkNavNodes('f3_door_f3_4_out', 'f3_bridge_e');
  linkNavNodes('f3_bridge_w', 'f3_bridge_c');
  linkNavNodes('f3_bridge_c', 'f3_bridge_e');
  linkNavNodes('f3_bridge_w', 'f3_door_f3_5_out');
  linkNavNodes('f3_door_f3_5_out', 'f3_door_f3_1_out');
  linkNavNodes('f3_bridge_e', 'f3_door_f3_6_out');
  linkNavNodes('f3_door_f3_6_out', 'f3_door_f3_2_out');
  linkNavNodes('f3_door_f3_1_out', 'f3_jharokha_w');
  linkNavNodes('f3_door_f3_2_out', 'f3_jharokha_e');
  linkNavNodes('f3_jharokha_w', 'f3_door_f3_7_out');
  linkNavNodes('f3_door_f3_7_out', 'f3_jharokha_c');
  linkNavNodes('f3_jharokha_c', 'f3_door_f3_8_out');
  linkNavNodes('f3_door_f3_8_out', 'f3_jharokha_e');

  // 3F Rooms (3F-1..3F-8)
  linkNavNodes('f3_door_f3_1_out', 'f3_door_f3_1_in', 'door_f3_1_library');
  linkNavNodes('f3_door_f3_1_in', 'f3_1_center');
  linkNavNodes('f3_1_center', 'f3_1_north');
  linkNavNodes('f3_1_north', 'f3_5_south', 'door_f3_west_inner_1');
  linkNavNodes('f3_5_south', 'f3_5_center');
  linkNavNodes('f3_door_f3_5_out', 'f3_door_f3_5_in', 'door_f3_5_jyotish');
  linkNavNodes('f3_door_f3_5_in', 'f3_5_center');
  linkNavNodes('f3_5_center', 'f3_5_north');
  linkNavNodes('f3_5_north', 'f3_3_south', 'door_f3_west_inner_2');
  linkNavNodes('f3_3_south', 'f3_3_center');
  linkNavNodes('f3_door_f3_3_out', 'f3_door_f3_3_in', 'door_f3_3_attic1');
  linkNavNodes('f3_door_f3_3_in', 'f3_3_center');

  linkNavNodes('f3_door_f3_2_out', 'f3_door_f3_2_in', 'door_f3_2_aaina');
  linkNavNodes('f3_door_f3_2_in', 'f3_2_center');
  linkNavNodes('f3_2_center', 'f3_2_north');
  linkNavNodes('f3_2_north', 'f3_6_south', 'door_f3_east_inner_1');
  linkNavNodes('f3_6_south', 'f3_6_center');
  linkNavNodes('f3_door_f3_6_out', 'f3_door_f3_6_in', 'door_f3_6_doll_room');
  linkNavNodes('f3_door_f3_6_in', 'f3_6_center');
  linkNavNodes('f3_6_center', 'f3_6_north');
  linkNavNodes('f3_6_north', 'f3_4_south', 'door_f3_east_inner_2');
  linkNavNodes('f3_4_south', 'f3_4_center');
  linkNavNodes('f3_door_f3_4_out', 'f3_door_f3_4_in', 'door_f3_4_barsati');
  linkNavNodes('f3_door_f3_4_in', 'f3_4_center');

  linkNavNodes('f3_door_f3_7_out', 'f3_door_f3_7_in', 'door_f3_7_attic2');
  linkNavNodes('f3_door_f3_7_in', 'f3_7_center');
  linkNavNodes('f3_door_f3_8_out', 'f3_door_f3_8_in', 'door_f3_8_watchtower');
  linkNavNodes('f3_door_f3_8_in', 'f3_8_center');
  linkNavNodes('f3_door_f3_7_in', 'f3_door_f3_8_in', 'door_f3_front_inner');

  // GF <-> 10-Room Underground Labyrinth Maze Connections (wall-safe corridor graph)
  linkNavNodes('gf_aisle_e_north', 'gf_basement_stairs_top');
  linkNavNodes('gf_rear_e', 'gf_basement_stairs_top');
  linkNavNodes('gf_basement_stairs_top', 'basement_stairs_mid', 'door_basement_entrance');
  linkNavNodes('basement_stairs_mid', 'basement_stairs_bottom', 'door_tehkhana');
  linkNavNodes('basement_stairs_bottom', 'b_foyer_west');
  linkNavNodes('b_foyer_west', 'b_hall_south');

  // Central Spine & Mid Cross-Corridor
  linkNavNodes('b_hall_south', 'b_hall_u1');
  linkNavNodes('b_hall_u1', 'b_hall_u3');
  linkNavNodes('b_hall_u3', 'b_mid_cross_c');
  linkNavNodes('b_mid_cross_c', 'b_mid_w_bend');
  linkNavNodes('b_mid_w_bend', 'b_mid_w_t');
  linkNavNodes('b_mid_cross_c', 'b_mid_e_bend');
  linkNavNodes('b_mid_e_bend', 'b_mid_e_t');

  // West & East South Corridors + Dead-End #1
  linkNavNodes('b_mid_w_t', 'b_w_corr_u2');
  linkNavNodes('b_w_corr_u2', 'b_deadend_1');
  linkNavNodes('b_mid_e_t', 'b_e_corr_u5');

  // West & East S-Bend North Corridors -> North Cross-Corridor Loop
  linkNavNodes('b_mid_w_bend', 'b_wn_corr_u6');
  linkNavNodes('b_wn_corr_u6', 'b_north_w_t');
  linkNavNodes('b_mid_e_bend', 'b_en_corr_u4');
  linkNavNodes('b_en_corr_u4', 'b_north_e_t');

  // Deep North Cross-Corridor + Dead-End #2
  linkNavNodes('b_north_u8', 'b_north_w_t');
  linkNavNodes('b_north_w_t', 'b_north_u9');
  linkNavNodes('b_north_u9', 'b_north_u10');
  linkNavNodes('b_north_u10', 'b_north_e_t');
  linkNavNodes('b_north_e_t', 'b_deadend_2');

  // All 10 Chamber Doorway Links (U1..U10)
  linkNavNodes('b_hall_u1', 'b_u1_in', 'door_u1_kalkothri');
  linkNavNodes('b_u1_in', 'b_u1_center');
  linkNavNodes('b_w_corr_u2', 'b_u2_in', 'door_u2_kalkothri2');
  linkNavNodes('b_u2_in', 'b_u2_center');
  linkNavNodes('b_hall_u3', 'b_u3_in', 'door_u3_havan');
  linkNavNodes('b_u3_in', 'b_u3_center');
  linkNavNodes('b_en_corr_u4', 'b_u4_in', 'door_u4_vault');
  linkNavNodes('b_u4_in', 'b_u4_center');
  linkNavNodes('b_e_corr_u5', 'b_u5_in', 'door_u5_cellar');
  linkNavNodes('b_u5_in', 'b_u5_center');
  linkNavNodes('b_wn_corr_u6', 'b_u6_in', 'door_u6_torture');
  linkNavNodes('b_u6_in', 'b_u6_center');
  linkNavNodes('b_mid_cross_c', 'b_u7_in', 'door_u7_well_shaft');
  linkNavNodes('b_u7_in', 'b_u7_west');
  linkNavNodes('b_u7_in', 'b_u7_east');
  linkNavNodes('b_north_u8', 'b_u8_in', 'door_u8_idols');
  linkNavNodes('b_u8_in', 'b_u8_center');
  linkNavNodes('b_north_u9', 'b_u9_in', 'door_u9_collapsed');
  linkNavNodes('b_u9_in', 'b_u9_center');
  linkNavNodes('b_north_u10', 'b_u10_in', 'door_u10_crypt');
  linkNavNodes('b_u10_in', 'b_u10_center');

  const getDoorTraversalPenalty = (
    doorId: string | undefined,
    allowClosedRoomDoors: boolean,
  ): number => {
    if (!doorId) return 0;
    const found = doors.find((d) => d.id === doorId);
    if (!found || found.archwayOnly || found.isOpen) return 0;
    if (allowClosedRoomDoors && found.isRoomDoor && found.lockedUntilRelics === 0) {
      // Witch Rukmini can route through closed unlocked room doors (and pauses 1.8s to push them open)
      return 3.5;
    }
    return Infinity;
  };

  const findNearestNavNode = (pos: THREE.Vector3): HaveliNavNode => {
    let bestClearNode: HaveliNavNode | null = null;
    let bestClearDist = Infinity;
    let bestAnyNode: HaveliNavNode = navigationNodes[0];
    let bestAnyDist = Infinity;

    for (const node of navigationNodes) {
      const dy = Math.abs(node.y - pos.y);
      // Prefer nodes on the same floor or staircase
      const floorPenalty = dy > 1.8 ? dy * 6.0 : dy * 1.2;
      const d = Math.hypot(node.x - pos.x, node.z - pos.z) + floorPenalty;
      if (d < bestAnyDist) {
        bestAnyDist = d;
        bestAnyNode = node;
      }
      if (
        dy <= 1.8 &&
        d < bestClearDist &&
        isLineOfSightClear(pos.x, pos.z, node.x, node.z, pos.y, 0.45)
      ) {
        bestClearDist = d;
        bestClearNode = node;
      }
    }

    return bestClearNode ?? bestAnyNode;
  };

  const findNavigationPath = (
    start: THREE.Vector3,
    target: THREE.Vector3,
    allowClosedRoomDoors = false,
  ): THREE.Vector3[] => {
    // If on the same floor and line-of-sight is completely clear of walls and closed doors, go directly
    if (
      Math.abs(start.y - target.y) < 0.8 &&
      isLineOfSightClear(start.x, start.z, target.x, target.z, start.y, 0.58)
    ) {
      return [target.clone()];
    }

    const startNode = findNearestNavNode(start);
    const goalNode = findNearestNavNode(target);

    const distMap = new Map<string, number>();
    const prevMap = new Map<string, string>();
    const visited = new Set<string>();

    for (const n of navigationNodes) {
      distMap.set(n.id, Infinity);
    }
    distMap.set(startNode.id, 0);

    while (visited.size < navigationNodes.length) {
      let uId: string | null = null;
      let minD = Infinity;
      for (const [id, d] of distMap.entries()) {
        if (!visited.has(id) && d < minD) {
          minD = d;
          uId = id;
        }
      }
      if (!uId || minD === Infinity) break;
      visited.add(uId);

      const neighbors = navAdjacency.get(uId) ?? [];
      for (const edge of neighbors) {
        const doorPenalty = getDoorTraversalPenalty(
          edge.doorId,
          allowClosedRoomDoors,
        );
        if (!Number.isFinite(doorPenalty)) continue; // Blocked closed/locked doors
        if (visited.has(edge.to)) continue;
        const alt = minD + edge.weight + doorPenalty;
        if (alt < (distMap.get(edge.to) ?? Infinity)) {
          distMap.set(edge.to, alt);
          prevMap.set(edge.to, uId);
        }
      }
    }

    // Choose goalNode if reachable through open doors; otherwise choose the reachable node closest to target
    let endNodeId = goalNode.id;
    if ((distMap.get(endNodeId) ?? Infinity) === Infinity) {
      let bestReachableDistToTarget = Infinity;
      for (const n of navigationNodes) {
        if ((distMap.get(n.id) ?? Infinity) < Infinity) {
          const dToTarget =
            Math.hypot(n.x - target.x, n.z - target.z) +
            Math.abs(n.y - target.y) * 3.0;
          if (dToTarget < bestReachableDistToTarget) {
            bestReachableDistToTarget = dToTarget;
            endNodeId = n.id;
          }
        }
      }
    }

    const nodeSeq: HaveliNavNode[] = [];
    let curr: string | undefined = endNodeId;
    while (curr) {
      const nodeObj = navNodeById.get(curr);
      if (nodeObj) nodeSeq.push(nodeObj);
      if (curr === startNode.id) break;
      curr = prevMap.get(curr);
    }
    nodeSeq.reverse();

    const waypoints: THREE.Vector3[] = nodeSeq.map(
      (n) => new THREE.Vector3(n.x, n.y, n.z),
    );

    // Trim leading waypoint if agent is already between waypoints[0] and waypoints[1] (prevents stair backtracking)
    while (waypoints.length >= 2) {
      const a = waypoints[0];
      const b = waypoints[1];
      const abx = b.x - a.x;
      const abz = b.z - a.z;
      const apx = start.x - a.x;
      const apz = start.z - a.z;
      const dot = abx * apx + abz * apz;
      if (
        dot > 0 &&
        Math.abs(start.y - b.y) <= 2.1 &&
        isLineOfSightClear(start.x, start.z, b.x, b.z, start.y, 0.48)
      ) {
        waypoints.shift();
      } else {
        break;
      }
    }

    const lastNode = nodeSeq[nodeSeq.length - 1];
    if (
      lastNode &&
      Math.abs(lastNode.y - target.y) < 1.2 &&
      isLineOfSightClear(
        lastNode.x,
        lastNode.z,
        target.x,
        target.z,
        target.y,
        0.52,
      )
    ) {
      waypoints.push(target.clone());
    }

    return waypoints.length > 0 ? waypoints : [start.clone()];
  };

  // ==========================================================================
  // 8C. STAGE 1 RAGE: RED BLOOD HANDPRINTS ON CORRIDOR WALLS
  // ==========================================================================
  const bloodHandprintsGroup = new THREE.Group();
  bloodHandprintsGroup.name = 'CorridorBloodHandprints';
  bloodHandprintsGroup.visible = false;
  root.add(bloodHandprintsGroup);

  const buildBloodHandprintTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Smeared palm base
      const palmGrad = ctx.createRadialGradient(64, 92, 6, 64, 94, 38);
      palmGrad.addColorStop(0, 'rgba(130, 6, 10, 0.96)');
      palmGrad.addColorStop(0.7, 'rgba(165, 10, 14, 0.88)');
      palmGrad.addColorStop(1, 'rgba(110, 0, 6, 0.0)');
      ctx.fillStyle = palmGrad;
      ctx.beginPath();
      ctx.ellipse(64, 94, 27, 30, 0.08, 0, Math.PI * 2);
      ctx.fill();

      // Five splayed crimson fingers + thumb
      const fingers = [
        { x: 34, y: 88, rx: 6, ry: 15, rot: -0.58 }, // Thumb
        { x: 43, y: 49, rx: 5.5, ry: 20, rot: -0.18 }, // Index
        { x: 59, y: 42, rx: 5.8, ry: 23, rot: -0.04 }, // Middle
        { x: 75, y: 46, rx: 5.5, ry: 21, rot: 0.1 }, // Ring
        { x: 89, y: 58, rx: 5.0, ry: 16, rot: 0.24 }, // Pinky
      ];
      for (const f of fingers) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        ctx.fillStyle = 'rgba(148, 8, 12, 0.92)';
        ctx.beginPath();
        ctx.ellipse(0, 0, f.rx, f.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Dripping blood streaks downward from palm & fingertips
      const drips = [
        { x: 44, y: 66, len: 68, w: 3.2 },
        { x: 58, y: 112, len: 42, w: 4.0 },
        { x: 72, y: 108, len: 46, w: 3.4 },
        { x: 86, y: 74, len: 52, w: 2.6 },
      ];
      for (const d of drips) {
        const g = ctx.createLinearGradient(0, d.y, 0, d.y + d.len);
        g.addColorStop(0, 'rgba(155, 10, 14, 0.9)');
        g.addColorStop(1, 'rgba(95, 2, 6, 0.0)');
        ctx.fillStyle = g;
        ctx.fillRect(d.x - d.w / 2, d.y, d.w, d.len);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  const bloodHandMat = new THREE.MeshBasicMaterial({
    map: buildBloodHandprintTexture(),
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    side: THREE.DoubleSide,
  });
  const bloodHandGeo = new THREE.PlaneGeometry(0.42, 0.54);

  const handprintPlacements: Array<{
    x: number;
    y: number;
    z: number;
    rotY: number;
    rotZ: number;
    scale: number;
  }> = [
    // Ground floor massive 38m Royal Atrium side walls (x = ±18.72) & rear wall (z = -45.72)
    { x: -18.72, y: 1.55, z: 6.2, rotY: Math.PI / 2, rotZ: -0.14, scale: 1.08 },
    { x: 18.72, y: 1.42, z: -3.5, rotY: -Math.PI / 2, rotZ: 0.18, scale: 1.0 },
    { x: -18.72, y: 1.66, z: -11.5, rotY: Math.PI / 2, rotZ: 0.22, scale: 1.12 },
    { x: 18.72, y: 1.48, z: -24.0, rotY: -Math.PI / 2, rotZ: -0.24, scale: 1.04 },
    { x: -6.5, y: 1.58, z: -45.72, rotY: 0, rotZ: -0.18, scale: 1.06 },
    { x: 6.5, y: 1.45, z: -45.72, rotY: 0, rotZ: 0.21, scale: 0.98 },
    // Second floor wrap-around balcony walls (y = 6.55)
    { x: -18.72, y: 6.55, z: -24.5, rotY: Math.PI / 2, rotZ: -0.15, scale: 1.04 },
    { x: 18.72, y: 6.62, z: -6.5, rotY: -Math.PI / 2, rotZ: 0.2, scale: 1.06 },
    { x: -18.72, y: 6.48, z: 5.5, rotY: Math.PI / 2, rotZ: 0.11, scale: 0.98 },
    // Third floor wrap-around balcony walls (y = 11.55)
    { x: -18.72, y: 11.55, z: -24.0, rotY: Math.PI / 2, rotZ: 0.16, scale: 1.05 },
    { x: 18.72, y: 11.62, z: 4.8, rotY: -Math.PI / 2, rotZ: -0.18, scale: 1.04 },
    // Underground basement hallway walls (x = ±2.72, y = -2.95, shifted -12m Z)
    { x: -2.72, y: -2.95, z: -48.5, rotY: Math.PI / 2, rotZ: -0.12, scale: 1.05 },
    { x: 2.72, y: -2.88, z: -53.5, rotY: -Math.PI / 2, rotZ: 0.19, scale: 1.02 },
  ];

  for (const hp of handprintPlacements) {
    const decal = new THREE.Mesh(bloodHandGeo, bloodHandMat);
    decal.position.set(hp.x, hp.y, hp.z);
    decal.rotation.set(0, hp.rotY, hp.rotZ);
    decal.scale.setScalar(hp.scale);
    bloodHandprintsGroup.add(decal);
  }

  const setBloodHandprintsVisible = (visible: boolean) => {
    bloodHandprintsGroup.visible = visible;
  };

  // ==========================================================================
  // 9. ATMOSPHERE UPDATE LOOP & BLACKOUT TRAP CONTROLLER
  // ==========================================================================
  let redLightningTimer = 0;
  let isBlackout = false;
  let lightLevelMultiplier = 1.0;

  const triggerRedLightningFlash = (duration = 1.45) => {
    redLightningTimer = Math.max(redLightningTimer, duration);
  };

  const setLightBudgetMode = (minimal: boolean) => {
    lowLightBudgetMode = minimal;
    for (let i = 0; i < decorativeDynamicLights.length; i++) {
      decorativeDynamicLights[i].visible = !minimal;
    }
    if (minimal) {
      for (const fl of flickeringLights) {
        if (fl.light) {
          fl.light.visible = false;
        }
      }
    }
  };

  const setLightLevelMultiplier = (multiplier: number) => {
    lightLevelMultiplier = Math.max(0, Math.min(1, multiplier));
    isBlackout = lightLevelMultiplier <= 0.02;
    for (const fl of flickeringLights) {
      if (fl.light) {
        fl.light.visible = !lowLightBudgetMode && lightLevelMultiplier > 0.01;
        fl.light.intensity = fl.baseIntensity * lightLevelMultiplier;
      }
      if (fl.flameMesh) {
        fl.flameMesh.visible = lightLevelMultiplier > 0.05;
      }
    }
    if (wellFireLight) {
      wellFireLight.intensity = 3.4 * lightLevelMultiplier;
    }
  };

  const setBlackoutMode = (active: boolean) => {
    setLightLevelMultiplier(active ? 0.0 : 1.0);
  };

  const _warmDipColor = new THREE.Color(0xff842c);
  const _warmCrestColor = new THREE.Color(0xffd68e);
  const _baseFlickerColor = new THREE.Color();

  const updateAtmosphere = (
    elapsed: number,
    dt: number,
    witchProximity: number,
    playerLocalPos: THREE.Vector3,
    onCreakSound?: () => void,
    onThunderSound?: (outdoorFactor?: number) => void,
    rageStage = 0,
    witchDistToPlayer = 999,
    flashlightState?: {
      origin: THREE.Vector3;
      dir: THREE.Vector3;
      intensity: number;
    },
  ): number => {
    // Rotate the antique-gold Mansion Front Door Key & update its 8m proximity glow + rising sparks
    if (mansionKeyGroup.visible) {
      mansionKeyGroup.rotation.y = elapsed * 1.8;
    }
    masterKeyGlow.update(
      elapsed,
      dt,
      playerLocalPos,
      mansionKeyGroup.position,
      mansionKeyGroup.visible,
    );

    // Rotate & gently bob the glowing golden Well Courtyard Escape Key when spawned on respawn
    if (wellCourtyardKeyGroup.visible) {
      wellCourtyardKeyGroup.rotation.y = elapsed * 2.15;
      wellCourtyardKeyGroup.position.y =
        WELL_KEY_BASE_Y + Math.sin(elapsed * 2.8) * 0.055;
      if (wkGlowLight) {
        wkGlowLight.intensity = 1.15 + Math.sin(elapsed * 3.6) * 0.35;
      }
    }
    wellCourtyardKeyGlow.update(
      elapsed,
      dt,
      playerLocalPos,
      wellCourtyardKeyGroup.position,
      wellCourtyardKeyGroup.visible,
    );

    // 1. Smoothly animate doors over 0.45 seconds around their hinge & update openProgress + rattle
    for (const d of doors) {
      if (d.archwayOnly) continue;
      const desiredAngle = d.isOpen ? d.openAngle : d.closedAngle;
      if (Math.abs(desiredAngle - d.animToAngle) > 0.002) {
        setDoorOpen(d, d.isOpen, 0.45);
      }

      if (d.isAnimating) {
        d.animElapsed += dt;
        const rawT = Math.min(1, d.animElapsed / Math.max(0.05, d.animDuration));
        const easedT =
          rawT < 0.5
            ? 4 * rawT * rawT * rawT
            : 1 - Math.pow(-2 * rawT + 2, 3) / 2;
        d.currentAngle = THREE.MathUtils.lerp(
          d.animFromAngle,
          d.animToAngle,
          easedT,
        );
        if (rawT >= 1) {
          d.currentAngle = d.animToAngle;
          d.isAnimating = false;
        }
      } else {
        d.currentAngle = desiredAngle;
      }

      const angleSpan = d.openAngle - d.closedAngle;
      d.openProgress =
        Math.abs(angleSpan) > 1e-4
          ? THREE.MathUtils.clamp(
              (d.currentAngle - d.closedAngle) / angleSpan,
              0,
              1,
            )
          : d.isOpen
            ? 1
            : 0;

      d.pivot.rotation.y = d.currentAngle + d.rattleOffset;
      if (Math.abs(d.rattleOffset) > 0.0005) {
        d.rattleOffset = THREE.MathUtils.damp(d.rattleOffset, 0, 14, dt);
      } else {
        d.rattleOffset = 0;
      }

      if (d.autoCreak && d.lockedUntilRelics === 0 && elapsed > d.nextAutoCreakTime) {
        d.nextAutoCreakTime = elapsed + 14 + Math.random() * 18;
        const dist = d.position.distanceTo(playerLocalPos);
        if (dist < 14 || witchProximity > 0.35) {
          setDoorOpen(d, !d.isOpen, 0.45);
          onCreakSound?.();
        }
      }
    }

    // 2. Keep all lanterns & torches scaled by active lightLevelMultiplier (0 during 3.5s blackout, 1.0 normally)
    //    At Stage 2+ (2/4+ burned), Haveli lights violently flicker red whenever Rukmini is within 18m
    const redFlickerActive =
      rageStage >= 2 &&
      rageStage < 4 &&
      witchDistToPlayer <= 18.0 &&
      !isBlackout;
    const redFlickerPulse = redFlickerActive
      ? 0.5 +
        0.5 *
          Math.sin(elapsed * 26.0 + Math.cos(elapsed * 17.0)) *
          Math.cos(elapsed * 39.0)
      : 0;
    const flickerViolence = redFlickerActive
      ? 2.4 + (1 - witchDistToPlayer / 18.0) * 1.6
      : 1.0 + witchProximity * 0.5;
    let nearestIdx1 = -1;
    let nearestDist1 = 196; // 14m^2
    let nearestIdx2 = -1;
    let nearestDist2 = 196;
    if (lowLightBudgetMode && lightLevelMultiplier > 0.01) {
      root.getWorldPosition(_rootWorldPos);
      for (let li = 0; li < flickeringLights.length; li++) {
        const l = flickeringLights[li].light;
        if (!l) continue;
        l.getWorldPosition(_flWorldPos).sub(_rootWorldPos);
        const dSq = _flWorldPos.distanceToSquared(playerLocalPos);
        if (dSq < nearestDist1) {
          nearestDist2 = nearestDist1;
          nearestIdx2 = nearestIdx1;
          nearestDist1 = dSq;
          nearestIdx1 = li;
        } else if (dSq < nearestDist2) {
          nearestDist2 = dSq;
          nearestIdx2 = li;
        }
      }
    }

    for (let li = 0; li < flickeringLights.length; li++) {
      const fl = flickeringLights[li];
      const lightAllowed =
        lightLevelMultiplier > 0.01 &&
        (!lowLightBudgetMode || li === nearestIdx1 || li === nearestIdx2);
      if (fl.light) fl.light.visible = lightAllowed;
      if (fl.flameMesh) fl.flameMesh.visible = lightLevelMultiplier > 0.05;
      // Organic multi-harmonic flame flicker (gentle draft sway + medium fire breath + delicate tip flutter)
      const slowDraft = Math.sin(elapsed * 2.15 + fl.phase);
      const medBreath = Math.sin(elapsed * 5.8 * flickerViolence + fl.phase * 1.43);
      const tipFlutter = Math.cos(elapsed * 13.7 * flickerViolence + fl.phase * 2.17);
      const draftDip = Math.pow(0.5 + 0.5 * Math.sin(elapsed * 1.15 + fl.phase * 0.77), 4);
      // Keeps rooms eerie & moody (>= 0.78x base) without ever going pitch-black
      const normalMul =
        0.95 +
        slowDraft * 0.075 +
        medBreath * 0.065 +
        tipFlutter * 0.035 -
        draftDip * 0.095;
      const mul = redFlickerActive
        ? 0.35 + Math.abs(medBreath * tipFlutter) * 0.95
        : THREE.MathUtils.clamp(normalMul, 0.78, 1.12);
      if (fl.light && lightAllowed) {
        if (redFlickerActive) {
          fl.light.color.setHex(redFlickerPulse > 0.35 ? 0xff1111 : fl.baseColor);
          fl.light.intensity = fl.baseIntensity * mul * lightLevelMultiplier * 1.5;
        } else {
          const tempT = THREE.MathUtils.clamp((mul - 0.78) / 0.34, 0, 1);
          _baseFlickerColor.setHex(fl.baseColor);
          fl.light.color
            .copy(_warmDipColor)
            .lerp(_warmCrestColor, tempT)
            .lerp(_baseFlickerColor, 0.38);
          fl.light.intensity = fl.baseIntensity * mul * lightLevelMultiplier;
        }
      }
      if (fl.flameMesh) {
        const fMat = fl.flameMesh.material as THREE.MeshBasicMaterial | undefined;
        if (fMat && fMat.color) {
          if (redFlickerActive) {
            fMat.color.setHex(
              Math.sin(elapsed * 29 + fl.phase) > -0.25 ? 0xff0d0d : 0xff6622,
            );
          } else {
            fMat.color.setHex(fl.baseColor);
          }
        }
        fl.flameMesh.scale.set(
          0.93 + tipFlutter * (redFlickerActive ? 0.25 : 0.11),
          0.92 +
            (medBreath * (redFlickerActive ? 0.32 : 0.14) +
              tipFlutter * 0.08 -
              draftDip * 0.08),
          0.93 + medBreath * (redFlickerActive ? 0.25 : 0.11),
        );
        fl.flameMesh.rotation.z = slowDraft * 0.09 + medBreath * 0.07;
      }
    }

    // Subtle draft sway on the Grand Atrium Chandelier
    if (grandChandelierGroup) {
      grandChandelierGroup.rotation.z = Math.sin(elapsed * 0.42) * 0.012;
      grandChandelierGroup.rotation.x = Math.cos(elapsed * 0.31) * 0.008;
    }

    // 2A. Animate the Cursed Well's real GLSL fire flames, floating hot embers, glowing coal bed, swirling dark mist & hanging chain sway
    wellFireUniforms.uTime.value = elapsed;
    wellEmberUniforms.uTime.value = elapsed;
    wellMistUniforms.uTime.value = elapsed;
    const wellFlicker =
      0.88 +
      Math.sin(elapsed * 7.4) * 0.12 +
      Math.cos(elapsed * 13.8) * 0.08 +
      Math.sin(elapsed * 21.5) * 0.05;
    wellFireUniforms.uIntensity.value =
      THREE.MathUtils.clamp(wellFlicker, 0.72, 1.24) *
      Math.max(0.28, lightLevelMultiplier);
    wellCoalBedMat.emissiveIntensity =
      (2.15 + Math.sin(elapsed * 3.6) * 0.42 + Math.cos(elapsed * 8.1) * 0.18) *
      Math.max(0.35, lightLevelMultiplier);
    glowingCoalChunkMat.emissiveIntensity =
      (1.42 + Math.sin(elapsed * 4.1 + 1.1) * 0.34) *
      Math.max(0.35, lightLevelMultiplier);
    hangingChainGroup.rotation.z = Math.sin(elapsed * 1.15) * 0.032;
    hangingChainGroup.rotation.x = Math.cos(elapsed * 0.92) * 0.022;
    pulleyWheel.rotation.z = Math.sin(elapsed * 0.85) * 0.06;
    // Preserve high-intensity relic-burn blaze flare (~11.0) and smoothly decay back to crackling firelight
    const targetWellLightIntensity = 3.5 * wellFlicker * Math.max(0.2, lightLevelMultiplier);
    if (wellFireLight) {
      if (wellFireLight.intensity > targetWellLightIntensity + 0.65) {
        wellFireLight.intensity = THREE.MathUtils.damp(
          wellFireLight.intensity,
          targetWellLightIntensity,
          2.6,
          dt,
        );
      } else {
        wellFireLight.intensity = targetWellLightIntensity;
      }
    }

    // 2B. Slowly drift the 3D moonlit storm clouds & midnight sky dome overhead
    skyDomeMesh.rotation.y = elapsed * 0.004;
    for (let i = 0; i < stormCloudLayers.length; i++) {
      const cl = stormCloudLayers[i];
      cl.position.x += Math.sin(elapsed * 0.08 + i) * dt * 0.35;
      cl.rotation.z += dt * 0.008 * (i % 2 === 0 ? 1 : -1);
    }

    // 2C. Update 3D Storm Weather System (outdoor rain streaks, wind gusts, tree/bush/lantern sway & 8-18s double-flash lightning)
    const storm = stormWeather.update(elapsed, dt, playerLocalPos, {
      sunriseProgress: currentSunriseProgress,
      onThunderBoom: (outdoorFactor) => onThunderSound?.(outdoorFactor),
    });

    // 3. Sway torn curtains & Shiva Temple saffron banner dynamically with live storm wind gusts
    const gustAmp = 0.72 + storm.windGust * 0.85;
    for (let i = 0; i < swayingCurtains.length; i++) {
      const c = swayingCurtains[i];
      c.rotation.x = Math.sin(elapsed * 1.9 + i * 1.1) * 0.16 * gustAmp;
      c.rotation.z = Math.cos(elapsed * 1.45 + i) * 0.08 * gustAmp;
    }

    // Flutter the Shiva Temple saffron banner briskly in the storm wind
    shivaTempleFlag.rotation.y =
      Math.sin(elapsed * 4.4) * 0.24 * gustAmp +
      Math.sin(elapsed * 9.2) * 0.08 * storm.windGust;

    // Animate Flowing Courtyard Fountain: shimmering water surface, expanding splash rings & rising/falling spray streams (फुहारा)
    fountainWaterTex.rotation = elapsed * 0.28;
    fountainWaterTex.center.set(0.5, 0.5);
    fountainWaterMat.emissiveIntensity = 0.48 + Math.sin(elapsed * 2.6) * 0.1;
    fountainVeilMat.opacity = 0.23 + Math.sin(elapsed * 4.2) * 0.05;
    if (fountainGlowLight) {
      fountainGlowLight.intensity = 1.45 + Math.sin(elapsed * 3.3) * 0.22;
    }
    for (let ri = 0; ri < fountainRippleRings.length; ri++) {
      const rp = (elapsed * 0.55 + ri / fountainRippleRings.length) % 1;
      const ring = fountainRippleRings[ri];
      const sc = 1.0 + rp * 6.4;
      ring.scale.setScalar(sc);
      const rMat = ring.material as THREE.MeshBasicMaterial;
      rMat.opacity = Math.sin(rp * Math.PI) * 0.42;
    }
    const posAttr = fountainParticleGeo.attributes.position as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;
    for (let pi = 0; pi < FOUNTAIN_PARTICLE_COUNT; pi++) {
      const phase0 = fountainParticleMeta[pi * 4 + 0];
      const angle = fountainParticleMeta[pi * 4 + 1];
      const tier = fountainParticleMeta[pi * 4 + 2];
      const speed = fountainParticleMeta[pi * 4 + 3];
      const u = (phase0 + elapsed * speed) % 1;
      let px = 0;
      let py = 3.25;
      let pz = 0;
      if (tier === 0) {
        // Central sparkling plume shooting up from top nozzle (y=3.26 -> peak ~4.32 -> splash down at 1.98)
        const r = u * 0.42;
        px = Math.cos(angle) * r;
        pz = Math.sin(angle) * r;
        py = 3.26 + 3.65 * u - 4.93 * u * u;
      } else if (tier === 1) {
        // 8 graceful parabolic streams arcing from top nozzle (y=3.26) into upper lotus bowl (r~0.98, y=1.98)
        const r = 0.05 + u * 0.94;
        px = Math.cos(angle) * r;
        pz = Math.sin(angle) * r;
        py = 3.26 + 2.35 * u - 3.63 * u * u;
      } else {
        // 12 spilling waterfall arcs pouring over the upper bowl rim (r=1.14, y=1.98) into lower basin (r~1.72, y=0.62)
        const r = 1.14 + u * 0.58;
        px = Math.cos(angle) * r;
        pz = Math.sin(angle) * r;
        py = 1.98 + 0.36 * u - 1.72 * u * u;
      }
      posArr[pi * 3 + 0] = px;
      posArr[pi * 3 + 1] = py;
      posArr[pi * 3 + 2] = pz;
    }
    posAttr.needsUpdate = true;

    // 4. Rock the Dusty Nursery cradle gently on its own & animate Hiding Spots (lids, doors, rotating Deewan wall panel, clock pendulum)
    if (nurseryCradle) {
      nurseryCradle.rotation.z = Math.sin(elapsed * 2.1) * 0.12;
    }

    for (const spot of hidingSpots) {
      if (spot.pendulumMesh) {
        spot.pendulumMesh.rotation.z = Math.sin(elapsed * 3.2) * 0.24;
      }
      if (spot.openPulse > 0) {
        spot.openPulse = Math.max(0, spot.openPulse - dt * 1.85);
      }
      // Swings open during enter/exit transition, then closes to a subtle peek crack (0.06) while occupied
      const pulseCurve =
        spot.openPulse > 0 ? Math.sin(spot.openPulse * Math.PI) * 0.88 : 0;
      const baseCrack = spot.isOccupied ? 0.06 : 0.0;
      const openFactor = Math.max(baseCrack, pulseCurve);

      if (spot.animType === 'lid_x') {
        spot.doorPivot.rotation.x = THREE.MathUtils.lerp(
          spot.doorPivot.rotation.x,
          -openFactor * 1.15,
          Math.min(1, dt * 9),
        );
      } else if (spot.animType === 'door_y') {
        spot.doorPivot.rotation.y = THREE.MathUtils.lerp(
          spot.doorPivot.rotation.y,
          openFactor * 1.35,
          Math.min(1, dt * 9),
        );
      } else if (spot.animType === 'panel_rotate') {
        spot.doorPivot.rotation.y = THREE.MathUtils.lerp(
          spot.doorPivot.rotation.y,
          openFactor * 1.45,
          Math.min(1, dt * 9),
        );
      } else if (spot.animType === 'curtain_scale') {
        const leftDrape = spot.doorPivot.children[0];
        const rightDrape = spot.doorPivot.children[1];
        const partOffset = spot.isOccupied
          ? Math.max(0.26, pulseCurve * 0.65)
          : pulseCurve * 0.65;
        if (leftDrape && rightDrape) {
          leftDrape.position.x = THREE.MathUtils.lerp(
            leftDrape.position.x,
            -0.48 - partOffset,
            Math.min(1, dt * 9),
          );
          rightDrape.position.x = THREE.MathUtils.lerp(
            rightDrape.position.x,
            0.48 + partOffset,
            Math.min(1, dt * 9),
          );
        }
      }
    }

    // 5. Basement dripping water particles (y = -0.55 down to -4.45)
    for (let i = 0; i < dripParticles.length; i++) {
      const drop = dripParticles[i];
      drop.position.y -= dt * (1.8 + (i % 3) * 0.4);
      if (drop.position.y < -4.45) {
        drop.position.y = -0.55;
      }
    }

    // 6. GPU floating dust motes catching flashlight beam + exterior mist & SUV bonnet steam
    indoorDustMotes.update(
      elapsed,
      flashlightState?.origin,
      flashlightState?.dir,
      flashlightState?.intensity ?? 0,
    );

    for (let i = 0; i < exteriorMistPatches.length; i++) {
      const em = exteriorMistPatches[i];
      em.mesh.position.x = em.baseX + Math.sin(elapsed * 0.18 + em.phase) * 0.85;
      em.mesh.position.z = em.baseZ + Math.cos(elapsed * 0.15 + em.phase) * 0.75;
    }

    for (let i = 0; i < bonnetSteamParticles.length; i++) {
      const sp = bonnetSteamParticles[i];
      const life = (elapsed * sp.speed + sp.phase) % 1;
      const swayX = Math.sin(elapsed * 1.45 + i * 1.7) * (0.06 + life * 0.24);
      const swayZ = Math.cos(elapsed * 1.2 + i * 1.3) * (0.04 + life * 0.16);
      sp.sprite.position.set(
        sp.baseX + sp.driftX * life * 2.1 + swayX,
        1.04 + life * 2.05,
        sp.baseZ + sp.driftZ * life * 1.9 + swayZ,
      );
      const sScale = THREE.MathUtils.lerp(sp.baseScale, sp.maxScale, life);
      sp.sprite.scale.set(sScale, sScale * 0.92, 1);
      sp.mat.rotation = sp.baseRot + elapsed * sp.rotSpeed;
      // Smooth fade-in near radiator and seamless fade-out overhead
      const fadeIn = Math.min(1, life * 4.2);
      const fadeOut = Math.pow(Math.max(0, 1 - life), 1.45);
      sp.mat.opacity = fadeIn * fadeOut * 0.38;
    }

    // 6B. Broken-down SUV blinking 4-way amber hazard warning lights (~1.32 Hz crisp flasher rhythm)
    const hazardCycle = elapsed % 0.76;
    const hazardPulse =
      hazardCycle < 0.05
        ? hazardCycle / 0.05
        : hazardCycle < 0.36
          ? 1.0
          : hazardCycle < 0.43
            ? 1.0 - (hazardCycle - 0.36) / 0.07
            : 0.0;
    if (suvHazardLensMat) {
      suvHazardLensMat.emissiveIntensity = hazardPulse * 5.8;
    }
    if (suvHazardFrontLight) {
      suvHazardFrontLight.intensity = hazardPulse * 4.4;
    }
    if (suvHazardRearLight) {
      suvHazardRearLight.intensity = hazardPulse * 3.8;
    }
    for (let i = 0; i < suvHazardGlowMats.length; i++) {
      suvHazardGlowMats[i].opacity = hazardPulse * 0.85;
    }

    // 6C. Subtle eerie pulsing warm/reddish glow behind upper-floor Haveli windows
    for (let i = 0; i < eerieUpperWindowGlows.length; i++) {
      const ew = eerieUpperWindowGlows[i];
      const wave =
        0.84 +
        Math.sin(elapsed * 1.9 + ew.phase) * 0.11 +
        Math.sin(elapsed * 4.7 + ew.phase * 1.7) * 0.05;
      ew.paneMat.emissiveIntensity = ew.baseEmissive * wave;
      ew.haloMat.opacity = ew.baseOpacity * wave;
    }

    // 7. Storm Double-Flash Lightning (8-18s natural strikes) + Red Curse Lightning Flashes on Relic Burn
    // Capped cleanly at <= 2.2 intensity and reset immediately so mobile WebGL never washes out white.
    let flashFactor = 0;
    if (redLightningTimer > 0) {
      redLightningTimer = Math.max(0, redLightningTimer - dt);
      const redEnv = Math.min(1, redLightningTimer / 0.35);
      const redStrike =
        Math.sin(redLightningTimer * 38) > -0.15 ? 1.0 : 0.35;
      const redFlash = redEnv * redStrike;
      if (lightningLight) {
        lightningLight.color.setHex(0xff1420);
        lightningLight.intensity = Math.min(2.2, redFlash * 2.2);
      }
      flashFactor = Math.max(flashFactor, redFlash);
    } else if (storm.lightningFlash > 0.005) {
      flashFactor = storm.lightningFlash;
      if (lightningLight) {
        const strikeDist = 42;
        lightningLight.position.set(
          Math.cos(storm.strikeAzimuth) * strikeDist,
          40,
          Math.sin(storm.strikeAzimuth) * strikeDist,
        );
        lightningLight.color.setHex(0xd6ebff);
        const dirScale = storm.isBasement ? 0.12 : storm.isOutdoors ? 2.2 : 1.15;
        lightningLight.intensity = isBlackout
          ? Math.min(2.2, flashFactor * 0.45)
          : Math.min(2.2, flashFactor * dirScale);
      }
    } else if (lightningLight) {
      lightningLight.color.setHex(0xd6ebff);
      lightningLight.intensity = 0;
    }

    // Shine lightning briefly through interior Haveli Jali windows
    const winFlashOpacity =
      !isBlackout && redLightningTimer <= 0 && storm.lightningFlash > 0.01
        ? Math.min(0.36, storm.lightningFlash * 0.36)
        : redLightningTimer > 0
          ? Math.min(0.34, flashFactor * 0.34)
          : 0;
    const winFlashHex = redLightningTimer > 0 ? 0xff4048 : 0xcce6ff;
    for (let i = 0; i < windowLightningMats.length; i++) {
      windowLightningMats[i].color.setHex(winFlashHex);
      windowLightningMats[i].opacity = winFlashOpacity;
    }

    return flashFactor;
  };

  return {
    root,
    wellGroup,
    centralCourtyardWell,
    wellFireLight,
    wellInnerFlames,
    wellSmokeParticles,
    lanterns,
    flickeringLights,
    doors,
    hidingSpots,
    hauntedMirrors,
    banglePatches,
    roomZones,
    wallColliders,
    navigationNodes,
    swayingCurtains,
    watchingEyes,
    nurseryCradle,
    dustPoints,
    dripParticles,
    lightningLight,
    guardhouseGroup,
    mansionKeyGroup,
    wellCourtyardKeyGroup,
    setBlackoutMode,
    setLightLevelMultiplier,
    triggerRedLightningFlash,
    setBloodHandprintsVisible,
    setSunriseProgress,
    setLightBudgetMode,
    setWeatherQuality: (quality: WeatherGraphicsQuality) => {
      stormWeather.setQuality(quality);
      setLightBudgetMode(quality === 'low');
    },
    isPlayerOutdoors: (playerLocalPos: THREE.Vector3) =>
      stormWeather.isPlayerOutdoors(playerLocalPos),
    sampleRainAcoustics: (
      playerLocalPos: THREE.Vector3,
      camForward: THREE.Vector3,
      camRight: THREE.Vector3,
    ) => stormWeather.sampleRainAcoustics(playerLocalPos, camForward, camRight),
    stormWeather,
    getElevationAt,
    getRoomAt,
    resolveCollision,
    isLineOfSightClear,
    setDoorOpen,
    findNavigationPath,
    updateAtmosphere,
  };
}

/**
 * Builds the 3D Rukmini (Rakt-Pishachini) entity using the articulated humanoid rig:
 * - Tattered crimson bridal Banarasi saree with gold zari border (zero cones!)
 * - Backward-turned feet (उल्टे पाँव) & silver ghungroo payal anklets
 * - Long black hair hanging over her face & glowing red eyes
 */
export function buildRukminiWitch(): {
  group: THREE.Group;
  headGroup: THREE.Group;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  auraLight: THREE.PointLight;
} {
  const rukmini = createRukmini();
  const fallbackEye = new THREE.Mesh(
    new THREE.SphereGeometry(0.018, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xff1111 }),
  );
  const fallbackLight = new THREE.PointLight(0xff0022, 2.5, 6.5);
  return {
    group: rukmini.root,
    headGroup: rukmini.headGroup,
    leftEye: rukmini.leftEye ?? fallbackEye,
    rightEye: rukmini.rightEye ?? fallbackEye,
    auraLight: rukmini.auraLight ?? fallbackLight,
  };
}

/**
 * Spawns the 4 cursed wedding relics (सुहाग की 4 निशानियाँ) across all 4 Haveli levels
 * so the player explores the Underground Basement, Ground Floor, Second Floor, and Third Floor:
 * 0: टूटी चूड़ियाँ (Broken Bangles) — Basement Room U2: Tantrik Havan Chamber (तांत्रिक हवन कक्ष)
 * 1: सिंदूर की डिब्बी (Sindoor Box) — Ground Floor Room G3: Munim Record Room (मुनीम बही-खाता कक्ष)
 * 2: शापित पायल (Rusty Payal) — Second Floor Room F2-1: Rukmini's Bridal Room (सुहाग कक्ष)
 * 3: लाल चुनरी (Red Bridal Chunri) — Third Floor Room F3-2: Aaina Mahal (आईना महल)
 */
export const RELIC_ROOM_RESPAWN_SPOTS: readonly RelicRoomRespawnSpot[] = [
  // Ground Floor (6 Side Rooms, floorY = 0.0 -> relic y = 0.95)
  { roomId: 'gf_g1_shastragar', roomNameHi: 'G1: शाही शस्त्रागार (Ground Floor)', x: -24.0, y: 0.95, z: 0.75 },
  { roomId: 'gf_g2_kitchen', roomNameHi: 'G2: पुरानी रसोई और अन्न-कोठी (Ground Floor)', x: -24.0, y: 0.95, z: -18.0 },
  { roomId: 'gf_g5_baithak', roomNameHi: 'G5: मेहमान बैठक (Ground Floor)', x: -24.0, y: 0.95, z: -36.75 },
  { roomId: 'gf_g3_munim', roomNameHi: 'G3: मुनीम बही-खाता कक्ष (Ground Floor)', x: 24.0, y: 0.95, z: 0.75 },
  { roomId: 'gf_g4_pooja', roomNameHi: 'G4: प्राचीन पूजा घर (Ground Floor)', x: 24.0, y: 0.95, z: -18.0 },
  { roomId: 'gf_g6_sevak', roomNameHi: 'G6: सेवक कक्ष (Ground Floor)', x: 24.0, y: 0.95, z: -36.75 },
  // Second Floor (8 Rooms, floorY = 5.0 -> relic y = 5.95)
  { roomId: 'f2_1_bridal', roomNameHi: '2F-1: रुक्मिणी का सुहाग कक्ष (Second Floor)', x: 24.0, y: 5.95, z: 0.75 },
  { roomId: 'f2_5_rani_shringar', roomNameHi: '2F-5: रानी का श्रृंगार कक्ष (Second Floor)', x: 24.0, y: 5.95, z: -18.0 },
  { roomId: 'f2_3_guest1', roomNameHi: '2F-3: अतिथि कक्ष १ (Second Floor)', x: 24.0, y: 5.95, z: -36.75 },
  { roomId: 'f2_2_master_bed', roomNameHi: '2F-2: ठाकुर साहब का शयनकक्ष (Second Floor)', x: -24.0, y: 5.95, z: 0.75 },
  { roomId: 'f2_6_royal_dining', roomNameHi: '2F-6: शाही भोजशाला (Second Floor)', x: -24.0, y: 5.95, z: -18.0 },
  { roomId: 'f2_4_sangeet', roomNameHi: '2F-4: संगीत और झरोखा हॉल (Second Floor)', x: -24.0, y: 5.95, z: -36.75 },
  { roomId: 'f2_7_guest2', roomNameHi: '2F-7: अतिथि कक्ष २ (Second Floor)', x: -8.5, y: 5.95, z: 7.9 },
  { roomId: 'f2_8_portrait_gallery', roomNameHi: '2F-8: पूर्वज चित्र वीथिका (Second Floor)', x: 8.5, y: 5.95, z: 7.9 },
  // Third Floor (8 Rooms, floorY = 10.0 -> relic y = 10.95)
  { roomId: 'f3_1_library', roomNameHi: '3F-1: तांत्रिक ग्रंथ पुस्तकालय (Third Floor)', x: -24.0, y: 10.95, z: 0.75 },
  { roomId: 'f3_5_jyotish', roomNameHi: '3F-5: ज्योतिष एवं नक्षत्र कक्ष (Third Floor)', x: -24.0, y: 10.95, z: -18.0 },
  { roomId: 'f3_3_attic1', roomNameHi: '3F-3: अटारी भंडार १ (Third Floor)', x: -24.0, y: 10.95, z: -36.75 },
  { roomId: 'f3_2_aaina', roomNameHi: '3F-2: आईना महल (Third Floor)', x: 24.0, y: 10.95, z: 0.75 },
  { roomId: 'f3_6_doll_room', roomNameHi: '3F-6: पुरानी गुड़िया कक्ष (Third Floor)', x: 24.0, y: 10.95, z: -18.0 },
  { roomId: 'f3_4_barsati', roomNameHi: '3F-4: बरसाती छत मंडप कक्ष (Third Floor)', x: 24.0, y: 10.95, z: -36.75 },
  { roomId: 'f3_7_attic2', roomNameHi: '3F-7: अटारी भंडार २ (Third Floor)', x: -8.5, y: 10.95, z: 7.9 },
  { roomId: 'f3_8_watchtower', roomNameHi: '3F-8: अग्र बुर्ज प्रहरी कक्ष (Third Floor)', x: 8.5, y: 10.95, z: 7.9 },
  // 10-Room Underground Basement Labyrinth (U1–U10, floorY = -4.5 -> relic y = -3.55, shifted -12m Z)
  { roomId: 'basement_u1_kalkothri', roomNameHi: 'U1: काल-कोठरी 1 (Basement)', x: -8.0, y: -3.55, z: -47.0 },
  { roomId: 'basement_u2_kalkothri2', roomNameHi: 'U2: काल-कोठरी 2 (Basement)', x: -22.5, y: -3.55, z: -47.0 },
  { roomId: 'basement_u3_havan', roomNameHi: 'U3: तांत्रिक हवन कक्ष (Basement)', x: 10.0, y: -3.55, z: -47.5 },
  { roomId: 'basement_u4_vault', roomNameHi: 'U4: गुप्त खज़ाना तिजोरी (Basement)', x: 20.5, y: -3.55, z: -61.0 },
  { roomId: 'basement_u5_cellar', roomNameHi: 'U5: पुराना तेल व अनाज भंडार (Basement)', x: 22.5, y: -3.55, z: -47.0 },
  { roomId: 'basement_u6_torture', roomNameHi: 'U6: ज़ंजीर व यातना कक्ष (Basement)', x: -20.0, y: -3.55, z: -58.8 },
  { roomId: 'basement_u7_well_shaft', roomNameHi: 'U7: कुएं की निचली सुरंग (Basement)', x: -4.5, y: -3.55, z: -61.0 },
  { roomId: 'basement_u8_idols', roomNameHi: 'U8: टूटी मूर्तियों का कक्ष (Basement)', x: -18.5, y: -3.55, z: -75.0 },
  { roomId: 'basement_u9_collapsed', roomNameHi: 'U9: धंसी हुई सुरंग (Basement)', x: -4.5, y: -3.55, z: -74.5 },
  { roomId: 'basement_u10_crypt', roomNameHi: 'U10: प्राचीन अस्थि कक्ष (Basement)', x: 9.0, y: -3.55, z: -74.5 },
];

export function createCursedRelics(parent: THREE.Object3D): RelicInstance[] {
  const specs = [
    {
      name: 'Broken Bangles',
      hindiName: 'टूटी चूड़ियाँ (Broken Bangles)',
      roomId: 'basement_u3_havan',
      roomNameHi: 'तांत्रिक हवन कक्ष (Basement U3)',
      pos: new THREE.Vector3(10.0, -3.55, -47.5),
      color: 0xff1a1a,
    },
    {
      name: 'Sindoor Box',
      hindiName: 'सिंदूर की डिब्बी (Sindoor Box)',
      roomId: 'gf_g3_munim',
      roomNameHi: 'मुनीम बही-खाता कक्ष (Ground Floor G3)',
      pos: new THREE.Vector3(24.0, 0.95, 0.75),
      color: 0xff4400,
    },
    {
      name: 'Rusty Payal',
      hindiName: 'शापित पायल (Cursed Anklet)',
      roomId: 'f2_1_bridal',
      roomNameHi: 'रुक्मिणी का सुहाग कक्ष (Second Floor 2F-1)',
      pos: new THREE.Vector3(24.0, 5.95, 0.75),
      color: 0xffbb33,
    },
    {
      name: 'Red Bridal Chunri',
      hindiName: 'लाल चुनरी (Bridal Veil)',
      roomId: 'f3_2_aaina',
      roomNameHi: 'आईना महल (Third Floor 3F-2)',
      pos: new THREE.Vector3(24.0, 10.95, 0.75),
      color: 0xff0a3c,
    },
  ];

  return specs.map((spec, index) => {
    const group = new THREE.Group();
    group.name = `Relic_${index}_${spec.name}`;
    group.position.copy(spec.pos);

    const mat = new THREE.MeshStandardMaterial({
      color: spec.color,
      emissive: spec.color,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.75,
    });

    const glowTargetMaterials: THREE.MeshStandardMaterial[] = [mat];

    if (index === 0) {
      // Broken glass bangles
      const ring1 = new THREE.Mesh(
        new THREE.TorusGeometry(0.18, 0.028, 12, 24),
        mat,
      );
      const ring2 = new THREE.Mesh(
        new THREE.TorusGeometry(0.15, 0.022, 12, 24),
        mat,
      );
      ring2.rotation.y = 0.8;
      group.add(ring1, ring2);
    } else if (index === 1) {
      // Ornate Sindoor Dibbi
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.17, 0.14, 0.17, 18),
        mat,
      );
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
        mat,
      );
      dome.position.y = 0.085;
      group.add(base, dome);
    } else if (index === 2) {
      // Heavy Ghungroo Payal
      const anklet = new THREE.Mesh(
        new THREE.TorusGeometry(0.19, 0.032, 12, 24),
        mat,
      );
      anklet.rotation.x = Math.PI / 3;
      group.add(anklet);
      for (let b = 0; b < 8; b++) {
        const bell = new THREE.Mesh(
          new THREE.SphereGeometry(0.035, 8, 8),
          mat,
        );
        const a = (b / 8) * Math.PI * 2;
        bell.position.set(Math.cos(a) * 0.19, 0, Math.sin(a) * 0.19);
        anklet.add(bell);
      }
    } else {
      // Ornate Antique Gilded Bridal Mirror Box & Glowing Golden Mangalsutra (3F-2 Aaina Mahal Relic)
      const antiqueGoldMat = new THREE.MeshStandardMaterial({
        color: 0xe6b84c,
        emissive: 0xc87418,
        emissiveIntensity: 0.65,
        roughness: 0.24,
        metalness: 0.88,
      });
      const casketWoodMat = new THREE.MeshStandardMaterial({
        color: 0x3b1218,
        emissive: 0x2a060b,
        emissiveIntensity: 0.25,
        roughness: 0.45,
        metalness: 0.22,
      });
      const velvetLiningMat = new THREE.MeshStandardMaterial({
        color: 0x6b0b1a,
        roughness: 0.88,
        metalness: 0.05,
      });
      const antiqueMirrorMat = new THREE.MeshStandardMaterial({
        color: 0x9ab0c4,
        emissive: 0x302038,
        emissiveIntensity: 0.35,
        roughness: 0.12,
        metalness: 0.94,
      });
      const blackBeadMat = new THREE.MeshStandardMaterial({
        color: 0x120d10,
        roughness: 0.25,
        metalness: 0.4,
      });
      glowTargetMaterials.push(antiqueGoldMat);

      const relicBox = new THREE.Group();
      relicBox.position.y = -0.04;

      // Carved antique lacquer box base + gold filigree corner bands & clasp
      const boxBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.11, 0.25),
        casketWoodMat,
      );
      boxBase.position.y = 0.055;
      const boxRim = new THREE.Mesh(
        new THREE.BoxGeometry(0.376, 0.022, 0.266),
        antiqueGoldMat,
      );
      boxRim.position.y = 0.105;
      const boxFootTrim = new THREE.Mesh(
        new THREE.BoxGeometry(0.372, 0.018, 0.262),
        antiqueGoldMat,
      );
      boxFootTrim.position.y = 0.012;
      const frontClasp = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.048, 0.024),
        antiqueGoldMat,
      );
      frontClasp.position.set(0, 0.075, 0.132);
      const cushion = new THREE.Mesh(
        new THREE.BoxGeometry(0.31, 0.036, 0.205),
        velvetLiningMat,
      );
      cushion.position.y = 0.108;
      relicBox.add(boxBase, boxRim, boxFootTrim, frontClasp, cushion);

      // Hinged open antique lid with recessed gilded oval mirror inside
      const lidPivot = new THREE.Group();
      lidPivot.position.set(0, 0.112, -0.124);
      lidPivot.rotation.x = -1.16;

      const lidSlab = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.026, 0.25),
        casketWoodMat,
      );
      lidSlab.position.set(0, 0.013, 0.125);
      const lidBorder = new THREE.Mesh(
        new THREE.BoxGeometry(0.374, 0.018, 0.264),
        antiqueGoldMat,
      );
      lidBorder.position.set(0, 0.008, 0.125);
      const mirrorInset = new THREE.Mesh(
        new THREE.CylinderGeometry(0.088, 0.088, 0.01, 20),
        antiqueMirrorMat,
      );
      mirrorInset.scale.set(1.28, 1, 0.88);
      mirrorInset.position.set(0, 0.001, 0.125);
      const mirrorBezel = new THREE.Mesh(
        new THREE.TorusGeometry(0.09, 0.011, 8, 24),
        antiqueGoldMat,
      );
      mirrorBezel.rotation.x = Math.PI / 2;
      mirrorBezel.scale.set(1.28, 0.88, 1);
      mirrorBezel.position.set(0, -0.002, 0.125);
      lidPivot.add(lidSlab, lidBorder, mirrorInset, mirrorBezel);
      relicBox.add(lidPivot);

      // Golden Mangalsutra necklace coiled over the crimson velvet cushion with glowing ruby medallion
      const mangalsutraChain = new THREE.Mesh(
        new THREE.TorusGeometry(0.095, 0.009, 8, 28),
        antiqueGoldMat,
      );
      mangalsutraChain.rotation.x = Math.PI / 2 + 0.16;
      mangalsutraChain.position.set(0, 0.145, 0.012);
      relicBox.add(mangalsutraChain);

      const beadGeo = new THREE.SphereGeometry(0.012, 8, 8);
      for (let b = 0; b < 14; b++) {
        const angle = (b / 14) * Math.PI * 2;
        const bead = new THREE.Mesh(
          beadGeo,
          b % 2 === 0 ? blackBeadMat : antiqueGoldMat,
        );
        bead.position.set(
          Math.cos(angle) * 0.095,
          Math.sin(angle) * 0.095,
          0,
        );
        mangalsutraChain.add(bead);
      }

      // Ornate golden Mangalsutra Vati pendant with glowing crimson ruby centerpiece
      const pendantGroup = new THREE.Group();
      pendantGroup.position.set(0, 0.132, 0.118);
      pendantGroup.rotation.x = 0.55;

      const goldDisc = new THREE.Mesh(
        new THREE.CylinderGeometry(0.036, 0.032, 0.012, 16),
        antiqueGoldMat,
      );
      const goldHalo = new THREE.Mesh(
        new THREE.TorusGeometry(0.038, 0.006, 8, 18),
        antiqueGoldMat,
      );
      goldHalo.rotation.x = Math.PI / 2;
      const rubyGem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.022, 0),
        mat,
      );
      rubyGem.scale.set(1, 0.65, 1);
      rubyGem.position.y = 0.009;
      pendantGroup.add(goldDisc, goldHalo, rubyGem);

      // Three tiny hanging antique gold droplets along bottom of pendant
      const dropGeo = new THREE.SphereGeometry(0.0085, 8, 8);
      [-0.02, 0, 0.02].forEach((dx, idx) => {
        const drop = new THREE.Mesh(dropGeo, antiqueGoldMat);
        drop.position.set(dx, 0, idx === 1 ? 0.044 : 0.036);
        pendantGroup.add(drop);
      });
      relicBox.add(pendantGroup);

      group.add(relicBox);
    }

    const proximityGlow = attachProximityGlow({
      group,
      targetMaterials: glowTargetMaterials,
      theme: 'relic',
      phaseOffset: index * 1.45,
    });

    parent.add(group);

    return {
      index,
      name: spec.name,
      hindiName: spec.hindiName,
      roomNameHi: spec.roomNameHi,
      state: 'hidden',
      lastRoomId: spec.roomId,
      group,
      collected: false,
      burned: false,
      basePos: spec.pos.clone(),
      proximityGlow,
    };
  });
}

/**
 * Articulated Rukmini model helper used by both RaktPishachiniGame and CinematicCutsceneDirector.
 * Built with 3D humanoid hierarchy (long black hair over face, tattered crimson bridal saree with
 * gold border, glowing red eyes, silver anklets, and backward-turned feet — zero cones).
 */
export function buildRukminiWitchModel(options?: {
  disableLights?: boolean;
}): {
  root: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  veilMesh: THREE.Mesh;
  leftEye?: THREE.Mesh;
  rightEye?: THREE.Mesh;
  eyeCrimsonLight: THREE.PointLight | null;
  character: HumanoidCharacter;
} {
  const rukminiChar = createRukmini(options);
  CharacterGLBManager.register('kallu', rukminiChar);

  // Subtle short-range dim crimson face-light slightly in front of her face so her gaunt veins,
  // sunken sockets, smudged bindi & half-open mouth remain clearly visible in dark corridors
  let eyeCrimsonLight: THREE.PointLight | null = null;
  if (!options?.disableLights) {
    eyeCrimsonLight = new THREE.PointLight(0xff2222, 0.9, 4);
    eyeCrimsonLight.position.set(0, 0.015, 0.36);
    rukminiChar.headGroup.add(eyeCrimsonLight);
  }

  const veilMesh =
    (rukminiChar.veilMesh as THREE.Mesh) ||
    new THREE.Mesh(
      new THREE.SphereGeometry(0.135, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({
        color: 0x610912,
        roughness: 0.84,
        transparent: true,
        opacity: 0.86,
        side: THREE.DoubleSide,
      }),
    );

  return {
    root: rukminiChar.root,
    headGroup: rukminiChar.headGroup,
    leftArm: rukminiChar.leftUpperArm,
    rightArm: rukminiChar.rightUpperArm,
    veilMesh,
    leftEye: rukminiChar.leftEye,
    rightEye: rukminiChar.rightEye,
    eyeCrimsonLight,
    character: rukminiChar,
  };
}

/**
 * Standalone Cursed Well & Havan Kund assembly used by CinematicCutsceneDirector.
 */
export function buildCursedWellAssembly(): {
  group: THREE.Group;
  flameCore: THREE.Mesh;
  wellLight: THREE.PointLight;
} {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x26211e,
    roughness: 0.9,
  });

  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 1.9, 1.15, 24, 1, true),
    stoneMat,
  );
  wall.position.y = 0.575;
  group.add(wall);

  const lip = new THREE.Mesh(
    new THREE.TorusGeometry(1.8, 0.18, 12, 24),
    stoneMat,
  );
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 1.15;
  group.add(lip);

  const flameCore = new THREE.Mesh(
    new THREE.ConeGeometry(0.65, 1.9, 9),
    new THREE.MeshBasicMaterial({
      color: 0xff3300,
      transparent: true,
      opacity: 0.85,
    }),
  );
  flameCore.position.y = 1.1;
  group.add(flameCore);

  const wellLight = new THREE.PointLight(0xff3300, 3.8, 14, 1.5);
  wellLight.position.set(0, 1.8, 0);
  group.add(wellLight);

  return { group, flameCore, wellLight };
}

/**
 * Places pickupable terracotta clay pots (मिट्टी के कुल्हड़) and heavy pebbles/stones (कंकड़/पत्थर)
 * on floors and tables across all Haveli rooms for the 'G' sound-distraction throw mechanic.
 */
export function createThrowablePickups(
  parent: THREE.Object3D,
): ThrowablePickupInstance[] {
  const specs: Array<{
    kind: 'kulhad' | 'stone';
    pos: THREE.Vector3;
    roomNameHi: string;
  }> = [
    {
      kind: 'kulhad',
      pos: new THREE.Vector3(4.5, 0.0, 5.5),
      roomNameHi: 'विशाल शाही दरबार आँगन (Royal Atrium)',
    },
    {
      kind: 'stone',
      pos: new THREE.Vector3(-4.5, 0.0, -6.5),
      roomNameHi: 'विशाल शाही दरबार आँगन (Royal Atrium)',
    },
    {
      kind: 'kulhad',
      pos: new THREE.Vector3(-23.2, 0.0, 2.8),
      roomNameHi: 'शाही शस्त्रागार (G1)',
    },
    {
      kind: 'kulhad',
      pos: new THREE.Vector3(-22.8, 0.0, -18.0),
      roomNameHi: 'पुरानी रसोई और अन्न-कोठी (G2)',
    },
    {
      kind: 'stone',
      pos: new THREE.Vector3(23.5, 0.78, 0.95),
      roomNameHi: 'मुनीम बही-खाता कक्ष (G3)',
    },
    {
      kind: 'kulhad',
      pos: new THREE.Vector3(22.0, 0.0, -20.5),
      roomNameHi: 'प्राचीन पूजा घर (G4)',
    },
    {
      kind: 'kulhad',
      pos: new THREE.Vector3(-14.0, 5.0, -18.0),
      roomNameHi: 'दूसरी मंज़िल झरोखा छज्जा (2F Balcony)',
    },
    {
      kind: 'stone',
      pos: new THREE.Vector3(-23.0, 5.0, 3.8),
      roomNameHi: 'ठाकुर का शयनकक्ष (2F-2)',
    },
    {
      kind: 'kulhad',
      pos: new THREE.Vector3(22.5, 5.0, -33.0),
      roomNameHi: 'मेहमान ख़ाना (2F-3)',
    },
    {
      kind: 'stone',
      pos: new THREE.Vector3(-22.5, 5.0, -34.0),
      roomNameHi: 'संगीत और झरोखा हॉल (2F-4)',
    },
    {
      kind: 'kulhad',
      pos: new THREE.Vector3(-23.5, 10.78, 0.95),
      roomNameHi: 'तांत्रिक पुस्तकालय (3F-1)',
    },
    {
      kind: 'stone',
      pos: new THREE.Vector3(22.0, 10.0, 3.5),
      roomNameHi: 'आईना महल (3F-2)',
    },
    {
      kind: 'kulhad',
      pos: new THREE.Vector3(-22.0, 10.0, -34.0),
      roomNameHi: 'अटारी भंडार कक्ष (3F-3)',
    },
    {
      kind: 'stone',
      pos: new THREE.Vector3(24.0, 10.58, -36.5),
      roomNameHi: 'बरसाती मंडप कक्ष (3F-4)',
    },
    {
      kind: 'kulhad',
      pos: new THREE.Vector3(0.5, -4.5, -48.0),
      roomNameHi: 'तहखाना गलियारा (Basement)',
    },
    {
      kind: 'stone',
      pos: new THREE.Vector3(-9.0, -4.5, -53.5),
      roomNameHi: 'तेल और अनाज भंडार (U3)',
    },
  ];

  // Shared geometries & PBR materials for terracotta Kulhads and stones
  const kulhadPoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.056, 0.0),
    new THREE.Vector2(0.068, 0.035),
    new THREE.Vector2(0.088, 0.11),
    new THREE.Vector2(0.096, 0.155),
    new THREE.Vector2(0.086, 0.16),
    new THREE.Vector2(0.074, 0.115),
    new THREE.Vector2(0.048, 0.018),
    new THREE.Vector2(0.0, 0.018),
  ];
  const kulhadGeo = new THREE.LatheGeometry(kulhadPoints, 16);
  const kulhadMat = new THREE.MeshStandardMaterial({
    color: 0xc25d36,
    emissive: 0x3b1708,
    emissiveIntensity: 0.55,
    roughness: 0.78,
    metalness: 0.05,
  });

  const stoneGeo = new THREE.DodecahedronGeometry(0.085, 0);
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x7c766d,
    emissive: 0x26211b,
    emissiveIntensity: 0.5,
    roughness: 0.88,
    metalness: 0.08,
  });

  const haloGeo = new THREE.RingGeometry(0.11, 0.16, 20);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xffb347,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });

  return specs.map((spec, index) => {
    const group = new THREE.Group();
    group.name = `Throwable_${index}_${spec.kind}`;
    group.position.copy(spec.pos);

    const haloRing = new THREE.Mesh(haloGeo, haloMat);
    haloRing.rotation.x = -Math.PI / 2;
    haloRing.position.y = 0.012;
    group.add(haloRing);

    if (spec.kind === 'kulhad') {
      const pot = new THREE.Mesh(kulhadGeo, kulhadMat);
      pot.castShadow = true;
      pot.receiveShadow = true;
      group.add(pot);
    } else {
      const mainStone = new THREE.Mesh(stoneGeo, stoneMat);
      mainStone.scale.set(1.15, 0.72, 0.92);
      mainStone.position.y = 0.062;
      mainStone.rotation.set(0.25, index * 0.7, 0.18);
      mainStone.castShadow = true;
      group.add(mainStone);

      const smallPebble = new THREE.Mesh(stoneGeo, stoneMat);
      smallPebble.scale.set(0.55, 0.45, 0.5);
      smallPebble.position.set(0.085, 0.036, 0.045);
      group.add(smallPebble);
    }

    parent.add(group);

    return {
      index,
      kind: spec.kind,
      hindiName: spec.kind === 'kulhad' ? 'मिट्टी का कुल्हड़' : 'पत्थर/कंकड़',
      englishName: spec.kind === 'kulhad' ? 'Clay Kulhad' : 'Stone',
      roomNameHi: spec.roomNameHi,
      group,
      collected: false,
      basePos: spec.pos.clone(),
      respawnTimer: 0,
    };
  });
}

