/** Color math helpers for Material Studio */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function hexToRgb(hex: string): Rgb {
  const cleaned = hex.replace("#", "").trim();
  if (cleaned.length !== 6) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const f = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${f(r)}${f(g)}${f(b)}`;
}

export function rgbToHsl(r: number, g: number, b: number): Hsl {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = 60 * (((g - b) / d) % 6);
        break;
      case g:
        h = 60 * ((b - r) / d + 2);
        break;
      default:
        h = 60 * ((r - g) / d + 4);
        break;
    }
  }
  if (h < 0) h += 360;
  return { h, s, l };
}

export function hslToRgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export function getLuminance(rgb: Rgb): number {
  const values = [rgb.r, rgb.g, rgb.b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * values[0]! + 0.7152 * values[1]! + 0.0722 * values[2]!;
}

export function isLightColor(hex: string): boolean {
  return getLuminance(hexToRgb(hex)) > 0.55;
}

export function normalizeHex(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let value = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(value))
    value = value
      .split("")
      .map((ch) => ch + ch)
      .join("");
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
  return `#${value.toLowerCase()}`;
}

export function interpolateHueShortest(
  start: number,
  end: number,
  t: number,
): number {
  const delta = ((end - start + 540) % 360) - 180;
  return (start + delta * t + 360) % 360;
}

export function generatePalette(
  a: string,
  b: string,
  count: number,
  mode = "hsl",
): string[] {
  const aRgb = hexToRgb(a);
  const bRgb = hexToRgb(b);
  const total = Math.max(2, Math.min(10, Number(count) || 5));
  const safeMode = mode === "rgb" ? "rgb" : "hsl";
  const result: string[] = [];
  for (let i = 0; i < total; i += 1) {
    const t = total === 1 ? 0 : i / (total - 1);
    let rgb: Rgb;
    if (safeMode === "rgb") {
      rgb = {
        r: aRgb.r + (bRgb.r - aRgb.r) * t,
        g: aRgb.g + (bRgb.g - aRgb.g) * t,
        b: aRgb.b + (bRgb.b - aRgb.b) * t,
      };
    } else {
      const aHsl = rgbToHsl(aRgb.r, aRgb.g, aRgb.b);
      const bHsl = rgbToHsl(bRgb.r, bRgb.g, bRgb.b);
      const h = interpolateHueShortest(aHsl.h, bHsl.h, t);
      const s = aHsl.s + (bHsl.s - aHsl.s) * t;
      const l = aHsl.l + (bHsl.l - aHsl.l) * t;
      rgb = hslToRgb(h, s, l);
    }
    result.push(rgbToHex(rgb.r, rgb.g, rgb.b));
  }
  return result;
}
