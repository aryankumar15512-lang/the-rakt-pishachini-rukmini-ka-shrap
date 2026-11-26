import * as THREE from 'three';
import type { WallAABB } from './mansionWorld';
import {
  createAntiqueIndianBed,
  type IndianQuiltVariant,
} from './antiqueBedsAndCorridorProps';

export interface RoyalHorrorRoomPropsContext {
  root: THREE.Group;
  wallColliders: WallAABB[];
  materials: {
    carvedSandstoneMat: THREE.MeshStandardMaterial;
    brassMat: THREE.MeshStandardMaterial;
    ironMat: THREE.MeshStandardMaterial;
    woodMat: THREE.MeshStandardMaterial;
    clayMat: THREE.MeshStandardMaterial;
    curtainMat: THREE.MeshStandardMaterial;
    stoneFloorMat: THREE.MeshStandardMaterial;
  };
}

interface ProtectedPoint {
  x: number;
  y: number;
  z: number;
  radius: number;
}

/**
 * Adds a tattered crimson canopy & wilted broken flower garlands onto an existing
 * four-poster bed (used for 2F-2's under-bed hiding spot) strictly above y = 1.25m
 * so the under-bed crawl opening and exit remain 100% unobstructed.
 */
export function decorateExistingFourPosterBed(
  bedGroup: THREE.Group,
  mats: {
    crimsonCanopyMat?: THREE.Material;
    brassMat: THREE.Material;
  },
): void {
  const tatteredSilkMat =
    mats.crimsonCanopyMat ??
    new THREE.MeshStandardMaterial({
      color: 0x6b0c16,
      roughness: 0.9,
      metalness: 0.04,
      side: THREE.DoubleSide,
    });
  const saffronFlowerMat = new THREE.MeshStandardMaterial({
    color: 0xd46a14,
    roughness: 0.85,
  });
  const roseFlowerMat = new THREE.MeshStandardMaterial({
    color: 0x8e1222,
    roughness: 0.82,
  });
  const bolsterMat = new THREE.MeshStandardMaterial({
    color: 0x8c1b28,
    roughness: 0.84,
  });

  // Shared geometries for drapes and marigold/rose beads
  const drapeStripGeo = new THREE.PlaneGeometry(0.36, 1.08);
  const cornerDrapeGeo = new THREE.CylinderGeometry(0.14, 0.22, 1.18, 7, 1, true);
  const flowerBeadGeo = new THREE.SphereGeometry(0.036, 6, 5);
  void bolsterMat;

  // Sagging tattered crimson canopy valance along all 4 upper edges (y >= 1.55m)
  const frontBackX = [-0.88, -0.44, 0, 0.44, 0.88];
  frontBackX.forEach((sx, i) => {
    [-0.75, 0.75].forEach((sz, side) => {
      const strip = new THREE.Mesh(drapeStripGeo, tatteredSilkMat);
      const lenScale = 0.48 + ((i * 3 + side * 2) % 4) * 0.14;
      strip.scale.set(0.85 + (i % 2) * 0.2, lenScale, 1);
      strip.position.set(sx, 2.38 - (1.08 * lenScale) * 0.48, sz);
      strip.rotation.z = ((i % 2 === 0 ? 1 : -1) * 0.08) + (side ? 0.03 : -0.03);
      strip.rotation.x = side === 0 ? 0.06 : -0.06;
      bedGroup.add(strip);
    });
  });

  // Torn hanging corner curtains tied crookedly high on the 4 posts (bottom >= 1.28m)
  [
    [-1.02, -0.66, 0.18],
    [1.02, -0.66, -0.22],
    [-1.02, 0.66, -0.14],
    [1.02, 0.66, 0.2],
  ].forEach(([px, pz, tilt], idx) => {
    const drape = new THREE.Mesh(cornerDrapeGeo, tatteredSilkMat);
    const hScale = 0.82 + (idx % 2) * 0.14;
    drape.scale.set(1, hScale, 1);
    drape.position.set(px, 2.36 - 0.56 * hScale, pz);
    drape.rotation.z = tilt;
    drape.rotation.y = idx * 1.1;
    bedGroup.add(drape);
  });

  // Wilted broken marigold & crimson rose garland draped across the headboard top
  for (let b = 0; b < 13; b++) {
    const t = b / 12;
    const gx = THREE.MathUtils.lerp(-0.98, 0.98, t);
    // Snapped dip in the middle where garland tore
    const sag = Math.sin(t * Math.PI) * 0.32 + (b > 7 ? (b - 7) * 0.07 : 0);
    const bead = new THREE.Mesh(
      flowerBeadGeo,
      b % 3 === 0 ? roseFlowerMat : saffronFlowerMat,
    );
    bead.position.set(gx, 2.18 - sag, -0.63);
    bedGroup.add(bead);
  }

  // Brass headboard medallion
  const crest = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.025, 6, 14),
    mats.brassMat,
  );
  crest.position.set(0, 1.92, -0.63);
  bedGroup.add(crest);
}

/**
 * Decorates key Royal Indian Horror room archetypes using shared Three.js
 * geometries and materials for smooth FPS, strictly keeping a >= 2.0m walkable
 * clearance around every doorway, staircase, hiding spot, relic, and friend:
 *  - Kitchen & Anna-Kothi (G2): Clay chulha stove, stacked brass pots, wooden spice shelves.
 *  - Munim Room (G3) & Tantrik Library (3F-1): Tall wooden bookshelves, writing desks, scattered scrolls & ledgers.
 *  - Rukmini's Bridal Room (2F-1), Master Bedroom (2F-2), & Guest Suite (2F-3):
 *    Ornate carved wooden beds with tattered crimson canopies, antique dressing tables, and broken flower garlands.
 */
export function buildRoyalHorrorRoomProps(
  ctx: RoyalHorrorRoomPropsContext,
): void {
  const { root, wallColliders, materials } = ctx;
  const {
    carvedSandstoneMat,
    brassMat,
    ironMat,
    woodMat,
    clayMat,
    stoneFloorMat,
  } = materials;

  // ==========================================================================
  // PROTECTED 2.0m CLEARANCE ZONES (Doorways, Hiding Spots + Exits, Relics, Friends)
  // Every placed furniture piece is verified against this list before adding!
  // ==========================================================================
  const protectedZones: ProtectedPoint[] = [
    // G2 Kitchen & Anna-Kothi (y = 0)
    { x: -11.0, y: 0, z: -12.0, radius: 2.15 }, // door_g2_kitchen
    { x: -17.5, y: 0, z: -4.5, radius: 2.15 }, // door_g1_g2_inner
    { x: -17.5, y: 0, z: -19.5, radius: 2.15 }, // door_g2_g5_inner
    { x: -21.2, y: 0, z: -15.5, radius: 2.15 }, // hide_g2_clay_kothi
    { x: -18.8, y: 0, z: -15.5, radius: 2.15 }, // hide_g2_clay_kothi exit

    // G3 Munim Room (y = 0)
    { x: 11.0, y: 0, z: 2.75, radius: 2.15 }, // door_g3_munim
    { x: 17.5, y: 0, z: -4.5, radius: 2.15 }, // door_g3_g4_inner
    { x: 22.8, y: 0, z: 4.8, radius: 2.15 }, // hide_g3_wooden_almirah
    { x: 20.6, y: 0, z: 4.8, radius: 2.15 }, // hide_g3_wooden_almirah exit

    // 2F-1 Rukmini's Bridal Room (y = 5.0)
    { x: 11.0, y: 5.0, z: 2.75, radius: 2.15 }, // door_f2_1_bridal
    { x: 17.5, y: 5.0, z: -4.5, radius: 2.15 }, // door_f2_east_inner_1
    { x: 21.2, y: 5.0, z: 4.5, radius: 2.15 }, // hide_f2_1_royal_palki
    { x: 18.8, y: 5.0, z: 4.5, radius: 2.15 }, // hide_f2_1_royal_palki exit
    { x: 17.5, y: 5.0, z: -1.0, radius: 1.65 }, // Relic #3 pedestal

    // 2F-2 Thakur Saheb's Master Bedroom (y = 5.0)
    { x: -11.0, y: 5.0, z: 2.75, radius: 2.15 }, // door_f2_2_master_bed
    { x: -17.5, y: 5.0, z: -4.5, radius: 2.15 }, // door_f2_west_inner_1
    { x: -20.4, y: 5.0, z: 3.2, radius: 2.15 }, // hide_f2_2_four_poster_bed
    { x: -18.0, y: 5.0, z: 3.2, radius: 2.15 }, // hide_f2_2_four_poster_bed exit

    // 2F-3 Guest Suite 1 / Mehmaan Khana (y = 5.0)
    { x: 11.0, y: 5.0, z: -26.75, radius: 2.15 }, // door_f2_3_guest1
    { x: 17.5, y: 5.0, z: -19.5, radius: 2.15 }, // door_f2_east_inner_2
    { x: 21.6, y: 5.0, z: -27.5, radius: 2.15 }, // hide_f2_3_sandook_chest
    { x: 19.4, y: 5.0, z: -27.5, radius: 2.15 }, // hide_f2_3_sandook_chest exit
    { x: 17.5, y: 5.0, z: -23.0, radius: 2.15 }, // Trapped friend Kabir

    // 3F-1 Tantrik Granth Library (y = 10.0)
    { x: -11.0, y: 10.0, z: 2.75, radius: 2.15 }, // door_f3_1_library
    { x: -17.5, y: 10.0, z: -4.5, radius: 2.15 }, // door_f3_west_inner_1
    { x: -22.6, y: 10.0, z: 6.2, radius: 2.15 }, // hide_f3_1_bookshelf_cabinet
    { x: -20.4, y: 10.0, z: 6.2, radius: 2.15 }, // hide_f3_1_bookshelf_cabinet exit
  ];

  const isClear = (x: number, y: number, z: number, extraMargin = 0): boolean => {
    for (const p of protectedZones) {
      if (Math.abs(p.y - y) > 2.2) continue;
      const dist = Math.hypot(x - p.x, z - p.z);
      if (dist < p.radius + extraMargin) return false;
    }
    return true;
  };

  // ==========================================================================
  // SHARED MATERIALS (Reused across all props for smooth FPS)
  // ==========================================================================
  const darkTeakMat = new THREE.MeshStandardMaterial({
    color: 0x371d10,
    roughness: 0.72,
    metalness: 0.06,
  });
  const agedWoodMat = new THREE.MeshStandardMaterial({
    color: 0x52311b,
    roughness: 0.84,
    metalness: 0.04,
  });
  const mudPlasterMat = new THREE.MeshStandardMaterial({
    color: 0x6f553f,
    roughness: 0.95,
    metalness: 0.02,
  });
  const sootMat = new THREE.MeshStandardMaterial({
    color: 0x1a1514,
    roughness: 0.96,
    metalness: 0.05,
  });
  const emberGlowMat = new THREE.MeshBasicMaterial({ color: 0xff4b12 });
  const warmFlameMat = new THREE.MeshBasicMaterial({ color: 0xffcc55 });
  const tarnishedBrassMat = new THREE.MeshStandardMaterial({
    color: 0xb88b32,
    roughness: 0.34,
    metalness: 0.82,
  });
  const copperPotMat = new THREE.MeshStandardMaterial({
    color: 0x9c4d2b,
    roughness: 0.42,
    metalness: 0.74,
  });
  const turmericMat = new THREE.MeshStandardMaterial({
    color: 0xd6961a,
    roughness: 0.78,
  });
  const chiliRedMat = new THREE.MeshStandardMaterial({
    color: 0x9e1814,
    roughness: 0.76,
  });
  const spiceBrownMat = new THREE.MeshStandardMaterial({
    color: 0x5c3a1e,
    roughness: 0.84,
  });
  const ceramicJarMat = new THREE.MeshStandardMaterial({
    color: 0xd6cab4,
    roughness: 0.46,
    metalness: 0.06,
  });
  const bahiLedgerMat = new THREE.MeshStandardMaterial({
    color: 0x841418,
    roughness: 0.82,
  });
  const leatherBookMat = new THREE.MeshStandardMaterial({
    color: 0x3b2416,
    roughness: 0.8,
  });
  const indigoBookMat = new THREE.MeshStandardMaterial({
    color: 0x1e2c44,
    roughness: 0.82,
  });
  const ochreBookMat = new THREE.MeshStandardMaterial({
    color: 0x7b4c1b,
    roughness: 0.82,
  });
  const parchmentMat = new THREE.MeshStandardMaterial({
    color: 0xd9c598,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  const crimsonCanopyMat = new THREE.MeshStandardMaterial({
    color: 0x6b0b16,
    roughness: 0.88,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const velvetBedMat = new THREE.MeshStandardMaterial({
    color: 0x5a0a14,
    roughness: 0.86,
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xc99c38,
    roughness: 0.36,
    metalness: 0.78,
  });
  const tarnishedMirrorMat = new THREE.MeshStandardMaterial({
    color: 0x6c8094,
    metalness: 0.9,
    roughness: 0.16,
  });
  const marigoldMat = new THREE.MeshStandardMaterial({
    color: 0xdf7616,
    roughness: 0.84,
  });
  const wiltedRoseMat = new THREE.MeshStandardMaterial({
    color: 0x7e0e1e,
    roughness: 0.82,
  });
  const featherQuillMat = new THREE.MeshStandardMaterial({
    color: 0xe6decb,
    roughness: 0.75,
  });

  // ==========================================================================
  // SHARED GEOMETRIES (Minimizes GPU buffers & draw overhead)
  // ==========================================================================
  // Kitchen geometries
  const potBodyGeo = new THREE.SphereGeometry(0.24, 12, 10);
  const potNeckGeo = new THREE.CylinderGeometry(0.11, 0.15, 0.11, 10);
  const potRimGeo = new THREE.TorusGeometry(0.125, 0.022, 6, 12);
  const thaliGeo = new THREE.CylinderGeometry(0.22, 0.19, 0.028, 14);
  const jarGeo = new THREE.CylinderGeometry(0.075, 0.085, 0.22, 9);
  const jarLidGeo = new THREE.CylinderGeometry(0.082, 0.082, 0.035, 9);
  const logGeo = new THREE.CylinderGeometry(0.052, 0.06, 0.62, 7);
  const chiliPodGeo = new THREE.ConeGeometry(0.022, 0.12, 5);
  const tawaGeo = new THREE.CylinderGeometry(0.26, 0.24, 0.03, 14);

  // Library / Munim geometries
  const shelfFrameSideGeo = new THREE.BoxGeometry(0.08, 3.1, 0.52);
  const shelfBackGeo = new THREE.BoxGeometry(2.05, 3.1, 0.05);
  const shelfPlankGeo = new THREE.BoxGeometry(1.96, 0.06, 0.48);
  const shelfCrownGeo = new THREE.BoxGeometry(2.18, 0.14, 0.58);
  const bookGeo = new THREE.BoxGeometry(0.07, 0.34, 0.26);
  const ledgerGeo = new THREE.BoxGeometry(0.42, 0.075, 0.3);
  const scrollGeo = new THREE.CylinderGeometry(0.036, 0.036, 0.44, 8);
  const scrollTieGeo = new THREE.TorusGeometry(0.038, 0.008, 5, 10);
  const openPageGeo = new THREE.BoxGeometry(0.26, 0.018, 0.34);
  const inkPotGeo = new THREE.CylinderGeometry(0.045, 0.058, 0.09, 8);
  const quillGeo = new THREE.ConeGeometry(0.022, 0.26, 5);
  const deskLegGeo = new THREE.BoxGeometry(0.09, 0.76, 0.09);

  // Bedroom / Bridal geometries
  const bedPostGeo = new THREE.CylinderGeometry(0.058, 0.082, 2.48, 8);
  const bedFinialGeo = new THREE.SphereGeometry(0.085, 8, 7);
  const canopyStripGeo = new THREE.PlaneGeometry(0.36, 1.05);
  const cornerDrapeGeo = new THREE.CylinderGeometry(0.13, 0.21, 1.24, 7, 1, true);
  const bolsterGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.68, 10);
  const stoolSeatGeo = new THREE.CylinderGeometry(0.26, 0.24, 0.12, 12);
  const stoolLegGeo = new THREE.CylinderGeometry(0.028, 0.022, 0.44, 6);
  const bangleGeo = new THREE.TorusGeometry(0.045, 0.009, 5, 12);
  const attarBottleGeo = new THREE.CylinderGeometry(0.024, 0.042, 0.14, 8);
  const flowerBeadGeo = new THREE.SphereGeometry(0.038, 6, 5);

  const bookMats = [bahiLedgerMat, leatherBookMat, indigoBookMat, ochreBookMat];

  // ==========================================================================
  // REUSABLE PROCEDURAL BUILDERS
  // ==========================================================================

  /** Builds a traditional clay chulha stove with firebox, embers, handi, tawa & logs */
  const addClayChulha = (x: number, y: number, z: number, rotY: number) => {
    if (!isClear(x, y, z, 0.45)) return;
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;

    // Sculpted raised mud platform + double-burner U-shaped chulha walls
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.16, 0.92),
      mudPlasterMat,
    );
    plinth.position.y = 0.08;
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(1.68, 0.48, 0.18),
      clayMat,
    );
    backWall.position.set(0, 0.36, -0.34);
    const leftCheek = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.46, 0.72),
      clayMat,
    );
    leftCheek.position.set(-0.72, 0.35, -0.02);
    const midCheek = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.46, 0.72),
      clayMat,
    );
    midCheek.position.set(0, 0.35, -0.02);
    const rightCheek = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.46, 0.72),
      clayMat,
    );
    rightCheek.position.set(0.72, 0.35, -0.02);

    // Top clay burner bridges
    const topDeck = new THREE.Mesh(
      new THREE.BoxGeometry(1.66, 0.09, 0.68),
      mudPlasterMat,
    );
    topDeck.position.set(0, 0.58, -0.04);
    g.add(plinth, backWall, leftCheek, midCheek, rightCheek, topDeck);

    // Two soot-blackened fireboxes with glowing charcoal beds & protruding firewood logs
    [-0.38, 0.38].forEach((bx, idx) => {
      const sootArch = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.34, 0.56),
        sootMat,
      );
      sootArch.position.set(bx, 0.33, 0.02);
      const embers = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 8, 6),
        emberGlowMat,
      );
      embers.scale.set(1.15, 0.32, 1.05);
      embers.position.set(bx, 0.2, 0.06);

      // Firewood stick jutting out of the mouth
      const fireLog = new THREE.Mesh(logGeo, agedWoodMat);
      fireLog.rotation.x = Math.PI / 2 - 0.08;
      fireLog.rotation.z = idx === 0 ? 0.16 : -0.14;
      fireLog.position.set(bx, 0.22, 0.34);
      g.add(sootArch, embers, fireLog);
    });

    // Blackened cast-iron tawa on left burner + tarnished brass handi pot on right burner
    const tawa = new THREE.Mesh(tawaGeo, sootMat);
    tawa.position.set(-0.38, 0.64, -0.04);
    const handiBody = new THREE.Mesh(potBodyGeo, tarnishedBrassMat);
    handiBody.scale.set(1.15, 0.82, 1.15);
    handiBody.position.set(0.38, 0.78, -0.04);
    const handiRim = new THREE.Mesh(potRimGeo, tarnishedBrassMat);
    handiRim.rotation.x = Math.PI / 2;
    handiRim.scale.setScalar(1.35);
    handiRim.position.set(0.38, 0.96, -0.04);
    g.add(tawa, handiBody, handiRim);

    root.add(g);
  };

  /** Builds a realistic brass pot / matka with neck & flared rim */
  const addBrassPot = (
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    scale = 1.0,
    mat: THREE.Material = tarnishedBrassMat,
  ) => {
    const pg = new THREE.Group();
    pg.position.set(x, y, z);
    pg.scale.setScalar(scale);
    const body = new THREE.Mesh(potBodyGeo, mat);
    body.scale.set(1.04, 0.86, 1.04);
    body.position.y = 0.21;
    const neck = new THREE.Mesh(potNeckGeo, mat);
    neck.position.y = 0.41;
    const rim = new THREE.Mesh(potRimGeo, mat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.46;
    pg.add(body, neck, rim);
    parent.add(pg);
  };

  /** Builds a multi-tier wooden kitchen spice shelf packed with jars & chili clusters */
  const addSpiceShelf = (x: number, y: number, z: number, rotY: number) => {
    if (!isClear(x, y, z, 0.35)) return;
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;

    const frameW = 2.0;
    const frameH = 2.35;
    [-frameW / 2, frameW / 2].forEach((sx) => {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, frameH, 0.42),
        darkTeakMat,
      );
      post.position.set(sx, frameH / 2, 0);
      g.add(post);
    });
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(frameW, frameH, 0.04),
      agedWoodMat,
    );
    back.position.set(0, frameH / 2, -0.19);
    g.add(back);

    const jarMats = [
      turmericMat,
      chiliRedMat,
      ceramicJarMat,
      tarnishedBrassMat,
      spiceBrownMat,
      copperPotMat,
    ];
    [0.32, 0.92, 1.52, 2.12].forEach((sy, tier) => {
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(frameW - 0.06, 0.055, 0.38),
        darkTeakMat,
      );
      plank.position.set(0, sy, 0);
      g.add(plank);

      if (tier < 3) {
        for (let j = 0; j < 6; j++) {
          const jx = -0.75 + j * 0.3;
          const jMat = jarMats[(tier * 3 + j) % jarMats.length];
          const jar = new THREE.Mesh(jarGeo, jMat);
          jar.scale.set(0.95 + (j % 2) * 0.14, 0.85 + ((tier + j) % 3) * 0.16, 0.95);
          jar.position.set(jx, sy + 0.14, 0.02);
          const lid = new THREE.Mesh(jarLidGeo, darkTeakMat);
          lid.position.set(jx, sy + 0.255 + ((tier + j) % 3) * 0.02, 0.02);
          g.add(jar, lid);
        }
      }
    });

    // Hanging dried red chili clusters along top shelf edge
    [-0.65, 0.0, 0.65].forEach((cx) => {
      for (let c = 0; c < 4; c++) {
        const pod = new THREE.Mesh(chiliPodGeo, chiliRedMat);
        pod.rotation.x = Math.PI;
        pod.rotation.z = (c - 1.5) * 0.22;
        pod.position.set(cx + (c - 1.5) * 0.03, 2.02 - c * 0.04, 0.18);
        g.add(pod);
      }
    });

    root.add(g);
  };

  /** Builds a tall carved 5-tier wooden bookshelf loaded with books, ledgers & scrolls */
  const addTallBookshelf = (
    x: number,
    y: number,
    z: number,
    rotY: number,
    seed: number,
  ) => {
    if (!isClear(x, y, z, 0.35)) return;
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;

    const leftSide = new THREE.Mesh(shelfFrameSideGeo, darkTeakMat);
    leftSide.position.set(-1.02, 1.55, 0);
    const rightSide = new THREE.Mesh(shelfFrameSideGeo, darkTeakMat);
    rightSide.position.set(1.02, 1.55, 0);
    const back = new THREE.Mesh(shelfBackGeo, agedWoodMat);
    back.position.set(0, 1.55, -0.24);
    const crown = new THREE.Mesh(shelfCrownGeo, darkTeakMat);
    crown.position.set(0, 3.12, 0.02);
    g.add(leftSide, rightSide, back, crown);

    [0.14, 0.72, 1.3, 1.88, 2.46, 3.04].forEach((sy, tier) => {
      const plank = new THREE.Mesh(shelfPlankGeo, darkTeakMat);
      plank.position.set(0, sy, 0);
      g.add(plank);

      if (tier >= 5) return;

      // Populate shelf with rows of vertical books, stacked red ledgers, or rolled scrolls
      if ((tier + seed) % 3 === 1) {
        // Horizontal stacked Bahi-Khata ledgers + rolled parchment scrolls
        [-0.58, 0.12].forEach((lx, stackIdx) => {
          for (let h = 0; h < 3; h++) {
            const led = new THREE.Mesh(
              ledgerGeo,
              h % 2 === 0 ? bahiLedgerMat : leatherBookMat,
            );
            led.position.set(lx, sy + 0.068 + h * 0.08, 0.02);
            led.rotation.y = (h - 1) * 0.08 + stackIdx * 0.05;
            g.add(led);
          }
        });
        for (let s = 0; s < 3; s++) {
          const scr = new THREE.Mesh(scrollGeo, parchmentMat);
          scr.rotation.x = Math.PI / 2;
          scr.position.set(0.62 + (s - 1) * 0.09, sy + 0.075 + (s === 1 ? 0.06 : 0), 0.04);
          g.add(scr);
        }
      } else {
        // Standing ancient leather/cloth volumes (with occasional tilted book)
        for (let b = 0; b < 11; b++) {
          if ((b + tier + seed) % 6 === 0) continue; // natural missing-book gap
          const bx = -0.82 + b * 0.16;
          const bMat = bookMats[(b + tier * 2 + seed) % bookMats.length];
          const book = new THREE.Mesh(bookGeo, bMat);
          const hScale = 0.78 + ((b * 5 + tier) % 4) * 0.11;
          book.scale.set(0.9 + (b % 2) * 0.35, hScale, 0.92 + (tier % 2) * 0.12);
          book.position.set(bx, sy + 0.03 + 0.17 * hScale, 0.02);
          if ((b + seed) % 7 === 0) book.rotation.z = 0.14;
          g.add(book);
        }
      }
    });

    root.add(g);
  };

  /** Builds a writing desk detail topper or standalone scholar desk */
  const addWritingDeskAccents = (
    x: number,
    y: number,
    z: number,
    rotY: number,
    buildDeskBody: boolean,
  ) => {
    if (buildDeskBody && !isClear(x, y, z, 0.5)) return;
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;

    if (buildDeskBody) {
      const top = new THREE.Mesh(
        new THREE.BoxGeometry(1.75, 0.09, 0.96),
        darkTeakMat,
      );
      top.position.y = 0.76;
      const apron = new THREE.Mesh(
        new THREE.BoxGeometry(1.58, 0.18, 0.82),
        agedWoodMat,
      );
      apron.position.y = 0.64;
      g.add(top, apron);
      [
        [-0.78, -0.4],
        [0.78, -0.4],
        [-0.78, 0.4],
        [0.78, 0.4],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(deskLegGeo, darkTeakMat);
        leg.position.set(lx, 0.38, lz);
        g.add(leg);
      });
    }

    // Open Bahi-Khata / manuscript ledger placed on the LEFT side (leaves desk center 100% open for Relic #2!)
    const leftCover = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.024, 0.38),
      bahiLedgerMat,
    );
    leftCover.position.set(-0.58, 0.805, 0.12);
    leftCover.rotation.y = 0.14;
    const pageL = new THREE.Mesh(openPageGeo, parchmentMat);
    pageL.position.set(-0.7, 0.824, 0.14);
    pageL.rotation.y = 0.14;
    pageL.rotation.z = -0.05;
    const pageR = new THREE.Mesh(openPageGeo, parchmentMat);
    pageR.position.set(-0.46, 0.824, 0.1);
    pageR.rotation.y = 0.14;
    pageR.rotation.z = 0.05;

    // Brass inkpot + feather quill on the RIGHT side
    const ink = new THREE.Mesh(inkPotGeo, tarnishedBrassMat);
    ink.position.set(0.62, 0.84, 0.18);
    const quill = new THREE.Mesh(quillGeo, featherQuillMat);
    quill.position.set(0.66, 0.96, 0.18);
    quill.rotation.z = -0.34;

    // Stacked ledgers & rolled scroll on far right corner
    const stack1 = new THREE.Mesh(ledgerGeo, leatherBookMat);
    stack1.position.set(0.56, 0.835, -0.24);
    stack1.rotation.y = -0.18;
    const stack2 = new THREE.Mesh(ledgerGeo, bahiLedgerMat);
    stack2.position.set(0.57, 0.908, -0.24);
    stack2.rotation.y = 0.09;
    const scroll = new THREE.Mesh(scrollGeo, parchmentMat);
    scroll.rotation.z = Math.PI / 2;
    scroll.rotation.y = 0.38;
    scroll.position.set(-0.52, 0.83, -0.26);

    // Small brass oil diya lamp on back-left corner (emissive wick bead, zero extra PointLight)
    const lampBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.09, 0.14, 8),
      tarnishedBrassMat,
    );
    lampBase.position.set(-0.76, 0.86, -0.24);
    const wick = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 6, 5),
      warmFlameMat,
    );
    wick.position.set(-0.76, 0.96, -0.24);

    g.add(leftCover, pageL, pageR, ink, quill, stack1, stack2, scroll, lampBase, wick);
    root.add(g);
  };

  /** Scatters fallen yellowed scrolls and red-bound ledgers naturally on the floor (visual-only) */
  const addScatteredScrollsAndLedgers = (
    items: Array<[number, number, number, number, 'scroll' | 'ledger' | 'sheet']>,
  ) => {
    for (const [sx, sy, sz, rotY, kind] of items) {
      if (!isClear(sx, sy, sz, 0.0)) continue;
      if (kind === 'scroll') {
        const sg = new THREE.Group();
        sg.position.set(sx, sy + 0.036, sz);
        sg.rotation.y = rotY;
        const roll = new THREE.Mesh(scrollGeo, parchmentMat);
        roll.rotation.z = Math.PI / 2;
        const tie = new THREE.Mesh(scrollTieGeo, chiliRedMat);
        tie.rotation.y = Math.PI / 2;
        sg.add(roll, tie);
        root.add(sg);
      } else if (kind === 'ledger') {
        const led = new THREE.Mesh(
          ledgerGeo,
          Math.abs(Math.round(sx + sz)) % 2 === 0 ? bahiLedgerMat : leatherBookMat,
        );
        led.position.set(sx, sy + 0.038, sz);
        led.rotation.y = rotY;
        root.add(led);
      } else {
        const sheet = new THREE.Mesh(openPageGeo, parchmentMat);
        sheet.scale.set(1.35, 0.4, 1.3);
        sheet.position.set(sx, sy + 0.012, sz);
        sheet.rotation.y = rotY;
        root.add(sheet);
      }
    }
  };

  /** Builds an ornate carved royal antique Indian wooden bed with patterned quilt, pillows, wrinkled blanket & tattered crimson canopy */
  const addOrnateCanopyBed = (
    x: number,
    y: number,
    z: number,
    rotY: number,
    addCollider = true,
    variant: IndianQuiltVariant = 'royal_crimson',
  ) => {
    if (!isClear(x, y, z, 0.65)) return;
    const g = createAntiqueIndianBed({
      variant,
      width: 2.02,
      length: 2.18,
      withCanopy: true,
      withGarlands: true,
      materials: {
        woodMat: darkTeakMat,
        brassMat,
        curtainMat: crimsonCanopyMat,
      },
    });
    g.position.set(x, y, z);
    g.rotation.y = rotY;

    // Scattered wilted bridal petals across the quilt
    for (let b = 0; b < 9; b++) {
      const a = b * 0.42;
      const f = new THREE.Mesh(
        flowerBeadGeo,
        b % 2 === 0 ? wiltedRoseMat : marigoldMat,
      );
      f.position.set(-0.45 + b * 0.11, 0.76, -0.05 + Math.sin(a) * 0.26);
      g.add(f);
    }

    root.add(g);

    if (addCollider) {
      const halfX = Math.abs(Math.cos(rotY)) * 1.02 + Math.abs(Math.sin(rotY)) * 1.08;
      const halfZ = Math.abs(Math.sin(rotY)) * 1.02 + Math.abs(Math.cos(rotY)) * 1.08;
      wallColliders.push({
        minX: x - halfX,
        maxX: x + halfX,
        minZ: z - halfZ,
        maxZ: z + halfZ,
        minY: y,
        maxY: y + 2.2,
      });
    }
  };
  void velvetBedMat;
  void goldTrimMat;
  void bedPostGeo;
  void bedFinialGeo;
  void bolsterGeo;
  void canopyStripGeo;
  void cornerDrapeGeo;

  /** Builds an antique Indian dressing table (shringar mez) with arched tarnished mirror, bangles & stool */
  const addAntiqueDressingTable = (
    x: number,
    y: number,
    z: number,
    rotY: number,
  ) => {
    if (!isClear(x, y, z, 0.45)) return;
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = rotY;

    // Carved teak vanity console with drawer pulls
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(1.52, 0.08, 0.62),
      darkTeakMat,
    );
    top.position.y = 0.78;
    const drawers = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.24, 0.54),
      agedWoodMat,
    );
    drawers.position.y = 0.64;
    g.add(top, drawers);

    [-0.4, 0.4].forEach((px) => {
      const pull = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 6, 5),
        brassMat,
      );
      pull.position.set(px, 0.64, 0.29);
      g.add(pull);
    });

    [
      [-0.66, -0.24],
      [0.66, -0.24],
      [-0.66, 0.24],
      [0.66, 0.24],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(deskLegGeo, darkTeakMat);
      leg.position.set(lx, 0.38, lz);
      g.add(leg);
    });

    // Ornate arched brass-framed tarnished mirror
    const mirrorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.96, 1.18, 0.07),
      darkTeakMat,
    );
    mirrorFrame.position.set(0, 1.42, -0.24);
    const goldTrim = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 1.08, 0.04),
      brassMat,
    );
    goldTrim.position.set(0, 1.42, -0.21);
    const mirrorGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.76, 0.98),
      tarnishedMirrorMat,
    );
    mirrorGlass.position.set(0, 1.42, -0.185);
    const mirrorCrest = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.022, 6, 14),
      brassMat,
    );
    mirrorCrest.position.set(0, 2.06, -0.22);
    g.add(mirrorFrame, goldTrim, mirrorGlass, mirrorCrest);

    // Tabletop horror bridal items: sindoor dibbi, brass attar vials, broken red/gold glass bangles
    const sindoor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.055, 0.07, 10),
      chiliRedMat,
    );
    sindoor.position.set(-0.44, 0.855, 0.08);
    const attar1 = new THREE.Mesh(attarBottleGeo, tarnishedBrassMat);
    attar1.position.set(0.42, 0.89, -0.02);
    const attar2 = new THREE.Mesh(attarBottleGeo, copperPotMat);
    attar2.scale.setScalar(0.82);
    attar2.position.set(0.54, 0.875, 0.08);
    g.add(sindoor, attar1, attar2);

    [
      [-0.22, 0.14],
      [-0.14, 0.19],
      [0.12, 0.16],
      [0.24, 0.12],
    ].forEach(([bx, bz], idx) => {
      const bgl = new THREE.Mesh(
        bangleGeo,
        idx % 2 === 0 ? chiliRedMat : goldTrimMat,
      );
      bgl.rotation.x = Math.PI / 2;
      bgl.position.set(bx, 0.83, bz);
      g.add(bgl);
    });

    // Velvet-cushioned carved vanity stool tucked neatly in front
    const stool = new THREE.Group();
    stool.position.set(0.05, 0, 0.62);
    const sSeat = new THREE.Mesh(stoolSeatGeo, crimsonCanopyMat);
    sSeat.position.y = 0.46;
    stool.add(sSeat);
    [
      [-0.15, -0.15],
      [0.15, -0.15],
      [-0.15, 0.15],
      [0.15, 0.15],
    ].forEach(([sx, sz]) => {
      const sLeg = new THREE.Mesh(stoolLegGeo, darkTeakMat);
      sLeg.position.set(sx, 0.22, sz);
      stool.add(sLeg);
    });
    g.add(stool);

    root.add(g);
  };

  /** Places a snapped, wilted marigold & crimson rose garland flat on the floor (visual-only) */
  const addBrokenFloorGarland = (
    x: number,
    y: number,
    z: number,
    rotY: number,
    beads = 12,
  ) => {
    if (!isClear(x, y, z, 0.0)) return;
    const g = new THREE.Group();
    g.position.set(x, y + 0.032, z);
    g.rotation.y = rotY;
    for (let i = 0; i < beads; i++) {
      const t = i / Math.max(1, beads - 1);
      const angle = t * Math.PI * 1.15 - 0.55;
      const r = 0.42 + (i % 3) * 0.03;
      const bead = new THREE.Mesh(
        flowerBeadGeo,
        i % 3 === 0 ? wiltedRoseMat : marigoldMat,
      );
      bead.scale.set(1.05, 0.65, 1.05);
      bead.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
      g.add(bead);
    }
    root.add(g);
  };

  // ==========================================================================
  // 1. KITCHEN & ANNA-KOTHI (G2: y = 0, x in [-24,-11], z in [-19.5,-4.5])
  //    Clay chulha stoves, stacked brass pots, and wooden spice shelves
  // ==========================================================================
  {
    // Two sculpted double-mouth clay chulha stoves along the West wall (strictly >= 4.5m from Kothi!)
    addClayChulha(-23.0, 0.0, -8.2, Math.PI / 2);
    addClayChulha(-23.0, 0.0, -10.5, Math.PI / 2);

    // Split firewood pile neatly beside the chulha hearth (-23.1, 0, -6.2)
    if (isClear(-23.1, 0, -6.2, 0.3)) {
      for (let i = 0; i < 6; i++) {
        const log = new THREE.Mesh(logGeo, agedWoodMat);
        log.rotation.z = Math.PI / 2;
        log.rotation.y = 0.12 * (i % 3);
        const row = i < 4 ? 0 : 1;
        const col = row === 0 ? i - 1.5 : i - 4.5;
        log.position.set(-23.1, 0.06 + row * 0.1, -6.2 + col * 0.13);
        root.add(log);
      }
    }

    // Stacked Brass Pots — Cluster A (NE corner of G2: -13.4, 0, -18.2)
    if (isClear(-13.4, 0, -18.2, 0.4)) {
      const brassClusterA = new THREE.Group();
      brassClusterA.position.set(-13.4, 0, -18.2);
      // Base tier: 3 large gleaming/tarnished brass matkas
      addBrassPot(brassClusterA, -0.55, 0, 0.1, 1.25, tarnishedBrassMat);
      addBrassPot(brassClusterA, 0.08, 0, -0.05, 1.32, tarnishedBrassMat);
      addBrassPot(brassClusterA, 0.68, 0, 0.12, 1.18, copperPotMat);
      // Middle tier stacked atop base pots
      addBrassPot(brassClusterA, -0.25, 0.45, 0.04, 1.0, copperPotMat);
      addBrassPot(brassClusterA, 0.4, 0.44, 0.05, 0.96, tarnishedBrassMat);
      // Top brass kalash crown
      addBrassPot(brassClusterA, 0.08, 0.84, 0.04, 0.78, brassMat);
      // Stacked gleaming brass thali plates beside pots
      for (let t = 0; t < 5; t++) {
        const thali = new THREE.Mesh(thaliGeo, tarnishedBrassMat);
        thali.position.set(-1.12, 0.02 + t * 0.032, 0.24);
        brassClusterA.add(thali);
      }
      root.add(brassClusterA);
    }

    // Stacked Brass Pots — Cluster B (SE corner of G2: -13.6, 0, -5.8)
    if (isClear(-13.6, 0, -5.8, 0.4)) {
      const brassClusterB = new THREE.Group();
      brassClusterB.position.set(-13.6, 0, -5.8);
      addBrassPot(brassClusterB, -0.32, 0, 0, 1.22, tarnishedBrassMat);
      addBrassPot(brassClusterB, 0.32, 0, 0.06, 1.15, tarnishedBrassMat);
      addBrassPot(brassClusterB, 0.0, 0.44, 0.03, 0.92, copperPotMat);
      addBrassPot(brassClusterB, 0.82, 0, -0.08, 1.05, clayMat);
      root.add(brassClusterB);
    }

    // Three Wooden Spice Shelves packed with jars & hanging chilies
    addSpiceShelf(-21.3, 0.0, -5.05, 0); // South wall (SW bay)
    addSpiceShelf(-11.55, 0.0, -7.2, -Math.PI / 2); // East wall (SE bay, 4.8m from door)
    addSpiceShelf(-11.55, 0.0, -16.8, -Math.PI / 2); // East wall (NE bay, 4.8m from door)
  }

  // ==========================================================================
  // 2. MUNIM RECORD ROOM (G3: y = 0, x in [11,24], z in [-4.5,10])
  //    Tall wooden bookshelves, writing desk details, scattered scrolls & ledgers
  // ==========================================================================
  {
    // Tall carved teak bookshelves (all strictly >= 3.9m from almirah hiding spot & doorways)
    addTallBookshelf(23.35, 0.0, -2.4, -Math.PI / 2, 1);
    addTallBookshelf(23.35, 0.0, 0.4, -Math.PI / 2, 2);
    addTallBookshelf(15.2, 0.0, 9.35, Math.PI, 3);
    addTallBookshelf(19.4, 0.0, 9.35, Math.PI, 4);
    addTallBookshelf(21.4, 0.0, -3.9, 0, 5);

    // Enrich existing Munim desk at (17.5, 0, -1.0) without touching Relic #2 at center
    addWritingDeskAccents(17.5, 0.0, -1.0, 0, false);

    // Secondary Munim writing desk near the South wall bookshelves
    addWritingDeskAccents(14.4, 0.0, 7.2, Math.PI, true);

    // Scattered old scrolls & Bahi-Khata ledgers on the floor near desks & shelves
    addScatteredScrollsAndLedgers([
      [16.2, 0, 0.3, 0.5, 'scroll'],
      [18.7, 0, -0.2, -0.8, 'ledger'],
      [19.2, 0, 0.45, 0.25, 'sheet'],
      [22.1, 0, -1.6, 1.1, 'scroll'],
      [22.0, 0, 0.8, -0.4, 'ledger'],
      [15.6, 0, 8.2, 0.65, 'scroll'],
      [18.6, 0, 8.1, -0.5, 'ledger'],
      [17.2, 0, 7.7, 0.9, 'sheet'],
    ]);
  }

  // ==========================================================================
  // 3. TANTRIK GRANTH LIBRARY (3F-1: y = 10.0, x in [-24,-11], z in [-4.5,10])
  //    Tall wooden bookshelves, writing desk details, scattered scrolls & ledgers
  // ==========================================================================
  {
    // Tall carved teak bookshelves (strictly >= 3.2m from hollow bookshelf cabinet at (-22.6, 6.2)!)
    addTallBookshelf(-23.35, 10.0, -2.3, Math.PI / 2, 6);
    addTallBookshelf(-23.35, 10.0, 0.35, Math.PI / 2, 7);
    addTallBookshelf(-23.35, 10.0, 2.95, Math.PI / 2, 8);
    addTallBookshelf(-15.0, 10.0, 9.35, Math.PI, 9);
    addTallBookshelf(-18.8, 10.0, 9.35, Math.PI, 10);
    addTallBookshelf(-21.6, 10.0, -3.9, 0, 11);

    // Enrich existing Tantrik writing desk at (-17.5, 10.0, -1.0)
    addWritingDeskAccents(-17.5, 10.0, -1.0, 0, false);

    // Second scholar's writing desk near the South wall bookshelves
    addWritingDeskAccents(-14.6, 10.0, 7.1, Math.PI, true);

    // Scattered ancient scrolls, sheets & grimoires near bookshelves & reading desks
    addScatteredScrollsAndLedgers([
      [-16.1, 10.0, 0.2, -0.6, 'scroll'],
      [-18.8, 10.0, -0.1, 0.45, 'ledger'],
      [-17.4, 10.0, 0.65, 1.2, 'sheet'],
      [-21.9, 10.0, -1.5, 0.3, 'scroll'],
      [-21.8, 10.0, 1.4, -0.9, 'ledger'],
      [-15.4, 10.0, 8.2, 0.7, 'scroll'],
      [-18.2, 10.0, 8.1, -0.3, 'ledger'],
      [-16.6, 10.0, 7.6, 0.15, 'sheet'],
    ]);
  }

  // ==========================================================================
  // 4. RUKMINI'S BRIDAL ROOM (2F-1: y = 5.0, x in [11,24], z in [-4.5,10])
  //    Ornate carved bridal bed with tattered crimson canopy, dressing table & broken garlands
  // ==========================================================================
  {
    // Ornate Carved Bridal Bed (Suhaag Sej) tucked flush into SW corner against South wall
    // (Pre-remap 13.1, 9.12 -> World 21.1, 8.88, headboard flush against z = 10 South wall!)
    addOrnateCanopyBed(13.1, 5.0, 9.12, Math.PI, true, 'royal_crimson');

    // Antique Bridal Dressing Table against East wall NE corner (6.1m from Palki & 6.2m from inner door)
    addAntiqueDressingTable(22.9, 5.0, -1.5, -Math.PI / 2);

    // Snapped marigold & crimson rose garlands strewn across floor near bed & vanity
    addBrokenFloorGarland(13.8, 5.0, 7.1, 0.35, 14);
    addBrokenFloorGarland(15.6, 5.0, 7.6, -1.1, 10);
    addBrokenFloorGarland(21.5, 5.0, -1.4, 1.8, 12);
    addBrokenFloorGarland(19.6, 5.0, -2.5, -0.5, 9);
  }

  // ==========================================================================
  // 5. MASTER BEDROOM (2F-2: y = 5.0, x in [-24,-11], z in [-4.5,10])
  //    (Existing Four-Poster Bed at (-20.4, 5, 3.2) receives tattered canopy via decorateExistingFourPosterBed)
  //    Antique dressing table, carved side chest & broken flower garlands
  // ==========================================================================
  {
    // Antique Dressing Table along South wall SE safe corner (6.7m from bed & 6.8m from door)
    addAntiqueDressingTable(-14.2, 5.0, 8.85, Math.PI);

    // Carved Royal Chest in NW safe corner (-22.6, 5.0, -2.1)
    if (isClear(-22.6, 5.0, -2.1, 0.4)) {
      const chest = new THREE.Mesh(
        new THREE.BoxGeometry(1.42, 0.68, 0.78),
        darkTeakMat,
      );
      chest.position.set(-22.6, 5.34, -2.1);
      chest.rotation.y = Math.PI / 2;
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(1.46, 0.08, 0.82),
        brassMat,
      );
      trim.position.set(-22.6, 5.66, -2.1);
      trim.rotation.y = Math.PI / 2;
      root.add(chest, trim);
    }

    // Broken flower garlands strewn near dressing table & side chest (well clear of bed hiding exit)
    addBrokenFloorGarland(-14.2, 5.0, 7.4, -0.4, 12);
    addBrokenFloorGarland(-21.3, 5.0, -2.0, 0.9, 10);
    addBrokenFloorGarland(-15.8, 5.0, 8.1, 2.1, 9);
  }

  // ==========================================================================
  // 6. GUEST SUITE 1 / MEHMAAN KHANA (2F-3: y = 5.0, x in [11,24], z in [-34,-19.5])
  //    Ornate carved canopy bed, antique dressing table & broken flower garlands (clear of Kabir & Sandook)
  // ==========================================================================
  {
    // Ornate Carved Guest Bed tucked flush into NW corner against North wall
    // (Pre-remap 13.1, -33.15 -> World 21.1, -44.92, headboard flush against z = -46 North wall!)
    addOrnateCanopyBed(13.1, 5.0, -33.15, 0, true, 'guest_indigo');
    addAntiqueDressingTable(21.4, 5.0, -32.75, 0);
    addBrokenFloorGarland(14.0, 5.0, -31.2, 0.6, 11);
    addBrokenFloorGarland(21.4, 5.0, -31.3, -0.8, 9);
  }

  // Keep stoneFloorMat referenced cleanly if needed for future floor plinth accents
  void stoneFloorMat;
  void ironMat;
  void woodMat;
}
