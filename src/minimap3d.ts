import * as THREE from 'three';
import type {
  HaveliDoor,
  HaveliHidingSpot,
  HaveliRoomZone,
  MansionBuildResult,
  WallAABB,
} from './mansionWorld';

export type MiniMapFloorLevel = -1 | 0 | 1 | 2;

export interface MiniMapUpdateState {
  dt: number;
  floorLevel: MiniMapFloorLevel;
  playerX: number;
  playerZ: number;
  playerYaw: number;
}

const FLOOR_BASE_Y: Record<MiniMapFloorLevel, number> = {
  [-1]: -4.5,
  [0]: 0.0,
  [1]: 5.0,
  [2]: 10.0,
};

const FLOOR_CENTER: Record<MiniMapFloorLevel, { x: number; z: number }> = {
  [-1]: { x: 0, z: -61.0 },
  [0]: { x: 0, z: -18.0 },
  [1]: { x: 0, z: -18.0 },
  [2]: { x: 0, z: -18.0 },
};

const EXTERIOR_ZONE_IDS = new Set([
  'courtyard_front',
  'haveli_west_yard',
  'haveli_east_yard',
  'forest_road_jungle',
  'courtyard_well',
]);

const CORRIDOR_ZONE_IDS = new Set([
  'entrance_hall',
  'back_well_courtyard',
  'gf_corridor',
  'f2_jharokha_balcony',
  'f2_corridor',
  'f3_skywell_walkway',
  'f3_corridor',
  'basement_stair_foyer',
  'basement_hallway',
  'basement_mid_corridor',
  'basement_west_corridor',
  'basement_west_north_corridor',
  'basement_east_corridor',
  'basement_east_north_corridor',
  'basement_north_corridor',
]);

let cachedMinimapSoftwareGl: boolean | null = null;

function detectSoftwareWebGL(): boolean {
  if (cachedMinimapSoftwareGl !== null) return cachedMinimapSoftwareGl;
  if (typeof document === 'undefined') {
    cachedMinimapSoftwareGl = false;
    return false;
  }
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) {
      cachedMinimapSoftwareGl = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererName = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '').toLowerCase()
      : String(gl.getParameter(gl.RENDERER) || '').toLowerCase();
    // Explicitly release the temporary probe context so we never leak a WebGL context slot
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedMinimapSoftwareGl = /swiftshader|llvmpipe|software|mesa offscreen|angle.*basic/.test(
      rendererName,
    );
    return cachedMinimapSoftwareGl;
  } catch {
    cachedMinimapSoftwareGl = false;
    return false;
  }
}

/**
 * Expandable semi-transparent 3D architectural mini-map overlay for Thakur Haveli.
 * Renders the active floor (-1 Basement, 0 Ground, 1 Second, 2 Third) in angled 3D
 * along with the player's live relative position, heading FOV cone, doorways, and stairs.
 */
export class HaveliMiniMap3D {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer | null = null;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly floorGroups = new Map<MiniMapFloorLevel, THREE.Group>();
  private readonly playerGroup = new THREE.Group();
  private readonly playerPulseRing: THREE.Mesh;
  private readonly isSoftwareGl: boolean;

  private readonly geometriesToDispose: THREE.BufferGeometry[] = [];
  private readonly materialsToDispose: THREE.Material[] = [];

  private activeFloor: MiniMapFloorLevel = 0;
  private expanded = false;
  private orbitYawOffset = 0;
  private orbitPitchOffset = 0;
  private lastRenderWidth = 0;
  private lastRenderHeight = 0;
  private renderThrottleAccum = 0;
  private animElapsed = 0;
  private needsImmediateRender = true;
  private disposed = false;

  // Pre-allocated camera damping vectors (zero per-frame allocations)
  private readonly currentTarget = new THREE.Vector3(0, 0, 0);
  private readonly desiredTarget = new THREE.Vector3(0, 0, 0);
  private readonly currentCamPos = new THREE.Vector3(8, 16, 14);
  private readonly desiredCamPos = new THREE.Vector3(8, 16, 14);

  constructor(canvas: HTMLCanvasElement, haveli: MansionBuildResult) {
    this.canvas = canvas;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.25, 220);

    try {
      const renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: !this.isSoftwareGl,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(
        this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
      );
      this.canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
      });
      this.canvas.addEventListener('webglcontextrestored', () => {
        this.needsImmediateRender = true;
      });
      this.renderer = renderer;
    } catch (err) {
      console.warn('3D MiniMap WebGL init fallback:', err);
      this.renderer = null;
    }

    this.setupLighting();
    this.buildAllFloorGroups(haveli);
    this.playerPulseRing = this.buildPlayerMarker();
    this.setFloor(0);
    this.resize();
  }

  private trackGeo<T extends THREE.BufferGeometry>(geo: T): T {
    this.geometriesToDispose.push(geo);
    return geo;
  }

  private trackMat<T extends THREE.Material>(mat: T): T {
    this.materialsToDispose.push(mat);
    return mat;
  }

  private setupLighting() {
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x261216, 1.35);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffedd5, 1.45);
    key.position.set(14, 28, 18);
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x93c5fd, 0.55);
    rim.position.set(-16, 14, -18);
    this.scene.add(rim);
  }

  private buildAllFloorGroups(haveli: MansionBuildResult) {
    const wallEdgeMat = this.trackMat(
      new THREE.LineBasicMaterial({
        color: 0xfca5a5,
        transparent: true,
        opacity: 0.42,
      }),
    );

    const roomWallMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x6b3a3e,
        emissive: 0x1e090c,
        emissiveIntensity: 0.45,
        roughness: 0.65,
        metalness: 0.15,
        transparent: true,
        opacity: 0.88,
      }),
    );

    const exteriorWallMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x475569,
        emissive: 0x0f172a,
        emissiveIntensity: 0.35,
        roughness: 0.78,
        transparent: true,
        opacity: 0.7,
      }),
    );

    const roomPadMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x3b1b22,
        emissive: 0x14070a,
        emissiveIntensity: 0.45,
        roughness: 0.82,
        transparent: true,
        opacity: 0.72,
      }),
    );

    const corridorPadMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x2a2433,
        emissive: 0x0d0b14,
        emissiveIntensity: 0.4,
        roughness: 0.85,
        transparent: true,
        opacity: 0.65,
      }),
    );

    const yardPadMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x18261f,
        emissive: 0x07100b,
        emissiveIntensity: 0.35,
        roughness: 0.92,
        transparent: true,
        opacity: 0.44,
      }),
    );

    const doorOpenMat = this.trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.82,
      }),
    );

    const doorLockedMat = this.trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.9,
      }),
    );

    const hideSpotMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.65,
        roughness: 0.35,
        transparent: true,
        opacity: 0.88,
      }),
    );

    const stairMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xb45309,
        emissiveIntensity: 0.5,
        roughness: 0.5,
        transparent: true,
        opacity: 0.88,
      }),
    );

    const levels: MiniMapFloorLevel[] = [-1, 0, 1, 2];

    for (const level of levels) {
      const group = new THREE.Group();
      group.name = `MiniMapFloor_${level}`;
      const baseY = FLOOR_BASE_Y[level];

      // 1. Floor Zone Slabs
      this.addFloorZoneMeshes(
        group,
        level,
        haveli.roomZones,
        roomPadMat,
        corridorPadMat,
        yardPadMat,
      );

      // 2. 3D Floor Walls
      this.addFloorWalls(
        group,
        level,
        baseY,
        haveli.wallColliders,
        roomWallMat,
        exteriorWallMat,
        wallEdgeMat,
      );

      // 3. Doorways & Archways
      this.addFloorDoors(
        group,
        baseY,
        haveli.doors,
        doorOpenMat,
        doorLockedMat,
      );

      // 4. Staircases connecting this floor
      this.addFloorStaircases(group, level, stairMat);

      // 5. Hiding Spot Markers
      this.addFloorHidingSpots(group, baseY, haveli.hidingSpots, hideSpotMat);

      // 6. Central Courtyard Well Landmark (Ground Floor)
      if (level === 0) {
        this.addCourtyardWellLandmark(group);
      }

      group.visible = level === this.activeFloor;
      this.floorGroups.set(level, group);
      this.scene.add(group);
    }
  }

  private addFloorZoneMeshes(
    group: THREE.Group,
    level: MiniMapFloorLevel,
    roomZones: HaveliRoomZone[],
    roomPadMat: THREE.Material,
    corridorPadMat: THREE.Material,
    yardPadMat: THREE.Material,
  ) {
    const zones = roomZones.filter((z) => z.floorLevel === level);
    for (const zone of zones) {
      const isExterior = EXTERIOR_ZONE_IDS.has(zone.id);
      const isCorridor = CORRIDOR_ZONE_IDS.has(zone.id);

      // Clip vast exterior forest road / side yards to a clean readable tactical perimeter
      const minX = isExterior ? Math.max(zone.minX, -38.0) : zone.minX;
      const maxX = isExterior ? Math.min(zone.maxX, 38.0) : zone.maxX;
      const minZ = isExterior ? Math.max(zone.minZ, -78.0) : zone.minZ;
      const maxZ = isExterior ? Math.min(zone.maxZ, 42.0) : zone.maxZ;
      if (maxX <= minX || maxZ <= minZ) continue;

      // On 2F & 3F, cut around the huge central open atrium void (x: -15.2..15.2, z: -31.3..3.2) so the 4-sided wrap-around balconies & front suites read accurately
      if (
        (zone.id === 'f2_jharokha_balcony' || zone.id === 'f3_skywell_walkway') &&
        minX < -15.2 &&
        maxX > 15.2 &&
        minZ < 3.2 &&
        maxZ > -29.5
      ) {
        const voidMinZ = zone.id === 'f2_jharokha_balcony' ? -31.3 : -29.5;
        const subRects: Array<[number, number, number, number]> = [
          [minX, maxX, minZ, voidMinZ],
          [minX, -15.2, voidMinZ, 3.2],
          [15.2, maxX, voidMinZ, 3.2],
          [minX, maxX, 3.2, maxZ],
        ];
        for (const [sx1, sx2, sz1, sz2] of subRects) {
          if (sx2 <= sx1 || sz2 <= sz1) continue;
          const pad = new THREE.Mesh(
            this.trackGeo(new THREE.BoxGeometry(sx2 - sx1, 0.08, sz2 - sz1)),
            corridorPadMat,
          );
          pad.position.set((sx1 + sx2) * 0.5, -0.04, (sz1 + sz2) * 0.5);
          group.add(pad);
        }
        continue;
      }

      const w = maxX - minX;
      const d = maxZ - minZ;
      const mat = isExterior
        ? yardPadMat
        : isCorridor
          ? corridorPadMat
          : roomPadMat;

      const pad = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(w, 0.08, d)),
        mat,
      );
      pad.position.set((minX + maxX) * 0.5, -0.04, (minZ + maxZ) * 0.5);
      group.add(pad);
    }

    // Add subtle grid overlay under the floor for crisp spatial scale
    const center = FLOOR_CENTER[level];
    const grid = new THREE.GridHelper(
      level === -1 ? 64 : 84,
      level === -1 ? 32 : 42,
      0x991b1b,
      0x3f2228,
    );
    grid.position.set(center.x, -0.09, center.z);
    const gridMat = grid.material;
    if (Array.isArray(gridMat)) {
      gridMat.forEach((m) => {
        m.transparent = true;
        m.opacity = 0.25;
        this.trackMat(m);
      });
    } else {
      gridMat.transparent = true;
      gridMat.opacity = 0.25;
      this.trackMat(gridMat);
    }
    this.trackGeo(grid.geometry);
    group.add(grid);
  }

  private addFloorWalls(
    group: THREE.Group,
    level: MiniMapFloorLevel,
    baseY: number,
    wallColliders: WallAABB[],
    roomWallMat: THREE.Material,
    exteriorWallMat: THREE.Material,
    edgeMat: THREE.LineBasicMaterial,
  ) {
    const clipBounds =
      level === -1
        ? { minX: -30, maxX: 30, minZ: -81.5, maxZ: -33.0 }
        : { minX: -38, maxX: 38, minZ: -78.0, maxZ: 42.0 };

    for (const wall of wallColliders) {
      // Only include walls present on this floor slab (ignore high parapet caps above ceiling)
      if (wall.maxY <= baseY + 0.18 || wall.minY >= baseY + 3.85) continue;

      const minX = Math.max(wall.minX, clipBounds.minX);
      const maxX = Math.min(wall.maxX, clipBounds.maxX);
      const minZ = Math.max(wall.minZ, clipBounds.minZ);
      const maxZ = Math.min(wall.maxZ, clipBounds.maxZ);
      const w = maxX - minX;
      const d = maxZ - minZ;
      if (w < 0.04 || d < 0.04) continue;

      // Skip huge outer invisible boundary planes if they clip into thin edges outside courtyard
      if (w > 76 || d > 76) continue;

      const rawHeight = Math.min(wall.maxY, baseY + 3.8) - Math.max(wall.minY, baseY);
      const isRailing = rawHeight <= 1.28;
      const extrudeH = isRailing ? 0.55 : 1.55;
      const isOutsideWall =
        minX < -32.3 || maxX > 32.3 || maxZ > 10.4 || (level >= 0 && minZ < -46.3);

      const boxGeo = this.trackGeo(new THREE.BoxGeometry(w, extrudeH, d));
      const mesh = new THREE.Mesh(
        boxGeo,
        isOutsideWall ? exteriorWallMat : roomWallMat,
      );
      mesh.position.set(
        (minX + maxX) * 0.5,
        extrudeH * 0.5,
        (minZ + maxZ) * 0.5,
      );
      group.add(mesh);

      if (!isRailing && (w > 0.4 || d > 0.4)) {
        const edges = new THREE.LineSegments(
          this.trackGeo(new THREE.EdgesGeometry(boxGeo)),
          edgeMat,
        );
        edges.position.copy(mesh.position);
        group.add(edges);
      }
    }
  }

  private addFloorDoors(
    group: THREE.Group,
    baseY: number,
    doors: HaveliDoor[],
    openMat: THREE.Material,
    lockedMat: THREE.Material,
  ) {
    for (const door of doors) {
      if (Math.abs(door.floorY - baseY) > 1.25) continue;
      if (door.archwayOnly) continue;

      const isAxisX = door.axis === 'x';
      const barGeo = this.trackGeo(
        new THREE.BoxGeometry(isAxisX ? 1.8 : 0.24, 0.22, isAxisX ? 0.24 : 1.8),
      );
      const bar = new THREE.Mesh(
        barGeo,
        door.lockedUntilRelics > 0 ? lockedMat : openMat,
      );
      bar.position.set(door.position.x, 0.14, door.position.z);
      group.add(bar);
    }
  }

  private addFloorStaircases(
    group: THREE.Group,
    level: MiniMapFloorLevel,
    stairMat: THREE.Material,
  ) {
    const addStairStepsZ = (
      cx: number,
      width: number,
      zStart: number,
      zEnd: number,
      yStart: number,
      yEnd: number,
    ) => {
      const steps = 9;
      const dz = (zEnd - zStart) / steps;
      const dy = (yEnd - yStart) / steps;
      const stepDepth = Math.abs(dz) * 0.92;
      for (let i = 0; i < steps; i++) {
        const t = i + 0.5;
        const stepMesh = new THREE.Mesh(
          this.trackGeo(new THREE.BoxGeometry(width, 0.16, stepDepth)),
          stairMat,
        );
        stepMesh.position.set(cx, yStart + t * dy, zStart + t * dz);
        group.add(stepMesh);
      }
    };

    const addStairStepsX = (
      cz: number,
      depth: number,
      xStart: number,
      xEnd: number,
      yStart: number,
      yEnd: number,
    ) => {
      const steps = 7;
      const dx = (xEnd - xStart) / steps;
      const dy = (yEnd - yStart) / steps;
      const stepWidth = Math.abs(dx) * 0.92;
      for (let i = 0; i < steps; i++) {
        const t = i + 0.5;
        const stepMesh = new THREE.Mesh(
          this.trackGeo(new THREE.BoxGeometry(stepWidth, 0.16, depth)),
          stairMat,
        );
        stepMesh.position.set(xStart + t * dx, yStart + t * dy, cz);
        group.add(stepMesh);
      }
    };

    if (level === 0) {
      // Grand Double-Wing Royal Staircase: Central flight + mid-landing + Left & Right split wings
      addStairStepsZ(0, 6.8, -21.5, -27.0, 0.05, 0.85);
      const midPad = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(7.6, 0.16, 4.0)),
        stairMat,
      );
      midPad.position.set(0, 0.85, -29.0);
      group.add(midPad);
      addStairStepsX(-29.0, 3.8, -3.8, -15.2, 0.85, 1.65);
      addStairStepsX(-29.0, 3.8, 3.8, 15.2, 0.85, 1.65);
      // GF -> Basement descending stairs
      addStairStepsZ(8.5, 3.4, -34.0, -41.5, 0.05, -1.25);
    } else if (level === 1) {
      // 2F <- GF arriving Double-Wing stairs
      addStairStepsX(-29.0, 3.8, -3.8, -15.2, -0.75, 0.08);
      addStairStepsX(-29.0, 3.8, 3.8, 15.2, -0.75, 0.08);
      // 2F -> 3F ascending stairs
      addStairStepsZ(0, 6.0, -34.5, -42.5, 0.05, 1.65);
    } else if (level === 2) {
      // 3F <- 2F arriving stairs
      addStairStepsZ(0, 6.0, -34.5, -42.5, -1.45, 0.08);
    } else if (level === -1) {
      // Basement <- GF ascending stairs
      addStairStepsZ(8.5, 3.4, -34.0, -41.5, 1.4, 0.06);
    }
  }

  private addFloorHidingSpots(
    group: THREE.Group,
    baseY: number,
    hidingSpots: HaveliHidingSpot[],
    hideSpotMat: THREE.Material,
  ) {
    for (const spot of hidingSpots) {
      if (Math.abs(spot.floorY - baseY) > 1.25) continue;
      const pip = new THREE.Mesh(
        this.trackGeo(new THREE.BoxGeometry(0.85, 0.45, 0.85)),
        hideSpotMat,
      );
      pip.position.set(spot.position.x, 0.24, spot.position.z);
      group.add(pip);
    }
  }

  private addCourtyardWellLandmark(group: THREE.Group) {
    const wellRingMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xfb923c,
        emissive: 0xea580c,
        emissiveIntensity: 0.75,
        roughness: 0.4,
      }),
    );
    const flameCoreMat = this.trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xff4500,
        transparent: true,
        opacity: 0.72,
      }),
    );

    const wellRingGeo = this.trackGeo(new THREE.TorusGeometry(1.35, 0.25, 10, 24));
    const wellGlowGeo = this.trackGeo(new THREE.CircleGeometry(1.12, 20));

    // Massive 36m x 30m Walled Back Well Courtyard Ornate Cursed Well at (0, -61.0)
    const wellRing = new THREE.Mesh(wellRingGeo, wellRingMat);
    wellRing.rotation.x = Math.PI / 2;
    wellRing.scale.setScalar(1.65);
    wellRing.position.set(0, 0.24, -61.0);
    group.add(wellRing);

    const wellGlow = new THREE.Mesh(wellGlowGeo, flameCoreMat);
    wellGlow.rotation.x = -Math.PI / 2;
    wellGlow.scale.setScalar(1.65);
    wellGlow.position.set(0, 0.12, -61.0);
    group.add(wellGlow);
  }

  private buildPlayerMarker(): THREE.Mesh {
    // 1. Pedestal glow ring
    const ringMat = this.trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      }),
    );
    const ring = new THREE.Mesh(
      this.trackGeo(new THREE.RingGeometry(0.55, 0.82, 24)),
      ringMat,
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.25;
    this.playerGroup.add(ring);

    // 2. Crisp 3D directional chevron/cone pointing forward (-Z in local yaw space)
    const arrowMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x6ee7b7,
        emissive: 0x10b981,
        emissiveIntensity: 0.9,
        roughness: 0.25,
      }),
    );
    const arrow = new THREE.Mesh(
      this.trackGeo(new THREE.ConeGeometry(0.44, 1.05, 4)),
      arrowMat,
    );
    arrow.rotation.x = -Math.PI / 2;
    arrow.rotation.y = Math.PI * 0.25;
    arrow.position.set(0, 0.56, -0.1);
    this.playerGroup.add(arrow);

    // 3. Soft translucent forward FOV vision wedge
    const fovGeo = this.trackGeo(
      new THREE.CircleGeometry(3.6, 18, Math.PI * 0.3, Math.PI * 0.4),
    );
    const fovMat = this.trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    const fovWedge = new THREE.Mesh(fovGeo, fovMat);
    fovWedge.rotation.x = -Math.PI / 2;
    fovWedge.position.y = 0.22;
    this.playerGroup.add(fovWedge);

    this.scene.add(this.playerGroup);
    return ring;
  }

  public setFloor(level: MiniMapFloorLevel) {
    if (this.activeFloor === level) return;
    this.activeFloor = level;
    for (const [lvl, group] of this.floorGroups.entries()) {
      group.visible = lvl === level;
    }
    this.needsImmediateRender = true;
  }

  public setExpanded(expanded: boolean) {
    if (this.expanded === expanded) return;
    this.expanded = expanded;
    if (!expanded) {
      this.orbitYawOffset = 0;
      this.orbitPitchOffset = 0;
    }
    this.needsImmediateRender = true;
    this.resize();
  }

  public isExpanded(): boolean {
    return this.expanded;
  }

  public adjustOrbit(deltaYaw: number, deltaPitch: number) {
    if (!this.expanded) return;
    this.orbitYawOffset = THREE.MathUtils.clamp(
      this.orbitYawOffset + deltaYaw,
      -1.25,
      1.25,
    );
    this.orbitPitchOffset = THREE.MathUtils.clamp(
      this.orbitPitchOffset + deltaPitch,
      -0.35,
      0.35,
    );
    this.needsImmediateRender = true;
  }

  public resize() {
    if (!this.renderer || this.disposed) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(120, Math.round(rect.width || this.canvas.clientWidth || 180));
    const h = Math.max(120, Math.round(rect.height || this.canvas.clientHeight || 164));
    if (w !== this.lastRenderWidth || h !== this.lastRenderHeight) {
      this.lastRenderWidth = w;
      this.lastRenderHeight = h;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.needsImmediateRender = true;
    }
  }

  public update(state: MiniMapUpdateState) {
    if (this.disposed || !this.renderer || !this.expanded) return;
    if (this.renderer.getContext().isContextLost()) return;

    this.setFloor(state.floorLevel);
    this.resize();
    if (this.lastRenderWidth <= 0 || this.lastRenderHeight <= 0) return;

    this.animElapsed += state.dt;
    const ringScale = 1 + Math.sin(this.animElapsed * 4.2) * 0.1;
    this.playerPulseRing.scale.set(ringScale, ringScale, 1);

    this.playerGroup.position.set(state.playerX, 0.08, state.playerZ);
    this.playerGroup.rotation.y = state.playerYaw;

    if (this.expanded) {
      const center = FLOOR_CENTER[state.floorLevel];
      const baseDist = state.floorLevel === -1 ? 68.0 : 66.0;
      const baseHeight = state.floorLevel === -1 ? 66.0 : 64.0;
      const azimuth = 0.28 + this.orbitYawOffset;
      const pitchScale = 1 + this.orbitPitchOffset;

      this.desiredTarget.set(center.x, 0.2, center.z);
      this.desiredCamPos.set(
        center.x + Math.sin(azimuth) * baseDist,
        baseHeight * pitchScale,
        center.z + Math.cos(azimuth) * baseDist,
      );
    } else {
      // Compact mode: tight angled 3D view centered on player's Haveli-local position
      this.desiredTarget.set(state.playerX, 0.25, state.playerZ);
      this.desiredCamPos.set(
        state.playerX + 7.2,
        18.0,
        state.playerZ + 13.5,
      );
    }

    const dampFactor = this.needsImmediateRender
      ? 1
      : 1 - Math.exp(-9 * Math.min(state.dt, 0.1));
    this.currentTarget.lerp(this.desiredTarget, dampFactor);
    this.currentCamPos.lerp(this.desiredCamPos, dampFactor);

    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentTarget);

    this.renderThrottleAccum += state.dt;
    const minInterval = this.isSoftwareGl ? 0.09 : 0.032;
    if (this.needsImmediateRender || this.renderThrottleAccum >= minInterval) {
      this.renderThrottleAccum = 0;
      this.needsImmediateRender = false;
      if (!this.renderer.getContext().isContextLost()) {
        this.renderer.render(this.scene, this.camera);
      }
    }
  }

  public dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const geo of this.geometriesToDispose) {
      geo.dispose();
    }
    for (const mat of this.materialsToDispose) {
      mat.dispose();
    }
    this.geometriesToDispose.length = 0;
    this.materialsToDispose.length = 0;
    this.floorGroups.clear();
    this.renderer?.dispose();
  }
}

/**
 * Ultra-lightweight 2D Canvas live architectural radar rendered inside the
 * Top-Left compact square Minimap button (tap or press M for fullscreen 3D map).
 */
export class CompactMiniRadar {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly haveli: MansionBuildResult;
  private accum = 0;
  private lastFloor: MiniMapFloorLevel | null = null;

  constructor(canvas: HTMLCanvasElement, haveli: MansionBuildResult) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.haveli = haveli;
  }

  public update(state: MiniMapUpdateState) {
    this.accum += state.dt;
    if (this.lastFloor === state.floorLevel && this.accum < 0.05) return;
    this.accum = 0;
    this.lastFloor = state.floorLevel;
    this.draw(state);
  }

  public rotationMode: 'north_up' | 'rotating' = 'north_up';

  private draw(state: MiniMapUpdateState) {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w * 0.5;
    const cy = h * 0.5;

    ctx.clearRect(0, 0, w, h);

    // Deep obsidian radar backdrop
    const bg = ctx.createRadialGradient(cx, cy, 4, cx, cy, w * 0.65);
    bg.addColorStop(0, 'rgba(26, 20, 22, 0.94)');
    bg.addColorStop(1, 'rgba(8, 7, 10, 0.96)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle range rings & cross axes
    ctx.strokeStyle = 'rgba(255, 220, 175, 0.09)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.24, 0, Math.PI * 2);
    ctx.arc(cx, cy, w * 0.44, 0, Math.PI * 2);
    ctx.moveTo(cx, 6);
    ctx.lineTo(cx, h - 6);
    ctx.moveTo(6, cy);
    ctx.lineTo(w - 6, cy);
    ctx.stroke();

    // Scale: ~26m radius visible across the square radar
    const scale = w / 52;
    const floorY = FLOOR_BASE_Y[state.floorLevel];
    const isRotating = this.rotationMode === 'rotating';
    const forwardX = -Math.sin(state.playerYaw);
    const forwardZ = -Math.cos(state.playerYaw);
    const headingAngle = Math.atan2(forwardZ, forwardX);
    // In rotating mode, rotate world around center so player heading points straight up (-PI/2)
    const worldRot = isRotating ? -Math.PI * 0.5 - headingAngle : 0;

    ctx.save();
    ctx.beginPath();
    ctx.rect(2, 2, w - 4, h - 4);
    ctx.clip();

    ctx.save();
    if (isRotating) {
      ctx.translate(cx, cy);
      ctx.rotate(worldRot);
      ctx.translate(-cx, -cy);
    }

    // Draw walls belonging to the active floor relative to player
    ctx.fillStyle = 'rgba(225, 195, 165, 0.42)';
    const walls = this.haveli.wallColliders;
    for (let i = 0; i < walls.length; i++) {
      const box = walls[i];
      if (floorY + 1.2 < box.minY || floorY + 0.2 > box.maxY) continue;
      const rx = cx + (box.minX - state.playerX) * scale;
      const ry = cy + (box.minZ - state.playerZ) * scale;
      const rw = Math.max(1.5, (box.maxX - box.minX) * scale);
      const rh = Math.max(1.5, (box.maxZ - box.minZ) * scale);
      if (
        !isRotating &&
        (rx + rw < 0 || rx > w || ry + rh < 0 || ry > h)
      ) {
        continue;
      }
      ctx.fillRect(rx, ry, rw, rh);
    }

    // Draw hiding spots as tiny cyan ticks
    ctx.fillStyle = 'rgba(94, 234, 212, 0.65)';
    for (let i = 0; i < this.haveli.hidingSpots.length; i++) {
      const hs = this.haveli.hidingSpots[i];
      if (Math.abs(hs.floorY - floorY) > 1.8) continue;
      const hx = cx + (hs.position.x - state.playerX) * scale;
      const hy = cy + (hs.position.z - state.playerZ) * scale;
      if (!isRotating && (hx < 2 || hx > w - 2 || hy < 2 || hy > h - 2)) continue;
      ctx.fillRect(hx - 1.5, hy - 1.5, 3, 3);
    }

    // Draw Cursed Well ember beacon on ground floor
    if (state.floorLevel === 0) {
      const wellPos = this.haveli.centralCourtyardWell.position;
      const wx = cx + (wellPos.x - state.playerX) * scale;
      const wy = cy + (wellPos.z - state.playerZ) * scale;
      if (isRotating || (wx >= -6 && wx <= w + 6 && wy >= -6 && wy <= h + 6)) {
        ctx.fillStyle = 'rgba(249, 115, 22, 0.9)';
        ctx.beginPath();
        ctx.arc(wx, wy, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Player FOV cone & directional arrow at center
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(isRotating ? -Math.PI * 0.5 : headingAngle);

    // Subtle vision wedge
    const fovGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
    fovGrad.addColorStop(0, 'rgba(251, 191, 36, 0.36)');
    fovGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = fovGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 24, -0.48, 0.48);
    ctx.closePath();
    ctx.fill();

    // Crisp player arrow pointer
    ctx.fillStyle = '#fde68a';
    ctx.strokeStyle = '#140c0a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(6.5, 0);
    ctx.lineTo(-4.5, -4);
    ctx.lineTo(-2.5, 0);
    ctx.lineTo(-4.5, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();

    // Crisp North indicator (top-center when North Up, orbiting rim when Rotating)
    ctx.fillStyle = 'rgba(253, 224, 71, 0.88)';
    ctx.font = '700 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (isRotating) {
      const northAngle = -Math.PI * 0.5 + worldRot;
      const nr = w * 0.41;
      ctx.fillText('N', cx + Math.cos(northAngle) * nr, cy + Math.sin(northAngle) * nr);
    } else {
      ctx.fillText('N', cx, 8);
    }
  }
}

