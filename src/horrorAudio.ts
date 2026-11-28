import * as THREE from 'three';
import { VNSoundCue, VNSpeakerVoice } from './storyData.ts';
import type { StormRainAcousticSample } from './stormWeather.ts';

/**
 * Audio & Hindi SpeechSynthesis controller for The Rakt Pishachini: Rukmini Ka Shrap.
 * All procedural Web Audio oscillators (createOscillator) and noise/procedural AudioBuffers
 * (createBuffer) have been completely removed so there is zero humming, buzzing, static,
 * or beeping on the Main Menu, Intro Story, or anywhere else.
 */
let globalAudioCtx: AudioContext | null = null;

export function getGlobalAudioContext(): AudioContext | null {
  return globalAudioCtx;
}

export interface NativeRaktVoiceBridge {
  speak: (text: string, rate: number, pitch: number) => void;
  stop: () => void;
}

export function getNativeRaktVoiceBridge(): NativeRaktVoiceBridge | null {
  if (typeof window === 'undefined') return null;
  const bridge = (
    window as unknown as { RaktVoiceBridge?: NativeRaktVoiceBridge }
  ).RaktVoiceBridge;
  if (bridge && typeof bridge.speak === 'function') {
    return bridge;
  }
  return null;
}

export function stopNativeRaktVoiceBridge(): void {
  const bridge = getNativeRaktVoiceBridge();
  if (bridge && typeof bridge.stop === 'function') {
    try {
      bridge.stop();
    } catch {
      // Ignore native voice bridge stop errors
    }
  }
}

export function getNativeVoiceDurationMs(text: string): number {
  return Math.max(2000, text.length * 78);
}

/**
 * Transliterates Devanagari text into phonetic Roman Hindi so that if a browser
 * does not have a 'hi-IN' voice loaded and falls back to its default English/Latin voice,
 * SpeechSynthesis still pronounces every word audibly instead of skipping Devanagari script silently.
 */
export function devanagariToRomanHindi(input: string): string {
  const consonants: Record<string, string> = {
    क: 'k', ख: 'kh', ग: 'g', घ: 'gh', ङ: 'n',
    च: 'ch', छ: 'chh', ज: 'j', झ: 'jh', ञ: 'n',
    ट: 't', ठ: 'th', ड: 'd', ढ: 'dh', ण: 'n',
    त: 't', थ: 'th', द: 'd', ध: 'dh', न: 'n',
    प: 'p', फ: 'ph', ब: 'b', भ: 'bh', म: 'm',
    य: 'y', र: 'r', ल: 'l', व: 'v',
    श: 'sh', ष: 'sh', स: 's', ह: 'h',
    क्ष: 'ksh', त्र: 'tr', ज्ञ: 'gya',
    ड़: 'r', ढ़: 'rh', क़: 'q', ख़: 'kh', ग़: 'gh', ज़: 'z', फ़: 'f',
  };
  const vowels: Record<string, string> = {
    अ: 'a', आ: 'aa', इ: 'i', ई: 'ee', उ: 'u', ऊ: 'oo',
    ऋ: 'ri', ए: 'e', ऐ: 'ai', ओ: 'o', औ: 'au', अं: 'an', अः: 'ah',
  };
  const matras: Record<string, string> = {
    'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
    'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
    'ं': 'n', 'ँ': 'n', 'ः': 'h',
  };

  let out = '';
  const chars = Array.from(input);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1] || '';

    if (ch === '।') {
      out += '. ';
      continue;
    }
    if (ch === '्' || ch === '़') {
      continue;
    }

    if (next === '़' && consonants[ch + next]) {
      const base = consonants[ch + next];
      const afterNukta = chars[i + 2] || '';
      i++;
      if (afterNukta === '्') {
        out += base;
        i++;
      } else if (matras[afterNukta]) {
        out += base + matras[afterNukta];
        i++;
      } else {
        out += base + 'a';
      }
      continue;
    }

    if (consonants[ch]) {
      const base = consonants[ch];
      if (next === '्') {
        out += base;
        i++;
      } else if (matras[next]) {
        out += base + matras[next];
        i++;
      } else {
        const isWordEnd = !next || /[\s.,!?;:—\-()"']/u.test(next);
        out += isWordEnd ? base : base + 'a';
      }
    } else if (vowels[ch]) {
      out += vowels[ch];
    } else if (matras[ch]) {
      out += matras[ch];
    } else {
      out += ch;
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

export type CanonicalCharacterVoiceId =
  | 'watchman'
  | 'rahul'
  | 'kabir'
  | 'dev'
  | 'riya'
  | 'narrator'
  | 'rukmini'
  | 'tantrik'
  | 'thakur'
  | 'husband';

export interface CharacterVoiceProfile {
  id: CanonicalCharacterVoiceId;
  gender: 'male' | 'female';
  pitch: number;
  rate: number;
  voiceSlot: number;
  ghostlyTail?: boolean;
}

/**
 * Distinct, non-overlapping voice profiles for every character in the intro story
 * and in-game dialogues (no two characters share the same pitch & rate).
 */
export const CHARACTER_VOICE_PROFILES: Record<
  CanonicalCharacterVoiceId,
  CharacterVoiceProfile
> = {
  watchman: { id: 'watchman', gender: 'male', pitch: 0.52, rate: 0.8, voiceSlot: 0 },
  rahul: { id: 'rahul', gender: 'male', pitch: 0.76, rate: 0.96, voiceSlot: 1 },
  kabir: { id: 'kabir', gender: 'male', pitch: 0.88, rate: 1.02, voiceSlot: 2 },
  dev: { id: 'dev', gender: 'male', pitch: 0.66, rate: 0.9, voiceSlot: 3 },
  riya: { id: 'riya', gender: 'female', pitch: 1.15, rate: 1.0, voiceSlot: 0 },
  narrator: { id: 'narrator', gender: 'male', pitch: 0.72, rate: 0.9, voiceSlot: 4 },
  rukmini: {
    id: 'rukmini',
    gender: 'female',
    pitch: 0.56,
    rate: 0.76,
    voiceSlot: 1,
    ghostlyTail: true,
  },
  // Supporting 1992 flashback characters (pure hi-IN native Hindi, unique non-overlapping settings)
  tantrik: { id: 'tantrik', gender: 'male', pitch: 0.58, rate: 0.82, voiceSlot: 5 },
  thakur: { id: 'thakur', gender: 'male', pitch: 0.62, rate: 0.86, voiceSlot: 6 },
  husband: { id: 'husband', gender: 'male', pitch: 0.82, rate: 0.94, voiceSlot: 7 },
};

/**
 * Automatically resolves a speaker label, dialogue prefix, or voice hint to a
 * canonical character voice profile ID.
 */
export function resolveSpeakerProfileId(
  voiceHint?: VNSpeakerVoice | string,
  speakerName?: string,
  rawText?: string,
): CanonicalCharacterVoiceId {
  // Extract optional leading "Speaker:" prefix from rawText without scanning the dialogue body
  let textPrefix = '';
  if (rawText) {
    const match = rawText.trim().match(/^\[?([^:\[\]]{1,48})\]?:\s*/u);
    if (match) {
      textPrefix = match[1];
    }
  }

  const detectFromLabel = (label: string): CanonicalCharacterVoiceId | null => {
    const s = label.trim().toLowerCase();
    if (!s) return null;

    // Witch Rukmini (चुड़ैल / रक्त पिशाचिनी / रुक्मिणी)
    if (
      /(rukmini|रुक्मिणी|chudail|chudel|चुड़ैल|witch|pishachini|पिशाचिनी|rakt\s*pishachini|रक्त\s*पिशाचिनी|bhoot|भूतनी)/u.test(
        s,
      )
    ) {
      return 'rukmini';
    }
    // Watchman Baba (बूढ़ा चौकीदार / चौकीदार बाबा / Guard)
    if (
      /(watchman|chowkidar|chaukidar|चौकीदार|baba|बाबा|guard|बूढ़ा)/u.test(s)
    ) {
      return 'watchman';
    }
    // Girl (रिया / नेहा)
    if (/(riya|रिया|neha|नेहा|\bgirl\b)/u.test(s)) {
      return 'riya';
    }
    // Boy 3 (देव)
    if (/(\bdev\b|देव|boy\s*3)/u.test(s)) {
      return 'dev';
    }
    // Boy 2 (कबीर / अमन)
    if (/(kabir|कबीर|aman|अमन|boy\s*2)/u.test(s)) {
      return 'kabir';
    }
    // Boy 1 (आरव / राहुल)
    if (/(aarav|आरव|rahul|राहुल|boy\s*1)/u.test(s)) {
      return 'rahul';
    }
    // 1992 Flashback supporting roles
    if (/(tantrik|तांत्रिक)/u.test(s)) {
      return 'tantrik';
    }
    if (/(thakur|ठाकुर|zamindar|ज़मींदार)/u.test(s)) {
      return 'thakur';
    }
    if (/(husband|पति|dulha|दूल्हा)/u.test(s)) {
      return 'husband';
    }
    // Narrator (सूत्रधार)
    if (/(narrator|सूत्रधार|storyteller)/u.test(s)) {
      return 'narrator';
    }
    return null;
  };

  // Priority: explicit speaker name -> text "Speaker:" prefix -> explicit voiceHint -> narrator
  if (speakerName) {
    const fromSpeaker = detectFromLabel(speakerName);
    if (fromSpeaker) return fromSpeaker;
  }
  if (textPrefix) {
    const fromPrefix = detectFromLabel(textPrefix);
    if (fromPrefix) return fromPrefix;
  }
  if (voiceHint) {
    const fromHint = detectFromLabel(String(voiceHint));
    if (fromHint) return fromHint;
  }
  return 'narrator';
}

export class HorrorSynth {
  public muted = false;
  public muteAll = false;
  public masterVolume = 1.0;
  public musicVolume = 0.85;
  public sfxVolume = 1.0;
  public dialogueVolume = 1.0;
  public characterVoicesEnabled = true;
  public jumpscareIntensity = 0.8;
  public gameplayAudioEnabled = false;
  private uiTapWavUrl: string | null = null;
  private uiTapPool: HTMLAudioElement[] = [];
  private uiTapCursor = 0;
  private thunderBoomWavUrl: string | null = null;
  private thunderPool: HTMLAudioElement[] = [];
  private thunderCursor = 0;
  private softRainWavUrl: string | null = null;
  private softRainAudio: HTMLAudioElement | null = null;
  private rainSourceNode: MediaElementAudioSourceNode | null = null;
  private rainFilterNode: BiquadFilterNode | null = null;
  private rainPannerNode: StereoPannerNode | null = null;
  private rainGainNode: GainNode | null = null;
  private rainSpatialGraphFailed = false;
  private lastRainOutdoorFactor = 0;
  private lastRainIndoorMuffle = 0;
  private lastRainPan = 0;
  private lastRainFacingClarity = 1.0;
  private lastRainWindGust = 0.5;
  private lastRainStormFade = 1.0;
  private smoothedRainGain = 0;
  private stormRainActive = false;

  private cachedHindiVoices: SpeechSynthesisVoice[] = [];
  private cachedMaleHindiVoices: SpeechSynthesisVoice[] = [];
  private cachedFemaleHindiVoices: SpeechSynthesisVoice[] = [];
  private rukminiWhisperTailWavUrl: string | null = null;
  private rukminiWhisperAudio: HTMLAudioElement | null = null;
  private speechCancelVersion = 0;

  constructor() {
    this.initVoicePoolListener();
  }

  private initVoicePoolListener() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const refresh = () => {
      try {
        this.refreshCategorizedVoices();
      } catch {
        // Ignore browser voice enumeration errors
      }
    };
    refresh();
    try {
      window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
    } catch {
      // Fallback for older browsers
      window.speechSynthesis.onvoiceschanged = refresh;
    }
  }

  private refreshCategorizedVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    const voices = window.speechSynthesis.getVoices() || [];
    if (voices.length === 0) return;

    // STRICTLY filter to native Indian Hindi (hi / hi-IN) voices ONLY.
    // Blocks all en-US, en-GB, en-IN, David, Zira, Mark, Rishi, and any foreign/English voices.
    const pureHindiVoices = voices.filter((v) =>
      v.lang.toLowerCase().startsWith('hi'),
    );

    const isNativeHindiMale = (v: SpeechSynthesisVoice) =>
      /\b(madhur|hemant|male|man|boy|deepak|arjun|vikram|ravi)\b/i.test(v.name);

    const isNativeHindiFemale = (v: SpeechSynthesisVoice) =>
      /google\s*हिन्दी|google\s*hindi|\b(swara|kalpana|lekha|female|woman|girl|priya|aditi)\b/i.test(
        v.name,
      );

    // Prioritize higher-quality neural/natural Hindi voices (Madhur / Swara / Google हिन्दी / Hemant / Kalpana)
    const qualityRank = (v: SpeechSynthesisVoice): number => {
      const n = v.name.toLowerCase();
      if (n.includes('madhur') || n.includes('swara')) return 0;
      if (n.includes('google') && (n.includes('हिन्दी') || n.includes('hindi')))
        return 1;
      if (n.includes('hemant') || n.includes('kalpana')) return 2;
      if (v.lang.toLowerCase() === 'hi-in') return 3;
      return 4;
    };

    const sortedHindi = [...pureHindiVoices].sort(
      (a, b) => qualityRank(a) - qualityRank(b),
    );

    this.cachedHindiVoices = sortedHindi;
    this.cachedMaleHindiVoices = sortedHindi.filter(
      (v) => isNativeHindiMale(v) && !isNativeHindiFemale(v),
    );
    this.cachedFemaleHindiVoices = sortedHindi.filter((v) =>
      isNativeHindiFemale(v),
    );
  }

  public setGameplayAudioEnabled(enabled: boolean) {
    this.gameplayAudioEnabled = enabled;
    if (!enabled) {
      this.stopProximityCuePools();
      this.stopStormRainAudio();
    }
  }

  public setJumpscareIntensity(percent: number) {
    const clamped = Math.max(0, Math.min(100, percent));
    this.jumpscareIntensity = clamped / 100;
  }

  public setStorySfxMode(_enabled: boolean) {
    // No procedural Web Audio beds run during the story
  }

  public setStorySfxPaused(_paused: boolean) {
    // No procedural Web Audio beds run during the story
  }

  public setMasterVolume(volumePercent: number) {
    const clamped = Math.max(0, Math.min(100, volumePercent));
    this.masterVolume = clamped / 100;
    this.muted = this.muteAll || clamped === 0;
    this.syncStormRainVolume();
  }

  public setMuteAll(muted: boolean) {
    this.muteAll = muted;
    this.muted = muted || this.masterVolume <= 0;
    if (muted) {
      this.stopSequenceSpeech();
      this.stopStormRainAudio();
      for (const el of this.thunderPool) {
        try {
          el.pause();
          el.currentTime = 0;
        } catch {
          // Ignore
        }
      }
    } else {
      this.syncStormRainVolume();
    }
  }

  public setMusicVolume(volumePercent: number) {
    const clamped = Math.max(0, Math.min(100, volumePercent));
    this.musicVolume = clamped / 100;
    this.syncStormRainVolume();
  }

  public setSfxVolume(volumePercent: number) {
    const clamped = Math.max(0, Math.min(100, volumePercent));
    this.sfxVolume = clamped / 100;
  }

  public setDialogueVolume(volumePercent: number) {
    const clamped = Math.max(0, Math.min(100, volumePercent));
    this.dialogueVolume = clamped / 100;
  }

  public setCharacterVoicesEnabled(enabled: boolean) {
    this.characterVoicesEnabled = enabled;
    if (!enabled) {
      this.stopSequenceSpeech();
    }
  }

  private get effectiveSfxVolume(): number {
    return this.muted ? 0 : this.masterVolume * this.sfxVolume;
  }

  private get effectiveMusicVolume(): number {
    return this.muted ? 0 : this.masterVolume * this.musicVolume;
  }

  private get effectiveDialogueVolume(): number {
    return this.muted ? 0 : this.masterVolume * this.dialogueVolume;
  }

  private uiClickNoiseBuffer: AudioBuffer | null = null;
  private activeBridgeCancelCallbacks = new Set<() => void>();

  private ensureUiAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!globalAudioCtx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      globalAudioCtx = new AudioCtx();
    }
    if (globalAudioCtx.state === 'suspended') {
      void globalAudioCtx.resume().catch(() => {});
    }
    return globalAudioCtx;
  }

  /**
   * Clean, subtle 35ms one-shot filtered percussive UI click via Web Audio API
   * (zero continuous oscillators or drones; strictly respects Settings SFX & Mute All).
   */
  public playUiTapSound() {
    const gainLevel = this.effectiveSfxVolume;
    if (gainLevel <= 0.005 || typeof window === 'undefined') return;
    try {
      const ctx = this.ensureUiAudioContext();
      if (!ctx) return;

      const durationSec = 0.035;
      if (
        !this.uiClickNoiseBuffer ||
        this.uiClickNoiseBuffer.sampleRate !== ctx.sampleRate
      ) {
        const sr = ctx.sampleRate;
        const length = Math.max(1, Math.floor(sr * durationSec));
        const buffer = ctx.createBuffer(1, length, sr);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) {
          const t = i / sr;
          const env = Math.exp(-t * 135);
          // Crisp micro-percussive transient (wood/slate tap + short filtered click burst)
          const transient =
            Math.sin(2 * Math.PI * 1380 * t) * 0.52 +
            Math.sin(2 * Math.PI * 2760 * t) * 0.24 +
            (Math.random() * 2 - 1) * 0.32 * Math.exp(-t * 280);
          data[i] = transient * env;
        }
        this.uiClickNoiseBuffer = buffer;
      }

      const now = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = this.uiClickNoiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1480, now);
      filter.Q.setValueAtTime(1.35, now);

      const amp = ctx.createGain();
      const peakGain = Math.max(0.015, Math.min(0.26, gainLevel * 0.22));
      amp.gain.setValueAtTime(peakGain, now);
      amp.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      src.connect(filter);
      filter.connect(amp);
      amp.connect(ctx.destination);

      src.onended = () => {
        try {
          src.disconnect();
          filter.disconnect();
          amp.disconnect();
        } catch {
          // Ignore disconnect errors
        }
      };
      src.start(now);
      src.stop(now + durationSec + 0.004);
    } catch {
      // Ignore Web Audio autoplay or device errors
    }
  }

  public unlockAudio(): AudioContext | null {
    if (this.masterVolume <= 0) {
      this.masterVolume = 1.0;
    }
    this.muted = this.muteAll;
    return globalAudioCtx;
  }

  public createPayalPositionalAudio(
    listener: THREE.AudioListener,
  ): THREE.PositionalAudio {
    const positionalAudio = new THREE.PositionalAudio(listener);
    positionalAudio.setRefDistance(2.2);
    positionalAudio.setMaxDistance(28.0);
    positionalAudio.setRolloffFactor(1.65);
    positionalAudio.setDistanceModel('exponential');
    positionalAudio.setDirectionalCone(180, 290, 0.45);
    positionalAudio.setVolume(0.95);
    return positionalAudio;
  }

  private payalStepWavUrls: Array<string | null> | null = null;
  private payalAudioPool: HTMLAudioElement[] = [];
  private payalPoolCursor = 0;
  private payalStepWebBuffers: AudioBuffer[] | null = null;
  private witchFootstepWebBuffers: AudioBuffer[] | null = null;
  private witchWhisperWebBuffers: AudioBuffer[] | null = null;
  private witchShriekWebBuffer: AudioBuffer | null = null;
  private witchBufferSampleRate = 0;

  private heartbeatCalmWavUrl: string | null = null;
  private heartbeatUrgentWavUrl: string | null = null;
  private heartbeatAudioPool: HTMLAudioElement[] = [];
  private heartbeatPoolCursor = 0;

  private stopProximityCuePools() {
    for (const el of this.payalAudioPool) {
      try {
        el.pause();
        el.currentTime = 0;
      } catch {
        // Ignore
      }
    }
    for (const el of this.heartbeatAudioPool) {
      try {
        el.pause();
        el.currentTime = 0;
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Pre-bakes 3 subtle silver anklet (Payal / ghungroo) footstep jingle bursts as short,
   * crisp decaying metallic bell partials (0.28s each) — ZERO continuous oscillators, ZERO white noise.
   */
  private ensurePayalStepWavs(): Array<string | null> {
    if (this.payalStepWavUrls) {
      return this.payalStepWavUrls;
    }

    const sr = 24000;
    const duration = 0.28;
    const total = Math.floor(sr * duration);

    // Three organic ghungroo-bell micro-clusters (left foot, right foot, brisk alternate)
    const variants: Array<
      Array<{ onset: number; f0: number; decay: number; amp: number }>
    > = [
      [
        { onset: 0.0, f0: 3240, decay: 27, amp: 0.34 },
        { onset: 0.011, f0: 3710, decay: 31, amp: 0.30 },
        { onset: 0.024, f0: 4290, decay: 35, amp: 0.25 },
        { onset: 0.041, f0: 4860, decay: 39, amp: 0.21 },
        { onset: 0.064, f0: 3540, decay: 28, amp: 0.18 },
      ],
      [
        { onset: 0.0, f0: 3390, decay: 29, amp: 0.33 },
        { onset: 0.013, f0: 3920, decay: 33, amp: 0.29 },
        { onset: 0.027, f0: 4510, decay: 36, amp: 0.24 },
        { onset: 0.046, f0: 5120, decay: 41, amp: 0.19 },
        { onset: 0.071, f0: 3680, decay: 30, amp: 0.17 },
      ],
      [
        { onset: 0.0, f0: 3140, decay: 26, amp: 0.32 },
        { onset: 0.009, f0: 3610, decay: 30, amp: 0.31 },
        { onset: 0.021, f0: 4180, decay: 34, amp: 0.25 },
        { onset: 0.036, f0: 4720, decay: 38, amp: 0.22 },
        { onset: 0.058, f0: 3960, decay: 32, amp: 0.19 },
      ],
    ];

    this.payalStepWavUrls = variants.map((bells) => {
      const pcm = new Float32Array(total);
      for (let i = 0; i < total; i++) {
        const t = i / sr;
        let sample = 0;

        for (let b = 0; b < bells.length; b++) {
          const bell = bells[b];
          const bt = t - bell.onset;
          if (bt < 0) continue;

          // Crisp 1ms metallic clink attack + smooth exponential silver ring decay
          const attack = 1 - Math.exp(-bt * 950);
          const env1 = attack * Math.exp(-bt * bell.decay);
          const env2 = attack * Math.exp(-bt * (bell.decay * 1.65));
          const env3 = attack * Math.exp(-bt * (bell.decay * 2.35));

          // Inharmonic hollow silver ghungroo partials + gentle detuned twin-bell shimmer
          const f1 = bell.f0;
          const f1Detuned = bell.f0 + 23;
          const f2 = bell.f0 * 2.13;
          const f3 = bell.f0 * 2.89;

          let bellTone =
            (Math.sin(2 * Math.PI * f1 * bt) * 0.56 +
              Math.sin(2 * Math.PI * f1Detuned * bt) * 0.34) *
            env1;
          if (f2 < 11200) {
            bellTone += Math.sin(2 * Math.PI * f2 * bt) * 0.32 * env2;
          }
          if (f3 < 11400) {
            bellTone += Math.sin(2 * Math.PI * f3 * bt) * 0.16 * env3;
          }

          sample += bellTone * bell.amp;
        }

        // Smooth cosine end-taper over the final 28ms to guarantee zero click
        const tailStart = duration - 0.028;
        const endFade =
          t > tailStart
            ? 0.5 * (1 + Math.cos(((t - tailStart) / 0.028) * Math.PI))
            : 1.0;

        pcm[i] = Math.max(-0.92, Math.min(0.92, sample * 0.85 * endFade));
      }

      return this.buildPcmWavBlobUrl(pcm, sr);
    });

    return this.payalStepWavUrls;
  }

  /**
   * Pre-bakes two short soft low cardiac "lub-dub" thump WAV pulses (calm 0.36s, urgent 0.29s).
   * Pure smooth pitch-gliding low sine thumps — ZERO continuous oscillators, ZERO noise/static.
   */
  private ensureHeartbeatWav(urgent: boolean): string | null {
    if (urgent && this.heartbeatUrgentWavUrl) return this.heartbeatUrgentWavUrl;
    if (!urgent && this.heartbeatCalmWavUrl) return this.heartbeatCalmWavUrl;

    const sr = 22050;
    const duration = urgent ? 0.29 : 0.36;
    const dubStart = urgent ? 0.128 : 0.168;
    const total = Math.floor(sr * duration);
    const pcm = new Float32Array(total);

    for (let i = 0; i < total; i++) {
      const t = i / sr;
      let sample = 0;

      // Primary "lub" (S1): soft warm low thump 64 Hz -> 42 Hz with gentle 2nd-harmonic warmth
      if (t <= 0.145) {
        const attack = Math.sin(Math.min(1, t / 0.013) * (Math.PI / 2));
        const env = attack * Math.exp(-t * 23);
        // Integrated phase for smooth pitch drop f(t) = 42 + 22 * exp(-t * 26)
        const phase1 = 2 * Math.PI * (42 * t + (22 / 26) * (1 - Math.exp(-t * 26)));
        const phase1Harm =
          2 * Math.PI * (78 * t + (32 / 28) * (1 - Math.exp(-t * 28)));
        sample +=
          (Math.sin(phase1) * 0.78 + Math.sin(phase1Harm) * 0.24) * env * 0.92;
      }

      // Secondary "dub" (S2): slightly tighter, softer thump 76 Hz -> 49 Hz
      const dt2 = t - dubStart;
      if (dt2 >= 0 && dt2 <= 0.135) {
        const attack2 = Math.sin(Math.min(1, dt2 / 0.01) * (Math.PI / 2));
        const env2 = attack2 * Math.exp(-dt2 * 29);
        const phase2 =
          2 * Math.PI * (49 * dt2 + (27 / 32) * (1 - Math.exp(-dt2 * 32)));
        const phase2Harm =
          2 * Math.PI * (90 * dt2 + (36 / 34) * (1 - Math.exp(-dt2 * 34)));
        sample +=
          (Math.sin(phase2) * 0.74 + Math.sin(phase2Harm) * 0.22) * env2 * 0.64;
      }

      // Smooth fadeout over final 20ms so waveform terminates cleanly at 0
      const tailStart = duration - 0.02;
      const endFade =
        t > tailStart
          ? 0.5 * (1 + Math.cos(((t - tailStart) / 0.02) * Math.PI))
          : 1.0;

      pcm[i] = Math.max(-0.92, Math.min(0.92, sample * endFade));
    }

    const url = this.buildPcmWavBlobUrl(pcm, sr);
    if (urgent) {
      this.heartbeatUrgentWavUrl = url;
    } else {
      this.heartbeatCalmWavUrl = url;
    }
    return url;
  }

  private playPooledOneShot(
    pool: HTMLAudioElement[],
    poolSize: number,
    cursor: number,
    wavUrl: string,
    volume: number,
  ): number {
    if (typeof Audio === 'undefined' || !wavUrl) return cursor;
    try {
      let el = pool[cursor];
      if (!el) {
        el = new Audio(wavUrl);
        el.loop = false;
        el.preload = 'auto';
        pool[cursor] = el;
      } else if (el.src !== wavUrl) {
        el.src = wavUrl;
      }
      el.loop = false;
      el.volume = Math.max(0.01, Math.min(1.0, volume));
      el.currentTime = 0;
      void el.play().catch(() => {});
    } catch {
      // Ignore browser autoplay / audio playback errors
    }
    return (cursor + 1) % poolSize;
  }

  private ensureWitchDirectionalBuffers(ctx: AudioContext) {
    if (
      this.witchBufferSampleRate === ctx.sampleRate &&
      this.payalStepWebBuffers &&
      this.witchFootstepWebBuffers &&
      this.witchWhisperWebBuffers &&
      this.witchShriekWebBuffer
    ) {
      return;
    }

    const sr = ctx.sampleRate;
    this.witchBufferSampleRate = sr;

    // 1. Louder, metallic multi-bell silver Payal (anklet jingle) variants (0.34s each)
    const payalDur = 0.34;
    const payalLen = Math.max(1, Math.floor(sr * payalDur));
    const payalVariants: Array<
      Array<{ onset: number; f0: number; decay: number; amp: number }>
    > = [
      [
        { onset: 0.0, f0: 3240, decay: 22, amp: 0.44 },
        { onset: 0.009, f0: 3740, decay: 25, amp: 0.38 },
        { onset: 0.021, f0: 4320, decay: 29, amp: 0.33 },
        { onset: 0.036, f0: 4910, decay: 32, amp: 0.27 },
        { onset: 0.056, f0: 3580, decay: 24, amp: 0.25 },
        { onset: 0.082, f0: 4120, decay: 28, amp: 0.20 },
      ],
      [
        { onset: 0.0, f0: 3410, decay: 23, amp: 0.43 },
        { onset: 0.011, f0: 3960, decay: 26, amp: 0.37 },
        { onset: 0.025, f0: 4540, decay: 30, amp: 0.32 },
        { onset: 0.042, f0: 5180, decay: 34, amp: 0.25 },
        { onset: 0.064, f0: 3710, decay: 25, amp: 0.24 },
        { onset: 0.091, f0: 4290, decay: 29, amp: 0.19 },
      ],
      [
        { onset: 0.0, f0: 3120, decay: 21, amp: 0.43 },
        { onset: 0.008, f0: 3630, decay: 24, amp: 0.39 },
        { onset: 0.019, f0: 4190, decay: 28, amp: 0.33 },
        { onset: 0.034, f0: 4760, decay: 31, amp: 0.27 },
        { onset: 0.053, f0: 3990, decay: 26, amp: 0.24 },
        { onset: 0.078, f0: 3490, decay: 27, amp: 0.19 },
      ],
    ];

    this.payalStepWebBuffers = payalVariants.map((bells) => {
      const buf = ctx.createBuffer(1, payalLen, sr);
      const data = buf.getChannelData(0);
      for (let i = 0; i < payalLen; i++) {
        const t = i / sr;
        let s = 0;
        for (let b = 0; b < bells.length; b++) {
          const bell = bells[b];
          const bt = t - bell.onset;
          if (bt < 0) continue;
          const attack = 1 - Math.exp(-bt * 1100);
          const env1 = attack * Math.exp(-bt * bell.decay);
          const env2 = attack * Math.exp(-bt * (bell.decay * 1.55));
          const env3 = attack * Math.exp(-bt * (bell.decay * 2.2));
          const f1 = bell.f0;
          const f1b = bell.f0 + 27;
          const f2 = bell.f0 * 2.13;
          const f3 = bell.f0 * 2.87;
          let tone =
            (Math.sin(2 * Math.PI * f1 * bt) * 0.58 +
              Math.sin(2 * Math.PI * f1b * bt) * 0.36) *
            env1;
          if (f2 < sr * 0.46) {
            tone += Math.sin(2 * Math.PI * f2 * bt) * 0.34 * env2;
          }
          if (f3 < sr * 0.47) {
            tone += Math.sin(2 * Math.PI * f3 * bt) * 0.18 * env3;
          }
          s += tone * bell.amp;
        }
        const tailStart = payalDur - 0.03;
        const endFade =
          t > tailStart
            ? 0.5 * (1 + Math.cos(((t - tailStart) / 0.03) * Math.PI))
            : 1.0;
        data[i] = Math.max(-0.96, Math.min(0.96, s * 0.92 * endFade));
      }
      return buf;
    });

    // 2. Heavy ominous barefoot stone-floor thuds (0.22s each, 2 subtle pitch variants)
    const footDur = 0.22;
    const footLen = Math.max(1, Math.floor(sr * footDur));
    this.witchFootstepWebBuffers = [0, 1].map((variant) => {
      const buf = ctx.createBuffer(1, footLen, sr);
      const data = buf.getChannelData(0);
      const baseFreq = variant === 0 ? 68 : 61;
      let prevNoise = 0;
      for (let i = 0; i < footLen; i++) {
        const t = i / sr;
        const attack = Math.sin(Math.min(1, t / 0.009) * (Math.PI / 2));
        const bodyEnv = attack * Math.exp(-t * 21);
        const phase =
          2 *
          Math.PI *
          (baseFreq * t + (42 / 30) * (1 - Math.exp(-t * 30)));
        const subPhase =
          2 *
          Math.PI *
          ((baseFreq * 0.65) * t + (22 / 24) * (1 - Math.exp(-t * 24)));
        const rawNoise = Math.random() * 2 - 1;
        prevNoise = prevNoise * 0.82 + rawNoise * 0.18;
        const gritEnv = Math.exp(-t * 48);
        const s =
          (Math.sin(phase) * 0.72 + Math.sin(subPhase) * 0.44) * bodyEnv +
          prevNoise * 0.48 * gritEnv;
        const tailStart = footDur - 0.025;
        const endFade =
          t > tailStart
            ? 0.5 * (1 + Math.cos(((t - tailStart) / 0.025) * Math.PI))
            : 1.0;
        data[i] = Math.max(-0.96, Math.min(0.96, s * 0.95 * endFade));
      }
      return buf;
    });

    // 3. Eerie breathy spectral whispers (2 finite 1.35s one-shot buffers, zero continuous oscillators)
    const whisperDur = 1.35;
    const whisperLen = Math.max(1, Math.floor(sr * whisperDur));
    this.witchWhisperWebBuffers = [0, 1].map((variant) => {
      const buf = ctx.createBuffer(1, whisperLen, sr);
      const data = buf.getChannelData(0);
      let lp1 = 0;
      let lp2 = 0;
      let hp = 0;
      let lastIn = 0;
      for (let i = 0; i < whisperLen; i++) {
        const t = i / sr;
        // Two eerie breathy whisper syllables ("shhh... aaaah..." / "kahaan... hooo...")
        const syl1 =
          Math.exp(-Math.pow((t - 0.28) / 0.18, 2)) *
          (0.65 + 0.35 * Math.sin(2 * Math.PI * 6.5 * t));
        const syl2 =
          Math.exp(-Math.pow((t - 0.84) / 0.24, 2)) *
          (0.68 + 0.32 * Math.sin(2 * Math.PI * 5.1 * t + variant));
        const env = Math.min(1, syl1 * 0.92 + syl2 * 1.05);

        const white = Math.random() * 2 - 1;
        hp = 0.86 * (hp + white - lastIn);
        lastIn = white;
        lp1 = lp1 * 0.55 + hp * 0.45;
        lp2 = lp2 * 0.72 + lp1 * 0.28;

        // Faint ghostly vocal formant undertone
        const fFormant = variant === 0 ? 410 - t * 55 : 465 - t * 68;
        const ghostlyTone =
          Math.sin(2 * Math.PI * fFormant * t) * 0.14 +
          Math.sin(2 * Math.PI * (fFormant * 2.38) * t) * 0.08;

        const tailStart = whisperDur - 0.12;
        const endFade =
          t > tailStart
            ? 0.5 * (1 + Math.cos(((t - tailStart) / 0.12) * Math.PI))
            : 1.0;
        const s = (lp1 * 0.78 + lp2 * 0.45 + ghostlyTone) * env * endFade;
        data[i] = Math.max(-0.92, Math.min(0.92, s * 1.15));
      }
      return buf;
    });

    // 4. Sudden terrifying Blood-Witch chase shriek (0.92s finite dramatic screech buffer)
    const shriekDur = 0.92;
    const shriekLen = Math.max(1, Math.floor(sr * shriekDur));
    const shriekBuf = ctx.createBuffer(1, shriekLen, sr);
    const sData = shriekBuf.getChannelData(0);
    let phaseA = 0;
    let phaseB = 0;
    let phaseC = 0;
    let sHp = 0;
    let sLast = 0;
    for (let i = 0; i < shriekLen; i++) {
      const t = i / sr;
      const attack = 1 - Math.exp(-t * 36);
      const decay = Math.exp(-t * 2.45);
      const vibrato = Math.sin(2 * Math.PI * 24 * t) * 48;
      // Sharp upward terror spike then falling demonic rasp
      const pitchCurve =
        t < 0.18
          ? 640 + (t / 0.18) * 1080
          : 1720 * Math.exp(-(t - 0.18) * 1.25) + 460;
      const fA = pitchCurve + vibrato;
      const fB = fA * 1.52 + 37;
      const fC = fA * 2.19 - 29;
      phaseA += (2 * Math.PI * fA) / sr;
      phaseB += (2 * Math.PI * fB) / sr;
      phaseC += (2 * Math.PI * fC) / sr;

      const white = Math.random() * 2 - 1;
      sHp = 0.82 * (sHp + white - sLast);
      sLast = white;

      // Soft-clipped distorted vocal scream harmonics + raspy air hiss
      const rawVoice =
        Math.sin(phaseA) * 0.56 +
        Math.sin(phaseB) * 0.34 +
        Math.sin(phaseC) * 0.22 +
        sHp * 0.42;
      const driven = Math.tanh(rawVoice * 1.85);
      const tailStart = shriekDur - 0.09;
      const endFade =
        t > tailStart
          ? 0.5 * (1 + Math.cos(((t - tailStart) / 0.09) * Math.PI))
          : 1.0;
      sData[i] = Math.max(-0.95, Math.min(0.95, driven * attack * decay * endFade));
    }
    this.witchShriekWebBuffer = shriekBuf;
  }

  private playDirectionalWebBuffer(
    buffer: AudioBuffer,
    gainValue: number,
    pan = 0,
    playbackRate = 1.0,
    filterConfig?: { type: BiquadFilterType; freq: number; q?: number },
  ): boolean {
    if (gainValue <= 0.004 || typeof window === 'undefined') return false;
    try {
      const ctx = this.ensureUiAudioContext();
      if (!ctx || ctx.state === 'closed') return false;
      const now = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.setValueAtTime(
        Math.max(0.65, Math.min(1.45, playbackRate)),
        now,
      );

      let lastNode: AudioNode = src;
      let filterNode: BiquadFilterNode | null = null;
      if (filterConfig) {
        filterNode = ctx.createBiquadFilter();
        filterNode.type = filterConfig.type;
        filterNode.frequency.setValueAtTime(filterConfig.freq, now);
        if (filterConfig.q !== undefined) {
          filterNode.Q.setValueAtTime(filterConfig.q, now);
        }
        lastNode.connect(filterNode);
        lastNode = filterNode;
      }

      let panner: StereoPannerNode | null = null;
      if (typeof ctx.createStereoPanner === 'function') {
        panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(Math.max(-0.95, Math.min(0.95, pan)), now);
        lastNode.connect(panner);
        lastNode = panner;
      }

      const amp = ctx.createGain();
      const clampedGain = Math.max(0.008, Math.min(1.15, gainValue));
      amp.gain.setValueAtTime(clampedGain, now);
      lastNode.connect(amp);
      amp.connect(ctx.destination);

      src.onended = () => {
        try {
          src.disconnect();
          filterNode?.disconnect();
          panner?.disconnect();
          amp.disconnect();
        } catch {
          // Ignore disconnect errors
        }
      };
      src.start(now);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Plays Rukmini's directional metallic silver Payal (anklet jingles) layered with a heavy
   * ominous footstep thud, scaled cleanly by distance (audible up to 34m), chase speed, and stereo pan.
   */
  public playPayalStep(
    distance: number,
    _positionalPayal?: THREE.PositionalAudio,
    witchSpeed = 2.1,
    stepIndex = 0,
    floorDiff = 0,
    pan = 0,
  ) {
    if (
      !this.gameplayAudioEnabled ||
      this.muted ||
      this.masterVolume <= 0 ||
      distance > 34.0
    ) {
      return;
    }

    const sfxGain = this.effectiveSfxVolume;
    if (sfxGain <= 0.005) return;

    // Vivid directional falloff from 34m (haunting corridor jingle) down to 1.5m (intense close-up)
    const normDist = Math.max(0, Math.min(1, (34.0 - distance) / 32.5));
    const distGain = Math.pow(normDist, 1.42);
    const isChasing = witchSpeed > 3.2;
    const speedGain = isChasing
      ? 1.24
      : 0.92 + Math.max(0, Math.min(1, (witchSpeed - 1.4) / 2.2)) * 0.22;
    const floorDamp = floorDiff > 2.2 ? 0.62 : 1.0;

    const payalGain = Math.max(
      0.035 * sfxGain,
      Math.min(1.05 * sfxGain, distGain * speedGain * floorDamp * sfxGain * 1.02),
    );
    const footGain = Math.max(
      0.025 * sfxGain,
      Math.min(
        0.95 * sfxGain,
        Math.pow(normDist, 1.35) * (isChasing ? 1.28 : 0.88) * floorDamp * sfxGain * 0.88,
      ),
    );

    const ctx = this.ensureUiAudioContext();
    if (ctx) {
      this.ensureWitchDirectionalBuffers(ctx);
      if (this.payalStepWebBuffers && this.payalStepWebBuffers.length > 0) {
        const payalBuf =
          this.payalStepWebBuffers[
            Math.abs(stepIndex) % this.payalStepWebBuffers.length
          ];
        const pitchJitter = 0.96 + ((Math.abs(stepIndex) * 7) % 9) * 0.01;
        this.playDirectionalWebBuffer(
          payalBuf,
          payalGain,
          pan,
          isChasing ? pitchJitter * 1.04 : pitchJitter,
          floorDiff > 2.2
            ? { type: 'lowpass', freq: 3800 }
            : undefined,
        );
      }
      if (
        this.witchFootstepWebBuffers &&
        this.witchFootstepWebBuffers.length > 0 &&
        distance <= 28.0
      ) {
        const footBuf =
          this.witchFootstepWebBuffers[
            Math.abs(stepIndex) % this.witchFootstepWebBuffers.length
          ];
        this.playDirectionalWebBuffer(
          footBuf,
          footGain,
          pan,
          isChasing ? 1.06 : 0.94,
          { type: 'lowpass', freq: floorDiff > 2.2 ? 220 : 420 },
        );
      }
      return;
    }

    // Fallback to pooled WAV if Web Audio Context is unavailable
    if (typeof Audio === 'undefined') return;
    const wavs = this.ensurePayalStepWavs();
    const variantIdx = Math.abs(stepIndex) % wavs.length;
    const wavUrl = wavs[variantIdx];
    if (!wavUrl) return;
    const finalVol = Math.max(0.03, Math.min(0.95, payalGain));
    this.payalPoolCursor = this.playPooledOneShot(
      this.payalAudioPool,
      4,
      this.payalPoolCursor,
      wavUrl,
      finalVol,
    );
  }

  /**
   * Plays a directional eerie spectral whisper burst as Rukmini prowls nearby (audible up to 28m).
   */
  public playWitchEerieWhisper(distance: number, pan = 0, variant = 0) {
    if (
      !this.gameplayAudioEnabled ||
      this.muted ||
      this.masterVolume <= 0 ||
      distance > 28.0
    ) {
      return;
    }
    const sfxGain = this.effectiveSfxVolume;
    if (sfxGain <= 0.005) return;

    const ctx = this.ensureUiAudioContext();
    if (!ctx) return;
    this.ensureWitchDirectionalBuffers(ctx);
    if (!this.witchWhisperWebBuffers || this.witchWhisperWebBuffers.length === 0) {
      return;
    }

    const normDist = Math.max(0, Math.min(1, (28.0 - distance) / 26.0));
    const gain = Math.max(
      0.04 * sfxGain,
      Math.min(0.84 * sfxGain, Math.pow(normDist, 1.35) * sfxGain * 0.84),
    );
    const buf =
      this.witchWhisperWebBuffers[
        Math.abs(variant) % this.witchWhisperWebBuffers.length
      ];
    this.playDirectionalWebBuffer(buf, gain, pan, 0.92 + (variant % 3) * 0.06, {
      type: 'bandpass',
      freq: 1620,
      q: 1.15,
    });
  }

  /**
   * Plays a single soft silver Payal chime burst (e.g. preview button).
   */
  public playSinglePayalChime(gainScale = 0.34) {
    if (this.muted || this.masterVolume <= 0 || typeof Audio === 'undefined') {
      return;
    }
    const wavs = this.ensurePayalStepWavs();
    const wavUrl = wavs[this.payalPoolCursor % wavs.length];
    if (!wavUrl) return;
    const sfxGain = this.effectiveSfxVolume;
    if (sfxGain <= 0.005) return;
    const vol = Math.max(0.04, Math.min(0.75, gainScale * sfxGain));
    this.payalPoolCursor = this.playPooledOneShot(
      this.payalAudioPool,
      4,
      this.payalPoolCursor,
      wavUrl,
      vol,
    );
  }

  public playHeartbeat(distance: number) {
    if (distance > 15.0) return;
    const proximity = Math.max(0, Math.min(1, (15.0 - distance) / 12.0));
    const vol = 0.1 + proximity * proximity * 0.56;
    this.playSingleHeartbeatPulse(vol, distance <= 6.5);
  }

  /**
   * Plays one short, soft low cardiac "lub-dub" thump pulse (0.29s–0.36s, zero humming/static).
   */
  public playSingleHeartbeatPulse(vol = 0.42, urgent = false) {
    if (
      !this.gameplayAudioEnabled ||
      this.muted ||
      this.masterVolume <= 0 ||
      vol <= 0.005 ||
      typeof Audio === 'undefined'
    ) {
      return;
    }

    const wavUrl = this.ensureHeartbeatWav(urgent);
    if (!wavUrl) return;

    const sfxGain = this.effectiveSfxVolume;
    if (sfxGain <= 0.005) return;
    const finalVol = Math.max(0.02, Math.min(0.74, vol * sfxGain));
    this.heartbeatPoolCursor = this.playPooledOneShot(
      this.heartbeatAudioPool,
      3,
      this.heartbeatPoolCursor,
      wavUrl,
      finalVol,
    );
  }

  public async playPanickedBreathing(_distanceMeters: number): Promise<void> {}

  public stopPanickedBreathing(_smoothFade = true) {}

  public playRelicChime(_isBurn = false) {}

  /**
   * Plays a sudden, directional blood-curdling chase shriek when Rukmini hears the player
   * and locks onto their footsteps/sprinting (finite one-shot buffer, zero continuous drones).
   */
  public playWitchShriek(distance = 10.0, pan = 0) {
    if (
      !this.gameplayAudioEnabled ||
      this.muted ||
      this.masterVolume <= 0 ||
      distance > 36.0
    ) {
      return;
    }
    const sfxGain = this.effectiveSfxVolume;
    if (sfxGain <= 0.005) return;

    const ctx = this.ensureUiAudioContext();
    if (!ctx) return;
    this.ensureWitchDirectionalBuffers(ctx);
    if (!this.witchShriekWebBuffer) return;

    const normDist = Math.max(0, Math.min(1, (36.0 - distance) / 34.0));
    const gain = Math.max(
      0.09 * sfxGain,
      Math.min(0.92 * sfxGain, (0.24 + Math.pow(normDist, 1.25) * 0.68) * sfxGain),
    );
    this.playDirectionalWebBuffer(
      this.witchShriekWebBuffer,
      gain,
      pan,
      0.96 + Math.random() * 0.09,
      { type: 'bandpass', freq: 1450, q: 0.72 },
    );
  }

  public startIntroAmbience() {}

  public stopIntroAmbience() {}

  public playCrowCaw() {}

  public playDoorCreak() {}

  public playChainUnlockClank() {}

  public playJumpSound() {}

  public playLandingThud(
    _surface: 'mud' | 'stone' | 'tiles' | 'wood' | 'red_oxide' = 'stone',
  ) {}

  public playHideTransitionSound(
    _animType: 'lid_x' | 'door_y' | 'panel_rotate' | 'curtain_scale',
    _entering: boolean,
  ) {}

  public playJumpScareSting() {}

  public stopStorySceneBed() {}

  public stopAllVNSounds() {
    this.stopRukminiGhostlyTail();
  }

  private stopRukminiGhostlyTail() {
    if (!this.rukminiWhisperAudio) return;
    try {
      this.rukminiWhisperAudio.pause();
      this.rukminiWhisperAudio.currentTime = 0;
    } catch {
      // Ignore
    }
  }

  /**
   * Plays a subtle, short (~0.95s) decaying breathy ghostly reverb/whisper tail
   * for Witch Rukmini's lines using a pre-baked vocal-formant PCM WAV.
   * Strictly NO continuous oscillators and NO white-noise radio static.
   */
  public playRukminiGhostlyTail(volumeScale = 1.0) {
    if (this.muted || this.masterVolume <= 0 || typeof Audio === 'undefined') {
      return;
    }
    try {
      if (!this.rukminiWhisperTailWavUrl) {
        const sr = 22050;
        const duration = 0.95;
        const total = Math.floor(sr * duration);
        const pcm = new Float32Array(total);

        // Two gentle 2-pole resonant vocal-formant bandpass filters ("haa / ahh" ghostly exhale)
        const makeBandpass = (freq: number, q: number) => {
          const w0 = (2 * Math.PI * freq) / sr;
          const alpha = Math.sin(w0) / (2 * q);
          const cosW0 = Math.cos(w0);
          const a0 = 1 + alpha;
          return {
            b0: alpha / a0,
            b2: -alpha / a0,
            a1: (-2 * cosW0) / a0,
            a2: (1 - alpha) / a0,
            x1: 0,
            x2: 0,
            y1: 0,
            y2: 0,
          };
        };
        const stepFilter = (
          f: ReturnType<typeof makeBandpass>,
          x: number,
        ): number => {
          const y = f.b0 * x + f.b2 * f.x2 - f.a1 * f.y1 - f.a2 * f.y2;
          f.x2 = f.x1;
          f.x1 = x;
          f.y2 = f.y1;
          f.y1 = y;
          return y;
        };

        const formantLow = makeBandpass(540, 6.2);
        const formantMid = makeBandpass(1180, 7.5);
        const echoes = [
          { start: 0.02, amp: 0.72, decay: 6.4 },
          { start: 0.24, amp: 0.44, decay: 6.8 },
          { start: 0.49, amp: 0.22, decay: 7.4 },
        ];

        let seed = 7331;
        for (let i = 0; i < total; i++) {
          const t = i / sr;
          seed = (seed * 1664525 + 1013904223) >>> 0;
          const excitation = (seed / 0xffffffff) * 2 - 1;
          const breath =
            stepFilter(formantLow, excitation) * 0.65 +
            stepFilter(formantMid, excitation) * 0.35;

          let env = 0;
          for (let e = 0; e < echoes.length; e++) {
            const dt = t - echoes[e].start;
            if (dt > 0) {
              const attack = Math.min(1, dt / 0.055);
              env += echoes[e].amp * attack * Math.exp(-dt * echoes[e].decay);
            }
          }
          // Smooth fade-out at end so tail reaches exact 0.0 cleanly
          const endFade = t > 0.8 ? Math.max(0, (duration - t) / 0.15) : 1;
          pcm[i] = Math.max(-0.85, Math.min(0.85, breath * env * endFade * 1.45));
        }

        this.rukminiWhisperTailWavUrl = this.buildPcmWavBlobUrl(pcm, sr);
      }

      if (!this.rukminiWhisperTailWavUrl) return;
      if (!this.rukminiWhisperAudio) {
        this.rukminiWhisperAudio = new Audio(this.rukminiWhisperTailWavUrl);
      }
      this.rukminiWhisperAudio.pause();
      this.rukminiWhisperAudio.currentTime = 0;
      this.rukminiWhisperAudio.volume = Math.max(
        0.04,
        Math.min(0.38, this.masterVolume * 0.24 * volumeScale),
      );
      void this.rukminiWhisperAudio.play().catch(() => {});
    } catch {
      // Ignore audio playback errors
    }
  }

  /**
   * Computes cleaned Hindi speech text and per-character rate/pitch parameters
   * shared identically between native Android `window.RaktVoiceBridge` and desktop `speechSynthesis`.
   */
  public getVoiceSpeechParams(
    rawText: string,
    voiceType: VNSpeakerVoice | string,
    rateMultiplier = 1.0,
    speakerName?: string,
  ): {
    cleanedText: string;
    rate: number;
    pitch: number;
    isRukmini: boolean;
    profileId: CanonicalCharacterVoiceId;
  } {
    const profileId = resolveSpeakerProfileId(voiceType, speakerName, rawText);
    const profile = CHARACTER_VOICE_PROFILES[profileId];

    const cleaned = rawText
      .replace(/^\[?[^:\[\]]{1,48}\]?:\s*/u, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/["""]/g, '')
      .trim();

    const cleanedText = cleaned || rawText.trim();
    const pitch = Math.max(0.4, Math.min(1.5, profile.pitch));
    const rate = Math.max(
      0.6,
      Math.min(1.35, profile.rate * (rateMultiplier || 1.0)),
    );

    return {
      cleanedText,
      rate,
      pitch,
      isRukmini: Boolean(profile.ghostlyTail),
      profileId,
    };
  }

  /**
   * Configures a SpeechSynthesisUtterance strictly with a native Indian Hindi (hi-IN) voice
   * (never selecting any English/foreign voice such as en-US, en-GB, en-IN, David, Zira, Mark, or Rishi),
   * applying each character's unique natural pitch and speed profile automatically by speaker name.
   */
  public configureUtteranceWithFallback(
    rawText: string,
    voiceType: VNSpeakerVoice | string,
    rateMultiplier = 1.0,
    speakerName?: string,
  ): SpeechSynthesisUtterance {
    const { cleanedText, rate, pitch, profileId } = this.getVoiceSpeechParams(
      rawText,
      voiceType,
      rateMultiplier,
      speakerName,
    );
    const profile = CHARACTER_VOICE_PROFILES[profileId];

    // Refresh native hi-IN voices if cache is empty (handles async browser voice loading)
    if (this.cachedHindiVoices.length === 0) {
      this.refreshCategorizedVoices();
    }

    const pickPureHindiVoice = (): SpeechSynthesisVoice | null => {
      if (profile.gender === 'female' && this.cachedFemaleHindiVoices.length > 0) {
        return (
          this.cachedFemaleHindiVoices[
            profile.voiceSlot % this.cachedFemaleHindiVoices.length
          ] || this.cachedFemaleHindiVoices[0]
        );
      }
      if (profile.gender === 'male' && this.cachedMaleHindiVoices.length > 0) {
        return (
          this.cachedMaleHindiVoices[
            profile.voiceSlot % this.cachedMaleHindiVoices.length
          ] || this.cachedMaleHindiVoices[0]
        );
      }
      // If only one (or gender-unlabeled) hi-IN voice exists, use that native hi-IN voice
      // for all characters and differentiate cleanly by pitch and rate. Never fall back to English.
      if (this.cachedHindiVoices.length > 0) {
        return (
          this.cachedHindiVoices[
            profile.voiceSlot % this.cachedHindiVoices.length
          ] || this.cachedHindiVoices[0]
        );
      }
      return null;
    };

    const selectedHindiVoice = pickPureHindiVoice();

    // Always speak pure Hindi text with lang = 'hi-IN' (zero English/foreign voice fallback)
    const utter = new SpeechSynthesisUtterance(cleanedText);
    utter.volume = Math.max(0.2, Math.min(1.0, this.masterVolume || 1.0));
    utter.lang = 'hi-IN';

    if (selectedHindiVoice) {
      utter.voice = selectedHindiVoice;
    }

    utter.pitch = pitch;
    utter.rate = rate;

    return utter;
  }

  /**
   * Speaks a Hindi dialogue/narration line via native Android `window.RaktVoiceBridge` when available,
   * otherwise using desktop browser `window.speechSynthesis` strictly filtered to `hi-IN` voices.
   */
  public speakHindiVNLine(
    text: string,
    voiceType: VNSpeakerVoice,
    speakerName?: string,
  ) {
    if (this.muted || typeof window === 'undefined') {
      return;
    }

    const { cleanedText, rate, pitch, isRukmini } = this.getVoiceSpeechParams(
      text,
      voiceType,
      1.0,
      speakerName,
    );
    if (!cleanedText) return;

    const nativeBridge = getNativeRaktVoiceBridge();
    if (nativeBridge) {
      try {
        if (isRukmini) {
          this.playRukminiGhostlyTail(0.45);
        }
        nativeBridge.speak(cleanedText, rate, pitch);
      } catch {
        // Ignore native voice bridge errors
      }
      return;
    }

    if (!('speechSynthesis' in window)) {
      return;
    }

    try {
      const win = window as Window & {
        activeUtterances?: SpeechSynthesisUtterance[];
      };
      if (!Array.isArray(win.activeUtterances)) {
        win.activeUtterances = [];
      }

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utter = this.configureUtteranceWithFallback(
        text,
        voiceType,
        1.0,
        speakerName,
      );
      if (!utter.text.trim()) return;

      win.activeUtterances.push(utter);
      const cleanup = (withTail: boolean) => {
        if (!Array.isArray(win.activeUtterances)) return;
        const idx = win.activeUtterances.indexOf(utter);
        if (idx !== -1) {
          win.activeUtterances.splice(idx, 1);
        }
        if (withTail && isRukmini) {
          this.playRukminiGhostlyTail(1.0);
        }
      };
      utter.onstart = () => {
        if (isRukmini) {
          this.playRukminiGhostlyTail(0.45);
        }
      };
      utter.onend = () => cleanup(true);
      utter.onerror = () => cleanup(false);

      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore browser speech synthesis errors
    }
  }

  /**
   * Stops any active sequence speech utterances cleanly across both Android `window.RaktVoiceBridge`
   * and desktop `window.speechSynthesis`.
   */
  public stopSequenceSpeech() {
    this.speechCancelVersion++;
    this.stopRukminiGhostlyTail();
    stopNativeRaktVoiceBridge();
    if (this.activeBridgeCancelCallbacks.size > 0) {
      const callbacks = Array.from(this.activeBridgeCancelCallbacks);
      this.activeBridgeCancelCallbacks.clear();
      for (const cancelFn of callbacks) {
        cancelFn();
      }
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      const win = window as Window & {
        activeUtterances?: SpeechSynthesisUtterance[];
      };
      if (Array.isArray(win.activeUtterances)) {
        win.activeUtterances.length = 0;
      }
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Speaks a single dramatic sequence line via Android `window.RaktVoiceBridge` (when present)
   * or desktop `window.speechSynthesis` strictly filtered to `hi-IN` voices, resolving once finished.
   */
  public speakSequenceUtterance(
    text: string,
    voiceType: VNSpeakerVoice,
    opts?: {
      rateMultiplier?: number;
      volumeScale?: number;
      cancelPrevious?: boolean;
      maxWaitMs?: number;
      speakerName?: string;
    },
  ): Promise<void> {
    const { cleanedText, rate, pitch, isRukmini } = this.getVoiceSpeechParams(
      text,
      voiceType,
      opts?.rateMultiplier ?? 1.0,
      opts?.speakerName,
    );
    const estimatedMs = Math.ceil((cleanedText.length * 125) / rate) + 3800;
    const fallbackMs = Math.max(
      opts?.maxWaitMs ?? 0,
      Math.min(18000, Math.max(4800, estimatedMs)),
    );

    if (
      this.muted ||
      !this.characterVoicesEnabled ||
      typeof window === 'undefined'
    ) {
      return new Promise((resolve) =>
        window.setTimeout(resolve, Math.min(fallbackMs, 3200)),
      );
    }

    const nativeBridge = getNativeRaktVoiceBridge();
    if (nativeBridge) {
      const dialScale = this.effectiveDialogueVolume;
      const userScale = opts?.volumeScale ?? 1.0;
      if (dialScale * userScale <= 0.01 || !cleanedText) {
        return Promise.resolve();
      }
      if (opts?.cancelPrevious) {
        this.speechCancelVersion++;
        stopNativeRaktVoiceBridge();
        if (this.activeBridgeCancelCallbacks.size > 0) {
          const callbacks = Array.from(this.activeBridgeCancelCallbacks);
          this.activeBridgeCancelCallbacks.clear();
          for (const cancelFn of callbacks) cancelFn();
        }
      }
      const myCancelVersion = this.speechCancelVersion;
      const naturalDurationMs = getNativeVoiceDurationMs(cleanedText);

      return new Promise((resolve) => {
        let settled = false;
        let timerId = 0;
        const finish = (completedNaturally: boolean) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timerId);
          this.activeBridgeCancelCallbacks.delete(cancelCb);
          if (
            completedNaturally &&
            isRukmini &&
            myCancelVersion === this.speechCancelVersion
          ) {
            this.playRukminiGhostlyTail(1.0);
          }
          resolve();
        };
        const cancelCb = () => finish(false);
        this.activeBridgeCancelCallbacks.add(cancelCb);

        try {
          if (isRukmini) {
            this.playRukminiGhostlyTail(0.45);
          }
          nativeBridge.speak(cleanedText, rate, pitch);
          timerId = window.setTimeout(() => finish(true), naturalDurationMs);
        } catch {
          finish(false);
        }
      });
    }

    if (!('speechSynthesis' in window)) {
      return new Promise((resolve) =>
        window.setTimeout(resolve, Math.min(fallbackMs, 3200)),
      );
    }

    return new Promise((resolve) => {
      let settled = false;
      let safetyTimer = 0;
      let startTimer = 0;
      let keepAliveInterval = 0;
      const done = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(safetyTimer);
        window.clearTimeout(startTimer);
        window.clearInterval(keepAliveInterval);
        resolve();
      };
      safetyTimer = window.setTimeout(done, fallbackMs);

      try {
        const win = window as Window & {
          activeUtterances?: SpeechSynthesisUtterance[];
        };
        if (!Array.isArray(win.activeUtterances)) {
          win.activeUtterances = [];
        }

        // Only call speechSynthesis.cancel() when something is ACTUALLY speaking/pending!
        // In Chromium, calling cancel() + speak() synchronously (even when idle) silently drops the new utterance.
        let needPostCancelDelay = false;
        if (
          opts?.cancelPrevious &&
          (window.speechSynthesis.speaking || window.speechSynthesis.pending)
        ) {
          this.speechCancelVersion++;
          win.activeUtterances.length = 0;
          window.speechSynthesis.cancel();
          needPostCancelDelay = true;
        }
        const myCancelVersion = this.speechCancelVersion;

        const beginSpeak = () => {
          if (settled || myCancelVersion !== this.speechCancelVersion) {
            done();
            return;
          }
          try {
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }

            // Refresh native hi-IN voices if async browser voice list finished loading
            if (this.cachedHindiVoices.length === 0) {
              this.refreshCategorizedVoices();
            }

            const utter = this.configureUtteranceWithFallback(
              text,
              voiceType,
              opts?.rateMultiplier ?? 1.0,
              opts?.speakerName,
            );
            const dialScale = this.effectiveDialogueVolume;
            const userScale = opts?.volumeScale ?? 1.0;
            utter.volume = Math.max(
              0,
              Math.min(1.0, utter.volume * userScale * dialScale),
            );
            if (utter.volume <= 0.01) {
              done();
              return;
            }
            if (!utter.text.trim()) {
              done();
              return;
            }

            win.activeUtterances!.push(utter);
            const cleanup = (withTail: boolean) => {
              if (Array.isArray(win.activeUtterances)) {
                const idx = win.activeUtterances.indexOf(utter);
                if (idx !== -1) win.activeUtterances.splice(idx, 1);
              }
              if (withTail && isRukmini) {
                this.playRukminiGhostlyTail(1.0);
              }
              done();
            };

            utter.onstart = () => {
              // Extend safety deadline from actual start so voice-load latency never clips the end
              window.clearTimeout(safetyTimer);
              safetyTimer = window.setTimeout(done, fallbackMs);
              if (isRukmini) {
                this.playRukminiGhostlyTail(0.45);
              }
            };
            utter.onend = () => cleanup(true);
            utter.onerror = (ev) => {
              // If browser reported interrupted/canceled, finish cleanly; otherwise wait briefly or finish
              if (
                ev?.error === 'canceled' ||
                ev?.error === 'interrupted' ||
                myCancelVersion !== this.speechCancelVersion
              ) {
                cleanup(false);
              } else {
                cleanup(false);
              }
            };

            // Chromium keep-alive: prevents SpeechSynthesis from silently pausing mid-sentence
            keepAliveInterval = window.setInterval(() => {
              try {
                if (window.speechSynthesis.paused) {
                  window.speechSynthesis.resume();
                }
              } catch {
                // Ignore
              }
            }, 2200);

            window.speechSynthesis.speak(utter);
          } catch {
            done();
          }
        };

        if (needPostCancelDelay) {
          startTimer = window.setTimeout(beginSpeak, 70);
        } else {
          beginSpeak();
        }
      } catch {
        done();
      }
    });
  }

  /**
   * Plays Rukmini's eerie echoing voice with her demonic slow female register + short ghostly whisper tail.
   */
  public async playRukminiEchoVoice(text: string): Promise<void> {
    await this.speakSequenceUtterance(text, 'rukmini', {
      rateMultiplier: 1.0,
      volumeScale: 1.0,
      cancelPrevious: true,
      maxWaitMs: 12500,
      speakerName: 'रुक्मिणी',
    });
  }

  /**
   * Plays staggered Hindi screams of Riya, Kabir, and Dev sequentially during the pitch-black abduction
   * without dropping utterances via Chromium cancel+speak race conditions.
   */
  public async playBlackoutFriendsScreams(): Promise<void> {
    if (
      this.muted ||
      typeof window === 'undefined' ||
      (!getNativeRaktVoiceBridge() && !('speechSynthesis' in window))
    ) {
      return;
    }
    const cries: Array<{
      text: string;
      voice: VNSpeakerVoice;
      speaker: string;
      rate: number;
    }> = [
      { text: 'बचाओ! अरे अंधेरा हो गया!', voice: 'riya', speaker: 'रिया', rate: 1.08 },
      { text: 'मुझे कौन खींच रहा है! छोड़ो!', voice: 'kabir', speaker: 'कबीर', rate: 1.06 },
      { text: 'आह! जंजीरें... बचाओ!!', voice: 'dev', speaker: 'देव', rate: 1.08 },
    ];
    for (let i = 0; i < cries.length; i++) {
      const c = cries[i];
      await this.speakSequenceUtterance(c.text, c.voice, {
        rateMultiplier: c.rate,
        volumeScale: 1.0,
        cancelPrevious: i === 0,
        maxWaitMs: 4200,
        speakerName: c.speaker,
      });
    }
  }

  public startContinuousStorySoundscape() {}

  public updateStorySceneAtmosphere(_sceneNum: number) {}

  public stopContinuousStorySoundscape() {}

  public syncStoryActionSfx(
    _actionKey: string,
    _spokenText: string,
    _isNewAction: boolean,
    _enteringFlashback: boolean,
  ) {}

  public playVNSoundCue(_cue: VNSoundCue) {}

  public playLightningThunder(intensityScale = 1.0) {
    this.playDistantThunder(intensityScale);
  }

  public playTestJumpscareSpike() {}

  public playSurfaceFootstep(
    _surface: 'mud' | 'stone' | 'tiles' | 'wood' | 'red_oxide',
    _isSprinting = false,
    _speedMagnitude = 1.0,
  ) {}

  public playBasementWaterDrip(_distanceFactor = 1.0) {}

  /**
   * Plays a short, low-frequency one-shot thunder boom (pre-rendered sculpted sub-bass PCM WAV).
   * Respects Settings SFX/Ambience sliders & Mute All cleanly, with zero continuous oscillators.
   */
  public playDistantThunder(intensityScale = 1.0) {
    if (
      this.muted ||
      this.muteAll ||
      !this.gameplayAudioEnabled ||
      typeof window === 'undefined' ||
      typeof Audio === 'undefined'
    ) {
      return;
    }
    const combinedGain = Math.max(
      this.effectiveSfxVolume * 0.78,
      this.effectiveMusicVolume * 0.65,
    );
    if (combinedGain <= 0.005) return;

    try {
      if (!this.thunderBoomWavUrl) {
        const sr = 22050;
        const duration = 2.35;
        const total = Math.floor(sr * duration);
        const pcm = new Float32Array(total);
        // 3-pole cascade low-pass filter on seeded PRNG for deep, warm rolling thunder (zero harsh hiss)
        let seed = 48271;
        let lp1 = 0;
        let lp2 = 0;
        let lp3 = 0;
        for (let i = 0; i < total; i++) {
          const t = i / sr;
          seed = (seed * 1664525 + 1013904223) >>> 0;
          const rand = (seed / 0xffffffff) * 2 - 1;
          // Early crack softens rapidly into deep rolling low-frequency thunder
          const cutoff = t < 0.25 ? 0.085 : 0.032;
          lp1 += (rand - lp1) * cutoff;
          lp2 += (lp1 - lp2) * (cutoff * 0.72);
          lp3 += (lp2 - lp3) * (cutoff * 0.55);

          const attack = Math.min(1, t / 0.065);
          const primaryDecay = Math.exp(-t * 1.45);
          const rumblePulse =
            0.72 +
            0.28 * Math.sin(t * 7.5 + 0.4) * Math.exp(-Math.max(0, t - 0.3) * 1.2);
          const subBoom =
            Math.sin(2 * Math.PI * (52 - Math.min(18, t * 9)) * t) *
            Math.exp(-t * 2.8) *
            0.42;
          const tailFade = t > duration - 0.3 ? Math.max(0, (duration - t) / 0.3) : 1;
          const sample = (lp3 * 3.8 * rumblePulse + subBoom) * attack * primaryDecay * tailFade;
          pcm[i] = Math.max(-0.92, Math.min(0.92, sample));
        }
        this.thunderBoomWavUrl = this.buildPcmWavBlobUrl(pcm, sr);
      }

      if (!this.thunderBoomWavUrl) return;
      const vol = Math.max(
        0.04,
        Math.min(0.88, combinedGain * 0.72 * Math.max(0.25, Math.min(1.15, intensityScale))),
      );
      this.thunderCursor = this.playPooledOneShot(
        this.thunderPool,
        2,
        this.thunderCursor,
        this.thunderBoomWavUrl,
        vol,
      );
    } catch {
      // Ignore autoplay or playback restrictions
    }
  }

  /**
   * Generates a seamless 6.0-second stereo (2-channel) subtle monsoon rain PCM WAV:
   * - Decorrelated Left & Right channels with 1,200 damped water-droplet impulses + warm velvety rain-on-earth body
   * - Cyclically wrapped across the 6.0s loop boundary so there is ZERO loop click
   * - Zero Web Audio OscillatorNodes and zero harsh white-noise radio static
   */
  private ensureSpatialRainWavUrl(): string | null {
    if (this.softRainWavUrl) return this.softRainWavUrl;
    const sr = 22050;
    const duration = 6.0;
    const total = Math.floor(sr * duration);
    const left = new Float32Array(total);
    const right = new Float32Array(total);

    let seed = 739391;
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };

    // Layer 1: Gentle rain-on-foliage/courtyard-stone soft body (2-pole warm bandpass-shaped wash)
    // Run an extra 0.5s warm-up before filling so loop boundary is seamlessly continuous
    const makeChannelWash = (target: Float32Array) => {
      let lp1 = 0;
      let lp2 = 0;
      let hp = 0;
      const warmup = Math.floor(sr * 0.5);
      for (let i = -warmup; i < total; i++) {
        const white = nextRand() * 2 - 1;
        // Soft low-passed rain wash (no harsh sizzling highs) + gentle high-pass (no muddy DC hum)
        lp1 += (white - lp1) * 0.19;
        lp2 += (lp1 - lp2) * 0.14;
        hp += (lp2 - hp) * 0.018;
        const body = lp2 - hp;
        if (i >= 0) {
          // Subtle slow organic monsoon swell (2 cycles per 6s loop -> exact periodic wrap)
          const phase = (i / total) * Math.PI * 2;
          const swell = 0.88 + 0.12 * Math.sin(phase * 2.0 + 0.7);
          target[i] += body * 0.24 * swell;
        }
      }
      // Crossfade last 160ms into first 160ms for guaranteed mathematically click-free loop seam
      const fadeSamples = Math.floor(sr * 0.16);
      for (let i = 0; i < fadeSamples; i++) {
        const u = i / fadeSamples;
        const s = 0.5 - 0.5 * Math.cos(u * Math.PI);
        const tailIdx = total - fadeSamples + i;
        const blended = target[tailIdx] * (1 - s) + target[i] * s;
        target[i] = blended;
      }
    };
    makeChannelWash(left);
    makeChannelWash(right);

    // Layer 2: 1,200 discrete damped stereo water-droplet impulses panned across L/R field
    const dropCount = 1200;
    for (let d = 0; d < dropCount; d++) {
      const startSample = Math.floor(nextRand() * total);
      const dropLen = Math.floor(sr * (0.011 + nextRand() * 0.022));
      const amp = 0.024 + nextRand() * 0.052;
      const freq = 340 + nextRand() * 980;
      const chirp = 280 + nextRand() * 520;
      const decay = 135 + nextRand() * 95;
      // Stereo placement across the courtyard canopy (-1 left .. +1 right)
      const pan = nextRand() * 2 - 1;
      const gainL = Math.cos(((pan + 1) * Math.PI) / 4);
      const gainR = Math.sin(((pan + 1) * Math.PI) / 4);

      for (let k = 0; k < dropLen; k++) {
        const idx = (startSample + k) % total;
        const dt = k / sr;
        const env =
          Math.exp(-dt * decay) *
          Math.sin(Math.min(1, dt / 0.0018) * (Math.PI / 2));
        const val = Math.sin(2 * Math.PI * (freq + dt * chirp) * dt) * env * amp;
        left[idx] += val * gainL;
        right[idx] += val * gainR;
      }
    }

    // Gentle warm low-pass polish & safe headroom clamp on both channels
    let lpL = 0;
    let lpR = 0;
    for (let i = 0; i < total; i++) {
      lpL += (left[i] - lpL) * 0.34;
      lpR += (right[i] - lpR) * 0.34;
      left[i] = Math.max(-0.62, Math.min(0.62, lpL * 1.12));
      right[i] = Math.max(-0.62, Math.min(0.62, lpR * 1.12));
    }

    this.softRainWavUrl = this.buildStereoPcmWavBlobUrl(left, right, sr);
    return this.softRainWavUrl;
  }

  /**
   * Lazily hooks the looping stereo rain <audio> element into a Web Audio 3D spatial chain:
   * MediaElementAudioSource -> Lowpass BiquadFilter (indoor wall/roof muffle) -> StereoPanner (courtyard direction) -> GainNode.
   * Gracefully falls back to direct HTMLAudioElement volume if Web Audio is unavailable.
   */
  private ensureSpatialRainGraph() {
    if (
      this.rainGainNode ||
      this.rainSpatialGraphFailed ||
      !this.softRainAudio ||
      typeof window === 'undefined'
    ) {
      return;
    }
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) {
        this.rainSpatialGraphFailed = true;
        return;
      }
      if (!globalAudioCtx) {
        globalAudioCtx = new AudioCtx();
      }
      const ctx = globalAudioCtx;
      const source = ctx.createMediaElementSource(this.softRainAudio);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 6400;
      filter.Q.value = 0.65;

      const gain = ctx.createGain();
      gain.gain.value = 0.0;

      if (typeof ctx.createStereoPanner === 'function') {
        const panner = ctx.createStereoPanner();
        panner.pan.value = 0;
        source.connect(filter);
        filter.connect(panner);
        panner.connect(gain);
        this.rainPannerNode = panner;
      } else {
        source.connect(filter);
        filter.connect(gain);
      }
      gain.connect(ctx.destination);

      // With GainNode managing output smoothly, keep underlying media element at unity gain
      this.softRainAudio.volume = 1.0;
      this.rainSourceNode = source;
      this.rainFilterNode = filter;
      this.rainGainNode = gain;
    } catch {
      this.rainSpatialGraphFailed = true;
    }
  }

  /**
   * Updates the subtle, looping 3D spatial rain track using continuous proximity to open
   * courtyards / doorways / windows vs. covered interior areas, plus listener stereo orientation.
   */
  public updateSpatialStormRain(
    sample: StormRainAcousticSample,
    active: boolean,
  ) {
    this.stormRainActive = active && this.gameplayAudioEnabled;
    this.lastRainOutdoorFactor = Math.max(0, Math.min(1, sample.exposure));
    this.lastRainIndoorMuffle = Math.max(0, Math.min(1, sample.indoorMuffle));
    this.lastRainPan = Math.max(-0.85, Math.min(0.85, sample.pan));
    this.lastRainFacingClarity = Math.max(0, Math.min(1, sample.facingClarity));
    this.lastRainWindGust = Math.max(0, Math.min(1.2, sample.windGust));
    this.lastRainStormFade = Math.max(0, Math.min(1, sample.stormFade));

    if (
      !this.stormRainActive ||
      this.muted ||
      this.muteAll ||
      this.lastRainOutdoorFactor * this.lastRainStormFade <= 0.012 ||
      this.effectiveMusicVolume <= 0.005 ||
      typeof window === 'undefined' ||
      typeof Audio === 'undefined'
    ) {
      this.stopStormRainAudio();
      return;
    }

    try {
      const wavUrl = this.ensureSpatialRainWavUrl();
      if (!wavUrl) return;
      if (!this.softRainAudio) {
        this.softRainAudio = new Audio(wavUrl);
        this.softRainAudio.loop = true;
        this.softRainAudio.preload = 'auto';
      }
      this.ensureSpatialRainGraph();

      if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
        void globalAudioCtx.resume().catch(() => {});
      }

      this.syncStormRainVolume();
      if (this.softRainAudio.paused) {
        void this.softRainAudio.play().catch(() => {});
      }
    } catch {
      // Ignore autoplay / audio errors
    }
  }

  /**
   * Backward-compatible scalar updater for storm rain audio.
   */
  public updateStormRainAudio(outdoorFactor: number, active: boolean) {
    const clamped = Math.max(0, Math.min(1, outdoorFactor));
    this.updateSpatialStormRain(
      {
        exposure: clamped,
        indoorMuffle: 1 - clamped,
        pan: 0,
        facingClarity: 0.75,
        windGust: 0.5,
        stormFade: 1.0,
      },
      active,
    );
  }

  private syncStormRainVolume() {
    if (!this.softRainAudio) return;
    const effectiveExposure =
      this.lastRainOutdoorFactor * this.lastRainStormFade;
    if (
      !this.stormRainActive ||
      !this.gameplayAudioEnabled ||
      this.muted ||
      this.muteAll ||
      effectiveExposure <= 0.012 ||
      this.effectiveMusicVolume <= 0.005
    ) {
      this.stopStormRainAudio();
      return;
    }

    // Subtle monsoon swell tied to storm gusts (0.90..1.10) & facing-the-courtyard clarity
    const gustMod = 0.9 + Math.min(1, this.lastRainWindGust) * 0.2;
    const facingMod = 0.9 + this.lastRainFacingClarity * 0.14;
    // Subtle maximum gain: ~0.20 outdoors in open courtyards, smoothly tapering down to ~0.028 deep indoors
    const targetGain = Math.max(
      0,
      Math.min(
        0.22,
        this.effectiveMusicVolume *
          0.2 *
          effectiveExposure *
          gustMod *
          facingMod,
      ),
    );

    if (
      this.rainGainNode &&
      this.rainFilterNode &&
      globalAudioCtx &&
      globalAudioCtx.state === 'running'
    ) {
      const now = globalAudioCtx.currentTime;
      // Exponentially map indoorMuffle (0 open sky -> 0.95 deep stone walls) to cutoff frequency (6800 Hz -> 460 Hz)
      const muffleCurve = Math.max(
        0,
        Math.min(1, this.lastRainIndoorMuffle - (this.lastRainFacingClarity - 0.5) * 0.1),
      );
      const targetCutoff = 460 * Math.pow(6800 / 460, 1 - muffleCurve);
      this.rainFilterNode.frequency.setTargetAtTime(targetCutoff, now, 0.12);
      if (this.rainPannerNode) {
        this.rainPannerNode.pan.setTargetAtTime(this.lastRainPan, now, 0.09);
      }
      this.rainGainNode.gain.setTargetAtTime(targetGain, now, 0.14);
      this.smoothedRainGain = targetGain;
    } else {
      // Smooth fallback when Web Audio graph isn't active yet
      this.smoothedRainGain += (targetGain - this.smoothedRainGain) * 0.18;
      this.softRainAudio.volume = Math.max(
        0,
        Math.min(0.22, this.smoothedRainGain),
      );
    }
  }

  public stopStormRainAudio() {
    this.smoothedRainGain = 0;
    if (this.rainGainNode && globalAudioCtx) {
      try {
        const now = globalAudioCtx.currentTime;
        this.rainGainNode.gain.cancelScheduledValues(now);
        this.rainGainNode.gain.setTargetAtTime(0, now, 0.04);
      } catch {
        // Ignore
      }
    }
    if (!this.softRainAudio) return;
    try {
      if (!this.softRainAudio.paused) {
        this.softRainAudio.pause();
      }
    } catch {
      // Ignore
    }
  }

  public stopRoomAmbientDrone() {}

  public updateRoomAmbientTone(_targetFreq: number) {}

  public updateCorridorWhispers(
    _isInCorridor: boolean,
    _playerPos: THREE.Vector3,
    _cameraForward: THREE.Vector3,
    _cameraRight: THREE.Vector3,
    _witchProximity = 0,
  ) {}

  public triggerRearCorridorWhisper(
    _playerPos: THREE.Vector3,
    _cameraForward: THREE.Vector3,
    _cameraRight: THREE.Vector3,
    _witchProximity = 0,
  ) {}

  public playKulhadPickup() {}

  public playKulhadShatterDistraction() {}

  /**
   * Plays Rukmini's painful scream when Watchman Baba's Blessed Bhabhut hits her face.
   */
  public playRukminiBhabhutScream(): Promise<void> {
    return this.speakSequenceUtterance('मेरी आंखें जल रही हैं!', 'rukmini', {
      rateMultiplier: 1.08,
      volumeScale: 1.0,
      cancelPrevious: true,
      maxWaitMs: 4200,
      speakerName: 'रुक्मिणी',
    });
  }

  /**
   * Plays Rukmini's angry echoing Hindi warning each time a cursed relic is burned in the well.
   */
  public async playRukminiRelicBurnWarning(burnedCount: number): Promise<void> {
    const rate = burnedCount >= 3 ? 1.06 : 1.0;
    await this.speakSequenceUtterance(
      'तुम मेरी निशानियां जलाकर बच नहीं पाओगे!',
      'rukmini',
      {
        rateMultiplier: rate,
        volumeScale: 1.0,
        cancelPrevious: true,
        maxWaitMs: 4800,
        speakerName: 'रुक्मिणी',
      },
    );
    // Soft echoing whispered beat without any oscillator or noise buffer
    await this.speakSequenceUtterance('...बच नहीं पाओगे!', 'rukmini', {
      rateMultiplier: 0.94,
      volumeScale: 0.42,
      cancelPrevious: false,
      maxWaitMs: 2400,
      speakerName: 'रुक्मिणी',
    });
  }

  /**
   * Plays Rukmini's final echoing warning and banishment cry when 4/4 relics are burned.
   */
  public playRukminiBanishmentScream(): Promise<void> {
    return this.speakSequenceUtterance(
      'तुम मेरी निशानियां जलाकर बच नहीं पाओगे... नहीं!! मेरा अभिशाप भस्म हो रहा है!!',
      'rukmini',
      {
        rateMultiplier: 1.05,
        volumeScale: 1.0,
        cancelPrevious: true,
        maxWaitMs: 5800,
        speakerName: 'रुक्मिणी',
      },
    );
  }

  /**
   * Plays a rescued friend's grateful Hindi line right after unchaining them.
   */
  public playFriendThankYou(
    friendId: 'kabir' | 'riya' | 'dev',
    isFirstRescued: boolean,
  ): Promise<void> {
    const voiceMap: Record<'kabir' | 'riya' | 'dev', VNSpeakerVoice> = {
      kabir: 'kabir',
      riya: 'riya',
      dev: 'dev',
    };
    const speakerNameMap: Record<'kabir' | 'riya' | 'dev', string> = {
      kabir: 'कबीर',
      riya: 'रिया',
      dev: 'देव',
    };
    const line = isFirstRescued
      ? friendId === 'riya'
        ? 'शुक्रिया! तुमने मेरी जान बचा ली! मेरे पास एक छोटी टॉर्च है, मैं पीछे से तुम्हारे साथ रहकर रास्ता दिखाऊँगी!'
        : 'धन्यवाद भाई! तुमने मेरी जान बचा ली! मेरे पास ये टॉर्च है, मैं तुम्हारे पीछे चलकर गलियारा रोशन रखूँगा!'
      : friendId === 'riya'
        ? 'बहुत-बहुत शुक्रिया! मैं चुपचाप तुम्हारे पीछे चलूँगी और रुक्मिणी के पास आने पर आगाह कर दूँगी!'
        : 'शुक्रिया भाई! मैं भी चुपचाप तुम्हारे पीछे आ रहा हूँ, अब सब मिलकर बच निकलेंगे!';
    return this.speakSequenceUtterance(line, voiceMap[friendId], {
      rateMultiplier: 1.0,
      volumeScale: 0.92,
      cancelPrevious: true,
      maxWaitMs: 4800,
      speakerName: speakerNameMap[friendId],
    });
  }

  /**
   * Whispers an urgent Hindi warning when Rukmini comes within 16m of the group.
   */
  public playFriendWhisperWarning(
    friendId: 'kabir' | 'riya' | 'dev',
  ): Promise<void> {
    const voiceMap: Record<'kabir' | 'riya' | 'dev', VNSpeakerVoice> = {
      kabir: 'kabir',
      riya: 'riya',
      dev: 'dev',
    };
    const speakerNameMap: Record<'kabir' | 'riya' | 'dev', string> = {
      kabir: 'कबीर',
      riya: 'रिया',
      dev: 'देव',
    };
    return this.speakSequenceUtterance(
      'चुप! पायल की आवाज़ पास आ रही है, जल्दी छुपो!',
      voiceMap[friendId],
      {
        rateMultiplier: 1.04,
        volumeScale: 0.52,
        cancelPrevious: false,
        maxWaitMs: 3800,
        speakerName: speakerNameMap[friendId],
      },
    );
  }

  private glassCrunchWavUrl: string | null = null;
  private mirrorFlashWavUrl: string | null = null;
  private captureJumpscareWavUrl: string | null = null;
  private victorySunriseWavUrl: string | null = null;

  /**
   * Plays the 2.5s Witch Capture Jumpscare sting (PCM WAV) + Rukmini's terrifying Hindi line:
   * "तेरी रूह अब इस हवेली की गुलाम है!"
   */
  public playWitchCaptureJumpscare() {
    if (!this.muted && this.masterVolume > 0 && typeof Audio !== 'undefined') {
      try {
        if (!this.captureJumpscareWavUrl) {
          const sr = 22050;
          const duration = 1.35;
          const total = Math.floor(sr * duration);
          const pcm = new Float32Array(total);
          let seed = 4099;
          for (let i = 0; i < total; i++) {
            const t = i / sr;
            seed = (seed * 1664525 + 1013904223) >>> 0;
            const rand = (seed / 0xffffffff) * 2 - 1;
            const impactEnv = Math.exp(-t * 4.2) * Math.min(1, t / 0.012);
            const stingEnv = Math.exp(-t * 2.1) * Math.min(1, t / 0.025);
            const subSlam = Math.sin(2 * Math.PI * (78 - 32 * Math.min(1, t * 3)) * t) * 0.65;
            const dissonance =
              Math.sin(2 * Math.PI * 523.25 * t) * 0.34 +
              Math.sin(2 * Math.PI * 554.37 * t) * 0.34 +
              Math.sin(2 * Math.PI * 740.0 * t) * 0.28 +
              Math.sin(2 * Math.PI * 1108.7 * t) * 0.22;
            const hiss = rand * 0.32 * impactEnv;
            pcm[i] = Math.max(
              -0.96,
              Math.min(0.96, (subSlam * impactEnv + dissonance * stingEnv + hiss) * 0.85),
            );
          }
          this.captureJumpscareWavUrl = this.buildPcmWavBlobUrl(pcm, sr);
        }
        if (this.captureJumpscareWavUrl && this.effectiveSfxVolume > 0.005) {
          const audio = new Audio(this.captureJumpscareWavUrl);
          const jumpScale = Math.max(0.35, this.jumpscareIntensity);
          audio.volume = Math.max(0.1, Math.min(1.0, this.effectiveSfxVolume * jumpScale));
          void audio.play().catch(() => {});
        }
      } catch {
        // Ignore audio playback errors
      }
    }

    void this.speakSequenceUtterance(
      'तेरी रूह अब इस हवेली की गुलाम है!',
      'rukmini',
      {
        rateMultiplier: 1.0,
        volumeScale: 1.0,
        cancelPrevious: true,
        maxWaitMs: 2600,
        speakerName: 'रुक्मिणी',
      },
    );
  }

  /**
   * Plays a warm dawn chord + relieved escape voice line during the 10-second victory cutscene.
   */
  public playVictorySunriseCue() {
    if (!this.muted && this.masterVolume > 0 && typeof Audio !== 'undefined') {
      try {
        if (!this.victorySunriseWavUrl) {
          const sr = 22050;
          const duration = 2.8;
          const total = Math.floor(sr * duration);
          const pcm = new Float32Array(total);
          // Warm C-major-9 sunrise chime/pad chord (261.63, 329.63, 392.00, 493.88, 587.33 Hz)
          const freqs = [261.63, 329.63, 392.0, 493.88, 587.33];
          for (let i = 0; i < total; i++) {
            const t = i / sr;
            const env =
              Math.sin(Math.min(1, t / 0.35) * (Math.PI / 2)) *
              Math.exp(-Math.max(0, t - 0.35) * 0.95);
            let sum = 0;
            for (let f = 0; f < freqs.length; f++) {
              sum += Math.sin(2 * Math.PI * freqs[f] * t) * (0.24 / (1 + f * 0.25));
            }
            pcm[i] = Math.max(-0.92, Math.min(0.92, sum * env * 0.95));
          }
          this.victorySunriseWavUrl = this.buildPcmWavBlobUrl(pcm, sr);
        }
        if (this.victorySunriseWavUrl && this.effectiveMusicVolume > 0.005) {
          const audio = new Audio(this.victorySunriseWavUrl);
          audio.volume = Math.max(0.1, Math.min(0.9, this.effectiveMusicVolume * 0.72));
          void audio.play().catch(() => {});
        }
      } catch {
        // Ignore audio playback errors
      }
    }

    void this.speakSequenceUtterance(
      'हम बच गए! वो देखो गांव के ऊपर सूरज निकल रहा है—चलो गाड़ी में बैठकर यहां से निकलें!',
      'rahul',
      {
        rateMultiplier: 1.0,
        volumeScale: 0.95,
        cancelPrevious: true,
        maxWaitMs: 6500,
        speakerName: 'आरव',
      },
    );
  }

  private buildPcmWavBlobUrl(samples: Float32Array, sampleRate = 22050): string | null {
    if (typeof window === 'undefined' || typeof Blob === 'undefined') return null;
    const dataLength = samples.length * 2;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    const writeStr = (offset: number, s: string) => {
      for (let i = 0; i < s.length; i++) {
        view.setUint8(offset + i, s.charCodeAt(i));
      }
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, dataLength, true);
    let idx = 44;
    for (let i = 0; i < samples.length; i++) {
      const clamped = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(idx, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
      idx += 2;
    }
    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  private buildStereoPcmWavBlobUrl(
    left: Float32Array,
    right: Float32Array,
    sampleRate = 22050,
  ): string | null {
    if (typeof window === 'undefined' || typeof Blob === 'undefined') return null;
    const frames = Math.min(left.length, right.length);
    const dataLength = frames * 4; // 2 channels * 16-bit (2 bytes)
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    const writeStr = (offset: number, s: string) => {
      for (let i = 0; i < s.length; i++) {
        view.setUint8(offset + i, s.charCodeAt(i));
      }
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 2, true); // Stereo (2 channels)
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 4, true); // ByteRate = sr * 2ch * 2bytes
    view.setUint16(32, 4, true); // BlockAlign = 2ch * 2bytes
    view.setUint16(34, 16, true); // BitsPerSample
    writeStr(36, 'data');
    view.setUint32(40, dataLength, true);
    let idx = 44;
    for (let i = 0; i < frames; i++) {
      const cL = Math.max(-1, Math.min(1, left[i]));
      const cR = Math.max(-1, Math.min(1, right[i]));
      view.setInt16(idx, cL < 0 ? cL * 0x8000 : cL * 0x7fff, true);
      idx += 2;
      view.setInt16(idx, cR < 0 ? cR * 0x8000 : cR * 0x7fff, true);
      idx += 2;
    }
    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  /**
   * Plays a sharp, crisp glass-crunch + dry-leaf crackle sound when the player
   * walks/sprints over broken red bridal bangles without crouching.
   */
  public playGlassBanglesCrunch() {
    if (this.muted || this.masterVolume <= 0 || typeof Audio === 'undefined') {
      return;
    }
    try {
      if (!this.glassCrunchWavUrl) {
        const sr = 22050;
        const duration = 0.44;
        const total = Math.floor(sr * duration);
        const pcm = new Float32Array(total);
        // Three rapid brittle glass-shard snap clusters + dry leaf crackle
        const bursts = [
          { start: 0.0, dur: 0.09, amp: 0.95, pitchBase: 2650 },
          { start: 0.065, dur: 0.11, amp: 0.88, pitchBase: 3420 },
          { start: 0.155, dur: 0.14, amp: 0.72, pitchBase: 4180 },
          { start: 0.25, dur: 0.16, amp: 0.42, pitchBase: 2980 },
        ];
        let seed = 1337;
        for (let i = 0; i < total; i++) {
          const t = i / sr;
          seed = (seed * 1664525 + 1013904223) >>> 0;
          const rand = (seed / 0xffffffff) * 2 - 1;
          let v = 0;
          for (let b = 0; b < bursts.length; b++) {
            const bt = t - bursts[b].start;
            if (bt >= 0 && bt <= bursts[b].dur) {
              const env = Math.exp(-bt * 34) * (1 - Math.exp(-bt * 450));
              const ring =
                Math.sin(2 * Math.PI * bursts[b].pitchBase * bt) * 0.42 +
                Math.sin(2 * Math.PI * (bursts[b].pitchBase * 1.47) * bt) * 0.34;
              const snap = Math.abs(rand) > 0.62 ? rand * 0.85 : rand * 0.25;
              v += (ring + snap) * env * bursts[b].amp;
            }
          }
          pcm[i] = Math.max(-0.96, Math.min(0.96, v * 0.85));
        }
        this.glassCrunchWavUrl = this.buildPcmWavBlobUrl(pcm, sr);
      }
      if (!this.glassCrunchWavUrl || this.effectiveSfxVolume <= 0.005) return;
      const audio = new Audio(this.glassCrunchWavUrl);
      audio.volume = Math.max(0.1, Math.min(1.0, this.effectiveSfxVolume * 0.92));
      void audio.play().catch(() => {});
    } catch {
      // Ignore audio playback errors
    }
  }

  /**
   * Plays a brief icy glass-shimmer gasp cue when Rukmini's reflection flashes in a mirror.
   */
  public playMirrorGhostFlash() {
    if (this.muted || this.masterVolume <= 0 || typeof Audio === 'undefined') {
      return;
    }
    try {
      if (!this.mirrorFlashWavUrl) {
        const sr = 22050;
        const duration = 0.55;
        const total = Math.floor(sr * duration);
        const pcm = new Float32Array(total);
        let seed = 9001;
        for (let i = 0; i < total; i++) {
          const t = i / sr;
          seed = (seed * 1664525 + 1013904223) >>> 0;
          const rand = (seed / 0xffffffff) * 2 - 1;
          const env = Math.sin(Math.min(1, t / 0.08) * (Math.PI / 2)) * Math.exp(-t * 4.8);
          const shimmer =
            Math.sin(2 * Math.PI * 1180 * t) * 0.28 +
            Math.sin(2 * Math.PI * 1760 * t) * 0.18 +
            Math.sin(2 * Math.PI * 590 * t) * 0.22;
          pcm[i] = (shimmer + rand * 0.14) * env * 0.55;
        }
        this.mirrorFlashWavUrl = this.buildPcmWavBlobUrl(pcm, sr);
      }
      if (!this.mirrorFlashWavUrl || this.effectiveSfxVolume <= 0.005) return;
      const audio = new Audio(this.mirrorFlashWavUrl);
      audio.volume = Math.max(0.08, Math.min(0.85, this.effectiveSfxVolume * 0.65));
      void audio.play().catch(() => {});
    } catch {
      // Ignore audio playback errors
    }
  }
}

