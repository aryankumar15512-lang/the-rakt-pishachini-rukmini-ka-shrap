import * as THREE from 'three';
import {
  buildCursedWellAssembly,
  buildRukminiWitchModel,
} from './mansionWorld.ts';
import {
  createChowkidar,
  createNeha,
  createRahul,
  createTantrik,
  createThakur,
  CharacterGLBManager,
  HumanoidCharacter,
} from './characters.ts';
import { HorrorSynth } from './horrorAudio.ts';

export type CutsceneId = 'intro_village' | 'scene1' | 'scene2' | 'scene3';

interface CrowRig {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  startPos: THREE.Vector3;
  velocity: THREE.Vector3;
  phase: number;
}

/**
 * Real-time 3D Cinematic Cutscene Director:
 * - intro_village: 16.5-second automatic animated horror intro sequence:
 *   Abandoned village at night, thick fog, full moon behind drifting clouds,
 *   broken wooden houses, flickering lantern swinging in the wind, crows flying
 *   off a dead tree, glowing eyes & shadowy figure in the dark window, quick cut
 *   to the creaking front door opening by itself, and final jump-scare sting
 *   before cutting to black.
 * - scene1: Midnight Thunderstorm & Stalled Vintage Car outside Thakur Haveli Gates
 * - scene2: Rukmini (Rakt-Pishachini) Corridor Stalk & Jumpscare Animation
 * - scene3: Spooky Courtyard Dry Well with Mystical Blue & Red Flames & Shadowy Smoke Figures
 */
export class CinematicCutsceneDirector {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(48, 16 / 9, 0.1, 100);
  private synth: HorrorSynth;
  private scenesBuilt = false;
  private contextListenersAttached = false;
  private resizeListenerAttached = false;
  private webglUnavailable = false;

  public activeSceneId: CutsceneId = 'intro_village';
  public isRunning = false;
  private rafId = 0;
  private sceneElapsed = 0;
  private lastTick = 0;

  // Scene groups
  private introVillageGroup = new THREE.Group();
  private scene1Group = new THREE.Group();
  private scene2Group = new THREE.Group();
  private scene3Group = new THREE.Group();

  // Global lights
  private hemiLight!: THREE.HemisphereLight;
  private lightningLight!: THREE.DirectionalLight;

  // Intro Village animated elements
  private introMoonLight?: THREE.DirectionalLight;
  private introClouds: THREE.Mesh[] = [];
  private introLanternPivot?: THREE.Group;
  private introLanternLight?: THREE.PointLight;
  private introLanternBulbMat?: THREE.MeshStandardMaterial;
  private introCrows: CrowRig[] = [];
  private introWindowEyesGroup?: THREE.Group;
  private introWindowEyeMat?: THREE.MeshBasicMaterial;
  private introShadowFigure?: THREE.Group;
  private introDoorPivot?: THREE.Group;
  private introDoorWitch?: ReturnType<typeof buildRukminiWitchModel>;
  private introInteriorRedLight?: THREE.PointLight;

  // Intro Village sound state flags
  private crowsTriggered = false;
  private secondCrowTriggered = false;
  private doorCreakTriggered = false;
  private jumpScareTriggered = false;
  private nextHeartbeatTime = 0;

  // Scene 1 animated sub-parts
  private rainLines?: THREE.LineSegments;
  private rainPositions?: Float32Array;
  private leftHeadlight?: THREE.SpotLight;
  private rightHeadlight?: THREE.SpotLight;
  private headlightLensL?: THREE.MeshStandardMaterial;
  private headlightLensR?: THREE.MeshStandardMaterial;
  private engineSmokeParticles: THREE.Mesh[] = [];
  private scene1Chowkidar?: HumanoidCharacter;
  private scene1Rahul?: HumanoidCharacter;
  private scene1Neha?: HumanoidCharacter;

  // Scene 2 animated sub-parts
  private scene2Witch?: ReturnType<typeof buildRukminiWitchModel>;
  private corridorLight?: THREE.PointLight;

  // Scene 3 animated sub-parts
  private scene3Well?: ReturnType<typeof buildCursedWellAssembly>;
  private blueFlameMesh?: THREE.Mesh;
  private redFlameMesh?: THREE.Mesh;
  private blueWellLight?: THREE.PointLight;
  private shadowFigures: THREE.Group[] = [];
  private scene3Tantrik?: HumanoidCharacter;
  private scene3Thakur?: HumanoidCharacter;

  public onAutoAdvanceScene?: (nextScene: CutsceneId | 'done') => void;
  public onIntroCutToBlack?: () => void;
  public onWebGLUnavailable?: () => void;

  constructor(canvas: HTMLCanvasElement, synth: HorrorSynth) {
    this.canvas = canvas;
    this.synth = synth;
  }

  private ensureScenesBuilt() {
    if (this.scenesBuilt) return;
    this.scenesBuilt = true;

    this.scene.background = new THREE.Color(0x526b91);
    this.scene.fog = null;

    const ambientLight = new THREE.AmbientLight(0xffffff, 2.2);
    this.scene.add(ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xd6d3d1, 1.8);
    this.scene.add(this.hemiLight);

    this.lightningLight = new THREE.DirectionalLight(0xffffff, 1.5);
    this.lightningLight.position.set(12, 24, 16);
    this.scene.add(this.lightningLight);

    const oppositeDirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    oppositeDirLight.position.set(-12, 22, -16);
    this.scene.add(oppositeDirLight);

    this.buildIntroAbandonedVillage();
    this.buildScene1GatesAndStalledCar();
    this.buildScene2RukminiCorridor();
    this.buildScene3MysticalWell();

    this.scene.add(
      this.introVillageGroup,
      this.scene1Group,
      this.scene2Group,
      this.scene3Group,
    );
  }

  private createRendererSafely(): THREE.WebGLRenderer | null {
    const configs: THREE.WebGLRendererParameters[] = [
      {
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'default',
        failIfMajorPerformanceCaveat: false,
      },
      {
        canvas: this.canvas,
        antialias: false,
        powerPreference: 'low-power',
        failIfMajorPerformanceCaveat: false,
      },
    ];

    for (const cfg of configs) {
      try {
        const renderer = new THREE.WebGLRenderer(cfg);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.shadowMap.enabled = Boolean(cfg.antialias);
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        return renderer;
      } catch {
        // Try next lighter WebGL context configuration
      }
    }
    return null;
  }

  private ensureInitialized(): boolean {
    if (this.webglUnavailable) return false;

    if (!this.contextListenersAttached) {
      this.contextListenersAttached = true;
      this.canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        this.stop();
      });
      this.canvas.addEventListener('webglcontextrestored', () => {
        this.webglUnavailable = false;
        this.resize();
      });
    }

    if (!this.renderer) {
      this.renderer = this.createRendererSafely();
      if (!this.renderer) {
        this.webglUnavailable = true;
        return false;
      }
    }

    this.ensureScenesBuilt();

    if (!this.resizeListenerAttached) {
      this.resizeListenerAttached = true;
      window.addEventListener('resize', () => this.resize());
    }

    this.resize();
    return true;
  }

  public resize() {
    if (!this.renderer) return;
    const w = window.innerWidth || 1280;
    const h = window.innerHeight || 720;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  /**
   * Builds the 16.5-second animated horror intro scene:
   * Dark abandoned village at night, thick fog, full moon behind clouds,
   * broken wooden houses along a muddy path, flickering lantern swinging in the wind,
   * dead tree with crows, and haunted house with upper window & creaking front door.
   */
  private buildIntroAbandonedVillage() {
    // 1. Dark village ground & wet muddy central path
    const villageGround = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({
        color: 0x080b10,
        roughness: 0.92,
        metalness: 0.08,
      }),
    );
    villageGround.rotation.x = -Math.PI / 2;
    this.introVillageGroup.add(villageGround);

    const muddyPath = new THREE.Mesh(
      new THREE.PlaneGeometry(2.9, 32),
      new THREE.MeshStandardMaterial({
        color: 0x120e0b,
        roughness: 0.22,
        metalness: 0.38,
      }),
    );
    muddyPath.rotation.x = -Math.PI / 2;
    muddyPath.position.set(0, 0.01, -2);
    this.introVillageGroup.add(muddyPath);

    // Muddy wheel ruts / puddles reflecting cold moonlight & lantern glow
    for (let z = 5; z >= -8; z -= 2.4) {
      const puddle = new THREE.Mesh(
        new THREE.CircleGeometry(0.45 + (Math.abs(z) % 0.3), 16),
        new THREE.MeshStandardMaterial({
          color: 0x0a1018,
          roughness: 0.06,
          metalness: 0.75,
        }),
      );
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set(Math.sin(z * 1.7) * 0.45, 0.018, z);
      this.introVillageGroup.add(puddle);
    }

    // 2. Full Moon in the night sky + drifting dark clouds
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.1, 24, 24),
      new THREE.MeshBasicMaterial({
        color: 0xd8e8ff,
      }),
    );
    moonMesh.position.set(3.4, 11.2, -25);
    this.introVillageGroup.add(moonMesh);

    const moonHalo = new THREE.Mesh(
      new THREE.RingGeometry(2.1, 4.2, 32),
      new THREE.MeshBasicMaterial({
        color: 0x5c85cc,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      }),
    );
    moonHalo.position.set(3.4, 11.2, -24.8);
    this.introVillageGroup.add(moonHalo);

    this.introMoonLight = new THREE.DirectionalLight(0x5580cc, 1.9);
    this.introMoonLight.position.set(4, 12, -18);
    this.introVillageGroup.add(this.introMoonLight);

    // Drifting clouds partially veiling the full moon
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0x0c1322,
      roughness: 1,
      transparent: true,
      opacity: 0.78,
    });
    for (let i = 0; i < 4; i++) {
      const cloud = new THREE.Mesh(
        new THREE.PlaneGeometry(7.5 + i * 1.2, 1.8 + (i % 2) * 0.6),
        cloudMat,
      );
      cloud.position.set(
        1.5 + (i - 1.5) * 2.4,
        10.5 + (i % 2) * 0.9,
        -22.5 + i * 0.3,
      );
      this.introClouds.push(cloud);
      this.introVillageGroup.add(cloud);
    }

    // 3. Broken Wooden Village Houses flanking the muddy path
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x1a1310,
      roughness: 0.92,
    });
    const darkRoofMat = new THREE.MeshStandardMaterial({
      color: 0x100c0b,
      roughness: 0.95,
    });

    const houseSpecs = [
      { x: -4.4, z: 2.2, rotY: 0.14, tiltZ: -0.06 },
      { x: 4.5, z: 1.0, rotY: -0.18, tiltZ: 0.05 },
      { x: -4.8, z: -3.8, rotY: 0.08, tiltZ: 0.04 },
      { x: 4.6, z: -4.5, rotY: -0.12, tiltZ: -0.07 },
    ];

    for (const h of houseSpecs) {
      const shack = new THREE.Group();
      shack.position.set(h.x, 0, h.z);
      shack.rotation.set(0, h.rotY, h.tiltZ);

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 2.7, 3.6),
        woodMat,
      );
      body.position.y = 1.35;
      shack.add(body);

      // Broken slanted gable roof
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(2.65, 1.4, 4),
        darkRoofMat,
      );
      roof.position.y = 3.35;
      roof.rotation.y = Math.PI / 4;
      roof.rotation.z = h.tiltZ * 1.8;
      shack.add(roof);

      // Broken wooden planks nailed across shack windows
      for (let p = 0; p < 3; p++) {
        const plank = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 1.1, 0.06),
          woodMat,
        );
        plank.position.set(
          h.x < 0 ? 1.62 : -1.62,
          1.4 + (p - 1) * 0.25,
          (p - 1) * 0.35,
        );
        plank.rotation.x = 0.25 * (p - 1);
        shack.add(plank);
      }

      this.introVillageGroup.add(shack);
    }

    // 4. Flickering Lantern Swinging in the Wind along the path
    const postGroup = new THREE.Group();
    postGroup.position.set(-1.42, 0, -0.35);

    const verticalPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 2.65, 8),
      woodMat,
    );
    verticalPost.position.y = 1.32;
    verticalPost.rotation.z = -0.04;
    postGroup.add(verticalPost);

    const crossArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.08, 0.08),
      woodMat,
    );
    crossArm.position.set(0.32, 2.52, 0);
    postGroup.add(crossArm);

    this.introLanternPivot = new THREE.Group();
    this.introLanternPivot.position.set(0.62, 2.48, 0);

    const chain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.32, 6),
      new THREE.MeshStandardMaterial({ color: 0x222225, metalness: 0.8 }),
    );
    chain.position.y = -0.16;
    this.introLanternPivot.add(chain);

    const lanternCap = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.12, 8),
      new THREE.MeshStandardMaterial({ color: 0x1b1815, metalness: 0.7 }),
    );
    lanternCap.position.y = -0.34;
    this.introLanternPivot.add(lanternCap);

    this.introLanternBulbMat = new THREE.MeshStandardMaterial({
      color: 0xffaa44,
      emissive: 0xff6a11,
      emissiveIntensity: 3.2,
      roughness: 0.2,
    });
    const lanternGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.09, 0.24, 10),
      this.introLanternBulbMat,
    );
    lanternGlass.position.y = -0.48;
    this.introLanternPivot.add(lanternGlass);

    this.introLanternLight = new THREE.PointLight(0xff7722, 3.8, 9.5, 1.4);
    this.introLanternLight.position.set(0, -0.5, 0);
    this.introLanternPivot.add(this.introLanternLight);

    postGroup.add(this.introLanternPivot);
    this.introVillageGroup.add(postGroup);

    // 5. Dead Gnarled Tree & Perched Crows that Fly Off
    const treeGroup = new THREE.Group();
    treeGroup.position.set(-2.55, 0, -4.8);
    const barkMat = new THREE.MeshStandardMaterial({
      color: 0x141010,
      roughness: 0.96,
    });
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.36, 4.2, 8),
      barkMat,
    );
    trunk.position.y = 2.1;
    trunk.rotation.z = -0.08;
    treeGroup.add(trunk);

    const branchConfigs = [
      { pos: [0.55, 3.4, 0.2], rot: [0.2, 0, -0.65], len: 1.8 },
      { pos: [-0.45, 3.7, -0.2], rot: [-0.15, 0, 0.58], len: 1.6 },
      { pos: [0.3, 4.1, -0.35], rot: [0.4, 0.2, -0.45], len: 1.4 },
    ];
    for (const b of branchConfigs) {
      const br = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.08, b.len, 6),
        barkMat,
      );
      br.position.set(b.pos[0], b.pos[1], b.pos[2]);
      br.rotation.set(b.rot[0], b.rot[1], b.rot[2]);
      treeGroup.add(br);
    }
    this.introVillageGroup.add(treeGroup);

    // Build 6 Crows perched on the dead tree branches
    const crowMat = new THREE.MeshStandardMaterial({
      color: 0x050507,
      roughness: 0.6,
    });
    const crowPerches = [
      new THREE.Vector3(-1.85, 3.85, -4.6),
      new THREE.Vector3(-2.15, 4.05, -4.75),
      new THREE.Vector3(-2.95, 3.95, -4.9),
      new THREE.Vector3(-2.45, 4.35, -5.05),
      new THREE.Vector3(-1.65, 3.65, -4.55),
      new THREE.Vector3(-3.1, 4.15, -4.85),
    ];

    for (let i = 0; i < crowPerches.length; i++) {
      const crowGroup = new THREE.Group();
      crowGroup.position.copy(crowPerches[i]);

      const body = new THREE.Mesh(
        new THREE.ConeGeometry(0.055, 0.22, 6),
        crowMat,
      );
      body.rotation.x = Math.PI / 2;
      crowGroup.add(body);

      const wingGeo = new THREE.BoxGeometry(0.24, 0.015, 0.11);
      const leftWing = new THREE.Mesh(wingGeo, crowMat);
      leftWing.position.set(-0.11, 0.02, 0);
      const rightWing = new THREE.Mesh(wingGeo, crowMat);
      rightWing.position.set(0.11, 0.02, 0);
      crowGroup.add(leftWing, rightWing);

      this.introCrows.push({
        group: crowGroup,
        leftWing,
        rightWing,
        startPos: crowPerches[i].clone(),
        velocity: new THREE.Vector3(
          1.6 + i * 0.35,
          1.4 + (i % 3) * 0.45,
          1.2 + (i % 2) * 0.5,
        ),
        phase: i * 1.1,
      });
      this.introVillageGroup.add(crowGroup);
    }

    // 6. Old Haunted House (Thakur Haveli) at the end of the muddy path
    const houseGroup = new THREE.Group();
    houseGroup.position.set(0, 0, -10.5);

    const hauntedWallMat = new THREE.MeshStandardMaterial({
      color: 0x151116,
      roughness: 0.9,
    });
    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x0b080b,
      roughness: 0.85,
    });

    // Lower front facade with central doorway opening
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 3.2, 0.45),
      hauntedWallMat,
    );
    leftWall.position.set(-2.35, 1.6, 1.0);
    houseGroup.add(leftWall);

    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 3.2, 0.45),
      hauntedWallMat,
    );
    rightWall.position.set(2.35, 1.6, 1.0);
    houseGroup.add(rightWall);

    const doorHeader = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.8, 0.45),
      hauntedWallMat,
    );
    doorHeader.position.set(0, 2.8, 1.0);
    houseGroup.add(doorHeader);

    // Second story facade with dark upper window recess
    const upperWall = new THREE.Mesh(
      new THREE.BoxGeometry(8.1, 3.1, 3.6),
      hauntedWallMat,
    );
    upperWall.position.set(0, 4.75, -0.6);
    houseGroup.add(upperWall);

    // Steep haunted gable roof
    const mainRoof = new THREE.Mesh(
      new THREE.ConeGeometry(6.2, 2.5, 4),
      darkTrimMat,
    );
    mainRoof.position.set(0, 7.5, -0.6);
    mainRoof.rotation.y = Math.PI / 4;
    houseGroup.add(mainRoof);

    // Porch steps & columns
    const porchBase = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.28, 1.8),
      darkTrimMat,
    );
    porchBase.position.set(0, 0.14, 1.55);
    houseGroup.add(porchBase);

    for (const side of [-1, 1]) {
      const porchCol = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.13, 3.0, 10),
        darkTrimMat,
      );
      porchCol.position.set(side * 1.75, 1.6, 2.15);
      houseGroup.add(porchCol);
    }

    // Dark Upper Window Frame & Recess (where glowing eyes & shadowy figure appear)
    const upperWindowBacking = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.85),
      new THREE.MeshBasicMaterial({ color: 0x020103 }),
    );
    upperWindowBacking.position.set(0, 4.65, 1.22);
    houseGroup.add(upperWindowBacking);

    const windowFrameTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 0.1, 0.12),
      darkTrimMat,
    );
    windowFrameTop.position.set(0, 5.58, 1.25);
    houseGroup.add(windowFrameTop);

    // Glowing Red Eyes in the dark upper window
    this.introWindowEyesGroup = new THREE.Group();
    this.introWindowEyesGroup.position.set(0, 4.72, 1.26);
    this.introWindowEyeMat = new THREE.MeshBasicMaterial({
      color: 0xff1515,
      transparent: true,
      opacity: 0,
    });
    const eyeGeo = new THREE.SphereGeometry(0.055, 12, 12);
    const eyeL = new THREE.Mesh(eyeGeo, this.introWindowEyeMat);
    eyeL.position.x = -0.13;
    const eyeR = new THREE.Mesh(eyeGeo, this.introWindowEyeMat);
    eyeR.position.x = 0.13;
    this.introWindowEyesGroup.add(eyeL, eyeR);
    houseGroup.add(this.introWindowEyesGroup);

    // Shadowy Figure that passes across the upper window
    this.introShadowFigure = new THREE.Group();
    this.introShadowFigure.position.set(-0.9, 4.15, 1.24);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x060204,
      transparent: true,
      opacity: 0.92,
    });
    const shadowTorso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.22, 0.55, 6, 12),
      shadowMat,
    );
    shadowTorso.position.y = 0.35;
    const shadowHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 12, 12),
      shadowMat,
    );
    shadowHead.position.y = 0.85;
    this.introShadowFigure.add(shadowTorso, shadowHead);
    this.introShadowFigure.visible = false;
    houseGroup.add(this.introShadowFigure);

    // Pitch-black interior room behind the front door
    const interiorChamber = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 3.1, 3.5),
      new THREE.MeshStandardMaterial({
        color: 0x030102,
        roughness: 1,
        side: THREE.BackSide,
      }),
    );
    interiorChamber.position.set(0, 1.55, -0.8);
    houseGroup.add(interiorChamber);

    this.introInteriorRedLight = new THREE.PointLight(0xff1111, 0, 5, 1.5);
    this.introInteriorRedLight.position.set(0, 1.7, 0.4);
    houseGroup.add(this.introInteriorRedLight);

    // Creaking Wooden Front Door on Hinge Pivot (opens by itself in Shot 2)
    this.introDoorPivot = new THREE.Group();
    this.introDoorPivot.position.set(-0.65, 0.28, 1.02);

    const doorPanel = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 2.25, 0.09),
      new THREE.MeshStandardMaterial({
        color: 0x22130e,
        roughness: 0.86,
      }),
    );
    doorPanel.position.set(0.65, 1.125, 0);
    this.introDoorPivot.add(doorPanel);

    const brassHandle = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0x997733,
        metalness: 0.85,
        roughness: 0.3,
      }),
    );
    brassHandle.position.set(1.12, 1.05, 0.06);
    this.introDoorPivot.add(brassHandle);

    houseGroup.add(this.introDoorPivot);

    // Rukmini inside the dark doorway for the final jump-scare sting
    this.introDoorWitch = buildRukminiWitchModel();
    this.introDoorWitch.root.position.set(0, 0.15, -0.9);
    this.introDoorWitch.root.visible = false;
    houseGroup.add(this.introDoorWitch.root);

    this.introVillageGroup.add(houseGroup);
  }

  private buildScene1GatesAndStalledCar() {
    // Wet muddy road & mansion grounds
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({
        color: 0x0d0b10,
        roughness: 0.25,
        metalness: 0.4,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene1Group.add(ground);

    // Massive Thakur Haveli Iron Gates & Stone Gateposts
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x241818,
      roughness: 0.85,
    });
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x151518,
      roughness: 0.4,
      metalness: 0.85,
    });

    for (const side of [-1, 1]) {
      const gatePost = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 4.8, 1.1),
        pillarMat,
      );
      gatePost.position.set(side * 3.2, 2.4, -6);
      this.scene1Group.add(gatePost);

      // Ornate lantern on gatepost
      const lantern = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.25, 0),
        new THREE.MeshStandardMaterial({
          color: 0xff5522,
          emissive: 0xff2200,
          emissiveIntensity: 2.0,
        }),
      );
      lantern.position.set(side * 3.2, 5.05, -6);
      this.scene1Group.add(lantern);
    }

    // Iron gate bars & arch
    for (let i = -9; i <= 9; i++) {
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 4.2, 8),
        ironMat,
      );
      bar.position.set(i * 0.28, 2.1, -6);
      this.scene1Group.add(bar);
    }
    const crossBar = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 0.18, 0.12),
      ironMat,
    );
    crossBar.position.set(0, 3.8, -6);
    this.scene1Group.add(crossBar);

    // Decaying Haunted Thakur Haveli Silhouette in background
    const mansionFacade = new THREE.Mesh(
      new THREE.BoxGeometry(18, 9, 4),
      new THREE.MeshStandardMaterial({ color: 0x140b0d, roughness: 0.9 }),
    );
    mansionFacade.position.set(0, 4.5, -15);
    this.scene1Group.add(mansionFacade);

    // 1992 Vintage Ambassador-style Car stalled in front of gates
    const carGroup = new THREE.Group();
    carGroup.position.set(0, 0, -0.8);
    carGroup.rotation.y = 0.12;

    const carBodyMat = new THREE.MeshStandardMaterial({
      color: 0x2b303a,
      roughness: 0.35,
      metalness: 0.65,
    });
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 0.65, 3.8),
      carBodyMat,
    );
    chassis.position.y = 0.55;
    carGroup.add(chassis);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.52, 0.58, 1.9),
      carBodyMat,
    );
    cabin.position.set(0, 1.12, 0.15);
    carGroup.add(cabin);

    // Flickering Headlights
    this.headlightLensL = new THREE.MeshStandardMaterial({
      color: 0xfff3cc,
      emissive: 0xffdd88,
      emissiveIntensity: 3.5,
    });
    this.headlightLensR = this.headlightLensL.clone();

    const lampGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.08, 16);
    lampGeo.rotateX(Math.PI / 2);
    const lampL = new THREE.Mesh(lampGeo, this.headlightLensL);
    lampL.position.set(-0.62, 0.62, -1.91);
    const lampR = new THREE.Mesh(lampGeo, this.headlightLensR);
    lampR.position.set(0.62, 0.62, -1.91);
    carGroup.add(lampL, lampR);

    this.leftHeadlight = new THREE.SpotLight(
      0xffefc2,
      6,
      16,
      Math.PI / 5,
      0.5,
      1.2,
    );
    this.leftHeadlight.position.set(-0.62, 0.65, -1.9);
    this.leftHeadlight.target.position.set(-1.1, 0.4, -8);
    carGroup.add(this.leftHeadlight, this.leftHeadlight.target);

    this.rightHeadlight = new THREE.SpotLight(
      0xffefc2,
      6,
      16,
      Math.PI / 5,
      0.5,
      1.2,
    );
    this.rightHeadlight.position.set(0.62, 0.65, -1.9);
    this.rightHeadlight.target.position.set(0.9, 0.4, -8);
    carGroup.add(this.rightHeadlight, this.rightHeadlight.target);

    // Engine smoke puffs rising from stalled hood
    const smokeMat = new THREE.MeshStandardMaterial({
      color: 0x888895,
      transparent: true,
      opacity: 0.35,
      roughness: 1,
    });
    for (let i = 0; i < 8; i++) {
      const puff = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.18 + i * 0.04, 1),
        smokeMat,
      );
      puff.position.set(
        (Math.random() - 0.5) * 0.6,
        0.9 + i * 0.22,
        -1.5 + (Math.random() - 0.5) * 0.4,
      );
      this.engineSmokeParticles.push(puff);
      carGroup.add(puff);
    }

    this.scene1Group.add(carGroup);

    // Chowkidar (Guard) with lantern warning by the gate
    this.scene1Chowkidar = createChowkidar();
    this.scene1Chowkidar.root.position.set(-2.2, 0, -3.2);
    this.scene1Chowkidar.root.rotation.y = 0.6;
    CharacterGLBManager.register('golu', this.scene1Chowkidar);
    this.scene1Group.add(this.scene1Chowkidar.root);

    // Rahul checking stalled car engine
    this.scene1Rahul = createRahul();
    this.scene1Rahul.root.position.set(0.9, 0, -1.2);
    this.scene1Rahul.root.rotation.y = -Math.PI / 1.8;
    CharacterGLBManager.register('mangesh', this.scene1Rahul);
    this.scene1Group.add(this.scene1Rahul.root);

    // Neha standing nervously near the vintage car
    this.scene1Neha = createNeha();
    this.scene1Neha.root.position.set(1.4, 0, -0.4);
    this.scene1Neha.root.rotation.y = -Math.PI / 2.2;
    CharacterGLBManager.register('mangesh', this.scene1Neha);
    this.scene1Group.add(this.scene1Neha.root);

    // Thunderstorm Rain Streaks
    const rainCount = 400;
    const positions = new Float32Array(rainCount * 6);
    for (let i = 0; i < rainCount; i++) {
      const x = (Math.random() - 0.5) * 20;
      const y = Math.random() * 10;
      const z = (Math.random() - 0.5) * 16 - 3;
      positions[i * 6 + 0] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = z;
      positions[i * 6 + 3] = x - 0.08;
      positions[i * 6 + 4] = y - 0.55;
      positions[i * 6 + 5] = z;
    }
    this.rainPositions = positions;
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rainLines = new THREE.LineSegments(
      rainGeo,
      new THREE.LineBasicMaterial({
        color: 0x99bbff,
        transparent: true,
        opacity: 0.45,
      }),
    );
    this.scene1Group.add(this.rainLines);
  }

  private buildScene2RukminiCorridor() {
    // Dark Haunted Corridor Floor & Walls
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 26),
      new THREE.MeshStandardMaterial({ color: 0x12090a, roughness: 0.85 }),
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene2Group.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x1e0d0f,
      roughness: 0.9,
    });
    for (const side of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 26), wallMat);
      wall.position.set(side * 2.8, 2.5, -6);
      this.scene2Group.add(wall);

      for (let z = -14; z <= 2; z += 3.2) {
        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.26, 4.8, 12),
          wallMat,
        );
        col.position.set(side * 2.35, 2.4, z);
        this.scene2Group.add(col);
      }
    }

    // Eerie crimson-amber corridor light
    this.corridorLight = new THREE.PointLight(0xff2211, 4.5, 14, 1.5);
    this.corridorLight.position.set(0, 2.8, -4);
    this.scene2Group.add(this.corridorLight);

    // Rukmini (The Rakt-Pishachini) with reverse-twisted legs, burnt red bridal saree, 90-deg snapped neck, glowing red eyes
    this.scene2Witch = buildRukminiWitchModel();
    this.scene2Witch.root.position.set(0, 0, -7.5);
    this.scene2Group.add(this.scene2Witch.root);
  }

  private buildScene3MysticalWell() {
    // Courtyard ground
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x110c0e, roughness: 0.9 }),
    );
    floor.rotation.x = -Math.PI / 2;
    this.scene3Group.add(floor);

    // Ancient stone dry well
    this.scene3Well = buildCursedWellAssembly();
    this.scene3Well.group.position.set(0, 0, 0);
    this.scene3Group.add(this.scene3Well.group);

    // Mystical Blue & Red Flames rising from inside the well
    this.blueFlameMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.65, 2.4, 7),
      new THREE.MeshStandardMaterial({
        color: 0x3399ff,
        emissive: 0x1166ff,
        emissiveIntensity: 3.2,
        transparent: true,
        opacity: 0.82,
      }),
    );
    this.blueFlameMesh.position.set(-0.18, 1.4, 0);
    this.scene3Group.add(this.blueFlameMesh);

    this.redFlameMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.72, 2.7, 7),
      new THREE.MeshStandardMaterial({
        color: 0xff2222,
        emissive: 0xff0800,
        emissiveIntensity: 3.0,
        transparent: true,
        opacity: 0.78,
      }),
    );
    this.redFlameMesh.position.set(0.18, 1.55, 0.1);
    this.scene3Group.add(this.redFlameMesh);

    this.blueWellLight = new THREE.PointLight(0x4488ff, 5.5, 14, 1.4);
    this.blueWellLight.position.set(0, 2.4, 0);
    this.scene3Group.add(this.blueWellLight);

    // Shadowy smoke figures orbiting the burning well
    const shadowMat = new THREE.MeshStandardMaterial({
      color: 0x09080d,
      emissive: 0x1b081a,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.65,
      roughness: 1,
    });

    for (let i = 0; i < 5; i++) {
      const fig = new THREE.Group();
      const torso = new THREE.Mesh(
        new THREE.ConeGeometry(0.38, 1.7, 8),
        shadowMat,
      );
      torso.position.y = 1.1;
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 10),
        shadowMat,
      );
      head.position.y = 2.05;
      fig.add(torso, head);
      this.shadowFigures.push(fig);
      this.scene3Group.add(fig);
    }

    // Tantrik Kalbhairav chanting by the burning well
    this.scene3Tantrik = createTantrik();
    this.scene3Tantrik.root.position.set(-2.2, 0, 0.4);
    this.scene3Tantrik.root.rotation.y = Math.PI / 3;
    this.scene3Group.add(this.scene3Tantrik.root);

    // Thakur observing the dark ritual across the well
    this.scene3Thakur = createThakur();
    this.scene3Thakur.root.position.set(2.2, 0, -0.2);
    this.scene3Thakur.root.rotation.y = -Math.PI / 2.4;
    this.scene3Group.add(this.scene3Thakur.root);
  }

  private resetIntroVillageState() {
    this.crowsTriggered = false;
    this.secondCrowTriggered = false;
    this.doorCreakTriggered = false;
    this.jumpScareTriggered = false;
    this.nextHeartbeatTime = 0.6;

    for (const crow of this.introCrows) {
      crow.group.position.copy(crow.startPos);
      crow.group.rotation.set(0, 0.4, 0);
      crow.leftWing.rotation.z = 0;
      crow.rightWing.rotation.z = 0;
    }

    if (this.introWindowEyeMat) {
      this.introWindowEyeMat.opacity = 0;
    }
    if (this.introShadowFigure) {
      this.introShadowFigure.visible = false;
      this.introShadowFigure.position.x = -0.9;
    }
    if (this.introDoorPivot) {
      this.introDoorPivot.rotation.y = 0;
    }
    if (this.introDoorWitch) {
      this.introDoorWitch.root.visible = false;
      this.introDoorWitch.root.position.set(0, 0.15, -0.9);
    }
    if (this.introInteriorRedLight) {
      this.introInteriorRedLight.intensity = 0;
    }
  }

  public setScene(sceneId: CutsceneId) {
    this.activeSceneId = sceneId;
    this.sceneElapsed = 0;
    this.introVillageGroup.visible = sceneId === 'intro_village';
    this.scene1Group.visible = sceneId === 'scene1';
    this.scene2Group.visible = sceneId === 'scene2';
    this.scene3Group.visible = sceneId === 'scene3';

    if (sceneId === 'intro_village') {
      this.resetIntroVillageState();
    }
    this.synth.stopAllVNSounds();

    if (sceneId === 'scene2' && this.scene2Witch) {
      this.scene2Witch.root.position.set(0, 0, -7.2);
    }
  }

  public start(initialScene: CutsceneId = 'intro_village') {
    if (!this.ensureInitialized()) {
      this.isRunning = false;
      this.onWebGLUnavailable?.();
      return;
    }
    this.resize();
    this.setScene(initialScene);
    this.isRunning = true;
    this.lastTick = performance.now();
    cancelAnimationFrame(this.rafId);
    const loop = (now: number) => {
      if (!this.isRunning || !this.renderer) return;
      const dt = Math.min(0.05, (now - this.lastTick) * 0.001);
      this.lastTick = now;
      this.update(dt, now * 0.001);
      if (this.isRunning && this.renderer) {
        if (this.renderer.getContext().isContextLost()) {
          this.stop();
          return;
        }
        this.renderer.render(this.scene, this.camera);
        this.rafId = requestAnimationFrame(loop);
      }
    };
    this.rafId = requestAnimationFrame(loop);
  }

  public stop() {
    this.isRunning = false;
    this.synth.stopAllVNSounds();
    cancelAnimationFrame(this.rafId);
  }

  public dispose() {
    this.stop();
    if (this.renderer) {
      try {
        this.renderer.forceContextLoss();
      } catch {
        // Ignore context loss errors
      }
      this.renderer.dispose();
      this.renderer = null;
    }
    this.webglUnavailable = false;
  }

  private updateIntroVillage(dt: number, time: number) {
    const t = this.sceneElapsed;

    // 1. Track heartbeat cadence timing visually without triggering intro oscillators
    if (t >= this.nextHeartbeatTime && t < 15.3) {
      const progress = Math.min(1, t / 15.0);
      const interval = Math.max(0.36, 1.05 - progress * 0.65);
      this.nextHeartbeatTime = t + interval;
    }

    // 2. Drifting clouds across the full moon
    this.introClouds.forEach((cloud, idx) => {
      cloud.position.x += dt * (0.22 + idx * 0.06) * (idx % 2 === 0 ? 1 : -1);
    });

    // 3. Flickering lantern swinging in the wind
    if (this.introLanternPivot) {
      this.introLanternPivot.rotation.z =
        Math.sin(time * 3.1) * 0.24 + Math.sin(time * 7.4) * 0.05;
      this.introLanternPivot.rotation.x = Math.cos(time * 2.3) * 0.08;
    }
    const lanternFlicker =
      3.4 +
      Math.sin(time * 17.0) * 0.65 +
      Math.cos(time * 31.0) * 0.45 +
      (Math.random() > 0.92 ? -1.4 : 0);
    if (this.introLanternLight) {
      this.introLanternLight.intensity = Math.max(0.8, lanternFlicker);
    }
    if (this.introLanternBulbMat) {
      this.introLanternBulbMat.emissiveIntensity = Math.max(
        1.0,
        lanternFlicker * 0.9,
      );
    }

    // 4. Crows flying off the dead tree at t >= 2.6s
    if (t >= 2.6) {
      if (!this.crowsTriggered) {
        this.crowsTriggered = true;
      }
      if (t >= 3.25 && !this.secondCrowTriggered) {
        this.secondCrowTriggered = true;
      }

      for (const crow of this.introCrows) {
        crow.group.position.addScaledVector(crow.velocity, dt);
        crow.group.rotation.y = Math.atan2(crow.velocity.x, crow.velocity.z);
        const flap = Math.sin(time * 28 + crow.phase) * 0.75;
        crow.leftWing.rotation.z = flap;
        crow.rightWing.rotation.z = -flap;
      }
    }

    // 5. Pair of glowing eyes & shadowy figure passing behind the upper window (t = 4.8s to 10.6s)
    if (this.introWindowEyeMat && this.introWindowEyesGroup) {
      if (t >= 4.8 && t < 10.4) {
        const fadeIn = Math.min(1, (t - 4.8) * 1.6);
        const fadeOut = Math.min(1, (10.4 - t) * 1.5);
        this.introWindowEyeMat.opacity = Math.min(fadeIn, fadeOut);
        this.introWindowEyesGroup.position.x = Math.sin(time * 2.2) * 0.08;
      } else {
        this.introWindowEyeMat.opacity = 0;
      }
    }

    if (this.introShadowFigure) {
      if (t >= 5.2 && t < 9.8) {
        this.introShadowFigure.visible = true;
        const passProgress = (t - 5.2) / 4.6;
        this.introShadowFigure.position.x = THREE.MathUtils.lerp(
          -0.85,
          0.85,
          passProgress,
        );
      } else {
        this.introShadowFigure.visible = false;
      }
    }

    // 6. Camera Choreography:
    // Shot 1 (0.0s – 11.0s): Slow cinematic push-in along muddy path toward the haunted house
    if (t < 11.0) {
      const pushProgress = t / 11.0;
      const camZ = THREE.MathUtils.lerp(6.4, -3.2, pushProgress);
      const shakeX =
        Math.sin(time * 5.8) * 0.032 + Math.cos(time * 13.4) * 0.008;
      const shakeY =
        Math.cos(time * 6.4) * 0.026 + Math.sin(time * 11.2) * 0.008;

      this.camera.position.set(shakeX, 1.62 + shakeY, camZ);
      // Gradually tilt gaze up toward the haunted house & upper window
      const lookY = THREE.MathUtils.lerp(1.85, 3.35, Math.min(1, t / 8.5));
      this.camera.lookAt(shakeX * 0.5, lookY, -10.5);
    } else if (t < 15.2) {
      // Shot 2 (11.0s – 15.2s): Quick cut to the creaking front door opening by itself
      if (!this.doorCreakTriggered) {
        this.doorCreakTriggered = true;
      }

      const doorProgress = Math.min(1, (t - 11.0) / 3.6);
      const easedDoor = 1 - Math.pow(1 - doorProgress, 2.2);
      if (this.introDoorPivot) {
        this.introDoorPivot.rotation.y = -easedDoor * 1.28;
      }
      if (this.introInteriorRedLight) {
        this.introInteriorRedLight.intensity = easedDoor * 2.6;
      }

      const cutPush = (t - 11.0) / 4.2;
      const shakeX = Math.sin(time * 8.2) * 0.018;
      const shakeY = Math.cos(time * 9.5) * 0.016;
      this.camera.position.set(
        shakeX,
        1.42 + shakeY,
        THREE.MathUtils.lerp(-6.35, -7.25, cutPush),
      );
      this.camera.lookAt(0, 1.38, -9.8);
    } else if (t < 16.5) {
      // Shot 3 (15.2s – 16.5s): Sudden Jump-Scare Sting at the doorway!
      if (!this.jumpScareTriggered) {
        this.jumpScareTriggered = true;
        if (this.introDoorWitch) {
          this.introDoorWitch.root.visible = true;
        }
      }

      const lungeProgress = Math.min(1, (t - 15.2) / 0.55);
      if (this.introDoorWitch) {
        this.introDoorWitch.character.update(dt, time, 4.0);
        // House is at z = -10.5; local z from -0.6 to +2.55 brings Rukmini right into the camera!
        this.introDoorWitch.root.position.z = THREE.MathUtils.lerp(
          -0.4,
          2.55,
          lungeProgress,
        );
        this.introDoorWitch.headGroup.rotation.z =
          0.26 + Math.sin(time * 30) * 0.14;
        this.introDoorWitch.leftArm.rotation.x = -1.35;
        this.introDoorWitch.rightArm.rotation.x = -1.35;
      }
      if (this.introInteriorRedLight) {
        this.introInteriorRedLight.intensity = 9.5;
      }

      const jolt = 0.14;
      this.camera.position.set(
        (Math.random() - 0.5) * jolt,
        1.45 + (Math.random() - 0.5) * jolt,
        -7.25,
      );
      this.camera.lookAt(0, 1.48, -9.5);
    } else {
      // Cut to black at 16.5s and reveal blood-red glitchy title + Press Start button
      this.stop();
      this.onIntroCutToBlack?.();
    }
  }

  private update(dt: number, time: number) {
    this.sceneElapsed += dt;

    if (this.activeSceneId === 'intro_village') {
      this.updateIntroVillage(dt, time);
      return;
    }

    if (this.activeSceneId === 'scene1') {
      // Slow ominous push-in + continuous subtle breathing drift while voiceover plays
      const pushProgress = 1 - Math.exp(-this.sceneElapsed * 0.14);
      this.camera.position.set(
        Math.sin(time * 0.4) * 0.6,
        1.75 + Math.sin(time * 1.1) * 0.06,
        4.2 - pushProgress * 2.2 + Math.cos(time * 0.35) * 0.12,
      );
      this.camera.lookAt(0, 1.3, -4.5);

      // Flickering car headlights
      const flicker =
        Math.sin(time * 23) * Math.sin(time * 47) > 0.15
          ? 5.5
          : Math.random() > 0.4
            ? 1.2
            : 0.15;
      if (this.leftHeadlight && this.rightHeadlight) {
        this.leftHeadlight.intensity = flicker;
        this.rightHeadlight.intensity = flicker * 0.9;
      }
      if (this.headlightLensL && this.headlightLensR) {
        this.headlightLensL.emissiveIntensity = flicker * 0.6;
        this.headlightLensR.emissiveIntensity = flicker * 0.55;
      }

      // Periodic thunderstorm lightning flash
      const flash =
        Math.sin(time * 2.7) > 0.94 && Math.random() > 0.3 ? 9.0 : 0.35;
      this.lightningLight.intensity = THREE.MathUtils.lerp(
        this.lightningLight.intensity,
        flash,
        dt * 14,
      );

      // Rain animation
      if (this.rainLines && this.rainPositions) {
        for (let i = 0; i < this.rainPositions.length; i += 6) {
          this.rainPositions[i + 1] -= dt * 14;
          this.rainPositions[i + 4] -= dt * 14;
          if (this.rainPositions[i + 1] < 0) {
            const resetY = 9.5;
            this.rainPositions[i + 1] = resetY;
            this.rainPositions[i + 4] = resetY - 0.55;
          }
        }
        this.rainLines.geometry.attributes.position.needsUpdate = true;
      }

      // Rising engine smoke
      this.engineSmokeParticles.forEach((puff, idx) => {
        puff.position.y += dt * 0.55;
        puff.position.x += Math.sin(time * 2 + idx) * dt * 0.15;
        if (puff.position.y > 2.6) {
          puff.position.y = 0.85;
        }
      });

      // Update Scene 1 3D humanoid characters
      this.scene1Chowkidar?.update(dt, time, 0);
      this.scene1Rahul?.update(dt, time, 0);
      this.scene1Neha?.update(dt, time, 0);
    } else if (this.activeSceneId === 'scene2') {
      // Dark corridor stalking & jumpscare animation synced to voiceover duration
      if (this.scene2Witch) {
        const isJumpscareLunge = this.sceneElapsed > 7.2;
        const speed = isJumpscareLunge ? 3.2 : 0.45;
        this.scene2Witch.character.update(dt, time, speed);
        const targetZ = Math.min(
          0.15,
          this.scene2Witch.root.position.z + dt * speed,
        );
        this.scene2Witch.root.position.z =
          targetZ >= 0.15
            ? 0.15 + Math.sin(time * 3.2) * 0.08
            : targetZ;

        // Subtle eerie head-tilt & gently swaying clawed arms while stalking down the corridor
        this.scene2Witch.veilMesh.rotation.z = Math.sin(time * 3.6) * 0.08;
        if (isJumpscareLunge) {
          this.scene2Witch.headGroup.rotation.z =
            -0.28 + Math.sin(time * 26) * 0.14;
          this.scene2Witch.leftArm.rotation.x = -1.35 + Math.sin(time * 10) * 0.18;
          this.scene2Witch.rightArm.rotation.x = -1.35 - Math.sin(time * 10) * 0.18;
        }
      }

      if (this.corridorLight) {
        this.corridorLight.intensity = 3.5 + Math.sin(time * 19) * 1.8;
      }

      const shake = this.sceneElapsed > 7.2 ? 0.08 : 0.015;
      this.camera.position.set(
        Math.sin(time * 0.9) * 0.08 + (Math.random() - 0.5) * shake,
        1.52 + Math.cos(time * 1.3) * 0.04 + (Math.random() - 0.5) * shake,
        2.2,
      );
      this.camera.lookAt(0, 1.48, -4);
    } else if (this.activeSceneId === 'scene3') {
      // Climax Scene: Panning camera around ancient dry well with mystical blue & red flames
      const orbitAngle = time * 0.48;
      const radius = 5.4;
      this.camera.position.set(
        Math.cos(orbitAngle) * radius,
        2.4 + Math.sin(time * 0.8) * 0.35,
        Math.sin(orbitAngle) * radius,
      );
      this.camera.lookAt(0, 1.2, 0);

      if (this.blueFlameMesh && this.redFlameMesh) {
        this.blueFlameMesh.rotation.y += dt * 3.0;
        this.blueFlameMesh.scale.set(
          1 + Math.sin(time * 8) * 0.15,
          1.1 + Math.sin(time * 11) * 0.22,
          1 + Math.cos(time * 8) * 0.15,
        );

        this.redFlameMesh.rotation.y -= dt * 2.6;
        this.redFlameMesh.scale.set(
          1 + Math.cos(time * 9) * 0.18,
          1.15 + Math.cos(time * 12) * 0.25,
          1 + Math.sin(time * 9) * 0.18,
        );
      }

      if (this.blueWellLight) {
        this.blueWellLight.intensity = 5.5 + Math.sin(time * 10) * 1.5;
      }

      // Shadowy smoke figures rising & circling around the well
      this.shadowFigures.forEach((fig, idx) => {
        const a = time * 0.75 + (idx * Math.PI * 2) / this.shadowFigures.length;
        const r = 2.3 + Math.sin(time * 1.5 + idx) * 0.35;
        fig.position.set(
          Math.cos(a) * r,
          0.3 + Math.sin(time * 2 + idx) * 0.25,
          Math.sin(a) * r,
        );
        fig.lookAt(0, 1.2, 0);
      });

      // Update Scene 3 Tantrik & Thakur 3D humanoid characters
      this.scene3Tantrik?.update(dt, time, 0);
      this.scene3Thakur?.update(dt, time, 0);
    }
  }
}
