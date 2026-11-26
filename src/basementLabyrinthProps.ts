import * as THREE from 'three';

export interface BasementLabyrinthPropsInput {
  root: THREE.Group;
  stoneFloorMat: THREE.Material;
  carvedSandstoneMat: THREE.Material;
  woodMat: THREE.Material;
  ironMat: THREE.Material;
  brassMat: THREE.Material;
  copperMat: THREE.Material;
  dripParticles: THREE.Mesh[];
  disableExtraLights?: boolean;
}

function createCobwebTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  // Radial web anchored at top-left corner (0, 0)
  ctx.strokeStyle = 'rgba(215, 220, 228, 0.58)';
  ctx.lineWidth = 1.6;
  const spokes = 8;
  for (let i = 0; i <= spokes; i++) {
    const angle = (i / spokes) * (Math.PI * 0.5);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * 248, Math.sin(angle) * 248);
    ctx.stroke();
  }

  ctx.lineWidth = 1.1;
  ctx.strokeStyle = 'rgba(205, 210, 220, 0.44)';
  for (let r = 28; r <= 230; r += 26) {
    ctx.beginPath();
    for (let i = 0; i <= spokes; i++) {
      const angle = (i / spokes) * (Math.PI * 0.5);
      const sag = i % 2 === 1 ? 0.91 : 1.0;
      const px = Math.cos(angle) * r * sag;
      const py = Math.sin(angle) * r * sag;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createStairsReturnPlaqueTexture(
  line1: string,
  line2: string,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 192;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#1b110a';
  ctx.fillRect(0, 0, 640, 192);

  ctx.strokeStyle = '#e5a94c';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 620, 172);
  ctx.strokeStyle = '#7c4e1c';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, 600, 152);

  ctx.fillStyle = '#ffe29a';
  ctx.font = 'bold 42px "Noto Sans Devanagari", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(line1, 320, 74);

  ctx.fillStyle = '#f5be6b';
  ctx.font = 'bold 26px "Segoe UI", sans-serif';
  ctx.fillText(line2, 320, 134);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Populates the 10-room Underground Stone Labyrinth (y = -4.5m, x in [-28, 28], z in [-68, -30])
 * with room-specific props, corridor arches, procedural cobwebs, dead-end barricades,
 * and a bright return-stairs lantern & Hindi exit signage.
 * All meshes reuse shared geometries & materials for high FPS.
 */
export function buildBasementLabyrinthProps(
  input: BasementLabyrinthPropsInput,
): void {
  const {
    root,
    stoneFloorMat,
    carvedSandstoneMat,
    woodMat,
    ironMat,
    brassMat,
    copperMat,
    dripParticles,
  } = input;

  const Y = -4.5;

  // Shared procedural materials
  const boneMat = new THREE.MeshStandardMaterial({
    color: 0xc9beab,
    roughness: 0.88,
    metalness: 0.04,
  });
  const sackMat = new THREE.MeshStandardMaterial({
    color: 0x765c40,
    roughness: 0.94,
    metalness: 0.02,
  });
  const wetStoneMat = new THREE.MeshStandardMaterial({
    color: 0x2f3636,
    roughness: 0.35,
    metalness: 0.14,
  });
  const mossStoneMat = new THREE.MeshStandardMaterial({
    color: 0x354434,
    roughness: 0.85,
    metalness: 0.05,
  });
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xff4511 });
  const bloodRingMat = new THREE.MeshBasicMaterial({
    color: 0xaa1111,
    side: THREE.DoubleSide,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xdca834,
    emissive: 0x3a2505,
    emissiveIntensity: 0.3,
    roughness: 0.28,
    metalness: 0.84,
  });
  const wellWaterMat = new THREE.MeshStandardMaterial({
    color: 0x0b242c,
    emissive: 0x082a34,
    emissiveIntensity: 0.55,
    roughness: 0.12,
    metalness: 0.45,
  });
  const cobwebMat = new THREE.MeshBasicMaterial({
    map: createCobwebTexture(),
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // Shared primitive geometries
  const barGeo = new THREE.CylinderGeometry(0.03, 0.03, 4.0, 7);
  const chainGeo = new THREE.CylinderGeometry(0.024, 0.024, 2.35, 6);
  const barrelGeo = new THREE.CylinderGeometry(0.46, 0.42, 1.12, 12);
  const sackGeo = new THREE.SphereGeometry(0.44, 10, 8);
  const boulderGeo = new THREE.DodecahedronGeometry(0.75, 0);
  const beamGeo = new THREE.BoxGeometry(0.24, 3.8, 0.24);
  const skullGeo = new THREE.SphereGeometry(0.11, 8, 7);
  const coffinBodyGeo = new THREE.BoxGeometry(1.05, 0.62, 2.15);
  const coffinLidGeo = new THREE.BoxGeometry(1.14, 0.16, 2.24);
  const cobwebGeo = new THREE.PlaneGeometry(1.45, 1.45);
  const archPierGeo = new THREE.BoxGeometry(0.38, 4.1, 0.42);
  const archLintelGeo = new THREE.BoxGeometry(3.85, 0.48, 0.48);
  const pedestalGeo = new THREE.BoxGeometry(0.95, 0.88, 0.95);
  const idolTorsoGeo = new THREE.CylinderGeometry(0.24, 0.34, 1.05, 8);
  const chestBoxGeo = new THREE.BoxGeometry(1.18, 0.62, 0.74);
  const chestTrimGeo = new THREE.BoxGeometry(1.22, 0.11, 0.78);
  const coinMoundGeo = new THREE.ConeGeometry(0.48, 0.28, 10);

  // =========================================================================
  // 1. ROOM U1: काल-कोठरी 1 (Dungeon Cell 1 — x: -13..-2, z: -40..-30)
  //    Trapped friend Dev spawns at (-10.0, -4.5, -34.25) — keep center clear!
  // =========================================================================
  const u1Bench = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.46, 0.72),
    stoneFloorMat,
  );
  u1Bench.position.set(-6.8, Y + 0.23, -30.55);
  root.add(u1Bench);

  const u1CoffinBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.42, 1.8),
    carvedSandstoneMat,
  );
  u1CoffinBase.position.set(-12.2, Y + 0.21, -37.2);
  root.add(u1CoffinBase);

  for (let bar = 0; bar < 6; bar++) {
    const cellBar = new THREE.Mesh(barGeo, ironMat);
    cellBar.position.set(-4.6 - bar * 0.44, Y + 2.0, -30.28);
    root.add(cellBar);
  }
  [
    [-12.6, -33.2],
    [-12.6, -36.5],
    [-7.5, -39.6],
    [-4.2, -39.6],
  ].forEach(([cx, cz]) => {
    const wallChain = new THREE.Mesh(chainGeo, ironMat);
    wallChain.position.set(cx, Y + 2.0, cz);
    root.add(wallChain);
  });

  // =========================================================================
  // 2. ROOM U2: काल-कोठरी 2 (Dungeon Cell 2 — x: -28..-17, z: -40..-30)
  // =========================================================================
  // Inner prison bar cage divider along north half of U2
  for (let b = 0; b < 7; b++) {
    const bar = new THREE.Mesh(barGeo, ironMat);
    bar.position.set(-22.8, Y + 2.0, -39.4 + b * 0.48);
    root.add(bar);
  }
  // Weathered wooden dungeon cot tucked neatly into the NW corner of U2
  const u2CotGroup = new THREE.Group();
  u2CotGroup.position.set(-26.6, Y, -38.85);
  const u2Frame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 0.96), woodMat);
  u2Frame.position.y = 0.36;
  const u2Head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.72, 0.98), woodMat);
  u2Head.position.set(-0.92, 0.44, 0);
  const u2Mat = new THREE.MeshStandardMaterial({ color: 0x3b2c22, roughness: 0.95 });
  const u2Blanket = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.12, 0.86), u2Mat);
  u2Blanket.position.y = 0.48;
  const u2Pillow = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.12, 0.56),
    new THREE.MeshStandardMaterial({ color: 0x4b3b30, roughness: 0.95 }),
  );
  u2Pillow.position.set(-0.68, 0.58, 0);
  u2Pillow.rotation.z = -0.18;
  u2CotGroup.add(u2Frame, u2Head, u2Blanket, u2Pillow);
  for (const [lx, lz] of [
    [-0.86, -0.42],
    [0.86, -0.42],
    [-0.86, 0.42],
    [0.86, 0.42],
  ]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.08), woodMat);
    leg.position.set(lx, 0.18, lz);
    u2CotGroup.add(leg);
  }
  root.add(u2CotGroup);

  // (U2 stone table & clay diyas added in Section 14 below)

  [
    [-27.5, -35.8],
    [-24.2, -39.6],
    [-19.5, -39.6],
  ].forEach(([cx, cz]) => {
    const ch = new THREE.Mesh(chainGeo, ironMat);
    ch.position.set(cx, Y + 2.0, cz);
    root.add(ch);
  });

  // =========================================================================
  // 3. ROOM U3: तांत्रिक हवन कक्ष (Tantrik Ritual Room — x: 2..13, z: -40..-33)
  //    Cursed Relic #1 sits on havanAltar at (10.0, -3.55, -35.5)
  // =========================================================================
  const havanAltar = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 0.85, 1.18),
    carvedSandstoneMat,
  );
  havanAltar.position.set(10.0, Y + 0.425, -35.5);
  root.add(havanAltar);

  const baseKund = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.42, 1.55),
    carvedSandstoneMat,
  );
  baseKund.position.set(6.5, Y + 0.21, -36.5);
  root.add(baseKund);

  const kundEmberBed = new THREE.Mesh(
    new THREE.BoxGeometry(1.08, 0.08, 1.08),
    emberMat,
  );
  kundEmberBed.position.set(6.5, Y + 0.45, -36.5);
  root.add(kundEmberBed);

  const ritualRing = new THREE.Mesh(
    new THREE.RingGeometry(1.25, 1.42, 28),
    bloodRingMat,
  );
  ritualRing.rotation.x = -Math.PI / 2;
  ritualRing.position.set(6.5, Y + 0.025, -36.5);
  root.add(ritualRing);

  // 4 ritual skulls flanking the Havan Kund
  [
    [5.3, -35.3],
    [7.7, -35.3],
    [5.3, -37.7],
    [7.7, -37.7],
  ].forEach(([sx, sz]) => {
    const sk = new THREE.Mesh(skullGeo, boneMat);
    sk.position.set(sx, Y + 0.11, sz);
    root.add(sk);
  });

  // =========================================================================
  // 4. ROOM U4: गुप्त खज़ाना तिजोरी (Secret Gold Vault — x: 13..28, z: -54..-44)
  // =========================================================================
  const tijori = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 2.1, 1.25),
    ironMat,
  );
  tijori.position.set(22.5, Y + 1.05, -52.8);
  root.add(tijori);

  const sealRing = new THREE.Mesh(
    new THREE.RingGeometry(0.26, 0.34, 24),
    bloodRingMat,
  );
  sealRing.position.set(22.5, Y + 1.1, -52.14);
  root.add(sealRing);

  [
    [16.8, -52.6],
    [19.2, -52.6],
    [17.4, -45.3],
    [21.4, -45.3],
  ].forEach(([cx, cz]) => {
    const chest = new THREE.Mesh(chestBoxGeo, woodMat);
    chest.position.set(cx, Y + 0.31, cz);
    const trim = new THREE.Mesh(chestTrimGeo, brassMat);
    trim.position.set(cx, Y + 0.58, cz);
    root.add(chest, trim);
  });

  // Gleaming gold coin heaps on floor inside Secret Gold Vault
  [
    [20.2, -49.2],
    [24.2, -46.2],
    [18.6, -48.6],
  ].forEach(([gx, gz]) => {
    const mound = new THREE.Mesh(coinMoundGeo, goldMat);
    mound.position.set(gx, Y + 0.14, gz);
    root.add(mound);
  });

  // =========================================================================
  // 5. ROOM U5: पुराना तेल व अनाज भंडार (Old Oil & Grain Cellar — x: 17..28, z: -40..-30)
  // =========================================================================
  [
    [19.2, -31.2, true],
    [20.6, -31.2, false],
    [22.1, -31.2, true],
    [20.0, -38.8, false],
    [21.5, -38.8, true],
    [23.2, -38.8, false],
    [26.5, -38.4, true],
  ].forEach(([bx, bz, isCopper]) => {
    const barrel = new THREE.Mesh(barrelGeo, isCopper ? copperMat : woodMat);
    barrel.position.set(Number(bx), Y + 0.56, Number(bz));
    root.add(barrel);
  });

  // Stacked grain sacks along the south-east cellar corner
  [
    [25.8, Y + 0.32, -31.4],
    [26.6, Y + 0.32, -31.4],
    [26.2, Y + 0.32, -32.2],
    [26.2, Y + 0.78, -31.6],
    [24.4, Y + 0.32, -31.3],
  ].forEach(([sx, sy, sz]) => {
    const sack = new THREE.Mesh(sackGeo, sackMat);
    sack.scale.set(1.15, 0.72, 0.92);
    sack.position.set(sx, sy, sz);
    root.add(sack);
  });

  // =========================================================================
  // 6. ROOM U6: ज़ंजीर व यातना कक्ष (Chain & Torture Chamber — x: -28..-13, z: -54..-44)
  // =========================================================================
  // Heavy wooden torture rack table in chamber center
  const rackTop = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.16, 1.15),
    woodMat,
  );
  rackTop.position.set(-20.2, Y + 0.85, -49.0);
  root.add(rackTop);
  [
    [-21.3, -49.45],
    [-19.1, -49.45],
    [-21.3, -48.55],
    [-19.1, -48.55],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.85, 0.14),
      woodMat,
    );
    leg.position.set(lx, Y + 0.425, lz);
    root.add(leg);
  });
  const bloodStain = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 16),
    bloodRingMat,
  );
  bloodStain.rotation.x = -Math.PI / 2;
  bloodStain.position.set(-20.2, Y + 0.02, -49.0);
  root.add(bloodStain);

  // (Articulated hanging rusted chains with hooks for U6 added in Section 14 below)

  // =========================================================================
  // 7. ROOM U7: कुएं की निचली सुरंग (Underground Chamber — x: -9..9, z: -54..-44)
  //    Clean open navigable stone chamber with a flush mossy floor drain grate & shallow puddle
  //    (obstructing curved cylinder shaft completely removed!)
  // =========================================================================
  const drainGroup = new THREE.Group();
  drainGroup.position.set(0, Y, -49.2);
  root.add(drainGroup);

  const floorDrainRim = new THREE.Mesh(
    new THREE.RingGeometry(1.15, 1.55, 20),
    mossStoneMat,
  );
  floorDrainRim.rotation.x = -Math.PI / 2;
  floorDrainRim.position.y = 0.025;
  const floorDrainPool = new THREE.Mesh(
    new THREE.CircleGeometry(1.18, 20),
    wellWaterMat,
  );
  floorDrainPool.rotation.x = -Math.PI / 2;
  floorDrainPool.position.y = 0.02;
  drainGroup.add(floorDrainRim, floorDrainPool);

  // Flush wrought-iron floor grate bars across the shallow drain
  for (let gi = -3; gi <= 3; gi++) {
    const gBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.03, 2.25),
      ironMat,
    );
    gBar.position.set(gi * 0.3, 0.03, 0);
    drainGroup.add(gBar);
  }

  // Mossy support piers flanking the well chamber
  [-5.8, 5.8].forEach((px) => {
    [-46.2, -52.2].forEach((pz) => {
      const pier = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 4.15, 0.75),
        mossStoneMat,
      );
      pier.position.set(px, Y + 2.075, pz);
      root.add(pier);
    });
  });

  // =========================================================================
  // 8. ROOM U8: टूटी मूर्तियों का कक्ष (Broken Idols Room — x: -26..-11, z: -68..-58)
  // =========================================================================
  [
    [-22.2, -66.2, 0.14, true],
    [-18.5, -66.4, -0.22, false],
    [-14.6, -66.2, 0.08, true],
    [-13.0, -61.8, -0.18, false],
  ].forEach(([ix, iz, tilt, hasHead]) => {
    const ped = new THREE.Mesh(pedestalGeo, carvedSandstoneMat);
    ped.position.set(Number(ix), Y + 0.44, Number(iz));
    root.add(ped);

    const torso = new THREE.Mesh(idolTorsoGeo, carvedSandstoneMat);
    torso.position.set(Number(ix), Y + 1.38, Number(iz));
    torso.rotation.z = Number(tilt);
    root.add(torso);

    if (hasHead) {
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 8),
        carvedSandstoneMat,
      );
      head.position.set(Number(ix) + 0.35, Y + 0.2, Number(iz) + 0.75);
      root.add(head);
    }
  });
  // Fallen broken stone statue lying near the center-west
  const fallenStatue = new THREE.Mesh(idolTorsoGeo, mossStoneMat);
  fallenStatue.rotation.z = Math.PI / 2 - 0.12;
  fallenStatue.rotation.y = 0.6;
  fallenStatue.position.set(-19.2, Y + 0.28, -62.5);
  root.add(fallenStatue);

  // =========================================================================
  // 9. ROOM U9: धंसी हुई सुरंग (Collapsed Tunnel Chamber — x: -11..2, z: -68..-58)
  // =========================================================================
  // Massive rockslide boulders piled along the north collapsed tunnel face (z = -66..-67.5)
  [
    [-6.5, Y + 0.65, -66.8, 1.35],
    [-4.8, Y + 0.85, -66.9, 1.55],
    [-3.1, Y + 0.6, -66.7, 1.25],
    [-5.6, Y + 1.55, -67.1, 1.15],
    [-3.9, Y + 1.45, -67.1, 1.05],
    [-1.4, Y + 0.55, -66.4, 1.0],
    [-7.9, Y + 0.48, -66.2, 0.9],
  ].forEach(([rx, ry, rz, sc]) => {
    const rock = new THREE.Mesh(boulderGeo, wetStoneMat);
    rock.position.set(rx, ry, rz);
    rock.scale.setScalar(sc);
    rock.rotation.set(rx * 0.7, rz * 0.4, ry);
    root.add(rock);
  });

  // Cracked & leaning wooden mine-shaft shoring timbers
  [
    [-8.6, -61.5, 0.08],
    [-0.5, -61.5, -0.1],
    [-8.2, -65.0, 0.14],
    [-0.8, -65.0, -0.15],
  ].forEach(([bx, bz, lean]) => {
    const timber = new THREE.Mesh(beamGeo, woodMat);
    timber.position.set(bx, Y + 1.9, bz);
    timber.rotation.z = lean;
    root.add(timber);
  });
  const fallenBeam = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 0.24, 0.24),
    woodMat,
  );
  fallenBeam.position.set(-4.5, Y + 0.45, -64.4);
  fallenBeam.rotation.set(0.1, 0.28, -0.18);
  root.add(fallenBeam);

  // =========================================================================
  // 10. ROOM U10: प्राचीन अस्थि कक्ष (Ancient Crypt — x: 2..16, z: -68..-58)
  // =========================================================================
  // 3 Ancient Stone Sarcophagi arranged in a crypt sanctuary
  [
    [5.4, -65.6],
    [9.2, -65.6],
    [5.4, -61.8],
  ].forEach(([cx, cz]) => {
    const body = new THREE.Mesh(coffinBodyGeo, carvedSandstoneMat);
    body.position.set(cx, Y + 0.31, cz);
    const lid = new THREE.Mesh(coffinLidGeo, stoneFloorMat);
    lid.position.set(cx + 0.05, Y + 0.7, cz);
    lid.rotation.y = 0.04;
    root.add(body, lid);
  });
  // Ossuary skull shelves along the North crypt wall
  for (let i = 0; i < 10; i++) {
    const sk = new THREE.Mesh(skullGeo, boneMat);
    sk.position.set(3.6 + i * 1.15, Y + 1.55 + (i % 2) * 0.45, -67.65);
    root.add(sk);
  }

  // =========================================================================
  // 11. LABYRINTH CORRIDOR STONE ARCHES, COBWEBS & 2 EERIE DEAD-END PASSAGES
  // =========================================================================
  const addCorridorArch = (x: number, z: number, rotateY = 0) => {
    const g = new THREE.Group();
    g.position.set(x, Y, z);
    g.rotation.y = rotateY;
    const leftPier = new THREE.Mesh(archPierGeo, carvedSandstoneMat);
    leftPier.position.set(-1.78, 2.05, 0);
    const rightPier = new THREE.Mesh(archPierGeo, carvedSandstoneMat);
    rightPier.position.set(1.78, 2.05, 0);
    const lintel = new THREE.Mesh(archLintelGeo, carvedSandstoneMat);
    lintel.position.set(0, 3.85, 0);
    g.add(leftPier, rightPier, lintel);
    root.add(g);
  };

  // Stone arches framing corridor twists & crossroads (zero blocking colliders, 3.5m+ wide clearance)
  addCorridorArch(0.0, -33.2, 0); // Central Spine entry arch
  addCorridorArch(0.0, -39.6, 0); // Central Crossroads South arch
  addCorridorArch(-7.5, -42.0, Math.PI / 2); // Mid-Cross West arch
  addCorridorArch(7.5, -42.0, Math.PI / 2); // Mid-Cross East arch
  addCorridorArch(-15.0, -39.6, 0); // West Corridor South T-arch
  addCorridorArch(15.0, -39.6, 0); // East Corridor South T-arch
  addCorridorArch(-11.0, -44.4, 0); // West S-Bend North arch
  addCorridorArch(11.0, -44.4, 0); // East S-Bend North arch
  addCorridorArch(-11.0, -53.6, 0); // West North T-arch
  addCorridorArch(11.0, -53.6, 0); // East North T-arch
  addCorridorArch(0.0, -56.0, Math.PI / 2); // North Cross-Corridor Center arch
  addCorridorArch(-16.0, -56.0, Math.PI / 2); // North Cross-Corridor West arch

  // Procedural cobwebs draped across upper corridor corners & dead ends
  const cobwebPlacements: Array<[number, number, number, number]> = [
    [-1.3, Y + 3.45, -33.2, 0],
    [1.3, Y + 3.45, -39.6, Math.PI],
    [-14.3, Y + 3.45, -30.35, 0],
    [-15.7, Y + 3.45, -30.35, Math.PI * 0.5],
    [14.3, Y + 3.45, -30.35, 0],
    [-10.3, Y + 3.45, -44.4, 0],
    [10.3, Y + 3.45, -44.4, Math.PI],
    [-10.3, Y + 3.45, -53.6, 0],
    [10.3, Y + 3.45, -53.6, Math.PI],
    [19.9, Y + 3.45, -55.2, Math.PI * 0.5],
    [19.9, Y + 3.45, -56.8, -Math.PI * 0.5],
    [-24.8, Y + 3.45, -55.2, -Math.PI * 0.5],
  ];
  for (const [wx, wy, wz, wry] of cobwebPlacements) {
    const web = new THREE.Mesh(cobwebGeo, cobwebMat);
    web.position.set(wx, wy, wz);
    web.rotation.y = wry;
    root.add(web);
  }

  // EERIE DEAD-END #1 (South end of West Corridor: x in [-17, -13], z = -30.4)
  // Rusted iron dungeon portcullis grate & skull warnings
  for (let b = 0; b < 7; b++) {
    const bar = new THREE.Mesh(barGeo, ironMat);
    bar.position.set(-16.5 + b * 0.5, Y + 2.0, -30.35);
    root.add(bar);
  }
  const deadEnd1Skull = new THREE.Mesh(skullGeo, boneMat);
  deadEnd1Skull.position.set(-15.0, Y + 0.12, -30.85);
  root.add(deadEnd1Skull);

  // EERIE DEAD-END #2 (East end of North Cross-Corridor: x = 20.2, z in [-58, -54])
  // Caved-in boulders & shattered wooden shoring timbers blocking the blind passage
  [
    [20.1, Y + 0.65, -55.0, 1.25],
    [20.2, Y + 0.78, -56.4, 1.4],
    [19.8, Y + 0.52, -57.3, 1.0],
    [20.3, Y + 1.5, -55.8, 1.05],
  ].forEach(([rx, ry, rz, sc]) => {
    const rock = new THREE.Mesh(boulderGeo, wetStoneMat);
    rock.position.set(rx, ry, rz);
    rock.scale.setScalar(sc);
    root.add(rock);
  });
  const deadEndBeam = new THREE.Mesh(beamGeo, woodMat);
  deadEndBeam.position.set(19.2, Y + 1.75, -55.2);
  deadEndBeam.rotation.z = 0.25;
  root.add(deadEndBeam);

  // =========================================================================
  // 12. CLEARLY MARKED GLOWING RETURN-STAIRS LANTERN & HINDI EXIT SIGNAGE
  //     Guides players back up to Ground Floor from the maze!
  // =========================================================================
  const exitSignTex = createStairsReturnPlaqueTexture(
    '↑ ऊपर हवेली की सीढ़ियाँ ↑',
    'STAIRS UP TO GROUND FLOOR',
  );
  const exitSignMat = new THREE.MeshStandardMaterial({
    map: exitSignTex,
    emissive: 0x442208,
    emissiveIntensity: 0.55,
    roughness: 0.45,
  });

  // Plaque #1 directly facing the bottom of the basement stairs (mounted on North wall of Stair Foyer z = -32.78)
  const stairPlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(2.3, 0.7),
    exitSignMat,
  );
  stairPlaque.position.set(8.5, Y + 2.85, -32.76);
  root.add(stairPlaque);

  // Plaque #2 visible from the Central Spine Crossroads pointing East to the stairs!
  const arrowSignTex = createStairsReturnPlaqueTexture(
    'बाहर सीढ़ियाँ → (ऊपर भूतल)',
    'EXIT STAIRS UP →',
  );
  const arrowSignMat = new THREE.MeshStandardMaterial({
    map: arrowSignTex,
    emissive: 0x442208,
    emissiveIntensity: 0.55,
    roughness: 0.45,
  });
  const junctionPlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 0.64),
    arrowSignMat,
  );
  junctionPlaque.position.set(2.05, Y + 2.85, -32.76);
  root.add(junctionPlaque);

  // Bright warm-gold Glowing Return Beacon Lantern at the foot of the stairs (x = 7.1, z = -31.1)
  const beaconGroup = new THREE.Group();
  beaconGroup.position.set(6.95, Y + 2.65, -30.25);
  const beaconCage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.14, 0.36, 8),
    ironMat,
  );
  const beaconGlobe = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe48a }),
  );
  beaconGroup.add(beaconCage, beaconGlobe);
  if (!input.disableExtraLights) {
    const beaconLight = new THREE.PointLight(0xffcb66, 4.2, 18, 1.1);
    beaconGroup.add(beaconLight);
  }
  root.add(beaconGroup);

  // =========================================================================
  // 13. DRIPPING SUBTERRANEAN WATER DROPLETS ACROSS THE 10-ROOM LABYRINTH
  // =========================================================================
  const dripMat = new THREE.MeshBasicMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.68,
  });
  const dripGeo = new THREE.SphereGeometry(0.025, 6, 6);
  const dripCoords: Array<[number, number]> = [
    [0.0, -35.0],
    [-15.0, -36.5],
    [15.0, -36.5],
    [-7.5, -42.0],
    [7.5, -42.0],
    [0.0, -46.2],
    [-2.4, -49.2],
    [2.4, -49.2],
    [-11.0, -49.0],
    [11.0, -49.0],
    [-18.5, -56.0],
    [0.0, -56.0],
    [15.0, -56.0],
    [-4.5, -63.0],
    [9.0, -63.0],
    [-20.0, -49.0],
    [20.0, -49.0],
    [-18.5, -63.0],
  ];
  dripCoords.forEach(([dx, dz], idx) => {
    const drop = new THREE.Mesh(dripGeo, dripMat);
    drop.position.set(dx, -0.6 - (idx % 4) * 0.85, dz);
    root.add(drop);
    dripParticles.push(drop);
  });

  // =========================================================================
  // 14. UNDERGROUND 10-ROOM HORROR PROPS (SHARED GEOMETRIES & MATERIALS)
  //     Hanging rusted chains, stone tables, clay diyas, and crumbling crates
  //     Strictly >= 2.0m clear of every doorway, staircase, hiding spot & relic!
  // =========================================================================
  const protectedUndergroundZones: Array<[number, number, number]> = [
    // Doorways & Basement Stair Return Portal
    [-2.0, -35.0, 2.15], // door_u1_kalkothri
    [-17.0, -36.5, 2.15], // door_u2_kalkothri2
    [2.0, -36.5, 2.15], // door_u3_havan
    [13.0, -49.0, 2.15], // door_u4_vault
    [17.0, -35.0, 2.15], // door_u5_cellar
    [-13.0, -49.0, 2.15], // door_u6_torture
    [0.0, -44.0, 2.15], // door_u7_well_shaft
    [-18.5, -58.0, 2.15], // door_u8_idols
    [-4.5, -58.0, 2.15], // door_u9_collapsed
    [9.0, -58.0, 2.15], // door_u10_crypt
    [8.5, -29.8, 2.5], // Basement stair landing

    // All 10 Underground Hiding Spots + Exit Positions
    [-11.8, -31.5, 2.1],
    [-9.7, -31.5, 2.1], // U1
    [-26.3, -32.2, 2.1],
    [-24.1, -32.2, 2.1], // U2
    [11.8, -38.4, 2.1],
    [9.7, -38.4, 2.1], // U3
    [26.8, -49.0, 2.1],
    [24.6, -49.0, 2.1], // U4
    [25.6, -35.0, 2.1],
    [23.4, -35.0, 2.1], // U5
    [-26.3, -49.0, 2.1],
    [-24.1, -49.0, 2.1], // U6
    [7.8, -49.0, 2.1],
    [5.6, -49.0, 2.1], // U7
    [-24.8, -63.0, 2.1],
    [-22.6, -63.0, 2.1], // U8
    [-9.2, -65.2, 2.1],
    [-7.0, -65.2, 2.1], // U9
    [14.8, -63.0, 2.1],
    [12.6, -63.0, 2.1], // U10

    // Trapped Friend Dev (U1) & Relic #1 Pedestal (U3) & Well Shaft (U7)
    [-10.0, -34.25, 2.15],
    [10.0, -35.5, 1.85],
    [0.0, -49.2, 3.3],
  ];

  const isUndergroundClear = (x: number, z: number, margin = 0): boolean => {
    for (const [px, pz, rad] of protectedUndergroundZones) {
      if (Math.hypot(x - px, z - pz) < rad + margin) return false;
    }
    return true;
  };

  // Shared materials for underground props (zero extra dynamic PointLights for smooth FPS)
  const rustedChainMat = new THREE.MeshStandardMaterial({
    color: 0x4b2618,
    roughness: 0.86,
    metalness: 0.68,
  });
  const weatheredTableStoneMat = new THREE.MeshStandardMaterial({
    color: 0x48433d,
    roughness: 0.9,
    metalness: 0.06,
  });
  const terracottaDiyaMat = new THREE.MeshStandardMaterial({
    color: 0x9b4d2b,
    roughness: 0.88,
    metalness: 0.04,
  });
  const diyaOilMat = new THREE.MeshStandardMaterial({
    color: 0x1a120a,
    roughness: 0.25,
  });
  const diyaFlameMat = new THREE.MeshBasicMaterial({ color: 0xffb838 });
  const diyaHaloMat = new THREE.MeshBasicMaterial({
    color: 0xff8c1a,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const crumblingWoodMat = new THREE.MeshStandardMaterial({
    color: 0x4a301c,
    roughness: 0.94,
    metalness: 0.03,
  });

  // Shared lightweight geometries
  const anchorRingGeo = new THREE.TorusGeometry(0.09, 0.022, 6, 10);
  const linkGeo = new THREE.TorusGeometry(0.052, 0.015, 5, 8);
  const shackleGeo = new THREE.TorusGeometry(0.085, 0.018, 6, 10, Math.PI * 1.45);
  const stoneSlabGeo = new THREE.BoxGeometry(1.75, 0.14, 0.86);
  const stoneLegGeo = new THREE.BoxGeometry(0.24, 0.78, 0.68);
  const diyaBowlGeo = new THREE.CylinderGeometry(0.085, 0.048, 0.045, 9);
  const diyaOilGeo = new THREE.CircleGeometry(0.068, 8);
  const diyaFlameGeo = new THREE.ConeGeometry(0.022, 0.075, 6);
  const diyaHaloGeo = new THREE.SphereGeometry(0.085, 6, 6);
  const cratePanelGeo = new THREE.BoxGeometry(0.76, 0.64, 0.05);
  const crateSlatGeo = new THREE.BoxGeometry(0.72, 0.045, 0.14);
  const cratePostGeo = new THREE.BoxGeometry(0.07, 0.66, 0.07);

  /** Articulated hanging rusted chain with ceiling ring, alternating links & rusted dungeon hook */
  const addHangingRustedChain = (
    x: number,
    z: number,
    linksCount = 14,
  ) => {
    if (!isUndergroundClear(x, z, 0.1)) return;
    const cg = new THREE.Group();
    cg.position.set(x, Y + 4.1, z);

    const anchor = new THREE.Mesh(anchorRingGeo, rustedChainMat);
    anchor.position.y = -0.05;
    cg.add(anchor);

    const linkStep = 0.085;
    for (let i = 0; i < linksCount; i++) {
      const lk = new THREE.Mesh(linkGeo, rustedChainMat);
      lk.position.y = -0.14 - i * linkStep;
      lk.rotation.y = (i % 2) * (Math.PI / 2);
      cg.add(lk);
    }

    const hook = new THREE.Mesh(shackleGeo, rustedChainMat);
    hook.position.y = -0.18 - linksCount * linkStep;
    hook.rotation.z = Math.PI * 0.65;
    cg.add(hook);

    root.add(cg);
  };

  /** Terracotta clay diya with dark oil pool & glowing warm flame (zero extra PointLights) */
  const addClayDiya = (x: number, y: number, z: number, lit = true) => {
    const dg = new THREE.Group();
    dg.position.set(x, y, z);

    const bowl = new THREE.Mesh(diyaBowlGeo, terracottaDiyaMat);
    bowl.position.y = 0.022;
    const oil = new THREE.Mesh(diyaOilGeo, diyaOilMat);
    oil.rotation.x = -Math.PI / 2;
    oil.position.y = 0.045;
    dg.add(bowl, oil);

    if (lit) {
      const flame = new THREE.Mesh(diyaFlameGeo, diyaFlameMat);
      flame.position.set(0.04, 0.085, 0);
      const halo = new THREE.Mesh(diyaHaloGeo, diyaHaloMat);
      halo.position.set(0.04, 0.095, 0);
      dg.add(flame, halo);
    }

    root.add(dg);
  };

  /** Heavy carved stone table topped with glowing clay diyas & optional skull */
  const addStoneTable = (
    x: number,
    z: number,
    rotY: number,
    withSkull = false,
  ) => {
    if (!isUndergroundClear(x, z, 0.45)) return;
    const tg = new THREE.Group();
    tg.position.set(x, Y, z);
    tg.rotation.y = rotY;

    const slab = new THREE.Mesh(stoneSlabGeo, weatheredTableStoneMat);
    slab.position.y = 0.85;
    const legL = new THREE.Mesh(stoneLegGeo, carvedSandstoneMat);
    legL.position.set(-0.62, 0.39, 0);
    const legR = new THREE.Mesh(stoneLegGeo, carvedSandstoneMat);
    legR.position.set(0.62, 0.39, 0);
    tg.add(slab, legL, legR);

    if (withSkull) {
      const sk = new THREE.Mesh(skullGeo, boneMat);
      sk.position.set(0.32, 1.03, -0.08);
      sk.rotation.y = -0.45;
      tg.add(sk);
    }

    root.add(tg);

    // Pair of clay diyas resting cleanly atop the stone slab
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    [
      [-0.54, 0.16, true],
      [-0.36, -0.14, true],
      [0.52, 0.12, !withSkull],
    ].forEach(([lx, lz, lit]) => {
      const wx = x + Number(lx) * cos + Number(lz) * sin;
      const wz = z - Number(lx) * sin + Number(lz) * cos;
      addClayDiya(wx, Y + 0.92, wz, Boolean(lit));
    });
  };

  /** Crumbling weathered wooden crate with crooked slats & fallen lid planks */
  const addCrumblingCrate = (
    x: number,
    z: number,
    rotY: number,
    scale = 1.0,
  ) => {
    if (!isUndergroundClear(x, z, 0.35)) return;
    const cg = new THREE.Group();
    cg.position.set(x, Y, z);
    cg.rotation.y = rotY;
    cg.scale.setScalar(scale);

    // Corner uprights (one sagging crookedly)
    [
      [-0.35, -0.35, 0],
      [0.35, -0.35, 0.04],
      [-0.35, 0.35, -0.05],
      [0.35, 0.35, 0.14],
    ].forEach(([px, pz, tilt]) => {
      const post = new THREE.Mesh(cratePostGeo, crumblingWoodMat);
      post.position.set(px, 0.33, pz);
      post.rotation.z = tilt;
      cg.add(post);
    });

    // Side panels (front panel broken/tilted outward)
    const backP = new THREE.Mesh(cratePanelGeo, crumblingWoodMat);
    backP.position.set(0, 0.32, -0.35);
    const leftP = new THREE.Mesh(cratePanelGeo, crumblingWoodMat);
    leftP.rotation.y = Math.PI / 2;
    leftP.position.set(-0.35, 0.32, 0);
    const rightP = new THREE.Mesh(cratePanelGeo, crumblingWoodMat);
    rightP.rotation.y = Math.PI / 2;
    rightP.rotation.z = -0.11;
    rightP.position.set(0.36, 0.31, 0);
    cg.add(backP, leftP, rightP);

    // Half-collapsed lid planks & fallen splinter on floor
    const lid1 = new THREE.Mesh(crateSlatGeo, crumblingWoodMat);
    lid1.position.set(0, 0.65, -0.16);
    lid1.rotation.y = 0.08;
    const lid2 = new THREE.Mesh(crateSlatGeo, crumblingWoodMat);
    lid2.position.set(0.08, 0.44, 0.24);
    lid2.rotation.set(0.38, -0.22, -0.45);
    const fallenSlat = new THREE.Mesh(crateSlatGeo, crumblingWoodMat);
    fallenSlat.position.set(0.28, 0.025, 0.56);
    fallenSlat.rotation.y = 0.52;
    cg.add(lid1, lid2, fallenSlat);

    root.add(cg);
  };

  // --- Stone Tables across all 10 Underground Rooms (U1–U10) ---
  const stoneTableSpecs: Array<[number, number, number, boolean]> = [
    [-6.5, -38.9, 0, true], // U1: Dungeon Cell 1 (North wall, clear of Dev & door)
    [-19.6, -31.1, 0, false], // U2: Dungeon Cell 2 (South wall, clear of cage & door)
    [6.5, -33.7, 0, true], // U3: Tantrik Ritual Room (South wall, clear of Havan & Relic #1)
    [19.8, -45.2, 0, false], // U4: Secret Gold Vault (South wall, clear of Vault & Niche)
    [22.9, -31.2, 0, false], // U5: Old Oil & Grain Cellar (South wall, clear of Barrel)
    [-20.0, -53.1, 0, true], // U6: Chain & Torture Chamber (North wall, clear of Cage & Rack)
    [-7.6, -49.0, Math.PI / 2, false], // U7: Underground Well Shaft Room (West wall, clear of Well)
    [-12.4, -65.8, Math.PI / 2, true], // U8: Broken Idols Room (East wall, clear of Idols)
    [0.6, -63.0, Math.PI / 2, false], // U9: Collapsed Tunnel Chamber (East wall, clear of Barrel)
    [3.4, -59.6, Math.PI / 2, true], // U10: Ancient Crypt (West wall, clear of Sarcophagi)
  ];
  stoneTableSpecs.forEach(([tx, tz, ry, sk]) => addStoneTable(tx, tz, ry, sk));

  // --- Crumbling Crates tucked into safe room corners across U1–U10 ---
  const crumblingCrateSpecs: Array<[number, number, number, number]> = [
    [-3.5, -38.9, 0.2, 0.95], // U1 NE corner
    [-4.5, -38.8, -0.35, 0.82], // U1 North wall
    [-24.6, -38.9, 0.15, 0.95], // U2 NW corner
    [-19.2, -39.0, -0.25, 0.88], // U2 NE corner
    [11.6, -33.8, 0.3, 0.85], // U3 SE corner
    [14.6, -52.8, 0.18, 0.98], // U4 NW corner
    [26.2, -52.8, -0.28, 0.92], // U4 NE corner
    [18.6, -38.8, 0.22, 0.95], // U5 NW corner
    [26.8, -38.8, -0.18, 0.86], // U5 NE corner
    [-14.6, -52.8, 0.26, 0.92], // U6 NE corner
    [-14.6, -45.2, -0.15, 0.88], // U6 SE corner
    [-7.8, -52.8, 0.2, 0.92], // U7 NW corner
    [-7.8, -45.2, -0.3, 0.86], // U7 SW corner
    [-12.4, -59.6, 0.14, 0.92], // U8 SE corner
    [-24.4, -59.4, -0.24, 0.88], // U8 SW corner
    [0.6, -59.6, 0.32, 0.9], // U9 SE corner
    [-9.8, -59.6, -0.2, 0.86], // U9 SW corner
    [3.4, -66.8, 0.24, 0.94], // U10 NW corner
    [14.4, -66.8, -0.22, 0.88], // U10 NE corner
  ];
  crumblingCrateSpecs.forEach(([cx, cz, ry, sc]) =>
    addCrumblingCrate(cx, cz, ry, sc),
  );

  // --- Hanging Rusted Chains with hooks across all 10 chambers ---
  const hangingChainSpecs: Array<[number, number, number]> = [
    [-12.2, -38.8, 15],
    [-3.2, -31.2, 13], // U1
    [-27.2, -38.8, 15],
    [-18.2, -31.0, 12], // U2
    [3.2, -33.8, 13],
    [12.2, -33.8, 14], // U3
    [14.4, -45.0, 13],
    [26.8, -45.0, 15],
    [26.8, -53.0, 14], // U4
    [18.2, -31.0, 13],
    [27.0, -31.0, 14],
    [27.0, -39.0, 13], // U5
    [-17.2, -46.2, 16],
    [-17.2, -51.8, 17],
    [-23.5, -45.2, 15],
    [-23.5, -52.8, 16], // U6
    [-8.0, -44.8, 14],
    [-8.0, -53.2, 15],
    [7.8, -44.8, 13],
    [7.8, -53.2, 14], // U7
    [-24.8, -59.0, 15],
    [-12.0, -59.0, 14],
    [-12.0, -67.0, 15], // U8
    [-10.0, -59.0, 14],
    [1.0, -59.0, 13],
    [1.0, -66.8, 15], // U9
    [3.0, -59.0, 14],
    [14.8, -59.0, 15],
    [14.8, -67.0, 16], // U10
  ];
  hangingChainSpecs.forEach(([hx, hz, links]) =>
    addHangingRustedChain(hx, hz, links),
  );

  // --- Additional Atmospheric Clay Diya Clusters (on ledges, altars, sarcophagi & floor corners) ---
  const extraDiyaSpecs: Array<[number, number, number, boolean]> = [
    [-6.2, Y + 0.46, -30.55, true], // U1 stone bench
    [-7.3, Y + 0.46, -30.55, true],
    [-21.4, Y, -39.1, true], // U2 north wall corner
    [5.6, Y, -35.6, true], // U3 flanking Havan Kund
    [7.4, Y, -35.6, true],
    [5.6, Y, -37.4, true],
    [7.4, Y, -37.4, true],
    [21.2, Y, -52.4, true], // U4 beside iron Tijori safe
    [23.8, Y, -52.4, true],
    [20.6, Y + 1.12, -31.2, true], // U5 atop oil barrel
    [-20.0, Y, -44.9, true], // U6 south wall edge
    [-5.8, Y, -45.6, true], // U7 near well chamber stone pier
    [-18.5, Y, -65.4, true], // U8 before broken idol pedestal
    [-14.6, Y, -65.3, true],
    [-0.5, Y, -61.9, true], // U9 beside shoring beam
    [5.4, Y + 0.78, -64.8, true], // U10 atop ancient sarcophagi
    [9.2, Y + 0.78, -64.8, true],
  ];
  extraDiyaSpecs.forEach(([dx, dy, dz, lit]) => {
    if (isUndergroundClear(dx, dz, 0.0)) {
      addClayDiya(dx, dy, dz, lit);
    }
  });
}

