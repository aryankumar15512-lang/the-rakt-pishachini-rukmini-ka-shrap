import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export interface HumanoidOptions {
  name: string;
  height?: number; // Target height in meters, defaults to 1.7
  skinTone?: number;
  hairColor?: number;
  hairStyle?:
    | 'short'
    | 'messy_short'
    | 'curly'
    | 'long'
    | 'braid'
    | 'messy'
    | 'bald'
    | 'turban';
  turbanColor?: number;
  hasMoustache?: boolean;
  hasBeard?: boolean;
  beardColor?: number;
  weatheredFace?: boolean;
  // Clothing
  clothingStyle?:
    | 'casual_jacket'
    | 'casual_tshirt'
    | 'kurti'
    | 'saree'
    | 'dhoti_kurta'
    | 'guard_coat'
    | 'tantrik_robe'
    | 'thakur_sherwani';
  jacketMaterialType?: 'fabric' | 'leather';
  shirtColor?: number;
  undershirtColor?: number;
  pantsColor?: number;
  shoeColor?: number;
  sareeColor?: number;
  zariColor?: number;
  coatColor?: number;
  robeColor?: number;
  // Accessories & Props
  hasLantern?: boolean;
  lanternLightColor?: number;
  bangles?: boolean;
  bangleColor?: number;
  payal?: boolean;
  rudraksha?: boolean;
  tilak?: boolean;
  shawl?: boolean;
  shawlColor?: number;
  scarfColor?: number;
  // Ghost / Witch / Captive attributes
  isGhost?: boolean;
  blindEyes?: boolean;
  glowingEyes?: boolean;
  eyeEmissiveColor?: number;
  longClawFingers?: boolean;
  snappedNeck?: boolean;
  reverseFeet?: boolean;
  boundToPillar?: boolean;
  disableLights?: boolean;
}

export interface HumanoidCharacter {
  name: string;
  root: THREE.Group;
  proceduralGroup: THREE.Group;
  glbContainer: THREE.Group;
  // Rigged joint hierarchy
  pelvis: THREE.Group;
  torso: THREE.Group;
  chest: THREE.Group;
  neck: THREE.Group;
  headGroup: THREE.Group;
  headMesh: THREE.Mesh;
  leftUpperArm: THREE.Group;
  leftForearm: THREE.Group;
  leftHand: THREE.Group;
  rightUpperArm: THREE.Group;
  rightForearm: THREE.Group;
  rightHand: THREE.Group;
  leftThigh: THREE.Group;
  leftShin: THREE.Group;
  leftFoot: THREE.Group;
  rightThigh: THREE.Group;
  rightShin: THREE.Group;
  rightFoot: THREE.Group;
  // Accessories & props
  lantern?: THREE.Group;
  lanternLight?: THREE.PointLight;
  secondaryTorchGroup?: THREE.Group;
  secondaryTorchLight?: THREE.PointLight;
  secondaryTorchSpot?: THREE.SpotLight;
  hasSecondaryTorch?: boolean;
  setSecondaryTorchEnabled?: (enabled: boolean, brightnessScale?: number) => void;
  veilMesh?: THREE.Mesh | THREE.Object3D;
  leftEye?: THREE.Mesh;
  rightEye?: THREE.Mesh;
  auraLight?: THREE.PointLight;
  boundToPillar?: boolean;
  // Animation state
  animState: 'idle' | 'walk' | 'run' | 'pickup' | 'scared' | 'bound' | 'crouch';
  setAnimation: (
    state: 'idle' | 'walk' | 'run' | 'pickup' | 'scared' | 'bound' | 'crouch',
  ) => void;
  update: (
    dt: number,
    time: number,
    moveSpeed?: number,
    lookTarget?: THREE.Vector3,
    isScared?: boolean,
  ) => void;
  // GLB support
  loadGLB: (urlOrBuffer: string | ArrayBuffer) => Promise<boolean>;
  hasGLB: boolean;
  mixer?: THREE.AnimationMixer;
  actions: { [key: string]: THREE.AnimationAction };
  currentAction?: THREE.AnimationAction;
}

const gltfLoader = new GLTFLoader();
const _tempLookLocal = new THREE.Vector3();

type ProceduralClothKind =
  | 'skin'
  | 'ghost_skin'
  | 'denim'
  | 'khadi'
  | 'wool'
  | 'leather'
  | 'cotton'
  | 'banarasi_saree'
  | 'banarasi_zari';
const proceduralCanvasCache = new Map<ProceduralClothKind, HTMLCanvasElement>();
let cachedGhostMistCanvas: HTMLCanvasElement | null = null;

/**
 * Soft radial wispy smoke texture for Rukmini's swirling crimson-black ankle mist.
 */
function getGhostMistSpriteTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (cachedGhostMistCanvas) {
    const tex = new THREE.CanvasTexture(cachedGhostMistCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);
  const grad = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.04,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  );
  grad.addColorStop(0.0, 'rgba(255,255,255,0.78)');
  grad.addColorStop(0.35, 'rgba(235,215,220,0.44)');
  grad.addColorStop(0.68, 'rgba(180,145,155,0.14)');
  grad.addColorStop(1.0, 'rgba(0,0,0,0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Wispy asymmetric smoke curls so sprites read as curling mist rather than hard balls
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const cx = size * 0.5 + Math.cos(a) * size * 0.16;
    const cy = size * 0.5 + Math.sin(a) * size * 0.14;
    const r = size * (0.18 + (i % 3) * 0.05);
    const wisp = ctx.createRadialGradient(cx, cy, 1, cx, cy, r);
    wisp.addColorStop(0, 'rgba(255,245,245,0.22)');
    wisp.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = wisp;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  cachedGhostMistCanvas = canvas;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates subtle, neutral-luminance procedural PBR surface textures backed by cached
 * 2D canvases (wrapped in per-character CanvasTexture instances so multiple WebGL contexts
 * never collide over shared GPU texture handles).
 */
function getCharacterSurfaceTexture(kind: ProceduralClothKind): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const wrapCanvasTexture = (sourceCanvas: HTMLCanvasElement): THREE.CanvasTexture => {
    const tex = new THREE.CanvasTexture(sourceCanvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(
      kind === 'skin' || kind === 'ghost_skin' ? 1 : 2,
      kind === 'skin' || kind === 'ghost_skin' ? 1 : 2,
    );
    return tex;
  };
  const existingCanvas = proceduralCanvasCache.get(kind);
  if (existingCanvas) return wrapCanvasTexture(existingCanvas);

  const size =
    kind === 'ghost_skin' || kind === 'banarasi_saree' || kind === 'banarasi_zari'
      ? 256
      : 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Deterministic pseudo-random helper
  let seed =
    kind === 'skin'
      ? 101
      : kind === 'ghost_skin'
        ? 137
        : kind === 'denim'
          ? 211
          : kind === 'khadi'
            ? 307
            : kind === 'wool'
              ? 409
              : kind === 'leather'
                ? 503
                : kind === 'banarasi_saree'
                  ? 719
                  : kind === 'banarasi_zari'
                    ? 823
                    : 607;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  if (kind === 'skin') {
    ctx.fillStyle = '#f6f2ef';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 650; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 1 + rand() * 3.5;
      const v = 232 + Math.floor(rand() * 22);
      ctx.fillStyle = `rgba(${v},${Math.max(0, v - 5)},${Math.max(0, v - 9)},0.16)`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'ghost_skin') {
    // Pale ash-gray gaunt corpse skin with dark cracked veins & hollow ash mottling
    ctx.fillStyle = '#d8d4d9';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 950; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 2 + rand() * 9;
      const shade = 158 + Math.floor(rand() * 64);
      ctx.fillStyle = `rgba(${shade},${shade - 4},${shade + 3},0.12)`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Fine dark-crimson & charcoal cracked veins across gaunt skin
    for (let v = 0; v < 26; v++) {
      let x = rand() * size;
      let y = rand() * size;
      let ang = rand() * Math.PI * 2;
      ctx.strokeStyle = v % 3 === 0 ? 'rgba(56,16,24,0.44)' : 'rgba(26,20,28,0.42)';
      ctx.lineWidth = 0.8 + rand() * 1.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const segs = 5 + Math.floor(rand() * 6);
      for (let s = 0; s < segs; s++) {
        ang += (rand() - 0.5) * 1.15;
        x += Math.cos(ang) * (7 + rand() * 11);
        y += Math.sin(ang) * (7 + rand() * 11);
        ctx.lineTo(x, y);
        // Fine sub-branch crack
        if (s === 2 || s === 4) {
          const bAng = ang + (rand() > 0.5 ? 0.7 : -0.7);
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(bAng) * 10, y + Math.sin(bAng) * 10);
          ctx.moveTo(x, y);
        }
      }
      ctx.stroke();
    }
    // Ashy smudges & aged grave-dust patches
    for (let i = 0; i < 55; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 8 + rand() * 18;
      ctx.fillStyle = 'rgba(42,35,44,0.11)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'banarasi_saree') {
    // Weathered, tattered 1992 deep-crimson Banarasi bridal silk with faded antique gold motifs & soot
    ctx.fillStyle = '#d4c8c4';
    ctx.fillRect(0, 0, size, size);
    // Fine woven silk slub lines
    for (let y = 0; y < size; y += 2) {
      const v = 180 + Math.floor(rand() * 44);
      ctx.fillStyle = `rgba(${v},${v - 18},${v - 20},0.26)`;
      ctx.fillRect(0, y, size, 1);
    }
    for (let x = 0; x < size; x += 3) {
      const v = 160 + Math.floor(rand() * 42);
      ctx.fillStyle = `rgba(${v},${v - 22},${v - 22},0.16)`;
      ctx.fillRect(x, 0, 1, size);
    }
    // Faded antique gold Banarasi floral buti motifs woven into the silk
    for (let gy = 16; gy < size; gy += 32) {
      for (let gx = 16; gx < size; gx += 32) {
        const ox = gx + ((gy / 32) % 2) * 16;
        const fade = 0.24 + rand() * 0.2;
        ctx.fillStyle = `rgba(218,182,92,${fade})`;
        ctx.beginPath();
        ctx.ellipse(ox % size, gy, 4.2, 6.2, 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(232,198,112,${fade * 0.8})`;
        ctx.beginPath();
        ctx.arc((ox + 5) % size, gy - 4, 2.2, 0, Math.PI * 2);
        ctx.arc((ox - 5) % size, gy + 4, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Weathered ash stains, dried blood darkening, and tattered age blotches
    for (let i = 0; i < 90; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 7 + rand() * 22;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(26,6,10,0.22)' : 'rgba(54,40,36,0.16)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'banarasi_zari') {
    // Tarnished antique gold bridal zari border brocade
    ctx.fillStyle = '#b9974d';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(72,44,18,0.48)';
    ctx.lineWidth = 2;
    for (let y = 12; y < size; y += 24) {
      ctx.beginPath();
      for (let x = 0; x <= size; x += 16) {
        ctx.lineTo(x, y + (x % 32 === 0 ? -7 : 7));
      }
      ctx.stroke();
    }
    // Tarnish & soot darkening patches
    for (let i = 0; i < 65; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 6 + rand() * 18;
      ctx.fillStyle = 'rgba(34,22,12,0.24)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'denim') {
    ctx.fillStyle = '#e8eaee';
    ctx.fillRect(0, 0, size, size);
    // Diagonal denim twill weave
    ctx.strokeStyle = 'rgba(185,192,205,0.34)';
    ctx.lineWidth = 1;
    for (let i = -size; i < size * 2; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
    }
    // Vertical worn warp threads
    for (let x = 0; x < size; x += 2) {
      const alpha = 0.08 + rand() * 0.14;
      ctx.fillStyle = rand() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(110,120,138,${alpha})`;
      ctx.fillRect(x, 0, 1, size);
    }
  } else if (kind === 'khadi') {
    // Handspun dusty khadi weave with aged fiber slubs
    ctx.fillStyle = '#f2ede4';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 3) {
      const shade = 212 + Math.floor(rand() * 34);
      ctx.fillStyle = `rgba(${shade},${shade - 6},${shade - 15},0.32)`;
      ctx.fillRect(0, y, size, 1 + (rand() > 0.7 ? 1 : 0));
    }
    for (let x = 0; x < size; x += 4) {
      const shade = 205 + Math.floor(rand() * 36);
      ctx.fillStyle = `rgba(${shade},${shade - 7},${shade - 16},0.22)`;
      ctx.fillRect(x, 0, 1, size);
    }
    // Subtle aged dust mottling
    for (let i = 0; i < 45; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 6 + rand() * 14;
      ctx.fillStyle = 'rgba(150,132,108,0.09)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'wool') {
    // Thick weathered coarse wool shawl weave
    ctx.fillStyle = '#ded9d4';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 4) {
      ctx.fillStyle = y % 8 === 0 ? 'rgba(120,108,98,0.28)' : 'rgba(245,240,235,0.16)';
      ctx.fillRect(0, y, size, 2);
    }
    for (let x = 0; x < size; x += 4) {
      ctx.fillStyle = x % 8 === 0 ? 'rgba(95,86,78,0.24)' : 'rgba(230,224,218,0.14)';
      ctx.fillRect(x, 0, 2, size);
    }
    for (let i = 0; i < 320; i++) {
      const v = 165 + Math.floor(rand() * 75);
      ctx.fillStyle = `rgba(${v},${v - 4},${v - 8},0.22)`;
      ctx.fillRect(rand() * size, rand() * size, 2, 2);
    }
  } else if (kind === 'leather') {
    // Subtle pebbled dark leather grain
    ctx.fillStyle = '#ece9e7';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 520; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const r = 1.2 + rand() * 2.4;
      const v = 192 + Math.floor(rand() * 54);
      ctx.fillStyle = `rgba(${v},${v - 2},${v - 3},0.24)`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Muted damp night cotton weave
    ctx.fillStyle = '#efeeec';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 3) {
      ctx.fillStyle = 'rgba(180,180,185,0.16)';
      ctx.fillRect(0, y, size, 1);
    }
    for (let x = 0; x < size; x += 3) {
      ctx.fillStyle = 'rgba(170,172,178,0.14)';
      ctx.fillRect(x, 0, 1, size);
    }
  }

  proceduralCanvasCache.set(kind, canvas);
  return wrapCanvasTexture(canvas);
}

/**
 * Creates a fully articulated 3D humanoid character rig with anatomical proportions:
 * - Sculpted oval head (cranium, tapered jawline/chin, cheekbones, recessed eye sockets,
 *   brow ridges, nose bridge with alae, sculpted ears, eyelids, natural dark irises, lips,
 *   and layered hair/turban)
 * - Articulated torso with detailed layered clothes (aged dusty khadi dhoti-kurta & thick
 *   wool shawl, nighttime jackets/overshirts/kurti with scarf, tattered crimson bridal saree)
 * - Upper & lower arms with elbow joints, sculpted hands, palms, and 5 articulated fingers
 * - Upper & lower legs with knee joints, calves, weathered denim jeans, dark boots/mojris,
 *   or silver payal anklets & backward feet for Rukmini.
 */
export function createHumanoid(options: HumanoidOptions): HumanoidCharacter {
  const targetHeight = options.height ?? 1.7;
  const scale = targetHeight / 1.7;

  const root = new THREE.Group();
  root.name = `Humanoid_${options.name}`;

  const proceduralGroup = new THREE.Group();
  proceduralGroup.name = 'ProceduralRig';
  root.add(proceduralGroup);

  const glbContainer = new THREE.Group();
  glbContainer.name = 'GLBContainer';
  root.add(glbContainer);

  const skinTex = options.isGhost
    ? getCharacterSurfaceTexture('ghost_skin')
    : getCharacterSurfaceTexture('skin');
  const denimTex = getCharacterSurfaceTexture('denim');
  const khadiTex = getCharacterSurfaceTexture('khadi');
  const woolTex = getCharacterSurfaceTexture('wool');
  const leatherTex = getCharacterSurfaceTexture('leather');
  const cottonTex = getCharacterSurfaceTexture('cotton');
  const banarasiSareeTex = options.clothingStyle === 'saree'
    ? getCharacterSurfaceTexture('banarasi_saree')
    : null;
  const banarasiZariTex = options.clothingStyle === 'saree'
    ? getCharacterSurfaceTexture('banarasi_zari')
    : null;

  // Shared anatomical & clothing materials (warm realistic Indian skin tones, or gaunt pale ash-gray corpse skin for Rukmini)
  const baseSkinColor = new THREE.Color(options.skinTone ?? 0xa3714e);
  const darkSkinColor = baseSkinColor
    .clone()
    .multiplyScalar(options.isGhost ? 0.56 : 0.75);
  const socketSkinColor = options.isGhost
    ? new THREE.Color(0x160d12)
    : baseSkinColor.clone().multiplyScalar(0.62);

  const skinMat = new THREE.MeshStandardMaterial({
    color: baseSkinColor,
    map: skinTex ?? undefined,
    roughness: options.isGhost ? 0.8 : 0.75,
    metalness: 0.02,
  });

  const skinShadowMat = new THREE.MeshStandardMaterial({
    color: darkSkinColor,
    map: skinTex ?? undefined,
    roughness: options.isGhost ? 0.88 : 0.8,
    metalness: 0.02,
  });

  const skinSocketMat = new THREE.MeshStandardMaterial({
    color: socketSkinColor,
    roughness: 0.92,
    metalness: 0.01,
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: options.hairColor ?? 0x151210,
    roughness: options.isGhost ? 0.88 : 0.84,
    metalness: 0.06,
  });

  const hairShadowMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(options.hairColor ?? 0x151210).multiplyScalar(0.78),
    roughness: 0.9,
    metalness: 0.04,
  });

  const isLeatherJacket = options.jacketMaterialType === 'leather';
  const shirtMat = new THREE.MeshStandardMaterial({
    color: options.shirtColor ?? 0x26322b,
    map: (isLeatherJacket ? leatherTex : cottonTex) ?? undefined,
    roughness: isLeatherJacket ? 0.56 : 0.86,
    metalness: isLeatherJacket ? 0.08 : 0.02,
  });

  const shirtAccentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(options.shirtColor ?? 0x26322b).multiplyScalar(0.76),
    map: (isLeatherJacket ? leatherTex : cottonTex) ?? undefined,
    roughness: isLeatherJacket ? 0.62 : 0.9,
    metalness: isLeatherJacket ? 0.06 : 0.02,
  });

  const undershirtMat = new THREE.MeshStandardMaterial({
    color: options.undershirtColor ?? 0x2a2d32,
    map: cottonTex ?? undefined,
    roughness: 0.88,
    metalness: 0.01,
  });

  const pantsMat = new THREE.MeshStandardMaterial({
    color: options.pantsColor ?? 0x1c222b,
    map: denimTex ?? undefined,
    roughness: 0.88,
    metalness: 0.02,
  });

  const shoesMat = new THREE.MeshStandardMaterial({
    color: options.shoeColor ?? 0x191513,
    map: leatherTex ?? undefined,
    roughness: 0.72,
    metalness: 0.06,
  });

  const soleMat = new THREE.MeshStandardMaterial({
    color: 0x0c0b0b,
    roughness: 0.94,
    metalness: 0.02,
  });

  // Faded antique gold zari border for Rukmini's 1992 bridal saree, bright gold for others
  const goldMat = new THREE.MeshStandardMaterial({
    color: options.zariColor ?? (options.isGhost ? 0x9c7c38 : 0xd4af37),
    map: options.isGhost && banarasiZariTex ? banarasiZariTex : undefined,
    roughness: options.isGhost ? 0.54 : 0.3,
    metalness: options.isGhost ? 0.64 : 0.88,
    emissive: options.isGhost ? 0x170e02 : 0x000000,
    side: THREE.DoubleSide,
  });

  const antiqueMetalMat = new THREE.MeshStandardMaterial({
    color: 0x524c44,
    roughness: 0.48,
    metalness: 0.72,
  });

  // Tarnished oxidized silver for Rukmini's Payal anklets
  const silverMat = new THREE.MeshStandardMaterial({
    color: options.isGhost ? 0x8e939b : 0xd8dee9,
    roughness: options.isGhost ? 0.46 : 0.22,
    metalness: options.isGhost ? 0.78 : 0.9,
  });

  const sareeMat = new THREE.MeshStandardMaterial({
    color: options.sareeColor ?? 0x610912,
    map: banarasiSareeTex ?? undefined,
    roughness: options.isGhost ? 0.82 : 0.68,
    metalness: options.isGhost ? 0.08 : 0.14,
    emissive: options.isGhost ? 0x120103 : 0x000000,
    side: THREE.DoubleSide,
  });

  const sareeDarkFoldMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(options.sareeColor ?? 0x610912).multiplyScalar(0.62),
    map: banarasiSareeTex ?? undefined,
    roughness: 0.88,
    metalness: 0.06,
    side: THREE.DoubleSide,
  });

  const isSlenderGhost = Boolean(options.isGhost && options.clothingStyle === 'saree');

  // Base anatomical dimensions for a 1.70m human
  const PELVIS_Y = 0.91;
  const TORSO_H = 0.44;
  const CHEST_H = 0.28;
  const NECK_H = isSlenderGhost ? 0.106 : 0.095;
  const HEAD_RAD = 0.114;
  const THIGH_LEN = 0.42;
  const SHIN_LEN = 0.42;
  const UPPER_ARM_LEN = 0.28;
  const FOREARM_LEN = 0.26;

  const isDhotiKurta = options.clothingStyle === 'dhoti_kurta';
  const isSaree = options.clothingStyle === 'saree';
  const isKurti = options.clothingStyle === 'kurti';
  const isTantrik = options.clothingStyle === 'tantrik_robe';

  // Aged dusty off-white / beige khadi kurta-dhoti materials for Watchman Baba
  const kurtaMat = new THREE.MeshStandardMaterial({
    color: options.shirtColor ?? 0xbfb59e,
    map: khadiTex ?? undefined,
    roughness: 0.9,
    metalness: 0.01,
  });
  const dhotiMat = new THREE.MeshStandardMaterial({
    color: options.pantsColor ?? 0xb8ae96,
    map: khadiTex ?? undefined,
    roughness: 0.9,
    metalness: 0.01,
  });
  const dhotiBorderMat = new THREE.MeshStandardMaterial({
    color: 0x5c2019, // Muted aged maroon-rust handloom dhoti border
    map: cottonTex ?? undefined,
    roughness: 0.88,
    metalness: 0.02,
  });

  // ============================================================================
  // 1. PELVIS / HIP CORE
  // ============================================================================
  const pelvis = new THREE.Group();
  pelvis.position.set(0, PELVIS_Y, 0);
  proceduralGroup.add(pelvis);

  const pelvisPrimaryMat = isSaree
    ? sareeMat
    : isDhotiKurta
      ? dhotiMat
      : isTantrik
        ? new THREE.MeshStandardMaterial({
            color: options.robeColor ?? 0x181412,
            roughness: 0.9,
          })
        : pantsMat;

  const pelvisMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(isSlenderGhost ? 0.108 : 0.118, isSlenderGhost ? 0.12 : 0.13, 10, 14),
    pelvisPrimaryMat,
  );
  pelvisMesh.rotation.z = Math.PI / 2;
  pelvisMesh.scale.set(1.0, 1.0, isSlenderGhost ? 0.76 : 0.82);
  pelvisMesh.castShadow = true;
  pelvisMesh.receiveShadow = true;
  pelvis.add(pelvisMesh);

  // Leather belt with brass buckle for trousers / jeans / cargo pants
  if (
    options.clothingStyle === 'casual_jacket' ||
    options.clothingStyle === 'casual_tshirt' ||
    options.clothingStyle === 'guard_coat'
  ) {
    const beltRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.138, 0.14, 0.042, 16),
      shoesMat,
    );
    beltRing.scale.set(1.05, 1.0, 0.78);
    beltRing.position.set(0, 0.04, 0);
    pelvis.add(beltRing);

    const buckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.048, 0.046, 0.016),
      goldMat,
    );
    buckle.position.set(0, 0.04, 0.11);
    pelvis.add(buckle);
  }

  // ============================================================================
  // 2. TORSO (WAIST, RIBCAGE, SHOULDERS & LAYERED CLOTHING — ZERO CONES)
  // ============================================================================
  const torso = new THREE.Group();
  torso.position.set(0, 0.055, 0);
  pelvis.add(torso);

  const lowerTorsoMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(isSlenderGhost ? 0.094 : 0.122, TORSO_H * 0.42, 10, 14),
    shirtMat,
  );
  lowerTorsoMesh.position.set(0, 0.115, 0);
  lowerTorsoMesh.scale.set(isSlenderGhost ? 0.94 : 1.04, 1.0, isSlenderGhost ? 0.68 : 0.78);
  lowerTorsoMesh.castShadow = true;
  lowerTorsoMesh.receiveShadow = true;
  torso.add(lowerTorsoMesh);

  const chest = new THREE.Group();
  chest.position.set(0, 0.215, 0);
  torso.add(chest);

  const chestMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(isSlenderGhost ? 0.114 : 0.138, CHEST_H * 0.48, 10, 14),
    shirtMat,
  );
  chestMesh.position.set(0, 0.095, 0);
  chestMesh.scale.set(isSlenderGhost ? 0.98 : 1.12, 1.0, isSlenderGhost ? 0.72 : 0.8);
  chestMesh.castShadow = true;
  chestMesh.receiveShadow = true;
  chest.add(chestMesh);

  // Clavicle / Shoulder muscle bridge for natural upper-body silhouette
  const shoulderBridge = new THREE.Mesh(
    new THREE.CapsuleGeometry(isSlenderGhost ? 0.048 : 0.068, isSlenderGhost ? 0.265 : 0.31, 8, 12),
    shirtMat,
  );
  shoulderBridge.rotation.z = Math.PI / 2;
  shoulderBridge.position.set(0, 0.175, 0);
  shoulderBridge.scale.set(1.0, 1.0, isSlenderGhost ? 0.76 : 0.85);
  shoulderBridge.castShadow = true;
  chest.add(shoulderBridge);

  // Swaying cloth strips array (for tattered saree / kurta hems)
  const swayingClothPanels: THREE.Object3D[] = [];

  // --- OUTFIT-SPECIFIC ARTICULATED CLOTHING ---
  if (isDhotiKurta) {
    // WATCHMAN BABA (CHOWKIDAR): Traditional Khadi Cotton Kurta + Draped Dhoti + Shoulder Gamcha
    chestMesh.material = kurtaMat;
    lowerTorsoMesh.material = kurtaMat;
    shoulderBridge.material = kurtaMat;

    // Mandarin collar & buttoned placket down the chest
    const kurtaCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.078, 0.042, 14, 1, true),
      kurtaMat,
    );
    kurtaCollar.position.set(0, 0.215, 0);
    chest.add(kurtaCollar);

    const placket = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.22, 0.014),
      dhotiMat,
    );
    placket.position.set(0, 0.09, 0.112);
    chest.add(placket);

    for (let b = 0; b < 3; b++) {
      const btn = new THREE.Mesh(
        new THREE.SphereGeometry(0.007, 6, 6),
        shoesMat,
      );
      btn.position.set(0, 0.16 - b * 0.055, 0.12);
      chest.add(btn);
    }

    // Articulated Kurta Front & Back Tunic Panels (split at the sides so legs move freely, NEVER a cone)
    [-1, 1].forEach((zSide) => {
      const tunicPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.34, 0.024),
        kurtaMat,
      );
      tunicPanel.position.set(0, -0.14, zSide * 0.098);
      tunicPanel.rotation.x = zSide * 0.06;
      tunicPanel.castShadow = true;
      pelvis.add(tunicPanel);
    });

    // Central Dhoti "Kaccha" pleated front fold hanging naturally between the legs
    for (let p = 0; p < 4; p++) {
      const pleat = new THREE.Mesh(
        new THREE.BoxGeometry(0.052 - p * 0.006, 0.46 - p * 0.03, 0.018),
        p === 3 ? dhotiBorderMat : dhotiMat,
      );
      pleat.position.set(
        (p - 1.5) * 0.012,
        -0.24,
        0.105 + p * 0.006,
      );
      pleat.castShadow = true;
      pelvis.add(pleat);
      swayingClothPanels.push(pleat);
    }
  } else if (options.clothingStyle === 'casual_jacket') {
    // LAYERED NIGHTTIME OVERSHIRT / LEATHER JACKET OVER CHARCOAL TEE (Kabir, Dev, Aarav)
    lowerTorsoMesh.material = undershirtMat;

    // Inner shirt visible in the open front center
    const innerChestTee = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.115, 0.2, 8, 12),
      undershirtMat,
    );
    innerChestTee.position.set(0, 0.08, 0.036);
    innerChestTee.scale.set(0.88, 1.0, 0.72);
    chest.add(innerChestTee);

    // Open front jacket panels on left and right sides of chest + lower waist flaps
    [-1, 1].forEach((side) => {
      const lapelPanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.116, 0.37, 0.03),
        shirtMat,
      );
      lapelPanel.position.set(side * 0.086, 0.005, 0.098);
      lapelPanel.rotation.y = -side * 0.2;
      lapelPanel.castShadow = true;
      lapelPanel.receiveShadow = true;
      chest.add(lapelPanel);

      // Folded lapel / collar notch on upper front
      const collarFold = new THREE.Mesh(
        new THREE.BoxGeometry(0.056, 0.095, 0.022),
        shirtAccentMat,
      );
      collarFold.position.set(side * 0.072, 0.165, 0.106);
      collarFold.rotation.z = side * 0.28;
      collarFold.rotation.y = -side * 0.22;
      chest.add(collarFold);

      // Chest pocket (overshirt flap pocket or leather zip welt)
      const pocket = new THREE.Mesh(
        new THREE.BoxGeometry(0.058, isLeatherJacket ? 0.016 : 0.068, 0.014),
        isLeatherJacket ? antiqueMetalMat : shirtAccentMat,
      );
      pocket.position.set(
        side * 0.092,
        isLeatherJacket ? 0.06 : 0.055,
        0.115,
      );
      chest.add(pocket);

      // Lower jacket pocket seam
      const lowerPocket = new THREE.Mesh(
        new THREE.BoxGeometry(0.054, 0.048, 0.012),
        shirtAccentMat,
      );
      lowerPocket.position.set(side * 0.094, -0.09, 0.113);
      chest.add(lowerPocket);

      if (isLeatherJacket) {
        // Subtle vertical zipper trim on inner jacket edge
        const zipEdge = new THREE.Mesh(
          new THREE.BoxGeometry(0.008, 0.34, 0.012),
          antiqueMetalMat,
        );
        zipEdge.position.set(side * 0.032, 0.0, 0.112);
        chest.add(zipEdge);
      } else {
        // Subtle matte overshirt buttons
        for (let b = 0; b < 3; b++) {
          const btn = new THREE.Mesh(
            new THREE.CylinderGeometry(0.006, 0.006, 0.006, 8),
            antiqueMetalMat,
          );
          btn.rotation.x = Math.PI / 2;
          btn.position.set(side * 0.036, 0.1 - b * 0.09, 0.115);
          chest.add(btn);
        }
      }
    });

    // Structured folded jacket collar around back & sides of neck
    const jacketCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.084, 0.024, 8, 18, Math.PI * 1.48),
      shirtAccentMat,
    );
    jacketCollar.rotation.x = Math.PI / 2;
    jacketCollar.rotation.z = Math.PI * 0.76;
    jacketCollar.position.set(0, 0.212, -0.006);
    chest.add(jacketCollar);
  } else if (options.clothingStyle === 'casual_tshirt') {
    // LAYERED HOODIE / VEST & CREW NECK
    const collarRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.072, 0.016, 8, 16),
      undershirtMat,
    );
    collarRing.rotation.x = Math.PI / 2;
    collarRing.position.set(0, 0.205, 0.008);
    chest.add(collarRing);

    // Hood resting behind neck
    const backHood = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 10, 8, 0, Math.PI),
      shirtMat,
    );
    backHood.position.set(0, 0.19, -0.095);
    backHood.scale.set(1.2, 0.7, 0.8);
    chest.add(backHood);
  } else if (isKurti) {
    // MUTED DEEP-MAROON NIGHTTIME KURTI / LONGLINE JACKET WITH LAYERED DARK SCARF (Riya / Neha)
    const kurtiMat = new THREE.MeshStandardMaterial({
      color: options.shirtColor ?? 0x4e1e26,
      map: cottonTex ?? undefined,
      roughness: 0.86,
      metalness: 0.02,
    });
    const kurtiTrimMat = new THREE.MeshStandardMaterial({
      color: 0x301218,
      map: cottonTex ?? undefined,
      roughness: 0.9,
      metalness: 0.02,
    });
    chestMesh.material = kurtiMat;
    lowerTorsoMesh.material = kurtiMat;
    shoulderBridge.material = kurtiMat;

    // Subtle mandarin collar & muted front placket (no bright cartoon gold)
    const kurtiCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.076, 0.036, 14, 1, true),
      kurtiTrimMat,
    );
    kurtiCollar.position.set(0, 0.212, 0);
    chest.add(kurtiCollar);

    const kurtiPlacket = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.24, 0.014),
      kurtiTrimMat,
    );
    kurtiPlacket.position.set(0, 0.075, 0.112);
    chest.add(kurtiPlacket);

    for (let b = 0; b < 3; b++) {
      const btn = new THREE.Mesh(
        new THREE.SphereGeometry(0.006, 6, 6),
        antiqueMetalMat,
      );
      btn.position.set(0, 0.145 - b * 0.055, 0.12);
      chest.add(btn);
    }

    // Split front and back longline kurti-jacket panels (clean leg articulation)
    [-1, 1].forEach((zDir) => {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(0.275, 0.34, 0.022),
        kurtiMat,
      );
      panel.position.set(0, -0.15, zDir * 0.096);
      panel.rotation.x = zDir * 0.05;
      panel.castShadow = true;
      panel.receiveShadow = true;
      pelvis.add(panel);

      const hemTrim = new THREE.Mesh(
        new THREE.BoxGeometry(0.278, 0.022, 0.024),
        kurtiTrimMat,
      );
      hemTrim.position.set(0, -0.312, zDir * 0.104);
      pelvis.add(hemTrim);
    });

    // Layered dark scarf wrapped softly around neck & draped down front/back
    const scarfMat = new THREE.MeshStandardMaterial({
      color: options.scarfColor ?? 0x241d24,
      map: woolTex ?? undefined,
      roughness: 0.91,
      metalness: 0.01,
    });
    const scarfWrap = new THREE.Mesh(
      new THREE.TorusGeometry(0.118, 0.03, 10, 20),
      scarfMat,
    );
    scarfWrap.rotation.set(Math.PI / 2.25, 0.06, -0.05);
    scarfWrap.scale.set(1.12, 0.95, 1.0);
    scarfWrap.position.set(0, 0.188, 0.01);
    scarfWrap.castShadow = true;
    chest.add(scarfWrap);

    const scarfFrontEnd = new THREE.Mesh(
      new THREE.BoxGeometry(0.088, 0.31, 0.018),
      scarfMat,
    );
    scarfFrontEnd.position.set(0.072, 0.015, 0.112);
    scarfFrontEnd.rotation.z = -0.1;
    scarfFrontEnd.rotation.x = -0.04;
    scarfFrontEnd.castShadow = true;
    chest.add(scarfFrontEnd);
    swayingClothPanels.push(scarfFrontEnd);

    const scarfBackEnd = new THREE.Mesh(
      new THREE.BoxGeometry(0.084, 0.28, 0.016),
      scarfMat,
    );
    scarfBackEnd.position.set(-0.078, 0.03, -0.112);
    scarfBackEnd.rotation.z = 0.08;
    scarfBackEnd.rotation.x = 0.06;
    chest.add(scarfBackEnd);
    swayingClothPanels.push(scarfBackEnd);
  } else if (isSaree) {
    // RUKMINI (THE RAKT PISHACHINI): WEATHERED, TATTERED 1992 DEEP-CRIMSON BANARASI BRIDAL SAREE (ZERO CONES / ZERO BLOCKY BOXES)
    chestMesh.material = sareeMat;
    lowerTorsoMesh.material = skinMat; // Gaunt pale ash-gray midriff between choli & saree waist
    shoulderBridge.material = sareeMat;

    // Sculpted feminine bridal choli (blouse) upper bust contour
    [-1, 1].forEach((side) => {
      const bustContour = new THREE.Mesh(
        new THREE.SphereGeometry(0.058, 14, 12),
        sareeMat,
      );
      bustContour.scale.set(1.05, 0.92, 0.88);
      bustContour.position.set(side * 0.056, 0.092, 0.062);
      bustContour.castShadow = true;
      chest.add(bustContour);
    });

    // Exposed pale bony collarbone scoop neckline + tarnished bridal Haar necklace
    const necklineSkin = new THREE.Mesh(
      new THREE.SphereGeometry(0.072, 12, 10),
      skinMat,
    );
    necklineSkin.scale.set(1.15, 0.65, 0.65);
    necklineSkin.position.set(0, 0.188, 0.042);
    chest.add(necklineSkin);

    const bridalHaar = new THREE.Mesh(
      new THREE.TorusGeometry(0.064, 0.007, 8, 20, Math.PI * 1.15),
      goldMat,
    );
    bridalHaar.rotation.x = Math.PI * 0.32;
    bridalHaar.rotation.z = Math.PI * 0.92;
    bridalHaar.position.set(0, 0.186, 0.036);
    chest.add(bridalHaar);

    // Faded antique gold zari border along the hem of the bridal choli
    const choliZariBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.118, 0.112, 0.026, 18, 1, true),
      goldMat,
    );
    choliZariBand.scale.set(1.02, 1.0, 0.74);
    choliZariBand.position.set(0, 0.014, 0);
    chest.add(choliZariBand);

    // Contoured Diagonal Banarasi Pallu draped over torso & left shoulder (curved multi-band wrap)
    const palluGroup = new THREE.Group();
    chest.add(palluGroup);

    const palluCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.092, -0.15, 0.078),
      new THREE.Vector3(0.028, -0.02, 0.104),
      new THREE.Vector3(-0.055, 0.11, 0.102),
      new THREE.Vector3(-0.122, 0.215, 0.03),
      new THREE.Vector3(-0.128, 0.185, -0.088),
      new THREE.Vector3(-0.118, -0.04, -0.118),
    ]);
    const palluDrape = new THREE.Mesh(
      new THREE.TubeGeometry(palluCurve, 22, 0.046, 8, false),
      sareeMat,
    );
    palluDrape.scale.set(1.18, 1.0, 0.42);
    palluDrape.castShadow = true;
    palluGroup.add(palluDrape);

    // Faded antique gold zari piping borders running along both edges of the diagonal Pallu
    [-0.036, 0.036].forEach((offsetX) => {
      const zariCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.092 + offsetX, -0.15, 0.084),
        new THREE.Vector3(0.028 + offsetX, -0.02, 0.11),
        new THREE.Vector3(-0.055 + offsetX, 0.11, 0.108),
        new THREE.Vector3(-0.122 + offsetX * 0.7, 0.218, 0.034),
        new THREE.Vector3(-0.128 + offsetX * 0.6, 0.185, -0.092),
      ]);
      const zariTrim = new THREE.Mesh(
        new THREE.TubeGeometry(zariCurve, 18, 0.0085, 6, false),
        goldMat,
      );
      palluGroup.add(zariTrim);
    });

    // Trailing tattered torn Pallu strips draping down from left shoulder & back
    for (let t = 0; t < 6; t++) {
      const stripH = 0.42 + ((t * 5) % 4) * 0.11;
      const stripTopW = 0.044 - (t % 2) * 0.006;
      const stripGeo = new THREE.CylinderGeometry(
        stripTopW * 0.65,
        stripTopW * 0.28,
        stripH,
        6,
        1,
        true,
        0,
        Math.PI * 0.75,
      );
      const stripPivot = new THREE.Group();
      stripPivot.position.set(
        -0.145 + t * 0.036,
        0.165 - (t % 2) * 0.02,
        -0.085 - (t % 3) * 0.014,
      );
      stripPivot.rotation.z = 0.06 * (t - 2.5);
      chest.add(stripPivot);

      const stripMesh = new THREE.Mesh(
        stripGeo,
        t % 2 === 0 ? sareeMat : sareeDarkFoldMat,
      );
      stripMesh.position.set(0, -stripH * 0.5, 0);
      stripMesh.rotation.y = Math.PI;
      stripMesh.castShadow = true;
      stripPivot.add(stripMesh);

      if (t % 2 === 0) {
        const zariTatter = new THREE.Mesh(
          new THREE.CylinderGeometry(
            stripTopW * 0.34,
            stripTopW * 0.22,
            0.038,
            6,
            1,
            true,
            0,
            Math.PI * 0.75,
          ),
          goldMat,
        );
        zariTatter.position.set(0, -stripH * 0.88, 0.002);
        zariTatter.rotation.y = Math.PI;
        stripPivot.add(zariTatter);
      }
      swayingClothPanels.push(stripPivot);
    }

    // Tarnished antique gold Kamarbandh (Bridal Waist Chain) & tucked saree waistband
    const sareeWaistWrap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.116, 0.132, 0.095, 20, 1, true),
      sareeMat,
    );
    sareeWaistWrap.scale.set(1.04, 1.0, 0.78);
    sareeWaistWrap.position.set(0, 0.018, 0);
    pelvis.add(sareeWaistWrap);

    const kamarbandh = new THREE.Mesh(
      new THREE.TorusGeometry(0.118, 0.0085, 8, 24),
      goldMat,
    );
    kamarbandh.rotation.x = Math.PI / 2;
    kamarbandh.scale.set(1.04, 0.78, 1.0);
    kamarbandh.position.set(0, 0.056, 0);
    pelvis.add(kamarbandh);

    // Sculpted Front Nivi Accordion Pleats (curved organic vertical folds, NEVER a cone or flat box)
    for (let p = 0; p < 6; p++) {
      const pleatH = 0.58 + (p % 3) * 0.055;
      const pleatPivot = new THREE.Group();
      pleatPivot.position.set(
        (p - 2.5) * 0.022,
        0.02,
        0.088 + (p % 2) * 0.009,
      );
      pleatPivot.rotation.z = (p - 2.5) * 0.022;
      pelvis.add(pleatPivot);

      const pleatMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.022,
          0.028 + (p % 2) * 0.006,
          pleatH,
          7,
          1,
          true,
          -Math.PI * 0.35,
          Math.PI * 0.7,
        ),
        p % 2 === 0 ? sareeMat : sareeDarkFoldMat,
      );
      pleatMesh.position.set(0, -pleatH * 0.5, 0);
      pleatMesh.castShadow = true;
      pleatPivot.add(pleatMesh);

      const pleatZari = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.0285,
          0.03,
          0.044,
          7,
          1,
          true,
          -Math.PI * 0.35,
          Math.PI * 0.7,
        ),
        goldMat,
      );
      pleatZari.position.set(0, -pleatH + 0.028, 0.002);
      pleatPivot.add(pleatZari);

      swayingClothPanels.push(pleatPivot);
    }

    // Layered Tattered Hip-to-Mid-Calf Curved Saree Drape Panels (articulated around hips & thighs, stopping mid-calf so tarnished payal & backward feet are clearly visible)
    const numTatters = 11;
    for (let i = 0; i < numTatters; i++) {
      const ang = (i / numTatters) * Math.PI * 2;
      if (Math.cos(ang - Math.PI / 2) > 0.74) continue;
      const tatterLen = 0.5 + ((i * 5) % 4) * 0.065;
      const tatterPivot = new THREE.Group();
      tatterPivot.position.set(
        Math.cos(ang) * 0.122,
        -0.005,
        Math.sin(ang) * 0.095,
      );
      tatterPivot.rotation.y = -ang + Math.PI / 2;
      pelvis.add(tatterPivot);

      const tatterCloth = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.044,
          0.056 + (i % 2) * 0.012,
          tatterLen,
          7,
          1,
          true,
          -Math.PI * 0.36,
          Math.PI * 0.72,
        ),
        i % 2 === 0 ? sareeMat : sareeDarkFoldMat,
      );
      tatterCloth.position.set(0, -tatterLen * 0.5, 0);
      tatterCloth.rotation.x = 0.06;
      tatterCloth.castShadow = true;
      tatterPivot.add(tatterCloth);

      // Faded antique gold zari border hem along tattered skirt edge (some edges frayed/torn off)
      if (i % 3 !== 2) {
        const tatterGoldBorder = new THREE.Mesh(
          new THREE.CylinderGeometry(
            0.055,
            0.059,
            0.042,
            7,
            1,
            true,
            -Math.PI * 0.36,
            Math.PI * 0.72,
          ),
          goldMat,
        );
        tatterGoldBorder.position.set(0, -tatterLen + 0.025, 0.003);
        tatterGoldBorder.rotation.x = 0.06;
        tatterPivot.add(tatterGoldBorder);
      }

      swayingClothPanels.push(tatterPivot);
    }
  } else if (
    options.clothingStyle === 'guard_coat' ||
    options.clothingStyle === 'thakur_sherwani' ||
    isTantrik
  ) {
    const coatMat = new THREE.MeshStandardMaterial({
      color:
        options.coatColor ??
        options.robeColor ??
        options.shirtColor ??
        0x3d1c1c,
      roughness: 0.82,
    });
    chestMesh.material = coatMat;
    lowerTorsoMesh.material = coatMat;
    shoulderBridge.material = coatMat;

    [-1, 1].forEach((zDir) => {
      const flap = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.36, 0.025),
        coatMat,
      );
      flap.position.set(0, -0.16, zDir * 0.098);
      pelvis.add(flap);
    });
  }

  // Thick Weathered Dark Brown / Charcoal Wool Shawl draped heavily over shoulders (Watchman Baba & Thakur)
  if (options.shawl || isDhotiKurta) {
    const baseShawlHex = options.shawlColor ?? (isDhotiKurta ? 0x2d2420 : 0x6b2822);
    const shawlMat = new THREE.MeshStandardMaterial({
      color: baseShawlHex,
      map: woolTex ?? undefined,
      roughness: 0.94,
      metalness: 0.01,
    });
    const shawlFoldMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(baseShawlHex).multiplyScalar(0.76),
      map: woolTex ?? undefined,
      roughness: 0.95,
      metalness: 0.01,
    });
    const shawlFringeMat = new THREE.MeshStandardMaterial({
      color: 0x4d3a2c,
      roughness: 0.94,
    });

    // Heavy upper wool wrap circling neck and both shoulders
    const shawlCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.165, 0.046, 12, 24),
      shawlMat,
    );
    shawlCollar.rotation.x = Math.PI / 2.22;
    shawlCollar.scale.set(1.18, 0.88, 1.04);
    shawlCollar.position.set(0, 0.172, 0.004);
    shawlCollar.castShadow = true;
    shawlCollar.receiveShadow = true;
    chest.add(shawlCollar);

    // Secondary overlapping chest fold for authentic thick wool bulk
    const shawlOuterWrap = new THREE.Mesh(
      new THREE.TorusGeometry(0.172, 0.038, 10, 22, Math.PI * 1.35),
      shawlFoldMat,
    );
    shawlOuterWrap.rotation.set(Math.PI / 2.45, 0.14, -0.45);
    shawlOuterWrap.scale.set(1.12, 0.86, 1.0);
    shawlOuterWrap.position.set(-0.01, 0.125, 0.016);
    shawlOuterWrap.castShadow = true;
    chest.add(shawlOuterWrap);

    // Thick wool shoulder caps draping softly over left & right upper arms
    [-1, 1].forEach((side) => {
      const shoulderMantle = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.068, 0.12, 8, 12),
        side === -1 ? shawlMat : shawlFoldMat,
      );
      shoulderMantle.position.set(side * 0.175, 0.142, -0.005);
      shoulderMantle.rotation.z = side * 0.34;
      shoulderMantle.scale.set(1.0, 1.0, 1.22);
      shoulderMantle.castShadow = true;
      chest.add(shoulderMantle);
    });

    // Draped back wool cape across upper back
    const backDrape = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.34, 0.036),
      shawlMat,
    );
    backDrape.position.set(0, 0.025, -0.118);
    backDrape.rotation.x = 0.08;
    backDrape.castShadow = true;
    backDrape.receiveShadow = true;
    chest.add(backDrape);

    // Heavy front shawl tail draped over left chest with subtle woven stripe & wool fringe
    const shawlFrontTail = new THREE.Mesh(
      new THREE.BoxGeometry(0.118, 0.38, 0.03),
      shawlMat,
    );
    shawlFrontTail.position.set(-0.1, -0.02, 0.112);
    shawlFrontTail.rotation.z = 0.09;
    shawlFrontTail.rotation.y = 0.16;
    shawlFrontTail.castShadow = true;
    chest.add(shawlFrontTail);
    swayingClothPanels.push(shawlFrontTail);

    const shawlHemBand = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.026, 0.033),
      shawlFringeMat,
    );
    shawlHemBand.position.set(0, -0.165, 0);
    shawlFrontTail.add(shawlHemBand);

    // Right shoulder shorter tucked wool drape
    const shawlRightFold = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.22, 0.028),
      shawlFoldMat,
    );
    shawlRightFold.position.set(0.105, 0.06, 0.108);
    shawlRightFold.rotation.z = -0.18;
    shawlRightFold.rotation.y = -0.18;
    shawlRightFold.castShadow = true;
    chest.add(shawlRightFold);
  }

  // Rudraksha Mala necklace
  if (options.rudraksha) {
    const rudraMat = new THREE.MeshStandardMaterial({
      color: 0x5a2d10,
      roughness: 0.6,
    });
    const necklace = new THREE.Group();
    for (let b = 0; b < 14; b++) {
      const angle = (b / 14) * Math.PI * 2;
      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(0.014, 6, 6),
        rudraMat,
      );
      bead.position.set(
        Math.cos(angle) * 0.105,
        0.18 - Math.sin(angle) * 0.055,
        Math.sin(angle) * 0.095,
      );
      necklace.add(bead);
    }
    chest.add(necklace);
  }

  // ============================================================================
  // 3. NECK & ANATOMICAL HEAD (EYES, BROW, CHEEKBONES, WEATHERED WRINKLES, HAIR)
  // ============================================================================
  const neck = new THREE.Group();
  neck.position.set(0, 0.215, 0);
  chest.add(neck);

  const neckMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(isSlenderGhost ? 0.036 : 0.046, NECK_H * 0.55, 8, 10),
    skinMat,
  );
  neckMesh.position.set(0, NECK_H * 0.45, 0);
  neckMesh.castShadow = true;
  neckMesh.receiveShadow = true;
  neck.add(neckMesh);

  // Subtle gaunt neck tendons for Witch Rukmini
  if (isSlenderGhost) {
    [-1, 1].forEach((side) => {
      const tendon = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.006, NECK_H * 0.72, 4, 6),
        skinShadowMat,
      );
      tendon.position.set(side * 0.019, NECK_H * 0.48, 0.025);
      tendon.rotation.z = side * 0.14;
      neck.add(tendon);
    });
  }

  const headGroup = new THREE.Group();
  headGroup.position.set(0, NECK_H + HEAD_RAD * 0.78, 0);
  if (options.snappedNeck) {
    // Keep head upright enough so her terrifying face is 100% readable; twitchy tilts happen in update()
    headGroup.rotation.z = -0.06;
  }
  neck.add(headGroup);

  // Upper Cranium Dome (Gaunt slender female oval head for Rukmini, natural sculpted oval for humans)
  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(HEAD_RAD, 24, 20),
    skinMat,
  );
  headMesh.scale.set(
    options.isGhost ? 0.84 : 0.91,
    options.isGhost ? 1.09 : 1.07,
    options.isGhost ? 0.96 : 1.0,
  );
  headMesh.position.set(0, 0.024, -0.004);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headGroup.add(headMesh);

  // Sculpted Tapered Jawline, Mandible & Chin Contour (sharper & more gaunt for Rukmini)
  const jawMesh = new THREE.Mesh(
    new THREE.SphereGeometry(HEAD_RAD * (options.isGhost ? 0.64 : 0.72), 18, 14),
    skinMat,
  );
  jawMesh.position.set(0, options.isGhost ? -0.044 : -0.038, 0.014);
  jawMesh.scale.set(
    options.isGhost ? 0.76 : 0.84,
    options.isGhost ? 0.98 : 0.92,
    options.isGhost ? 0.86 : 0.9,
  );
  jawMesh.castShadow = true;
  jawMesh.receiveShadow = true;
  headGroup.add(jawMesh);

  // Subtle Chin Pad for clean oval face taper (pointed gaunt chin for Rukmini)
  const chinPad = new THREE.Mesh(
    new THREE.SphereGeometry(options.isGhost ? 0.026 : 0.034, 12, 10),
    skinMat,
  );
  chinPad.position.set(0, options.isGhost ? -0.094 : -0.082, 0.046);
  chinPad.scale.set(options.isGhost ? 0.92 : 1.08, 0.82, 0.88);
  chinPad.castShadow = true;
  headGroup.add(chinPad);

  // Left & Right Jaw Rami, Prominent Cheekbones, Hollow Sunken Cheeks (Ghost), and Sculpted Outer Ears
  [-1, 1].forEach((side) => {
    const jawAngle = new THREE.Mesh(
      new THREE.CapsuleGeometry(options.isGhost ? 0.018 : 0.024, 0.058, 8, 10),
      skinMat,
    );
    jawAngle.position.set(side * (options.isGhost ? 0.044 : 0.052), -0.05, 0.016);
    jawAngle.rotation.z = side * (options.isGhost ? 0.48 : 0.42);
    jawAngle.rotation.x = 0.22;
    headGroup.add(jawAngle);

    // High sharp cheekbones
    const cheekbone = new THREE.Mesh(
      new THREE.SphereGeometry(options.isGhost ? 0.03 : 0.033, 12, 10),
      skinMat,
    );
    cheekbone.position.set(
      side * (options.isGhost ? 0.054 : 0.056),
      options.isGhost ? 0.004 : -0.002,
      HEAD_RAD * (options.isGhost ? 0.77 : 0.72),
    );
    cheekbone.scale.set(1.06, options.isGhost ? 0.62 : 0.72, 0.82);
    headGroup.add(cheekbone);

    // Deep hollowed-out gaunt sunken cheek shadows beneath high cheekbones for Rukmini
    if (options.isGhost) {
      const hollowCheek = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 12, 10),
        skinSocketMat,
      );
      hollowCheek.position.set(side * 0.046, -0.027, HEAD_RAD * 0.66);
      hollowCheek.scale.set(0.86, 1.12, 0.56);
      hollowCheek.rotation.y = side * 0.34;
      headGroup.add(hollowCheek);
    }

    // Sculpted Outer Ear (Pinna rim + darker inner cavity + lobe)
    const earGroup = new THREE.Group();
    earGroup.position.set(side * (HEAD_RAD * (options.isGhost ? 0.84 : 0.89)), 0.004, -0.008);
    earGroup.rotation.z = side * 0.1;
    earGroup.rotation.y = -side * 0.28;
    headGroup.add(earGroup);

    const earOuter = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.012, 0.025, 6, 10),
      skinMat,
    );
    earOuter.scale.set(0.62, 1.0, 0.85);
    earGroup.add(earOuter);

    const earInner = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.0075, 0.015, 5, 8),
      skinSocketMat,
    );
    earInner.position.set(side * 0.003, 0.001, 0.004);
    earInner.scale.set(0.5, 1.0, 0.7);
    earGroup.add(earInner);
  });

  // Sculpted Supraorbital Brow Ridge & Glabella Bridge
  const browRidge = new THREE.Mesh(
    new THREE.CapsuleGeometry(options.isGhost ? 0.0135 : 0.015, 0.086, 8, 12),
    skinMat,
  );
  browRidge.rotation.z = Math.PI / 2;
  browRidge.position.set(0, 0.049, HEAD_RAD * 0.84);
  browRidge.scale.set(1.0, 1.0, 0.78);
  headGroup.add(browRidge);

  // Natural Arched Eyebrows (Furrowed menacing dark brows for Rukmini, silver-gray for Watchman Baba)
  const browMat = new THREE.MeshStandardMaterial({
    color: options.weatheredFace
      ? (options.beardColor ?? 0x9fa3a8)
      : (options.hairColor ?? 0x151210),
    roughness: 0.92,
  });
  [-1, 1].forEach((side) => {
    const innerBrow = new THREE.Mesh(
      new THREE.CapsuleGeometry(
        options.weatheredFace ? 0.0078 : 0.0048,
        0.022,
        6,
        8,
      ),
      browMat,
    );
    innerBrow.rotation.z = Math.PI / 2 - side * (options.isGhost ? 0.34 : 0.08);
    innerBrow.position.set(side * 0.031, options.isGhost ? 0.051 : 0.052, HEAD_RAD * 0.91);
    headGroup.add(innerBrow);

    const outerBrow = new THREE.Mesh(
      new THREE.CapsuleGeometry(
        options.weatheredFace ? 0.0062 : 0.0038,
        0.018,
        6,
        8,
      ),
      browMat,
    );
    outerBrow.rotation.z = Math.PI / 2 + side * (options.isGhost ? 0.06 : 0.16);
    outerBrow.position.set(side * 0.051, options.isGhost ? 0.053 : 0.05, HEAD_RAD * 0.85);
    headGroup.add(outerBrow);
  });

  // DARK CRACKED VEINS & GAUNT HORROR CREASES ON WITCH RUKMINI'S FACE
  if (options.isGhost) {
    const veinMat = new THREE.MeshStandardMaterial({
      color: 0x260910,
      emissive: 0x140205,
      emissiveIntensity: 0.35,
      roughness: 0.85,
    });
    // Branching 3D cracked veins radiating from sunken eye sockets across cheekbones & temples
    [-1, 1].forEach((side) => {
      const cheekVein1 = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.044, 0.015, HEAD_RAD * 0.88),
        new THREE.Vector3(side * 0.056, -0.004, HEAD_RAD * 0.84),
        new THREE.Vector3(side * 0.051, -0.026, HEAD_RAD * 0.78),
        new THREE.Vector3(side * 0.04, -0.045, HEAD_RAD * 0.74),
      ]);
      headGroup.add(
        new THREE.Mesh(new THREE.TubeGeometry(cheekVein1, 10, 0.0016, 5, false), veinMat),
      );

      const cheekVeinBranch = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.055, -0.006, HEAD_RAD * 0.84),
        new THREE.Vector3(side * 0.068, -0.018, HEAD_RAD * 0.72),
        new THREE.Vector3(side * 0.064, -0.036, HEAD_RAD * 0.65),
      ]);
      headGroup.add(
        new THREE.Mesh(new THREE.TubeGeometry(cheekVeinBranch, 8, 0.0012, 5, false), veinMat),
      );

      const templeVein = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.048, 0.036, HEAD_RAD * 0.85),
        new THREE.Vector3(side * 0.063, 0.054, HEAD_RAD * 0.75),
        new THREE.Vector3(side * 0.058, 0.072, HEAD_RAD * 0.68),
      ]);
      headGroup.add(
        new THREE.Mesh(new THREE.TubeGeometry(templeVein, 8, 0.0015, 5, false), veinMat),
      );

      const foreheadCrack = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.014, 0.068, HEAD_RAD * 0.89),
        new THREE.Vector3(side * 0.028, 0.079, HEAD_RAD * 0.84),
        new THREE.Vector3(side * 0.042, 0.074, HEAD_RAD * 0.79),
      ]);
      headGroup.add(
        new THREE.Mesh(new THREE.TubeGeometry(foreheadCrack, 6, 0.0012, 4, false), veinMat),
      );

      // Deep shadowed tear-trough & gaunt nasolabial crease framing the hollow mouth
      const tearHollow = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.0046, 0.028, 5, 6),
        skinSocketMat,
      );
      tearHollow.rotation.z = side * 0.34;
      tearHollow.position.set(side * 0.029, -0.014, HEAD_RAD * 0.89);
      headGroup.add(tearHollow);
    });
  }

  // WEATHERED FACE DETAILS FOR WATCHMAN BABA (Forehead Wrinkles, Crow's Feet, Under-Eye Bags, Nasolabial Folds)
  if (options.weatheredFace) {
    for (let w = 0; w < 3; w++) {
      const wrinkleCrease = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.0026, 0.062 - w * 0.008, 4, 6),
        skinSocketMat,
      );
      wrinkleCrease.rotation.z = Math.PI / 2;
      wrinkleCrease.position.set(
        0,
        0.067 + w * 0.01,
        HEAD_RAD * (0.9 - w * 0.028),
      );
      headGroup.add(wrinkleCrease);
    }

    [-1, 1].forEach((side) => {
      // Deep nasolabial laugh/weather lines & sunken cheek creases
      const cheekCrease = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.0036, 0.036, 4, 6),
        skinSocketMat,
      );
      cheekCrease.position.set(side * 0.035, -0.016, HEAD_RAD * 0.91);
      cheekCrease.rotation.z = side * 0.4;
      headGroup.add(cheekCrease);

      const eyeBag = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.0042, 0.022, 4, 6),
        skinSocketMat,
      );
      eyeBag.rotation.z = Math.PI / 2 + side * 0.14;
      eyeBag.position.set(side * 0.039, 0.012, HEAD_RAD * 0.91);
      headGroup.add(eyeBag);
    });
  }

  // Sculpted Anatomical Nose Bridge, Sharp Tip (for Rukmini) & Subtle Nasal Wings (Alae)
  const noseBridge = new THREE.Mesh(
    new THREE.CapsuleGeometry(options.isGhost ? 0.0064 : 0.0088, options.isGhost ? 0.038 : 0.032, 8, 10),
    skinMat,
  );
  noseBridge.position.set(0, 0.015, HEAD_RAD * (options.isGhost ? 0.93 : 0.94));
  noseBridge.rotation.x = options.isGhost ? -0.32 : -0.25;
  noseBridge.scale.set(options.isGhost ? 0.78 : 0.95, 1.0, options.isGhost ? 1.24 : 1.08);
  headGroup.add(noseBridge);

  const noseTip = new THREE.Mesh(
    options.isGhost
      ? new THREE.ConeGeometry(0.0105, 0.026, 8)
      : new THREE.SphereGeometry(0.0125, 10, 8),
    skinMat,
  );
  if (options.isGhost) {
    noseTip.rotation.x = Math.PI / 2 + 0.14;
    noseTip.position.set(0, -0.002, HEAD_RAD * 1.04);
  } else {
    noseTip.position.set(0, -0.001, HEAD_RAD * 1.03);
    noseTip.scale.set(1.06, 0.82, 0.96);
  }
  headGroup.add(noseTip);

  [-1, 1].forEach((side) => {
    const nostrilWing = new THREE.Mesh(
      new THREE.SphereGeometry(options.isGhost ? 0.006 : 0.0075, 8, 6),
      options.isGhost ? skinSocketMat : skinShadowMat,
    );
    nostrilWing.position.set(
      side * (options.isGhost ? 0.009 : 0.011),
      -0.006,
      HEAD_RAD * 0.96,
    );
    nostrilWing.scale.set(0.86, 0.7, 0.85);
    headGroup.add(nostrilWing);
  });

  // Mouth & Lips: Chilling Half-Open Dark Mouth for Witch Rukmini, natural closed lips for humans
  const lipColor = options.isGhost
    ? new THREE.Color(0x2c070c)
    : baseSkinColor.clone().lerp(new THREE.Color(0x5e2c2a), 0.45);
  const mouthMat = new THREE.MeshStandardMaterial({
    color: lipColor,
    roughness: options.isGhost ? 0.52 : 0.7,
    metalness: 0.04,
  });

  if (options.isGhost) {
    // Abyssal dark half-open mouth cavity
    const darkCavityMat = new THREE.MeshStandardMaterial({
      color: 0x070103,
      roughness: 0.96,
    });
    const mouthCavity = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 14, 10),
      darkCavityMat,
    );
    mouthCavity.scale.set(1.18, 0.88, 0.58);
    mouthCavity.position.set(0, -0.044, HEAD_RAD * 0.84);
    headGroup.add(mouthCavity);

    // Subtle eerie gaunt yellowed-bone teeth peeking inside the half-open dark mouth
    const toothMat = new THREE.MeshStandardMaterial({
      color: 0xbcb4a6,
      roughness: 0.42,
      metalness: 0.05,
    });
    for (let ti = -2; ti <= 2; ti++) {
      const upperTooth = new THREE.Mesh(
        new THREE.BoxGeometry(0.0052, 0.0072, 0.004),
        toothMat,
      );
      upperTooth.position.set(ti * 0.0064, -0.036, HEAD_RAD * 0.905 - Math.abs(ti) * 0.0022);
      headGroup.add(upperTooth);

      const lowerTooth = new THREE.Mesh(
        new THREE.BoxGeometry(0.0048, 0.006, 0.004),
        toothMat,
      );
      lowerTooth.position.set(ti * 0.006, -0.053, HEAD_RAD * 0.895 - Math.abs(ti) * 0.0022);
      headGroup.add(lowerTooth);
    }

    // Gaunt parted dark dried-blood lips framing the chilling open mouth
    const upperLip = new THREE.Mesh(
      new THREE.TorusGeometry(0.025, 0.0044, 8, 16, Math.PI),
      mouthMat,
    );
    upperLip.position.set(0, -0.044, HEAD_RAD * 0.895);
    upperLip.scale.set(1.1, 0.62, 0.72);
    headGroup.add(upperLip);

    const lowerLip = new THREE.Mesh(
      new THREE.TorusGeometry(0.025, 0.0048, 8, 16, Math.PI),
      mouthMat,
    );
    lowerLip.rotation.z = Math.PI;
    lowerLip.position.set(0, -0.045, HEAD_RAD * 0.885);
    lowerLip.scale.set(1.06, 0.72, 0.72);
    headGroup.add(lowerLip);

    // Dark hollowed creases at mouth corners
    [-1, 1].forEach((side) => {
      const mouthCorner = new THREE.Mesh(
        new THREE.SphereGeometry(0.007, 8, 6),
        skinSocketMat,
      );
      mouthCorner.position.set(side * 0.029, -0.045, HEAD_RAD * 0.86);
      headGroup.add(mouthCorner);
    });
  } else {
    const upperLip = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.0052, 0.028, 6, 8),
      mouthMat,
    );
    upperLip.rotation.z = Math.PI / 2;
    upperLip.position.set(0, -0.034, HEAD_RAD * 0.92);
    upperLip.scale.set(1.0, 1.0, 0.72);
    const lowerLip = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.006, 0.024, 6, 8),
      mouthMat,
    );
    lowerLip.rotation.z = Math.PI / 2;
    lowerLip.position.set(0, -0.042, HEAD_RAD * 0.91);
    lowerLip.scale.set(1.0, 1.0, 0.72);
    headGroup.add(upperLip, lowerLip);
  }

  // Recessed Eye Sockets & Eyes (Dark Sunken Sockets + Intensely Glowing Blood-Red Eyes for Rukmini)
  let leftEye: THREE.Mesh | undefined;
  let rightEye: THREE.Mesh | undefined;

  const eyeY = 0.027;
  const eyeZ = HEAD_RAD * 0.86;
  const eyeXOffset = options.isGhost ? 0.034 : 0.037;

  if (options.glowingEyes || options.blindEyes) {
    // Deep Dark Sunken Eye Sockets around Rukmini's glowing blood-red eyes
    const deepSocketMat = new THREE.MeshStandardMaterial({
      color: 0x0b0407,
      roughness: 0.96,
      metalness: 0.01,
    });
    const emissiveColor = options.eyeEmissiveColor ?? 0xff1111;
    const glowMat = new THREE.MeshStandardMaterial({
      color: emissiveColor,
      emissive: emissiveColor,
      emissiveIntensity: 2.5,
      roughness: 0.08,
    });
    const darkIrisRingMat = new THREE.MeshStandardMaterial({
      color: 0x3b0004,
      emissive: 0x770008,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    const hotPupilGlintMat = new THREE.MeshBasicMaterial({
      color: 0xff6655,
    });

    [-1, 1].forEach((dir) => {
      // Sunken bruised/blackened orbital hollow
      const orbitalHollow = new THREE.Mesh(
        new THREE.SphereGeometry(0.0245, 14, 12),
        deepSocketMat,
      );
      orbitalHollow.scale.set(1.24, 0.92, 0.56);
      orbitalHollow.position.set(dir * eyeXOffset, eyeY - 0.001, HEAD_RAD * 0.835);
      headGroup.add(orbitalHollow);

      // Dark under-eye sunken ring shadow
      const underEyeHollow = new THREE.Mesh(
        new THREE.TorusGeometry(0.02, 0.0052, 6, 14, Math.PI * 0.85),
        skinSocketMat,
      );
      underEyeHollow.rotation.z = Math.PI * 1.08;
      underEyeHollow.position.set(dir * eyeXOffset, eyeY - 0.007, HEAD_RAD * 0.875);
      headGroup.add(underEyeHollow);

      // Glowing Blood-Red Eyeball nestled inside the dark sunken socket
      const eyeMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.0138, 14, 12),
        glowMat,
      );
      eyeMesh.position.set(dir * eyeXOffset, eyeY, HEAD_RAD * 0.888);
      eyeMesh.scale.set(1.06, 0.9, 0.85);

      // Subtle dark-crimson iris ring & hot pinpoint pupil glint for haunting depth
      const irisRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.0072, 0.002, 6, 14),
        darkIrisRingMat,
      );
      irisRing.position.z = 0.0112;
      eyeMesh.add(irisRing);

      const hotPupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.0048, 8, 8),
        hotPupilGlintMat,
      );
      hotPupil.position.z = 0.011;
      eyeMesh.add(hotPupil);

      headGroup.add(eyeMesh);
      if (dir === -1) leftEye = eyeMesh;
      else rightEye = eyeMesh;
    });
  } else {
    const scleraMat = new THREE.MeshStandardMaterial({
      color: 0xece8e1,
      roughness: 0.28,
      metalness: 0.02,
    });
    const irisMat = new THREE.MeshStandardMaterial({
      color: 0x26150b, // Realistic deep dark-brown iris
      roughness: 0.22,
      metalness: 0.05,
    });
    const pupilMat = new THREE.MeshStandardMaterial({
      color: 0x060606,
      roughness: 0.14,
    });
    const lashLineMat = new THREE.MeshStandardMaterial({
      color: 0x120e0c,
      roughness: 0.85,
    });
    const catchlightMat = new THREE.MeshBasicMaterial({
      color: 0xf4efe8,
    });

    [-1, 1].forEach((dir) => {
      // Shaded recessed orbital eye socket backing
      const eyeSocket = new THREE.Mesh(
        new THREE.SphereGeometry(0.0215, 12, 10),
        skinSocketMat,
      );
      eyeSocket.scale.set(1.18, 0.82, 0.55);
      eyeSocket.position.set(dir * eyeXOffset, eyeY + 0.001, eyeZ - 0.003);
      headGroup.add(eyeSocket);

      // Eyeball nestled inside the orbital socket
      const eyeBall = new THREE.Mesh(
        new THREE.SphereGeometry(0.0145, 14, 12),
        scleraMat,
      );
      eyeBall.position.set(dir * eyeXOffset, eyeY, eyeZ + 0.003);
      eyeBall.scale.set(1.02, 0.96, 0.88);

      const iris = new THREE.Mesh(
        new THREE.SphereGeometry(0.0082, 12, 10),
        irisMat,
      );
      iris.scale.z = 0.42;
      iris.position.set(0, 0, 0.0115);
      eyeBall.add(iris);

      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.0045, 10, 8),
        pupilMat,
      );
      pupil.scale.z = 0.36;
      pupil.position.set(0, 0, 0.0138);
      eyeBall.add(pupil);

      // Subtle corneal catchlight for lifelike focus under lantern / flashlight light
      const catchlight = new THREE.Mesh(
        new THREE.SphereGeometry(0.0016, 6, 6),
        catchlightMat,
      );
      catchlight.position.set(0.0028, 0.0026, 0.0144);
      eyeBall.add(catchlight);

      // Sculpted Upper Eyelid Hood
      const upperEyelid = new THREE.Mesh(
        new THREE.SphereGeometry(
          0.016,
          12,
          8,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.46,
        ),
        skinShadowMat,
      );
      upperEyelid.rotation.x = -0.32;
      eyeBall.add(upperEyelid);

      // Subtle Upper Lash Line
      const lashRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.0148, 0.0015, 6, 14, Math.PI * 0.82),
        lashLineMat,
      );
      lashRim.rotation.z = Math.PI * 0.09;
      lashRim.rotation.x = 0.16;
      lashRim.position.set(0, 0.003, 0.006);
      eyeBall.add(lashRim);

      // Soft Lower Eyelid Rim
      const lowerEyelid = new THREE.Mesh(
        new THREE.TorusGeometry(0.0142, 0.0022, 6, 12, Math.PI * 0.72),
        skinShadowMat,
      );
      lowerEyelid.rotation.z = Math.PI * 1.14;
      lowerEyelid.position.set(0, -0.003, 0.004);
      eyeBall.add(lowerEyelid);

      headGroup.add(eyeBall);
      if (dir === -1) leftEye = eyeBall;
      else rightEye = eyeBall;
    });
  }

  // Forehead Tilak / Smudged Bridal Bindi & Dried Sindoor Line (clearly visible above Rukmini's brow & in center hair parting)
  if (options.tilak || isSaree || isKurti) {
    const bindiMat = new THREE.MeshStandardMaterial({
      color: isSaree ? 0x8f0714 : 0x5c1118,
      emissive: isSaree ? 0x260205 : 0x000000,
      roughness: 0.72,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const bindi = new THREE.Mesh(
      new THREE.CircleGeometry(isSaree ? 0.012 : 0.0045, 14),
      bindiMat,
    );
    bindi.position.set(0, 0.059, HEAD_RAD * (isSaree ? 0.905 : 0.94));
    headGroup.add(bindi);

    if (isSaree) {
      // Smudged dark-red bridal bindi streak smeared down slightly between her brows
      const smudgeMat = new THREE.MeshStandardMaterial({
        color: 0x5c050d,
        roughness: 0.85,
        transparent: true,
        opacity: 0.78,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      });
      const bindiSmudge = new THREE.Mesh(
        new THREE.PlaneGeometry(0.014, 0.022),
        smudgeMat,
      );
      bindiSmudge.position.set(0.002, 0.052, HEAD_RAD * 0.903);
      bindiSmudge.rotation.z = -0.18;
      headGroup.add(bindiSmudge);

      // Dried dark-crimson Sindoor line running cleanly up the center hair parting (माँग में सूखा सिंदूर)
      const sindoorCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.094, HEAD_RAD * 0.78),
        new THREE.Vector3(0, 0.122, HEAD_RAD * 0.56),
        new THREE.Vector3(0, 0.141, HEAD_RAD * 0.25),
        new THREE.Vector3(0, 0.146, -0.005),
      ]);
      const sindoorLine = new THREE.Mesh(
        new THREE.TubeGeometry(sindoorCurve, 12, 0.0052, 6, false),
        bindiMat,
      );
      sindoorLine.scale.set(0.85, 0.7, 1.0);
      headGroup.add(sindoorLine);
    } else if (options.tilak) {
      const tilakMark = new THREE.Mesh(
        new THREE.BoxGeometry(0.009, 0.032, 0.006),
        bindiMat,
      );
      tilakMark.position.set(0, 0.068, HEAD_RAD * 0.93);
      headGroup.add(tilakMark);
    }
  }

  // ============================================================================
  // HAIR, FOLDED RAJASTHANI TURBAN (PAGRI), & FACE-DRAPING BLACK HAIR FOR RUKMINI
  // ============================================================================
  const hairStyle = options.hairStyle ?? 'short';
  const swayingHairLocks: THREE.Object3D[] = [];

  if (hairStyle === 'turban') {
    const turbBaseColor = options.turbanColor ?? 0x5c1f19;
    const turbMat = new THREE.MeshStandardMaterial({
      color: turbBaseColor,
      map: cottonTex ?? undefined,
      roughness: 0.88,
      metalness: 0.02,
    });
    const turbAccentMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(turbBaseColor).multiplyScalar(0.76),
      map: cottonTex ?? undefined,
      roughness: 0.9,
      metalness: 0.02,
    });
    const turbBorderMat = new THREE.MeshStandardMaterial({
      color: 0x8a6a38, // Subtle muted antique ochre/gold woven Pagri stripe
      roughness: 0.72,
      metalness: 0.2,
    });

    // Side silver-gray temple hair tucked neatly beneath the Pagri
    [-1, 1].forEach((side) => {
      const sideLock = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.014, 0.042, 6, 8),
        hairMat,
      );
      sideLock.position.set(side * (HEAD_RAD * 0.89), 0.016, 0.008);
      headGroup.add(sideLock);
    });

    // Crossing Diagonal Forehead V-Folds (classic folded Rajasthani Pagri silhouette)
    [-1, 1].forEach((side) => {
      const diagFold = new THREE.Mesh(
        new THREE.TorusGeometry(HEAD_RAD * 1.04, 0.032, 10, 24, Math.PI * 1.25),
        side === -1 ? turbMat : turbAccentMat,
      );
      diagFold.rotation.set(Math.PI / 2.25, side * 0.34, side * 0.24);
      diagFold.position.set(side * 0.008, 0.066 + (side === 1 ? 0.012 : 0), 0.004);
      diagFold.castShadow = true;
      headGroup.add(diagFold);
    });

    // Multi-layered pleated coiled Pagri wraps rising toward the crown
    for (let t = 0; t < 5; t++) {
      const wrap = new THREE.Mesh(
        new THREE.TorusGeometry(
          HEAD_RAD * 1.05 - t * 0.009,
          0.034 - t * 0.0022,
          10,
          26,
        ),
        t % 2 === 0 ? turbMat : turbAccentMat,
      );
      wrap.rotation.x = Math.PI / 2.28 + (t % 2 === 0 ? 0.07 : -0.05);
      wrap.rotation.y = (t - 2) * 0.14;
      wrap.position.set(0, 0.058 + t * 0.023, -0.005);
      wrap.castShadow = true;
      wrap.receiveShadow = true;
      headGroup.add(wrap);
    }

    // Subtle woven ochre border band tucked into one diagonal fold
    const pagriAccentStripe = new THREE.Mesh(
      new THREE.TorusGeometry(HEAD_RAD * 1.065, 0.006, 6, 22, Math.PI * 0.95),
      turbBorderMat,
    );
    pagriAccentStripe.rotation.set(Math.PI / 2.25, 0.3, 0.2);
    pagriAccentStripe.position.set(0.005, 0.082, 0.006);
    headGroup.add(pagriAccentStripe);

    // Rounded tucked crown cloth dome
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(HEAD_RAD * 0.86, 16, 12),
      turbMat,
    );
    crown.position.set(0, 0.132, -0.004);
    crown.scale.set(1.0, 0.66, 1.04);
    crown.castShadow = true;
    headGroup.add(crown);

    // Traditional folded cloth tail (Shamla) draped neatly down back of turban
    const pagdiTail = new THREE.Mesh(
      new THREE.BoxGeometry(0.052, 0.2, 0.018),
      turbAccentMat,
    );
    pagdiTail.position.set(0.028, -0.032, -HEAD_RAD * 1.04);
    pagdiTail.rotation.x = 0.2;
    pagdiTail.rotation.z = -0.14;
    pagdiTail.castShadow = true;
    headGroup.add(pagdiTail);
    swayingClothPanels.push(pagdiTail);
  } else if (hairStyle === 'messy') {
    // RUKMINI: Long tangled raven-black hair PARTED CLEANLY LEFT & RIGHT and hanging strictly
    // vertically downward along -Y (draping softly over her shoulders & down her back — NEVER sticking out horizontally).
    // Upper/back scalp dome sitting behind the center hairline so forehead, smudged bindi & dried sindoor stay 100% visible
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(
        HEAD_RAD * 1.03,
        18,
        14,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.56,
      ),
      hairMat,
    );
    hairCap.scale.set(0.9, 1.03, 0.96);
    hairCap.position.set(0, 0.028, -0.02);
    hairCap.rotation.x = -0.14;
    hairCap.castShadow = true;
    headGroup.add(hairCap);

    // Helper: creates a softly flattened, organically tapered vertical hair lock hanging strictly downward along -Y
    const createTaperedVerticalLock = (
      len: number,
      topRadius: number,
      bottomRadius: number,
      depthFlatten: number,
      mat: THREE.Material,
    ): THREE.Mesh => {
      const geo = new THREE.CylinderGeometry(
        topRadius,
        bottomRadius,
        len,
        7,
        4,
        false,
      );
      // Shift origin to top root (y = 0) so the entire strand hangs straight downward along -Y (0 -> -len)
      geo.translate(0, -len * 0.5, 0);
      // Add subtle organic natural wave along X/Z without ever sticking backward horizontally
      const pos = geo.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        const py = pos.getY(v);
        const t = Math.min(1, Math.max(0, -py / len));
        const waveX = Math.sin(t * Math.PI * 2.1) * 0.008 * t;
        const gentleContourZ = Math.sin(t * Math.PI) * 0.012;
        pos.setX(v, pos.getX(v) + waveX);
        pos.setZ(v, pos.getZ(v) * depthFlatten - gentleContourZ);
      }
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      return mesh;
    };

    // 1. Center-Parted Crown Sweeps & Layered Side Locks Framing Left & Right of Face (Face 100% Unobstructed!)
    [-1, 1].forEach((side) => {
      // Soft parted crown wave sweeping from sindoor line out to the temple & downward behind cheek
      const crownWave = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.022, 0.088, 7, 10),
        hairMat,
      );
      crownWave.position.set(side * 0.062, 0.084, HEAD_RAD * 0.44);
      crownWave.rotation.set(0.22, -side * 0.28, side * 0.68);
      crownWave.scale.set(0.85, 1.0, 0.65);
      crownWave.castShadow = true;
      headGroup.add(crownWave);

      // Soft layered side hair locks hanging strictly vertically downward along -Y over collarbones & shoulders
      // Positioned cleanly outside her cheeks (|x| >= 0.092) so eyes, cheekbones & mouth are 100% clear from the front
      const sideLockSpecs = [
        { x: side * 0.094, y: 0.055, z: 0.022, len: 0.36, topR: 0.02, botR: 0.003, leanZ: -side * 0.035 },
        { x: side * 0.104, y: 0.042, z: 0.004, len: 0.46, topR: 0.024, botR: 0.004, leanZ: -side * 0.045 },
        { x: side * 0.102, y: 0.032, z: -0.022, len: 0.54, topR: 0.026, botR: 0.004, leanZ: -side * 0.03 },
        { x: side * 0.092, y: 0.024, z: -0.048, len: 0.58, topR: 0.024, botR: 0.0035, leanZ: -side * 0.02 },
      ];
      sideLockSpecs.forEach((lk, idx) => {
        const lockPivot = new THREE.Group();
        lockPivot.position.set(lk.x, lk.y, lk.z);
        lockPivot.userData.isVerticalHair = true;
        lockPivot.userData.baseRotZ = lk.leanZ;
        headGroup.add(lockPivot);

        const strandMesh = createTaperedVerticalLock(
          lk.len,
          lk.topR,
          lk.botR,
          0.56,
          idx % 2 === 0 ? hairMat : hairShadowMat,
        );
        lockPivot.add(strandMesh);
        swayingHairLocks.push(lockPivot);
      });
    });

    // 2. Soft Organic Two-Tier Vertical Back Hair Cascade (hanging straight down her nape & back along -Y)
    // Inner fullness layer: broad, softly-flattened tapered ribbons hugging her upper/mid back
    const innerBackCount = 8;
    for (let i = 0; i < innerBackCount; i++) {
      const frac = i / (innerBackCount - 1);
      const angle = Math.PI * 0.14 + frac * Math.PI * 0.72;
      const lockPivot = new THREE.Group();
      lockPivot.position.set(
        Math.cos(angle) * (HEAD_RAD * 0.88),
        0.022,
        -Math.sin(angle) * (HEAD_RAD * 0.84) - 0.012,
      );
      lockPivot.userData.isVerticalHair = true;
      lockPivot.userData.baseRotZ = -Math.cos(angle) * 0.03;
      headGroup.add(lockPivot);

      const len = 0.52 + (1 - Math.abs(frac - 0.5) * 1.4) * 0.14;
      const innerMesh = createTaperedVerticalLock(
        len,
        0.032,
        0.007,
        0.48,
        i % 2 === 0 ? hairShadowMat : hairMat,
      );
      lockPivot.add(innerMesh);
      swayingHairLocks.push(lockPivot);
    }

    // Outer layered wispy horror locks draping organically over the inner curtain along -Y
    const outerBackCount = 11;
    for (let i = 0; i < outerBackCount; i++) {
      const frac = i / (outerBackCount - 1);
      const angle = Math.PI * 0.08 + frac * Math.PI * 0.84;
      const lockPivot = new THREE.Group();
      lockPivot.position.set(
        Math.cos(angle) * (HEAD_RAD * 0.94),
        0.03,
        -Math.sin(angle) * (HEAD_RAD * 0.9) - 0.016,
      );
      lockPivot.userData.isVerticalHair = true;
      lockPivot.userData.baseRotZ = -Math.cos(angle) * 0.04;
      headGroup.add(lockPivot);

      const len = 0.42 + ((i * 5 + 2) % 4) * 0.085;
      const outerMesh = createTaperedVerticalLock(
        len,
        0.02,
        0.003,
        0.58,
        i % 2 === 0 ? hairMat : hairShadowMat,
      );
      lockPivot.add(outerMesh);
      swayingHairLocks.push(lockPivot);
    }
  } else if (hairStyle === 'long' || hairStyle === 'braid') {
    // Sculpted layered long dark hair with parted crown, face-framing waves, and flowing back layers (Riya / Neha)
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(
        HEAD_RAD * 1.05,
        20,
        16,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.62,
      ),
      hairMat,
    );
    hairCap.scale.set(0.95, 1.04, 1.03);
    hairCap.position.set(0, 0.032, -0.008);
    hairCap.castShadow = true;
    headGroup.add(hairCap);

    // Soft side-parted front crown waves framing forehead & temples
    [-1, 1].forEach((side) => {
      const crownWave = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.024, 0.085, 8, 10),
        side === 1 ? hairMat : hairShadowMat,
      );
      crownWave.position.set(side * 0.056, 0.078, HEAD_RAD * 0.64);
      crownWave.rotation.set(0.35, -side * 0.35, side * 0.62);
      headGroup.add(crownWave);

      // Cheekbone-framing long front locks (draped softly over shoulders)
      const frontStrandPivot = new THREE.Group();
      frontStrandPivot.position.set(side * (HEAD_RAD * 0.84), 0.024, 0.028);
      headGroup.add(frontStrandPivot);

      const sideWave = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.019, 0.28, 8, 10),
        hairMat,
      );
      sideWave.position.set(0, -0.135, 0.004);
      sideWave.rotation.z = -side * 0.06;
      sideWave.castShadow = true;
      frontStrandPivot.add(sideWave);
      swayingHairLocks.push(frontStrandPivot);

      const cheekLayer = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.015, 0.16, 6, 8),
        hairShadowMat,
      );
      cheekLayer.position.set(-side * 0.012, -0.075, 0.016);
      cheekLayer.rotation.z = side * 0.08;
      frontStrandPivot.add(cheekLayer);
    });

    if (hairStyle === 'braid') {
      for (let seg = 0; seg < 6; seg++) {
        const knot = new THREE.Mesh(
          new THREE.SphereGeometry(0.027 - seg * 0.0024, 8, 8),
          seg % 2 === 0 ? hairMat : hairShadowMat,
        );
        knot.scale.set(1.1, 0.85, 0.9);
        knot.position.set(
          0,
          -0.06 - seg * 0.052,
          -HEAD_RAD * 0.96 - seg * 0.008,
        );
        headGroup.add(knot);
      }
    } else {
      // Multi-layered flowing long back hair curtain
      for (let w = -4; w <= 4; w++) {
        const lockPivot = new THREE.Group();
        const angle = w * 0.25;
        lockPivot.position.set(
          Math.sin(angle) * (HEAD_RAD * 0.94),
          0.012,
          -Math.cos(angle) * (HEAD_RAD * 0.92),
        );
        headGroup.add(lockPivot);

        const len = 0.37 - Math.abs(w) * 0.02 + (Math.abs(w) % 2) * 0.025;
        const backWave = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.021, len, 8, 10),
          w % 2 === 0 ? hairMat : hairShadowMat,
        );
        backWave.position.set(0, -len * 0.52, -0.004);
        backWave.rotation.x = 0.06;
        backWave.castShadow = true;
        lockPivot.add(backWave);
        swayingHairLocks.push(lockPivot);
      }
    }
  } else if (hairStyle === 'messy_short') {
    // LAYERED MESSY DARK MALE HAIR (Kabir / Rahul) — tousled crown & forehead locks
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(
        HEAD_RAD * 1.05,
        18,
        14,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.58,
      ),
      hairMat,
    );
    hairCap.scale.set(0.95, 1.05, 1.03);
    hairCap.position.set(0, 0.032, -0.006);
    hairCap.castShadow = true;
    headGroup.add(hairCap);

    // Tousled layered crown locks swept across top & forehead
    const messyCrownLocks = [
      { x: -0.052, y: 0.092, z: 0.068, rx: 0.62, ry: -0.25, rz: 0.42, len: 0.055 },
      { x: -0.024, y: 0.104, z: 0.078, rx: 0.72, ry: -0.1, rz: 0.22, len: 0.062 },
      { x: 0.006, y: 0.106, z: 0.082, rx: 0.78, ry: 0.12, rz: -0.14, len: 0.064 },
      { x: 0.034, y: 0.098, z: 0.072, rx: 0.65, ry: 0.22, rz: -0.34, len: 0.058 },
      { x: 0.058, y: 0.086, z: 0.056, rx: 0.5, ry: 0.34, rz: -0.48, len: 0.05 },
      { x: -0.03, y: 0.128, z: 0.01, rx: 0.25, ry: -0.2, rz: 0.3, len: 0.068 },
      { x: 0.025, y: 0.128, z: -0.005, rx: 0.18, ry: 0.22, rz: -0.28, len: 0.068 },
      { x: 0, y: 0.122, z: -0.052, rx: -0.35, ry: 0, rz: 0.12, len: 0.064 },
    ];
    messyCrownLocks.forEach((lk, idx) => {
      const tuft = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.017, lk.len, 6, 8),
        idx % 2 === 0 ? hairMat : hairShadowMat,
      );
      tuft.position.set(lk.x, lk.y, lk.z);
      tuft.rotation.set(lk.rx, lk.ry, lk.rz);
      tuft.castShadow = true;
      headGroup.add(tuft);
    });

    // Tapered side locks & nape hair
    [-1, 1].forEach((side) => {
      const sideMessy = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.014, 0.062, 6, 8),
        hairShadowMat,
      );
      sideMessy.position.set(side * (HEAD_RAD * 0.91), 0.024, 0.012);
      sideMessy.rotation.z = side * 0.08;
      headGroup.add(sideMessy);
    });

    const napeHair = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.048, 0.055, 8, 10),
      hairShadowMat,
    );
    napeHair.rotation.z = Math.PI / 2;
    napeHair.position.set(0, -0.016, -HEAD_RAD * 0.82);
    napeHair.scale.set(1.0, 1.0, 0.65);
    headGroup.add(napeHair);
  } else if (hairStyle === 'short' || hairStyle === 'curly') {
    // Styled short dark male hair (clean sculpted crown, tapered sides, subtly swept front locks)
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(
        HEAD_RAD * 1.04,
        18,
        14,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.54,
      ),
      hairMat,
    );
    hairCap.scale.set(0.94, 1.04, 1.02);
    hairCap.position.set(0, 0.032, -0.008);
    hairCap.castShadow = true;
    headGroup.add(hairCap);

    // Swept styled top-front volume
    for (let f = -2; f <= 2; f++) {
      const tuft = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.016, 0.044, 6, 8),
        f % 2 === 0 ? hairMat : hairShadowMat,
      );
      tuft.position.set(
        f * 0.024,
        0.096 - Math.abs(f) * 0.004,
        HEAD_RAD * 0.72 - Math.abs(f) * 0.012,
      );
      tuft.rotation.set(0.45, f * 0.14, -0.22 - f * 0.1);
      headGroup.add(tuft);
    }

    // Tapered sideburns & clean nape line
    [-1, 1].forEach((side) => {
      const burn = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.01, 0.044, 6, 8),
        hairShadowMat,
      );
      burn.position.set(side * (HEAD_RAD * 0.9), 0.018, 0.018);
      headGroup.add(burn);
    });

    const backTaper = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.042, 0.052, 8, 10),
      hairShadowMat,
    );
    backTaper.rotation.z = Math.PI / 2;
    backTaper.position.set(0, -0.01, -HEAD_RAD * 0.8);
    backTaper.scale.set(1.0, 1.0, 0.6);
    headGroup.add(backTaper);
  }

  // Layered Silver-Gray Mustache & Full Sculpted Beard (Zero Cones!)
  if (options.hasMoustache) {
    const baseBeardColor = new THREE.Color(
      options.beardColor ?? options.hairColor ?? 0x9fa3a8,
    );
    const mousMat = new THREE.MeshStandardMaterial({
      color: baseBeardColor,
      roughness: 0.92,
      metalness: 0.02,
    });
    const mousDarkMat = new THREE.MeshStandardMaterial({
      color: baseBeardColor.clone().multiplyScalar(0.78),
      roughness: 0.94,
    });
    [-1, 1].forEach((side) => {
      const upperWing = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.0095, 0.034, 6, 8),
        mousMat,
      );
      upperWing.rotation.z = Math.PI / 2 - side * 0.24;
      upperWing.position.set(side * 0.02, -0.023, HEAD_RAD * 0.94);
      headGroup.add(upperWing);

      const lowerDroop = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.0075, 0.024, 6, 8),
        mousDarkMat,
      );
      lowerDroop.rotation.z = side * 0.36;
      lowerDroop.position.set(side * 0.039, -0.033, HEAD_RAD * 0.89);
      headGroup.add(lowerDroop);
    });
  }

  if (options.hasBeard) {
    const baseBeardColor = new THREE.Color(
      options.beardColor ?? options.hairColor ?? 0x9fa3a8,
    );
    const beardMat = new THREE.MeshStandardMaterial({
      color: baseBeardColor,
      roughness: 0.92,
      metalness: 0.02,
    });
    const beardShadowMat = new THREE.MeshStandardMaterial({
      color: baseBeardColor.clone().multiplyScalar(0.76),
      roughness: 0.94,
      metalness: 0.01,
    });

    // Inner darker cheek-to-chin beard volume wrapping the jawline naturally
    const jawBeard = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.052, 0.06, 10, 12),
      beardShadowMat,
    );
    jawBeard.position.set(0, -0.056, HEAD_RAD * 0.52);
    jawBeard.scale.set(1.12, 1.0, 0.94);
    jawBeard.castShadow = true;
    headGroup.add(jawBeard);

    // Side cheek beard blending up into silver sideburns
    [-1, 1].forEach((side) => {
      const cheekBeard = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.02, 0.055, 6, 8),
        beardShadowMat,
      );
      cheekBeard.position.set(side * 0.062, -0.028, HEAD_RAD * 0.44);
      cheekBeard.rotation.z = side * 0.22;
      headGroup.add(cheekBeard);
    });

    // Two-tier layered silver-gray beard locks hanging organically over chin & collar
    for (let b = -4; b <= 4; b++) {
      const absB = Math.abs(b);
      const lockLen = 0.135 - absB * 0.016;
      const beardLock = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.0155 - absB * 0.0012, lockLen, 6, 8),
        b % 2 === 0 ? beardMat : beardShadowMat,
      );
      beardLock.position.set(
        b * 0.0155,
        -0.088 - (4 - absB) * 0.009,
        HEAD_RAD * 0.65 - absB * 0.012,
      );
      beardLock.rotation.x = 0.14;
      beardLock.rotation.z = -b * 0.045;
      beardLock.castShadow = true;
      headGroup.add(beardLock);
    }

    // Outer silver highlight locks along the front chin for depth
    for (let b = -2; b <= 2; b++) {
      const outerLock = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.012, 0.095 - Math.abs(b) * 0.012, 6, 8),
        beardMat,
      );
      outerLock.position.set(
        b * 0.018,
        -0.084 - (2 - Math.abs(b)) * 0.008,
        HEAD_RAD * 0.72 - Math.abs(b) * 0.008,
      );
      outerLock.rotation.x = 0.1;
      headGroup.add(outerLock);
    }
  }

  // ============================================================================
  // 4. ARMS, ELBOWS, HANDS & 5 ARTICULATED FINGERS (LEFT & RIGHT)
  // ============================================================================
  const leftUpperArm = new THREE.Group();
  leftUpperArm.position.set(isSlenderGhost ? -0.175 : -0.205, 0.165, 0);
  chest.add(leftUpperArm);

  const rightUpperArm = new THREE.Group();
  rightUpperArm.position.set(isSlenderGhost ? 0.175 : 0.205, 0.165, 0);
  chest.add(rightUpperArm);

  const sleeveBaseMat = isDhotiKurta
    ? kurtaMat
    : isSaree
      ? sareeMat
      : shirtMat;

  function buildArmLimb(isRight: boolean): {
    forearmGroup: THREE.Group;
    handGroup: THREE.Group;
  } {
    const upperGroup = isRight ? rightUpperArm : leftUpperArm;
    const dir = isRight ? 1 : -1;

    // Deltoid / Shoulder cap
    const shoulder = new THREE.Mesh(
      new THREE.SphereGeometry(isSlenderGhost ? 0.044 : 0.054, 10, 10),
      sleeveBaseMat,
    );
    shoulder.castShadow = true;
    upperGroup.add(shoulder);

    // Upper Arm Sleeve / Bicep (short bridal choli sleeve + exposed gaunt pale upper arm for Rukmini)
    if (isSlenderGhost) {
      const choliShortSleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.036, UPPER_ARM_LEN * 0.52, 12),
        sareeMat,
      );
      choliShortSleeve.position.set(0, -UPPER_ARM_LEN * 0.28, 0);
      choliShortSleeve.castShadow = true;
      upperGroup.add(choliShortSleeve);

      const sleeveZari = new THREE.Mesh(
        new THREE.CylinderGeometry(0.037, 0.038, 0.022, 14),
        goldMat,
      );
      sleeveZari.position.set(0, -UPPER_ARM_LEN * 0.54, 0);
      upperGroup.add(sleeveZari);

      // Pale bony lower bicep extending below choli sleeve
      const bonyUpperArm = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.026, UPPER_ARM_LEN * 0.44, 8, 10),
        skinMat,
      );
      bonyUpperArm.position.set(0, -UPPER_ARM_LEN * 0.74, 0);
      bonyUpperArm.castShadow = true;
      upperGroup.add(bonyUpperArm);
    } else {
      const upperArmMesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.043, UPPER_ARM_LEN * 0.62, 8, 10),
        sleeveBaseMat,
      );
      upperArmMesh.position.set(0, -UPPER_ARM_LEN * 0.48, 0);
      upperArmMesh.castShadow = true;
      upperArmMesh.receiveShadow = true;
      upperGroup.add(upperArmMesh);

      if (isSaree) {
        const sleeveZari = new THREE.Mesh(
          new THREE.CylinderGeometry(0.046, 0.046, 0.024, 14),
          goldMat,
        );
        sleeveZari.position.set(0, -UPPER_ARM_LEN * 0.72, 0);
        upperGroup.add(sleeveZari);
      }
    }

    // Elbow Joint
    const forearmGroup = new THREE.Group();
    forearmGroup.position.set(0, -UPPER_ARM_LEN, 0);
    upperGroup.add(forearmGroup);

    const isLongSleeve =
      isDhotiKurta ||
      isKurti ||
      options.clothingStyle === 'casual_jacket' ||
      options.clothingStyle === 'guard_coat' ||
      options.clothingStyle === 'thakur_sherwani';

    const elbowJointSphere = new THREE.Mesh(
      new THREE.SphereGeometry(isSlenderGhost ? 0.029 : 0.039, 8, 8),
      isLongSleeve ? sleeveBaseMat : skinMat,
    );
    forearmGroup.add(elbowJointSphere);

    // Forearm (Pale gaunt bony forearm for Rukmini, normal sleeved/bare forearm for humans)
    const forearmMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(
        isSlenderGhost ? 0.0235 : 0.036,
        FOREARM_LEN * (isSlenderGhost ? 0.74 : 0.64),
        8,
        10,
      ),
      isLongSleeve ? sleeveBaseMat : skinMat,
    );
    forearmMesh.position.set(0, -FOREARM_LEN * 0.48, 0);
    forearmMesh.castShadow = true;
    forearmMesh.receiveShadow = true;
    forearmGroup.add(forearmMesh);

    if (isLongSleeve) {
      // Tailored wrist cuff for jacket / overshirt / kurti / kurta
      const sleeveCuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.038, 0.037, 0.03, 12),
        isDhotiKurta ? dhotiMat : shirtAccentMat,
      );
      sleeveCuff.position.set(0, -FOREARM_LEN * 0.86, 0);
      forearmGroup.add(sleeveCuff);
    }

    // Broken Red Glass Bangles (टूटी हुई लाल काँच की चूड़ियाँ) & tarnished gold bridal chooda on wrists
    if (options.bangles) {
      const brokenGlassMat = new THREE.MeshStandardMaterial({
        color: options.bangleColor ?? 0xa80916,
        emissive: options.isGhost ? 0x240204 : 0x000000,
        metalness: 0.22,
        roughness: 0.16,
        transparent: true,
        opacity: 0.88,
      });
      const bangleRadius = isSlenderGhost ? 0.031 : 0.041;
      const bangleCount = isSlenderGhost ? 6 : 4;
      for (let b = 0; b < bangleCount; b++) {
        const isBrokenArc = isSlenderGhost && (b === 1 || b === 3 || b === 5);
        const arc = isBrokenArc ? Math.PI * (1.42 + (b % 3) * 0.14) : Math.PI * 2;
        const bangle = new THREE.Mesh(
          new THREE.TorusGeometry(bangleRadius + (b % 2) * 0.0025, 0.0044, 8, 18, arc),
          b === 2 ? goldMat : brokenGlassMat,
        );
        bangle.rotation.x = Math.PI / 2 + (isSlenderGhost ? (b % 2 === 0 ? 0.14 : -0.18) : 0);
        bangle.rotation.z = isBrokenArc ? b * 1.15 : 0;
        bangle.position.set(0, -FOREARM_LEN * (0.66 + b * 0.048), 0);
        forearmGroup.add(bangle);
      }
    }

    // Wrist / Hand Joint
    const handGroup = new THREE.Group();
    handGroup.position.set(0, -FOREARM_LEN, 0);
    forearmGroup.add(handGroup);

    if (options.longClawFingers) {
      // Sculpted Gaunt Bony Hand + Elongated Crooked Fingers + Curved Blackened Claw Nails (ZERO blocky palms)
      const bonyWrist = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 8, 8),
        skinMat,
      );
      handGroup.add(bonyWrist);

      const gauntPalm = new THREE.Mesh(
        new THREE.SphereGeometry(0.032, 12, 10),
        skinMat,
      );
      gauntPalm.scale.set(0.95, 1.32, 0.42);
      gauntPalm.position.set(0, -0.038, 0.004);
      gauntPalm.castShadow = true;
      handGroup.add(gauntPalm);

      const darkNailMat = new THREE.MeshStandardMaterial({
        color: 0x130609,
        roughness: 0.3,
        metalness: 0.22,
      });

      // Bony elongated thumb with curved dark talon nail
      const thumbProx = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.0052, 0.032, 5, 6),
        skinMat,
      );
      thumbProx.position.set(-dir * 0.028, -0.038, 0.015);
      thumbProx.rotation.z = dir * 0.52;
      thumbProx.rotation.x = 0.34;
      handGroup.add(thumbProx);

      const thumbNail = new THREE.Mesh(
        new THREE.ConeGeometry(0.0042, 0.024, 6),
        darkNailMat,
      );
      thumbNail.position.set(-dir * 0.042, -0.058, 0.026);
      thumbNail.rotation.z = dir * 0.65 + Math.PI;
      thumbNail.rotation.x = 0.55;
      handGroup.add(thumbNail);

      // 4 Elongated Bony Articulated Fingers + Sharp Curved Black Claw Nails
      const fingerLengths = [0.052, 0.062, 0.058, 0.048];
      for (let f = 0; f < 4; f++) {
        const fx = -0.021 + f * 0.014;
        const fLen = fingerLengths[f];

        const knuckle = new THREE.Mesh(
          new THREE.SphereGeometry(0.0056, 6, 6),
          skinShadowMat,
        );
        knuckle.position.set(fx, -0.072, 0.006);
        handGroup.add(knuckle);

        const proxPhalanx = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.0044, fLen * 0.58, 5, 6),
          skinMat,
        );
        proxPhalanx.position.set(fx, -0.074 - fLen * 0.32, 0.012);
        proxPhalanx.rotation.x = 0.24 + (f === 1 || f === 2 ? 0.06 : 0);
        proxPhalanx.rotation.z = (f - 1.5) * 0.06;
        handGroup.add(proxPhalanx);

        const distPhalanx = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.0036, fLen * 0.46, 5, 6),
          skinShadowMat,
        );
        distPhalanx.position.set(fx * 1.04, -0.074 - fLen * 0.78, 0.028);
        distPhalanx.rotation.x = 0.62;
        handGroup.add(distPhalanx);

        // Elongated sharp dark claw nail curving inward
        const clawNail = new THREE.Mesh(
          new THREE.ConeGeometry(0.0036, 0.032, 6),
          darkNailMat,
        );
        clawNail.position.set(fx * 1.06, -0.074 - fLen * 1.12, 0.044);
        clawNail.rotation.x = Math.PI + 0.92;
        handGroup.add(clawNail);
      }
    } else {
      const palm = new THREE.Mesh(
        new THREE.BoxGeometry(0.062, 0.072, 0.026),
        skinMat,
      );
      palm.position.set(0, -0.036, 0);
      palm.castShadow = true;
      handGroup.add(palm);

      // Thumb (Opposable)
      const thumb = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.0075, 0.032, 5, 6),
        skinMat,
      );
      thumb.position.set(-dir * 0.034, -0.038, 0.012);
      thumb.rotation.z = dir * 0.45;
      thumb.rotation.x = 0.25;
      handGroup.add(thumb);

      // 4 Articulated Fingers
      const fingerLen = 0.044;
      for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.0058, fingerLen * 0.72, 5, 6),
          skinMat,
        );
        finger.position.set(-0.022 + f * 0.0145, -0.072 - fingerLen * 0.42, 0);
        if (options.hasLantern && isRight) {
          // Curl fingers slightly around the brass lantern bail handle
          finger.rotation.x = 0.85;
          finger.position.z = 0.014;
        }
        handGroup.add(finger);
      }
    }

    return { forearmGroup, handGroup };
  }

  const { forearmGroup: leftForearm, handGroup: leftHand } = buildArmLimb(false);
  const { forearmGroup: rightForearm, handGroup: rightHand } = buildArmLimb(true);

  // ============================================================================
  // ANTIQUE BRASS LANTERN WITH WARM FLICKERING POINTLIGHT (WATCHMAN BABA)
  // ============================================================================
  let lanternGroup: THREE.Group | undefined;
  let lanternLight: THREE.PointLight | undefined;
  let lanternFlameMesh: THREE.Mesh | undefined;
  let lanternGlassMat: THREE.MeshStandardMaterial | undefined;

  if (options.hasLantern) {
    lanternGroup = new THREE.Group();
    lanternGroup.position.set(0, -0.075, 0.045);
    rightHand.add(lanternGroup);

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0x8e6b32, // Patinated antique weathered brass
      roughness: 0.42,
      metalness: 0.78,
    });
    const sootBrassMat = new THREE.MeshStandardMaterial({
      color: 0x453522,
      roughness: 0.68,
      metalness: 0.55,
    });
    lanternGlassMat = new THREE.MeshStandardMaterial({
      color: 0xffe4a8,
      emissive: 0xff8e1c,
      emissiveIntensity: 0.85,
      transparent: true,
      opacity: 0.66,
      roughness: 0.18,
    });

    // Wire bail handle gripped by Watchman Baba's right hand
    const bailHandle = new THREE.Mesh(
      new THREE.TorusGeometry(0.066, 0.0045, 8, 18, Math.PI),
      brassMat,
    );
    bailHandle.position.set(0, -0.068, 0);
    lanternGroup.add(bailHandle);

    // Top soot-darkened chimney vent & brass hood
    const chimneyVent = new THREE.Mesh(
      new THREE.CylinderGeometry(0.034, 0.05, 0.036, 12),
      sootBrassMat,
    );
    chimneyVent.position.set(0, -0.084, 0);
    lanternGroup.add(chimneyVent);

    const topCapDome = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.072,
        14,
        10,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.48,
      ),
      brassMat,
    );
    topCapDome.position.set(0, -0.132, 0);
    lanternGroup.add(topCapDome);

    // Glowing glass globe chamber
    const glassGlobe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.054, 0.06, 0.148, 16),
      lanternGlassMat,
    );
    glassGlobe.position.set(0, -0.19, 0);
    lanternGroup.add(glassGlobe);

    // 4 protective antique brass cage bars & mid guard ring
    for (let g = 0; g < 4; g++) {
      const ang = (g / 4) * Math.PI * 2;
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0035, 0.0035, 0.17, 6),
        brassMat,
      );
      bar.position.set(Math.cos(ang) * 0.064, -0.19, Math.sin(ang) * 0.064);
      lanternGroup.add(bar);
    }

    const midGuardRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.064, 0.0035, 6, 18),
      brassMat,
    );
    midGuardRing.rotation.x = Math.PI / 2;
    midGuardRing.position.set(0, -0.19, 0);
    lanternGroup.add(midGuardRing);

    // Bottom brass oil reservoir base & wick collar
    const oilReservoir = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.076, 0.048, 14),
      brassMat,
    );
    oilReservoir.position.set(0, -0.278, 0);
    lanternGroup.add(oilReservoir);

    const wickCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.02, 0.022, 10),
      sootBrassMat,
    );
    wickCollar.position.set(0, -0.244, 0);
    lanternGroup.add(wickCollar);

    // Flickering warm flame core inside the glass chamber
    lanternFlameMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.012, 0.026, 6, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd166 }),
    );
    lanternFlameMesh.position.set(0, -0.198, 0);
    lanternGroup.add(lanternFlameMesh);

    // Warm flickering THREE.PointLight inside the lantern softly illuminating Watchman Baba's wrinkled face & shawl
    if (!options.disableLights) {
      lanternLight = new THREE.PointLight(
        options.lanternLightColor ?? 0xff9e38,
        3.1,
        7.8,
        1.75,
      );
      lanternLight.position.set(0, -0.185, 0.02);
      lanternGroup.add(lanternLight);
    }
  }

  // ============================================================================
  // 5. LEGS, KNEES, ANKLES, SILVER PAYAL ANKLETS, & SHOES / BACKWARD FEET
  // ============================================================================
  const leftThigh = new THREE.Group();
  leftThigh.position.set(-0.105, -0.055, 0);
  pelvis.add(leftThigh);

  const rightThigh = new THREE.Group();
  rightThigh.position.set(0.105, -0.055, 0);
  pelvis.add(rightThigh);

  function buildLegLimb(isRight: boolean): {
    shinGroup: THREE.Group;
    footGroup: THREE.Group;
  } {
    const thighGroup = isRight ? rightThigh : leftThigh;

    const thighPrimaryMat = isDhotiKurta
      ? dhotiMat
      : isSaree
        ? sareeMat
        : pantsMat;

    // Upper Leg (Thigh)
    const thighMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(
        isDhotiKurta ? 0.074 : isSlenderGhost ? 0.056 : 0.064,
        THIGH_LEN * 0.64,
        8,
        12,
      ),
      thighPrimaryMat,
    );
    thighMesh.position.set(0, -THIGH_LEN * 0.48, 0);
    thighMesh.castShadow = true;
    thighMesh.receiveShadow = true;
    thighGroup.add(thighMesh);

    // Draped Dhoti / Saree cloth folds on thighs so each leg is clearly articulated
    if (isDhotiKurta) {
      const dhotiBorderStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.016, THIGH_LEN * 0.85, 0.095),
        dhotiBorderMat,
      );
      dhotiBorderStrip.position.set(isRight ? 0.068 : -0.068, -THIGH_LEN * 0.48, 0);
      thighGroup.add(dhotiBorderStrip);
    } else if (isSaree) {
      // Draped weathered Banarasi saree panel clinging to slender thigh
      const thighSareeFold = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.072, THIGH_LEN * 0.9, 12, 1, true),
        sareeMat,
      );
      thighSareeFold.position.set(0, -THIGH_LEN * 0.48, 0);
      thighGroup.add(thighSareeFold);
    }

    // Knee Joint
    const shinGroup = new THREE.Group();
    shinGroup.position.set(0, -THIGH_LEN, 0);
    thighGroup.add(shinGroup);

    const kneeSphere = new THREE.Mesh(
      new THREE.SphereGeometry(isSlenderGhost ? 0.046 : 0.054, 8, 8),
      isDhotiKurta ? dhotiMat : isSaree ? sareeMat : pantsMat,
    );
    shinGroup.add(kneeSphere);

    // Lower Leg (Slender gaunt pale calf & bony ankle for Rukmini)
    const shinMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(
        isSlenderGhost ? 0.038 : 0.05,
        SHIN_LEN * 0.68,
        8,
        12,
      ),
      isDhotiKurta ? skinMat : isSaree ? skinMat : pantsMat,
    );
    shinMesh.position.set(0, -SHIN_LEN * 0.48, 0);
    shinMesh.castShadow = true;
    shinMesh.receiveShadow = true;
    shinGroup.add(shinMesh);

    if (isDhotiKurta) {
      // Upper shin wrapped by dhoti hem above the ankle
      const dhotiCalfWrap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.062, SHIN_LEN * 0.56, 12),
        dhotiMat,
      );
      dhotiCalfWrap.position.set(0, -SHIN_LEN * 0.3, 0);
      dhotiCalfWrap.castShadow = true;
      shinGroup.add(dhotiCalfWrap);

      const dhotiHemBorder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.064, 0.063, 0.028, 12),
        dhotiBorderMat,
      );
      dhotiHemBorder.position.set(0, -SHIN_LEN * 0.56, 0);
      shinGroup.add(dhotiHemBorder);
    } else if (isSaree) {
      // Tattered crimson saree hem with faded antique gold zari border stopping mid-calf so tarnished Payal & backward feet are clearly visible!
      const sareeCalfDrape = new THREE.Mesh(
        new THREE.CylinderGeometry(0.064, 0.078, SHIN_LEN * 0.5, 14, 1, true),
        sareeMat,
      );
      sareeCalfDrape.position.set(0, -SHIN_LEN * 0.27, 0);
      sareeCalfDrape.castShadow = true;
      shinGroup.add(sareeCalfDrape);

      const lowerZariBand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.078, 0.08, 0.032, 14, 1, true),
        goldMat,
      );
      lowerZariBand.position.set(0, -SHIN_LEN * 0.5, 0);
      shinGroup.add(lowerZariBand);
    }

    // TARNISHED SILVER ANKLETS (PAYAL WITH GHUNGROO BELLS) ON BOTH ANKLES FOR RUKMINI
    if (options.payal) {
      const payalGroup = new THREE.Group();
      payalGroup.position.set(0, -SHIN_LEN * 0.86, 0);
      shinGroup.add(payalGroup);

      const payalRadius = isSlenderGhost ? 0.043 : 0.052;
      // Ornate double-chain tarnished Silver Payal rings
      const payalBandUpper = new THREE.Mesh(
        new THREE.TorusGeometry(payalRadius, 0.0065, 10, 20),
        silverMat,
      );
      payalBandUpper.rotation.x = Math.PI / 2;
      payalBandUpper.position.y = 0.011;
      payalGroup.add(payalBandUpper);

      const payalBandLower = new THREE.Mesh(
        new THREE.TorusGeometry(payalRadius + 0.002, 0.0075, 10, 20),
        silverMat,
      );
      payalBandLower.rotation.x = Math.PI / 2;
      payalGroup.add(payalBandLower);

      // 10 Spherical Tarnished Silver Ghungroo Bells around each ankle
      for (let g = 0; g < 10; g++) {
        const gAngle = (g / 10) * Math.PI * 2;
        const ghungroo = new THREE.Mesh(
          new THREE.SphereGeometry(0.0085, 8, 8),
          silverMat,
        );
        ghungroo.position.set(
          Math.cos(gAngle) * (payalRadius + 0.006),
          -0.008,
          Math.sin(gAngle) * (payalRadius + 0.006),
        );
        payalGroup.add(ghungroo);
      }
    }

    // Foot / Shoe Joint
    const footGroup = new THREE.Group();
    footGroup.position.set(0, -SHIN_LEN, 0);
    if (options.reverseFeet) {
      // उल्टे पाँव (Backward-Turned Feet for Rukmini): rotate the entire foot 180° around Y!
      footGroup.rotation.y = Math.PI;
    }
    shinGroup.add(footGroup);

    if (isSaree || isTantrik) {
      // Sculpted Gaunt Bare Foot with Heel, Arch, Instep, Dried Red Alta Border, and 5 Dark-Nailed Toes
      const heelBall = new THREE.Mesh(
        new THREE.SphereGeometry(isSlenderGhost ? 0.036 : 0.042, 10, 10),
        skinMat,
      );
      heelBall.position.set(0, -0.026, -0.032);
      footGroup.add(heelBall);

      const footArch = new THREE.Mesh(
        new THREE.CapsuleGeometry(isSlenderGhost ? 0.031 : 0.036, 0.095, 8, 10),
        skinMat,
      );
      footArch.rotation.x = Math.PI / 2 + 0.12;
      footArch.scale.set(1.14, 1.0, 0.62);
      footArch.position.set(0, -0.03, 0.025);
      footArch.castShadow = true;
      footGroup.add(footArch);

      // Dried faded bridal Alta red dye trim along the sole edge for Rukmini
      if (isSaree) {
        const altaTrim = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.034, 0.1, 6, 10),
          new THREE.MeshStandardMaterial({ color: 0x6f0812, roughness: 0.8 }),
        );
        altaTrim.rotation.x = Math.PI / 2;
        altaTrim.scale.set(1.14, 1.0, 0.22);
        altaTrim.position.set(0, -0.045, 0.026);
        footGroup.add(altaTrim);
      }

      const toeNailMat = options.isGhost
        ? new THREE.MeshStandardMaterial({ color: 0x16070a, roughness: 0.35 })
        : null;

      // 5 Sculpted Toes (Pointing along +Z in local foot space -> pointing BACKWARD -Z in character space when reverseFeet=true!)
      for (let t = 0; t < 5; t++) {
        const isBigToe = (isRight && t === 0) || (!isRight && t === 4);
        const toeRadius = isBigToe ? 0.0102 : 0.0072;
        const toeLen = isBigToe ? 0.026 : 0.021;
        const xPos = -0.028 + t * 0.014;
        const zPos = 0.094 - Math.abs(t - (isRight ? 0.5 : 3.5)) * 0.005;

        const toe = new THREE.Mesh(
          new THREE.CapsuleGeometry(toeRadius, toeLen, 5, 6),
          skinMat,
        );
        toe.rotation.x = Math.PI / 2;
        toe.position.set(xPos, -0.038, zPos);
        footGroup.add(toe);

        if (toeNailMat) {
          const nail = new THREE.Mesh(
            new THREE.ConeGeometry(toeRadius * 0.58, 0.014, 5),
            toeNailMat,
          );
          nail.rotation.x = Math.PI / 2;
          nail.position.set(xPos, -0.036, zPos + toeLen * 0.65);
          footGroup.add(nail);
        }
      }
    } else if (isDhotiKurta || options.clothingStyle === 'thakur_sherwani') {
      // Traditional Indian Leather Mojri / Jutti with Curled Toe
      const mojriMat = new THREE.MeshStandardMaterial({
        color: 0x5c3317,
        roughness: 0.65,
      });
      const mojriBody = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.042, 0.11, 8, 10),
        mojriMat,
      );
      mojriBody.rotation.x = Math.PI / 2;
      mojriBody.scale.set(1.12, 1.0, 0.72);
      mojriBody.position.set(0, -0.032, 0.035);
      mojriBody.castShadow = true;
      footGroup.add(mojriBody);

      const curledTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 8, 8),
        mojriMat,
      );
      curledTip.position.set(0, -0.018, 0.112);
      footGroup.add(curledTip);
    } else {
      // Realistic Dark Weathered Boots / Nighttime Sneakers (Ankle cuff, vamp, tongue, heel counter, lug sole)
      const shoeAnkle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.05, 0.062, 12),
        shoesMat,
      );
      shoeAnkle.position.set(0, -0.014, -0.008);
      shoeAnkle.castShadow = true;
      footGroup.add(shoeAnkle);

      const shoeUpper = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.043, 0.112, 8, 12),
        shoesMat,
      );
      shoeUpper.rotation.x = Math.PI / 2 + 0.06;
      shoeUpper.scale.set(1.12, 1.0, 0.78);
      shoeUpper.position.set(0, -0.03, 0.038);
      shoeUpper.castShadow = true;
      shoeUpper.receiveShadow = true;
      footGroup.add(shoeUpper);

      const bootSole = new THREE.Mesh(
        new THREE.BoxGeometry(0.096, 0.024, 0.214),
        soleMat,
      );
      bootSole.position.set(0, -0.053, 0.036);
      footGroup.add(bootSole);
    }

    return { shinGroup, footGroup };
  }

  const { shinGroup: leftShin, footGroup: leftFoot } = buildLegLimb(false);
  const { shinGroup: rightShin, footGroup: rightFoot } = buildLegLimb(true);

  // Subtle eerie dim crimson aura & swirling crimson-black ankle mist particles for Rukmini
  let auraLight: THREE.PointLight | undefined;
  const ankleMistParticles: Array<{
    sprite: THREE.Sprite;
    baseAngle: number;
    orbitRadius: number;
    baseY: number;
    speed: number;
    bobSpeed: number;
    baseScale: number;
    baseOpacity: number;
  }> = [];

  if (options.isGhost) {
    // Soft low-intensity ambient rim aura so her silhouette reads without washing out her gaunt face
    if (!options.disableLights) {
      auraLight = new THREE.PointLight(0x880812, 0.55, 3.6, 1.8);
      auraLight.position.set(0, 1.15, -0.12);
      proceduralGroup.add(auraLight);
    }

    const mistTex = getGhostMistSpriteTexture();
    if (mistTex) {
      const mistCount = 18;
      for (let m = 0; m < mistCount; m++) {
        const isCrimsonWisp = m % 3 === 0;
        const baseOpacity = isCrimsonWisp ? 0.24 : 0.3;
        const mistMat = new THREE.SpriteMaterial({
          map: mistTex,
          color: isCrimsonWisp ? 0x6b0b14 : 0x10070a,
          transparent: true,
          opacity: baseOpacity,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(mistMat);
        const orbitRadius = 0.16 + (m % 5) * 0.085;
        const baseAngle = (m / mistCount) * Math.PI * 2;
        const baseY = 0.08 + (m % 4) * 0.1;
        const baseScale = 0.26 + (m % 3) * 0.12;
        sprite.scale.set(baseScale * 1.25, baseScale * 0.82, 1);
        sprite.position.set(
          Math.cos(baseAngle) * orbitRadius,
          baseY,
          Math.sin(baseAngle) * orbitRadius,
        );
        proceduralGroup.add(sprite);
        ankleMistParticles.push({
          sprite,
          baseAngle,
          orbitRadius,
          baseY,
          speed: (m % 2 === 0 ? 1 : -1) * (0.45 + (m % 4) * 0.16),
          bobSpeed: 0.9 + (m % 3) * 0.38,
          baseScale,
          baseOpacity,
        });
      }
    }
  }

  // Torn Haunted 1992 Bridal Veil / Chunri draped BACK behind her hair parting & over her shoulders (NEVER covering her face!)
  let veilMesh: THREE.Mesh | undefined;
  if (isSaree) {
    const veilMat = new THREE.MeshStandardMaterial({
      color: options.sareeColor ?? 0x610912,
      map: banarasiSareeTex ?? undefined,
      roughness: 0.84,
      transparent: true,
      opacity: 0.86,
      side: THREE.DoubleSide,
    });
    // Back-crown bridal hood positioned behind her sindoor parting so her forehead & face are 100% open
    veilMesh = new THREE.Mesh(
      new THREE.SphereGeometry(
        HEAD_RAD * 1.18,
        18,
        14,
        Math.PI * 0.08,
        Math.PI * 1.84,
        0,
        Math.PI * 0.56,
      ),
      veilMat,
    );
    veilMesh.position.set(0, 0.036, -0.026);
    veilMesh.rotation.x = -0.22;
    headGroup.add(veilMesh);

    // Faded antique gold zari border framing the open arch of the torn veil behind her hair parting
    const chunriZariArch = new THREE.Mesh(
      new THREE.TorusGeometry(HEAD_RAD * 1.15, 0.0085, 8, 22, Math.PI * 1.12),
      goldMat,
    );
    chunriZariArch.rotation.z = -0.18;
    chunriZariArch.rotation.x = -0.14;
    chunriZariArch.position.set(0, 0.026, 0.014);
    veilMesh.add(chunriZariArch);

    // Torn cascading veil drapes falling vertically downward over her left & right shoulders (behind face plane)
    [-1, 1].forEach((side) => {
      const shoulderVeil = new THREE.Mesh(
        new THREE.CylinderGeometry(
          0.034,
          0.056,
          0.34,
          7,
          1,
          true,
          -Math.PI * 0.35,
          Math.PI * 0.7,
        ),
        veilMat,
      );
      shoulderVeil.position.set(side * (HEAD_RAD * 1.06), -0.14, -0.042);
      shoulderVeil.rotation.y = side * 1.25;
      shoulderVeil.rotation.z = -side * 0.1;
      headGroup.add(shoulderVeil);
    });
  }

  // Apply target height scaling
  root.scale.setScalar(scale);

  // Smooth procedural skeletal animation state (zero per-frame allocations)
  let currentAnimState:
    | 'idle'
    | 'walk'
    | 'run'
    | 'pickup'
    | 'scared'
    | 'bound'
    | 'crouch' = options.boundToPillar ? 'bound' : 'idle';
  let walkCycle = 0;
  let smoothMoveBlend = 0;
  let smoothRunBlend = 0;
  let smoothHeadYaw = 0;
  let smoothHeadPitch = 0;
  let pickupProgress = 0;
  let isPickingUp = false;
  let secondaryTorchGroup: THREE.Group | undefined;
  let secondaryTorchLight: THREE.PointLight | undefined;
  let secondaryTorchSpot: THREE.SpotLight | undefined;
  let secondaryTorchLensMat: THREE.MeshStandardMaterial | undefined;
  // Per-character subtle breathing phase offset so the 3 friends don't breathe in eerie lockstep
  const breathPhase =
    (options.name.charCodeAt(0) * 1.17 + options.name.length * 0.73) % (Math.PI * 2);

  const character: HumanoidCharacter = {
    name: options.name,
    root,
    proceduralGroup,
    glbContainer,
    pelvis,
    torso,
    chest,
    neck,
    headGroup,
    headMesh,
    leftUpperArm,
    leftForearm,
    leftHand,
    rightUpperArm,
    rightForearm,
    rightHand,
    leftThigh,
    leftShin,
    leftFoot,
    rightThigh,
    rightShin,
    rightFoot,
    lantern: lanternGroup,
    lanternLight,
    hasSecondaryTorch: false,
    setSecondaryTorchEnabled(enabled: boolean, brightnessScale = 1.0) {
      if (enabled && !secondaryTorchGroup) {
        secondaryTorchGroup = new THREE.Group();
        secondaryTorchGroup.position.set(0, -0.055, 0.025);
        secondaryTorchGroup.rotation.x = Math.PI * 0.5;
        rightHand.add(secondaryTorchGroup);

        const bodyMat = new THREE.MeshStandardMaterial({
          color: 0x26292e,
          roughness: 0.45,
          metalness: 0.72,
        });
        const bezelMat = new THREE.MeshStandardMaterial({
          color: 0xb88b3a,
          roughness: 0.32,
          metalness: 0.85,
        });
        secondaryTorchLensMat = new THREE.MeshStandardMaterial({
          color: 0xfff1cc,
          emissive: 0xffc870,
          emissiveIntensity: 1.4,
          roughness: 0.15,
        });

        const handle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.022, 0.024, 0.15, 12),
          bodyMat,
        );
        handle.position.set(0, -0.01, 0);
        const bezel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.024, 0.042, 14),
          bezelMat,
        );
        bezel.position.set(0, -0.095, 0);
        const lens = new THREE.Mesh(
          new THREE.CircleGeometry(0.031, 14),
          secondaryTorchLensMat,
        );
        lens.rotation.x = Math.PI / 2;
        lens.position.set(0, -0.117, 0);

        secondaryTorchGroup.add(handle, bezel, lens);

        if (!options.disableLights) {
          secondaryTorchLight = new THREE.PointLight(0xffcf88, 1.35, 10.5, 1.6);
          secondaryTorchLight.position.set(0, -0.18, 0.02);

          const spotTarget = new THREE.Object3D();
          spotTarget.position.set(0.18, 0.92, 4.4);
          proceduralGroup.add(spotTarget);

          secondaryTorchSpot = new THREE.SpotLight(
            0xffe2ad,
            1.55,
            13.0,
            Math.PI * 0.36,
            0.78,
            1.5,
          );
          secondaryTorchSpot.position.set(0, -0.13, 0);
          secondaryTorchSpot.target = spotTarget;

          secondaryTorchGroup.add(secondaryTorchLight, secondaryTorchSpot);
        }
        character.secondaryTorchGroup = secondaryTorchGroup;
        character.secondaryTorchLight = secondaryTorchLight;
        character.secondaryTorchSpot = secondaryTorchSpot;
      }

      character.hasSecondaryTorch = enabled;
      if (secondaryTorchGroup) {
        secondaryTorchGroup.visible = enabled;
      }
      const clampedScale = enabled ? Math.max(0, Math.min(1.5, brightnessScale)) : 0;
      if (secondaryTorchLight) {
        secondaryTorchLight.intensity = 1.35 * clampedScale;
      }
      if (secondaryTorchSpot) {
        secondaryTorchSpot.intensity = 1.55 * clampedScale;
      }
      if (secondaryTorchLensMat) {
        secondaryTorchLensMat.emissiveIntensity = enabled
          ? 0.25 + clampedScale * 1.15
          : 0;
      }
    },
    veilMesh,
    leftEye,
    rightEye,
    auraLight,
    boundToPillar: Boolean(options.boundToPillar),
    animState: currentAnimState,
    hasGLB: false,
    actions: {},

    setAnimation(state) {
      currentAnimState = state;
      character.animState = state;
      if (state === 'pickup') {
        isPickingUp = true;
        pickupProgress = 0;
      }
      if (character.mixer) {
        const nextAction =
          character.actions[state] ||
          (state === 'run'
            ? character.actions['walk']
            : character.actions['idle']);
        if (nextAction && nextAction !== character.currentAction) {
          nextAction.reset().fadeIn(0.25).play();
          character.currentAction?.fadeOut(0.25);
          character.currentAction = nextAction;
        }
      }
    },

    update(dt, time, moveSpeed = 0, lookTarget, isScared = false) {
      const safeDt = Math.min(Math.max(dt, 0.001), 0.06);

      // Helper: compute smooth damped head look angles in NECK local space (prevents rotation feedback jitter)
      const updateSmoothHeadLook = (
        idleYaw: number,
        idlePitch: number,
        maxYaw = 0.66,
        maxPitch = 0.24,
        dampSpeed = 5.4,
      ) => {
        if (options.snappedNeck) return;
        let targetYaw = idleYaw;
        let targetPitch = idlePitch;
        if (lookTarget) {
          _tempLookLocal.copy(lookTarget);
          neck.worldToLocal(_tempLookLocal);
          const rawYaw = Math.atan2(_tempLookLocal.x, _tempLookLocal.z);
          if (Math.abs(rawYaw) < 1.55) {
            targetYaw = THREE.MathUtils.clamp(rawYaw, -maxYaw, maxYaw);
            const horizDist = Math.hypot(_tempLookLocal.x, _tempLookLocal.z);
            const relEyeY = _tempLookLocal.y - (NECK_H + HEAD_RAD * 0.78);
            targetPitch = THREE.MathUtils.clamp(
              -Math.atan2(relEyeY, Math.max(0.35, horizDist)) * 0.65,
              -maxPitch,
              maxPitch,
            );
          }
        }
        smoothHeadYaw = THREE.MathUtils.damp(
          smoothHeadYaw,
          targetYaw,
          dampSpeed,
          safeDt,
        );
        smoothHeadPitch = THREE.MathUtils.damp(
          smoothHeadPitch,
          targetPitch,
          dampSpeed,
          safeDt,
        );
        headGroup.rotation.y = smoothHeadYaw;
        headGroup.rotation.x = smoothHeadPitch;
      };

      // 1. Update GLB AnimationMixer if loaded
      if (character.hasGLB && character.mixer) {
        character.mixer.update(safeDt);
        if (moveSpeed > 3.2) {
          if (currentAnimState !== 'run') character.setAnimation('run');
        } else if (moveSpeed > 0.15) {
          if (currentAnimState !== 'walk') character.setAnimation('walk');
        } else if (isScared) {
          if (currentAnimState !== 'scared') character.setAnimation('scared');
        } else if (currentAnimState !== 'idle' && !isPickingUp) {
          character.setAnimation('idle');
        }
        return;
      }

      // 2. Sway hair locks, cloth strips & swirling crimson-black ankle mist organically
      // Gravity-align vertical hair locks along -Y so tilting head/torso never makes hair stick out horizontally
      const swayAmp = 0.024 + Math.min(moveSpeed, 4.0) * 0.012;
      const gravityCompX = THREE.MathUtils.clamp(
        -(headGroup.rotation.x + torso.rotation.x),
        -0.48,
        0.48,
      );
      const gravityCompZ = THREE.MathUtils.clamp(
        -(headGroup.rotation.z + torso.rotation.z) * 0.65,
        -0.32,
        0.32,
      );
      for (let i = 0; i < swayingHairLocks.length; i++) {
        const lock = swayingHairLocks[i];
        const baseZ = (lock.userData.baseRotZ as number | undefined) ?? 0;
        if (lock.userData.isVerticalHair) {
          lock.rotation.z =
            baseZ +
            gravityCompZ +
            Math.sin(time * (2.0 + (i % 3) * 0.3) + i) * swayAmp;
          lock.rotation.x =
            gravityCompX +
            Math.cos(time * 1.8 + i * 0.7) * (swayAmp * 0.55);
        } else {
          lock.rotation.z =
            Math.sin(time * (2.2 + (i % 3) * 0.35) + i) * swayAmp;
          lock.rotation.x =
            Math.cos(time * 1.9 + i * 0.7) * (swayAmp * 0.72);
        }
      }
      for (let i = 0; i < swayingClothPanels.length; i++) {
        const panel = swayingClothPanels[i];
        panel.rotation.x =
          0.04 + Math.sin(time * 2.4 + i * 0.9) * (0.03 + Math.min(moveSpeed, 4.0) * 0.025);
      }
      if (ankleMistParticles.length > 0) {
        const swirlBoost = 1 + Math.min(moveSpeed, 4.0) * 0.25;
        for (let m = 0; m < ankleMistParticles.length; m++) {
          const p = ankleMistParticles[m];
          const ang = p.baseAngle + time * p.speed * swirlBoost;
          const radialPulse = p.orbitRadius + Math.sin(time * 0.85 + m) * 0.055;
          const liftCycle = (time * 0.22 + m * 0.17) % 1;
          p.sprite.position.set(
            Math.cos(ang) * radialPulse,
            0.05 + liftCycle * 0.44 + Math.sin(time * p.bobSpeed + m) * 0.03,
            Math.sin(ang) * radialPulse,
          );
          const fadeEnv = Math.sin(liftCycle * Math.PI);
          (p.sprite.material as THREE.SpriteMaterial).opacity =
            p.baseOpacity * (0.35 + 0.65 * fadeEnv);
          const scalePulse = p.baseScale * (0.85 + 0.35 * liftCycle);
          p.sprite.scale.set(scalePulse * 1.28, scalePulse * 0.82, 1);
        }
      }

      // 3. Bound-to-Stone-Pillar Pose (for Kabir, Riya, Dev chained in the 3 locked rooms)
      if (character.boundToPillar || currentAnimState === 'bound') {
        const panicFactor = isScared ? 2.0 : 1.0;
        const heavyBreath = Math.sin(time * 3.8 * panicFactor + breathPhase);
        const struggle = Math.sin(time * 6.8 * panicFactor + breathPhase) * 0.04;

        chest.scale.set(
          1 + heavyBreath * 0.032,
          1 + heavyBreath * 0.014,
          1 + heavyBreath * 0.038,
        );
        pelvis.position.y = PELVIS_Y - 0.025 + Math.abs(heavyBreath) * 0.007;
        torso.rotation.x = 0.08 + heavyBreath * 0.028;
        torso.rotation.y = struggle * 1.25;
        torso.rotation.z = 0;

        leftUpperArm.rotation.x = 0.62 + struggle * 0.55;
        leftUpperArm.rotation.z = 0.28;
        leftForearm.rotation.x = -0.52;
        leftForearm.rotation.z = -0.35;

        rightUpperArm.rotation.x = 0.62 - struggle * 0.55;
        rightUpperArm.rotation.z = -0.28;
        rightForearm.rotation.x = -0.52;
        rightForearm.rotation.z = 0.35;

        leftThigh.rotation.x = -0.14;
        rightThigh.rotation.x = -0.14;
        leftShin.rotation.x = 0.22;
        rightShin.rotation.x = 0.22;

        updateSmoothHeadLook(
          Math.sin(time * 2.1 + breathPhase) * 0.32,
          Math.sin(time * 2.8 + breathPhase) * 0.05,
          0.72,
          0.24,
          5.0,
        );
        return;
      }

      if (isScared) {
        currentAnimState = 'scared';
      }

      // Handle pickup gesture
      if (isPickingUp) {
        pickupProgress += safeDt * 3.5;
        const p = Math.sin(Math.min(Math.PI, pickupProgress));
        torso.rotation.x = p * 0.42;
        rightUpperArm.rotation.x = -p * 1.35;
        rightForearm.rotation.x = -p * 0.55;
        if (pickupProgress >= Math.PI) {
          isPickingUp = false;
          torso.rotation.x = 0;
          rightUpperArm.rotation.x = 0;
          rightForearm.rotation.x = 0;
        }
        return;
      }

      // Warm organic candle-flame flicker & subtle swing for Watchman Baba's antique brass lantern
      if (lanternGroup) {
        const swayBoost = 1 + Math.min(moveSpeed, 3.0) * 0.45;
        lanternGroup.rotation.z = Math.sin(time * 2.1) * 0.055 * swayBoost;
        lanternGroup.rotation.x = Math.cos(time * 1.7) * 0.045 * swayBoost;
        const flicker =
          Math.sin(time * 9.7) * 0.26 +
          Math.cos(time * 16.3) * 0.16 +
          Math.sin(time * 27.1) * 0.08;
        if (lanternLight) {
          lanternLight.intensity = 3.1 + flicker;
        }
        if (lanternFlameMesh) {
          lanternFlameMesh.scale.set(
            1 + flicker * 0.12,
            1 + flicker * 0.22,
            1 + flicker * 0.12,
          );
        }
        if (lanternGlassMat) {
          lanternGlassMat.emissiveIntensity = 0.85 + flicker * 0.22;
        }
      }

      if (currentAnimState === 'crouch') {
        const crouchBreath = Math.sin(time * 2.8 + breathPhase);
        pelvis.position.y = THREE.MathUtils.damp(
          pelvis.position.y,
          PELVIS_Y * 0.54 + crouchBreath * 0.008,
          10,
          safeDt,
        );
        torso.rotation.x = THREE.MathUtils.damp(
          torso.rotation.x,
          0.42 + crouchBreath * 0.02,
          10,
          safeDt,
        );
        torso.rotation.y = Math.sin(time * 1.6 + breathPhase) * 0.025;

        leftThigh.rotation.x = THREE.MathUtils.damp(leftThigh.rotation.x, -1.16, 10, safeDt);
        rightThigh.rotation.x = THREE.MathUtils.damp(rightThigh.rotation.x, -1.16, 10, safeDt);
        leftShin.rotation.x = THREE.MathUtils.damp(leftShin.rotation.x, 1.96, 10, safeDt);
        rightShin.rotation.x = THREE.MathUtils.damp(rightShin.rotation.x, 1.96, 10, safeDt);

        leftUpperArm.rotation.x = THREE.MathUtils.damp(leftUpperArm.rotation.x, -0.58, 10, safeDt);
        leftUpperArm.rotation.z = THREE.MathUtils.damp(leftUpperArm.rotation.z, 0.16, 10, safeDt);
        leftForearm.rotation.x = THREE.MathUtils.damp(leftForearm.rotation.x, -0.78, 10, safeDt);

        if (options.hasLantern || character.hasSecondaryTorch) {
          rightUpperArm.rotation.x = THREE.MathUtils.damp(rightUpperArm.rotation.x, -0.42, 10, safeDt);
          rightUpperArm.rotation.z = THREE.MathUtils.damp(rightUpperArm.rotation.z, -0.14, 10, safeDt);
          rightForearm.rotation.x = THREE.MathUtils.damp(rightForearm.rotation.x, -0.72, 10, safeDt);
        } else {
          rightUpperArm.rotation.x = THREE.MathUtils.damp(rightUpperArm.rotation.x, -0.58, 10, safeDt);
          rightUpperArm.rotation.z = THREE.MathUtils.damp(rightUpperArm.rotation.z, -0.16, 10, safeDt);
          rightForearm.rotation.x = THREE.MathUtils.damp(rightForearm.rotation.x, -0.78, 10, safeDt);
        }

        updateSmoothHeadLook(
          Math.sin(time * 1.7 + breathPhase) * 0.22,
          -0.16 + Math.sin(time * 2.0) * 0.03,
          0.72,
          0.26,
          5.5,
        );
        return;
      }

      if (currentAnimState === 'scared') {
        const jitter = Math.sin(time * 28) * 0.025;
        torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, -0.09 + jitter, 12, safeDt);
        torso.rotation.y = jitter * 1.3;

        leftUpperArm.rotation.x = THREE.MathUtils.damp(leftUpperArm.rotation.x, -1.02, 10, safeDt);
        leftUpperArm.rotation.z = 0.28 + jitter;
        leftForearm.rotation.x = THREE.MathUtils.damp(leftForearm.rotation.x, -0.82, 10, safeDt);

        if (options.hasLantern || character.hasSecondaryTorch) {
          // Raise lantern/flashlight defensively when startled
          rightUpperArm.rotation.x = THREE.MathUtils.damp(rightUpperArm.rotation.x, -1.12, 10, safeDt);
          rightForearm.rotation.x = THREE.MathUtils.damp(rightForearm.rotation.x, -0.56, 10, safeDt);
        } else {
          rightUpperArm.rotation.x = THREE.MathUtils.damp(rightUpperArm.rotation.x, -1.02, 10, safeDt);
          rightUpperArm.rotation.z = -0.28 - jitter;
          rightForearm.rotation.x = THREE.MathUtils.damp(rightForearm.rotation.x, -0.82, 10, safeDt);
        }

        updateSmoothHeadLook(Math.sin(time * 3.8) * 0.32, 0.04, 0.65, 0.2, 7.0);
        pelvis.position.y = THREE.MathUtils.damp(pelvis.position.y, PELVIS_Y - 0.03, 10, safeDt);
        return;
      }

      // 4. Smoothly blended Idle Breathing <-> Walk / Run Locomotion
      const isMoving =
        moveSpeed > 0.12 ||
        currentAnimState === 'walk' ||
        currentAnimState === 'run';
      const isRunning = moveSpeed > 3.0 || currentAnimState === 'run';

      smoothMoveBlend = THREE.MathUtils.damp(
        smoothMoveBlend,
        isMoving ? 1 : 0,
        8.5,
        safeDt,
      );
      smoothRunBlend = THREE.MathUtils.damp(
        smoothRunBlend,
        isRunning ? 1 : 0,
        7.0,
        safeDt,
      );

      if (smoothMoveBlend > 0.01) {
        const strideRate = THREE.MathUtils.lerp(
          moveSpeed > 0.12 ? Math.max(3.6, moveSpeed * 3.55) : 5.0,
          9.6,
          smoothRunBlend,
        );
        walkCycle += safeDt * strideRate;
      }

      // Subtle natural chest breathing & clavicle micro-rise
      const breath = Math.sin(time * 1.95 + breathPhase);
      const idleWeight = 1 - smoothMoveBlend * 0.45;
      chest.scale.set(
        1 + breath * 0.018 * idleWeight,
        1 + breath * 0.008 * idleWeight,
        1 + breath * 0.024 * idleWeight,
      );
      leftUpperArm.position.y = 0.165 + breath * 0.004 * idleWeight;
      rightUpperArm.position.y = 0.165 + breath * 0.004 * idleWeight;

      // Leg stride with natural phase-lagged knee flexion & subtle ankle flex
      const legSwingAmp = THREE.MathUtils.lerp(0.48, 0.76, smoothRunBlend) * smoothMoveBlend;
      const kneeBendAmp = THREE.MathUtils.lerp(0.62, 1.02, smoothRunBlend) * smoothMoveBlend;
      const armSwingAmp = THREE.MathUtils.lerp(0.38, 0.66, smoothRunBlend) * smoothMoveBlend;

      const sinWalk = Math.sin(walkCycle);
      const leftKneePhase = Math.max(0, Math.sin(walkCycle - 0.65));
      const rightKneePhase = Math.max(0, -Math.sin(walkCycle - 0.65));

      const targetLeftThighX = sinWalk * legSwingAmp;
      const targetRightThighX = -sinWalk * legSwingAmp;
      const targetLeftShinX = leftKneePhase * kneeBendAmp;
      const targetRightShinX = rightKneePhase * kneeBendAmp;

      leftThigh.rotation.x = THREE.MathUtils.damp(leftThigh.rotation.x, targetLeftThighX, 12, safeDt);
      rightThigh.rotation.x = THREE.MathUtils.damp(rightThigh.rotation.x, targetRightThighX, 12, safeDt);
      leftShin.rotation.x = THREE.MathUtils.damp(leftShin.rotation.x, targetLeftShinX, 12, safeDt);
      rightShin.rotation.x = THREE.MathUtils.damp(rightShin.rotation.x, targetRightShinX, 12, safeDt);

      // Subtle ankle articulation while walking (skipped on reversed ghost feet)
      if (!options.reverseFeet) {
        leftFoot.rotation.x = THREE.MathUtils.damp(
          leftFoot.rotation.x,
          -sinWalk * 0.14 * smoothMoveBlend,
          12,
          safeDt,
        );
        rightFoot.rotation.x = THREE.MathUtils.damp(
          rightFoot.rotation.x,
          sinWalk * 0.14 * smoothMoveBlend,
          12,
          safeDt,
        );
      }

      // Natural shoulder & elbow counter-swing (with calm relaxed elbow bend at idle)
      const idleLeftArmX = 0.05 + breath * 0.018;
      const idleLeftArmZ = 0.075 + Math.sin(time * 0.9 + breathPhase) * 0.01;
      const idleLeftForearmX = -0.22 - breath * 0.02;

      let targetLeftUpperArmX = THREE.MathUtils.lerp(
        idleLeftArmX,
        -sinWalk * armSwingAmp,
        smoothMoveBlend,
      );
      let targetLeftForearmX = THREE.MathUtils.lerp(
        idleLeftForearmX,
        -0.24 - Math.max(0, -sinWalk) * (0.28 + smoothRunBlend * 0.18),
        smoothMoveBlend,
      );
      let targetRightUpperArmX: number;
      let targetRightUpperArmZ: number;
      let targetRightForearmX: number;

      if (options.hasLantern) {
        // Watchman Baba holds his antique brass lantern forward & slightly raised so its warm light illuminates his face & shawl
        targetRightUpperArmX =
          -0.8 + breath * 0.025 + sinWalk * 0.08 * smoothMoveBlend;
        targetRightUpperArmZ = -0.14;
        targetRightForearmX = -0.76 - breath * 0.018;
      } else if (character.hasSecondaryTorch) {
        targetRightUpperArmX =
          -0.7 + breath * 0.02 + sinWalk * 0.09 * smoothMoveBlend;
        targetRightUpperArmZ = -0.12;
        targetRightForearmX = -0.56;
      } else {
        targetRightUpperArmX = THREE.MathUtils.lerp(
          idleLeftArmX,
          sinWalk * armSwingAmp,
          smoothMoveBlend,
        );
        targetRightUpperArmZ = -idleLeftArmZ;
        targetRightForearmX = THREE.MathUtils.lerp(
          idleLeftForearmX,
          -0.24 - Math.max(0, sinWalk) * (0.28 + smoothRunBlend * 0.18),
          smoothMoveBlend,
        );
      }

      // Eerie unnatural stalking arms for Witch Rukmini: gently swaying gaunt arms with crooked elbows & reaching claws
      if (options.isGhost) {
        const chaseReach = THREE.MathUtils.clamp((moveSpeed - 1.8) / 2.2, 0, 1);
        const stalkSway = Math.sin(time * 2.35 + walkCycle * 0.45);
        targetLeftUpperArmX = THREE.MathUtils.lerp(
          -0.36 + stalkSway * 0.16,
          -1.08 + Math.sin(walkCycle + 0.4) * 0.22,
          chaseReach,
        );
        targetRightUpperArmX = THREE.MathUtils.lerp(
          -0.32 - stalkSway * 0.16,
          -1.04 - Math.sin(walkCycle + 0.4) * 0.22,
          chaseReach,
        );
        targetLeftForearmX = THREE.MathUtils.lerp(-0.56 - stalkSway * 0.08, -0.34, chaseReach);
        targetRightForearmX = THREE.MathUtils.lerp(-0.52 + stalkSway * 0.08, -0.34, chaseReach);
        targetRightUpperArmZ = -0.14 - Math.sin(time * 1.7) * 0.04;
      }

      leftUpperArm.rotation.x = THREE.MathUtils.damp(leftUpperArm.rotation.x, targetLeftUpperArmX, 10, safeDt);
      leftUpperArm.rotation.z = THREE.MathUtils.damp(
        leftUpperArm.rotation.z,
        options.isGhost ? 0.14 + Math.cos(time * 1.7) * 0.04 : idleLeftArmZ,
        10,
        safeDt,
      );
      leftForearm.rotation.x = THREE.MathUtils.damp(leftForearm.rotation.x, targetLeftForearmX, 10, safeDt);
      leftForearm.rotation.z = THREE.MathUtils.damp(leftForearm.rotation.z, 0, 10, safeDt);

      rightUpperArm.rotation.x = THREE.MathUtils.damp(rightUpperArm.rotation.x, targetRightUpperArmX, 10, safeDt);
      rightUpperArm.rotation.z = THREE.MathUtils.damp(rightUpperArm.rotation.z, targetRightUpperArmZ, 10, safeDt);
      rightForearm.rotation.x = THREE.MathUtils.damp(rightForearm.rotation.x, targetRightForearmX, 10, safeDt);
      rightForearm.rotation.z = THREE.MathUtils.damp(rightForearm.rotation.z, 0, 10, safeDt);

      // Pelvis height (gentle idle breathing vs eerie stalking stride) & subtle torso counter-twist
      const idlePelvisY = PELVIS_Y + breath * 0.006;
      const walkPelvisY =
        PELVIS_Y +
        Math.abs(sinWalk) * (options.isGhost ? 0.032 : THREE.MathUtils.lerp(0.03, 0.044, smoothRunBlend));
      pelvis.position.y = THREE.MathUtils.damp(
        pelvis.position.y,
        THREE.MathUtils.lerp(idlePelvisY, walkPelvisY, smoothMoveBlend),
        12,
        safeDt,
      );
      pelvis.rotation.z = THREE.MathUtils.damp(
        pelvis.rotation.z,
        sinWalk * (options.isGhost ? 0.048 : 0.025) * smoothMoveBlend,
        10,
        safeDt,
      );

      const targetTorsoX = options.isGhost
        ? THREE.MathUtils.lerp(0.09, 0.18, smoothMoveBlend) + Math.sin(time * 1.8) * 0.02
        : THREE.MathUtils.lerp(
            breath * 0.014,
            THREE.MathUtils.lerp(0.045, 0.14, smoothRunBlend),
            smoothMoveBlend,
          );
      const targetTorsoY = -sinWalk * (options.isGhost ? 0.11 : 0.075) * smoothMoveBlend;
      const targetTorsoZ = options.isGhost
        ? Math.sin(time * 1.45) * 0.045 + sinWalk * 0.035 * smoothMoveBlend
        : Math.sin(time * 0.85 + breathPhase) * 0.012 * (1 - smoothMoveBlend);

      torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, targetTorsoX, 10, safeDt);
      torso.rotation.y = THREE.MathUtils.damp(torso.rotation.y, targetTorsoY, 10, safeDt);
      torso.rotation.z = THREE.MathUtils.damp(torso.rotation.z, targetTorsoZ, 10, safeDt);

      // Smooth Head Look toward Player (when idle/walking) or Creepy Periodic Twitchy Head-Tilt for Rukmini
      if (options.snappedNeck) {
        // Mostly upright so her terrifying ghostly face is 100% clearly visible, with a sudden creepy twitchy tilt every ~3.4 seconds
        const twitchPeriod = 3.4;
        const cyclePhase = time % twitchPeriod;
        const cycleIdx = Math.floor(time / twitchPeriod);
        const twitchDir = cycleIdx % 2 === 0 ? -1 : 1;
        let twitchRoll = Math.sin(time * 1.35) * 0.045;
        let twitchYaw = Math.sin(time * 1.15) * 0.09;
        let twitchPitch = -0.04 + Math.sin(time * 1.7) * 0.025;

        if (cyclePhase > 2.45 && cyclePhase < 3.05) {
          const localP = (cyclePhase - 2.45) / 0.6;
          const snapEnv = Math.sin(localP * Math.PI);
          const microSpasm = Math.sin(time * 54) * 0.042 * snapEnv;
          twitchRoll = twitchDir * (0.34 * snapEnv) + microSpasm;
          twitchYaw += twitchDir * 0.14 * snapEnv + Math.cos(time * 46) * 0.03 * snapEnv;
          twitchPitch += -0.06 * snapEnv;
        }

        headGroup.rotation.z = THREE.MathUtils.damp(headGroup.rotation.z, twitchRoll, 22, safeDt);
        headGroup.rotation.y = THREE.MathUtils.damp(headGroup.rotation.y, twitchYaw, 14, safeDt);
        headGroup.rotation.x = THREE.MathUtils.damp(headGroup.rotation.x, twitchPitch, 14, safeDt);
      } else {
        const gentleIdleYaw = Math.sin(time * 0.72 + breathPhase) * 0.11;
        const gentleIdlePitch = Math.sin(time * 1.15 + breathPhase) * 0.035;
        // Track player smoothly when idle or glancing over while walking nearby
        updateSmoothHeadLook(
          gentleIdleYaw,
          gentleIdlePitch,
          0.66,
          0.22,
          smoothMoveBlend > 0.5 ? 4.2 : 5.2,
        );
      }
    },

    async loadGLB(urlOrBuffer: string | ArrayBuffer): Promise<boolean> {
      return new Promise((resolve) => {
        const onLoad = (gltf: any) => {
          try {
            while (glbContainer.children.length > 0) {
              glbContainer.remove(glbContainer.children[0]);
            }

            const model = gltf.scene || gltf.scenes[0];
            if (!model) {
              resolve(false);
              return;
            }

            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const modelHeight = size.y > 0.05 ? size.y : 1.7;
            const targetScale = targetHeight / modelHeight;
            model.scale.setScalar(targetScale);

            box.setFromObject(model);
            model.position.y -= box.min.y;

            model.traverse((child: any) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            if (gltf.animations && gltf.animations.length > 0) {
              const mixer = new THREE.AnimationMixer(model);
              character.mixer = mixer;
              character.actions = {};

              for (const clip of gltf.animations) {
                const lower = clip.name.toLowerCase();
                if (lower.includes('idle')) {
                  character.actions['idle'] = mixer.clipAction(clip);
                } else if (lower.includes('walk')) {
                  character.actions['walk'] = mixer.clipAction(clip);
                } else if (lower.includes('run')) {
                  character.actions['run'] = mixer.clipAction(clip);
                }
              }

              if (!character.actions['idle'] && gltf.animations[0]) {
                character.actions['idle'] = mixer.clipAction(gltf.animations[0]);
              }
              if (!character.actions['walk'] && gltf.animations[1]) {
                character.actions['walk'] = mixer.clipAction(gltf.animations[1]);
              }
              if (!character.actions['run']) {
                character.actions['run'] =
                  character.actions['walk'] || character.actions['idle'];
              }

              character.currentAction = character.actions['idle'];
              character.currentAction?.play();
            }

            glbContainer.add(model);
            proceduralGroup.visible = false;
            character.hasGLB = true;
            resolve(true);
          } catch {
            resolve(false);
          }
        };

        if (typeof urlOrBuffer === 'string') {
          gltfLoader.load(
            urlOrBuffer,
            onLoad,
            undefined,
            () => resolve(false),
          );
        } else {
          gltfLoader.parse(
            urlOrBuffer,
            '',
            onLoad,
            () => resolve(false),
          );
        }
      });
    },
  };

  return character;
}

// ==========================================
// CHARACTER PRESETS (WATCHMAN BABA, AARAV, KABIR, RIYA, DEV, RUKMINI)
// ==========================================

/**
 * 1. The Four Friends: Aarav, Kabir, Riya, Dev (plus legacy aliases Rahul, Neha, Aman, Pooja)
 */
export function createAarav(opts?: { disableLights?: boolean }): HumanoidCharacter {
  return createHumanoid({
    name: 'Aarav',
    height: 1.75,
    skinTone: 0xa97652,
    hairColor: 0x161210,
    hairStyle: 'short',
    clothingStyle: 'casual_jacket',
    shirtColor: 0x26322b, // Muted dark olive field jacket
    undershirtColor: 0x2c2f34, // Charcoal tee
    pantsColor: 0x1c222b, // Dark weathered denim jeans
    shoeColor: 0x181412,
    disableLights: opts?.disableLights,
  });
}

export function createKabir(opts?: { disableLights?: boolean }): HumanoidCharacter {
  return createHumanoid({
    name: 'Kabir',
    height: 1.74,
    skinTone: 0xa3704c, // Warm Indian skin tone
    hairColor: 0x161210,
    hairStyle: 'messy_short', // Layered messy dark hair
    clothingStyle: 'casual_jacket',
    jacketMaterialType: 'fabric',
    shirtColor: 0x26332c, // Muted dark-olive overshirt jacket
    undershirtColor: 0x282b30, // Charcoal tee
    pantsColor: 0x1b232e, // Dark weathered denim jeans (roughness: 0.88)
    shoeColor: 0x181412, // Dark weathered boots
    boundToPillar: true,
    disableLights: opts?.disableLights,
  });
}

export function createRiya(opts?: { disableLights?: boolean }): HumanoidCharacter {
  return createHumanoid({
    name: 'Riya',
    height: 1.65,
    skinTone: 0xb68562, // Warm Indian skin tone
    hairColor: 0x130f0d,
    hairStyle: 'long', // Sculpted long dark hair
    clothingStyle: 'kurti',
    shirtColor: 0x4e1e26, // Muted deep-maroon kurti/jacket
    scarfColor: 0x231c24, // Layered dark charcoal-plum scarf
    pantsColor: 0x1a212b, // Dark weathered denim jeans (roughness: 0.88)
    shoeColor: 0x1b1513, // Dark weathered boots
    bangles: false,
    boundToPillar: true,
    disableLights: opts?.disableLights,
  });
}

export function createDev(opts?: { disableLights?: boolean }): HumanoidCharacter {
  return createHumanoid({
    name: 'Dev',
    height: 1.72,
    skinTone: 0x956444, // Warm Indian skin tone
    hairColor: 0x171310,
    hairStyle: 'short', // Styled short dark hair
    clothingStyle: 'casual_jacket',
    jacketMaterialType: 'leather',
    shirtColor: 0x35191d, // Dark burgundy leather jacket with collar
    undershirtColor: 0x1e2126, // Dark shirt
    pantsColor: 0x1c2026, // Dark weathered trousers/denim (roughness: 0.88)
    shoeColor: 0x161311, // Dark boots
    boundToPillar: true,
    disableLights: opts?.disableLights,
  });
}

// Legacy aliases for cutscene director compatibility
export function createRahul(): HumanoidCharacter {
  const c = createKabir();
  c.boundToPillar = false;
  c.setAnimation('idle');
  return c;
}

export function createNeha(): HumanoidCharacter {
  const c = createRiya();
  c.boundToPillar = false;
  c.setAnimation('idle');
  return c;
}

export function createAman(): HumanoidCharacter {
  const c = createDev();
  c.boundToPillar = false;
  c.setAnimation('idle');
  return c;
}

export function createPooja(): HumanoidCharacter {
  return createHumanoid({
    name: 'Pooja',
    height: 1.63,
    skinTone: 0xbd8c6a,
    hairColor: 0x151210,
    hairStyle: 'long',
    clothingStyle: 'kurti',
    shirtColor: 0x45202b,
    scarfColor: 0x201d24,
    pantsColor: 0x1b222c,
    shoeColor: 0x1a1513,
  });
}

/**
 * 2. Watchman Baba / Chowkidar (Standing at the Outer Gate)
 * Aged horror guard with weathered wrinkled face, layered silver-gray beard & mustache,
 * dusty off-white/beige khadi kurta-dhoti (#bfb59e), thick dark weathered brown/charcoal
 * wool shawl, folded deep-maroon/rust Pagri turban, and warm flickering antique brass lantern.
 */
export function createChowkidar(opts?: { disableLights?: boolean }): HumanoidCharacter {
  return createHumanoid({
    name: 'WatchmanBaba',
    height: 1.69,
    skinTone: 0x92603d, // Warm weathered Indian skin tone
    hairColor: 0x9ea2a8, // Silver-gray temple hair
    hairStyle: 'turban',
    turbanColor: 0x5c1f19, // Detailed folded deep-maroon/rust Pagri turban
    weatheredFace: true,
    hasMoustache: true,
    hasBeard: true,
    beardColor: 0x9ea2a8, // Layered silver-gray beard & mustache
    clothingStyle: 'dhoti_kurta',
    shirtColor: 0xbfb59e, // Aged dusty off-white/beige khadi kurta (roughness: 0.9)
    pantsColor: 0xb7ad95, // Aged dusty off-white/beige dhoti (roughness: 0.9)
    shawl: true,
    shawlColor: 0x2d2420, // Thick dark weathered brown/charcoal wool shawl
    hasLantern: true,
    lanternLightColor: 0xff9e38,
    disableLights: opts?.disableLights,
  });
}

/**
 * 3. Rukmini (The Rakt Pishachini)
 * Gaunt pale ash-gray ghostly face (100% clearly visible with parted tangled black hair, hollow
 * cheeks, sunken eye sockets, cracked veins, smudged bindi & dried sindoor, half-open dark mouth,
 * intensely glowing blood-red eyes), weathered 1992 crimson Banarasi bridal saree with faded
 * antique gold borders & torn veil, pale bony clawed hands with broken red glass bangles,
 * tarnished silver payal anklets, backward-turned feet (उल्टे पाँव), and swirling ankle mist.
 */
export function createRukmini(opts?: { disableLights?: boolean }): HumanoidCharacter {
  return createHumanoid({
    name: 'Rukmini',
    height: 1.76,
    skinTone: 0x9b969c, // Gaunt pale ash-gray corpse skin clearly readable under crimson & flashlight
    hairColor: 0x070709, // Long tangled raven-black hair parted left & right of her face
    hairStyle: 'messy',
    clothingStyle: 'saree',
    sareeColor: 0x610912, // Weathered, tattered 1992 deep-crimson Banarasi bridal saree
    zariColor: 0x9c7c38, // Faded antique gold zari border
    isGhost: true,
    blindEyes: false,
    glowingEyes: true,
    eyeEmissiveColor: 0xff1111, // Intensely glowing blood-red eyes
    snappedNeck: true, // Drives subtle periodic creepy twitchy head-tilt
    reverseFeet: true, // Backward-turned feet (उल्टे पाँव)
    payal: true, // Tarnished silver anklets with ghungroo bells
    bangles: true, // Broken red glass bangles on wrists
    bangleColor: 0xa80916,
    longClawFingers: true, // Pale bony arms & elongated dark-nailed clawed hands
    disableLights: opts?.disableLights,
  });
}

/**
 * 4. Tantrik Kalbhairav (for Story cutscenes)
 */
export function createTantrik(): HumanoidCharacter {
  return createHumanoid({
    name: 'TantrikKalbhairav',
    height: 1.76,
    skinTone: 0x7a4d31,
    hairColor: 0x222222,
    hairStyle: 'bald',
    weatheredFace: true,
    hasMoustache: true,
    hasBeard: true,
    beardColor: 0x2a2a2a,
    clothingStyle: 'tantrik_robe',
    robeColor: 0x161110,
    tilak: true,
    rudraksha: true,
  });
}

/**
 * 5. Thakur (for Story cutscenes)
 */
export function createThakur(): HumanoidCharacter {
  return createHumanoid({
    name: 'Thakur',
    height: 1.74,
    skinTone: 0x9c6d48,
    hairColor: 0xcccccc,
    hairStyle: 'turban',
    turbanColor: 0x8f1622,
    weatheredFace: true,
    hasMoustache: true,
    hasBeard: true,
    beardColor: 0xd2d2d2,
    clothingStyle: 'thakur_sherwani',
    shirtColor: 0x3d1c1c,
    pantsColor: 0xe0d6c5,
    shawl: true,
    shawlColor: 0x7a1f1f,
  });
}

/**
 * 6. First-Person Player Hands Rig (Two-handed rig attached to camera:
 *    Left Hand & forearm on bottom-left holding keys/talisman,
 *    Right Hand & forearm on bottom-right holding a detailed black metal flashlight
 *    with subtle walking bob animation and flashlightTip anchor).
 */
export function createFirstPersonArms(): {
  group: THREE.Group;
  rightArm: THREE.Group;
  leftArm: THREE.Group;
  flashlightMesh: THREE.Group;
  flashlightTip: THREE.Object3D;
  setHoldingKey: (holding: boolean) => void;
  update: (time: number, isMoving: boolean, isSprint: boolean) => void;
  triggerPickup: () => void;
} {
  const group = new THREE.Group();
  group.name = 'FirstPersonArms';

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xb87d54,
    roughness: 0.72,
    metalness: 0.04,
  });

  const knuckleSkinMat = new THREE.MeshStandardMaterial({
    color: 0xa36a43,
    roughness: 0.78,
    metalness: 0.04,
  });

  const nailMat = new THREE.MeshStandardMaterial({
    color: 0xd4a88c,
    roughness: 0.45,
    metalness: 0.08,
  });

  // Dark charcoal-black weathered jacket sleeve (no blue cylinder)
  const sleeveMat = new THREE.MeshStandardMaterial({
    color: 0x1a1c20,
    roughness: 0.88,
    metalness: 0.06,
  });

  const cuffMat = new THREE.MeshStandardMaterial({
    color: 0x262930,
    roughness: 0.82,
    metalness: 0.1,
  });

  // Black anodized metal flashlight materials
  const blackMetalMat = new THREE.MeshStandardMaterial({
    color: 0x141619,
    roughness: 0.34,
    metalness: 0.82,
  });

  const knurledGripMat = new THREE.MeshStandardMaterial({
    color: 0x0d0f12,
    roughness: 0.68,
    metalness: 0.45,
  });

  const gunmetalRingMat = new THREE.MeshStandardMaterial({
    color: 0x343942,
    roughness: 0.28,
    metalness: 0.88,
  });

  const keyBrassMat = new THREE.MeshStandardMaterial({
    color: 0xb8923a,
    roughness: 0.36,
    metalness: 0.84,
  });

  const keyIronMat = new THREE.MeshStandardMaterial({
    color: 0x4a4e54,
    roughness: 0.42,
    metalness: 0.8,
  });

  // ============================================================================
  // RIGHT HAND & FOREARM (Bottom-Right: Holding Detailed Black Metal Flashlight)
  // ============================================================================
  const rightArm = new THREE.Group();
  rightArm.position.set(0.23, -0.19, -0.36);
  rightArm.rotation.set(0.12, -0.18, 0.08);
  group.add(rightArm);

  // Upper jacket sleeve coming from bottom-right camera edge
  const rightSleeve = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.044, 0.22, 8, 12),
    sleeveMat,
  );
  rightSleeve.rotation.x = -Math.PI / 2.25;
  rightSleeve.rotation.z = -0.16;
  rightSleeve.position.set(0.035, -0.075, 0.19);
  rightArm.add(rightSleeve);

  // Jacket cuff band
  const rightCuff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.043, 0.045, 0.036, 14),
    cuffMat,
  );
  rightCuff.rotation.x = -Math.PI / 2.25;
  rightCuff.rotation.z = -0.16;
  rightCuff.position.set(0.016, -0.042, 0.085);
  rightArm.add(rightCuff);

  // Skin-toned lower forearm & wrist
  const rightWrist = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.034, 0.085, 8, 12),
    skinMat,
  );
  rightWrist.rotation.x = -Math.PI / 2.25;
  rightWrist.rotation.z = -0.12;
  rightWrist.position.set(0.006, -0.025, 0.032);
  rightArm.add(rightWrist);

  // Right Hand Palm sculpted around the flashlight grip
  const rightHandGroup = new THREE.Group();
  rightHandGroup.position.set(0, -0.012, -0.025);
  rightArm.add(rightHandGroup);

  const rightPalm = new THREE.Mesh(
    new THREE.BoxGeometry(0.068, 0.032, 0.078),
    skinMat,
  );
  rightPalm.position.set(0.012, -0.008, 0.0);
  rightPalm.rotation.z = -0.35;
  rightHandGroup.add(rightPalm);

  // 4 Wrapped Right-Hand Fingers gripping the flashlight barrel
  for (let f = 0; f < 4; f++) {
    const zOff = -0.026 + f * 0.017;
    const knuckle = new THREE.Mesh(
      new THREE.SphereGeometry(0.0085, 8, 8),
      knuckleSkinMat,
    );
    knuckle.position.set(0.032, 0.006, zOff);
    rightHandGroup.add(knuckle);

    // Proximal phalanx curving over top/side of barrel
    const prox = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.0072, 0.024, 6, 8),
      skinMat,
    );
    prox.position.set(0.024, -0.012, zOff);
    prox.rotation.z = 0.65;
    rightHandGroup.add(prox);

    // Distal phalanx curling under barrel
    const dist = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.0062, 0.02, 6, 8),
      skinMat,
    );
    dist.position.set(0.002, -0.024, zOff);
    dist.rotation.z = 1.45;
    rightHandGroup.add(dist);

    const nail = new THREE.Mesh(
      new THREE.BoxGeometry(0.005, 0.002, 0.006),
      nailMat,
    );
    nail.position.set(-0.008, -0.022, zOff);
    rightHandGroup.add(nail);
  }

  // Right Thumb resting along upper-left side of flashlight near the power switch
  const rightThumbBase = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.009, 0.026, 6, 8),
    skinMat,
  );
  rightThumbBase.position.set(-0.018, 0.014, 0.012);
  rightThumbBase.rotation.set(0.45, 0.25, -0.4);
  rightHandGroup.add(rightThumbBase);

  const rightThumbTip = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.0078, 0.022, 6, 8),
    skinMat,
  );
  rightThumbTip.position.set(-0.012, 0.022, -0.015);
  rightThumbTip.rotation.set(1.15, 0.1, -0.15);
  rightHandGroup.add(rightThumbTip);

  // Detailed Black Metal Tactical Flashlight held in Right Hand
  const flashlightMesh = new THREE.Group();
  flashlightMesh.position.set(-0.002, 0.004, -0.045);
  flashlightMesh.rotation.set(0.02, 0.06, 0);
  rightArm.add(flashlightMesh);

  // Main black anodized handle tube
  const bodyTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.021, 0.021, 0.19, 16),
    blackMetalMat,
  );
  bodyTube.rotation.x = Math.PI / 2;
  flashlightMesh.add(bodyTube);

  // Textured knurled grip sleeve
  const gripSleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0222, 0.0222, 0.105, 16),
    knurledGripMat,
  );
  gripSleeve.rotation.x = Math.PI / 2;
  gripSleeve.position.set(0, 0, 0.01);
  flashlightMesh.add(gripSleeve);

  // Rear tailcap
  const tailCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0225, 0.021, 0.028, 16),
    gunmetalRingMat,
  );
  tailCap.rotation.x = Math.PI / 2;
  tailCap.position.set(0, 0, 0.102);
  flashlightMesh.add(tailCap);

  // Gunmetal cooling fins collar
  for (let r = 0; r < 3; r++) {
    const finRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.0225, 0.0022, 8, 16),
      gunmetalRingMat,
    );
    finRing.position.set(0, 0, -0.068 - r * 0.009);
    flashlightMesh.add(finRing);
  }

  // Tactile rubberized power switch button on top
  const switchBtn = new THREE.Mesh(
    new THREE.BoxGeometry(0.011, 0.006, 0.018),
    new THREE.MeshStandardMaterial({
      color: 0x7a1c1c,
      roughness: 0.5,
      metalness: 0.2,
    }),
  );
  switchBtn.position.set(0, 0.022, -0.042);
  flashlightMesh.add(switchBtn);

  // Flared black metal bezel head
  const bezelHead = new THREE.Mesh(
    new THREE.CylinderGeometry(0.034, 0.023, 0.062, 16),
    blackMetalMat,
  );
  bezelHead.rotation.x = Math.PI / 2;
  bezelHead.position.set(0, 0, -0.118);
  flashlightMesh.add(bezelHead);

  // Front metallic bezel rim
  const bezelRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.033, 0.0028, 8, 18),
    gunmetalRingMat,
  );
  bezelRim.position.set(0, 0, -0.149);
  flashlightMesh.add(bezelRim);

  // Warm glass reflector lens
  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(0.031, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff5dc }),
  );
  lens.position.set(0, 0, -0.15);
  flashlightMesh.add(lens);

  // Flashlight Tip Anchor (for attaching the THREE.SpotLight directly at the tip)
  const flashlightTip = new THREE.Object3D();
  flashlightTip.position.set(0, 0, -0.165);
  flashlightMesh.add(flashlightTip);

  // ============================================================================
  // LEFT HAND & FOREARM (Bottom-Left: Relaxed Natural Pose, Dark Jacket Sleeve)
  // ============================================================================
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.295, -0.305, -0.34);
  leftArm.rotation.set(-0.24, 0.34, 0.36);
  group.add(leftArm);

  // Dark weathered jacket sleeve emerging naturally from bottom-left viewport edge
  const leftSleeve = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.048, 0.28, 8, 12),
    sleeveMat,
  );
  leftSleeve.rotation.x = -Math.PI / 2.25;
  leftSleeve.rotation.z = 0.14;
  leftSleeve.position.set(-0.045, -0.095, 0.22);
  leftArm.add(leftSleeve);

  // Subtle jacket seam / folded cuff rim
  const leftSleeveFold = new THREE.Mesh(
    new THREE.CylinderGeometry(0.049, 0.052, 0.042, 14),
    sleeveMat,
  );
  leftSleeveFold.rotation.x = -Math.PI / 2.25;
  leftSleeveFold.rotation.z = 0.14;
  leftSleeveFold.position.set(-0.024, -0.056, 0.112);
  leftArm.add(leftSleeveFold);

  // Dark ribbed jacket cuff band around lower wrist
  const leftCuff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.046, 0.04, 14),
    cuffMat,
  );
  leftCuff.rotation.x = -Math.PI / 2.25;
  leftCuff.rotation.z = 0.14;
  leftCuff.position.set(-0.014, -0.038, 0.078);
  leftArm.add(leftCuff);

  // Tapered skin-toned lower wrist
  const leftWrist = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.031, 0.072, 8, 12),
    skinMat,
  );
  leftWrist.rotation.x = -Math.PI / 2.25;
  leftWrist.rotation.z = 0.1;
  leftWrist.position.set(-0.005, -0.02, 0.032);
  leftArm.add(leftWrist);

  // Softly Sculpted, Relaxed Left Hand (angled gently downward & inward)
  const leftHandGroup = new THREE.Group();
  leftHandGroup.position.set(0.002, -0.012, -0.024);
  leftHandGroup.rotation.set(-0.18, 0.1, 0.26);
  leftArm.add(leftHandGroup);

  // Rounded organic palm (sculpted ellipsoid instead of flat rigid slab)
  const leftPalm = new THREE.Mesh(
    new THREE.SphereGeometry(0.042, 14, 12),
    skinMat,
  );
  leftPalm.scale.set(0.86, 0.38, 1.02);
  leftPalm.position.set(-0.004, -0.005, -0.002);
  leftHandGroup.add(leftPalm);

  // Soft thumb-base pad (thenar eminence)
  const leftPalmPad = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 10, 8),
    skinMat,
  );
  leftPalmPad.scale.set(0.95, 0.65, 1.15);
  leftPalmPad.position.set(0.016, -0.011, 0.004);
  leftHandGroup.add(leftPalmPad);

  // 4 Naturally Relaxed, Softly Curled Fingers (progressive curl from index to pinky)
  const fingerSpecs = [
    { xOff: 0.021, len: 0.024, curl1: 0.56, curl2: 0.48, splay: -0.06, zStart: -0.036 }, // Index
    { xOff: 0.006, len: 0.027, curl1: 0.72, curl2: 0.58, splay: -0.01, zStart: -0.039 }, // Middle
    { xOff: -0.009, len: 0.024, curl1: 0.88, curl2: 0.66, splay: 0.04, zStart: -0.036 }, // Ring
    { xOff: -0.023, len: 0.019, curl1: 1.04, curl2: 0.72, splay: 0.09, zStart: -0.031 }, // Pinky
  ];
  for (let f = 0; f < fingerSpecs.length; f++) {
    const spec = fingerSpecs[f];

    const knuckle = new THREE.Mesh(
      new THREE.SphereGeometry(0.0074, 8, 8),
      knuckleSkinMat,
    );
    knuckle.position.set(spec.xOff, 0.002, spec.zStart);
    leftHandGroup.add(knuckle);

    const fingerRoot = new THREE.Group();
    fingerRoot.position.set(spec.xOff, 0.001, spec.zStart);
    fingerRoot.rotation.set(-spec.curl1, spec.splay, 0);
    leftHandGroup.add(fingerRoot);

    const prox = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.0062, spec.len, 6, 8),
      skinMat,
    );
    prox.rotation.x = Math.PI / 2;
    prox.position.set(0, 0, -spec.len * 0.55);
    fingerRoot.add(prox);

    const midJoint = new THREE.Group();
    midJoint.position.set(0, 0, -spec.len * 1.1);
    midJoint.rotation.x = -spec.curl2;
    fingerRoot.add(midJoint);

    const dist = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.0052, spec.len * 0.72, 6, 8),
      skinMat,
    );
    dist.rotation.x = Math.PI / 2;
    dist.position.set(0, 0, -spec.len * 0.42);
    midJoint.add(dist);

    const nail = new THREE.Mesh(
      new THREE.BoxGeometry(0.0054, 0.0018, 0.0048),
      nailMat,
    );
    nail.position.set(0, 0.0044, -spec.len * 0.66);
    midJoint.add(nail);
  }

  // Softly Relaxed Left Thumb tucked naturally alongside palm
  const leftThumbRoot = new THREE.Group();
  leftThumbRoot.position.set(0.024, -0.004, -0.008);
  leftThumbRoot.rotation.set(-0.34, -0.46, -0.22);
  leftHandGroup.add(leftThumbRoot);

  const leftThumbBase = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.0082, 0.022, 6, 8),
    skinMat,
  );
  leftThumbBase.rotation.x = Math.PI / 2;
  leftThumbBase.position.set(0, 0, -0.014);
  leftThumbRoot.add(leftThumbBase);

  const leftThumbTip = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.0068, 0.018, 6, 8),
    skinMat,
  );
  leftThumbTip.rotation.set(Math.PI / 2 - 0.35, 0, 0);
  leftThumbTip.position.set(0.002, -0.006, -0.032);
  leftThumbRoot.add(leftThumbTip);

  // Antique Haveli Keyring & Keys / Talisman held in Left Hand
  const keysCluster = new THREE.Group();
  keysCluster.position.set(0.014, -0.016, -0.044);
  leftHandGroup.add(keysCluster);

  const keyRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.022, 0.0032, 8, 20),
    keyBrassMat,
  );
  keyRing.rotation.y = Math.PI / 3;
  keysCluster.add(keyRing);

  // Key 1: Large Brass Haveli Master Skeleton Key
  const key1 = new THREE.Group();
  key1.position.set(0.004, -0.02, 0.002);
  key1.rotation.z = 0.12;
  const k1Bow = new THREE.Mesh(
    new THREE.TorusGeometry(0.011, 0.0025, 6, 14),
    keyBrassMat,
  );
  const k1Shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0024, 0.0024, 0.062, 8),
    keyBrassMat,
  );
  k1Shaft.position.y = -0.038;
  const k1Bit = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.014, 0.003),
    keyBrassMat,
  );
  k1Bit.position.set(0.006, -0.058, 0);
  key1.add(k1Bow, k1Shaft, k1Bit);
  keysCluster.add(key1);

  // Key 2: Old Iron Tehkhana Cellar Key
  const key2 = new THREE.Group();
  key2.position.set(-0.006, -0.02, -0.004);
  key2.rotation.z = -0.16;
  key2.rotation.y = 0.35;
  const k2Bow = new THREE.Mesh(
    new THREE.TorusGeometry(0.0095, 0.0022, 6, 12),
    keyIronMat,
  );
  const k2Shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0022, 0.0022, 0.052, 8),
    keyIronMat,
  );
  k2Shaft.position.y = -0.032;
  const k2Bit = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.011, 0.0028),
    keyIronMat,
  );
  k2Bit.position.set(0.005, -0.048, 0);
  key2.add(k2Bow, k2Shaft, k2Bit);
  keysCluster.add(key2);

  // Brass Raksha Talisman Tag on Keyring
  const talismanTag = new THREE.Mesh(
    new THREE.BoxGeometry(0.014, 0.028, 0.004),
    keyBrassMat,
  );
  talismanTag.position.set(0.01, -0.03, 0.008);
  talismanTag.rotation.set(0.1, 0.4, 0.28);
  keysCluster.add(talismanTag);

  // Prevent first-person arms from casting self-shadows into the SpotLight beam
  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });

  let pickupTime = 0;

  keysCluster.visible = false;

  return {
    group,
    rightArm,
    leftArm,
    flashlightMesh,
    flashlightTip,
    setHoldingKey(holding: boolean) {
      keysCluster.visible = holding;
    },
    triggerPickup() {
      pickupTime = 1.0;
    },
    update(time, isMoving, isSprint) {
      // Subtle walking bob & idle breathing animation
      const breath = Math.sin(time * 2.1);
      const bobFreq = isSprint ? 10.5 : isMoving ? 6.8 : 2.1;
      const bobAmp = isSprint ? 0.022 : isMoving ? 0.012 : 0.003;

      const bobY = Math.sin(time * bobFreq) * bobAmp;
      const bobX = Math.cos((time * bobFreq) * 0.5) * (bobAmp * 0.65);

      // Right hand (flashlight) subtle bob & wrist sway
      rightArm.position.x = 0.23 + bobX;
      rightArm.position.y = -0.19 + bobY + breath * 0.0025;
      rightArm.rotation.x = 0.12 - bobY * 1.4;
      rightArm.rotation.y = -0.18 + bobX * 0.8;

      // Left hand: lowered, naturally relaxed at the bottom-left edge with gentle counter-sway
      const leftBobY = Math.sin(time * bobFreq + Math.PI * 0.85) * (bobAmp * 0.72);
      const leftBobX = Math.cos(time * bobFreq * 0.5 + 0.6) * (bobAmp * 0.45);
      const keyLift = keysCluster.visible ? 0.045 : 0;
      leftArm.position.x = -0.295 - leftBobX;
      leftArm.position.y = -0.305 + keyLift + leftBobY + breath * 0.002;
      leftArm.position.z = -0.34;
      leftArm.rotation.x = -0.24 + keyLift * 2.2 - leftBobY * 0.9;
      leftArm.rotation.y = 0.34 - leftBobX * 0.6;
      leftArm.rotation.z = 0.36;

      // Subtle swinging of the dangling keys on the keyring
      keysCluster.rotation.z = Math.sin(time * bobFreq * 1.1) * (isMoving ? 0.18 : 0.03);
      keysCluster.rotation.x = Math.cos(time * bobFreq * 0.9) * (isMoving ? 0.12 : 0.02);

      if (pickupTime > 0) {
        pickupTime = Math.max(0, pickupTime - 0.05);
        const reach = Math.sin(pickupTime * Math.PI);
        leftArm.position.y += reach * 0.15;
        leftArm.position.z -= reach * 0.1;
        leftArm.rotation.x += reach * 0.38;
      }
    },
  };
}

// ==========================================
// GLB AUTO-DISCOVERY & DRAG-AND-DROP MANAGER
// ==========================================

export class CharacterGLBManager {
  private static registeredCharacters = new Map<string, HumanoidCharacter>();
  private static isListenerSetup = false;

  public static register(
    category: 'kallu' | 'mangesh' | 'golu',
    character: HumanoidCharacter,
  ) {
    this.registeredCharacters.set(category, character);
    this.setupGlobalDragDrop();
  }

  private static setupGlobalDragDrop() {
    if (this.isListenerSetup || typeof window === 'undefined') return;
    this.isListenerSetup = true;

    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', async (e) => {
      e.preventDefault();
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const lowerName = file.name.toLowerCase();
        let targetKey: 'kallu' | 'mangesh' | 'golu' | null = null;

        if (lowerName.includes('kallu') || lowerName.includes('rukmini')) {
          targetKey = 'kallu';
        } else if (lowerName.includes('mangesh') || lowerName.includes('friend')) {
          targetKey = 'mangesh';
        } else if (lowerName.includes('golu') || lowerName.includes('guard')) {
          targetKey = 'golu';
        }

        if (targetKey) {
          const char = this.registeredCharacters.get(targetKey);
          if (char) {
            const buffer = await file.arrayBuffer();
            await char.loadGLB(buffer);
          }
        }
      }
    });
  }
}
