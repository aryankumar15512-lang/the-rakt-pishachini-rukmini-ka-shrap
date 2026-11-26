import * as xb from 'xrblocks';
import { RaktPishachiniGame } from './RaktPishachiniGame.ts';
import {
  CINEMATIC_SCENES,
  LanguageCode,
  VN_STORY_SCENES,
} from './storyData.ts';
import {
  CinematicCutsceneDirector,
  CutsceneId,
} from './cinematicCutsceneDirector.ts';
import { VisualNovelIntroDirector } from './visualNovelDirector.ts';
import { CompactMiniRadar, HaveliMiniMap3D } from './minimap3d.ts';
import type { MansionBuildResult } from './mansionWorld.ts';
import {
  applyControlsModeToBody,
  ControlsMode,
  HudLayoutEditorController,
  HudPresetId,
  isMobileControlsActive,
  loadControlsMode,
  saveControlsMode,
} from './hudLayoutEditor.ts';
import { HorrorLobbyScene3D } from './lobbyScene3d.ts';

// Guard setPointerCapture & releasePointerCapture against InvalidStateError when Pointer Lock is active
if (typeof Element !== 'undefined') {
  const origSetPointerCapture = Element.prototype.setPointerCapture;
  if (origSetPointerCapture) {
    Element.prototype.setPointerCapture = function (pointerId: number) {
      if (document.pointerLockElement) return;
      try {
        origSetPointerCapture.call(this, pointerId);
      } catch {
        // Ignore InvalidStateError when Pointer Lock is active or pointer is inactive
      }
    };
  }
  const origReleasePointerCapture = Element.prototype.releasePointerCapture;
  if (origReleasePointerCapture) {
    Element.prototype.releasePointerCapture = function (pointerId: number) {
      try {
        origReleasePointerCapture.call(this, pointerId);
      } catch {
        // Ignore InvalidStateError when pointer capture was skipped
      }
    };
  }
}

function readFileAsBase64(
  file: File,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve({ base64, mimeType: file.type || 'image/png' });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const game = new RaktPishachiniGame();

  // DOM References
  const menuScreen = document.getElementById('menu-screen')!;
  const storyScreen = document.getElementById('story-screen')!;
  const hud = document.getElementById('hud')!;
  const menuStatusNotice = document.getElementById('menu-status-notice')!;
  const continueGameBtn = document.getElementById('continue-game-btn')!;
  const newGameBtn = document.getElementById('new-game-btn')!;
  const openOptionsBtn = document.getElementById('open-options-btn')!;
  const exitGameBtn = document.getElementById('exit-game-btn')!;

  // Options Modal DOM References
  const optionsModal = document.getElementById('options-modal')!;
  const gfxQualitySelect = document.getElementById(
    'gfx-quality',
  ) as HTMLSelectElement;
  const fpsSettingSelect = document.getElementById(
    'fps-setting',
  ) as HTMLSelectElement;
  const audioVolInput = document.getElementById(
    'audio-vol',
  ) as HTMLInputElement;
  const audioVolLabel = document.getElementById('audio-vol-label')!;
  const jumpscareIntensityInput = document.getElementById(
    'jumpscare-intensity',
  ) as HTMLInputElement;
  const jumpscareIntensityLabel = document.getElementById(
    'jumpscare-intensity-label',
  )!;
  const testJumpscareBtn = document.getElementById(
    'test-jumpscare-btn',
  ) as HTMLButtonElement;
  const optionsLightningFlash = document.getElementById(
    'options-lightning-flash',
  )!;
  const controlsModeSelect = document.getElementById(
    'controls-mode-setting',
  ) as HTMLSelectElement | null;
  const optionsCustomHudBtn = document.getElementById(
    'options-custom-hud-btn',
  ) as HTMLButtonElement | null;
  const pauseCustomHudBtn = document.getElementById(
    'pause-custom-hud-btn',
  ) as HTMLButtonElement | null;
  const closeOptionsBtn = document.getElementById('close-options-btn')!;

  let vnDirector!: VisualNovelIntroDirector;
  let testFlashTimer = 0;

  const langSelect = document.getElementById(
    'lang-select',
  ) as HTMLSelectElement;
  const playerNameInput = document.getElementById(
    'player-name',
  ) as HTMLInputElement;
  const playerNameErrorEl = document.getElementById('player-name-error')!;
  const roomCodeInput = document.getElementById(
    'room-code-input',
  ) as HTMLInputElement;

  const createRoomBtn = document.getElementById('create-room-btn')!;
  const joinRoomBtn = document.getElementById('join-room-btn')!;

  const PLAYER_NAME_STORAGE_KEY = 'rakt_pishachini_player_name';
  const SETTINGS_STORAGE_KEY = 'rakt_pishachini_game_settings';
  const JUMPSCARE_INTENSITY_STORAGE_KEY = 'rakt_pishachini_jumpscare_intensity';

  const parseSliderPercent = (
    raw: string | number | null | undefined,
    fallback = 100,
  ): number => {
    if (raw === null || raw === undefined || raw === '') return fallback;
    const num = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(num)
      ? Math.max(0, Math.min(100, Math.round(num)))
      : fallback;
  };

  const unlockAndStartMenuAmbience = () => {
    if (game.gameState === 'playing') {
      game.resumeSpatialAudio();
    } else {
      game.synth.setGameplayAudioEnabled(false);
    }
  };

  // Unlock global AudioContext immediately on any click/pointerdown/keydown anywhere on document
  const unlockGlobalAudioOnInteraction = () => {
    unlockAndStartMenuAmbience();
    if (vnDirector?.isPlaying) {
      vnDirector.ensureSpeechUnlocked();
    }
  };
  document.addEventListener('pointerdown', unlockGlobalAudioOnInteraction, {
    capture: true,
  });
  document.addEventListener('click', unlockGlobalAudioOnInteraction, {
    capture: true,
  });
  document.addEventListener('touchstart', unlockGlobalAudioOnInteraction, {
    capture: true,
  });
  document.addEventListener('keydown', unlockGlobalAudioOnInteraction, {
    capture: true,
  });
  menuScreen.addEventListener('click', unlockAndStartMenuAmbience);

  let menuNoticeTimer = 0;
  const showMenuNotice = (msg: string) => {
    menuStatusNotice.textContent = msg;
    menuStatusNotice.classList.remove('hidden');
    if (menuNoticeTimer) {
      window.clearTimeout(menuNoticeTimer);
    }
    menuNoticeTimer = window.setTimeout(() => {
      menuStatusNotice.classList.add('hidden');
      menuNoticeTimer = 0;
    }, 3400);
  };

  let showFpsCounter = false;
  let shadowsEnabled = true;
  let brightnessPercent = 100;
  let minimapMode: 'north_up' | 'rotating' = 'north_up';
  let notchScreenEnabled = true;
  let autoSprintBtnEnabled = true;
  let crosshairType: 'dot' | 'classic' = 'dot';
  let musicVolume = 85;
  let sfxVolume = 100;
  let dialogueVolume = 100;
  let muteAll = false;
  let characterVoicesEnabled = true;
  let compactMiniRadar: CompactMiniRadar | null = null;
  let lobbyScene3D: HorrorLobbyScene3D | null = null;
  let syncLobbyContinueVisibility = () => {};
  let syncProfileUI = () => {};
  let syncBadgesUI = () => {};
  let syncMailDotUI = () => {};
  let syncHudPresetCards = () => {};
  let openLobbySettingsModal = () => {};

  const applyDisplayAndControlToggles = () => {
    document.body.classList.toggle('autosprint-disabled', !autoSprintBtnEnabled);
    document.body.classList.toggle('notch-safe-off', !notchScreenEnabled);
    document
      .getElementById('center-crosshair')
      ?.classList.toggle('crosshair-classic', crosshairType === 'classic');
    if (compactMiniRadar) {
      compactMiniRadar.rotationMode = minimapMode;
    }
  };

  const applyAndSaveGameSettings = () => {
    const quality =
      (gfxQualitySelect.value as 'ultra' | 'high' | 'medium' | 'low') || 'high';
    const fps = Number(fpsSettingSelect.value || 60);
    const vol = parseSliderPercent(audioVolInput.value, 100);
    const jumpscareIntensity = parseSliderPercent(
      jumpscareIntensityInput?.value,
      80,
    );

    audioVolInput.value = String(vol);
    audioVolLabel.textContent = `${vol}%`;
    if (jumpscareIntensityInput) {
      jumpscareIntensityInput.value = String(jumpscareIntensity);
    }
    if (jumpscareIntensityLabel) {
      jumpscareIntensityLabel.textContent = `${jumpscareIntensity}%`;
    }

    game.synth.setMasterVolume(vol);
    game.synth.setMusicVolume(musicVolume);
    game.synth.setSfxVolume(sfxVolume);
    game.synth.setDialogueVolume(dialogueVolume);
    game.synth.setMuteAll(muteAll);
    game.synth.setCharacterVoicesEnabled(characterVoicesEnabled);
    game.synth.setJumpscareIntensity(jumpscareIntensity);
    vnDirector?.setJumpscareIntensity(jumpscareIntensity);
    game.applyGraphicsSettings(quality, fps, shadowsEnabled);
    game.setBrightness(brightnessPercent);
    lobbyScene3D?.applyQualityPreset(quality, shadowsEnabled);
    lobbyScene3D?.setBrightness(brightnessPercent);
    lobbyScene3D?.setTargetFps(fps);
    applyDisplayAndControlToggles();

    try {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          quality,
          fps,
          vol,
          musicVolume,
          sfxVolume,
          dialogueVolume,
          muteAll,
          characterVoicesEnabled,
          shadowsEnabled,
          brightnessPercent,
          minimapMode,
          notchScreenEnabled,
          autoSprintBtnEnabled,
          crosshairType,
          jumpscareIntensity,
          sensitivity: game.cameraSensitivity,
          showFps: showFpsCounter,
          lang: game.lang,
        }),
      );
      localStorage.setItem(
        JUMPSCARE_INTENSITY_STORAGE_KEY,
        String(jumpscareIntensity),
      );
    } catch {
      // Ignore storage write errors
    }
  };

  const loadSavedSettingsFromStorage = () => {
    try {
      const savedPlayerName = localStorage.getItem(PLAYER_NAME_STORAGE_KEY);
      if (savedPlayerName && savedPlayerName.trim().length > 0) {
        playerNameInput.value = savedPlayerName.trim();
        game.playerName = savedPlayerName.trim();
      } else {
        const defaultName = playerNameInput.value.trim() || 'Aarav';
        playerNameInput.value = defaultName;
        game.playerName = defaultName;
      }

      let loadedJumpscare: number | null = null;
      const standaloneJumpscare = localStorage.getItem(
        JUMPSCARE_INTENSITY_STORAGE_KEY,
      );
      if (standaloneJumpscare !== null && standaloneJumpscare !== '') {
        loadedJumpscare = parseSliderPercent(standaloneJumpscare, 80);
      }

      const rawSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings) as {
          quality?: 'ultra' | 'high' | 'medium' | 'low';
          fps?: number;
          vol?: number;
          musicVolume?: number;
          sfxVolume?: number;
          dialogueVolume?: number;
          muteAll?: boolean;
          characterVoicesEnabled?: boolean;
          shadowsEnabled?: boolean;
          brightnessPercent?: number;
          minimapMode?: 'north_up' | 'rotating';
          notchScreenEnabled?: boolean;
          autoSprintBtnEnabled?: boolean;
          crosshairType?: 'dot' | 'classic';
          jumpscareIntensity?: number;
          sensitivity?: number;
          showFps?: boolean;
          lang?: LanguageCode;
        };
        if (parsed.quality) gfxQualitySelect.value = parsed.quality;
        if (parsed.fps) fpsSettingSelect.value = String(parsed.fps);
        if (typeof parsed.vol === 'number') {
          const cleanVol = parseSliderPercent(parsed.vol, 100);
          audioVolInput.value = String(cleanVol);
          audioVolLabel.textContent = `${cleanVol}%`;
        }
        if (typeof parsed.musicVolume === 'number') {
          musicVolume = parseSliderPercent(parsed.musicVolume, 85);
        }
        if (typeof parsed.sfxVolume === 'number') {
          sfxVolume = parseSliderPercent(parsed.sfxVolume, 100);
        }
        if (typeof parsed.dialogueVolume === 'number') {
          dialogueVolume = parseSliderPercent(parsed.dialogueVolume, 100);
        }
        if (typeof parsed.muteAll === 'boolean') {
          muteAll = parsed.muteAll;
        }
        if (typeof parsed.characterVoicesEnabled === 'boolean') {
          characterVoicesEnabled = parsed.characterVoicesEnabled;
        }
        if (typeof parsed.shadowsEnabled === 'boolean') {
          shadowsEnabled = parsed.shadowsEnabled;
        }
        if (
          typeof parsed.brightnessPercent === 'number' &&
          Number.isFinite(parsed.brightnessPercent)
        ) {
          brightnessPercent = Math.max(
            80,
            Math.min(150, Math.round(parsed.brightnessPercent)),
          );
        }
        if (
          parsed.minimapMode === 'north_up' ||
          parsed.minimapMode === 'rotating'
        ) {
          minimapMode = parsed.minimapMode;
        }
        if (typeof parsed.notchScreenEnabled === 'boolean') {
          notchScreenEnabled = parsed.notchScreenEnabled;
        }
        if (typeof parsed.autoSprintBtnEnabled === 'boolean') {
          autoSprintBtnEnabled = parsed.autoSprintBtnEnabled;
        }
        if (
          parsed.crosshairType === 'dot' ||
          parsed.crosshairType === 'classic'
        ) {
          crosshairType = parsed.crosshairType;
        }
        if (typeof parsed.jumpscareIntensity === 'number') {
          loadedJumpscare = parseSliderPercent(parsed.jumpscareIntensity, 80);
        }
        if (
          typeof parsed.sensitivity === 'number' &&
          Number.isFinite(parsed.sensitivity) &&
          parsed.sensitivity > 0
        ) {
          game.cameraSensitivity = Math.max(0.15, Math.min(2.0, parsed.sensitivity));
        } else {
          game.cameraSensitivity = 1.0;
        }
        if (typeof parsed.showFps === 'boolean') {
          showFpsCounter = parsed.showFps;
        }
        if (parsed.lang === 'hi' || parsed.lang === 'en') {
          game.lang = parsed.lang;
          langSelect.value = parsed.lang;
        }
      }

      if (loadedJumpscare !== null) {
        jumpscareIntensityInput.value = String(loadedJumpscare);
        jumpscareIntensityLabel.textContent = `${loadedJumpscare}%`;
      }

      const savedControlsMode = loadControlsMode();
      game.controlsMode = savedControlsMode;
      applyControlsModeToBody(savedControlsMode);
      if (controlsModeSelect) {
        controlsModeSelect.value = savedControlsMode;
      }
    } catch {
      // Ignore storage access errors in restricted environments
    }
  };

  loadSavedSettingsFromStorage();
  applyAndSaveGameSettings();

  const applyControlsMode = (mode: ControlsMode) => {
    game.controlsMode = mode;
    saveControlsMode(mode);
    applyControlsModeToBody(mode);
    if (controlsModeSelect) {
      controlsModeSelect.value = mode;
    }
    document
      .querySelectorAll<HTMLButtonElement>('#ig-controls-mode-group .ig-seg-btn')
      .forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.ctrlMode === mode);
      });
    if (isMobileControlsActive(mode)) {
      game.releaseGamePointerLock();
    }
  };

  controlsModeSelect?.addEventListener('change', () => {
    const val = controlsModeSelect.value;
    if (val === 'auto' || val === 'pc' || val === 'mobile') {
      applyControlsMode(val);
    }
  });

  audioVolInput.addEventListener('input', () => {
    const vol = parseSliderPercent(audioVolInput.value, 100);
    audioVolLabel.textContent = `${vol}%`;
    game.synth.setMasterVolume(vol);
  });

  jumpscareIntensityInput.addEventListener('input', () => {
    const intensity = parseSliderPercent(jumpscareIntensityInput.value, 80);
    jumpscareIntensityLabel.textContent = `${intensity}%`;
    game.synth.setJumpscareIntensity(intensity);
    vnDirector?.setJumpscareIntensity(intensity);
  });

  testJumpscareBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const intensity = parseSliderPercent(jumpscareIntensityInput.value, 0);
    game.synth.setJumpscareIntensity(intensity);
    vnDirector?.setJumpscareIntensity(intensity);

    if (testFlashTimer) {
      window.clearTimeout(testFlashTimer);
      testFlashTimer = 0;
    }

    const factor = intensity / 100;
    const durationMs = intensity > 0 ? Math.round(220 + factor * 320) : 260;

    // Show 'Testing...' label and active color state on button
    testJumpscareBtn.textContent = 'Testing...';
    testJumpscareBtn.classList.add('is-testing');

    if (intensity > 0) {
      // Trigger screen-wide low-impact lightning flash + modal electric glow
      optionsLightningFlash.style.backgroundColor = `rgba(215, 235, 255, ${(0.22 + factor * 0.55).toFixed(2)})`;
      optionsLightningFlash.style.animationDuration = `${durationMs}ms`;
      optionsLightningFlash.classList.remove('hidden', 'flash-active');
      void optionsLightningFlash.offsetWidth;
      optionsLightningFlash.classList.add('flash-active');
      optionsModal.classList.add('lightning-test-glow');

      // Also trigger the Visual Novel canvas/screen flash if story mode is open
      vnDirector?.triggerTestPreviewFlash();
    }

    testFlashTimer = window.setTimeout(() => {
      optionsLightningFlash.classList.remove('flash-active');
      optionsLightningFlash.classList.add('hidden');
      optionsModal.classList.remove('lightning-test-glow');
      testJumpscareBtn.textContent = '⚡ Test Jumpscare';
      testJumpscareBtn.classList.remove('is-testing');
      testFlashTimer = 0;
    }, durationMs);
  });

  openOptionsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    unlockAndStartMenuAmbience();
    openLobbySettingsModal();
  });

  closeOptionsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    applyAndSaveGameSettings();
    optionsModal.classList.add('hidden');
  });

  // Pro-Gaming Drag-and-Drop Custom HUD Layout Editor (accessible from Lobby & In-Game Settings)
  let hudEditorReturnTarget: 'options' | 'pause' | null = null;
  const hudLayoutEditor = new HudLayoutEditorController({
    onOpen: () => {
      game.isHudLayoutEditorOpen = true;
      game.releaseGamePointerLock();
    },
    onClose: (saved) => {
      game.isHudLayoutEditorOpen = false;
      const returnTarget = hudEditorReturnTarget;
      hudEditorReturnTarget = null;
      syncHudPresetCards();
      if (returnTarget === 'options') {
        optionsModal.classList.remove('hidden');
      } else if (returnTarget === 'pause') {
        pauseModal?.classList.remove('hidden');
      }
      if (saved) {
        addChatMessage(
          game.lang === 'hi'
            ? '🎛️ कस्टम HUD लेआउट सहेजा गया।'
            : '🎛️ Custom HUD layout saved.',
        );
      }
    },
  });

  optionsCustomHudBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    hudEditorReturnTarget = 'options';
    optionsModal.classList.add('hidden');
    hudLayoutEditor.open();
  });

  pauseCustomHudBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    hudEditorReturnTarget = 'pause';
    pauseModal?.classList.add('hidden');
    hudLayoutEditor.open();
  });

  // Settings Modal & Player Code & QR & Host Lobby Logic
  const globalSettingsGearBtn = document.getElementById(
    'global-settings-gear-btn',
  )!;
  const settingsModal = document.getElementById('settings-modal')!;
  const closeSettingsModalBtn = document.getElementById(
    'close-settings-modal-btn',
  )!;
  const playerCodeDisplay = document.getElementById('player-code-display')!;
  const regenerateCodeBtn = document.getElementById('regenerate-code-btn')!;
  const copyCodeBtn = document.getElementById('copy-code-btn')!;
  const settingsQrCanvas = document.getElementById(
    'settings-qr-canvas',
  ) as HTMLCanvasElement;
  const settingsLobbySlots = document.getElementById('settings-lobby-slots')!;
  const hostStartMatchBtn = document.getElementById('host-start-match-btn')!;

  const PLAYER_CODE_STORAGE_KEY = 'rakt_pishachini_player_code';

  const getOrGeneratePlayerCode = (): string => {
    let code = localStorage.getItem(PLAYER_CODE_STORAGE_KEY);
    if (!code) {
      const num1 = Math.floor(1000 + Math.random() * 9000);
      const num2 = Math.floor(10 + Math.random() * 90);
      code = `RP-${num1}-${num2}`;
      localStorage.setItem(PLAYER_CODE_STORAGE_KEY, code);
    }
    return code;
  };

  let currentPlayerCode = getOrGeneratePlayerCode();
  playerCodeDisplay.textContent = currentPlayerCode;

  const drawQrCodeOnCanvas = (canvas: HTMLCanvasElement, text: string) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = canvas.width;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#0a0305';

    const drawFinder = (x: number, y: number) => {
      ctx.fillRect(x, y, 32, 32);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 4, y + 4, 24, 24);
      ctx.fillStyle = '#0a0305';
      ctx.fillRect(x + 8, y + 8, 16, 16);
    };
    drawFinder(8, 8);
    drawFinder(size - 40, 8);
    drawFinder(8, size - 40);

    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }

    const cellSize = 8;
    for (let rx = 48; rx < size - 48; rx += cellSize) {
      for (let ry = 8; ry < size - 8; ry += cellSize) {
        const pseudo =
          Math.sin(rx * 12.9898 + ry * 78.233 + hash) * 43758.5453;
        if (pseudo - Math.floor(pseudo) > 0.48) {
          ctx.fillRect(rx, ry, cellSize - 1, cellSize - 1);
        }
      }
    }
    for (let rx = 8; rx < size - 8; rx += cellSize) {
      for (let ry = 48; ry < size - 48; ry += cellSize) {
        const pseudo = Math.sin(rx * 98.238 + ry * 23.14 + hash) * 19842.12;
        if (pseudo - Math.floor(pseudo) > 0.52) {
          ctx.fillRect(rx, ry, cellSize - 1, cellSize - 1);
        }
      }
    }
  };

  const renderSettingsLobbySlots = () => {
    if (!settingsLobbySlots) return;
    settingsLobbySlots.innerHTML = '';
    const slots = [
      {
        name: 'आरव (Aarav)',
        role: 'Torch Bearer (Host 👑)',
        status: 'Ready',
        icon: '🔦',
      },
      {
        name: 'कबीर (Kabir)',
        role: 'Sound Decoy',
        status: 'Waiting...',
        icon: '🔔',
      },
      {
        name: 'रिया (Riya)',
        role: 'Relic Sensor',
        status: 'Waiting...',
        icon: '✨',
      },
      {
        name: 'देव (Dev)',
        role: 'Silent Runner',
        status: 'Waiting...',
        icon: '🤫',
      },
    ];
    slots.forEach((s, idx) => {
      const card = document.createElement('div');
      card.className = idx === 0 ? 'slot-card active' : 'slot-card';
      card.innerHTML = `
        <div class="slot-top">
          <span>${s.icon} ${s.name}</span>
          <span class="slot-status">${s.status}</span>
        </div>
        <div class="slot-role">${s.role}</div>
      `;
      settingsLobbySlots.appendChild(card);
    });
  };

  globalSettingsGearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    unlockAndStartMenuAmbience();
    currentPlayerCode = getOrGeneratePlayerCode();
    playerCodeDisplay.textContent = currentPlayerCode;
    if (settingsQrCanvas) {
      drawQrCodeOnCanvas(settingsQrCanvas, currentPlayerCode);
    }
    renderSettingsLobbySlots();
    settingsModal.classList.remove('hidden');
  });

  closeSettingsModalBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  regenerateCodeBtn.addEventListener('click', () => {
    const num1 = Math.floor(1000 + Math.random() * 9000);
    const num2 = Math.floor(10 + Math.random() * 90);
    currentPlayerCode = `RP-${num1}-${num2}`;
    localStorage.setItem(PLAYER_CODE_STORAGE_KEY, currentPlayerCode);
    playerCodeDisplay.textContent = currentPlayerCode;
    if (settingsQrCanvas) {
      drawQrCodeOnCanvas(settingsQrCanvas, currentPlayerCode);
    }
  });

  copyCodeBtn.addEventListener('click', () => {
    navigator.clipboard?.writeText?.(currentPlayerCode).catch(() => {});
    copyCodeBtn.textContent = 'Copied! ✓';
    window.setTimeout(() => {
      copyCodeBtn.textContent = 'Copy Code';
    }, 2000);
  });

  hostStartMatchBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
    launchDefaultSingleplayerMatch();
  });

  const clearPlayerNameError = () => {
    playerNameInput.classList.remove('input-error');
    playerNameErrorEl.classList.add('hidden');
    playerNameErrorEl.textContent = '';
  };

  const showPlayerNameError = () => {
    const lang = (langSelect.value as LanguageCode) || 'hi';
    playerNameInput.classList.add('input-error');
    playerNameErrorEl.textContent =
      lang === 'hi'
        ? 'कृपया रूम बनाने या जुड़ने से पहले अपना नाम दर्ज करें।'
        : 'Please enter a valid player name before creating or joining a room.';
    playerNameErrorEl.classList.remove('hidden');
  };

  const savePlayerNameToStorage = (trimmedName: string) => {
    if (!trimmedName) return;
    try {
      localStorage.setItem(PLAYER_NAME_STORAGE_KEY, trimmedName);
    } catch {
      // Ignore storage write errors
    }
  };

  const validatePlayerName = (): string | null => {
    const trimmed = playerNameInput.value.trim();
    playerNameInput.value = trimmed;
    if (trimmed.length === 0) {
      showPlayerNameError();
      playerNameInput.focus();
      return null;
    }
    clearPlayerNameError();
    savePlayerNameToStorage(trimmed);
    return trimmed;
  };

  playerNameInput.addEventListener('input', () => {
    const trimmed = playerNameInput.value.trim();
    if (trimmed.length > 0) {
      clearPlayerNameError();
      savePlayerNameToStorage(trimmed);
    }
  });

  playerNameInput.addEventListener('change', () => {
    const trimmed = playerNameInput.value.trim();
    playerNameInput.value = trimmed;
    if (trimmed.length > 0) {
      clearPlayerNameError();
      savePlayerNameToStorage(trimmed);
    }
  });

  langSelect.addEventListener('change', () => {
    if (!playerNameErrorEl.classList.contains('hidden')) {
      showPlayerNameError();
    }
  });

  // 10-Scene Visual Novel & 3D Cutscene DOM elements
  const vnPhotoCanvas = document.getElementById(
    'vn-photo-canvas',
  ) as HTMLCanvasElement;
  const vnTopBar = document.getElementById('vn-top-bar')!;
  const vnSceneBadge = document.getElementById('vn-scene-badge')!;
  const vnPhotoCaption = document.getElementById('vn-photo-caption')!;
  const vnSoundIndicator = document.getElementById('vn-sound-indicator')!;
  const vnSceneDots = document.getElementById('vn-scene-dots')!;
  const vnTextStage = document.getElementById('vn-text-stage')!;
  const vnControlsBar = document.getElementById('vn-controls-bar')!;
  const vnLightningFlash = document.getElementById('vn-lightning-flash')!;
  const vnBlackoutFinal = document.getElementById('vn-blackout-final')!;
  const vnPrevBtn = document.getElementById('vn-prev-btn')!;
  const vnNextBtn = document.getElementById('vn-next-btn')!;
  const vnAutoplayBtn = document.getElementById('vn-autoplay-btn')!;
  const vnCustomPhotoInput = document.getElementById(
    'vn-custom-photo-input',
  ) as HTMLInputElement;
  const toggle3dIntroBtn = document.getElementById('toggle-3d-intro-btn')!;
  const backToVnBtn = document.getElementById('back-to-vn-btn')!;
  const vnStartGameBtn = document.getElementById('vn-start-game-btn')!;
  const vnOpenLobbyBtn = document.getElementById('vn-open-lobby-btn')!;
  const vnReplayStoryBtn = document.getElementById('vn-replay-story-btn')!;

  const cinematicCanvas = document.getElementById(
    'cinematic-3d-canvas',
  ) as HTMLCanvasElement;
  const introVideo = document.getElementById('intro-video') as HTMLVideoElement;
  const introEndingOverlay = document.getElementById('intro-ending-overlay')!;
  const pressStartBtn = document.getElementById('press-start-btn')!;
  const openLobbyBtn = document.getElementById('open-lobby-btn')!;
  const replayIntroBtn = document.getElementById('replay-intro-btn')!;
  const sceneSelectorOverlay = document.getElementById(
    'scene-selector-overlay',
  )!;
  const skipOverlay = document.getElementById('skip-overlay')!;
  const skipStoryBtn = document.getElementById('skip-story-btn')!;
  const cutsceneBtn1 = document.getElementById('cutscene-btn-1')!;
  const cutsceneBtn2 = document.getElementById('cutscene-btn-2')!;
  const cutsceneBtn3 = document.getElementById('cutscene-btn-3')!;
  const cutsceneAiVideoBtn = document.getElementById('cutscene-ai-video-btn')!;
  const presetScene1Btn = document.getElementById('preset-scene-1')!;
  const presetScene2Btn = document.getElementById('preset-scene-2')!;
  const presetScene3Btn = document.getElementById('preset-scene-3')!;

  vnDirector = new VisualNovelIntroDirector(vnPhotoCanvas, game.synth, {
    textStageEl: vnTextStage,
    sceneBadgeEl: vnSceneBadge,
    photoCaptionEl: vnPhotoCaption,
    soundIndicatorEl: vnSoundIndicator,
    lightningFlashEl: vnLightningFlash,
    blackoutFinalEl: vnBlackoutFinal,
    sceneDotsContainer: vnSceneDots,
  });
  vnDirector.setJumpscareIntensity(
    parseSliderPercent(jumpscareIntensityInput.value, 80),
  );
  // Preload the first 5 dialogue lines' unique internet AI images immediately on game load
  vnDirector.preloadInitialStoryImages(5);

  const cutsceneDirector = new CinematicCutsceneDirector(
    cinematicCanvas,
    game.synth,
  );

  // Single-Player In-Game HUD Elements
  const taskStatusEl = document.getElementById('task-status');
  const heartbeatVignetteEl = document.getElementById('heartbeat-vignette');
  const chatBoxEl = document.getElementById('chat-box');
  const hudExitBtn = document.getElementById('hud-exit-btn');
  const hudMapIconBtn = document.getElementById('hud-map-icon-btn');
  const hudNoiseBadge = document.getElementById('hud-noise-badge');
  const hudNoiseValueEl = document.getElementById('hud-noise-value');
  const hudThrowableBadge = document.getElementById('hud-throwable-badge');
  const hudBhabhutBadge = document.getElementById('hud-bhabhut-badge');
  const hudFloorBadge = document.getElementById('hud-floor-badge');
  const floorChangeFadeEl = document.getElementById('floor-change-fade');
  const hudMinimapContainer = document.getElementById('hud-minimap-container');
  const hudMinimapCanvas = document.getElementById(
    'hud-minimap-canvas',
  ) as HTMLCanvasElement | null;
  const hudMinimapTitle = document.getElementById('hud-minimap-title');
  const hudMinimapRoom = document.getElementById('hud-minimap-room');
  const hudMinimapToggleBtn = document.getElementById('hud-minimap-toggle-btn');
  let miniMap3D: HaveliMiniMap3D | null = null;
  let floorFadeResetTimer: number | null = null;
  const hudRageBadge = document.getElementById('hud-rage-badge');
  const hudRageValueEl = document.getElementById('hud-rage-value');
  const hudRedLightningFlash = document.getElementById(
    'hud-red-lightning-flash',
  );
  const hidePeekOverlay = document.getElementById('hide-peek-overlay');
  const hideStealthPill = document.getElementById('hide-stealth-pill');
  const hidePromptBanner = document.getElementById('hide-prompt-banner');
  const hidePromptText = document.getElementById('hide-prompt-text');
  const hideActionSlot = document.getElementById('hide-action-slot');
  const hideActionBtn = document.getElementById('hide-action-btn');
  const bhabhutActionSlot = document.getElementById('bhabhut-action-slot');
  const bhabhutActionBtn = document.getElementById('bhabhut-action-btn');
  const throwActionSlot = document.getElementById('throw-action-slot');
  const throwActionBtn = document.getElementById('throw-action-btn');
  const throwCountPip = document.getElementById('throw-count-pip');
  const crouchActionSlot = document.getElementById('crouch-action-slot');
  const crouchActionBtn = document.getElementById('crouch-action-btn');
  const jumpActionBtn = document.getElementById('jump-action-btn');
  const rescueActionBtn = document.getElementById('rescue-action-btn');
  const pauseModal = document.getElementById('pause-modal');
  const pauseModalTitle = document.getElementById('pause-modal-title');
  const pauseModalSubtitle = document.getElementById('pause-modal-subtitle');
  const resumeGameBtn = document.getElementById('resume-game-btn');
  const pauseSkipStoryBtn = document.getElementById('pause-skip-story-btn');
  const pauseExitMenuBtn = document.getElementById('pause-exit-menu-btn');
  const storyPauseBtn = document.getElementById('story-pause-btn');

  type PausedFromState = 'lobby' | 'intro_story' | 'gameplay' | null;
  let pausedFromState: PausedFromState = null;
  let isStoryPaused = false;
  let savedIntroSceneIndex = 0;
  let savedIntroLineIndex = 0;
  let savedIntroChunkIndex = 0;

  function openIntroStoryPauseMenu() {
    if (storyScreen.classList.contains('hidden')) return;
    if (pausedFromState === 'intro_story') return;

    pausedFromState = 'intro_story';
    isStoryPaused = true;

    if (vnDirector.isPlaying) {
      vnDirector.pauseStory();
      savedIntroSceneIndex = vnDirector.savedSceneIndex;
      savedIntroLineIndex = vnDirector.savedLineIndex;
      savedIntroChunkIndex = vnDirector.savedChunkIndex;
    } else if (!introVideo.classList.contains('hidden')) {
      introVideo.pause();
    } else {
      game.gemini.stopSpeech();
    }

    vnAutoplayBtn.textContent = '▶️ चलाएं (Play)';
    if (pauseModalTitle) pauseModalTitle.textContent = 'STORY PAUSED';
    if (pauseModalSubtitle) {
      pauseModalSubtitle.textContent =
        'परिचय कहानी रुकी हुई है — क्या आप ठीक यहीं से कहानी जारी रखना चाहते हैं?';
    }
    if (resumeGameBtn) {
      resumeGameBtn.textContent = '▶️ Resume Story (कहानी जारी रखें)';
    }
    pauseExitMenuBtn?.classList.remove('hidden');
    pauseSkipStoryBtn?.classList.remove('hidden');
    document.getElementById('ig-settings-tabs-container')?.classList.add('hidden');
    pauseModal?.classList.remove('hidden');
  }

  function resumeFromPauseMenu() {
    document.getElementById('privacy-policy-modal')?.classList.add('hidden');
    document.getElementById('reset-progress-confirm-modal')?.classList.add('hidden');
    game.isHudLayoutEditorOpen = false;

    if (pausedFromState === 'lobby' && hud.classList.contains('hidden')) {
      pausedFromState = null;
      pauseModal?.classList.add('hidden');
      return;
    }

    if (pausedFromState === 'intro_story') {
      pausedFromState = null;
      isStoryPaused = false;
      pauseModal?.classList.add('hidden');
      pauseSkipStoryBtn?.classList.add('hidden');

      if (vnDirector.isPlaying) {
        vnDirector.savedSceneIndex = savedIntroSceneIndex;
        vnDirector.savedLineIndex = savedIntroLineIndex;
        vnDirector.savedChunkIndex = savedIntroChunkIndex;
        vnDirector.resumeStory();
        vnAutoplayBtn.textContent = '⏸️ रोकें (Pause)';
      } else if (!introVideo.classList.contains('hidden')) {
        void introVideo.play().catch(() => {});
      }
      return;
    }

    pausedFromState = null;
    pauseModal?.classList.add('hidden');
    pauseSkipStoryBtn?.classList.add('hidden');
    if (game.gameState === 'paused') {
      game.resumeGame();
    } else if (!hud.classList.contains('hidden')) {
      game.gameState = 'playing';
      game.requestGamePointerLock();
    }
    syncPcPointerLockPrompt();
  }
  const pcPointerLockPrompt = document.getElementById(
    'pc-pointer-lock-prompt',
  );
  const syncPcPointerLockPrompt = () => {
    if (!pcPointerLockPrompt) return;
    const isEndCutscene =
      game.entryPhase === 'capture_jumpscare' ||
      game.entryPhase === 'victory_escape_cutscene';
    const shouldShow =
      game.gameState === 'playing' &&
      !hud.classList.contains('hidden') &&
      !isEndCutscene &&
      !game.isMobileTouchControlsActive() &&
      !game.isPointerLockActive() &&
      !game.isAnyBlockingOverlayOpen();
    pcPointerLockPrompt.classList.toggle('hidden', !shouldShow);
  };
  const entryBlackoutOverlay = document.getElementById(
    'entry-blackout-overlay',
  );
  const respawnWarningOverlay = document.getElementById(
    'respawn-warning-overlay',
  );
  const respawnWarningTextEl = document.getElementById('respawn-warning-text');
  const hudHeartIcons = document.querySelectorAll<SVGElement>(
    '#hud-lives-badge .hud-heart',
  );
  const cutsceneLetterboxTop = document.getElementById(
    'cutscene-letterbox-top',
  );
  const cutsceneLetterboxBottom = document.getElementById(
    'cutscene-letterbox-bottom',
  );
  const entrySubtitleBar = document.getElementById('entry-subtitle-bar');
  const entrySubtitleSpeakerEl = document.getElementById(
    'entry-subtitle-speaker',
  );
  const entrySubtitleTextEl = document.getElementById('entry-subtitle-text');
  const relicTrackerEl = document.getElementById('relic-tracker');
  const relicCountText = document.getElementById('relic-count-text');
  const hudInventoryStrip = document.getElementById('hud-inventory-strip');
  const hudItemToast = document.getElementById('hud-item-toast');
  const hudItemToastTitle = document.getElementById('hud-item-toast-title');
  const hudItemToastSubtitle = document.getElementById(
    'hud-item-toast-subtitle',
  );
  let lastInventorySignature = '';
  const chatMessagesEl = document.getElementById('chat-messages');
  const centerCrosshair = document.getElementById('center-crosshair')!;
  const crosshairDot = document.getElementById('crosshair-dot')!;
  const crosshairHint = document.getElementById('crosshair-hint')!;

  // Movement Joystick & Side Column Round Icon Buttons
  const joystick = document.getElementById('joystick')!;
  const joystickKnob = document.getElementById('joystick-knob')!;
  const micBtn = document.getElementById('mic-btn')!;
  const whisperBtn = document.getElementById('whisper-btn')!;
  const chatBtn = document.getElementById('chat-btn')!;
  const sanctumBtn = document.getElementById('sanctum-btn')!;
  const muteBtn = document.getElementById('mute-btn')!;

  // Sanctum Modal elements
  const sanctumModal = document.getElementById('sanctum-modal')!;
  const closeSanctumBtn = document.getElementById('close-sanctum-btn')!;
  const tabBtns = document.querySelectorAll<HTMLButtonElement>('.tab-btn');

  // Tab 1: Oracle
  const oracleInput = document.getElementById(
    'oracle-input',
  ) as HTMLInputElement;
  const oracleAskBtn = document.getElementById('oracle-ask-btn')!;
  const oracleOutput = document.getElementById('oracle-output')!;

  // Tab 2: Visions (1K/2K/4K & Edit)
  const visionPrompt = document.getElementById(
    'vision-prompt',
  ) as HTMLInputElement;
  const visionSizeSelect = document.getElementById(
    'vision-size-select',
  ) as HTMLSelectElement;
  const visionFileInput = document.getElementById(
    'vision-file-input',
  ) as HTMLInputElement;
  const visionProBtn = document.getElementById('vision-pro-btn')!;
  const visionEditBtn = document.getElementById('vision-edit-btn')!;
  const visionStatus = document.getElementById('vision-status')!;
  const visionResultImg = document.getElementById(
    'vision-result-img',
  ) as HTMLImageElement;

  // Tab 3: Video
  const videoPrompt = document.getElementById(
    'video-prompt',
  ) as HTMLInputElement;
  const videoAspectSelect = document.getElementById(
    'video-aspect-select',
  ) as HTMLSelectElement;
  const videoFileInput = document.getElementById(
    'video-file-input',
  ) as HTMLInputElement;
  const videoGenBtn = document.getElementById('video-gen-btn')!;
  const videoStatus = document.getElementById('video-status')!;
  const videoResultPlayer = document.getElementById(
    'video-result-player',
  ) as HTMLVideoElement;

  // Tab 4: Music
  const musicPrompt = document.getElementById(
    'music-prompt',
  ) as HTMLInputElement;
  const musicModeSelect = document.getElementById(
    'music-mode-select',
  ) as HTMLSelectElement;
  const musicGenBtn = document.getElementById('music-gen-btn')!;
  const musicStatus = document.getElementById('music-status')!;
  const musicResultPlayer = document.getElementById(
    'music-result-player',
  ) as HTMLAudioElement;

  // Endgame Modal
  const endgameModal = document.getElementById('endgame-modal')!;
  const endgameTitle = document.getElementById('endgame-title')!;
  const endgameMessage = document.getElementById('endgame-message')!;
  const restartGameBtn = document.getElementById('restart-game-btn')!;

  function addChatMessage(text: string) {
    if (chatBoxEl) {
      chatBoxEl.textContent = text;
    } else if (chatMessagesEl) {
      const div = document.createElement('div');
      div.textContent = text;
      chatMessagesEl.appendChild(div);
      chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }
  }

  game.onChatLog = (msg) => addChatMessage(msg);

  function updateCutsceneButtons(sceneId: CutsceneId) {
    cutsceneBtn1.classList.toggle('active', sceneId === 'scene1');
    cutsceneBtn2.classList.toggle('active', sceneId === 'scene2');
    cutsceneBtn3.classList.toggle('active', sceneId === 'scene3');
  }

  function showIntroCutToBlackEnding() {
    cutsceneDirector.stop();
    introVideo.pause();
    introEndingOverlay.classList.remove('hidden');
    skipOverlay.classList.add('hidden');
    sceneSelectorOverlay.classList.add('hidden');
  }

  function startVisualNovelStory(sceneIdx = 0) {
    pausedFromState = null;
    isStoryPaused = false;
    pauseModal?.classList.add('hidden');
    pauseSkipStoryBtn?.classList.add('hidden');
    cutsceneDirector.stop();
    introVideo.pause();
    introVideo.classList.add('hidden');
    cinematicCanvas.classList.add('hidden');
    sceneSelectorOverlay.classList.add('hidden');
    introEndingOverlay.classList.add('hidden');
    vnBlackoutFinal.classList.add('hidden');

    vnPhotoCanvas.classList.remove('hidden');
    vnTopBar.classList.add('hidden');
    vnTextStage.classList.remove('hidden');
    vnControlsBar.classList.add('hidden');
    skipOverlay.classList.remove('hidden');
    menuScreen.classList.add('hidden');
    storyScreen.classList.remove('hidden');

    game.exitStoryCameraMode();
    game.gameState = 'story';
    game.synth.setGameplayAudioEnabled(false);
    const savedIntensity = parseSliderPercent(jumpscareIntensityInput.value, 80);
    game.synth.setJumpscareIntensity(savedIntensity);
    vnDirector.setJumpscareIntensity(savedIntensity);
    vnDirector.start(sceneIdx);
  }

  let activeCutsceneToken = 0;

  function playCutsceneScene(sceneId: CutsceneId) {
    const token = ++activeCutsceneToken;
    game.synth.setGameplayAudioEnabled(false);
    vnDirector.stop();
    vnPhotoCanvas.classList.add('hidden');
    vnTopBar.classList.add('hidden');
    vnTextStage.classList.add('hidden');
    vnControlsBar.classList.add('hidden');
    vnBlackoutFinal.classList.add('hidden');

    introVideo.pause();
    introVideo.classList.add('hidden');
    cinematicCanvas.classList.remove('hidden');
    introEndingOverlay.classList.add('hidden');
    sceneSelectorOverlay.classList.add('hidden');
    skipOverlay.classList.remove('hidden');

    updateCutsceneButtons(sceneId);
    if (!cutsceneDirector.isRunning) {
      cutsceneDirector.start(sceneId);
    } else {
      cutsceneDirector.setScene(sceneId);
    }

    const spec = CINEMATIC_SCENES.find((s) => s.id === sceneId);
    if (spec) {
      const narration =
        game.lang === 'hi' ? spec.narrationHi : spec.narrationEn;
      void game.gemini
        .speakText(narration, game.lang)
        .catch(() => {
          // Ignore TTS errors during intro cutscene
        })
        .then(() => {
          if (
            token !== activeCutsceneToken ||
            !cutsceneDirector.isRunning ||
            storyScreen.classList.contains('hidden')
          ) {
            return;
          }
          const nextScene: CutsceneId | 'done' =
            sceneId === 'scene1'
              ? 'scene2'
              : sceneId === 'scene2'
                ? 'scene3'
                : 'done';
          cutsceneDirector.onAutoAdvanceScene?.(nextScene);
        });
    }
  }

  cutsceneDirector.onIntroCutToBlack = () => {
    showIntroCutToBlackEnding();
  };

  cutsceneDirector.onWebGLUnavailable = () => {
    startVisualNovelStory(0);
  };

  cutsceneDirector.onAutoAdvanceScene = (next) => {
    if (next === 'done') {
      skipStoryToGame();
    } else {
      playCutsceneScene(next);
    }
  };

  function startStorySequence(players: number) {
    const validatedName = validatePlayerName();
    if (!validatedName) {
      return;
    }

    game.synth.setGameplayAudioEnabled(false);
    optionsModal.classList.add('hidden');
    menuStatusNotice.classList.add('hidden');

    game.lang = (langSelect.value as LanguageCode) || 'hi';
    lobbyScene3D?.setActive(false);
    game.playerName = validatedName;
    game.roomCode = roomCodeInput.value.trim() || '1992';
    game.playerCount = players;
    game.requiredItems = players * 4;
    game.currentChapter = 0;
    game.gameState = 'story';

    game.spawnRelicsForSession(game.requiredItems);
    game.saveProgressToStorage();
    startVisualNovelStory(0);
  }

  const playerHandView = document.getElementById('player-hand-view');

  function skipStoryToGame(preserveSavedPosition = false) {
    pausedFromState = null;
    isStoryPaused = false;
    game.isHudLayoutEditorOpen = false;
    lobbyScene3D?.setActive(false);
    // Ensure ALL launch, lobby, settings, and archive modal overlays are closed before gameplay
    const launchEl = document.getElementById('launch-sequence-overlay');
    if (launchEl) {
      launchEl.classList.remove('is-fading-out');
      launchEl.classList.add('hidden');
    }
    [
      'profile-modal',
      'settings-modal',
      'privacy-policy-modal',
      'reset-progress-confirm-modal',
      'lobby-characters-modal',
      'lobby-gear-modal',
      'lobby-diary-modal',
      'lobby-badges-modal',
      'lobby-mode-modal',
      'lobby-mail-modal',
      'lobby-news-modal',
      'sanctum-modal',
      'endgame-modal',
    ].forEach((id) => document.getElementById(id)?.classList.add('hidden'));
    optionsModal.classList.add('hidden');
    vnDirector.stop();
    cutsceneDirector.stop();
    game.exitStoryCameraMode(preserveSavedPosition);
    introVideo.pause();
    game.gemini.stopSpeech();
    game.synth.unlockAudio();
    game.gameState = 'playing';
    if (!preserveSavedPosition) {
      game.matchStartTimeMs = Date.now();
    }
    game.synth.setGameplayAudioEnabled(true);
    game.resumeSpatialAudio();
    applyAndSaveGameSettings();
    document.body.classList.add('playing-match');
    vnBlackoutFinal.classList.add('hidden');
    introEndingOverlay.classList.add('hidden');
    storyScreen.classList.add('hidden');
    menuScreen.classList.add('hidden');
    pauseModal?.classList.add('hidden');
    pauseSkipStoryBtn?.classList.add('hidden');
    hud.classList.remove('hidden');
    if (playerHandView) {
      playerHandView.classList.add('hidden');
    }
    game.requestGamePointerLock();
    refreshHudState();
    addChatMessage(
      preserveSavedPosition
        ? game.lang === 'hi'
          ? '[System]: रुक्मिणी हवेली में घूम रही है... छुपकर चलो!'
          : '[System]: Rukmini is wandering the Haveli... tread quietly!'
        : game.lang === 'hi'
          ? '[System]: आपकी SUV काली घाटी जंगल रोड पर खराब हो गई है। सभी दोस्त (कबीर, रिया, देव) आपके साथ हैं—आगे लोहे के फाटक पर चौकीदार बाबा से बात करें!'
          : '[System]: Your SUV broke down on the Kali Ghati forest road. All 3 friends (Kabir, Riya, Dev) are with you—walk up to the iron gate and talk to Watchman Baba!',
    );
  }

  const launchDefaultSingleplayerMatch = () => {
    const fallbackName = playerNameInput.value.trim() || 'Aarav';
    playerNameInput.value = fallbackName;
    savePlayerNameToStorage(fallbackName);
    game.lang = (langSelect.value as LanguageCode) || 'hi';
    game.playerName = fallbackName;
    game.roomCode = roomCodeInput.value.trim() || '1992';
    game.playerCount = 1;
    game.requiredItems = 4;
    game.matchStartTimeMs = Date.now();
    game.resetMatch();
    skipStoryToGame(false);
  };

  const openLobbySetupScreen = () => {
    pausedFromState = null;
    isStoryPaused = false;
    game.releaseGamePointerLock();
    game.synth.stopSequenceSpeech();
    pauseModal?.classList.add('hidden');
    pauseSkipStoryBtn?.classList.add('hidden');
    document.getElementById('privacy-policy-modal')?.classList.add('hidden');
    document.getElementById('profile-modal')?.classList.add('hidden');
    hud.classList.remove('hud-end-cutscene');
    hud.classList.add('hidden');
    endgameModal.classList.add('hidden');
    endgameModal.classList.remove('victory-endgame', 'gameover-endgame');
    entryBlackoutOverlay?.classList.add('hidden');
    cutsceneLetterboxTop?.classList.add('hidden');
    cutsceneLetterboxBottom?.classList.add('hidden');
    entrySubtitleBar?.classList.add('hidden');
    if (playerHandView) {
      playerHandView.classList.add('hidden');
    }
    game.toggleMinimapExpanded(false);
    hudMinimapContainer?.classList.add('hidden');
    hudMinimapContainer?.classList.remove('expanded');
    hudMapIconBtn?.classList.remove('active');
    floorChangeFadeEl?.classList.remove('floor-changing');
    hudFloorBadge?.classList.remove('floor-changing');
    vnDirector.stop();
    cutsceneDirector.stop();
    game.exitStoryCameraMode();
    game.synth.setGameplayAudioEnabled(false);
    vnBlackoutFinal.classList.add('hidden');
    introEndingOverlay.classList.add('hidden');
    storyScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    syncLobbyContinueVisibility();
    syncProfileUI();
    const lobby = ensureLobbyScene3D();
    lobby?.mountToLobby();
    lobby?.setActive(true);
  };

  // Visual Novel Controls
  const vnPrevBeatBtn = document.getElementById('vn-prev-beat-btn');
  const vnNextBeatBtn = document.getElementById('vn-next-beat-btn');
  const vnBeatDots = document.getElementById('vn-beat-dots');
  const paceToggleBtn = document.getElementById('pace-toggle-btn');
  const triggerJumpscareBtn = document.getElementById('trigger-jumpscare-btn');
  const sfxPayalBtn = document.getElementById('sfx-payal-btn');
  const sfxThunderBtn = document.getElementById('sfx-thunder-btn');
  const sfxGateBtn = document.getElementById('sfx-gate-btn');

  const SHORT_CHAPTER_TITLES = [
    '1. काली घाटी',
    '2. चौकीदार',
    '3. 1992 शादी',
    '4. तहखाना',
    '5. विश्वासघात',
    '6. तांत्रिक हवन',
    '7. सूखा कुआं',
    '8. रक्त-पिशाचिनी',
    '9. मुक्ति का राज़',
    '10. Jump Scare!',
  ];

  const renderVNChapterPills = () => {
    if (vnSceneDots) {
      vnSceneDots.innerHTML = '';
      SHORT_CHAPTER_TITLES.forEach((label, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className =
          idx === vnDirector.currentSceneIndex
            ? 'vn-scene-pill active'
            : 'vn-scene-pill';
        btn.textContent = label;
        btn.addEventListener('click', () => {
          vnDirector.jumpToScene(idx);
          renderVNChapterPills();
        });
        vnSceneDots.appendChild(btn);
      });
    }

    if (vnBeatDots) {
      vnBeatDots.innerHTML = '';
      const scene = VN_STORY_SCENES[vnDirector.currentSceneIndex];
      const activeBeatIdx = vnDirector.currentLineIndex;
      if (scene) {
        scene.lines.forEach((_, bIdx) => {
          const shot = vnDirector.getShotForBeat(vnDirector.currentSceneIndex, bIdx);
          const pill = document.createElement('button');
          pill.type = 'button';
          pill.className =
            bIdx === activeBeatIdx ? 'vn-beat-pill active' : 'vn-beat-pill';
          pill.textContent = `शॉट ${bIdx + 1}`;
          pill.title = shot.shotDesc;
          pill.addEventListener('click', () => {
            vnDirector.jumpToBeat(vnDirector.currentSceneIndex, bIdx);
            renderVNChapterPills();
          });
          vnBeatDots.appendChild(pill);
        });
      }
    }
  };

  vnDirector.onSceneChanged = () => {
    renderVNChapterPills();
  };
  renderVNChapterPills();

  vnPrevBtn.addEventListener('click', () => {
    vnDirector.prevStep();
    renderVNChapterPills();
  });
  vnNextBtn.addEventListener('click', () => {
    vnDirector.nextStep();
    renderVNChapterPills();
  });
  vnPrevBeatBtn?.addEventListener('click', () => {
    vnDirector.prevBeat();
    renderVNChapterPills();
  });
  vnNextBeatBtn?.addEventListener('click', () => {
    vnDirector.nextBeat();
    renderVNChapterPills();
  });
  vnAutoplayBtn.addEventListener('click', () => {
    if (pausedFromState === 'intro_story' || vnDirector.isPaused) {
      if (pausedFromState === 'intro_story') {
        resumeFromPauseMenu();
      } else {
        vnDirector.resumeStory();
        vnAutoplayBtn.textContent = '⏸️ रोकें (Pause)';
      }
    } else {
      openIntroStoryPauseMenu();
    }
  });

  storyPauseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    openIntroStoryPauseMenu();
  });

  paceToggleBtn?.addEventListener('click', () => {
    const slow = vnDirector.togglePace();
    paceToggleBtn.textContent = slow
      ? '⏱️ रफ़्तार: सिनेमैटिक (Slow Horror)'
      : '⚡ रफ़्तार: तेज़ प्रीव्यू (Fast Pace)';
  });

  triggerJumpscareBtn?.addEventListener('click', () => {
    vnDirector.triggerJumpScareTest();
  });

  sfxPayalBtn?.addEventListener('click', () => {
    vnDirector.triggerTestPreviewFlash();
  });
  sfxThunderBtn?.addEventListener('click', () => {
    vnDirector.triggerTestPreviewFlash();
  });
  sfxGateBtn?.addEventListener('click', () => {
    vnDirector.triggerTestPreviewFlash();
  });

  // 4-Player Thakur Haveli Survival Lobby, 4 Relics & Sound Decibel Radar
  const playerCardsGrid = document.getElementById('player-cards-grid');
  const relicsGrid = document.getElementById('relics-grid');
  const relicCollectedCountEl = document.getElementById('relic-collected-count');
  const lobbyStatusBox = document.getElementById('lobby-status-box');
  const backToStoryBtn = document.getElementById('back-to-story-btn');
  const simWalkBtn = document.getElementById('sim-walk-btn');
  const simRunBtn = document.getElementById('sim-run-btn');
  const simScreamBtn = document.getElementById('sim-scream-btn');
  const burnAllRitualBtn = document.getElementById('burn-all-ritual-btn');
  const noiseStatusLabel = document.getElementById('noise-status-label');
  const noiseMeterBar = document.getElementById('noise-meter-bar');
  const rukminiDistanceLabel = document.getElementById('rukmini-distance-label');

  const LOBBY_SURVIVORS = [
    {
      id: 'aarav',
      name: 'आरव (Aarav)',
      role: 'Torch Bearer • रोशनी विशेषज्ञ',
      perk: 'इसकी UV टॉर्च से अंधेरे में रुक्मिणी की लाल परछाईं 3 सेकंड पहले दिख जाती है।',
      badge: '🔦 मुख्य लीडर',
    },
    {
      id: 'kabir',
      name: 'कबीर (Kabir)',
      role: 'Sound Decoy • चकमा विशेषज्ञ',
      perk: 'यह दूर पत्थर या घंटी फेंककर अंधी रुक्मिणी का ध्यान दूसरी तरफ भटका सकता है।',
      badge: '🔔 साउंड डिकॉय',
    },
    {
      id: 'riya',
      name: 'रिया (Riya)',
      role: 'Relic Sense • शापित वस्तु खोजी',
      perk: 'जब कोई शापित चीज़ पास होती है तो रिया को धीमी तांत्रिक कंपन महसूस होती है।',
      badge: '✨ रेलिक सेंसर',
    },
    {
      id: 'dev',
      name: 'देव (Dev)',
      role: 'Silent Runner • शांत कदम',
      perk: 'दबे पाँव चलने पर इसके कदमों की आवाज़ रुक्मिणी के साउंड रडार पर 50% कम होती है।',
      badge: '🤫 साइलेंट स्टेप',
    },
  ];

  const LOBBY_RELICS = [
    {
      id: 'payal',
      name: '1. चांदी की पायल',
      room: 'तहखाना (Underground Dungeon)',
      icon: '🦶',
    },
    {
      id: 'sindoor',
      name: '2. सिंदूर की डिब्बी',
      room: 'दुल्हन का कमरा (Bridal Room)',
      icon: '🩸',
    },
    {
      id: 'bangles',
      name: '3. लाल कांच की चूड़ियाँ',
      room: 'भानुप्रताप का कक्ष (Thakur Hall)',
      icon: '⭕',
    },
    {
      id: 'mirror',
      name: '4. टूटा श्रृंगार आईना',
      room: 'अंधेरी अटारी (Haunted Attic)',
      icon: '🪞',
    },
  ];

  let selectedSurvivorId = 'aarav';
  const lobbyRelicsFound: Record<string, boolean> = {};

  const renderLobbyInteractiveWidgets = () => {
    if (playerCardsGrid) {
      playerCardsGrid.innerHTML = '';
      LOBBY_SURVIVORS.forEach((p) => {
        const isSelected = p.id === selectedSurvivorId;
        const card = document.createElement('button');
        card.type = 'button';
        card.className = isSelected
          ? 'survivor-card selected'
          : 'survivor-card';
        card.innerHTML = `
          <div class="survivor-card-top">
            <span class="survivor-name">${p.name}</span>
            <span class="survivor-badge">${p.badge}</span>
          </div>
          <span class="survivor-role">${p.role}</span>
          <p class="survivor-perk">${p.perk}</p>
        `;
        card.addEventListener('click', () => {
          selectedSurvivorId = p.id;
          playerNameInput.value = p.name;
          savePlayerNameToStorage(p.name);
          if (lobbyStatusBox) {
            lobbyStatusBox.innerHTML = `✅ सर्वाइवर: <strong>${p.name}</strong> तैयार है। अपनी टीम के साथ 4 शापित चीज़ें ढूंढें!`;
          }
          renderLobbyInteractiveWidgets();
        });
        playerCardsGrid.appendChild(card);
      });
    }

    if (relicsGrid) {
      relicsGrid.innerHTML = '';
      let foundCount = 0;
      LOBBY_RELICS.forEach((r) => {
        const isFound = Boolean(lobbyRelicsFound[r.id]);
        if (isFound) foundCount++;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = isFound ? 'relic-card found' : 'relic-card';
        btn.innerHTML = `
          <div class="relic-card-top">
            <span class="relic-emoji">${r.icon}</span>
            <span class="relic-status-pill">${isFound ? 'मिल गई ✓' : 'खोजें'}</span>
          </div>
          <div class="relic-card-name">${r.name}</div>
          <div class="relic-card-room">${r.room}</div>
        `;
        btn.addEventListener('click', () => {
          lobbyRelicsFound[r.id] = !lobbyRelicsFound[r.id];
          renderLobbyInteractiveWidgets();
        });
        relicsGrid.appendChild(btn);
      });
      if (relicCollectedCountEl) {
        relicCollectedCountEl.textContent = `${foundCount} / 4 मिलीं`;
      }
    }
  };

  renderLobbyInteractiveWidgets();

  const updateNoiseSimulation = (
    dbValue: number,
    statusText: string,
    distText: string,
    levelClass: 'noise-safe' | 'noise-warn' | 'noise-danger',
  ) => {
    if (noiseMeterBar) {
      noiseMeterBar.style.width = `${Math.min(100, dbValue)}%`;
      noiseMeterBar.className = `aahat-bar-fill ${levelClass}`;
    }
    if (noiseStatusLabel) {
      noiseStatusLabel.textContent = statusText;
      noiseStatusLabel.className = levelClass;
    }
    if (rukminiDistanceLabel) {
      rukminiDistanceLabel.textContent = distText;
    }
  };

  simWalkBtn?.addEventListener('click', () => {
    updateNoiseSimulation(
      15,
      'शांत (15 dB) — सुरक्षित',
      '26 मीटर दूर (रुक्मिणी को भनक नहीं)',
      'noise-safe',
    );
  });

  simRunBtn?.addEventListener('click', () => {
    updateNoiseSimulation(
      58,
      'सावधान (58 dB) — कदमों की आहट!',
      '9 मीटर दूर (पायल की आवाज़ पास आ रही है!)',
      'noise-warn',
    );
  });

  simScreamBtn?.addEventListener('click', () => {
    updateNoiseSimulation(
      96,
      'खतरा (96 dB) — रुक्मिणी ने सुन लिया!!',
      '0 मीटर — आपके ठीक पीछे!!',
      'noise-danger',
    );
    showMenuNotice('🩸 रुक्मिणी ने आपकी आवाज़ सुन ली! बिल्कुल शांत रहें!');
  });

  burnAllRitualBtn?.addEventListener('click', () => {
    LOBBY_RELICS.forEach((r) => {
      lobbyRelicsFound[r.id] = true;
    });
    renderLobbyInteractiveWidgets();
    showMenuNotice(
      '🔥 चारों शापित चीज़ें सूखे कुएं में भस्म हुईं! ठाकुर हवेली का मुख्य दरवाज़ा खुल गया!',
    );
  });

  backToStoryBtn?.addEventListener('click', () => {
    startVisualNovelStory(0);
  });

  vnCustomPhotoInput.addEventListener('change', async () => {
    const file = vnCustomPhotoInput.files?.[0];
    if (!file) return;
    try {
      const read = await readFileAsBase64(file);
      vnDirector.setCustomPhotoForCurrentFrame(
        `data:${read.mimeType};base64,${read.base64}`,
      );
    } catch {
      // Ignore file read errors
    }
  });

  toggle3dIntroBtn.addEventListener('click', () => {
    startVisualNovelStory(0);
  });

  backToVnBtn.addEventListener('click', () => {
    startVisualNovelStory(vnDirector.currentSceneIndex);
  });

  vnStartGameBtn.addEventListener('click', () => {
    launchDefaultSingleplayerMatch();
    game.requestImmediateDesktopPointerLock();
  });
  vnOpenLobbyBtn.addEventListener('click', openLobbySetupScreen);
  vnReplayStoryBtn.addEventListener('click', () => startVisualNovelStory(0));

  // 3D Intro Cut-to-Black Screen Controls
  pressStartBtn.addEventListener('click', () => {
    launchDefaultSingleplayerMatch();
    game.requestImmediateDesktopPointerLock();
  });
  openLobbyBtn.addEventListener('click', openLobbySetupScreen);
  replayIntroBtn.addEventListener('click', () => startVisualNovelStory(0));

  function refreshHudState() {
    if (taskStatusEl) {
      taskStatusEl.textContent = game.taskStatusText;
    }

    const isInEndCutscene =
      game.entryPhase === 'capture_jumpscare' ||
      game.entryPhase === 'victory_escape_cutscene';
    hud.classList.toggle('hud-end-cutscene', isInEndCutscene);
    syncPcPointerLockPrompt();

    // Sync Step 4 Pitch-Black Blackout Overlay, 2s Respawn Warning Banner, Letterbox Bars & Subtitles
    if (entryBlackoutOverlay) {
      const showBlackout = game.entryBlackoutOpacity > 0.005;
      entryBlackoutOverlay.classList.toggle('hidden', !showBlackout);
      entryBlackoutOverlay.style.opacity = game.entryBlackoutOpacity.toFixed(3);
    }
    if (respawnWarningOverlay && respawnWarningTextEl) {
      const showRespawnWarn =
        game.respawnWarningOpacity > 0.005 && Boolean(game.respawnWarningText);
      respawnWarningOverlay.classList.toggle('hidden', !showRespawnWarn);
      respawnWarningOverlay.style.opacity =
        game.respawnWarningOpacity.toFixed(3);
      if (showRespawnWarn) {
        respawnWarningTextEl.textContent = game.respawnWarningText;
      }
    }
    if (hudItemToast && hudItemToastTitle && hudItemToastSubtitle) {
      const showItemToast =
        !isInEndCutscene &&
        game.itemToastOpacity > 0.01 &&
        Boolean(game.itemToastTitle);
      hudItemToast.classList.toggle('hidden', !showItemToast);
      hudItemToast.style.opacity = game.itemToastOpacity.toFixed(3);
      if (showItemToast) {
        if (hudItemToastTitle.textContent !== game.itemToastTitle) {
          hudItemToastTitle.textContent = game.itemToastTitle;
        }
        if (hudItemToastSubtitle.textContent !== game.itemToastSubtitle) {
          hudItemToastSubtitle.textContent = game.itemToastSubtitle;
        }
      }
    }
    if (hudInventoryStrip) {
      // Keep top-left ultra-clean (Minimap + Lives/Relics strip only); carried keys & relics live in Backpack drawer
      hudInventoryStrip.classList.add('hidden');
      lastInventorySignature = '';
    }
    // Sync Backpack count pip & drawer list + 1-Tap Auto-Sprint active visual state
    const carriedForBag = game.getCarriedInventoryItems();
    const backpackPipEl = document.getElementById('backpack-count-pip');
    const backpackBtnEl = document.getElementById('backpack-action-btn');
    const backpackListEl = document.getElementById('hud-backpack-list');
    if (backpackPipEl) {
      backpackPipEl.textContent = String(carriedForBag.length);
      backpackPipEl.classList.toggle('hidden', carriedForBag.length === 0);
    }
    backpackBtnEl?.classList.toggle('has-items', carriedForBag.length > 0);
    if (backpackListEl) {
      backpackListEl.textContent = '';
      if (carriedForBag.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'hud-backpack-empty';
        emptyMsg.textContent =
          game.lang === 'hi'
            ? 'अभी कोई चाबी या शापित अवशेष नहीं है।'
            : 'No named keys or cursed relics collected yet.';
        backpackListEl.appendChild(emptyMsg);
      } else {
        for (const item of carriedForBag) {
          const row = document.createElement('div');
          row.className = `hud-backpack-row${item.kind === 'relic' ? ' is-relic' : ''}`;
          const icon = document.createElement('span');
          icon.className = 'hud-backpack-row-icon';
          icon.textContent = item.icon;
          const textWrap = document.createElement('div');
          const title = document.createElement('div');
          title.className = 'hud-backpack-row-name';
          title.textContent = game.lang === 'hi' ? item.labelHi : item.labelEn;
          const purpose = document.createElement('div');
          purpose.className = 'hud-backpack-row-purpose';
          purpose.textContent =
            game.lang === 'hi' ? item.purposeHi : item.purposeEn;
          textWrap.append(title, purpose);
          row.append(icon, textWrap);
          backpackListEl.appendChild(row);
        }
      }
    }
    const autoSprintBtnEl = document.getElementById('autosprint-action-btn');
    if (autoSprintBtnEl) {
      autoSprintBtnEl.classList.toggle('active', game.autoSprintActive);
      autoSprintBtnEl.setAttribute('aria-pressed', String(game.autoSprintActive));
    }
    if (hudHeartIcons.length > 0) {
      hudHeartIcons.forEach((heart, idx) => {
        heart.classList.toggle('lost', idx >= game.lives);
      });
    }
    if (hudRedLightningFlash) {
      const showFlash = game.redLightningFlashOpacity > 0.01;
      hudRedLightningFlash.classList.toggle('hidden', !showFlash);
      hudRedLightningFlash.style.setProperty(
        '--red-lightning-opacity',
        game.redLightningFlashOpacity.toFixed(3),
      );
    }
    if (cutsceneLetterboxTop && cutsceneLetterboxBottom) {
      const showBars =
        game.isMiniCutsceneActive ||
        game.entryPhase === 'victory_escape_cutscene';
      cutsceneLetterboxTop.classList.toggle('hidden', !showBars);
      cutsceneLetterboxBottom.classList.toggle('hidden', !showBars);
    }
    if (entrySubtitleBar && entrySubtitleSpeakerEl && entrySubtitleTextEl) {
      const hasSubtitle = Boolean(game.entrySubtitleText);
      entrySubtitleBar.classList.toggle('hidden', !hasSubtitle);
      entrySubtitleBar.classList.toggle(
        'rukmini-mode',
        game.entrySubtitleRukmini,
      );
      entrySubtitleSpeakerEl.textContent = game.entrySubtitleSpeaker;
      entrySubtitleTextEl.textContent = game.entrySubtitleText;
    }

    // Update compact relic counter (icon + 0/4)
    relicTrackerEl?.classList.toggle('has-relics', game.collectedCount > 0);
    if (relicCountText) {
      relicCountText.textContent = `${game.collectedCount}/${game.requiredItems}`;
    }

    // Update Center Crosshair Dot + Interact circle button highlight
    const showCrosshairActive =
      game.isAimingAtPickable || Boolean(game.nearbyHidingSpot);
    crosshairDot.classList.toggle('crosshair-active', showCrosshairActive);
    crosshairHint.classList.toggle('hidden', !showCrosshairActive);
    rescueActionBtn?.classList.toggle('has-target', showCrosshairActive);
    if (game.entryCrosshairPrompt) {
      crosshairHint.textContent = game.entryCrosshairPrompt;
    } else if (game.nearbyHidingSpot && !game.activeHidingSpot) {
      crosshairHint.textContent = 'E';
    } else if (game.isAimingAtPickable) {
      crosshairHint.textContent = 'E';
    }

    // Sync Screen-Edge Dark-Red Heartbeat Vignette smoothly to live cardiac wave & distance to Rukmini (15m -> 3m)
    if (heartbeatVignetteEl) {
      const intensity = game.heartbeatIntensity;
      const pulse = game.heartbeatVignettePulse;
      const liveOpacity = game.heartbeatVignetteOpacity;
      const isHeartbeatActive =
        game.gameState === 'playing' &&
        !isInEndCutscene &&
        (intensity > 0.01 || liveOpacity > 0.008);

      heartbeatVignetteEl.classList.toggle('heartbeat-active', isHeartbeatActive);

      if (isHeartbeatActive) {
        // Keep center clearly visible while smoothly pulling dark-red edge glow inward as distance drops 15m -> 3m
        const clearRadius = Math.max(38, 70 - intensity * 26 - pulse * 6);
        const midStop = Math.max(58, clearRadius + 18 - intensity * 3);
        const innerAlpha = Math.min(0.76, 0.14 + intensity * 0.44 + pulse * 0.18);
        const outerAlpha = Math.min(0.96, 0.42 + intensity * 0.44 + pulse * 0.10);

        const edgeBlur = Math.round(62 + intensity * 78 + pulse * 42);
        const deepBlur = Math.round(22 + intensity * 38);
        const edgeAlpha = Math.min(0.94, 0.24 + intensity * 0.52 + pulse * 0.18);
        const vignetteBlur = (2.0 + intensity * 6.5 + pulse * 2.5).toFixed(2);
        const backdropBlur = (intensity * 1.9 + pulse * 0.7).toFixed(2);
        const maskClear = Math.max(42, 68 - intensity * 22);
        const pulseScale = (1.032 - pulse * 0.032).toFixed(4);

        heartbeatVignetteEl.style.opacity = Math.min(0.95, liveOpacity).toFixed(3);
        heartbeatVignetteEl.style.transform = `scale(${pulseScale})`;
        heartbeatVignetteEl.style.setProperty(
          '--hb-clear-radius',
          `${clearRadius.toFixed(1)}%`,
        );
        heartbeatVignetteEl.style.setProperty(
          '--hb-mid-stop',
          `${midStop.toFixed(1)}%`,
        );
        heartbeatVignetteEl.style.setProperty(
          '--hb-inner-alpha',
          innerAlpha.toFixed(3),
        );
        heartbeatVignetteEl.style.setProperty(
          '--hb-outer-alpha',
          outerAlpha.toFixed(3),
        );
        heartbeatVignetteEl.style.setProperty('--hb-edge-blur', `${edgeBlur}px`);
        heartbeatVignetteEl.style.setProperty('--hb-deep-blur', `${deepBlur}px`);
        heartbeatVignetteEl.style.setProperty(
          '--hb-edge-alpha',
          edgeAlpha.toFixed(3),
        );
        heartbeatVignetteEl.style.setProperty(
          '--hb-vignette-blur',
          `${vignetteBlur}px`,
        );
        heartbeatVignetteEl.style.setProperty(
          '--hb-backdrop-blur',
          `${backdropBlur}px`,
        );
        heartbeatVignetteEl.style.setProperty(
          '--hb-mask-clear',
          `${maskClear.toFixed(1)}%`,
        );
      } else {
        heartbeatVignetteEl.style.opacity = '0';
        heartbeatVignetteEl.style.transform = 'scale(1.032)';
        heartbeatVignetteEl.style.setProperty('--hb-backdrop-blur', '0px');
      }
    }

    // Update compact Noise Output dB counter (icon + dB only, zero prose)
    if (hudNoiseBadge) {
      const db = game.currentNoiseDb;
      hudNoiseBadge.classList.toggle(
        'noise-crouch',
        game.isPlayerCrouching && db <= 20,
      );
      hudNoiseBadge.classList.toggle(
        'noise-walk',
        !game.isPlayerCrouching && db > 0 && db <= 45,
      );
      hudNoiseBadge.classList.toggle('noise-loud', db > 45);
      if (hudNoiseValueEl) {
        hudNoiseValueEl.textContent = `${db} dB`;
      }
    }
    if (crouchActionBtn) {
      const canShowCrouch =
        game.gameState === 'playing' && !game.activeHidingSpot;
      crouchActionSlot?.classList.toggle('hidden', !canShowCrouch);
      crouchActionBtn.classList.toggle('active', game.isPlayerCrouching);
      crouchActionBtn.setAttribute(
        'aria-pressed',
        String(game.isPlayerCrouching),
      );
    }

    // Update Throw Kulhad / Stone right-side circle button (preserves SVG icon + count pip)
    if (hudThrowableBadge) {
      hudThrowableBadge.textContent = `${game.carriedThrowables}`;
      hudThrowableBadge.classList.toggle(
        'has-items',
        game.carriedThrowables > 0,
      );
    }
    if (throwActionBtn) {
      const canShowThrow =
        game.gameState === 'playing' &&
        game.entryPhase === 'mission_active' &&
        !game.activeHidingSpot &&
        game.carriedThrowables > 0;
      throwActionSlot?.classList.toggle('hidden', !canShowThrow);
      throwActionBtn.classList.toggle('has-items', game.carriedThrowables > 0);
      if (throwCountPip) {
        throwCountPip.textContent = `${game.carriedThrowables}`;
        throwCountPip.classList.toggle('hidden', game.carriedThrowables <= 0);
      }
    }

    // Update Watchman Baba's Blessed Bhabhut right-side circle button (F)
    if (hudBhabhutBadge) {
      const showBhabhutBadge =
        game.watchmanWarned || game.blessedBhabhutCount > 0;
      hudBhabhutBadge.classList.toggle('hidden', !showBhabhutBadge);
      const hasBhabhut = game.blessedBhabhutCount > 0;
      hudBhabhutBadge.classList.toggle('has-bhabhut', hasBhabhut);
      hudBhabhutBadge.classList.toggle('used-empty', !hasBhabhut);
    }
    if (bhabhutActionBtn) {
      const canShowBhabhut =
        game.gameState === 'playing' &&
        game.entryPhase === 'mission_active' &&
        game.blessedBhabhutCount > 0;
      bhabhutActionSlot?.classList.toggle('hidden', !canShowBhabhut);
    }

    // Fullscreen 3D Haveli Map Overlay (Hidden by default; shown ONLY when toggled with M or corner map icon)
    if (hudMinimapContainer) {
      const showMinimap =
        game.gameState === 'playing' &&
        !isInEndCutscene &&
        game.isMinimapExpanded;
      hudMinimapContainer.classList.toggle('hidden', !showMinimap);
      hudMinimapContainer.classList.toggle('expanded', showMinimap);
      hudMapIconBtn?.classList.toggle('active', showMinimap);
      if (hudMinimapTitle) {
        const floorShort =
          game.currentFloorLevel === -1
            ? 'तहख़ाना (-1)'
            : game.currentFloorLevel === 1
              ? 'दूसरी मंजिल (2F)'
              : game.currentFloorLevel === 2
                ? 'तीसरी मंजिल (3F)'
                : 'भूतल (G)';
        hudMinimapTitle.textContent = floorShort;
      }
      if (hudMinimapRoom) {
        hudMinimapRoom.textContent = game.currentRoomNameHi;
      }
      if (showMinimap) {
        miniMap3D?.resize();
      }
    }

    // Update compact Burned Well counter (flame icon + X/4, zero text clutter)
    if (hudRageBadge) {
      const showRageBadge =
        game.gameState === 'playing' &&
        game.entryPhase === 'mission_active' &&
        (game.burnedCount > 0 || game.curseBroken);
      hudRageBadge.classList.toggle('hidden', !showRageBadge);
      hudRageBadge.classList.toggle(
        'rage-1',
        game.burnedCount === 1 && !game.curseBroken,
      );
      hudRageBadge.classList.toggle(
        'rage-2',
        game.burnedCount === 2 && !game.curseBroken,
      );
      hudRageBadge.classList.toggle(
        'rage-3',
        game.burnedCount === 3 && !game.curseBroken,
      );
      hudRageBadge.classList.toggle('curse-broken', game.curseBroken);
      if (hudRageValueEl) {
        hudRageValueEl.textContent = `${game.burnedCount}/${game.requiredItems}`;
      }
    }

    // Update Hiding Spot Peek Overlay & Prompt Banner + Contextual Hide Circle Button
    const activeSpot = game.activeHidingSpot;
    const nearbySpot = game.nearbyHidingSpot;

    if (hidePeekOverlay) {
      if (activeSpot) {
        hidePeekOverlay.classList.remove(
          'hidden',
          'peek-palki',
          'peek-jaali',
          'peek-slats',
        );
        if (
          activeSpot.id === 'hide_f2_1_royal_palki' ||
          activeSpot.id === 'hide_f2_2_four_poster_bed' ||
          activeSpot.id === 'hide_g4_mandir_curtain'
        ) {
          hidePeekOverlay.classList.add('peek-palki');
        } else if (
          activeSpot.id === 'hide_g1_wall_niche' ||
          activeSpot.id === 'hide_u3_havan_niche' ||
          activeSpot.id === 'hide_u4_vault_niche' ||
          activeSpot.id === 'hide_u7_well_niche' ||
          activeSpot.id === 'hide_f2_4_jharokha_partition' ||
          activeSpot.id === 'hide_f3_4_pavilion_alcove'
        ) {
          hidePeekOverlay.classList.add('peek-jaali');
        } else {
          hidePeekOverlay.classList.add('peek-slats');
        }
        const panPx = Math.round(game.hidePeekYawOffset * 28);
        hidePeekOverlay.style.setProperty('--peek-pan-x', `${panPx}px`);
        if (hideStealthPill) {
          hideStealthPill.classList.toggle(
            'compromised',
            game.compromisedInHiding,
          );
          hideStealthPill.textContent = game.compromisedInHiding
            ? game.lang === 'hi'
              ? '⚠️ रुक्मिणी ने आपको छुपते देख लिया!'
              : '⚠️ SPOTTED ENTERING!'
            : '🔇 0 dB · [E]';
        }
      } else {
        hidePeekOverlay.classList.add('hidden');
        hidePeekOverlay.style.setProperty('--peek-pan-x', '0px');
      }
    }

    if (hidePromptBanner && hidePromptText && hideActionBtn) {
      if (activeSpot) {
        hidePromptBanner.classList.add('hidden');
        hideActionSlot?.classList.remove('hidden');
        hideActionBtn.classList.add('is-exiting');
      } else if (nearbySpot) {
        hidePromptBanner.classList.remove('hidden');
        hidePromptText.textContent = `E · ${nearbySpot.nameHi}`;
        hideActionSlot?.classList.remove('hidden');
        hideActionBtn.classList.remove('is-exiting');
      } else {
        hidePromptBanner.classList.add('hidden');
        hideActionSlot?.classList.add('hidden');
        hideActionBtn.classList.remove('is-exiting');
      }
    }
  }

  const hudRadarCanvas = document.getElementById(
    'hud-radar-canvas',
  ) as HTMLCanvasElement | null;
  const hudRadarFloorTag = document.getElementById('hud-radar-floor-tag');
  const hudFpsCounter = document.getElementById('hud-fps-counter');
  let fpsFrameCount = 0;
  let fpsAccumTime = 0;

  const syncFpsVisibility = () => {
    hudFpsCounter?.classList.toggle('hidden', !showFpsCounter);
  };
  syncFpsVisibility();

  const ensureMiniMap3D = (haveli?: MansionBuildResult, create3D = false) => {
    if (!haveli) return;
    if (!compactMiniRadar && hudRadarCanvas) {
      compactMiniRadar = new CompactMiniRadar(hudRadarCanvas, haveli);
      compactMiniRadar.rotationMode = minimapMode;
    }
    // Only allocate the secondary 3D WebGLRenderer when the player actually expands the 3D Architectural Map
    if (!create3D || miniMap3D || !hudMinimapCanvas) return;
    miniMap3D = new HaveliMiniMap3D(hudMinimapCanvas, haveli);
    miniMap3D.setExpanded(game.isMinimapExpanded);
  };

  game.onHaveliReady = (haveli) => {
    ensureMiniMap3D(haveli, false);
  };
  ensureMiniMap3D(game.getHaveliWorld(), false);

  game.onMinimapToggle = (expanded) => {
    hudMinimapContainer?.classList.toggle('hidden', !expanded);
    hudMinimapContainer?.classList.toggle('expanded', expanded);
    hudMapIconBtn?.classList.toggle('active', expanded);
    if (expanded) {
      ensureMiniMap3D(game.getHaveliWorld(), true);
    }
    miniMap3D?.setExpanded(expanded);
    if (expanded) {
      window.requestAnimationFrame(() => miniMap3D?.resize());
      window.setTimeout(() => miniMap3D?.resize(), 120);
    }
  };

  game.onMinimapFrame = (dt, localX, localZ, yaw, floorLevel) => {
    if (!compactMiniRadar) {
      ensureMiniMap3D(game.getHaveliWorld());
    }
    compactMiniRadar?.update({
      dt,
      floorLevel,
      playerX: localX,
      playerZ: localZ,
      playerYaw: yaw,
    });
    if (hudRadarFloorTag) {
      hudRadarFloorTag.textContent =
        floorLevel === -1
          ? 'B1'
          : floorLevel === 0
            ? 'G'
            : floorLevel === 1
              ? '2F'
              : '3F';
    }
    if (showFpsCounter && hudFpsCounter && dt > 0) {
      fpsFrameCount++;
      fpsAccumTime += dt;
      if (fpsAccumTime >= 0.4) {
        const fpsVal = Math.max(1, Math.min(240, Math.round(fpsFrameCount / fpsAccumTime)));
        hudFpsCounter.textContent = `${fpsVal} FPS`;
        fpsFrameCount = 0;
        fpsAccumTime = 0;
      }
    }
    if (!game.isMinimapExpanded) return;
    if (!miniMap3D) {
      ensureMiniMap3D(game.getHaveliWorld());
    }
    miniMap3D?.update({
      dt,
      floorLevel,
      playerX: localX,
      playerZ: localZ,
      playerYaw: yaw,
    });
  };

  game.onFloorChange = (nextFloor, _prevFloor, labelHi) => {
    if (hudFloorBadge) {
      hudFloorBadge.textContent = labelHi;
      hudFloorBadge.classList.toggle('floor-b1', nextFloor === -1);
      hudFloorBadge.classList.toggle('floor-gf', nextFloor === 0);
      hudFloorBadge.classList.toggle('floor-2f', nextFloor === 1);
      hudFloorBadge.classList.toggle('floor-3f', nextFloor === 2);
      hudFloorBadge.classList.remove('floor-changing');
      void hudFloorBadge.offsetWidth;
      hudFloorBadge.classList.add('floor-changing');
    }
    if (floorChangeFadeEl) {
      floorChangeFadeEl.classList.remove('floor-changing');
      void floorChangeFadeEl.offsetWidth;
      floorChangeFadeEl.classList.add('floor-changing');
    }
    if (floorFadeResetTimer !== null) {
      window.clearTimeout(floorFadeResetTimer);
    }
    floorFadeResetTimer = window.setTimeout(() => {
      floorChangeFadeEl?.classList.remove('floor-changing');
      hudFloorBadge?.classList.remove('floor-changing');
      floorFadeResetTimer = null;
    }, 580);
  };

  const triggerMapToggle = (e?: Event) => {
    e?.stopPropagation();
    if (game.gameState === 'playing') {
      game.toggleMinimapExpanded();
    }
  };

  hudMapIconBtn?.addEventListener('click', triggerMapToggle);
  hudMapIconBtn?.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      triggerMapToggle(e);
    },
    { passive: false },
  );

  hudMinimapToggleBtn?.addEventListener('click', triggerMapToggle);
  hudMinimapToggleBtn?.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      triggerMapToggle(e);
    },
    { passive: false },
  );

  // Gentle drag-to-orbit on the expanded 3D mini-map canvas
  let minimapDragging = false;
  let minimapDragX = 0;
  let minimapDragY = 0;
  hudMinimapCanvas?.addEventListener('pointerdown', (e) => {
    if (!game.isMinimapExpanded) return;
    e.stopPropagation();
    minimapDragging = true;
    minimapDragX = e.clientX;
    minimapDragY = e.clientY;
  });
  window.addEventListener('pointermove', (e) => {
    if (!minimapDragging || !game.isMinimapExpanded) return;
    const dx = e.clientX - minimapDragX;
    const dy = e.clientY - minimapDragY;
    minimapDragX = e.clientX;
    minimapDragY = e.clientY;
    miniMap3D?.adjustOrbit(-dx * 0.008, dy * 0.004);
  });
  window.addEventListener('pointerup', () => {
    minimapDragging = false;
  });
  window.addEventListener('resize', () => {
    miniMap3D?.resize();
  });

  game.onHudUpdate = () => refreshHudState();

  const triggerThrowAction = (e?: Event) => {
    e?.stopPropagation();
    game.resumeSpatialAudio();
    if (game.gameState === 'playing') {
      game.throwKulhadOrStone();
    }
  };

  throwActionBtn?.addEventListener('click', triggerThrowAction);
  throwActionBtn?.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      triggerThrowAction(e);
    },
    { passive: false },
  );

  const triggerBhabhutAction = (e?: Event) => {
    e?.stopPropagation();
    game.resumeSpatialAudio();
    if (game.gameState === 'playing') {
      game.useBlessedBhabhut();
    }
  };

  bhabhutActionBtn?.addEventListener('click', triggerBhabhutAction);
  bhabhutActionBtn?.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      triggerBhabhutAction(e);
    },
    { passive: false },
  );

  const triggerCrouchAction = (e?: Event) => {
    e?.stopPropagation();
    game.resumeSpatialAudio();
    if (game.gameState === 'playing') {
      game.togglePlayerCrouch();
    }
  };

  crouchActionBtn?.addEventListener('click', triggerCrouchAction);
  crouchActionBtn?.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      triggerCrouchAction(e);
    },
    { passive: false },
  );

  const triggerJumpAction = (e?: Event) => {
    e?.stopPropagation();
    game.resumeSpatialAudio();
    if (game.gameState === 'playing') {
      game.triggerJump();
    }
  };

  jumpActionBtn?.addEventListener('click', triggerJumpAction);
  jumpActionBtn?.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      triggerJumpAction(e);
    },
    { passive: false },
  );

  // =========================================================================
  // LEFT-SIDEBAR 4-TAB PRO SETTINGS MENU (LOBBY & IN-GAME LIVE UPDATES)
  // =========================================================================
  const igSettingsCloseX = document.getElementById('ig-settings-close-x');
  const igSettingsTabsContainer = document.getElementById(
    'ig-settings-tabs-container',
  );
  const proSideTabs = document.querySelectorAll<HTMLButtonElement>('.pro-side-tab');
  const proPanels: Record<'inmatch' | 'display' | 'sound' | 'account', HTMLElement | null> = {
    inmatch: document.getElementById('pro-panel-inmatch'),
    display: document.getElementById('pro-panel-display'),
    sound: document.getElementById('pro-panel-sound'),
    account: document.getElementById('pro-panel-account'),
  };
  const proSubTabBtns = document.querySelectorAll<HTMLButtonElement>('.pro-subtab-btn');
  const proSubPanels: Record<'hud' | 'controls' | 'sensitivity', HTMLElement | null> = {
    hud: document.getElementById('pro-subpanel-hud'),
    controls: document.getElementById('pro-subpanel-controls'),
    sensitivity: document.getElementById('pro-subpanel-sensitivity'),
  };
  const hudPresetCards = document.querySelectorAll<HTMLButtonElement>(
    '.hud-preset-card[data-hud-preset-card]',
  );

  const igFpsToggle = document.getElementById(
    'ig-fps-toggle',
  ) as HTMLInputElement | null;
  const igSensSlider = document.getElementById(
    'ig-sens-slider',
  ) as HTMLInputElement | null;
  const igSensValue = document.getElementById('ig-sens-value');
  const proSensMinus = document.getElementById('pro-sens-minus');
  const proSensPlus = document.getElementById('pro-sens-plus');
  const igVolSlider = document.getElementById(
    'ig-vol-slider',
  ) as HTMLInputElement | null;
  const igVolValue = document.getElementById('ig-vol-value');
  const proBrightnessSlider = document.getElementById(
    'pro-brightness-slider',
  ) as HTMLInputElement | null;
  const proBrightnessValue = document.getElementById('pro-brightness-value');
  const proMusicSlider = document.getElementById(
    'pro-music-slider',
  ) as HTMLInputElement | null;
  const proMusicValue = document.getElementById('pro-music-value');
  const proSfxSlider = document.getElementById(
    'pro-sfx-slider',
  ) as HTMLInputElement | null;
  const proSfxValue = document.getElementById('pro-sfx-value');
  const proDialogueSlider = document.getElementById(
    'pro-dialogue-slider',
  ) as HTMLInputElement | null;
  const proDialogueValue = document.getElementById('pro-dialogue-value');
  const proPlayerNameInput = document.getElementById(
    'pro-player-name-input',
  ) as HTMLInputElement | null;
  const proClearCacheBtn = document.getElementById('pro-clear-cache-btn');
  const proResetProgressBtn = document.getElementById('pro-reset-progress-btn');
  const proAccountFeedback = document.getElementById('pro-account-feedback');
  const proPrivacyBtn = document.getElementById('pro-privacy-btn');
  const privacyPolicyModal = document.getElementById('privacy-policy-modal');
  const privacyPolicyCloseBtn = document.getElementById('privacy-policy-close-btn');
  const resetProgressConfirmModal = document.getElementById(
    'reset-progress-confirm-modal',
  );
  const resetProgressCloseX = document.getElementById('reset-progress-close-x');
  const resetProgressCancelBtn = document.getElementById(
    'reset-progress-cancel-btn',
  );
  const resetProgressConfirmBtn = document.getElementById(
    'reset-progress-confirm-btn',
  );

  const switchProSettingsTab = (
    tab: 'inmatch' | 'display' | 'sound' | 'account',
  ) => {
    proSideTabs.forEach((btn) => {
      const active = btn.dataset.proTab === tab;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    });
    (Object.keys(proPanels) as Array<keyof typeof proPanels>).forEach((key) => {
      proPanels[key]?.classList.toggle('hidden', key !== tab);
    });
  };

  const switchInMatchSubTab = (sub: 'hud' | 'controls' | 'sensitivity') => {
    proSubTabBtns.forEach((btn) => {
      const active = btn.dataset.inmatchSubtab === sub;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    });
    (Object.keys(proSubPanels) as Array<keyof typeof proSubPanels>).forEach(
      (key) => {
        proSubPanels[key]?.classList.toggle('hidden', key !== sub);
      },
    );
  };

  proSideTabs.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tab = btn.dataset.proTab as
        | 'inmatch'
        | 'display'
        | 'sound'
        | 'account'
        | undefined;
      if (tab) switchProSettingsTab(tab);
    });
  });

  proSubTabBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sub = btn.dataset.inmatchSubtab as
        | 'hud'
        | 'controls'
        | 'sensitivity'
        | undefined;
      if (sub) switchInMatchSubTab(sub);
    });
  });

  syncHudPresetCards = () => {
    const activePreset = hudLayoutEditor.getActivePreset();
    hudPresetCards.forEach((card) => {
      const cardId = Number(card.dataset.hudPresetCard) === 2 ? 2 : 1;
      const isActive = cardId === activePreset;
      card.classList.toggle('active', isActive);
      const badge = card.querySelector('.hud-preset-state');
      if (badge) badge.textContent = isActive ? 'ACTIVE' : 'SELECT';
    });
  };

  hudPresetCards.forEach((card) => {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      const presetId: HudPresetId =
        Number(card.dataset.hudPresetCard) === 2 ? 2 : 1;
      hudLayoutEditor.selectPreset(presetId);
      syncHudPresetCards();
    });
  });

  const syncInGameSettingsUI = () => {
    const curQuality =
      game.graphicsQuality === 'ultra' ? 'high' : game.graphicsQuality;
    const curFps = Number(fpsSettingSelect.value || 60);

    syncHudPresetCards();

    document
      .querySelectorAll<HTMLButtonElement>('#ig-gfx-preset-group .ig-seg-btn')
      .forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.gfxPreset === curQuality);
      });
    document
      .querySelectorAll<HTMLButtonElement>('#pro-shadows-group .ig-seg-btn')
      .forEach((btn) => {
        btn.classList.toggle(
          'active',
          btn.dataset.shadowsOpt === (shadowsEnabled ? 'on' : 'off'),
        );
      });
    document
      .querySelectorAll<HTMLButtonElement>('#pro-highfps-group .ig-seg-btn')
      .forEach((btn) => {
        btn.classList.toggle(
          'active',
          btn.dataset.highfpsOpt === (curFps >= 60 ? 'high' : 'normal'),
        );
      });
    document
      .querySelectorAll<HTMLButtonElement>('#pro-minimap-group .ig-seg-btn')
      .forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.minimapOpt === minimapMode);
      });
    document
      .querySelectorAll<HTMLButtonElement>('#pro-notch-group .ig-seg-btn')
      .forEach((btn) => {
        btn.classList.toggle(
          'active',
          btn.dataset.notchOpt === (notchScreenEnabled ? 'on' : 'off'),
        );
      });
    document
      .querySelectorAll<HTMLButtonElement>('#ig-controls-mode-group .ig-seg-btn')
      .forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.ctrlMode === game.controlsMode);
      });
    document
      .querySelectorAll<HTMLButtonElement>('#pro-autosprint-group .ig-seg-btn')
      .forEach((btn) => {
        btn.classList.toggle(
          'active',
          btn.dataset.autosprintOpt === (autoSprintBtnEnabled ? 'on' : 'off'),
        );
      });
    document
      .querySelectorAll<HTMLButtonElement>('#pro-crosshair-group .ig-seg-btn')
      .forEach((btn) => {
        btn.classList.toggle(
          'active',
          btn.dataset.crosshairOpt === crosshairType,
        );
      });
    document
      .querySelectorAll<HTMLButtonElement>('#pro-mute-all-group .ig-seg-btn')
      .forEach((btn) => {
        btn.classList.toggle(
          'active',
          btn.dataset.muteallOpt === (muteAll ? 'on' : 'off'),
        );
      });
    document
      .querySelectorAll<HTMLButtonElement>('#pro-voices-group .ig-seg-btn')
      .forEach((btn) => {
        btn.classList.toggle(
          'active',
          btn.dataset.voicesOpt === (characterVoicesEnabled ? 'on' : 'off'),
        );
      });
    document
      .querySelectorAll<HTMLButtonElement>('#pro-lang-group .ig-seg-btn')
      .forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.langOpt === game.lang);
      });

    if (igFpsToggle) igFpsToggle.checked = showFpsCounter;
    if (proBrightnessSlider) proBrightnessSlider.value = String(brightnessPercent);
    if (proBrightnessValue) proBrightnessValue.textContent = `${brightnessPercent}%`;

    const sensInt = Math.max(
      10,
      Math.min(200, Math.round(game.cameraSensitivity * 100)),
    );
    if (igSensSlider) igSensSlider.value = String(sensInt);
    if (igSensValue) igSensValue.textContent = String(sensInt);

    const vol = parseSliderPercent(audioVolInput.value, 100);
    if (igVolSlider) igVolSlider.value = String(vol);
    if (igVolValue) igVolValue.textContent = `${vol}%`;
    if (proMusicSlider) proMusicSlider.value = String(musicVolume);
    if (proMusicValue) proMusicValue.textContent = `${musicVolume}%`;
    if (proSfxSlider) proSfxSlider.value = String(sfxVolume);
    if (proSfxValue) proSfxValue.textContent = `${sfxVolume}%`;
    if (proDialogueSlider) proDialogueSlider.value = String(dialogueVolume);
    if (proDialogueValue) proDialogueValue.textContent = `${dialogueVolume}%`;

    if (proPlayerNameInput) {
      proPlayerNameInput.value = game.playerName || playerNameInput.value || 'Aarav';
    }
  };
  syncInGameSettingsUI();

  // DISPLAY Tab Listeners (Live Immediate Application)
  document
    .querySelectorAll<HTMLButtonElement>('#ig-gfx-preset-group .ig-seg-btn')
    .forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const preset = btn.dataset.gfxPreset as
          | 'low'
          | 'medium'
          | 'high'
          | 'ultra'
          | undefined;
        if (!preset) return;
        gfxQualitySelect.value = preset;
        applyAndSaveGameSettings();
        syncInGameSettingsUI();
      });
    });

  document
    .querySelectorAll<HTMLButtonElement>('#pro-shadows-group .ig-seg-btn')
    .forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        shadowsEnabled = btn.dataset.shadowsOpt === 'on';
        applyAndSaveGameSettings();
        syncInGameSettingsUI();
      });
    });

  document
    .querySelectorAll<HTMLButtonElement>('#pro-highfps-group .ig-seg-btn')
    .forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        fpsSettingSelect.value = btn.dataset.highfpsOpt === 'high' ? '60' : '30';
        applyAndSaveGameSettings();
        syncInGameSettingsUI();
      });
    });

  document
    .querySelectorAll<HTMLButtonElement>('#pro-minimap-group .ig-seg-btn')
    .forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const opt = btn.dataset.minimapOpt;
        if (opt === 'north_up' || opt === 'rotating') {
          minimapMode = opt;
          applyAndSaveGameSettings();
          syncInGameSettingsUI();
        }
      });
    });

  document
    .querySelectorAll<HTMLButtonElement>('#pro-notch-group .ig-seg-btn')
    .forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        notchScreenEnabled = btn.dataset.notchOpt === 'on';
        applyAndSaveGameSettings();
        syncInGameSettingsUI();
      });
    });

  proBrightnessSlider?.addEventListener('input', () => {
    const raw = Number(proBrightnessSlider.value);
    brightnessPercent = Number.isFinite(raw)
      ? Math.max(80, Math.min(150, Math.round(raw)))
      : 100;
    if (proBrightnessValue) {
      proBrightnessValue.textContent = `${brightnessPercent}%`;
    }
    game.setBrightness(brightnessPercent);
    lobbyScene3D?.setBrightness(brightnessPercent);
    applyAndSaveGameSettings();
  });

  igFpsToggle?.addEventListener('change', () => {
    showFpsCounter = igFpsToggle.checked;
    syncFpsVisibility();
    applyAndSaveGameSettings();
  });

  // IN-MATCH > CONTROLS Listeners
  document
    .querySelectorAll<HTMLButtonElement>('#ig-controls-mode-group .ig-seg-btn')
    .forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mode = btn.dataset.ctrlMode as ControlsMode | undefined;
        if (mode === 'auto' || mode === 'pc' || mode === 'mobile') {
          applyControlsMode(mode);
          syncInGameSettingsUI();
        }
      });
    });

  document
    .querySelectorAll<HTMLButtonElement>('#pro-autosprint-group .ig-seg-btn')
    .forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        autoSprintBtnEnabled = btn.dataset.autosprintOpt === 'on';
        applyAndSaveGameSettings();
        syncInGameSettingsUI();
      });
    });

  document
    .querySelectorAll<HTMLButtonElement>('#pro-crosshair-group .ig-seg-btn')
    .forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const opt = btn.dataset.crosshairOpt;
        if (opt === 'dot' || opt === 'classic') {
          crosshairType = opt;
          applyAndSaveGameSettings();
          syncInGameSettingsUI();
        }
      });
    });

  // IN-MATCH > SENSITIVITY (10 - 200 with - / + step buttons)
  const updateCameraSensitivity = (rawValue: number) => {
    const clamped = Math.max(10, Math.min(200, Math.round(rawValue)));
    game.cameraSensitivity = clamped / 100;
    if (igSensSlider) igSensSlider.value = String(clamped);
    if (igSensValue) igSensValue.textContent = String(clamped);
    applyAndSaveGameSettings();
  };

  igSensSlider?.addEventListener('input', () => {
    updateCameraSensitivity(Number(igSensSlider.value) || 100);
  });
  proSensMinus?.addEventListener('click', (e) => {
    e.stopPropagation();
    updateCameraSensitivity(Math.round(game.cameraSensitivity * 100) - 5);
  });
  proSensPlus?.addEventListener('click', (e) => {
    e.stopPropagation();
    updateCameraSensitivity(Math.round(game.cameraSensitivity * 100) + 5);
  });

  // SOUND Tab Listeners (Mute All, Master, Ambience, SFX, Hindi Dialogue, Voices)
  document
    .querySelectorAll<HTMLButtonElement>('#pro-mute-all-group .ig-seg-btn')
    .forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        muteAll = btn.dataset.muteallOpt === 'on';
        game.synth.setMuteAll(muteAll);
        applyAndSaveGameSettings();
        syncInGameSettingsUI();
      });
    });

  igVolSlider?.addEventListener('input', () => {
    const vol = parseSliderPercent(igVolSlider.value, 100);
    audioVolInput.value = String(vol);
    audioVolLabel.textContent = `${vol}%`;
    if (igVolValue) igVolValue.textContent = `${vol}%`;
    game.synth.setMasterVolume(vol);
    applyAndSaveGameSettings();
  });

  proMusicSlider?.addEventListener('input', () => {
    musicVolume = parseSliderPercent(proMusicSlider.value, 85);
    if (proMusicValue) proMusicValue.textContent = `${musicVolume}%`;
    game.synth.setMusicVolume(musicVolume);
    applyAndSaveGameSettings();
  });

  proSfxSlider?.addEventListener('input', () => {
    sfxVolume = parseSliderPercent(proSfxSlider.value, 100);
    if (proSfxValue) proSfxValue.textContent = `${sfxVolume}%`;
    game.synth.setSfxVolume(sfxVolume);
    applyAndSaveGameSettings();
  });

  proDialogueSlider?.addEventListener('input', () => {
    dialogueVolume = parseSliderPercent(proDialogueSlider.value, 100);
    if (proDialogueValue) proDialogueValue.textContent = `${dialogueVolume}%`;
    game.synth.setDialogueVolume(dialogueVolume);
    applyAndSaveGameSettings();
  });

  document
    .querySelectorAll<HTMLButtonElement>('#pro-voices-group .ig-seg-btn')
    .forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        characterVoicesEnabled = btn.dataset.voicesOpt === 'on';
        game.synth.setCharacterVoicesEnabled(characterVoicesEnabled);
        applyAndSaveGameSettings();
        syncInGameSettingsUI();
      });
    });

  // ACCOUNT & BASIC Tab Listeners
  proPlayerNameInput?.addEventListener('input', () => {
    const cleaned = proPlayerNameInput.value.trim();
    if (!cleaned) return;
    game.playerName = cleaned;
    playerNameInput.value = cleaned;
    savePlayerNameToStorage(cleaned);
    syncProfileUI();
  });

  proPlayerNameInput?.addEventListener('blur', () => {
    const cleaned = proPlayerNameInput.value.trim() || 'Aarav';
    proPlayerNameInput.value = cleaned;
    game.playerName = cleaned;
    playerNameInput.value = cleaned;
    savePlayerNameToStorage(cleaned);
    syncProfileUI();
  });

  document
    .querySelectorAll<HTMLButtonElement>('#pro-lang-group .ig-seg-btn')
    .forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const lang = btn.dataset.langOpt;
        if (lang === 'hi' || lang === 'en') {
          game.lang = lang;
          langSelect.value = lang;
          applyAndSaveGameSettings();
          syncInGameSettingsUI();
        }
      });
    });

  const showProAccountFeedback = (msg: string) => {
    if (!proAccountFeedback) return;
    proAccountFeedback.textContent = msg;
    proAccountFeedback.classList.remove('hidden');
    window.setTimeout(() => {
      proAccountFeedback.classList.add('hidden');
    }, 3400);
  };

  proClearCacheBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      if ('caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((k) => window.caches.delete(k)));
      }
      sessionStorage.clear();
    } catch {
      // Ignore restricted cache errors
    }
    showProAccountFeedback(
      game.lang === 'hi'
        ? 'लोकल कैश सफलतापूर्वक साफ़ हो गया।'
        : 'Local cache cleared cleanly. Saved story progress kept intact.',
    );
  });

  proResetProgressBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    resetProgressConfirmModal?.classList.remove('hidden');
  });

  const closeResetProgressModal = () => {
    resetProgressConfirmModal?.classList.add('hidden');
  };
  resetProgressCloseX?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeResetProgressModal();
  });
  resetProgressCancelBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeResetProgressModal();
  });
  resetProgressConfirmModal?.addEventListener('click', (e) => {
    if (e.target === resetProgressConfirmModal) {
      closeResetProgressModal();
    }
  });
  resetProgressConfirmBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    try {
      localStorage.removeItem('rakt_pishachini_save_data');
      localStorage.removeItem('rakt_pishachini_profile_stats_v1');
      localStorage.removeItem('rakt_pishachini_badges_v1');
      localStorage.removeItem('rakt_pishachini_profile_bio_v1');
      localStorage.removeItem('rakt_pishachini_mail_read_v1');
    } catch {
      // Ignore storage errors
    }
    const bioEl = document.getElementById(
      'profile-bio-input',
    ) as HTMLTextAreaElement | null;
    if (bioEl) {
      bioEl.value =
        'Trapped inside the 1992 Thakur Haveli. Silence is the only way out.';
    }
    syncLobbyContinueVisibility();
    syncProfileUI();
    syncBadgesUI();
    syncMailDotUI();
    closeResetProgressModal();
    showProAccountFeedback(
      game.lang === 'hi'
        ? 'लोकल प्रोग्रेस, स्टैट्स और बैज रीसेट हो गए हैं।'
        : 'Local progress, career stats, and badges have been reset.',
    );
  });

  proPrivacyBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    privacyPolicyModal?.classList.remove('hidden');
  });
  privacyPolicyCloseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    privacyPolicyModal?.classList.add('hidden');
  });
  privacyPolicyModal?.addEventListener('click', (e) => {
    if (e.target === privacyPolicyModal) {
      privacyPolicyModal.classList.add('hidden');
    }
  });

  igSettingsCloseX?.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasGameplay =
      pausedFromState === 'gameplay' ||
      (pausedFromState !== 'lobby' &&
        pausedFromState !== 'intro_story' &&
        !hud.classList.contains('hidden'));
    resumeFromPauseMenu();
    if (wasGameplay) {
      game.requestImmediateDesktopPointerLock();
    }
  });

  openLobbySettingsModal = () => {
    pausedFromState = 'lobby';
    if (pauseModalTitle) pauseModalTitle.textContent = 'SETTINGS';
    if (pauseModalSubtitle) {
      pauseModalSubtitle.textContent =
        'Changes apply live immediately across Lobby and Gameplay.';
    }
    if (resumeGameBtn) {
      resumeGameBtn.textContent = 'Close';
    }
    pauseExitMenuBtn?.classList.add('hidden');
    pauseSkipStoryBtn?.classList.add('hidden');
    igSettingsTabsContainer?.classList.remove('hidden');
    syncInGameSettingsUI();
    pauseModal?.classList.remove('hidden');
  };

  // =========================================================================
  // 3D HORROR LOBBY, PROFILE MODAL, FRIENDS & TEAMCODE DRAWER & LAUNCH FLOW
  // =========================================================================
  const PROFILE_BIO_STORAGE_KEY = 'rakt_pishachini_profile_bio_v1';
  const PROFILE_STATS_STORAGE_KEY = 'rakt_pishachini_profile_stats_v1';
  const PLAYER_UID_STORAGE_KEY = 'rakt_pishachini_player_uid_v1';
  const MAIL_READ_STORAGE_KEY = 'rakt_pishachini_mail_read_v1';

  const getOrCreatePlayerUid = (): string => {
    try {
      const saved = localStorage.getItem(PLAYER_UID_STORAGE_KEY);
      if (saved && /^\d{8}$/.test(saved)) {
        return saved;
      }
      const generated = `1992${String(Math.floor(1000 + Math.random() * 9000))}`;
      localStorage.setItem(PLAYER_UID_STORAGE_KEY, generated);
      return generated;
    } catch {
      return '19920041';
    }
  };
  const PLAYER_UID = getOrCreatePlayerUid();

  const lobby3dStage = document.getElementById('lobby-3d-stage');
  const lobbyProfileBanner = document.getElementById('lobby-profile-banner');
  const lobbyPlayerNameEl = document.getElementById('lobby-player-name');
  const lobbyPlayerLevelEl = document.getElementById('lobby-player-level');
  const lobbyPlayerUidEl = document.getElementById('lobby-player-uid');
  const lobbyCopyUidBtn = document.getElementById('lobby-copy-uid-btn');
  const lobbyFpsBadge = document.getElementById('lobby-fps-badge');
  const lobbyMailBtn = document.getElementById('lobby-mail-btn');
  const lobbyMailDot = document.getElementById('lobby-mail-dot');
  const lobbyNewsBtn = document.getElementById('lobby-news-btn');
  const lobbySettingsBtn = document.getElementById('lobby-settings-btn');
  const lobbyFriendsToggleBtn = document.getElementById(
    'lobby-friends-toggle-btn',
  );
  const lobbyFriendsDrawer = document.getElementById('lobby-friends-drawer');
  const lobbyFriendsCloseBtn = document.getElementById('lobby-friends-close-btn');
  const lobbyTeamcodeBtn = document.getElementById('lobby-teamcode-btn');
  const lobbyTeamcodePanel = document.getElementById('lobby-teamcode-panel');
  const lobbyTeamcodeValue = document.getElementById('lobby-teamcode-value');
  const lobbyTeamcodeGenBtn = document.getElementById('lobby-teamcode-gen-btn');
  const lobbyTeamcodeCopyBtn = document.getElementById('lobby-teamcode-copy-btn');
  const lobbyTeamcodeInput = document.getElementById(
    'lobby-teamcode-input',
  ) as HTMLInputElement | null;
  const lobbyTeamcodeJoinBtn = document.getElementById('lobby-teamcode-join-btn');
  const lobbyTeamcodeFeedback = document.getElementById('lobby-teamcode-feedback');

  const profileModal = document.getElementById('profile-modal');
  const profileModalCloseBtn = document.getElementById('profile-modal-close-btn');
  const profile3dViewport = document.getElementById('profile-3d-viewport');
  const profileDisplayNameEl = document.getElementById('profile-display-name');
  const profileDisplayLevelEl = document.getElementById('profile-display-level');
  const profileDisplayUidEl = document.getElementById('profile-display-uid');
  const profileCopyUidBtn = document.getElementById('profile-copy-uid-btn');
  const profileNameInput = document.getElementById(
    'profile-name-input',
  ) as HTMLInputElement | null;
  const profileRenameBtn = document.getElementById('profile-rename-btn');
  const profileBioInput = document.getElementById(
    'profile-bio-input',
  ) as HTMLTextAreaElement | null;
  const profileStatEscapesEl = document.getElementById('profile-stat-escapes');
  const profileStatRelicsEl = document.getElementById('profile-stat-relics');
  const profileStatFriendsEl = document.getElementById('profile-stat-friends');
  const profileStatDeathsEl = document.getElementById('profile-stat-deaths');
  const profileStatBestTimeEl = document.getElementById('profile-stat-besttime');

  const formatBestTime = (sec: number | null): string => {
    if (sec === null || !Number.isFinite(sec) || sec <= 0) return '--:--';
    const mins = Math.floor(sec / 60);
    const rem = Math.floor(sec % 60);
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  syncLobbyContinueVisibility = () => {
    continueGameBtn.classList.toggle('hidden', !game.hasSavedProgress());
  };

  syncMailDotUI = () => {
    let isRead = false;
    try {
      isRead = localStorage.getItem(MAIL_READ_STORAGE_KEY) === '1';
    } catch {
      isRead = false;
    }
    lobbyMailDot?.classList.toggle('hidden', isRead);
  };
  syncMailDotUI();

  syncProfileUI = () => {
    const displayName =
      (game.playerName || playerNameInput.value || 'Aarav').trim() || 'Aarav';
    let escapes = 0;
    let relicsBurned = 0;
    let friendsRescued = 0;
    let totalDeaths = 0;
    let bestTimeSec: number | null = null;
    try {
      const raw = localStorage.getItem(PROFILE_STATS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          escapes?: number;
          relicsBurned?: number;
          friendsRescued?: number;
          totalDeaths?: number;
          bestTimeSec?: number | null;
        };
        escapes = Math.max(0, Number(parsed.escapes) || 0);
        relicsBurned = Math.max(0, Number(parsed.relicsBurned) || 0);
        friendsRescued = Math.max(0, Number(parsed.friendsRescued) || 0);
        totalDeaths = Math.max(0, Number(parsed.totalDeaths) || 0);
        bestTimeSec =
          typeof parsed.bestTimeSec === 'number' ? parsed.bestTimeSec : null;
      }
      const savedBio = localStorage.getItem(PROFILE_BIO_STORAGE_KEY);
      if (profileBioInput && savedBio !== null) {
        profileBioInput.value = savedBio;
      }
    } catch {
      // Ignore storage read errors
    }

    const level = 1 + escapes * 2 + Math.floor((relicsBurned + friendsRescued) / 2);
    if (lobbyPlayerNameEl) lobbyPlayerNameEl.textContent = displayName;
    if (lobbyPlayerLevelEl) lobbyPlayerLevelEl.textContent = `Lv. ${level}`;
    if (lobbyPlayerUidEl) lobbyPlayerUidEl.textContent = `UID: ${PLAYER_UID}`;

    if (profileDisplayNameEl) profileDisplayNameEl.textContent = displayName;
    if (profileDisplayLevelEl) profileDisplayLevelEl.textContent = `Lv. ${level}`;
    if (profileDisplayUidEl) {
      profileDisplayUidEl.textContent = `UID: ${PLAYER_UID}`;
    }
    if (profileNameInput && document.activeElement !== profileNameInput) {
      profileNameInput.value = displayName;
    }
    if (profileStatEscapesEl) profileStatEscapesEl.textContent = String(escapes);
    if (profileStatRelicsEl) {
      profileStatRelicsEl.textContent = String(relicsBurned);
    }
    if (profileStatFriendsEl) {
      profileStatFriendsEl.textContent = String(friendsRescued);
    }
    if (profileStatDeathsEl) {
      profileStatDeathsEl.textContent = String(totalDeaths);
    }
    if (profileStatBestTimeEl) {
      profileStatBestTimeEl.textContent = formatBestTime(bestTimeSec);
    }
  };

  game.onCareerStatsUpdated = () => {
    syncProfileUI();
  };
  syncLobbyContinueVisibility();
  syncProfileUI();

  const ensureLobbyScene3D = (): HorrorLobbyScene3D | null => {
    if (lobbyScene3D) return lobbyScene3D;
    if (!lobby3dStage) return null;
    lobbyScene3D = new HorrorLobbyScene3D(lobby3dStage);
    const curGfx =
      (gfxQualitySelect.value as 'ultra' | 'high' | 'medium' | 'low') || 'high';
    const curFps = Number(fpsSettingSelect.value || 60);
    lobbyScene3D.applyQualityPreset(curGfx, shadowsEnabled);
    lobbyScene3D.setBrightness(brightnessPercent);
    lobbyScene3D.setTargetFps(curFps);
    return lobbyScene3D;
  };

  // Live Lobby Top-Right FPS Indicator Badge
  if (lobbyFpsBadge) {
    let fpsFrames = 0;
    let fpsLastSample = performance.now();
    const tickLobbyFps = (now: number) => {
      if (!menuScreen.classList.contains('hidden')) {
        fpsFrames++;
        const elapsed = now - fpsLastSample;
        if (elapsed >= 500) {
          const measured = Math.max(
            1,
            Math.min(120, Math.round((fpsFrames * 1000) / elapsed)),
          );
          const cap = Number(fpsSettingSelect.value || 60);
          const shown = Math.min(measured, cap >= 60 ? 60 : 30);
          lobbyFpsBadge.textContent = `${shown} FPS`;
          lobbyFpsBadge.classList.toggle('is-good', shown >= 48);
          lobbyFpsBadge.classList.toggle('is-warn', shown >= 28 && shown < 48);
          lobbyFpsBadge.classList.toggle('is-low', shown < 28);
          fpsFrames = 0;
          fpsLastSample = now;
        }
      } else {
        fpsFrames = 0;
        fpsLastSample = now;
      }
      window.requestAnimationFrame(tickLobbyFps);
    };
    window.requestAnimationFrame(tickLobbyFps);
  }

  // Lobby Top-Right Settings Gear
  lobbySettingsBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    unlockAndStartMenuAmbience();
    openLobbySettingsModal();
  });

  // Profile Screen Open/Close (shares single 3D WebGL scene with Lobby)
  const openProfileModal = () => {
    syncProfileUI();
    profileModal?.classList.remove('hidden');
    if (profile3dViewport) {
      const lobby = ensureLobbyScene3D();
      lobby?.mountTo(profile3dViewport, true);
      lobby?.setActive(true);
      window.requestAnimationFrame(() => lobbyScene3D?.resize());
    }
  };

  const closeProfileModal = () => {
    profileModal?.classList.add('hidden');
    lobbyScene3D?.mountToLobby();
    if (!menuScreen.classList.contains('hidden')) {
      const lobby = ensureLobbyScene3D();
      lobby?.setActive(true);
      window.requestAnimationFrame(() => lobbyScene3D?.resize());
    }
  };

  const copyPlayerUidWithFeedback = async (
    btn: HTMLElement | null,
    defaultLabel: string,
  ) => {
    try {
      await navigator.clipboard.writeText(PLAYER_UID);
    } catch {
      // Ignore clipboard restrictions
    }
    if (btn) {
      btn.textContent = 'Copied!';
      window.setTimeout(() => {
        btn.textContent = defaultLabel;
      }, 1500);
    }
    showMenuNotice(`Copied UID: ${PLAYER_UID}`);
  };

  lobbyCopyUidBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    void copyPlayerUidWithFeedback(lobbyCopyUidBtn, 'Copy UID');
  });

  lobbyProfileBanner?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement | null)?.closest('#lobby-copy-uid-btn')) {
      return;
    }
    e.stopPropagation();
    openProfileModal();
  });

  lobbyProfileBanner?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if ((e.target as HTMLElement | null)?.closest('#lobby-copy-uid-btn')) {
        return;
      }
      e.preventDefault();
      openProfileModal();
    }
  });

  profileModalCloseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeProfileModal();
  });

  profileModal?.addEventListener('click', (e) => {
    if (e.target === profileModal) {
      closeProfileModal();
    }
  });

  profileCopyUidBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    void copyPlayerUidWithFeedback(profileCopyUidBtn, 'Copy UID');
  });

  const commitProfileRename = () => {
    if (!profileNameInput) return;
    const cleaned = profileNameInput.value.trim() || 'Aarav';
    profileNameInput.value = cleaned;
    game.playerName = cleaned;
    playerNameInput.value = cleaned;
    if (proPlayerNameInput) proPlayerNameInput.value = cleaned;
    savePlayerNameToStorage(cleaned);
    syncProfileUI();
    if (profileRenameBtn) {
      profileRenameBtn.textContent = 'Saved!';
      window.setTimeout(() => {
        profileRenameBtn.textContent = 'Rename';
      }, 1400);
    }
  };

  profileRenameBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    commitProfileRename();
  });

  profileNameInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitProfileRename();
    }
  });

  profileBioInput?.addEventListener('input', () => {
    try {
      localStorage.setItem(PROFILE_BIO_STORAGE_KEY, profileBioInput.value);
    } catch {
      // Ignore storage write errors
    }
  });

  // Subtle, crisp one-shot UI button tap sound (never continuous oscillators)
  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement | null)?.closest<HTMLElement>(
      'button, [role="tab"]',
    );
    if (!btn || btn.hasAttribute('disabled')) return;
    game.synth.playUiTapSound();
  });

  // Collapsible Friends & TEAMCODE Drawer
  const setFriendsDrawerOpen = (open: boolean) => {
    lobbyFriendsDrawer?.classList.toggle('collapsed', !open);
    lobbyFriendsToggleBtn?.classList.toggle('active', open);
    lobbyFriendsToggleBtn?.setAttribute('aria-expanded', String(open));
  };

  lobbyFriendsToggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const currentlyCollapsed =
      lobbyFriendsDrawer?.classList.contains('collapsed') ?? true;
    setFriendsDrawerOpen(currentlyCollapsed);
  });

  lobbyFriendsCloseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    setFriendsDrawerOpen(false);
  });

  const generateSquadCode = () => {
    const digits = Math.floor(100000 + Math.random() * 900000);
    return `RP-${digits}`;
  };

  lobbyTeamcodeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    lobbyTeamcodePanel?.classList.toggle('hidden');
  });

  lobbyTeamcodeGenBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const nextCode = generateSquadCode();
    if (lobbyTeamcodeValue) lobbyTeamcodeValue.textContent = nextCode;
    if (lobbyTeamcodeFeedback) {
      lobbyTeamcodeFeedback.textContent =
        'New Squad Code generated (Single Player Demo — Online Co-Op Coming Soon).';
      lobbyTeamcodeFeedback.classList.remove('hidden');
    }
  });

  lobbyTeamcodeCopyBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const code = lobbyTeamcodeValue?.textContent?.trim() || 'RP-842910';
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Ignore clipboard restrictions
    }
    lobbyTeamcodeCopyBtn.textContent = 'Copied!';
    window.setTimeout(() => {
      lobbyTeamcodeCopyBtn.textContent = 'Copy';
    }, 1600);
  });

  lobbyTeamcodeJoinBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const code = lobbyTeamcodeInput?.value.trim().toUpperCase() || '';
    if (lobbyTeamcodeFeedback) {
      lobbyTeamcodeFeedback.textContent = code
        ? `Squad ${code} saved — Single Player Demo (Online Co-Op Coming Soon).`
        : 'Enter a Squad Code first — Online Co-Op Coming Soon.';
      lobbyTeamcodeFeedback.classList.remove('hidden');
    }
  });

  document
    .querySelectorAll<HTMLButtonElement>('.friend-invite-btn[data-invite-friend]')
    .forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const friendName = btn.dataset.inviteFriend || 'Friend';
        btn.classList.add('invited');
        btn.textContent = '✓';
        showMenuNotice(
          `Invite queued for ${friendName} — Single Player Demo (Online Co-Op Coming Soon)`,
        );
      });
    });

  // =========================================================================
  // LEFT VERTICAL HORROR SIDEBAR (CHARACTERS, GEAR, DIARY, BADGES)
  // MODE & DIFFICULTY PICKER + BOTTOM-LEFT HORROR TIP TICKER
  // =========================================================================
  const BADGES_STORAGE_KEY = 'rakt_pishachini_badges_v1';
  const LOBBY_MODE_STORAGE_KEY = 'rakt_pishachini_lobby_mode_v1';

  const lobbyNavCharacters = document.getElementById('lobby-nav-characters');
  const lobbyNavGear = document.getElementById('lobby-nav-gear');
  const lobbyNavDiary = document.getElementById('lobby-nav-diary');
  const lobbyNavBadges = document.getElementById('lobby-nav-badges');

  const lobbyCharactersModal = document.getElementById('lobby-characters-modal');
  const lobbyGearModal = document.getElementById('lobby-gear-modal');
  const lobbyDiaryModal = document.getElementById('lobby-diary-modal');
  const lobbyBadgesModal = document.getElementById('lobby-badges-modal');
  const lobbyBadgesSummary = document.getElementById('lobby-badges-summary');
  const lobbyModeModal = document.getElementById('lobby-mode-modal');
  const lobbyMailModal = document.getElementById('lobby-mail-modal');
  const lobbyNewsModal = document.getElementById('lobby-news-modal');

  const lobbyArchiveModals = [
    lobbyCharactersModal,
    lobbyGearModal,
    lobbyDiaryModal,
    lobbyBadgesModal,
    lobbyModeModal,
    lobbyMailModal,
    lobbyNewsModal,
  ];

  const closeAllLobbyArchiveModals = () => {
    lobbyArchiveModals.forEach((modal) => modal?.classList.add('hidden'));
  };

  const openLobbyArchiveModal = (modal: HTMLElement | null) => {
    closeAllLobbyArchiveModals();
    modal?.classList.remove('hidden');
  };

  lobbyMailBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    try {
      localStorage.setItem(MAIL_READ_STORAGE_KEY, '1');
    } catch {
      // Ignore storage write errors
    }
    syncMailDotUI();
    openLobbyArchiveModal(lobbyMailModal);
  });

  lobbyNewsBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    openLobbyArchiveModal(lobbyNewsModal);
  });

  syncBadgesUI = () => {
    let badgeState: Record<string, boolean> = {
      firstEscape: false,
      rescuedAllFriends: false,
      burnedAllRelics: false,
      zeroDeathSurvivor: false,
    };
    try {
      const raw = localStorage.getItem(BADGES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        badgeState = {
          firstEscape: Boolean(parsed.firstEscape),
          rescuedAllFriends: Boolean(parsed.rescuedAllFriends),
          burnedAllRelics: Boolean(parsed.burnedAllRelics),
          zeroDeathSurvivor: Boolean(parsed.zeroDeathSurvivor),
        };
      }
    } catch {
      // Ignore storage read errors
    }

    let unlockedCount = 0;
    document
      .querySelectorAll<HTMLElement>('#lobby-badges-modal .badge-card[data-badge-id]')
      .forEach((card) => {
        const id = card.dataset.badgeId || '';
        const unlocked = Boolean(badgeState[id]);
        if (unlocked) unlockedCount++;
        card.classList.toggle('is-unlocked', unlocked);
        const statusEl = card.querySelector('.badge-status');
        if (statusEl) {
          statusEl.textContent = unlocked ? 'UNLOCKED' : 'LOCKED';
        }
      });

    if (lobbyBadgesSummary) {
      lobbyBadgesSummary.textContent = `${unlockedCount} / 4 Unlocked · Saved locally on this device`;
    }
  };

  const prevCareerCallback = game.onCareerStatsUpdated;
  game.onCareerStatsUpdated = () => {
    prevCareerCallback?.();
    syncBadgesUI();
  };
  syncBadgesUI();

  lobbyNavCharacters?.addEventListener('click', (e) => {
    e.stopPropagation();
    openLobbyArchiveModal(lobbyCharactersModal);
  });
  lobbyNavGear?.addEventListener('click', (e) => {
    e.stopPropagation();
    openLobbyArchiveModal(lobbyGearModal);
  });
  lobbyNavDiary?.addEventListener('click', (e) => {
    e.stopPropagation();
    openLobbyArchiveModal(lobbyDiaryModal);
  });
  lobbyNavBadges?.addEventListener('click', (e) => {
    e.stopPropagation();
    syncBadgesUI();
    openLobbyArchiveModal(lobbyBadgesModal);
  });

  document
    .querySelectorAll<HTMLButtonElement>('.lobby-modal-close[data-close-lobby-modal]')
    .forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.closeLobbyModal;
        if (id) document.getElementById(id)?.classList.add('hidden');
      });
    });

  lobbyArchiveModals.forEach((modal) => {
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });

  // Mode & Difficulty Selector Card + Picker Modal
  type LobbyDifficulty = 'easy' | 'normal' | 'nightmare';
  type IntroStoryToggle = 'on' | 'skip';

  let selectedDifficulty: LobbyDifficulty = 'normal';
  let introStoryPreference: IntroStoryToggle = 'on';

  const lobbyModeCard = document.getElementById('lobby-mode-card');
  const lobbyModeKicker = document.getElementById('lobby-mode-kicker');
  const lobbyModeSummary = document.getElementById('lobby-mode-summary');
  const lobbyModeConfirmBtn = document.getElementById('lobby-mode-confirm-btn');

  const loadLobbyModeConfig = () => {
    try {
      const raw = localStorage.getItem(LOBBY_MODE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          difficulty?: LobbyDifficulty;
          introStory?: IntroStoryToggle;
        };
        if (
          parsed.difficulty === 'easy' ||
          parsed.difficulty === 'normal' ||
          parsed.difficulty === 'nightmare'
        ) {
          selectedDifficulty = parsed.difficulty;
        }
        if (parsed.introStory === 'on' || parsed.introStory === 'skip') {
          introStoryPreference = parsed.introStory;
        }
      }
    } catch {
      // Ignore storage read errors
    }
  };

  const saveAndSyncLobbyModeUI = () => {
    game.setDifficulty(selectedDifficulty);
    const diffUpper = selectedDifficulty.toUpperCase();
    const storyLabel = introStoryPreference === 'on' ? 'STORY ON' : 'STORY SKIP';
    if (lobbyModeKicker) {
      lobbyModeKicker.textContent = `SOLO DEMO • ${storyLabel}`;
    }
    if (lobbyModeSummary) {
      lobbyModeSummary.textContent = `THAKUR HAVELI • ${diffUpper}`;
    }
    document
      .querySelectorAll<HTMLButtonElement>('#lobby-difficulty-grid .difficulty-card')
      .forEach((card) => {
        card.classList.toggle(
          'active',
          card.dataset.difficultyOpt === selectedDifficulty,
        );
      });
    document
      .querySelectorAll<HTMLButtonElement>('#lobby-story-toggle-group .ig-seg-btn')
      .forEach((btn) => {
        btn.classList.toggle(
          'active',
          btn.dataset.storyOpt === introStoryPreference,
        );
      });
    try {
      localStorage.setItem(
        LOBBY_MODE_STORAGE_KEY,
        JSON.stringify({
          difficulty: selectedDifficulty,
          introStory: introStoryPreference,
        }),
      );
    } catch {
      // Ignore storage write errors
    }
  };

  loadLobbyModeConfig();
  saveAndSyncLobbyModeUI();

  lobbyModeCard?.addEventListener('click', (e) => {
    e.stopPropagation();
    saveAndSyncLobbyModeUI();
    openLobbyArchiveModal(lobbyModeModal);
  });

  document
    .querySelectorAll<HTMLButtonElement>('#lobby-difficulty-grid .difficulty-card')
    .forEach((card) => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        const opt = card.dataset.difficultyOpt as LobbyDifficulty | undefined;
        if (opt === 'easy' || opt === 'normal' || opt === 'nightmare') {
          selectedDifficulty = opt;
          saveAndSyncLobbyModeUI();
        }
      });
    });

  document
    .querySelectorAll<HTMLButtonElement>('#lobby-story-toggle-group .ig-seg-btn')
    .forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const opt = btn.dataset.storyOpt as IntroStoryToggle | undefined;
        if (opt === 'on' || opt === 'skip') {
          introStoryPreference = opt;
          saveAndSyncLobbyModeUI();
        }
      });
    });

  lobbyModeConfirmBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    saveAndSyncLobbyModeUI();
    lobbyModeModal?.classList.add('hidden');
  });

  // Bottom-Left Rotating 1-Line Survival Whisper / Tip Ticker
  const lobbyTipText = document.getElementById('lobby-tip-text');
  const LOBBY_HORROR_TIPS = [
    'Tip: Stand completely still when Rukmini approaches — she is blind and hunts by sound.',
    'Tip: Walking alerts Blind Rukmini within 14m; sprinting or jumping echoes up to 26m.',
    'Tip: Throw a Clay Kulhad (G) down another corridor to lure Rukmini away from your path.',
    'Tip: Save Blessed Bhabhut (F) for cornered emergencies — it delivers a 1-time stun.',
    'Tip: Slip inside wooden almirahs or under beds (E) when her silver payal grows loud.',
    'Tip: Burn all 4 cursed relics and rescue Kabir, Riya, and Dev to survive Thakur Haveli.',
  ];
  let lobbyTipIndex = 0;
  if (lobbyTipText) {
    window.setInterval(() => {
      if (menuScreen.classList.contains('hidden')) return;
      lobbyTipText.classList.add('is-swapping');
      window.setTimeout(() => {
        lobbyTipIndex = (lobbyTipIndex + 1) % LOBBY_HORROR_TIPS.length;
        lobbyTipText.textContent = LOBBY_HORROR_TIPS[lobbyTipIndex];
        lobbyTipText.classList.remove('is-swapping');
      }, 280);
    }, 6500);
  }

  // =========================================================================
  // 3-SCREEN PRO ANDROID HORROR LAUNCH SEQUENCE
  // Screen 1: Studio Splash (2.5s) -> Screen 2: Key-Art Loading (3s, 0-100%)
  // -> Screen 3: Tap to Begin -> INFORMATION Disclaimer Modal -> 3D Lobby
  // =========================================================================
  const launchOverlay = document.getElementById('launch-sequence-overlay');
  const launchScreenStudio = document.getElementById('launch-screen-studio');
  const launchScreenLoading = document.getElementById('launch-screen-loading');
  const launchScreenTap = document.getElementById('launch-screen-tap');
  const launchProgressFill = document.getElementById('launch-progress-fill');
  const launchProgressBar = document.getElementById('launch-progress-bar');
  const launchLoadingPct = document.getElementById('launch-loading-pct');
  const launchDisclaimerModal = document.getElementById(
    'launch-disclaimer-modal',
  );
  const launchDisclaimerConfirmBtn = document.getElementById(
    'launch-disclaimer-confirm-btn',
  );

  const runLaunchSequence = () => {
    if (!launchOverlay) {
      const lobby = ensureLobbyScene3D();
      lobby?.mountToLobby();
      lobby?.setActive(true);
      return;
    }

    // Screen 1: Studio Logo Splash (2.5s total with smooth fade out)
    window.setTimeout(() => {
      launchScreenStudio?.classList.add('is-fading-out');
    }, 2150);

    window.setTimeout(() => {
      launchScreenStudio?.classList.add('hidden');
      launchScreenStudio?.classList.remove('is-fading-out');
      launchScreenLoading?.classList.remove('hidden');

      // Screen 2: Key-Art Loading Screen (3.0s smooth 0% -> 100%)
      const loadStart = performance.now();
      const loadDurationMs = 3000;
      const stepProgress = (now: number) => {
        const progress = Math.min(1, (now - loadStart) / loadDurationMs);
        const pct = Math.round(progress * 100);
        if (launchProgressFill) launchProgressFill.style.width = `${pct}%`;
        if (launchLoadingPct) launchLoadingPct.textContent = `${pct}%`;
        launchProgressBar?.setAttribute('aria-valuenow', String(pct));

        if (progress < 1) {
          window.requestAnimationFrame(stepProgress);
        } else {
          launchScreenLoading?.classList.add('is-fading-out');
          window.setTimeout(() => {
            launchScreenLoading?.classList.add('hidden');
            launchScreenLoading?.classList.remove('is-fading-out');
            launchScreenTap?.classList.remove('hidden');
          }, 260);
        }
      };
      window.requestAnimationFrame(stepProgress);
    }, 2500);
  };

  const launchPrivacyLink = document.getElementById('launch-privacy-link');

  launchPrivacyLink?.addEventListener('click', (e) => {
    e.stopPropagation();
    privacyPolicyModal?.classList.remove('hidden');
  });

  const openLaunchDisclaimer = () => {
    if (!launchDisclaimerModal || !launchDisclaimerModal.classList.contains('hidden')) {
      return;
    }
    unlockAndStartMenuAmbience();
    launchDisclaimerModal.classList.remove('hidden');
    launchDisclaimerConfirmBtn?.focus();
  };

  launchScreenTap?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement | null)?.closest('#launch-privacy-link')) {
      return;
    }
    if (
      (launchDisclaimerModal &&
        !launchDisclaimerModal.classList.contains('hidden')) ||
      (privacyPolicyModal && !privacyPolicyModal.classList.contains('hidden'))
    ) {
      return;
    }
    e.stopPropagation();
    openLaunchDisclaimer();
  });

  launchScreenTap?.addEventListener('keydown', (e) => {
    if (
      (e.target as HTMLElement | null)?.closest('#launch-privacy-link') ||
      (privacyPolicyModal && !privacyPolicyModal.classList.contains('hidden'))
    ) {
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openLaunchDisclaimer();
    }
  });

  launchDisclaimerConfirmBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    unlockAndStartMenuAmbience();
    launchOverlay?.classList.add('is-fading-out');
    syncLobbyContinueVisibility();
    syncProfileUI();
    const lobby = ensureLobbyScene3D();
    lobby?.mountToLobby();
    lobby?.setActive(true);
    window.setTimeout(() => {
      launchOverlay?.classList.add('hidden');
    }, 450);
  });

  runLaunchSequence();

  // 1-Tap Auto-Sprint Button (Directly Above Joystick)
  const autoSprintActionBtn = document.getElementById('autosprint-action-btn');
  const triggerAutoSprintToggle = (e?: Event) => {
    e?.stopPropagation();
    game.resumeSpatialAudio();
    if (game.gameState === 'playing') {
      game.toggleAutoSprint();
    }
  };
  autoSprintActionBtn?.addEventListener('click', triggerAutoSprintToggle);
  autoSprintActionBtn?.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      triggerAutoSprintToggle(e);
    },
    { passive: false },
  );

  // Backpack / Inventory Quick-View Button & Drawer (Beside Joystick)
  const backpackActionBtn = document.getElementById('backpack-action-btn');
  const backpackDrawer = document.getElementById('hud-backpack-drawer');
  const backpackCloseBtn = document.getElementById('hud-backpack-close-btn');
  const toggleBackpackDrawer = (e?: Event) => {
    e?.stopPropagation();
    if (!backpackDrawer) return;
    const isNowOpen = backpackDrawer.classList.toggle('hidden') === false;
    backpackActionBtn?.classList.toggle('active', isNowOpen);
    backpackActionBtn?.setAttribute('aria-expanded', String(isNowOpen));
    if (isNowOpen) refreshHudState();
  };
  backpackActionBtn?.addEventListener('click', toggleBackpackDrawer);
  backpackActionBtn?.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      toggleBackpackDrawer(e);
    },
    { passive: false },
  );
  backpackCloseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    backpackDrawer?.classList.add('hidden');
    backpackActionBtn?.classList.remove('active');
    backpackActionBtn?.setAttribute('aria-expanded', 'false');
  });

  hudExitBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    game.pauseGame();
  });
  hudExitBtn?.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      game.pauseGame();
    },
    { passive: false },
  );

  game.onPauseToggle = (paused) => {
    if (paused) {
      pausedFromState = 'gameplay';
      backpackDrawer?.classList.add('hidden');
      backpackActionBtn?.classList.remove('active');
      if (pauseModalTitle) pauseModalTitle.textContent = 'SETTINGS';
      if (pauseModalSubtitle) {
        pauseModalSubtitle.textContent =
          'Changes apply live immediately without leaving the match.';
      }
      if (resumeGameBtn) {
        resumeGameBtn.textContent = 'Resume Game';
      }
      pauseExitMenuBtn?.classList.remove('hidden');
      igSettingsTabsContainer?.classList.remove('hidden');
      syncInGameSettingsUI();
      pauseSkipStoryBtn?.classList.add('hidden');
      pauseModal?.classList.remove('hidden');
    } else {
      if (pausedFromState === 'gameplay') {
        pausedFromState = null;
      }
      privacyPolicyModal?.classList.add('hidden');
      pauseSkipStoryBtn?.classList.add('hidden');
      pauseModal?.classList.add('hidden');
    }
    syncPcPointerLockPrompt();
  };

  game.onPointerLockChange = () => {
    syncPcPointerLockPrompt();
  };

  resumeGameBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasGameplay =
      pausedFromState === 'gameplay' ||
      (pausedFromState !== 'lobby' &&
        pausedFromState !== 'intro_story' &&
        !hud.classList.contains('hidden'));
    resumeFromPauseMenu();
    if (wasGameplay) {
      game.requestImmediateDesktopPointerLock();
    }
  });

  pauseSkipStoryBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (pausedFromState !== 'intro_story') return;
    pausedFromState = null;
    isStoryPaused = false;
    pauseModal?.classList.add('hidden');
    pauseSkipStoryBtn.classList.add('hidden');
    launchDefaultSingleplayerMatch();
    game.requestImmediateDesktopPointerLock();
  });

  pauseExitMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasIntroStory = pausedFromState === 'intro_story';
    pausedFromState = null;
    isStoryPaused = false;
    pauseModal?.classList.add('hidden');
    pauseSkipStoryBtn?.classList.add('hidden');
    if (wasIntroStory) {
      vnDirector.stop();
      cutsceneDirector.stop();
      game.gemini.stopSpeech();
      introVideo.pause();
    } else {
      game.saveProgressToStorage();
    }
    game.gameState = 'menu';
    openLobbySetupScreen();
  });

  const triggerRescueOrInteract = (e?: Event) => {
    e?.stopPropagation();
    game.resumeSpatialAudio();
    if (game.gameState === 'playing') {
      game.performPrimaryInteract();
    }
  };

  rescueActionBtn?.addEventListener('click', triggerRescueOrInteract);
  rescueActionBtn?.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      triggerRescueOrInteract(e);
    },
    { passive: false },
  );

  const triggerHideOrExit = (e?: Event) => {
    e?.stopPropagation();
    game.resumeSpatialAudio();
    if (game.gameState === 'playing') {
      game.toggleHideInNearestSpot();
    }
  };

  hideActionBtn?.addEventListener('click', triggerHideOrExit);
  hideActionBtn?.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      triggerHideOrExit(e);
    },
    { passive: false },
  );

  hidePromptBanner?.addEventListener('click', triggerHideOrExit);
  hidePromptBanner?.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      triggerHideOrExit(e);
    },
    { passive: false },
  );

  // Support tap/click on the center crosshair dot on mobile & desktop to rescue friend or pick up item
  centerCrosshair.addEventListener('click', triggerRescueOrInteract);
  centerCrosshair.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      triggerRescueOrInteract(e);
    },
    { passive: false },
  );

  game.onGameEnd = (victory, message) => {
    game.releaseGamePointerLock();
    pauseModal?.classList.add('hidden');
    hud.classList.remove('hud-end-cutscene');
    cutsceneLetterboxTop?.classList.add('hidden');
    cutsceneLetterboxBottom?.classList.add('hidden');
    if (playerHandView) {
      playerHandView.classList.add('hidden');
    }
    endgameModal.classList.remove('hidden');
    endgameModal.classList.toggle('victory-endgame', victory);
    endgameModal.classList.toggle('gameover-endgame', !victory);
    endgameTitle.textContent = victory
      ? game.lang === 'hi'
        ? '🌅 श्राप से मुक्ति! (VICTORY)'
        : '🌅 CURSE BROKEN (VICTORY)'
      : game.lang === 'hi'
        ? '🩸 रुक्मिणी का शिकार! (GAME OVER)'
        : '🩸 CAUGHT BY RUKMINI (GAME OVER)';
    endgameMessage.textContent = message;
    restartGameBtn.textContent = victory ? 'Play Again' : 'GAME OVER — Try Again';
  };

  const isMobileTouchDevice = (): boolean =>
    window.matchMedia('(pointer: coarse)').matches ||
    navigator.maxTouchPoints > 0 ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  const requestMobileFullscreenLandscape = async (): Promise<void> => {
    if (!isMobileTouchDevice()) return;
    try {
      const rootEl = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void> | void;
      };
      if (!document.fullscreenElement) {
        if (typeof rootEl.requestFullscreen === 'function') {
          await rootEl.requestFullscreen();
        } else if (typeof rootEl.webkitRequestFullscreen === 'function') {
          await rootEl.webkitRequestFullscreen();
        }
      }
    } catch {
      // Fullscreen may be blocked by browser policy or already active
    }
    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: string) => Promise<void>;
      };
      if (orientation && typeof orientation.lock === 'function') {
        await orientation.lock('landscape');
      }
    } catch {
      // Orientation lock is only supported in fullscreen/installed contexts on supported devices
    }
  };

  // Primary Main Menu Buttons: Continue, New Game, Options, Exit
  continueGameBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    void requestMobileFullscreenLandscape();
    unlockAndStartMenuAmbience();
    const loaded = game.loadProgressFromStorage();
    if (!loaded) {
      showMenuNotice("कोई सेव डेटा नहीं मिला! कृपया 'New Game' शुरू करें।");
      return;
    }
    playerNameInput.value = game.playerName;
    langSelect.value = game.lang;
    skipStoryToGame(true);
    game.requestImmediateDesktopPointerLock();
  });

  newGameBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    void requestMobileFullscreenLandscape();
    unlockAndStartMenuAmbience();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {
        // Ignore
      }
    }
    if (!playerNameInput.value.trim()) {
      playerNameInput.value = 'Aarav';
    }
    closeAllLobbyArchiveModals();
    game.setDifficulty(selectedDifficulty);
    if (introStoryPreference === 'skip') {
      launchDefaultSingleplayerMatch();
      game.requestImmediateDesktopPointerLock();
    } else {
      startStorySequence(1);
    }
  });

  exitGameBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    game.synth.setGameplayAudioEnabled(false);
    vnDirector.stop();
    cutsceneDirector.stop();
    showMenuNotice('गेम बंद हो रहा है। आप ब्राउज़र टैब बंद कर सकते हैं।');
  });

  // Co-Op Room Setup Button Listeners
  createRoomBtn.addEventListener('click', () => startStorySequence(1));
  joinRoomBtn.addEventListener('click', () => {
    const randomCoopPlayers = Math.floor(Math.random() * 3) + 2;
    startStorySequence(randomCoopPlayers);
  });

  // Cinematic Video & 3D Scene Listeners
  cutsceneBtn1.addEventListener('click', () => playCutsceneScene('scene1'));
  cutsceneBtn2.addEventListener('click', () => playCutsceneScene('scene2'));
  cutsceneBtn3.addEventListener('click', () => playCutsceneScene('scene3'));

  cutsceneAiVideoBtn.addEventListener('click', async () => {
    const activeSpec =
      CINEMATIC_SCENES.find((s) => s.id === cutsceneDirector.activeSceneId) ||
      CINEMATIC_SCENES[0];
    cutsceneAiVideoBtn.textContent = '⏳ Rendering AI Video...';
    cutsceneAiVideoBtn.setAttribute('disabled', 'true');
    try {
      const res = await game.gemini.generateOrAnimateVideo(
        activeSpec.prompt,
        '16:9',
      );
      cutsceneDirector.stop();
      cinematicCanvas.classList.add('hidden');
      introVideo.src = res.videoUrl;
      introVideo.classList.remove('hidden');
      void introVideo.play();
      cutsceneAiVideoBtn.textContent = '🎬 Playing AI Video';
    } catch {
      cutsceneAiVideoBtn.textContent = '🎬 3D Real-Time Active';
    } finally {
      cutsceneAiVideoBtn.removeAttribute('disabled');
    }
  });

  introVideo.addEventListener('ended', () => launchDefaultSingleplayerMatch());
  skipStoryBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    pausedFromState = null;
    isStoryPaused = false;
    pauseModal?.classList.add('hidden');
    pauseSkipStoryBtn?.classList.add('hidden');
    launchDefaultSingleplayerMatch();
    game.requestImmediateDesktopPointerLock();
  });

  const unlockVNStoryAudio = () => {
    if (vnDirector.isPlaying && !isStoryPaused) {
      vnDirector.ensureSpeechUnlocked();
    }
    window.removeEventListener('pointerdown', unlockVNStoryAudio);
    window.removeEventListener('keydown', unlockVNStoryAudio);
  };
  window.addEventListener('pointerdown', unlockVNStoryAudio);
  window.addEventListener('keydown', unlockVNStoryAudio);

  // ESC toggles Pause Menu during Intro Story (never skips into 3D gameplay); H toggles Simulator Settings
  window.addEventListener('keydown', (e) => {
    if (
      document.activeElement?.tagName === 'INPUT' ||
      document.activeElement?.tagName === 'TEXTAREA' ||
      document.activeElement?.tagName === 'SELECT'
    ) {
      return;
    }
    if (e.code === 'Escape') {
      if (
        resetProgressConfirmModal &&
        !resetProgressConfirmModal.classList.contains('hidden')
      ) {
        e.preventDefault();
        resetProgressConfirmModal.classList.add('hidden');
        return;
      }
      if (privacyPolicyModal && !privacyPolicyModal.classList.contains('hidden')) {
        e.preventDefault();
        privacyPolicyModal.classList.add('hidden');
        return;
      }
      if (
        lobbyArchiveModals.some(
          (modal) => modal && !modal.classList.contains('hidden'),
        )
      ) {
        e.preventDefault();
        closeAllLobbyArchiveModals();
        return;
      }
      if (profileModal && !profileModal.classList.contains('hidden')) {
        e.preventDefault();
        closeProfileModal();
        return;
      }
      if (pausedFromState === 'lobby') {
        e.preventDefault();
        resumeFromPauseMenu();
        return;
      }
      if (!storyScreen.classList.contains('hidden')) {
        e.preventDefault();
        if (pausedFromState === 'intro_story') {
          resumeFromPauseMenu();
        } else {
          openIntroStoryPauseMenu();
        }
        return;
      }
    }
    if (e.code === 'KeyH') {
      const shown = document.body.classList.toggle('show-simulator-settings');
      const simSettings = document.querySelector(
        'xrblocks-simulator-settings',
      ) as (HTMLElement & { open?: boolean }) | null;
      if (simSettings && typeof simSettings.open === 'boolean') {
        simSettings.open = shown;
      }
    }
  });

  // Dual PC + Android Multi-Touch Virtual Joystick (with forward-push auto-sprint)
  // & Right-Half Screen Touch-Drag 360-degree Camera Look (independent touch.identifier tracking)
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) {
    document.body.classList.add('touch-device');
  }
  window.addEventListener(
    'touchstart',
    () => {
      document.body.classList.add('touch-device');
    },
    { once: true, passive: true },
  );

  let joystickTouchId: number | null = null;
  let joystickMouseActive = false;
  let joyCenterX = 0;
  let joyCenterY = 0;
  const JOY_MAX_RADIUS = 38;

  const updateJoystickFromCoords = (clientX: number, clientY: number) => {
    const dx = clientX - joyCenterX;
    const dy = clientY - joyCenterY;
    const rawDist = Math.hypot(dx, dy);
    const clampedDist = Math.min(JOY_MAX_RADIUS, rawDist);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;
    joystickKnob.style.transform = `translate(${kx}px, ${ky}px)`;

    const normX = kx / JOY_MAX_RADIUS;
    const normY = ky / JOY_MAX_RADIUS;
    game.moveInput.joyX = normX;
    game.moveInput.joyY = normY;

    // Pulling joystick backward cancels 1-tap Auto-Sprint cleanly
    if (normY > 0.35 && game.autoSprintActive) {
      game.setAutoSprint(false);
    }

    // Push joystick all the way forward -> smooth auto-sprint (without affecting PC Shift sprint)
    const isForwardSprint =
      normY <= -0.82 && Math.hypot(normX, normY) >= 0.88;
    game.moveInput.joySprint = isForwardSprint;
    joystick.classList.toggle('is-sprinting', isForwardSprint);
  };

  const resetVirtualJoystick = () => {
    joystickTouchId = null;
    joystickMouseActive = false;
    joystickKnob.style.transform = 'translate(0px, 0px)';
    joystick.classList.remove('is-sprinting');
    game.moveInput.joyX = 0;
    game.moveInput.joyY = 0;
    game.moveInput.joySprint = false;
  };

  const beginJoystickAt = (clientX: number, clientY: number) => {
    const rect = joystick.getBoundingClientRect();
    joyCenterX = rect.left + rect.width / 2;
    joyCenterY = rect.top + rect.height / 2;
    game.resumeSpatialAudio();
    updateJoystickFromCoords(clientX, clientY);
  };

  joystick.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      if (game.isHudLayoutEditorOpen) return;
      if (joystickTouchId !== null) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      e.preventDefault();
      e.stopPropagation();
      joystickTouchId = touch.identifier;
      beginJoystickAt(touch.clientX, touch.clientY);
    },
    { passive: false },
  );

  // Right-Half Screen Touch-Drag 360-degree Camera Look (simultaneous with Left Thumb Joystick!)
  let lookTouchId: number | null = null;
  let lastLookTouchX = 0;
  let lastLookTouchY = 0;
  const TOUCH_LOOK_SENSITIVITY = 0.0046;

  const isHudInteractiveTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest(
        'button, input, select, textarea, a, .joystick-base, .controls-overlay, .hud-autosprint-slot, .hud-backpack-slot, .hud-backpack-drawer, .hud-circle-slot, .hud-radar-btn, .hud-map-icon-btn, #hud-minimap-container, .modal-backdrop, .modal-card, .ig-settings-card, #hud-layout-editor-overlay',
      ),
    );
  };

  window.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      if (
        game.gameState !== 'playing' ||
        game.isAnyBlockingOverlayOpen()
      ) {
        return;
      }

      const rightHalfStart = window.innerWidth * 0.45;
      let touchedGameCanvas = false;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === joystickTouchId) continue;
        if (isHudInteractiveTarget(t.target)) continue;

        touchedGameCanvas = true;

        // Right-half finger look (independent touch.identifier so Left Thumb joystick works simultaneously)
        if (
          game.controlsMode !== 'pc' &&
          lookTouchId === null &&
          t.clientX >= rightHalfStart
        ) {
          lookTouchId = t.identifier;
          lastLookTouchX = t.clientX;
          lastLookTouchY = t.clientY;
          game.resumeSpatialAudio();
        }
      }

      // Prevent native mobile browser scrolling / pinch-zoom on the 3D game canvas during gameplay
      if (touchedGameCanvas) {
        e.preventDefault();
      }
    },
    { passive: false },
  );

  window.addEventListener(
    'touchmove',
    (e: TouchEvent) => {
      if (
        game.gameState !== 'playing' ||
        game.isAnyBlockingOverlayOpen()
      ) {
        return;
      }
      let handled = false;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (joystickTouchId !== null && t.identifier === joystickTouchId) {
          updateJoystickFromCoords(t.clientX, t.clientY);
          handled = true;
        } else if (lookTouchId !== null && t.identifier === lookTouchId) {
          const dx = t.clientX - lastLookTouchX;
          const dy = t.clientY - lastLookTouchY;
          lastLookTouchX = t.clientX;
          lastLookTouchY = t.clientY;
          game.applyCameraLookDelta(dx, dy, TOUCH_LOOK_SENSITIVITY);
          handled = true;
        }
      }
      if (
        handled ||
        (e.touches.length >= 2 && !isHudInteractiveTarget(e.target))
      ) {
        e.preventDefault();
      }
    },
    { passive: false },
  );

  // Prevent iOS / WebKit pinch-zoom gestures while playing
  const preventGestureZoom = (e: Event) => {
    if (game.gameState === 'playing' && !game.isAnyBlockingOverlayOpen()) {
      e.preventDefault();
    }
  };
  window.addEventListener('gesturestart', preventGestureZoom, {
    passive: false,
  });
  window.addEventListener('gesturechange', preventGestureZoom, {
    passive: false,
  });

  const handleTouchRelease = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (joystickTouchId !== null && t.identifier === joystickTouchId) {
        resetVirtualJoystick();
      }
      if (lookTouchId !== null && t.identifier === lookTouchId) {
        lookTouchId = null;
      }
    }
  };

  window.addEventListener('touchend', handleTouchRelease, { passive: true });
  window.addEventListener('touchcancel', handleTouchRelease, { passive: true });

  // Mouse support for dragging the virtual Joystick when testing Mobile HUD on PC
  // (360-degree mouse drag look is handled uniformly by RaktPishachiniGame without double-applying deltas)
  joystick.addEventListener('mousedown', (e: MouseEvent) => {
    if (game.isHudLayoutEditorOpen) return;
    e.preventDefault();
    e.stopPropagation();
    joystickMouseActive = true;
    beginJoystickAt(e.clientX, e.clientY);
  });

  window.addEventListener('mousemove', (e: MouseEvent) => {
    if (joystickMouseActive) {
      updateJoystickFromCoords(e.clientX, e.clientY);
    }
  });

  window.addEventListener('mouseup', () => {
    if (joystickMouseActive) {
      resetVirtualJoystick();
    }
  });

  window.addEventListener('blur', () => {
    resetVirtualJoystick();
    lookTouchId = null;
  });

  // Side Column Round Icon Buttons (LIVE, STT, CHAT, AI, SFX)
  micBtn.addEventListener('click', () => {
    void game.gemini.toggleLiveSession(
      (speaker, text) => {
        addChatMessage(`[Live ${speaker}]: ${text}`);
      },
      (status, active) => {
        micBtn.classList.toggle('mic-active', active);
        micBtn.innerHTML = active
          ? '<span>🔊</span><small>LIVE</small>'
          : '<span>🎤</span><small>LIVE</small>';
        addChatMessage(`System: ${status}`);
      },
      (loudness) => {
        game.triggerSoundAlert(Math.min(1.5, loudness * 12));
      },
    );
  });

  whisperBtn.addEventListener('click', () => {
    void game.gemini.toggleWhisperTranscribe(
      game.lang,
      (transcript) => {
        if (transcript) {
          addChatMessage(`${game.playerName} (Whisper STT): ${transcript}`);
          game.triggerSoundAlert(0.5);
        }
      },
      (status) => {
        whisperBtn.classList.toggle(
          'mic-active',
          game.gemini.isRecordingWhisper,
        );
        whisperBtn.innerHTML = game.gemini.isRecordingWhisper
          ? '<span>⏹️</span><small>STOP</small>'
          : '<span>🎙️</span><small>STT</small>';
        addChatMessage(`System: ${status}`);
      },
    );
  });

  chatBtn.addEventListener('click', () => game.triggerQuickTeamChat());

  muteBtn.addEventListener('click', () => {
    game.synth.muted = !game.synth.muted;
    muteBtn.innerHTML = game.synth.muted
      ? '<span>🔇</span><small>MUTE</small>'
      : '<span>🔊</span><small>SFX</small>';
  });

  // Tantrik AI Sanctum Modal Controls
  sanctumBtn.addEventListener('click', () => {
    sanctumModal.classList.remove('hidden');
  });
  closeSanctumBtn.addEventListener('click', () => {
    sanctumModal.classList.add('hidden');
  });

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const targetId = btn.dataset.tab!;
      document
        .querySelectorAll('.sanctum-tab-body')
        .forEach((el) => el.classList.add('hidden'));
      document.getElementById(targetId)?.classList.remove('hidden');
    });
  });

  // Tab 1: High Thinking Oracle (gemini-4-argon, ThinkingLevel.HIGH)
  oracleAskBtn.addEventListener('click', async () => {
    const q = oracleInput.value.trim();
    if (!q) return;
    oracleOutput.textContent =
      'Channeling Tantrik Kalbhairav via gemini-4-argon (ThinkingLevel.HIGH)...';
    oracleAskBtn.setAttribute('disabled', 'true');
    try {
      const snap = game.getRadarSnapshot();
      const answer = await game.gemini.askTantrikOracle(
        q,
        {
          collectedRelics: game.collectedCount,
          burnedRelics: game.burnedCount,
          requiredRelics: game.requiredItems,
          witchDistanceMeters: Number(snap.witchDist.toFixed(1)),
          playersCount: game.playerCount,
        },
        game.lang,
      );
      oracleOutput.textContent = answer;
    } catch (err: unknown) {
      oracleOutput.textContent = `Oracle Error: ${
        err instanceof Error ? err.message : String(err)
      }`;
    } finally {
      oracleAskBtn.removeAttribute('disabled');
    }
  });

  // Tab 2: High-Quality Image Generation (gemini-3-pro-image 1K/2K/4K)
  visionProBtn.addEventListener('click', async () => {
    const prompt = visionPrompt.value.trim();
    const size = (visionSizeSelect.value as '1K' | '2K' | '4K') || '1K';
    if (!prompt) return;
    visionStatus.textContent = `Generating ${size} Cursed Vision with gemini-3-pro-image...`;
    visionProBtn.setAttribute('disabled', 'true');
    try {
      const res = await game.gemini.generateProImage(prompt, size, '16:9');
      visionResultImg.src = res.imageUrl;
      visionResultImg.classList.remove('hidden');
      visionStatus.textContent = `Generated ${res.imageSize} image via gemini-3-pro-image.`;
    } catch (err: unknown) {
      visionStatus.textContent = `Error: ${
        err instanceof Error ? err.message : String(err)
      }`;
    } finally {
      visionProBtn.removeAttribute('disabled');
    }
  });

  // Tab 2: Create & Edit Image (gemini-nano-banana-2.1)
  visionEditBtn.addEventListener('click', async () => {
    const prompt = visionPrompt.value.trim();
    if (!prompt) return;
    visionStatus.textContent =
      'Manifesting / editing image via gemini-nano-banana-2.1...';
    visionEditBtn.setAttribute('disabled', 'true');
    try {
      let base64: string | undefined;
      let mimeType: string | undefined;
      const file = visionFileInput.files?.[0];
      if (file) {
        const read = await readFileAsBase64(file);
        base64 = read.base64;
        mimeType = read.mimeType;
      } else if (
        visionResultImg.src &&
        visionResultImg.src.startsWith('data:')
      ) {
        base64 = visionResultImg.src;
      }
      const res = await game.gemini.createOrEditImage(prompt, base64, mimeType);
      visionResultImg.src = res.imageUrl;
      visionResultImg.classList.remove('hidden');
      visionStatus.textContent = 'Completed with gemini-nano-banana-2.1.';
    } catch (err: unknown) {
      visionStatus.textContent = `Error: ${
        err instanceof Error ? err.message : String(err)
      }`;
    } finally {
      visionEditBtn.removeAttribute('disabled');
    }
  });

  // Tab 3: Preset Scene Selector & Generate Video (gemini-omni-1.2-flash)
  const setPresetVideoPrompt = (sceneIndex: number, activeBtn: HTMLElement) => {
    [presetScene1Btn, presetScene2Btn, presetScene3Btn].forEach((b) =>
      b.classList.remove('active'),
    );
    activeBtn.classList.add('active');
    const spec = CINEMATIC_SCENES[sceneIndex];
    if (spec) {
      videoPrompt.value = spec.prompt;
    }
  };

  presetScene1Btn.addEventListener('click', () =>
    setPresetVideoPrompt(0, presetScene1Btn),
  );
  presetScene2Btn.addEventListener('click', () =>
    setPresetVideoPrompt(1, presetScene2Btn),
  );
  presetScene3Btn.addEventListener('click', () =>
    setPresetVideoPrompt(2, presetScene3Btn),
  );

  videoGenBtn.addEventListener('click', async () => {
    const prompt = videoPrompt.value.trim();
    const aspect = (videoAspectSelect.value as '16:9' | '9:16') || '16:9';
    videoStatus.textContent = `Generating ${aspect} apparition video via gemini-omni-1.2-flash (Interactions API)...`;
    videoGenBtn.setAttribute('disabled', 'true');
    try {
      let base64: string | undefined;
      let mimeType: string | undefined;
      const file = videoFileInput.files?.[0];
      if (file) {
        const read = await readFileAsBase64(file);
        base64 = read.base64;
        mimeType = read.mimeType;
      }
      const res = await game.gemini.generateOrAnimateVideo(
        prompt,
        aspect,
        base64,
        mimeType,
      );
      videoResultPlayer.src = res.videoUrl;
      videoResultPlayer.classList.remove('hidden');
      void videoResultPlayer.play();
      videoStatus.textContent = `Video ready (${res.aspectRatio}) via gemini-omni-1.2-flash.`;
    } catch (err: unknown) {
      videoStatus.textContent = `Error: ${
        err instanceof Error ? err.message : String(err)
      }`;
    } finally {
      videoGenBtn.removeAttribute('disabled');
    }
  });

  // Tab 4: Music Generation (lyria-3-clip-preview / lyria-3-pro-preview)
  musicGenBtn.addEventListener('click', async () => {
    const prompt = musicPrompt.value.trim();
    const mode = (musicModeSelect.value as 'clip' | 'pro') || 'clip';
    const modelLabel =
      mode === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';
    musicStatus.textContent = `Composing horror score with ${modelLabel}...`;
    musicGenBtn.setAttribute('disabled', 'true');
    try {
      const res = await game.gemini.generateSoundtrack(prompt, mode);
      musicResultPlayer.src = res.audioDataUrl;
      musicResultPlayer.classList.remove('hidden');
      musicStatus.textContent = `Playing soundtrack generated by ${res.model}.`;
    } catch (err: unknown) {
      musicStatus.textContent = `Error: ${
        err instanceof Error ? err.message : String(err)
      }`;
    } finally {
      musicGenBtn.removeAttribute('disabled');
    }
  });

  // Restart Match button
  restartGameBtn.addEventListener('click', () => {
    void requestMobileFullscreenLandscape();
    endgameModal.classList.add('hidden');
    endgameModal.classList.remove('victory-endgame', 'gameover-endgame');
    hud.classList.remove('hud-end-cutscene');
    game.toggleMinimapExpanded(false);
    game.matchStartTimeMs = Date.now();
    game.resetMatch();
    refreshHudState();
  });

  // Prevent accidental pinch-zoom gestures on iOS / Android WebView during gameplay
  document.addEventListener(
    'gesturestart',
    (ev) => {
      ev.preventDefault();
    },
    { passive: false },
  );

  // PWA Service Worker Registration for offline caching & PWABuilder / Play Store validation
  if ('serviceWorker' in navigator) {
    const registerSw = () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
        // Service worker registration skipped in restricted preview contexts
      });
    };
    if (document.readyState === 'complete') {
      registerSw();
    } else {
      window.addEventListener('load', registerSw, { once: true });
    }
  }

  // In-App PWA Install Prompt (Android Chrome / Desktop + iOS Safari fallback)
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  }
  const pwaInstallBtn = document.getElementById('pwa-install-btn');
  const iosInstallModal = document.getElementById('ios-install-modal');
  const iosInstallCloseBtn = document.getElementById('ios-install-close-btn');
  let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;

  const isRunningInstalledPwa = (): boolean =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  const isIosSafari = (): boolean =>
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !isRunningInstalledPwa();

  if (pwaInstallBtn && isIosSafari()) {
    pwaInstallBtn.classList.remove('hidden');
  }

  window.addEventListener('beforeinstallprompt', (ev) => {
    ev.preventDefault();
    deferredInstallPrompt = ev as BeforeInstallPromptEvent;
    if (pwaInstallBtn && !isRunningInstalledPwa()) {
      pwaInstallBtn.classList.remove('hidden');
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    pwaInstallBtn?.classList.add('hidden');
  });

  pwaInstallBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (deferredInstallPrompt) {
      try {
        await deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          deferredInstallPrompt = null;
          pwaInstallBtn.classList.add('hidden');
        }
      } catch {
        // Ignore cancelled install prompt
      }
      return;
    }
    if (isIosSafari()) {
      iosInstallModal?.classList.remove('hidden');
    }
  });

  iosInstallCloseBtn?.addEventListener('click', () => {
    iosInstallModal?.classList.add('hidden');
  });

  // Offline connectivity banner
  const offlineBanner = document.getElementById('offline-status-banner');
  const syncOfflineBanner = () => {
    if (!offlineBanner) return;
    offlineBanner.classList.toggle('hidden', navigator.onLine);
  };
  syncOfflineBanner();
  window.addEventListener('online', syncOfflineBanner);
  window.addEventListener('offline', syncOfflineBanner);

  // Initialize XR Blocks
  const options = new xb.Options();
  options.reticles.enabled = false;
  options.controllers.visualizeRays = false;
  options.setAppTitle('The Rakt Pishachini: Rukmini Ka Shrap');
  options.setAppDescription(
    '1-4 Player Spatial WebXR & 3D Horror Survival in Thakur Mansion.',
  );
  xb.add(game);
  void xb.init(options).catch((err) => {
    console.warn('XR Blocks WebGL init fallback:', err);
  });
});
