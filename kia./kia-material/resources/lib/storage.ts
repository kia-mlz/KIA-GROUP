import { allShades } from "../data/palette";
import { animationsDB } from "../data/animations";
import { iconDatabase } from "../data/icons";
import {
  asObject,
  clampNumber,
  sanitizeEnum,
  sanitizeText,
  uniqueFiltered,
} from "./dom";
import { normalizeHex } from "./color";

export const MATERIAL_STORAGE_KEY = "kia-material-state-v1";
export const MATERIAL_STORAGE_BACKUP_KEY = `${MATERIAL_STORAGE_KEY}-backup`;

export const MAX_QUERY_LENGTH = 120;
export const MAX_PREVIEW_TEXT_LENGTH = 120;

export const ALLOWED_MATERIAL_TABS = [
  "palette",
  "icons",
  "animations",
  "style",
] as const;
export const ALLOWED_TOKEN_FORMATS = [
  "css",
  "json",
  "tailwind",
  "scss",
] as const;
export const ALLOWED_BLEND_MODES = ["hsl", "rgb"] as const;

export type MaterialTab = (typeof ALLOWED_MATERIAL_TABS)[number];
export type TokenFormat = (typeof ALLOWED_TOKEN_FORMATS)[number];
export type BlendMode = (typeof ALLOWED_BLEND_MODES)[number];

export interface BezierState {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Serializable material-only state (arrays, not Sets). */
export interface MaterialPersistedState {
  materialTab: MaterialTab;
  colorQuery: string;
  activeShades: number[];
  paletteBaseA: string;
  paletteBaseB: string;
  paletteCount: number;
  paletteBlendMode: BlendMode;
  gradientAngle: number;
  gradientStart: string;
  gradientEnd: string;
  tokenFormat: TokenFormat;
  iconQuery: string;
  iconSize: number;
  iconFavorites: string[];
  animationQuery: string;
  selectedAnimation: string;
  animationDuration: number;
  animationDelay: number;
  animationIterations: number;
  animationPreviewText: string;
  fontQuery: string;
  fontPreviewSize: number;
  bezier: BezierState;
  contrastText: string;
  contrastBg: string;
  lastUpdated: number | null;
}

/** Runtime state used by MaterialController. */
export interface MaterialState
  extends Omit<MaterialPersistedState, "activeShades" | "iconFavorites"> {
  activeShades: Set<number>;
  iconFavorites: Set<string>;
}

const validIconNames = new Set(iconDatabase.map((icon) => icon.name));
const validAnimationNames = new Set(animationsDB.map((anim) => anim.name));

export const defaultMaterialState: MaterialPersistedState = {
  materialTab: "palette",
  colorQuery: "",
  activeShades: allShades.slice(),
  paletteBaseA: "#6464ff",
  paletteBaseB: "#ffc864",
  paletteCount: 5,
  paletteBlendMode: "hsl",
  gradientAngle: 135,
  gradientStart: "#6464ff",
  gradientEnd: "#c4eed9",
  tokenFormat: "css",
  iconQuery: "",
  iconSize: 28,
  iconFavorites: [],
  animationQuery: "",
  selectedAnimation: animationsDB[0]?.name ?? "fade-in",
  animationDuration: 1.1,
  animationDelay: 0,
  animationIterations: 1,
  animationPreviewText: "motion-preview",
  fontQuery: "",
  fontPreviewSize: 28,
  bezier: { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 },
  contrastText: "#0f172a",
  contrastBg: "#ffffff",
  lastUpdated: null,
};

function sanitizeHexOr(value: unknown, fallback: string): string {
  return normalizeHex(String(value || "")) || fallback;
}

export function sanitizeMaterialState(
  input: unknown,
): MaterialPersistedState {
  const parsed = asObject(input);
  const base = structuredClone(defaultMaterialState);
  const out: MaterialPersistedState = {
    ...base,
    ...(parsed as Partial<MaterialPersistedState>),
  };

  out.materialTab = sanitizeEnum(
    out.materialTab,
    ALLOWED_MATERIAL_TABS,
    base.materialTab,
  );
  out.tokenFormat = sanitizeEnum(
    out.tokenFormat,
    ALLOWED_TOKEN_FORMATS,
    base.tokenFormat,
  );
  out.paletteBlendMode = sanitizeEnum(
    out.paletteBlendMode,
    ALLOWED_BLEND_MODES,
    base.paletteBlendMode,
  );

  out.colorQuery = sanitizeText(out.colorQuery, MAX_QUERY_LENGTH);
  out.iconQuery = sanitizeText(out.iconQuery, MAX_QUERY_LENGTH);
  out.animationQuery = sanitizeText(out.animationQuery, MAX_QUERY_LENGTH);
  out.fontQuery = sanitizeText(out.fontQuery, MAX_QUERY_LENGTH);
  out.animationPreviewText =
    sanitizeText(out.animationPreviewText, MAX_PREVIEW_TEXT_LENGTH) ||
    base.animationPreviewText;

  out.selectedAnimation = validAnimationNames.has(out.selectedAnimation)
    ? out.selectedAnimation
    : base.selectedAnimation;

  out.paletteBaseA = sanitizeHexOr(out.paletteBaseA, base.paletteBaseA);
  out.paletteBaseB = sanitizeHexOr(out.paletteBaseB, base.paletteBaseB);
  out.gradientStart = sanitizeHexOr(out.gradientStart, base.gradientStart);
  out.gradientEnd = sanitizeHexOr(out.gradientEnd, base.gradientEnd);
  out.contrastText = sanitizeHexOr(out.contrastText, base.contrastText);
  out.contrastBg = sanitizeHexOr(out.contrastBg, base.contrastBg);

  out.paletteCount = Math.round(
    clampNumber(out.paletteCount, 2, 10, base.paletteCount),
  );
  out.gradientAngle = Math.round(
    clampNumber(out.gradientAngle, 0, 360, base.gradientAngle),
  );
  out.iconSize = Math.round(clampNumber(out.iconSize, 18, 48, base.iconSize));
  out.animationDuration = clampNumber(
    out.animationDuration,
    0.2,
    4,
    base.animationDuration,
  );
  out.animationDelay = clampNumber(
    out.animationDelay,
    0,
    2,
    base.animationDelay,
  );
  out.animationIterations = Math.round(
    clampNumber(out.animationIterations, 1, 6, base.animationIterations),
  );
  out.fontPreviewSize = Math.round(
    clampNumber(out.fontPreviewSize, 14, 52, base.fontPreviewSize),
  );

  const rawBezier = asObject(out.bezier);
  out.bezier = {
    x1: clampNumber(rawBezier.x1, 0, 1, base.bezier.x1),
    y1: clampNumber(rawBezier.y1, -1, 2, base.bezier.y1),
    x2: clampNumber(rawBezier.x2, 0, 1, base.bezier.x2),
    y2: clampNumber(rawBezier.y2, -1, 2, base.bezier.y2),
  };

  const shadeSet = new Set<number>(allShades);
  out.activeShades = uniqueFiltered<number>(out.activeShades, (shade) =>
    shadeSet.has(Number(shade)),
  ).map((shade) => Number(shade));

  out.iconFavorites = uniqueFiltered<string>(out.iconFavorites, (name) =>
    validIconNames.has(name),
  );

  out.lastUpdated =
    Number.isFinite(out.lastUpdated) && (out.lastUpdated as number) > 0
      ? (out.lastUpdated as number)
      : null;

  return out;
}

function parseStoragePayload(key: string): unknown | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function loadMaterialState(): MaterialState {
  let persisted: MaterialPersistedState;
  if (typeof window === "undefined") {
    persisted = structuredClone(defaultMaterialState);
  } else {
    const primary = parseStoragePayload(MATERIAL_STORAGE_KEY);
    if (primary) {
      persisted = sanitizeMaterialState(primary);
    } else {
      const backup = parseStoragePayload(MATERIAL_STORAGE_BACKUP_KEY);
      persisted = backup
        ? sanitizeMaterialState(backup)
        : structuredClone(defaultMaterialState);
    }
  }

  return {
    ...persisted,
    activeShades: new Set(persisted.activeShades),
    iconFavorites: new Set(persisted.iconFavorites),
    paletteCount: Math.max(
      2,
      Math.min(10, Number(persisted.paletteCount) || defaultMaterialState.paletteCount),
    ),
    paletteBlendMode: ALLOWED_BLEND_MODES.includes(persisted.paletteBlendMode)
      ? persisted.paletteBlendMode
      : defaultMaterialState.paletteBlendMode,
    tokenFormat: ALLOWED_TOKEN_FORMATS.includes(persisted.tokenFormat)
      ? persisted.tokenFormat
      : defaultMaterialState.tokenFormat,
    paletteBaseA:
      normalizeHex(persisted.paletteBaseA || "") ||
      defaultMaterialState.paletteBaseA,
    paletteBaseB:
      normalizeHex(persisted.paletteBaseB || "") ||
      defaultMaterialState.paletteBaseB,
  };
}

export function serializeMaterialState(
  state: MaterialState,
): MaterialPersistedState {
  return {
    ...state,
    activeShades: [...state.activeShades],
    iconFavorites: [...state.iconFavorites],
  };
}

export function saveMaterialState(
  state: MaterialState,
  options?: { saveCounter?: { value: number }; onFault?: () => void },
): void {
  if (typeof window === "undefined") return;
  state.lastUpdated = Date.now();
  const persist = serializeMaterialState(state);
  try {
    const payload = JSON.stringify(persist);
    localStorage.setItem(MATERIAL_STORAGE_KEY, payload);
    if (options?.saveCounter) {
      options.saveCounter.value += 1;
      if (options.saveCounter.value % 12 === 0) {
        localStorage.setItem(MATERIAL_STORAGE_BACKUP_KEY, payload);
      }
    }
  } catch {
    options?.onFault?.();
  }
}
