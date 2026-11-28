import * as THREE from 'three';
import { createHumanoid, HumanoidCharacter } from './characters.ts';

let cachedLobbySoftwareGl: boolean | null = null;

function detectSoftwareWebGL(): boolean {
  if (cachedLobbySoftwareGl !== null) return cachedLobbySoftwareGl;
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) {
      cachedLobbySoftwareGl = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedLobbySoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return cachedLobbySoftwareGl;
  } catch {
    cachedLobbySoftwareGl = true;
    return true;
  }
}

/**
 * Interactive 3D Horror Lobby & Profile Showcase Scene.
 * Renders Aarav standing in front of a misty, lantern-lit Thakur Haveli archway.
 * Supports smooth horizontal drag-to-rotate and re-parenting a single WebGL context
 * cleanly between the Main Lobby stage and the Profile Screen 3D viewport.
 */
export class HorrorLobbyScene3D {
  private container: HTMLElement;
  private hostContainer: HTMLElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private aarav: HumanoidCharacter | null = null;
  private aaravPivot = new THREE.Group();
  private lanternLights: THREE.PointLight[] = [];
  private flashlightSpot: THREE.SpotLight | null = null;
  private flashlightTarget = new THREE.Object3D();
  private flashlightBeam: THREE.Mesh | null = null;
  private emberPoints: THREE.Points | null = null;
  private rainLines: THREE.LineSegments | null = null;
  private totalRainVertices = 0;
  private mistPlanes: THREE.Mesh[] = [];
  private isSoftwareGl: boolean;
  private isMobileDevice: boolean;
  private isActive = false;
  private isProfileMode = false;
  private targetFps: 30 | 60 = 60;
  private lastRenderMs = 0;
  private frameId = 0;
  private lastTime = 0;
  private elapsed = 0;

  // Horizontal drag rotation state
  private targetYaw = 0.16;
  private currentYaw = 0.16;
  private isDragging = false;
  private dragPointerId: number | null = null;
  private lastDragX = 0;
  private dragVelocity = 0;

  private boundResize: () => void;
  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerMove: (e: PointerEvent) => void;
  private boundPointerUp: (e: PointerEvent) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.hostContainer = container;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.isMobileDevice =
      /Android|iPhone|iPad/i.test(navigator.userAgent) ||
      window.innerWidth < 950;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070d);
    this.scene.fog = new THREE.FogExp2(0x05070d, 0.095);

    this.camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 80);
    this.camera.position.set(0, 1.48, 4.15);
    this.camera.lookAt(0, 1.05, 0);

    this.boundResize = () => this.resize();
    this.boundPointerDown = (e) => this.onPointerDown(e);
    this.boundPointerMove = (e) => this.onPointerMove(e);
    this.boundPointerUp = (e) => this.onPointerUp(e);

    this.initRenderer();
    if (this.renderer) {
      this.buildEnvironment();
      this.buildThakurHaveliBackdrop();
      this.buildAaravHero();
      this.attachEvents();
      this.resize();
    }
  }

  private initRenderer() {
    try {
      const renderer = new THREE.WebGLRenderer({
        antialias: !this.isSoftwareGl,
        alpha: false,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.setClearColor(0x05070d, 1);
      const lowPower = this.isSoftwareGl || this.isMobileDevice;
      renderer.setPixelRatio(
        lowPower ? 1 : Math.min(window.devicePixelRatio || 1, 2),
      );
      renderer.shadowMap.enabled = !lowPower;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.className = 'lobby-3d-canvas';
      renderer.domElement.setAttribute('aria-label', '3D Survivor Aarav at Thakur Haveli');

      renderer.domElement.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        this.stopLoop();
      });
      renderer.domElement.addEventListener('webglcontextrestored', () => {
        renderer.setClearColor(0x05070d, 1);
        renderer.toneMappingExposure = Math.min(
          1.15,
          renderer.toneMappingExposure || 1.15,
        );
        if (this.isActive) this.startLoop();
      });

      this.container.appendChild(renderer.domElement);
      this.renderer = renderer;
    } catch {
      this.renderer = null;
    }
  }

  private buildEnvironment() {
    // Moody moonlit horror key + warm golden lantern fill + crimson back rim
    const hemi = new THREE.HemisphereLight(0x4b3848, 0x1c0d10, 0.96);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffcf96, 1.35);
    keyLight.position.set(2.8, 4.4, 3.6);
    if (!this.isSoftwareGl && !this.isMobileDevice) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
    }
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xb91c1c, 1.55);
    rimLight.position.set(-2.6, 3.0, -3.4);
    this.scene.add(rimLight);

    const coolMoonFill = new THREE.DirectionalLight(0x64748b, 0.55);
    coolMoonFill.position.set(-3.5, 2.2, 2.2);
    this.scene.add(coolMoonFill);
  }

  private createStoneTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#241b19';
      ctx.fillRect(0, 0, 256, 256);
      let seed = 1992;
      const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      for (let row = 0; row < 8; row++) {
        const y = row * 32;
        const offset = (row % 2) * 32;
        for (let col = -1; col < 5; col++) {
          const x = col * 64 + offset;
          const v = 28 + Math.floor(rand() * 20);
          ctx.fillStyle = `rgb(${v + 8}, ${v + 2}, ${v})`;
          ctx.fillRect(x + 2, y + 2, 60, 28);
        }
      }
      for (let i = 0; i < 650; i++) {
        const x = rand() * 256;
        const y = rand() * 256;
        const a = 0.05 + rand() * 0.1;
        ctx.fillStyle = rand() > 0.5 ? `rgba(0,0,0,${a})` : `rgba(140,85,60,${a * 0.5})`;
        ctx.fillRect(x, y, 2 + rand() * 4, 2 + rand() * 3);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    return tex;
  }

  private buildThakurHaveliBackdrop() {
    const stoneTex = this.createStoneTexture();
    const stoneMat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      color: 0x5c4740,
      roughness: 0.88,
      metalness: 0.08,
    });
    const darkStoneMat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      color: 0x352522,
      roughness: 0.92,
      metalness: 0.05,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xb4833d,
      roughness: 0.34,
      metalness: 0.82,
    });
    const woodDoorMat = new THREE.MeshStandardMaterial({
      color: 0x26130e,
      roughness: 0.82,
      metalness: 0.1,
    });

    // Courtyard ground & subtle carved octagonal pedestal under Aarav
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(18, 40),
      darkStoneMat,
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.32, 0.14, 12),
      stoneMat,
    );
    plinth.position.y = 0.07;
    plinth.receiveShadow = true;
    this.scene.add(plinth);

    const brassRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.17, 0.025, 10, 36),
      brassMat,
    );
    brassRing.rotation.x = Math.PI / 2;
    brassRing.position.y = 0.14;
    this.scene.add(brassRing);

    // Towering Thakur Haveli facade behind Aarav
    const haveliGroup = new THREE.Group();
    haveliGroup.position.set(0, 0, -5.8);

    const mainWall = new THREE.Mesh(
      new THREE.BoxGeometry(16, 8.2, 1.2),
      stoneMat,
    );
    mainWall.position.set(0, 4.1, -0.8);
    haveliGroup.add(mainWall);

    // Grand recessed wooden entrance portal
    const doorRecess = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 4.4, 0.5),
      woodDoorMat,
    );
    doorRecess.position.set(0, 2.2, -0.15);
    haveliGroup.add(doorRecess);

    // Ornate carved pillars flanking the Haveli entrance
    const pillarOffsets = [-3.9, -1.9, 1.9, 3.9];
    for (const px of pillarOffsets) {
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(0.86, 0.5, 0.86),
        darkStoneMat,
      );
      base.position.set(px, 0.25, 0.25);
      haveliGroup.add(base);

      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.27, 0.31, 4.6, 12),
        stoneMat,
      );
      shaft.position.set(px, 2.7, 0.25);
      haveliGroup.add(shaft);

      const capital = new THREE.Mesh(
        new THREE.BoxGeometry(0.88, 0.42, 0.88),
        darkStoneMat,
      );
      capital.position.set(px, 5.15, 0.25);
      haveliGroup.add(capital);
    }

    // Upper cornice + jharokha balcony silhouette + arched domes
    const cornice = new THREE.Mesh(
      new THREE.BoxGeometry(12.8, 0.45, 1.4),
      darkStoneMat,
    );
    cornice.position.set(0, 5.5, 0.1);
    haveliGroup.add(cornice);

    const domePositions = [-3.6, 0, 3.6];
    for (const dx of domePositions) {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(dx === 0 ? 1.15 : 0.72, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
        darkStoneMat,
      );
      dome.position.set(dx, 6.2, -0.1);
      haveliGroup.add(dome);

      const finial = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.55, 8),
        brassMat,
      );
      finial.position.set(dx, dx === 0 ? 7.55 : 7.1, -0.1);
      haveliGroup.add(finial);
    }

    // Glowing crimson-amber arched upper windows
    const winMat = new THREE.MeshBasicMaterial({ color: 0xb91c1c });
    for (const wx of [-3.1, 0, 3.1]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.15), winMat);
      win.position.set(wx, 4.2, -0.16);
      haveliGroup.add(win);
    }

    // Two hanging brass lanterns flanking Aarav in midground
    const lanternPositions: Array<[number, number, number]> = [
      [-1.9, 2.75, 0.75],
      [1.9, 2.75, 0.75],
    ];
    for (const [lx, ly, lz] of lanternPositions) {
      const chain = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 1.9, 6),
        brassMat,
      );
      chain.position.set(lx, ly + 1.05, lz);
      haveliGroup.add(chain);

      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.16, 8),
        brassMat,
      );
      cap.position.set(lx, ly + 0.16, lz);
      haveliGroup.add(cap);

      const glass = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.1, 0.28, 8),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24 }),
      );
      glass.position.set(lx, ly - 0.04, lz);
      haveliGroup.add(glass);

      const pt = new THREE.PointLight(0xf59e0b, 4.2, 11, 1.6);
      pt.position.set(lx, ly - 0.05, lz + 0.25);
      haveliGroup.add(pt);
      this.lanternLights.push(pt);
    }

    this.scene.add(haveliGroup);

    // Soft drifting mist layers across the courtyard floor
    const mistCanvas = document.createElement('canvas');
    mistCanvas.width = 128;
    mistCanvas.height = 128;
    const mctx = mistCanvas.getContext('2d');
    if (mctx) {
      const g = mctx.createRadialGradient(64, 64, 4, 64, 64, 64);
      g.addColorStop(0, 'rgba(195, 165, 165, 0.22)');
      g.addColorStop(0.5, 'rgba(110, 32, 36, 0.1)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      mctx.fillStyle = g;
      mctx.fillRect(0, 0, 128, 128);
    }
    const mistTex = new THREE.CanvasTexture(mistCanvas);
    mistTex.colorSpace = THREE.SRGBColorSpace;
    const mistMat = new THREE.MeshBasicMaterial({
      map: mistTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    for (let i = 0; i < 6; i++) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.4), mistMat);
      plane.position.set(
        (i - 2.5) * 2.0,
        0.8 + (i % 2) * 0.45,
        -1.5 - (i % 3) * 1.4,
      );
      this.scene.add(plane);
      this.mistPlanes.push(plane);
    }

    // Floating warm crimson-gold embers
    const emberCount = 65;
    const positions = new Float32Array(emberCount * 3);
    for (let i = 0; i < emberCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8.5;
      positions[i * 3 + 1] = 0.2 + Math.random() * 4.2;
      positions[i * 3 + 2] = -4.8 + Math.random() * 6.5;
    }
    const emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const emberMat = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 0.048,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    });
    this.emberPoints = new THREE.Points(emberGeo, emberMat);
    this.scene.add(this.emberPoints);

    // Eerie slanted midnight rain streaks across the Thakur Haveli courtyard
    const rainCount = this.isSoftwareGl ? 90 : 190;
    const rainPositions = new Float32Array(rainCount * 6);
    for (let i = 0; i < rainCount; i++) {
      const rx = (Math.random() - 0.5) * 11.5;
      const ry = Math.random() * 6.5;
      const rz = -5.2 + Math.random() * 8.2;
      const len = 0.22 + Math.random() * 0.16;
      const base = i * 6;
      rainPositions[base] = rx;
      rainPositions[base + 1] = ry;
      rainPositions[base + 2] = rz;
      rainPositions[base + 3] = rx - 0.045;
      rainPositions[base + 4] = ry - len;
      rainPositions[base + 5] = rz;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    this.totalRainVertices = rainCount * 2;
    const rainMat = new THREE.LineBasicMaterial({
      color: 0xa5b4cf,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    });
    this.rainLines = new THREE.LineSegments(rainGeo, rainMat);
    this.scene.add(this.rainLines);
  }

  private buildAaravHero() {
    this.aaravPivot.position.set(0, 0.14, 0);
    this.aaravPivot.rotation.y = this.currentYaw;
    this.scene.add(this.aaravPivot);

    const aarav = createHumanoid({
      name: 'Aarav',
      height: 1.75,
      skinTone: 0xa97652,
      hairColor: 0x161210,
      hairStyle: 'short',
      clothingStyle: 'casual_jacket',
      shirtColor: 0x26322b,
      undershirtColor: 0x2c2f34,
      pantsColor: 0x1c222b,
      shoeColor: 0x181412,
      hasLantern: true,
      lanternLightColor: 0xffa73b,
    });
    aarav.root.position.set(0, 0, 0);
    aarav.setAnimation('idle');
    if (aarav.lanternLight) {
      aarav.lanternLight.intensity = 2.6;
      aarav.lanternLight.distance = 8.5;
    }

    // Add realistic metal flashlight + warm-white volumetric glow cone in Aarav's left hand
    const torchGroup = new THREE.Group();
    torchGroup.position.set(0.0, -0.07, 0.05);
    torchGroup.rotation.x = Math.PI * 0.44;
    const bodyMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.02, 0.19, 10),
      new THREE.MeshStandardMaterial({
        color: 0x1e2228,
        roughness: 0.35,
        metalness: 0.78,
      }),
    );
    torchGroup.add(bodyMesh);

    const lensMesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.024, 12),
      new THREE.MeshBasicMaterial({ color: 0xfff8dc }),
    );
    lensMesh.position.y = 0.098;
    lensMesh.rotation.x = -Math.PI / 2;
    torchGroup.add(lensMesh);

    // Subtle atmospheric flashlight beam cone
    const beamGeo = new THREE.ConeGeometry(0.55, 2.8, 16, 1, true);
    beamGeo.translate(0, -1.4, 0);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfef3c7,
      transparent: true,
      opacity: 0.11,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.y = 0.098;
    beamMesh.rotation.x = Math.PI;
    torchGroup.add(beamMesh);
    this.flashlightBeam = beamMesh;

    aarav.leftHand.add(torchGroup);

    // Real flashlight SpotLight mounted to Aarav's pivot so it rotates 360° with him
    const spot = new THREE.SpotLight(0xfff1c9, 4.4, 10.5, 0.44, 0.65, 1.4);
    spot.position.set(-0.26, 1.02, 0.24);
    this.flashlightTarget.position.set(-0.35, 0.62, 3.6);
    this.aaravPivot.add(spot);
    this.aaravPivot.add(this.flashlightTarget);
    spot.target = this.flashlightTarget;
    this.flashlightSpot = spot;

    this.aaravPivot.add(aarav.root);
    this.aarav = aarav;
  }

  private attachEvents() {
    window.addEventListener('resize', this.boundResize);
    const dom = this.renderer?.domElement;
    if (!dom) return;
    dom.addEventListener('pointerdown', this.boundPointerDown);
    window.addEventListener('pointermove', this.boundPointerMove);
    window.addEventListener('pointerup', this.boundPointerUp);
    window.addEventListener('pointercancel', this.boundPointerUp);
  }

  private onPointerDown(e: PointerEvent) {
    if (!this.isActive) return;
    const menuEl = document.getElementById('menu-screen');
    const profileEl = document.getElementById('profile-modal');
    const lobbyVisible = Boolean(menuEl && !menuEl.classList.contains('hidden'));
    const profileVisible = Boolean(profileEl && !profileEl.classList.contains('hidden'));
    if (!lobbyVisible && !profileVisible) {
      this.setActive(false);
      return;
    }
    this.isDragging = true;
    this.dragPointerId = e.pointerId;
    this.lastDragX = e.clientX;
    this.dragVelocity = 0;
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.isActive || !this.isDragging || e.pointerId !== this.dragPointerId) return;
    const dx = e.clientX - this.lastDragX;
    this.lastDragX = e.clientX;
    const deltaYaw = dx * 0.011;
    this.targetYaw += deltaYaw;
    this.dragVelocity = deltaYaw;
  }

  private onPointerUp(e: PointerEvent) {
    if (e.pointerId !== this.dragPointerId) return;
    this.isDragging = false;
    this.dragPointerId = null;
  }

  /**
   * Re-parents the single WebGL canvas cleanly between the Main Lobby
   * and the Profile Screen 3D character showcase without creating extra GPU contexts.
   */
  public mountTo(target: HTMLElement, profileMode: boolean) {
    if (!this.renderer) return;
    this.hostContainer = target;
    this.isProfileMode = profileMode;
    if (this.renderer.domElement.parentElement !== target) {
      target.appendChild(this.renderer.domElement);
    }
    this.resize();
  }

  public mountToLobby() {
    this.mountTo(this.container, false);
  }

  public resize() {
    if (!this.renderer) return;
    const rect = this.hostContainer.getBoundingClientRect();
    const w = Math.max(160, Math.round(rect.width || window.innerWidth));
    const h = Math.max(160, Math.round(rect.height || window.innerHeight));
    this.camera.aspect = w / h;
    this.camera.fov = this.isProfileMode ? 33 : w < 720 ? 44 : 36;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  public setActive(active: boolean) {
    if (!active) {
      this.isDragging = false;
      this.dragPointerId = null;
      this.dragVelocity = 0;
    }
    if (this.renderer) {
      this.renderer.domElement.style.pointerEvents = active ? 'auto' : 'none';
    }
    if (this.isActive === active) return;
    this.isActive = active;
    if (active) {
      this.resize();
      this.lastTime = performance.now();
      this.startLoop();
    } else {
      this.stopLoop();
    }
  }

  public applyQualityPreset(
    quality: 'low' | 'medium' | 'high' | 'ultra',
    shadowsEnabled?: boolean,
  ) {
    if (!this.renderer) return;
    const dpr = window.devicePixelRatio || 1;
    const forceLow = this.isMobileDevice || quality === 'low';
    if (forceLow) {
      this.renderer.setPixelRatio(1.0);
      this.renderer.shadowMap.enabled = false;
    } else if (quality === 'medium') {
      this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(dpr, 1.35));
      this.renderer.shadowMap.enabled =
        !this.isSoftwareGl && (shadowsEnabled ?? true);
    } else {
      this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(dpr, 1.85));
      this.renderer.shadowMap.enabled =
        !this.isSoftwareGl && (shadowsEnabled ?? true);
    }
    this.renderer.shadowMap.needsUpdate = true;
    if (this.rainLines && this.totalRainVertices > 0) {
      const ratio = forceLow ? 0.35 : quality === 'medium' ? 0.7 : 1.0;
      const drawCount = Math.max(
        20,
        Math.floor((this.totalRainVertices * ratio) / 2) * 2,
      );
      this.rainLines.geometry.setDrawRange(0, drawCount);
    }
    this.resize();
  }

  public setBrightness(brightnessPercent: number) {
    if (!this.renderer) return;
    const clamped = Math.max(80, Math.min(150, brightnessPercent));
    this.renderer.toneMappingExposure = Math.min(1.15, 1.15 * (clamped / 100));
  }

  public setTargetFps(fps: number) {
    this.targetFps = fps <= 30 ? 30 : 60;
  }

  private startLoop() {
    if (!this.renderer || this.frameId) return;
    const tick = () => {
      if (!this.isActive || !this.renderer) {
        this.frameId = 0;
        return;
      }
      if (this.renderer.getContext().isContextLost()) {
        this.frameId = 0;
        return;
      }
      const now = performance.now();
      const minFrameGap = this.targetFps <= 30 ? 32 : 0;
      if (!this.isSoftwareGl && minFrameGap > 0 && now - this.lastRenderMs < minFrameGap) {
        this.frameId = requestAnimationFrame(tick);
        return;
      }
      this.lastRenderMs = now;
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;
      this.update(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };
    this.frameId = requestAnimationFrame(tick);
  }

  private afterDraw(cb: () => void) {
    if (!this.renderer) return;
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || gl.isContextLost()) {
      this.frameId = 0;
      return;
    }
    if (typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (!this.isActive) {
          if (sync) gl.deleteSync(sync);
          this.frameId = 0;
          return;
        }
        const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 8);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 8);
    } else {
      this.frameId = window.setTimeout(cb, 85);
    }
  }

  private stopLoop() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
      this.frameId = 0;
    }
  }

  private update(dt: number) {
    this.elapsed += dt;

    // Gentle inertia after drag release
    if (!this.isDragging) {
      if (Math.abs(this.dragVelocity) > 0.0004) {
        this.targetYaw += this.dragVelocity;
        this.dragVelocity *= Math.pow(0.08, dt);
      } else {
        this.dragVelocity = 0;
      }
    }
    this.currentYaw += (this.targetYaw - this.currentYaw) * Math.min(1, dt * 10);
    this.aaravPivot.rotation.y = this.currentYaw;

    // Smooth camera framing between Lobby hero shot and Profile showcase shot
    const desiredCamX = this.isProfileMode ? 0 : Math.sin(this.elapsed * 0.35) * 0.14;
    const desiredCamY = this.isProfileMode ? 1.24 : 1.44 + Math.sin(this.elapsed * 0.6) * 0.03;
    const desiredCamZ = this.isProfileMode ? 3.25 : 4.15;
    this.camera.position.x += (desiredCamX - this.camera.position.x) * Math.min(1, dt * 5);
    this.camera.position.y += (desiredCamY - this.camera.position.y) * Math.min(1, dt * 5);
    this.camera.position.z += (desiredCamZ - this.camera.position.z) * Math.min(1, dt * 5);
    this.camera.lookAt(0, this.isProfileMode ? 1.02 : 1.05, 0);

    // Subtle idle breathing & lantern sway on Aarav
    this.aarav?.update(dt, this.elapsed, 0);

    // Flickering warm brass lanterns
    for (let i = 0; i < this.lanternLights.length; i++) {
      const light = this.lanternLights[i];
      const wave =
        Math.sin(this.elapsed * 6.5 + i * 2.1) * 0.35 +
        Math.sin(this.elapsed * 14.3 + i * 1.4) * 0.18;
      light.intensity = 3.9 + wave;
    }

    // Slow drifting mist planes
    for (let i = 0; i < this.mistPlanes.length; i++) {
      const plane = this.mistPlanes[i];
      plane.position.x += dt * (0.14 + (i % 3) * 0.05) * (i % 2 === 0 ? 1 : -1);
      if (plane.position.x > 6.5) plane.position.x = -6.5;
      if (plane.position.x < -6.5) plane.position.x = 6.5;
    }

    // Floating rising embers
    if (this.emberPoints) {
      const pos = this.emberPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + dt * (0.22 + (i % 5) * 0.06);
        let x = pos.getX(i) + Math.sin(this.elapsed * 1.3 + i) * dt * 0.08;
        if (y > 4.6) {
          y = 0.15;
          x = (Math.random() - 0.5) * 8.5;
        }
        pos.setXY(i, x, y);
      }
      pos.needsUpdate = true;
    }

    // Eerie falling rain streaks across the courtyard
    if (this.rainLines) {
      const pos = this.rainLines.geometry.getAttribute('position') as THREE.BufferAttribute;
      const dropSpeed = 5.4;
      for (let i = 0; i < pos.count; i += 2) {
        const len = pos.getY(i) - pos.getY(i + 1);
        let y0 = pos.getY(i) - dt * dropSpeed;
        let x0 = pos.getX(i) - dt * 0.55;
        if (y0 < 0.05) {
          y0 = 5.8 + Math.random() * 1.2;
          x0 = (Math.random() - 0.5) * 11.5;
        }
        const z = pos.getZ(i);
        pos.setXYZ(i, x0, y0, z);
        pos.setXYZ(i + 1, x0 - 0.045, y0 - len, z);
      }
      pos.needsUpdate = true;
    }

    // Subtle breathing flashlight glow flicker
    if (this.flashlightSpot && this.flashlightBeam) {
      const subtlePulse = 1 + Math.sin(this.elapsed * 3.1) * 0.05;
      this.flashlightSpot.intensity = 4.2 * subtlePulse;
      const mat = this.flashlightBeam.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.1 * subtlePulse;
    }
  }

  public dispose() {
    this.isActive = false;
    this.stopLoop();
    this.setActive(false);
    window.removeEventListener('resize', this.boundResize);
    window.removeEventListener('pointermove', this.boundPointerMove);
    window.removeEventListener('pointerup', this.boundPointerUp);
    window.removeEventListener('pointercancel', this.boundPointerUp);
    this.lanternLights = [];
    this.flashlightSpot = null;
    this.aarav = null;
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry && typeof mesh.geometry.dispose === 'function') {
        mesh.geometry.dispose();
      }
      const mat = mesh.material;
      if (Array.isArray(mat)) {
        for (const m of mat) {
          m?.dispose?.();
        }
      } else if (mat && typeof mat.dispose === 'function') {
        mat.dispose();
      }
    });
    this.scene.clear();
    if (this.renderer) {
      this.renderer.domElement.removeEventListener('pointerdown', this.boundPointerDown);
      try {
        this.renderer.forceContextLoss();
      } catch {
        // Ignore context loss errors on restricted browsers
      }
      this.renderer.dispose();
      this.renderer.domElement.remove();
      this.renderer = null;
    }
  }
}
