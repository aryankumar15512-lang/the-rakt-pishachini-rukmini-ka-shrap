import * as THREE from 'three';
import * as xb from 'xrblocks';
import {
  CURSED_RELIC_TYPES,
  LanguageCode,
  QUICK_CHAT_MESSAGES,
  STORY_CHAPTERS,
} from './storyData.ts';
import {
  buildRukminiWitchModel,
  buildThakurHaveli,
  createCursedRelics,
  createThrowablePickups,
  HaveliDoor,
  HaveliHidingSpot,
  MansionBuildResult,
  RELIC_ROOM_RESPAWN_SPOTS,
  RelicInstance,
  RelicState,
  ThrowablePickupInstance,
} from './mansionWorld.ts';
import {
  createAarav,
  createChowkidar,
  createDev,
  createFirstPersonArms,
  createKabir,
  createRiya,
  CharacterGLBManager,
  HumanoidCharacter,
} from './characters.ts';
import { HorrorSynth } from './horrorAudio.ts';
import { GeminiClientManager } from './geminiClient.ts';
import {
  attachProximityGlow,
  ProximityGlowHandle,
} from './itemProximityGlow.ts';
import {
  buildGlowingNamedKeyMesh,
  buildRustedIronJailCell,
  JailKeyId,
} from './jailCellsAndKeys.ts';

// Reusable scratch vectors & colors outside per-frame loop (Zero GC)
const _playerWorldPos = new THREE.Vector3();
const _playerLocalPos = new THREE.Vector3();
const _witchToTarget = new THREE.Vector3();
const _forwardDir = new THREE.Vector3();
const _rightDir = new THREE.Vector3();
const _relicPos = new THREE.Vector3();
const _toItemDir = new THREE.Vector3();
const _doorWorldPos = new THREE.Vector3();
const _doorHingeWorldPos = new THREE.Vector3();
const _doorLeafCenterWorldPos = new THREE.Vector3();
const _doorTipWorldPos = new THREE.Vector3();
const _doorClosestPoint = new THREE.Vector3();
const _flashLocalOrigin = new THREE.Vector3();
const _flashLocalDir = new THREE.Vector3();
const _flashlightTipWorldPos = new THREE.Vector3();

const _calmAmbientColor = new THREE.Color(0xffffff);
const _dreadAmbientColor = new THREE.Color(0xffffff);
const _calmHemiSky = new THREE.Color(0xffffff);
const _dreadHemiSky = new THREE.Color(0xffffff);
const _calmFlashlightColor = new THREE.Color(0xfff5d6);
const _dreadFlashlightColor = new THREE.Color(0xfff4e0);
const _targetColor = new THREE.Color();
const _brightSkyColor = new THREE.Color(0x6b82a8);
const _storyNightSkyColor = new THREE.Color(0x0b101d);
const _storyFlashbackSkyColor = new THREE.Color(0x1e1309);
const _storyLightningSkyColor = new THREE.Color(0x1e2e4a);
const _stormLightningTint = new THREE.Color(0xd8ecff);
const _activeStormSkyColor = new THREE.Color(0x0b101d);
const _storyLerpCamPos = new THREE.Vector3();
const _storyLerpLookPos = new THREE.Vector3();
const _dawnPreColor = new THREE.Color(0x4b314e);
const _dawnHorizonColor = new THREE.Color(0xd97c48);
const _dawnGoldColor = new THREE.Color(0xffbe76);
const _dawnLightColor = new THREE.Color(0xffcb88);
const _dawnHemiSkyColor = new THREE.Color(0xffe1b8);
const _dawnHemiGroundColor = new THREE.Color(0x8c7056);
const _dawnActiveSkyColor = new THREE.Color(0x6b82a8);
const _nightHorizonFog = new THREE.FogExp2(0x0b101d, 0.015);

// Exterior spawn: right beside the broken-down SUV on the Kali Ghati forest road (24m Forecourt + Outer Gate at z=34.0)
const EXTERIOR_SPAWN_LOCAL_X = 1.35;
const EXTERIOR_SPAWN_LOCAL_Z = 41.2;
const EXTERIOR_SPAWN_YAW = 0.15;

export type StoryCameraLocation =
  | 'forest_road'
  | 'haveli_gate_friends'
  | 'watchman_gate'
  | 'courtyard_1992'
  | 'ground_corridor'
  | 'dining_hall'
  | 'library_room'
  | 'upper_balcony'
  | 'bridal_room'
  | 'thakur_bedroom'
  | 'basement_tehkhana'
  | 'dry_well_abyss'
  | 'rukmini_stalk';

export type StoryCameraMotion =
  | 'push_in'
  | 'pan_sweep'
  | 'orbit'
  | 'crane_tilt'
  | 'handheld_stalk';

export interface StoryCameraShot {
  mode: 'poster' | 'live3d';
  location: StoryCameraLocation;
  variationIdx: number;
  isFlashback: boolean;
  flashPulse: boolean;
  motionStyle: StoryCameraMotion;
  fov: number;
}

export type EntrySequencePhase =
  | 'exterior_walk'
  | 'guard_dialogue'
  | 'guard_cutscene_key'
  | 'guard_cutscene_well'
  | 'courtyard_approach'
  | 'entering_haveli'
  | 'rukmini_voice'
  | 'blackout_abduction'
  | 'lights_flicker'
  | 'mission_active'
  | 'capture_jumpscare'
  | 'victory_escape_cutscene';

export interface CompanionFriendInstance {
  id: 'kabir' | 'riya' | 'dev';
  nameHi: string;
  char: HumanoidCharacter;
  formationX: number;
  formationZ: number;
  currentSpeed: number;
  isRescuedFollower: boolean;
  rescueOrder: number;
  navPath: THREE.Vector3[];
  navPathIdx: number;
  navTimer: number;
  lastGoalPos: THREE.Vector3;
  stuckTimer: number;
}

export interface TrappedFriendInstance {
  index: number;
  friendId: 'kabir' | 'riya' | 'dev';
  nameHi: string;
  nameEn: string;
  roomLocationHi: string;
  character: HumanoidCharacter;
  cageGroup: THREE.Group;
  gatePivot: THREE.Group;
  padlockGroup: THREE.Group;
  gateOpenAngle: number;
  gateCurrentAngle: number;
  gateTargetAngle: number;
  gateRattleOffset: number;
  requiredKeyId: JailKeyId;
  requiredKeyNameHi: string;
  requiredKeyNameEn: string;
  rescued: boolean;
}

export interface JailKeyInstance {
  id: JailKeyId;
  friendIndex: number;
  nameHi: string;
  nameEn: string;
  purposeHi: string;
  purposeEn: string;
  roomNameHi: string;
  group: THREE.Group;
  basePos: THREE.Vector3;
  collected: boolean;
  used: boolean;
  proximityGlow: ProximityGlowHandle;
}

export interface CarriedInventoryItem {
  id: string;
  icon: string;
  labelHi: string;
  labelEn: string;
  purposeHi: string;
  purposeEn: string;
  kind: 'key' | 'relic';
}

export class RaktPishachiniGame extends xb.Script {
  public lang: LanguageCode = 'hi';
  public playerName = 'Commandant';
  public roomCode = '1992';
  public playerCount = 1;
  public requiredItems = 4;
  public collectedCount = 0;
  public burnedCount = 0;
  public rescuedFriends = 0;
  public readonly totalFriendsToRescue = 3;
  public lives = 3;
  public readonly maxLives = 3;
  public respawnWarningText = '';
  public respawnWarningOpacity = 0;
  private respawnWarningTimer = 0;
  public itemToastTitle = '';
  public itemToastSubtitle = '';
  public itemToastOpacity = 0;
  private itemToastTimer = 0;
  public isWellDoorLockedForRespawn = false;
  public hasWellCourtyardKey = false;
  public watchmanWarned = false;
  public mansionKeyState:
    | 'in_guardhouse'
    | 'carried_courtyard'
    | 'hidden_in_haveli'
    | 'recovered_in_haveli'
    | 'unlocked_escape' = 'in_guardhouse';
  public hasMansionKey = false;
  public blackoutTrapTriggered = false;
  public isHaveliBlackout = false;
  public redLightningFlashOpacity = 0;
  public witchBanished = false;
  public curseBroken = false;
  public entryPhase: EntrySequencePhase = 'exterior_walk';
  public entryBlackoutOpacity = 0;
  public isMiniCutsceneActive = false;
  public entrySubtitleSpeaker = '';
  public entrySubtitleText = '';
  public entrySubtitleRukmini = false;
  public entryCrosshairPrompt = '';
  public taskStatusText =
    'खराब SUV के पास से सभी दोस्तों के साथ लोहे के फाटक की तरफ बढ़ें और चौकीदार बाबा से बात करें (E)!';
  public currentChapter = 0;
  public currentRoomNameHi = 'काली घाटी जंगल सड़क और खराब SUV';
  public currentFloorLevel: -1 | 0 | 1 | 2 = 0;
  public isAimingAtPickable = false;
  public gameState:
    | 'menu'
    | 'story'
    | 'playing'
    | 'paused'
    | 'victory'
    | 'gameover' = 'menu';

  public synth = new HorrorSynth();
  public gemini = new GeminiClientManager();

  // 3D Thakur Haveli Multi-Floor World
  private mansionRoot = new THREE.Group();
  private haveli?: MansionBuildResult;
  private witchModel?: ReturnType<typeof buildRukminiWitchModel>;
  private audioListener?: THREE.AudioListener;
  private payalPositionalAudio?: THREE.PositionalAudio;
  private ambientLight?: THREE.AmbientLight;
  private hemiLight?: THREE.HemisphereLight;
  private moonKeyLight?: THREE.DirectionalLight;
  private oppositeDirLight?: THREE.DirectionalLight;
  private flashlight?: THREE.SpotLight;
  private flashlightTarget = new THREE.Object3D();
  private flashlightLensFlareGroup = new THREE.Group();
  private flashlightFlareCoreMat?: THREE.MeshBasicMaterial;
  private flashlightFlareHaloMat?: THREE.MeshBasicMaterial;
  private cursedAreaProximity = 0;
  private relics: RelicInstance[] = [];
  public carriedThrowables = 0;
  public readonly maxCarriedThrowables = 3;
  private throwables: ThrowablePickupInstance[] = [];
  private activeThrowProjectiles: Array<{
    mesh: THREE.Group;
    kind: 'kulhad' | 'stone';
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    age: number;
  }> = [];
  private shatterEffects: Array<{
    group: THREE.Group;
    shards: Array<{ mesh: THREE.Mesh; vel: THREE.Vector3; floorY: number }>;
    waveRing1: THREE.Mesh;
    waveRing2: THREE.Mesh;
    flashLight: THREE.PointLight | null;
    age: number;
    maxAge: number;
  }> = [];
  private throwCooldown = 0;
  public blessedBhabhutCount = 0;
  private witchStunnedTimer = 0;
  private witchDoorPauseDoor: HaveliDoor | null = null;
  private witchDoorPauseTimer = 0;
  private witchDoorPushFaceYaw = 0;
  private entrySubtitleTimer = 0;
  private redLightningFlashTimer = 0;
  private witchBanishTimer = 0;
  private witchBanishBeamGroup?: THREE.Group;
  private witchBanishBeamLight?: THREE.PointLight;
  private companionTrailYaw = 0;
  private prevCompanionPlayerX = 0;
  private prevCompanionPlayerZ = 42.5;
  private hasPrevCompanionPlayer = false;
  private witchBanishInnerBeam?: THREE.Mesh;
  private witchBanishOuterBeam?: THREE.Mesh;
  private witchBanishShockRing?: THREE.Mesh;
  private witchBanishParticles: Array<{
    mesh: THREE.Mesh;
    angle: number;
    radius: number;
    speedY: number;
    y: number;
  }> = [];
  private finalRagePatrolPoints: THREE.Vector3[] = [];
  private bhabhutBurstEffects: Array<{
    group: THREE.Group;
    particles: Array<{
      mesh: THREE.Mesh;
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      targetOffset: THREE.Vector3;
      launched: boolean;
    }>;
    flashLight: THREE.PointLight | null;
    targetCenter: THREE.Vector3;
    age: number;
    maxAge: number;
  }> = [];
  private chowkidar?: HumanoidCharacter;
  private aaravFriend?: HumanoidCharacter;
  private friends: HumanoidCharacter[] = [];
  private companionFriends: CompanionFriendInstance[] = [];
  public trappedFriends: TrappedFriendInstance[] = [];
  public jailKeys: JailKeyInstance[] = [];
  private friendRescueOrderList: number[] = [];
  private friendWhisperCooldownTimer = 0;
  private wasWitchWithin16m = false;
  private playerArms?: ReturnType<typeof createFirstPersonArms>;
  private playerArmsAdded = false;

  // Step 1-4 Entry Sequence choreography state + Capture Jumpscare & Victory Escape Cutscenes
  private entrySequenceToken = 0;
  private entryAnimElapsed = 0;
  private entryEnterStartLocalX = 0;
  private entryEnterStartLocalZ = 11.2;
  private entryBlackoutElapsed = 0;
  private entryFlickerElapsed = 0;
  private entryCutsceneCamStart = new THREE.Vector3();
  private entryCutsceneCamEnd = new THREE.Vector3();
  private entryCutsceneLookStart = new THREE.Vector3();
  private entryCutsceneLookEnd = new THREE.Vector3();
  private captureJumpscareElapsed = 0;
  private readonly captureJumpscareDuration = 2.5;
  private captureLoseMessage = '';
  private captureCamBaseLocal = new THREE.Vector3();
  private captureCamForward = new THREE.Vector3();
  private victoryCutsceneElapsed = 0;
  private readonly victoryCutsceneDuration = 10.0;
  private victoryCustomMessage = '';
  private dawnSunriseProgress = 0;

  // Multi-floor player state (-4.5 = Basement B1, 0 = Ground Floor / Exterior, +5.0 = Second Floor 2F, +10.0 = Third Floor 3F)
  private playerFloorY = 0.0;
  private playerOutdoors = true;
  private currentRoomId = 'forest_road_jungle';
  public isPlayerCrouching = false;
  private crouchHold = false;
  private crouchToggle = false;
  private crouchEyeOffsetY = 0;
  private mirrorLogCooldownTimer = 0;
  public activeHidingSpot: HaveliHidingSpot | null = null;
  public nearbyHidingSpot: HaveliHidingSpot | null = null;
  public compromisedInHiding = false;
  public currentNoiseDb = 0;
  public hidePeekYawOffset = 0;
  private hideTransitionMode: 'none' | 'entering' | 'hidden' | 'exiting' =
    'none';
  private hideTransitionT = 0;
  private hideTransitionStartPos = new THREE.Vector3();
  private hideTransitionTargetPos = new THREE.Vector3();
  private hideTransitionStartYaw = 0;
  private hideTransitionTargetYaw = 0;

  // Jump & vertical gravity state
  public velocityY = 0;
  public jumpOffsetY = 0;
  public isGrounded = true;
  private readonly gravity = -22;
  private hadPointerLock = false;
  private suppressNextPointerLockPause = false;

  // Witch AI state & doorway pathfinding state (100% blind sound-hunting only)
  private witchTargetPos = new THREE.Vector3(0, 0, -5.8);
  private witchHeardSoundPos = new THREE.Vector3(0, 0, -5.8);
  private witchHuntMode: 'patrol' | 'walk_investigate' | 'fast_chase' =
    'patrol';
  private playerSilenceTimer = 99;
  private loudActionTimer = 0;
  private currentLoudAlertRange = 26.0;
  private isPlayerMakingSound = false;
  private witchPath: THREE.Vector3[] = [];
  private witchPathIdx = 0;
  private witchPathTimer = 0;
  private witchLastGoalPos = new THREE.Vector3(999, 999, 999);
  private witchStuckTimer = 0;
  private witchAlertLevel = 0; // 0 = patrol, 1 = walking toward footsteps (14m), 2 = fast chase (26m)
  private witchSpeed = 1.45;
  private witchDistractionTimer = 0;
  private witchDistractionPos = new THREE.Vector3();
  private patrolWaypointIdx = 0;
  private hitstopTimer = 0;
  private cameraShakeIntensity = 0;
  private lastRukminiProximity = 0;

  // Screen-edge heartbeat vignette pulse state (smoothly escalates from 15m down to 3m inside the Haveli)
  public heartbeatVignetteOpacity = 0;
  public heartbeatVignettePulse = 0;
  public heartbeatRukminiDistance = 999;
  public heartbeatDurationMs = 1540;
  public heartbeatIntensity = 0;
  public heartbeatCycleTick = 0;
  private heartbeatPhase = 0;
  private lastHeartbeatCycleIndex = -1;
  private witchPayalStridePhase = 0;
  private lastWitchPayalStepIndex = -1;

  // First-person 360-degree camera look state (YXZ Euler order)
  public playerYaw = EXTERIOR_SPAWN_YAW;
  public playerPitch = 0;
  public get cameraYaw(): number {
    return this.playerYaw;
  }
  public set cameraYaw(value: number) {
    this.playerYaw = value;
  }
  public get cameraPitch(): number {
    return this.playerPitch;
  }
  public set cameraPitch(value: number) {
    this.playerPitch = value;
  }
  private hasLastMouse = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private isPcMouseDragging = false;
  private pcDragMovedDist = 0;
  public isLocked = false;
  private lookInput = {
    turnLeft: false,
    turnRight: false,
  };

  // Live 3D Hybrid Story Cutscene Camera state
  private activeStoryShot: StoryCameraShot | null = null;
  private storyShotElapsed = 0;
  private storyFlashBoost = 0;
  private storyStartCamLocal = new THREE.Vector3(0, 2.2, 43.0);
  private storyEndCamLocal = new THREE.Vector3(0, 2.0, 37.5);
  private storyStartLookLocal = new THREE.Vector3(0, 2.4, 34.0);
  private storyEndLookLocal = new THREE.Vector3(0, 3.0, 24.0);
  private storyStartFov = 58;
  private storyEndFov = 50;
  private storyDefaultFov = 60;

  // Desktop / Mobile movement input
  public controlsMode: 'auto' | 'pc' | 'mobile' = 'auto';
  public isHudLayoutEditorOpen = false;
  public autoSprintActive = false;
  public cameraSensitivity = 1.0;
  public graphicsQuality: 'low' | 'medium' | 'high' | 'ultra' =
    typeof navigator !== 'undefined' &&
    (/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ||
      (typeof window !== 'undefined' &&
        'ontouchstart' in window &&
        navigator.maxTouchPoints > 0))
      ? 'low'
      : 'high';
  public moveInput = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    joySprint: false,
    joyX: 0,
    joyY: 0,
  };

  public isPlayerSprinting(): boolean {
    return (
      this.moveInput.sprint ||
      this.moveInput.joySprint ||
      this.autoSprintActive
    );
  }

  public setAutoSprint(active: boolean) {
    if (active && (this.gameState !== 'playing' || this.activeHidingSpot)) {
      return;
    }
    if (this.autoSprintActive === active) return;
    this.autoSprintActive = active;
    if (active) {
      this.crouchHold = false;
      this.crouchToggle = false;
    }
    this.onHudUpdate?.();
  }

  public toggleAutoSprint() {
    this.setAutoSprint(!this.autoSprintActive);
  }

  public performPrimaryInteract() {
    if (this.gameState !== 'playing') return;
    if (this.activeHidingSpot) {
      this.exitHidingSpot();
    } else if (this.findLookedAtDoor(false)?.isRoomDoor) {
      this.interactNearestObject();
    } else if (!this.toggleHideInNearestSpot()) {
      this.interactNearestObject();
    }
  }

  public isMobileTouchControlsActive(): boolean {
    if (this.controlsMode === 'mobile') return true;
    if (this.controlsMode === 'pc') return false;
    return (
      document.body.classList.contains('touch-device') ||
      window.matchMedia('(hover: none) and (pointer: coarse)').matches
    );
  }

  public isMobileDevice(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false;
    }
    const isMobile =
      /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) ||
      ('ontouchstart' in window && navigator.maxTouchPoints > 0);
    return isMobile;
  }

  /**
   * Smoothly applies 360-degree yaw & pitch camera rotation deltas.
   * Shared identically between PC Pointer Lock mousemove, Left-Drag fallback, and Mobile right-half touch-drag look.
   */
  public applyCameraLookDelta(dx: number, dy: number, sensitivity = 0.0022) {
    if (this.gameState !== 'playing') return;
    if (this.isHudLayoutEditorOpen || this.isMinimapExpanded) return;
    if (this.isMovementLockedByEntrySequence()) return;
    if (dx === 0 && dy === 0) return;

    const safeBaseSens =
      Number.isFinite(this.cameraSensitivity) && this.cameraSensitivity > 0
        ? this.cameraSensitivity
        : 1.0;
    const effSens = sensitivity * THREE.MathUtils.clamp(safeBaseSens, 0.15, 2.5);
    this.playerYaw -= dx * effSens;
    if (this.activeHidingSpot) {
      const baseYaw = this.activeHidingSpot.lookYaw;
      const relYaw = Math.atan2(
        Math.sin(this.playerYaw - baseYaw),
        Math.cos(this.playerYaw - baseYaw),
      );
      const clampedRelYaw = THREE.MathUtils.clamp(relYaw, -1.15, 1.15);
      this.playerYaw = baseYaw + clampedRelYaw;
      this.playerPitch = THREE.MathUtils.clamp(
        this.playerPitch - dy * effSens,
        -0.55,
        0.55,
      );
    } else {
      this.playerPitch = THREE.MathUtils.clamp(
        this.playerPitch - dy * effSens,
        -1.45,
        1.45,
      );
    }

    const cam = xb.core.camera;
    if (cam) {
      cam.rotation.order = 'YXZ';
      cam.rotation.y = this.playerYaw;
      cam.rotation.x = this.playerPitch;
      cam.rotation.z = 0;
    }
  }

  // Callbacks to sync 2D HUD & 3D Mini-Map
  public isMinimapExpanded = false;
  public onHudUpdate?: () => void;
  public onChatLog?: (msg: string) => void;
  public onGameEnd?: (victory: boolean, message: string) => void;
  public onPauseToggle?: (paused: boolean) => void;
  public onPointerLockChange?: (locked: boolean) => void;
  public onHaveliReady?: (haveli: MansionBuildResult) => void;
  public onMinimapToggle?: (expanded: boolean) => void;
  public onMinimapFrame?: (
    dt: number,
    localX: number,
    localZ: number,
    yaw: number,
    floorLevel: -1 | 0 | 1 | 2,
  ) => void;
  public onFloorChange?: (
    nextFloor: -1 | 0 | 1 | 2,
    prevFloor: -1 | 0 | 1 | 2,
    labelHi: string,
  ) => void;

  public getHaveliWorld(): MansionBuildResult | undefined {
    return this.haveli;
  }

  public toggleMinimapExpanded(forceState?: boolean) {
    const next =
      typeof forceState === 'boolean' ? forceState : !this.isMinimapExpanded;
    if (next === this.isMinimapExpanded) return;
    this.isMinimapExpanded = next;
    this.onMinimapToggle?.(this.isMinimapExpanded);
    this.onHudUpdate?.();
  }

  // Multi-floor patrol waypoints strictly INSIDE the 64m x 56m Royal Palace (22 above-ground rooms + 10-Room Basement B1)
  private readonly witchPatrolPoints: THREE.Vector3[] = [
    new THREE.Vector3(0.0, 0.0, 7.2), // GF Royal Atrium South Entrance
    new THREE.Vector3(-10.5, 0.0, -3.5), // GF Royal Atrium West Colonnade
    new THREE.Vector3(-24.0, 0.0, 0.75), // GF G1: Shahi Shastragar (Armory)
    new THREE.Vector3(-24.0, 0.0, -18.0), // GF G2: Purani Rasoi & Anna-Kothi
    new THREE.Vector3(-24.0, 0.0, -36.75), // GF G5: Mehmaan Baithak
    new THREE.Vector3(0.0, 0.0, -33.0), // GF North Corridor behind Grand Staircase
    new THREE.Vector3(24.0, 0.0, -36.75), // GF G6: Sevak Kaksh
    new THREE.Vector3(24.0, 0.0, -18.0), // GF G4: Prachin Pooja Ghar
    new THREE.Vector3(24.0, 0.0, 0.75), // GF G3: Munim Record Room
    new THREE.Vector3(0.0, 5.0, 4.5), // 2F South Jharokha Balcony overlooking Atrium
    new THREE.Vector3(-8.5, 5.0, 7.9), // 2F-7: Guest Suite 2
    new THREE.Vector3(8.5, 5.0, 7.9), // 2F-8: Ancestor Portrait Gallery
    new THREE.Vector3(24.0, 5.0, 0.75), // 2F-1: Rukmini's Suhaagraat Bridal Room
    new THREE.Vector3(24.0, 5.0, -18.0), // 2F-5: Rani's Shringar Kaksh
    new THREE.Vector3(24.0, 5.0, -36.75), // 2F-3: Guest Suite 1
    new THREE.Vector3(-24.0, 5.0, 0.75), // 2F-2: Thakur Saheb's Master Bedroom
    new THREE.Vector3(-24.0, 5.0, -18.0), // 2F-6: Royal Dining Room
    new THREE.Vector3(-24.0, 5.0, -36.75), // 2F-4: Sangeet Hall
    new THREE.Vector3(0.0, 10.0, 4.5), // 3F South Skywell Balcony overlooking Atrium
    new THREE.Vector3(-8.5, 10.0, 7.9), // 3F-7: Attic Store 2
    new THREE.Vector3(8.5, 10.0, 7.9), // 3F-8: Front Watchtower Room
    new THREE.Vector3(-24.0, 10.0, 0.75), // 3F-1: Tantrik Granth Library
    new THREE.Vector3(-24.0, 10.0, -18.0), // 3F-5: Jyotish / Astrology Room
    new THREE.Vector3(-24.0, 10.0, -36.75), // 3F-3: Attic Store 1
    new THREE.Vector3(24.0, 10.0, 0.75), // 3F-2: Aaina Mahal
    new THREE.Vector3(24.0, 10.0, -18.0), // 3F-6: Old Doll / Toy Room
    new THREE.Vector3(24.0, 10.0, -36.75), // 3F-4: Barsati Terrace Room
    new THREE.Vector3(0.0, -4.5, -54.0), // Basement Central Maze Crossroads
    new THREE.Vector3(-8.0, -4.5, -47.0), // Basement U1: Dungeon Cell 1 (Dev)
    new THREE.Vector3(-22.5, -4.5, -47.0), // Basement U2: Dungeon Cell 2
    new THREE.Vector3(8.2, -4.5, -48.5), // Basement U3: Tantrik Ritual Room
    new THREE.Vector3(20.5, -4.5, -61.0), // Basement U4: Secret Gold Vault
    new THREE.Vector3(22.5, -4.5, -47.0), // Basement U5: Old Oil & Grain Cellar
    new THREE.Vector3(-20.0, -4.5, -58.8), // Basement U6: Chain & Torture Chamber
    new THREE.Vector3(-4.5, -4.5, -61.0), // Basement U7: Underground Well Shaft Room
    new THREE.Vector3(-11.0, -4.5, -68.0), // Basement North-West T-Junction
    new THREE.Vector3(-18.5, -4.5, -75.0), // Basement U8: Broken Idols Room
    new THREE.Vector3(-4.5, -4.5, -74.5), // Basement U9: Collapsed Tunnel Chamber
    new THREE.Vector3(9.0, -4.5, -74.5), // Basement U10: Ancient Crypt
    new THREE.Vector3(11.0, -4.5, -68.0), // Basement North-East T-Junction
  ];

  private formatRoomNameForHud(rawNameHi: string): string {
    return rawNameHi
      .replace(/^(?:G[1-6]|2F-[1-8]|3F-[1-8]|U(?:10|[1-9])):\s*/u, '')
      .replace(/\s*—\s*(?:देव|कबीर|रिया)\s*कैद/gu, '')
      .replace(/\s*\([^)]*\)/g, '')
      .trim();
  }

  public getCurrentFloorLabelHi(): string {
    const cleanRoom = this.formatRoomNameForHud(this.currentRoomNameHi);
    const isExteriorZone =
      this.currentRoomId === 'forest_road_jungle' ||
      this.currentRoomId === 'courtyard_front' ||
      this.currentRoomId === 'haveli_west_yard' ||
      this.currentRoomId === 'haveli_east_yard' ||
      this.currentRoomId === 'courtyard_well';

    let floorPrefix = '🏛️ मंजिल: भूतल (G)';
    if (isExteriorZone && this.currentFloorLevel === 0) {
      floorPrefix = '🌲 मंजिल: बाहर परिसर (G)';
    } else if (this.currentFloorLevel === -1) {
      floorPrefix = '🏚️ मंजिल: तहख़ाना (-1)';
    } else if (this.currentFloorLevel === 1) {
      floorPrefix = '🪵 मंजिल: दूसरी मंजिल (2F)';
    } else if (this.currentFloorLevel === 2) {
      floorPrefix = '🕯️ मंजिल: तीसरी मंजिल (3F)';
    }

    return cleanRoom ? `${floorPrefix} — ${cleanRoom}` : floorPrefix;
  }

  private resolveFloorLevel(roomFloorLevel: -1 | 0 | 1 | 2): -1 | 0 | 1 | 2 {
    if (this.playerFloorY <= -1.8) return -1;
    if (this.playerFloorY >= 7.5) return 2;
    if (this.playerFloorY >= 2.5) return 1;
    return roomFloorLevel;
  }

  /**
   * Returns true only when the given local (x, z, y) coordinates are inside the 64m x 56m Royal Palace walls
   * (including the 10-room Underground Basement Tehkhana and the enclosed Backyard Well Courtyard).
   * Rukmini must NOT hunt or catch the player while the player is outside in the 24m Forecourt, garden, or forest road.
   */
  public isPositionInsideHaveli(
    localX: number,
    localZ: number,
    localY = this.playerFloorY,
  ): boolean {
    if (localY < -0.5) {
      return (
        localX >= -28.8 &&
        localX <= 28.8 &&
        localZ >= -80.8 &&
        localZ <= -33.0
      );
    }
    const insideMainBuilding =
      localX >= -32.2 &&
      localX <= 32.2 &&
      localZ >= -46.2 &&
      localZ <= 10.2;
    const insideEnclosedBackWellCourtyard =
      localX >= -18.2 &&
      localX <= 18.2 &&
      localZ >= -76.2 &&
      localZ <= -46.0;
    return insideMainBuilding || insideEnclosedBackWellCourtyard;
  }

  /**
   * Zone-aware floor height & camera eye height clamp:
   * - Underground Basement (B1): floor y = -4.5, eye height = -2.75 (clamped <= -0.65 below basement ceiling)
   * - Ground Floor (GF): floor y = 0.0, eye height = 1.75
   * - Second Floor (2F): floor y = +5.0, eye height = 6.75
   * - Third Floor (3F): floor y = +10.0, eye height = 11.75
   */
  private applyZoneAwareFloorAndCameraHeight(
    cam: THREE.Camera,
    localX: number,
    localZ: number,
  ) {
    const inBasementOrStairs =
      (this.playerFloorY <= 1.2 &&
        localX >= 6.6 &&
        localX <= 10.4 &&
        localZ >= -42.2 &&
        localZ <= -33.5) ||
      (this.playerFloorY < -0.55 &&
        localX >= 2.5 &&
        localX <= 10.6 &&
        localZ >= -44.6 &&
        localZ <= -40.0) ||
      (this.playerFloorY < -0.95 &&
        localX >= -28.8 &&
        localX <= 28.8 &&
        localZ >= -80.8 &&
        localZ <= -41.2);

    const minAllowedFloorY = inBasementOrStairs ? -4.5 : 0.0;
    this.playerFloorY = THREE.MathUtils.clamp(
      this.playerFloorY,
      minAllowedFloorY,
      10.0,
    );

    this.mansionRoot.position.y = 0;
    const hideEyeAdj = this.activeHidingSpot?.hideEyeOffsetY
      ? this.activeHidingSpot.hideEyeOffsetY *
        (this.hideTransitionMode === 'entering'
          ? this.hideTransitionT
          : 1)
      : 0;
    const rawEyeY =
      this.playerFloorY +
      1.7 +
      this.jumpOffsetY +
      this.crouchEyeOffsetY +
      hideEyeAdj;
    const inBasementChamber =
      this.playerFloorY < -1.1 &&
      localX >= -28.8 &&
      localX <= 28.8 &&
      localZ >= -80.8 &&
      localZ <= -41.2;

    cam.position.y = inBasementChamber
      ? THREE.MathUtils.clamp(rawEyeY, -4.0, -0.65)
      : Math.max(-4.0, rawEyeY);
  }

  init() {
    this.setupLightingAndEnvironment();
    this.clearSimulatorDaytimeSkybox();
    this.buildThakurMansion();
    if (this.isMobileDevice()) {
      this.applyMobileGlobalSceneCleanup();
    }
    this.setupKeyboardInput();
  }

  onSimulatorStarted() {
    this.clearSimulatorDaytimeSkybox();
  }

  /**
   * Removes XR Blocks' default simulator background mesh and ensures zero fog
   * so the entire 3D game is completely bright and clearly visible everywhere.
   */
  private clearSimulatorDaytimeSkybox() {
    const sim = (
      xb.core as unknown as {
        simulator?: {
          simulatorScene?: THREE.Scene & { clearEnvironment?: () => void };
        };
      }
    ).simulator;
    const simScene = sim?.simulatorScene;
    if (simScene) {
      if (typeof simScene.clearEnvironment === 'function') {
        simScene.clearEnvironment();
      }
      const isDawnScene =
        this.entryPhase === 'victory_escape_cutscene' ||
        this.gameState === 'victory';
      simScene.background =
        this.gameState === 'story'
          ? this.activeStoryShot?.isFlashback
            ? _storyFlashbackSkyColor
            : _storyNightSkyColor
          : isDawnScene
            ? _dawnActiveSkyColor
            : _storyNightSkyColor;
      simScene.fog = null;
      simScene.environment = null;
      for (const child of simScene.children) {
        if (!(child as THREE.Light).isLight) {
          child.visible = false;
        }
      }
    }
  }

  private setupLightingAndEnvironment() {
    const renderer = xb.core.renderer;
    const scene = xb.core.scene;
    const isMobile = this.isMobileDevice();
    const isSmoothOrMobile = this.graphicsQuality === 'low' || isMobile;

    if (renderer instanceof THREE.WebGLRenderer && scene) {
      const clampedBright = Math.max(
        80,
        Math.min(130, Math.round(this.brightnessPercent)),
      );
      this.brightnessPercent = clampedBright;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = isMobile
        ? THREE.NoToneMapping
        : THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = isMobile
        ? 1.0
        : Math.min(1.1, Math.max(0.8, clampedBright / 100));
      renderer.setClearColor(0x0b101d, 1);
      renderer.autoClear = true;
      renderer.autoClearColor = true;
      if (isMobile) {
        (renderer.capabilities as { precision?: string }).precision = 'mediump';
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.shadowMap.enabled = false;
      } else if (isSmoothOrMobile) {
        renderer.setPixelRatio(1);
        renderer.shadowMap.enabled = false;
      } else {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.shadowMap.enabled = this.shadowsEnabled;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
      if (renderer.domElement) {
        renderer.domElement.style.backgroundColor = '#0b101d';
        renderer.domElement.style.filter =
          clampedBright === 100 ? 'none' : `brightness(${clampedBright}%)`;
      }
      scene.environment = null;

      // Remove any unexpected default Three.js lights added to scene so mobile keeps clean 3-light setup
      if (isMobile) {
        for (let i = scene.children.length - 1; i >= 0; i--) {
          if ((scene.children[i] as THREE.Light).isLight) {
            scene.remove(scene.children[i]);
          }
        }
      }

      // Guard renderer.render against lost WebGL contexts, XR Blocks simulatorScene overwrite,
      // and WebGLDirectCompositor clearing issues so gameplay ALWAYS renders onto #0b101d dark night background
      const guardedRenderer = renderer as THREE.WebGLRenderer & {
        __raktRenderGuarded?: boolean;
      };
      if (!guardedRenderer.__raktRenderGuarded) {
        guardedRenderer.__raktRenderGuarded = true;
        const origRender = renderer.render.bind(renderer);
        let contextLost = false;
        let contextLostTimer: number | null = null;
        renderer.domElement?.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          contextLost = true;
          if (contextLostTimer !== null) {
            window.clearTimeout(contextLostTimer);
          }
          contextLostTimer = window.setTimeout(() => {
            contextLostTimer = null;
            if (contextLost && this.gameState === 'playing') {
              this.onWebGLContextError?.(
                'WebGL context lost during 3D gameplay (mobile GPU memory or shader limit).',
              );
            }
          }, 1200);
        });
        renderer.domElement?.addEventListener('webglcontextrestored', () => {
          contextLost = false;
          if (contextLostTimer !== null) {
            window.clearTimeout(contextLostTimer);
            contextLostTimer = null;
          }
          const mobileNow = this.isMobileDevice();
          renderer.setClearColor(0x0b101d, 1);
          renderer.toneMapping = mobileNow
            ? THREE.NoToneMapping
            : THREE.ACESFilmicToneMapping;
          renderer.toneMappingExposure = mobileNow
            ? 1.0
            : Math.min(1.1, Math.max(0.8, this.brightnessPercent / 100));
          this.applyGraphicsSettings(
            this.graphicsQuality,
            this.targetFps,
            this.shadowsEnabled,
          );
        });
        renderer.render = ((renderScene: THREE.Object3D, renderCamera: THREE.Camera) => {
          if (contextLost || renderer.getContext().isContextLost()) {
            return;
          }
          if (this.gameState === 'menu' && !this.activeStoryShot) {
            return;
          }
          if (
            this.gameState === 'playing' &&
            !renderer.xr.isPresenting &&
            xb.core.scene &&
            renderScene !== xb.core.scene
          ) {
            // Skip XR Blocks daytime simulator room pass during active 3D gameplay
            return;
          }
          if (renderScene === xb.core.scene) {
            this.lastMainSceneRenderTick = this.currentUpdateTick;
            if (this.gameState === 'playing') {
              renderer.setClearColor(0x0b101d, 1);
              renderer.autoClear = true;
              renderer.autoClearColor = true;
              renderer.autoClearDepth = true;
            }
          }
          origRender(renderScene, renderCamera);
        }) as typeof renderer.render;
      }
    }

    // Light night fog so SUV, road, gate, and Thakur Haveli are crisp and clear (#0b101d, 0.009 on mobile, 0.015 on PC)
    if (scene) {
      scene.background = _storyNightSkyColor;
      _nightHorizonFog.color.setHex(0x0b101d);
      _nightHorizonFog.density = isMobile ? 0.009 : 0.015;
      scene.fog = _nightHorizonFog;
    }

    // On mobile: keep ONLY 1 AmbientLight(0x556688, 1.2), 1 DirectionalLight(0x99bbff, 0.9), and 1 playerFlashlight SpotLight = 3 lights max!
    // On PC desktop: keep existing PC lighting 100% unchanged.
    if (isMobile) {
      this.ambientLight = new THREE.AmbientLight(0x556688, 1.2);
      this.add(this.ambientLight);
      this.hemiLight = undefined;

      this.moonKeyLight = new THREE.DirectionalLight(0x99bbff, 0.9);
      this.moonKeyLight.position.set(-22, 38, -42);
      this.moonKeyLight.castShadow = false;
      this.add(this.moonKeyLight);

      this.oppositeDirLight = undefined;
    } else {
      this.ambientLight = new THREE.AmbientLight(0x4a5d82, 1.1);
      this.add(this.ambientLight);

      this.hemiLight = new THREE.HemisphereLight(0x6b82b8, 0x222833, 0.9);
      this.hemiLight.position.set(0, 35, 0);
      this.add(this.hemiLight);

      this.moonKeyLight = new THREE.DirectionalLight(0xaac4ff, 1.0);
      this.moonKeyLight.position.set(-22, 38, -42);
      this.moonKeyLight.castShadow = !isSmoothOrMobile && this.shadowsEnabled;
      this.moonKeyLight.shadow.mapSize.set(1024, 1024);
      this.moonKeyLight.shadow.bias = -0.0005;
      this.moonKeyLight.shadow.normalBias = 0.02;
      this.add(this.moonKeyLight);

      this.oppositeDirLight = new THREE.DirectionalLight(0x8ca4c8, 0.55);
      this.oppositeDirLight.position.set(18, 28, 26);
      this.oppositeDirLight.visible = !isSmoothOrMobile;
      this.add(this.oppositeDirLight);
    }

    // Ensure camera is in scene (so children attached to camera render even before simulator starts)
    const cam = xb.core.camera as THREE.PerspectiveCamera | undefined;
    if (cam) {
      if (scene && !cam.parent) {
        scene.add(cam);
      }
      cam.rotation.order = 'YXZ';
      let projDirty = false;
      const targetNear = isMobile ? 0.25 : 0.1;
      if (cam.near !== targetNear) {
        cam.near = targetNear;
        projDirty = true;
      }
      const targetFar = isMobile ? 70 : isSmoothOrMobile ? 95 : 280;
      if (cam.far !== targetFar) {
        cam.far = targetFar;
        projDirty = true;
      }
      if (projDirty) {
        cam.updateProjectionMatrix();
      }
    }

    // Player SpotLight(0xfff5d6, 3.5, 45, Math.PI / 4, 0.4) attached to camera
    this.flashlight = new THREE.SpotLight(
      0xfff5d6,
      3.5,
      45,
      Math.PI / 4,
      0.4,
      0.15,
    );
    this.flashlight.castShadow = !isSmoothOrMobile && this.shadowsEnabled;
    if (!isMobile) {
      this.flashlight.shadow.mapSize.set(1024, 1024);
      this.flashlight.shadow.camera.near = 0.25;
      this.flashlight.shadow.camera.far = 45;
      this.flashlight.shadow.bias = -0.0004;
      this.flashlight.shadow.normalBias = 0.02;
    }
    this.flashlight.position.set(0.16, -0.14, -0.22);
    this.flashlightTarget.position.set(0, -0.06, -18);
    if (cam) {
      cam.add(this.flashlight);
      cam.add(this.flashlightTarget);
    } else {
      this.add(this.flashlight);
      this.add(this.flashlightTarget);
    }
    this.flashlight.target = this.flashlightTarget;
    this.syncViewportSize();
  }

  public difficulty: 'easy' | 'normal' | 'nightmare' = 'normal';

  public setDifficulty(diff: 'easy' | 'normal' | 'nightmare') {
    this.difficulty = diff;
  }

  /**
   * Returns Rukmini's difficulty speed multiplier based on selected lobby difficulty
   * and how many cursed relics are burned:
   * - 0/4: 1.0x, 1/4: 1.1x, 2/4: 1.2x, 3/4: 1.3x
   * - Scaled by Difficulty: EASY (0.78x), NORMAL (1.0x), NIGHTMARE (1.24x)
   */
  public getWitchSpeedMultiplier(): number {
    const diffMul =
      this.difficulty === 'easy'
        ? 0.78
        : this.difficulty === 'nightmare'
          ? 1.24
          : 1.0;
    let stageMul = 1.0;
    if (this.burnedCount >= 3) stageMul = 1.3;
    else if (this.burnedCount === 2) stageMul = 1.2;
    else if (this.burnedCount === 1) stageMul = 1.1;
    return stageMul * diffMul;
  }

  /**
   * Triggers a dramatic Haveli-wide crimson lightning flash across lights and screen overlay.
   */
  public triggerHaveliRedLightningFlash(duration = 1.5) {
    this.redLightningFlashTimer = Math.max(this.redLightningFlashTimer, duration);
    this.redLightningFlashOpacity = 0.85;
    this.haveli?.triggerRedLightningFlash(duration);
  }

  /**
   * Applies Stage 1–4 rage visuals, speed scaling, crimson eye glow, patrol routes, and Stage 4 banishment.
   */
  private applyWitchRageProgression(silentRestore = false) {
    // Stage 1+: Red blood handprints appear on corridor walls
    this.haveli?.setBloodHandprintsVisible(this.burnedCount >= 1);

    // Stage 3+ (Final Rage): Bright crimson glowing eyes + courtyard & remaining-rooms patrol
    const isFinalRage = this.burnedCount >= 3 && !this.witchBanished;
    if (this.witchModel) {
      const eyeIntensity = isFinalRage ? 8.8 : 3.4;
      const eyeScale = isFinalRage ? 1.55 : 1.0;
      const eyeColor = isFinalRage ? 0xff0022 : 0xff1111;
      for (const eye of [this.witchModel.leftEye, this.witchModel.rightEye]) {
        if (!eye) continue;
        eye.scale.setScalar(eyeScale);
        const mat = eye.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.color.setHex(eyeColor);
          mat.emissive.setHex(eyeColor);
          mat.emissiveIntensity = eyeIntensity;
        }
      }
      if (this.witchModel.eyeCrimsonLight) {
        this.witchModel.eyeCrimsonLight.intensity = isFinalRage ? 3.2 : 0.0;
      }
    }

    if (this.burnedCount >= 3) {
      this.rebuildFinalRagePatrolPoints();
    }

    // Stage 4: Curse breaks, Witch Rukmini is banished in a beam of red light, Main Haveli Door unlocks
    if (this.burnedCount >= this.requiredItems) {
      this.curseBroken = true;
      if (silentRestore) {
        this.witchBanished = true;
        this.witchBanishTimer = 0;
        if (this.witchModel) {
          this.witchModel.root.visible = false;
          if (this.witchModel.eyeCrimsonLight) {
            this.witchModel.eyeCrimsonLight.intensity = 0;
          }
        }
        this.unlockMainHaveliDoorForEscape(true);
      } else if (!this.witchBanished) {
        this.triggerWitchBanishmentSequence();
      }
    }
  }

  /**
   * Builds dynamic Final Rage (3/4) patrol waypoints focusing on the courtyard and remaining uncollected/unrescued rooms.
   */
  private rebuildFinalRagePatrolPoints() {
    const pts: THREE.Vector3[] = [
      new THREE.Vector3(0.0, 0.0, 6.5), // Royal Atrium South Carpet
      new THREE.Vector3(-8.5, 0.0, -4.0), // Royal Atrium West Colonnade
      new THREE.Vector3(8.5, 0.0, -4.0), // Royal Atrium East Colonnade
      new THREE.Vector3(0.0, 0.0, -40.0), // North Rear Corridor / Back Well Approach
    ];

    for (const relic of this.relics) {
      if (!relic.collected) {
        pts.push(
          new THREE.Vector3(
            relic.basePos.x,
            relic.basePos.y >= 7.5
              ? 10.0
              : relic.basePos.y >= 2.5
                ? 5.0
                : relic.basePos.y < -1.8
                  ? -4.5
                  : 0.0,
            relic.basePos.z,
          ),
        );
      }
    }
    for (const tf of this.trappedFriends) {
      if (!tf.rescued) {
        const fy = tf.character.root.position.y;
        pts.push(
          new THREE.Vector3(
            tf.character.root.position.x,
            fy >= 7.5 ? 10.0 : fy >= 2.5 ? 5.0 : fy < -1.8 ? -4.5 : 0.0,
            tf.character.root.position.z,
          ),
        );
      }
    }

    this.finalRagePatrolPoints = pts;
    this.patrolWaypointIdx = 0;
  }

  private getActivePatrolWaypoints(): THREE.Vector3[] {
    if (this.burnedCount >= 3 && this.finalRagePatrolPoints.length > 0) {
      return this.finalRagePatrolPoints;
    }
    return this.witchPatrolPoints;
  }

  public hasJailKey(keyId: JailKeyId): boolean {
    const jk = this.jailKeys.find((k) => k.id === keyId);
    return Boolean(jk && jk.collected && !jk.used);
  }

  public hasRecoveredMainExitKey(): boolean {
    return (
      this.hasMansionKey &&
      (this.mansionKeyState === 'recovered_in_haveli' ||
        this.mansionKeyState === 'unlocked_escape')
    );
  }

  private hasAnyCarriedKey(): boolean {
    return (
      this.hasMansionKey ||
      this.hasWellCourtyardKey ||
      this.jailKeys.some((k) => k.collected && !k.used)
    );
  }

  public triggerItemToast(title: string, subtitle: string, durationSec = 3.6) {
    this.itemToastTitle = title;
    this.itemToastSubtitle = subtitle;
    this.itemToastTimer = durationSec;
    this.itemToastOpacity = 1.0;
    this.onHudUpdate?.();
  }

  /**
   * Returns all currently carried Keys & unburned Cursed Relics with exact Hindi + English names
   * and purposes for the compact HUD inventory strip & tooltips.
   */
  public getCarriedInventoryItems(): CarriedInventoryItem[] {
    const items: CarriedInventoryItem[] = [];

    if (this.hasMansionKey && this.mansionKeyState === 'carried_courtyard') {
      items.push({
        id: 'entrance_key',
        icon: '🔑',
        labelHi: 'हवेली प्रवेश चाबी (Entrance Key)',
        labelEn: 'Haveli Entrance Key (हवेली प्रवेश चाबी)',
        purposeHi: 'हवेली के मुख्य दरवाज़े से प्रवेश करने के लिए',
        purposeEn: 'Unlocks Main Haveli Door to enter',
        kind: 'key',
      });
    }

    if (this.hasWellCourtyardKey && this.isWellDoorLockedForRespawn) {
      items.push({
        id: 'well_courtyard_key',
        icon: '🔑',
        labelHi: 'कुएं के आंगन की चाबी (Well Courtyard Key)',
        labelEn: 'Well Courtyard Key (कुएं के आंगन की चाबी)',
        purposeHi: 'कुएं के आंगन का बंद दरवाज़ा खोलने के लिए',
        purposeEn: 'Unlocks locked Well Courtyard door',
        kind: 'key',
      });
    }

    for (const jk of this.jailKeys) {
      if (jk.collected && !jk.used) {
        items.push({
          id: jk.id,
          icon: '🔑',
          labelHi: `${jk.nameHi} (${jk.nameEn})`,
          labelEn: `${jk.nameEn} (${jk.nameHi})`,
          purposeHi: jk.purposeHi,
          purposeEn: jk.purposeEn,
          kind: 'key',
        });
      }
    }

    if (this.hasRecoveredMainExitKey()) {
      items.push({
        id: 'main_exit_door_key',
        icon: '🗝️',
        labelHi: 'हवेली मुख्य द्वार चाबी (Main Exit Door Key)',
        labelEn: 'Main Exit Door Key (हवेली मुख्य द्वार चाबी)',
        purposeHi: 'मुख्य दरवाज़ा खोलकर हवेली से भागने के लिए',
        purposeEn: 'Unlocks Main Front Exit Door to escape',
        kind: 'key',
      });
    }

    for (const r of this.relics) {
      if (r.state === 'carried') {
        items.push({
          id: `relic_${r.index}`,
          icon: '🔥',
          labelHi: `${r.hindiName}`,
          labelEn: `${r.name} (${r.hindiName})`,
          purposeHi: 'आँगन के शापित कुएँ में जलाने के लिए',
          purposeEn: 'Burn in the Cursed Courtyard Well',
          kind: 'relic',
        });
      }
    }

    return items;
  }

  private unlockMainHaveliDoorForEscape(silent = false) {
    if (!this.haveli) return;
    const mainDoor = this.haveli.doors.find(
      (d) => d.id === 'door_main_entrance',
    );
    const hasExitKey = this.hasRecoveredMainExitKey();
    const allFriendsFree = this.rescuedFriends >= this.totalFriendsToRescue;
    const allRelicsDone =
      this.curseBroken || this.burnedCount >= this.requiredItems;
    const readyToLeave = allFriendsFree && allRelicsDone && hasExitKey;

    if (mainDoor) {
      mainDoor.lockedUntilRelics = 0;
      // Keep the Main Front Door strictly closed until the player has ALSO recovered the Main Exit Door Key!
      mainDoor.isOpen = readyToLeave;
      mainDoor.targetAngle = readyToLeave ? mainDoor.openAngle : 0;
      if (silent) {
        mainDoor.currentAngle = mainDoor.targetAngle;
        mainDoor.pivot.rotation.y = mainDoor.targetAngle;
      }
    }
    if (readyToLeave) {
      this.mansionKeyState = 'unlocked_escape';
      this.playerArms?.setHoldingKey(true);
      if (!silent) {
        this.synth.playDoorCreak();
      }
    }
  }

  private clearWitchBanishmentBeam() {
    if (this.witchBanishBeamGroup) {
      this.mansionRoot.remove(this.witchBanishBeamGroup);
      this.witchBanishBeamGroup = undefined;
    }
    this.witchBanishBeamLight = undefined;
    this.witchBanishInnerBeam = undefined;
    this.witchBanishOuterBeam = undefined;
    this.witchBanishShockRing = undefined;
    this.witchBanishParticles = [];
    this.witchBanishTimer = 0;
  }

  /**
   * Stage 4 (4/4 Burned): Breaks the curse, engulfs Witch Rukmini in a skyward beam of red light,
   * banishes her from the Haveli, and unlocks the Main Haveli Door for escape.
   */
  private triggerWitchBanishmentSequence() {
    this.witchBanished = true;
    this.curseBroken = true;
    this.witchSpeed = 0;
    this.witchAlertLevel = 0;
    this.witchHuntMode = 'patrol';
    this.witchStunnedTimer = 0;
    this.witchDistractionTimer = 0;
    this.witchPath = [];
    this.compromisedInHiding = false;
    this.heartbeatIntensity = 0;
    this.heartbeatVignetteOpacity = 0;
    this.synth.stopPanickedBreathing(false);

    this.unlockMainHaveliDoorForEscape(false);
    this.clearWitchBanishmentBeam();

    if (this.witchModel) {
      if (this.witchModel.eyeCrimsonLight) {
        this.witchModel.eyeCrimsonLight.intensity = 0;
      }
      const beamGroup = new THREE.Group();
      beamGroup.position.copy(this.witchModel.root.position);

      const innerMat = new THREE.MeshBasicMaterial({
        color: 0xff2233,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const outerMat = new THREE.MeshBasicMaterial({
        color: 0xcc0018,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xff4d4d,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const innerBeam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.72, 16.0, 24, 1, true),
        innerMat,
      );
      innerBeam.position.y = 8.0;
      const outerBeam = new THREE.Mesh(
        new THREE.CylinderGeometry(1.05, 1.45, 16.0, 24, 1, true),
        outerMat,
      );
      outerBeam.position.y = 8.0;

      const shockRing = new THREE.Mesh(
        new THREE.RingGeometry(0.6, 1.15, 32),
        ringMat,
      );
      shockRing.rotation.x = -Math.PI / 2;
      shockRing.position.y = 0.08;

      let beamLight: THREE.PointLight | undefined;
      if (!this.isMobileDevice()) {
        beamLight = new THREE.PointLight(0xff1122, 11.0, 24, 1.2);
        beamLight.position.set(0, 2.2, 0);
        beamGroup.add(beamLight);
      }

      beamGroup.add(innerBeam, outerBeam, shockRing);

      const emberGeo = new THREE.OctahedronGeometry(0.06, 0);
      const emberMat = new THREE.MeshBasicMaterial({
        color: 0xff5533,
        transparent: true,
        opacity: 0.95,
      });
      const particles: typeof this.witchBanishParticles = [];
      for (let i = 0; i < 28; i++) {
        const angle = (i / 28) * Math.PI * 2;
        const radius = 0.35 + Math.random() * 0.85;
        const y = Math.random() * 2.4;
        const mesh = new THREE.Mesh(emberGeo, emberMat);
        mesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
        beamGroup.add(mesh);
        particles.push({
          mesh,
          angle,
          radius,
          speedY: 2.8 + Math.random() * 3.6,
          y,
        });
      }

      this.mansionRoot.add(beamGroup);
      this.witchBanishBeamGroup = beamGroup;
      this.witchBanishBeamLight = beamLight;
      this.witchBanishInnerBeam = innerBeam;
      this.witchBanishOuterBeam = outerBeam;
      this.witchBanishShockRing = shockRing;
      this.witchBanishParticles = particles;
      this.witchBanishTimer = 2.6;
    }

    this.cameraShakeIntensity = Math.max(this.cameraShakeIntensity, 0.35);
    this.updateEscapeTaskStatus();
    this.onHudUpdate?.();
  }

  /**
   * Locks camera onto a terrifying 2.5-second close-up of Witch Rukmini lunging at the viewer
   * with camera shake, red screen flash, and her echoing Hindi line before Game Over.
   */
  private startWitchCaptureJumpscare(loseMsg: string) {
    if (
      this.entryPhase === 'capture_jumpscare' ||
      this.entryPhase === 'victory_escape_cutscene' ||
      this.gameState !== 'playing'
    ) {
      return;
    }
    this.entrySequenceToken++;
    if (this.activeHidingSpot) {
      this.activeHidingSpot.isOccupied = false;
      this.activeHidingSpot = null;
    }
    this.compromisedInHiding = false;
    this.clearMoveInputs();
    this.isPlayerCrouching = false;
    this.crouchHold = false;
    this.crouchToggle = false;
    this.crouchEyeOffsetY = 0;
    this.velocityY = 0;
    this.jumpOffsetY = 0;
    this.isGrounded = true;
    this.isPlayerMakingSound = false;
    this.currentNoiseDb = 0;
    this.nearbyHidingSpot = null;
    if (this.playerArms) {
      this.playerArms.group.visible = false;
    }

    const cam = xb.core.camera as THREE.PerspectiveCamera | undefined;
    if (cam) {
      if (this.storyDefaultFov <= 0) {
        this.storyDefaultFov = cam.fov || 60;
      }
      cam.getWorldPosition(_playerWorldPos);
      this.captureCamBaseLocal.set(
        _playerWorldPos.x - this.mansionRoot.position.x,
        _playerWorldPos.y - this.mansionRoot.position.y,
        _playerWorldPos.z - this.mansionRoot.position.z,
      );
      this.captureCamForward
        .set(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw))
        .normalize();
    } else {
      this.captureCamBaseLocal.set(0, 1.75, 0);
      this.captureCamForward.set(0, 0, -1);
    }

    if (this.witchModel) {
      this.witchModel.root.visible = true;
      this.witchModel.root.scale.setScalar(1.0);
    }

    this.entryPhase = 'capture_jumpscare';
    this.captureJumpscareElapsed = 0;
    this.captureLoseMessage = loseMsg;
    this.cameraShakeIntensity = 0.72;
    this.redLightningFlashOpacity = 0.92;
    this.heartbeatIntensity = 1.0;
    this.heartbeatVignetteOpacity = 0.92;

    this.entrySubtitleRukmini = true;
    this.entrySubtitleSpeaker = 'रक्त-पिशाचिनी रुक्मिणी (Witch Rukmini)';
    this.entrySubtitleText = 'तेरी रूह अब इस हवेली की गुलाम है!';
    this.entrySubtitleTimer = this.captureJumpscareDuration + 0.15;

    this.synth.stopPanickedBreathing(false);
    this.synth.playWitchCaptureJumpscare();
    this.onHudUpdate?.();
  }

  /**
   * Starts the 10-second victory cutscene showing all 4 friends running out through the
   * Haveli gate back to their SUV on the forest road as the sun rises over the distant village.
   */
  private triggerVictoryEscape(customWinMsg?: string) {
    if (
      this.gameState === 'victory' ||
      this.entryPhase === 'victory_escape_cutscene'
    ) {
      return;
    }

    this.entrySequenceToken++;
    this.entryPhase = 'victory_escape_cutscene';
    this.victoryCutsceneElapsed = 0;
    this.dawnSunriseProgress = 0;
    this.victoryCustomMessage =
      customWinMsg ??
      'बधाई हो! आपने रुक्मिणी के श्राप से अपने दोस्तों को बचा लिया!';
    this.recordCareerEscape();

    if (this.activeHidingSpot) {
      this.activeHidingSpot.isOccupied = false;
      this.activeHidingSpot = null;
    }
    this.nearbyHidingSpot = null;
    this.compromisedInHiding = false;
    this.clearMoveInputs();
    this.isPlayerCrouching = false;
    this.crouchHold = false;
    this.crouchToggle = false;
    this.crouchEyeOffsetY = 0;
    this.isPlayerMakingSound = false;
    this.currentNoiseDb = 0;
    this.isHaveliBlackout = false;
    this.entryBlackoutOpacity = 0;
    this.redLightningFlashOpacity = 0;
    this.redLightningFlashTimer = 0;
    this.heartbeatIntensity = 0;
    this.heartbeatVignetteOpacity = 0;
    this.playerFloorY = 0;
    this.mansionRoot.position.y = 0;

    if (this.playerArms) {
      this.playerArms.group.visible = false;
    }

    if (this.haveli) {
      for (const doorId of ['door_main_entrance', 'door_front_iron_gate']) {
        const door = this.haveli.doors.find((d) => d.id === doorId);
        if (door) {
          door.isOpen = true;
          door.targetAngle = door.openAngle;
          door.currentAngle = door.openAngle;
          door.pivot.rotation.y = door.openAngle;
        }
      }
      this.haveli.setBlackoutMode(false);
      this.haveli.setLightLevelMultiplier(1.0);
      this.haveli.setSunriseProgress(0);
    }

    if (this.witchModel) {
      this.witchModel.root.visible = false;
      if (this.witchModel.eyeCrimsonLight) {
        this.witchModel.eyeCrimsonLight.intensity = 0;
      }
    }
    for (const tf of this.trappedFriends) {
      tf.character.root.visible = false;
      tf.cageGroup.visible = false;
    }

    // Place all 4 friends at the Main Haveli Door threshold ready to sprint out together
    if (this.aaravFriend) {
      this.aaravFriend.boundToPillar = false;
      this.aaravFriend.root.position.set(0.0, 0, 9.2);
      this.aaravFriend.root.rotation.set(0, 0, 0);
      this.aaravFriend.setAnimation('run');
      this.aaravFriend.root.visible = true;
    }
    const runnerStarts = [
      { x: -0.85, z: 8.75 },
      { x: 0.85, z: 8.9 },
      { x: -0.25, z: 8.15 },
    ];
    this.companionFriends.forEach((comp, idx) => {
      const rs = runnerStarts[idx] ?? { x: 0, z: 8.5 };
      comp.char.boundToPillar = false;
      comp.char.setSecondaryTorchEnabled?.(false, 0);
      comp.char.root.position.set(rs.x, 0, rs.z);
      comp.char.root.rotation.set(0, 0, 0);
      comp.char.setAnimation('run');
      comp.char.root.visible = true;
      comp.currentSpeed = 3.5;
    });

    const cam = xb.core.camera as THREE.PerspectiveCamera | undefined;
    if (cam && this.storyDefaultFov <= 0) {
      this.storyDefaultFov = cam.fov || 60;
    }

    this.mansionKeyState = 'unlocked_escape';
    this.synth.stopPanickedBreathing(false);
    this.synth.playDoorCreak();
    this.synth.playRelicChime(true);
    this.synth.playVictorySunriseCue();

    this.entrySubtitleRukmini = false;
    this.entrySubtitleSpeaker = 'आरव, कबीर, रिया और देव';
    this.entrySubtitleText =
      'हम बच गए! वो देखो गांव के ऊपर सूरज निकल रहा है—चलो गाड़ी की तरफ भागो!';
    this.entrySubtitleTimer = 7.2;
    this.taskStatusText =
      '🌅 चारों दोस्त हवेली से बाहर निकलकर जंगल की सड़क पर अपनी SUV की ओर भाग रहे हैं...';
    this.onHudUpdate?.();
  }

  /**
   * Modulates Haveli lighting with Stage 2+ (<18m) red flickering and Relic-Burn red lightning flashes,
   * while maintaining clear corridor navigation visibility.
   */
  public modulateLightingByWitchProximity(
    distToPlayer: number,
    time: number,
    dt: number,
    lightningBoost = 0,
  ) {
    if (this.entryPhase === 'blackout_abduction') {
      if (this.ambientLight) this.ambientLight.intensity = 0;
      if (this.hemiLight) this.hemiLight.intensity = 0;
      if (this.moonKeyLight) this.moonKeyLight.intensity = 0;
      if (this.oppositeDirLight) this.oppositeDirLight.intensity = 0;
      if (this.flashlight) this.flashlight.intensity = 0;
      return;
    }

    if (this.entryPhase === 'lights_flicker') {
      const mul = Math.max(0.05, 1 - this.entryBlackoutOpacity);
      if (this.ambientLight) this.ambientLight.intensity = 0.72 * mul;
      if (this.hemiLight) this.hemiLight.intensity = 0.82 * mul;
      if (this.moonKeyLight) this.moonKeyLight.intensity = 0.92 * mul;
      if (this.oppositeDirLight) this.oppositeDirLight.intensity = 0.55 * mul;
      if (this.flashlight) this.flashlight.intensity = 3.5 * mul;
      return;
    }

    const rukminiProximity = this.witchBanished
      ? 0
      : THREE.MathUtils.clamp(1 - (distToPlayer - 2.0) / 16.0, 0, 1);
    this.lastRukminiProximity = rukminiProximity;
    const smoothRate = Math.min(1, dt * 8);

    // Stage 2+ (2/4 or 3/4 Burned): Haveli lights flicker red whenever Witch Rukmini is within 18m
    const redFlickerMode =
      this.burnedCount >= 2 && !this.witchBanished && distToPlayer <= 18.0;
    const proxRatio = redFlickerMode
      ? Math.max(0.35, 1 - distToPlayer / 18.0)
      : 0;
    const flickerWave = redFlickerMode
      ? Math.sin(time * 24.0) * Math.cos(time * 37.0)
      : 0;
    const redBlend = redFlickerMode
      ? THREE.MathUtils.clamp(0.45 + flickerWave * 0.45, 0.15, 0.92) * proxRatio
      : 0;
    const redFlashBoost = this.redLightningFlashOpacity;
    const combinedRedMix = Math.min(0.95, Math.max(redBlend, redFlashBoost * 0.9));
    const intensityDip = redFlickerMode
      ? 0.72 + Math.max(0, flickerWave) * 0.45
      : 1.0;

    // Natural Storm Lightning Sky Flash (bluish-white double-flash spike, strongest outdoors,
    // softly illuminating through Haveli windows indoors, near-zero underground in Basement B1)
    const stormFlash =
      redFlashBoost > 0.05 ? 0 : THREE.MathUtils.clamp(lightningBoost, 0, 1);
    const isBasement = this.playerFloorY < -1.1;
    const flashScale = isBasement ? 0.04 : this.playerOutdoors ? 1.0 : 0.34;
    const skyFlash = stormFlash * flashScale;

    const diffAtmosMul =
      this.difficulty === 'easy'
        ? 1.14
        : this.difficulty === 'nightmare'
          ? 0.62
          : 1.0;
    const diffFlashMul =
      this.difficulty === 'easy'
        ? 1.38
        : this.difficulty === 'nightmare'
          ? 0.76
          : 1.0;
    const diffFlashDist =
      this.difficulty === 'easy'
        ? 50
        : this.difficulty === 'nightmare'
          ? 38
          : 45;

    const isMobile = this.isMobileDevice();
    const isSmoothOrMobile = this.graphicsQuality === 'low' || isMobile;

    if (this.ambientLight) {
      const baseAmbHex = isMobile ? 0x556688 : 0x4a5d82;
      const baseAmbInt = isMobile ? 1.2 : 1.1;
      _targetColor
        .setHex(baseAmbHex)
        .lerp(_dreadFlashlightColor, combinedRedMix * 0.78)
        .lerp(_stormLightningTint, skyFlash * (isMobile ? 0.55 : 0.85));
      this.ambientLight.color.copy(_targetColor);
      this.ambientLight.intensity = Math.min(
        1.5,
        baseAmbInt * intensityDip * diffAtmosMul +
          redFlashBoost * 0.35 +
          skyFlash * 0.45,
      );
    }

    if (this.hemiLight) {
      _targetColor
        .setHex(0x6b82b8)
        .lerp(_dreadFlashlightColor, combinedRedMix * 0.72)
        .lerp(_stormLightningTint, skyFlash * 0.9);
      this.hemiLight.color.copy(_targetColor);
      this.hemiLight.groundColor.setHex(0x222833);
      this.hemiLight.intensity = Math.min(
        1.35,
        0.9 * intensityDip * diffAtmosMul +
          redFlashBoost * 0.35 +
          skyFlash * 0.5,
      );
    }

    if (this.moonKeyLight) {
      const baseMoonHex = isMobile ? 0x99bbff : 0xaac4ff;
      const baseMoonInt = isMobile ? 0.9 : 1.0;
      _targetColor
        .setHex(baseMoonHex)
        .lerp(_dreadFlashlightColor, combinedRedMix * 0.85)
        .lerp(_stormLightningTint, skyFlash * (isMobile ? 0.65 : 0.95));
      this.moonKeyLight.color.copy(_targetColor);
      this.moonKeyLight.intensity = Math.min(
        2.1,
        baseMoonInt * intensityDip * diffAtmosMul +
          redFlashBoost * 0.65 +
          skyFlash * 0.85,
      );
    }

    if (this.oppositeDirLight) {
      this.oppositeDirLight.visible = !isSmoothOrMobile;
      if (this.oppositeDirLight.visible) {
        _targetColor
          .setHex(0x8ca4c8)
          .lerp(_dreadFlashlightColor, combinedRedMix * 0.8)
          .lerp(_stormLightningTint, skyFlash * 0.85);
        this.oppositeDirLight.color.copy(_targetColor);
        this.oppositeDirLight.intensity = Math.min(
          1.05,
          0.55 * intensityDip * diffAtmosMul +
            redFlashBoost * 0.45 +
            skyFlash * 0.55,
        );
      }
    }

    const scene = xb.core.scene;
    if (scene) {
      _activeStormSkyColor
        .copy(_storyNightSkyColor)
        .lerp(_storyLightningSkyColor, isMobile ? skyFlash * 0.2 : isSmoothOrMobile ? skyFlash * 0.3 : skyFlash * 0.5);
      _nightHorizonFog.color.copy(_activeStormSkyColor);
      _nightHorizonFog.density = isMobile
        ? 0.009
        : this.difficulty === 'nightmare'
          ? 0.017
          : 0.015;
      if (scene.fog !== _nightHorizonFog) {
        scene.fog = _nightHorizonFog;
      }
      if (scene.background !== _storyNightSkyColor) {
        scene.background = _storyNightSkyColor;
      }
    }

    if (this.flashlight) {
      const combinedCurseFactor = this.witchBanished
        ? 0
        : Math.max(
            rukminiProximity,
            this.cursedAreaProximity * 0.75,
            combinedRedMix,
          );
      const baseFlash = 3.5 * diffFlashMul;
      this.flashlight.intensity = redFlickerMode
        ? baseFlash * (0.75 + Math.max(0, flickerWave) * 0.45)
        : baseFlash;
      this.flashlight.angle = Math.PI / 4;
      this.flashlight.penumbra = 0.4;
      this.flashlight.distance = diffFlashDist;
      this.flashlight.decay = 0.15;

      _targetColor.lerpColors(
        _calmFlashlightColor,
        _dreadFlashlightColor,
        combinedCurseFactor,
      );
      this.flashlight.color.lerp(_targetColor, smoothRate);
    }
  }

  /**
   * Drives the smooth screen-edge dark-red heartbeat vignette glow and synced soft cardiac thumps.
   * Activates whenever Witch Rukmini is within 15 meters inside the Haveli, pulsing stronger
   * and faster smoothly as her distance drops from 15m down to 3m.
   */
  private updateHeartbeatVignette(distToPlayer: number, dt: number) {
    this.heartbeatRukminiDistance = distToPlayer;

    if (
      this.gameState !== 'playing' ||
      this.entryPhase !== 'mission_active' ||
      distToPlayer > 15.0
    ) {
      this.heartbeatVignetteOpacity = THREE.MathUtils.lerp(
        this.heartbeatVignetteOpacity,
        0,
        Math.min(1, dt * 5.5),
      );
      this.heartbeatVignettePulse = THREE.MathUtils.lerp(
        this.heartbeatVignettePulse,
        0,
        Math.min(1, dt * 7.5),
      );
      this.heartbeatIntensity = THREE.MathUtils.lerp(
        this.heartbeatIntensity,
        0,
        Math.min(1, dt * 5.5),
      );
      if (this.heartbeatVignetteOpacity < 0.004) {
        this.heartbeatVignetteOpacity = 0;
        this.heartbeatVignettePulse = 0;
        this.heartbeatIntensity = 0;
        this.heartbeatDurationMs = 1540;
        this.lastHeartbeatCycleIndex = -1;
      }
      return;
    }

    // Smooth normalized proximity: 0.0 at 15.0m -> 1.0 at <= 3.0m
    const proximity = THREE.MathUtils.clamp((15.0 - distToPlayer) / 12.0, 0, 1);
    const smoothProx = proximity * proximity * (3 - 2 * proximity);
    const closeUrgency = Math.pow(proximity, 1.65);

    // Pulse speed accelerates smoothly from ~0.65 Hz (39 BPM) at 15m -> ~2.35 Hz (141 BPM) at <= 3m
    const freqHz = 0.65 + smoothProx * 0.85 + closeUrgency * 0.85;
    // Outer dark-red glow strengthens smoothly from a soft edge warning at 15m to deep crimson at <= 3m
    const baseOpacity = 0.03 + smoothProx * 0.14 + closeUrgency * 0.16;
    const peakOpacity = 0.22 + smoothProx * 0.42 + closeUrgency * 0.30;
    const targetIntensity = 0.12 + smoothProx * 0.53 + closeUrgency * 0.35;

    this.heartbeatDurationMs = Math.round(1000 / freqHz);
    this.heartbeatIntensity = THREE.MathUtils.lerp(
      this.heartbeatIntensity,
      targetIntensity,
      Math.min(1, dt * 8.5),
    );

    this.heartbeatPhase += dt * freqHz;
    const cycleIndex = Math.floor(this.heartbeatPhase);
    const cycle = this.heartbeatPhase - cycleIndex;

    // Realistic "lub-dub" cardiac waveform (primary systolic spike + softer secondary spike)
    const lub = Math.exp(-Math.pow((cycle - 0.10) / 0.072, 2));
    const dub = 0.72 * Math.exp(-Math.pow((cycle - 0.30) / 0.082, 2));
    const beatWave = Math.min(1, lub + dub);

    const targetOpacity = baseOpacity + (peakOpacity - baseOpacity) * beatWave;
    const followRate = Math.min(1, dt * 18);
    this.heartbeatVignetteOpacity = THREE.MathUtils.lerp(
      this.heartbeatVignetteOpacity,
      targetOpacity,
      followRate,
    );
    this.heartbeatVignettePulse = THREE.MathUtils.lerp(
      this.heartbeatVignettePulse,
      beatWave * (0.38 + smoothProx * 0.62),
      followRate,
    );

    // Trigger synced soft low "lub-dub" cardiac thump pulse on each new beat cycle
    if (cycleIndex !== this.lastHeartbeatCycleIndex) {
      this.lastHeartbeatCycleIndex = cycleIndex;
      this.heartbeatCycleTick++;
      const audioVol = 0.10 + smoothProx * 0.28 + closeUrgency * 0.30;
      this.synth.playSingleHeartbeatPulse(audioVol, distToPlayer <= 6.5);
    }
  }

  private buildThakurMansion() {
    this.add(this.mansionRoot);
    const isMobile = this.isMobileDevice();

    this.haveli = buildThakurHaveli({ disableExtraLights: isMobile });
    this.haveli.setWeatherQuality(this.graphicsQuality);
    this.haveli.setLightBudgetMode(
      this.graphicsQuality === 'low' || isMobile,
    );
    this.mansionRoot.add(this.haveli.root);
    this.onHaveliReady?.(this.haveli);

    // Spawn the player outside beside the broken-down SUV facing the Haveli iron gate
    this.mansionRoot.position.set(
      -EXTERIOR_SPAWN_LOCAL_X,
      0,
      -EXTERIOR_SPAWN_LOCAL_Z,
    );
    // Keep the glowing Haveli Entrance Key visible right in front of the Shiva Temple in the 24m Royal Front Forecourt
    this.haveli.mansionKeyGroup.position.set(9.55, 0.98, 27.2);
    this.haveli.mansionKeyGroup.visible = true;
    this.playerFloorY = 0;

    this.witchModel = buildRukminiWitchModel({ disableLights: isMobile });
    this.witchModel.root.position.set(0, 0, -8.5);
    this.mansionRoot.add(this.witchModel.root);

    // Watchman Baba (Chowkidar) standing outside the Outer Compound Iron Gate (z = 34.0) with his glowing brass lantern
    this.chowkidar = createChowkidar({ disableLights: isMobile });
    this.chowkidar.root.position.set(2.45, 0, 35.0);
    this.chowkidar.root.rotation.y = -0.65;
    CharacterGLBManager.register('golu', this.chowkidar);
    this.mansionRoot.add(this.chowkidar.root);

    // Legacy placeholder hidden so exact 4 friends = Player + Kabir + Riya + Dev
    const fAarav = createAarav({ disableLights: isMobile });
    fAarav.root.position.set(-2.25, 0, 35.1);
    fAarav.root.visible = false;
    CharacterGLBManager.register('mangesh', fAarav);
    this.mansionRoot.add(fAarav.root);
    this.aaravFriend = fAarav;

    // 3 Unchained Exterior/Group Companion Friends (Kabir, Riya, Dev) who spawn behind the player (>= 3.5m spacing buffer)
    const compKabir = createKabir({ disableLights: isMobile });
    compKabir.boundToPillar = false;
    compKabir.setAnimation('idle');
    compKabir.root.position.set(-0.15, 0, 44.85);
    compKabir.root.rotation.y = Math.PI;
    this.mansionRoot.add(compKabir.root);

    const compRiya = createRiya({ disableLights: isMobile });
    compRiya.boundToPillar = false;
    compRiya.setAnimation('idle');
    compRiya.root.position.set(2.75, 0, 44.95);
    compRiya.root.rotation.y = Math.PI;
    this.mansionRoot.add(compRiya.root);

    const compDev = createDev({ disableLights: isMobile });
    compDev.boundToPillar = false;
    compDev.setAnimation('idle');
    compDev.root.position.set(1.35, 0, 45.85);
    compDev.root.rotation.y = Math.PI;
    this.mansionRoot.add(compDev.root);

    this.companionFriends = [
      {
        id: 'kabir',
        nameHi: 'कबीर',
        char: compKabir,
        formationX: -1.5,
        formationZ: 3.75,
        currentSpeed: 0,
        isRescuedFollower: false,
        rescueOrder: 0,
        navPath: [],
        navPathIdx: 0,
        navTimer: 0,
        lastGoalPos: new THREE.Vector3(999, 999, 999),
        stuckTimer: 0,
      },
      {
        id: 'riya',
        nameHi: 'रिया',
        char: compRiya,
        formationX: 1.5,
        formationZ: 3.85,
        currentSpeed: 0,
        isRescuedFollower: false,
        rescueOrder: 0,
        navPath: [],
        navPathIdx: 0,
        navTimer: 0,
        lastGoalPos: new THREE.Vector3(999, 999, 999),
        stuckTimer: 0,
      },
      {
        id: 'dev',
        nameHi: 'देव',
        char: compDev,
        formationX: 0.05,
        formationZ: 4.75,
        currentSpeed: 0,
        isRescuedFollower: false,
        rescueOrder: 0,
        navPath: [],
        navPathIdx: 0,
        navTimer: 0,
        lastGoalPos: new THREE.Vector3(999, 999, 999),
        stuckTimer: 0,
      },
    ];

    // The 3 Trapped Friends (Kabir, Riya, Dev) locked inside corner rusted iron-bar Jail Cells (लोहे की जेल)
    // across 2F, 3F & Underground Dungeon U1 after the Step 4 blackout
    const fKabir = createKabir({ disableLights: isMobile });
    CharacterGLBManager.register('mangesh', fKabir);

    const fRiya = createRiya({ disableLights: isMobile });
    CharacterGLBManager.register('mangesh', fRiya);

    const fDev = createDev({ disableLights: isMobile });
    CharacterGLBManager.register('mangesh', fDev);

    this.friends = [fAarav, fKabir, fRiya, fDev];
    this.trappedFriends = [];

    const friendJailSpecs: Array<{
      friendId: 'kabir' | 'riya' | 'dev';
      char: HumanoidCharacter;
      nameHi: string;
      nameEn: string;
      roomLocationHi: string;
      cellPos: THREE.Vector3;
      cellRotY: number;
      accentHex: number;
      requiredKeyId: JailKeyId;
      requiredKeyNameHi: string;
      requiredKeyNameEn: string;
    }> = [
      {
        friendId: 'kabir',
        char: fKabir,
        nameHi: 'कबीर (Kabir)',
        nameEn: 'Kabir',
        roomLocationHi: 'दूसरी मंज़िल — अतिथि कक्ष १ (2F-3)',
        cellPos: new THREE.Vector3(20.55, 5.0, -29.05), // 2F-3 SW corner, gate faces North (-Z)
        cellRotY: Math.PI,
        accentHex: 0xffb830,
        requiredKeyId: 'kabir_jail_key',
        requiredKeyNameHi: 'कबीर की जेल की चाबी',
        requiredKeyNameEn: "Kabir's Jail Key",
      },
      {
        friendId: 'riya',
        char: fRiya,
        nameHi: 'रिया (Riya)',
        nameEn: 'Riya',
        roomLocationHi: 'तीसरी मंज़िल — अटारी भंडार १ (3F-3)',
        cellPos: new THREE.Vector3(-20.55, 10.0, -44.45), // 3F-3 NE corner, gate faces South (+Z)
        cellRotY: 0,
        accentHex: 0xff5577,
        requiredKeyId: 'riya_jail_key',
        requiredKeyNameHi: 'रिया की जेल की चाबी',
        requiredKeyNameEn: "Riya's Jail Key",
      },
      {
        friendId: 'dev',
        char: fDev,
        nameHi: 'देव (Dev)',
        nameEn: 'Dev',
        roomLocationHi: 'तहखाना — काल-कोठरी 1 (U1)',
        cellPos: new THREE.Vector3(-11.45, -4.5, -43.55), // Basement U1 SW corner, gate faces North (-Z)
        cellRotY: Math.PI,
        accentHex: 0x38e8b0,
        requiredKeyId: 'dev_jail_key',
        requiredKeyNameHi: 'देव की जेल की चाबी',
        requiredKeyNameEn: "Dev's Jail Key",
      },
    ];

    friendJailSpecs.forEach((spec, idx) => {
      // Friend stands anxiously inside the locked iron-bar jail cell facing out through the bars
      spec.char.boundToPillar = false;
      spec.char.setAnimation('scared');
      spec.char.root.position.copy(spec.cellPos);
      spec.char.root.position.y += 0.08;
      spec.char.root.rotation.set(0, spec.cellRotY, 0);
      this.mansionRoot.add(spec.char.root);

      const jailBuild = buildRustedIronJailCell({
        friendNameHi: spec.nameHi,
        friendNameEn: spec.nameEn,
        accentHex: spec.accentHex,
      });
      jailBuild.cageGroup.position.copy(spec.cellPos);
      jailBuild.cageGroup.rotation.set(0, spec.cellRotY, 0);
      this.mansionRoot.add(jailBuild.cageGroup);

      // Hidden until Step 4 blackout abducts the 3 friends into their locked iron-bar jail cells
      spec.char.root.visible = false;
      jailBuild.cageGroup.visible = false;

      this.trappedFriends.push({
        index: idx,
        friendId: spec.friendId,
        nameHi: spec.nameHi,
        nameEn: spec.nameEn,
        roomLocationHi: spec.roomLocationHi,
        character: spec.char,
        cageGroup: jailBuild.cageGroup,
        gatePivot: jailBuild.gatePivot,
        padlockGroup: jailBuild.padlockGroup,
        gateOpenAngle: jailBuild.gateOpenAngle,
        gateCurrentAngle: 0,
        gateTargetAngle: 0,
        gateRattleOffset: 0,
        requiredKeyId: spec.requiredKeyId,
        requiredKeyNameHi: spec.requiredKeyNameHi,
        requiredKeyNameEn: spec.requiredKeyNameEn,
        rescued: false,
      });
    });

    // Spawn 3 Separate Glowing Named Jail Keys hidden in different rooms across the Haveli & Underground Maze
    this.jailKeys = [];
    const jailKeySpecs: Array<{
      id: JailKeyId;
      friendIndex: number;
      nameHi: string;
      nameEn: string;
      purposeHi: string;
      purposeEn: string;
      roomNameHi: string;
      pos: THREE.Vector3;
      gemHex: number;
      phaseOffset: number;
    }> = [
      {
        id: 'kabir_jail_key',
        friendIndex: 0,
        nameHi: 'कबीर की जेल की चाबी',
        nameEn: "Kabir's Jail Key",
        purposeHi: 'दूसरी मंज़िल (2F-3) कबीर की जेल खोलने के लिए',
        purposeEn: "Unlocks Kabir's Jail Cell (2F Guest Suite)",
        roomNameHi: 'G5: मेहमान बैठक (Ground Floor)',
        pos: new THREE.Vector3(-24.8, 0.96, -34.2),
        gemHex: 0xffb830,
        phaseOffset: 0.4,
      },
      {
        id: 'riya_jail_key',
        friendIndex: 1,
        nameHi: 'रिया की जेल की चाबी',
        nameEn: "Riya's Jail Key",
        purposeHi: 'तीसरी मंज़िल (3F-3) रिया की जेल खोलने के लिए',
        purposeEn: "Unlocks Riya's Jail Cell (3F Attic Store)",
        roomNameHi: '2F-6: शाही भोजशाला (Second Floor)',
        pos: new THREE.Vector3(-25.5, 6.02, -16.2),
        gemHex: 0xff5577,
        phaseOffset: 1.9,
      },
      {
        id: 'dev_jail_key',
        friendIndex: 2,
        nameHi: 'देव की जेल की चाबी',
        nameEn: "Dev's Jail Key",
        purposeHi: 'तहखाने (U1) देव की जेल खोलने के लिए',
        purposeEn: "Unlocks Dev's Jail Cell (Basement Dungeon U1)",
        roomNameHi: 'U4: गुप्त खज़ाना तिजोरी (Basement)',
        pos: new THREE.Vector3(22.4, -3.52, -59.2),
        gemHex: 0x38e8b0,
        phaseOffset: 3.4,
      },
    ];

    for (const spec of jailKeySpecs) {
      const keyMesh = buildGlowingNamedKeyMesh({
        name: `JailKey_${spec.id}`,
        gemHex: spec.gemHex,
        phaseOffset: spec.phaseOffset,
      });
      keyMesh.group.position.copy(spec.pos);
      // Hidden until Step 4 blackout locks the 3 friends in their iron jail cells
      keyMesh.group.visible = false;
      this.mansionRoot.add(keyMesh.group);

      this.jailKeys.push({
        id: spec.id,
        friendIndex: spec.friendIndex,
        nameHi: spec.nameHi,
        nameEn: spec.nameEn,
        purposeHi: spec.purposeHi,
        purposeEn: spec.purposeEn,
        roomNameHi: spec.roomNameHi,
        group: keyMesh.group,
        basePos: spec.pos.clone(),
        collected: false,
        used: false,
        proximityGlow: keyMesh.proximityGlow,
      });
    }

    // First-person player hands/arms holding flashlight
    this.playerArms = createFirstPersonArms();
    if (xb.core.camera) {
      xb.core.camera.add(this.playerArms.group);
      this.playerArmsAdded = true;
    }

    this.spawnRelicsForSession(Math.max(4, this.requiredItems));
    this.spawnThrowablesForSession();

    if (this.isMobileDevice()) {
      this.applyMobileGlobalSceneCleanup();
    }
  }

  /**
   * Returns the total number of active Three.js Light instances currently in the gameplay scene graph.
   */
  public getActiveLightCount(): number {
    const seen = new Set<THREE.Light>();
    const roots: THREE.Object3D[] = [];
    if (xb.core.scene) roots.push(xb.core.scene);
    roots.push(this, this.mansionRoot);
    if (xb.core.camera) roots.push(xb.core.camera);
    for (const root of roots) {
      root.traverse((obj) => {
        const light = obj as THREE.Light;
        if (light.isLight && light.visible) {
          seen.add(light);
        }
      });
    }
    return seen.size;
  }

  /**
   * GLOBAL SCENE TRAVERSE CLEANUP ON MOBILE (CRITICAL FIX):
   * Right AFTER the entire 3D world (Exterior, 32-room Haveli, Underground Maze, Well Courtyard, Friends, Rukmini)
   * finishes building and BEFORE starting the render loop, if `isMobile` is true, traverses the entire scene:
   * - Removes EVERY PointLight, SpotLight, HemisphereLight, and extra DirectionalLight in the entire scene
   *   EXCEPT the single `playerFlashlight` SpotLight (keeping ONLY 1 AmbientLight(0x556688, 1.2),
   *   1 DirectionalLight(0x99bbff, 0.9), and 1 playerFlashlight = 3 lights max so Android shaders NEVER overflow).
   * - For every Mesh, disables `castShadow = false; receiveShadow = false;` and converts heavy
   *   MeshStandardMaterial / MeshPhysicalMaterial materials into lightweight THREE.MeshLambertMaterial
   *   preserving `color`, `map`, `emissive`, `transparent`, `opacity`, and `side`.
   * - Keeps `scene.fog = new THREE.FogExp2(0x0b101d, 0.009)` and `renderer.setClearColor(0x0b101d, 1)`.
   */
  public applyMobileGlobalSceneCleanup() {
    if (!this.isMobileDevice()) return;

    const renderer = xb.core.renderer;
    const scene = xb.core.scene;
    if (renderer instanceof THREE.WebGLRenderer) {
      (renderer.capabilities as { precision?: string }).precision = 'mediump';
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.shadowMap.enabled = false;
      renderer.setClearColor(0x0b101d, 1);
    }
    if (scene) {
      scene.background = _storyNightSkyColor;
      _nightHorizonFog.color.setHex(0x0b101d);
      _nightHorizonFog.density = 0.009;
      scene.fog = _nightHorizonFog;
    }
    const cam = xb.core.camera as THREE.PerspectiveCamera | undefined;
    if (cam) {
      cam.near = 0.25;
      cam.far = 70;
      cam.updateProjectionMatrix();
    }

    if (this.ambientLight) {
      this.ambientLight.visible = true;
      if (!this.ambientLight.parent) {
        this.add(this.ambientLight);
      }
    }
    if (this.moonKeyLight) {
      this.moonKeyLight.visible = true;
      this.moonKeyLight.castShadow = false;
      if (!this.moonKeyLight.parent) {
        this.add(this.moonKeyLight);
      }
    }
    if (this.flashlight) {
      this.flashlight.visible = true;
      this.flashlight.castShadow = false;
    }

    const roots: THREE.Object3D[] = [];
    if (scene) roots.push(scene);
    roots.push(this, this.mansionRoot);
    if (xb.core.camera) roots.push(xb.core.camera);
    if (this.playerArms?.group) roots.push(this.playerArms.group);

    const lightsToRemove: THREE.Light[] = [];
    for (const root of roots) {
      this.convertHierarchyToMobileLambert(root);
      root.traverse((obj) => {
        const light = obj as THREE.Light;
        if (light.isLight) {
          if (
            light !== this.ambientLight &&
            light !== this.moonKeyLight &&
            light !== this.flashlight
          ) {
            lightsToRemove.push(light);
          }
        }
      });
    }

    for (const extraLight of lightsToRemove) {
      extraLight.visible = false;
      extraLight.intensity = 0;
      extraLight.parent?.remove(extraLight);
    }
  }

  /**
   * Converts heavy PBR MeshStandardMaterial / MeshPhysicalMaterial in a hierarchy
   * into lightweight MeshLambertMaterial on mobile GPUs (Adreno/Mali) and disables
   * per-mesh shadow flags so WebGL shaders compile cleanly without black/white-screen shader failure.
   */
  private convertHierarchyToMobileLambert(root: THREE.Object3D) {
    const convertedCache = new Map<THREE.Material, THREE.Material>();
    const toDispose: THREE.Material[] = [];

    const convertSingle = (mat: THREE.Material): THREE.Material => {
      const cached = convertedCache.get(mat);
      if (cached) return cached;

      if (
        mat instanceof THREE.MeshStandardMaterial ||
        mat instanceof THREE.MeshPhysicalMaterial
      ) {
        const lambert = new THREE.MeshLambertMaterial({
          color: mat.color.clone(),
          map: mat.map ?? null,
          emissive: mat.emissive.clone(),
          emissiveIntensity: mat.emissiveIntensity,
          emissiveMap: mat.emissiveMap ?? null,
          transparent: mat.transparent,
          opacity: mat.opacity,
          side: mat.side,
          alphaTest: mat.alphaTest,
          depthWrite: mat.depthWrite,
          depthTest: mat.depthTest,
          vertexColors: mat.vertexColors,
          fog: mat.fog,
          flatShading: mat.flatShading,
          wireframe: mat.wireframe,
          polygonOffset: mat.polygonOffset,
          polygonOffsetFactor: mat.polygonOffsetFactor,
          polygonOffsetUnits: mat.polygonOffsetUnits,
          name: mat.name,
        });
        lambert.precision = 'mediump';
        convertedCache.set(mat, lambert);
        toDispose.push(mat);
        return lambert;
      }

      mat.precision = 'mediump';
      convertedCache.set(mat, mat);
      return mat;
    };

    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(convertSingle);
      } else if (mesh.material) {
        mesh.material = convertSingle(mesh.material);
      }
    });

    for (const oldMat of toDispose) {
      oldMat.dispose();
    }
  }

  private setupPositionalPayalAudio() {
    try {
      this.audioListener = new THREE.AudioListener();
      if (xb.core.camera) {
        xb.core.camera.add(this.audioListener);
      }
      if (this.witchModel) {
        this.payalPositionalAudio = this.synth.createPayalPositionalAudio(
          this.audioListener,
        );
        this.payalPositionalAudio.position.set(0, 0.14, 0);
        this.witchModel.root.add(this.payalPositionalAudio);
      }
    } catch {
      // Fallback handled gracefully by HorrorSynth if Web Audio is unavailable
    }
  }

  public resumeSpatialAudio() {
    if (this.gameState !== 'playing') {
      return;
    }
    this.synth.unlockAudio();
    if (!this.audioListener) {
      this.setupPositionalPayalAudio();
    }
    if (
      this.audioListener &&
      this.audioListener.context.state === 'suspended'
    ) {
      void this.audioListener.context.resume();
    }
  }

  public spawnRelicsForSession(count: number) {
    for (const r of this.relics) {
      this.mansionRoot.remove(r.group);
    }
    this.relics = [];
    this.requiredItems = Math.max(4, count);
    this.collectedCount = 0;
    this.burnedCount = 0;

    const baseRelics = createCursedRelics(this.mansionRoot);
    this.relics.push(...baseRelics);

    if (this.requiredItems > 4) {
      const extraRooms: Array<{
        pos: THREE.Vector3;
        roomId: string;
        roomNameHi: string;
      }> = [
        {
          pos: new THREE.Vector3(-24.0, 0.9, 0.75),
          roomId: 'gf_g1_shastragar',
          roomNameHi: 'ठाकुर दरबार हॉल (G1)',
        },
        {
          pos: new THREE.Vector3(-24.0, 0.85, -36.75),
          roomId: 'gf_g5_baithak',
          roomNameHi: 'मेहमान बैठक (G5)',
        },
        {
          pos: new THREE.Vector3(24.0, 0.85, -36.75),
          roomId: 'gf_g6_sevak',
          roomNameHi: 'सेवक कक्ष (G6)',
        },
        {
          pos: new THREE.Vector3(-24.0, 5.95, 0.75),
          roomId: 'f2_2_master_bed',
          roomNameHi: 'ठाकुर का शयनकक्ष (2F-2)',
        },
        {
          pos: new THREE.Vector3(-24.0, 5.85, -36.75),
          roomId: 'f2_4_sangeet',
          roomNameHi: 'संगीत और झरोखा हॉल (2F-4)',
        },
        {
          pos: new THREE.Vector3(24.0, 10.75, -36.75),
          roomId: 'f3_4_barsati',
          roomNameHi: 'बरसाती मंडप कक्ष (3F-4)',
        },
      ];

      for (let i = 4; i < this.requiredItems; i++) {
        const extraSpec = extraRooms[(i - 4) % extraRooms.length];
        const relicType = CURSED_RELIC_TYPES[i % CURSED_RELIC_TYPES.length];
        const g = new THREE.Group();
        g.position.copy(extraSpec.pos);
        const extraMat = new THREE.MeshStandardMaterial({
          color: 0xff1a1a,
          emissive: 0xe83b18,
          emissiveIntensity: 0.7,
          roughness: 0.22,
          metalness: 0.72,
        });
        const orb = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.18, 1),
          extraMat,
        );
        g.add(orb);
        const proximityGlow = attachProximityGlow({
          group: g,
          targetMaterials: [extraMat],
          theme: 'relic',
          phaseOffset: i * 1.45,
        });
        this.mansionRoot.add(g);

        this.relics.push({
          index: i,
          name: relicType.nameEn,
          hindiName: relicType.nameHi,
          roomNameHi: extraSpec.roomNameHi,
          state: 'hidden',
          lastRoomId: extraSpec.roomId,
          group: g,
          collected: false,
          burned: false,
          basePos: extraSpec.pos.clone(),
          proximityGlow,
        });
      }
    }

    if (this.haveli && this.isMobileDevice()) {
      this.applyMobileGlobalSceneCleanup();
    }
    this.onHudUpdate?.();
  }

  /**
   * Returns boolean array of the 4 core relics [bangles, sindoor, payal, chunri]
   * for the top-left 4-icon tracker.
   */
  public getRelicIconStates(): [boolean, boolean, boolean, boolean] {
    return [
      Boolean(this.relics[0]?.collected),
      Boolean(this.relics[1]?.collected),
      Boolean(this.relics[2]?.collected),
      Boolean(this.relics[3]?.collected),
    ];
  }

  public updateSpatialUI() {
    this.onHudUpdate?.();
  }

  public stepChapter(delta: number) {
    const chapters = STORY_CHAPTERS[this.lang];
    this.currentChapter = Math.max(
      0,
      Math.min(chapters.length - 1, this.currentChapter + delta),
    );
    this.onHudUpdate?.();
  }

  public narrateCurrentChapter() {
    const chapters = STORY_CHAPTERS[this.lang];
    const chap = chapters[this.currentChapter] || chapters[0];
    this.onChatLog?.(
      `System: Generating Gemini 3.8 Flash TTS narration for "${chap.title}"...`,
    );
    this.gemini
      .speakText(`${chap.title}. ${chap.text}`, this.lang)
      .catch((err: unknown) => {
        this.onChatLog?.(
          `TTS Notice: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
  }

  /**
   * Alerts Rukmini (the 100% blind blood witch) to a sound source at the player's position
   * ONLY if the player is inside the Haveli AND within the sound's strict hearing range.
   */
  public triggerSoundAlert(intensity = 1.0, maxRange = 26.0) {
    const cam = xb.core.camera;
    if (!cam || !this.witchModel) return;
    cam.getWorldPosition(_playerWorldPos);
    const localX = _playerWorldPos.x - this.mansionRoot.position.x;
    const localZ = _playerWorldPos.z - this.mansionRoot.position.z;
    // Do NOT alert or attract Rukmini while the player is outside the Haveli
    if (!this.isPositionInsideHaveli(localX, localZ)) {
      return;
    }

    const witchPos = this.witchModel.root.position;
    const distToWitch = Math.hypot(
      witchPos.x - localX,
      witchPos.y - this.playerFloorY,
      witchPos.z - localZ,
    );

    // Record that the player just made an audible action sound (e.g. jumping, unlocking chains, or bangle crunch)
    this.playerSilenceTimer = 0;
    this.isPlayerMakingSound = true;
    if (maxRange >= 18.0) {
      this.currentLoudAlertRange = maxRange;
      this.loudActionTimer = Math.max(this.loudActionTimer, 0.75);
    }

    // Strict hearing range check: ignore sounds farther than maxRange
    if (distToWitch > maxRange) {
      return;
    }

    this.witchHeardSoundPos.set(
      THREE.MathUtils.clamp(
        localX,
        this.playerFloorY < -0.5 ? -27.2 : -31.0,
        this.playerFloorY < -0.5 ? 27.2 : 31.0,
      ),
      this.playerFloorY,
      THREE.MathUtils.clamp(
        localZ,
        this.playerFloorY < -0.5 ? -79.2 : -45.2,
        9.0,
      ),
    );
    this.witchTargetPos.copy(this.witchHeardSoundPos);

    if (maxRange >= 20.0 || intensity >= 1.2) {
      this.witchHuntMode = 'fast_chase';
      this.witchAlertLevel = 2.0;
      this.witchSpeed = 3.35;
    } else if (this.witchHuntMode !== 'fast_chase') {
      this.witchHuntMode = 'walk_investigate';
      this.witchAlertLevel = 1.0;
      this.witchSpeed = 2.05;
    }
  }

  public getGameCanvas(): HTMLCanvasElement | null {
    const rendererDom = (xb.core.renderer as THREE.WebGLRenderer | undefined)
      ?.domElement;
    const canvas =
      rendererDom ??
      document.querySelector<HTMLCanvasElement>(
        'canvas:not(#cinematic-canvas):not(#vn-photo-canvas):not(#settings-qr-canvas):not(#hud-radar-canvas):not(#hud-minimap-canvas):not(.lobby-3d-canvas)',
      );
    if (canvas && canvas.style.touchAction !== 'none') {
      canvas.style.touchAction = 'none';
    }
    return canvas;
  }

  public isPointerLockActive(): boolean {
    const locked = Boolean(document.pointerLockElement);
    this.isLocked = locked;
    return locked;
  }

  private ensureSimulatorControlsDisabled() {
    const sim = (
      xb.core as unknown as {
        simulator?: {
          controls?: {
            enabled?: boolean;
            connected?: boolean;
            setEnabled?: (v: boolean) => void;
            disconnect?: () => void;
          };
        };
      }
    ).simulator;
    const controls = sim?.controls;
    if (!controls) return;
    if (controls.enabled !== false) {
      controls.setEnabled?.(false);
    }
    if (controls.connected) {
      controls.disconnect?.();
    }
  }

  public isAnyBlockingOverlayOpen(): boolean {
    if (this.isHudLayoutEditorOpen || this.isMinimapExpanded) return true;
    const blockingSelectors = [
      '#launch-sequence-overlay:not(.hidden)',
      '#menu-screen:not(.hidden)',
      '#story-screen:not(.hidden)',
      '.modal-backdrop:not(.hidden)',
      '#options-modal:not(.hidden)',
      '#hud-layout-editor-overlay:not(.hidden)',
      '#hud-minimap-container:not(.hidden)',
    ];
    for (const sel of blockingSelectors) {
      if (document.querySelector(sel)) return true;
    }
    return false;
  }

  /**
   * Synchronously calls requestPointerLock() inside a desktop user click gesture
   * (Lobby START / CONTINUE, Settings Close/Resume, Skip Intro).
   */
  public requestImmediateDesktopPointerLock() {
    if (this.controlsMode === 'mobile' || this.isMobileTouchControlsActive()) {
      return;
    }
    if (document.pointerLockElement) {
      this.isLocked = true;
      return;
    }
    const target = this.getGameCanvas() || document.body;
    try {
      if (target && typeof target.requestPointerLock === 'function') {
        const req = target.requestPointerLock() as unknown as
          | Promise<void>
          | undefined;
        if (req && typeof req.catch === 'function') {
          req.catch(() => {
            if (target !== document.body && !document.pointerLockElement) {
              try {
                const bodyReq = document.body?.requestPointerLock?.() as unknown as
                  | Promise<void>
                  | undefined;
                bodyReq?.catch?.(() => {});
              } catch {
                // Fallback to drag if iframe blocks pointer lock
              }
            }
          });
        }
      }
    } catch {
      try {
        if (!document.pointerLockElement && document.body?.requestPointerLock) {
          const bodyReq = document.body.requestPointerLock() as unknown as
            | Promise<void>
            | undefined;
          bodyReq?.catch?.(() => {});
        }
      } catch {
        // Fallback to drag if iframe blocks pointer lock
      }
    }
  }

  public requestGamePointerLock(forceFromMouseClick = false) {
    if (this.gameState !== 'playing' || this.isAnyBlockingOverlayOpen()) {
      return;
    }
    // Only skip Pointer Lock when explicitly in Mobile Touch mode (allow real PC mouse clicks in Auto & PC modes)
    if (this.controlsMode === 'mobile' && !forceFromMouseClick) {
      return;
    }
    if (!forceFromMouseClick && this.isMobileTouchControlsActive()) {
      return;
    }
    document.body.classList.add('playing-match');
    if (document.pointerLockElement) {
      this.isLocked = true;
      return;
    }
    const target = this.getGameCanvas() || document.body;
    const requestOnBody = () => {
      try {
        if (
          !document.pointerLockElement &&
          typeof document.body?.requestPointerLock === 'function'
        ) {
          const bodyReq = document.body.requestPointerLock() as unknown as
            | Promise<void>
            | undefined;
          if (bodyReq && typeof bodyReq.catch === 'function') {
            bodyReq.catch(() => {
              // Silently fall back to Left-Mouse-Button drag look in restricted iframes
            });
          }
        }
      } catch {
        // Silently fall back to Left-Mouse-Button drag look
      }
    };

    try {
      if (target && typeof target.requestPointerLock === 'function') {
        const req = target.requestPointerLock() as unknown as
          | Promise<void>
          | undefined;
        if (req && typeof req.catch === 'function') {
          req.catch(() => {
            if (target !== document.body) requestOnBody();
          });
        }
      } else {
        requestOnBody();
      }
    } catch {
      if (target !== document.body) requestOnBody();
    }
  }

  public releaseGamePointerLock() {
    this.suppressNextPointerLockPause = true;
    this.hadPointerLock = false;
    this.isLocked = false;
    this.isPcMouseDragging = false;
    this.hasLastMouse = false;
    document.body.classList.remove(
      'playing-match',
      'pointer-locked',
      'pc-mouse-dragging',
    );
    document.body.style.cursor = '';
    const canvas = this.getGameCanvas();
    if (canvas) {
      canvas.style.cursor = '';
    }
    try {
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
    } catch {
      // Ignore
    }
    this.onPointerLockChange?.(false);
    window.setTimeout(() => {
      this.suppressNextPointerLockPause = false;
    }, 60);
  }

  public togglePlayerCrouch() {
    if (this.gameState !== 'playing' || this.activeHidingSpot) return;
    this.crouchToggle = !this.crouchToggle;
    if (this.crouchToggle) {
      this.moveInput.sprint = false;
      this.moveInput.joySprint = false;
      this.autoSprintActive = false;
    }
    this.onHudUpdate?.();
  }

  public triggerJump() {
    if (this.gameState !== 'playing') return;
    if (this.activeHidingSpot) {
      // Movement & jumping are locked while hidden inside a spot (use E to exit)
      return;
    }
    this.crouchHold = false;
    this.crouchToggle = false;
    if (this.isGrounded && this.jumpOffsetY <= 0.001) {
      this.velocityY = 8.5;
      this.isGrounded = false;
      this.synth.playJumpSound();
      // Jumping has a 26m hearing range and triggers a fast chase if within 26m
      this.triggerSoundAlert(1.6, 26.0);
    }
  }

  public toggleHideInNearestSpot(): boolean {
    if (this.gameState !== 'playing') return false;
    if (this.activeHidingSpot) {
      this.exitHidingSpot();
      return true;
    }
    if (this.nearbyHidingSpot) {
      this.enterHidingSpot(this.nearbyHidingSpot);
      return true;
    }
    return false;
  }

  public enterHidingSpot(spot: HaveliHidingSpot) {
    const cam = xb.core.camera as THREE.PerspectiveCamera | undefined;
    if (!cam) return;
    cam.getWorldPosition(_playerWorldPos);
    const curLocalX = _playerWorldPos.x - this.mansionRoot.position.x;
    const curLocalZ = _playerWorldPos.z - this.mansionRoot.position.z;

    // STEALTH PROTECTION RULE:
    // Make the player 100% undetectable to Rukmini unless Rukmini was within 3 meters
    // AND actively chasing the player at the exact moment they entered the hiding spot.
    let wasCompromised = false;
    if (this.witchModel) {
      const wPos = this.witchModel.root.position;
      const distToWitchAtEntry = Math.hypot(
        wPos.x - curLocalX,
        wPos.y - this.playerFloorY,
        wPos.z - curLocalZ,
      );
      if (distToWitchAtEntry <= 3.0 && this.witchHuntMode !== 'patrol') {
        wasCompromised = true;
      }
    }

    this.compromisedInHiding = wasCompromised;
    this.activeHidingSpot = spot;
    this.nearbyHidingSpot = null;
    spot.isOccupied = true;
    spot.openPulse = 1.0;

    // Lock player movement and set player noise output to 0 dB
    this.moveInput.forward = false;
    this.moveInput.backward = false;
    this.moveInput.left = false;
    this.moveInput.right = false;
    this.moveInput.sprint = false;
    this.moveInput.joySprint = false;
    this.autoSprintActive = false;
    this.moveInput.joyX = 0;
    this.moveInput.joyY = 0;
    this.velocityY = 0;
    this.jumpOffsetY = 0;
    this.isGrounded = true;
    this.currentNoiseDb = 0;
    this.isPlayerMakingSound = false;
    this.loudActionTimer = 0;
    this.playerSilenceTimer = 99;

    if (!wasCompromised) {
      // Player entered unseen/unheard beyond 3m -> Rukmini loses the trail immediately
      this.witchHuntMode = 'patrol';
      this.witchAlertLevel = 0;
      this.witchSpeed = 1.45;
      this.witchPath = [];
    } else {
      // Rukmini was within 3m and actively chasing when the player climbed in!
      this.witchHeardSoundPos.set(spot.exitPos.x, spot.floorY, spot.exitPos.z);
      this.witchTargetPos.copy(this.witchHeardSoundPos);
    }

    // Smoothly transition camera from current room position into spot.hideViewPos
    this.hideTransitionMode = 'entering';
    this.hideTransitionT = 0;
    this.hideTransitionStartPos.set(curLocalX, this.playerFloorY, curLocalZ);
    this.hideTransitionTargetPos.set(
      spot.hideViewPos.x,
      spot.floorY,
      spot.hideViewPos.z,
    );
    this.hideTransitionStartYaw = this.cameraYaw;
    const angleDiff = Math.atan2(
      Math.sin(spot.lookYaw - this.cameraYaw),
      Math.cos(spot.lookYaw - this.cameraYaw),
    );
    this.hideTransitionTargetYaw = this.cameraYaw + angleDiff;
    this.cameraPitch = THREE.MathUtils.clamp(this.cameraPitch, -0.35, 0.35);

    if (this.playerArms) {
      this.playerArms.group.visible = false;
    }
    this.synth.playHideTransitionSound(spot.animType, true);

    this.taskStatusText =
      this.lang === 'hi'
        ? `छुपे हुए (0 dB): ${spot.nameHi} — बाहर निकलने के लिए E दबाएँ`
        : `Hidden Inside (0 dB): ${spot.nameEn} — Press E to Exit`;

    if (wasCompromised) {
      this.onChatLog?.(
        this.lang === 'hi'
          ? `⚠️ सावधान! जब तुम '${spot.nameHi}' में छुपे, रुक्मिणी 3 मीटर के अंदर तुम्हारा पीछा कर रही थी!`
          : `⚠️ DANGER! Rukmini was within 3 meters and actively chasing you when you entered the ${spot.nameEn}!`,
      );
    } else {
      this.onChatLog?.(
        this.lang === 'hi'
          ? `🕵️ तुम '${spot.nameHi}' के अंदर छुप गए (आवाज़: 0 dB — 100% सुरक्षित)। झरोखे/दरार से बाहर देखो और बाहर निकलने के लिए E दबाओ।`
          : `🕵️ Hidden inside ${spot.nameEn} (Noise: 0 dB — 100% undetectable). Peek outside and press E to exit.`,
      );
    }
    this.onHudUpdate?.();
  }

  public exitHidingSpot() {
    if (!this.activeHidingSpot) return;
    const spot = this.activeHidingSpot;
    spot.isOccupied = false;
    spot.openPulse = 1.0;
    this.activeHidingSpot = null;
    this.compromisedInHiding = false;

    const cam = xb.core.camera as THREE.PerspectiveCamera | undefined;
    const curLocalX = cam
      ? _playerWorldPos.x - this.mansionRoot.position.x
      : spot.hideViewPos.x;
    const curLocalZ = cam
      ? _playerWorldPos.z - this.mansionRoot.position.z
      : spot.hideViewPos.z;

    // Smoothly transition camera from inside the hiding spot back out to spot.exitPos
    this.hideTransitionMode = 'exiting';
    this.hideTransitionT = 0;
    this.hideTransitionStartPos.set(curLocalX, spot.floorY, curLocalZ);
    this.hideTransitionTargetPos.set(
      spot.exitPos.x,
      spot.floorY,
      spot.exitPos.z,
    );
    this.hideTransitionStartYaw = this.cameraYaw;
    this.hideTransitionTargetYaw = this.cameraYaw;
    this.playerFloorY = spot.floorY;

    if (this.playerArms) {
      this.playerArms.group.visible = true;
    }
    this.synth.playHideTransitionSound(spot.animType, false);
    this.onChatLog?.(
      this.lang === 'hi'
        ? `👁️ तुम '${spot.nameHi}' से बाहर कमरे में निकल आए।`
        : `👁️ You smoothly exited the ${spot.nameEn} back into the room.`,
    );
    this.updateEscapeTaskStatus();
    this.onHudUpdate?.();
  }

  public isMovementLockedByEntrySequence(): boolean {
    return (
      this.entryPhase !== 'exterior_walk' &&
      this.entryPhase !== 'courtyard_approach' &&
      this.entryPhase !== 'mission_active'
    );
  }

  public pauseGame() {
    if (this.gameState !== 'playing') return;
    this.gameState = 'paused';
    this.synth.stopPanickedBreathing(true);
    this.synth.stopSequenceSpeech();
    this.synth.stopStormRainAudio();
    this.moveInput.forward = false;
    this.moveInput.backward = false;
    this.moveInput.left = false;
    this.moveInput.right = false;
    this.moveInput.sprint = false;
    this.moveInput.joySprint = false;
    this.autoSprintActive = false;
    this.moveInput.joyX = 0;
    this.moveInput.joyY = 0;
    this.lookInput.turnLeft = false;
    this.lookInput.turnRight = false;
    this.releaseGamePointerLock();
    this.onPauseToggle?.(true);
  }

  public resumeGame() {
    if (this.gameState !== 'paused') return;
    this.gameState = 'playing';
    this.onPauseToggle?.(false);
    this.requestGamePointerLock();
  }

  private setupKeyboardInput() {
    document.addEventListener('pointerlockchange', () => {
      const locked = Boolean(document.pointerLockElement);
      this.isLocked = locked;
      document.body.classList.toggle('pointer-locked', locked);
      if (locked) {
        this.hadPointerLock = true;
        this.isPcMouseDragging = false;
        document.body.classList.remove('pc-mouse-dragging');
      } else if (this.hadPointerLock) {
        this.hadPointerLock = false;
        if (
          !this.suppressNextPointerLockPause &&
          this.gameState === 'playing' &&
          !this.isAnyBlockingOverlayOpen() &&
          this.entryPhase !== 'capture_jumpscare' &&
          this.entryPhase !== 'victory_escape_cutscene'
        ) {
          this.pauseGame();
        }
      }
      this.onPointerLockChange?.(locked);
    });

    window.addEventListener('keydown', (e) => {
      if (this.isHudLayoutEditorOpen) return;
      const code = e.code;
      if (code === 'Escape') {
        e.preventDefault();
        if (this.gameState === 'playing') {
          this.pauseGame();
        } else if (this.gameState === 'paused') {
          this.resumeGame();
        }
        return;
      }

      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      this.resumeSpatialAudio();
      if (this.gameState === 'playing' && this.isMovementLockedByEntrySequence()) {
        return;
      }
      if (code === 'Space') {
        if (this.gameState === 'playing') {
          e.preventDefault();
          this.triggerJump();
        }
        return;
      }
      if (code === 'KeyW' || code === 'ArrowUp') this.moveInput.forward = true;
      if (code === 'KeyS' || code === 'ArrowDown') {
        this.moveInput.backward = true;
        if (this.autoSprintActive) {
          this.autoSprintActive = false;
          this.onHudUpdate?.();
        }
      }
      if (code === 'KeyA') this.moveInput.left = true;
      if (code === 'KeyD') this.moveInput.right = true;
      if (code === 'ArrowLeft') {
        if (this.gameState === 'playing') e.preventDefault();
        this.lookInput.turnLeft = true;
      }
      if (code === 'ArrowRight') {
        if (this.gameState === 'playing') e.preventDefault();
        this.lookInput.turnRight = true;
      }
      if (code === 'ShiftLeft' || code === 'ShiftRight') {
        this.moveInput.sprint = true;
        this.crouchHold = false;
        this.crouchToggle = false;
      }
      if (
        (code === 'ControlLeft' || code === 'ControlRight') &&
        !e.altKey &&
        !e.metaKey
      ) {
        this.crouchHold = true;
        this.moveInput.sprint = false;
        this.autoSprintActive = false;
      }
      if (code === 'KeyC' && !e.repeat && !e.ctrlKey && !e.metaKey) {
        if (this.gameState === 'playing') {
          e.preventDefault();
          this.togglePlayerCrouch();
        }
        return;
      }
      if (code === 'KeyE') {
        if (this.gameState === 'playing') {
          e.preventDefault();
          this.performPrimaryInteract();
        }
        return;
      }
      if (code === 'KeyG') {
        if (this.gameState === 'playing') {
          e.preventDefault();
          this.throwKulhadOrStone();
        }
        return;
      }
      if (code === 'KeyM' && !e.repeat && !e.ctrlKey && !e.metaKey) {
        if (
          this.gameState === 'playing' &&
          this.entryPhase !== 'capture_jumpscare' &&
          this.entryPhase !== 'victory_escape_cutscene'
        ) {
          e.preventDefault();
          this.toggleMinimapExpanded();
        }
        return;
      }
      if (code === 'KeyF') {
        if (this.gameState === 'playing') {
          e.preventDefault();
          this.useBlessedBhabhut();
        }
        return;
      }
      if (code === 'Enter' || code === 'NumpadEnter') {
        if (this.gameState === 'playing') {
          this.interactNearestObject();
        }
      }
    });

    const isInteractiveUiTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest(
          'button, input, select, textarea, a, .modal-card, .modal-backdrop, .ig-settings-card, #joystick-zone, #joystick, .joystick-base, .controls-overlay, .hud-autosprint-slot, .hud-backpack-slot, .hud-backpack-drawer, .hud-circle-slot, .hud-radar-btn, .hud-map-icon-btn, #hud-ctrl-minimap, #hud-minimap-container, #hud-layout-editor-overlay, .lobby-3d-stage, #menu-screen, #story-screen, #launch-sequence-overlay',
        ),
      );
    };

    // Enable First-Person Pointer Lock & Left-Mouse-Button Drag Fallback when clicking anywhere on the 3D canvas
    window.addEventListener('pointerdown', (e: PointerEvent) => {
      this.resumeSpatialAudio();
      if (this.gameState !== 'playing' || this.isAnyBlockingOverlayOpen()) {
        return;
      }
      // Keep touch gestures exclusively for Mobile Touch HUD & Right-Half Touch Look
      if (e.pointerType === 'touch') return;
      if (e.button !== 0) return;
      if (isInteractiveUiTarget(e.target)) return;

      const isPointerLocked = this.isPointerLockActive();

      this.hasLastMouse = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.pcDragMovedDist = 0;

      if (isPointerLocked) {
        this.interactNearestObject(true);
      } else {
        this.isPcMouseDragging = true;
        document.body.classList.add('playing-match', 'pc-mouse-dragging');
        // Request Pointer Lock on PC mouse click (unless user explicitly forced Mobile Touch mode)
        if (this.controlsMode !== 'mobile') {
          this.requestGamePointerLock(true);
        }
      }
    });

    window.addEventListener('pointerup', (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      if (this.isPcMouseDragging) {
        const wasShortClick = this.pcDragMovedDist < 6;
        this.isPcMouseDragging = false;
        document.body.classList.remove('pc-mouse-dragging');
        if (
          wasShortClick &&
          this.gameState === 'playing' &&
          !this.isAnyBlockingOverlayOpen() &&
          !isInteractiveUiTarget(e.target)
        ) {
          this.interactNearestObject(true);
        }
      }
    });

    window.addEventListener('pointercancel', () => {
      this.isPcMouseDragging = false;
      document.body.classList.remove('pc-mouse-dragging');
    });

    // Immediately lock mouse on mousedown anywhere on the 3D canvas (no preventDefault so Pointer Lock is never blocked)
    window.addEventListener('mousedown', (e: MouseEvent) => {
      if (this.gameState !== 'playing' || this.isAnyBlockingOverlayOpen()) {
        return;
      }
      if (e.button !== 0) return;
      if (this.controlsMode === 'mobile') return;
      if (isInteractiveUiTarget(e.target)) return;
      if (!document.pointerLockElement) {
        this.requestGamePointerLock(true);
      }
    });

    window.addEventListener('click', (e: MouseEvent) => {
      if (this.gameState !== 'playing' || this.isAnyBlockingOverlayOpen()) {
        return;
      }
      if (this.controlsMode === 'mobile') return;
      if (isInteractiveUiTarget(e.target)) return;
      if (!document.pointerLockElement) {
        this.requestGamePointerLock(true);
      }
    });

    // Full 360-degree PC mouse look on document mousemove:
    // 1) Pointer Lock active (isLocked / document.pointerLockElement): free rotation with NO mouse button held
    // 2) Smooth Left-Mouse-Button drag fallback ONLY when not locked (e.g., restricted iframe)
    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.gameState !== 'playing' || this.isAnyBlockingOverlayOpen()) {
        return;
      }
      if (this.isMovementLockedByEntrySequence()) return;

      const locked = this.isLocked || Boolean(document.pointerLockElement);
      if (locked) {
        const dx = THREE.MathUtils.clamp(e.movementX || 0, -220, 220);
        const dy = THREE.MathUtils.clamp(e.movementY || 0, -220, 220);
        this.applyCameraLookDelta(dx, dy, 0.0022);
        return;
      }

      // Fallback ONLY when Pointer Lock is not active: hold Left Mouse Button and drag on canvas
      if (this.isPcMouseDragging) {
        if ((e.buttons & 1) === 0) {
          this.isPcMouseDragging = false;
          document.body.classList.remove('pc-mouse-dragging');
          return;
        }
        const rawDx = this.hasLastMouse
          ? e.clientX - this.lastMouseX
          : e.movementX || 0;
        const rawDy = this.hasLastMouse
          ? e.clientY - this.lastMouseY
          : e.movementY || 0;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.hasLastMouse = true;
        this.pcDragMovedDist += Math.hypot(rawDx, rawDy);
        const dx = THREE.MathUtils.clamp(rawDx, -220, 220);
        const dy = THREE.MathUtils.clamp(rawDy, -220, 220);
        this.applyCameraLookDelta(dx, dy, 0.0036);
      }
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') this.moveInput.forward = false;
      if (code === 'KeyS' || code === 'ArrowDown')
        this.moveInput.backward = false;
      if (code === 'KeyA') this.moveInput.left = false;
      if (code === 'KeyD') this.moveInput.right = false;
      if (code === 'ArrowLeft') this.lookInput.turnLeft = false;
      if (code === 'ArrowRight') this.lookInput.turnRight = false;
      if (code === 'ShiftLeft' || code === 'ShiftRight')
        this.moveInput.sprint = false;
      if (code === 'ControlLeft' || code === 'ControlRight')
        this.crouchHold = false;
    });

    window.addEventListener('blur', () => {
      this.moveInput.forward = false;
      this.moveInput.backward = false;
      this.moveInput.left = false;
      this.moveInput.right = false;
      this.moveInput.sprint = false;
      this.moveInput.joySprint = false;
      this.autoSprintActive = false;
      this.crouchHold = false;
      this.moveInput.joyX = 0;
      this.moveInput.joyY = 0;
      this.lookInput.turnLeft = false;
      this.lookInput.turnRight = false;
      this.hasLastMouse = false;
      this.isPcMouseDragging = false;
      document.body.classList.remove('pc-mouse-dragging');
    });
  }

  /**
   * STEP 2: Trigger Watchman Baba's warning at the outer gate, friends' insistence,
   * and the ~6-second in-game 3D mini camera cutscene showing the Guardhouse key & Courtyard Well,
   * followed by opening the outer iron gate.
   */
  public triggerWatchmanWarningAndKeyHint() {
    if (this.watchmanWarned || this.entryPhase !== 'exterior_walk') return;
    void this.runGuardEncounterSequence();
  }

  private clearMoveInputs() {
    this.moveInput.forward = false;
    this.moveInput.backward = false;
    this.moveInput.left = false;
    this.moveInput.right = false;
    this.moveInput.sprint = false;
    this.moveInput.joySprint = false;
    this.autoSprintActive = false;
    this.moveInput.joyX = 0;
    this.moveInput.joyY = 0;
  }

  private async runGuardEncounterSequence() {
    if (this.entryPhase !== 'exterior_walk' || !this.haveli) return;
    const token = ++this.entrySequenceToken;
    this.watchmanWarned = true;
    this.entryPhase = 'guard_dialogue';
    this.clearMoveInputs();
    this.isPlayerMakingSound = false;
    this.currentNoiseDb = 0;

    // Position the 3 companions neatly beside/behind the player at the Outer Iron Gate (z = 34.0)
    const cam = xb.core.camera as THREE.PerspectiveCamera | undefined;
    if (cam) {
      cam.getWorldPosition(_playerWorldPos);
      const curLocalX = _playerWorldPos.x - this.mansionRoot.position.x;
      const curLocalZ = Math.max(35.2, _playerWorldPos.z - this.mansionRoot.position.z);
      this.mansionRoot.position.x = _playerWorldPos.x - THREE.MathUtils.clamp(curLocalX, -1.6, 1.6);
      this.mansionRoot.position.z = _playerWorldPos.z - curLocalZ;
      this.cameraYaw = -0.35;
      this.cameraPitch = 0.02;

      const gatePos = [
        { x: -1.15, z: curLocalZ + 1.1 },
        { x: 0.95, z: curLocalZ + 1.25 },
        { x: -0.1, z: curLocalZ + 1.9 },
      ];
      this.companionFriends.forEach((comp, idx) => {
        const gp = gatePos[idx];
        if (!gp) return;
        comp.char.root.visible = true;
        comp.char.root.position.set(gp.x, 0, gp.z);
        comp.char.root.rotation.y = Math.atan2(2.45 - gp.x, 35.0 - gp.z);
        comp.currentSpeed = 0;
      });
    }

    // Line 1: Guard warns the 4 friends
    this.entrySubtitleRukmini = false;
    this.entrySubtitleSpeaker = 'चौकीदार बाबा (Watchman Baba)';
    this.entrySubtitleText = 'अंदर मत जाओ बच्चों! इस हवेली में मौत का साया है!';
    this.onChatLog?.('[चौकीदार बाबा]: "अंदर मत जाओ बच्चों! इस हवेली में मौत का साया है!"');
    this.onHudUpdate?.();

    await this.synth.speakSequenceUtterance(
      'अंदर मत जाओ बच्चों! इस हवेली में मौत का साया है!',
      'watchman',
      {
        rateMultiplier: 1.0,
        cancelPrevious: true,
        maxWaitMs: 8000,
        speakerName: this.entrySubtitleSpeaker,
      },
    );
    if (token !== this.entrySequenceToken || this.gameState !== 'playing') return;

    // Line 2: Friends insist on taking shelter from the storm
    this.entrySubtitleSpeaker = 'कबीर (Kabir)';
    this.entrySubtitleText =
      'बाबा, बाहर तूफ़ान बहुत तेज़ है और गाड़ी खराब हो गई है... हमें अंदर जाना ही होगा!';
    this.onChatLog?.(
      '[कबीर]: "बाबा, बाहर तूफ़ान बहुत तेज़ है और गाड़ी खराब हो गई है... हमें अंदर जाना ही होगा!"',
    );
    this.onHudUpdate?.();

    await this.synth.speakSequenceUtterance(
      'बाबा, बाहर तूफ़ान बहुत तेज़ है और गाड़ी खराब हो गई है, हमें अंदर जाना ही होगा!',
      'kabir',
      {
        rateMultiplier: 1.0,
        cancelPrevious: false,
        maxWaitMs: 9000,
        speakerName: this.entrySubtitleSpeaker,
      },
    );
    if (token !== this.entrySequenceToken || this.gameState !== 'playing') return;

    // Mini Camera Cutscene: Pan cleanly in open air to the Shiva Temple & Key (Shot 1), then Courtyard Stone Well (Shot 2)
    this.isMiniCutsceneActive = true;
    this.entryPhase = 'guard_cutscene_key';
    this.entryAnimElapsed = 0;
    this.haveli.mansionKeyGroup.position.set(9.55, 0.98, 27.2);
    this.haveli.mansionKeyGroup.visible = true;

    // Shot 1: Open Royal Forecourt air west of the Shiva Temple (y = 2.2),
    // cleanly clear of walls/roof beams, framing the carved Shiva Temple Shikhar, Shivling & glowing key pedestal (9.55, 0.98, 27.2)
    this.entryCutsceneCamStart.set(4.4, 2.2, 29.4);
    this.entryCutsceneCamEnd.set(6.2, 2.2, 27.8);
    this.entryCutsceneLookStart.set(11.4, 1.9, 27.2);
    this.entryCutsceneLookEnd.set(9.55, 1.08, 27.2);

    this.entrySubtitleSpeaker = 'चौकीदार बाबा (Watchman Baba)';
    this.entrySubtitleText =
      'हवेली के अंदर जाने की चाबी वहां शिव मंदिर के पास मिल जाएगी, जाओ ले लो!';
    this.onChatLog?.(
      '[चौकीदार बाबा]: "हवेली के अंदर जाने की चाबी वहां शिव मंदिर के पास मिल जाएगी, जाओ ले लो!"',
    );
    this.onHudUpdate?.();

    const keyWait = new Promise<void>((r) => window.setTimeout(r, 3200));
    await Promise.all([
      keyWait,
      this.synth.speakSequenceUtterance(
        'हवेली के अंदर जाने की चाबी वहां शिव मंदिर के पास मिल जाएगी, जाओ ले लो!',
        'watchman',
        {
          rateMultiplier: 1.0,
          cancelPrevious: false,
          maxWaitMs: 10500,
          speakerName: this.entrySubtitleSpeaker,
        },
      ),
    ]);
    if (token !== this.entrySequenceToken || this.gameState !== 'playing') return;

    // Shot 2: Clean open-air sweep inside the massive 36m x 30m Walled Back Well Courtyard (x in [-18, 18], z in [-76, -46])
    // at eye height y = 2.2, well clear of courtyard walls and pulley piers, looking directly at the ornate burning well (0, 0, -61.0)
    this.entryPhase = 'guard_cutscene_well';
    this.entryAnimElapsed = 0;
    this.entryCutsceneCamStart.set(5.4, 2.2, -53.2);
    this.entryCutsceneCamEnd.set(-4.8, 2.2, -53.6);
    this.entryCutsceneLookStart.set(0, 1.5, -61.0);
    this.entryCutsceneLookEnd.set(0, 1.15, -61.0);

    this.entrySubtitleText =
      'और अगर अंदर कुछ अनहोनी हो जाए, तो रुक्मिणी की सभी शापित चीज़ें ढूंढकर उस कुएं में जला देना, तभी वहां से ज़िंदा बाहर निकल पाओगे!';
    this.onChatLog?.(
      '[चौकीदार बाबा]: "और अगर अंदर कुछ अनहोनी हो जाए, तो रुक्मिणी की सभी शापित चीज़ें ढूंढकर उस कुएं में जला देना, तभी वहां से ज़िंदा बाहर निकल पाओगे!"',
    );
    this.onHudUpdate?.();

    const wellWait = new Promise<void>((r) => window.setTimeout(r, 3600));
    await Promise.all([
      wellWait,
      this.synth.speakSequenceUtterance(
        'और अगर अंदर कुछ अनहोनी हो जाए, तो रुक्मिणी की सभी शापित चीज़ें ढूंढकर उस कुएं में जला देना, तभी वहां से ज़िंदा बाहर निकल पाओगे!',
        'watchman',
        {
          rateMultiplier: 1.0,
          cancelPrevious: false,
          maxWaitMs: 15000,
          speakerName: this.entrySubtitleSpeaker,
        },
      ),
    ]);
    if (token !== this.entrySequenceToken || this.gameState !== 'playing') return;

    // Restore player camera right outside the open Outer Iron Gate (z = 34.0) facing the 24m Royal Front Forecourt!
    this.isMiniCutsceneActive = false;
    this.entrySubtitleSpeaker = '';
    this.entrySubtitleText = '';

    if (cam) {
      cam.getWorldPosition(_playerWorldPos);
      this.mansionRoot.position.x = _playerWorldPos.x - 0.0;
      this.mansionRoot.position.z = _playerWorldPos.z - 35.5;
      this.mansionRoot.position.y = 0;
      cam.position.set(_playerWorldPos.x, 1.75, _playerWorldPos.z);
      this.cameraYaw = 0;
      this.cameraPitch = 0;
      cam.rotation.order = 'YXZ';
      cam.rotation.set(0, 0, 0);
      cam.updateMatrixWorld(true);
    }

    const frontGate = this.haveli.doors.find(
      (d) => d.id === 'door_front_iron_gate',
    );
    if (frontGate) {
      frontGate.isOpen = true;
      frontGate.targetAngle = frontGate.openAngle;
      this.synth.playDoorCreak();
    }

    this.blessedBhabhutCount = 1;
    this.entryPhase = 'courtyard_approach';
    this.entrySubtitleRukmini = false;
    this.entrySubtitleSpeaker = 'चौकीदार बाबा (Watchman Baba)';
    this.entrySubtitleText =
      'यह लो मेरी अभिमंत्रित भभूत (पवित्र राख)! अंदर रुक्मिणी पास आए तो F दबाना — एक बार बच जाओगे!';
    this.entrySubtitleTimer = 6.2;
    this.onChatLog?.(
      '[चौकीदार बाबा]: ✨ बाबा ने तुम्हें 1 "अभिमंत्रित भभूत (पवित्र राख)" दी! (खतरे में F दबाएं या 2.5m पर अपने-आप काम करेगी)',
    );
    void this.synth.speakSequenceUtterance(
      'यह लो मेरी अभिमंत्रित भभूत, अंदर रुक्मिणी पास आए तो F दबाना!',
      'watchman',
      {
        rateMultiplier: 1.0,
        cancelPrevious: false,
        maxWaitMs: 9000,
        speakerName: this.entrySubtitleSpeaker,
      },
    );
    this.updateEscapeTaskStatus();
    this.saveProgressToStorage();
    this.onHudUpdate?.();
  }

  /**
   * STEP 3: Triggered when player interacts (E / Click) at the grand wooden Main Haveli Door.
   * Swings the heavy door open and walks all 4 friends together into the Haveli Main Hall.
   */
  private startEnterMainHaveliSequence() {
    if (this.entryPhase !== 'courtyard_approach' || !this.haveli) return;
    const cam = xb.core.camera as THREE.PerspectiveCamera | undefined;
    if (!cam) return;

    const mainDoor = this.haveli.doors.find(
      (d) => d.id === 'door_main_entrance',
    );
    if (mainDoor) {
      mainDoor.isOpen = true;
      mainDoor.targetAngle = mainDoor.openAngle;
    }
    this.synth.playDoorCreak();
    this.clearMoveInputs();

    cam.getWorldPosition(_playerWorldPos);
    this.entryEnterStartLocalX = _playerWorldPos.x - this.mansionRoot.position.x;
    this.entryEnterStartLocalZ = _playerWorldPos.z - this.mansionRoot.position.z;
    this.entryPhase = 'entering_haveli';
    this.entryAnimElapsed = 0;
    this.entrySubtitleTimer = 0;
    this.entrySubtitleText = '';
    this.entrySubtitleSpeaker = '';
    this.taskStatusText = 'सभी दोस्त एक साथ ठाकुर हवेली के अंदर जा रहे हैं...';
    this.onHudUpdate?.();
  }

  /**
   * STEP 4: Once all 4 friends are inside the Main Hall, slam & lock the Main Door shut,
   * play Witch Rukmini's terrifying echoing Hindi voice, trigger 3.5s 100% pitch-black blackout
   * with friend screams and abduct Kabir, Riya, and Dev into chains in 3 separate rooms.
   */
  private async runRukminiSlamAndBlackoutSequence() {
    if (this.blackoutTrapTriggered || !this.haveli) return;
    const token = ++this.entrySequenceToken;
    this.entryPhase = 'rukmini_voice';
    this.clearMoveInputs();

    // 1. Ensure player & 3 companion friends are cleanly inside Room 1 (Main Hall)
    const cam = xb.core.camera as THREE.PerspectiveCamera | undefined;
    if (cam) {
      cam.getWorldPosition(_playerWorldPos);
      this.playerFloorY = 0;
      this.mansionRoot.position.x = _playerWorldPos.x - 0.0;
      this.mansionRoot.position.z = _playerWorldPos.z - 8.2;
      this.mansionRoot.position.y = 0;
      this.cameraYaw = 0;
      this.cameraPitch = 0.03;
      cam.rotation.order = 'YXZ';
      cam.rotation.set(this.cameraPitch, this.cameraYaw, 0);
      cam.updateMatrixWorld(true);
    }

    const hallPos = [
      { x: -1.1, z: 8.6 },
      { x: 1.1, z: 8.6 },
      { x: 0.0, z: 9.05 },
    ];
    this.companionFriends.forEach((comp, idx) => {
      const hp = hallPos[idx];
      if (!hp) return;
      comp.char.root.visible = true;
      comp.char.root.position.set(hp.x, 0, hp.z);
      comp.char.root.rotation.y = Math.PI;
      comp.currentSpeed = 0;
      comp.char.setAnimation('scared');
    });

    // 2. Slam & lock Main Haveli Door behind them!
    const mainDoor = this.haveli.doors.find(
      (d) => d.id === 'door_main_entrance',
    );
    if (mainDoor) {
      mainDoor.isOpen = false;
      mainDoor.targetAngle = 0;
      mainDoor.currentAngle = 0;
      mainDoor.pivot.rotation.y = 0;
    }
    this.synth.playDoorCreak();
    this.synth.playDistantThunder();
    this.cameraShakeIntensity = 0.45;
    this.hitstopTimer = 0.06;

    // 3. Witch Rukmini's terrifying echoing voice across the hall
    this.entrySubtitleRukmini = true;
    this.entrySubtitleSpeaker = 'रक्त-पिशाचिनी रुक्मिणी (Witch Rukmini)';
    this.entrySubtitleText =
      'आ गए... तुम्हारा ही इंतज़ार था! यह हवेली मेरी है... यहां जो भी आएगा, कोई ज़िंदा नहीं बचेगा!';
    this.onChatLog?.(
      '👻 [रक्त-पिशाचिनी रुक्मिणी]: "आ गए... तुम्हारा ही इंतज़ार था! यह हवेली मेरी है... यहां जो भी आएगा, कोई ज़िंदा नहीं बचेगा!"',
    );
    this.onHudUpdate?.();

    await this.synth.playRukminiEchoVoice(
      'आ गए... तुम्हारा ही इंतज़ार था! यह हवेली मेरी है... यहां जो भी आएगा, कोई ज़िंदा नहीं बचेगा!',
    );
    if (token !== this.entrySequenceToken || this.gameState !== 'playing') return;

    // 4. Immediately extinguish ALL lights -> 3.5 seconds 100% pitch-black screen blackout!
    this.entryPhase = 'blackout_abduction';
    this.entryBlackoutElapsed = 0;
    this.entryBlackoutOpacity = 1.0;
    this.isHaveliBlackout = true;
    this.haveli.setBlackoutMode(true);
    if (this.ambientLight) this.ambientLight.intensity = 0;
    if (this.hemiLight) this.hemiLight.intensity = 0;
    if (this.moonKeyLight) this.moonKeyLight.intensity = 0;
    if (this.oppositeDirLight) this.oppositeDirLight.intensity = 0;
    if (this.flashlight) this.flashlight.intensity = 0;

    // Abduct all 3 companion friends & lock them in chains in 3 separate rooms!
    this.friendRescueOrderList = [];
    for (const comp of this.companionFriends) {
      comp.char.root.visible = false;
      comp.isRescuedFollower = false;
      comp.rescueOrder = 0;
      comp.char.setSecondaryTorchEnabled?.(false, 0);
    }
    for (const tf of this.trappedFriends) {
      tf.rescued = false;
      tf.character.boundToPillar = false;
      tf.character.setAnimation('scared');
      tf.character.root.visible = true;
      tf.cageGroup.visible = true;
      tf.padlockGroup.visible = true;
      tf.gateCurrentAngle = 0;
      tf.gateTargetAngle = 0;
      tf.gateRattleOffset = 0;
      tf.gatePivot.rotation.y = 0;
    }

    // Reveal the 3 separate named glowing Jail Keys hidden across the Haveli & Underground Maze
    for (const jk of this.jailKeys) {
      jk.collected = false;
      jk.used = false;
      jk.group.position.copy(jk.basePos);
      jk.group.visible = true;
    }

    // Hide the Main Exit Door Key (हवेली मुख्य द्वार चाबी) inside 3F Room F3-1 Tantrik Library
    this.hasMansionKey = false;
    this.mansionKeyState = 'hidden_in_haveli';
    this.playerArms?.setHoldingKey(false);
    this.haveli.mansionKeyGroup.position.set(-24.0, 10.95, 0.75);
    this.haveli.mansionKeyGroup.visible = true;
    this.blackoutTrapTriggered = true;

    if (this.witchModel) {
      this.witchModel.root.position.set(0, 0, -18.5);
      this.witchHuntMode = 'patrol';
      this.witchAlertLevel = 0;
      this.witchPath = [];
    }

    // Play chains & 3 friends screaming in the pitch-black darkness (chained sequentially so all 3 play cleanly!)
    this.synth.playChainUnlockClank();
    void this.synth.playBlackoutFriendsScreams();
    this.entrySubtitleRukmini = false;
    this.entrySubtitleSpeaker = 'कबीर, रिया और देव (Screaming in Darkness)';
    this.entrySubtitleText = 'बचाओ! अरे अंधेरा हो गया! मुझे कौन खींच रहा है!';
    this.onChatLog?.(
      '⛓️ [कबीर, रिया और देव]: "बचाओ! अरे अंधेरा हो गया! मुझे कौन खींच रहा है!"',
    );
    this.onHudUpdate?.();
  }

  /**
   * Updates the HUD task banner to reflect the player's progress:
   */
  public updateEscapeTaskStatus() {
    if (this.entryPhase === 'exterior_walk') {
      this.taskStatusText =
        'खराब SUV के पास से सभी दोस्तों के साथ लोहे के फाटक की तरफ बढ़ें और चौकीदार बाबा से बात करें (E)!';
      this.onHudUpdate?.();
      return;
    }
    if (!this.blackoutTrapTriggered) {
      this.taskStatusText =
        this.hasMansionKey && this.mansionKeyState === 'carried_courtyard'
          ? '🔑 शिव मंदिर से हवेली प्रवेश चाबी मिल गई! अब दोस्तों के साथ हवेली के मुख्य दरवाज़े (Main Door) पर जाकर E दबाएँ!'
          : 'बाहरी लोहे का फाटक खुल गया! पहले आँगन में दाईं ओर शिव मंदिर के पास से हवेली प्रवेश चाबी (E) उठाओ!';
      this.onHudUpdate?.();
      return;
    }

    if (this.isWellDoorLockedForRespawn) {
      this.taskStatusText = this.hasWellCourtyardKey
        ? `🔑 कुएं के आंगन की चाबी मिल गई! बंद दरवाज़े पर E दबाकर हवेली में वापस जाओ! (शेष जीवन: ${this.lives}/${this.maxLives})`
        : `🔒 कुएं के आंगन का दरवाज़ा बंद है! कुएं के किनारे चमकती सुनहरी चाबी उठाओ (E)! (शेष जीवन: ${this.lives}/${this.maxLives})`;
      this.onHudUpdate?.();
      return;
    }

    const allFriendsUnchained =
      this.rescuedFriends >= this.totalFriendsToRescue;
    const allRelicsBurned =
      this.curseBroken || this.burnedCount >= this.requiredItems;
    const hasRecoveredKey = this.hasRecoveredMainExitKey();

    if (allRelicsBurned && allFriendsUnchained && hasRecoveredKey) {
      this.taskStatusText =
        '🔓 अभिशाप टूट गया, सभी 3 दोस्त आज़ाद हैं और हवेली मुख्य द्वार चाबी मिल गई! अब मुख्य दरवाज़ा (Main Door) खोलकर बाहर भागें!';
    } else if (allRelicsBurned && allFriendsUnchained && !hasRecoveredKey) {
      this.taskStatusText =
        '🗝️ सभी 4 निशानियाँ भस्म और 3 दोस्त आज़ाद हैं! अब बाहर भागने के लिए "हवेली मुख्य द्वार चाबी (Main Exit Door Key)" ढूँढो (3F-1 तांत्रिक पुस्तकालय)!';
    } else if (allRelicsBurned && !allFriendsUnchained) {
      const keyPart = hasRecoveredKey
        ? ''
        : ' + मुख्य द्वार चाबी भी ढूँढें!';
      this.taskStatusText =
        `🔥 रुक्मिणी भस्म हो गई! पहले जेल की चाबियाँ ढूँढकर बचे दोस्तों को जेल से आज़ाद करें (${this.rescuedFriends}/${this.totalFriendsToRescue})${keyPart}`;
    } else {
      const keyStatus = hasRecoveredKey
        ? 'मुख्य द्वार चाबी: मिल गई 🗝️'
        : 'मुख्य द्वार चाबी: 3F-1 पुस्तकालय में छुपी';
      const rageTag =
        this.burnedCount === 1
          ? ' | ⚡ क्रोध चरण 1/4 (+10% गति)'
          : this.burnedCount === 2
            ? ' | 🔴 क्रोध चरण 2/4 (+20% गति)'
            : this.burnedCount === 3
              ? ' | 🩸 अंतिम क्रोध 3/4 (+30% गति)'
              : '';
      this.taskStatusText = `जेल से आज़ाद दोस्त: ${this.rescuedFriends}/${this.totalFriendsToRescue} | कुएँ में जलाईं: ${this.burnedCount}/${this.requiredItems} | ${keyStatus}${rageTag}`;
    }
    this.onHudUpdate?.();
  }

  /**
   * Compatibility alias if invoked directly (jumps into Step 4 slam & blackout).
   */
  public triggerBlackoutEntryTrap() {
    if (this.blackoutTrapTriggered) return;
    void this.runRukminiSlamAndBlackoutSequence();
  }

  /**
   * Returns the Haveli door the player is actively looking at within interaction range:
   * - Interior room doors (all 3 floors & 10-room underground maze): strictly within 2.3m while looking at the door leaf or threshold.
   * - Special exterior gates / main entrance: generous reach to preserve entry/escape cutscenes.
   */
  private findLookedAtDoor(fromXrRay = false): HaveliDoor | null {
    if (!this.haveli) return null;
    const cam = xb.core.camera as THREE.Camera | undefined;
    if (!cam) return null;

    cam.getWorldPosition(_playerWorldPos);
    cam.getWorldDirection(_forwardDir);

    let bestDoor: HaveliDoor | null = null;
    let bestScore = -Infinity;

    for (const d of this.haveli.doors) {
      if (d.archwayOnly) continue;
      if (Math.abs(d.floorY - this.playerFloorY) > 1.8) continue;

      _doorWorldPos.copy(d.position).add(this.mansionRoot.position);

      if (d.isRoomDoor) {
        const maxDist = fromXrRay ? 2.8 : 2.3;
        d.pivot.getWorldPosition(_doorHingeWorldPos);
        if (d.leafTipNode) {
          d.leafTipNode.getWorldPosition(_doorTipWorldPos);
        } else {
          _doorTipWorldPos.copy(_doorWorldPos);
        }
        if (d.leafCenterNode) {
          d.leafCenterNode.getWorldPosition(_doorLeafCenterWorldPos);
        } else {
          _doorLeafCenterWorldPos.copy(_doorWorldPos);
        }

        // Closest point on the hinged wooden door leaf segment (hinge -> brass ring handle)
        const segX = _doorTipWorldPos.x - _doorHingeWorldPos.x;
        const segZ = _doorTipWorldPos.z - _doorHingeWorldPos.z;
        const segLenSq = segX * segX + segZ * segZ;
        const segT =
          segLenSq > 1e-4
            ? THREE.MathUtils.clamp(
                ((_playerWorldPos.x - _doorHingeWorldPos.x) * segX +
                  (_playerWorldPos.z - _doorHingeWorldPos.z) * segZ) /
                  segLenSq,
                0,
                1,
              )
            : 0.5;
        const clampedEyeY = THREE.MathUtils.clamp(
          _playerWorldPos.y,
          d.floorY + 0.5,
          d.floorY + 2.65,
        );
        _doorClosestPoint.set(
          _doorHingeWorldPos.x + segX * segT,
          clampedEyeY,
          _doorHingeWorldPos.z + segZ * segT,
        );

        const leafDist = Math.hypot(
          _playerWorldPos.x - _doorClosestPoint.x,
          _playerWorldPos.z - _doorClosestPoint.z,
        );
        const frameDist = Math.hypot(
          _playerWorldPos.x - _doorWorldPos.x,
          _playerWorldPos.z - _doorWorldPos.z,
        );
        const dist = Math.min(leafDist, frameDist);
        if (dist > maxDist) continue;

        let bestDot = -1;
        for (const pt of [
          _doorClosestPoint,
          _doorLeafCenterWorldPos,
          _doorTipWorldPos,
          _doorWorldPos,
        ]) {
          _toItemDir.copy(pt).sub(_playerWorldPos);
          if (_toItemDir.lengthSq() < 1e-5) {
            bestDot = 1;
            break;
          }
          _toItemDir.normalize();
          const dot = _forwardDir.dot(_toItemDir);
          if (dot > bestDot) bestDot = dot;
        }

        if (bestDot < 0.58) continue;

        const score = bestDot * 3.0 - dist * 0.55;
        if (score > bestScore) {
          bestScore = score;
          bestDoor = d;
        }
      } else {
        // Exterior Iron Gate, Main Palace Door, Back Courtyard Door
        const maxDist = fromXrRay ? 4.8 : 3.6;
        const dist = _playerWorldPos.distanceTo(_doorWorldPos);
        if (dist > maxDist) continue;
        _toItemDir.copy(_doorWorldPos).sub(_playerWorldPos).normalize();
        const dot = _forwardDir.dot(_toItemDir);
        if (dot < 0.45 && dist > 2.3) continue;
        const score = dot * 2.4 - dist * 0.4;
        if (score > bestScore) {
          bestScore = score;
          bestDoor = d;
        }
      }
    }

    return bestDoor;
  }

  /**
   * Checks whether the center crosshair dot is pointing at an interactive target
   * (Watchman Baba, Mansion Key, Trapped Friend, Cursed Relic, Door, or Well).
   */
  private checkCenterCrosshairTarget(cam: THREE.Camera): boolean {
    this.entryCrosshairPrompt = '';
    if (this.isMovementLockedByEntrySequence()) {
      return false;
    }

    cam.getWorldPosition(_playerWorldPos);
    cam.getWorldDirection(_forwardDir);

    const reachDist = 4.6;

    // Check Watchman Baba / Outer Gate before Step 2 cutscene
    if (this.entryPhase === 'exterior_walk' && this.chowkidar) {
      this.chowkidar.root.getWorldPosition(_relicPos);
      _relicPos.y += 1.2;
      const wDist = _playerWorldPos.distanceTo(_relicPos);
      if (wDist <= 5.2) {
        _toItemDir.copy(_relicPos).sub(_playerWorldPos).normalize();
        if (_forwardDir.dot(_toItemDir) >= 0.55 || wDist <= 3.5) {
          this.entryCrosshairPrompt =
            this.lang === 'hi'
              ? '🗣️ चौकीदार बाबा से बात करें (E)'
              : '🗣️ Talk to Watchman (E)';
          return true;
        }
      }
    }

    // Check Main Mansion Door before Step 3 entry (strictly locked until Shiva Temple key is picked up)
    if (this.entryPhase === 'courtyard_approach' && this.haveli) {
      const mainDoor = this.haveli.doors.find((d) => d.id === 'door_main_entrance');
      if (mainDoor) {
        _doorWorldPos.copy(mainDoor.position).add(this.mansionRoot.position);
        const doorDist = _playerWorldPos.distanceTo(_doorWorldPos);
        if (doorDist <= reachDist) {
          _toItemDir.copy(_doorWorldPos).sub(_playerWorldPos).normalize();
          if (_forwardDir.dot(_toItemDir) >= 0.55 || doorDist <= 3.2) {
            const hasEntranceKey =
              this.hasMansionKey && this.mansionKeyState === 'carried_courtyard';
            this.entryCrosshairPrompt = hasEntranceKey
              ? this.lang === 'hi'
                ? '🔓 हवेली का मुख्य दरवाज़ा खोलें (E)'
                : '🔓 Unlock & Open Main Haveli Door (E)'
              : this.lang === 'hi'
                ? '🔒 दरवाज़ा बंद है — शिव मंदिर के पास से चाबी लाएं'
                : '🔒 Locked — Get Haveli Key from Shiva Temple';
            return true;
          }
        }
      }
    }

    // Check Glowing Well Courtyard Escape Key (spawned near the Cursed Well after a respawn)
    if (
      this.haveli &&
      this.haveli.wellCourtyardKeyGroup.visible &&
      this.isWellDoorLockedForRespawn &&
      !this.hasWellCourtyardKey
    ) {
      this.haveli.wellCourtyardKeyGroup.getWorldPosition(_relicPos);
      if (Math.abs(_relicPos.y - this.playerFloorY) <= 2.4) {
        const wellKeyDist = _playerWorldPos.distanceTo(_relicPos);
        if (wellKeyDist <= reachDist) {
          _toItemDir.copy(_relicPos).sub(_playerWorldPos).normalize();
          if (_forwardDir.dot(_toItemDir) >= 0.62 || wellKeyDist <= 2.8) {
            this.entryCrosshairPrompt =
              this.lang === 'hi'
                ? '🔑 कुएं के आंगन की चाबी (Well Courtyard Key) — आंगन का बंद दरवाज़ा खोलने के लिए [E]'
                : '🔑 Well Courtyard Key (कुएं के आंगन की चाबी) — Unlocks Courtyard Door [E]';
            return true;
          }
        }
      }
    }

    // Check Haveli Entrance Key (in front of Shiva Temple) OR Main Exit Door Key (in 3F-1 Tantrik Library after Step 4)
    if (
      this.haveli &&
      this.haveli.mansionKeyGroup.visible &&
      (this.blackoutTrapTriggered || this.entryPhase === 'courtyard_approach')
    ) {
      this.haveli.mansionKeyGroup.getWorldPosition(_relicPos);
      if (Math.abs(_relicPos.y - this.playerFloorY) <= 2.4) {
        const keyDist = _playerWorldPos.distanceTo(_relicPos);
        if (keyDist <= reachDist) {
          _toItemDir.copy(_relicPos).sub(_playerWorldPos).normalize();
          if (_forwardDir.dot(_toItemDir) >= 0.62 || keyDist <= 3.0) {
            this.entryCrosshairPrompt = !this.blackoutTrapTriggered
              ? this.lang === 'hi'
                ? '🔑 हवेली प्रवेश चाबी (Haveli Entrance Key) — हवेली में प्रवेश के लिए [E]'
                : '🔑 Haveli Entrance Key (हवेली प्रवेश चाबी) — Unlocks Front Door to Enter [E]'
              : this.lang === 'hi'
                ? '🗝️ हवेली मुख्य द्वार चाबी (Main Exit Door Key) — मुख्य दरवाज़ा खोलकर भागने के लिए [E]'
                : '🗝️ Main Exit Door Key (हवेली मुख्य द्वार चाबी) — Unlocks Main Front Exit Door [E]';
            return true;
          }
        }
      }
    }

    // Check the 3 Separate Named Glowing Jail Keys (Kabir, Riya, Dev)
    if (this.blackoutTrapTriggered) {
      for (const jk of this.jailKeys) {
        if (jk.collected || !jk.group.visible) continue;
        jk.group.getWorldPosition(_relicPos);
        if (Math.abs(_relicPos.y - this.playerFloorY) > 2.4) continue;
        const keyDist = _playerWorldPos.distanceTo(_relicPos);
        if (keyDist <= reachDist) {
          _toItemDir.copy(_relicPos).sub(_playerWorldPos).normalize();
          if (_forwardDir.dot(_toItemDir) >= 0.62 || keyDist <= 3.0) {
            this.entryCrosshairPrompt =
              this.lang === 'hi'
                ? `🔑 ${jk.nameHi} (${jk.nameEn}) — ${jk.purposeHi} [E]`
                : `🔑 ${jk.nameEn} (${jk.nameHi}) — ${jk.purposeEn} [E]`;
            return true;
          }
        }
      }
    }

    // Check Locked Iron-Bar Jail Cells for the 3 Trapped Friends (Kabir, Riya, Dev)
    for (const tf of this.trappedFriends) {
      if (tf.rescued || !tf.cageGroup.visible) continue;
      tf.cageGroup.getWorldPosition(_relicPos);
      if (Math.abs(_relicPos.y - this.playerFloorY) > 2.2) continue;
      _relicPos.y += 1.15;
      const dist = _playerWorldPos.distanceTo(_relicPos);
      if (dist <= reachDist) {
        _toItemDir.copy(_relicPos).sub(_playerWorldPos).normalize();
        const dot = _forwardDir.dot(_toItemDir);
        if (dot >= 0.68 || dist <= 3.4) {
          const hasMatchingKey = this.hasJailKey(tf.requiredKeyId);
          this.entryCrosshairPrompt = hasMatchingKey
            ? this.lang === 'hi'
              ? `🔓 ${tf.nameHi} की लोहे की जेल खोलें (${tf.requiredKeyNameHi}) [E]`
              : `🔓 Unlock ${tf.nameEn}'s Iron Jail Cell (${tf.requiredKeyNameEn}) [E]`
            : this.lang === 'hi'
              ? `🔒 ${tf.nameHi} की जेल बंद है — "${tf.requiredKeyNameHi}" (${tf.requiredKeyNameEn}) चाहिए!`
              : `🔒 ${tf.nameEn}'s Jail is Locked — Requires "${tf.requiredKeyNameEn}" (${tf.requiredKeyNameHi})!`;
          return true;
        }
      }
    }

    // Check Cursed Relics — always show exact Hindi + English name and purpose!
    for (const relic of this.relics) {
      if (relic.collected || !relic.group.visible) continue;
      relic.group.getWorldPosition(_relicPos);
      if (Math.abs(_relicPos.y - this.playerFloorY) > 2.4) continue;
      const dist = _playerWorldPos.distanceTo(_relicPos);
      if (dist <= reachDist) {
        _toItemDir.copy(_relicPos).sub(_playerWorldPos).normalize();
        const dot = _forwardDir.dot(_toItemDir);
        if (dot >= 0.78 || (dist <= 2.6 && dot >= 0.55)) {
          this.entryCrosshairPrompt =
            this.lang === 'hi'
              ? `🔥 ${relic.hindiName} (${relic.index + 1}/${this.requiredItems}) — कुएं में जलाने के लिए [E]`
              : `🔥 ${relic.name} (${relic.hindiName}) (${relic.index + 1}/${this.requiredItems}) — Burn in Well [E]`;
          return true;
        }
      }
    }

    if (this.entryPhase === 'mission_active') {
      for (const item of this.throwables) {
        if (item.collected) continue;
        item.group.getWorldPosition(_relicPos);
        if (Math.abs(_relicPos.y - this.playerFloorY) > 2.2) continue;
        const dist = _playerWorldPos.distanceTo(_relicPos);
        if (dist <= reachDist) {
          _toItemDir.copy(_relicPos).sub(_playerWorldPos).normalize();
          const dot = _forwardDir.dot(_toItemDir);
          if (dot >= 0.78 || (dist <= 2.4 && dot >= 0.55)) {
            this.entryCrosshairPrompt =
              this.carriedThrowables >= this.maxCarriedThrowables
                ? this.lang === 'hi'
                  ? '🪨 जेब भरी (3/3) — G दबाकर फेंकें'
                  : '🪨 Pocket Full (3/3) — Press G to Throw'
                : this.lang === 'hi'
                  ? `🪨 ${item.hindiName} उठाएं (E / Click)`
                  : `🪨 Pick up ${item.englishName} (E / Click)`;
            return true;
          }
        }
      }
    }

    if (this.haveli) {
      const lookedDoor = this.findLookedAtDoor(false);
      if (lookedDoor) {
        if (lookedDoor.id === 'door_main_entrance' && this.blackoutTrapTriggered) {
          const allFriendsFree = this.rescuedFriends >= this.totalFriendsToRescue;
          const allRelicsBurned =
            this.curseBroken || this.burnedCount >= this.requiredItems;
          const hasExitKey = this.hasRecoveredMainExitKey();
          if (allFriendsFree && allRelicsBurned && hasExitKey) {
            this.entryCrosshairPrompt =
              this.lang === 'hi'
                ? '🔓 हवेली मुख्य द्वार चाबी से दरवाज़ा खोलकर भागें [E]'
                : '🔓 Unlock Main Exit Door with Main Exit Door Key & Escape [E]';
          } else if (!hasExitKey && allFriendsFree && allRelicsBurned) {
            this.entryCrosshairPrompt =
              this.lang === 'hi'
                ? '🔒 मुख्य द्वार बंद है — "हवेली मुख्य द्वार चाबी" (Main Exit Door Key) चाहिए!'
                : '🔒 Main Door Locked — Find "Main Exit Door Key" (हवेली मुख्य द्वार चाबी)!';
          } else {
            this.entryCrosshairPrompt =
              this.lang === 'hi'
                ? `🔒 मुख्य द्वार बंद है (दोस्त: ${this.rescuedFriends}/3 | जलाईं: ${this.burnedCount}/${this.requiredItems} | चाबी: ${hasExitKey ? '✓' : '✗'})`
                : `🔒 Main Door Locked (Friends: ${this.rescuedFriends}/3 | Burned: ${this.burnedCount}/${this.requiredItems} | Exit Key: ${hasExitKey ? '✓' : '✗'})`;
          }
        } else if (
          lookedDoor.id === 'door_back_well' &&
          this.isWellDoorLockedForRespawn
        ) {
          this.entryCrosshairPrompt = this.hasWellCourtyardKey
            ? this.lang === 'hi'
              ? '🔓 कुएं के आंगन का दरवाज़ा खोलें (E)'
              : '🔓 Unlock Well Courtyard Door (E)'
            : this.lang === 'hi'
              ? '🔒 दरवाज़ा बंद है — कुएं के पास चाबी ढूंढें (E)'
              : '🔒 Locked — Find Well Courtyard Key (E)';
        } else if (lookedDoor.isRoomDoor) {
          this.entryCrosshairPrompt = '🚪 E';
        }
        return true;
      }

      for (const spot of this.haveli.hidingSpots) {
        if (Math.abs(spot.floorY - this.playerFloorY) > 1.8) continue;
        _doorWorldPos.copy(spot.position).add(this.mansionRoot.position);
        _doorWorldPos.y += 1.0;
        const spotDist = _playerWorldPos.distanceTo(_doorWorldPos);
        if (spotDist <= reachDist) {
          _toItemDir.copy(_doorWorldPos).sub(_playerWorldPos).normalize();
          if (_forwardDir.dot(_toItemDir) >= 0.68 || spotDist <= 2.4) {
            return true;
          }
        }
      }
    }

    if (this.haveli && this.collectedCount > this.burnedCount) {
      for (const wellObj of [
        this.haveli.wellGroup,
        this.haveli.centralCourtyardWell,
      ]) {
        wellObj.getWorldPosition(_relicPos);
        const wellDist = _playerWorldPos.distanceTo(_relicPos);
        if (wellDist <= reachDist + 1.5) {
          _toItemDir.copy(_relicPos).sub(_playerWorldPos).normalize();
          if (_forwardDir.dot(_toItemDir) >= 0.7) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * XR Pinch / Controller select allows rescuing trapped friends, picking up the Mansion Key, opening doors, grabbing relics, or burning them at the well.
   */
  onSelectEnd(_event: xb.SelectEvent) {
    this.resumeSpatialAudio();
    if (this.gameState === 'playing') {
      this.interactNearestObject(true);
    }
  }

  public interactNearestObject(fromXrRay = false) {
    const cam = xb.core.camera as THREE.PerspectiveCamera | undefined;
    if (!cam || !this.haveli) return;
    if (this.isMovementLockedByEntrySequence()) return;

    // If currently inside a traditional Haveli hiding spot, pressing E / Enter / Click exits the hiding spot
    if (this.activeHidingSpot) {
      this.exitHidingSpot();
      return;
    }

    cam.getWorldPosition(_playerWorldPos);
    cam.getWorldDirection(_forwardDir);

    const reachDist = fromXrRay ? 7.5 : 4.6;

    // 0A0. Check if picking up the Glowing Golden Well Courtyard Key (spawned beside the Cursed Well on respawn)
    if (
      this.haveli.wellCourtyardKeyGroup.visible &&
      this.isWellDoorLockedForRespawn &&
      !this.hasWellCourtyardKey
    ) {
      this.haveli.wellCourtyardKeyGroup.getWorldPosition(_relicPos);
      const wellKeyDist = _playerWorldPos.distanceTo(_relicPos);
      if (Math.abs(_relicPos.y - this.playerFloorY) <= 2.4 && wellKeyDist <= 4.4) {
        this.haveli.wellCourtyardKeyGroup.visible = false;
        this.hasWellCourtyardKey = true;
        this.playerArms?.setHoldingKey(true);
        this.playerArms?.triggerPickup();
        this.synth.playRelicChime(true);
        this.hitstopTimer = 0.05;
        this.triggerItemToast(
          this.lang === 'hi'
            ? '🔑 कुएं के आंगन की चाबी (Well Courtyard Key)'
            : '🔑 Well Courtyard Key (कुएं के आंगन की चाबी)',
          this.lang === 'hi'
            ? 'कुएं के आंगन का बंद दरवाज़ा खोलकर हवेली में वापस जाने के लिए'
            : 'Unlocks the locked Well Courtyard door to re-enter the Haveli',
        );
        this.onChatLog?.(
          this.lang === 'hi'
            ? '🔑 तुम्हें कुएं के आंगन की चाबी (Well Courtyard Key) मिल गई! अब बंद दरवाज़े पर E दबाकर हवेली में वापस जाओ!'
            : '🔑 Picked up the Well Courtyard Key! Walk to the locked courtyard door and press E to unlock it!',
        );
        this.updateEscapeTaskStatus();
        this.saveProgressToStorage();
        return;
      }
    }

    // 0A. Check if picking up the Haveli Entrance Key (at Shiva Temple) OR Main Exit Door Key (in 3F-1 Tantrik Library after Step 4)
    if (
      this.haveli.mansionKeyGroup.visible &&
      (this.blackoutTrapTriggered || this.entryPhase === 'courtyard_approach')
    ) {
      this.haveli.mansionKeyGroup.getWorldPosition(_relicPos);
      const keyDist = _playerWorldPos.distanceTo(_relicPos);
      if (Math.abs(_relicPos.y - this.playerFloorY) <= 2.4 && keyDist <= 4.4) {
        this.haveli.mansionKeyGroup.visible = false;
        this.hasMansionKey = true;
        this.playerArms?.setHoldingKey(true);
        this.playerArms?.triggerPickup();
        this.synth.playRelicChime(true);
        this.hitstopTimer = 0.05;

        if (!this.blackoutTrapTriggered) {
          this.mansionKeyState = 'carried_courtyard';
          this.triggerItemToast(
            this.lang === 'hi'
              ? '🔑 हवेली प्रवेश चाबी (Haveli Entrance Key)'
              : '🔑 Haveli Entrance Key (हवेली प्रवेश चाबी)',
            this.lang === 'hi'
              ? 'हवेली के मुख्य दरवाज़े पर E दबाकर अंदर प्रवेश करने के लिए'
              : 'Unlocks the Main Haveli Front Door to enter',
          );
          this.onChatLog?.(
            this.lang === 'hi'
              ? '🔑 तुम्हें शिव मंदिर के पास से हवेली प्रवेश चाबी (Haveli Entrance Key) मिल गई! अब हवेली के मुख्य दरवाज़े पर जाकर E दबाओ!'
              : '🔑 You picked up the Haveli Entrance Key in front of the Shiva Temple! Walk to the Main Haveli Door and press E to unlock it!',
          );
        } else {
          this.mansionKeyState = 'recovered_in_haveli';
          this.triggerItemToast(
            this.lang === 'hi'
              ? '🗝️ हवेली मुख्य द्वार चाबी (Main Exit Door Key)'
              : '🗝️ Main Exit Door Key (हवेली मुख्य द्वार चाबी)',
            this.lang === 'hi'
              ? 'अभिशाप तोड़ने व दोस्तों को छुड़ाने के बाद मुख्य द्वार खोलकर भागने के लिए'
              : 'Unlocks the Main Front Exit Door once relics are burned & friends freed',
          );
          this.onChatLog?.(
            this.lang === 'hi'
              ? '🗝️ तुमने तीसरी मंज़िल के तांत्रिक पुस्तकालय (3F-1) से "हवेली मुख्य द्वार चाबी (Main Exit Door Key)" ढूँढ ली!'
              : '🗝️ You found the "Main Exit Door Key (हवेली मुख्य द्वार चाबी)" in the 3F Tantrik Library!',
          );
          this.triggerSoundAlert(0.8);
          if (
            (this.curseBroken || this.burnedCount >= this.requiredItems) &&
            this.rescuedFriends >= this.totalFriendsToRescue
          ) {
            this.unlockMainHaveliDoorForEscape(false);
          }
        }

        this.updateEscapeTaskStatus();
        this.saveProgressToStorage();
        return;
      }
    }

    // 0A1. Check if picking up one of the 3 Separate Named Glowing Jail Keys (Kabir, Riya, Dev)
    if (this.blackoutTrapTriggered) {
      for (const jk of this.jailKeys) {
        if (jk.collected || !jk.group.visible) continue;
        jk.group.getWorldPosition(_relicPos);
        if (Math.abs(_relicPos.y - this.playerFloorY) > 2.4) continue;
        const keyDist = _playerWorldPos.distanceTo(_relicPos);
        if (keyDist <= 4.4) {
          jk.collected = true;
          jk.group.visible = false;
          this.playerArms?.setHoldingKey(true);
          this.playerArms?.triggerPickup();
          this.synth.playRelicChime(true);
          this.hitstopTimer = 0.05;

          this.triggerItemToast(
            this.lang === 'hi'
              ? `🔑 ${jk.nameHi} (${jk.nameEn})`
              : `🔑 ${jk.nameEn} (${jk.nameHi})`,
            this.lang === 'hi' ? jk.purposeHi : jk.purposeEn,
          );
          this.onChatLog?.(
            this.lang === 'hi'
              ? `🔑 तुम्हें "${jk.nameHi} (${jk.nameEn})" मिल गई! — ${jk.purposeHi}!`
              : `🔑 Picked up "${jk.nameEn} (${jk.nameHi})" — ${jk.purposeEn}!`,
          );
          this.triggerSoundAlert(0.75);
          this.updateEscapeTaskStatus();
          this.saveProgressToStorage();
          return;
        }
      }
    }

    // 0B. Check if talking to Watchman Baba at the Outer Gate (Step 2)
    if (this.chowkidar && this.entryPhase === 'exterior_walk') {
      this.chowkidar.root.getWorldPosition(_relicPos);
      const wDist = Math.hypot(
        _playerWorldPos.x - _relicPos.x,
        _playerWorldPos.z - _relicPos.z,
      );
      if (wDist <= 4.8 && !this.watchmanWarned) {
        this.triggerWatchmanWarningAndKeyHint();
        return;
      }
    }

    // 0C. Unlock a Trapped Friend's Rusted Iron-Bar Jail Cell (strictly requires that friend's matching named Jail Key!)
    for (const tf of this.trappedFriends) {
      if (tf.rescued || !tf.cageGroup.visible) continue;
      tf.cageGroup.getWorldPosition(_relicPos);
      if (Math.abs(_relicPos.y - this.playerFloorY) > 2.2) continue;
      const dist = Math.hypot(
        _playerWorldPos.x - _relicPos.x,
        _playerWorldPos.z - _relicPos.z,
      );
      if (dist <= 4.4) {
        const matchingKey = this.jailKeys.find(
          (k) => k.id === tf.requiredKeyId,
        );
        if (!matchingKey || !matchingKey.collected || matchingKey.used) {
          // Strict lock enforcement — cannot unlock without that friend's matching key!
          tf.gateRattleOffset = 0.095;
          this.synth.playChainUnlockClank();
          this.triggerItemToast(
            this.lang === 'hi'
              ? `🔒 ${tf.nameHi} की जेल बंद है!`
              : `🔒 ${tf.nameEn}'s Jail Cell is Locked!`,
            this.lang === 'hi'
              ? `खोलने के लिए "${tf.requiredKeyNameHi} (${tf.requiredKeyNameEn})" ढूंढकर लाएं!`
              : `Find "${tf.requiredKeyNameEn} (${tf.requiredKeyNameHi})" first to unlock!`,
            3.2,
          );
          this.onChatLog?.(
            this.lang === 'hi'
              ? `🔒 ${tf.nameHi} की लोहे की जेल पर भारी ताला लगा है! पहले हवेली/तहखाने में "${tf.requiredKeyNameHi} (${tf.requiredKeyNameEn})" ढूंढें!`
              : `🔒 ${tf.nameEn}'s iron jail gate is locked! You must find "${tf.requiredKeyNameEn} (${tf.requiredKeyNameHi})" first!`,
          );
          return;
        }

        // Consume matching jail key, remove padlock, swing iron jail gate smoothly open (cell stays visible!)
        matchingKey.used = true;
        tf.rescued = true;
        tf.character.root.visible = false;
        tf.padlockGroup.visible = false;
        tf.gateTargetAngle = tf.gateOpenAngle;
        this.rescuedFriends++;
        this.playerArms?.setHoldingKey(this.hasAnyCarriedKey());

        if (!this.friendRescueOrderList.includes(tf.index)) {
          this.friendRescueOrderList.push(tf.index);
        }
        const rescueOrder = this.friendRescueOrderList.indexOf(tf.index) + 1;
        const isFirstRescued = rescueOrder === 1;

        const follower = this.companionFriends[tf.index];
        if (follower) {
          follower.isRescuedFollower = true;
          follower.rescueOrder = rescueOrder;
          follower.currentSpeed = 0;
          follower.navPath = [];
          follower.navPathIdx = 0;
          follower.navTimer = 0;
          follower.stuckTimer = 0;
          follower.lastGoalPos.set(999, 999, 999);
          follower.char.boundToPillar = false;
          follower.char.setAnimation('idle');
          // Step the freed friend smoothly just outside the opened iron jail cell door
          const stepOutDir = new THREE.Vector3(0, 0, 1.55).applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            tf.cageGroup.rotation.y,
          );
          follower.char.root.position
            .copy(tf.cageGroup.position)
            .add(stepOutDir);
          follower.char.root.rotation.copy(tf.cageGroup.rotation);
          follower.char.root.visible = true;
          follower.char.setSecondaryTorchEnabled?.(isFirstRescued, 1.0);
        }

        this.synth.playChainUnlockClank();
        this.synth.playDoorCreak();
        this.synth.playRelicChime(true);
        this.hitstopTimer = 0.05;
        this.playerArms?.triggerPickup();

        const friendId = follower?.id ?? tf.friendId;
        const thankYouLine = isFirstRescued
          ? friendId === 'riya'
            ? 'शुक्रिया! तुमने मेरी जेल खोलकर जान बचा ली! मेरे पास एक छोटी टॉर्च है, मैं पीछे से तुम्हारे साथ रहकर रास्ता दिखाऊँगी!'
            : 'धन्यवाद भाई! तुमने मेरी जेल का ताला खोल दिया! मेरे पास ये टॉर्च है, मैं तुम्हारे पीछे चलकर गलियारा रोशन रखूँगा!'
          : friendId === 'riya'
            ? 'बहुत-बहुत शुक्रिया! मैं चुपचाप तुम्हारे पीछे चलूँगी और रुक्मिणी के पास आने पर आगाह कर दूँगी!'
            : 'शुक्रिया भाई! मैं भी चुपचाप तुम्हारे पीछे आ रहा हूँ, अब सब मिलकर बच निकलेंगे!';

        this.triggerItemToast(
          this.lang === 'hi'
            ? `🔓 ${tf.nameHi} की जेल खुल गई! (${this.rescuedFriends}/${this.totalFriendsToRescue})`
            : `🔓 Unlocked ${tf.nameEn}'s Jail Cell! (${this.rescuedFriends}/${this.totalFriendsToRescue})`,
          this.lang === 'hi'
            ? `${tf.requiredKeyNameHi} उपयोग की गई — ${tf.nameHi} अब तुम्हारे साथ है!`
            : `Used ${tf.requiredKeyNameEn} — ${tf.nameEn} is now following you!`,
        );

        this.entrySubtitleRukmini = false;
        this.entrySubtitleSpeaker = `${follower?.nameHi ?? tf.nameEn} (आज़ाद दोस्त)`;
        this.entrySubtitleText = thankYouLine;
        this.entrySubtitleTimer = 4.6;
        void this.synth.playFriendThankYou(friendId, isFirstRescued);

        this.onChatLog?.(
          this.lang === 'hi'
            ? `🔓 तुमने "${tf.requiredKeyNameHi}" से ${tf.nameHi} की लोहे की जेल खोल दी! (${this.rescuedFriends}/${this.totalFriendsToRescue} सुरक्षित) — [${follower?.nameHi ?? tf.nameEn}]: "${thankYouLine}"`
            : `🔓 You unlocked ${tf.nameEn}'s iron jail cell with ${tf.requiredKeyNameEn}! (${this.rescuedFriends}/${this.totalFriendsToRescue} rescued) — "${thankYouLine}"`,
        );

        // Unlocking heavy iron jail gates has a 26m hearing range and alerts Rukmini if nearby
        this.triggerSoundAlert(1.8, 26.0);
        if (this.burnedCount >= 3) {
          this.rebuildFinalRagePatrolPoints();
        }
        if (
          (this.curseBroken || this.burnedCount >= this.requiredItems) &&
          this.rescuedFriends >= this.totalFriendsToRescue &&
          this.hasRecoveredMainExitKey()
        ) {
          this.unlockMainHaveliDoorForEscape(false);
        }
        this.updateEscapeTaskStatus();
        this.saveProgressToStorage();
        return;
      }
    }

    // 1. Prioritize an uncollected relic that the center crosshair is pointing at within reach
    let targetRelic: RelicInstance | null = null;
    let bestRelicScore = -Infinity;

    for (const relic of this.relics) {
      if (relic.state !== 'hidden' || relic.collected) continue;
      relic.group.getWorldPosition(_relicPos);
      if (Math.abs(_relicPos.y - this.playerFloorY) > 2.4) continue;
      const dist = _playerWorldPos.distanceTo(_relicPos);
      if (dist <= reachDist) {
        _toItemDir.copy(_relicPos).sub(_playerWorldPos).normalize();
        const dot = _forwardDir.dot(_toItemDir);
        const score = dot * 4 - dist * 0.5;
        if (score > bestRelicScore) {
          bestRelicScore = score;
          targetRelic = relic;
        }
      }
    }

    if (targetRelic) {
      targetRelic.state = 'carried';
      targetRelic.collected = true;
      targetRelic.burned = false;
      targetRelic.group.visible = false;
      this.collectedCount = this.relics.filter(
        (r) => r.state === 'carried' || r.state === 'burned',
      ).length;
      this.synth.playRelicChime(false);
      this.hitstopTimer = 0.05;
      this.playerArms?.triggerPickup();

      // Unlock any relic-locked doors once required relics are collected
      for (const d of this.haveli.doors) {
        if (
          d.lockedUntilRelics > 0 &&
          this.collectedCount >= d.lockedUntilRelics
        ) {
          d.lockedUntilRelics = 0;
          d.isOpen = true;
          this.synth.playDoorCreak();
          this.onChatLog?.(
            this.lang === 'hi'
              ? `🔓 '${d.nameHi}' का तांत्रिक ताला खुल गया है!`
              : `🔓 '${d.nameHi}' has unlocked!`,
          );
        }
      }

      this.triggerItemToast(
        this.lang === 'hi'
          ? `🔥 ${targetRelic.hindiName} (${this.collectedCount}/${this.requiredItems})`
          : `🔥 ${targetRelic.name} — ${targetRelic.hindiName} (${this.collectedCount}/${this.requiredItems})`,
        this.lang === 'hi'
          ? 'शापित निशानी — आँगन के जलते कुएँ में फेंककर भस्म करें!'
          : 'Cursed Relic — Throw into the burning Courtyard Well to destroy!',
      );
      this.onChatLog?.(
        this.lang === 'hi'
          ? `✨ तुमने '${targetRelic.hindiName}' उठा ली! (${this.collectedCount}/${this.requiredItems})। इसे आँगन के सूखे कुएँ में जलाओ!`
          : `✨ Picked up '${targetRelic.name} (${targetRelic.hindiName})' (${this.collectedCount}/${this.requiredItems})! Burn it in the Courtyard Well!`,
      );

      this.triggerSoundAlert(0.95);
      if (this.burnedCount >= 3) {
        this.rebuildFinalRagePatrolPoints();
      }
      this.updateEscapeTaskStatus();
      this.saveProgressToStorage();
      return;
    }

    // 1A. Pick up Kulhad / Stone distraction throwables placed on floors and tables across Haveli rooms
    if (this.entryPhase === 'mission_active') {
      let targetThrowable: ThrowablePickupInstance | null = null;
      let bestThrowableScore = -Infinity;
      for (const item of this.throwables) {
        if (item.collected) continue;
        item.group.getWorldPosition(_relicPos);
        if (Math.abs(_relicPos.y - this.playerFloorY) > 2.2) continue;
        const dist = _playerWorldPos.distanceTo(_relicPos);
        if (dist <= reachDist) {
          _toItemDir.copy(_relicPos).sub(_playerWorldPos).normalize();
          const dot = _forwardDir.dot(_toItemDir);
          if (dot >= 0.72 || dist <= 2.4) {
            const score = dot * 4 - dist * 0.5;
            if (score > bestThrowableScore) {
              bestThrowableScore = score;
              targetThrowable = item;
            }
          }
        }
      }

      if (targetThrowable) {
        if (this.carriedThrowables >= this.maxCarriedThrowables) {
          this.onChatLog?.(
            this.lang === 'hi'
              ? '🪨 तुम अधिकतम 3 कंकड़/कुल्हड़ ही रख सकते हो! रुक्मिणी का ध्यान भटकाने के लिए G दबाकर फेंकें।'
              : '🪨 Max 3 Kulhads/stones carried! Press G to throw one and distract Rukmini.',
          );
          return;
        }

        targetThrowable.collected = true;
        targetThrowable.group.visible = false;
        targetThrowable.respawnTimer = 40.0;
        this.carriedThrowables = Math.min(
          this.maxCarriedThrowables,
          this.carriedThrowables + 1,
        );
        this.synth.playKulhadPickup();
        this.playerArms?.triggerPickup();
        this.onChatLog?.(
          this.lang === 'hi'
            ? `🪨 तुमने '${targetThrowable.hindiName}' उठा लिया (${this.carriedThrowables}/${this.maxCarriedThrowables})। 'G' दबाकर दूर फेंको ताकि आवाज़ सुनकर रुक्मिणी उधर भागे!`
            : `🪨 Picked up '${targetThrowable.englishName}' (${this.carriedThrowables}/${this.maxCarriedThrowables}). Press 'G' to throw and lure Rukmini away!`,
        );
        this.saveProgressToStorage();
        this.onHudUpdate?.();
        return;
      }
    }

    // 1B. If the player is within 2.2m of a hiding spot, pressing E / Interact enters that hiding spot
    if (!fromXrRay && this.nearbyHidingSpot) {
      this.enterHidingSpot(this.nearbyHidingSpot);
      return;
    }

    // 2. Check if looking at a Haveli room door within 2.3m (or exterior gate / main entrance)
    const nearestDoor = this.findLookedAtDoor(fromXrRay);

    if (nearestDoor) {
      // Case A: Outer Compound Iron Gate (triggers Guard encounter before opening in Step 2)
      if (nearestDoor.id === 'door_front_iron_gate') {
        if (this.entryPhase === 'exterior_walk' && !this.watchmanWarned) {
          this.triggerWatchmanWarningAndKeyHint();
          return;
        }
        this.haveli.setDoorOpen(nearestDoor, !nearestDoor.isOpen, 0.45);
        this.playerArms?.triggerPickup();
        this.synth.playDoorCreak();
        this.updateEscapeTaskStatus();
        return;
      }

      // Case B: Main Mansion Door (door_main_entrance)
      if (nearestDoor.id === 'door_main_entrance') {
        if (!this.blackoutTrapTriggered) {
          // STEP 3: Strictly locked until the player picks up the Haveli Entrance Key from the Shiva Temple!
          if (this.entryPhase === 'courtyard_approach') {
            const hasEntranceKey =
              this.hasMansionKey && this.mansionKeyState === 'carried_courtyard';
            if (!hasEntranceKey) {
              nearestDoor.rattleOffset = 0.045;
              this.synth.playDoorCreak();
              this.onChatLog?.(
                this.lang === 'hi'
                  ? '🔒 हवेली का मुख्य दरवाज़ा बंद है! पहले आँगन में दाईं ओर शिव मंदिर के पास से हवेली प्रवेश चाबी (E) उठाकर लाओ!'
                  : '🔒 The Main Haveli Door is locked! Pick up the glowing Haveli Entrance Key in front of the Shiva Temple first!',
              );
              return;
            }
            this.startEnterMainHaveliSequence();
          }
          return;
        } else {
          // Inside the blacked-out Haveli trying to unlock the Main Mansion Door to escape!
          // Strictly requires ALL 3: (1) All 4 relics burned, (2) All 3 friends freed from jails, AND (3) Main Exit Door Key!
          const allFriendsUnchained =
            this.rescuedFriends >= this.totalFriendsToRescue;
          const allRelicsBurned =
            this.curseBroken || this.burnedCount >= this.requiredItems;
          const hasRecoveredKey = this.hasRecoveredMainExitKey();

          if (allFriendsUnchained && allRelicsBurned && hasRecoveredKey) {
            this.mansionKeyState = 'unlocked_escape';
            this.triggerVictoryEscape(
              'बधाई हो! आपने रुक्मिणी के श्राप से अपने दोस्तों को बचा लिया!',
            );
            return;
          }

          nearestDoor.rattleOffset = 0.048;
          this.synth.playDoorCreak();

          if (allRelicsBurned && allFriendsUnchained && !hasRecoveredKey) {
            this.triggerItemToast(
              this.lang === 'hi'
                ? '🔒 हवेली मुख्य द्वार चाबी चाहिए!'
                : '🔒 Main Exit Door Key Required!',
              this.lang === 'hi'
                ? 'ताला खोलने के लिए तीसरी मंज़िल तांत्रिक पुस्तकालय (3F-1) से "हवेली मुख्य द्वार चाबी" लाएं!'
                : 'Find the "Main Exit Door Key (हवेली मुख्य द्वार चाबी)" in the 3F-1 Tantrik Library!',
            );
            this.onChatLog?.(
              this.lang === 'hi'
                ? '🔒 अभिशाप टूट गया और तीनों दोस्त आज़ाद हैं, लेकिन मुख्य दरवाज़े पर भारी ताला लगा है! पहले तीसरी मंज़िल तांत्रिक पुस्तकालय (3F-1) से "हवेली मुख्य द्वार चाबी (Main Exit Door Key)" लाएं!'
                : '🔒 The curse is broken and all 3 friends are free, but the Main Front Door is still locked! Find the "Main Exit Door Key (हवेली मुख्य द्वार चाबी)" inside the 3F-1 Tantrik Library!',
            );
            return;
          }

          if (allRelicsBurned && !allFriendsUnchained) {
            this.triggerItemToast(
              this.lang === 'hi'
                ? `🔒 दोस्त अभी जेल में बंद हैं (${this.rescuedFriends}/${this.totalFriendsToRescue})`
                : `🔒 Friends Still Locked in Jail (${this.rescuedFriends}/${this.totalFriendsToRescue})`,
              this.lang === 'hi'
                ? 'भागने से पहले तीनों दोस्तों को उनकी जेल की चाबियों से आज़ाद करें!'
                : 'Find each friend’s jail key and free all 3 friends before escaping!',
            );
            this.onChatLog?.(
              this.lang === 'hi'
                ? `🔒 रुक्मिणी भस्म हो चुकी है, लेकिन भागने से पहले तीनों दोस्तों (कबीर, रिया, देव) को उनकी जेलों से आज़ाद करना ज़रूरी है! (${this.rescuedFriends}/${this.totalFriendsToRescue} सुरक्षित)`
                : `🔒 Rukmini is banished, but you must unlock all 3 friends' jail cells before escaping! (${this.rescuedFriends}/${this.totalFriendsToRescue} rescued)`,
            );
            return;
          }

          this.triggerItemToast(
            this.lang === 'hi'
              ? '🔒 मुख्य दरवाज़ा बंद है!'
              : '🔒 Main Exit Door Locked!',
            this.lang === 'hi'
              ? `दोस्त: ${this.rescuedFriends}/3 | जलाईं: ${this.burnedCount}/${this.requiredItems} | मुख्य द्वार चाबी: ${hasRecoveredKey ? 'मिल गई' : 'बाकी'}`
              : `Friends: ${this.rescuedFriends}/3 | Burned: ${this.burnedCount}/${this.requiredItems} | Exit Key: ${hasRecoveredKey ? 'Found' : 'Missing'}`,
          );
          this.onChatLog?.(
            this.lang === 'hi'
              ? `🔒 भागने के लिए तीनों दोस्तों को जेल से छुड़ाओ (${this.rescuedFriends}/${this.totalFriendsToRescue}), चारों शापित निशानियाँ कुएँ में जलाओ (${this.burnedCount}/${this.requiredItems}) और "हवेली मुख्य द्वार चाबी" ढूँढो!`
              : `🔒 To escape, free all 3 friends from jail (${this.rescuedFriends}/${this.totalFriendsToRescue}), burn all 4 cursed relics (${this.burnedCount}/${this.requiredItems}), and use the "Main Exit Door Key"!`,
          );
          return;
        }
      }

      // Case C: Back Courtyard Door (locked prior to Haveli entry OR locked after Well Courtyard respawn)
      if (nearestDoor.id === 'door_back_well' && !this.blackoutTrapTriggered) {
        this.synth.playDoorCreak();
        this.onChatLog?.(
          this.lang === 'hi'
            ? '🔒 पिछला दरवाज़ा अंदर से बंद है! सामने मुख्य फाटक और मुख्य द्वार से प्रवेश करें!'
            : '🔒 The back door is barred from inside! Enter through the main front gate and doorway!',
        );
        return;
      }

      if (nearestDoor.id === 'door_back_well' && this.isWellDoorLockedForRespawn) {
        if (!this.hasWellCourtyardKey) {
          nearestDoor.rattleOffset = 0.042;
          this.synth.playDoorCreak();
          this.onChatLog?.(
            this.lang === 'hi'
              ? '🔒 कुएं के आंगन का दरवाज़ा बंद है! कुएं के किनारे चमकती सुनहरी "कुएं के आंगन की चाबी" उठाओ (E) और दरवाज़ा खोलो!'
              : '🔒 The Well Courtyard door is locked! Pick up the glowing golden Well Courtyard Key near the Cursed Well first!',
          );
          return;
        }
        this.isWellDoorLockedForRespawn = false;
        this.hasWellCourtyardKey = false;
        this.playerArms?.setHoldingKey(this.hasAnyCarriedKey());
        this.haveli.setDoorOpen(nearestDoor, true, 0.45);
        this.playerArms?.triggerPickup();
        this.synth.playRelicChime(false);
        this.synth.playDoorCreak();
        this.onChatLog?.(
          this.lang === 'hi'
            ? '🔓 कुएं के आंगन की चाबी से दरवाज़ा खुल गया! हवेली में वापस प्रवेश करो!'
            : '🔓 Unlocked and swung open the Well Courtyard door! Re-enter the Haveli!',
        );
        this.updateEscapeTaskStatus();
        this.saveProgressToStorage();
        return;
      }

      // Case D: Interior Haveli Room Doors (smooth 0.45s swing around hinge)
      if (
        nearestDoor.lockedUntilRelics > 0 &&
        this.collectedCount < nearestDoor.lockedUntilRelics
      ) {
        this.synth.playDoorCreak();
        this.onChatLog?.(
          this.lang === 'hi'
            ? `🔒 '${nearestDoor.nameHi}' पर तांत्रिक ताला लगा है! पहले कम से कम ${nearestDoor.lockedUntilRelics} शापित निशानी ढूँढें!`
            : `🔒 '${nearestDoor.nameHi}' is sealed! Find at least ${nearestDoor.lockedUntilRelics} relic first!`,
        );
        return;
      }

      this.haveli.setDoorOpen(nearestDoor, !nearestDoor.isOpen, 0.45);
      this.playerArms?.triggerPickup();
      this.synth.playDoorCreak();
      this.triggerSoundAlert(0.8, 14.0);

      this.onChatLog?.(
        this.lang === 'hi'
          ? `🔓 ${nearestDoor.nameHi} ${nearestDoor.isOpen ? 'खुल गया' : 'बंद किया गया'}।`
          : `🔓 ${nearestDoor.nameHi} ${nearestDoor.isOpen ? 'opened' : 'closed'}.`,
      );
      return;
    }

    // 2B. Check if near a traditional Indian Haveli 3D Hiding Spot (Royal Palki, Grain Kothi, Sandstone Jaali Alcove, Wooden Sandook, Pillar Clock, Deewan Panel, Copper Haud, or Stone Sarcophagus)
    let targetSpot: HaveliHidingSpot | null = this.nearbyHidingSpot;
    if (!targetSpot) {
      let bestSpotScore = -Infinity;
      for (const spot of this.haveli.hidingSpots) {
        if (Math.abs(spot.floorY - this.playerFloorY) > 1.8) continue;
        _doorWorldPos.copy(spot.position).add(this.mansionRoot.position);
        _doorWorldPos.y += 1.0;
        const dist = _playerWorldPos.distanceTo(_doorWorldPos);
        if (dist <= 3.2) {
          _toItemDir.copy(_doorWorldPos).sub(_playerWorldPos).normalize();
          const dot = _forwardDir.dot(_toItemDir);
          if (!fromXrRay || dot >= 0.55 || dist <= 2.2) {
            const score = dot * 3.0 - dist * 0.6;
            if (score > bestSpotScore) {
              bestSpotScore = score;
              targetSpot = spot;
            }
          }
        }
      }
    }

    if (targetSpot) {
      this.enterHidingSpot(targetSpot);
      return;
    }

    // 3. Check if near the Central Courtyard Stone Well or Back Courtyard Dry Well to incinerate collected relics
    this.haveli.wellGroup.getWorldPosition(_relicPos);
    const backWellDist = _playerWorldPos.distanceTo(_relicPos);
    this.haveli.centralCourtyardWell.getWorldPosition(_relicPos);
    const centralWellDist = _playerWorldPos.distanceTo(_relicPos);
    const wellDist = Math.min(backWellDist, centralWellDist);
    if (wellDist <= reachDist + 1.8) {
      const carriedRelics = this.relics.filter((r) => r.state === 'carried');
      if (carriedRelics.length > 0) {
        for (const r of carriedRelics) {
          r.state = 'burned';
          r.burned = true;
          r.collected = true;
          r.group.visible = false;
        }
        this.burnedCount = Math.min(
          this.requiredItems,
          this.relics.filter((r) => r.state === 'burned').length,
        );
        this.collectedCount = Math.min(
          this.requiredItems,
          this.relics.filter(
            (r) => r.state === 'carried' || r.state === 'burned',
          ).length,
        );
        this.synth.playRelicChime(true);
        this.cameraShakeIntensity = Math.max(this.cameraShakeIntensity, 0.24);
        if (this.haveli.wellFireLight) {
          this.haveli.wellFireLight.intensity = 11.0;
        }

        // Every time a cursed item is burned: Red lightning flash across the Haveli + Rukmini's angry Hindi warning
        this.triggerHaveliRedLightningFlash(1.55);
        this.entrySubtitleRukmini = true;
        this.entrySubtitleSpeaker = 'रक्त-पिशाचिनी रुक्मिणी (क्रोधित)';
        this.entrySubtitleText =
          this.burnedCount >= this.requiredItems
            ? 'तुम मेरी निशानियां जलाकर बच नहीं पाओगे... नहीं!! मेरा अभिशाप भस्म हो रहा है!!'
            : 'तुम मेरी निशानियां जलाकर बच नहीं पाओगे!';
        this.entrySubtitleTimer = 4.6;

        if (this.burnedCount >= this.requiredItems) {
          void this.synth.playRukminiBanishmentScream();
        } else {
          void this.synth.playRukminiRelicBurnWarning(this.burnedCount);
        }

        // Apply 4-stage rage escalation (or Stage 4 banishment & Main Door unlock)
        this.applyWitchRageProgression(false);

        const stageMsg =
          this.burnedCount === 1
            ? '⚡ 1/4 भस्म: रुक्मिणी की गति +10% बढ़ी और गलियारों की दीवारों पर खून के पंजे उभर आए!'
            : this.burnedCount === 2
              ? '🔴 2/4 भस्म: रुक्मिणी की गति +20% बढ़ी — 18 मीटर के भीतर आते ही हवेली की बत्तियाँ लाल टिमटिमाएँगी!'
              : this.burnedCount === 3
                ? '🩸 3/4 भस्म (अंतिम क्रोध): रुक्मिणी की आँखें खूनी लाल चमक रही हैं, गति +30% और वह आँगन व बचे कमरों की गश्त कर रही है!'
                : this.hasRecoveredMainExitKey() &&
                    this.rescuedFriends >= this.totalFriendsToRescue
                  ? '🔥 4/4 भस्म: अभिशाप टूट गया! रुक्मिणी भस्म हो गई — अब मुख्य द्वार चाबी से दरवाज़ा खोलकर बाहर भागें!'
                  : '🔥 4/4 भस्म: रुक्मिणी भस्म हो गई! अब सभी दोस्तों को जेल से छुड़ाएं और "हवेली मुख्य द्वार चाबी" से मुख्य दरवाज़ा खोलकर भागें!';

        this.triggerItemToast(
          this.lang === 'hi'
            ? `🔥 कुएं में भस्म (${this.burnedCount}/${this.requiredItems})`
            : `🔥 Burned in Cursed Well (${this.burnedCount}/${this.requiredItems})`,
          stageMsg,
          4.0,
        );
        this.onChatLog?.(
          this.lang === 'hi'
            ? `🔥 (${this.burnedCount}/${this.requiredItems}) ${stageMsg}`
            : `🔥 (${this.burnedCount}/${this.requiredItems}) Burned cursed relic in the well! ${stageMsg}`,
        );

        this.updateEscapeTaskStatus();
        this.saveProgressToStorage();
        this.onHudUpdate?.();
        return;
      } else {
        this.onChatLog?.(
          this.lang === 'hi'
            ? 'System: कुएँ में जलाने के लिए पहले हवेली से शापित निशानियाँ ढूँढकर लाओ!'
            : 'System: Find the cursed relics in the Haveli rooms before burning them at the well!',
        );
        return;
      }
    }

    // If no target is within reach, refresh current task status
    this.updateEscapeTaskStatus();
  }

  public getRadarSnapshot(): {
    witchRelX: number;
    witchRelZ: number;
    witchDist: number;
    relicsRel: Array<{ x: number; z: number; collected: boolean }>;
    wellRel: { x: number; z: number };
  } {
    const cam = xb.core.camera;
    if (!cam || !this.witchModel || !this.haveli) {
      return {
        witchRelX: 0,
        witchRelZ: -10,
        witchDist: 10,
        relicsRel: [],
        wellRel: { x: 0, z: -61.0 },
      };
    }

    cam.getWorldPosition(_playerWorldPos);
    this.witchModel.root.getWorldPosition(_witchToTarget);
    const witchRelX = _witchToTarget.x - _playerWorldPos.x;
    const witchRelZ = _witchToTarget.z - _playerWorldPos.z;
    const witchDist = _playerWorldPos.distanceTo(_witchToTarget);

    const relicsRel = this.relics.map((r) => {
      r.group.getWorldPosition(_relicPos);
      return {
        x: _relicPos.x - _playerWorldPos.x,
        z: _relicPos.z - _playerWorldPos.z,
        collected: r.collected,
      };
    });

    this.haveli.wellGroup.getWorldPosition(_relicPos);
    const wellRel = {
      x: _relicPos.x - _playerWorldPos.x,
      z: _relicPos.z - _playerWorldPos.z,
    };

    return { witchRelX, witchRelZ, witchDist, relicsRel, wellRel };
  }

  public triggerQuickTeamChat() {
    const list = QUICK_CHAT_MESSAGES[this.lang];
    const msg = list[Math.floor(Math.random() * list.length)];
    this.onChatLog?.(`${this.playerName}: ${msg}`);
    this.triggerSoundAlert(0.8, 14.0);
  }

  public shadowsEnabled = !(
    typeof navigator !== 'undefined' &&
    (/Android|iPhone|iPad/i.test(navigator.userAgent) ||
      (typeof window !== 'undefined' && window.innerWidth < 950))
  );
  public brightnessPercent = 100;
  public targetFps = 60;
  public matchStartTimeMs = Date.now();
  public onCareerStatsUpdated?: () => void;
  public onWebGLContextError?: (message: string) => void;

  public hasSavedProgress(): boolean {
    try {
      const raw = localStorage.getItem('rakt_pishachini_save_data');
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { requiredItems?: unknown };
      return Boolean(parsed && typeof parsed.requiredItems === 'number');
    } catch {
      return false;
    }
  }

  public recordCareerDeath() {
    try {
      const key = 'rakt_pishachini_profile_stats_v1';
      const raw = localStorage.getItem(key);
      const stats = raw
        ? (JSON.parse(raw) as {
            escapes?: number;
            relicsBurned?: number;
            friendsRescued?: number;
            totalDeaths?: number;
            bestTimeSec?: number | null;
          })
        : {};
      localStorage.setItem(
        key,
        JSON.stringify({
          escapes: stats.escapes || 0,
          relicsBurned: stats.relicsBurned || 0,
          friendsRescued: stats.friendsRescued || 0,
          totalDeaths: (stats.totalDeaths || 0) + 1,
          bestTimeSec:
            typeof stats.bestTimeSec === 'number' ? stats.bestTimeSec : null,
        }),
      );
      this.onCareerStatsUpdated?.();
    } catch {
      // Ignore storage errors
    }
  }

  public recordCareerEscape() {
    try {
      const key = 'rakt_pishachini_profile_stats_v1';
      const raw = localStorage.getItem(key);
      const stats = raw
        ? (JSON.parse(raw) as {
            escapes?: number;
            relicsBurned?: number;
            friendsRescued?: number;
            totalDeaths?: number;
            bestTimeSec?: number | null;
          })
        : {};
      const elapsedSec = Math.max(
        10,
        Math.round((Date.now() - this.matchStartTimeMs) / 1000),
      );
      const nextEscapes = (stats.escapes || 0) + 1;
      const nextRelics = (stats.relicsBurned || 0) + Math.max(this.burnedCount, 4);
      const nextFriends = (stats.friendsRescued || 0) + Math.max(0, this.rescuedFriends);
      const prevBest = typeof stats.bestTimeSec === 'number' ? stats.bestTimeSec : null;
      const nextBest = prevBest === null ? elapsedSec : Math.min(prevBest, elapsedSec);
      localStorage.setItem(
        key,
        JSON.stringify({
          escapes: nextEscapes,
          relicsBurned: nextRelics,
          friendsRescued: nextFriends,
          totalDeaths: stats.totalDeaths || 0,
          bestTimeSec: nextBest,
        }),
      );

      // Persist unlocked Demo Achievements (Badges) locally
      const badgeKey = 'rakt_pishachini_badges_v1';
      const rawBadges = localStorage.getItem(badgeKey);
      const prevBadges = rawBadges
        ? (JSON.parse(rawBadges) as {
            firstEscape?: boolean;
            rescuedAllFriends?: boolean;
            burnedAllRelics?: boolean;
            zeroDeathSurvivor?: boolean;
          })
        : {};
      localStorage.setItem(
        badgeKey,
        JSON.stringify({
          firstEscape: true,
          rescuedAllFriends:
            Boolean(prevBadges.rescuedAllFriends) ||
            this.rescuedFriends >= this.totalFriendsToRescue,
          burnedAllRelics:
            Boolean(prevBadges.burnedAllRelics) ||
            this.burnedCount >= this.requiredItems ||
            this.curseBroken,
          zeroDeathSurvivor:
            Boolean(prevBadges.zeroDeathSurvivor) || this.lives >= this.maxLives,
        }),
      );

      this.onCareerStatsUpdated?.();
    } catch {
      // Ignore storage errors
    }
  }

  public setBrightness(brightnessPercent: number) {
    const clamped = Math.max(80, Math.min(130, Math.round(brightnessPercent)));
    this.brightnessPercent = clamped;
    const isMobile = this.isMobileDevice();
    const renderer = xb.core.renderer;
    if (renderer instanceof THREE.WebGLRenderer) {
      renderer.toneMapping = isMobile
        ? THREE.NoToneMapping
        : THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = isMobile
        ? 1.0
        : Math.min(1.1, Math.max(0.8, clamped / 100));
      if (renderer.domElement) {
        renderer.domElement.style.filter =
          clamped === 100 ? 'none' : `brightness(${clamped}%)`;
      }
    }
  }

  public applyGraphicsSettings(
    quality: 'ultra' | 'high' | 'medium' | 'low',
    targetFps = 60,
    shadowsOverride?: boolean,
  ) {
    this.graphicsQuality = quality;
    this.targetFps = targetFps <= 30 ? 30 : 60;
    if (typeof shadowsOverride === 'boolean') {
      this.shadowsEnabled = shadowsOverride;
    }
    const isMobile = this.isMobileDevice();
    const isSmoothOrMobile = quality === 'low' || isMobile;
    const activeShadows = !isSmoothOrMobile && this.shadowsEnabled;

    const renderer = xb.core.renderer;
    const dpr = window.devicePixelRatio || 1;
    if (renderer instanceof THREE.WebGLRenderer) {
      const clampedBright = Math.max(
        80,
        Math.min(130, Math.round(this.brightnessPercent)),
      );
      this.brightnessPercent = clampedBright;
      renderer.setClearColor(0x0b101d, 1);
      if (isMobile) {
        // Android mobile sharp & smooth optimization: pixelRatio capped at 1.5, shadows disabled
        renderer.setPixelRatio(Math.min(dpr, 1.5));
        renderer.shadowMap.enabled = false;
      } else if (isSmoothOrMobile) {
        // PC Smooth preset: pixelRatio 1.0, heavy real-time shadows disabled
        renderer.setPixelRatio(1.0);
        renderer.shadowMap.enabled = false;
      } else if (quality === 'ultra' || quality === 'high') {
        renderer.setPixelRatio(Math.min(dpr, quality === 'ultra' ? 2.0 : 1.75));
        renderer.shadowMap.enabled = activeShadows;
        renderer.shadowMap.type =
          quality === 'ultra' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
      } else {
        renderer.setPixelRatio(Math.min(dpr, 1.25));
        renderer.shadowMap.enabled = activeShadows;
        renderer.shadowMap.type = THREE.BasicShadowMap;
      }
      renderer.toneMapping = isMobile
        ? THREE.NoToneMapping
        : THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = isMobile
        ? 1.0
        : Math.min(1.1, Math.max(0.8, clampedBright / 100));
      if (renderer.domElement) {
        renderer.domElement.style.backgroundColor = '#0b101d';
        renderer.domElement.style.filter =
          clampedBright === 100 ? 'none' : `brightness(${clampedBright}%)`;
      }
      renderer.shadowMap.needsUpdate = true;
    }

    if (this.moonKeyLight) {
      this.moonKeyLight.castShadow = activeShadows;
    }
    if (this.flashlight) {
      this.flashlight.castShadow = activeShadows;
    }
    if (this.oppositeDirLight) {
      this.oppositeDirLight.visible = !isSmoothOrMobile;
    }

    const cam = xb.core.camera as THREE.PerspectiveCamera | undefined;
    if (cam) {
      let projDirty = false;
      const targetNear = isMobile ? 0.25 : 0.1;
      if (cam.near !== targetNear) {
        cam.near = targetNear;
        projDirty = true;
      }
      const targetFar = isMobile ? 70 : isSmoothOrMobile ? 95 : 280;
      if (cam.far !== targetFar) {
        cam.far = targetFar;
        projDirty = true;
      }
      if (projDirty) {
        cam.updateProjectionMatrix();
      }
    }

    const scene = xb.core.scene;
    if (scene && this.gameState === 'playing' && this.entryPhase !== 'victory_escape_cutscene') {
      scene.background = _storyNightSkyColor;
      _nightHorizonFog.color.setHex(0x0b101d);
      _nightHorizonFog.density = isMobile ? 0.009 : 0.015;
      scene.fog = _nightHorizonFog;
    }
    this.syncViewportSize();

    if (this.haveli) {
      // Scale particle density smoothly across Smooth (low) / Standard (medium) / Ultra (high) / Max (ultra)
      const density =
        quality === 'ultra'
          ? 1.0
          : quality === 'high'
            ? 0.72
            : quality === 'medium'
              ? 0.38
              : 0.0;
      const dustGeo = this.haveli.dustPoints.geometry;
      const posAttr = dustGeo.getAttribute('position');
      if (posAttr) {
        const count = Math.round(posAttr.count * density);
        dustGeo.setDrawRange(0, count);
      }
      this.haveli.dustPoints.visible = density > 0;

      const dripStep =
        quality === 'ultra' ? 1 : quality === 'high' ? 1 : quality === 'medium' ? 2 : 4;
      for (let i = 0; i < this.haveli.dripParticles.length; i++) {
        this.haveli.dripParticles[i].visible = quality !== 'low' && i % dripStep === 0;
      }
      const smokeStep =
        quality === 'ultra' ? 1 : quality === 'high' ? 1 : quality === 'medium' ? 2 : 3;
      for (let i = 0; i < this.haveli.wellSmokeParticles.length; i++) {
        this.haveli.wellSmokeParticles[i].visible = i % smokeStep === 0;
      }
      this.haveli.setWeatherQuality(quality);
      this.haveli.setLightBudgetMode(isSmoothOrMobile);
    }
  }

  public saveProgressToStorage() {
    try {
      const payload = {
        playerName: this.playerName,
        lang: this.lang,
        playerCount: this.playerCount,
        requiredItems: this.requiredItems,
        collectedCount: this.collectedCount,
        burnedCount: this.burnedCount,
        rescuedFriends: this.rescuedFriends,
        lives: this.lives,
        isWellDoorLockedForRespawn: this.isWellDoorLockedForRespawn,
        hasWellCourtyardKey: this.hasWellCourtyardKey,
        blackoutTrapTriggered: this.blackoutTrapTriggered,
        hasMansionKey: this.hasMansionKey,
        mansionKeyState: this.mansionKeyState,
        rescuedFriendIndices: this.trappedFriends
          .filter((f) => f.rescued)
          .map((f) => f.index),
        jailKeyStates: this.jailKeys.map((k) => ({
          id: k.id,
          collected: k.collected,
          used: k.used,
        })),
        friendRescueOrderList: this.friendRescueOrderList,
        collectedIndices: this.relics
          .filter((r) => r.state !== 'hidden')
          .map((r) => r.index),
        relicStates: this.relics.map((r) => ({
          index: r.index,
          state: r.state,
          lastRoomId: r.lastRoomId,
          roomNameHi: r.roomNameHi,
          basePos: { x: r.basePos.x, y: r.basePos.y, z: r.basePos.z },
        })),
        carriedThrowables: this.carriedThrowables,
        blessedBhabhutCount: this.blessedBhabhutCount,
        playerFloorY: this.playerFloorY,
        mansionPos: {
          x: this.mansionRoot.position.x,
          y: this.mansionRoot.position.y,
          z: this.mansionRoot.position.z,
        },
        timestamp: Date.now(),
      };
      localStorage.setItem(
        'rakt_pishachini_save_data',
        JSON.stringify(payload),
      );
    } catch {
      // Ignore storage write errors
    }
  }

  public loadProgressFromStorage(): boolean {
    try {
      const raw = localStorage.getItem('rakt_pishachini_save_data');
      if (!raw) return false;
      const data = JSON.parse(raw) as {
        playerName?: string;
        lang?: LanguageCode;
        playerCount?: number;
        requiredItems?: number;
        collectedCount?: number;
        burnedCount?: number;
        rescuedFriends?: number;
        lives?: number;
        isWellDoorLockedForRespawn?: boolean;
        hasWellCourtyardKey?: boolean;
        blackoutTrapTriggered?: boolean;
        hasMansionKey?: boolean;
        mansionKeyState?: RaktPishachiniGame['mansionKeyState'];
        rescuedFriendIndices?: number[];
        jailKeyStates?: Array<{
          id: JailKeyId;
          collected: boolean;
          used: boolean;
        }>;
        friendRescueOrderList?: number[];
        collectedIndices?: number[];
        relicStates?: Array<{
          index: number;
          state: RelicState;
          lastRoomId?: string;
          roomNameHi?: string;
          basePos?: { x: number; y: number; z: number };
        }>;
        carriedThrowables?: number;
        blessedBhabhutCount?: number;
        playerFloorY?: number;
        mansionPos?: { x: number; y: number; z: number };
      };
      if (!data || typeof data.requiredItems !== 'number') return false;

      this.entrySequenceToken++;
      this.synth.stopSequenceSpeech();
      this.isMiniCutsceneActive = false;
      this.entryBlackoutOpacity = 0;
      this.entrySubtitleSpeaker = '';
      this.entrySubtitleText = '';
      this.entrySubtitleRukmini = false;
      this.entrySubtitleTimer = 0;
      this.isHaveliBlackout = false;

      if (data.playerName) this.playerName = data.playerName;
      if (data.lang) this.lang = data.lang;
      this.playerCount = data.playerCount || 1;
      this.requiredItems = data.requiredItems || 4;
      this.spawnRelicsForSession(this.requiredItems);
      this.spawnThrowablesForSession();
      this.carriedThrowables = Math.max(
        0,
        Math.min(this.maxCarriedThrowables, Number(data.carriedThrowables || 0)),
      );
      this.witchDistractionTimer = 0;
      this.witchStunnedTimer = 0;

      if (Array.isArray(data.relicStates) && data.relicStates.length > 0) {
        const stateByIndex = new Map(
          data.relicStates.map((rs) => [rs.index, rs]),
        );
        for (const r of this.relics) {
          const saved = stateByIndex.get(r.index);
          if (!saved) continue;
          const nextState: RelicState =
            saved.state === 'burned' || saved.state === 'carried'
              ? saved.state
              : 'hidden';
          r.state = nextState;
          r.collected = nextState !== 'hidden';
          r.burned = nextState === 'burned';
          if (typeof saved.lastRoomId === 'string' && saved.lastRoomId) {
            r.lastRoomId = saved.lastRoomId;
          }
          if (typeof saved.roomNameHi === 'string' && saved.roomNameHi) {
            r.roomNameHi = saved.roomNameHi;
          }
          if (
            saved.basePos &&
            typeof saved.basePos.x === 'number' &&
            typeof saved.basePos.y === 'number' &&
            typeof saved.basePos.z === 'number'
          ) {
            r.basePos.set(saved.basePos.x, saved.basePos.y, saved.basePos.z);
            r.group.position.copy(r.basePos);
          }
          r.group.visible = nextState === 'hidden';
        }
        this.burnedCount = this.relics.filter(
          (r) => r.state === 'burned',
        ).length;
        this.collectedCount = this.relics.filter(
          (r) => r.state === 'carried' || r.state === 'burned',
        ).length;
      } else {
        const collectedSet = new Set(data.collectedIndices || []);
        for (const r of this.relics) {
          if (collectedSet.has(r.index)) {
            r.state = 'carried';
            r.collected = true;
            r.burned = false;
            r.group.visible = false;
          } else {
            r.state = 'hidden';
            r.collected = false;
            r.burned = false;
            r.group.visible = true;
          }
        }
        this.collectedCount = data.collectedCount || collectedSet.size;
        this.burnedCount = data.burnedCount || 0;
        let markIdx = 0;
        for (const r of this.relics) {
          if (r.collected && markIdx < this.burnedCount) {
            r.state = 'burned';
            r.burned = true;
            markIdx++;
          }
        }
      }

      const rescuedSet = new Set(data.rescuedFriendIndices || []);
      const trapDone =
        Boolean(data.blackoutTrapTriggered) ||
        rescuedSet.size > 0 ||
        this.collectedCount > 0 ||
        this.burnedCount > 0;
      this.blackoutTrapTriggered = trapDone;
      this.watchmanWarned = trapDone;
      this.blessedBhabhutCount =
        typeof data.blessedBhabhutCount === 'number'
          ? Math.max(0, Math.min(1, data.blessedBhabhutCount))
          : trapDone
            ? 1
            : 0;
      this.entryPhase = trapDone ? 'mission_active' : 'exterior_walk';
      this.lives =
        typeof data.lives === 'number'
          ? Math.max(1, Math.min(this.maxLives, Math.round(data.lives)))
          : this.maxLives;
      this.isWellDoorLockedForRespawn = Boolean(data.isWellDoorLockedForRespawn);
      this.hasWellCourtyardKey = Boolean(data.hasWellCourtyardKey);
      this.respawnWarningText = '';
      this.respawnWarningOpacity = 0;
      this.respawnWarningTimer = 0;
      this.hasMansionKey = Boolean(data.hasMansionKey);
      this.mansionKeyState =
        data.mansionKeyState ??
        (trapDone ? 'hidden_in_haveli' : 'in_guardhouse');
      const savedKeyById = new Map(
        (data.jailKeyStates || []).map((k) => [k.id, k]),
      );
      for (const jk of this.jailKeys) {
        const saved = savedKeyById.get(jk.id);
        const friendAlreadyRescued = rescuedSet.has(jk.friendIndex);
        jk.collected = Boolean(saved?.collected) || friendAlreadyRescued;
        jk.used = Boolean(saved?.used) || friendAlreadyRescued;
        jk.group.position.copy(jk.basePos);
        jk.group.visible = trapDone && !jk.collected;
      }
      this.playerArms?.setHoldingKey(this.hasAnyCarriedKey());

      this.friendRescueOrderList = Array.isArray(data.friendRescueOrderList)
        ? data.friendRescueOrderList.filter((idx) => rescuedSet.has(idx))
        : Array.from(rescuedSet);
      for (const idx of rescuedSet) {
        if (!this.friendRescueOrderList.includes(idx)) {
          this.friendRescueOrderList.push(idx);
        }
      }

      for (const tf of this.trappedFriends) {
        const isRescued = rescuedSet.has(tf.index);
        tf.rescued = isRescued;
        tf.character.boundToPillar = false;
        tf.character.setAnimation('scared');
        tf.character.root.visible = trapDone && !isRescued;
        // Keep the iron-bar jail cell visible after blackout (open when rescued, locked with padlock when unrescued)
        tf.cageGroup.visible = trapDone;
        tf.padlockGroup.visible = trapDone && !isRescued;
        tf.gateTargetAngle = isRescued ? tf.gateOpenAngle : 0;
        tf.gateCurrentAngle = tf.gateTargetAngle;
        tf.gateRattleOffset = 0;
        tf.gatePivot.rotation.y = tf.gateCurrentAngle;
      }
      const mainHallSafeSpots: Array<[number, number]> = [
        [-2.4, 3.8],
        [2.4, 3.8],
        [0.0, 5.2],
      ];
      this.companionFriends.forEach((comp, idx) => {
        if (!trapDone) {
          comp.char.root.visible = true;
          comp.isRescuedFollower = false;
          comp.rescueOrder = 0;
          comp.char.setSecondaryTorchEnabled?.(false, 0);
        } else if (rescuedSet.has(idx)) {
          const order = this.friendRescueOrderList.indexOf(idx) + 1;
          comp.isRescuedFollower = true;
          comp.rescueOrder = order;
          comp.char.boundToPillar = false;
          comp.char.setAnimation('idle');
          const savedLocalX = data.mansionPos ? -data.mansionPos.x : 0;
          const savedLocalZ = data.mansionPos ? -data.mansionPos.z : 6.0;
          const savedInWellCourtyard =
            this.isWellDoorLockedForRespawn ||
            (savedLocalZ < -45.4 && (data.playerFloorY ?? 0) > -1.5);
          if (savedInWellCourtyard) {
            const safeSpot =
              mainHallSafeSpots[(order - 1) % mainHallSafeSpots.length] ?? [0, 4.2];
            comp.char.root.position.set(safeSpot[0], 0, safeSpot[1]);
          } else {
            comp.char.root.position.set(
              THREE.MathUtils.clamp(savedLocalX + (order - 2) * 0.85, -30.5, 30.5),
              data.playerFloorY ?? 0,
              THREE.MathUtils.clamp(savedLocalZ + 1.8, -44.0, 9.0),
            );
          }
          comp.char.root.visible = true;
          comp.char.setSecondaryTorchEnabled?.(order === 1, 1.0);
        } else {
          comp.char.root.visible = false;
          comp.isRescuedFollower = false;
          comp.rescueOrder = 0;
          comp.char.setSecondaryTorchEnabled?.(false, 0);
        }
      });
      this.rescuedFriends = data.rescuedFriends ?? rescuedSet.size;

      if (this.haveli) {
        this.haveli.setBlackoutMode(false);
        this.haveli.mansionKeyGroup.position.set(-24.0, 10.95, 0.75);
        this.haveli.mansionKeyGroup.visible =
          trapDone
            ? !this.hasMansionKey
            : !(this.hasMansionKey && this.mansionKeyState === 'carried_courtyard');
        if (!trapDone) {
          this.haveli.mansionKeyGroup.position.set(9.55, 0.98, 27.2);
        }
        this.haveli.wellCourtyardKeyGroup.visible =
          this.isWellDoorLockedForRespawn && !this.hasWellCourtyardKey;
        const backWellDoor = this.haveli.doors.find(
          (d) => d.id === 'door_back_well',
        );
        if (backWellDoor && this.isWellDoorLockedForRespawn) {
          backWellDoor.isOpen = false;
          backWellDoor.targetAngle = backWellDoor.closedAngle;
          backWellDoor.currentAngle = backWellDoor.closedAngle;
          backWellDoor.animFromAngle = backWellDoor.closedAngle;
          backWellDoor.animToAngle = backWellDoor.closedAngle;
          backWellDoor.isAnimating = false;
          backWellDoor.openProgress = 0;
          backWellDoor.pivot.rotation.y = backWellDoor.closedAngle;
        }
        const frontGate = this.haveli.doors.find(
          (d) => d.id === 'door_front_iron_gate',
        );
        if (frontGate) {
          frontGate.isOpen = trapDone;
          frontGate.targetAngle = trapDone ? frontGate.openAngle : 0;
          frontGate.currentAngle = frontGate.targetAngle;
          frontGate.pivot.rotation.y = frontGate.targetAngle;
        }
        const mainDoor = this.haveli.doors.find(
          (d) => d.id === 'door_main_entrance',
        );
        if (mainDoor) {
          mainDoor.isOpen = false;
          mainDoor.targetAngle = 0;
          mainDoor.currentAngle = 0;
          mainDoor.pivot.rotation.y = 0;
        }
      }

      this.witchBanished = false;
      this.curseBroken = false;
      this.redLightningFlashTimer = 0;
      this.redLightningFlashOpacity = 0;
      this.clearWitchBanishmentBeam();
      if (this.witchModel) {
        this.witchModel.root.visible = true;
        this.witchModel.root.scale.setScalar(1.0);
      }
      this.applyWitchRageProgression(true);

      if (typeof data.playerFloorY === 'number') {
        this.playerFloorY = THREE.MathUtils.clamp(data.playerFloorY, -4.5, 10.0);
      }
      if (data.mansionPos) {
        const savedZ =
          Math.abs(data.mansionPos.z - -18.5) < 0.2
            ? -14.2
            : data.mansionPos.z;
        this.mansionRoot.position.set(data.mansionPos.x, 0, savedZ);
        if (this.haveli) {
          const restoredZone = this.haveli.getRoomAt(
            -data.mansionPos.x,
            this.playerFloorY,
            -savedZ,
          );
          this.currentRoomId = restoredZone.id;
          this.currentRoomNameHi = restoredZone.nameHi;
          this.currentFloorLevel = this.resolveFloorLevel(
            restoredZone.floorLevel,
          );
        }
      }
      this.updateEscapeTaskStatus();
      this.onHudUpdate?.();
      return true;
    } catch {
      return false;
    }
  }

  public resetMatch() {
    this.entrySequenceToken++;
    this.synth.stopSequenceSpeech();
    this.carriedThrowables = 0;
    this.blessedBhabhutCount = 0;
    this.lives = this.maxLives;
    this.respawnWarningText = '';
    this.respawnWarningOpacity = 0;
    this.respawnWarningTimer = 0;
    this.itemToastTitle = '';
    this.itemToastSubtitle = '';
    this.itemToastOpacity = 0;
    this.itemToastTimer = 0;
    this.isWellDoorLockedForRespawn = false;
    this.hasWellCourtyardKey = false;
    this.witchDistractionTimer = 0;
    this.witchStunnedTimer = 0;
    this.entrySubtitleTimer = 0;
    this.redLightningFlashTimer = 0;
    this.redLightningFlashOpacity = 0;
    this.witchBanished = false;
    this.curseBroken = false;
    this.clearWitchBanishmentBeam();
    this.throwCooldown = 0;
    this.spawnThrowablesForSession();
    this.entryPhase = 'exterior_walk';
    this.captureJumpscareElapsed = 0;
    this.victoryCutsceneElapsed = 0;
    this.dawnSunriseProgress = 0;
    this.captureLoseMessage = '';
    this.victoryCustomMessage = '';
    this.entryBlackoutOpacity = 0;
    this.isMiniCutsceneActive = false;
    this.entrySubtitleSpeaker = '';
    this.entrySubtitleText = '';
    this.entrySubtitleRukmini = false;
    this.entryCrosshairPrompt = '';
    this.entryAnimElapsed = 0;
    this.entryBlackoutElapsed = 0;
    this.entryFlickerElapsed = 0;

    const isMobile = this.isMobileDevice();
    const isSmoothOrMobile = this.graphicsQuality === 'low' || isMobile;
    const scene = xb.core.scene;
    if (scene) {
      scene.background = _storyNightSkyColor;
      _nightHorizonFog.color.setHex(0x0b101d);
      _nightHorizonFog.density = isMobile ? 0.009 : 0.015;
      scene.fog = _nightHorizonFog;
    }
    if (this.ambientLight) {
      this.ambientLight.color.setHex(isMobile ? 0x556688 : 0x4a5d82);
      this.ambientLight.intensity = isMobile ? 1.2 : 1.1;
    }
    if (this.hemiLight) {
      this.hemiLight.color.setHex(0x6b82b8);
      this.hemiLight.groundColor.setHex(0x222833);
      this.hemiLight.intensity = 0.9;
    }
    if (this.moonKeyLight) {
      this.moonKeyLight.color.setHex(isMobile ? 0x99bbff : 0xaac4ff);
      this.moonKeyLight.intensity = isMobile ? 0.9 : 1.0;
      this.moonKeyLight.position.set(-22, 38, -42);
    }
    const camReset = xb.core.camera as THREE.PerspectiveCamera | undefined;
    if (camReset && this.storyDefaultFov > 0 && camReset.fov !== this.storyDefaultFov) {
      camReset.fov = this.storyDefaultFov;
      camReset.updateProjectionMatrix();
    }

    this.playerFloorY = 0;
    this.velocityY = 0;
    this.jumpOffsetY = 0;
    this.isGrounded = true;
    this.mansionRoot.position.set(
      -EXTERIOR_SPAWN_LOCAL_X,
      0,
      -EXTERIOR_SPAWN_LOCAL_Z,
    );
    this.currentRoomId = 'forest_road_jungle';
    this.currentRoomNameHi = 'काली घाटी जंगल सड़क और खराब SUV';
    this.currentFloorLevel = 0;
    this.watchmanWarned = false;
    this.mansionKeyState = 'in_guardhouse';
    this.hasMansionKey = false;
    this.blackoutTrapTriggered = false;
    this.isHaveliBlackout = false;
    this.playerArms?.setHoldingKey(false);
    if (this.aaravFriend) {
      this.aaravFriend.root.visible = false;
    }
    const spawnCoords = [
      { x: -0.15, z: 44.85 },
      { x: 2.75, z: 44.95 },
      { x: 1.35, z: 45.85 },
    ];
    this.friendRescueOrderList = [];
    this.friendWhisperCooldownTimer = 0;
    this.wasWitchWithin16m = false;
    this.companionFriends.forEach((comp, idx) => {
      const sc = spawnCoords[idx];
      comp.char.boundToPillar = false;
      comp.char.setAnimation('idle');
      comp.char.root.visible = true;
      comp.isRescuedFollower = false;
      comp.rescueOrder = 0;
      comp.navPath = [];
      comp.navPathIdx = 0;
      comp.navTimer = 0;
      comp.stuckTimer = 0;
      comp.lastGoalPos.set(999, 999, 999);
      comp.char.setSecondaryTorchEnabled?.(false, 0);
      if (sc) comp.char.root.position.set(sc.x, 0, sc.z);
      comp.char.root.rotation.y = Math.PI;
      comp.currentSpeed = 0;
    });
    if (this.witchModel) {
      this.witchModel.root.visible = true;
      this.witchModel.root.scale.setScalar(1.0);
      this.witchModel.root.position.set(0, 0, -8.5);
    }
    this.witchPath = [];
    this.witchPathIdx = 0;
    this.witchPathTimer = 0;
    this.witchStuckTimer = 0;
    if (this.witchDoorPauseDoor) {
      this.witchDoorPauseDoor.rattleOffset = 0;
    }
    this.witchDoorPauseDoor = null;
    this.witchDoorPauseTimer = 0;
    if (this.haveli) {
      this.haveli.setBlackoutMode(false);
      this.haveli.setBloodHandprintsVisible(false);
      this.haveli.setSunriseProgress(0);
      this.haveli.mansionKeyGroup.position.set(9.55, 0.98, 27.2);
      this.haveli.mansionKeyGroup.visible = true;
      this.haveli.wellCourtyardKeyGroup.visible = false;
      for (const d of this.haveli.doors) {
        if (d.archwayOnly) continue;
        const startOpen = d.initialOpen;
        const startAngle = startOpen ? d.openAngle : d.closedAngle;
        d.isOpen = startOpen;
        d.targetAngle = startAngle;
        d.currentAngle = startAngle;
        d.animFromAngle = startAngle;
        d.animToAngle = startAngle;
        d.animElapsed = 0;
        d.isAnimating = false;
        d.openProgress = startOpen ? 1 : 0;
        d.rattleOffset = 0;
        d.pivot.rotation.y = startAngle;
      }
      for (const spot of this.haveli.hidingSpots) {
        spot.isOccupied = false;
        spot.openPulse = 0;
      }
      for (const mirror of this.haveli.hauntedMirrors) {
        mirror.flashTimer = 0;
        mirror.cooldownTimer = 0;
        mirror.reflectionGroup.visible = false;
        if (mirror.scareLight) {
          mirror.scareLight.intensity = 0;
        }
      }
      for (const patch of this.haveli.banglePatches) {
        patch.cooldownTimer = 0;
      }
    }
    this.isPlayerCrouching = false;
    this.crouchHold = false;
    this.crouchToggle = false;
    this.crouchEyeOffsetY = 0;
    this.mirrorLogCooldownTimer = 0;
    this.activeHidingSpot = null;
    this.nearbyHidingSpot = null;
    this.compromisedInHiding = false;
    this.currentNoiseDb = 0;
    this.hideTransitionMode = 'none';
    this.hideTransitionT = 0;
    if (this.playerArms) {
      this.playerArms.group.visible = true;
    }
    this.witchAlertLevel = 0;
    this.witchHuntMode = 'patrol';
    this.witchSpeed = 1.45;
    this.playerSilenceTimer = 99;
    this.loudActionTimer = 0;
    this.currentLoudAlertRange = 26.0;
    this.isPlayerMakingSound = false;
    this.rescuedFriends = 0;
    for (const tf of this.trappedFriends) {
      tf.rescued = false;
      tf.character.boundToPillar = false;
      tf.character.setAnimation('scared');
      tf.character.root.visible = false;
      tf.cageGroup.visible = false;
      tf.padlockGroup.visible = true;
      tf.gateCurrentAngle = 0;
      tf.gateTargetAngle = 0;
      tf.gateRattleOffset = 0;
      tf.gatePivot.rotation.y = 0;
    }
    for (const jk of this.jailKeys) {
      jk.collected = false;
      jk.used = false;
      jk.group.position.copy(jk.basePos);
      jk.group.visible = false;
    }
    this.spawnRelicsForSession(this.requiredItems);
    this.applyWitchRageProgression(true);
    this.updateEscapeTaskStatus();
    this.cameraYaw = EXTERIOR_SPAWN_YAW;
    this.cameraPitch = 0;
    this.heartbeatVignetteOpacity = 0;
    this.heartbeatVignettePulse = 0;
    this.heartbeatRukminiDistance = 999;
    this.heartbeatDurationMs = 1540;
    this.heartbeatIntensity = 0;
    this.heartbeatCycleTick = 0;
    this.heartbeatPhase = 0;
    this.lastHeartbeatCycleIndex = -1;
    this.witchPayalStridePhase = 0;
    this.lastWitchPayalStepIndex = -1;
    this.gameState = 'playing';
    this.onPauseToggle?.(false);
    this.requestGamePointerLock();
    this.saveProgressToStorage();
  }

  public spawnThrowablesForSession() {
    for (const t of this.throwables) {
      this.mansionRoot.remove(t.group);
    }
    for (const p of this.activeThrowProjectiles) {
      this.mansionRoot.remove(p.mesh);
    }
    for (const fx of this.shatterEffects) {
      this.mansionRoot.remove(fx.group);
    }
    for (const bfx of this.bhabhutBurstEffects) {
      this.mansionRoot.remove(bfx.group);
    }
    this.activeThrowProjectiles = [];
    this.shatterEffects = [];
    this.bhabhutBurstEffects = [];
    this.throwables = createThrowablePickups(this.mansionRoot);
    if (this.haveli && this.isMobileDevice()) {
      this.applyMobileGlobalSceneCleanup();
    }
  }

  /**
   * Throws Watchman Baba's 1-time Blessed Bhabhut (अभिमंत्रित भभूत) when pressing 'F'
   * while Witch Rukmini is nearby, or automatically when she catches / enters 2.5m range.
   */
  public useBlessedBhabhut() {
    if (
      this.gameState !== 'playing' ||
      this.isMovementLockedByEntrySequence() ||
      this.entryPhase !== 'mission_active' ||
      !this.witchModel
    ) {
      return;
    }

    if (this.blessedBhabhutCount <= 0) {
      this.onChatLog?.(
        this.lang === 'hi'
          ? '✨ अभिमंत्रित भभूत समाप्त हो चुकी है (0 शेष)!'
          : '✨ Your Blessed Bhabhut has already been used (0 left)!',
      );
      return;
    }

    if (this.witchStunnedTimer > 0) {
      return;
    }

    const cam = xb.core.camera as THREE.PerspectiveCamera | undefined;
    if (!cam) return;

    cam.getWorldPosition(_playerWorldPos);
    const localPlayerX = _playerWorldPos.x - this.mansionRoot.position.x;
    const localPlayerZ = _playerWorldPos.z - this.mansionRoot.position.z;
    const witchPos = this.witchModel.root.position;
    const distToWitch = Math.hypot(
      witchPos.x - localPlayerX,
      witchPos.y - this.playerFloorY,
      witchPos.z - localPlayerZ,
    );

    if (distToWitch > 6.5) {
      this.onChatLog?.(
        this.lang === 'hi'
          ? `✨ रुक्मिणी अभी ${Math.round(distToWitch)}m दूर है! जब वह पास (6m के अंदर) आए तब F दबाएं।`
          : `✨ Rukmini is ${Math.round(distToWitch)}m away! Press F when she gets close (within 6m).`,
      );
      return;
    }

    this.triggerBlessedBhabhutDefense(localPlayerX, localPlayerZ);
  }

  private triggerBlessedBhabhutDefense(
    localPlayerX: number,
    localPlayerZ: number,
  ) {
    if (this.blessedBhabhutCount <= 0 || !this.witchModel) return;

    this.blessedBhabhutCount = 0;
    this.witchStunnedTimer = 5.0;
    this.witchDistractionTimer = 0;
    this.witchSpeed = 0;
    this.witchHuntMode = 'patrol';
    this.witchAlertLevel = 0;
    this.witchPath = [];
    this.compromisedInHiding = false;
    this.playerArms?.triggerPickup();
    this.cameraShakeIntensity = Math.max(this.cameraShakeIntensity, 0.24);

    // Spawn burst of glowing golden-white sacred ash flying into Witch Rukmini's face
    const witchFaceLocal = new THREE.Vector3(
      this.witchModel.root.position.x,
      this.witchModel.root.position.y + 1.56,
      this.witchModel.root.position.z,
    );
    const handStartLocal = new THREE.Vector3(
      localPlayerX,
      this.playerFloorY + 1.48,
      localPlayerZ,
    );

    const burstGroup = new THREE.Group();
    const ashGeo = new THREE.OctahedronGeometry(0.038, 0);
    const ashMatGold = new THREE.MeshBasicMaterial({
      color: 0xffe484,
      transparent: true,
      opacity: 0.95,
    });
    const ashMatIvory = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
    });

    const particles: Array<{
      mesh: THREE.Mesh;
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      targetOffset: THREE.Vector3;
      launched: boolean;
    }> = [];

    for (let i = 0; i < 42; i++) {
      const mesh = new THREE.Mesh(
        ashGeo,
        i % 3 === 0 ? ashMatIvory : ashMatGold,
      );
      const scale = 0.55 + Math.random() * 1.15;
      mesh.scale.setScalar(scale);
      const pos = handStartLocal.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.16,
          (Math.random() - 0.5) * 0.2,
        ),
      );
      mesh.position.copy(pos);
      burstGroup.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const spreadR = 0.14 + Math.random() * 0.55;
      const targetOffset = new THREE.Vector3(
        Math.cos(angle) * spreadR,
        (Math.random() - 0.35) * 0.55,
        Math.sin(angle) * spreadR,
      );

      particles.push({
        mesh,
        pos,
        vel: new THREE.Vector3(),
        targetOffset,
        launched: false,
      });
    }

    let flashLight: THREE.PointLight | null = null;
    if (!this.isMobileDevice()) {
      flashLight = new THREE.PointLight(0xffdf78, 5.2, 9.5);
      flashLight.position.copy(witchFaceLocal);
      burstGroup.add(flashLight);
    }

    this.mansionRoot.add(burstGroup);
    this.bhabhutBurstEffects.push({
      group: burstGroup,
      particles,
      flashLight,
      targetCenter: witchFaceLocal,
      age: 0,
      maxAge: 5.0,
    });

    // Play Rukmini's agonizing scream line + brief non-blocking HUD subtitle
    this.entrySubtitleRukmini = true;
    this.entrySubtitleSpeaker = 'रक्त-पिशाचिनी रुक्मिणी';
    this.entrySubtitleText = 'आह!! मेरी आंखें जल रही हैं!';
    this.entrySubtitleTimer = 3.6;
    void this.synth.playRukminiBhabhutScream();

    this.onChatLog?.(
      this.lang === 'hi'
        ? '✨ तुमने चौकीदार बाबा की अभिमंत्रित भभूत रुक्मिणी के चेहरे पर फेंकी! वह 5 सेकंड के लिए अंधी और स्तब्ध हो गई है — अभी भागो!'
        : '✨ You threw Watchman Baba’s Blessed Bhabhut into Rukmini’s face! She is blinded & stunned for 5 seconds — ESCAPE NOW!',
    );

    this.saveProgressToStorage();
    this.onHudUpdate?.();
  }

  /**
   * Throws a carried clay Kulhad or stone forward along camera gaze on 'G' key press,
   * arcing 10-15 meters before shattering on the floor and emitting a 22m distraction wave.
   */
  public throwKulhadOrStone() {
    if (
      this.gameState !== 'playing' ||
      this.isMovementLockedByEntrySequence() ||
      this.entryPhase !== 'mission_active' ||
      this.activeHidingSpot ||
      this.throwCooldown > 0 ||
      !this.haveli
    ) {
      return;
    }

    if (this.carriedThrowables <= 0) {
      this.onChatLog?.(
        this.lang === 'hi'
          ? '🪨 तुम्हारे पास कोई कुल्हड़ या कंकड़ नहीं है! कमरों के फ़र्श या मेज़ से उठाएं (अधिकतम 3)।'
          : '🪨 No Kulhads or stones carried! Pick some up from floors/tables (max 3).',
      );
      return;
    }

    const cam = xb.core.camera as THREE.PerspectiveCamera | undefined;
    if (!cam) return;

    this.carriedThrowables = Math.max(0, this.carriedThrowables - 1);
    this.throwCooldown = 0.45;
    this.playerArms?.triggerPickup();

    cam.getWorldPosition(_playerWorldPos);
    cam.getWorldDirection(_forwardDir);

    const startLocalPos = new THREE.Vector3(
      _playerWorldPos.x - this.mansionRoot.position.x + _forwardDir.x * 0.45,
      _playerWorldPos.y - this.mansionRoot.position.y - 0.14 + _forwardDir.y * 0.3,
      _playerWorldPos.z - this.mansionRoot.position.z + _forwardDir.z * 0.45,
    );

    const horizLen = Math.hypot(_forwardDir.x, _forwardDir.z);
    const hx = horizLen > 0.001 ? _forwardDir.x / horizLen : -Math.sin(this.cameraYaw);
    const hz = horizLen > 0.001 ? _forwardDir.z / horizLen : -Math.cos(this.cameraYaw);

    // Tuned parabolic throw speed + upward arc for a 10–15m floor landing distance
    const horizSpeed = 14.8;
    const pitchVy = THREE.MathUtils.clamp(_forwardDir.y * 9.5 + 3.8, 1.8, 6.5);
    const vel = new THREE.Vector3(hx * horizSpeed, pitchVy, hz * horizSpeed);

    const kind: 'kulhad' | 'stone' =
      this.carriedThrowables % 2 === 0 ? 'kulhad' : 'stone';

    const projGroup = new THREE.Group();
    projGroup.position.copy(startLocalPos);

    const isMobileThrow = this.isMobileDevice();
    if (kind === 'kulhad') {
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.088, 0.056, 0.15, 14),
        isMobileThrow
          ? new THREE.MeshLambertMaterial({
              color: 0xc25d36,
              emissive: 0x451b09,
              emissiveIntensity: 0.65,
            })
          : new THREE.MeshStandardMaterial({
              color: 0xc25d36,
              emissive: 0x451b09,
              emissiveIntensity: 0.65,
              roughness: 0.78,
            }),
      );
      projGroup.add(pot);
    } else {
      const stone = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.082, 0),
        isMobileThrow
          ? new THREE.MeshLambertMaterial({
              color: 0x7c766d,
              emissive: 0x292219,
              emissiveIntensity: 0.55,
            })
          : new THREE.MeshStandardMaterial({
              color: 0x7c766d,
              emissive: 0x292219,
              emissiveIntensity: 0.55,
              roughness: 0.85,
            }),
      );
      stone.scale.set(1.15, 0.75, 0.92);
      projGroup.add(stone);
    }

    this.mansionRoot.add(projGroup);
    this.activeThrowProjectiles.push({
      mesh: projGroup,
      kind,
      pos: startLocalPos,
      vel,
      age: 0,
    });

    this.saveProgressToStorage();
    this.onHudUpdate?.();
  }

  private triggerKulhadFloorShatter(
    impactPos: THREE.Vector3,
    kind: 'kulhad' | 'stone',
  ) {
    // 1. Spawn shattering clay/stone shards + expanding 22m visual ground sound wave
    const fxGroup = new THREE.Group();
    fxGroup.position.set(impactPos.x, impactPos.y, impactPos.z);

    const shardGeo = new THREE.DodecahedronGeometry(0.036, 0);
    const shardMat = this.isMobileDevice()
      ? new THREE.MeshLambertMaterial({
          color: kind === 'kulhad' ? 0xc25d36 : 0x7a746c,
          emissive: kind === 'kulhad' ? 0x54220a : 0x26211c,
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 1.0,
        })
      : new THREE.MeshStandardMaterial({
          color: kind === 'kulhad' ? 0xc25d36 : 0x7a746c,
          emissive: kind === 'kulhad' ? 0x54220a : 0x26211c,
          emissiveIntensity: 0.5,
          roughness: 0.82,
          transparent: true,
          opacity: 1.0,
        });

    const shards: Array<{
      mesh: THREE.Mesh;
      vel: THREE.Vector3;
      floorY: number;
    }> = [];
    for (let i = 0; i < 12; i++) {
      const shard = new THREE.Mesh(shardGeo, shardMat);
      shard.scale.set(
        0.7 + Math.random() * 0.9,
        0.35 + Math.random() * 0.45,
        0.7 + Math.random() * 0.9,
      );
      shard.position.set(0, 0.06, 0);
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.45;
      const speed = 1.6 + Math.random() * 3.0;
      fxGroup.add(shard);
      shards.push({
        mesh: shard,
        vel: new THREE.Vector3(
          Math.cos(angle) * speed,
          2.0 + Math.random() * 2.8,
          Math.sin(angle) * speed,
        ),
        floorY: 0.025,
      });
    }

    const waveRing1Mat = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const waveRing1 = new THREE.Mesh(
      new THREE.RingGeometry(0.86, 1.0, 48),
      waveRing1Mat,
    );
    waveRing1.rotation.x = -Math.PI / 2;
    waveRing1.position.y = 0.05;
    fxGroup.add(waveRing1);

    const waveRing2Mat = new THREE.MeshBasicMaterial({
      color: 0xff4433,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const waveRing2 = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.0, 48),
      waveRing2Mat,
    );
    waveRing2.rotation.x = -Math.PI / 2;
    waveRing2.position.y = 0.06;
    fxGroup.add(waveRing2);

    let flashLight: THREE.PointLight | null = null;
    if (!this.isMobileDevice()) {
      flashLight = new THREE.PointLight(0xff9933, 3.2, 9.0);
      flashLight.position.set(0, 0.45, 0);
      fxGroup.add(flashLight);
    }

    this.mansionRoot.add(fxGroup);
    this.shatterEffects.push({
      group: fxGroup,
      shards,
      waveRing1,
      waveRing2,
      flashLight,
      age: 0,
      maxAge: 1.55,
    });

    this.synth.playKulhadShatterDistraction();

    // 2. Generate a loud 22-meter sound wave to lure Witch Rukmini for 6 seconds
    if (this.witchModel && this.entryPhase === 'mission_active') {
      const DISTRACTION_RANGE = 22.0;
      const DISTRACTION_DURATION = 6.0;

      const targetFloorY =
        impactPos.y >= 7.5
          ? 10.0
          : impactPos.y >= 2.5
            ? 5.0
            : impactPos.y < -1.8
              ? -4.5
              : 0.0;
      const clampedX = THREE.MathUtils.clamp(
        impactPos.x,
        targetFloorY < -0.5 ? -27.2 : -31.0,
        targetFloorY < -0.5 ? 27.2 : 31.0,
      );
      const clampedZ = THREE.MathUtils.clamp(
        impactPos.z,
        targetFloorY < -0.5 ? -79.2 : -45.2,
        9.0,
      );

      const witchDist = this.witchModel.root.position.distanceTo(impactPos);
      if (witchDist <= DISTRACTION_RANGE) {
        this.witchDistractionTimer = DISTRACTION_DURATION;
        this.witchDistractionPos.set(clampedX, targetFloorY, clampedZ);
        this.witchHuntMode = 'fast_chase';
        this.witchAlertLevel = 2.0;
        this.witchSpeed = 3.45;
        this.witchHeardSoundPos.copy(this.witchDistractionPos);
        this.witchTargetPos.copy(this.witchDistractionPos);
        this.witchPath = [];
        this.witchPathTimer = 0;

        this.onChatLog?.(
          this.lang === 'hi'
            ? '💥 कुल्हड़ ज़मीन पर टूट गया! 22 मीटर तक तेज़ आवाज़ गूँजी — रुक्मिणी उधर दौड़ रही है, अब 6 सेकंड तक चुपचाप निकल जाओ!'
            : '💥 Shattered on the floor! Loud 22m sound wave — Rukmini is rushing to investigate for 6 seconds, sneak past now!',
        );
      } else {
        this.onChatLog?.(
          this.lang === 'hi'
            ? `💥 कुल्हड़ फ़र्श पर टूट गया (रुक्मिणी ${Math.round(witchDist)}m दूर थी, 22m की सीमा से बाहर)।`
            : `💥 Shattered on the floor (Rukmini was ${Math.round(witchDist)}m away, beyond 22m range).`,
        );
      }
    }
  }

  private updateThrowablesAndProjectiles(dt: number, time: number) {
    this.throwCooldown = Math.max(0, this.throwCooldown - dt);

    // Subtle idle pulse & 40-second respawn on room pickups
    for (let i = 0; i < this.throwables.length; i++) {
      const item = this.throwables[i];
      if (item.collected) {
        if (item.respawnTimer > 0) {
          item.respawnTimer -= dt;
          if (item.respawnTimer <= 0) {
            item.collected = false;
            item.group.visible = true;
          }
        }
      } else {
        item.group.rotation.y += dt * 0.9;
        item.group.position.y =
          item.basePos.y + Math.sin(time * 2.4 + i * 0.7) * 0.014;
      }
    }

    // Parabolic flight physics with 3 substeps/frame for reliable wall & floor collision
    for (let i = this.activeThrowProjectiles.length - 1; i >= 0; i--) {
      const proj = this.activeThrowProjectiles[i];
      proj.age += dt;
      proj.mesh.rotation.x += dt * 11;
      proj.mesh.rotation.z += dt * 8;

      let impacted = false;
      const substeps = 3;
      const subDt = dt / substeps;

      for (let s = 0; s < substeps; s++) {
        proj.vel.y += -14.0 * subDt;
        const nextX = proj.pos.x + proj.vel.x * subDt;
        const nextZ = proj.pos.z + proj.vel.z * subDt;
        const nextY = proj.pos.y + proj.vel.y * subDt;

        let resolvedX = nextX;
        let resolvedZ = nextZ;
        if (this.haveli) {
          const resolved = this.haveli.resolveCollision(
            proj.pos.x,
            proj.pos.z,
            nextX,
            nextZ,
            proj.pos.y,
            0.14,
          );
          resolvedX = resolved.x;
          resolvedZ = resolved.z;

          if (Math.hypot(resolvedX - nextX, resolvedZ - nextZ) > 0.015) {
            // Bounced off interior wall/door — drop cleanly onto the floor in front of the wall
            proj.vel.x *= -0.22;
            proj.vel.z *= -0.22;
            proj.vel.y = Math.min(proj.vel.y, -4.0);
          }

          const floorY = this.haveli.getElevationAt(
            resolvedX,
            resolvedZ,
            proj.pos.y,
          );
          proj.pos.set(resolvedX, nextY, resolvedZ);

          if (nextY <= floorY + 0.06 && proj.vel.y <= 0) {
            proj.pos.y = floorY + 0.04;
            impacted = true;
            break;
          }
        } else {
          proj.pos.set(nextX, nextY, nextZ);
          if (nextY <= 0.06 && proj.vel.y <= 0) {
            proj.pos.y = 0.04;
            impacted = true;
            break;
          }
        }
      }

      proj.mesh.position.copy(proj.pos);

      if (impacted || proj.age > 4.0) {
        this.triggerKulhadFloorShatter(proj.pos.clone(), proj.kind);
        this.mansionRoot.remove(proj.mesh);
        this.activeThrowProjectiles.splice(i, 1);
      }
    }

    // Update terracotta shards + expanding 22m floor sound wave rings
    for (let i = this.shatterEffects.length - 1; i >= 0; i--) {
      const fx = this.shatterEffects[i];
      fx.age += dt;
      const t = Math.min(1, fx.age / fx.maxAge);

      for (const s of fx.shards) {
        s.vel.y -= 14.0 * dt;
        s.mesh.position.addScaledVector(s.vel, dt);
        s.mesh.rotation.x += dt * 9;
        s.mesh.rotation.y += dt * 7;
        if (s.mesh.position.y <= s.floorY) {
          s.mesh.position.y = s.floorY;
          s.vel.y = Math.abs(s.vel.y) * 0.28;
          s.vel.x *= 0.65;
          s.vel.z *= 0.65;
        }
        (s.mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(
          0,
          1 - t * 0.9,
        );
      }

      // Visually expand sound rings across the 22-meter hearing radius
      const waveT1 = Math.min(1, fx.age / 0.85);
      const radius1 = 0.3 + waveT1 * 21.7;
      fx.waveRing1.scale.setScalar(radius1);
      (fx.waveRing1.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        (1 - waveT1) * 0.72,
      );

      const waveT2 = Math.max(0, Math.min(1, (fx.age - 0.14) / 0.9));
      const radius2 = 0.3 + waveT2 * 21.7;
      fx.waveRing2.scale.setScalar(radius2);
      (fx.waveRing2.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        (1 - waveT2) * 0.55,
      );

      if (fx.flashLight) {
        fx.flashLight.intensity = Math.max(0, 3.2 * (1 - Math.min(1, fx.age / 0.4)));
      }

      if (fx.age >= fx.maxAge) {
        this.mansionRoot.remove(fx.group);
        this.shatterEffects.splice(i, 1);
      }
    }

    // Auto-clear timed non-blocking subtitles (e.g. Baba Bhabhut blessing / Rukmini scream)
    if (this.entrySubtitleTimer > 0) {
      this.entrySubtitleTimer -= dt;
      if (this.entrySubtitleTimer <= 0) {
        this.entrySubtitleTimer = 0;
        if (
          this.entryPhase === 'courtyard_approach' ||
          this.entryPhase === 'mission_active'
        ) {
          this.entrySubtitleSpeaker = '';
          this.entrySubtitleText = '';
          this.entrySubtitleRukmini = false;
        }
      }
    }

    // Fade out the 2-second dark warning banner shown when respawning at the Well Courtyard
    if (this.respawnWarningTimer > 0) {
      this.respawnWarningTimer = Math.max(0, this.respawnWarningTimer - dt);
      if (this.respawnWarningTimer <= 0) {
        this.respawnWarningOpacity = 0;
        this.respawnWarningText = '';
      } else if (this.respawnWarningTimer < 0.45) {
        this.respawnWarningOpacity = this.respawnWarningTimer / 0.45;
      } else {
        this.respawnWarningOpacity = 1.0;
      }
    }

    // Fade out the sleek Item / Key Pickup Toast banner
    if (this.itemToastTimer > 0) {
      this.itemToastTimer = Math.max(0, this.itemToastTimer - dt);
      if (this.itemToastTimer <= 0) {
        this.itemToastOpacity = 0;
        this.itemToastTitle = '';
        this.itemToastSubtitle = '';
      } else if (this.itemToastTimer < 0.55) {
        this.itemToastOpacity = this.itemToastTimer / 0.55;
      } else {
        this.itemToastOpacity = 1.0;
      }
    }

    // Update glowing Blessed Bhabhut sacred ash cloud particles
    for (let i = this.bhabhutBurstEffects.length - 1; i >= 0; i--) {
      const bfx = this.bhabhutBurstEffects[i];
      bfx.age += dt;
      const flyT = Math.min(1, bfx.age / 0.24);
      const fade =
        bfx.age < 3.6 ? 1.0 : Math.max(0, 1 - (bfx.age - 3.6) / 1.4);

      if (this.witchModel) {
        bfx.targetCenter.set(
          this.witchModel.root.position.x,
          this.witchModel.root.position.y + 1.56,
          this.witchModel.root.position.z,
        );
      }

      for (let pIdx = 0; pIdx < bfx.particles.length; pIdx++) {
        const p = bfx.particles[pIdx];
        if (flyT < 1) {
          // Rapidly streak from player hand straight into Rukmini's face
          p.pos.lerp(bfx.targetCenter, Math.min(1, dt * 18));
        } else {
          if (!p.launched) {
            p.launched = true;
            const ang = (pIdx / bfx.particles.length) * Math.PI * 2;
            p.vel.set(
              Math.cos(ang) * (0.9 + Math.random() * 1.4),
              0.4 + Math.random() * 1.1,
              Math.sin(ang) * (0.9 + Math.random() * 1.4),
            );
          }
          // Swirl softly around Rukmini's blinded head while she screams
          p.vel.y -= 0.45 * dt;
          p.pos.addScaledVector(p.vel, dt);
          p.vel.multiplyScalar(Math.max(0.82, 1 - dt * 1.6));
        }
        p.mesh.position.copy(p.pos);
        p.mesh.rotation.y += dt * 7;
        p.mesh.scale.setScalar(Math.max(0.05, fade * 0.9));
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = fade * 0.92;
      }

      if (bfx.flashLight) {
        bfx.flashLight.position.copy(bfx.targetCenter);
        bfx.flashLight.intensity =
          bfx.age < 0.4
            ? 5.5
            : Math.max(0, 3.2 * fade * (0.75 + 0.25 * Math.sin(time * 18)));
      }

      if (bfx.age >= bfx.maxAge) {
        this.mansionRoot.remove(bfx.group);
        this.bhabhutBurstEffects.splice(i, 1);
      }
    }
  }

  /**
   * Configures a new live 3D camera choreography shot for the current story dialogue line/utterance.
   * Every increment of `shot.variationIdx` guarantees a distinct angle, framing, FOV, or lighting pulse.
   */
  public setStoryCameraShot(shot: StoryCameraShot) {
    this.activeStoryShot = shot;
    this.storyShotElapsed = 0;
    if (shot.flashPulse) {
      this.storyFlashBoost = 1.0;
    }

    const cam = xb.core.camera as THREE.PerspectiveCamera | undefined;
    if (cam && this.storyDefaultFov <= 0) {
      this.storyDefaultFov = cam.fov || 60;
    }

    const v = Math.abs(shot.variationIdx) % 6;
    const baseFov = THREE.MathUtils.clamp(shot.fov || 56, 40, 72);
    this.storyStartFov = baseFov + (v % 2 === 0 ? 4 : -3);
    this.storyEndFov = THREE.MathUtils.clamp(
      baseFov + (v % 2 === 0 ? -5 : 4),
      40,
      72,
    );

    const s = this.storyStartCamLocal;
    const e = this.storyEndCamLocal;
    const ls = this.storyStartLookLocal;
    const le = this.storyEndLookLocal;

    switch (shot.location) {
      case 'forest_road': {
        const angles = [
          { sx: -1.4, sy: 1.6, sz: 44.5, ex: 0.4, ey: 2.1, ez: 39.2, lx: 0, ly: 4.2, lz: 20.0 },
          { sx: 3.4, sy: 2.8, sz: 43.2, ex: -1.6, ey: 1.9, ez: 38.8, lx: 0, ly: 3.6, lz: 22.0 },
          { sx: -3.2, sy: 1.2, sz: 41.8, ex: 1.2, ey: 2.5, ez: 37.8, lx: 0.5, ly: 4.5, lz: 18.0 },
          { sx: 0.0, sy: 4.5, sz: 44.8, ex: 0.0, ey: 1.8, ez: 38.4, lx: 0, ly: 3.4, lz: 22.0 },
          { sx: 4.5, sy: 1.5, sz: 40.8, ex: -3.6, ey: 2.4, ez: 40.8, lx: 0, ly: 3.8, lz: 24.0 },
          { sx: -0.9, sy: 1.1, sz: 39.5, ex: 1.4, ey: 3.2, ez: 43.0, lx: 0, ly: 4.8, lz: 16.0 },
        ];
        const a = angles[v];
        s.set(a.sx, a.sy, a.sz);
        e.set(a.ex, a.ey, a.ez);
        ls.set(a.lx, a.ly, a.lz);
        le.set(a.lx + (v % 2 === 0 ? 0.6 : -0.6), a.ly + 0.3, a.lz);
        break;
      }
      case 'haveli_gate_friends': {
        const angles = [
          { sx: -3.8, sy: 1.65, sz: 38.6, ex: 2.8, ey: 1.9, ez: 37.6, lx: 0, ly: 1.8, lz: 34.0 },
          { sx: 3.4, sy: 2.2, sz: 38.2, ex: -2.4, ey: 1.6, ez: 36.8, lx: -1.4, ly: 1.5, lz: 34.8 },
          { sx: -0.4, sy: 1.35, sz: 39.4, ex: 0.3, ey: 2.8, ez: 35.4, lx: 0, ly: 4.5, lz: 16.0 },
          { sx: -5.2, sy: 2.9, sz: 36.6, ex: -1.2, ey: 1.7, ez: 38.0, lx: 1.2, ly: 1.7, lz: 34.6 },
          { sx: 1.8, sy: 1.5, sz: 39.2, ex: -1.8, ey: 1.85, ez: 36.4, lx: -2.0, ly: 1.45, lz: 35.0 },
          { sx: 0.0, sy: 4.2, sz: 39.9, ex: 0.0, ey: 1.6, ez: 36.2, lx: 0.5, ly: 2.5, lz: 28.0 },
        ];
        const a = angles[v];
        s.set(a.sx, a.sy, a.sz);
        e.set(a.ex, a.ey, a.ez);
        ls.set(a.lx, a.ly, a.lz);
        le.set(a.lx * 0.7, a.ly + 0.2, a.lz - 0.5);
        break;
      }
      case 'watchman_gate': {
        const angles = [
          { sx: -0.8, sy: 1.65, sz: 38.0, ex: 1.2, ey: 1.7, ez: 36.4, lx: 2.45, ly: 1.45, lz: 35.0 },
          { sx: 4.1, sy: 1.4, sz: 37.1, ex: 1.6, ey: 1.8, ez: 37.4, lx: 2.45, ly: 1.4, lz: 35.0 },
          { sx: 0.4, sy: 1.25, sz: 37.2, ex: 1.7, ey: 1.62, ez: 36.0, lx: 2.45, ly: 1.55, lz: 35.0 },
          { sx: 3.1, sy: 2.1, sz: 37.8, ex: -0.6, ey: 1.65, ez: 37.2, lx: 0.4, ly: 1.5, lz: 34.8 },
          { sx: -2.4, sy: 1.5, sz: 36.8, ex: 0.6, ey: 1.75, ez: 36.6, lx: 2.4, ly: 1.45, lz: 35.0 },
          { sx: 1.6, sy: 2.8, sz: 38.6, ex: 2.5, ey: 1.5, ez: 36.3, lx: 2.45, ly: 1.4, lz: 35.0 },
        ];
        const a = angles[v];
        s.set(a.sx, a.sy, a.sz);
        e.set(a.ex, a.ey, a.ez);
        ls.set(a.lx, a.ly, a.lz);
        le.set(a.lx, a.ly + 0.08, a.lz);
        break;
      }
      case 'courtyard_1992': {
        const angles = [
          { sx: -9.5, sy: 3.2, sz: 8.6, ex: 9.2, ey: 3.6, ez: 3.5, lx: 0, ly: 3.8, lz: -12.0 },
          { sx: -4.2, sy: 1.8, sz: 22.8, ex: -8.6, ey: 1.5, ez: 19.2, lx: -7.2, ly: 0.9, lz: 17.8 }, // Dry Tulsi Chaura in Royal Front Forecourt
          { sx: 10.2, sy: 8.8, sz: 7.5, ex: -9.8, ey: 8.2, ez: -4.0, lx: 0, ly: 2.6, lz: -14.5 }, // High grand 32x28x17m atrium overview
          { sx: -7.4, sy: 2.0, sz: 4.2, ex: 6.8, ey: 4.8, ez: 7.8, lx: 0, ly: 11.5, lz: -3.5 }, // Looking up at giant chandelier
          { sx: 0.0, sy: 2.8, sz: 9.0, ex: 0.0, ey: 2.2, ez: -6.5, lx: 0, ly: 3.0, lz: -20.0 }, // Crimson carpet toward Grand Staircase
          { sx: 8.2, sy: 2.2, sz: 28.0, ex: -7.5, ey: 3.0, ez: 18.0, lx: 0, ly: 4.2, lz: 10.0 }, // Royal Front Forecourt toward towering facade
        ];
        const a = angles[v];
        s.set(a.sx, a.sy, a.sz);
        e.set(a.ex, a.ey, a.ez);
        ls.set(a.lx, a.ly, a.lz);
        le.set(a.lx + (v % 2 === 0 ? -0.4 : 0.4), a.ly, a.lz);
        break;
      }
      case 'ground_corridor': {
        const angles = [
          { sx: -3.5, sy: 1.8, sz: 6.5, ex: 3.2, ey: 2.0, ez: -12.5, lx: 0, ly: 2.4, lz: -21.5 },
          { sx: 4.0, sy: 3.0, sz: -16.0, ex: -3.6, ey: 1.8, ez: 2.0, lx: 0, ly: 2.6, lz: 8.0 },
          { sx: -6.2, sy: 1.65, sz: -3.5, ex: 5.8, ey: 2.0, ez: -14.0, lx: 0, ly: 2.4, lz: -22.5 },
          { sx: 0.0, sy: 3.8, sz: 4.5, ex: 0.0, ey: 1.8, ez: -14.5, lx: 0, ly: 2.8, lz: -23.0 },
          { sx: -4.0, sy: 1.85, sz: -33.5, ex: 4.0, ey: 2.1, ez: -38.5, lx: 0.0, ly: 2.0, lz: -45.0 },
          { sx: 4.2, sy: 1.5, sz: -2.8, ex: -3.8, ey: 2.6, ez: -13.5, lx: 0.4, ly: 2.4, lz: -22.0 },
        ];
        const a = angles[v];
        s.set(a.sx, a.sy, a.sz);
        e.set(a.ex, a.ey, a.ez);
        ls.set(a.lx, a.ly, a.lz);
        le.set(a.lx, a.ly + 0.15, a.lz);
        break;
      }
      case 'dining_hall': {
        const angles = [
          { sx: -18.8, sy: 2.2, sz: 7.5, ex: -28.5, ey: 1.8, ez: -6.5, lx: -24.0, ly: 1.2, lz: 0.75 },
          { sx: -28.8, sy: 1.6, sz: 7.2, ex: -19.2, ey: 2.5, ez: -5.5, lx: -24.0, ly: 1.1, lz: 0.75 },
          { sx: -19.5, sy: 2.8, sz: -6.5, ex: -27.8, ey: 1.6, ez: 6.5, lx: -24.0, ly: 1.3, lz: 0.75 },
          { sx: -27.5, sy: 1.5, sz: 0.75, ex: -19.0, ey: 2.0, ez: 2.0, lx: -24.0, ly: 1.4, lz: 0.75 },
          { sx: -24.0, sy: 3.0, sz: 8.2, ex: -24.0, ey: 1.6, ez: -5.5, lx: -24.0, ly: 1.2, lz: 0.75 },
          { sx: -19.0, sy: 1.7, sz: -5.8, ex: -28.2, ey: 2.2, ez: 7.0, lx: -24.0, ly: 1.3, lz: 0.75 },
        ];
        const a = angles[v];
        s.set(a.sx, a.sy, a.sz);
        e.set(a.ex, a.ey, a.ez);
        ls.set(a.lx, a.ly, a.lz);
        le.set(a.lx, a.ly, a.lz);
        break;
      }
      case 'library_room': {
        const angles = [
          { sx: 19.0, sy: 1.9, sz: 6.8, ex: 28.5, ey: 1.7, ez: -5.8, lx: 24.0, ly: 1.3, lz: 0.75 },
          { sx: 28.6, sy: 2.4, sz: 6.4, ex: 19.4, ey: 1.6, ez: -5.4, lx: 24.0, ly: 1.2, lz: 0.75 },
          { sx: 19.5, sy: 2.8, sz: -6.0, ex: 28.0, ey: 1.7, ez: 6.2, lx: 24.0, ly: 1.3, lz: 0.75 },
          { sx: 27.8, sy: 1.5, sz: 0.75, ex: 19.5, ey: 2.0, ez: 2.2, lx: 24.0, ly: 1.4, lz: 0.75 },
          { sx: 20.0, sy: 1.8, sz: 6.0, ex: 27.6, ey: 2.5, ez: -5.6, lx: 24.0, ly: 1.2, lz: 0.75 },
          { sx: 28.4, sy: 2.7, sz: -5.6, ex: 20.0, ey: 1.6, ez: 6.0, lx: 24.0, ly: 1.3, lz: 0.75 },
        ];
        const a = angles[v];
        s.set(a.sx, a.sy, a.sz);
        e.set(a.ex, a.ey, a.ez);
        ls.set(a.lx, a.ly, a.lz);
        le.set(a.lx, a.ly, a.lz);
        break;
      }
      case 'upper_balcony': {
        const angles = [
          { sx: -11.5, sy: 6.5, sz: 4.5, ex: 11.5, ey: 6.6, ez: 4.5, lx: 0, ly: 2.8, lz: -10.5 },
          { sx: 13.5, sy: 6.8, sz: 4.0, ex: 13.5, ey: 6.4, ez: -18.0, lx: 0, ly: 5.5, lz: -10.5 },
          { sx: -13.5, sy: 6.9, sz: 4.0, ex: -13.5, ey: 6.3, ez: -18.0, lx: 0, ly: 6.0, lz: -12.5 },
          { sx: 0.0, sy: 6.6, sz: -31.0, ex: 0.0, ey: 6.8, ez: -22.0, lx: 0, ly: 6.5, lz: 2.0 },
          { sx: -12.8, sy: 6.7, sz: -12.5, ex: 12.8, ey: 6.5, ez: 4.5, lx: 0, ly: 4.6, lz: -8.5 },
          { sx: 9.5, sy: 6.4, sz: 4.5, ex: -9.5, ey: 7.0, ez: 4.5, lx: 0, ly: 2.2, lz: -9.5 },
        ];
        const a = angles[v];
        s.set(a.sx, a.sy, a.sz);
        e.set(a.ex, a.ey, a.ez);
        ls.set(a.lx, a.ly, a.lz);
        le.set(a.lx, a.ly + 0.3, a.lz);
        break;
      }
      case 'bridal_room': {
        const angles = [
          { sx: 19.0, sy: 6.4, sz: 7.0, ex: 28.4, ey: 6.5, ez: -5.8, lx: 24.0, ly: 5.6, lz: 0.75 },
          { sx: 28.8, sy: 6.9, sz: -6.4, ex: 19.4, ey: 6.3, ez: 6.2, lx: 24.0, ly: 5.5, lz: 0.75 },
          { sx: 19.5, sy: 6.1, sz: -6.2, ex: 28.2, ey: 6.7, ez: 6.4, lx: 24.0, ly: 5.7, lz: 0.75 },
          { sx: 28.5, sy: 6.4, sz: 7.2, ex: 20.0, ey: 6.6, ez: -5.8, lx: 24.0, ly: 5.6, lz: 0.75 },
          { sx: 20.2, sy: 7.0, sz: 3.5, ex: 28.0, ey: 6.2, ez: -5.5, lx: 24.0, ly: 5.6, lz: 0.75 },
          { sx: 19.2, sy: 6.3, sz: -2.0, ex: 28.2, ey: 6.8, ez: 4.8, lx: 24.0, ly: 5.7, lz: 0.75 },
        ];
        const a = angles[v];
        s.set(a.sx, a.sy, a.sz);
        e.set(a.ex, a.ey, a.ez);
        ls.set(a.lx, a.ly, a.lz);
        le.set(a.lx, a.ly, a.lz);
        break;
      }
      case 'thakur_bedroom': {
        const angles = [
          { sx: -19.0, sy: 6.5, sz: 7.2, ex: -28.6, ey: 6.3, ez: -5.5, lx: -24.0, ly: 5.7, lz: 0.75 },
          { sx: -28.8, sy: 6.9, sz: 7.0, ex: -19.2, ey: 6.4, ez: -5.2, lx: -24.0, ly: 5.8, lz: 0.75 },
          { sx: -19.5, sy: 6.2, sz: -5.8, ex: -28.0, ey: 6.8, ez: 6.8, lx: -24.0, ly: 5.7, lz: 0.75 },
          { sx: -28.5, sy: 7.0, sz: -42.5, ex: -19.8, ey: 6.3, ez: -31.5, lx: -24.0, ly: 5.6, lz: -36.75 },
          { sx: -27.6, sy: 6.4, sz: 2.2, ex: -19.2, ey: 6.6, ez: 2.2, lx: -24.0, ly: 5.9, lz: 0.75 },
          { sx: -19.2, sy: 6.8, sz: -31.2, ex: -28.2, ey: 6.2, ez: -42.0, lx: -24.0, ly: 5.5, lz: -36.75 },
        ];
        const a = angles[v];
        s.set(a.sx, a.sy, a.sz);
        e.set(a.ex, a.ey, a.ez);
        ls.set(a.lx, a.ly, a.lz);
        le.set(a.lx, a.ly, a.lz);
        break;
      }
      case 'basement_tehkhana': {
        const angles = [
          { sx: -2.2, sy: -2.3, sz: -43.5, ex: 2.2, ey: -2.5, ez: -55.5, lx: 0, ly: -2.7, lz: -52.0 },
          { sx: 2.2, sy: -2.8, sz: -56.0, ex: -2.0, ey: -2.2, ez: -44.0, lx: 0, ly: -2.6, lz: -48.5 },
          { sx: 8.5, sy: -0.8, sz: -35.0, ex: 8.5, ey: -2.9, ez: -41.5, lx: 0, ly: -3.1, lz: -48.0 }, // Descending basement stairs
          { sx: -2.0, sy: -2.9, sz: -56.5, ex: 2.0, ey: -2.3, ez: -55.0, lx: 0, ly: -2.5, lz: -46.5 },
          { sx: 0.0, sy: -1.9, sz: -43.5, ex: 0.0, ey: -2.8, ez: -54.5, lx: 0, ly: -2.7, lz: -57.5 },
          { sx: 2.0, sy: -2.4, sz: -45.0, ex: -2.0, ey: -2.7, ez: -53.5, lx: -0.5, ly: -2.6, lz: -50.5 },
        ];
        const a = angles[v];
        s.set(a.sx, a.sy, a.sz);
        e.set(a.ex, a.ey, a.ez);
        ls.set(a.lx, a.ly, a.lz);
        le.set(a.lx, a.ly, a.lz);
        break;
      }
      case 'dry_well_abyss': {
        const angles = [
          { sx: -7.5, sy: 2.6, sz: -53.0, ex: 7.5, ey: 2.9, ez: -53.5, lx: 0, ly: 1.35, lz: -61.0 },
          { sx: 8.2, sy: 3.6, sz: -68.5, ex: -7.6, ey: 2.3, ez: -68.0, lx: 0, ly: 1.2, lz: -61.0 },
          { sx: 0.0, sy: 5.8, sz: -52.5, ex: 0.0, ey: 2.5, ez: -55.2, lx: 0, ly: 0.9, lz: -61.0 },
          { sx: -6.4, sy: 1.9, sz: -67.2, ex: 6.4, ey: 3.4, ez: -55.0, lx: 0, ly: 1.4, lz: -61.0 },
          { sx: 6.8, sy: 1.8, sz: -54.2, ex: -6.8, ey: 2.9, ez: -67.4, lx: 0, ly: 1.3, lz: -61.0 },
          { sx: -3.2, sy: 6.5, sz: -55.5, ex: 3.2, ey: 2.5, ez: -65.5, lx: 0, ly: 1.1, lz: -61.0 },
        ];
        const a = angles[v];
        s.set(a.sx, a.sy, a.sz);
        e.set(a.ex, a.ey, a.ez);
        ls.set(a.lx, a.ly, a.lz);
        le.set(a.lx, a.ly + 0.4, a.lz);
        break;
      }
      case 'rukmini_stalk': {
        const angles = [
          { sx: -2.8, sy: 1.5, sz: 4.5, ex: 2.2, ey: 1.8, ez: -4.4, lx: 0, ly: 1.5, lz: -11.5 },
          { sx: 2.8, sy: 2.5, sz: -15.2, ex: -2.4, ey: 1.65, ez: -10.2, lx: 0, ly: 1.55, lz: -5.5 },
          { sx: -4.2, sy: 1.6, sz: 6.5, ex: 3.2, ey: 2.0, ez: 1.2, lx: 0, ly: 1.5, lz: -8.5 },
          { sx: 0.0, sy: 6.8, sz: 4.5, ex: 0.0, ey: 2.8, ez: -3.4, lx: 0, ly: 1.5, lz: -11.5 },
          { sx: 2.8, sy: 1.4, sz: -2.5, ex: -2.8, ey: 1.9, ez: -6.2, lx: 0, ly: 1.55, lz: -12.5 },
          { sx: -1.8, sy: 1.3, sz: -4.5, ex: 1.6, ey: 1.8, ez: 1.5, lx: 0, ly: 1.6, lz: -9.5 },
        ];
        const a = angles[v];
        s.set(a.sx, a.sy, a.sz);
        e.set(a.ex, a.ey, a.ez);
        ls.set(a.lx, a.ly, a.lz);
        le.set(a.lx, a.ly + 0.1, a.lz);
        break;
      }
    }
  }

  /**
   * Restores gameplay camera, first-person arms, and lighting cleanly when leaving story mode.
   */
  public exitStoryCameraMode(preserveSavedPosition = false) {
    this.activeStoryShot = null;
    this.storyFlashBoost = 0;
    if (!preserveSavedPosition) {
      this.mansionRoot.position.set(
        -EXTERIOR_SPAWN_LOCAL_X,
        0,
        -EXTERIOR_SPAWN_LOCAL_Z,
      );
      this.cameraYaw = EXTERIOR_SPAWN_YAW;
      this.cameraPitch = 0;
      this.playerFloorY = 0;
      this.currentRoomId = 'forest_road_jungle';
      this.currentRoomNameHi = 'काली घाटी जंगल सड़क और खराब SUV';
      this.currentFloorLevel = 0;
    }
    if (!this.blackoutTrapTriggered && this.haveli) {
      const frontGate = this.haveli.doors.find(
        (d) => d.id === 'door_front_iron_gate',
      );
      if (frontGate) {
        const shouldOpenGate = this.entryPhase === 'courtyard_approach';
        frontGate.isOpen = shouldOpenGate;
        frontGate.targetAngle = shouldOpenGate ? frontGate.openAngle : 0;
        frontGate.currentAngle = frontGate.targetAngle;
        frontGate.pivot.rotation.y = frontGate.targetAngle;
      }
      const mainDoor = this.haveli.doors.find(
        (d) => d.id === 'door_main_entrance',
      );
      if (mainDoor) {
        mainDoor.isOpen = false;
        mainDoor.targetAngle = 0;
        mainDoor.currentAngle = 0;
        mainDoor.pivot.rotation.y = 0;
      }
    }
    if (this.witchModel) {
      this.witchModel.root.position.set(0, 0, -5.8);
      this.witchModel.root.rotation.set(0, 0, 0);
    }
    if (this.playerArms) {
      this.playerArms.group.visible = true;
    }
    const cam = xb.core.camera as THREE.PerspectiveCamera | undefined;
    const scene = xb.core.scene;
    if (cam) {
      if (scene && !cam.parent) {
        scene.add(cam);
      }
      cam.position.set(0, 1.7, 0);
      cam.rotation.order = 'YXZ';
      cam.rotation.set(0, this.cameraYaw, 0);
      if (this.storyDefaultFov > 0 && cam.fov !== this.storyDefaultFov) {
        cam.fov = this.storyDefaultFov;
        cam.updateProjectionMatrix();
      }
      cam.updateMatrixWorld(true);
    }
    if (scene) {
      scene.background = _storyNightSkyColor;
      _nightHorizonFog.color.setHex(0x0b101d);
      _nightHorizonFog.density = this.isMobileDevice() ? 0.009 : 0.015;
      scene.fog = _nightHorizonFog;
    }
    if (this.isMobileDevice()) {
      this.applyMobileGlobalSceneCleanup();
    }
    this.syncViewportSize();
  }

  public syncViewportSize() {
    const w = Math.max(1, window.innerWidth || 800);
    const h = Math.max(1, window.innerHeight || 450);
    const isMobile = this.isMobileDevice();
    const isSmoothOrMobile = this.graphicsQuality === 'low' || isMobile;

    const renderer = xb.core.renderer;
    if (renderer instanceof THREE.WebGLRenderer) {
      renderer.setClearColor(0x0b101d, 1);
      if (isMobile) {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      } else if (isSmoothOrMobile) {
        renderer.setPixelRatio(1);
      }
      renderer.setSize(w, h);
      const canvas = renderer.domElement;
      if (canvas) {
        const clampedBright = Math.max(
          80,
          Math.min(130, Math.round(this.brightnessPercent)),
        );
        canvas.style.position = 'fixed';
        canvas.style.inset = '0';
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.display = 'block';
        canvas.style.zIndex = '1';
        canvas.style.backgroundColor = '#0b101d';
        canvas.style.filter =
          clampedBright === 100 ? 'none' : `brightness(${clampedBright}%)`;
      }
    }

    const cam = xb.core.camera as THREE.PerspectiveCamera | undefined;
    if (cam) {
      cam.aspect = w / h;
      cam.near = isMobile ? 0.25 : 0.1;
      cam.far = isMobile ? 70 : isSmoothOrMobile ? 95 : 280;
      cam.updateProjectionMatrix();
    }
  }

  private updateStoryCutsceneCamera(
    cam: THREE.PerspectiveCamera,
    dt: number,
    time: number,
  ) {
    this.storyShotElapsed += dt;
    this.mansionRoot.position.set(0, 0, -36.0);

    // Smooth atmospheric lighting for 3D story scenes + lightning surge on beat cuts
    if (this.storyFlashBoost > 0) {
      this.storyFlashBoost = Math.max(0, this.storyFlashBoost - dt * 2.8);
    }
    const shot = this.activeStoryShot;
    const isFlashback = Boolean(shot?.isFlashback);
    const scene = xb.core.scene;
    if (scene) {
      if (this.storyFlashBoost > 0.12) {
        scene.background = _storyLightningSkyColor;
      } else {
        scene.background = isFlashback
          ? _storyFlashbackSkyColor
          : _storyNightSkyColor;
      }
      _nightHorizonFog.color.copy(
        isFlashback ? _storyFlashbackSkyColor : _storyNightSkyColor,
      );
      _nightHorizonFog.density = 0.009;
      scene.fog = _nightHorizonFog;
    }

    if (this.ambientLight) {
      this.ambientLight.color.setHex(isFlashback ? 0xffdfb8 : 0xb8cfff);
      this.ambientLight.intensity = Math.min(
        1.45,
        1.15 + this.storyFlashBoost * 0.45,
      );
    }
    if (this.hemiLight) {
      this.hemiLight.color.setHex(isFlashback ? 0xffdca8 : 0xa3c2ff);
      this.hemiLight.groundColor.setHex(isFlashback ? 0x5c3c22 : 0x2a2433);
      this.hemiLight.intensity = Math.min(
        1.45,
        1.1 + this.storyFlashBoost * 0.45,
      );
    }
    if (this.moonKeyLight) {
      this.moonKeyLight.color.setHex(isFlashback ? 0xffe4bd : 0xd6e6ff);
      this.moonKeyLight.intensity = Math.min(
        2.2,
        1.35 + this.storyFlashBoost * 0.85,
      );
    }
    if (this.oppositeDirLight) {
      this.oppositeDirLight.color.setHex(0xff8e6b);
      this.oppositeDirLight.intensity = Math.min(
        1.1,
        0.85 + this.storyFlashBoost * 0.35,
      );
    }
    if (this.flashlight) {
      this.flashlight.intensity = 1.85;
      this.flashlight.distance = 26;
      this.flashlight.color.setHex(isFlashback ? 0xffe3b0 : 0xfff5e4);
    }

    // Position Rukmini dramatically inside the corridor when a stalk shot is active
    if (this.witchModel && shot?.location === 'rukmini_stalk') {
      const stalkT = Math.min(1, this.storyShotElapsed / 6.0);
      this.witchModel.root.position.set(
        Math.sin(time * 0.9) * 0.25,
        0,
        THREE.MathUtils.lerp(-5.2, -2.6, stalkT),
      );
      this.witchModel.root.rotation.y = 0;
    }

    // Continuous smooth camera glide from start -> end over the duration of the spoken line
    const rawT = Math.min(1, this.storyShotElapsed / 6.5);
    const smoothT = rawT * rawT * (3 - 2 * rawT);

    _storyLerpCamPos
      .lerpVectors(this.storyStartCamLocal, this.storyEndCamLocal, smoothT)
      .add(this.mansionRoot.position);
    _storyLerpLookPos
      .lerpVectors(this.storyStartLookLocal, this.storyEndLookLocal, smoothT)
      .add(this.mansionRoot.position);

    // Subtle organic Steadicam breathing / handheld motion so the frame is never static
    const swayAmp = shot?.motionStyle === 'handheld_stalk' ? 0.055 : 0.025;
    _storyLerpCamPos.x += Math.sin(time * 1.15) * swayAmp;
    _storyLerpCamPos.y += Math.cos(time * 0.9) * (swayAmp * 0.7);

    cam.position.copy(_storyLerpCamPos);
    cam.lookAt(_storyLerpLookPos);

    const targetFov = THREE.MathUtils.lerp(
      this.storyStartFov,
      this.storyEndFov,
      smoothT,
    );
    if (Math.abs(cam.fov - targetFov) > 0.05) {
      cam.fov = targetFov;
      cam.updateProjectionMatrix();
    }
    cam.updateMatrixWorld(true);
  }

  /**
   * Pushes a follower position horizontally clear of all Haveli doorways on that floor
   * so rescued friends never block the player's path through any doorframe.
   */
  private pushPositionOutOfDoorways(
    x: number,
    z: number,
    floorY: number,
    minDoorClearance = 1.6,
  ): { x: number; z: number } {
    if (!this.haveli) return { x, z };
    let outX = x;
    let outZ = z;
    for (const door of this.haveli.doors) {
      if (Math.abs(door.position.y - floorY) > 1.8) continue;
      const dx = outX - door.position.x;
      const dz = outZ - door.position.z;
      const d = Math.hypot(dx, dz);
      if (d < minDoorClearance) {
        if (d > 0.05) {
          outX = door.position.x + (dx / d) * minDoorClearance;
          outZ = door.position.z + (dz / d) * minDoorClearance;
        } else {
          // Fallback along door normal (facing away from door frame axis)
          outZ = door.position.z + minDoorClearance;
        }
      }
    }
    return { x: outX, z: outZ };
  }

  private updateCompanionFriends(
    dt: number,
    time: number,
    playerLocalX: number,
    playerLocalZ: number,
  ) {
    if (this.companionFriends.length === 0) return;

    const cam = xb.core.camera as THREE.Camera | undefined;
    if (cam) {
      cam.getWorldPosition(_playerWorldPos);
    }

    // During active indoor mission, rescued friends quietly follow behind the player,
    // stay out of doorways, hold the secondary flashlight (1st rescued), and crouch/hide together!
    if (this.entryPhase === 'mission_active') {
      const activeFollowers = this.companionFriends.filter(
        (c) => c.isRescuedFollower && c.char.root.visible,
      );
      if (activeFollowers.length === 0) return;

      // Sort by rescueOrder so slot 0 is always the 1st rescued friend
      activeFollowers.sort((a, b) => a.rescueOrder - b.rescueOrder);

      // STRICT WELL COURTYARD GUARD:
      // NEVER teleport, follow-snap, or move any friend into the enclosed Back Well Courtyard!
      // Whenever the player is in the Well Courtyard or the Well door is locked after a respawn,
      // keep all already-rescued friends waiting safely inside the Ground Floor Main Hall.
      const isPlayerInWellCourtyard =
        this.isWellDoorLockedForRespawn ||
        (playerLocalZ < -45.4 && this.playerFloorY > -1.5);
      if (isPlayerInWellCourtyard) {
        const mainHallSafeSpots: Array<[number, number]> = [
          [-2.4, 3.8],
          [2.4, 3.8],
          [0.0, 5.2],
        ];
        activeFollowers.forEach((comp, slotIdx) => {
          const fPos = comp.char.root.position;
          const isFirstRescued = comp.rescueOrder === 1;
          if (isFirstRescued) {
            comp.char.setSecondaryTorchEnabled?.(true, this.isHaveliBlackout ? 0 : 0.75);
          } else if (comp.char.hasSecondaryTorch) {
            comp.char.setSecondaryTorchEnabled?.(false, 0);
          }
          // If a friend is ever near or inside the Well Courtyard, keep them safely inside the Main Hall
          if (fPos.z < -43.5 && fPos.y > -1.5) {
            const safeSpot =
              mainHallSafeSpots[slotIdx % mainHallSafeSpots.length] ?? [0, 4.2];
            fPos.set(safeSpot[0], 0, safeSpot[1]);
          }
          comp.navPath = [];
          comp.navPathIdx = 0;
          comp.stuckTimer = 0;
          comp.currentSpeed = 0;
          comp.char.setAnimation('idle');
          comp.char.update(dt, time, 0, _playerWorldPos, false);
        });
        return;
      }

      const backX = Math.sin(this.cameraYaw);
      const backZ = Math.cos(this.cameraYaw);
      const rightX = Math.cos(this.cameraYaw);
      const rightZ = -Math.sin(this.cameraYaw);

      activeFollowers.forEach((comp, slotIdx) => {
        const fPos = comp.char.root.position;
        const isFirstRescued = comp.rescueOrder === 1;

        // First rescued friend holds a dim secondary flashlight gently lighting the dark corridor behind the player.
        // Dim it right down whenever hiding so Rukmini doesn't spot the beam!
        if (isFirstRescued) {
          const torchScale = this.isHaveliBlackout
            ? 0
            : this.activeHidingSpot
              ? 0.04
              : 1.0;
          comp.char.setSecondaryTorchEnabled?.(true, torchScale);
        } else if (comp.char.hasSecondaryTorch) {
          comp.char.setSecondaryTorchEnabled?.(false, 0);
        }

        let desiredGoalX = playerLocalX;
        let desiredGoalY = this.playerFloorY;
        let desiredGoalZ = playerLocalZ;

        if (this.activeHidingSpot) {
          // Player entered a hiding spot -> rescued friend automatically crouches/hides quietly in shadow beside it
          const spot = this.activeHidingSpot;
          const spotLatX = Math.cos(spot.lookYaw);
          const spotLatZ = -Math.sin(spot.lookYaw);
          const spotBackX = -Math.sin(spot.lookYaw);
          const spotBackZ = -Math.cos(spot.lookYaw);
          const latShift = slotIdx === 0 ? -0.78 : slotIdx === 1 ? 0.78 : 0.0;
          const backShift = slotIdx === 2 ? -0.95 : -0.45;
          desiredGoalX = spot.position.x + spotLatX * latShift + spotBackX * backShift;
          desiredGoalY = spot.floorY;
          desiredGoalZ = spot.position.z + spotLatZ * latShift + spotBackZ * backShift;
        } else {
          // Quietly follow behind the player's back keeping a natural 3.5m+ spacing buffer
          const backDist = 3.7 + Math.floor(slotIdx / 2) * 1.05;
          const sideDist = slotIdx === 0 ? -1.15 : slotIdx === 1 ? 1.15 : 0.0;
          desiredGoalX = playerLocalX + backX * backDist + rightX * sideDist;
          desiredGoalY = this.playerFloorY;
          desiredGoalZ = playerLocalZ + backZ * backDist + rightZ * sideDist;
        }

        // Clamp inside 64m x 56m Royal Palace interior (keep Ground Floor strictly out of the Back Well Courtyard z < -44.2)
        const goalMinZ = desiredGoalY < -0.5 ? -79.2 : -44.2;
        const goalMaxX = desiredGoalY < -0.5 ? 27.2 : 31.0;
        desiredGoalX = THREE.MathUtils.clamp(desiredGoalX, -goalMaxX, goalMaxX);
        desiredGoalZ = THREE.MathUtils.clamp(desiredGoalZ, goalMinZ, 9.2);

        const doorwayCleared = this.pushPositionOutOfDoorways(
          desiredGoalX,
          desiredGoalZ,
          desiredGoalY,
          1.62,
        );
        desiredGoalX = doorwayCleared.x;
        desiredGoalZ = doorwayCleared.z;

        if (this.haveli) {
          const validGoal = this.haveli.resolveCollision(
            this.activeHidingSpot ? this.activeHidingSpot.exitPos.x : playerLocalX,
            this.activeHidingSpot ? this.activeHidingSpot.exitPos.z : playerLocalZ,
            desiredGoalX,
            desiredGoalZ,
            desiredGoalY,
            0.38,
          );
          desiredGoalX = validGoal.x;
          desiredGoalZ = validGoal.z;
          desiredGoalY = THREE.MathUtils.clamp(
            this.haveli.getElevationAt(desiredGoalX, desiredGoalZ, desiredGoalY),
            -4.5,
            10.0,
          );
        }

        // Maintain minimum 3.5m personal-space buffer so rescued friends never clip into the player's camera/face
        if (!this.activeHidingSpot) {
          const pdx = desiredGoalX - playerLocalX;
          const pdz = desiredGoalZ - playerLocalZ;
          const pDist = Math.hypot(pdx, pdz);
          if (pDist < 3.5) {
            if (pDist > 0.05) {
              desiredGoalX = playerLocalX + (pdx / pDist) * 3.65;
              desiredGoalZ = playerLocalZ + (pdz / pDist) * 3.65;
            } else {
              desiredGoalX = playerLocalX + backX * 3.65;
              desiredGoalZ = playerLocalZ + backZ * 3.65;
            }
            if (this.haveli) {
              const bufferedGoal = this.haveli.resolveCollision(
                playerLocalX,
                playerLocalZ,
                desiredGoalX,
                desiredGoalZ,
                desiredGoalY,
                0.38,
              );
              desiredGoalX = bufferedGoal.x;
              desiredGoalZ = bufferedGoal.z;
              desiredGoalY = THREE.MathUtils.clamp(
                this.haveli.getElevationAt(desiredGoalX, desiredGoalZ, desiredGoalY),
                -4.5,
                10.0,
              );
            }
          }
        }

        // Gentle separation between multiple rescued friends
        for (let otherIdx = 0; otherIdx < activeFollowers.length; otherIdx++) {
          if (otherIdx === slotIdx) continue;
          const otherPos = activeFollowers[otherIdx].char.root.position;
          if (Math.abs(otherPos.y - desiredGoalY) > 1.5) continue;
          const sdx = desiredGoalX - otherPos.x;
          const sdz = desiredGoalZ - otherPos.z;
          const sd = Math.hypot(sdx, sdz);
          if (sd < 0.72 && sd > 0.02) {
            desiredGoalX += (sdx / sd) * (0.72 - sd);
            desiredGoalZ += (sdz / sd) * (0.72 - sd);
          }
        }

        const goalVec = new THREE.Vector3(desiredGoalX, desiredGoalY, desiredGoalZ);
        const totalDistToGoal = Math.hypot(
          desiredGoalX - fPos.x,
          desiredGoalZ - fPos.z,
        );
        const floorDiff = Math.abs(desiredGoalY - fPos.y);

        // Emergency recovery if friend is stranded far behind across floors/closed doors (NEVER into the Well Courtyard!)
        if (
          !this.activeHidingSpot &&
          !(desiredGoalY > -1.5 && desiredGoalZ < -32.2) &&
          (totalDistToGoal > 22.0 || (this.stuckTimerSafe(comp) > 4.2 && totalDistToGoal > 8.5))
        ) {
          fPos.set(desiredGoalX, desiredGoalY, desiredGoalZ);
          comp.navPath = [];
          comp.navPathIdx = 0;
          comp.stuckTimer = 0;
        }

        comp.navTimer -= dt;
        const goalShifted = comp.lastGoalPos.distanceTo(goalVec) > 0.85;
        if (
          this.haveli &&
          (floorDiff > 1.0 ||
            !this.haveli.isLineOfSightClear(
              fPos.x,
              fPos.z,
              desiredGoalX,
              desiredGoalZ,
              fPos.y,
              0.38,
            ))
        ) {
          if (
            comp.navPath.length === 0 ||
            comp.navPathIdx >= comp.navPath.length ||
            goalShifted ||
            comp.navTimer <= 0
          ) {
            comp.navPath = this.haveli.findNavigationPath(fPos, goalVec);
            comp.navPathIdx = 0;
            if (
              comp.navPath.length > 1 &&
              Math.hypot(comp.navPath[0].x - fPos.x, comp.navPath[0].z - fPos.z) < 0.45 &&
              Math.abs(comp.navPath[0].y - fPos.y) < 1.2
            ) {
              comp.navPathIdx = 1;
            }
            comp.lastGoalPos.copy(goalVec);
            comp.navTimer = 0.48;
          }
        } else {
          comp.navPath = [goalVec];
          comp.navPathIdx = 0;
          comp.lastGoalPos.copy(goalVec);
        }

        let waypoint = comp.navPath[comp.navPathIdx] ?? goalVec;
        const wpDist = Math.hypot(waypoint.x - fPos.x, waypoint.z - fPos.z);
        if (
          wpDist < 0.42 &&
          Math.abs(waypoint.y - fPos.y) < 1.3 &&
          comp.navPathIdx < comp.navPath.length - 1
        ) {
          comp.navPathIdx++;
          waypoint = comp.navPath[comp.navPathIdx];
        }

        const dx = waypoint.x - fPos.x;
        const dz = waypoint.z - fPos.z;
        const stepGoalDist = Math.hypot(dx, dz);
        const stopRadius = this.activeHidingSpot ? 0.28 : 0.34;

        if (stepGoalDist > stopRadius || floorDiff > 1.1) {
          const maxSpd = this.activeHidingSpot ? 4.4 : 3.95;
          const speed = THREE.MathUtils.clamp(stepGoalDist * 2.2, 1.55, maxSpd);
          const step = Math.min(Math.max(stepGoalDist, 0.01), speed * dt);
          const prevX = fPos.x;
          const prevZ = fPos.z;
          const rawNextX = prevX + (dx / Math.max(stepGoalDist, 0.001)) * step;
          const rawNextZ = prevZ + (dz / Math.max(stepGoalDist, 0.001)) * step;

          if (this.haveli) {
            const resolved = this.haveli.resolveCollision(
              prevX,
              prevZ,
              rawNextX,
              rawNextZ,
              fPos.y,
              0.34,
            );
            fPos.x = resolved.x;
            fPos.z = resolved.z;
            const targetElev = THREE.MathUtils.clamp(
              this.haveli.getElevationAt(fPos.x, fPos.z, fPos.y),
              -4.5,
              10.0,
            );
            fPos.y = THREE.MathUtils.lerp(fPos.y, targetElev, Math.min(1, dt * 24));
          } else {
            fPos.x = rawNextX;
            fPos.z = rawNextZ;
          }

          const moved = Math.hypot(fPos.x - prevX, fPos.z - prevZ);
          if (moved < step * 0.15) {
            comp.stuckTimer += dt;
            if (comp.stuckTimer > 1.1) {
              comp.navPath = [];
            }
          } else {
            comp.stuckTimer = 0;
          }

          comp.currentSpeed = speed;
          comp.char.setAnimation(speed > 3.15 ? 'run' : 'walk');

          const desiredYaw = Math.atan2(dx, dz);
          const yawDiff = Math.atan2(
            Math.sin(desiredYaw - comp.char.root.rotation.y),
            Math.cos(desiredYaw - comp.char.root.rotation.y),
          );
          comp.char.root.rotation.y += yawDiff * Math.min(1, dt * 8);
        } else {
          // Stationary: ensure friend is NOT lingering inside any doorway threshold
          const doorPush = this.pushPositionOutOfDoorways(
            fPos.x,
            fPos.z,
            fPos.y,
            1.58,
          );
          if (
            Math.hypot(doorPush.x - fPos.x, doorPush.z - fPos.z) > 0.08 &&
            this.haveli
          ) {
            const safeClear = this.haveli.resolveCollision(
              fPos.x,
              fPos.z,
              doorPush.x,
              doorPush.z,
              fPos.y,
              0.34,
            );
            fPos.x = THREE.MathUtils.lerp(fPos.x, safeClear.x, Math.min(1, dt * 5));
            fPos.z = THREE.MathUtils.lerp(fPos.z, safeClear.z, Math.min(1, dt * 5));
          }

          comp.currentSpeed = 0;
          comp.stuckTimer = 0;
          if (this.activeHidingSpot) {
            // Automatically crouch low inside shadow while player is hiding
            comp.char.setAnimation('crouch');
            const faceSpotYaw = this.activeHidingSpot.lookYaw;
            const yawDiff = Math.atan2(
              Math.sin(faceSpotYaw - comp.char.root.rotation.y),
              Math.cos(faceSpotYaw - comp.char.root.rotation.y),
            );
            comp.char.root.rotation.y += yawDiff * Math.min(1, dt * 6);
          } else {
            comp.char.setAnimation('idle');
            // Face gently toward the player / corridor direction so 1st friend's torch lights the dark corridor behind the player
            const lookTargetX = isFirstRescued ? playerLocalX : fPos.x - backX;
            const lookTargetZ = isFirstRescued ? playerLocalZ : fPos.z - backZ;
            const desiredYaw = Math.atan2(
              lookTargetX - fPos.x,
              lookTargetZ - fPos.z,
            );
            const yawDiff = Math.atan2(
              Math.sin(desiredYaw - comp.char.root.rotation.y),
              Math.cos(desiredYaw - comp.char.root.rotation.y),
            );
            comp.char.root.rotation.y += yawDiff * Math.min(1, dt * 5);
          }
        }

        const isWitchClose =
          this.witchModel && !this.witchBanished
            ? fPos.distanceTo(this.witchModel.root.position) < 9.0
            : false;
        comp.char.update(
          dt,
          time,
          comp.currentSpeed,
          _playerWorldPos,
          Boolean(isWitchClose && !this.activeHidingSpot && comp.currentSpeed < 0.2),
        );
      });
      return;
    }

    if (this.entryPhase === 'victory_escape_cutscene') {
      return;
    }

    const canFollowPlayer =
      this.entryPhase === 'exterior_walk' ||
      this.entryPhase === 'courtyard_approach' ||
      this.entryPhase === 'entering_haveli';

    // Track player travel heading so companions trail smoothly around all 4 sides without orbiting on stationary head turns
    if (!this.hasPrevCompanionPlayer) {
      this.prevCompanionPlayerX = playerLocalX;
      this.prevCompanionPlayerZ = playerLocalZ;
      this.hasPrevCompanionPlayer = true;
    } else {
      const moveDx = playerLocalX - this.prevCompanionPlayerX;
      const moveDz = playerLocalZ - this.prevCompanionPlayerZ;
      const moveD = Math.hypot(moveDx, moveDz);
      if (moveD > 0.035) {
        const moveHeading = Math.atan2(-moveDx, -moveDz);
        const headingDiff = Math.atan2(
          Math.sin(moveHeading - this.companionTrailYaw),
          Math.cos(moveHeading - this.companionTrailYaw),
        );
        this.companionTrailYaw += headingDiff * Math.min(1, dt * 6);
        this.prevCompanionPlayerX = playerLocalX;
        this.prevCompanionPlayerZ = playerLocalZ;
      }
    }

    const trailBackX = Math.sin(this.companionTrailYaw);
    const trailBackZ = Math.cos(this.companionTrailYaw);
    const trailRightX = Math.cos(this.companionTrailYaw);
    const trailRightZ = -Math.sin(this.companionTrailYaw);

    const exteriorCorners: Array<[number, number]> = [
      [-34.5, 12.2],
      [34.5, 12.2],
      [-34.5, -48.5],
      [34.5, -48.5],
      [-13.5, -60.5],
      [13.5, -60.5],
      [0.0, 36.2],
      [0.0, 31.8],
      [0.0, 14.0],
    ];

    for (let compIdx = 0; compIdx < this.companionFriends.length; compIdx++) {
      const comp = this.companionFriends[compIdx];
      if (!comp.char.root.visible) continue;

      if (!canFollowPlayer) {
        comp.currentSpeed = 0;
        comp.char.setAnimation('idle');
        const lookAtGuard =
          this.entryPhase === 'guard_dialogue' || this.isMiniCutsceneActive;
        const lx = lookAtGuard ? 2.45 : 0;
        const lz = lookAtGuard ? 35.0 : -5.0;
        comp.char.root.rotation.y = Math.atan2(
          lx - comp.char.root.position.x,
          lz - comp.char.root.position.z,
        );
        comp.char.update(dt, time, 0, _playerWorldPos, false);
        continue;
      }

      let targetX: number;
      let targetZ: number;

      const MIN_FRIEND_PLAYER_BUFFER = 3.5;

      if (this.entryPhase === 'entering_haveli') {
        targetX = THREE.MathUtils.clamp(comp.formationX * 0.65, -1.15, 1.15);
        targetZ = Math.max(8.4, playerLocalZ + Math.max(3.55, comp.formationZ * 0.92));
      } else {
        targetX = THREE.MathUtils.clamp(
          playerLocalX +
            trailRightX * comp.formationX +
            trailBackX * comp.formationZ,
          -46.5,
          46.5,
        );
        targetZ = THREE.MathUtils.clamp(
          playerLocalZ +
            trailRightZ * comp.formationX +
            trailBackZ * comp.formationZ,
          -65.5,
          70.5,
        );

        // Funnel smoothly through Outer Iron Gate (z = 34.0) when walking into the 24m Royal Front Forecourt
        if (
          this.entryPhase === 'courtyard_approach' &&
          Math.abs(comp.char.root.position.z - 34.0) < 1.8 &&
          Math.abs(comp.char.root.position.x) < 4.5 &&
          playerLocalZ < 34.6 &&
          Math.abs(playerLocalX) < 7.0
        ) {
          targetX = THREE.MathUtils.clamp(comp.formationX * 0.65, -1.25, 1.25);
        }

        // Guarantee target stays at least 3.65m away from the player
        const tdx = targetX - playerLocalX;
        const tdz = targetZ - playerLocalZ;
        const tDist = Math.hypot(tdx, tdz);
        if (tDist < MIN_FRIEND_PLAYER_BUFFER + 0.15) {
          const pushDist = MIN_FRIEND_PLAYER_BUFFER + 0.25;
          if (tDist > 0.05) {
            targetX = THREE.MathUtils.clamp(
              playerLocalX + (tdx / tDist) * pushDist,
              -46.5,
              46.5,
            );
            targetZ = THREE.MathUtils.clamp(
              playerLocalZ + (tdz / tDist) * pushDist,
              -65.5,
              70.5,
            );
          } else {
            targetX = THREE.MathUtils.clamp(
              playerLocalX + trailBackX * pushDist,
              -46.5,
              46.5,
            );
            targetZ = THREE.MathUtils.clamp(
              playerLocalZ + trailBackZ * pushDist,
              -65.5,
              70.5,
            );
          }
        }
      }

      // Comfortable companion-to-companion separation so friends don't bunch up
      for (let otherIdx = 0; otherIdx < compIdx; otherIdx++) {
        const other = this.companionFriends[otherIdx];
        if (!other.char.root.visible) continue;
        const sdx = targetX - other.char.root.position.x;
        const sdz = targetZ - other.char.root.position.z;
        const sd = Math.hypot(sdx, sdz);
        if (sd < 1.15 && sd > 0.02) {
          targetX += (sdx / sd) * (1.15 - sd);
          targetZ += (sdz / sd) * (1.15 - sd);
        }
      }

      const cx = comp.char.root.position.x;
      const cz = comp.char.root.position.z;
      const distFromPlayer = Math.hypot(cx - playerLocalX, cz - playerLocalZ);
      const totalDistToTarget = Math.hypot(targetX - cx, targetZ - cz);

      // Steer around Haveli exterior corners if direct path is blocked by exterior walls
      let steerX = targetX;
      let steerZ = targetZ;
      if (
        this.entryPhase !== 'entering_haveli' &&
        this.haveli &&
        totalDistToTarget > 0.8 &&
        !this.haveli.isLineOfSightClear(cx, cz, targetX, targetZ, 0, 0.42)
      ) {
        let bestCornerCost = Infinity;
        for (const [wx, wz] of exteriorCorners) {
          const dFromSelf = Math.hypot(wx - cx, wz - cz);
          if (dFromSelf < 0.5) continue;
          if (!this.haveli.isLineOfSightClear(cx, cz, wx, wz, 0, 0.42)) continue;
          const cost = dFromSelf + Math.hypot(targetX - wx, targetZ - wz);
          if (cost < bestCornerCost) {
            bestCornerCost = cost;
            steerX = wx;
            steerZ = wz;
          }
        }
      }

      const dx = steerX - cx;
      const dz = steerZ - cz;
      const dist = Math.hypot(dx, dz);

      // If the player walks backward toward the friends (< 3.25m), friends step back gently to preserve 3.5m buffer
      if (
        this.entryPhase !== 'entering_haveli' &&
        distFromPlayer < MIN_FRIEND_PLAYER_BUFFER - 0.2
      ) {
        const awayX = distFromPlayer > 0.05 ? (cx - playerLocalX) / distFromPlayer : trailBackX;
        const awayZ = distFromPlayer > 0.05 ? (cz - playerLocalZ) / distFromPlayer : trailBackZ;
        const retreatSpeed = 2.4;
        const retreatStep = Math.min(
          MIN_FRIEND_PLAYER_BUFFER - distFromPlayer,
          retreatSpeed * dt,
        );
        const rawBackX = cx + awayX * retreatStep;
        const rawBackZ = cz + awayZ * retreatStep;
        if (this.haveli) {
          const resolved = this.haveli.resolveCollision(
            cx,
            cz,
            rawBackX,
            rawBackZ,
            0,
            0.42,
          );
          comp.char.root.position.x = resolved.x;
          comp.char.root.position.z = resolved.z;
        } else {
          comp.char.root.position.x = rawBackX;
          comp.char.root.position.z = rawBackZ;
        }
        comp.currentSpeed = retreatSpeed * 0.7;
        comp.char.setAnimation('walk');
        const faceYaw = Math.atan2(
          playerLocalX - comp.char.root.position.x,
          playerLocalZ - comp.char.root.position.z,
        );
        const yawDiff = Math.atan2(
          Math.sin(faceYaw - comp.char.root.rotation.y),
          Math.cos(faceYaw - comp.char.root.rotation.y),
        );
        comp.char.root.rotation.y += yawDiff * Math.min(1, dt * 6);
      } else if (totalDistToTarget > 0.35 && dist > 0.14) {
        const speed = THREE.MathUtils.clamp(totalDistToTarget * 2.1, 1.9, 4.7);
        const step = Math.min(dist, speed * dt);
        let rawNextX = cx + (dx / dist) * step;
        let rawNextZ = cz + (dz / dist) * step;

        // Hard 3.5m personal-space clamp: stop cleanly at the 3.5m perimeter instead of closing into the player
        const nextDistFromPlayer = Math.hypot(
          rawNextX - playerLocalX,
          rawNextZ - playerLocalZ,
        );
        if (
          this.entryPhase !== 'entering_haveli' &&
          nextDistFromPlayer < MIN_FRIEND_PLAYER_BUFFER &&
          nextDistFromPlayer < distFromPlayer
        ) {
          if (distFromPlayer <= MIN_FRIEND_PLAYER_BUFFER + 0.08) {
            // Already at comfortable 3.5m distance — hold still naturally
            rawNextX = cx;
            rawNextZ = cz;
          } else {
            const pDirX = (rawNextX - playerLocalX) / Math.max(0.001, nextDistFromPlayer);
            const pDirZ = (rawNextZ - playerLocalZ) / Math.max(0.001, nextDistFromPlayer);
            rawNextX = playerLocalX + pDirX * MIN_FRIEND_PLAYER_BUFFER;
            rawNextZ = playerLocalZ + pDirZ * MIN_FRIEND_PLAYER_BUFFER;
          }
        }

        const movedDist = Math.hypot(rawNextX - cx, rawNextZ - cz);
        if (movedDist > 0.004) {
          if (this.haveli && this.entryPhase !== 'entering_haveli') {
            const resolved = this.haveli.resolveCollision(
              cx,
              cz,
              rawNextX,
              rawNextZ,
              0,
              0.42,
            );
            comp.char.root.position.x = resolved.x;
            comp.char.root.position.z = resolved.z;
          } else {
            comp.char.root.position.x = rawNextX;
            comp.char.root.position.z = rawNextZ;
          }

          // Recovery teleport if caught impossibly far behind on another side of the estate
          if (totalDistToTarget > 32.0 && this.haveli) {
            const fallback = this.haveli.resolveCollision(
              playerLocalX,
              playerLocalZ,
              targetX,
              targetZ,
              0,
              0.42,
            );
            comp.char.root.position.set(fallback.x, 0, fallback.z);
          }

          comp.currentSpeed = speed;
          comp.char.setAnimation(speed > 3.25 ? 'run' : 'walk');
          const desiredYaw = Math.atan2(dx, dz);
          const yawDiff = Math.atan2(
            Math.sin(desiredYaw - comp.char.root.rotation.y),
            Math.cos(desiredYaw - comp.char.root.rotation.y),
          );
          comp.char.root.rotation.y += yawDiff * Math.min(1, dt * 8);
        } else {
          comp.currentSpeed = 0;
          comp.char.setAnimation('idle');
          const faceYaw = Math.atan2(
            playerLocalX - comp.char.root.position.x,
            playerLocalZ - comp.char.root.position.z,
          );
          const yawDiff = Math.atan2(
            Math.sin(faceYaw - comp.char.root.rotation.y),
            Math.cos(faceYaw - comp.char.root.rotation.y),
          );
          comp.char.root.rotation.y += yawDiff * Math.min(1, dt * 4);
        }
      } else {
        comp.currentSpeed = 0;
        comp.char.setAnimation('idle');
        const faceYaw = Math.atan2(
          playerLocalX - comp.char.root.position.x,
          playerLocalZ - comp.char.root.position.z,
        );
        const yawDiff = Math.atan2(
          Math.sin(faceYaw - comp.char.root.rotation.y),
          Math.cos(faceYaw - comp.char.root.rotation.y),
        );
        comp.char.root.rotation.y += yawDiff * Math.min(1, dt * 4);
      }

      comp.char.update(dt, time, comp.currentSpeed, _playerWorldPos, false);
    }
  }

  private stuckTimerSafe(comp: CompanionFriendInstance): number {
    return Number.isFinite(comp.stuckTimer) ? comp.stuckTimer : 0;
  }

  private currentUpdateTick = 0;
  private lastMainSceneRenderTick = -1;

  update() {
    this.currentUpdateTick++;
    const rawDt = xb.getDeltaTime ? xb.getDeltaTime() : 0.016;
    const dt = Math.min(rawDt, 0.05);

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    const time = performance.now() * 0.001;
    this.clearSimulatorDaytimeSkybox();
    const cam = xb.core.camera as THREE.PerspectiveCamera | undefined;

    if (cam) {
      if (xb.core.scene && !cam.parent) {
        xb.core.scene.add(cam);
      }
      const isMobile = this.isMobileDevice();
      let projDirty = false;
      const targetNear = isMobile ? 0.25 : 0.1;
      if (cam.near !== targetNear) {
        cam.near = targetNear;
        projDirty = true;
      }
      const targetFar = isMobile
        ? 70
        : this.graphicsQuality === 'low'
          ? 95
          : 280;
      if (cam.far !== targetFar) {
        cam.far = targetFar;
        projDirty = true;
      }
      if (projDirty) {
        cam.updateProjectionMatrix();
      }
      if (this.audioListener && this.audioListener.parent !== cam) {
        cam.add(this.audioListener);
      }

      // Apply authoritative 360-degree mouse-look yaw & pitch and zone-aware floor height clamping when not in a physical XR headset
      const isPresentingXr = Boolean(
        (xb.core.renderer as THREE.WebGLRenderer | undefined)?.xr?.isPresenting,
      );
      if (!isPresentingXr) {
        if (this.gameState === 'story') {
          const canvas = this.getGameCanvas();
          if (canvas && canvas.style.cursor !== 'auto') {
            canvas.style.cursor = 'auto';
          }
          this.updateStoryCutsceneCamera(cam, dt, time);
        } else if (
          this.gameState === 'playing' &&
          this.entryPhase === 'capture_jumpscare'
        ) {
          this.updateCaptureJumpscareSequence(cam, dt, time);
        } else if (
          this.gameState === 'playing' &&
          this.entryPhase === 'victory_escape_cutscene'
        ) {
          this.updateVictoryEscapeCutscene(cam, dt, time);
        } else if (this.gameState === 'playing' && this.isMiniCutsceneActive) {
          this.entryAnimElapsed += dt;
          const duration =
            this.entryPhase === 'guard_cutscene_key' ? 2.8 : 3.3;
          const rawT = Math.min(1, this.entryAnimElapsed / duration);
          const smoothT = rawT * rawT * (3 - 2 * rawT);

          _storyLerpCamPos
            .lerpVectors(
              this.entryCutsceneCamStart,
              this.entryCutsceneCamEnd,
              smoothT,
            )
            .add(this.mansionRoot.position);
          _storyLerpLookPos
            .lerpVectors(
              this.entryCutsceneLookStart,
              this.entryCutsceneLookEnd,
              smoothT,
            )
            .add(this.mansionRoot.position);

          cam.position.copy(_storyLerpCamPos);
          cam.lookAt(_storyLerpLookPos);
          cam.updateMatrixWorld(true);
        } else {
          cam.getWorldPosition(_playerWorldPos);
          const initLocalX = _playerWorldPos.x - this.mansionRoot.position.x;
          const initLocalZ = _playerWorldPos.z - this.mansionRoot.position.z;
          if (this.gameState === 'playing') {
            // Prevent XRBlocks desktop simulator controls from hijacking camera, pointer capture, or WASD/Shift
            this.ensureSimulatorControlsDisabled();
            const canvas = this.getGameCanvas();
            if (canvas) {
              const isLocked = this.isPointerLockActive();
              const desiredCursor = isLocked
                ? 'none'
                : this.isPcMouseDragging
                  ? 'grabbing'
                  : 'crosshair';
              if (canvas.style.cursor !== desiredCursor) {
                canvas.style.cursor = desiredCursor;
              }
            }
            if (this.entryPhase === 'guard_dialogue') {
              const targetGuardYaw = Math.atan2(
                initLocalX - 2.45,
                initLocalZ - 35.0,
              );
              const diff = Math.atan2(
                Math.sin(targetGuardYaw - this.playerYaw),
                Math.cos(targetGuardYaw - this.playerYaw),
              );
              this.playerYaw += diff * Math.min(1, dt * 4.5);
              this.playerPitch = THREE.MathUtils.lerp(
                this.playerPitch,
                0.02,
                Math.min(1, dt * 4),
              );
            } else if (
              !this.isAnyBlockingOverlayOpen() &&
              !this.isMovementLockedByEntrySequence() &&
              !this.activeHidingSpot
            ) {
              // Backup keyboard yaw rotation via Left / Right Arrow keys
              const arrowTurn =
                (this.lookInput.turnLeft ? 1 : 0) -
                (this.lookInput.turnRight ? 1 : 0);
              if (arrowTurn !== 0) {
                const safeSens =
                  Number.isFinite(this.cameraSensitivity) &&
                  this.cameraSensitivity > 0
                    ? THREE.MathUtils.clamp(this.cameraSensitivity, 0.25, 2.5)
                    : 1.0;
                this.playerYaw += arrowTurn * dt * 2.15 * safeSens;
              }
            }
          }
          cam.rotation.order = 'YXZ';
          cam.rotation.y = this.playerYaw;
          cam.rotation.x = this.playerPitch;
          cam.rotation.z = 0;
          this.applyZoneAwareFloorAndCameraHeight(cam, initLocalX, initLocalZ);
          cam.updateMatrixWorld(true);
        }
      }
    }

    // 1. Update First-Person Two-Handed Rig & Attach Flashlight SpotLight to Right-Hand Flashlight Tip
    if (this.playerArms && cam) {
      if (!this.playerArmsAdded) {
        cam.add(this.playerArms.group);
        this.playerArmsAdded = true;
      }
      if (
        this.gameState === 'story' ||
        this.isMiniCutsceneActive ||
        this.entryPhase === 'blackout_abduction' ||
        this.entryPhase === 'capture_jumpscare' ||
        this.entryPhase === 'victory_escape_cutscene'
      ) {
        this.playerArms.group.visible = false;
      } else {
        if (this.gameState === 'playing' && !this.activeHidingSpot) {
          this.playerArms.group.visible = true;
        }
        const isMoving =
          this.entryPhase === 'entering_haveli' ||
          (!this.isMovementLockedByEntrySequence() &&
            (this.autoSprintActive ||
              this.moveInput.forward ||
              this.moveInput.backward ||
              this.moveInput.left ||
              this.moveInput.right ||
              Math.abs(this.moveInput.joyX) > 0.1 ||
              Math.abs(this.moveInput.joyY) > 0.1));
        this.playerArms.update(time, isMoving, this.isPlayerSprinting());
        this.playerArms.group.updateMatrixWorld(true);
      }
    }

    if (cam && this.flashlight) {
      if (this.flashlight.parent !== cam) {
        cam.add(this.flashlight);
      }
      if (this.flashlightTarget.parent !== cam) {
        cam.add(this.flashlightTarget);
      }
      cam.getWorldPosition(_playerWorldPos);
      cam.getWorldDirection(_forwardDir);
      _forwardDir.normalize();
      this.flashlight.position.set(0.16, -0.14, -0.22);

      // Compute proximity to cursed areas (uncollected relics or cursed dry well) for flashlight flicker
      let minCurseDist = 999;
      for (const relic of this.relics) {
        if (!relic.collected) {
          relic.group.getWorldPosition(_relicPos);
          const d = _playerWorldPos.distanceTo(_relicPos);
          if (d < minCurseDist) minCurseDist = d;
        }
      }
      if (this.haveli) {
        this.haveli.wellGroup.getWorldPosition(_relicPos);
        const wellD = _playerWorldPos.distanceTo(_relicPos);
        if (wellD < minCurseDist) minCurseDist = wellD;
      }
      this.cursedAreaProximity = THREE.MathUtils.clamp(
        1 - (minCurseDist - 1.5) / 8.5,
        0,
        1,
      );

      const subtleHandheldShake =
        0.008 + this.lastRukminiProximity * 0.03 + this.cameraShakeIntensity;
      this.flashlightTarget.position.set(
        Math.sin(time * 5.2) * subtleHandheldShake +
          (Math.random() - 0.5) * this.cameraShakeIntensity,
        -0.06 +
          Math.cos(time * 4.4) * subtleHandheldShake +
          (Math.random() - 0.5) * this.cameraShakeIntensity,
        -18,
      );

      this.flashlight.updateMatrixWorld(true);
      this.flashlightTarget.updateMatrixWorld(true);

      if (this.cameraShakeIntensity > 0.001) {
        this.cameraShakeIntensity *= Math.exp(-6 * dt);
      }

      this.isAimingAtPickable =
        this.gameState === 'playing' && this.checkCenterCrosshairTarget(cam);
    }

    // 2. Entry Choreography & Multi-Floor Haveli Locomotion
    if (cam && this.haveli && this.gameState === 'playing') {
      cam.getWorldPosition(_playerWorldPos);
      const prevLocalX = _playerWorldPos.x - this.mansionRoot.position.x;
      const prevLocalZ = _playerWorldPos.z - this.mansionRoot.position.z;

      if (this.entryPhase === 'entering_haveli') {
        this.entryAnimElapsed += dt;
        const enterT = Math.min(1, this.entryAnimElapsed / 1.15);
        const smoothT = enterT * enterT * (3 - 2 * enterT);
        const nextLocalX = THREE.MathUtils.lerp(
          this.entryEnterStartLocalX,
          0.0,
          smoothT,
        );
        const nextLocalZ = THREE.MathUtils.lerp(
          this.entryEnterStartLocalZ,
          8.2,
          smoothT,
        );
        this.playerFloorY = 0;
        this.mansionRoot.position.x = _playerWorldPos.x - nextLocalX;
        this.mansionRoot.position.z = _playerWorldPos.z - nextLocalZ;
        const yawDiff = Math.atan2(
          Math.sin(0 - this.cameraYaw),
          Math.cos(0 - this.cameraYaw),
        );
        this.cameraYaw += yawDiff * Math.min(1, dt * 6);
        this.cameraPitch = THREE.MathUtils.lerp(
          this.cameraPitch,
          0.02,
          Math.min(1, dt * 5),
        );
        cam.rotation.order = 'YXZ';
        cam.rotation.y = this.cameraYaw;
        cam.rotation.x = this.cameraPitch;
        this.applyZoneAwareFloorAndCameraHeight(cam, nextLocalX, nextLocalZ);
        cam.updateMatrixWorld(true);
        cam.getWorldPosition(_playerWorldPos);
        this.synth.playSurfaceFootstep('stone', false, 1.0);
        if (enterT >= 1) {
          void this.runRukminiSlamAndBlackoutSequence();
        }
      } else if (this.entryPhase === 'blackout_abduction') {
        this.entryBlackoutElapsed += dt;
        this.entryBlackoutOpacity = 1.0;
        this.isPlayerMakingSound = false;
        this.currentNoiseDb = 0;
        if (this.entryBlackoutElapsed >= 4.6) {
          this.entryPhase = 'lights_flicker';
          this.entryFlickerElapsed = 0;
          this.haveli.setBlackoutMode(false);
          this.synth.playDoorCreak();
          this.onHudUpdate?.();
        }
      } else if (this.entryPhase === 'lights_flicker') {
        this.entryFlickerElapsed += dt;
        const env = 1 - Math.min(1, this.entryFlickerElapsed / 0.95);
        const pulse = Math.abs(Math.sin(this.entryFlickerElapsed * 28));
        this.entryBlackoutOpacity = Math.max(0, env * (0.35 + 0.65 * pulse));
        this.haveli.setLightLevelMultiplier(
          Math.max(0.08, 1 - this.entryBlackoutOpacity),
        );
        if (this.entryFlickerElapsed >= 0.95) {
          this.entryPhase = 'mission_active';
          this.entryBlackoutOpacity = 0;
          this.isHaveliBlackout = false;
          this.entrySubtitleSpeaker = '';
          this.entrySubtitleText = '';
          this.entrySubtitleRukmini = false;
          this.haveli.setBlackoutMode(false);
          this.haveli.setLightLevelMultiplier(1.0);
          this.updateEscapeTaskStatus();
          this.saveProgressToStorage();
          this.onChatLog?.(
            '🔦 तुम अब हवेली के मुख्य हॉल में बिल्कुल अकेले हो! कबीर, रिया और देव अलग-अलग कमरों में जंजीरों में कैद हैं — उन्हें आज़ाद करो, चारों शापित चीज़ें आँगन के कुएँ में जलाओ, और तीसरी मंज़िल (3F) के तांत्रिक पुस्तकालय में छुपी चाबी ढूँढकर बाहर निकलो!',
          );
          this.onHudUpdate?.();
        }
      } else if (this.isMovementLockedByEntrySequence()) {
        this.isPlayerMakingSound = false;
        this.currentNoiseDb = 0;
      } else {
        // Update vertical jump & gravity physics
        if (!this.isGrounded || this.jumpOffsetY > 0 || this.velocityY !== 0) {
          this.velocityY += this.gravity * dt;
          this.jumpOffsetY += this.velocityY * dt;
          if (this.jumpOffsetY <= 0) {
            this.jumpOffsetY = 0;
            this.velocityY = 0;
            if (!this.isGrounded) {
              this.isGrounded = true;
              const landZone = this.haveli.getRoomAt(
                _playerLocalPos.x,
                this.playerFloorY,
                _playerLocalPos.z,
              );
              this.synth.playLandingThud(landZone.surface);
            }
          }
        } else {
          this.jumpOffsetY = 0;
          this.velocityY = 0;
          this.isGrounded = true;
        }

        const wantsCrouch =
          !this.activeHidingSpot &&
          !this.isPlayerSprinting() &&
          this.isGrounded &&
          (this.crouchHold || this.crouchToggle);
        this.isPlayerCrouching = wantsCrouch;
        this.crouchEyeOffsetY = THREE.MathUtils.lerp(
          this.crouchEyeOffsetY,
          wantsCrouch ? -0.68 : 0,
          Math.min(1, dt * 12),
        );

        let forwardAmt =
          (this.moveInput.forward ? 1 : 0) -
          (this.moveInput.backward ? 1 : 0) -
          this.moveInput.joyY;
        if (this.autoSprintActive && !this.activeHidingSpot) {
          forwardAmt = Math.max(forwardAmt, 1);
        }
        let rightAmt =
          (this.moveInput.right ? 1 : 0) -
          (this.moveInput.left ? 1 : 0) +
          this.moveInput.joyX;

        const len = this.activeHidingSpot
          ? 0
          : Math.hypot(forwardAmt, rightAmt);
        if (this.activeHidingSpot || this.hideTransitionMode === 'exiting') {
          if (this.hideTransitionMode === 'entering' && this.activeHidingSpot) {
            this.hideTransitionT = Math.min(1, this.hideTransitionT + dt * 2.5);
            const s =
              this.hideTransitionT *
              this.hideTransitionT *
              (3 - 2 * this.hideTransitionT);
            const interpX = THREE.MathUtils.lerp(
              this.hideTransitionStartPos.x,
              this.hideTransitionTargetPos.x,
              s,
            );
            const interpZ = THREE.MathUtils.lerp(
              this.hideTransitionStartPos.z,
              this.hideTransitionTargetPos.z,
              s,
            );
            this.playerFloorY = THREE.MathUtils.lerp(
              this.hideTransitionStartPos.y,
              this.hideTransitionTargetPos.y,
              s,
            );
            this.cameraYaw = THREE.MathUtils.lerp(
              this.hideTransitionStartYaw,
              this.hideTransitionTargetYaw,
              s,
            );
            cam.rotation.order = 'YXZ';
            cam.rotation.y = this.cameraYaw;
            this.mansionRoot.position.x = _playerWorldPos.x - interpX;
            this.mansionRoot.position.z = _playerWorldPos.z - interpZ;
            this.applyZoneAwareFloorAndCameraHeight(cam, interpX, interpZ);
            if (this.hideTransitionT >= 1) {
              this.hideTransitionMode = 'hidden';
            }
          } else if (this.activeHidingSpot) {
            const spot = this.activeHidingSpot;
            this.playerFloorY = spot.floorY;
            this.mansionRoot.position.x = _playerWorldPos.x - spot.hideViewPos.x;
            this.mansionRoot.position.z = _playerWorldPos.z - spot.hideViewPos.z;
            let peekTurnInput = 0;
            if (this.moveInput.left || this.lookInput.turnLeft) peekTurnInput += 1;
            if (this.moveInput.right || this.lookInput.turnRight) peekTurnInput -= 1;
            if (Math.abs(this.moveInput.joyX) > 0.1) {
              peekTurnInput -= this.moveInput.joyX;
            }
            if (peekTurnInput !== 0) {
              this.playerYaw += peekTurnInput * dt * 1.45;
            }
            const relYaw = Math.atan2(
              Math.sin(this.cameraYaw - spot.lookYaw),
              Math.cos(this.cameraYaw - spot.lookYaw),
            );
            const clampedRelYaw = THREE.MathUtils.clamp(relYaw, -1.15, 1.15);
            this.hidePeekYawOffset = clampedRelYaw;
            this.cameraYaw = spot.lookYaw + clampedRelYaw;
            this.cameraPitch = THREE.MathUtils.clamp(
              this.cameraPitch,
              -0.55,
              0.55,
            );
            cam.rotation.order = 'YXZ';
            cam.rotation.y = this.cameraYaw;
            cam.rotation.x = this.cameraPitch;
            this.applyZoneAwareFloorAndCameraHeight(
              cam,
              spot.hideViewPos.x,
              spot.hideViewPos.z,
            );
          } else if (this.hideTransitionMode === 'exiting') {
            this.hidePeekYawOffset = 0;
            this.hideTransitionT = Math.min(1, this.hideTransitionT + dt * 2.8);
            const s =
              this.hideTransitionT *
              this.hideTransitionT *
              (3 - 2 * this.hideTransitionT);
            const interpX = THREE.MathUtils.lerp(
              this.hideTransitionStartPos.x,
              this.hideTransitionTargetPos.x,
              s,
            );
            const interpZ = THREE.MathUtils.lerp(
              this.hideTransitionStartPos.z,
              this.hideTransitionTargetPos.z,
              s,
            );
            this.playerFloorY = this.hideTransitionTargetPos.y;
            this.mansionRoot.position.x = _playerWorldPos.x - interpX;
            this.mansionRoot.position.z = _playerWorldPos.z - interpZ;
            this.applyZoneAwareFloorAndCameraHeight(cam, interpX, interpZ);
            if (this.hideTransitionT >= 1) {
              this.hideTransitionMode = 'none';
            }
          }
          this.jumpOffsetY = 0;
          this.velocityY = 0;
          this.isGrounded = true;
          cam.updateMatrixWorld(true);
          cam.getWorldPosition(_playerWorldPos);
        } else if (len > 0.05) {
          if (len > 1) {
            forwardAmt /= len;
            rightAmt /= len;
          }
          const speedMult = this.isPlayerCrouching
            ? 2.25
            : this.isPlayerSprinting()
              ? 5.6
              : 3.9;
          const moveStep = speedMult * dt;

          cam.rotation.order = 'YXZ';
          const yaw = cam.rotation.y;
          _forwardDir.set(-Math.sin(yaw), 0, -Math.cos(yaw));
          _rightDir.set(Math.cos(yaw), 0, -Math.sin(yaw));

          const dx =
            (_forwardDir.x * forwardAmt + _rightDir.x * rightAmt) * moveStep;
          const dz =
            (_forwardDir.z * forwardAmt + _rightDir.z * rightAmt) * moveStep;

          const desiredLocalX = prevLocalX + dx;
          const desiredLocalZ = prevLocalZ + dz;

          const resolved = this.haveli.resolveCollision(
            prevLocalX,
            prevLocalZ,
            desiredLocalX,
            desiredLocalZ,
            this.playerFloorY,
            0.65,
          );

          const targetElevation = THREE.MathUtils.clamp(
            this.haveli.getElevationAt(
              resolved.x,
              resolved.z,
              this.playerFloorY,
            ),
            -4.5,
            10.0,
          );
          this.playerFloorY = THREE.MathUtils.lerp(
            this.playerFloorY,
            targetElevation,
            Math.min(1, dt * 24),
          );

          this.mansionRoot.position.x = _playerWorldPos.x - resolved.x;
          this.mansionRoot.position.z = _playerWorldPos.z - resolved.z;
          this.applyZoneAwareFloorAndCameraHeight(cam, resolved.x, resolved.z);
          cam.updateMatrixWorld(true);
          cam.getWorldPosition(_playerWorldPos);

          const roomZone = this.haveli.getRoomAt(
            resolved.x,
            this.playerFloorY,
            resolved.z,
          );
          if (this.isGrounded) {
            this.synth.playSurfaceFootstep(
              roomZone.surface,
              this.isPlayerSprinting(),
              Math.min(1.4, len),
            );
          }
          this.synth.updateRoomAmbientTone(roomZone.ambientFreq);

          const nextMoveFloor = this.resolveFloorLevel(roomZone.floorLevel);
          const didFloorChange = nextMoveFloor !== this.currentFloorLevel;
          const prevMoveFloor = this.currentFloorLevel;
          if (
            roomZone.id !== this.currentRoomId ||
            roomZone.nameHi !== this.currentRoomNameHi ||
            didFloorChange
          ) {
            this.currentRoomId = roomZone.id;
            this.currentRoomNameHi = roomZone.nameHi;
            this.currentFloorLevel = nextMoveFloor;
            if (didFloorChange) {
              this.onFloorChange?.(
                nextMoveFloor,
                prevMoveFloor,
                this.getCurrentFloorLabelHi(),
              );
            }
            this.onHudUpdate?.();
          }
        } else {
          const stationaryResolved = this.haveli.resolveCollision(
            prevLocalX,
            prevLocalZ,
            prevLocalX,
            prevLocalZ,
            this.playerFloorY,
            0.65,
          );
          const targetElevation = THREE.MathUtils.clamp(
            this.haveli.getElevationAt(
              stationaryResolved.x,
              stationaryResolved.z,
              this.playerFloorY,
            ),
            -4.5,
            10.0,
          );
          this.playerFloorY = THREE.MathUtils.lerp(
            this.playerFloorY,
            targetElevation,
            Math.min(1, dt * 24),
          );
          this.mansionRoot.position.x =
            _playerWorldPos.x - stationaryResolved.x;
          this.mansionRoot.position.z =
            _playerWorldPos.z - stationaryResolved.z;
          this.applyZoneAwareFloorAndCameraHeight(
            cam,
            stationaryResolved.x,
            stationaryResolved.z,
          );
          cam.updateMatrixWorld(true);
          cam.getWorldPosition(_playerWorldPos);
        }

        const postLocalX = _playerWorldPos.x - this.mansionRoot.position.x;
        const postLocalZ = _playerWorldPos.z - this.mansionRoot.position.z;

        // Hiding spots only highlighted during active mission
        if (this.activeHidingSpot || this.entryPhase !== 'mission_active') {
          this.nearbyHidingSpot = null;
        } else {
          let closestSpot: HaveliHidingSpot | null = null;
          let closestDist = 2.2;
          for (const spot of this.haveli.hidingSpots) {
            if (Math.abs(spot.floorY - this.playerFloorY) > 1.8) continue;
            const d = Math.hypot(
              postLocalX - spot.position.x,
              postLocalZ - spot.position.z,
            );
            if (d <= closestDist) {
              closestDist = d;
              closestSpot = spot;
            }
          }
          this.nearbyHidingSpot = closestSpot;
        }

        // Update player sound emission state & dB output
        this.loudActionTimer = Math.max(0, this.loudActionTimer - dt);
        if (this.loudActionTimer <= 0) {
          this.currentLoudAlertRange = 26.0;
        }
        const isMovingHorizontally = !this.activeHidingSpot && len > 0.05;
        const isJumpingInAir =
          !this.activeHidingSpot &&
          (!this.isGrounded || this.jumpOffsetY > 0.02);
        if (
          this.activeHidingSpot ||
          (!isMovingHorizontally &&
            !isJumpingInAir &&
            this.loudActionTimer <= 0)
        ) {
          this.isPlayerMakingSound = false;
          this.currentNoiseDb = 0;
          this.playerSilenceTimer = this.activeHidingSpot
            ? 99
            : this.playerSilenceTimer + dt;
        } else {
          this.isPlayerMakingSound = true;
          this.currentNoiseDb =
            this.isPlayerSprinting() || isJumpingInAir || this.loudActionTimer > 0
              ? this.currentLoudAlertRange === 18.0
                ? 82
                : 76
              : this.isPlayerCrouching
                ? 16
                : 38;
          this.playerSilenceTimer = 0;
        }

        // Check Haunted Mirrors (1.5s Rukmini reflection flash) & Broken Glass Bangles (18m crunch alert)
        this.updateHauntedMirrorsAndBangles(
          dt,
          time,
          postLocalX,
          postLocalZ,
          isMovingHorizontally,
        );

        // STEP 2 auto-trigger: As the 4 friends walk up directly to the closed Outer Iron Gate (z = 34.0) & Guard
        if (
          this.entryPhase === 'exterior_walk' &&
          !this.watchmanWarned &&
          Math.abs(postLocalX) < 5.5 &&
          postLocalZ < 36.5 &&
          postLocalZ > 32.0
        ) {
          this.triggerWatchmanWarningAndKeyHint();
        }

        // STEP 4B Escape trigger: Once all 3 friends are rescued, all 4 relics are burned, AND Main Exit Door Key is recovered,
        // walking out through the Main Haveli Door triggers the 10-second victory escape cutscene!
        if (
          this.entryPhase === 'mission_active' &&
          this.curseBroken &&
          this.rescuedFriends >= this.totalFriendsToRescue &&
          this.hasRecoveredMainExitKey() &&
          postLocalZ > 10.65 &&
          Math.abs(postLocalX) < 3.4 &&
          this.playerFloorY < 1.2
        ) {
          this.triggerVictoryEscape(
            'बधाई हो! आपने रुक्मिणी के श्राप से अपने दोस्तों को बचा लिया!',
          );
        }
      }

      cam.getWorldPosition(_playerWorldPos);
      const curLocalX = _playerWorldPos.x - this.mansionRoot.position.x;
      const curLocalZ = _playerWorldPos.z - this.mansionRoot.position.z;
      _playerLocalPos.set(curLocalX, this.playerFloorY, curLocalZ);

      const activeZone = this.haveli.getRoomAt(
        curLocalX,
        this.playerFloorY,
        curLocalZ,
      );
      const nextFloorLevel = this.resolveFloorLevel(activeZone.floorLevel);
      const didActiveFloorChange = nextFloorLevel !== this.currentFloorLevel;
      const prevActiveFloor = this.currentFloorLevel;
      if (
        activeZone.id !== this.currentRoomId ||
        activeZone.nameHi !== this.currentRoomNameHi ||
        didActiveFloorChange
      ) {
        this.currentRoomId = activeZone.id;
        this.currentRoomNameHi = activeZone.nameHi;
        this.currentFloorLevel = nextFloorLevel;
        if (didActiveFloorChange) {
          this.onFloorChange?.(
            nextFloorLevel,
            prevActiveFloor,
            this.getCurrentFloorLabelHi(),
          );
        }
        this.onHudUpdate?.();
      }

      // Update the 3 unchained companion friends following behind the player
      this.updateCompanionFriends(dt, time, curLocalX, curLocalZ);

      // Compute horizontal camera forward & right vectors from camera.rotation.y for rear spatial panning
      const yaw = cam.rotation.y;
      _forwardDir.set(-Math.sin(yaw), 0, -Math.cos(yaw));
      _rightDir.set(Math.cos(yaw), 0, -Math.sin(yaw));

      if (
        this.entryPhase !== 'capture_jumpscare' &&
        this.entryPhase !== 'victory_escape_cutscene'
      ) {
        this.onMinimapFrame?.(
          dt,
          curLocalX,
          curLocalZ,
          yaw,
          this.currentFloorLevel,
        );
      }

      const isInCorridor =
        this.currentRoomId === 'gf_corridor' ||
        this.currentRoomId === 'f2_corridor' ||
        this.currentRoomId === 'f2_jharokha_balcony' ||
        this.currentRoomId === 'f3_corridor' ||
        this.currentRoomId === 'f3_skywell_walkway' ||
        this.currentRoomId === 'basement_stair_foyer' ||
        this.currentRoomId === 'basement_hallway' ||
        this.currentRoomId === 'basement_mid_corridor' ||
        this.currentRoomId === 'basement_west_corridor' ||
        this.currentRoomId === 'basement_west_north_corridor' ||
        this.currentRoomId === 'basement_east_corridor' ||
        this.currentRoomId === 'basement_east_north_corridor' ||
        this.currentRoomId === 'basement_north_corridor';

      this.synth.updateCorridorWhispers(
        isInCorridor && this.entryPhase === 'mission_active',
        _playerWorldPos,
        _forwardDir,
        _rightDir,
        this.lastRukminiProximity,
      );

      if (this.playerFloorY < -1.0 || curLocalZ < -8.0) {
        const dripFactor = this.playerFloorY < -1.0 ? 1.0 : 0.35;
        this.synth.playBasementWaterDrip(dripFactor);
      }
    }

    // 2B. Update Red Lightning Flash envelope & Stage 4 Witch Banishment Beam of Red Light
    if (this.redLightningFlashTimer > 0) {
      this.redLightningFlashTimer = Math.max(0, this.redLightningFlashTimer - dt);
      const env = Math.min(1, this.redLightningFlashTimer / 0.45);
      const pulse = Math.sin(this.redLightningFlashTimer * 36) > -0.1 ? 1.0 : 0.32;
      this.redLightningFlashOpacity = env * pulse * 0.72;
    } else {
      this.redLightningFlashOpacity = 0;
    }

    if (this.witchBanishTimer > 0 && this.witchBanishBeamGroup) {
      this.witchBanishTimer = Math.max(0, this.witchBanishTimer - dt);
      const progress = 1 - this.witchBanishTimer / 2.6;
      const beamAlpha = progress < 0.7 ? 1.0 : Math.max(0, 1 - (progress - 0.7) / 0.3);

      if (this.witchModel) {
        this.witchModel.root.visible = progress < 0.78;
        this.witchModel.root.position.y += dt * 0.85;
        this.witchModel.root.rotation.y += dt * 6.5;
        const shrink = Math.max(0.02, 1 - progress * 1.15);
        this.witchModel.root.scale.set(shrink, 1 + progress * 0.5, shrink);
        this.witchModel.leftArm.rotation.x = -2.4;
        this.witchModel.rightArm.rotation.x = -2.4;
      }

      if (this.witchBanishInnerBeam) {
        this.witchBanishInnerBeam.rotation.y += dt * 4.5;
        (this.witchBanishInnerBeam.material as THREE.MeshBasicMaterial).opacity =
          0.88 * beamAlpha;
      }
      if (this.witchBanishOuterBeam) {
        this.witchBanishOuterBeam.rotation.y -= dt * 3.0;
        const pulseScale = 1 + Math.sin(time * 20) * 0.12;
        this.witchBanishOuterBeam.scale.set(pulseScale, 1, pulseScale);
        (this.witchBanishOuterBeam.material as THREE.MeshBasicMaterial).opacity =
          0.42 * beamAlpha;
      }
      if (this.witchBanishShockRing) {
        this.witchBanishShockRing.scale.setScalar(1 + progress * 7.5);
        (this.witchBanishShockRing.material as THREE.MeshBasicMaterial).opacity =
          0.85 * Math.max(0, 1 - progress);
      }
      if (this.witchBanishBeamLight) {
        this.witchBanishBeamLight.intensity = 12.0 * beamAlpha;
      }
      for (const p of this.witchBanishParticles) {
        p.y = (p.y + p.speedY * dt) % 10.5;
        p.angle += dt * 4.2;
        p.mesh.position.set(
          Math.cos(p.angle) * p.radius,
          p.y,
          Math.sin(p.angle) * p.radius,
        );
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = beamAlpha * 0.95;
      }

      if (this.witchBanishTimer <= 0) {
        if (this.witchModel) {
          this.witchModel.root.visible = false;
        }
        this.clearWitchBanishmentBeam();
      }
    }

    // 3. Update Haveli Atmosphere (self-creaking doors, flickering lanterns, swaying curtains, dust, lightning)
    let lightningFlash = 0;
    const rawWitchDistForLights =
      cam && this.witchModel && !this.witchBanished
        ? Math.hypot(
            this.witchModel.root.position.x - _playerLocalPos.x,
            this.witchModel.root.position.y - this.playerFloorY,
            this.witchModel.root.position.z - _playerLocalPos.z,
          )
        : 999;
    if (this.haveli) {
      let flashState:
        | { origin: THREE.Vector3; dir: THREE.Vector3; intensity: number }
        | undefined;
      if (this.flashlight && this.flashlightTarget && this.flashlight.intensity > 0.05) {
        _flashLocalOrigin
          .copy(this.flashlight.position)
          .sub(this.mansionRoot.position);
        _flashLocalDir
          .copy(this.flashlightTarget.position)
          .sub(this.flashlight.position)
          .normalize();
        flashState = {
          origin: _flashLocalOrigin,
          dir: _flashLocalDir,
          intensity: Math.min(1.25, this.flashlight.intensity / 3.0),
        };
      }
      lightningFlash = this.haveli.updateAtmosphere(
        time,
        dt,
        this.lastRukminiProximity,
        _playerLocalPos,
        () => this.synth.playDoorCreak(),
        (outdoorFactor) => this.synth.playDistantThunder(outdoorFactor ?? 1.0),
        this.burnedCount,
        rawWitchDistForLights,
        flashState,
      );
      this.playerOutdoors = this.haveli.isPlayerOutdoors(_playerLocalPos);
      const isStormAudioActive =
        this.gameState === 'playing' &&
        this.entryPhase !== 'victory_escape_cutscene' &&
        this.entryPhase !== 'blackout_abduction';
      if (cam) {
        cam.getWorldDirection(_forwardDir);
        _forwardDir.y = 0;
        if (_forwardDir.lengthSq() < 0.0001) {
          _forwardDir.set(0, 0, -1);
        } else {
          _forwardDir.normalize();
        }
        // World up (0, 1, 0): right = forward x up = (-forward.z, 0, forward.x)
        _rightDir.set(-_forwardDir.z, 0, _forwardDir.x).normalize();
      } else {
        _forwardDir.set(0, 0, -1);
        _rightDir.set(1, 0, 0);
      }
      const rainAcoustics = this.haveli.sampleRainAcoustics(
        _playerLocalPos,
        _forwardDir,
        _rightDir,
      );
      this.synth.updateSpatialStormRain(rainAcoustics, isStormAudioActive);
    }

    // 4. Animate Floating Cursed Relics, 3 Named Glowing Jail Keys, and Iron Jail Cell Gates
    for (let i = 0; i < this.relics.length; i++) {
      const r = this.relics[i];
      const active = !r.collected && r.group.visible;
      if (active) {
        r.group.rotation.y += dt * 1.5;
        r.group.position.y = r.basePos.y + Math.sin(time * 2.6 + i) * 0.08;
      }
      r.proximityGlow?.update(time, dt, _playerLocalPos, r.group.position, active);
    }
    for (let i = 0; i < this.jailKeys.length; i++) {
      const jk = this.jailKeys[i];
      const active = !jk.collected && jk.group.visible;
      if (active) {
        jk.group.rotation.y += dt * 1.85;
        jk.group.position.y = jk.basePos.y + Math.sin(time * 3.1 + i * 1.4) * 0.065;
      }
      jk.proximityGlow.update(time, dt, _playerLocalPos, jk.group.position, active);
    }
    for (const tf of this.trappedFriends) {
      if (!tf.cageGroup.visible) continue;
      tf.gateCurrentAngle = THREE.MathUtils.lerp(
        tf.gateCurrentAngle,
        tf.gateTargetAngle,
        Math.min(1, dt * 5.5),
      );
      if (tf.gateRattleOffset > 0.001) {
        tf.gateRattleOffset = Math.max(0, tf.gateRattleOffset - dt * 0.35);
      } else {
        tf.gateRattleOffset = 0;
      }
      const rattle =
        tf.gateRattleOffset > 0
          ? Math.sin(time * 48) * tf.gateRattleOffset
          : 0;
      tf.gatePivot.rotation.y = tf.gateCurrentAngle + rattle;
    }
    this.updateThrowablesAndProjectiles(dt, time);

    // 5. Update Rukmini: The Blind Rakt-Pishachini AI across the Multi-Floor Haveli
    if (this.witchModel && cam) {
      if (
        this.entryPhase === 'capture_jumpscare' ||
        this.entryPhase === 'victory_escape_cutscene'
      ) {
        // Handled cleanly inside dedicated close-up jumpscare / victory cutscene directors
      } else if (this.witchBanished) {
        if (this.gameState === 'playing') {
          this.modulateLightingByWitchProximity(999, time, dt, lightningFlash);
        }
        this.updateHeartbeatVignette(999, dt);
        this.synth.stopPanickedBreathing(true);
      } else {
      const witchRoot = this.witchModel.root;
      const rageSpeedMult = this.getWitchSpeedMultiplier();
      const patrolWaypoints = this.getActivePatrolWaypoints();
      if (this.patrolWaypointIdx >= patrolWaypoints.length) {
        this.patrolWaypointIdx = 0;
      }

      // Glowing blood-red eyes (emissiveIntensity ~2.5 normally; intensify during Stage 3 Final Rage)
      // and subtle dim crimson face-light (0.9 normally; intensifies during Stage 3 Rage)
      if (this.witchStunnedTimer <= 0) {
        const isFinalRage = this.burnedCount >= 3;
        const eyePulse = isFinalRage
          ? 5.6 + Math.sin(time * 12) * 1.4
          : 2.5 + Math.sin(time * 3.8) * 0.18;
        for (const eye of [this.witchModel.leftEye, this.witchModel.rightEye]) {
          const mat = eye?.material as THREE.MeshStandardMaterial | undefined;
          if (mat) {
            mat.emissive.setHex(0xff1111);
            mat.emissiveIntensity = eyePulse;
          }
        }
        if (this.witchModel.eyeCrimsonLight) {
          this.witchModel.eyeCrimsonLight.intensity = isFinalRage
            ? 1.75 + Math.sin(time * 12) * 0.45
            : 0.9 + Math.sin(time * 2.6) * 0.08;
        }
      }

      // Update humanoid procedural stalking walk, periodic creepy twitchy head-tilt, gently swaying arms & ankle mist
      this.witchModel.character.update(
        dt,
        time,
        this.entryPhase === 'mission_active' ? this.witchSpeed : 0,
        _playerWorldPos,
        false,
      );

      this.witchModel.veilMesh.rotation.z = Math.sin(time * 2.4) * 0.06;

      if (
        this.gameState === 'playing' &&
        this.entryPhase === 'mission_active'
      ) {
        cam.getWorldPosition(_playerWorldPos);
        const localPlayerX = _playerWorldPos.x - this.mansionRoot.position.x;
        const localPlayerZ = _playerWorldPos.z - this.mansionRoot.position.z;
        const isPlayerInside = this.isPositionInsideHaveli(
          localPlayerX,
          localPlayerZ,
        );

        const rawDistToPlayer = Math.hypot(
          witchRoot.position.x - localPlayerX,
          witchRoot.position.y - this.playerFloorY,
          witchRoot.position.z - localPlayerZ,
        );

        const isLoudMovement =
          this.loudActionTimer > 0 ||
          !this.isGrounded ||
          this.jumpOffsetY > 0.02 ||
          (this.isPlayerMakingSound && this.isPlayerSprinting());
        const walkHearingRange = this.isPlayerCrouching ? 5.0 : 14.0;
        const loudHearingRange =
          this.loudActionTimer > 0 && !this.isPlayerSprinting() && this.isGrounded
            ? this.currentLoudAlertRange
            : 26.0;
        const currentHearingRange = !this.isPlayerMakingSound
          ? 0.0
          : isLoudMovement
            ? loudHearingRange
            : walkHearingRange;

        const movedOutsideWalkingRange =
          this.isPlayerMakingSound &&
          !isLoudMovement &&
          rawDistToPlayer > walkHearingRange;
        const movedOutsideLoudRange =
          this.isPlayerMakingSound &&
          isLoudMovement &&
          rawDistToPlayer > loudHearingRange;

        if (this.witchStunnedTimer > 0) {
          this.witchStunnedTimer = Math.max(0, this.witchStunnedTimer - dt);
        }
        if (this.witchDistractionTimer > 0) {
          this.witchDistractionTimer = Math.max(
            0,
            this.witchDistractionTimer - dt,
          );
        }

        if (this.witchStunnedTimer > 0) {
          // Blinded & stunned in place for 5 full seconds by Watchman Baba's Blessed Bhabhut
          if (this.witchDoorPauseDoor) {
            this.witchDoorPauseDoor.rattleOffset = 0;
            this.witchDoorPauseDoor = null;
            this.witchDoorPauseTimer = 0;
          }
          this.witchHuntMode = 'patrol';
          this.witchAlertLevel = 0;
          this.witchSpeed = 0;
          this.witchPath = [];
          this.witchTargetPos.copy(witchRoot.position);
          this.witchModel.headGroup.rotation.y = Math.sin(time * 14) * 0.55;
          this.witchModel.headGroup.rotation.x = -0.35 + Math.cos(time * 11) * 0.16;
          this.witchModel.leftArm.rotation.x = -2.15 + Math.sin(time * 18) * 0.22;
          this.witchModel.rightArm.rotation.x = -2.15 - Math.sin(time * 18) * 0.22;
        } else if (this.activeHidingSpot && this.compromisedInHiding) {
          this.witchHuntMode = 'fast_chase';
          this.witchAlertLevel = 2.0;
          this.witchSpeed = 3.35 * rageSpeedMult;
          this.witchHeardSoundPos.set(
            this.activeHidingSpot.exitPos.x,
            this.activeHidingSpot.floorY,
            this.activeHidingSpot.exitPos.z,
          );
          this.witchTargetPos.copy(this.witchHeardSoundPos);
        } else if (this.witchDistractionTimer > 0) {
          // Locked onto shattered Kulhad/stone impact spot for 6 seconds so player can sneak past
          this.witchHuntMode = 'fast_chase';
          this.witchAlertLevel = 2.0;
          this.witchHeardSoundPos.copy(this.witchDistractionPos);
          this.witchTargetPos.copy(this.witchDistractionPos);
          const distToDistraction = witchRoot.position.distanceTo(
            this.witchDistractionPos,
          );
          this.witchSpeed = distToDistraction > 0.85 ? 3.45 * rageSpeedMult : 0.0;
          if (this.witchSpeed === 0) {
            this.witchModel.headGroup.rotation.y = Math.sin(time * 3.4) * 0.48;
          }
          if (this.witchDistractionTimer <= 0) {
            this.witchHuntMode = 'patrol';
            this.witchAlertLevel = 0;
            this.witchSpeed = 1.45 * rageSpeedMult;
            this.witchPath = [];
          }
        } else if (
          !isPlayerInside ||
          (this.activeHidingSpot && !this.compromisedInHiding) ||
          this.playerSilenceTimer >= 2.0 ||
          movedOutsideWalkingRange ||
          movedOutsideLoudRange
        ) {
          if (this.witchHuntMode !== 'patrol') {
            this.witchHuntMode = 'patrol';
            this.witchAlertLevel = 0;
            this.witchSpeed = 1.45 * rageSpeedMult;
            this.witchPath = [];
          }
        } else if (
          this.isPlayerMakingSound &&
          rawDistToPlayer <= currentHearingRange
        ) {
          this.witchHeardSoundPos.set(
            THREE.MathUtils.clamp(
              localPlayerX,
              this.playerFloorY < -0.5 ? -27.2 : -31.0,
              this.playerFloorY < -0.5 ? 27.2 : 31.0,
            ),
            this.playerFloorY,
            THREE.MathUtils.clamp(
              localPlayerZ,
              this.playerFloorY < -0.5 ? -79.2 : -45.2,
              9.0,
            ),
          );
          if (isLoudMovement) {
            this.witchHuntMode = 'fast_chase';
            this.witchAlertLevel = 2.0;
            this.witchSpeed = 3.35 * rageSpeedMult;
          } else {
            this.witchHuntMode = 'walk_investigate';
            this.witchAlertLevel = 1.0;
            this.witchSpeed = 2.05 * rageSpeedMult;
          }
        }

        if (
          this.witchStunnedTimer <= 0 &&
          this.witchDistractionTimer <= 0 &&
          isPlayerInside &&
          this.witchHuntMode !== 'patrol'
        ) {
          this.witchTargetPos.copy(this.witchHeardSoundPos);
          if (
            !this.isPlayerMakingSound &&
            witchRoot.position.distanceTo(this.witchHeardSoundPos) < 0.85
          ) {
            this.witchHuntMode = 'patrol';
            this.witchAlertLevel = 0;
            this.witchSpeed = 1.45 * rageSpeedMult;
            this.witchPath = [];
          }
        }

        if (
          this.witchStunnedTimer <= 0 &&
          this.witchHuntMode === 'patrol' &&
          this.witchDistractionTimer <= 0
        ) {
          const wp = patrolWaypoints[this.patrolWaypointIdx];
          this.witchTargetPos.copy(wp);
          this.witchSpeed = 1.45 * rageSpeedMult;
          this.witchAlertLevel = this.burnedCount >= 3 ? 1.0 : 0;
          if (witchRoot.position.distanceTo(wp) < 0.95) {
            this.patrolWaypointIdx =
              (this.patrolWaypointIdx + 1) % patrolWaypoints.length;
            this.witchTargetPos.copy(patrolWaypoints[this.patrolWaypointIdx]);
            this.witchPath = [];
          }
        }

        // Handle Witch Rukmini pausing for 1.8 seconds at a closed room door to push it open before entering
        if (this.witchStunnedTimer <= 0 && this.witchDoorPauseDoor && this.haveli) {
          const pausedDoor = this.witchDoorPauseDoor;
          if (pausedDoor.isOpen) {
            pausedDoor.rattleOffset = 0;
            this.witchDoorPauseDoor = null;
            this.witchDoorPauseTimer = 0;
          } else {
            this.witchDoorPauseTimer -= dt;
            this.witchSpeed = 0;
            witchRoot.rotation.y = THREE.MathUtils.damp(
              witchRoot.rotation.y,
              this.witchDoorPushFaceYaw,
              10,
              dt,
            );
            const pushProgress = THREE.MathUtils.clamp(
              1 - this.witchDoorPauseTimer / 1.8,
              0,
              1,
            );
            const shoveWave = Math.sin(time * 11.5);
            this.witchModel.leftArm.rotation.x = -1.35 + shoveWave * 0.24;
            this.witchModel.rightArm.rotation.x = -1.35 - shoveWave * 0.24;
            this.witchModel.headGroup.rotation.z = Math.sin(time * 9.0) * 0.16;
            pausedDoor.rattleOffset =
              Math.sin(time * 28.0) * (0.018 + pushProgress * 0.024);

            if (this.witchDoorPauseTimer <= 0) {
              pausedDoor.rattleOffset = 0;
              this.haveli.setDoorOpen(pausedDoor, true, 0.45);
              this.synth.playDoorCreak();
              this.witchDoorPauseDoor = null;
              this.witchDoorPauseTimer = 0;
              this.witchPathTimer = 0;
            }
          }
        }

        const witchStepStartX = witchRoot.position.x;
        const witchStepStartZ = witchRoot.position.z;

        if (this.witchStunnedTimer <= 0 && !this.witchDoorPauseDoor) {
          this.witchPathTimer -= dt;
          const goalMovedDist = this.witchLastGoalPos.distanceTo(
            this.witchTargetPos,
          );
          if (
            this.haveli &&
            (this.witchPath.length === 0 ||
              this.witchPathIdx >= this.witchPath.length ||
              goalMovedDist > 0.75 ||
              this.witchPathTimer <= 0)
          ) {
            this.witchPath = this.haveli.findNavigationPath(
              witchRoot.position,
              this.witchTargetPos,
              true,
            );
            this.witchPathIdx = 0;
            if (
              this.witchPath.length > 1 &&
              Math.hypot(
                this.witchPath[0].x - witchRoot.position.x,
                this.witchPath[0].z - witchRoot.position.z,
              ) < 0.45 &&
              Math.abs(this.witchPath[0].y - witchRoot.position.y) < 1.2
            ) {
              this.witchPathIdx = 1;
            }
            this.witchLastGoalPos.copy(this.witchTargetPos);
            this.witchPathTimer =
              this.witchHuntMode !== 'patrol' ? 0.35 : 1.1;
          }

          let currentWaypoint =
            this.witchPath[this.witchPathIdx] ?? this.witchTargetPos;
          const horizDistToWp = Math.hypot(
            currentWaypoint.x - witchRoot.position.x,
            currentWaypoint.z - witchRoot.position.z,
          );
          const vertDistToWp = Math.abs(
            currentWaypoint.y - witchRoot.position.y,
          );

          if (horizDistToWp < 0.45 && vertDistToWp < 1.35) {
            if (this.witchPathIdx < this.witchPath.length - 1) {
              this.witchPathIdx++;
              currentWaypoint = this.witchPath[this.witchPathIdx];
            } else if (this.witchHuntMode === 'patrol') {
              this.patrolWaypointIdx =
                (this.patrolWaypointIdx + 1) % patrolWaypoints.length;
              this.witchPath = [];
            }
          }

          const prevWitchX = witchRoot.position.x;
          const prevWitchZ = witchRoot.position.z;
          const moveDx = currentWaypoint.x - prevWitchX;
          const moveDz = currentWaypoint.z - prevWitchZ;
          const horizDist = Math.hypot(moveDx, moveDz);

          // Detect if Witch Rukmini has reached a closed room door along her chase/movement path
          let blockingClosedDoor: HaveliDoor | null = null;
          if (horizDist > 0.08 && this.haveli && this.witchSpeed > 0) {
            const dirX = moveDx / horizDist;
            const dirZ = moveDz / horizDist;
            const nextWp =
              this.witchPath[Math.min(this.witchPathIdx + 1, this.witchPath.length - 1)] ??
              this.witchTargetPos;

            for (const d of this.haveli.doors) {
              if (d.archwayOnly || !d.isRoomDoor || d.isOpen) continue;
              if (d.id === 'door_back_well' && this.isWellDoorLockedForRespawn) continue;
              if (d.lockedUntilRelics > 0 && this.collectedCount < d.lockedUntilRelics) {
                continue;
              }
              if (Math.abs(d.floorY - witchRoot.position.y) > 1.8) continue;

              const toDoorX = d.position.x - prevWitchX;
              const toDoorZ = d.position.z - prevWitchZ;
              const distToDoor = Math.hypot(toDoorX, toDoorZ);
              if (distToDoor > 1.72) continue;

              const toDoorDot =
                distToDoor > 1e-4
                  ? (dirX * toDoorX + dirZ * toDoorZ) / distToDoor
                  : 1.0;

              const crossesDoorAxis =
                d.axis === 'x'
                  ? (prevWitchZ - d.position.z) * (currentWaypoint.z - d.position.z) <= 0 ||
                    (prevWitchZ - d.position.z) * (nextWp.z - d.position.z) <= 0
                  : (prevWitchX - d.position.x) * (currentWaypoint.x - d.position.x) <= 0 ||
                    (prevWitchX - d.position.x) * (nextWp.x - d.position.x) <= 0;

              if (toDoorDot >= 0.32 || crossesDoorAxis) {
                blockingClosedDoor = d;
                break;
              }
            }
          }

          if (blockingClosedDoor) {
            // Pause 1.8 seconds to forcefully push open the closed room door before entering
            this.witchDoorPauseDoor = blockingClosedDoor;
            this.witchDoorPauseTimer = 1.8;
            this.witchDoorPushFaceYaw = Math.atan2(
              blockingClosedDoor.position.x - prevWitchX,
              blockingClosedDoor.position.z - prevWitchZ,
            );
            this.witchSpeed = 0;
            this.synth.playDoorCreak();
          } else if (horizDist > 0.08 && this.haveli && this.witchSpeed > 0) {
            const stepDist = Math.min(horizDist, this.witchSpeed * dt);
            const dirX = moveDx / horizDist;
            const dirZ = moveDz / horizDist;
            const witchMinZ = witchRoot.position.y < -0.5 ? -79.2 : -45.2;
            const witchMaxX = witchRoot.position.y < -0.5 ? 27.2 : 31.0;
            const desiredWitchX = THREE.MathUtils.clamp(
              prevWitchX + dirX * stepDist,
              -witchMaxX,
              witchMaxX,
            );
            const desiredWitchZ = THREE.MathUtils.clamp(
              prevWitchZ + dirZ * stepDist,
              witchMinZ,
              9.0,
            );

            const resolvedWitch = this.haveli.resolveCollision(
              prevWitchX,
              prevWitchZ,
              desiredWitchX,
              desiredWitchZ,
              witchRoot.position.y,
              0.65,
            );
            witchRoot.position.x = THREE.MathUtils.clamp(
              resolvedWitch.x,
              -witchMaxX,
              witchMaxX,
            );
            witchRoot.position.z = THREE.MathUtils.clamp(
              resolvedWitch.z,
              witchMinZ,
              9.0,
            );

            const targetWitchY = THREE.MathUtils.clamp(
              this.haveli.getElevationAt(
                witchRoot.position.x,
                witchRoot.position.z,
                witchRoot.position.y,
              ),
              -4.5,
              10.0,
            );
            witchRoot.position.y = THREE.MathUtils.lerp(
              witchRoot.position.y,
              targetWitchY,
              Math.min(1, dt * 24),
            );

            const actualMoved = Math.hypot(
              witchRoot.position.x - prevWitchX,
              witchRoot.position.z - prevWitchZ,
            );
            if (actualMoved < stepDist * 0.15) {
              this.witchStuckTimer += dt;
              if (this.witchStuckTimer > 0.75) {
                this.witchStuckTimer = 0;
                if (this.witchHuntMode === 'patrol') {
                  this.patrolWaypointIdx =
                    (this.patrolWaypointIdx + 1) % patrolWaypoints.length;
                }
                this.witchPath = [];
              }
            } else {
              this.witchStuckTimer = 0;
            }

            const targetYaw = Math.atan2(dirX, dirZ);
            witchRoot.rotation.y = THREE.MathUtils.damp(
              witchRoot.rotation.y,
              targetYaw,
              7,
              dt,
            );
          } else if (this.haveli) {
            const witchMinZ = witchRoot.position.y < -0.5 ? -79.2 : -45.2;
            const witchMaxX = witchRoot.position.y < -0.5 ? 27.2 : 31.0;
            const stationaryWitch = this.haveli.resolveCollision(
              prevWitchX,
              prevWitchZ,
              prevWitchX,
              prevWitchZ,
              witchRoot.position.y,
              0.65,
            );
            witchRoot.position.x = THREE.MathUtils.clamp(
              stationaryWitch.x,
              -witchMaxX,
              witchMaxX,
            );
            witchRoot.position.z = THREE.MathUtils.clamp(
              stationaryWitch.z,
              witchMinZ,
              9.0,
            );
            const settleWitchY = THREE.MathUtils.clamp(
              this.haveli.getElevationAt(
                witchRoot.position.x,
                witchRoot.position.z,
                witchRoot.position.y,
              ),
              -4.5,
              10.0,
            );
            witchRoot.position.y = THREE.MathUtils.lerp(
              witchRoot.position.y,
              settleWitchY,
              Math.min(1, dt * 24),
            );
          }
        }

        const effectiveDistToPlayer = isPlayerInside
          ? rawDistToPlayer
          : Math.max(rawDistToPlayer, 18.0);
        const indoorDistToPlayer = isPlayerInside ? rawDistToPlayer : 999;

        this.modulateLightingByWitchProximity(
          effectiveDistToPlayer,
          time,
          dt,
          lightningFlash,
        );

        this.updateHeartbeatVignette(indoorDistToPlayer, dt);
        void this.synth.playPanickedBreathing(effectiveDistToPlayer);

        // Sync soft silver Payal (anklet) jingle footsteps directly to Rukmini's actual walking steps
        const witchStepMoved = Math.hypot(
          witchRoot.position.x - witchStepStartX,
          witchRoot.position.z - witchStepStartZ,
        );
        if (
          witchStepMoved > 0.0015 &&
          this.witchSpeed > 0.12 &&
          this.witchStunnedTimer <= 0 &&
          !this.witchDoorPauseDoor
        ) {
          const isWitchRunning = this.witchSpeed > 2.45;
          const baseStrideRate = Math.max(3.6, this.witchSpeed * 3.55);
          const strideRate = isWitchRunning
            ? Math.min(9.6, baseStrideRate)
            : baseStrideRate;
          this.witchPayalStridePhase += dt * strideRate;
          const stepIdx = Math.floor(this.witchPayalStridePhase / Math.PI);
          if (stepIdx !== this.lastWitchPayalStepIndex) {
            this.lastWitchPayalStepIndex = stepIdx;
            if (isPlayerInside && rawDistToPlayer < 24.0) {
              const floorDiff = Math.abs(
                witchRoot.position.y - this.playerFloorY,
              );
              this.synth.playPayalStep(
                rawDistToPlayer,
                this.payalPositionalAudio,
                this.witchSpeed,
                stepIdx,
                floorDiff,
              );
            }
          }
        }

        // Rescued Friends 16m Whisper Warning: When Rukmini comes within 16 meters of the group,
        // a rescued friend whispers an urgent Hindi warning with an onscreen subtitle!
        this.friendWhisperCooldownTimer = Math.max(
          0,
          this.friendWhisperCooldownTimer - dt,
        );
        const activeRescuedFollowers = this.companionFriends.filter(
          (c) => c.isRescuedFollower && c.char.root.visible,
        );
        if (activeRescuedFollowers.length > 0 && this.witchStunnedTimer <= 0) {
          let minGroupDist = rawDistToPlayer;
          for (const follower of activeRescuedFollowers) {
            const fd = follower.char.root.position.distanceTo(witchRoot.position);
            if (fd < minGroupDist) {
              minGroupDist = fd;
            }
          }
          if (minGroupDist > 18.5) {
            this.wasWitchWithin16m = false;
          } else if (
            minGroupDist <= 16.0 &&
            !this.wasWitchWithin16m &&
            this.friendWhisperCooldownTimer <= 0 &&
            !this.activeHidingSpot
          ) {
            this.wasWitchWithin16m = true;
            this.friendWhisperCooldownTimer = 20.0;
            const speaker = activeRescuedFollowers[0];
            this.entrySubtitleRukmini = false;
            this.entrySubtitleSpeaker = `${speaker.nameHi} (फुसफुसाते हुए)`;
            this.entrySubtitleText =
              'चुप! पायल की आवाज़ पास आ रही है, जल्दी छुपो!';
            this.entrySubtitleTimer = 4.2;
            void this.synth.playFriendWhisperWarning(speaker.id);
            this.onChatLog?.(
              `🤫 [${speaker.nameHi} - धीमी आवाज़ में]: "चुप! पायल की आवाज़ पास आ रही है, जल्दी छुपो!"`,
            );
          }
        }

        const canReachPlayer =
          !this.haveli ||
          this.haveli.isLineOfSightClear(
            witchRoot.position.x,
            witchRoot.position.z,
            localPlayerX,
            localPlayerZ,
            this.playerFloorY,
            0.42,
          );

        const caughtWhileCompromisedInHiding =
          this.witchStunnedTimer <= 0 &&
          Boolean(this.activeHidingSpot) &&
          this.compromisedInHiding &&
          rawDistToPlayer < 1.65;
        const caughtWhileMakingSoundInRoom =
          this.witchStunnedTimer <= 0 &&
          this.witchDistractionTimer <= 0 &&
          !this.activeHidingSpot &&
          isPlayerInside &&
          this.isPlayerMakingSound &&
          this.witchHuntMode !== 'patrol' &&
          rawDistToPlayer < 1.32 &&
          canReachPlayer;
        const closeRangeAutoBhabhut =
          this.witchStunnedTimer <= 0 &&
          this.blessedBhabhutCount > 0 &&
          isPlayerInside &&
          !this.activeHidingSpot &&
          rawDistToPlayer <= 2.5 &&
          canReachPlayer;

        if (
          caughtWhileCompromisedInHiding ||
          caughtWhileMakingSoundInRoom ||
          closeRangeAutoBhabhut
        ) {
          if (this.blessedBhabhutCount > 0) {
            this.triggerBlessedBhabhutDefense(localPlayerX, localPlayerZ);
          } else {
            const loseMsg = caughtWhileCompromisedInHiding
              ? this.lang === 'hi'
                ? 'तुम रुक्मिणी के 3 मीटर के दायरे में पीछा होते समय छुपे थे—उसने तुम्हें छुपने की जगह से बाहर खींच लिया!'
                : 'You tried to hide while Rukmini was actively chasing you within 3 meters—she dragged you out of your hiding spot!'
              : this.lang === 'hi'
                ? 'रक्त-पिशाचिनी रुक्मिणी ने हवेली में तुम्हारी आहट सुन ली और तुम्हें पकड़ लिया!'
                : 'The blind Blood Witch Rukmini heard your footsteps in the Haveli and caught you!';
            this.startWitchCaptureJumpscare(loseMsg);
          }
        }
      } else {
        if (this.gameState === 'playing') {
          this.modulateLightingByWitchProximity(20, time, dt, lightningFlash);
        }
        this.updateHeartbeatVignette(20, dt);
        this.synth.stopPanickedBreathing(true);
      }
      }
    }

    // 6. Update Chowkidar (Guard)
    if (this.chowkidar) {
      const distToWitch = this.witchModel
        ? this.chowkidar.root.position.distanceTo(this.witchModel.root.position)
        : 999;
      this.chowkidar.update(dt, time, 0, _playerWorldPos, distToWitch < 6.5);
    }

    // 7. Update The Four Friends
    for (const friend of this.friends) {
      if (!friend.root.visible) continue;
      const distToWitch = this.witchModel
        ? friend.root.position.distanceTo(this.witchModel.root.position)
        : 999;
      friend.update(dt, time, 0, _playerWorldPos, distToWitch < 5.5);
    }

    // Guarantee renderer.render(scene, camera) runs every frame during active gameplay even if XR Blocks simulator compositor hasn't initialized yet
    if (
      this.gameState === 'playing' &&
      cam &&
      xb.core.scene &&
      xb.core.renderer instanceof THREE.WebGLRenderer &&
      !xb.core.renderer.xr.isPresenting
    ) {
      const simInitialized = Boolean(
        (
          xb.core as unknown as {
            simulator?: { initialized?: boolean; compositor?: unknown };
          }
        ).simulator?.initialized &&
          (
            xb.core as unknown as {
              simulator?: { initialized?: boolean; compositor?: unknown };
            }
          ).simulator?.compositor,
      );
      if (
        !simInitialized ||
        this.lastMainSceneRenderTick < this.currentUpdateTick - 1
      ) {
        xb.core.renderer.render(xb.core.scene, cam);
      }
    }

    this.onHudUpdate?.();
  }

  /**
   * Animates the 2.5-second Witch Capture Jumpscare close-up before showing Game Over.
   */
  private updateCaptureJumpscareSequence(
    cam: THREE.PerspectiveCamera,
    dt: number,
    time: number,
  ) {
    this.captureJumpscareElapsed += dt;
    const rawT = Math.min(
      1,
      this.captureJumpscareElapsed / this.captureJumpscareDuration,
    );
    const lungeProgress = Math.min(1, rawT / 0.28);
    const lungeEase = 1 - Math.pow(1 - lungeProgress, 3);
    // Lunge smoothly into a horrifying close-up (0.68m) so her full pale face, glowing red eyes & mouth fill center screen
    const dist = THREE.MathUtils.lerp(1.95, 0.68, lungeEase);

    // Tight high-frequency horror tremor (keeps her face locked cleanly in center of viewport)
    const shakeAmp = 0.034 * (1 - rawT * 0.25);
    const shakeX =
      Math.sin(time * 58) * shakeAmp + (Math.random() - 0.5) * shakeAmp * 0.5;
    const shakeY = Math.cos(time * 52) * shakeAmp * 0.75;
    const camLocalX = this.captureCamBaseLocal.x;
    const camLocalY = this.captureCamBaseLocal.y;
    const camLocalZ = this.captureCamBaseLocal.z;

    // Position camera first so Rukmini can lookAt(cam.position) cleanly on the exact same frame
    cam.position.set(
      this.mansionRoot.position.x + camLocalX + shakeX,
      this.mansionRoot.position.y + camLocalY + shakeY,
      this.mansionRoot.position.z + camLocalZ,
    );

    const witchLocalX = camLocalX + this.captureCamForward.x * dist;
    const witchLocalZ = camLocalZ + this.captureCamForward.z * dist;
    // Align Rukmini's head (~1.62m above feet at scale 1.035) directly at camera eye level
    const witchFloorY = camLocalY - 1.62;

    if (this.witchModel) {
      this.witchModel.root.visible = true;
      this.witchModel.root.scale.setScalar(1.035);
      this.witchModel.root.position.set(
        witchLocalX + Math.sin(time * 24) * 0.014,
        witchFloorY + Math.abs(Math.sin(time * 18)) * 0.018,
        witchLocalZ,
      );
      this.witchModel.root.updateMatrixWorld(true);
      // Turn Witch Rukmini directly facing the camera position
      this.witchModel.root.lookAt(
        cam.position.x,
        this.mansionRoot.position.y + witchFloorY,
        cam.position.z,
      );

      this.witchModel.character.update(dt, time, 0, cam.position, false);

      // Keep torso upright & head staring dead-center into the camera lens so hair stays parted to sides
      this.witchModel.character.torso.rotation.set(0.02, 0, 0);
      this.witchModel.headGroup.rotation.set(
        0.02 + Math.cos(time * 26) * 0.03,
        Math.sin(time * 24) * 0.045,
        -0.06 + Math.sin(time * 34) * 0.06,
      );
      // Spread clawed arms wide outward framing lower left/right edges so arms NEVER block her face
      this.witchModel.leftArm.rotation.set(
        -1.15 + Math.sin(time * 30) * 0.14,
        0,
        0.44,
      );
      this.witchModel.rightArm.rotation.set(
        -1.15 - Math.sin(time * 30) * 0.14,
        0,
        -0.44,
      );
      this.witchModel.veilMesh.rotation.z = Math.sin(time * 14) * 0.04;

      for (const eye of [this.witchModel.leftEye, this.witchModel.rightEye]) {
        const mat = eye?.material as THREE.MeshStandardMaterial | undefined;
        if (mat) {
          mat.color.setHex(0xff1111);
          mat.emissive.setHex(0xff1111);
          mat.emissiveIntensity = 6.5;
        }
      }
      if (this.witchModel.eyeCrimsonLight) {
        this.witchModel.eyeCrimsonLight.intensity =
          2.6 + Math.sin(time * 38) * 0.65;
      }

      // Read Rukmini's exact world-space face center so camera aims directly at her eyes & mouth
      this.witchModel.root.updateMatrixWorld(true);
      this.witchModel.headGroup.getWorldPosition(_storyLerpLookPos);
      _storyLerpLookPos.y -= 0.015;
    } else {
      _storyLerpLookPos.set(
        this.mansionRoot.position.x + witchLocalX,
        this.mansionRoot.position.y + camLocalY - 0.02,
        this.mansionRoot.position.z + witchLocalZ,
      );
    }

    cam.lookAt(_storyLerpLookPos);
    cam.rotateZ(Math.sin(time * 42) * 0.055);

    const targetFov = THREE.MathUtils.lerp(60, 48, lungeEase);
    if (Math.abs(cam.fov - targetFov) > 0.1) {
      cam.fov = targetFov;
      cam.updateProjectionMatrix();
    }
    cam.updateMatrixWorld(true);

    // Dramatic translucent crimson strobe (never washing out her pale ghostly face details)
    this.redLightningFlashOpacity = 0.14 + 0.18 * Math.abs(Math.sin(time * 28));
    if (this.ambientLight) {
      this.ambientLight.color.setHex(0xff8a92);
      this.ambientLight.intensity = 2.4 + Math.sin(time * 32) * 0.4;
    }
    if (this.flashlight) {
      this.flashlight.position.copy(cam.position);
      this.flashlightTarget.position.copy(_storyLerpLookPos);
      this.flashlight.color.setHex(0xffe6e6);
      this.flashlight.intensity = 5.2;
    }

    if (this.captureJumpscareElapsed >= this.captureJumpscareDuration) {
      if (this.storyDefaultFov > 0) {
        cam.fov = this.storyDefaultFov;
        cam.updateProjectionMatrix();
      }
      this.redLightningFlashOpacity = 0;
      this.entrySubtitleText = '';
      this.entrySubtitleSpeaker = '';
      this.entrySubtitleRukmini = false;
      this.lives = Math.max(0, this.lives - 1);
      this.recordCareerDeath();

      if (this.lives > 0) {
        this.respawnPlayerAloneAtWellCourtyard(cam);
      } else {
        this.gameState = 'gameover';
        this.onChatLog?.(`System: ${this.captureLoseMessage}`);
        this.onGameEnd?.(false, this.captureLoseMessage);
        this.onHudUpdate?.();
      }
    }
  }

  /**
   * Drops any unburned carried relics (state === 'carried') when Witch Rukmini catches the player
   * on Life 1 or Life 2, relocating each dropped relic into a NEW random room across the 3 palace
   * floors or 10-room underground maze (strictly ensuring newRoomId !== relic.lastRoomId).
   * Already-burned relics (state === 'burned') remain permanently burned and untouched.
   */
  private dropAndRelocateCarriedRelicsOnCapture(): RelicInstance[] {
    const carriedRelics = this.relics.filter((r) => r.state === 'carried');
    if (carriedRelics.length === 0) return [];

    // Avoid stacking two hidden relics inside the exact same room
    const occupiedRoomIds = new Set<string>();
    for (const r of this.relics) {
      if (r.state === 'hidden' && r.lastRoomId) {
        occupiedRoomIds.add(r.lastRoomId);
      }
    }

    for (const relic of carriedRelics) {
      const prevRoomId = relic.lastRoomId;
      let candidates = RELIC_ROOM_RESPAWN_SPOTS.filter(
        (spot) =>
          spot.roomId !== prevRoomId && !occupiedRoomIds.has(spot.roomId),
      );
      if (candidates.length === 0) {
        candidates = RELIC_ROOM_RESPAWN_SPOTS.filter(
          (spot) => spot.roomId !== prevRoomId,
        );
      }
      const chosen =
        candidates[Math.floor(Math.random() * candidates.length)] ??
        RELIC_ROOM_RESPAWN_SPOTS[0];

      relic.lastRoomId = chosen.roomId;
      relic.roomNameHi = chosen.roomNameHi;
      relic.basePos.set(chosen.x, chosen.y, chosen.z);
      relic.group.position.set(chosen.x, chosen.y, chosen.z);
      relic.state = 'hidden';
      relic.collected = false;
      relic.burned = false;
      relic.group.visible = true;
      occupiedRoomIds.add(chosen.roomId);
    }

    // Recompute counts cleanly: burned relics remain permanently saved, carried unburned relics are removed
    this.burnedCount = this.relics.filter((r) => r.state === 'burned').length;
    this.collectedCount = this.relics.filter(
      (r) => r.state === 'carried' || r.state === 'burned',
    ).length;

    if (this.burnedCount >= 3) {
      this.rebuildFinalRagePatrolPoints();
    }

    return carriedRelics;
  }

  /**
   * Respawns ONLY the player alone inside the enclosed Well Courtyard beside the Cursed Well
   * when lives > 0. Preserves all rescued friends and burned relics progress, drops and re-hides
   * any unburned carried relics into different random rooms across the 3 floors or 10-room basement,
   * keeps unrescued friends locked in their separate Haveli rooms, keeps already-rescued friends
   * waiting safely inside the Main Hall, teleports Witch Rukmini far away to the 2nd Floor, locks
   * the Back Courtyard door, and spawns the glowing golden Well Courtyard Escape Key near the Well.
   */
  private respawnPlayerAloneAtWellCourtyard(cam: THREE.PerspectiveCamera) {
    // 0. Drop & relocate any unburned carried relics into a new random room (burned relics stay permanently saved)
    const droppedRelics = this.dropAndRelocateCarriedRelicsOnCapture();

    // 1. Teleport ONLY the player alone into the enclosed Well Courtyard beside the Cursed Well
    //    facing South (+Z, yaw = Math.PI) directly toward the glowing key on the stone rim & locked door ahead
    const spawnLocalX = 0.0;
    const spawnLocalZ = -66.8;
    this.playerFloorY = 0;
    this.velocityY = 0;
    this.jumpOffsetY = 0;
    this.isGrounded = true;
    this.isPlayerCrouching = false;
    this.crouchHold = false;
    this.crouchToggle = false;
    this.crouchEyeOffsetY = 0;
    this.activeHidingSpot = null;
    this.nearbyHidingSpot = null;
    this.compromisedInHiding = false;
    this.hideTransitionMode = 'none';
    this.hideTransitionT = 0;
    this.clearMoveInputs();

    cam.getWorldPosition(_playerWorldPos);
    this.mansionRoot.position.x = _playerWorldPos.x - spawnLocalX;
    this.mansionRoot.position.z = _playerWorldPos.z - spawnLocalZ;
    this.cameraYaw = Math.PI;
    this.cameraPitch = -0.06;
    cam.rotation.order = 'YXZ';
    cam.rotation.y = this.cameraYaw;
    cam.rotation.x = this.cameraPitch;
    cam.rotation.z = 0;
    this.applyZoneAwareFloorAndCameraHeight(cam, spawnLocalX, spawnLocalZ);
    cam.updateMatrixWorld(true);

    this.currentRoomId = 'courtyard_well';
    this.currentRoomNameHi = 'कुएँ का आँगन और शापित कुआँ (Walled Well Courtyard)';
    this.currentFloorLevel = 0;

    // 2. Keep all unrescued trappedFriends strictly untouched in their separate Haveli rooms,
    //    and keep all already-rescued friends waiting safely inside the Ground Floor Main Hall
    //    (NEVER teleport or move any friend into the Well Courtyard!)
    const mainHallSafeSpots: Array<[number, number]> = [
      [-2.4, 3.8],
      [2.4, 3.8],
      [0.0, 5.2],
    ];
    let rescuedSlot = 0;
    for (const comp of this.companionFriends) {
      if (comp.isRescuedFollower && comp.char.root.visible) {
        const spot =
          mainHallSafeSpots[rescuedSlot % mainHallSafeSpots.length] ?? [0, 4.2];
        rescuedSlot++;
        comp.char.root.position.set(spot[0], 0, spot[1]);
        comp.char.root.rotation.y = Math.PI;
        comp.navPath = [];
        comp.navPathIdx = 0;
        comp.navTimer = 0;
        comp.stuckTimer = 0;
        comp.currentSpeed = 0;
        comp.char.setAnimation('idle');
      }
    }

    // 3. Teleport Witch Rukmini far away to the 2nd Floor (Front Jharokha Balcony, y = 5.0)
    //    so she never camps the Well Courtyard door
    if (this.witchModel && !this.witchBanished) {
      this.witchModel.root.visible = true;
      this.witchModel.root.scale.setScalar(1.0);
      this.witchModel.root.position.set(0.0, 5.0, 4.5);
      this.witchModel.root.rotation.set(0, 0, 0);
      const activePatrol = this.getActivePatrolWaypoints();
      const f2WaypointIdx = activePatrol.findIndex((wp) => wp.y >= 4.0);
      if (f2WaypointIdx >= 0) {
        this.patrolWaypointIdx = f2WaypointIdx;
        this.witchTargetPos.copy(activePatrol[f2WaypointIdx]);
      } else {
        this.witchTargetPos.set(-17.0, 5.0, 0.75);
      }
      this.witchHeardSoundPos.set(0.0, 5.0, 4.5);
      this.witchHuntMode = 'patrol';
      this.witchAlertLevel = 0;
      this.witchPath = [];
      this.witchPathIdx = 0;
      this.witchPathTimer = 0;
      this.witchStuckTimer = 0;
      if (this.witchDoorPauseDoor) {
        this.witchDoorPauseDoor.rattleOffset = 0;
      }
      this.witchDoorPauseDoor = null;
      this.witchDoorPauseTimer = 0;
      this.witchStunnedTimer = 0;
      this.witchDistractionTimer = 0;
    }

    // 4. Lock the Well Courtyard back door & spawn the glowing golden Well Courtyard Escape Key near the Cursed Well
    this.isWellDoorLockedForRespawn = true;
    this.hasWellCourtyardKey = false;
    if (this.haveli) {
      const backWellDoor = this.haveli.doors.find(
        (d) => d.id === 'door_back_well',
      );
      if (backWellDoor) {
        backWellDoor.isOpen = false;
        backWellDoor.targetAngle = backWellDoor.closedAngle;
        backWellDoor.currentAngle = backWellDoor.closedAngle;
        backWellDoor.animFromAngle = backWellDoor.closedAngle;
        backWellDoor.animToAngle = backWellDoor.closedAngle;
        backWellDoor.animElapsed = 0;
        backWellDoor.isAnimating = false;
        backWellDoor.openProgress = 0;
        backWellDoor.rattleOffset = 0;
        backWellDoor.pivot.rotation.y = backWellDoor.closedAngle;
      }
      this.haveli.wellCourtyardKeyGroup.visible = true;
      this.haveli.setBlackoutMode(false);
      this.haveli.setLightLevelMultiplier(1.0);
    }

    // 5. Restore player hands, calm heartbeat/lighting, and show brief dark respawn warning banner
    if (this.playerArms) {
      this.playerArms.group.visible = true;
      this.playerArms.setHoldingKey(this.hasAnyCarriedKey());
    }
    this.entryPhase = 'mission_active';
    this.gameState = 'playing';
    this.playerSilenceTimer = 99;
    this.loudActionTimer = 0;
    this.isPlayerMakingSound = false;
    this.currentNoiseDb = 0;
    this.cameraShakeIntensity = 0;
    this.heartbeatVignetteOpacity = 0;
    this.heartbeatVignettePulse = 0;
    this.heartbeatIntensity = 0;
    this.heartbeatRukminiDistance = 999;

    if (droppedRelics.length > 0) {
      this.respawnWarningText =
        this.lang === 'hi'
          ? `पकड़े जाने पर तुम्हारे हाथ की शापित निशानी छूटकर हवेली के किसी नए कमरे में गायब हो गई! (कुएं में जली हुई निशानियां सुरक्षित हैं)\nशेष जीवन: ${this.lives}/${this.maxLives}`
          : `When caught, your unburned cursed relic slipped away into a new room in the Haveli! (Relics burned in the well remain safe)\nLives remaining: ${this.lives}/${this.maxLives}`;
      this.respawnWarningTimer = 2.5;
    } else {
      this.respawnWarningText =
        this.lang === 'hi'
          ? `रुक्मिणी ने तुम्हें कुएं के आंगन में फेंक दिया! शेष जीवन: ${this.lives}/${this.maxLives}`
          : `Rukmini threw you into the Well Courtyard! Lives remaining: ${this.lives}/${this.maxLives}`;
      this.respawnWarningTimer = 2.0;
    }
    this.respawnWarningOpacity = 1.0;

    if (droppedRelics.length > 0) {
      this.onChatLog?.(
        this.lang === 'hi'
          ? `🩸 पकड़े जाने पर तुम्हारे हाथ की शापित निशानी छूटकर हवेली के किसी नए कमरे में गायब हो गई! (कुएं में जली हुई निशानियां सुरक्षित हैं) — शेष जीवन: ${this.lives}/${this.maxLives}`
          : `🩸 When caught, ${droppedRelics.length} unburned relic(s) vanished into a new room in the Haveli! Burned relics remain safe. Lives remaining: ${this.lives}/${this.maxLives}`,
      );
    } else {
      this.onChatLog?.(
        this.lang === 'hi'
          ? `🩸 रुक्मिणी ने तुम्हें कुएं के आंगन में फेंक दिया! शेष जीवन: ${this.lives}/${this.maxLives} — कुएं के किनारे चमकती सुनहरी "कुएं के आंगन की चाबी" उठाओ (E) और बंद दरवाज़ा खोलकर हवेली में वापस जाओ!`
          : `🩸 Rukmini threw you into the Well Courtyard! Lives remaining: ${this.lives}/${this.maxLives} — Grab the glowing golden Well Courtyard Key near the well (E) to unlock the door!`,
      );
    }
    this.updateEscapeTaskStatus();
    this.saveProgressToStorage();
    this.onHudUpdate?.();
  }

  /**
   * Animates the 10-second Victory Escape Cutscene showing all 4 friends running out
   * through the Main Door & Outer Iron Gate back to the SUV on the forest road while the sun rises.
   */
  private updateVictoryEscapeCutscene(
    cam: THREE.PerspectiveCamera,
    dt: number,
    time: number,
  ) {
    this.victoryCutsceneElapsed += dt;
    const vt = Math.min(
      1,
      this.victoryCutsceneElapsed / this.victoryCutsceneDuration,
    );

    // 1. Rising Golden Sun over the distant village horizon + warm morning lighting shift
    const dawnP = THREE.MathUtils.clamp((vt - 0.08) / 0.88, 0, 1);
    const dawnEase = dawnP * dawnP * (3 - 2 * dawnP);
    this.dawnSunriseProgress = dawnEase;
    this.haveli?.setSunriseProgress(dawnEase);

    if (dawnEase < 0.45) {
      const k = dawnEase / 0.45;
      _dawnActiveSkyColor.copy(_brightSkyColor).lerp(_dawnPreColor, k);
    } else if (dawnEase < 0.78) {
      const k = (dawnEase - 0.45) / 0.33;
      _dawnActiveSkyColor.copy(_dawnPreColor).lerp(_dawnHorizonColor, k);
    } else {
      const k = (dawnEase - 0.78) / 0.22;
      _dawnActiveSkyColor.copy(_dawnHorizonColor).lerp(_dawnGoldColor, k);
    }
    const scene = xb.core.scene;
    if (scene) {
      scene.background = _dawnActiveSkyColor;
      _nightHorizonFog.color.copy(_dawnActiveSkyColor);
      _nightHorizonFog.density = THREE.MathUtils.lerp(0.0105, 0.0065, dawnEase);
      scene.fog = _nightHorizonFog;
    }
    if (this.moonKeyLight) {
      this.moonKeyLight.position.set(85, 10 + dawnEase * 24, 30);
      this.moonKeyLight.color
        .setHex(0xffffff)
        .lerp(_dawnLightColor, dawnEase);
      this.moonKeyLight.intensity = 1.6 + dawnEase * 2.1;
    }
    if (this.hemiLight) {
      this.hemiLight.color
        .setHex(0xffffff)
        .lerp(_dawnHemiSkyColor, dawnEase);
      this.hemiLight.groundColor
        .setHex(0xd6d3d1)
        .lerp(_dawnHemiGroundColor, dawnEase * 0.65);
      this.hemiLight.intensity = 1.85 + dawnEase * 0.75;
    }
    if (this.ambientLight) {
      this.ambientLight.color
        .setHex(0xffffff)
        .lerp(_dawnHemiSkyColor, dawnEase * 0.55);
      this.ambientLight.intensity = 2.1 + dawnEase * 0.55;
    }

    // 2. Animate all 4 friends (Aarav + Kabir + Riya + Dev) sprinting from Main Door -> 24m Royal Front Forecourt -> Outer Iron Gate (z=34.0) -> SUV (z=41.0)
    const runnerPaths: Array<{
      char: HumanoidCharacter | undefined;
      p0: [number, number];
      p1: [number, number];
      p2: [number, number];
    }> = [
      { char: this.aaravFriend, p0: [0.0, 9.2], p1: [0.22, 34.0], p2: [0.35, 40.0] },
      { char: this.companionFriends[0]?.char, p0: [-0.85, 8.75], p1: [-0.55, 33.65], p2: [-0.25, 40.8] },
      { char: this.companionFriends[1]?.char, p0: [0.85, 8.9], p1: [0.85, 33.8], p2: [1.15, 40.4] },
      { char: this.companionFriends[2]?.char, p0: [-0.25, 8.15], p1: [0.1, 33.2], p2: [0.68, 41.5] },
    ];

    const runT = Math.min(1, this.victoryCutsceneElapsed / 7.3);
    const sunriseLookTargetX = 72.0;
    const sunriseLookTargetZ = 52.0;

    for (const rp of runnerPaths) {
      const ch = rp.char;
      if (!ch) continue;
      ch.root.visible = true;
      ch.boundToPillar = false;
      if (runT < 1) {
        let nx: number;
        let nz: number;
        let dirX: number;
        let dirZ: number;
        if (runT < 0.68) {
          const segT = runT / 0.68;
          nx = THREE.MathUtils.lerp(rp.p0[0], rp.p1[0], segT);
          nz = THREE.MathUtils.lerp(rp.p0[1], rp.p1[1], segT);
          dirX = rp.p1[0] - rp.p0[0];
          dirZ = rp.p1[1] - rp.p0[1];
        } else {
          const segT = (runT - 0.68) / 0.32;
          nx = THREE.MathUtils.lerp(rp.p1[0], rp.p2[0], segT);
          nz = THREE.MathUtils.lerp(rp.p1[1], rp.p2[1], segT);
          dirX = rp.p2[0] - rp.p1[0];
          dirZ = rp.p2[1] - rp.p1[1];
        }
        ch.root.position.set(nx, 0, nz);
        const runYaw = Math.atan2(dirX, dirZ);
        const diff = Math.atan2(
          Math.sin(runYaw - ch.root.rotation.y),
          Math.cos(runYaw - ch.root.rotation.y),
        );
        ch.root.rotation.y += diff * Math.min(1, dt * 10);
        ch.setAnimation('run');
        ch.update(dt, time, 3.6, _storyLerpLookPos, false);
      } else {
        // Arrived beside the SUV — stand & watch the sunrise glow over the distant village!
        ch.root.position.set(rp.p2[0], 0, rp.p2[1]);
        const sunYaw = Math.atan2(
          sunriseLookTargetX - rp.p2[0],
          sunriseLookTargetZ - rp.p2[1],
        );
        const diff = Math.atan2(
          Math.sin(sunYaw - ch.root.rotation.y),
          Math.cos(sunYaw - ch.root.rotation.y),
        );
        ch.root.rotation.y += diff * Math.min(1, dt * 4.5);
        ch.setAnimation('idle');
        ch.update(dt, time, 0, _storyLerpLookPos, false);
      }
    }

    // 3. Smooth 3-act 10s Victory Camera Trajectory (Main Door exit -> 24m Royal Front Forecourt sprint -> Outer Gate & SUV + Rising Sun)
    if (vt < 0.35) {
      const s = vt / 0.35;
      const e = s * s * (3 - 2 * s);
      _storyLerpCamPos.set(
        THREE.MathUtils.lerp(2.6, 3.4, e),
        THREE.MathUtils.lerp(2.1, 2.35, e),
        THREE.MathUtils.lerp(16.2, 26.5, e),
      );
      _storyLerpLookPos.set(
        THREE.MathUtils.lerp(0.0, 0.15, e),
        THREE.MathUtils.lerp(1.45, 1.4, e),
        THREE.MathUtils.lerp(9.5, 22.0, e),
      );
    } else if (vt < 0.72) {
      const s = (vt - 0.35) / 0.37;
      const e = s * s * (3 - 2 * s);
      _storyLerpCamPos.set(
        THREE.MathUtils.lerp(3.4, 3.2, e),
        THREE.MathUtils.lerp(2.35, 2.3, e),
        THREE.MathUtils.lerp(26.5, 43.2, e),
      );
      _storyLerpLookPos.set(
        THREE.MathUtils.lerp(0.15, 0.35, e),
        1.38,
        THREE.MathUtils.lerp(22.0, 40.5, e),
      );
    } else {
      const s = (vt - 0.72) / 0.28;
      const e = s * s * (3 - 2 * s);
      _storyLerpCamPos.set(
        THREE.MathUtils.lerp(3.2, -4.6, e),
        THREE.MathUtils.lerp(2.3, 2.45, e),
        THREE.MathUtils.lerp(43.2, 44.0, e),
      );
      _storyLerpLookPos.set(
        THREE.MathUtils.lerp(0.35, 34.0, e),
        THREE.MathUtils.lerp(1.38, 5.2, e),
        THREE.MathUtils.lerp(40.5, 46.6, e),
      );
    }

    cam.position.copy(_storyLerpCamPos).add(this.mansionRoot.position);
    _storyLerpLookPos.add(this.mansionRoot.position);
    cam.lookAt(_storyLerpLookPos);
    if (Math.abs(cam.fov - 56) > 0.2) {
      cam.fov = THREE.MathUtils.lerp(cam.fov, 56, Math.min(1, dt * 3));
      cam.updateProjectionMatrix();
    }
    cam.updateMatrixWorld(true);

    // 4. At 10.0s completion, show the Victory Screen
    if (this.victoryCutsceneElapsed >= this.victoryCutsceneDuration) {
      if (this.storyDefaultFov > 0) {
        cam.fov = this.storyDefaultFov;
        cam.updateProjectionMatrix();
      }
      this.entrySubtitleText = '';
      this.entrySubtitleSpeaker = '';
      this.entrySubtitleRukmini = false;
      this.gameState = 'victory';
      const winMsg =
        this.victoryCustomMessage ||
        'बधाई हो! आपने रुक्मिणी के श्राप से अपने दोस्तों को बचा लिया!';
      this.onChatLog?.(`[System]: ${winMsg}`);
      this.onGameEnd?.(true, winMsg);
      this.onHudUpdate?.();
    }
  }

  private updateHauntedMirrorsAndBangles(
    dt: number,
    time: number,
    curLocalX: number,
    curLocalZ: number,
    isMovingHorizontally: boolean,
  ) {
    if (!this.haveli) return;

    if (this.mirrorLogCooldownTimer > 0) {
      this.mirrorLogCooldownTimer = Math.max(0, this.mirrorLogCooldownTimer - dt);
    }

    const cam = xb.core.camera;
    const camYaw = cam ? cam.rotation.y : this.cameraYaw;
    const lookX = -Math.sin(camYaw);
    const lookZ = -Math.cos(camYaw);

    // 1. Haunted Haveli Ornate Mirrors (main corridors & bedrooms):
    //    Flash Bride Rukmini's spooky reflection behind the player for 1.5s when walking past.
    for (const mirror of this.haveli.hauntedMirrors) {
      if (mirror.cooldownTimer > 0) {
        mirror.cooldownTimer = Math.max(0, mirror.cooldownTimer - dt);
      }
      if (mirror.flashTimer > 0) {
        mirror.flashTimer = Math.max(0, mirror.flashTimer - dt);
        mirror.reflectionOverlayMat.opacity = 0.74 + Math.sin(time * 34) * 0.2;
        mirror.reflectionGroup.position.x = Math.sin(time * 5.2) * 0.025;
        if (mirror.scareLight) {
          mirror.scareLight.intensity = 1.45 + Math.sin(time * 28) * 0.45;
        }
        if (mirror.flashTimer <= 0) {
          mirror.reflectionGroup.visible = false;
          if (mirror.scareLight) {
            mirror.scareLight.intensity = 0;
          }
        }
        continue;
      }

      if (
        this.entryPhase !== 'mission_active' ||
        this.activeHidingSpot ||
        this.witchBanished ||
        mirror.cooldownTimer > 0
      ) {
        continue;
      }

      if (Math.abs(mirror.floorY - this.playerFloorY) > 1.8) continue;

      const dx = curLocalX - mirror.position.x;
      const dz = curLocalZ - mirror.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 3.1 || dist < 0.25) continue;

      const frontDot = dx * mirror.normal.x + dz * mirror.normal.z;
      if (frontDot <= 0.12) continue;

      // Trigger when looking roughly toward/across the mirror OR walking closely past it
      const dirToMirrorX = -dx / dist;
      const dirToMirrorZ = -dz / dist;
      const facingMirrorDot = lookX * dirToMirrorX + lookZ * dirToMirrorZ;
      if (facingMirrorDot > -0.15 || dist <= 2.15) {
        mirror.flashTimer = 1.5;
        mirror.cooldownTimer = 14.0;
        mirror.reflectionGroup.visible = true;
        mirror.reflectionOverlayMat.opacity = 0.92;
        if (mirror.scareLight) {
          mirror.scareLight.intensity = 1.65;
        }
        this.cameraShakeIntensity = Math.max(this.cameraShakeIntensity, 0.055);
        this.synth.playMirrorGhostFlash();
        if (this.mirrorLogCooldownTimer <= 0) {
          this.mirrorLogCooldownTimer = 3.0;
          this.onChatLog?.(
            this.lang === 'hi'
              ? `🪞 ${mirror.locationHi} के शीशे में आपके पीछे दुल्हन रुक्मिणी की डरावनी परछाईं चमकी!`
              : `🪞 Bride Rukmini's eerie reflection flashed behind you in the ${mirror.locationEn} mirror!`,
          );
        }
      }
    }

    // 2. Broken Red Bridal Glass Bangles & Dry Leaves floor traps:
    //    Stepping over without crouching plays a sharp glass-crunch + 18m noise alert.
    for (const patch of this.haveli.banglePatches) {
      if (patch.cooldownTimer > 0) {
        patch.cooldownTimer = Math.max(0, patch.cooldownTimer - dt);
      }

      if (
        this.entryPhase !== 'mission_active' ||
        this.activeHidingSpot ||
        !this.isGrounded ||
        !isMovingHorizontally ||
        Math.abs(patch.floorY - this.playerFloorY) > 1.2
      ) {
        continue;
      }

      const distToPatch = Math.hypot(
        curLocalX - patch.position.x,
        curLocalZ - patch.position.z,
      );
      if (distToPatch > patch.radius) continue;

      if (this.isPlayerCrouching) {
        // Silent crouch step-over!
        continue;
      }

      if (patch.cooldownTimer <= 0) {
        patch.cooldownTimer = 3.2;
        this.synth.playGlassBanglesCrunch();
        this.currentNoiseDb = 82;
        this.loudActionTimer = Math.max(this.loudActionTimer, 1.1);
        this.cameraShakeIntensity = Math.max(this.cameraShakeIntensity, 0.14);
        this.triggerSoundAlert(1.5, 18.0);
        this.onChatLog?.(
          this.lang === 'hi'
            ? `💔 खच्! ${patch.locationHi} में टूटी लाल चूड़ियाँ चटक गईं — 18m तक आवाज़ गूंजी! (C/Ctrl से झुककर पार करें)`
            : `💔 CRUNCH! Stepped on broken bridal glass bangles in ${patch.locationEn} — 18m noise alert! (Hold Ctrl or press C to crouch)`,
        );
      }
    }
  }
}
