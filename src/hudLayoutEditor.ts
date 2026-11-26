export type ControlsMode = 'auto' | 'pc' | 'mobile';
export type HudPresetId = 1 | 2;

export type HudControlId =
  | 'joystick'
  | 'autosprint'
  | 'backpack'
  | 'jump'
  | 'crouch'
  | 'interact'
  | 'kulhad'
  | 'bhabhut'
  | 'minimap';

export interface HudControlConfig {
  xPct: number;
  yPct: number;
  scale: number;
  opacity: number;
}

export interface HudLayoutState {
  customized: boolean;
  controls: Record<HudControlId, HudControlConfig>;
}

export interface HudPresetsStore {
  activePreset: HudPresetId;
  presets: Record<HudPresetId, HudLayoutState>;
}

const HUD_PRESETS_STORAGE_KEY = 'rakt_pishachini_custom_hud_v2';
const CONTROLS_MODE_STORAGE_KEY = 'rakt_pishachini_controls_mode';

export interface HudControlDescriptor {
  id: HudControlId;
  labelEn: string;
  labelHi: string;
  keyCap: string;
  liveSelector: string;
  shape: 'joystick' | 'circle' | 'primary' | 'square';
  accentClass: string;
}

export const HUD_CONTROL_DESCRIPTORS: HudControlDescriptor[] = [
  {
    id: 'joystick',
    labelEn: 'Joystick',
    labelHi: 'जॉयस्टिक',
    keyCap: 'MOVE',
    liveSelector: '#hud-ctrl-joystick',
    shape: 'joystick',
    accentClass: 'node-joystick',
  },
  {
    id: 'autosprint',
    labelEn: 'Auto-Sprint',
    labelHi: 'तेज़ दौड़',
    keyCap: 'RUN',
    liveSelector: '#hud-ctrl-autosprint',
    shape: 'circle',
    accentClass: 'node-autosprint',
  },
  {
    id: 'backpack',
    labelEn: 'Backpack',
    labelHi: 'बैकपैक',
    keyCap: 'BAG',
    liveSelector: '#hud-ctrl-backpack',
    shape: 'circle',
    accentClass: 'node-backpack',
  },
  {
    id: 'interact',
    labelEn: 'Grab / Interact',
    labelHi: 'पकड़ें / उपयोग',
    keyCap: 'E',
    liveSelector: '#rescue-action-slot',
    shape: 'primary',
    accentClass: 'node-interact',
  },
  {
    id: 'jump',
    labelEn: 'Jump',
    labelHi: 'कूदें',
    keyCap: 'SPACE',
    liveSelector: '#jump-action-slot',
    shape: 'circle',
    accentClass: 'node-jump',
  },
  {
    id: 'crouch',
    labelEn: 'Crouch',
    labelHi: 'झुकें',
    keyCap: 'C',
    liveSelector: '#crouch-action-slot',
    shape: 'circle',
    accentClass: 'node-crouch',
  },
  {
    id: 'kulhad',
    labelEn: 'Throw Kulhad',
    labelHi: 'कुल्हड़ फेंकें',
    keyCap: 'G',
    liveSelector: '#throw-action-slot',
    shape: 'circle',
    accentClass: 'node-kulhad',
  },
  {
    id: 'bhabhut',
    labelEn: 'Bhabhut',
    labelHi: 'पवित्र भभूत',
    keyCap: 'F',
    liveSelector: '#bhabhut-action-slot',
    shape: 'circle',
    accentClass: 'node-bhabhut',
  },
  {
    id: 'minimap',
    labelEn: 'Minimap',
    labelHi: 'मिनीमैप',
    keyCap: 'M',
    liveSelector: '#hud-ctrl-minimap',
    shape: 'square',
    accentClass: 'node-map',
  },
];

export function createDefaultHudLayout(preset: HudPresetId = 1): HudLayoutState {
  if (preset === 2) {
    // HUD 2: 3/4-Finger Claw Ergonomic Preset (upper-right jump/crouch, compact left)
    return {
      customized: false,
      controls: {
        joystick: { xPct: 12, yPct: 79, scale: 0.95, opacity: 0.9 },
        autosprint: { xPct: 12, yPct: 58, scale: 0.95, opacity: 0.92 },
        backpack: { xPct: 24, yPct: 83, scale: 0.92, opacity: 0.92 },
        interact: { xPct: 86, yPct: 74, scale: 1.08, opacity: 0.96 },
        jump: { xPct: 91, yPct: 38, scale: 1.0, opacity: 0.94 },
        crouch: { xPct: 77, yPct: 84, scale: 0.96, opacity: 0.94 },
        kulhad: { xPct: 78, yPct: 60, scale: 0.94, opacity: 0.92 },
        bhabhut: { xPct: 88, yPct: 54, scale: 0.94, opacity: 0.92 },
        minimap: { xPct: 7.5, yPct: 11, scale: 1.0, opacity: 0.96 },
      },
    };
  }
  // HUD 1: Clean Free Fire-Style Horror Arc Default
  return {
    customized: false,
    controls: {
      joystick: { xPct: 12, yPct: 79, scale: 1.0, opacity: 0.92 },
      autosprint: { xPct: 12, yPct: 57, scale: 1.0, opacity: 0.94 },
      backpack: { xPct: 24, yPct: 84, scale: 1.0, opacity: 0.94 },
      interact: { xPct: 87, yPct: 75, scale: 1.0, opacity: 0.96 },
      jump: { xPct: 92, yPct: 57, scale: 1.0, opacity: 0.96 },
      crouch: { xPct: 77, yPct: 85, scale: 1.0, opacity: 0.96 },
      kulhad: { xPct: 82, yPct: 58, scale: 1.0, opacity: 0.94 },
      bhabhut: { xPct: 74, yPct: 70, scale: 1.0, opacity: 0.94 },
      minimap: { xPct: 7.5, yPct: 11, scale: 1.0, opacity: 0.96 },
    },
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function sanitizeControlConfig(
  raw: Partial<HudControlConfig> | undefined,
  fallback: HudControlConfig,
): HudControlConfig {
  const xPct =
    typeof raw?.xPct === 'number' && Number.isFinite(raw.xPct)
      ? clamp(raw.xPct, 3, 97)
      : fallback.xPct;
  const yPct =
    typeof raw?.yPct === 'number' && Number.isFinite(raw.yPct)
      ? clamp(raw.yPct, 5, 95)
      : fallback.yPct;
  const scale =
    typeof raw?.scale === 'number' && Number.isFinite(raw.scale)
      ? clamp(raw.scale, 0.5, 1.5)
      : fallback.scale;
  const opacity =
    typeof raw?.opacity === 'number' && Number.isFinite(raw.opacity)
      ? clamp(raw.opacity, 0.3, 1.0)
      : fallback.opacity;
  return { xPct, yPct, scale, opacity };
}

export function cloneHudLayout(
  state: HudLayoutState,
  preset: HudPresetId = 1,
): HudLayoutState {
  const defaults = createDefaultHudLayout(preset);
  const controls = {} as Record<HudControlId, HudControlConfig>;
  for (const desc of HUD_CONTROL_DESCRIPTORS) {
    controls[desc.id] = sanitizeControlConfig(
      state.controls?.[desc.id],
      defaults.controls[desc.id],
    );
  }
  return {
    customized: Boolean(state.customized),
    controls,
  };
}

export function createDefaultPresetsStore(): HudPresetsStore {
  return {
    activePreset: 1,
    presets: {
      1: createDefaultHudLayout(1),
      2: createDefaultHudLayout(2),
    },
  };
}

export function loadHudPresetsStore(): HudPresetsStore {
  const fallback = createDefaultPresetsStore();
  try {
    const raw = localStorage.getItem(HUD_PRESETS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<HudPresetsStore>;
    const activePreset: HudPresetId = parsed.activePreset === 2 ? 2 : 1;
    return {
      activePreset,
      presets: {
        1: cloneHudLayout(parsed.presets?.[1] ?? fallback.presets[1], 1),
        2: cloneHudLayout(parsed.presets?.[2] ?? fallback.presets[2], 2),
      },
    };
  } catch {
    return fallback;
  }
}

export function saveHudPresetsStore(store: HudPresetsStore): void {
  try {
    const clean: HudPresetsStore = {
      activePreset: store.activePreset === 2 ? 2 : 1,
      presets: {
        1: cloneHudLayout(store.presets[1], 1),
        2: cloneHudLayout(store.presets[2], 2),
      },
    };
    localStorage.setItem(HUD_PRESETS_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadControlsMode(): ControlsMode {
  try {
    const saved = localStorage.getItem(CONTROLS_MODE_STORAGE_KEY);
    if (saved === 'auto' || saved === 'pc' || saved === 'mobile') {
      return saved;
    }
  } catch {
    // Ignore
  }
  return 'auto';
}

export function saveControlsMode(mode: ControlsMode): void {
  try {
    localStorage.setItem(CONTROLS_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore
  }
}

export function applyControlsModeToBody(mode: ControlsMode): void {
  document.body.classList.remove(
    'controls-mode-auto',
    'controls-mode-pc',
    'controls-mode-mobile',
  );
  document.body.classList.add(`controls-mode-${mode}`);
}

export function isMobileControlsActive(mode: ControlsMode): boolean {
  if (mode === 'mobile') return true;
  if (mode === 'pc') return false;
  return (
    document.body.classList.contains('touch-device') ||
    window.matchMedia('(hover: none) and (pointer: coarse)').matches
  );
}

/**
 * Applies either the user's saved custom HUD preset (fixed viewport coordinates,
 * scale, and opacity for all 9 controls) or restores the default Free Fire-style
 * horror arc layout when customized === false and preset === 1.
 */
export function applyHudLayoutToLiveHud(
  state: HudLayoutState,
  presetId: HudPresetId = 1,
): void {
  const useCustomFixed = state.customized || presetId === 2;
  document.body.classList.toggle('hud-layout-customized', useCustomFixed);

  for (const desc of HUD_CONTROL_DESCRIPTORS) {
    const el = document.querySelector(desc.liveSelector) as HTMLElement | null;
    if (!el) continue;

    if (!useCustomFixed) {
      el.classList.remove('hud-custom-placed');
      el.style.removeProperty('--hud-x');
      el.style.removeProperty('--hud-y');
      el.style.removeProperty('--hud-scale');
      el.style.removeProperty('--hud-opacity');
      continue;
    }

    const cfg = state.controls[desc.id];
    el.classList.add('hud-custom-placed');
    el.style.setProperty('--hud-x', `${cfg.xPct.toFixed(2)}%`);
    el.style.setProperty('--hud-y', `${cfg.yPct.toFixed(2)}%`);
    el.style.setProperty('--hud-scale', cfg.scale.toFixed(3));
    el.style.setProperty('--hud-opacity', cfg.opacity.toFixed(3));
  }
}

function createEditorIconSvg(id: HudControlId): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', id === 'interact' ? '26' : '21');
  svg.setAttribute('height', id === 'interact' ? '26' : '21');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  const addPath = (d: string, extra?: Record<string, string>) => {
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', d);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) p.setAttribute(k, v);
    }
    svg.appendChild(p);
  };
  const addCircle = (cx: string, cy: string, r: string, fill?: string) => {
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', cx);
    c.setAttribute('cy', cy);
    c.setAttribute('r', r);
    if (fill) c.setAttribute('fill', fill);
    svg.appendChild(c);
  };

  switch (id) {
    case 'autosprint':
      addCircle('14.5', '4.5', '2');
      addPath('M11 8.5l2.5 1.8 3.2-1.3');
      addPath('M12.5 10.3l-2.3 4.2 3.8 2-1.2 4');
      addPath('M10.2 14.5l-3.4 2.5-1.8-.8');
      addPath('M4 10h3.5', { opacity: '0.65' });
      addPath('M3 13h3', { opacity: '0.45' });
      break;
    case 'backpack':
      addPath('M8 7V5a4 4 0 0 1 8 0v2');
      addPath('M5 9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V9z');
      addPath('M8 13h8');
      addPath('M10 13v3');
      addPath('M14 13v3');
      break;
    case 'jump':
      addPath('M12 19V5');
      addPath('M5 12l7-7 7 7');
      addPath('M7 21h10', { opacity: '0.65' });
      break;
    case 'crouch':
      addCircle('14.5', '6.5', '2.3');
      addPath('M12.5 10.5l-3 2.8 3.8 2.2-1.8 4');
      addPath('M12.5 10.5l3.5 1.8 2-1.5');
      addPath('M9.5 13.3l-2.8 4.7H4.5');
      break;
    case 'interact':
      addPath('M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2');
      addPath('M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2');
      addPath('M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8');
      addPath(
        'M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15',
      );
      break;
    case 'kulhad':
      addPath('M5 17c2-7 8-11 14-11');
      addPath('M15 3l4 3-4 3');
      addCircle('6.5', '17.5', '2.5', 'currentColor');
      break;
    case 'bhabhut':
      addPath('M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z');
      addPath('M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z');
      break;
    case 'minimap': {
      const poly = document.createElementNS(ns, 'polygon');
      poly.setAttribute('points', '3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6');
      svg.appendChild(poly);
      const l1 = document.createElementNS(ns, 'line');
      l1.setAttribute('x1', '9');
      l1.setAttribute('y1', '3');
      l1.setAttribute('x2', '9');
      l1.setAttribute('y2', '18');
      svg.appendChild(l1);
      const l2 = document.createElementNS(ns, 'line');
      l2.setAttribute('x1', '15');
      l2.setAttribute('y1', '6');
      l2.setAttribute('x2', '15');
      l2.setAttribute('y2', '21');
      svg.appendChild(l2);
      break;
    }
    default:
      break;
  }
  return svg;
}

export interface HudLayoutEditorCallbacks {
  onOpen?: () => void;
  onClose?: (saved: boolean) => void;
  onLayoutApplied?: (state: HudLayoutState, preset: HudPresetId) => void;
}

/**
 * Free Fire-Style Floating Custom HUD Editor Panel.
 * Features preset switcher (HUD 1 / HUD 2), Reset, Save (localStorage),
 * Opacity (30%-100%), Size (50%-150%), 4-way fine-adjust arrows (▲ ▼ ◀ ▶),
 * and direct drag-and-drop for all 9 essential horror HUD controls.
 */
export class HudLayoutEditorController {
  private overlay: HTMLElement;
  private stage: HTMLElement;
  private selectedNameEl: HTMLElement;
  private presetLabelEl: HTMLElement;
  private presetPrevBtn: HTMLButtonElement;
  private presetNextBtn: HTMLButtonElement;
  private sizeSlider: HTMLInputElement;
  private sizeValueEl: HTMLElement;
  private opacitySlider: HTMLInputElement;
  private opacityValueEl: HTMLElement;
  private saveBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private cancelBtn: HTMLButtonElement;
  private nudgeUpBtn: HTMLButtonElement;
  private nudgeDownBtn: HTMLButtonElement;
  private nudgeLeftBtn: HTMLButtonElement;
  private nudgeRightBtn: HTMLButtonElement;
  private statusToastEl: HTMLElement | null;

  private committedStore: HudPresetsStore;
  private draftStore: HudPresetsStore;
  private selectedId: HudControlId = 'interact';
  private nodeMap = new Map<HudControlId, HTMLElement>();
  private draggingId: HudControlId | null = null;
  private dragPointerId: number | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private nudgeInterval = 0;
  private toastTimer = 0;
  private isOpenFlag = false;
  private callbacks: HudLayoutEditorCallbacks;

  constructor(callbacks: HudLayoutEditorCallbacks = {}) {
    this.callbacks = callbacks;
    this.overlay = document.getElementById('hud-layout-editor-overlay')!;
    this.stage = document.getElementById('hud-editor-stage')!;
    this.selectedNameEl = document.getElementById('hud-editor-selected-name')!;
    this.presetLabelEl = document.getElementById('hud-editor-preset-label')!;
    this.presetPrevBtn = document.getElementById(
      'hud-editor-preset-prev',
    ) as HTMLButtonElement;
    this.presetNextBtn = document.getElementById(
      'hud-editor-preset-next',
    ) as HTMLButtonElement;
    this.sizeSlider = document.getElementById(
      'hud-editor-size-slider',
    ) as HTMLInputElement;
    this.sizeValueEl = document.getElementById('hud-editor-size-value')!;
    this.opacitySlider = document.getElementById(
      'hud-editor-opacity-slider',
    ) as HTMLInputElement;
    this.opacityValueEl = document.getElementById('hud-editor-opacity-value')!;
    this.saveBtn = document.getElementById(
      'hud-editor-save-btn',
    ) as HTMLButtonElement;
    this.resetBtn = document.getElementById(
      'hud-editor-reset-btn',
    ) as HTMLButtonElement;
    this.cancelBtn = document.getElementById(
      'hud-editor-cancel-btn',
    ) as HTMLButtonElement;
    this.nudgeUpBtn = document.getElementById(
      'hud-nudge-up',
    ) as HTMLButtonElement;
    this.nudgeDownBtn = document.getElementById(
      'hud-nudge-down',
    ) as HTMLButtonElement;
    this.nudgeLeftBtn = document.getElementById(
      'hud-nudge-left',
    ) as HTMLButtonElement;
    this.nudgeRightBtn = document.getElementById(
      'hud-nudge-right',
    ) as HTMLButtonElement;
    this.statusToastEl = document.getElementById('hud-editor-toast');

    this.committedStore = loadHudPresetsStore();
    this.draftStore = this.cloneStore(this.committedStore);

    this.buildEditorNodes();
    this.bindToolbarEvents();
    this.applyActiveCommittedLayout();
  }

  public get isOpen(): boolean {
    return this.isOpenFlag;
  }

  private cloneStore(store: HudPresetsStore): HudPresetsStore {
    return {
      activePreset: store.activePreset === 2 ? 2 : 1,
      presets: {
        1: cloneHudLayout(store.presets[1], 1),
        2: cloneHudLayout(store.presets[2], 2),
      },
    };
  }

  private get activeDraftLayout(): HudLayoutState {
    return this.draftStore.presets[this.draftStore.activePreset];
  }

  public applyActiveCommittedLayout(): void {
    const presetId = this.committedStore.activePreset;
    applyHudLayoutToLiveHud(this.committedStore.presets[presetId], presetId);
  }

  public getActivePreset(): HudPresetId {
    return this.committedStore.activePreset;
  }

  public selectPreset(preset: HudPresetId): void {
    const normalized: HudPresetId = preset === 2 ? 2 : 1;
    this.committedStore.activePreset = normalized;
    this.draftStore.activePreset = normalized;
    saveHudPresetsStore(this.committedStore);
    this.applyActiveCommittedLayout();
  }

  private buildEditorNodes(): void {
    this.stage.textContent = '';
    this.nodeMap.clear();

    for (const desc of HUD_CONTROL_DESCRIPTORS) {
      const node = document.createElement('div');
      node.className = `hud-editor-node ${desc.accentClass}`;
      node.dataset.controlId = desc.id;
      node.setAttribute('role', 'button');
      node.setAttribute('tabindex', '0');
      node.setAttribute(
        'aria-label',
        `${desc.labelEn} (${desc.keyCap}) — Drag to position`,
      );

      if (desc.shape === 'joystick') {
        const ring = document.createElement('div');
        ring.className = 'hud-editor-joy-ring';
        const knob = document.createElement('div');
        knob.className = 'hud-editor-joy-knob';
        ring.appendChild(knob);
        node.appendChild(ring);
      } else if (desc.shape === 'square') {
        const mapBox = document.createElement('div');
        mapBox.className = 'hud-editor-square-shell';
        mapBox.appendChild(createEditorIconSvg(desc.id));
        node.appendChild(mapBox);
      } else {
        const iconShell = document.createElement('div');
        iconShell.className =
          desc.shape === 'primary'
            ? 'hud-editor-circle-shell is-primary'
            : 'hud-editor-circle-shell';
        iconShell.appendChild(createEditorIconSvg(desc.id));
        node.appendChild(iconShell);
      }

      const tag = document.createElement('div');
      tag.className = 'hud-editor-node-tag';
      tag.textContent = `${desc.labelEn} · ${desc.keyCap}`;
      node.appendChild(tag);

      node.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectControl(desc.id);
        this.draggingId = desc.id;
        this.dragPointerId = e.pointerId;
        node.classList.add('dragging');
        const rect = node.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        this.dragOffsetX = e.clientX - centerX;
        this.dragOffsetY = e.clientY - centerY;
        try {
          node.setPointerCapture(e.pointerId);
        } catch {
          // Ignore synthetic pointer
        }
      });

      node.addEventListener('pointermove', (e) => {
        if (this.draggingId !== desc.id || this.dragPointerId !== e.pointerId) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        const stageRect = this.stage.getBoundingClientRect();
        if (stageRect.width <= 0 || stageRect.height <= 0) return;

        const targetX = e.clientX - this.dragOffsetX - stageRect.left;
        const targetY = e.clientY - this.dragOffsetY - stageRect.top;
        const xPct = clamp((targetX / stageRect.width) * 100, 3, 97);
        const yPct = clamp((targetY / stageRect.height) * 100, 5, 95);

        const active = this.activeDraftLayout;
        active.customized = true;
        active.controls[desc.id].xPct = Math.round(xPct * 10) / 10;
        active.controls[desc.id].yPct = Math.round(yPct * 10) / 10;
        this.renderNode(desc.id);
      });

      const finishDrag = (e: PointerEvent) => {
        if (this.draggingId !== desc.id || this.dragPointerId !== e.pointerId) {
          return;
        }
        node.classList.remove('dragging');
        this.draggingId = null;
        this.dragPointerId = null;
        try {
          if (node.hasPointerCapture(e.pointerId)) {
            node.releasePointerCapture(e.pointerId);
          }
        } catch {
          // Ignore
        }
      };

      node.addEventListener('pointerup', finishDrag);
      node.addEventListener('pointercancel', finishDrag);

      this.stage.appendChild(node);
      this.nodeMap.set(desc.id, node);
    }
  }

  private nudgeSelected(dxPct: number, dyPct: number): void {
    const active = this.activeDraftLayout;
    const cfg = active.controls[this.selectedId];
    active.customized = true;
    cfg.xPct = Math.round(clamp(cfg.xPct + dxPct, 3, 97) * 10) / 10;
    cfg.yPct = Math.round(clamp(cfg.yPct + dyPct, 5, 95) * 10) / 10;
    this.renderNode(this.selectedId);
  }

  private bindNudgeButton(
    btn: HTMLButtonElement,
    dxPct: number,
    dyPct: number,
  ): void {
    const stopRepeat = () => {
      if (this.nudgeInterval) {
        window.clearInterval(this.nudgeInterval);
        this.nudgeInterval = 0;
      }
    };
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.nudgeSelected(dxPct, dyPct);
      stopRepeat();
      this.nudgeInterval = window.setInterval(() => {
        this.nudgeSelected(dxPct, dyPct);
      }, 85);
    });
    btn.addEventListener('pointerup', stopRepeat);
    btn.addEventListener('pointerleave', stopRepeat);
    btn.addEventListener('pointercancel', stopRepeat);
  }

  private switchPreset(next: HudPresetId): void {
    this.draftStore.activePreset = next;
    this.presetLabelEl.textContent = `HUD ${next}`;
    this.renderAllNodes();
    this.syncSlidersToSelected();
    this.showEditorToast(`Switched to Preset HUD ${next}`);
  }

  private bindToolbarEvents(): void {
    this.presetPrevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const next: HudPresetId = this.draftStore.activePreset === 1 ? 2 : 1;
      this.switchPreset(next);
    });

    this.presetNextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const next: HudPresetId = this.draftStore.activePreset === 1 ? 2 : 1;
      this.switchPreset(next);
    });

    this.sizeSlider.addEventListener('input', () => {
      const pct = clamp(Number(this.sizeSlider.value) || 100, 50, 150);
      this.sizeValueEl.textContent = `${pct}%`;
      const active = this.activeDraftLayout;
      active.customized = true;
      active.controls[this.selectedId].scale = pct / 100;
      this.renderNode(this.selectedId);
    });

    this.opacitySlider.addEventListener('input', () => {
      const pct = clamp(Number(this.opacitySlider.value) || 100, 30, 100);
      this.opacityValueEl.textContent = `${pct}%`;
      const active = this.activeDraftLayout;
      active.customized = true;
      active.controls[this.selectedId].opacity = pct / 100;
      this.renderNode(this.selectedId);
    });

    this.bindNudgeButton(this.nudgeUpBtn, 0, -0.5);
    this.bindNudgeButton(this.nudgeDownBtn, 0, 0.5);
    this.bindNudgeButton(this.nudgeLeftBtn, -0.5, 0);
    this.bindNudgeButton(this.nudgeRightBtn, 0.5, 0);

    this.resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const preset = this.draftStore.activePreset;
      this.draftStore.presets[preset] = createDefaultHudLayout(preset);
      this.renderAllNodes();
      this.syncSlidersToSelected();
      this.showEditorToast(`HUD ${preset} reset to default — tap 💾 Save to apply.`);
    });

    this.saveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.committedStore = this.cloneStore(this.draftStore);
      saveHudPresetsStore(this.committedStore);
      this.applyActiveCommittedLayout();
      const activeId = this.committedStore.activePreset;
      this.callbacks.onLayoutApplied?.(
        cloneHudLayout(this.committedStore.presets[activeId], activeId),
        activeId,
      );
      this.close(true);
    });

    this.cancelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close(false);
    });

    window.addEventListener('keydown', (e) => {
      if (!this.isOpenFlag) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.close(false);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        this.nudgeSelected(0, -0.5);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        this.nudgeSelected(0, 0.5);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.nudgeSelected(-0.5, 0);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.nudgeSelected(0.5, 0);
      }
    });
  }

  public open(): void {
    if (this.isOpenFlag) return;
    this.isOpenFlag = true;
    this.committedStore = loadHudPresetsStore();
    this.draftStore = this.cloneStore(this.committedStore);
    this.presetLabelEl.textContent = `HUD ${this.draftStore.activePreset}`;
    this.overlay.classList.remove('hidden');
    this.renderAllNodes();
    this.selectControl(this.selectedId);
    this.callbacks.onOpen?.();
  }

  public close(saved: boolean): void {
    if (!this.isOpenFlag) return;
    this.isOpenFlag = false;
    this.draggingId = null;
    this.dragPointerId = null;
    if (this.nudgeInterval) {
      window.clearInterval(this.nudgeInterval);
      this.nudgeInterval = 0;
    }
    this.overlay.classList.add('hidden');
    if (!saved) {
      this.applyActiveCommittedLayout();
    }
    this.callbacks.onClose?.(saved);
  }

  private selectControl(id: HudControlId): void {
    this.selectedId = id;
    for (const [nodeId, el] of this.nodeMap.entries()) {
      el.classList.toggle('selected', nodeId === id);
    }
    const desc = HUD_CONTROL_DESCRIPTORS.find((d) => d.id === id);
    if (desc) {
      this.selectedNameEl.textContent = `${desc.labelEn} (${desc.labelHi})`;
    }
    this.syncSlidersToSelected();
  }

  private syncSlidersToSelected(): void {
    const cfg = this.activeDraftLayout.controls[this.selectedId];
    const sizePct = Math.round(cfg.scale * 100);
    const opacityPct = Math.round(cfg.opacity * 100);
    this.sizeSlider.value = String(sizePct);
    this.sizeValueEl.textContent = `${sizePct}%`;
    this.opacitySlider.value = String(opacityPct);
    this.opacityValueEl.textContent = `${opacityPct}%`;
  }

  private renderAllNodes(): void {
    for (const desc of HUD_CONTROL_DESCRIPTORS) {
      this.renderNode(desc.id);
    }
  }

  private renderNode(id: HudControlId): void {
    const el = this.nodeMap.get(id);
    if (!el) return;
    const cfg = this.activeDraftLayout.controls[id];
    el.style.left = `${cfg.xPct}%`;
    el.style.top = `${cfg.yPct}%`;
    el.style.transform = `translate(-50%, -50%) scale(${cfg.scale.toFixed(3)})`;
    el.style.opacity = cfg.opacity.toFixed(3);
  }

  private showEditorToast(message: string): void {
    if (!this.statusToastEl) return;
    this.statusToastEl.textContent = message;
    this.statusToastEl.classList.remove('hidden');
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.statusToastEl?.classList.add('hidden');
      this.toastTimer = 0;
    }, 2200);
  }
}
