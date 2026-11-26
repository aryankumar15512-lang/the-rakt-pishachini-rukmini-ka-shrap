import * as THREE from 'three';
import type { WallAABB } from './mansionWorld';
import { createAntiqueIndianBed } from './antiqueBedsAndCorridorProps';

export interface ExpandedRoomsPropsContext {
  root: THREE.Group;
  wallColliders: WallAABB[];
  materials: {
    carvedSandstoneMat: THREE.MeshStandardMaterial;
    brassMat: THREE.MeshStandardMaterial;
    ironMat: THREE.MeshStandardMaterial;
    woodMat: THREE.MeshStandardMaterial;
    clayMat: THREE.MeshStandardMaterial;
    curtainMat: THREE.MeshStandardMaterial;
    stairCarpetMat: THREE.MeshStandardMaterial;
    stoneFloorMat: THREE.MeshStandardMaterial;
  };
}

/**
 * Furnishes the expanded 22-room 3-story Royal Haveli rooms using shared
 * Three.js geometries and materials for high FPS and zero doorway obstruction.
 */
export function buildExpandedRoomsProps(ctx: ExpandedRoomsPropsContext): void {
  const { root, wallColliders, materials } = ctx;
  const {
    carvedSandstoneMat,
    brassMat,
    ironMat,
    woodMat,
    clayMat,
    curtainMat,
    stairCarpetMat,
    stoneFloorMat,
  } = materials;

  // Shared accent materials (reused across all expanded rooms)
  const crimsonVelvetMat = new THREE.MeshStandardMaterial({
    color: 0x6f0c18,
    roughness: 0.86,
    metalness: 0.05,
  });
  const saffronSilkMat = new THREE.MeshStandardMaterial({
    color: 0xb86b1c,
    roughness: 0.78,
    metalness: 0.08,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0xa4acb4,
    roughness: 0.34,
    metalness: 0.86,
  });
  const parchmentMat = new THREE.MeshStandardMaterial({
    color: 0xd8c79e,
    roughness: 0.88,
  });
  const mirrorGlassMat = new THREE.MeshStandardMaterial({
    color: 0x7b90a6,
    metalness: 0.92,
    roughness: 0.14,
  });
  const darkTeakMat = new THREE.MeshStandardMaterial({
    color: 0x3b2012,
    roughness: 0.68,
    metalness: 0.06,
  });

  // Shared primitive geometries (minimizes GPU memory & draw setup)
  const spearShaftGeo = new THREE.CylinderGeometry(0.022, 0.024, 2.25, 6);
  const spearTipGeo = new THREE.ConeGeometry(0.06, 0.28, 4);
  const shieldGeo = new THREE.CylinderGeometry(0.42, 0.45, 0.07, 14);
  const bolsterGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.78, 10);
  const chairSeatGeo = new THREE.BoxGeometry(0.54, 0.08, 0.54);
  const chairBackGeo = new THREE.BoxGeometry(0.54, 0.68, 0.07);
  const chairLegGeo = new THREE.BoxGeometry(0.06, 0.48, 0.06);
  const crateGeo = new THREE.BoxGeometry(0.92, 0.78, 0.92);
  const potGeo = new THREE.SphereGeometry(0.26, 10, 8);
  const candleStickGeo = new THREE.CylinderGeometry(0.04, 0.14, 1.35, 8);

  const addSimpleChair = (x: number, y: number, z: number, rotY: number) => {
    const cg = new THREE.Group();
    cg.position.set(x, y, z);
    cg.rotation.y = rotY;
    const seat = new THREE.Mesh(chairSeatGeo, darkTeakMat);
    seat.position.y = 0.48;
    const back = new THREE.Mesh(chairBackGeo, darkTeakMat);
    back.position.set(0, 0.84, -0.24);
    cg.add(seat, back);
    for (const [lx, lz] of [
      [-0.22, -0.22],
      [0.22, -0.22],
      [-0.22, 0.22],
      [0.22, 0.22],
    ]) {
      const leg = new THREE.Mesh(chairLegGeo, darkTeakMat);
      leg.position.set(lx, 0.24, lz);
      cg.add(leg);
    }
    root.add(cg);
  };

  // ==========================================================================
  // 1. GF-G1: SHAHI SHASTRAGAR (ARMORY) — x in [-24,-11], z in [-4.5, 10]
  // ==========================================================================
  {
    const armoryTable = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.84, 3.8),
      darkTeakMat,
    );
    armoryTable.position.set(-17.5, 0.42, 2.75);
    armoryTable.castShadow = true;
    root.add(armoryTable);
    wallColliders.push({
      minX: -18.4,
      maxX: -16.6,
      minZ: 0.8,
      maxZ: 4.7,
      minY: 0,
      maxY: 1.4,
    });

    // Display shields & blades laid across the armory inspection table
    [-1.1, 0.0, 1.1].forEach((tz) => {
      const dShield = new THREE.Mesh(shieldGeo, ironMat);
      dShield.position.set(-17.5, 0.89, 2.75 + tz);
      const boss = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 6),
        brassMat,
      );
      boss.position.set(-17.5, 0.94, 2.75 + tz);
      root.add(dShield, boss);
    });

    // Two standing wooden spear/pike racks along North & South walls
    [-2.8, 8.2].forEach((rz) => {
      const rack = new THREE.Group();
      rack.position.set(-17.5, 0, rz);
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.22, 0.48),
        woodMat,
      );
      base.position.y = 0.11;
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.12, 0.14),
        woodMat,
      );
      bar.position.y = 1.45;
      rack.add(base, bar);

      for (let i = -3; i <= 3; i++) {
        const shaft = new THREE.Mesh(spearShaftGeo, woodMat);
        shaft.position.set(i * 0.44, 1.24, 0);
        const tip = new THREE.Mesh(spearTipGeo, steelMat);
        tip.position.set(i * 0.44, 2.48, 0);
        rack.add(shaft, tip);
      }
      root.add(rack);
    });

    // Antique Rajput armor stand on pedestal in corner (-22.2, 0, -1.8)
    const armorGroup = new THREE.Group();
    armorGroup.position.set(-22.2, 0, -1.8);
    armorGroup.rotation.y = Math.PI / 3;
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.54, 0.3, 10),
      carvedSandstoneMat,
    );
    ped.position.y = 0.15;
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 1.55, 8),
      woodMat,
    );
    post.position.y = 1.05;
    const cuirass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.24, 0.72, 10),
      steelMat,
    );
    cuirass.position.y = 1.42;
    const helm = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 8),
      steelMat,
    );
    helm.position.y = 1.98;
    const spike = new THREE.Mesh(spearTipGeo, brassMat);
    spike.scale.setScalar(0.6);
    spike.position.y = 2.22;
    armorGroup.add(ped, post, cuirass, helm, spike);
    root.add(armorGroup);
  }

  // ==========================================================================
  // 2. GF-G5: MEHMAAN BAITHAK (DRAWING ROOM) — x in [-24,-11], z in [-34,-19.5]
  // ==========================================================================
  {
    const rug = new THREE.Mesh(
      new THREE.BoxGeometry(6.8, 0.03, 5.8),
      stairCarpetMat,
    );
    rug.position.set(-17.5, 0.015, -26.8);
    root.add(rug);

    // Low carved royal chowki table in center
    const chowki = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.42, 1.4),
      darkTeakMat,
    );
    chowki.position.set(-17.5, 0.21, -26.8);
    root.add(chowki);

    // Brass hookah centerpiece on chowki
    const hookahBase = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.38, 10),
      brassMat,
    );
    hookahBase.position.set(-17.5, 0.61, -26.8);
    const hookahStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.035, 0.48, 8),
      brassMat,
    );
    hookahStem.position.set(-17.5, 0.96, -26.8);
    root.add(hookahBase, hookahStem);

    // Royal floor Gaddi mattresses with velvet bolsters along North & South walls
    [-31.6, -22.2].forEach((gz) => {
      const gaddi = new THREE.Mesh(
        new THREE.BoxGeometry(5.6, 0.24, 1.55),
        crimsonVelvetMat,
      );
      gaddi.position.set(-17.5, 0.12, gz);
      root.add(gaddi);
      [-19.2, -17.5, -15.8].forEach((bx) => {
        const b = new THREE.Mesh(bolsterGeo, saffronSilkMat);
        b.rotation.z = Math.PI / 2;
        b.position.set(bx, 0.38, gz + (gz < -27 ? -0.45 : 0.45));
        root.add(b);
      });
    });
  }

  // ==========================================================================
  // 3. GF-G6: SEVAK KAKSH (SERVANT QUARTERS) — x in [11,24], z in [-34,-19.5]
  // ==========================================================================
  {
    // 2 Realistic Antique Indian Wooden Beds neatly pushed against North-West wall & South-East corner
    // (Completely clear of West doorway, South inner doorway, and East hiding trunk!)
    const g6BedNW = createAntiqueIndianBed({
      variant: 'humble_ochre',
      width: 1.56,
      length: 2.08,
      withCanopy: false,
      materials: { woodMat, brassMat, curtainMat },
    });
    g6BedNW.position.set(13.6, 0, -33.2); // World: (21.6, 0, -44.98), headboard flush against North wall
    g6BedNW.rotation.y = 0;
    root.add(g6BedNW);

    const g6BedSE = createAntiqueIndianBed({
      variant: 'guest_indigo',
      width: 1.56,
      length: 2.08,
      withCanopy: false,
      materials: { woodMat, brassMat, curtainMat },
    });
    g6BedSE.position.set(22.8, 0, -22.2); // World: (30.8, 0, -30.94), headboard flush against East wall
    g6BedSE.rotation.y = -Math.PI / 2;
    root.add(g6BedSE);

    // Brass & clay water pitchers along north wall
    for (let i = 0; i < 4; i++) {
      const pitcher = new THREE.Mesh(potGeo, i % 2 === 0 ? clayMat : brassMat);
      pitcher.position.set(20.2 + i * 0.72, 0.24, -32.8);
      root.add(pitcher);
    }
  }

  // ==========================================================================
  // 4. 2F-5: RANI'S SHRINGAR KAKSH — x in [11,24], z in [-19.5,-4.5], y = 5.0
  // ==========================================================================
  {
    const rug = new THREE.Mesh(
      new THREE.BoxGeometry(5.8, 0.03, 5.4),
      stairCarpetMat,
    );
    rug.position.set(17.5, 5.015, -12.0);
    root.add(rug);

    // Ornate carved vanity dressing table + mirror frame
    const vanity = new THREE.Group();
    vanity.position.set(17.5, 5.0, -7.2);
    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.84, 0.92),
      darkTeakMat,
    );
    desk.position.y = 0.42;
    const mirrorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 1.75, 0.1),
      brassMat,
    );
    mirrorFrame.position.set(0, 1.68, -0.34);
    const mirrorGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.32, 1.52),
      mirrorGlassMat,
    );
    mirrorGlass.position.set(0, 1.68, -0.28);
    // Jewelry box & perfume bottles
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.22, 0.3),
      brassMat,
    );
    box.position.set(-0.68, 0.95, 0.08);
    const stool = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.34, 0.5, 12),
      crimsonVelvetMat,
    );
    stool.position.set(0, 0.25, 0.95);
    vanity.add(desk, mirrorFrame, mirrorGlass, box, stool);
    root.add(vanity);

    // Carved 3-panel silk dressing screen in SE corner of Shringar Kaksh
    [-0.9, 0, 0.9].forEach((sx, idx) => {
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(0.86, 2.25, 0.07),
        idx === 1 ? crimsonVelvetMat : woodMat,
      );
      panel.position.set(14.5 + sx, 6.125, -16.8 + Math.abs(sx) * 0.22);
      panel.rotation.y = (idx - 1) * 0.28;
      root.add(panel);
    });
  }

  // ==========================================================================
  // 5. 2F-6: ROYAL DINING ROOM (SHAHI BHOJSHALA) — x in [-24,-11], z in [-19.5,-4.5], y = 5.0
  // ==========================================================================
  {
    const banquetTable = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.86, 6.2),
      darkTeakMat,
    );
    banquetTable.position.set(-17.5, 5.43, -12.0);
    banquetTable.castShadow = true;
    const runner = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, 0.025, 5.8),
      crimsonVelvetMat,
    );
    runner.position.set(-17.5, 5.875, -12.0);
    root.add(banquetTable, runner);
    wallColliders.push({
      minX: -18.7,
      maxX: -16.3,
      minZ: -15.15,
      maxZ: -8.85,
      minY: 5.0,
      maxY: 6.4,
    });

    // Brass thali plates & goblets + 8 carved royal dining chairs
    const thaliGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.03, 12);
    for (let i = 0; i < 4; i++) {
      const tz = -14.2 + i * 1.45;
      [-18.18, -16.82].forEach((tx, sideIdx) => {
        const thali = new THREE.Mesh(thaliGeo, brassMat);
        thali.position.set(tx, 5.88, tz);
        root.add(thali);
        addSimpleChair(
          tx + (sideIdx === 0 ? -0.92 : 0.92),
          5.0,
          tz,
          sideIdx === 0 ? Math.PI / 2 : -Math.PI / 2,
        );
      });
    }
  }

  // ==========================================================================
  // 6. 2F-7: GUEST SUITE 2 (FRONT PALACE SUITE) — x in [-11, 0], z in [5.8, 10], y = 5.0
  // ==========================================================================
  {
    // Realistic Antique Indian Wooden Guest Bed tucked neatly against South wall in SE corner
    // (Pre-remap x=-2.6, z=8.88 -> World (-4.49, 5.0, 8.88), clear of door (-7.6, 5.8), inner door (0, 7.9) & hiding alcove (-14.6, 8.2))
    const guest2Bed = createAntiqueIndianBed({
      variant: 'guest_indigo',
      width: 1.78,
      length: 2.1,
      withCanopy: false,
      materials: { woodMat, brassMat, curtainMat },
    });
    guest2Bed.position.set(-2.6, 5.0, 8.88);
    guest2Bed.rotation.y = Math.PI; // Headboard flush against South wall z = 10
    root.add(guest2Bed);
  }

  // ==========================================================================
  // 7. 2F-8: ANCESTOR PORTRAIT GALLERY (FRONT SUITE) — x in [0, 11], z in [5.8, 10], y = 5.0
  // ==========================================================================
  {
    // Central velvet viewing bench + flanking brass candelabra pedestals
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.48, 0.82),
      crimsonVelvetMat,
    );
    bench.position.set(5.2, 5.24, 7.9);
    const benchBase = new THREE.Mesh(
      new THREE.BoxGeometry(2.9, 0.16, 0.88),
      darkTeakMat,
    );
    benchBase.position.set(5.2, 5.08, 7.9);
    root.add(bench, benchBase);

    [2.4, 7.9].forEach((cx) => {
      const stand = new THREE.Mesh(candleStickGeo, brassMat);
      stand.position.set(cx, 5.68, 9.35);
      root.add(stand);
    });

    // Row of antique gilded gallery frames lining the South front wall
    const gFrameGeo = new THREE.BoxGeometry(1.36, 1.82, 0.08);
    const gCanvasGeo = new THREE.PlaneGeometry(1.16, 1.6);
    const gCanvasMat = new THREE.MeshStandardMaterial({
      color: 0x241712,
      roughness: 0.78,
    });
    [1.8, 4.2, 6.6, 8.8].forEach((px) => {
      const fg = new THREE.Group();
      fg.position.set(px, 7.35, 9.72);
      fg.rotation.y = Math.PI;
      const frame = new THREE.Mesh(gFrameGeo, brassMat);
      const canvas = new THREE.Mesh(gCanvasGeo, gCanvasMat);
      canvas.position.z = 0.048;
      fg.add(frame, canvas);
      root.add(fg);
    });
  }

  // ==========================================================================
  // 8. 3F-5: JYOTISH / ASTROLOGY ROOM — x in [-24,-11], z in [-19.5,-4.5], y = 10.0
  // ==========================================================================
  {
    // Central Brass Armillary Astrolabe Sphere on Carved Octagonal Pedestal
    const astroGroup = new THREE.Group();
    astroGroup.position.set(-17.5, 10.0, -12.0);
    const ped = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.82, 0.92, 8),
      carvedSandstoneMat,
    );
    ped.position.y = 0.46;
    const sphereCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 8),
      brassMat,
    );
    sphereCore.position.y = 1.62;
    const ringGeo = new THREE.TorusGeometry(0.58, 0.032, 8, 24);
    const r1 = new THREE.Mesh(ringGeo, brassMat);
    r1.position.y = 1.62;
    const r2 = new THREE.Mesh(ringGeo, brassMat);
    r2.position.y = 1.62;
    r2.rotation.y = Math.PI / 2;
    const r3 = new THREE.Mesh(ringGeo, brassMat);
    r3.position.y = 1.62;
    r3.rotation.x = Math.PI / 3;
    astroGroup.add(ped, sphereCore, r1, r2, r3);
    root.add(astroGroup);
    wallColliders.push({
      minX: -18.35,
      maxX: -16.65,
      minZ: -12.85,
      maxZ: -11.15,
      minY: 10.0,
      maxY: 12.2,
    });

    // Zodiac scroll reading table & brass telescope on tripod near west wall
    const chartTable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.85, 0.82, 12),
      darkTeakMat,
    );
    chartTable.position.set(-17.5, 10.41, -7.2);
    const chartScroll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.68, 0.03, 14),
      parchmentMat,
    );
    chartScroll.position.set(-17.5, 10.84, -7.2);
    root.add(chartTable, chartScroll);

    // Brass telescope aimed outward toward the west window
    const scopeGroup = new THREE.Group();
    scopeGroup.position.set(-22.1, 10.0, -16.2);
    const tripodPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.24, 1.32, 6),
      woodMat,
    );
    tripodPost.position.y = 0.66;
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.095, 1.35, 10),
      brassMat,
    );
    barrel.rotation.z = Math.PI / 2 - 0.38;
    barrel.position.set(-0.08, 1.44, 0);
    scopeGroup.add(tripodPost, barrel);
    root.add(scopeGroup);
  }

  // ==========================================================================
  // 9. 3F-6: OLD DOLL / TOY ROOM — x in [11,24], z in [-19.5,-4.5], y = 10.0
  // ==========================================================================
  {
    // Tall wooden puppet/doll display shelves along North & South walls
    [-18.6, -5.4].forEach((sz) => {
      const shelf = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 2.4, 0.56),
        woodMat,
      );
      shelf.position.set(17.5, 11.2, sz);
      root.add(shelf);
    });

    // Shared materials & geometries for eerie vintage wooden/porcelain dolls and cradles
    const porcelainMat = new THREE.MeshStandardMaterial({
      color: 0xc9beaa,
      roughness: 0.62,
      metalness: 0.04,
    });
    const dollHairMat = new THREE.MeshStandardMaterial({
      color: 0x161110,
      roughness: 0.92,
    });
    const hollowEyeMat = new THREE.MeshStandardMaterial({
      color: 0x060405,
      roughness: 0.18,
      metalness: 0.35,
    });
    const dustyLinenMat = new THREE.MeshStandardMaterial({
      color: 0x9b8d78,
      roughness: 0.94,
    });
    const fadedDressMat = new THREE.MeshStandardMaterial({
      color: 0x4b323b,
      roughness: 0.9,
    });

    const dollTorsoGeo = new THREE.CylinderGeometry(0.068, 0.088, 0.22, 10);
    const dollSkirtGeo = new THREE.CylinderGeometry(0.085, 0.165, 0.22, 12);
    const dollCollarGeo = new THREE.TorusGeometry(0.062, 0.014, 6, 12);
    const dollHeadGeo = new THREE.SphereGeometry(0.088, 12, 10);
    const dollEyeGeo = new THREE.SphereGeometry(0.015, 8, 6);
    const dollMouthGeo = new THREE.BoxGeometry(0.036, 0.008, 0.012);
    const dollCrackGeo = new THREE.BoxGeometry(0.006, 0.042, 0.008);
    const dollHairCapGeo = new THREE.SphereGeometry(
      0.094,
      10,
      8,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.56,
    );
    const dollHairLockGeo = new THREE.CylinderGeometry(0.016, 0.008, 0.16, 6);
    const dollLimbGeo = new THREE.CylinderGeometry(0.022, 0.018, 0.2, 7);
    const dollFootGeo = new THREE.BoxGeometry(0.042, 0.028, 0.068);
    const dollHandGeo = new THREE.SphereGeometry(0.022, 7, 6);

    const buildSpookyVintageDoll = (
      dressMat: THREE.MeshStandardMaterial,
      headTiltZ: number,
      headTiltX: number,
      armRaise: number,
    ): THREE.Group => {
      const doll = new THREE.Group();

      // Faded tattered frock skirt & wooden bodice (seated on floor)
      const skirt = new THREE.Mesh(dollSkirtGeo, dressMat);
      skirt.position.set(0, 0.11, 0);
      const torso = new THREE.Mesh(dollTorsoGeo, dressMat);
      torso.position.set(0, 0.28, -0.01);
      torso.rotation.x = 0.08;
      const collar = new THREE.Mesh(dollCollarGeo, dustyLinenMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, 0.39, -0.005);
      doll.add(skirt, torso, collar);

      // Extended jointed wooden legs & dark button shoes sticking forward
      [-0.062, 0.062].forEach((lx, sideIdx) => {
        const leg = new THREE.Mesh(dollLimbGeo, porcelainMat);
        leg.rotation.x = Math.PI / 2 - 0.12;
        leg.rotation.z = sideIdx === 0 ? 0.16 : -0.14;
        leg.position.set(lx, 0.055, 0.15);
        const shoe = new THREE.Mesh(dollFootGeo, hollowEyeMat);
        shoe.position.set(lx * 1.18, 0.045, 0.255);
        shoe.rotation.y = sideIdx === 0 ? 0.2 : -0.22;
        doll.add(leg, shoe);
      });

      // Jointed wooden arms (one slumped, one unnaturally crooked)
      const leftArm = new THREE.Mesh(dollLimbGeo, porcelainMat);
      leftArm.position.set(-0.11, 0.26, 0.03);
      leftArm.rotation.z = 0.32;
      leftArm.rotation.x = -0.25;
      const leftHand = new THREE.Mesh(dollHandGeo, porcelainMat);
      leftHand.position.set(-0.145, 0.17, 0.065);

      const rightArm = new THREE.Mesh(dollLimbGeo, porcelainMat);
      rightArm.position.set(0.11, 0.27 + armRaise * 0.05, 0.045);
      rightArm.rotation.z = -0.28 - armRaise * 0.25;
      rightArm.rotation.x = -0.55 - armRaise * 0.45;
      const rightHand = new THREE.Mesh(dollHandGeo, porcelainMat);
      rightHand.position.set(
        0.145 + armRaise * 0.02,
        0.21 + armRaise * 0.11,
        0.115 + armRaise * 0.05,
      );
      doll.add(leftArm, leftHand, rightArm, rightHand);

      // Unsettlingly tilted cracked porcelain head with dark hollow eyes & tangled hair
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 0.48, 0.005);
      headGroup.rotation.set(headTiltX, 0, headTiltZ);

      const skull = new THREE.Mesh(dollHeadGeo, porcelainMat);
      skull.scale.set(0.95, 1.08, 0.96);
      headGroup.add(skull);

      // Hollow dark eyes + dark stitched mouth + hairline crack on cheek
      [-0.032, 0.032].forEach((ex) => {
        const eye = new THREE.Mesh(dollEyeGeo, hollowEyeMat);
        eye.position.set(ex, 0.012, 0.078);
        headGroup.add(eye);
      });
      const mouth = new THREE.Mesh(dollMouthGeo, hollowEyeMat);
      mouth.position.set(0, -0.036, 0.079);
      mouth.rotation.z = 0.12;
      const cheekCrack = new THREE.Mesh(dollCrackGeo, hollowEyeMat);
      cheekCrack.position.set(0.042, -0.012, 0.074);
      cheekCrack.rotation.z = -0.38;
      headGroup.add(mouth, cheekCrack);

      // Tangled dark hair cap & hanging side locks
      const hairCap = new THREE.Mesh(dollHairCapGeo, dollHairMat);
      hairCap.position.set(0, 0.012, -0.006);
      hairCap.rotation.x = -0.18;
      headGroup.add(hairCap);
      [-0.074, -0.052, 0.052, 0.074].forEach((hx, hi) => {
        const lock = new THREE.Mesh(dollHairLockGeo, dollHairMat);
        lock.position.set(hx, -0.042, hi === 0 || hi === 3 ? -0.01 : 0.018);
        lock.rotation.z = hx < 0 ? 0.16 : -0.16;
        headGroup.add(lock);
      });

      doll.add(headGroup);
      return doll;
    };

    // Shared geometries for weathered antique wooden rocking cradles (Palna)
    const cradleRockerGeo = new THREE.TorusGeometry(
      0.56,
      0.028,
      7,
      16,
      Math.PI * 0.56,
    );
    const cradleBaseGeo = new THREE.BoxGeometry(0.62, 0.05, 1.08);
    const cradleEndBoardGeo = new THREE.BoxGeometry(0.64, 0.44, 0.05);
    const cradleRailGeo = new THREE.BoxGeometry(0.045, 0.045, 1.08);
    const cradleSlatGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.34, 6);
    const cradlePostGeo = new THREE.CylinderGeometry(0.026, 0.028, 0.62, 7);
    const cradleFinialGeo = new THREE.SphereGeometry(0.04, 8, 7);
    const cradleBlanketGeo = new THREE.BoxGeometry(0.54, 0.065, 0.84);
    const cradlePillowGeo = new THREE.BoxGeometry(0.42, 0.08, 0.22);

    const addVintageWoodenCradle = (
      cx: number,
      cy: number,
      cz: number,
      rotY: number,
      withSlumpedDoll: boolean,
    ) => {
      const cradle = new THREE.Group();
      cradle.position.set(cx, cy, cz);
      cradle.rotation.y = rotY;
      // Subtle eerie crooked rock tilt
      cradle.rotation.z = withSlumpedDoll ? 0.07 : -0.06;

      // Curved wooden rockers underneath both ends
      [-0.44, 0.44].forEach((rz) => {
        const rocker = new THREE.Mesh(cradleRockerGeo, darkTeakMat);
        rocker.rotation.z = Math.PI + Math.PI * 0.22;
        rocker.position.set(0, 0.58, rz);
        cradle.add(rocker);
      });

      // Floorboard, solid carved head/footboards & slatted side rails
      const floorBoard = new THREE.Mesh(cradleBaseGeo, woodMat);
      floorBoard.position.y = 0.21;
      const headBoard = new THREE.Mesh(cradleEndBoardGeo, darkTeakMat);
      headBoard.position.set(0, 0.43, -0.52);
      const footBoard = new THREE.Mesh(cradleEndBoardGeo, darkTeakMat);
      footBoard.position.set(0, 0.41, 0.52);
      cradle.add(floorBoard, headBoard, footBoard);

      [-0.295, 0.295].forEach((sx) => {
        const topRail = new THREE.Mesh(cradleRailGeo, darkTeakMat);
        topRail.position.set(sx, 0.57, 0);
        cradle.add(topRail);
        for (let s = -3; s <= 3; s++) {
          const slat = new THREE.Mesh(cradleSlatGeo, woodMat);
          slat.position.set(sx, 0.39, s * 0.135);
          cradle.add(slat);
        }
      });

      // Four turned wooden corner posts with finials
      for (const px of [-0.3, 0.3]) {
        for (const pz of [-0.52, 0.52]) {
          const post = new THREE.Mesh(cradlePostGeo, darkTeakMat);
          post.position.set(px, 0.38, pz);
          const finial = new THREE.Mesh(cradleFinialGeo, brassMat);
          finial.position.set(px, 0.71, pz);
          cradle.add(post, finial);
        }
      }

      // Aged stained linen pillow & crumpled tattered blanket
      const pillow = new THREE.Mesh(cradlePillowGeo, dustyLinenMat);
      pillow.position.set(0, 0.275, -0.34);
      pillow.rotation.x = 0.12;
      const blanket = new THREE.Mesh(
        cradleBlanketGeo,
        withSlumpedDoll ? crimsonVelvetMat : dustyLinenMat,
      );
      blanket.position.set(0.01, 0.265, 0.08);
      blanket.rotation.y = 0.05;
      cradle.add(pillow, blanket);

      if (withSlumpedDoll) {
        const cribDoll = buildSpookyVintageDoll(fadedDressMat, -0.36, 0.25, 0.65);
        cribDoll.scale.setScalar(0.84);
        cribDoll.position.set(0.02, 0.25, -0.14);
        cribDoll.rotation.set(-0.92, 0.22, 0.12);
        cradle.add(cribDoll);
      }

      root.add(cradle);
    };

    // Eerie vintage wooden/porcelain dolls seated along the North display shelf edge (facing into room)
    const northDolls: Array<{
      x: number;
      z: number;
      rotY: number;
      dress: THREE.MeshStandardMaterial;
      tiltZ: number;
      tiltX: number;
      arm: number;
      scale: number;
    }> = [
      {
        x: 15.55,
        z: -17.65,
        rotY: 0.26,
        dress: crimsonVelvetMat,
        tiltZ: 0.34,
        tiltX: 0.12,
        arm: 0.2,
        scale: 1.02,
      },
      {
        x: 17.5,
        z: -17.58,
        rotY: -0.08,
        dress: fadedDressMat,
        tiltZ: -0.28,
        tiltX: 0.18,
        arm: 0.85,
        scale: 1.08,
      },
      {
        x: 19.45,
        z: -17.68,
        rotY: -0.34,
        dress: saffronSilkMat,
        tiltZ: 0.24,
        tiltX: -0.06,
        arm: 0.4,
        scale: 0.96,
      },
    ];
    northDolls.forEach((cfg) => {
      const doll = buildSpookyVintageDoll(
        cfg.dress,
        cfg.tiltZ,
        cfg.tiltX,
        cfg.arm,
      );
      doll.position.set(cfg.x, 10.0, cfg.z);
      doll.rotation.y = cfg.rotY;
      doll.scale.setScalar(cfg.scale);
      root.add(doll);
    });

    // Two weathered vintage wooden rocking cradles along the South perimeter (keeping doorway & hiding chest clear)
    addVintageWoodenCradle(16.1, 10.0, -6.55, Math.PI * 0.5 + 0.18, true);
    addVintageWoodenCradle(19.15, 10.0, -6.65, Math.PI * 0.5 - 0.24, false);

    // One crooked vintage porcelain doll slumped eerily beside the second cradle
    const southDoll = buildSpookyVintageDoll(crimsonVelvetMat, -0.4, 0.15, 0.7);
    southDoll.position.set(17.7, 10.0, -6.42);
    southDoll.rotation.y = Math.PI + 0.22;
    southDoll.scale.setScalar(0.95);
    root.add(southDoll);

    // Vintage carved wooden rocking horse in room center (clear of doorway x=11 and hiding chest x=21.6)
    const horse = new THREE.Group();
    horse.position.set(17.2, 10.0, -12.0);
    horse.rotation.y = 0.42;
    const hBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.17, 0.82, 10),
      woodMat,
    );
    hBody.rotation.x = Math.PI / 2;
    hBody.position.y = 0.62;
    const hSaddle = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.08, 0.34),
      crimsonVelvetMat,
    );
    hSaddle.position.set(0, 0.76, -0.02);
    const hNeck = new THREE.Mesh(
      new THREE.BoxGeometry(0.17, 0.42, 0.2),
      woodMat,
    );
    hNeck.position.set(0, 0.88, 0.34);
    hNeck.rotation.x = 0.36;
    const hHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.18, 0.32),
      woodMat,
    );
    hHead.position.set(0, 1.04, 0.49);
    hHead.rotation.x = 0.42;
    const hLegGeo = new THREE.CylinderGeometry(0.032, 0.026, 0.54, 7);
    for (const [lx, lz, rx] of [
      [-0.12, 0.28, -0.22],
      [0.12, 0.28, -0.22],
      [-0.12, -0.28, 0.22],
      [0.12, -0.28, 0.22],
    ]) {
      const leg = new THREE.Mesh(hLegGeo, darkTeakMat);
      leg.position.set(lx, 0.34, lz);
      leg.rotation.x = rx;
      horse.add(leg);
    }
    const hRockerGeo = new THREE.TorusGeometry(
      0.86,
      0.032,
      7,
      18,
      Math.PI * 0.48,
    );
    [-0.18, 0.18].forEach((rx) => {
      const hRocker = new THREE.Mesh(hRockerGeo, darkTeakMat);
      hRocker.rotation.y = Math.PI / 2;
      hRocker.rotation.z = Math.PI + Math.PI * 0.26;
      hRocker.position.set(rx, 0.89, 0);
      horse.add(hRocker);
    });
    horse.add(hBody, hSaddle, hNeck, hHead);
    root.add(horse);
  }

  // ==========================================================================
  // 10. 3F-7: ATTIC STORE 2 (FRONT SUITE) — x in [-11, 0], z in [5.8, 10], y = 10.0
  // ==========================================================================
  {
    [
      [-7.2, 10.39, 8.95, 0.12],
      [-6.0, 10.39, 9.0, -0.18],
      [-6.6, 11.17, 8.95, 0.25],
      [-2.2, 10.39, 8.85, 0.08],
    ].forEach(([cx, cy, cz, ry]) => {
      const crate = new THREE.Mesh(crateGeo, woodMat);
      crate.position.set(cx, cy, cz);
      crate.rotation.y = ry;
      root.add(crate);
    });
    const dustyTrunk = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.72, 0.85),
      darkTeakMat,
    );
    dustyTrunk.position.set(-1.5, 10.36, 7.2);
    const drape = new THREE.Mesh(
      new THREE.BoxGeometry(1.56, 0.08, 0.92),
      curtainMat,
    );
    drape.position.set(-1.5, 10.74, 7.2);
    root.add(dustyTrunk, drape);
  }

  // ==========================================================================
  // 11. 3F-8: FRONT WATCHTOWER ROOM — x in [0, 11], z in [5.8, 10], y = 10.0
  // ==========================================================================
  {
    // Stone sentry lookout map table facing the front courtyard road
    const mapTable = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.88, 1.05),
      stoneFloorMat,
    );
    mapTable.position.set(4.8, 10.44, 8.85);
    const mapSheet = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.03, 0.72),
      parchmentMat,
    );
    mapSheet.position.set(4.8, 10.9, 8.85);
    const spyglass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.055, 0.62, 8),
      brassMat,
    );
    spyglass.rotation.z = Math.PI / 2;
    spyglass.rotation.y = 0.35;
    spyglass.position.set(5.4, 10.95, 8.7);
    root.add(mapTable, mapSheet, spyglass);

    // Watchman brass signaling gong suspended in carved teak frame
    const gongGroup = new THREE.Group();
    gongGroup.position.set(1.9, 10.0, 8.8);
    [-0.58, 0.58].forEach((gx) => {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 1.82, 0.1),
        darkTeakMat,
      );
      post.position.set(gx, 0.91, 0);
      gongGroup.add(post);
    });
    const topBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.32, 0.12, 0.14),
      darkTeakMat,
    );
    topBar.position.y = 1.82;
    const gongDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.06, 16),
      brassMat,
    );
    gongDisc.rotation.x = Math.PI / 2;
    gongDisc.position.y = 1.15;
    gongGroup.add(topBar, gongDisc);
    root.add(gongGroup);
  }
}
