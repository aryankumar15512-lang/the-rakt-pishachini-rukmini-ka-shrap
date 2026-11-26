import * as THREE from 'three';
import {
  attachProximityGlow,
  ProximityGlowHandle,
} from './itemProximityGlow.ts';

export type JailKeyId = 'kabir_jail_key' | 'riya_jail_key' | 'dev_jail_key';

export interface RustedIronJailCellBuild {
  cageGroup: THREE.Group;
  gatePivot: THREE.Group;
  padlockGroup: THREE.Group;
  gateOpenAngle: number;
}

export interface GlowingNamedKeyBuild {
  group: THREE.Group;
  proximityGlow: ProximityGlowHandle;
  light?: THREE.PointLight;
}

/**
 * Builds a spooky weathered rusted iron-bar Jail Cell (लोहे की जेल)
 * sized 2.1m (W) x 2.85m (H) x 2.1m (D), designed to sit neatly in a room corner.
 * Local coordinates:
 *   - Back wall at z = -1.05
 *   - Left/Right walls at x = -1.05 / +1.05
 *   - Front iron wall + hinged swinging locked gate at z = +1.05 (facing +Z)
 *   - Trapped friend stands comfortably at local (0, 0, -0.1) facing +Z toward the bars.
 */
export function buildRustedIronJailCell(options: {
  friendNameHi: string;
  friendNameEn: string;
  accentHex?: number;
}): RustedIronJailCellBuild {
  const cageGroup = new THREE.Group();
  cageGroup.name = `IronJailCell_${options.friendNameEn}`;

  const W = 2.1;
  const D = 2.1;
  const H = 2.85;
  const halfW = W / 2;
  const halfD = D / 2;

  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x26201e,
    roughness: 0.78,
    metalness: 0.82,
  });
  const rustedIronMat = new THREE.MeshStandardMaterial({
    color: 0x4b2a1b,
    roughness: 0.86,
    metalness: 0.66,
  });
  const heavyRustMat = new THREE.MeshStandardMaterial({
    color: 0x623118,
    roughness: 0.9,
    metalness: 0.52,
  });
  const cellCurbStoneMat = new THREE.MeshStandardMaterial({
    color: 0x2a2523,
    roughness: 0.94,
    metalness: 0.08,
  });
  const padlockBrassMat = new THREE.MeshStandardMaterial({
    color: 0x8e6b32,
    emissive: options.accentHex ?? 0x4a2408,
    emissiveIntensity: 0.28,
    roughness: 0.45,
    metalness: 0.78,
  });

  // 1. Low weathered dark stone plinth / cell curb border
  const curbFloor = new THREE.Mesh(
    new THREE.BoxGeometry(W + 0.12, 0.08, D + 0.12),
    cellCurbStoneMat,
  );
  curbFloor.position.set(0, 0.04, 0);
  curbFloor.receiveShadow = true;
  cageGroup.add(curbFloor);

  // 2. Four heavy bolted corner iron posts
  const cornerPostGeo = new THREE.BoxGeometry(0.11, H, 0.11);
  const cornerCoords: Array<[number, number]> = [
    [-halfW, -halfD],
    [halfW, -halfD],
    [-halfW, halfD],
    [halfW, halfD],
  ];
  for (const [cx, cz] of cornerCoords) {
    const post = new THREE.Mesh(cornerPostGeo, darkIronMat);
    post.position.set(cx, H / 2, cz);
    post.castShadow = true;
    cageGroup.add(post);

    // Decorative rusted iron finial cap on top of each corner post
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.08, 0.16),
      rustedIronMat,
    );
    cap.position.set(cx, H + 0.04, cz);
    cageGroup.add(cap);
  }

  // 3. Top & bottom horizontal perimeter iron frames (leave front gate floor flush for walking out!)
  const backTopBeam = new THREE.Mesh(
    new THREE.BoxGeometry(W + 0.12, 0.1, 0.11),
    darkIronMat,
  );
  backTopBeam.position.set(0, H - 0.05, -halfD);
  const frontTopBeam = new THREE.Mesh(
    new THREE.BoxGeometry(W + 0.12, 0.12, 0.12),
    darkIronMat,
  );
  frontTopBeam.position.set(0, H - 0.06, halfD);
  const leftTopBeam = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.1, D + 0.12),
    darkIronMat,
  );
  leftTopBeam.position.set(-halfW, H - 0.05, 0);
  const rightTopBeam = new THREE.Mesh(
    new THREE.BoxGeometry(0.11, 0.1, D + 0.12),
    darkIronMat,
  );
  rightTopBeam.position.set(halfW, H - 0.05, 0);

  // Mid crossbars along back, left, and right faces
  const midBarHeights = [0.75, 1.55, 2.25];
  for (const bh of midBarHeights) {
    const bBar = new THREE.Mesh(
      new THREE.BoxGeometry(W, 0.055, 0.045),
      rustedIronMat,
    );
    bBar.position.set(0, bh, -halfD);
    const lBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.055, D),
      rustedIronMat,
    );
    lBar.position.set(-halfW, bh, 0);
    const rBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.055, D),
      rustedIronMat,
    );
    rBar.position.set(halfW, bh, 0);
    cageGroup.add(bBar, lBar, rBar);
  }
  cageGroup.add(backTopBeam, frontTopBeam, leftTopBeam, rightTopBeam);

  // 4. Vertical rusted iron jail bars on Back, Left, and Right walls
  const vBarGeo = new THREE.CylinderGeometry(0.022, 0.024, H - 0.1, 8);
  const barsPerWall = 8;
  for (let i = 1; i <= barsPerWall; i++) {
    const t = i / (barsPerWall + 1);
    const offset = -halfW + t * W;
    const barMat = i % 2 === 0 ? darkIronMat : rustedIronMat;

    // Back wall bar
    const backBar = new THREE.Mesh(vBarGeo, barMat);
    backBar.position.set(offset, H / 2, -halfD);
    cageGroup.add(backBar);

    // Left wall bar
    const leftBar = new THREE.Mesh(vBarGeo, barMat);
    leftBar.position.set(-halfW, H / 2, -halfD + t * D);
    cageGroup.add(leftBar);

    // Right wall bar
    const rightBar = new THREE.Mesh(vBarGeo, barMat);
    rightBar.position.set(halfW, H / 2, -halfD + t * D);
    cageGroup.add(rightBar);
  }

  // 5. Overhead grated iron ceiling bars so the cell is truly enclosed
  const roofBarGeo = new THREE.CylinderGeometry(0.018, 0.018, D, 7);
  for (let i = 1; i <= 6; i++) {
    const rx = -halfW + (i / 7) * W;
    const roofBar = new THREE.Mesh(roofBarGeo, darkIronMat);
    roofBar.rotation.x = Math.PI / 2;
    roofBar.position.set(rx, H - 0.05, 0);
    cageGroup.add(roofBar);
  }

  // 6. Front fixed side panels + central hinged swinging iron-bar Gate (width = 1.24m)
  const gateWidth = 1.24;
  const gateLeftX = -gateWidth / 2;
  const gateRightX = gateWidth / 2;
  const gateHeight = 2.38;

  // Inner vertical jamb posts framing the swinging gate
  const jambGeo = new THREE.BoxGeometry(0.085, H, 0.085);
  const leftJamb = new THREE.Mesh(jambGeo, darkIronMat);
  leftJamb.position.set(gateLeftX, H / 2, halfD);
  const rightJamb = new THREE.Mesh(jambGeo, darkIronMat);
  rightJamb.position.set(gateRightX, H / 2, halfD);
  const gateTransom = new THREE.Mesh(
    new THREE.BoxGeometry(gateWidth + 0.08, 0.08, 0.085),
    darkIronMat,
  );
  gateTransom.position.set(0, gateHeight + 0.04, halfD);
  cageGroup.add(leftJamb, rightJamb, gateTransom);

  // Fixed front flank bars on left and right of gate + short transom bars above gate
  const flankOffsets = [-0.84, 0.84];
  for (const fx of flankOffsets) {
    const fBar = new THREE.Mesh(vBarGeo, rustedIronMat);
    fBar.position.set(fx, H / 2, halfD);
    cageGroup.add(fBar);
  }
  const transomBarGeo = new THREE.CylinderGeometry(
    0.02,
    0.02,
    H - gateHeight - 0.12,
    7,
  );
  for (let t = 1; t <= 4; t++) {
    const tx = gateLeftX + (t / 5) * gateWidth;
    const tBar = new THREE.Mesh(transomBarGeo, darkIronMat);
    tBar.position.set(tx, gateHeight + 0.08 + (H - gateHeight - 0.12) / 2, halfD);
    cageGroup.add(tBar);
  }

  // 7. Hinged Iron-Bar Gate (pivots around left jamb at x = gateLeftX, z = halfD)
  const gatePivot = new THREE.Group();
  gatePivot.name = `JailGatePivot_${options.friendNameEn}`;
  gatePivot.position.set(gateLeftX, 0.08, halfD);
  cageGroup.add(gatePivot);

  const gH = gateHeight - 0.08;
  // Gate outer iron stiles & rails
  const gLeftStile = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, gH, 0.055),
    darkIronMat,
  );
  gLeftStile.position.set(0.03, gH / 2, 0);
  const gRightStile = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, gH, 0.055),
    darkIronMat,
  );
  gRightStile.position.set(gateWidth - 0.03, gH / 2, 0);
  const gTopRail = new THREE.Mesh(
    new THREE.BoxGeometry(gateWidth, 0.06, 0.055),
    darkIronMat,
  );
  gTopRail.position.set(gateWidth / 2, gH - 0.03, 0);
  const gMidRail = new THREE.Mesh(
    new THREE.BoxGeometry(gateWidth, 0.075, 0.055),
    rustedIronMat,
  );
  gMidRail.position.set(gateWidth / 2, 1.12, 0);
  const gBotRail = new THREE.Mesh(
    new THREE.BoxGeometry(gateWidth, 0.06, 0.055),
    darkIronMat,
  );
  gBotRail.position.set(gateWidth / 2, 0.06, 0);
  gatePivot.add(gLeftStile, gRightStile, gTopRail, gMidRail, gBotRail);

  // Vertical bars inside the hinged gate
  const gateBarGeo = new THREE.CylinderGeometry(0.02, 0.022, gH - 0.06, 8);
  for (let b = 1; b <= 5; b++) {
    const bx = (b / 6) * gateWidth;
    const gBar = new THREE.Mesh(
      gateBarGeo,
      b % 2 === 0 ? rustedIronMat : darkIronMat,
    );
    gBar.position.set(bx, gH / 2, 0);
    gatePivot.add(gBar);
  }

  // Heavy iron hinges on the left side of the gate
  for (const hy of [0.42, 1.88]) {
    const hinge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8),
      heavyRustMat,
    );
    hinge.position.set(0.0, hy, 0.035);
    gatePivot.add(hinge);
  }

  // Iron lock plate & latch bar on right stile of the gate
  const lockPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.24, 0.07),
    heavyRustMat,
  );
  lockPlate.position.set(gateWidth - 0.08, 1.12, 0.03);
  gatePivot.add(lockPlate);

  // 8. Heavy Padlock + Iron Chain Wrap (removed when unlocked with matching key!)
  const padlockGroup = new THREE.Group();
  padlockGroup.name = `JailPadlock_${options.friendNameEn}`;
  padlockGroup.position.set(gateWidth - 0.04, 1.12, 0.085);
  gatePivot.add(padlockGroup);

  const lockBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.16, 0.065),
    padlockBrassMat,
  );
  lockBody.position.set(0, -0.05, 0);
  const lockShackle = new THREE.Mesh(
    new THREE.TorusGeometry(0.045, 0.013, 8, 16, Math.PI),
    darkIronMat,
  );
  lockShackle.position.set(0, 0.03, 0);
  const keyhole = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, 0.052, 0.072),
    darkIronMat,
  );
  keyhole.position.set(0, -0.055, 0.002);
  padlockGroup.add(lockBody, lockShackle, keyhole);

  // Short locking chain wrapped across the gate latch
  const linkGeo = new THREE.TorusGeometry(0.028, 0.009, 6, 12);
  for (let l = 0; l < 5; l++) {
    const lnk = new THREE.Mesh(
      linkGeo,
      l % 2 === 0 ? rustedIronMat : darkIronMat,
    );
    lnk.position.set(-0.07 + l * 0.036, 0.045, -0.01);
    lnk.rotation.y = (l % 2) * (Math.PI / 2);
    padlockGroup.add(lnk);
  }

  // 9. Atmospheric hanging chains in rear corners of the cell (NOT binding the friend)
  for (const side of [-1, 1]) {
    for (let k = 0; k < 7; k++) {
      const hangLink = new THREE.Mesh(
        linkGeo,
        k % 2 === 0 ? darkIronMat : rustedIronMat,
      );
      hangLink.position.set(
        side * (halfW - 0.16),
        H - 0.24 - k * 0.055,
        -halfD + 0.16,
      );
      hangLink.rotation.y = (k % 2) * (Math.PI / 2);
      cageGroup.add(hangLink);
    }
  }

  // 10. Weathered Hindi + English Iron Cell Nameplate above the front gate
  const plaqueCanvas = document.createElement('canvas');
  plaqueCanvas.width = 512;
  plaqueCanvas.height = 128;
  const ctx = plaqueCanvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1b120d';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#8b572a';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = '#f5d296';
    ctx.font = 'bold 34px "Noto Sans Devanagari", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`लोहे की जेल — ${options.friendNameHi}`, 256, 48);
    ctx.fillStyle = '#d19a5a';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillText(`LOCKED CELL • ${options.friendNameEn.toUpperCase()}`, 256, 92);
  }
  const plaqueTex = new THREE.CanvasTexture(plaqueCanvas);
  plaqueTex.colorSpace = THREE.SRGBColorSpace;
  const plaqueMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 0.28, 0.045),
    new THREE.MeshStandardMaterial({
      map: plaqueTex,
      roughness: 0.72,
      metalness: 0.35,
    }),
  );
  plaqueMesh.position.set(0, H - 0.22, halfD + 0.06);
  cageGroup.add(plaqueMesh);

  return {
    cageGroup,
    gatePivot,
    padlockGroup,
    // Swing outward +108 deg so the player & rescued friend have an unobstructed doorway
    gateOpenAngle: -Math.PI * 0.62,
  };
}

/**
 * Builds an ornate, glowing antique Haveli Key with a distinct colored gemstone
 * and subtle proximity sparkle aura so players can recognize and spot each named Jail Key.
 */
export function buildGlowingNamedKeyMesh(options: {
  name: string;
  metalHex?: number;
  emissiveHex?: number;
  gemHex: number;
  phaseOffset?: number;
}): GlowingNamedKeyBuild {
  const group = new THREE.Group();
  group.name = options.name;

  const goldMat = new THREE.MeshStandardMaterial({
    color: options.metalHex ?? 0xffd252,
    emissive: options.emissiveHex ?? 0xd89218,
    emissiveIntensity: 0.85,
    roughness: 0.22,
    metalness: 0.9,
  });
  const gemMat = new THREE.MeshStandardMaterial({
    color: options.gemHex,
    emissive: options.gemHex,
    emissiveIntensity: 0.95,
    roughness: 0.16,
    metalness: 0.28,
  });

  // Ornate bow ring + inner gemstone
  const bowOuter = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.025, 12, 24),
    goldMat,
  );
  bowOuter.rotation.x = Math.PI / 2;
  bowOuter.position.set(0, 0, -0.18);
  group.add(bowOuter);

  const bowGem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.042, 0),
    gemMat,
  );
  bowGem.position.set(0, 0.012, -0.18);
  group.add(bowGem);

  // Decorative collar + fluted key shaft
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.038, 0.033, 0.05, 12),
    goldMat,
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0, -0.058);
  group.add(collar);

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.33, 12),
    goldMat,
  );
  shaft.rotation.x = Math.PI / 2;
  shaft.position.set(0, 0, 0.1);
  group.add(shaft);

  // Stepped antique key bit teeth
  const bit1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.098, 0.024, 0.044),
    goldMat,
  );
  bit1.position.set(0.048, 0, 0.215);
  const bit2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.074, 0.024, 0.034),
    goldMat,
  );
  bit2.position.set(0.036, 0, 0.145);
  const bit3 = new THREE.Mesh(
    new THREE.BoxGeometry(0.052, 0.024, 0.026),
    goldMat,
  );
  bit3.position.set(0.025, 0, 0.088);
  group.add(bit1, bit2, bit3);

  const proximityGlow = attachProximityGlow({
    group,
    targetMaterials: [goldMat, gemMat],
    theme: 'key',
    phaseOffset: options.phaseOffset ?? 0,
  });

  return { group, proximityGlow };
}
