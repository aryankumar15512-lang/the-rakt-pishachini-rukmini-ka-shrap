import {
  CHARACTER_VOICE_PROFILES,
  HorrorSynth,
  resolveSpeakerProfileId,
} from './horrorAudio.ts';
import { ART_SCENE_DATA_URLS } from './artKeyframes.ts';
import { VNShotSpec, UTTERANCE_POOL_13 } from './vnChapterShots.ts';
import { StoryCameraLocation, StoryCameraMotion, StoryCameraShot } from './RaktPishachiniGame.ts';
import {
  VNDialogueLine,
  VNSceneSpec,
  VN_STORY_SCENES,
  TOTAL_STORY_DURATION_SEC,
  splitIntoShortSentenceChunks,
  LOCAL_STORY_ART_IDS,
  ProceduralSceneId,
  resolveOfflineStoryVisual,
} from './storyData.ts';

export { splitIntoShortSentenceChunks };

declare global {
  interface Window {
    activeUtterances: SpeechSynthesisUtterance[];
    __utterancePool?: typeof UTTERANCE_POOL_13;
  }
}

if (typeof window !== 'undefined') {
  window.activeUtterances = window.activeUtterances || [];
}

interface MatchedStoryVisual {
  actionKey: string;
  mode: 'poster';
  artId: string;
  proceduralSceneId: ProceduralSceneId;
  artBlend: number;
  photoId: string;
  shotDesc: string;
  beatOverlay: string;
  cam: VNShotSpec['cam'];
  isFlashback: boolean;
  liveLocation: StoryCameraLocation;
  motionStyle: StoryCameraMotion;
  fov: number;
}

function normalizeHindiForSceneMatch(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\u093C/g, '') // Strip nukta so ज़ंजीर === जंजीर
    .replace(/\u0901/g, '\u0902') // Normalize chandrabindu to anusvara so चूड़ियाँ === चूड़ियां, कुएँ === कुएं
    .replace(/["""'.,!?;:—\-()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripSpeakerPrefix(raw: string): string {
  return raw.replace(/^[^:]{1,36}:\s*/, '').trim();
}

function hasAnyKeyword(normalizedText: string, keywords: string[]): boolean {
  return keywords.some((kw) => normalizedText.includes(normalizeHindiForSceneMatch(kw)));
}

const VARIED_KEN_BURNS_PRESETS: VNShotSpec['cam'][] = [
  { fx: 0.48, fy: 0.48, z0: 1.03, z1: 1.16, panX: 0.015, panY: 0.008 },
  { fx: 0.54, fy: 0.44, z0: 1.15, z1: 1.03, panX: -0.016, panY: -0.008 },
  { fx: 0.42, fy: 0.52, z0: 1.05, z1: 1.2, panX: 0.018, panY: -0.012 },
  { fx: 0.56, fy: 0.42, z0: 1.18, z1: 1.05, panX: -0.014, panY: 0.01 },
  { fx: 0.36, fy: 0.48, z0: 1.12, z1: 1.24, panX: 0.014, panY: -0.006 },
  { fx: 0.64, fy: 0.48, z0: 1.14, z1: 1.25, panX: -0.014, panY: 0.006 },
];

const MOTION_CYCLE: StoryCameraMotion[] = [
  'push_in',
  'pan_sweep',
  'crane_tilt',
  'orbit',
  'handheld_stalk',
];

function getCameraSpecForScene(
  proceduralSceneId: ProceduralSceneId,
  sceneIdx: number,
  beatIdx: number,
  chunkIdx: number,
  variationSeq: number,
): VNShotSpec['cam'] {
  switch (proceduralSceneId) {
    // Scene 1: Inside SUV & Ghost in Headlights (0:18 - 1:41)
    case 'highway_headlights_fog':
      return { fx: 0.50, fy: 0.50, z0: 1.01, z1: 1.10, panX: 0.01, panY: 0.004 };
    case 'dashboard_gps_lost':
      return { fx: 0.50, fy: 0.94, z0: 1.68, z1: 1.94, panX: 0.0, panY: 0.006 };
    case 'driver_rahul_talking':
      return { fx: 0.94, fy: 0.48, z0: 1.72, z1: 1.90, panX: -0.014, panY: -0.005 };
    case 'aman_fog_talking':
      return { fx: 0.48, fy: 0.36, z0: 1.66, z1: 1.88, panX: 0.014, panY: -0.008 };
    case 'road_bride_headlights':
      if (sceneIdx === 0 && beatIdx >= 5) {
        return { fx: 0.50, fy: 0.45, z0: 1.18, z1: 1.56, panX: 0.0, panY: -0.012 };
      }
      return { fx: 0.50, fy: 0.48, z0: 1.02, z1: 1.18, panX: 0.0, panY: -0.006 };
    case 'empty_road_skidmarks':
      return { fx: 0.48, fy: 0.02, z0: 2.66, z1: 2.88, panX: 0.02, panY: 0.0 };
    case 'suv_engine_smoke':
      // Crop strictly onto left SUV with smoking hood; Watchman on right stays completely off-screen
      return { fx: 0.04, fy: 0.86, z0: 1.86, z1: 2.02, panX: 0.012, panY: -0.008 };

    // Scene 2: Haveli Towers, 1884 Plaque & Watchman Reveal
    case 'haveli_iron_gate_storm':
      // Crop strictly onto upper Haveli towers & gate in lightning; Watchman stays below/off-screen
      return { fx: 0.68, fy: 0.02, z0: 1.92, z1: 2.08, panX: -0.022, panY: 0.0 };
    case 'haveli_nameplate_rain':
      return { fx: 0.42, fy: 0.06, z0: 1.88, z1: 2.00, panX: 0.01, panY: 0.0 };
    case 'watchman_gate_pan_reveal':
      // Smoothly pan from gate center rightward to reveal Watchman holding the glowing yellow lantern
      return { fx: 0.54, fy: 0.72, z0: 1.56, z1: 1.70, panX: -0.14, panY: -0.008 };
    case 'watchman_lantern_rain':
      if (beatIdx >= 4) {
        return { fx: 0.44, fy: 0.42, z0: 1.15, z1: 1.34, panX: -0.018, panY: -0.01 };
      }
      return { fx: 0.50, fy: 0.48, z0: 1.03, z1: 1.15, panX: 0.012, panY: -0.006 };

    // Scene 3-10 Subject Crops
    case 'poison_milk_swirl':
      return { fx: 0.56, fy: 0.58, z0: 1.62, z1: 1.86, panX: -0.01, panY: -0.008 };
    case 'poisoned_milk_bedroom':
    case 'spilled_milk_floor':
      return { fx: 0.42, fy: 0.46, z0: 1.10, z1: 1.26, panX: 0.014, panY: -0.006 };
    case 'tantrik_blue_havan_fire':
    case 'well_purifying_fire':
      return { fx: 0.48, fy: 0.60, z0: 1.24, z1: 1.44, panX: 0.0, panY: -0.012 };
    case 'tantrik_thakur_conspiracy':
      return { fx: 0.24, fy: 0.46, z0: 1.40, z1: 1.60, panX: 0.018, panY: 0.0 };
    case 'relic_bangles_chamber':
      return { fx: 0.38, fy: 0.64, z0: 1.62, z1: 1.82, panX: 0.01, panY: -0.008 };
    case 'relic_sindoor_altar':
      return { fx: 0.34, fy: 0.48, z0: 1.58, z1: 1.80, panX: -0.01, panY: 0.006 };
    case 'relic_payal_crypt':
      return { fx: 0.28, fy: 0.72, z0: 1.64, z1: 1.84, panX: 0.012, panY: -0.008 };
    case 'relic_chunari_corridor':
      return { fx: 0.68, fy: 0.52, z0: 1.52, z1: 1.72, panX: -0.012, panY: 0.006 };
    case 'four_relics_ritual':
      return { fx: 0.50, fy: 0.52, z0: 1.04, z1: 1.18, panX: 0.0, panY: -0.008 };
    case 'well_moonlight_drop':
    case 'well_stone_slab_seal':
    case 'well_shatter_smoke':
      return { fx: 0.54, fy: 0.36, z0: 1.06, z1: 1.26, panX: 0.0, panY: 0.012 };
    case 'anklet_feet_hallway':
      return { fx: 0.50, fy: 0.80, z0: 1.56, z1: 1.78, panX: 0.0, panY: -0.012 };
    case 'stairs_shadow_white_eyes':
    case 'rukmini_climax_stalk':
      return { fx: 0.50, fy: 0.36, z0: 1.16, z1: 1.44, panX: 0.0, panY: -0.01 };
    case 'splintered_door_claw':
      return { fx: 0.26, fy: 0.56, z0: 1.42, z1: 1.62, panX: 0.012, panY: -0.006 };
    default:
      return getVariedCam(variationSeq + chunkIdx + beatIdx, 0);
  }
}

function getVariedCam(variationSeq: number, zoomBoost = 0): VNShotSpec['cam'] {
  const base =
    VARIED_KEN_BURNS_PRESETS[
      Math.abs(variationSeq) % VARIED_KEN_BURNS_PRESETS.length
    ];
  return {
    fx: base.fx,
    fy: base.fy,
    z0: base.z0 + zoomBoost * 0.04,
    z1: base.z1 + zoomBoost * 0.05,
    panX: base.panX,
    panY: base.panY,
  };
}

/**
 * Matches every single spoken dialogue line / sentence chunk to a 100% offline
 * combination of high-resolution local ART_SCENE_DATA_URLS illustrations (for exact key beats)
 * and a dedicated procedural HTML5 Canvas cinematic scene composition (for every other line),
 * paired with matching atmospheric overlays and varied Ken Burns camera motion.
 */
function resolveVisualFromDialogueText(
  rawText: string,
  sceneIdx: number,
  beatIdx: number,
  chunkIdx = 0,
  variationSeq = 0,
): MatchedStoryVisual {
  const spokenBody = stripSpeakerPrefix(rawText);
  const normBody = normalizeHindiForSceneMatch(spokenBody);
  const motionStyle =
    MOTION_CYCLE[Math.abs(variationSeq + chunkIdx) % MOTION_CYCLE.length];
  const fov = 56 - ((variationSeq + chunkIdx) % 3) * 5;
  const isFlashbackScene = sceneIdx >= 2 && sceneIdx <= 6;

  const resolved = resolveOfflineStoryVisual(sceneIdx, beatIdx, spokenBody, chunkIdx);

  // Classify atmospheric sound & subtle particle overlay without ever repeating Palki/Bride posters
  let beatOverlay = resolved.beatOverlay || 'rain_lightning';
  let actionKey = `scene_${resolved.cacheKey}`;

  if (
    hasAnyKeyword(normBody, ['दूध', 'जहर', 'धोखा', 'प्याला', 'नशीली', 'विष', 'गिलास', 'केसर']) &&
    !hasAnyKeyword(normBody, ['कुए', 'कुआ'])
  ) {
    actionKey = `poisoned_milk_${resolved.cacheKey}`;
    beatOverlay = 'poison_dizzy_wave';
  } else if (
    hasAnyKeyword(normBody, [
      'पायल',
      'चूड़ियां',
      'सिंदूर',
      'जंजीर',
      'चार निशानियां',
      'चार शापित',
      'चारों चीजों',
      'चारों चीजें',
    ])
  ) {
    actionKey = `four_cursed_relics_${resolved.cacheKey}`;
    beatOverlay = resolved.beatOverlay || 'four_relics_spotlight';
  } else if (
    hasAnyKeyword(normBody, ['शिला', 'धकेल', 'पटक', 'बंद कर दिया']) ||
    (hasAnyKeyword(normBody, ['कुए', 'कुआ']) &&
      hasAnyKeyword(normBody, ['पत्थर', 'सीने', 'झोंक', 'फेंक', 'गिर', 'अंधेर', 'सील']))
  ) {
    actionKey = `courtyard_well_stone_slab_${resolved.cacheKey}`;
    beatOverlay = resolved.beatOverlay || 'well_red_vortex';
  } else if (hasAnyKeyword(normBody, ['हवन', 'मंत्र', 'आग', 'बलि', 'अग्नि', 'खंजर', 'अनुष्ठान'])) {
    actionKey = `tantrik_havan_ritual_${resolved.cacheKey}`;
    beatOverlay = resolved.beatOverlay || 'havan_flames_burst';
  } else if (hasAnyKeyword(normBody, ['फूलों की डोली', 'पालकी'])) {
    actionKey = `flashback_1992_palki_${resolved.cacheKey}`;
    beatOverlay = 'doli_flying_crows';
  } else if (hasAnyKeyword(normBody, ['1992', 'फागुन', 'तीस साल', 'शहनाई'])) {
    actionKey = `flashback_1992_memory_${resolved.cacheKey}`;
    beatOverlay = isFlashbackScene ? resolved.beatOverlay : 'watchman_lantern_glow';
  } else if (hasAnyKeyword(normBody, ['दुल्हन', 'लाल जोड़े', 'लाल बनारसी', 'शादी', 'सुहागरात', 'आलता'])) {
    actionKey = `bride_rukmini_attire_${resolved.cacheKey}`;
    beatOverlay = resolved.beatOverlay || 'smoking_blown_diyas';
  } else if (
    hasAnyKeyword(normBody, ['बीचों बीच कोई खड़ा', 'गाड़ी रोको', 'टायरों की चीख', 'हेडलाइट्स', 'लाल कपड़ों में', 'कोई औरत खड़ी'])
  ) {
    actionKey = `bride_in_headlights_${resolved.cacheKey}`;
    beatOverlay = 'red_bride_headlights';
  } else if (hasAnyKeyword(normBody, ['लालटेन', 'चौकीदार', 'चेतावनी', 'कांपती आवाज', 'पीली रोशनी'])) {
    actionKey = `watchman_baba_closeup_${resolved.cacheKey}`;
    beatOverlay = 'watchman_lantern_glow';
  } else if (sceneIdx === 0) {
    actionKey = `suv_storm_forest_road_${resolved.cacheKey}`;
    beatOverlay = resolved.beatOverlay || 'car_wipers_rain';
  } else if (sceneIdx === 9) {
    actionKey = `rukmini_climax_horror_${resolved.cacheKey}`;
    beatOverlay = resolved.beatOverlay || 'sonar_eyes_pulse';
  }

  const cam = getCameraSpecForScene(
    resolved.proceduralSceneId,
    sceneIdx,
    beatIdx,
    chunkIdx,
    variationSeq,
  );

  return {
    actionKey,
    mode: 'poster',
    artId: resolved.artId,
    proceduralSceneId: resolved.proceduralSceneId,
    artBlend: 1.0,
    photoId: `s${sceneIdx + 1}_b${beatIdx + 1}_c${chunkIdx}`,
    shotDesc: resolved.caption,
    beatOverlay,
    cam,
    isFlashback: isFlashbackScene,
    liveLocation: 'courtyard_1992',
    motionStyle,
    fov,
  };
}

/**
 * 10-Scene Continuous Visual Novel Story Director
 * Voice-driven architecture:
 * - No fixed setTimeout/setInterval timers that cut speech or switch scenes early.
 * - Splits every intro paragraph into short individual sentences (< 12 words each)
 *   and plays them sequentially via an async queue.
 * - Stores active SpeechSynthesisUtterance objects in window.activeUtterances = []
 *   until utterance.onend fires to prevent Chrome's garbage collection cutoff bug.
 * - Advances to the next sentence/beat/scene ONLY inside utterance.onend (+ 600ms natural pause).
 * - Keeps camera animations running smoothly for the exact duration of the voiceover.
 */
export class VisualNovelIntroDirector {
  private photoCanvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private synth: HorrorSynth;

  private textStageEl: HTMLElement;
  private sceneBadgeEl: HTMLElement;
  private photoCaptionEl?: HTMLElement;
  private soundIndicatorEl?: HTMLElement;
  private lightningFlashEl: HTMLElement;
  private blackoutFinalEl: HTMLElement;
  private sceneDotsContainer?: HTMLElement;
  private progressBarEl: HTMLElement | null = null;
  private pauseHintEl: HTMLElement | null = null;
  private shotBadgeEl: HTMLElement | null = null;
  private haveliPlaqueEl: HTMLElement | null = null;

  // Voice-synced timeline state (in seconds)
  public masterElapsedSec = 0;
  public sceneElapsedSec = 0;
  public beatElapsedSec = 0;
  public totalDurationSec = TOTAL_STORY_DURATION_SEC;
  public isPlaying = false;
  public isPaused = false;
  public isStoryPaused = false;
  public autoAdvance = true;

  // Jumpscare Intensity modifier (0.0 to 1.0, default 0.8)
  public jumpscareIntensity = 0.8;
  private dynamicLightningTimer = 0;
  private currentLightningInterval = 14;
  private currentLightningCanvasAlpha = 0;
  private flashTimeoutId = 0;

  public currentSceneIndex = 0;
  public currentBeatIndex = 0;
  public savedSceneIndex = 0;
  public savedLineIndex = 0;
  public savedChunkIndex = 0;
  public currentIntroLineIndex = 0;
  private lastKnownBeatIndex = 0;
  public get currentLineIndex(): number {
    return Math.max(
      0,
      this.currentBeatIndex >= 0 ? this.currentBeatIndex : this.lastKnownBeatIndex,
    );
  }

  // Layer crossfade state synced strictly to matched spoken dialogue scene changes
  private prevPhotoLayerIndex = 0;
  private targetPhotoLayerIndex = 0;
  private layerCrossfadeElapsed = 1.5;

  private prevMatchedVisual: MatchedStoryVisual | null = null;
  private currentMatchedVisual: MatchedStoryVisual | null = null;
  private visualCrossfadeElapsed = 1.5;
  private flashbackTransitionAlpha = 0;
  private visualVariationSeq = 0;
  private posterOpacity = 1;
  private targetPosterOpacity = 1;

  private rafId = 0;
  private lastRafTimestamp = 0;

  // Async voiceover queue & Chrome SpeechSynthesis keep-alive watchdog
  private ttsResumeIntervalId = 0;
  private queueRunId = 0;
  private pendingBlockedSpeechRetry: (() => void) | null = null;

  // 100% Offline local high-res keyframe images + custom frame overrides
  private preloadedKeyframes = new Map<string, HTMLImageElement>();
  private customPhotoOverrides = new Map<string, HTMLImageElement>();
  public slowHorrorPace = true;
  public activeUtteranceIndex = 0;
  private jumpScareFlashSec = 0;
  private shotCutTransitionAlpha = 0;

  public onStartGameRequested?: () => void;
  public onSceneChanged?: (sceneIdx: number, lineIdx: number) => void;
  public onStoryCameraShot?: (shot: StoryCameraShot) => void;

  constructor(
    photoCanvas: HTMLCanvasElement,
    synth: HorrorSynth,
    elements: {
      textStageEl: HTMLElement;
      sceneBadgeEl: HTMLElement;
      photoCaptionEl?: HTMLElement;
      soundIndicatorEl?: HTMLElement;
      lightningFlashEl: HTMLElement;
      blackoutFinalEl: HTMLElement;
      sceneDotsContainer?: HTMLElement;
    },
  ) {
    this.photoCanvas = photoCanvas;
    this.ctx = photoCanvas.getContext('2d')!;
    this.synth = synth;

    this.textStageEl = elements.textStageEl;
    this.sceneBadgeEl = elements.sceneBadgeEl;
    this.photoCaptionEl = elements.photoCaptionEl;
    this.soundIndicatorEl = elements.soundIndicatorEl;
    this.lightningFlashEl = elements.lightningFlashEl;
    this.blackoutFinalEl = elements.blackoutFinalEl;
    this.sceneDotsContainer = elements.sceneDotsContainer;

    this.progressBarEl = document.getElementById('vn-progress-bar');
    this.pauseHintEl = document.getElementById('vn-pause-hint');
    this.shotBadgeEl = document.getElementById('vn-shot-badge');
    this.haveliPlaqueEl = document.getElementById('vn-haveli-plaque');

    // Immediately preload all 13 built-in offline story illustrations from ART_SCENE_DATA_URLS
    this.preloadInitialStoryImages();

    if (typeof window !== 'undefined') {
      window.activeUtterances = window.activeUtterances || [];
      window.__utterancePool = UTTERANCE_POOL_13;
    }

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.setupKeyboardControls();
  }

  /**
   * Synchronously preloads all 13 embedded local story illustrations (zero external requests, zero rate limits)
   */
  public preloadInitialStoryImages(_lineCount = 5) {
    for (const artId of LOCAL_STORY_ART_IDS) {
      if (this.preloadedKeyframes.has(artId)) continue;
      const dataUrl = ART_SCENE_DATA_URLS[artId];
      if (dataUrl) {
        const img = new Image();
        img.src = dataUrl;
        this.preloadedKeyframes.set(artId, img);
      }
    }
    for (const [artId, dataUrl] of Object.entries(ART_SCENE_DATA_URLS)) {
      if (!this.preloadedKeyframes.has(artId) && dataUrl) {
        const img = new Image();
        img.src = dataUrl;
        this.preloadedKeyframes.set(artId, img);
      }
    }
  }

  public resize() {
    const w = window.innerWidth || 1280;
    const h = window.innerHeight || 720;
    this.photoCanvas.width = w;
    this.photoCanvas.height = h;
  }

  private computeFlatLineIndex(sceneIdx: number, beatIdx: number): number {
    let flat = 0;
    for (let s = 0; s < sceneIdx && s < VN_STORY_SCENES.length; s++) {
      flat += VN_STORY_SCENES[s].lines.length;
    }
    return flat + Math.max(0, beatIdx);
  }

  private setupKeyboardControls() {
    window.addEventListener('keydown', (e) => {
      // Toggle inline pause on Spacebar only when story screen is active and Pause Menu is not open
      const pauseModal = document.getElementById('pause-modal');
      const isPauseMenuOpen = Boolean(
        pauseModal && !pauseModal.classList.contains('hidden'),
      );
      if (e.code === 'Space' && this.isPlaying && !isPauseMenuOpen) {
        e.preventDefault();
        this.togglePause();
      }
    });
  }

  /**
   * Pauses the Intro Story cleanly while saving the exact scene, line, and chunk position.
   * Halts active speech and invalidates running backup timers so nothing advances while paused.
   */
  public pauseStory() {
    if (!this.isPlaying || this.isPaused) return;

    // Save exact intro story position before halting speech/timers
    this.savedSceneIndex = this.currentSceneIndex;
    this.savedLineIndex = this.currentBeatIndex;
    this.savedChunkIndex = Math.max(0, this.activeUtteranceIndex);
    this.currentIntroLineIndex = this.computeFlatLineIndex(
      this.savedSceneIndex,
      this.savedLineIndex,
    );

    this.isPaused = true;
    this.isStoryPaused = true;
    this.pendingBlockedSpeechRetry = null;

    // Invalidate current voiceover queue run so no pending backup timer fires while paused
    this.queueRunId++;

    if (this.pauseHintEl) {
      this.pauseHintEl.textContent = 'रोका गया (Resume या Space दबाकर चलाएँ)';
    }
    this.synth.setStorySfxPaused(true);
    this.synth.stopAllVNSounds();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (Array.isArray(window.activeUtterances)) {
        window.activeUtterances.length = 0;
      }
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Resumes the Intro Story immediately from the exact saved scene, line, and chunk index.
   */
  public resumeStory() {
    if (!this.isPlaying || !this.isPaused) return;

    this.isPaused = false;
    this.isStoryPaused = false;
    this.pendingBlockedSpeechRetry = null;
    this.lastRafTimestamp = performance.now();

    if (this.pauseHintEl) {
      this.pauseHintEl.textContent = 'स्पेस दबाएँ (Pause/Play)';
    }
    this.synth.setStorySfxPaused(false);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {
        // Ignore
      }
    }

    const resumeScene = Math.max(
      0,
      Math.min(VN_STORY_SCENES.length - 1, this.savedSceneIndex),
    );
    const scene = VN_STORY_SCENES[resumeScene];
    const resumeBeat = Math.max(
      0,
      Math.min((scene?.lines.length || 1) - 1, this.savedLineIndex),
    );
    const resumeChunk = Math.max(0, this.savedChunkIndex);

    this.currentSceneIndex = resumeScene;
    this.currentBeatIndex = resumeBeat;
    this.lastKnownBeatIndex = resumeBeat;
    this.activeUtteranceIndex = resumeChunk;
    this.currentIntroLineIndex = this.computeFlatLineIndex(
      resumeScene,
      resumeBeat,
    );

    const runId = ++this.queueRunId;
    void this.runStoryVoiceoverQueue(resumeScene, resumeBeat, runId, resumeChunk);
  }

  public togglePause() {
    if (this.isPaused) {
      this.resumeStory();
    } else {
      this.pauseStory();
    }
  }

  /**
   * Called on user interaction (click/keydown) to resume speech if the browser
   * initially paused or blocked autoplay speech, without ever cancelling active speech.
   */
  public ensureSpeechUnlocked() {
    if (!this.isPlaying || this.isPaused) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      if (
        this.pendingBlockedSpeechRetry &&
        !window.speechSynthesis.speaking &&
        !window.speechSynthesis.pending
      ) {
        const retry = this.pendingBlockedSpeechRetry;
        this.pendingBlockedSpeechRetry = null;
        retry();
      }
    }
  }

  public setJumpscareIntensity(percent: number) {
    const clamped = Math.max(0, Math.min(100, percent));
    this.jumpscareIntensity = clamped / 100;
    this.synth.setJumpscareIntensity(percent);
    this.recomputeNextLightningInterval();
  }

  private getLightningDurationFactor(): number {
    if (this.jumpscareIntensity <= 0.01) return 0;
    return 0.35 + this.jumpscareIntensity * 0.95;
  }

  private recomputeNextLightningInterval() {
    if (this.jumpscareIntensity <= 0.01) {
      this.currentLightningInterval = Infinity;
      return;
    }
    const minSec = 8 + (1 - this.jumpscareIntensity) * 28;
    const varSec = 6 + (1 - this.jumpscareIntensity) * 20;
    this.currentLightningInterval = minSec + Math.random() * varSec;
  }

  private triggerDynamicLightningStrike() {
    if (this.jumpscareIntensity <= 0.01 || !this.isPlaying || this.isPaused) return;

    const durationMs = Math.round(260 * this.getLightningDurationFactor());
    this.triggerScreenFlash('rgba(215, 235, 255, 0.88)', durationMs);

    this.currentLightningCanvasAlpha = Math.min(
      0.75,
      0.2 + this.jumpscareIntensity * 0.55,
    );
  }

  public triggerTestPreviewFlash() {
    if (this.jumpscareIntensity <= 0.01) return;
    const durationMs = Math.round(220 * this.getLightningDurationFactor());
    this.triggerScreenFlash('rgba(215, 235, 255, 0.72)', durationMs);
    this.currentLightningCanvasAlpha = Math.min(
      0.55,
      0.15 + this.jumpscareIntensity * 0.4,
    );
  }

  public setCustomPhotoForCurrentFrame(imgUrl: string) {
    const targetKey = this.currentMatchedVisual?.photoId || 'custom_frame';
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.customPhotoOverrides.set(targetKey, img);
    };
    img.src = imgUrl;
  }

  public start(sceneIdx = 0, beatIdx = 0) {
    this.queueRunId++;
    const runId = this.queueRunId;

    this.isPlaying = true;
    this.isPaused = false;
    this.isStoryPaused = false;
    this.pendingBlockedSpeechRetry = null;
    this.blackoutFinalEl.classList.add('hidden');
    this.textStageEl.innerHTML = '';

    // Unlock Web Audio API immediately on story start and enable 25% story SFX bus
    this.synth.unlockAudio();
    this.synth.stopIntroAmbience();
    this.synth.setStorySfxMode(true);

    // Clear any stuck speechSynthesis queue once when starting the intro story
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (Array.isArray(window.activeUtterances)) {
        window.activeUtterances.length = 0;
      }
      try {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {
        // Ignore
      }
    }

    const clampedScene = Math.max(
      0,
      Math.min(VN_STORY_SCENES.length - 1, sceneIdx),
    );
    const scene = VN_STORY_SCENES[clampedScene];
    const clampedBeat = Math.max(
      0,
      Math.min((scene?.lines.length || 1) - 1, beatIdx),
    );

    let startSec = 0;
    for (let i = 0; i < clampedScene && i < VN_STORY_SCENES.length; i++) {
      startSec += VN_STORY_SCENES[i].durationSec;
    }
    this.masterElapsedSec = startSec;
    this.sceneElapsedSec = 0;
    this.beatElapsedSec = 0;
    this.currentSceneIndex = clampedScene;
    this.currentBeatIndex = clampedBeat;
    this.lastKnownBeatIndex = clampedBeat;
    this.savedSceneIndex = clampedScene;
    this.savedLineIndex = clampedBeat;
    this.savedChunkIndex = 0;
    this.currentIntroLineIndex = this.computeFlatLineIndex(
      clampedScene,
      clampedBeat,
    );
    this.prevPhotoLayerIndex = scene?.lines[clampedBeat]?.photoIndex ?? 0;
    this.targetPhotoLayerIndex = this.prevPhotoLayerIndex;
    this.layerCrossfadeElapsed = 1.5;
    this.prevMatchedVisual = null;
    this.currentMatchedVisual = null;
    this.visualCrossfadeElapsed = 1.5;
    this.flashbackTransitionAlpha = 0;
    this.visualVariationSeq = 0;
    const initialBeat = scene?.lines[clampedBeat];
    if (initialBeat) {
      const initialChunks = splitIntoShortSentenceChunks(initialBeat.text, 14);
      this.applyVisualForSpokenText(
        initialChunks[0] || initialBeat.text,
        clampedScene,
        clampedBeat,
        true,
        true,
        0,
      );
      this.posterOpacity = this.targetPosterOpacity;
    }

    // Start continuous eerie horror drone bed (routed through 25% story SFX bus)
    this.synth.startContinuousStorySoundscape();
    this.synth.updateStorySceneAtmosphere(scene?.sceneNumber || 1);

    // Keep-alive resume check if speechSynthesis.paused becomes true
    if (this.ttsResumeIntervalId) clearInterval(this.ttsResumeIntervalId);
    this.ttsResumeIntervalId = window.setInterval(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.paused && !this.isPaused) {
          window.speechSynthesis.resume();
        }
      }
    }, 450);

    // Start the async voiceover queue that advances via utterance.onend (+ 600ms pause) or safe backup timer
    void this.runStoryVoiceoverQueue(clampedScene, clampedBeat, runId);

    this.lastRafTimestamp = performance.now();
    cancelAnimationFrame(this.rafId);
    const loop = (timestamp: number) => {
      if (!this.isPlaying) return;
      const deltaSec = Math.min(
        0.1,
        (timestamp - this.lastRafTimestamp) * 0.001,
      );
      this.lastRafTimestamp = timestamp;

      if (!this.isPaused) {
        this.updateVisualAnimationTimers(deltaSec);
      }
      this.renderMasterFrame(this.masterElapsedSec);

      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  public stop() {
    this.queueRunId++;
    this.isPlaying = false;
    this.isPaused = false;
    this.isStoryPaused = false;
    this.pendingBlockedSpeechRetry = null;
    cancelAnimationFrame(this.rafId);
    if (this.ttsResumeIntervalId) clearInterval(this.ttsResumeIntervalId);
    this.ttsResumeIntervalId = 0;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (Array.isArray(window.activeUtterances)) {
        window.activeUtterances.length = 0;
      }
      window.speechSynthesis.cancel();
    }
    this.synth.stopContinuousStorySoundscape();
    this.synth.stopAllVNSounds();
    this.synth.setStorySfxMode(false);
    this.haveliPlaqueEl?.classList.add('hidden');
  }

  public nextStep() {
    if (this.currentSceneIndex + 1 < VN_STORY_SCENES.length) {
      this.jumpToScene(this.currentSceneIndex + 1);
    } else {
      this.finishStoryAndShowBlackout();
    }
  }

  public prevStep() {
    if (this.currentSceneIndex > 0) {
      this.jumpToScene(this.currentSceneIndex - 1);
    } else {
      this.jumpToScene(0);
    }
  }

  public jumpToScene(targetSceneIdx: number) {
    const idx = Math.max(
      0,
      Math.min(VN_STORY_SCENES.length - 1, targetSceneIdx),
    );
    this.jumpToBeat(idx, 0);
  }

  public jumpToBeat(sceneIdx: number, beatIdx: number) {
    const sIdx = Math.max(0, Math.min(VN_STORY_SCENES.length - 1, sceneIdx));
    const scene = VN_STORY_SCENES[sIdx];
    if (!scene) return;
    const bIdx = Math.max(0, Math.min(scene.lines.length - 1, beatIdx));

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (Array.isArray(window.activeUtterances)) {
        window.activeUtterances.length = 0;
      }
      window.speechSynthesis.cancel();
    }

    this.synth.stopAllVNSounds();

    if (this.isPlaying) {
      this.start(sIdx, bIdx);
    } else {
      this.currentSceneIndex = sIdx;
      this.currentBeatIndex = bIdx;
      this.lastKnownBeatIndex = bIdx;
      this.shotCutTransitionAlpha = 0.72;
      const beat = scene.lines[bIdx];
      if (beat) {
        const beatChunks = splitIntoShortSentenceChunks(beat.text, 14);
        this.applyVisualForSpokenText(beatChunks[0] || beat.text, sIdx, bIdx, true, true, 0);
      }
      this.onSceneChanged?.(sIdx, bIdx);
    }
  }

  public prevBeat() {
    const scene = VN_STORY_SCENES[this.currentSceneIndex];
    if (!scene) return;
    const curBeat = this.currentLineIndex;
    if (curBeat > 0) {
      this.jumpToBeat(this.currentSceneIndex, curBeat - 1);
    } else if (this.currentSceneIndex > 0) {
      const prevSceneIdx = this.currentSceneIndex - 1;
      const prevScene = VN_STORY_SCENES[prevSceneIdx];
      this.jumpToBeat(prevSceneIdx, Math.max(0, prevScene.lines.length - 1));
    } else {
      this.jumpToBeat(0, 0);
    }
  }

  public nextBeat() {
    const scene = VN_STORY_SCENES[this.currentSceneIndex];
    if (!scene) return;
    const nextBeatIdx = this.currentLineIndex + 1;
    if (nextBeatIdx < scene.lines.length) {
      this.jumpToBeat(this.currentSceneIndex, nextBeatIdx);
    } else if (this.currentSceneIndex + 1 < VN_STORY_SCENES.length) {
      this.jumpToScene(this.currentSceneIndex + 1);
    } else {
      this.finishStoryAndShowBlackout();
    }
  }

  public getShotForBeat(sceneIdx: number, beatIdx: number): VNShotSpec {
    const beat = VN_STORY_SCENES[sceneIdx]?.lines[beatIdx];
    const isActiveBeat =
      sceneIdx === this.currentSceneIndex &&
      beatIdx === this.currentLineIndex &&
      this.currentMatchedVisual !== null;

    const resolved: MatchedStoryVisual = isActiveBeat
      ? this.currentMatchedVisual!
      : resolveVisualFromDialogueText(
          beat?.text || '',
          sceneIdx,
          beatIdx,
          0,
          beatIdx,
        );

    return {
      shotNum: beatIdx + 1,
      artId: resolved.artId || 'art-friends-car',
      shotDesc: resolved.shotDesc || 'ठाकुर हवेली — कथा दृश्य',
      cam: resolved.cam || UTTERANCE_POOL_13[0].cam,
      beatOverlay: resolved.beatOverlay || 'car_wipers_rain',
      speaker: resolved.isFlashback
        ? '🎞️ 1992 फ्लैशबैक'
        : beat?.speaker || '🎙️ सूत्रधार',
      sfx: beat?.soundCue ? `🔊 [${beat.soundCue}]` : '🔊 [हॉरर एम्बिएंस]',
    };
  }

  private applyVisualForSpokenText(
    spokenText: string,
    sceneIdx: number,
    beatIdx: number,
    immediate = false,
    forceEmit = false,
    chunkIdx = 0,
  ) {
    this.visualVariationSeq++;
    const nextVisual = resolveVisualFromDialogueText(
      spokenText,
      sceneIdx,
      beatIdx,
      chunkIdx,
      this.visualVariationSeq,
    );

    const prev = this.currentMatchedVisual;
    const isChanged =
      !prev ||
      prev.artId !== nextVisual.artId ||
      prev.proceduralSceneId !== nextVisual.proceduralSceneId ||
      prev.actionKey !== nextVisual.actionKey;

    const enteringFlashback =
      nextVisual.isFlashback && (!prev || !prev.isFlashback);

    if (this.isPlaying) {
      this.synth.syncStoryActionSfx(
        nextVisual.actionKey,
        spokenText,
        isChanged,
        enteringFlashback,
      );
    }

    if (this.haveliPlaqueEl) {
      this.haveliPlaqueEl.classList.toggle(
        'hidden',
        nextVisual.proceduralSceneId !== 'haveli_nameplate_rain',
      );
    }

    if (!isChanged && !forceEmit) return;

    this.prevMatchedVisual = prev;
    this.currentMatchedVisual = nextVisual;
    this.targetPosterOpacity = 1.0;
    this.posterOpacity = 1.0;
    this.visualCrossfadeElapsed = immediate ? 0.85 : 0;

    if (!immediate) {
      this.shotCutTransitionAlpha = enteringFlashback
        ? 0.45
        : isChanged
          ? 0.28
          : 0.12;
    }

    if (enteringFlashback && !immediate) {
      this.flashbackTransitionAlpha = 0.92;
      this.triggerScreenFlash('rgba(255, 224, 165, 0.72)', 650);
    }

    if (this.shotBadgeEl) {
      const modeTag = nextVisual.isFlashback ? '🎞️ 1992:' : '🖼️ Story:';
      this.shotBadgeEl.textContent = `${modeTag} ${nextVisual.shotDesc}`;
    }
  }

  public togglePace(): boolean {
    this.slowHorrorPace = !this.slowHorrorPace;
    return this.slowHorrorPace;
  }

  public triggerJumpScareTest() {
    this.jumpScareFlashSec = 0.72;
    this.currentLightningCanvasAlpha = Math.min(
      0.95,
      0.4 + this.jumpscareIntensity * 0.55,
    );
    this.triggerScreenFlash('rgba(220, 20, 35, 0.82)', 480);
  }

  /**
   * Updates continuous camera and atmospheric animation timers every frame.
   * Never cuts speech or forces scene/beat transitions on a timer; scene/beat
   * progression is strictly driven by the async utterance.onend queue below.
   */
  private updateVisualAnimationTimers(dt: number) {
    this.masterElapsedSec += dt;
    this.sceneElapsedSec += dt;
    this.beatElapsedSec += dt;
    this.layerCrossfadeElapsed = Math.min(1.5, this.layerCrossfadeElapsed + dt);
    this.visualCrossfadeElapsed = Math.min(
      1.2,
      this.visualCrossfadeElapsed + dt,
    );
    // Smoothly blend between poster overlay (1.0) and live 3D Three.js camera view (0.0)
    if (Math.abs(this.posterOpacity - this.targetPosterOpacity) > 0.002) {
      const step = dt * 3.6;
      if (this.posterOpacity < this.targetPosterOpacity) {
        this.posterOpacity = Math.min(
          this.targetPosterOpacity,
          this.posterOpacity + step,
        );
      } else {
        this.posterOpacity = Math.max(
          this.targetPosterOpacity,
          this.posterOpacity - step,
        );
      }
    } else {
      this.posterOpacity = this.targetPosterOpacity;
    }

    if (this.flashbackTransitionAlpha > 0.005) {
      this.flashbackTransitionAlpha = Math.max(
        0,
        this.flashbackTransitionAlpha - dt * 1.15,
      );
    }

    if (this.jumpScareFlashSec > 0) {
      this.jumpScareFlashSec = Math.max(0, this.jumpScareFlashSec - dt);
    }

    const scene =
      VN_STORY_SCENES[this.currentSceneIndex] || VN_STORY_SCENES[0];

    // Update bottom progress bar and scene badge based on actual scene & beat progress
    if (this.progressBarEl) {
      const totalScenes = VN_STORY_SCENES.length;
      const beatFraction =
        scene.lines.length > 0
          ? (this.currentLineIndex +
              Math.min(0.95, this.beatElapsedSec / 7.5)) /
            scene.lines.length
          : 0;
      const pct = Math.min(
        100,
        ((this.currentSceneIndex + beatFraction) / totalScenes) * 100,
      );
      this.progressBarEl.style.width = pct.toFixed(2) + '%';
    }

    const mins = Math.floor(this.masterElapsedSec / 60);
    const secs = Math.floor(this.masterElapsedSec % 60);
    const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    this.sceneBadgeEl.textContent = `${scene.titleHi} (${timeStr})`;

    // Decay film-cut transition alpha smoothly
    if (this.shotCutTransitionAlpha > 0.005) {
      this.shotCutTransitionAlpha = Math.max(
        0,
        this.shotCutTransitionAlpha - dt * 2.6,
      );
    }

    // Decay canvas lightning flash alpha smoothly
    if (this.currentLightningCanvasAlpha > 0) {
      const decaySpeed =
        3.2 / Math.max(0.2, this.getLightningDurationFactor());
      this.currentLightningCanvasAlpha = Math.max(
        0,
        this.currentLightningCanvasAlpha - dt * decaySpeed,
      );
    }

    // Dynamic periodic atmospheric lightning strikes
    if (this.jumpscareIntensity > 0.02) {
      this.dynamicLightningTimer += dt;
      if (this.dynamicLightningTimer >= this.currentLightningInterval) {
        this.dynamicLightningTimer = 0;
        this.recomputeNextLightningInterval();
        this.triggerDynamicLightningStrike();
      }
    }
  }

  /**
   * Async Voiceover Queue:
   * - Walks through each scene and dialogue beat sequentially.
   * - Splits every line into short individual sentences (< 12 words each).
   * - Speaks each short sentence and waits for utterance.onend + 600ms natural pause
   *   before advancing to the next sentence/beat/scene.
   */
  private async runStoryVoiceoverQueue(
    startSceneIdx: number,
    startBeatIdx: number,
    runId: number,
    startChunkIdx = 0,
  ): Promise<void> {
    for (let sIdx = startSceneIdx; sIdx < VN_STORY_SCENES.length; sIdx++) {
      if (!this.isPlaying || runId !== this.queueRunId) return;

      const scene = VN_STORY_SCENES[sIdx];
      if (!scene) continue;

      if (sIdx !== this.currentSceneIndex) {
        this.currentSceneIndex = sIdx;
        this.sceneElapsedSec = 0;
        this.synth.stopAllVNSounds();
        this.synth.updateStorySceneAtmosphere(scene.sceneNumber);
        this.onSceneChanged?.(sIdx, 0);
      }

      const firstBeat = sIdx === startSceneIdx ? startBeatIdx : 0;
      for (let bIdx = firstBeat; bIdx < scene.lines.length; bIdx++) {
        if (!this.isPlaying || runId !== this.queueRunId) return;

        await this.waitWhilePaused(runId);
        if (!this.isPlaying || runId !== this.queueRunId) return;

        const beat = scene.lines[bIdx];
        this.currentBeatIndex = bIdx;
        this.lastKnownBeatIndex = bIdx;
        this.savedSceneIndex = sIdx;
        this.savedLineIndex = bIdx;
        this.currentIntroLineIndex = this.computeFlatLineIndex(sIdx, bIdx);
        this.beatElapsedSec = 0;
        this.shotCutTransitionAlpha = 0.72;

        if (beat.photoIndex !== this.targetPhotoLayerIndex) {
          this.prevPhotoLayerIndex = this.targetPhotoLayerIndex;
          this.targetPhotoLayerIndex = beat.photoIndex;
          this.layerCrossfadeElapsed = 0;
        }

        // Split paragraph into natural individual sentences (never 1-word fragments)
        const shortSentences = splitIntoShortSentenceChunks(beat.text, 14);
        const firstChunk =
          sIdx === startSceneIdx && bIdx === startBeatIdx
            ? Math.max(0, Math.min(Math.max(0, shortSentences.length - 1), startChunkIdx))
            : 0;

        this.activateBeatVisualsAndSfx(
          beat,
          shortSentences[firstChunk] || shortSentences[0] || beat.text,
        );

        if (shortSentences.length === 0) {
          await this.waitMs(600, runId);
          continue;
        }

        for (let cIdx = firstChunk; cIdx < shortSentences.length; cIdx++) {
          if (!this.isPlaying || runId !== this.queueRunId) return;
          await this.waitWhilePaused(runId);
          if (!this.isPlaying || runId !== this.queueRunId) return;

          const sentenceChunk = shortSentences[cIdx];
          this.activeUtteranceIndex = cIdx;
          this.savedSceneIndex = sIdx;
          this.savedLineIndex = bIdx;
          this.savedChunkIndex = cIdx;
          this.currentIntroLineIndex = this.computeFlatLineIndex(sIdx, bIdx);

          // Update text display immediately and force fresh visual update inside utterance.onstart
          this.updateDisplayedSentenceTextOnly(beat, sentenceChunk);

          // Wait strictly for utterance.onend (+ 600ms natural pause inside)
          await this.speakSentenceChunkAndWaitOnEnd(
            sentenceChunk,
            beat.voice,
            runId,
            () => {
              if (!this.isPlaying || runId !== this.queueRunId) return;
              this.applyVisualForSpokenText(
                sentenceChunk,
                sIdx,
                bIdx,
                false,
                true,
                cIdx,
              );
            },
            beat.speaker,
          );
        }
      }
    }

    if (this.isPlaying && runId === this.queueRunId) {
      this.finishStoryAndShowBlackout();
    }
  }

  private activateBeatVisualsAndSfx(beat: VNDialogueLine, firstChunkText?: string) {
    this.applyVisualForSpokenText(
      firstChunkText || beat.text,
      this.currentSceneIndex,
      this.currentLineIndex,
      false,
      true,
      0,
    );
    const shot = this.getShotForBeat(
      this.currentSceneIndex,
      this.currentLineIndex,
    );

    // Trigger Web Audio sound cue if defined
    if (beat.soundCue) {
      this.synth.playVNSoundCue(beat.soundCue);
    }

    if (this.photoCaptionEl) {
      const speakerMatch = beat.text.match(/^([^:]+):/);
      this.photoCaptionEl.textContent = speakerMatch
        ? speakerMatch[1].trim()
        : shot.speaker;
    }
    if (this.soundIndicatorEl) {
      this.soundIndicatorEl.textContent =
        shot.sfx ||
        (beat.soundCue ? `🔊 [${beat.soundCue}]` : '🔊 [हॉरर एम्बिएंस]');
    }
    this.onSceneChanged?.(this.currentSceneIndex, this.currentLineIndex);

    // Trigger lightning flash with dynamic duration and canvas illumination
    if (beat.style === 'lightning' || beat.style === 'jolt-red-giant') {
      if (this.jumpscareIntensity > 0.01) {
        const dur = Math.round(420 * this.getLightningDurationFactor());
        this.triggerScreenFlash(
          beat.style === 'jolt-red-giant'
            ? 'rgba(255, 0, 20, 0.75)'
            : 'rgba(215, 235, 255, 0.88)',
          dur,
        );
        this.currentLightningCanvasAlpha = Math.min(
          0.85,
          0.25 + this.jumpscareIntensity * 0.6,
        );
      }
    }

    this.renderDirectionalText(beat);
  }

  private updateDisplayedSentenceTextOnly(
    beat: VNDialogueLine,
    sentenceChunk: string,
  ) {
    const contentEl = this.textStageEl.querySelector(
      '.vn-dialogue-content',
    ) as HTMLElement | null;
    if (contentEl) {
      const speakerPrefix = beat.speaker ? `${beat.speaker}: ` : '';
      contentEl.textContent = `${speakerPrefix}${sentenceChunk}`;
    }
  }

  private renderDirectionalText(beat: VNDialogueLine) {
    this.textStageEl.innerHTML = '';

    const box = document.createElement('div');
    const styleClass = `vn-style-${beat.style}`;
    box.className = `vn-dialogue-box vn-text-from-bottom ${styleClass}`;

    const p = document.createElement('div');
    p.className = 'vn-dialogue-content';
    p.textContent = beat.text;
    box.appendChild(p);

    this.textStageEl.appendChild(box);
  }

  private async waitWhilePaused(runId: number): Promise<void> {
    while (this.isPaused && this.isPlaying && runId === this.queueRunId) {
      await new Promise<void>((r) => window.setTimeout(r, 80));
    }
  }

  private async waitMs(ms: number, runId: number): Promise<void> {
    let remaining = ms;
    const step = 60;
    while (remaining > 0 && this.isPlaying && runId === this.queueRunId) {
      if (!this.isPaused) {
        remaining -= step;
      }
      await new Promise<void>((r) => window.setTimeout(r, step));
    }
  }

  /**
   * Speaks a single short sentence chunk (< 12 words), stores the active
   * SpeechSynthesisUtterance in window.activeUtterances = [] until onend fires
   * (preventing Chrome's garbage collection cutoff bug), and advances when
   * utterance.onend fires (+ 600ms natural pause) OR via a safe backup timer
   * calculated from text length (Math.max(5000, text.length * 95) ms) so the
   * story never gets stuck or goes silent even if speechSynthesis fails.
   */
  private async speakSentenceChunkAndWaitOnEnd(
    chunk: string,
    voiceType: string,
    runId: number,
    onUtteranceStart?: () => void,
    speakerName?: string,
  ): Promise<void> {
    if (!this.isPlaying || runId !== this.queueRunId) return;

    // Safe backup duration calculated from text length: Math.max(5000, text.length * 95) ms
    const safeBackupMs = Math.max(5000, chunk.length * 95);

    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window) ||
      this.synth.muted
    ) {
      onUtteranceStart?.();
      await this.waitMs(safeBackupMs, runId);
      return;
    }

    await new Promise<void>((resolve) => {
      let finished = false;
      let startedVisual = false;
      let backupTimerId = 0;
      let startFallbackTimerId = 0;

      const triggerStartVisualOnce = () => {
        if (startedVisual || finished || !this.isPlaying || runId !== this.queueRunId) {
          return;
        }
        startedVisual = true;
        if (startFallbackTimerId) {
          window.clearTimeout(startFallbackTimerId);
          startFallbackTimerId = 0;
        }
        onUtteranceStart?.();
      };

      const completeAndAdvance = (pauseAfterMs = 600) => {
        if (finished) return;
        finished = true;
        if (backupTimerId) {
          window.clearTimeout(backupTimerId);
          backupTimerId = 0;
        }
        if (startFallbackTimerId) {
          window.clearTimeout(startFallbackTimerId);
          startFallbackTimerId = 0;
        }
        this.pendingBlockedSpeechRetry = null;

        if (!this.isPlaying || runId !== this.queueRunId) {
          resolve();
          return;
        }

        if (pauseAfterMs > 0) {
          window.setTimeout(() => {
            resolve();
          }, pauseAfterMs);
        } else {
          resolve();
        }
      };

      // Safe backup timer calculated from text length (Math.max(5000, text.length * 95) ms)
      // so the story never gets stuck if speechSynthesis fails or hangs
      backupTimerId = window.setTimeout(() => {
        completeAndAdvance(0);
      }, safeBackupMs);

      // Guard fallback in case browser TTS silently drops onstart
      startFallbackTimerId = window.setTimeout(() => {
        triggerStartVisualOnce();
      }, 180);

      const speakAttempt = () => {
        if (finished || !this.isPlaying || runId !== this.queueRunId) {
          completeAndAdvance(0);
          return;
        }

        try {
          if (!Array.isArray(window.activeUtterances)) {
            window.activeUtterances = [];
          }

          if (window.speechSynthesis.paused && !this.isPaused) {
            window.speechSynthesis.resume();
          }

          const rateMultiplier = this.slowHorrorPace ? 1.0 : 1.18;
          const profileId = resolveSpeakerProfileId(
            voiceType,
            speakerName,
            chunk,
          );
          const isRukminiLine = Boolean(
            CHARACTER_VOICE_PROFILES[profileId].ghostlyTail,
          );

          // Configure character-specific voice profile automatically from speaker name / voiceType
          const utter = this.synth.configureUtteranceWithFallback(
            chunk,
            voiceType,
            rateMultiplier,
            speakerName,
          );

          // Store in global window.activeUtterances array until onend fires so Chrome GC never cuts off speech
          window.activeUtterances.push(utter);
          const startedAt = performance.now();

          const removeFromGlobalUtterances = () => {
            if (!Array.isArray(window.activeUtterances)) return;
            const idx = window.activeUtterances.indexOf(utter);
            if (idx !== -1) {
              window.activeUtterances.splice(idx, 1);
            }
          };

          utter.onstart = () => {
            // Force visual scene / Live 3D camera update every time a spoken line starts
            triggerStartVisualOnce();
            if (isRukminiLine) {
              this.synth.playRukminiGhostlyTail(0.45);
            }
          };

          utter.onend = () => {
            removeFromGlobalUtterances();
            if (finished) return;
            const elapsedMs = performance.now() - startedAt;
            // If the browser speech engine completed normally, advance after a natural 600ms pause.
            // If it fired onend instantaneously (< 250ms) because OS TTS failed silently, let the safe backup timer pace the scene.
            if (elapsedMs >= 250) {
              if (isRukminiLine) {
                this.synth.playRukminiGhostlyTail(1.0);
              }
              completeAndAdvance(600);
            }
          };

          utter.onerror = (ev) => {
            removeFromGlobalUtterances();
            if (finished) return;

            if (!this.isPlaying || runId !== this.queueRunId) {
              completeAndAdvance(0);
              return;
            }

            if (ev.error === 'not-allowed') {
              // Browser requires a user gesture before speaking; allow immediate retry on click/keydown
              this.pendingBlockedSpeechRetry = () => {
                if (!finished && this.isPlaying && runId === this.queueRunId) {
                  speakAttempt();
                }
              };
            }
            // Do not cut the scene early on TTS error; the safeBackupMs timer will advance smoothly
          };

          window.speechSynthesis.speak(utter);
        } catch {
          triggerStartVisualOnce();
        }
      };

      speakAttempt();
    });
  }

  private triggerScreenFlash(color: string, customDurationMs?: number) {
    if (this.jumpscareIntensity <= 0.01) return;
    const baseDuration =
      customDurationMs ?? Math.round(420 * this.getLightningDurationFactor());
    if (baseDuration <= 0) return;

    if (this.flashTimeoutId) {
      window.clearTimeout(this.flashTimeoutId);
      this.flashTimeoutId = 0;
    }

    this.lightningFlashEl.style.backgroundColor = color;
    this.lightningFlashEl.style.opacity = `${Math.min(1.0, 0.4 + this.jumpscareIntensity * 0.6)}`;
    this.lightningFlashEl.classList.remove('hidden');
    this.lightningFlashEl.classList.add('flash-active');

    if (this.jumpscareIntensity > 0.7 && baseDuration > 180) {
      window.setTimeout(() => {
        if (!this.isPlaying) return;
        this.lightningFlashEl.style.opacity = '0.35';
        window.setTimeout(() => {
          if (!this.isPlaying) return;
          this.lightningFlashEl.style.opacity = `${Math.min(1.0, 0.45 + this.jumpscareIntensity * 0.55)}`;
        }, 35);
      }, 55);
    }

    this.flashTimeoutId = window.setTimeout(() => {
      this.lightningFlashEl.classList.remove('flash-active');
      this.lightningFlashEl.classList.add('hidden');
      this.lightningFlashEl.style.opacity = '1';
      this.flashTimeoutId = 0;
    }, baseDuration);
  }

  private finishStoryAndShowBlackout() {
    this.stop();
    this.haveliPlaqueEl?.classList.add('hidden');
    this.textStageEl.innerHTML = '';
    this.blackoutFinalEl.classList.remove('hidden');
  }

  // ============================================================================
  // MASTER FRAME RENDERER: VOICE-SYNCED 3-LAYER CROSSFADE + CONTINUOUS KEN BURNS
  // ============================================================================

  private renderMasterFrame(elapsedSec: number) {
    const ctx = this.ctx;
    const w = this.photoCanvas.width;
    const h = this.photoCanvas.height;
    if (!ctx || w === 0 || h === 0) return;

    const scene =
      VN_STORY_SCENES[this.currentSceneIndex] || VN_STORY_SCENES[0];
    const currentVis = this.currentMatchedVisual;
    const isSepiaFlashback =
      Boolean(currentVis?.isFlashback) ||
      Boolean(scene.photos[this.targetPhotoLayerIndex]?.sepia);

    // Deep cinematic black background underneath high-res story illustrations
    ctx.fillStyle = '#040204';
    ctx.fillRect(0, 0, w, h);

    // Render high-resolution keyframe artwork with smooth Ken Burns motion & crossfade
    this.drawPerBeatShotAndOverlays(
      ctx,
      scene,
      this.beatElapsedSec,
      w,
      h,
      elapsedSec,
      isSepiaFlashback,
    );

    // Clean atmospheric vignette, flashback transition, and lightning illumination
    this.drawAtmosphericOverlay(ctx, w, h, elapsedSec);
  }

  private getMoodTintForSceneId(sceneId: ProceduralSceneId): string | null {
    switch (sceneId) {
      case 'highway_headlights_fog':
      case 'dashboard_gps_lost':
      case 'empty_road_skidmarks':
      case 'haveli_iron_gate_storm':
      case 'haveli_nameplate_rain':
        return 'rgba(12, 26, 48, 0.16)';
      case 'road_bride_headlights':
      case 'haveli_blood_lightning':
      case 'blood_wall_writing':
      case 'dagger_vault_blood':
      case 'rukmini_climax_stalk':
        return 'rgba(110, 12, 22, 0.18)';
      case 'poison_milk_swirl':
      case 'spilled_milk_floor':
        return 'rgba(12, 74, 48, 0.16)';
      case 'tantrik_blue_havan_fire':
      case 'well_purifying_fire':
        return 'rgba(18, 36, 92, 0.16)';
      default:
        return null;
    }
  }

  private renderPhotographicSceneLighting(
    ctx: CanvasRenderingContext2D,
    sceneId: ProceduralSceneId,
    w: number,
    h: number,
    t: number,
  ) {
    // Soft radial/linear lighting & storm mist overlays only — zero cartoon primitives
    if (sceneId === 'dashboard_gps_lost') {
      const sheenShift = Math.sin(t * 0.55) * w * 0.04;
      const glassSheen = ctx.createLinearGradient(
        w * 0.15 + sheenShift,
        0,
        w * 0.78 + sheenShift,
        h * 0.95,
      );
      glassSheen.addColorStop(0, 'rgba(195, 225, 255, 0)');
      glassSheen.addColorStop(0.45, 'rgba(180, 220, 255, 0.09)');
      glassSheen.addColorStop(0.55, 'rgba(225, 240, 255, 0.14)');
      glassSheen.addColorStop(0.68, 'rgba(165, 210, 255, 0.04)');
      glassSheen.addColorStop(1, 'rgba(165, 210, 255, 0)');
      ctx.fillStyle = glassSheen;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    if (sceneId === 'empty_road_skidmarks') {
      // Heavy billowing midnight storm mist across lower center so cropped forest road feels empty
      const drift1 = Math.sin(t * 0.42) * w * 0.07;
      const drift2 = Math.cos(t * 0.31) * w * 0.08;
      const plumes: Array<[number, number, number, number]> = [
        [w * 0.5 + drift1, h * 0.78, Math.max(w, h) * 0.46, 0.78],
        [w * 0.28 - drift2, h * 0.84, Math.max(w, h) * 0.42, 0.66],
        [w * 0.72 + drift2, h * 0.82, Math.max(w, h) * 0.44, 0.68],
      ];
      for (const [mx, my, mr, alpha] of plumes) {
        const fog = ctx.createRadialGradient(mx, my, mr * 0.06, mx, my, mr);
        fog.addColorStop(0, `rgba(148, 168, 192, ${alpha.toFixed(2)})`);
        fog.addColorStop(0.5, `rgba(74, 92, 114, ${(alpha * 0.62).toFixed(2)})`);
        fog.addColorStop(1, 'rgba(16, 24, 36, 0)');
        ctx.fillStyle = fog;
        ctx.fillRect(0, 0, w, h);
      }
      return;
    }

    if (sceneId === 'suv_engine_smoke') {
      // Rising radiator steam wisps over the SUV hood (bottom-left) + deep shadow on right
      for (let i = 0; i < 3; i++) {
        const phase = ((t * 0.26 + i * 0.33) % 1);
        const sx = w * (0.34 + Math.sin(t * 0.9 + i * 2.1) * 0.04);
        const sy = h * (0.76 - phase * 0.34);
        const sr = Math.max(w, h) * (0.14 + phase * 0.16);
        const sa = Math.sin(phase * Math.PI) * 0.38;
        const steam = ctx.createRadialGradient(sx, sy, sr * 0.08, sx, sy, sr);
        steam.addColorStop(0, `rgba(215, 228, 240, ${sa.toFixed(3)})`);
        steam.addColorStop(0.55, `rgba(165, 185, 206, ${(sa * 0.45).toFixed(3)})`);
        steam.addColorStop(1, 'rgba(120, 140, 165, 0)');
        ctx.fillStyle = steam;
        ctx.fillRect(0, 0, w, h);
      }
      const rightShadow = ctx.createLinearGradient(w * 0.55, 0, w, 0);
      rightShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
      rightShadow.addColorStop(1, 'rgba(2, 4, 10, 0.72)');
      ctx.fillStyle = rightShadow;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    if (sceneId === 'haveli_iron_gate_storm' || sceneId === 'haveli_nameplate_rain') {
      const darkLowerRight = ctx.createRadialGradient(
        w * 0.78,
        h * 0.85,
        Math.min(w, h) * 0.08,
        w * 0.78,
        h * 0.85,
        Math.max(w, h) * 0.52,
      );
      darkLowerRight.addColorStop(0, 'rgba(2, 3, 8, 0.84)');
      darkLowerRight.addColorStop(1, 'rgba(2, 3, 8, 0)');
      ctx.fillStyle = darkLowerRight;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    if (sceneId === 'watchman_gate_pan_reveal') {
      const pulse = 0.24 + Math.sin(t * 5.2) * 0.07;
      const lanternAura = ctx.createRadialGradient(
        w * 0.58,
        h * 0.56,
        12,
        w * 0.58,
        h * 0.56,
        Math.max(w, h) * 0.42,
      );
      lanternAura.addColorStop(0, `rgba(255, 212, 102, ${pulse.toFixed(3)})`);
      lanternAura.addColorStop(0.45, `rgba(235, 145, 42, ${(pulse * 0.48).toFixed(3)})`);
      lanternAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lanternAura;
      ctx.fillRect(0, 0, w, h);
    }
  }

  private renderCompositeVisualLayer(
    ctx: CanvasRenderingContext2D,
    visual: MatchedStoryVisual,
    w: number,
    h: number,
    t: number,
    alpha: number,
    beatProg: number,
    shakeX: number,
    shakeY: number,
    tiltAngle: number,
    isSepiaFallback: boolean,
  ) {
    if (alpha <= 0.005) return;
    const useSepia = visual.isFlashback || isSepiaFallback;

    const customImg = this.customPhotoOverrides.get(visual.photoId);
    const localImg = visual.artId ? this.preloadedKeyframes.get(visual.artId) : undefined;
    const fallbackImg = this.preloadedKeyframes.get('art-scene-1');
    const activeImg =
      customImg && customImg.complete && customImg.naturalWidth > 0
        ? customImg
        : localImg && localImg.complete && localImg.naturalWidth > 0
          ? localImg
          : fallbackImg && fallbackImg.complete && fallbackImg.naturalWidth > 0
            ? fallbackImg
            : undefined;

    const cam = visual.cam;
    const currentZoom = Math.max(
      1.01,
      cam.z0 + (cam.z1 - cam.z0) * beatProg + Math.sin(t * 0.65) * 0.012,
    );
    let offsetX =
      (0.5 - cam.fx) * w * (currentZoom - 1) +
      cam.panX * w * beatProg +
      Math.sin(t * 0.48) * w * 0.006;
    let offsetY =
      (0.5 - cam.fy) * h * (currentZoom - 1) +
      cam.panY * h * beatProg +
      Math.cos(t * 0.42) * h * 0.005;

    if (activeImg) {
      const imgRatio = activeImg.width / Math.max(1, activeImg.height);
      const canvasRatio = w / h;
      const drawW = imgRatio > canvasRatio ? h * imgRatio : w;
      const drawH = imgRatio > canvasRatio ? h : w / imgRatio;
      const maxOffX = Math.max(0, (drawW * currentZoom - w) * 0.5 - Math.abs(shakeX) - 2);
      const maxOffY = Math.max(0, (drawH * currentZoom - h) * 0.5 - Math.abs(shakeY) - 2);
      offsetX = Math.max(-maxOffX, Math.min(maxOffX, offsetX));
      offsetY = Math.max(-maxOffY, Math.min(maxOffY, offsetY));
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    if (useSepia) {
      ctx.filter = 'sepia(0.52) contrast(1.06) brightness(0.92)';
    }
    ctx.translate(w / 2 + offsetX + shakeX, h / 2 + offsetY + shakeY);
    if (tiltAngle !== 0) ctx.rotate(tiltAngle);
    ctx.scale(currentZoom, currentZoom);
    ctx.translate(-w / 2, -h / 2);

    if (activeImg) {
      this.drawCoverImage(ctx, activeImg, w, h);
    }

    const moodTint = this.getMoodTintForSceneId(visual.proceduralSceneId);
    if (moodTint) {
      ctx.fillStyle = moodTint;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();

    // Screen-space photographic lighting / mist / reflection overlays matched to the active layer
    ctx.save();
    ctx.globalAlpha = alpha;
    this.renderPhotographicSceneLighting(ctx, visual.proceduralSceneId, w, h, t);
    ctx.restore();
  }

  private drawPerBeatShotAndOverlays(
    ctx: CanvasRenderingContext2D,
    _scene: VNSceneSpec,
    beatElapsed: number,
    w: number,
    h: number,
    t: number,
    isSepiaFlashback = false,
  ) {
    const beatIdx = this.currentLineIndex;
    const beatProg = 1 - Math.exp(-beatElapsed * 0.22);

    const shot = this.getShotForBeat(this.currentSceneIndex, beatIdx);
    const currentVisual = this.currentMatchedVisual;
    const prevVisual = this.prevMatchedVisual;

    const fadeDuration = 0.75;
    const hasPrevVisual = Boolean(
      prevVisual &&
        currentVisual &&
        (prevVisual.artId !== currentVisual.artId ||
          prevVisual.proceduralSceneId !== currentVisual.proceduralSceneId ||
          prevVisual.actionKey !== currentVisual.actionKey),
    );
    const crossfadeT =
      hasPrevVisual && this.visualCrossfadeElapsed < fadeDuration
        ? 0.5 - 0.5 * Math.cos((this.visualCrossfadeElapsed / fadeDuration) * Math.PI)
        : 1.0;

    const isShake =
      this.jumpScareFlashSec > 0 ||
      shot.beatOverlay === 'red_bride_headlights' ||
      shot.beatOverlay === 'gate_slam_sparks';
    const shakeX = isShake
      ? (Math.random() - 0.5) * (this.jumpScareFlashSec > 0 ? 22 : 4.5)
      : 0;
    const shakeY = isShake
      ? (Math.random() - 0.5) * (this.jumpScareFlashSec > 0 ? 22 : 4.5)
      : 0;

    const tiltAngle =
      shot.beatOverlay === 'poison_dizzy_wave' ? Math.sin(t * 3.6) * 0.045 : 0;

    if (hasPrevVisual && prevVisual && crossfadeT < 1.0) {
      this.renderCompositeVisualLayer(
        ctx,
        prevVisual,
        w,
        h,
        t,
        1.0 - crossfadeT,
        1.0,
        shakeX,
        shakeY,
        0,
        isSepiaFlashback,
      );
    }

    if (currentVisual) {
      this.renderCompositeVisualLayer(
        ctx,
        currentVisual,
        w,
        h,
        t,
        crossfadeT,
        beatProg,
        shakeX,
        shakeY,
        tiltAngle,
        isSepiaFlashback,
      );
    }

    const ov = shot.beatOverlay;
    if (ov === 'poison_dizzy_wave') {
      const pulse = 0.18 + Math.sin(t * 4.5) * 0.08;
      const poisonVig = ctx.createRadialGradient(
        w * 0.5,
        h * 0.5,
        Math.min(w, h) * 0.28,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.74,
      );
      poisonVig.addColorStop(0, 'rgba(0, 0, 0, 0)');
      poisonVig.addColorStop(1, `rgba(127, 29, 29, ${Math.min(0.55, pulse * 1.4).toFixed(3)})`);
      ctx.fillStyle = poisonVig;
      ctx.fillRect(0, 0, w, h);
    } else if (ov === 'sonar_eyes_pulse' || ov === 'climax_jumpscare') {
      const pulse = 0.2 + Math.sin(t * 5.0) * 0.1;
      const redEdge = ctx.createRadialGradient(
        w * 0.5,
        h * 0.5,
        Math.min(w, h) * 0.3,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.75,
      );
      redEdge.addColorStop(0, 'rgba(0, 0, 0, 0)');
      redEdge.addColorStop(1, `rgba(185, 28, 28, ${pulse.toFixed(3)})`);
      ctx.fillStyle = redEdge;
      ctx.fillRect(0, 0, w, h);
    }
  }

  private drawCoverImage(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    w: number,
    h: number,
  ) {
    const imgRatio = img.width / Math.max(1, img.height);
    const canvasRatio = w / h;
    let drawW = w;
    let drawH = h;
    if (imgRatio > canvasRatio) {
      drawH = h;
      drawW = h * imgRatio;
    } else {
      drawW = w;
      drawH = w / imgRatio;
    }
    ctx.drawImage(img, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
  }

  private drawAtmosphericOverlay(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    _t: number,
  ) {
    if (this.flashbackTransitionAlpha > 0.01) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 224, 165, ${(this.flashbackTransitionAlpha * 0.45).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (this.shotCutTransitionAlpha > 0.01) {
      ctx.save();
      ctx.fillStyle = `rgba(15, 3, 6, ${this.shotCutTransitionAlpha.toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (this.currentLightningCanvasAlpha > 0.005) {
      ctx.save();
      ctx.fillStyle = `rgba(215, 235, 255, ${this.currentLightningCanvasAlpha.toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (this.jumpScareFlashSec > 0) {
      const scareImg = this.preloadedKeyframes.get('art-scene-5');
      if (scareImg && scareImg.complete && scareImg.naturalWidth > 0) {
        ctx.save();
        ctx.translate(
          w / 2 + (Math.random() - 0.5) * 28,
          h * 0.33 + (Math.random() - 0.5) * 28,
        );
        ctx.scale(2.15, 2.15);
        this.drawCoverImage(ctx, scareImg, w, h);
        ctx.restore();
      }
      ctx.fillStyle = 'rgba(185, 28, 28, 0.34)';
      ctx.fillRect(0, 0, w, h);
    }

    const vig = ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.28,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.72,
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.74)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }
}
