import * as THREE from 'three';

export interface WallColliderBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}

export type IndianQuiltVariant = 'royal_crimson' | 'guest_indigo' | 'humble_ochre';
export type VintageRugVariant = 'darbar_crimson' | 'indigo_medallion' | 'ochre_runner';
export type WallTapestryVariant = 'royal_crest' | 'dancer_arch' | 'peacock_loom';

export interface AntiqueBedOptions {
  variant?: IndianQuiltVariant;
  width?: number;
  length?: number;
  withCanopy?: boolean;
  withGarlands?: boolean;
  elevatedForHiding?: boolean;
  materials: {
    woodMat: THREE.Material;
    brassMat: THREE.Material;
    curtainMat?: THREE.Material;
  };
}

export interface CorridorHorrorPropsContext {
  root: THREE.Group;
  wallColliders: WallColliderBox[];
  materials: {
    woodMat: THREE.Material;
    brassMat: THREE.Material;
    ironMat: THREE.Material;
    carvedSandstoneMat: THREE.Material;
    curtainMat: THREE.Material;
    clayMat: THREE.Material;
  };
}

// ---------------------------------------------------------------------------
// Cached procedural textures & materials so multiple beds/props share GPU assets
// ---------------------------------------------------------------------------
const quiltMaterialCache = new Map<IndianQuiltVariant, THREE.MeshStandardMaterial>();
const blanketMaterialCache = new Map<IndianQuiltVariant, THREE.MeshStandardMaterial>();
const pillowMaterialCache = new Map<IndianQuiltVariant, THREE.MeshStandardMaterial>();
const rugMaterialCache = new Map<VintageRugVariant, THREE.MeshStandardMaterial>();
const tapestryMaterialCache = new Map<WallTapestryVariant, THREE.MeshStandardMaterial>();
let cachedDarkTeakMat: THREE.MeshStandardMaterial | null = null;
let cachedAntiqueBrassMat: THREE.MeshStandardMaterial | null = null;

function createDarkCarvedTeakMaterial(): THREE.MeshStandardMaterial {
  if (cachedDarkTeakMat) return cachedDarkTeakMat;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#2d1a11';
  ctx.fillRect(0, 0, 256, 256);

  // Warm aged teak / sheesham vertical wood grain
  for (let i = 0; i < 90; i++) {
    const x = (i * 19) % 256;
    const w = 2 + (i % 5);
    ctx.fillStyle = i % 3 === 0 ? 'rgba(66, 39, 24, 0.42)' : 'rgba(22, 11, 7, 0.44)';
    ctx.fillRect(x, 0, w, 256);
  }
  // Carved recessed paneling border motif
  ctx.strokeStyle = 'rgba(14, 7, 4, 0.65)';
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, 232, 232);
  ctx.strokeStyle = 'rgba(98, 62, 38, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, 220, 220);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;

  cachedDarkTeakMat = new THREE.MeshStandardMaterial({
    map: tex,
    bumpMap: tex,
    bumpScale: 0.03,
    color: 0xb88b6a,
    roughness: 0.66,
    metalness: 0.08,
  });
  return cachedDarkTeakMat;
}

function createAntiquePolishedBrassMaterial(): THREE.MeshStandardMaterial {
  if (cachedAntiqueBrassMat) return cachedAntiqueBrassMat;
  cachedAntiqueBrassMat = new THREE.MeshStandardMaterial({
    color: 0xb48a3e,
    roughness: 0.3,
    metalness: 0.84,
  });
  return cachedAntiqueBrassMat;
}

/**
 * Procedural dark patterned Rajasthani / Indian quilt & bedsheet texture.
 * Never plain white — always rich aged royal damask, indigo paisley, or earthy ochre weave.
 */
export function createIndianQuiltMaterial(
  variant: IndianQuiltVariant,
): THREE.MeshStandardMaterial {
  const existing = quiltMaterialCache.get(variant);
  if (existing) return existing;

  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  const palettes: Record<
    IndianQuiltVariant,
    {
      base: string;
      border: string;
      accent: string;
      motif: string;
      stitch: string;
    }
  > = {
    royal_crimson: {
      base: '#4a1118',
      border: '#2b080d',
      accent: '#b88636',
      motif: '#7c212b',
      stitch: 'rgba(210, 162, 82, 0.25)',
    },
    guest_indigo: {
      base: '#1c2438',
      border: '#101625',
      accent: '#a97e42',
      motif: '#34415f',
      stitch: 'rgba(195, 162, 108, 0.24)',
    },
    humble_ochre: {
      base: '#4b3322',
      border: '#2d1c12',
      accent: '#9c6c3b',
      motif: '#6d442b',
      stitch: 'rgba(182, 146, 102, 0.22)',
    },
  };
  const pal = palettes[variant];

  ctx.fillStyle = pal.base;
  ctx.fillRect(0, 0, size, size);

  // Subtle woven linen warp/weft texture
  for (let i = 0; i < size; i += 4) {
    ctx.fillStyle = i % 8 === 0 ? 'rgba(0,0,0,0.08)' : 'rgba(255,235,205,0.03)';
    ctx.fillRect(0, i, size, 1);
    ctx.fillRect(i, 0, 1, size);
  }

  // Ornate outer Rajasthani quilt border frame
  ctx.strokeStyle = pal.border;
  ctx.lineWidth = 42;
  ctx.strokeRect(21, 21, size - 42, size - 42);

  ctx.strokeStyle = pal.accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(46, 46, size - 92, size - 92);
  ctx.strokeRect(58, 58, size - 116, size - 116);

  // Scalloped block-print border medallions
  for (let i = 68; i <= size - 68; i += 34) {
    for (const edge of [30, size - 30]) {
      ctx.fillStyle = pal.accent;
      ctx.beginPath();
      ctx.arc(i, edge, 5, 0, Math.PI * 2);
      ctx.arc(edge, i, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Diamond Jaipuri hand-block print floral grid inside central field
  const step = 64;
  ctx.strokeStyle = pal.stitch;
  ctx.lineWidth = 1.5;
  for (let gx = 80; gx <= size - 80; gx += step) {
    for (let gy = 80; gy <= size - 80; gy += step) {
      // Diamond quilted seam
      ctx.beginPath();
      ctx.moveTo(gx, gy - step * 0.48);
      ctx.lineTo(gx + step * 0.48, gy);
      ctx.lineTo(gx, gy + step * 0.48);
      ctx.lineTo(gx - step * 0.48, gy);
      ctx.closePath();
      ctx.stroke();

      // 4-petal lotus / paisley rosette
      ctx.fillStyle = pal.motif;
      for (let p = 0; p < 4; p++) {
        const a = (p * Math.PI) / 2;
        ctx.beginPath();
        ctx.ellipse(
          gx + Math.cos(a) * 11,
          gy + Math.sin(a) * 11,
          7,
          4,
          a,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.fillStyle = pal.accent;
      ctx.beginPath();
      ctx.arc(gx, gy, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Aged dust, crease darkening & ghostly damp stains so it feels authentic to a haunted Haveli
  for (let s = 0; s < 16; s++) {
    const sx = ((s * 97 + 43) % (size - 80)) + 40;
    const sy = ((s * 131 + 29) % (size - 80)) + 40;
    const sr = 35 + (s % 4) * 18;
    const grad = ctx.createRadialGradient(sx, sy, 2, sx, sy, sr);
    grad.addColorStop(0, 'rgba(12, 8, 6, 0.28)');
    grad.addColorStop(1, 'rgba(12, 8, 6, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    bumpMap: tex,
    bumpScale: 0.025,
    roughness: 0.91,
    metalness: 0.02,
  });
  quiltMaterialCache.set(variant, mat);
  return mat;
}

function createWrinkledBlanketMaterial(
  variant: IndianQuiltVariant,
): THREE.MeshStandardMaterial {
  const existing = blanketMaterialCache.get(variant);
  if (existing) return existing;

  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  const colors: Record<IndianQuiltVariant, { bg: string; stripe: string; trim: string }> = {
    royal_crimson: { bg: '#2b1218', stripe: '#6f1d28', trim: '#a67b36' },
    guest_indigo: { bg: '#3c1e22', stripe: '#5c2d2c', trim: '#9e7c44' },
    humble_ochre: { bg: '#2c251d', stripe: '#4f3b28', trim: '#7c5d3b' },
  };
  const col = colors[variant];

  ctx.fillStyle = col.bg;
  ctx.fillRect(0, 0, size, size);

  // Woven shawl horizontal bands & subtle embroidered thread
  for (let y = 0; y < size; y += 20) {
    ctx.fillStyle = col.stripe;
    ctx.fillRect(0, y, size, 6);
    ctx.fillStyle = col.trim;
    ctx.fillRect(0, y + 7, size, 2);
  }
  for (let x = 0; x < size; x += 6) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(x, 0, 1, size);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    bumpMap: tex,
    bumpScale: 0.02,
    roughness: 0.94,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  blanketMaterialCache.set(variant, mat);
  return mat;
}

function createPillowMaterial(variant: IndianQuiltVariant): THREE.MeshStandardMaterial {
  const existing = pillowMaterialCache.get(variant);
  if (existing) return existing;

  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  const baseHex =
    variant === 'royal_crimson'
      ? '#6b222a'
      : variant === 'guest_indigo'
        ? '#39465e'
        : '#6b533e';
  const trimHex =
    variant === 'royal_crimson'
      ? '#b38945'
      : variant === 'guest_indigo'
        ? '#9d8254'
        : '#8b6c4a';

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = trimHex;
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, size - 20, size - 20);
  // Subtle aged fabric darkening
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 68);
  grad.addColorStop(0, 'rgba(255, 240, 215, 0.08)');
  grad.addColorStop(1, 'rgba(10, 6, 4, 0.34)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.92,
    metalness: 0.02,
  });
  pillowMaterialCache.set(variant, mat);
  return mat;
}

/**
 * Creates a slightly wrinkled folded blanket draped organically across the lower part of a bed.
 */
export function createWrinkledBlanketMesh(
  width: number,
  depth: number,
  variant: IndianQuiltVariant,
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(width + 0.16, depth + 0.14, 18, 12);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const halfW = width * 0.5;
  const halfD = depth * 0.5;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);

    // Organic diagonal cloth folds + rumpled ridge near the folded top edge
    const ripple =
      Math.sin(x * 5.2 + z * 3.8) * 0.024 +
      Math.cos(x * 9.1 - z * 5.4) * 0.014 +
      Math.sin(z * 11.5) * 0.011;
    // Slight bunching on one corner so it looks recently disturbed
    const bunch = Math.exp(-((x - halfW * 0.35) ** 2 + (z + halfD * 0.1) ** 2) * 3.2) * 0.055;

    let y = 0.028 + ripple + bunch;

    // Drape gently down over the left/right edges of the mattress
    const overX = Math.max(0, Math.abs(x) - halfW + 0.03);
    if (overX > 0) {
      y -= overX * 1.45;
    }
    const overFrontZ = Math.max(0, z - halfD + 0.02);
    if (overFrontZ > 0) {
      y -= overFrontZ * 1.15;
    }

    pos.setY(i, y);
  }
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, createWrinkledBlanketMaterial(variant));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Creates a plump sculpted pillow with subtle central indentation.
 */
export function createSculptedPillowMesh(
  width: number,
  thickness: number,
  depth: number,
  variant: IndianQuiltVariant,
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(width, thickness, depth, 8, 4, 6);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const hw = width * 0.5;
  const ht = thickness * 0.5;
  const hd = depth * 0.5;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = x / hw;
    const nz = z / hd;
    const edgeFactor = Math.max(0, 1 - (nx * nx * 0.55 + nz * nz * 0.55));
    // Puff center outward, pinch corners smoothly like real stuffed cotton pillows
    const puff = 0.52 + edgeFactor * 0.65;
    // Slight head-indent crease in the middle top
    const indent =
      y > 0 ? Math.exp(-(nx * nx * 3.5 + nz * nz * 3.5)) * 0.022 : 0;
    pos.setY(i, y * puff - indent);
    pos.setX(i, x * (0.94 + edgeFactor * 0.06));
    pos.setZ(i, z * (0.94 + edgeFactor * 0.06));
  }
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, createPillowMaterial(variant));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Builds a realistic antique Indian wooden bed (Carved Teak Palang) with:
 * - Carved arched wooden headboard & footboard with brass medallion crest
 * - Turned legs / corner posts with brass finials
 * - Dark patterned Indian quilt/bedsheet (never plain white!)
 * - Plump sculpted pillows & optional cylindrical bolster
 * - Slightly wrinkled draped blanket across the lower half
 * - Optional four-poster canopy with tattered silk curtains & dried marigold garlands
 *
 * Local orientation: headboard sits at local -Z (back), footboard at +Z (front).
 */
export function createAntiqueIndianBed(options: AntiqueBedOptions): THREE.Group {
  const {
    variant = 'guest_indigo',
    width = 1.92,
    length = 2.18,
    withCanopy = false,
    withGarlands = false,
    elevatedForHiding = false,
    materials,
  } = options;

  const group = new THREE.Group();
  const teakMat = createDarkCarvedTeakMaterial();
  const brassMat = createAntiquePolishedBrassMaterial();
  const quiltMat = createIndianQuiltMaterial(variant);

  // Hiding bed (2F-2) stays elevated at 0.84m so the 0.72m crawl space works cleanly
  const railY = elevatedForHiding ? 0.84 : 0.44;
  const mattressY = railY + 0.19;
  const mattressH = 0.2;
  const mattressTopY = mattressY + mattressH * 0.5;
  const halfW = width * 0.5;
  const halfL = length * 0.5;

  // 1. Heavy carved wooden bedframe rails (4 perimeter rails + recessed slat base)
  const leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.22, length - 0.08), teakMat);
  leftRail.position.set(-halfW + 0.055, railY, 0);
  const rightRail = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.22, length - 0.08), teakMat);
  rightRail.position.set(halfW - 0.055, railY, 0);
  const headRail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.22, 0.11), teakMat);
  headRail.position.set(0, railY, -halfL + 0.055);
  const footRail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.22, 0.11), teakMat);
  footRail.position.set(0, railY, halfL - 0.055);
  const slatDeck = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.16, 0.07, length - 0.16),
    materials.woodMat,
  );
  slatDeck.position.set(0, railY - 0.03, 0);
  [leftRail, rightRail, headRail, footRail, slatDeck].forEach((m) => {
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  });

  // 2. Four turned wooden corner legs / bedposts with brass rings & finials
  const postHeight = withCanopy
    ? elevatedForHiding
      ? 2.48
      : 2.38
    : elevatedForHiding
      ? 1.7
      : 1.38;
  const frontPostHeight = withCanopy
    ? postHeight
    : elevatedForHiding
      ? 1.18
      : 0.88;

  const postCoords: Array<[number, number, boolean]> = [
    [-halfW + 0.06, -halfL + 0.06, true],
    [halfW - 0.06, -halfL + 0.06, true],
    [-halfW + 0.06, halfL - 0.06, false],
    [halfW - 0.06, halfL - 0.06, false],
  ];
  for (const [px, pz, isHead] of postCoords) {
    const h = isHead ? postHeight : frontPostHeight;
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.074, h, 10),
      teakMat,
    );
    post.position.set(px, h * 0.5, pz);
    post.castShadow = true;
    post.receiveShadow = true;
    group.add(post);

    // Turned decorative brass collar near leg base & post top
    const footRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.078, 0.082, 0.07, 10),
      brassMat,
    );
    footRing.position.set(px, 0.12, pz);
    const upperCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.068, 0.055, 10),
      brassMat,
    );
    upperCollar.position.set(px, h - 0.1, pz);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.072, 10, 8), brassMat);
    finial.position.set(px, h + 0.05, pz);
    group.add(footRing, upperCollar, finial);
  }

  // 3. Ornate Carved Rajasthani Wooden Headboard (at -Z)
  const hbBaseY = railY + 0.08;
  const hbHeight = elevatedForHiding ? 1.02 : 0.96;
  const hbCenterY = hbBaseY + hbHeight * 0.5;
  const hbZ = -halfL + 0.055;

  const hbFrame = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.12, hbHeight, 0.11),
    teakMat,
  );
  hbFrame.position.set(0, hbCenterY, hbZ);
  hbFrame.castShadow = true;
  hbFrame.receiveShadow = true;
  group.add(hbFrame);

  // Recessed carved panel + decorative vertical ribs
  const hbInner = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.34, hbHeight - 0.22, 0.05),
    materials.woodMat,
  );
  hbInner.position.set(0, hbCenterY, hbZ + 0.045);
  group.add(hbInner);

  for (const sx of [-width * 0.24, 0, width * 0.24]) {
    const mullion = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, hbHeight - 0.16, 0.07),
      teakMat,
    );
    mullion.position.set(sx, hbCenterY, hbZ + 0.05);
    group.add(mullion);
  }

  // Carved scalloped arched wooden crown atop headboard + central antique brass crest
  const crownArch = new THREE.Mesh(
    new THREE.CylinderGeometry(width * 0.31, width * 0.35, 0.1, 14, 1, false, 0, Math.PI),
    teakMat,
  );
  crownArch.rotation.z = Math.PI / 2;
  crownArch.rotation.y = Math.PI / 2;
  crownArch.scale.set(1.0, 0.48, 1.0);
  crownArch.position.set(0, hbBaseY + hbHeight - 0.02, hbZ);
  group.add(crownArch);

  const crestMedallion = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.04, 14),
    brassMat,
  );
  crestMedallion.rotation.x = Math.PI / 2;
  crestMedallion.position.set(0, hbBaseY + hbHeight * 0.64, hbZ + 0.068);
  group.add(crestMedallion);

  // Carved lower wooden footboard (at +Z)
  const fbHeight = elevatedForHiding ? 0.34 : 0.42;
  const fbPanel = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.12, fbHeight, 0.09),
    teakMat,
  );
  fbPanel.position.set(0, railY + fbHeight * 0.5 - 0.04, halfL - 0.055);
  fbPanel.castShadow = true;
  fbPanel.receiveShadow = true;
  group.add(fbPanel);

  // Brass inlay trim bar along footboard top
  const fbTrim = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.22, 0.035, 0.105),
    brassMat,
  );
  fbTrim.position.set(0, railY + fbHeight - 0.04, halfL - 0.055);
  group.add(fbTrim);

  // 4. Plush Mattress with Dark Patterned Indian Quilt / Bedsheet
  const mattressW = width - 0.16;
  const mattressL = length - 0.18;
  const mattress = new THREE.Mesh(
    new THREE.BoxGeometry(mattressW, mattressH, mattressL),
    quiltMat,
  );
  mattress.position.set(0, mattressY, 0);
  mattress.castShadow = true;
  mattress.receiveShadow = true;
  group.add(mattress);

  // Soft quilted bedsheet overhang valance skirt hugging left/right sides (not hiding bed front)
  if (!elevatedForHiding) {
    const skirtL = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.16, mattressL - 0.06),
      quiltMat,
    );
    skirtL.position.set(-mattressW * 0.5 - 0.01, mattressY - 0.1, 0);
    const skirtR = skirtL.clone();
    skirtR.position.x = mattressW * 0.5 + 0.01;
    group.add(skirtL, skirtR);
  }

  // 5. Two Plump Sculpted Pillows + Optional Traditional Bolster resting against headboard
  const pillowW = Math.min(0.66, (mattressW - 0.28) * 0.5);
  const pillowOffsets =
    width >= 1.55 ? [-mattressW * 0.24, mattressW * 0.24] : [0];
  pillowOffsets.forEach((px, idx) => {
    const pillow = createSculptedPillowMesh(pillowW, 0.17, 0.44, variant);
    pillow.position.set(px, mattressTopY + 0.1, -halfL + 0.36);
    // Natural slightly angled tilt resting against carved headboard
    pillow.rotation.x = 0.24;
    pillow.rotation.y = idx === 0 ? 0.06 : -0.05;
    group.add(pillow);
  });

  if (width >= 1.75) {
    const bolsterMat = createWrinkledBlanketMaterial(variant);
    const bolster = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.095, 0.62, 12),
      bolsterMat,
    );
    bolster.rotation.z = Math.PI / 2;
    bolster.position.set(0, mattressTopY + 0.09, -halfL + 0.62);
    bolster.rotation.y = 0.08;
    group.add(bolster);
  }

  // 6. Slightly Wrinkled Draped Blanket across the lower half of the bed
  const blanketDepth = mattressL * 0.46;
  const blanket = createWrinkledBlanketMesh(mattressW, blanketDepth, variant);
  blanket.position.set(0, mattressTopY + 0.01, halfL - blanketDepth * 0.5 - 0.14);
  group.add(blanket);

  // 7. Optional Ornate Four-Poster Canopy, Tattered Crimson Drapes & Dried Garlands
  if (withCanopy) {
    const canopyY = postHeight - 0.06;
    const canopyTop = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.08, 0.11, length + 0.08),
      teakMat,
    );
    canopyTop.position.set(0, canopyY, 0);
    group.add(canopyTop);

    const drapeMat =
      materials.curtainMat ??
      new THREE.MeshStandardMaterial({
        color: 0x5c0e18,
        roughness: 0.9,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.88,
      });

    // Tattered royal valance pelmet strips around all 4 canopy edges
    const frontVal = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.34), drapeMat);
    frontVal.position.set(0, canopyY - 0.2, halfL);
    const backVal = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.34), drapeMat);
    backVal.position.set(0, canopyY - 0.2, -halfL);
    const leftVal = new THREE.Mesh(new THREE.PlaneGeometry(length, 0.34), drapeMat);
    leftVal.rotation.y = Math.PI / 2;
    leftVal.position.set(-halfW, canopyY - 0.2, 0);
    const rightVal = new THREE.Mesh(new THREE.PlaneGeometry(length, 0.34), drapeMat);
    rightVal.rotation.y = Math.PI / 2;
    rightVal.position.set(halfW, canopyY - 0.2, 0);
    group.add(frontVal, backVal, leftVal, rightVal);

    // Gathered corner silk curtains tied back around the 4 tall posts
    const cornerDrapeGeo = new THREE.BoxGeometry(0.22, postHeight - railY - 0.18, 0.22);
    for (const [px, pz] of postCoords) {
      const cDrape = new THREE.Mesh(cornerDrapeGeo, drapeMat);
      cDrape.position.set(
        px * 0.96,
        railY + (postHeight - railY) * 0.5 - 0.06,
        pz * 0.96,
      );
      group.add(cDrape);
    }

    // Dried marigold/rose wedding garlands hanging across front & head canopy rails
    if (withGarlands) {
      const flowerMat = new THREE.MeshStandardMaterial({
        color: 0xb64b18,
        roughness: 0.88,
      });
      const beadGeo = new THREE.SphereGeometry(0.044, 6, 6);
      for (const gz of [-halfL + 0.04, halfL - 0.04]) {
        for (let gi = 0; gi < 11; gi++) {
          const t = gi / 10;
          const gx = (t - 0.5) * (width - 0.24);
          const sag = Math.sin(t * Math.PI) * 0.28;
          const bead = new THREE.Mesh(beadGeo, flowerMat);
          bead.position.set(gx, canopyY - 0.16 - sag, gz);
          group.add(bead);
        }
      }
    }
  }

  return group;
}

// ---------------------------------------------------------------------------
// Vintage Rugs, Wall Tapestries, Side Tables, Brass Vases, Fallen Chairs, Trunks
// ---------------------------------------------------------------------------

function createVintageRugMaterial(variant: VintageRugVariant): THREE.MeshStandardMaterial {
  const existing = rugMaterialCache.get(variant);
  if (existing) return existing;

  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const pal =
    variant === 'darbar_crimson'
      ? { bg: '#481319', border: '#24080b', gold: '#a57c3a', inner: '#682026' }
      : variant === 'indigo_medallion'
        ? { bg: '#1a2335', border: '#0f1522', gold: '#9d7c46', inner: '#33405c' }
        : { bg: '#4e3521', border: '#2a1a0e', gold: '#a67b3e', inner: '#6b472b' };

  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, w, h);

  // Double border bands
  ctx.strokeStyle = pal.border;
  ctx.lineWidth = 22;
  ctx.strokeRect(11, 11, w - 22, h - 22);
  ctx.strokeStyle = pal.gold;
  ctx.lineWidth = 3;
  ctx.strokeRect(26, 26, w - 52, h - 52);
  ctx.strokeRect(36, 36, w - 72, h - 72);

  // Central Persian/Rajasthani diamond medallion
  ctx.fillStyle = pal.inner;
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 48);
  ctx.lineTo(w * 0.68, h * 0.5);
  ctx.lineTo(w * 0.5, h - 48);
  ctx.lineTo(w * 0.32, h * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = pal.gold;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Secondary flanking diamond motifs for runners
  for (const cx of [w * 0.2, w * 0.8]) {
    ctx.fillStyle = pal.inner;
    ctx.beginPath();
    ctx.moveTo(cx, h * 0.28);
    ctx.lineTo(cx + 34, h * 0.5);
    ctx.lineTo(cx, h * 0.72);
    ctx.lineTo(cx - 34, h * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = pal.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Aged dust patches & threadbare wear
  for (let i = 0; i < 20; i++) {
    const dx = (i * 73 + 21) % w;
    const dy = (i * 59 + 17) % h;
    const dr = 18 + (i % 4) * 14;
    const g = ctx.createRadialGradient(dx, dy, 2, dx, dy, dr);
    g.addColorStop(0, i % 2 === 0 ? 'rgba(18, 13, 10, 0.35)' : 'rgba(120, 102, 82, 0.16)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(dx, dy, dr, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    bumpMap: tex,
    bumpScale: 0.015,
    roughness: 0.94,
    metalness: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  rugMaterialCache.set(variant, mat);
  return mat;
}

function createWallTapestryMaterial(
  variant: WallTapestryVariant,
): THREE.MeshStandardMaterial {
  const existing = tapestryMaterialCache.get(variant);
  if (existing) return existing;

  const w = 256;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const pal =
    variant === 'royal_crest'
      ? { bg: '#411017', trim: '#a67f3c', motif: '#6b1c25' }
      : variant === 'dancer_arch'
        ? { bg: '#1e2538', trim: '#a68346', motif: '#364461' }
        : { bg: '#382719', trim: '#a47d3d', motif: '#5d3e24' };

  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, w, h);

  // Outer woven border
  ctx.strokeStyle = pal.trim;
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, w - 28, h - 28);
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, w - 48, h - 48);

  // Rajasthani cusped arch silhouette inside tapestry
  ctx.fillStyle = pal.motif;
  ctx.beginPath();
  ctx.moveTo(42, h - 42);
  ctx.lineTo(42, 132);
  ctx.quadraticCurveTo(48, 72, w * 0.5, 46);
  ctx.quadraticCurveTo(w - 48, 72, w - 42, 132);
  ctx.lineTo(w - 42, h - 42);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = pal.trim;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Central sun/lotus royal emblem
  ctx.strokeStyle = pal.trim;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.48, 42, 0, Math.PI * 2);
  ctx.stroke();
  for (let r = 0; r < 12; r++) {
    const a = (r / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.5 + Math.cos(a) * 18, h * 0.48 + Math.sin(a) * 18);
    ctx.lineTo(w * 0.5 + Math.cos(a) * 52, h * 0.48 + Math.sin(a) * 52);
    ctx.stroke();
  }
  ctx.fillStyle = pal.trim;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.48, 12, 0, Math.PI * 2);
  ctx.fill();

  // Subtle vertical cloth fold shading + aged soot at bottom edge
  for (let x = 0; x < w; x += 32) {
    const fg = ctx.createLinearGradient(x, 0, x + 32, 0);
    fg.addColorStop(0, 'rgba(0,0,0,0.18)');
    fg.addColorStop(0.5, 'rgba(255,245,220,0.04)');
    fg.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = fg;
    ctx.fillRect(x, 0, 32, h);
  }
  const bottomGrime = ctx.createLinearGradient(0, h * 0.65, 0, h);
  bottomGrime.addColorStop(0, 'rgba(8,6,5,0)');
  bottomGrime.addColorStop(1, 'rgba(8,6,5,0.52)');
  ctx.fillStyle = bottomGrime;
  ctx.fillRect(0, h * 0.65, w, h * 0.35);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.92,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  tapestryMaterialCache.set(variant, mat);
  return mat;
}

/**
 * Populates empty 2nd/3rd-floor corridors and bare rooms across GF, 2F & 3F with
 * vintage rugs, wooden side tables, antique LatheGeometry brass vases, wall tapestries,
 * fallen wooden chairs, and old iron-bound trunks while strictly keeping all doorways,
 * staircases, trapped friends, relics, and hiding spots unobstructed.
 */
export function buildCorridorAndBareRoomHorrorProps(
  ctx: CorridorHorrorPropsContext,
): void {
  const { root, materials } = ctx;
  const decorGroup = new THREE.Group();
  decorGroup.name = 'CorridorAndBareRoomHorrorProps';
  root.add(decorGroup);

  const teakMat = createDarkCarvedTeakMaterial();
  const brassMat = createAntiquePolishedBrassMaterial();
  const ironMat = materials.ironMat;

  // Protected world-space exclusion zones [x, y, z, radius]
  // Covers trapped friends, hiding spots, stair landings, and key relic pedestals
  const protectedZones: Array<[number, number, number, number]> = [
    // Trapped friends' corner iron-bar jail cells
    [20.55, 5.0, -29.05, 2.75], // Kabir's Jail Cell (2F-3 SW corner)
    [-20.55, 10.0, -44.45, 2.75], // Riya's Jail Cell (3F-3 NE corner)
    // Named Jail Key clear spots
    [-24.8, 0.0, -34.2, 1.8], // Kabir's Jail Key (G5 Mehmaan Baithak)
    [-25.5, 5.0, -16.2, 1.8], // Riya's Jail Key (2F-6 Royal Dining Room)
    // Hiding spots (GF)
    [29.6, 0.0, -36.75, 2.5], // G6 trunk
    [30.8, 0.0, -18.0, 2.4], // G4 curtain
    [30.8, 0.0, 5.2, 2.4], // G3 almirah
    [-30.8, 0.0, -37.5, 2.4], // G5 alcove
    // Hiding spots (2F)
    [29.2, 5.0, 4.8, 2.6], // 2F-1 palki
    [-30.85, 5.0, 4.6, 2.6], // 2F-2 four-poster bed
    [29.6, 5.0, -37.5, 2.5], // 2F-3 sandook
    [-30.8, 5.0, -36.75, 2.5], // 2F-4 jharokha partition
    [30.8, 5.0, -18.0, 2.4], // 2F-5 curtain
    [-30.8, 5.0, -18.0, 2.4], // 2F-6 alcove
    [-14.6, 5.0, 8.2, 2.5], // 2F-7 alcove
    [14.6, 5.0, 8.2, 2.4], // 2F-8 portrait alcove
    // Hiding spots (3F)
    [-30.8, 10.0, 4.8, 2.4], // 3F-1 bookcase
    [30.8, 10.0, 4.8, 2.4], // 3F-2 mirror alcove
    [-29.6, 10.0, -36.75, 2.5], // 3F-3 attic trunk
    [30.8, 10.0, -36.75, 2.5], // 3F-4 pavilion
    [-30.8, 10.0, -18.0, 2.4], // 3F-5 curtain
    [29.6, 10.0, -18.0, 2.4], // 3F-6 toy chest
    [-14.6, 10.0, 8.2, 2.4], // 3F-7 watchtower
    [14.6, 10.0, 8.2, 2.4], // 3F-8 watchtower
    // Key Doors & Stair Landings (2F & 3F)
    [-19.0, 5.0, 0.75, 2.2],
    [-19.0, 5.0, -18.0, 2.2],
    [-19.0, 5.0, -36.75, 2.2],
    [19.0, 5.0, 0.75, 2.2],
    [19.0, 5.0, -18.0, 2.2],
    [19.0, 5.0, -36.75, 2.2],
    [-15.2, 5.0, -29.0, 2.6], // 2F West split stair arrival
    [15.2, 5.0, -29.0, 2.6], // 2F East split stair arrival
    [0.0, 5.0, -34.5, 3.4], // 2F->3F stair foot
    [-19.0, 10.0, 0.75, 2.2],
    [-19.0, 10.0, -18.0, 2.2],
    [-19.0, 10.0, -36.75, 2.2],
    [19.0, 10.0, 0.75, 2.2],
    [19.0, 10.0, -18.0, 2.2],
    [19.0, 10.0, -36.75, 2.2],
    [0.0, 10.0, -42.5, 3.4], // 3F stair arrival
  ];

  const isSpotSafe = (x: number, y: number, z: number): boolean => {
    for (const [px, py, pz, pr] of protectedZones) {
      if (Math.abs(y - py) > 2.2) continue;
      if (Math.hypot(x - px, z - pz) < pr) return false;
    }
    return true;
  };

  // Shared LatheGeometry antique Indian brass vases (Surahi tall & Kalash wide)
  const tallVasePoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.095, 0.0),
    new THREE.Vector2(0.08, 0.05),
    new THREE.Vector2(0.145, 0.16),
    new THREE.Vector2(0.15, 0.28),
    new THREE.Vector2(0.095, 0.39),
    new THREE.Vector2(0.052, 0.48),
    new THREE.Vector2(0.055, 0.56),
    new THREE.Vector2(0.092, 0.61),
    new THREE.Vector2(0.075, 0.62),
  ];
  const tallBrassVaseGeo = new THREE.LatheGeometry(tallVasePoints, 16);

  const wideUrnPoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.12, 0.0),
    new THREE.Vector2(0.105, 0.06),
    new THREE.Vector2(0.195, 0.19),
    new THREE.Vector2(0.205, 0.32),
    new THREE.Vector2(0.135, 0.43),
    new THREE.Vector2(0.155, 0.49),
    new THREE.Vector2(0.135, 0.5),
  ];
  const wideBrassVaseGeo = new THREE.LatheGeometry(wideUrnPoints, 16);

  const addVintageRug = (
    x: number,
    floorY: number,
    z: number,
    width: number,
    length: number,
    rotY: number,
    variant: VintageRugVariant,
  ) => {
    const rug = new THREE.Mesh(
      new THREE.PlaneGeometry(width, length),
      createVintageRugMaterial(variant),
    );
    rug.rotation.x = -Math.PI / 2;
    rug.rotation.z = rotY;
    rug.position.set(x, floorY + 0.024, z);
    rug.receiveShadow = true;
    decorGroup.add(rug);
  };

  const addSideTableWithBrassVase = (
    x: number,
    floorY: number,
    z: number,
    rotY: number,
    vaseType: 'tall' | 'wide' = 'tall',
  ) => {
    if (!isSpotSafe(x, floorY, z)) return;
    const g = new THREE.Group();
    g.position.set(x, floorY, z);
    g.rotation.y = rotY;

    const top = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.06, 0.52), teakMat);
    top.position.y = 0.78;
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.14, 0.44), materials.woodMat);
    apron.position.y = 0.68;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), brassMat);
    knob.position.set(0, 0.68, 0.235);
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.04, 0.42), materials.woodMat);
    shelf.position.y = 0.22;
    g.add(top, apron, knob, shelf);

    const legGeo = new THREE.CylinderGeometry(0.026, 0.02, 0.76, 8);
    for (const [lx, lz] of [
      [-0.36, -0.2],
      [0.36, -0.2],
      [-0.36, 0.2],
      [0.36, 0.2],
    ]) {
      const leg = new THREE.Mesh(legGeo, teakMat);
      leg.position.set(lx, 0.38, lz);
      g.add(leg);
    }

    // Antique fluted brass vase resting atop the table
    const vase = new THREE.Mesh(
      vaseType === 'tall' ? tallBrassVaseGeo : wideBrassVaseGeo,
      brassMat,
    );
    vase.position.set(vaseType === 'tall' ? -0.06 : 0.04, 0.81, 0);
    vase.castShadow = true;
    g.add(vase);

    // Small companion tarnished brass katori / cup beside vase
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.045, 0.08, 10),
      brassMat,
    );
    cup.position.set(0.24, 0.85, 0.05);
    g.add(cup);

    decorGroup.add(g);
  };

  const addFloorBrassVase = (
    x: number,
    floorY: number,
    z: number,
    scale = 1.35,
  ) => {
    if (!isSpotSafe(x, floorY, z)) return;
    const vase = new THREE.Mesh(wideBrassVaseGeo, brassMat);
    vase.position.set(x, floorY, z);
    vase.scale.setScalar(scale);
    vase.castShadow = true;
    vase.receiveShadow = true;
    decorGroup.add(vase);
  };

  const addWallTapestry = (
    x: number,
    floorY: number,
    z: number,
    rotY: number,
    width: number,
    height: number,
    variant: WallTapestryVariant,
  ) => {
    const g = new THREE.Group();
    // Hang high along the wall (center ~2.45m above floor)
    g.position.set(x, floorY + 2.45, z);
    g.rotation.y = rotY;

    // Brass wall hanging rod & finials
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, width + 0.24, 8),
      brassMat,
    );
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, height * 0.5 + 0.04, 0.06);
    g.add(rod);

    for (const sx of [-(width * 0.5 + 0.14), width * 0.5 + 0.14]) {
      const fin = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), brassMat);
      fin.position.set(sx, height * 0.5 + 0.04, 0.06);
      g.add(fin);
    }

    // Subdivided slightly waved hanging tapestry fabric (offset +0.065m from wall — zero Z-fighting)
    const clothGeo = new THREE.PlaneGeometry(width, height, 8, 6);
    const pos = clothGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      const wave = Math.sin(px * 4.5) * 0.018 * (0.5 - py / height);
      pos.setZ(i, 0.065 + wave);
    }
    clothGeo.computeVertexNormals();
    const cloth = new THREE.Mesh(clothGeo, createWallTapestryMaterial(variant));
    cloth.castShadow = true;
    g.add(cloth);

    // Antique gold lower fringe bar
    const fringe = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.04, 0.045, 0.02),
      brassMat,
    );
    fringe.position.set(0, -height * 0.5 - 0.02, 0.065);
    g.add(fringe);

    decorGroup.add(g);
  };

  const addFallenWoodenChair = (
    x: number,
    floorY: number,
    z: number,
    rotY: number,
    tipSide: 'side' | 'back' = 'side',
  ) => {
    if (!isSpotSafe(x, floorY, z)) return;
    const chair = new THREE.Group();

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.055, 0.46), teakMat);
    seat.position.y = 0.46;
    chair.add(seat);

    const legGeo = new THREE.CylinderGeometry(0.022, 0.018, 0.46, 7);
    for (const [lx, lz] of [
      [-0.2, -0.19],
      [0.2, -0.19],
      [-0.2, 0.19],
      [0.2, 0.19],
    ]) {
      const leg = new THREE.Mesh(legGeo, teakMat);
      leg.position.set(lx, 0.23, lz);
      chair.add(leg);
    }

    // Backrest stiles, spindles & arched top rail
    for (const bx of [-0.2, 0.2]) {
      const stile = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.56, 7), teakMat);
      stile.position.set(bx, 0.74, -0.2);
      chair.add(stile);
    }
    for (const sx of [-0.1, 0, 0.1]) {
      const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.48, 6), materials.woodMat);
      spindle.position.set(sx, 0.72, -0.2);
      chair.add(spindle);
    }
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.045), teakMat);
    topRail.position.set(0, 1.01, -0.2);
    chair.add(topRail);

    // Tip realistically onto its side or backwards on the floor
    const wrapper = new THREE.Group();
    wrapper.position.set(x, floorY, z);
    wrapper.rotation.y = rotY;
    if (tipSide === 'side') {
      chair.rotation.z = Math.PI / 2 - 0.08;
      chair.position.set(0.24, 0.25, 0);
    } else {
      chair.rotation.x = -Math.PI / 2 + 0.14;
      chair.position.set(0, 0.24, -0.15);
    }
    wrapper.add(chair);
    decorGroup.add(wrapper);
  };

  const addOldWoodenTrunk = (
    x: number,
    floorY: number,
    z: number,
    rotY: number,
  ) => {
    if (!isSpotSafe(x, floorY, z)) return;
    const g = new THREE.Group();
    g.position.set(x, floorY, z);
    g.rotation.y = rotY;

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.52, 0.58), teakMat);
    body.position.y = 0.26;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    // Slightly arched wooden chest lid
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.11, 0.62), materials.woodMat);
    lid.position.y = 0.56;
    lid.castShadow = true;
    g.add(lid);

    // Riveted wrought-iron straps across body & lid
    for (const sx of [-0.36, 0.36]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.64, 0.635), ironMat);
      strap.position.set(sx, 0.32, 0);
      g.add(strap);
    }
    // Central antique brass hasp lock plate
    const lockPlate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.04), brassMat);
    lockPlate.position.set(0, 0.49, 0.3);
    g.add(lockPlate);

    decorGroup.add(g);
  };

  // =========================================================================
  // 1. SECOND FLOOR CORRIDORS & BALCONIES (y = 5.0)
  //    West x in [-19, -15.2], East x in [15.2, 19], South z in [3.2, 5.8], North z in [-46, -31.3]
  // =========================================================================
  // Vintage corridor runner rugs
  addVintageRug(-17.1, 5.0, -7.8, 1.9, 10.5, 0, 'darbar_crimson');
  addVintageRug(-17.1, 5.0, -24.5, 1.9, 7.6, 0, 'indigo_medallion');
  addVintageRug(-17.1, 5.0, -41.5, 1.9, 7.2, 0, 'ochre_runner');

  addVintageRug(17.1, 5.0, -7.8, 1.9, 10.5, 0, 'darbar_crimson');
  addVintageRug(17.1, 5.0, -24.5, 1.9, 7.6, 0, 'indigo_medallion');
  addVintageRug(17.1, 5.0, -41.5, 1.9, 7.2, 0, 'ochre_runner');

  addVintageRug(-7.5, 5.0, 4.5, 11.2, 1.65, 0, 'darbar_crimson');
  addVintageRug(7.5, 5.0, 4.5, 11.2, 1.65, 0, 'darbar_crimson');

  // Expansive 2F North Gallery rugs (flanking 2F->3F stairs at x = -3..3)
  addVintageRug(-9.2, 5.0, -39.2, 8.8, 4.4, 0, 'indigo_medallion');
  addVintageRug(9.2, 5.0, -39.2, 8.8, 4.4, 0, 'indigo_medallion');

  // 2F Wall Tapestries along empty corridor walls
  addWallTapestry(-18.88, 5.0, -6.2, Math.PI / 2, 1.55, 2.35, 'royal_crest');
  addWallTapestry(-18.88, 5.0, -12.2, Math.PI / 2, 1.55, 2.35, 'peacock_loom');
  addWallTapestry(-18.88, 5.0, -24.4, Math.PI / 2, 1.55, 2.35, 'dancer_arch');
  addWallTapestry(-18.88, 5.0, -42.6, Math.PI / 2, 1.55, 2.35, 'royal_crest');

  addWallTapestry(18.88, 5.0, -6.2, -Math.PI / 2, 1.55, 2.35, 'royal_crest');
  addWallTapestry(18.88, 5.0, -12.2, -Math.PI / 2, 1.55, 2.35, 'dancer_arch');
  addWallTapestry(18.88, 5.0, -24.4, -Math.PI / 2, 1.55, 2.35, 'peacock_loom');
  addWallTapestry(18.88, 5.0, -42.6, -Math.PI / 2, 1.55, 2.35, 'royal_crest');

  addWallTapestry(-11.5, 5.0, -45.88, 0, 1.9, 2.55, 'royal_crest');
  addWallTapestry(-6.4, 5.0, -45.88, 0, 1.8, 2.5, 'dancer_arch');
  addWallTapestry(6.4, 5.0, -45.88, 0, 1.8, 2.5, 'peacock_loom');
  addWallTapestry(11.5, 5.0, -45.88, 0, 1.9, 2.55, 'royal_crest');

  // 2F Corridor Wall-Flush Side Tables with Antique Brass Vases
  addSideTableWithBrassVase(-18.55, 5.0, -6.2, Math.PI / 2, 'tall');
  addSideTableWithBrassVase(-18.55, 5.0, -24.4, Math.PI / 2, 'wide');
  addSideTableWithBrassVase(18.55, 5.0, -6.2, -Math.PI / 2, 'tall');
  addSideTableWithBrassVase(18.55, 5.0, -24.4, -Math.PI / 2, 'wide');
  addSideTableWithBrassVase(-11.5, 5.0, -45.55, 0, 'tall');
  addSideTableWithBrassVase(11.5, 5.0, -45.55, 0, 'wide');
  addSideTableWithBrassVase(-2.2, 5.0, 5.45, Math.PI, 'tall');
  addSideTableWithBrassVase(2.2, 5.0, 5.45, Math.PI, 'tall');

  // 2F Corridor Old Trunks & Fallen Chairs in safe recessed corners
  addOldWoodenTrunk(-18.55, 5.0, -43.2, Math.PI / 2);
  addOldWoodenTrunk(18.55, 5.0, -43.2, -Math.PI / 2);
  addOldWoodenTrunk(-14.2, 5.0, -45.55, 0);
  addOldWoodenTrunk(14.2, 5.0, -45.55, 0);
  addFallenWoodenChair(-18.1, 5.0, -12.6, 0.7, 'side');
  addFallenWoodenChair(18.1, 5.0, -12.0, -0.5, 'back');
  addFallenWoodenChair(-6.4, 5.0, -44.8, 1.1, 'side');
  addFallenWoodenChair(6.6, 5.0, -44.6, -0.85, 'back');

  // =========================================================================
  // 2. THIRD FLOOR CORRIDORS & BALCONIES (y = 10.0)
  // =========================================================================
  addVintageRug(-17.1, 10.0, -7.8, 1.9, 10.5, 0, 'indigo_medallion');
  addVintageRug(-17.1, 10.0, -26.5, 1.9, 11.2, 0, 'ochre_runner');
  addVintageRug(-17.1, 10.0, -41.5, 1.9, 6.8, 0, 'darbar_crimson');

  addVintageRug(17.1, 10.0, -7.8, 1.9, 10.5, 0, 'indigo_medallion');
  addVintageRug(17.1, 10.0, -26.5, 1.9, 11.2, 0, 'ochre_runner');
  addVintageRug(17.1, 10.0, -41.5, 1.9, 6.8, 0, 'darbar_crimson');

  addVintageRug(-7.5, 10.0, 4.5, 11.2, 1.65, 0, 'ochre_runner');
  addVintageRug(7.5, 10.0, 4.5, 11.2, 1.65, 0, 'ochre_runner');
  addVintageRug(0.0, 10.0, -31.8, 16.0, 2.4, 0, 'darbar_crimson');
  addVintageRug(-9.2, 10.0, -39.5, 7.6, 3.8, 0, 'ochre_runner');
  addVintageRug(9.2, 10.0, -39.5, 7.6, 3.8, 0, 'ochre_runner');

  // 3F Corridor Wall Tapestries
  addWallTapestry(-18.88, 10.0, -6.2, Math.PI / 2, 1.55, 2.35, 'dancer_arch');
  addWallTapestry(-18.88, 10.0, -12.4, Math.PI / 2, 1.55, 2.35, 'royal_crest');
  addWallTapestry(-18.88, 10.0, -26.5, Math.PI / 2, 1.55, 2.35, 'peacock_loom');
  addWallTapestry(-18.88, 10.0, -42.5, Math.PI / 2, 1.55, 2.35, 'dancer_arch');

  addWallTapestry(18.88, 10.0, -6.2, -Math.PI / 2, 1.55, 2.35, 'peacock_loom');
  addWallTapestry(18.88, 10.0, -12.4, -Math.PI / 2, 1.55, 2.35, 'royal_crest');
  addWallTapestry(18.88, 10.0, -26.5, -Math.PI / 2, 1.55, 2.35, 'dancer_arch');
  addWallTapestry(18.88, 10.0, -42.5, -Math.PI / 2, 1.55, 2.35, 'peacock_loom');

  addWallTapestry(-11.4, 10.0, -45.88, 0, 1.85, 2.5, 'peacock_loom');
  addWallTapestry(11.4, 10.0, -45.88, 0, 1.85, 2.5, 'dancer_arch');

  // 3F Corridor Side Tables + Brass Vases + Trunks + Fallen Chairs
  addSideTableWithBrassVase(-18.55, 10.0, -6.2, Math.PI / 2, 'wide');
  addSideTableWithBrassVase(-18.55, 10.0, -26.5, Math.PI / 2, 'tall');
  addSideTableWithBrassVase(18.55, 10.0, -6.2, -Math.PI / 2, 'wide');
  addSideTableWithBrassVase(18.55, 10.0, -26.5, -Math.PI / 2, 'tall');
  addSideTableWithBrassVase(-11.4, 10.0, -45.55, 0, 'wide');
  addSideTableWithBrassVase(11.4, 10.0, -45.55, 0, 'tall');
  addSideTableWithBrassVase(-2.2, 10.0, 5.45, Math.PI, 'wide');
  addSideTableWithBrassVase(2.2, 10.0, 5.45, Math.PI, 'wide');

  addOldWoodenTrunk(-18.55, 10.0, -43.2, Math.PI / 2);
  addOldWoodenTrunk(18.55, 10.0, -43.2, -Math.PI / 2);
  addOldWoodenTrunk(-14.0, 10.0, -45.55, 0);
  addOldWoodenTrunk(14.0, 10.0, -45.55, 0);
  addFallenWoodenChair(-18.1, 10.0, -12.6, -0.65, 'back');
  addFallenWoodenChair(18.1, 10.0, -12.8, 0.8, 'side');
  addFallenWoodenChair(-8.2, 10.0, -44.8, 0.4, 'side');
  addFallenWoodenChair(8.2, 10.0, -44.8, -1.1, 'back');

  // =========================================================================
  // 3. BARE & SPARSE ROOMS ACROSS GF, 2F & 3F
  // =========================================================================

  // --- GF-G4: Prachin Pooja Ghar (x: 19..32, z: -27.5..-8.5, y: 0) ---
  addVintageRug(25.0, 0.0, -18.0, 6.2, 8.8, 0, 'darbar_crimson');
  addSideTableWithBrassVase(31.4, 0.0, -11.2, -Math.PI / 2, 'tall');
  addSideTableWithBrassVase(31.4, 0.0, -24.8, -Math.PI / 2, 'wide');
  addWallTapestry(31.88, 0.0, -11.2, -Math.PI / 2, 1.6, 2.4, 'royal_crest');
  addWallTapestry(31.88, 0.0, -24.8, -Math.PI / 2, 1.6, 2.4, 'peacock_loom');
  addOldWoodenTrunk(21.4, 0.0, -26.8, 0);
  addFloorBrassVase(20.2, 0.0, -10.0, 1.45);

  // --- GF-G6: Sevak Kaksh (x: 19..32, z: -46..-27.5, y: 0) ---
  addVintageRug(25.2, 0.0, -37.2, 5.4, 7.6, 0, 'ochre_runner');
  addSideTableWithBrassVase(24.0, 0.0, -45.5, 0, 'wide');
  addWallTapestry(25.8, 0.0, -45.88, 0, 1.7, 2.3, 'peacock_loom');
  addFallenWoodenChair(22.2, 0.0, -31.8, 0.9, 'side');
  addOldWoodenTrunk(31.4, 0.0, -44.6, -Math.PI / 2);

  // --- 2F-1: Rukmini's Bridal Room (x: 19..32, z: -8.5..10, y: 5) ---
  // Bed sits in SW corner ~(21.2, 5, 8.8); Palki at (29.2, 5, 4.8)
  addVintageRug(25.2, 5.0, 1.2, 6.2, 8.2, 0, 'darbar_crimson');
  addSideTableWithBrassVase(23.6, 5.0, 9.5, Math.PI, 'tall');
  addWallTapestry(31.88, 5.0, -4.2, -Math.PI / 2, 1.8, 2.5, 'royal_crest');
  addWallTapestry(26.5, 5.0, 9.88, Math.PI, 1.8, 2.5, 'dancer_arch');
  addOldWoodenTrunk(31.35, 5.0, -6.4, -Math.PI / 2);
  addFallenWoodenChair(29.8, 5.0, -2.5, -0.6, 'side');

  // --- 2F-2: Thakur Saheb's Master Bedroom (x: -32..-19, z: -8.5..10, y: 5) ---
  // Four-poster bed now sits flush against West wall at (-30.85, 5, 4.6)
  addVintageRug(-25.2, 5.0, 1.2, 6.4, 8.4, 0, 'darbar_crimson');
  addSideTableWithBrassVase(-31.4, 5.0, 7.6, Math.PI / 2, 'tall');
  addSideTableWithBrassVase(-31.4, 5.0, 1.6, Math.PI / 2, 'wide');
  addWallTapestry(-31.88, 5.0, -4.2, Math.PI / 2, 1.85, 2.5, 'royal_crest');
  addWallTapestry(-25.5, 5.0, 9.88, Math.PI, 1.9, 2.5, 'peacock_loom');
  addOldWoodenTrunk(-21.2, 5.0, 9.4, Math.PI);
  addFallenWoodenChair(-22.2, 5.0, -5.8, 0.75, 'back');

  // --- 2F-3: Guest Suite 1 / Mehmaan Khana (x: 19..32, z: -46..-27.5, y: 5) ---
  // Bed sits in NW corner ~(21.2, 5, -44.8); Kabir at (24, 5, -36.75); Sandook at (29.6, 5, -37.5)
  addVintageRug(25.2, 5.0, -37.0, 6.2, 8.6, 0, 'indigo_medallion');
  addSideTableWithBrassVase(23.8, 5.0, -45.5, 0, 'tall');
  addWallTapestry(27.5, 5.0, -45.88, 0, 1.8, 2.45, 'dancer_arch');
  addWallTapestry(31.88, 5.0, -31.0, -Math.PI / 2, 1.7, 2.4, 'peacock_loom');
  addOldWoodenTrunk(31.35, 5.0, -44.2, -Math.PI / 2);
  addFallenWoodenChair(30.0, 5.0, -30.5, -0.9, 'side');

  // --- 2F-4: Sangeet Hall (x: -32..-19, z: -46..-27.5, y: 5) ---
  addVintageRug(-25.2, 5.0, -36.75, 7.6, 10.4, 0, 'darbar_crimson');
  addSideTableWithBrassVase(-31.4, 5.0, -43.5, Math.PI / 2, 'tall');
  addSideTableWithBrassVase(-31.4, 5.0, -30.2, Math.PI / 2, 'wide');
  addSideTableWithBrassVase(-21.6, 5.0, -45.5, 0, 'wide');
  addWallTapestry(-25.5, 5.0, -45.88, 0, 2.1, 2.6, 'dancer_arch');
  addWallTapestry(-31.88, 5.0, -43.5, Math.PI / 2, 1.75, 2.45, 'royal_crest');
  addWallTapestry(-31.88, 5.0, -30.2, Math.PI / 2, 1.75, 2.45, 'peacock_loom');
  addOldWoodenTrunk(-29.8, 5.0, -45.4, 0);
  addFallenWoodenChair(-21.2, 5.0, -30.4, 0.65, 'side');
  addFallenWoodenChair(-28.4, 5.0, -42.4, -0.8, 'back');
  addFloorBrassVase(-20.2, 5.0, -44.8, 1.45);

  // --- 2F-5: Rani's Shringar Kaksh (x: 19..32, z: -27.5..-8.5, y: 5) ---
  addWallTapestry(31.88, 5.0, -12.0, -Math.PI / 2, 1.7, 2.4, 'dancer_arch');
  addWallTapestry(31.88, 5.0, -24.2, -Math.PI / 2, 1.7, 2.4, 'royal_crest');
  addSideTableWithBrassVase(31.4, 5.0, -11.5, -Math.PI / 2, 'tall');
  addOldWoodenTrunk(21.4, 5.0, -26.8, 0);
  addFallenWoodenChair(22.0, 5.0, -11.6, 0.5, 'side');

  // --- 2F-6: Royal Dining Room (x: -32..-19, z: -27.5..-8.5, y: 5) ---
  addWallTapestry(-31.88, 5.0, -12.0, Math.PI / 2, 1.75, 2.45, 'royal_crest');
  addWallTapestry(-31.88, 5.0, -24.2, Math.PI / 2, 1.75, 2.45, 'peacock_loom');
  addSideTableWithBrassVase(-31.4, 5.0, -11.5, Math.PI / 2, 'wide');
  addOldWoodenTrunk(-21.4, 5.0, -26.8, 0);
  addFallenWoodenChair(-21.4, 5.0, -11.4, -0.7, 'back');

  // --- 2F-7: Guest Suite 2 (x: -19..0, z: 5.8..10, y: 5) ---
  addVintageRug(-9.2, 5.0, 7.9, 8.6, 2.8, 0, 'indigo_medallion');
  addSideTableWithBrassVase(-7.2, 5.0, 9.5, Math.PI, 'tall');
  addWallTapestry(-9.8, 5.0, 9.88, Math.PI, 1.8, 2.35, 'peacock_loom');
  addOldWoodenTrunk(-17.8, 5.0, 9.4, Math.PI);
  addFallenWoodenChair(-11.2, 5.0, 9.1, 0.55, 'side');

  // --- 2F-8: Ancestor Portrait Gallery (x: 0..19, z: 5.8..10, y: 5) ---
  addVintageRug(9.2, 5.0, 7.9, 13.5, 2.4, 0, 'darbar_crimson');
  addSideTableWithBrassVase(2.4, 5.0, 9.5, Math.PI, 'tall');
  addSideTableWithBrassVase(11.4, 5.0, 9.5, Math.PI, 'wide');
  addFloorBrassVase(18.0, 5.0, 9.2, 1.4);
  addFallenWoodenChair(5.6, 5.0, 9.0, -0.8, 'side');

  // --- 3F-1: Tantrik Granth Library (x: -32..-19, z: -8.5..10, y: 10) ---
  addVintageRug(-25.2, 10.0, 1.0, 6.4, 8.4, 0, 'indigo_medallion');
  addSideTableWithBrassVase(-21.6, 10.0, 9.5, Math.PI, 'tall');
  addWallTapestry(-25.5, 10.0, 9.88, Math.PI, 1.85, 2.45, 'royal_crest');
  addFallenWoodenChair(-21.4, 10.0, -5.6, 0.65, 'side');

  // --- 3F-2: Aaina Mahal (x: 19..32, z: -8.5..10, y: 10) ---
  addVintageRug(25.2, 10.0, 1.0, 7.2, 9.4, 0, 'darbar_crimson');
  addSideTableWithBrassVase(21.8, 10.0, 9.5, Math.PI, 'wide');
  addSideTableWithBrassVase(31.4, 10.0, -4.5, -Math.PI / 2, 'tall');
  addOldWoodenTrunk(21.4, 10.0, -7.8, 0);
  addFallenWoodenChair(29.2, 10.0, -3.2, -0.75, 'back');
  addFloorBrassVase(30.8, 10.0, 8.8, 1.45);

  // --- 3F-3: Attic Store 1 (x: -32..-19, z: -46..-27.5, y: 10) ---
  // Riya trapped at (-24, 10, -36.75); Attic trunk hiding at (-29.6, 10, -36.75)
  addVintageRug(-25.2, 10.0, -37.0, 6.2, 8.2, 0, 'ochre_runner');
  addWallTapestry(-25.5, 10.0, -45.88, 0, 1.8, 2.4, 'peacock_loom');
  addSideTableWithBrassVase(-21.6, 10.0, -45.5, 0, 'wide');
  addOldWoodenTrunk(-31.35, 10.0, -30.0, Math.PI / 2);
  addOldWoodenTrunk(-21.4, 10.0, -28.4, Math.PI);
  addFallenWoodenChair(-30.2, 10.0, -44.0, 0.85, 'side');
  addFallenWoodenChair(-21.2, 10.0, -31.2, -0.55, 'back');

  // --- 3F-4: Barsati Terrace Room (x: 19..32, z: -46..-27.5, y: 10) ---
  // Includes an authentic antique wooden corner bed tucked flush against the NW wall!
  addVintageRug(25.2, 10.0, -36.75, 7.0, 9.6, 0, 'indigo_medallion');
  const barsatiCornerBed = createAntiqueIndianBed({
    variant: 'guest_indigo',
    width: 1.82,
    length: 2.12,
    withCanopy: false,
    materials: {
      woodMat: materials.woodMat,
      brassMat: materials.brassMat,
      curtainMat: materials.curtainMat,
    },
  });
  barsatiCornerBed.position.set(21.2, 10.0, -44.82);
  barsatiCornerBed.rotation.y = 0; // Headboard flush against North wall z = -46
  decorGroup.add(barsatiCornerBed);
  addSideTableWithBrassVase(23.5, 10.0, -45.5, 0, 'tall');
  addSideTableWithBrassVase(31.4, 10.0, -30.5, -Math.PI / 2, 'wide');
  addWallTapestry(27.6, 10.0, -45.88, 0, 1.9, 2.5, 'dancer_arch');
  addWallTapestry(31.88, 10.0, -43.0, -Math.PI / 2, 1.75, 2.4, 'royal_crest');
  addOldWoodenTrunk(31.35, 10.0, -44.6, -Math.PI / 2);
  addFallenWoodenChair(21.6, 10.0, -30.2, 0.7, 'side');

  // --- 3F-5 (Jyotish), 3F-6 (Doll Room), 3F-7 & 3F-8 (Watchtowers) ---
  addVintageRug(-25.2, 10.0, -18.0, 6.2, 8.2, 0, 'indigo_medallion');
  addWallTapestry(-31.88, 10.0, -12.0, Math.PI / 2, 1.7, 2.4, 'dancer_arch');
  addSideTableWithBrassVase(-31.4, 10.0, -24.5, Math.PI / 2, 'tall');
  addFallenWoodenChair(-21.4, 10.0, -24.8, -0.6, 'side');

  addVintageRug(25.2, 10.0, -18.0, 6.0, 8.0, 0, 'ochre_runner');
  addWallTapestry(31.88, 10.0, -11.8, -Math.PI / 2, 1.7, 2.35, 'peacock_loom');
  addSideTableWithBrassVase(31.4, 10.0, -24.8, -Math.PI / 2, 'wide');
  addOldWoodenTrunk(21.4, 10.0, -26.8, 0);

  // 3F-7 & 3F-8 Front Watchtower Suites (z in [5.8, 10])
  addVintageRug(-9.2, 10.0, 7.9, 9.6, 2.4, 0, 'ochre_runner');
  addVintageRug(9.2, 10.0, 7.9, 9.6, 2.4, 0, 'ochre_runner');
  addSideTableWithBrassVase(-2.2, 10.0, 9.5, Math.PI, 'tall');
  addSideTableWithBrassVase(2.2, 10.0, 9.5, Math.PI, 'wide');
  addOldWoodenTrunk(-17.8, 10.0, 9.4, Math.PI);
  addOldWoodenTrunk(17.8, 10.0, 9.4, Math.PI);
  addFallenWoodenChair(-5.6, 10.0, 9.0, 0.85, 'back');
  addFallenWoodenChair(5.6, 10.0, 9.0, -0.75, 'side');
}
