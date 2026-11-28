import * as THREE from 'three';

export type WeatherGraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';

export interface SwayTarget {
  object: THREE.Object3D;
  baseRotX: number;
  baseRotZ: number;
  phase: number;
  ampX: number;
  ampZ: number;
  speed: number;
}

export interface StormUpdateResult {
  lightningFlash: number;
  isOutdoors: boolean;
  isBasement: boolean;
  windGust: number;
  windDirX: number;
  windDirZ: number;
  strikeAzimuth: number;
}

export interface StormRainAcousticSample {
  /** 0.0 (underground silent) .. 0.14 (deep indoor) .. 0.45 (window/edge) .. 0.84 (courtyard doorway) .. 1.0 (open sky) */
  exposure: number;
  /** 0.0 (open sky crisp) .. 0.92 (thick stone walls / covered roof muffle) */
  indoorMuffle: number;
  /** -0.82..+0.82 stereo spatial pull toward nearest open courtyard/window when indoors; 0 outdoors */
  pan: number;
  /** 0.0..1.0 subtle extra clarity when listener faces toward the nearest open courtyard/window */
  facingClarity: number;
  /** Current rhythmic storm gust factor (0..1) for subtle organic rain intensity swell */
  windGust: number;
  /** Sunrise storm fade multiplier (1 = night storm, 0 = bright dawn) */
  stormFade: number;
}

interface RainStreakData {
  x: number;
  y: number;
  z: number;
  speed: number;
  length: number;
}

interface MistGustData {
  mesh: THREE.Mesh;
  zone: 'road' | 'front_yard' | 'back_yard';
  x: number;
  y: number;
  z: number;
  speed: number;
  baseOpacity: number;
  phase: number;
}

// Reusable temp color to avoid per-frame allocations
const _rainColorBase = new THREE.Color(0xaecce8);
const _rainColorFlash = new THREE.Color(0xeef6ff);

/**
 * Modular 3D Storm Weather System for Thakur Haveli:
 * - Slanted falling 3D rain streaks (THREE.LineSegments) strictly outdoors & in open courtyards
 * - Exact Roof/Indoor masking so zero raindrops ever clip through ceilings or basement
 * - Natural random double-flash lightning every 8-18s with 0.5-1.5s delayed thunder trigger
 * - Rhythmic wind-sway animation for trees, bushes, hanging courtyard lanterns & curtains
 * - Wind-blown horizontal mist/rain-gust streaks drifting across the dirt road & courtyards
 */
export class StormWeatherSystem {
  public readonly group = new THREE.Group();

  private readonly isMobile =
    typeof navigator !== 'undefined' &&
    (/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ||
      (typeof window !== 'undefined' &&
        'ontouchstart' in window &&
        navigator.maxTouchPoints > 0));
  private readonly maxRainStreaks = 250;
  private activeRainCount = this.isMobile ? 120 : 250;
  private readonly rainData: RainStreakData[] = [];
  private readonly rainPositions: Float32Array;
  private readonly rainGeometry: THREE.BufferGeometry;
  private readonly rainMaterial: THREE.LineBasicMaterial;
  private readonly rainLines: THREE.LineSegments;

  private readonly mistGusts: MistGustData[] = [];
  private readonly mistMaterial: THREE.MeshBasicMaterial;
  private readonly mistTexture: THREE.CanvasTexture;
  private activeMistCount = this.isMobile ? 8 : 24;

  private readonly swayTrees: SwayTarget[] = [];
  private readonly swayBushes: SwayTarget[] = [];
  private readonly swayLanterns: SwayTarget[] = [];

  // Lightning double-flash state machine
  private nextStrikeTime = 7.5;
  private strikeElapsed = -1;
  private flash1Dur = 0.14;
  private flashGap = 0.085;
  private flash2Dur = 0.18;
  private strikeAzimuth = 0.65;
  private pendingThunderDelay = -1;
  private lastStormFade = 1.0;
  private lastWindGust = 0.5;
  private readonly acousticScratch: StormRainAcousticSample = {
    exposure: 1.0,
    indoorMuffle: 0.0,
    pan: 0.0,
    facingClarity: 1.0,
    windGust: 0.5,
    stormFade: 1.0,
  };
  private readonly updateResultScratch: StormUpdateResult = {
    lightningFlash: 0,
    isOutdoors: true,
    isBasement: false,
    windGust: 0.5,
    windDirX: 0,
    windDirZ: 0,
    strikeAzimuth: 0.65,
  };

  // Rain bounding volume around camera/player
  private readonly rainRadiusXZ = 27.0;
  private readonly rainTopOffset = 18.5;
  private readonly rainBottomOffset = -3.5;

  constructor(root: THREE.Object3D) {
    this.group.name = 'ThakurHaveliStormWeather';
    root.add(this.group);

    // 1. Slanted 3D Storm Rain via single-draw-call THREE.LineSegments
    this.rainPositions = new Float32Array(this.maxRainStreaks * 2 * 3);
    for (let i = 0; i < this.maxRainStreaks; i++) {
      this.rainData.push({
        x: (Math.random() - 0.5) * this.rainRadiusXZ * 2,
        y: Math.random() * 20,
        z: 35 + (Math.random() - 0.5) * this.rainRadiusXZ * 2,
        speed: 19.5 + Math.random() * 9.5,
        length: 0.68 + Math.random() * 0.58,
      });
    }

    this.rainGeometry = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(this.rainPositions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    this.rainGeometry.setAttribute('position', posAttr);
    this.rainGeometry.setDrawRange(0, this.activeRainCount * 2);

    this.rainMaterial = new THREE.LineBasicMaterial({
      color: 0xaecce8,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      fog: true,
    });

    this.rainLines = new THREE.LineSegments(this.rainGeometry, this.rainMaterial);
    this.rainLines.name = 'StormRainStreaks';
    this.rainLines.frustumCulled = false;
    this.rainLines.renderOrder = 4;
    this.group.add(this.rainLines);

    // 2. Wind-blown horizontal mist / rain-gust streaks across SUV road & courtyards
    this.mistTexture = this.createMistGustTexture();
    this.mistMaterial = new THREE.MeshBasicMaterial({
      map: this.mistTexture,
      color: 0xaac4de,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true,
    });

    const mistGeo = new THREE.PlaneGeometry(1, 1);
    const totalMist = 40;
    for (let i = 0; i < totalMist; i++) {
      const zone: 'road' | 'front_yard' | 'back_yard' =
        i < 16 ? 'road' : i < 32 ? 'front_yard' : 'back_yard';
      const mat = this.mistMaterial.clone();
      const mesh = new THREE.Mesh(mistGeo, mat);
      const w = 5.5 + (i % 4) * 2.1;
      const h = 1.15 + (i % 3) * 0.42;
      mesh.scale.set(w, h, 1);
      mesh.rotation.y = 0.24 + ((i % 3) - 1) * 0.08;
      mesh.renderOrder = 3;

      let x = 0;
      let y = 0.8 + (i % 4) * 0.58;
      let z = 45;
      if (zone === 'road') {
        x = -16 + Math.random() * 32;
        z = 35 + Math.random() * 38;
      } else if (zone === 'front_yard') {
        x = -26 + Math.random() * 52;
        z = 11.5 + Math.random() * 21.5;
      } else {
        x = -16 + Math.random() * 32;
        z = -74 + Math.random() * 25.5;
        y = 0.9 + (i % 3) * 0.65;
      }

      mesh.position.set(x, y, z);
      this.group.add(mesh);
      this.mistGusts.push({
        mesh,
        zone,
        x,
        y,
        z,
        speed: 4.8 + Math.random() * 4.4,
        baseOpacity: 0.11 + Math.random() * 0.09,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private createMistGustTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 256, 64);
      // Soft horizontally-streaked storm mist sheet (zero hard edges)
      const hGrad = ctx.createLinearGradient(0, 0, 256, 0);
      hGrad.addColorStop(0.0, 'rgba(180, 210, 240, 0.0)');
      hGrad.addColorStop(0.22, 'rgba(180, 210, 240, 0.42)');
      hGrad.addColorStop(0.55, 'rgba(195, 222, 248, 0.58)');
      hGrad.addColorStop(0.82, 'rgba(175, 206, 238, 0.34)');
      hGrad.addColorStop(1.0, 'rgba(180, 210, 240, 0.0)');
      ctx.fillStyle = hGrad;
      ctx.fillRect(0, 0, 256, 64);

      ctx.globalCompositeOperation = 'destination-in';
      const vGrad = ctx.createLinearGradient(0, 0, 0, 64);
      vGrad.addColorStop(0.0, 'rgba(255,255,255,0.0)');
      vGrad.addColorStop(0.35, 'rgba(255,255,255,0.85)');
      vGrad.addColorStop(0.55, 'rgba(255,255,255,1.0)');
      vGrad.addColorStop(1.0, 'rgba(255,255,255,0.0)');
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, 256, 64);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  public registerSwayTree(obj: THREE.Object3D, phase: number, scale = 1.0) {
    // Heavier scale trees sway with slightly deeper, slower momentum
    const flex = THREE.MathUtils.clamp(1.18 / Math.max(0.75, scale), 0.65, 1.25);
    this.swayTrees.push({
      object: obj,
      baseRotX: obj.rotation.x,
      baseRotZ: obj.rotation.z,
      phase,
      ampX: 0.016 * flex,
      ampZ: 0.028 * flex,
      speed: 1.05 + (phase % 0.5),
    });
  }

  public registerSwayBush(obj: THREE.Object3D, phase: number) {
    this.swayBushes.push({
      object: obj,
      baseRotX: obj.rotation.x,
      baseRotZ: obj.rotation.z,
      phase,
      ampX: 0.032,
      ampZ: 0.052,
      speed: 2.15 + (phase % 0.7),
    });
  }

  public registerSwayLantern(obj: THREE.Object3D, phase: number) {
    this.swayLanterns.push({
      object: obj,
      baseRotX: obj.rotation.x,
      baseRotZ: obj.rotation.z,
      phase,
      ampX: 0.065,
      ampZ: 0.095,
      speed: 1.85 + (phase % 0.45),
    });
  }

  /**
   * Scales 3D rain streak count & wind-mist density by Settings Graphics Quality preset:
   * - SMOOTH ('low'): light/optimized for low-end Android phones
   * - STANDARD ('medium'): balanced storm density
   * - ULTRA ('high' / 'ultra'): full heavy monsoon storm
   */
  public setQuality(quality: WeatherGraphicsQuality) {
    if (this.isMobile || quality === 'low') {
      this.activeRainCount = 120;
      this.activeMistCount = 8;
    } else if (quality === 'medium') {
      this.activeRainCount = 200;
      this.activeMistCount = 16;
    } else {
      this.activeRainCount = 250;
      this.activeMistCount = 24;
    }
    this.rainGeometry.setDrawRange(0, this.activeRainCount * 2);
    for (let i = 0; i < this.mistGusts.length; i++) {
      this.mistGusts[i].mesh.visible = i < this.activeMistCount;
    }
  }

  /**
   * Exact roof & underground masking for Thakur Haveli:
   * - Covered Main Haveli Palace footprint: x in [-32.4, 32.4], z in [-46.4, 10.4], y < 17.5
   * - Underground Basement: y < -0.15
   * - Shiva Temple roofed sanctuary (guardhouseGroup at 13.2, 0, 27.2): x in [10.1, 16.4], z in [24.2, 30.2], y < 4.1
   * Open-sky areas (SUV Forest Road z > 34, Front Courtyard z in 10.4..34, Shiva Temple surrounds,
   * and open-sky Back Well Courtyard z in -76..-46.4) return false so rain falls naturally there.
   */
  public isPointUnderCoveredRoof(x: number, y: number, z: number): boolean {
    if (y < -0.15) return true;
    // Covered 3-floor Thakur Haveli interior + grand atrium roof
    if (x >= -32.4 && x <= 32.4 && z >= -46.4 && z <= 10.4 && y <= 17.6) {
      return true;
    }
    // Shiva Temple covered Mandapa & Garbhagriha roof slab
    if (x >= 10.1 && x <= 16.4 && z >= 24.2 && z <= 30.2 && y <= 4.1) {
      return true;
    }
    return false;
  }

  public isPlayerOutdoors(playerPos: THREE.Vector3): boolean {
    return !this.isPointUnderCoveredRoof(
      playerPos.x,
      playerPos.y + 1.2,
      playerPos.z,
    );
  }

  /**
   * Computes smooth 3D spatial rain acoustic parameters based on continuous proximity to:
   * - Open-sky courtyards (Front Courtyard z > 10.4, SUV Road z > 34, Back Well Courtyard z < -46.4)
   * - Main Front Entrance Doorway (0, 1.5, 10.4) & Back Courtyard Archway (0, 1.5, -46.4)
   * - Exterior Jali windows along the Haveli perimeter (x = ±32.4, z = 10.4 / -46.4)
   * - Shiva Temple open-sided covered shelter (x in [10.1, 16.4], z in [24.2, 30.2])
   * - Covered interior halls vs. underground Basement B1 (y < -0.25)
   */
  public sampleRainAcoustics(
    playerPos: THREE.Vector3,
    camForward: THREE.Vector3,
    camRight: THREE.Vector3,
    out: StormRainAcousticSample = this.acousticScratch,
  ): StormRainAcousticSample {
    const px = playerPos.x;
    const py = playerPos.y;
    const pz = playerPos.z;

    out.stormFade = this.lastStormFade;
    out.windGust = this.lastWindGust;

    // 1. Underground Basement B1: smoothly muffle and silence as player descends stairs (y: -0.25 -> -2.9)
    if (py < -0.25) {
      const depthT = THREE.MathUtils.clamp((-py - 0.25) / 2.65, 0, 1);
      const undergroundFade = (1 - depthT) * (1 - depthT);
      out.exposure = 0.14 * undergroundFade;
      out.indoorMuffle = THREE.MathUtils.lerp(0.84, 0.98, depthT);
      out.pan = 0;
      out.facingClarity = 0.15;
      return out;
    }

    // 2. Open-Sky Outdoors (SUV Road, Front Courtyard, Shiva Temple exterior, Back Well Courtyard)
    if (!this.isPointUnderCoveredRoof(px, py + 1.2, pz)) {
      out.exposure = 1.0;
      out.indoorMuffle = 0.0;
      out.pan = 0.0;
      out.facingClarity = 1.0;
      return out;
    }

    // 3. Shiva Temple open-sided covered Mandapa (rain pours right outside all 4 sides)
    if (px >= 10.1 && px <= 16.4 && pz >= 24.2 && pz <= 30.2 && py <= 4.1) {
      const distEdgeX = Math.min(px - 10.1, 16.4 - px);
      const distEdgeZ = Math.min(pz - 24.2, 30.2 - pz);
      const minEdge = Math.max(0, Math.min(distEdgeX, distEdgeZ));
      // 0m at pillar edge -> 0.88 exposure; 3m deep inside sanctum -> 0.58 exposure
      const edgeT = THREE.MathUtils.clamp(minEdge / 3.2, 0, 1);
      out.exposure = THREE.MathUtils.lerp(0.88, 0.58, edgeT);
      out.indoorMuffle = THREE.MathUtils.lerp(0.18, 0.42, edgeT);
      // Gentle stereo pull toward temple open front facing west/courtyard (-X)
      const dx = 10.1 - px;
      const dz = 27.2 - pz;
      const len = Math.hypot(dx, dz) || 1;
      const nx = dx / len;
      const nz = dz / len;
      out.pan = THREE.MathUtils.clamp((nx * camRight.x + nz * camRight.z) * 0.35, -0.4, 0.4);
      out.facingClarity = THREE.MathUtils.clamp(
        0.65 + (nx * camForward.x + nz * camForward.z) * 0.3,
        0.35,
        1.0,
      );
      return out;
    }

    // 4. Inside Covered Thakur Haveli Palace (x in [-32.4, 32.4], z in [-46.4, 10.4])
    // Evaluate acoustic energy from the major open-sky portals and perimeter Jali windows:
    // (a) Front Courtyard Main Entrance Portal: (0, 0, 10.4)
    const dFrontPortal = Math.hypot(px - 0, (py - 0.0) * 1.15, pz - 10.4);
    const frontPortalEnergy =
      0.86 * Math.exp(-dFrontPortal / 11.5) * THREE.MathUtils.clamp(1 - dFrontPortal / 34, 0, 1);

    // (b) Back Well Courtyard Open Archway Portal: (0, 0, -46.4)
    const dBackPortal = Math.hypot(px - 0, (py - 0.0) * 1.15, pz - -46.4);
    const backPortalEnergy =
      0.86 * Math.exp(-dBackPortal / 11.5) * THREE.MathUtils.clamp(1 - dBackPortal / 34, 0, 1);

    // (c) Nearest Exterior Perimeter Wall / Jali Window (Front z=10.4, Back z=-46.4, Left x=-32.4, Right x=32.4)
    const dFrontWall = Math.max(0, 10.4 - pz);
    const dBackWall = Math.max(0, pz - -46.4);
    const dLeftWall = Math.max(0, px - -32.4);
    const dRightWall = Math.max(0, 32.4 - px);

    let minWallDist = dFrontWall;
    let wallSrcX = px;
    let wallSrcZ = 10.4;
    if (dBackWall < minWallDist) {
      minWallDist = dBackWall;
      wallSrcX = px;
      wallSrcZ = -46.4;
    }
    if (dLeftWall < minWallDist) {
      minWallDist = dLeftWall;
      wallSrcX = -32.4;
      wallSrcZ = pz;
    }
    if (dRightWall < minWallDist) {
      minWallDist = dRightWall;
      wallSrcX = 32.4;
      wallSrcZ = pz;
    }
    const wallWindowEnergy = 0.44 * Math.exp(-minWallDist / 7.2);

    // (d) Subtle roof-patter boost on the top 3rd floor (y >= 8.5, directly beneath Haveli roof)
    const topFloorRoofBoost = py >= 8.2 ? 0.08 : 0.0;

    // Combine smoothly with an ambient deep-interior muffled baseline (~0.13)
    const combinedExposure = THREE.MathUtils.clamp(
      Math.max(
        0.13 + topFloorRoofBoost,
        frontPortalEnergy,
        backPortalEnergy,
        wallWindowEnergy + 0.08,
      ) +
        (frontPortalEnergy + backPortalEnergy) * 0.08,
      0.13,
      0.92,
    );

    // Compute energy-weighted 3D direction vector toward dominant open courtyard / exterior window
    let dirX = 0;
    let dirZ = 0;
    const addSource = (sx: number, sz: number, weight: number) => {
      if (weight <= 0.005) return;
      const dx = sx - px;
      const dz = sz - pz;
      const len = Math.hypot(dx, dz);
      if (len > 0.25) {
        dirX += (dx / len) * weight;
        dirZ += (dz / len) * weight;
      }
    };
    addSource(0, 10.4, frontPortalEnergy * 1.35);
    addSource(0, -46.4, backPortalEnergy * 1.35);
    addSource(wallSrcX, wallSrcZ, wallWindowEnergy * 0.95);

    const dirLen = Math.hypot(dirX, dirZ);
    let pan = 0;
    let facingClarity = 0.5;
    if (dirLen > 0.02) {
      const nx = dirX / dirLen;
      const nz = dirZ / dirLen;
      // Dot with camera right vector -> stereo pan (-left / +right); scale gently with directional strength
      const spatialStrength = THREE.MathUtils.clamp(dirLen * 1.15, 0.12, 0.82);
      pan = THREE.MathUtils.clamp(
        (nx * camRight.x + nz * camRight.z) * spatialStrength,
        -0.82,
        0.82,
      );
      const forwardDot = nx * camForward.x + nz * camForward.z;
      facingClarity = THREE.MathUtils.clamp(0.55 + forwardDot * 0.45, 0.12, 1.0);
    }

    // Muffle inversely tracks exposure (0.36 right inside doorway -> 0.92 deep center of mansion)
    const muffle = THREE.MathUtils.clamp(
      1.04 - combinedExposure * 0.82 - facingClarity * 0.08,
      0.28,
      0.92,
    );

    out.exposure = combinedExposure;
    out.indoorMuffle = muffle;
    out.pan = pan;
    out.facingClarity = facingClarity;
    return out;
  }

  public update(
    elapsed: number,
    dt: number,
    playerPos: THREE.Vector3,
    options?: {
      paused?: boolean;
      sunriseProgress?: number;
      onThunderBoom?: (outdoorFactor: number) => void;
    },
  ): StormUpdateResult {
    const safeDt = Math.min(0.05, Math.max(0.001, dt));
    const sunrise = THREE.MathUtils.clamp(options?.sunriseProgress ?? 0, 0, 1);
    const stormFade = Math.max(0, 1 - sunrise * 1.4);

    const isBasement = playerPos.y < -1.1;
    const isOutdoors = !isBasement && this.isPlayerOutdoors(playerPos);

    // 1. Smooth rhythmic wind gusts (layered organic sine waves, never jerky)
    const windGust =
      (0.48 +
        0.3 * Math.sin(elapsed * 0.58) +
        0.16 * Math.sin(elapsed * 1.37 + 1.2) +
        0.06 * Math.cos(elapsed * 2.45 + 0.5)) *
      Math.max(0.25, stormFade);
    this.lastStormFade = stormFade;
    this.lastWindGust = windGust;
    const windAngle = 0.42 + Math.sin(elapsed * 0.19) * 0.22;
    const windDirX = Math.cos(windAngle);
    const windDirZ = Math.sin(windAngle);

    // 2. Random Natural Lightning Strikes every 8 to 18 seconds (realistic double-flash 120-250ms)
    let lightningFlash = 0;
    if (!options?.paused && stormFade > 0.15) {
      if (this.strikeElapsed < 0 && elapsed >= this.nextStrikeTime) {
        this.strikeElapsed = 0;
        this.flash1Dur = 0.12 + Math.random() * 0.045; // 120-165ms
        this.flashGap = 0.065 + Math.random() * 0.045; // 65-110ms dark split
        this.flash2Dur = 0.14 + Math.random() * 0.1; // 140-240ms second spike
        this.strikeAzimuth = Math.random() * Math.PI * 2;
        this.nextStrikeTime = elapsed + 8.0 + Math.random() * 10.0; // 8-18s interval
        this.pendingThunderDelay = 0.5 + Math.random() * 1.0; // 0.5-1.5s delay
      }

      if (this.strikeElapsed >= 0) {
        this.strikeElapsed += safeDt;
        const t = this.strikeElapsed;
        const f1End = this.flash1Dur;
        const f2Start = f1End + this.flashGap;
        const f2End = f2Start + this.flash2Dur;

        if (t <= f1End) {
          const u = t / f1End;
          lightningFlash = Math.sin(u * Math.PI) * 0.92;
        } else if (t < f2Start) {
          lightningFlash = 0.08;
        } else if (t <= f2End) {
          const u = (t - f2Start) / this.flash2Dur;
          lightningFlash = Math.pow(Math.sin(u * Math.PI), 0.72) * 1.0;
        } else {
          this.strikeElapsed = -1;
          lightningFlash = 0;
        }
        lightningFlash *= stormFade;
      }

      if (this.pendingThunderDelay >= 0) {
        this.pendingThunderDelay -= safeDt;
        if (this.pendingThunderDelay <= 0) {
          this.pendingThunderDelay = -1;
          const outdoorFactor = isBasement ? 0.35 : isOutdoors ? 1.0 : 0.58;
          options?.onThunderBoom?.(outdoorFactor);
        }
      }
    }

    // 3. Update Slanted 3D Rain Streaks (strictly masked outdoors & open courtyards)
    const showRain = !isBasement && stormFade > 0.05;
    this.rainLines.visible = showRain;
    if (showRain && !options?.paused) {
      const slantX = windDirX * (0.16 + windGust * 0.24);
      const slantZ = windDirZ * (0.16 + windGust * 0.24);
      const minX = playerPos.x - this.rainRadiusXZ;
      const maxX = playerPos.x + this.rainRadiusXZ;
      const minZ = playerPos.z - this.rainRadiusXZ;
      const maxZ = playerPos.z + this.rainRadiusXZ;
      const spanXZ = this.rainRadiusXZ * 2;
      const minY = Math.max(-0.05, playerPos.y + this.rainBottomOffset);
      const maxY = playerPos.y + this.rainTopOffset;
      const spanY = Math.max(8, maxY - minY);

      const arr = this.rainPositions;
      for (let i = 0; i < this.activeRainCount; i++) {
        const drop = this.rainData[i];
        drop.x += slantX * drop.speed * safeDt * 0.55;
        drop.z += slantZ * drop.speed * safeDt * 0.55;
        drop.y -= drop.speed * safeDt;

        // Wrap vertically and horizontally around the player's moving volume
        if (drop.y < minY) {
          drop.y = maxY - Math.random() * 2.5;
          drop.x = minX + Math.random() * spanXZ;
          drop.z = minZ + Math.random() * spanXZ;
        } else {
          if (drop.x < minX) drop.x += spanXZ;
          else if (drop.x > maxX) drop.x -= spanXZ;
          if (drop.z < minZ) drop.z += spanXZ;
          else if (drop.z > maxZ) drop.z -= spanXZ;
        }

        const idx = i * 6;
        const botX = drop.x + slantX * drop.length;
        const botY = drop.y - drop.length;
        const botZ = drop.z + slantZ * drop.length;

        // Strict roof/indoor masking: collapse any drop touching the covered Haveli or Shiva Temple roof
        if (
          this.isPointUnderCoveredRoof(drop.x, drop.y, drop.z) ||
          this.isPointUnderCoveredRoof(botX, botY, botZ)
        ) {
          arr[idx + 0] = 0;
          arr[idx + 1] = -999;
          arr[idx + 2] = 0;
          arr[idx + 3] = 0;
          arr[idx + 4] = -999;
          arr[idx + 5] = 0;
        } else {
          arr[idx + 0] = drop.x;
          arr[idx + 1] = drop.y;
          arr[idx + 2] = drop.z;
          arr[idx + 3] = botX;
          arr[idx + 4] = Math.max(0.02, botY);
          arr[idx + 5] = botZ;
        }
      }

      const posAttr = this.rainGeometry.getAttribute(
        'position',
      ) as THREE.BufferAttribute;
      posAttr.needsUpdate = true;

      // Catch bluish-white lightning glints on falling rain sheets
      this.rainMaterial.color
        .copy(_rainColorBase)
        .lerp(_rainColorFlash, Math.min(1, lightningFlash * 0.85));
      this.rainMaterial.opacity =
        (0.38 + lightningFlash * 0.34) * stormFade;
      // Keep spanY referenced cleanly
      void spanY;
    }

    // 4. Wind-blown horizontal mist/rain-gust streaks across dirt road & open courtyards
    const showMist = !isBasement && stormFade > 0.05;
    for (let i = 0; i < this.mistGusts.length; i++) {
      const m = this.mistGusts[i];
      if (i >= this.activeMistCount || !showMist) {
        m.mesh.visible = false;
        continue;
      }
      m.mesh.visible = true;
      if (!options?.paused) {
        const gustSpeed = m.speed * (0.65 + windGust * 0.85);
        m.x += windDirX * gustSpeed * safeDt;
        m.z += windDirZ * gustSpeed * safeDt * 0.45;

        if (m.zone === 'road') {
          if (m.x > 18) m.x = -18;
          if (m.z > 74) m.z = 35;
        } else if (m.zone === 'front_yard') {
          if (m.x > 29) m.x = -29;
          if (m.z > 33.5) m.z = 11.2;
        } else {
          if (m.x > 17) m.x = -17;
          if (m.z > -48) m.z = -74.5;
        }
        m.mesh.position.set(
          m.x,
          m.y + Math.sin(elapsed * 0.9 + m.phase) * 0.16,
          m.z,
        );
        const mMat = m.mesh.material as THREE.MeshBasicMaterial;
        const pulse = 0.68 + 0.32 * Math.sin(elapsed * 1.1 + m.phase);
        mMat.opacity =
          (m.baseOpacity * pulse * (0.7 + windGust * 0.55) +
            lightningFlash * 0.12) *
          stormFade;
      }
    }

    // 5. Rhythmic Storm Wind Sway on Exterior Forest Trees, Bushes & Hanging Courtyard Lanterns
    if (!options?.paused) {
      const gustEnvelope = 0.55 + windGust * 0.95;

      for (let i = 0; i < this.swayTrees.length; i++) {
        const t = this.swayTrees[i];
        const wave =
          Math.sin(elapsed * t.speed + t.phase) * 0.72 +
          Math.sin(elapsed * (t.speed * 2.13) + t.phase * 1.7) * 0.28;
        const lean = 0.35 * gustEnvelope;
        t.object.rotation.z =
          t.baseRotZ - (lean + wave * gustEnvelope) * t.ampZ * windDirX;
        t.object.rotation.x =
          t.baseRotX + (lean * 0.6 + wave * gustEnvelope) * t.ampX * windDirZ;
      }

      for (let i = 0; i < this.swayBushes.length; i++) {
        const b = this.swayBushes[i];
        const wave =
          Math.sin(elapsed * b.speed + b.phase) * 0.65 +
          Math.cos(elapsed * (b.speed * 1.75) + b.phase) * 0.35;
        b.object.rotation.z = b.baseRotZ - wave * gustEnvelope * b.ampZ;
        b.object.rotation.x = b.baseRotX + wave * gustEnvelope * b.ampX;
      }

      for (let i = 0; i < this.swayLanterns.length; i++) {
        const l = this.swayLanterns[i];
        const pendulum =
          Math.sin(elapsed * l.speed + l.phase) * 0.78 +
          Math.sin(elapsed * (l.speed * 2.3) + l.phase * 1.3) * 0.22;
        l.object.rotation.z = l.baseRotZ + pendulum * gustEnvelope * l.ampZ;
        l.object.rotation.x =
          l.baseRotX +
          Math.cos(elapsed * (l.speed * 0.92) + l.phase) *
            gustEnvelope *
            l.ampX;
      }
    }

    this.updateResultScratch.lightningFlash = lightningFlash;
    this.updateResultScratch.isOutdoors = isOutdoors;
    this.updateResultScratch.isBasement = isBasement;
    this.updateResultScratch.windGust = windGust;
    this.updateResultScratch.windDirX = windDirX;
    this.updateResultScratch.windDirZ = windDirZ;
    this.updateResultScratch.strikeAzimuth = this.strikeAzimuth;
    return this.updateResultScratch;
  }

  public dispose() {
    this.rainGeometry.dispose();
    this.rainMaterial.dispose();
    this.mistTexture.dispose();
    this.mistMaterial.dispose();
    for (const m of this.mistGusts) {
      (m.mesh.material as THREE.Material).dispose();
    }
    this.mistGusts[0]?.mesh.geometry.dispose();
  }
}
