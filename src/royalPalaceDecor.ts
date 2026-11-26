import * as THREE from 'three';
import type { FlickeringLightEntry, WallAABB } from './mansionWorld';

export interface RoyalPalaceDecorContext {
  root: THREE.Group;
  wallColliders: WallAABB[];
  flickeringLights: FlickeringLightEntry[];
  swayingCurtains: THREE.Object3D[];
  watchingEyes: THREE.Mesh[];
  materials: {
    carvedSandstoneMat: THREE.MeshStandardMaterial;
    brassMat: THREE.MeshStandardMaterial;
    ironMat: THREE.MeshStandardMaterial;
    woodMat: THREE.MeshStandardMaterial;
    stairCarpetMat: THREE.MeshStandardMaterial;
  };
  disableExtraLights?: boolean;
}

// ============================================================================
// PROCEDURAL CANVAS TEXTURES (OIL PORTRAITS & TATTERED ROYAL VELVET)
// ============================================================================

function createTatteredCrimsonVelvetTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  // Build tattered lower hem clip path so curtains look ancient & ragged
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, h * 0.84);
  const notches = 18;
  for (let i = notches; i >= 0; i--) {
    const x = (i / notches) * w;
    const tearDepth =
      (Math.sin(i * 2.35) * 0.5 + 0.5) * 62 +
      (i % 3 === 0 ? 34 : 0) +
      (i % 5 === 0 ? 18 : 0);
    ctx.lineTo(x, h - 10 - tearDepth);
  }
  ctx.closePath();
  ctx.clip();

  // Deep royal crimson velvet vertical folds
  const baseGrad = ctx.createLinearGradient(0, 0, w, 0);
  baseGrad.addColorStop(0.0, '#2a0409');
  baseGrad.addColorStop(0.16, '#650c18');
  baseGrad.addColorStop(0.32, '#3a060d');
  baseGrad.addColorStop(0.5, '#720f1c');
  baseGrad.addColorStop(0.68, '#38050c');
  baseGrad.addColorStop(0.84, '#640b17');
  baseGrad.addColorStop(1.0, '#250307');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, w, h);

  // Aged dust & damp vertical grime near bottom
  const ageGrad = ctx.createLinearGradient(0, 0, 0, h);
  ageGrad.addColorStop(0.0, 'rgba(18, 4, 6, 0.25)');
  ageGrad.addColorStop(0.62, 'rgba(0, 0, 0, 0.0)');
  ageGrad.addColorStop(1.0, 'rgba(12, 8, 6, 0.58)');
  ctx.fillStyle = ageGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle royal gold zari side trim & Mughal floral brocade bands
  ctx.fillStyle = 'rgba(205, 155, 58, 0.65)';
  ctx.fillRect(8, 0, 6, h);
  ctx.fillRect(w - 14, 0, 6, h);
  ctx.fillStyle = 'rgba(218, 170, 72, 0.45)';
  ctx.fillRect(0, 14, w, 10);

  // Subtle woven diamond motifs down the velvet
  ctx.strokeStyle = 'rgba(195, 142, 48, 0.22)';
  ctx.lineWidth = 1.5;
  for (let y = 52; y < h - 90; y += 44) {
    for (let x = 36; x < w - 24; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, y - 12);
      ctx.lineTo(x + 12, y);
      ctx.lineTo(x, y + 12);
      ctx.lineTo(x - 12, y);
      ctx.closePath();
      ctx.stroke();
    }
  }

  // Moth holes / age tears near lower third
  ctx.globalCompositeOperation = 'destination-out';
  const holes = [
    [62, 340, 11, 22],
    [182, 378, 14, 28],
    [118, 412, 10, 18],
    [212, 315, 8, 16],
  ];
  for (const [hx, hy, rx, ry] of holes) {
    ctx.beginPath();
    ctx.ellipse(hx, hy, rx, ry, 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createThakurAncestorPortraitTexture(variant: number): THREE.CanvasTexture {
  const w = 256;
  const h = 340;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const pagdiColors = ['#7c1414', '#8f4710', '#4f1232', '#1f3644'];
  const robeColors = ['#2d120e', '#1c1816', '#331118', '#1c2420'];
  const pagdiColor = pagdiColors[variant % pagdiColors.length];
  const robeColor = robeColors[variant % robeColors.length];

  // Chiaroscuro oil-painting dark background
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.36, 18, w * 0.5, h * 0.45, 195);
  bg.addColorStop(0.0, '#443224');
  bg.addColorStop(0.48, '#1f1611');
  bg.addColorStop(1.0, '#090605');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle painted Rajputana arch backdrop in sepia gold
  ctx.strokeStyle = 'rgba(165, 128, 72, 0.22)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(22, h - 18);
  ctx.lineTo(22, 82);
  ctx.quadraticCurveTo(w * 0.5, 12, w - 22, 82);
  ctx.lineTo(w - 22, h - 18);
  ctx.stroke();

  // Royal Achkan / Angarkha shoulders & brocade shawl
  ctx.fillStyle = robeColor;
  ctx.beginPath();
  ctx.moveTo(30, h);
  ctx.quadraticCurveTo(54, 212, w * 0.5, 206);
  ctx.quadraticCurveTo(w - 54, 212, w - 30, h);
  ctx.closePath();
  ctx.fill();

  // Gold embroidered royal collar & pearl mala necklace
  ctx.strokeStyle = '#c99b42';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w * 0.5 - 26, 208);
  ctx.lineTo(w * 0.5, 255);
  ctx.lineTo(w * 0.5 + 26, 208);
  ctx.stroke();

  ctx.fillStyle = '#e5d8b8';
  for (let i = -5; i <= 5; i++) {
    const t = i / 5;
    const px = w * 0.5 + t * 34;
    const py = 220 + (1 - t * t) * 26;
    ctx.beginPath();
    ctx.arc(px, py, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Central ruby pendant
  ctx.fillStyle = '#9e1924';
  ctx.beginPath();
  ctx.arc(w * 0.5, 250, 6.5, 0, Math.PI * 2);
  ctx.fill();

  // Neck & weathered noble face
  ctx.fillStyle = '#8b6549';
  ctx.fillRect(w * 0.5 - 15, 178, 30, 34);

  const faceGrad = ctx.createRadialGradient(w * 0.48, 140, 8, w * 0.5, 148, 48);
  faceGrad.addColorStop(0.0, '#b98d68');
  faceGrad.addColorStop(0.7, '#876044');
  faceGrad.addColorStop(1.0, '#503624');
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.ellipse(w * 0.5, 148, 36, 46, 0, 0, Math.PI * 2);
  ctx.fill();

  // Crimson royal tilak on forehead
  ctx.fillStyle = '#a81c1c';
  ctx.fillRect(w * 0.5 - 2.5, 114, 5, 16);

  // Heavy furrowed brows & deep haunted eye sockets
  ctx.fillStyle = '#1b110d';
  ctx.beginPath();
  ctx.ellipse(w * 0.5 - 14, 142, 9, 5, -0.08, 0, Math.PI * 2);
  ctx.ellipse(w * 0.5 + 14, 142, 9, 5, 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d4c3a4';
  ctx.beginPath();
  ctx.arc(w * 0.5 - 14, 142, 3.2, 0, Math.PI * 2);
  ctx.arc(w * 0.5 + 14, 142, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#120806';
  ctx.beginPath();
  ctx.arc(w * 0.5 - 14, 142, 1.7, 0, Math.PI * 2);
  ctx.arc(w * 0.5 + 14, 142, 1.7, 0, Math.PI * 2);
  ctx.fill();

  // Grand curled Rajput moustache & grey-streaked beard
  ctx.strokeStyle = variant % 2 === 0 ? '#2b2421' : '#8a8279';
  ctx.lineWidth = 5.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 164);
  ctx.quadraticCurveTo(w * 0.5 - 16, 174, w * 0.5 - 32, 161);
  ctx.moveTo(w * 0.5, 164);
  ctx.quadraticCurveTo(w * 0.5 + 16, 174, w * 0.5 + 32, 161);
  ctx.stroke();

  if (variant % 2 === 1) {
    ctx.fillStyle = 'rgba(128, 120, 112, 0.65)';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, 184, 24, 16, 0, 0, Math.PI);
    ctx.fill();
  }

  // Ornate Rajasthani Pagdi (Royal Turban) with Sarpech jewel plume
  ctx.fillStyle = pagdiColor;
  ctx.beginPath();
  ctx.ellipse(w * 0.5, 95, 52, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d4a64a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w * 0.5 - 48, 102);
  ctx.quadraticCurveTo(w * 0.5, 78, w * 0.5 + 48, 102);
  ctx.moveTo(w * 0.5 - 44, 112);
  ctx.quadraticCurveTo(w * 0.5, 92, w * 0.5 + 44, 112);
  ctx.stroke();

  // Gold Sarpech brooch & feather plume
  ctx.fillStyle = '#e5bd5a';
  ctx.beginPath();
  ctx.ellipse(w * 0.5 + 16, 78, 8, 14, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c81c28';
  ctx.beginPath();
  ctx.arc(w * 0.5 + 16, 82, 4, 0, Math.PI * 2);
  ctx.fill();

  // Oil craquelure cracks & dark antique vignette
  ctx.strokeStyle = 'rgba(10, 6, 4, 0.28)';
  ctx.lineWidth = 1;
  for (let c = 0; c < 18; c++) {
    const sx = (c * 59 + variant * 23) % w;
    const sy = (c * 47 + variant * 31) % h;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + ((c % 3) - 1) * 24, sy + 28);
    ctx.stroke();
  }

  const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, 70, w * 0.5, h * 0.5, 195);
  vig.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1.0, 'rgba(5, 3, 2, 0.68)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createBrideRukminiPortraitTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 680;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Eerie blood-tinted chiaroscuro palace backdrop
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.34, 24, w * 0.5, h * 0.45, 360);
  bg.addColorStop(0.0, '#3a1116');
  bg.addColorStop(0.45, '#19080b');
  bg.addColorStop(1.0, '#050203');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Scalloped gothic-Rajputana halo arch behind Rukmini
  ctx.strokeStyle = 'rgba(195, 138, 62, 0.32)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(46, h - 30);
  ctx.lineTo(46, 175);
  ctx.quadraticCurveTo(w * 0.5, 22, w - 46, 175);
  ctx.lineTo(w - 46, h - 30);
  ctx.stroke();

  // Flowing dark-crimson Banarasi bridal odhani / veil framing head and shoulders
  const veilGrad = ctx.createLinearGradient(0, 110, 0, h);
  veilGrad.addColorStop(0.0, '#6e0812');
  veilGrad.addColorStop(0.5, '#4c050c');
  veilGrad.addColorStop(1.0, '#1e0205');
  ctx.fillStyle = veilGrad;
  ctx.beginPath();
  ctx.moveTo(58, h);
  ctx.quadraticCurveTo(82, 220, w * 0.5, 112);
  ctx.quadraticCurveTo(w - 82, 220, w - 58, h);
  ctx.closePath();
  ctx.fill();

  // Gold Zari bridal veil trim
  ctx.strokeStyle = '#d9a443';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(118, h);
  ctx.quadraticCurveTo(135, 250, w * 0.5, 136);
  ctx.quadraticCurveTo(w - 135, 250, w - 118, h);
  ctx.stroke();

  // Long flowing midnight hair cascading beneath the veil
  ctx.fillStyle = '#080608';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, 275, 96, 130, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ghostly pale bridal neck & face
  ctx.fillStyle = '#a89f97';
  ctx.fillRect(w * 0.5 - 26, 338, 52, 72);

  const faceGrad = ctx.createRadialGradient(w * 0.48, 256, 14, w * 0.5, 272, 86);
  faceGrad.addColorStop(0.0, '#dcd5cc');
  faceGrad.addColorStop(0.65, '#aba198');
  faceGrad.addColorStop(1.0, '#675c56');
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.ellipse(w * 0.5, 272, 66, 86, 0, 0, Math.PI * 2);
  ctx.fill();

  // Gold Maang-Tikka & Borla on forehead + glowing crimson Sindoor streak
  ctx.fillStyle = '#b9101a';
  ctx.fillRect(w * 0.5 - 4, 178, 8, 36);
  ctx.fillStyle = '#e6be58';
  ctx.beginPath();
  ctx.arc(w * 0.5, 214, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b30d16';
  ctx.beginPath();
  ctx.arc(w * 0.5, 232, 7.5, 0, Math.PI * 2); // Big bridal bindi
  ctx.fill();

  // Deep kohl-ringed haunted eyes with faint tear streaks
  ctx.fillStyle = '#0c0608';
  ctx.beginPath();
  ctx.ellipse(w * 0.5 - 26, 266, 18, 11, -0.06, 0, Math.PI * 2);
  ctx.ellipse(w * 0.5 + 26, 266, 18, 11, 0.06, 0, Math.PI * 2);
  ctx.fill();

  // Pale sclera & eerie glowing crimson gaze
  ctx.fillStyle = '#e8dfd6';
  ctx.beginPath();
  ctx.ellipse(w * 0.5 - 26, 266, 12, 6.5, 0, 0, Math.PI * 2);
  ctx.ellipse(w * 0.5 + 26, 266, 12, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9e0b16';
  ctx.beginPath();
  ctx.arc(w * 0.5 - 26, 266, 5.2, 0, Math.PI * 2);
  ctx.arc(w * 0.5 + 26, 266, 5.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff3838';
  ctx.beginPath();
  ctx.arc(w * 0.5 - 26, 266, 2.3, 0, Math.PI * 2);
  ctx.arc(w * 0.5 + 26, 266, 2.3, 0, Math.PI * 2);
  ctx.fill();

  // Dark kohl tear trails down pale cheeks
  ctx.strokeStyle = 'rgba(20, 10, 12, 0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.5 - 24, 277);
  ctx.lineTo(w * 0.5 - 27, 326);
  ctx.moveTo(w * 0.5 + 24, 277);
  ctx.lineTo(w * 0.5 + 28, 322);
  ctx.stroke();

  // Traditional Rajasthani Gold Nath (bridal nose ring)
  ctx.strokeStyle = '#e5bc54';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(w * 0.5 + 14, 304, 15, 0, Math.PI * 2);
  ctx.stroke();

  // Solemn blood-red lips
  ctx.fillStyle = '#6c0d16';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, 324, 18, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Heavy gold royal bridal necklaces (Aad & Rani Haar)
  ctx.fillStyle = '#d4a340';
  ctx.fillRect(w * 0.5 - 38, 392, 76, 18);
  ctx.strokeStyle = '#e4ba55';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(w * 0.5, 424, 66, 0.25, Math.PI - 0.25);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w * 0.5, 444, 88, 0.3, Math.PI - 0.3);
  ctx.stroke();

  // Hindi gilded plaque inscription at bottom of canvas
  ctx.fillStyle = 'rgba(220, 174, 86, 0.85)';
  ctx.font = 'bold 24px serif';
  ctx.textAlign = 'center';
  ctx.fillText('दुल्हन रुक्मिणी — १८९७', w * 0.5, h - 38);

  // Antique oil crackle & dark haunted vignette
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 28; i++) {
    const sx = (i * 83 + 17) % w;
    const sy = (i * 71 + 43) % h;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + ((i % 2 === 0 ? 1 : -1) * 32), sy + 42);
    ctx.stroke();
  }
  const vig = ctx.createRadialGradient(w * 0.5, h * 0.45, 130, w * 0.5, h * 0.5, 380);
  vig.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1.0, 'rgba(3, 1, 2, 0.72)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ============================================================================
// MAIN ROYAL PALACE DECORATION BUILDER
// ============================================================================

export function buildRoyalPalaceDecorations(ctx: RoyalPalaceDecorContext): void {
  const { root, wallColliders, flickeringLights, swayingCurtains, watchingEyes } = ctx;
  const { carvedSandstoneMat, brassMat, ironMat } = ctx.materials;

  // Shared high-impact palace materials
  const antiqueGoldMat = new THREE.MeshStandardMaterial({
    color: 0xdca93e,
    emissive: 0x2a1a04,
    emissiveIntensity: 0.14,
    roughness: 0.28,
    metalness: 0.88,
  });

  const darkTeakMat = new THREE.MeshStandardMaterial({
    color: 0x3b1f12,
    roughness: 0.65,
    metalness: 0.08,
  });

  const steelBladeMat = new THREE.MeshStandardMaterial({
    color: 0xaab0b8,
    roughness: 0.34,
    metalness: 0.85,
  });

  const weatheredGuardianStoneMat = carvedSandstoneMat.clone();
  weatheredGuardianStoneMat.color.setHex(0x8c7862);
  weatheredGuardianStoneMat.roughness = 0.88;

  const flameMatOuter = new THREE.MeshBasicMaterial({ color: 0xff8c22 });
  const flameMatInner = new THREE.MeshBasicMaterial({ color: 0xffe49c });

  // Inner red-and-gold canopy throne/shrine removed so the Central Royal Hall
  // stays wide open around the crimson carpet and the exterior Shiva Temple is the sole temple.


  // ==========================================================================
  // 2. ANTIQUE RAJPUTANA CROSSED SPEARS (BHALA) & STUDDED SHIELDS (DHAL)
  // ==========================================================================
  const buildRoyalWeaponsAndShields = () => {
    const shieldDishGeo = new THREE.CylinderGeometry(0.46, 0.5, 0.08, 18);
    const shieldRimGeo = new THREE.TorusGeometry(0.48, 0.032, 8, 22);
    const shieldBossGeo = new THREE.SphereGeometry(0.075, 10, 8);
    const spearShaftGeo = new THREE.CylinderGeometry(0.022, 0.024, 2.35, 8);
    const spearHeadGeo = new THREE.ConeGeometry(0.068, 0.36, 4);
    const talwarBladeGeo = new THREE.BoxGeometry(0.055, 1.15, 0.016);
    const hiltGuardGeo = new THREE.BoxGeometry(0.18, 0.04, 0.05);

    const mountWeaponTrophy = (
      x: number,
      y: number,
      z: number,
      rotY: number,
      scale = 1.0,
    ) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.rotation.y = rotY;
      if (scale !== 1.0) {
        g.scale.setScalar(scale);
      }

      // Two crossed Rajput spears (Bhala)
      [-0.58, 0.58].forEach((tilt) => {
        const spear = new THREE.Group();
        spear.rotation.z = tilt;
        const shaft = new THREE.Mesh(spearShaftGeo, darkTeakMat);
        const head = new THREE.Mesh(spearHeadGeo, steelBladeMat);
        head.position.y = 1.32;
        const butt = new THREE.Mesh(spearHeadGeo, antiqueGoldMat);
        butt.scale.set(0.6, 0.45, 0.6);
        butt.rotation.x = Math.PI;
        butt.position.y = -1.24;
        spear.add(shaft, head, butt);
        g.add(spear);
      });

      // Two crossed curved-hilt Talwars tucked behind the shield
      [-0.95, 0.95].forEach((tilt) => {
        const sword = new THREE.Group();
        sword.rotation.z = tilt;
        sword.position.z = 0.03;
        const blade = new THREE.Mesh(talwarBladeGeo, steelBladeMat);
        blade.position.y = 0.28;
        const guard = new THREE.Mesh(hiltGuardGeo, antiqueGoldMat);
        guard.position.y = -0.3;
        const grip = new THREE.Mesh(
          new THREE.CylinderGeometry(0.024, 0.024, 0.2, 8),
          antiqueGoldMat,
        );
        grip.position.y = -0.42;
        sword.add(blade, guard, grip);
        g.add(sword);
      });

      // Central Antique Studded Rajput Dhal (Round Shield)
      const shield = new THREE.Mesh(shieldDishGeo, ironMat);
      shield.rotation.x = Math.PI / 2;
      shield.position.z = 0.09;
      const rim = new THREE.Mesh(shieldRimGeo, antiqueGoldMat);
      rim.position.z = 0.11;
      g.add(shield, rim);

      // 4 Traditional Brass Shield Bosses (Chaar-Aina style) + central emblem
      const bossPositions = [
        [0, 0],
        [-0.2, 0.2],
        [0.2, 0.2],
        [-0.2, -0.2],
        [0.2, -0.2],
      ];
      for (const [bx, by] of bossPositions) {
        const boss = new THREE.Mesh(shieldBossGeo, antiqueGoldMat);
        boss.scale.set(1, 1, 0.65);
        boss.position.set(bx, by, 0.14);
        g.add(boss);
      }

      root.add(g);
    };

    // Symmetrical wall racks along the massive 38m Royal Darbar Hall side walls (clear of 3-bay doorways at z=+0.75, -18.0, -36.75)
    [-12.2, -6.2, 6.4].forEach((wz) => {
      mountWeaponTrophy(-18.72, 2.65, wz, Math.PI / 2);
      mountWeaponTrophy(18.72, 2.65, wz, -Math.PI / 2);
    });
    // Compact trophies mounted cleanly on the solid masonry side walls beneath the Grand Mid-Landing
    // (top spear tips reach y = 1.97m, strictly below the y = 2.50m slab & completely clear of the red-carpeted split stairs!)
    mountWeaponTrophy(-3.96, 1.24, -29.0, -Math.PI / 2, 0.58);
    mountWeaponTrophy(3.96, 1.24, -29.0, Math.PI / 2, 0.58);
    // 2F Balcony Royal Gallery trophy displays (clear of 3-bay doorways)
    [-11.8, -5.2, 6.2].forEach((wz) => {
      mountWeaponTrophy(-18.72, 7.65, wz, Math.PI / 2);
      mountWeaponTrophy(18.72, 7.65, wz, -Math.PI / 2);
    });
  };
  buildRoyalWeaponsAndShields();

  // ==========================================================================
  // 3. TALL TATTERED DARK-CRIMSON VELVET ROYAL CURTAINS BETWEEN THE 8 PILLARS
  // ==========================================================================
  const buildTatteredRoyalVelvetCurtains = () => {
    const velvetTex = createTatteredCrimsonVelvetTexture();
    const tatteredCurtainMat = new THREE.MeshStandardMaterial({
      map: velvetTex,
      alphaTest: 0.45,
      roughness: 0.88,
      metalness: 0.06,
      side: THREE.DoubleSide,
    });

    // Shared curved pleated curtain geometry (top-pivoted at y=0 so swaying rotates naturally from rod!)
    const panelGeo = new THREE.PlaneGeometry(1.45, 4.35, 6, 8);
    const pos = panelGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      const wave = Math.sin(px * 9.5) * 0.085;
      // Shift vertically so top edge is at y = 0 and hem hangs down to y = -4.35
      pos.setY(i, py - 2.175);
      pos.setZ(i, wave);
    }
    panelGeo.computeVertexNormals();

    const rodGeo = new THREE.CylinderGeometry(0.036, 0.036, 4.75, 8);
    const finialGeo = new THREE.SphereGeometry(0.075, 8, 8);
    const tieBackGeo = new THREE.TorusGeometry(0.18, 0.028, 6, 14);

    // 5 bays between the 6 towering pillars on Left (x = -14.8) & Right (x = +14.8) on GF; 4 open atrium bays on 2F (keeps 2F South Balcony clear!)
    const tierTopYs = [4.58, 9.58];

    [-14.8, 14.8].forEach((px) => {
      tierTopYs.forEach((topY) => {
        const bayCentersZ =
          topY < 6.0
            ? [2.8, -2.6, -8.0, -13.4, -18.8]
            : [-2.6, -8.0, -13.4, -18.8];
        bayCentersZ.forEach((bz) => {
          const bayGroup = new THREE.Group();
          bayGroup.position.set(px, topY, bz);
          bayGroup.rotation.y = Math.PI / 2;

          // Ornate brass curtain rod spanning between pillars
          const rod = new THREE.Mesh(rodGeo, antiqueGoldMat);
          rod.rotation.z = Math.PI / 2;
          bayGroup.add(rod);

          [-2.28, 2.28].forEach((fx) => {
            const finial = new THREE.Mesh(finialGeo, antiqueGoldMat);
            finial.position.set(fx, 0, 0);
            bayGroup.add(finial);
          });

          // Left & Right tall tattered velvet drapes pulled back toward each pillar (keeps walkway open!)
          [-1.52, 1.52].forEach((offsetX) => {
            const drapePivot = new THREE.Group();
            drapePivot.position.set(offsetX, -0.02, 0);

            const drapeMesh = new THREE.Mesh(panelGeo, tatteredCurtainMat);
            drapeMesh.castShadow = true;
            drapePivot.add(drapeMesh);

            // Gold cord tie-back ring cinched midway down the drape
            const tie = new THREE.Mesh(tieBackGeo, antiqueGoldMat);
            tie.rotation.x = Math.PI / 2;
            tie.scale.set(2.2, 0.85, 1);
            tie.position.set(offsetX > 0 ? 0.14 : -0.14, -2.45, 0);
            drapePivot.add(tie);

            bayGroup.add(drapePivot);
            swayingCurtains.push(drapePivot);
          });

          root.add(bayGroup);
        });
      });
    });
  };
  buildTatteredRoyalVelvetCurtains();

  // ==========================================================================
  // 4. GLOWING IRON WALL MASHALS (FLAMING TORCHES) ALONG PILLARS & CORRIDORS
  // ==========================================================================
  const buildRoyalIronWallMashals = () => {
    const backplateGeo = new THREE.BoxGeometry(0.16, 0.44, 0.04);
    const armGeo = new THREE.CylinderGeometry(0.022, 0.026, 0.36, 8);
    const handleGeo = new THREE.CylinderGeometry(0.028, 0.02, 0.56, 8);
    const cageRingGeo = new THREE.TorusGeometry(0.11, 0.018, 6, 12);
    const coalGeo = new THREE.DodecahedronGeometry(0.085, 0);
    const flameOuterGeo = new THREE.ConeGeometry(0.095, 0.34, 7);
    const flameInnerGeo = new THREE.ConeGeometry(0.052, 0.22, 6);

    const coalMat = new THREE.MeshStandardMaterial({
      color: 0x3b1206,
      emissive: 0xff3c00,
      emissiveIntensity: 0.9,
      roughness: 0.9,
    });

    const mountWallMashal = (
      x: number,
      y: number,
      z: number,
      rotY: number,
      withPointLight = false,
      phase = 0,
    ) => {
      const mGroup = new THREE.Group();
      mGroup.position.set(x, y, z);
      mGroup.rotation.y = rotY;

      const plate = new THREE.Mesh(backplateGeo, ironMat);
      const arm = new THREE.Mesh(armGeo, ironMat);
      arm.rotation.x = Math.PI / 2.6;
      arm.position.set(0, -0.04, 0.14);

      const torchShaft = new THREE.Mesh(handleGeo, ironMat);
      torchShaft.rotation.x = 0.26;
      torchShaft.position.set(0, 0.06, 0.28);

      const cageBottom = new THREE.Mesh(cageRingGeo, ironMat);
      cageBottom.rotation.x = Math.PI / 2;
      cageBottom.scale.setScalar(0.75);
      cageBottom.position.set(0, 0.26, 0.34);

      const cageTop = new THREE.Mesh(cageRingGeo, ironMat);
      cageTop.rotation.x = Math.PI / 2;
      cageTop.position.set(0, 0.38, 0.36);

      const coals = new THREE.Mesh(coalGeo, coalMat);
      coals.position.set(0, 0.33, 0.35);

      const flameOuter = new THREE.Mesh(flameOuterGeo, flameMatOuter.clone());
      flameOuter.position.set(0, 0.52, 0.36);
      const flameInner = new THREE.Mesh(flameInnerGeo, flameMatInner);
      flameInner.position.set(0, 0.46, 0.36);

      mGroup.add(plate, arm, torchShaft, cageBottom, cageTop, coals, flameOuter, flameInner);

      let ptLight: THREE.PointLight | undefined;
      if (withPointLight && !ctx.disableExtraLights) {
        ptLight = new THREE.PointLight(0xff963a, 3.4, 18, 1.35);
        ptLight.position.set(0, 0.56, 0.48);
        mGroup.add(ptLight);
      }

      flickeringLights.push({
        light: ptLight,
        baseIntensity: ptLight ? 3.4 : 1.0,
        phase,
        flameMesh: flameOuter,
        baseColor: 0xff9438,
      });

      root.add(mGroup);
    };

    // Mount glowing iron mashals on ALL 12 towering atrium pillars (inward facing on GF y=2.95 & 2F y=7.95)
    // Attach PointLights to 4 balanced hero mashals so WebGL fragment shaders stay fast & within light uniform limits
    const pillarZs = [5.5, 0.1, -5.3, -10.7, -16.1, -21.5];
    pillarZs.forEach((pz, idx) => {
      // Left pillar row (x = -14.8, inward face at x = -14.36 facing +X)
      mountWallMashal(-14.36, 2.95, pz, Math.PI / 2, idx === 0, idx * 1.1);
      mountWallMashal(-14.36, 7.95, pz, Math.PI / 2, idx === 3, idx * 1.7 + 0.5);
      // Right pillar row (x = +14.8, inward face at x = +14.36 facing -X)
      mountWallMashal(14.36, 2.95, pz, -Math.PI / 2, idx === 4, idx * 1.3 + 2.1);
      mountWallMashal(14.36, 7.95, pz, -Math.PI / 2, idx === 1, idx * 1.9 + 1.2);
    });

    // Corridor & Balcony Mashals (GF rear corridor, 2F & 3F balconies, and flanking Rukmini's portrait)
    mountWallMashal(-2.15, 4.45, -30.84, 0, false, 4.2);
    mountWallMashal(2.15, 4.45, -30.84, 0, false, 5.1);
    mountWallMashal(-18.76, 2.85, -26.0, Math.PI / 2, false, 6.0);
    mountWallMashal(18.76, 2.85, -26.0, -Math.PI / 2, false, 6.8);
    mountWallMashal(-18.76, 7.85, -26.0, Math.PI / 2, false, 7.4);
    mountWallMashal(18.76, 7.85, -26.0, -Math.PI / 2, false, 8.1);
    mountWallMashal(-18.76, 12.85, -8.5, Math.PI / 2, true, 8.9);
    mountWallMashal(18.76, 12.85, -8.5, -Math.PI / 2, false, 9.5);
    mountWallMashal(-18.76, 12.85, -26.0, Math.PI / 2, false, 10.1);
    mountWallMashal(18.76, 12.85, -26.0, -Math.PI / 2, false, 10.7);
  };
  buildRoyalIronWallMashals();

  // ==========================================================================
  // 5. CARVED RAJPUTANA SCALLOPED ARCHES (MEHRAB) ALONG 2F & 3F BALCONIES
  // Shared ExtrudeGeometry scalloped arch spandrel for crisp Rajasthani silhouette + high FPS
  // ==========================================================================
  const buildRajputanaMehrabBalconyColonnade = () => {
    const createScallopedMehrabGeo = (span: number, archH: number, depth: number) => {
      const half = span * 0.5;
      const springY = archH * 0.42;
      const shape = new THREE.Shape();
      // Outer rectangular spandrel top
      shape.moveTo(-half, springY);
      shape.lineTo(-half, archH);
      shape.lineTo(half, archH);
      shape.lineTo(half, springY);

      // Multi-foil (7-cusp) Rajputana scalloped inner opening curve from right to left
      const foils = 7;
      const innerHalf = half - 0.24;
      const rise = archH - 0.34 - springY;
      for (let i = 0; i <= foils * 6; i++) {
        const t = i / (foils * 6); // 0 (right) -> 1 (left)
        const angle = t * Math.PI;
        const baseX = Math.cos(angle) * innerHalf;
        const pointedLift = (1 - Math.abs(t - 0.5) * 2) * 0.24;
        const scallopDip = Math.abs(Math.sin(t * foils * Math.PI)) * 0.14;
        const baseY = springY + Math.sin(angle) * rise + pointedLift - scallopDip;
        shape.lineTo(baseX, baseY);
      }
      shape.closePath();

      const extrude = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.025,
        bevelSize: 0.02,
        bevelSegments: 2,
      });
      extrude.translate(0, 0, -depth * 0.5);
      return extrude;
    };

    const mehrabSpan = 3.8;
    const mehrabH = 4.65;
    const sharedMehrabGeo = createScallopedMehrabGeo(mehrabSpan, mehrabH, 0.34);
    const sharedColGeo = new THREE.CylinderGeometry(0.13, 0.16, 3.05, 8);
    const sharedBaseGeo = new THREE.BoxGeometry(0.36, 0.24, 0.36);
    const sharedCapGeo = new THREE.BoxGeometry(0.4, 0.22, 0.4);
    const sharedGoldBandGeo = new THREE.BoxGeometry(mehrabSpan, 0.07, 0.38);

    const addMehrabBay = (x: number, y: number, z: number, rotY: number) => {
      const bay = new THREE.Group();
      bay.position.set(x, y, z);
      bay.rotation.y = rotY;

      const spandrel = new THREE.Mesh(sharedMehrabGeo, carvedSandstoneMat);
      bay.add(spandrel);

      const goldCornice = new THREE.Mesh(sharedGoldBandGeo, antiqueGoldMat);
      goldCornice.position.y = mehrabH - 0.08;
      bay.add(goldCornice);

      [-mehrabSpan * 0.5 + 0.12, mehrabSpan * 0.5 - 0.12].forEach((cx) => {
        const col = new THREE.Mesh(sharedColGeo, carvedSandstoneMat);
        col.position.set(cx, 1.52, 0);
        const cap = new THREE.Mesh(sharedCapGeo, carvedSandstoneMat);
        cap.position.set(cx, 3.05, 0);
        const base = new THREE.Mesh(sharedBaseGeo, carvedSandstoneMat);
        base.position.set(cx, 0.12, 0);
        bay.add(col, cap, base);
      });

      root.add(bay);
    };

    // Place carved Mehrab colonnades along all 4 wrap-around edges of 2F (y=5.0) & 3F (y=10.0)
    [5.0, 10.0].forEach((fy) => {
      // South Atrium Balcony Edge (z = 3.2, x in [-15.2, 15.2] -> 8 bays of 3.8m, fronting the 2 Front Palace Suites!)
      [-13.3, -9.5, -5.7, -1.9, 1.9, 5.7, 9.5, 13.3].forEach((bx) => {
        addMehrabBay(bx, fy, 3.2, 0);
      });

      // North Atrium Balcony Edge (2F at z = -31.3, 3F at z = -29.5 -> 8 bays of 3.8m)
      const northZ = fy < 7.5 ? -31.3 : -29.5;
      [-13.3, -9.5, -5.7, -1.9, 1.9, 5.7, 9.5, 13.3].forEach((bx) => {
        addMehrabBay(bx, fy, northZ, 0);
      });

      // West & East Atrium Balcony Edges (x = ±15.2, leaving 2F staircase split zone z in [-31.0, -27.0] open!)
      const sideBayZs =
        fy < 7.5
          ? [1.3, -2.5, -6.3, -10.1, -13.9, -17.7, -21.5, -25.1]
          : [1.3, -2.5, -6.3, -10.1, -13.9, -17.7, -21.5, -25.3, -27.6];
      sideBayZs.forEach((bz) => {
        addMehrabBay(-15.2, fy, bz, Math.PI / 2);
        addMehrabBay(15.2, fy, bz, Math.PI / 2);
      });
    });
  };
  buildRajputanaMehrabBalconyColonnade();

  // ==========================================================================
  // 6. ANTIQUE GOLD-FRAMED THAKUR ANCESTOR PORTRAITS & MONUMENTAL BRIDE RUKMINI PORTRAIT
  // ==========================================================================
  const buildHauntedPalacePortraits = () => {
    const ancestorTextures = [0, 1, 2, 3].map((v) =>
      createThakurAncestorPortraitTexture(v),
    );
    const ancestorMats = ancestorTextures.map(
      (tex) =>
        new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.68,
          metalness: 0.04,
        }),
    );

    const frameOuterGeo = new THREE.BoxGeometry(1.48, 1.92, 0.09);
    const frameInnerGeo = new THREE.BoxGeometry(1.3, 1.74, 0.11);
    const portraitCanvasGeo = new THREE.PlaneGeometry(1.22, 1.66);
    const frameCrestGeo = new THREE.ConeGeometry(0.18, 0.24, 6);
    const eyeGeo = new THREE.SphereGeometry(0.022, 8, 8);
    const hauntedEyeMat = new THREE.MeshBasicMaterial({ color: 0xff2820 });

    const mountAncestorPortrait = (
      x: number,
      y: number,
      z: number,
      rotY: number,
      variant: number,
      withWatchingEyes = false,
    ) => {
      const pGroup = new THREE.Group();
      pGroup.position.set(x, y, z);
      pGroup.rotation.y = rotY;

      const outerFrame = new THREE.Mesh(frameOuterGeo, antiqueGoldMat);
      const innerFrame = new THREE.Mesh(frameInnerGeo, darkTeakMat);
      const painting = new THREE.Mesh(
        portraitCanvasGeo,
        ancestorMats[variant % ancestorMats.length],
      );
      painting.position.z = 0.06;

      // Ornate gold crown finial & corner filigree medallions
      const crest = new THREE.Mesh(frameCrestGeo, antiqueGoldMat);
      crest.position.set(0, 1.06, 0.02);
      pGroup.add(outerFrame, innerFrame, painting, crest);

      if (withWatchingEyes) {
        [-0.085, 0.085].forEach((ex) => {
          const eye = new THREE.Mesh(eyeGeo, hauntedEyeMat);
          eye.position.set(ex, 0.16, 0.072);
          pGroup.add(eye);
          watchingEyes.push(eye);
        });
      }

      root.add(pGroup);
    };

    // Hang antique Thakur Ancestor Portraits along the massive 38m Royal Darbar Hall (GF & 2F) — clear of all 3-bay doorways
    mountAncestorPortrait(-18.74, 2.75, 8.2, Math.PI / 2, 0, true);
    mountAncestorPortrait(18.74, 2.75, 8.2, -Math.PI / 2, 1, false);
    mountAncestorPortrait(-18.74, 2.75, -26.5, Math.PI / 2, 2, false);
    mountAncestorPortrait(18.74, 2.75, -26.5, -Math.PI / 2, 3, true);
    // 2F Balcony & Ancestor Portrait Gallery paintings
    mountAncestorPortrait(-18.74, 7.75, -6.0, Math.PI / 2, 1, false);
    mountAncestorPortrait(18.74, 7.75, -6.0, -Math.PI / 2, 2, true);
    mountAncestorPortrait(-18.74, 7.75, -12.6, Math.PI / 2, 3, false);
    mountAncestorPortrait(18.74, 7.75, -12.6, -Math.PI / 2, 0, false);
    // Featured Ancestor Portraits inside 2F-8 Ancestor Portrait Gallery (North & East walls)
    mountAncestorPortrait(3.6, 7.75, 6.08, 0, 0, true);
    mountAncestorPortrait(10.6, 7.75, 6.08, 0, 2, false);

    // LARGE, EERIE MONUMENTAL PORTRAIT OF BRIDE RUKMINI ON THE MAIN STAIRCASE LANDING WALL
    // Positioned at (0, 4.68, -30.94) facing South (+Z) down the entire massive 38m x 31.5m Royal Darbar Hall!
    // Backing panel sits flush on the mid-landing north parapet (z = -31.04), completely clear of 2F North walkway (z = -31.3..-46)
    const rukminiShrineGroup = new THREE.Group();
    rukminiShrineGroup.name = 'BrideRukminiGrandStaircasePortrait';
    rukminiShrineGroup.position.set(0, 4.68, -30.94);

    // Carved Sandstone Monumental Backing Arch Wall rising from mid-landing (y = 2.5 -> local -2.18) up to y = 6.5
    const backingWall = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 4.0, 0.2),
      carvedSandstoneMat,
    );
    backingWall.position.set(0, -0.18, -0.12);
    const backingTopCornice = new THREE.Mesh(
      new THREE.BoxGeometry(3.48, 0.24, 0.34),
      carvedSandstoneMat,
    );
    backingTopCornice.position.set(0, 1.88, -0.06);
    const backingGoldCrest = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 0.56, 8),
      antiqueGoldMat,
    );
    backingGoldCrest.position.set(0, 2.26, -0.04);

    // Heavy Ornate Antique Gold Frame (2.36m wide x 3.12m tall)
    const rFrameOuter = new THREE.Mesh(
      new THREE.BoxGeometry(2.38, 3.14, 0.14),
      antiqueGoldMat,
    );
    const rFrameInner = new THREE.Mesh(
      new THREE.BoxGeometry(2.08, 2.84, 0.17),
      darkTeakMat,
    );

    const rukminiTex = createBrideRukminiPortraitTexture();
    const rukminiCanvas = new THREE.Mesh(
      new THREE.PlaneGeometry(1.96, 2.72),
      new THREE.MeshStandardMaterial({
        map: rukminiTex,
        emissive: 0x260508,
        emissiveIntensity: 0.22,
        roughness: 0.58,
        metalness: 0.05,
      }),
    );
    rukminiCanvas.position.z = 0.095;

    // Subtle crimson-glowing watching pupils overlaid right on Rukmini's painted eyes
    [-0.105, 0.105].forEach((ex) => {
      const rEye = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 8, 8),
        hauntedEyeMat,
      );
      rEye.position.set(ex, 0.285, 0.108);
      rukminiShrineGroup.add(rEye);
      watchingEyes.push(rEye);
    });

    // Ornate corner gold rosettes on the monumental frame
    const cornerGeo = new THREE.OctahedronGeometry(0.12, 0);
    [
      [-1.12, 1.48],
      [1.12, 1.48],
      [-1.12, -1.48],
      [1.12, -1.48],
    ].forEach(([cx, cy]) => {
      const rosette = new THREE.Mesh(cornerGeo, antiqueGoldMat);
      rosette.position.set(cx, cy, 0.09);
      rukminiShrineGroup.add(rosette);
    });

    rukminiShrineGroup.add(
      backingWall,
      backingTopCornice,
      backingGoldCrest,
      rFrameOuter,
      rFrameInner,
      rukminiCanvas,
    );
    root.add(rukminiShrineGroup);
  };
  buildHauntedPalacePortraits();

  // ==========================================================================
  // 7. EXTERIOR WEATHERED STONE GUARDIAN STATUES FLANKING FRONT ENTRANCE STEPS
  // Placed at x = ±3.25, y = 0, z = 11.45 facing South (+Z) toward the forest road
  // Leaves main arched entrance doorway (x in [-2.2, 2.2]) 100% wide open!
  // ==========================================================================
  const buildExteriorStoneGuardianStatues = () => {
    const plinthBaseGeo = new THREE.BoxGeometry(1.18, 0.34, 1.18);
    const plinthMidGeo = new THREE.BoxGeometry(0.94, 0.72, 0.94);
    const plinthCapGeo = new THREE.BoxGeometry(1.06, 0.16, 1.06);
    const legGeo = new THREE.CylinderGeometry(0.13, 0.15, 0.88, 8);
    const torsoGeo = new THREE.CylinderGeometry(0.28, 0.23, 0.86, 10);
    const shoulderGeo = new THREE.SphereGeometry(0.16, 8, 8);
    const headGeo = new THREE.SphereGeometry(0.18, 10, 8);
    const turbanGeo = new THREE.CylinderGeometry(0.22, 0.2, 0.16, 10);
    const armGeo = new THREE.CylinderGeometry(0.085, 0.075, 0.68, 8);
    const stoneShieldGeo = new THREE.CylinderGeometry(0.32, 0.34, 0.09, 12);
    const spearShaftGeo = new THREE.CylinderGeometry(0.032, 0.038, 2.55, 8);
    const spearTipGeo = new THREE.ConeGeometry(0.09, 0.36, 4);

    [-3.45, 3.45].forEach((gx) => {
      const statueGroup = new THREE.Group();
      statueGroup.name = gx < 0 ? 'WestStoneGuardianStatue' : 'EastStoneGuardianStatue';
      statueGroup.position.set(gx, 0, 11.45);
      // Angle subtly inward toward visitors walking up the royal entrance steps
      statueGroup.rotation.y = gx < 0 ? 0.18 : -0.18;

      // Stepped Carved Sandstone Pedestal Plinth (y = 0 -> 1.22m)
      const pBase = new THREE.Mesh(plinthBaseGeo, weatheredGuardianStoneMat);
      pBase.position.y = 0.17;
      pBase.castShadow = true;
      pBase.receiveShadow = true;

      const pMid = new THREE.Mesh(plinthMidGeo, weatheredGuardianStoneMat);
      pMid.position.y = 0.7;
      pMid.castShadow = true;

      const pCap = new THREE.Mesh(plinthCapGeo, weatheredGuardianStoneMat);
      pCap.position.y = 1.14;

      // Weathered Rajput Royal Dwarpal Warrior Sculpture (y = 1.22 -> 3.35m)
      const warrior = new THREE.Group();
      warrior.position.y = 1.22;

      [-0.14, 0.14].forEach((lx) => {
        const leg = new THREE.Mesh(legGeo, weatheredGuardianStoneMat);
        leg.position.set(lx, 0.44, 0);
        leg.castShadow = true;
        warrior.add(leg);
      });

      const torso = new THREE.Mesh(torsoGeo, weatheredGuardianStoneMat);
      torso.position.set(0, 1.22, 0);
      torso.castShadow = true;

      const chestBand = new THREE.Mesh(
        new THREE.BoxGeometry(0.54, 0.16, 0.44),
        carvedSandstoneMat,
      );
      chestBand.position.set(0, 1.38, 0.03);

      const head = new THREE.Mesh(headGeo, weatheredGuardianStoneMat);
      head.position.set(0, 1.82, 0);
      head.castShadow = true;

      const turban = new THREE.Mesh(turbanGeo, weatheredGuardianStoneMat);
      turban.position.set(0, 1.98, 0);
      const turbanCrest = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.22, 6),
        brassMat,
      );
      turbanCrest.position.set(0, 2.15, 0.06);

      // Outer side holds upright ceremonial Rajput spear; inner side rests on carved stone shield
      const spearSide = gx < 0 ? -1 : 1;
      const shieldSide = -spearSide;

      const spearArm = new THREE.Mesh(armGeo, weatheredGuardianStoneMat);
      spearArm.position.set(spearSide * 0.34, 1.24, 0.12);
      spearArm.rotation.x = -0.35;
      spearArm.rotation.z = spearSide * -0.18;

      const shieldArm = new THREE.Mesh(armGeo, weatheredGuardianStoneMat);
      shieldArm.position.set(shieldSide * 0.33, 1.18, 0.08);
      shieldArm.rotation.x = -0.22;
      shieldArm.rotation.z = shieldSide * -0.16;

      [-0.32, 0.32].forEach((sx) => {
        const sh = new THREE.Mesh(shoulderGeo, weatheredGuardianStoneMat);
        sh.position.set(sx, 1.54, 0);
        warrior.add(sh);
      });

      const shield = new THREE.Mesh(stoneShieldGeo, weatheredGuardianStoneMat);
      shield.rotation.x = Math.PI / 2;
      shield.position.set(shieldSide * 0.38, 0.96, 0.26);

      const spearShaft = new THREE.Mesh(spearShaftGeo, ironMat);
      spearShaft.position.set(spearSide * 0.44, 1.28, 0.22);
      const spearTip = new THREE.Mesh(spearTipGeo, brassMat);
      spearTip.position.set(spearSide * 0.44, 2.68, 0.22);

      warrior.add(
        torso,
        chestBand,
        head,
        turban,
        turbanCrest,
        spearArm,
        shieldArm,
        shield,
        spearShaft,
        spearTip,
      );
      statueGroup.add(pBase, pMid, pCap, warrior);
      root.add(statueGroup);

      // Compact solid collider on each stone plinth
      wallColliders.push({
        minX: gx - 0.62,
        maxX: gx + 0.62,
        minZ: 10.82,
        maxZ: 12.08,
        minY: 0.0,
        maxY: 3.4,
      });
    });
  };
  buildExteriorStoneGuardianStatues();
}
