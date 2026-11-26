import * as THREE from 'three';

export interface IndoorDustMotesHandle {
  points: THREE.Points;
  update: (
    elapsed: number,
    flashOrigin?: THREE.Vector3,
    flashDir?: THREE.Vector3,
    flashIntensity?: number,
  ) => void;
}

export interface Indoor1992DetailsInput {
  root: THREE.Group;
  swayingCurtains: THREE.Mesh[];
  brassMat: THREE.Material;
}

/**
 * Creates a lightweight GPU-animated floating dust-mote particle field across
 * all indoor Haveli halls, rooms, Grand Atrium, and basement corridors.
 * Motes drift softly in candlelight and catch the luminous glow of the player's
 * flashlight beam in real time with a single draw call and zero per-frame CPU allocations.
 */
export function createFlashlightReactiveDustMotes(
  root: THREE.Group,
): IndoorDustMotesHandle {
  const dustCount = 1120;
  const positions = new Float32Array(dustCount * 3);
  const phases = new Float32Array(dustCount);
  const sizes = new Float32Array(dustCount);

  for (let i = 0; i < dustCount; i++) {
    if (i < 420) {
      // Massive 38m x 31.5m x 17m Central Royal Darbar Atrium & Staircases
      positions[i * 3] = (Math.random() - 0.5) * 37.0;
      positions[i * 3 + 1] = 0.25 + Math.random() * 16.2;
      positions[i * 3 + 2] = -44.5 + Math.random() * 53.8;
    } else if (i < 920) {
      // Side Wing Rooms & Corridors across GF, 2F, and 3F (x in [-31.4, 31.4], z in [-45.4, 9.4])
      positions[i * 3] = (Math.random() - 0.5) * 62.8;
      positions[i * 3 + 1] = 0.25 + Math.random() * 16.0;
      positions[i * 3 + 2] = -45.4 + Math.random() * 54.8;
    } else {
      // Underground 10-Room Basement Labyrinth (shifted -12m in Z: z in [-79.0, -42.0], y in [-4.3, -0.7])
      positions[i * 3] = (Math.random() - 0.5) * 53.0;
      positions[i * 3 + 1] = -4.25 + Math.random() * 3.55;
      positions[i * 3 + 2] = -79.0 + Math.random() * 37.0;
    }
    phases[i] = Math.random() * Math.PI * 2;
    sizes[i] = 0.72 + Math.random() * 1.15;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

  const uniforms = {
    uTime: { value: 0 },
    uFlashPos: { value: new THREE.Vector3(0, 1.6, 20) },
    uFlashDir: { value: new THREE.Vector3(0, 0, -1) },
    uFlashIntensity: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aPhase;
      attribute float aSize;
      uniform float uTime;
      uniform vec3 uFlashPos;
      uniform vec3 uFlashDir;
      uniform float uFlashIntensity;
      uniform float uPixelRatio;

      varying float vBeamGlow;
      varying float vTwinkle;

      void main() {
        // Gentle thermal air drift per particle (zero CPU update cost)
        vec3 p = position;
        float t = uTime * 0.28 + aPhase;
        p.x += sin(t * 0.85 + p.y * 0.35) * 0.26;
        p.y += sin(t * 0.55 + p.z * 0.25) * 0.19;
        p.z += cos(t * 0.72 + p.x * 0.3) * 0.24;

        // Evaluate flashlight beam cone alignment in mansion-local coordinates
        vec3 toMote = p - uFlashPos;
        float dist = length(toMote);
        vec3 dirToMote = toMote / max(dist, 0.001);
        float coneDot = dot(dirToMote, normalize(uFlashDir));
        // Soft spotlight cone matching flashlight (~0.45 rad half-angle + penumbra)
        float coneMask = smoothstep(0.84, 0.965, coneDot);
        float nearFade = smoothstep(0.28, 1.15, dist);
        float farFade = 1.0 - smoothstep(4.5, 17.5, dist);
        vBeamGlow = coneMask * nearFade * farFade * clamp(uFlashIntensity, 0.0, 1.35);

        // Delicate ambient shimmer so floating specks catch candlelight softly
        vTwinkle = 0.65 + 0.35 * sin(uTime * 1.9 + aPhase * 3.1);

        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        float basePt = (15.5 * aSize + vBeamGlow * 13.5) * uPixelRatio;
        gl_PointSize = clamp(basePt / max(-mvPosition.z, 0.8), 1.4, 15.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vBeamGlow;
      varying float vTwinkle;

      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float r = length(c);
        if (r > 0.5) discard;

        // Soft circular bokeh dust speck (never hard squares)
        float softDisk = smoothstep(0.5, 0.05, r);
        softDisk *= softDisk;

        // Warm dusty gold in ambient mashal light -> luminous warm ivory inside flashlight cone
        vec3 ambientDustCol = vec3(0.86, 0.74, 0.54);
        vec3 beamDustCol = vec3(1.0, 0.96, 0.84);
        vec3 finalCol = mix(ambientDustCol, beamDustCol, clamp(vBeamGlow * 1.1, 0.0, 1.0));

        float alpha = softDisk * (0.19 * vTwinkle + vBeamGlow * 0.62);
        gl_FragColor = vec4(finalCol, clamp(alpha, 0.0, 0.85));
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  points.name = 'IndoorFlashlightDustMotes';
  points.frustumCulled = false;
  root.add(points);

  return {
    points,
    update: (elapsed, flashOrigin, flashDir, flashIntensity = 0) => {
      uniforms.uTime.value = elapsed;
      if (flashOrigin && flashDir && flashIntensity > 0.01) {
        uniforms.uFlashPos.value.copy(flashOrigin);
        uniforms.uFlashDir.value.copy(flashDir);
        uniforms.uFlashIntensity.value = flashIntensity;
      } else {
        uniforms.uFlashIntensity.value = 0;
      }
    },
  };
}

/** Procedural translucent corner cobweb texture (anchored at top-left corner) */
function createIndoorCobwebTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  const spokes = 9;
  ctx.strokeStyle = 'rgba(218, 222, 226, 0.52)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= spokes; i++) {
    const a = (i / spokes) * (Math.PI * 0.5);
    const len = 242 - (i % 2) * 14;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(204, 210, 216, 0.36)';
  ctx.lineWidth = 1.1;
  for (let r = 24; r <= 228; r += 24) {
    ctx.beginPath();
    for (let i = 0; i <= spokes; i++) {
      const a = (i / spokes) * (Math.PI * 0.5);
      const sag = i % 2 === 1 ? 0.9 : 1.0;
      const px = Math.cos(a) * r * sag;
      const py = Math.sin(a) * r * sag;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Subtle dusty silk haze tucked in the very apex of the corner
  const haze = ctx.createRadialGradient(0, 0, 4, 0, 0, 120);
  haze.addColorStop(0, 'rgba(220, 224, 228, 0.24)');
  haze.addColorStop(1, 'rgba(220, 224, 228, 0.0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, 130, 130);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Procedural faded 1992 dried red/sindoor handprint smudge with downward finger drag streaks */
function createFadedRedHandprintTexture(): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  // Subtle dried crimson-rusty blotch behind palm
  const bgSmudge = ctx.createRadialGradient(128, 132, 10, 128, 138, 72);
  bgSmudge.addColorStop(0, 'rgba(116, 16, 14, 0.52)');
  bgSmudge.addColorStop(0.55, 'rgba(92, 14, 12, 0.26)');
  bgSmudge.addColorStop(1, 'rgba(72, 10, 10, 0.0)');
  ctx.fillStyle = bgSmudge;
  ctx.fillRect(40, 50, 180, 180);

  // Palm impression
  ctx.save();
  ctx.fillStyle = 'rgba(112, 15, 14, 0.62)';
  ctx.beginPath();
  ctx.ellipse(128, 134, 34, 40, -0.06, 0, Math.PI * 2);
  ctx.fill();

  // Heel of hand slightly offset
  ctx.fillStyle = 'rgba(96, 12, 12, 0.45)';
  ctx.beginPath();
  ctx.ellipse(122, 164, 26, 22, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // 5 Fingers + subtle downward dragged smears (as if someone slipped while running up the stairs)
  const fingers: Array<[number, number, number, number, number, number]> = [
    // [x, y, rx, ry, rot, dragLen]
    [84, 126, 10, 24, -0.58, 36], // thumb
    [101, 78, 9, 28, -0.14, 62], // index
    [122, 68, 9.5, 32, -0.03, 78], // middle
    [144, 74, 9, 29, 0.08, 66], // ring
    [162, 92, 8, 23, 0.22, 48], // pinky
  ];

  for (const [fx, fy, rx, ry, rot, dragLen] of fingers) {
    // Dragged red streak trailing downward from each fingertip
    const dragGrad = ctx.createLinearGradient(fx, fy - 12, fx + 4, fy + dragLen + 45);
    dragGrad.addColorStop(0, 'rgba(110, 14, 12, 0.52)');
    dragGrad.addColorStop(0.55, 'rgba(92, 12, 12, 0.24)');
    dragGrad.addColorStop(1, 'rgba(70, 10, 10, 0.0)');
    ctx.fillStyle = dragGrad;
    ctx.beginPath();
    ctx.roundRect(fx - rx * 0.72, fy, rx * 1.44, dragLen + 45, 6);
    ctx.fill();

    // Solid finger print
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(rot);
    ctx.fillStyle = 'rgba(122, 16, 14, 0.66)';
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Aged dusty abrasion speckles so it looks faded since 1992
  ctx.globalCompositeOperation = 'destination-out';
  for (let s = 0; s < 140; s++) {
    const sx = 55 + ((s * 43) % 150);
    const sy = 42 + ((s * 71) % 190);
    const sr = 1.2 + (s % 4) * 1.4;
    ctx.fillStyle = `rgba(0, 0, 0, ${0.18 + (s % 3) * 0.14})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Procedural tattered 1992 deep-maroon curtain fabric with ragged torn strips & moth holes */
function createTornCorridorCurtainTexture(): THREE.CanvasTexture {
  const w = 192;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  // Clip to jagged tattered lower hem & frayed side edge
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.lineTo(w - 4, 0);
  ctx.lineTo(w - 6, h * 0.72);
  ctx.lineTo(w - 22, h * 0.96);
  ctx.lineTo(w - 40, h * 0.66);
  ctx.lineTo(w - 64, h * 0.93);
  ctx.lineTo(w - 86, h * 0.74);
  ctx.lineTo(w - 110, h * 0.98);
  ctx.lineTo(w - 134, h * 0.7);
  ctx.lineTo(w - 160, h * 0.9);
  ctx.lineTo(10, h * 0.76);
  ctx.closePath();
  ctx.clip();

  // Deep faded 1992 maroon velvet base with vertical fold shading
  const baseGrad = ctx.createLinearGradient(0, 0, 0, h);
  baseGrad.addColorStop(0, '#5a1119');
  baseGrad.addColorStop(0.55, '#420c13');
  baseGrad.addColorStop(1, '#26080b');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, w, h);

  // Pleated vertical light/shadow drapery folds
  for (let x = 0; x < w; x += 24) {
    const foldGrad = ctx.createLinearGradient(x, 0, x + 24, 0);
    foldGrad.addColorStop(0, 'rgba(0,0,0,0.34)');
    foldGrad.addColorStop(0.45, 'rgba(180,95,70,0.14)');
    foldGrad.addColorStop(1, 'rgba(0,0,0,0.34)');
    ctx.fillStyle = foldGrad;
    ctx.fillRect(x, 0, 24, h);
  }

  // Faded antique gold zari border trim along top & inner edge
  ctx.fillStyle = 'rgba(182, 138, 56, 0.42)';
  ctx.fillRect(0, 8, w, 10);
  ctx.fillRect(w - 18, 0, 8, h * 0.85);

  // Subtle dusty cobwebby aging near bottom
  const dustGrad = ctx.createLinearGradient(0, h * 0.5, 0, h);
  dustGrad.addColorStop(0, 'rgba(120, 108, 92, 0)');
  dustGrad.addColorStop(1, 'rgba(120, 108, 92, 0.28)');
  ctx.fillStyle = dustGrad;
  ctx.fillRect(0, h * 0.5, w, h * 0.5);
  ctx.restore();

  // Punch a few small irregular tears / moth holes through the old 1992 cloth
  ctx.globalCompositeOperation = 'destination-out';
  [
    [54, 210, 11, 22, 0.2],
    [126, 175, 8, 18, -0.3],
    [92, 265, 13, 28, 0.12],
    [148, 250, 7, 15, -0.15],
  ].forEach(([hx, hy, rx, ry, rot]) => {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Adds subtle 1992 horror details across Haveli corridors, upper ceiling corners,
 * and staircases using shared geometries & procedural CanvasTextures:
 *  1. Translucent cobwebs in upper ceiling corners (GF, 2F, 3F)
 *  2. Faded dried red handprint smudges & finger-drag streaks near staircases
 *  3. Swaying torn curtains along corridor arch flanks & galleries (animated in updateAtmosphere)
 */
export function buildIndoor1992HorrorDetails(
  input: Indoor1992DetailsInput,
): void {
  const { root, swayingCurtains, brassMat } = input;

  // --------------------------------------------------------------------------
  // 1. TRANSLUCENT COBWEBS IN UPPER CEILING CORNERS (GF, 2F, 3F)
  // --------------------------------------------------------------------------
  const cobwebMat = new THREE.MeshBasicMaterial({
    map: createIndoorCobwebTexture(),
    transparent: true,
    opacity: 0.62,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const cobwebGeo = new THREE.PlaneGeometry(1.55, 1.55);

  // [x, y, z, rotY, rotX, scale]
  const cobwebSpots: Array<[number, number, number, number, number, number]> = [
    // Ground Floor Atrium & Corridors (y ~ 4.25m, tucked strictly in upper wall corners)
    [-18.2, 4.25, 9.1, Math.PI * 0.25, 0.14, 1.2],
    [18.2, 4.25, 9.1, -Math.PI * 0.25, 0.14, 1.2],
    [-18.2, 4.25, -8.4, Math.PI * 0.5, 0.1, 1.1],
    [18.2, 4.25, -8.4, -Math.PI * 0.5, 0.1, 1.1],
    [-18.2, 4.25, -27.2, Math.PI * 0.75, 0.12, 1.18],
    [18.2, 4.25, -27.2, -Math.PI * 0.75, 0.12, 1.18],
    [-18.2, 4.25, -44.8, Math.PI * 0.75, 0.12, 1.15],
    [18.2, 4.25, -44.8, -Math.PI * 0.75, 0.12, 1.15],
    // Inside key GF rooms (upper corners)
    [-31.1, 4.25, -9.2, Math.PI * 0.25, 0.1, 1.1], // G2 Kitchen
    [31.1, 4.25, 9.1, -Math.PI * 0.75, 0.1, 1.1], // G3 Munim Room

    // Second Floor Galleries & Corridors (y ~ 9.25m)
    [-18.2, 9.25, 5.2, Math.PI * 0.25, 0.12, 1.2],
    [18.2, 9.25, 5.2, -Math.PI * 0.25, 0.12, 1.2],
    [-18.2, 9.25, -21.2, Math.PI * 0.5, 0.1, 1.15],
    [18.2, 9.25, -21.2, -Math.PI * 0.5, 0.1, 1.15],
    [-18.2, 9.25, -44.8, Math.PI * 0.75, 0.12, 1.2],
    [18.2, 9.25, -44.8, -Math.PI * 0.75, 0.12, 1.2],
    [31.1, 9.25, 9.1, -Math.PI * 0.75, 0.1, 1.1], // 2F-1 Bridal Room
    [-31.1, 9.25, 9.1, Math.PI * 0.75, 0.1, 1.1], // 2F-2 Master Bedroom

    // Third Floor Galleries & 17m High Coffered Atrium Corners (y ~ 16.2m)
    [-18.2, 16.2, 5.2, Math.PI * 0.25, 0.12, 1.3],
    [18.2, 16.2, 5.2, -Math.PI * 0.25, 0.12, 1.3],
    [-18.2, 16.2, -30.5, Math.PI * 0.75, 0.12, 1.25],
    [18.2, 16.2, -30.5, -Math.PI * 0.75, 0.12, 1.25],
    [-18.2, 16.2, -44.8, Math.PI * 0.75, 0.12, 1.25],
    [18.2, 16.2, -44.8, -Math.PI * 0.75, 0.12, 1.25],
    [-31.1, 16.2, -7.7, Math.PI * 0.25, 0.1, 1.15], // 3F-1 Library
  ];

  for (const [cx, cy, cz, ry, rx, sc] of cobwebSpots) {
    const web = new THREE.Mesh(cobwebGeo, cobwebMat);
    web.position.set(cx, cy, cz);
    web.rotation.set(rx, ry, 0);
    web.scale.setScalar(sc);
    root.add(web);
  }

  // --------------------------------------------------------------------------
  // 2. FADED 1992 RED HANDPRINT SMUDGES NEAR THE STAIRCASES
  // --------------------------------------------------------------------------
  const handprintMat = new THREE.MeshStandardMaterial({
    map: createFadedRedHandprintTexture(),
    transparent: true,
    opacity: 0.68,
    roughness: 0.92,
    metalness: 0.02,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const handprintGeo = new THREE.PlaneGeometry(0.46, 0.56);

  // [x, y, z, rotY, rotZ, scale] — mounted cleanly flush on staircase balustrades, landings & adjacent walls
  const handprintSpots: Array<[number, number, number, number, number, number]> = [
    // Grand Double-Wing Staircase: front sandstone newel posts & lower balustrade flanks (z = -21.5..-27.0)
    [-3.42, 0.92, -21.21, 0, 0.16, 0.85],
    [3.42, 1.02, -21.21, 0, -0.22, 0.8],
    [-3.29, 1.38, -23.5, Math.PI / 2, -0.28, 0.92],
    [3.29, 1.85, -25.1, -Math.PI / 2, 0.24, 0.88],

    // Grand Mid Landing (y = 2.5): north parapet inner face (z = -31.0) & GF support side walls (x = ±3.8)
    [-1.25, 3.12, -30.88, 0, -0.18, 0.95],
    [0.95, 3.04, -30.88, 0, 0.25, 0.86],
    [-3.94, 1.48, -28.9, -Math.PI / 2, -0.14, 0.9],
    [3.94, 1.56, -29.3, Math.PI / 2, 0.2, 0.9],

    // Split Wing Arrivals on 2F West & East Corridors (near stair exits)
    [-18.82, 6.42, -28.7, Math.PI / 2, -0.22, 0.96],
    [-18.82, 6.18, -29.25, Math.PI / 2, 0.15, 0.82],
    [18.82, 6.52, -29.1, -Math.PI / 2, 0.24, 0.95],

    // Upper Grand Staircase (2F -> 3F, x in [-3.0, 3.0], z = -34.5..-42.5): flanking balustrades & top wall
    [-2.89, 6.85, -36.2, Math.PI / 2, -0.25, 0.9],
    [2.89, 8.15, -38.8, -Math.PI / 2, 0.2, 0.92],
    [-2.89, 9.45, -41.0, Math.PI / 2, -0.16, 0.88],
    [-1.1, 6.55, -42.36, 0, 0.18, 0.95],

    // 3F Stair Landing nearby corridor walls
    [-18.82, 11.45, -39.2, Math.PI / 2, -0.2, 0.92],
    [18.82, 11.38, -39.6, -Math.PI / 2, 0.22, 0.9],
  ];

  for (const [hx, hy, hz, ry, rz, sc] of handprintSpots) {
    const decal = new THREE.Mesh(handprintGeo, handprintMat);
    decal.position.set(hx, hy, hz);
    decal.rotation.set(0, ry, rz);
    decal.scale.setScalar(sc);
    root.add(decal);
  }

  // --------------------------------------------------------------------------
  // 3. SWAYING TORN CURTAINS ALONG CORRIDORS & GALLERY ARCHES
  //    Top-pivoted at y=0 so updateAtmosphere sways them naturally from their rods!
  // --------------------------------------------------------------------------
  const tornCurtainMat = new THREE.MeshStandardMaterial({
    map: createTornCorridorCurtainTexture(),
    transparent: true,
    alphaTest: 0.18,
    roughness: 0.92,
    metalness: 0.03,
    side: THREE.DoubleSide,
  });

  // Shift geometry downward by half-height so mesh.position is the top curtain rod pivot
  const curtainH = 3.15;
  const curtainW = 1.25;
  const tornCurtainGeo = new THREE.PlaneGeometry(curtainW, curtainH, 4, 6);
  tornCurtainGeo.translate(0, -curtainH / 2, 0);
  // Subtle organic wave along X so torn drapes look softly pleated
  const posAttr = tornCurtainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const px = posAttr.getX(i);
    const py = posAttr.getY(i);
    const fold = Math.sin(px * 7.5) * 0.055 * Math.min(1, -py * 0.45);
    posAttr.setZ(i, fold);
  }
  tornCurtainGeo.computeVertexNormals();

  const curtainRodGeo = new THREE.CylinderGeometry(0.022, 0.022, curtainW + 0.22, 7);
  curtainRodGeo.rotateZ(Math.PI / 2);

  // [x, topY, z, rotY] — strictly framing corridor corners, balcony edges & stair gallery flanks
  // (never blocking any room doorway or walking centerline!)
  const tornCurtainSpots: Array<[number, number, number, number]> = [
    // Ground Floor Atrium & Rear Gallery flanks
    [-14.6, 4.45, -31.05, 0],
    [14.6, 4.45, -31.05, 0],
    [-17.65, 4.45, -34.5, Math.PI / 2],
    [17.65, 4.45, -34.5, -Math.PI / 2],

    // Second Floor Wrap-Around Balcony & Upper Stair Flanks
    [-12.6, 9.45, 5.55, 0],
    [12.6, 9.45, 5.55, 0],
    [-5.35, 9.45, -34.25, 0],
    [5.35, 9.45, -34.25, 0],
    [-17.85, 9.45, -12.2, Math.PI / 2],
    [17.85, 9.45, -12.2, -Math.PI / 2],

    // Third Floor Upper Gallery & Watchtower Balcony Flanks
    [-12.6, 14.45, 5.55, 0],
    [12.6, 14.45, 5.55, 0],
    [-5.35, 14.45, -34.25, 0],
    [5.35, 14.45, -34.25, 0],
    [-17.85, 14.45, -25.2, Math.PI / 2],
    [17.85, 14.45, -25.2, -Math.PI / 2],
  ];

  for (const [cx, topY, cz, ry] of tornCurtainSpots) {
    const rod = new THREE.Mesh(curtainRodGeo, brassMat);
    rod.position.set(cx, topY + 0.03, cz);
    rod.rotation.y = ry;
    root.add(rod);

    const drape = new THREE.Mesh(tornCurtainGeo, tornCurtainMat);
    drape.rotation.order = 'YXZ';
    drape.position.set(cx, topY, cz);
    drape.rotation.y = ry;
    root.add(drape);
    swayingCurtains.push(drape);
  }
}
