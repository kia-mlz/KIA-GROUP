import { allShades, fullPalette, shadePresets, type ShadePresetKey } from "./data/palette";
import { iconDatabase } from "./data/icons";
import { animationsDB } from "./data/animations";
import { fontCatalog } from "./data/fonts";
import {
  generatePalette,
  getLuminance,
  hexToRgb,
  isLightColor,
  normalizeHex,
} from "./lib/color";
import {
  clampNumber,
  escapeAttr,
  escapeHtml,
  sanitizeEnum,
} from "./lib/dom";
import {
  ALLOWED_BLEND_MODES,
  ALLOWED_MATERIAL_TABS,
  ALLOWED_TOKEN_FORMATS,
  loadMaterialState,
  saveMaterialState,
  type BlendMode,
  type MaterialState,
  type MaterialTab,
  type TokenFormat,
} from "./lib/storage";

const DYNAMIC_ANIMATION_STYLE_ID = "kia-material-dynamic-animation-style";
const FONT_LINK_ATTR = "data-kia-material-font";

type BezierKey = "x1" | "y1" | "x2" | "y2";

/**
 * Imperative Material Studio controller.
 * Mounts into a container that already has the material-mode DOM structure.
 */
export class MaterialController {
  private readonly root: HTMLElement;
  private readonly state: MaterialState;
  private readonly panels: {
    palette: HTMLElement;
    icons: HTMLElement;
    animations: HTMLElement;
    style: HTMLElement;
  };
  private readonly toastEl: HTMLElement;
  private readonly saveCounter = { value: 0 };
  private readonly debouncers: Record<string, ReturnType<typeof setTimeout>> =
    {};
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private storageFaultNotified = false;
  private destroyed = false;

  private readonly onClick: (event: Event) => void;
  private readonly onInput: (event: Event) => void;

  constructor(root: HTMLElement) {
    this.root = root;
    this.state = loadMaterialState();

    const palette = this.requireEl("#panel-palette");
    const icons = this.requireEl("#panel-icons");
    const animations = this.requireEl("#panel-animations");
    const style = this.requireEl("#panel-style");
    this.panels = { palette, icons, animations, style };

    let toast = this.root.querySelector<HTMLElement>(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      this.root.appendChild(toast);
    }
    this.toastEl = toast;

    this.onClick = (event) => this.handleClick(event);
    this.onInput = (event) => this.handleInput(event);

    this.loadFonts();
    this.root.addEventListener("click", this.onClick);
    this.root.addEventListener("input", this.onInput);
    this.root.addEventListener("change", this.onInput);

    this.renderMaterialTab(this.state.materialTab);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.root.removeEventListener("click", this.onClick);
    this.root.removeEventListener("input", this.onInput);
    this.root.removeEventListener("change", this.onInput);
    Object.values(this.debouncers).forEach((timer) => clearTimeout(timer));
    if (this.toastTimer) clearTimeout(this.toastTimer);
    document.getElementById(DYNAMIC_ANIMATION_STYLE_ID)?.remove();
  }

  private requireEl(selector: string): HTMLElement {
    const el = this.root.querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`MaterialStudio missing element: ${selector}`);
    return el;
  }

  private $(selector: string): HTMLElement | null {
    return this.root.querySelector<HTMLElement>(selector);
  }

  private save(): void {
    saveMaterialState(this.state, {
      saveCounter: this.saveCounter,
      onFault: () => {
        if (!this.storageFaultNotified) {
          this.storageFaultNotified = true;
          this.showToast("Storage write failed. Export your workspace backup.");
        }
      },
    });
  }

  private debounceKey(key: string, fn: () => void, delay = 260): void {
    clearTimeout(this.debouncers[key]);
    this.debouncers[key] = setTimeout(fn, delay);
  }

  private showToast(text: string): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.add("show");
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(
      () => this.toastEl.classList.remove("show"),
      1700,
    );
  }

  private async copyText(
    text: string,
    label = "Copied to clipboard",
  ): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const temp = document.createElement("textarea");
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      temp.remove();
    }
    this.showToast(label);
  }

  private loadFonts(): void {
    if (typeof document === "undefined") return;
    if (!document.querySelector(`link[${FONT_LINK_ATTR}="inter"]`)) {
      const inter = document.createElement("link");
      inter.rel = "stylesheet";
      inter.href =
        "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap";
      inter.setAttribute(FONT_LINK_ATTR, "inter");
      document.head.appendChild(inter);
    }
    fontCatalog.forEach((font) => {
      const key = font.name.toLowerCase().replace(/\s+/g, "-");
      if (document.querySelector(`link[${FONT_LINK_ATTR}="${key}"]`)) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = font.url;
      link.setAttribute(FONT_LINK_ATTR, key);
      document.head.appendChild(link);
    });
  }

  private getVisiblePaletteNames(): string[] {
    const q = this.state.colorQuery.trim().toLowerCase();
    return Object.keys(fullPalette).filter((name) =>
      name.toLowerCase().includes(q),
    );
  }

  private getSelectedShades(): number[] {
    return allShades.filter((shade) => this.state.activeShades.has(shade));
  }

  private applyShadePreset(presetKey: string): void {
    const shades = shadePresets[presetKey as ShadePresetKey];
    if (!shades) return;
    this.state.activeShades = new Set(shades);
  }

  private getVisiblePaletteStats() {
    const colors = this.getVisiblePaletteNames().length;
    const shades = this.getSelectedShades().length;
    return { colors, shades, swatches: colors * shades };
  }

  private getCurrentGeneratedPalette(): string[] {
    return generatePalette(
      this.state.paletteBaseA,
      this.state.paletteBaseB,
      this.state.paletteCount,
      this.state.paletteBlendMode,
    );
  }

  private buildVisibleCssVars(): string {
    const names = this.getVisiblePaletteNames();
    const lines: string[] = [];
    names.forEach((name) => {
      const key = name.toLowerCase();
      allShades.forEach((shade) => {
        if (this.state.activeShades.has(shade))
          lines.push(`--${key}-${shade}: ${fullPalette[name]![shade]};`);
      });
    });
    return `:root {\n  ${lines.join("\n  ")}\n}`;
  }

  private buildVisibleTokens(format: TokenFormat): string {
    const names = this.getVisiblePaletteNames();
    const out: Record<string, Record<string, string>> = {};
    names.forEach((name) => {
      out[name] = {};
      allShades.forEach((shade) => {
        if (this.state.activeShades.has(shade))
          out[name]![shade] = fullPalette[name]![shade];
      });
    });

    if (format === "json") return JSON.stringify(out, null, 2);
    if (format === "scss") {
      const lines = ["$colors: ("];
      Object.entries(out).forEach(([name, shades]) => {
        lines.push(`  ${name.toLowerCase()}: (`);
        Object.entries(shades).forEach(([shade, hex]) =>
          lines.push(`    ${shade}: ${hex},`),
        );
        lines.push("  ),");
      });
      lines.push(");");
      return lines.join("\n");
    }
    if (format === "tailwind") {
      const lines = [
        "module.exports = {",
        "  theme: {",
        "    extend: {",
        "      colors: {",
      ];
      Object.entries(out).forEach(([name, shades]) => {
        lines.push(`        ${name.toLowerCase()}: {`);
        Object.entries(shades).forEach(([shade, hex]) =>
          lines.push(`          ${shade}: '${hex}',`),
        );
        lines.push("        },");
      });
      lines.push("      }", "    }", "  }", "};");
      return lines.join("\n");
    }
    return this.buildVisibleCssVars();
  }

  private renderPaletteMatrixRows(): void {
    const names = this.getVisiblePaletteNames();
    const selectedShades = this.getSelectedShades();
    const body = this.$("#palette-matrix-body");
    if (!body) return;
    const colSpan = Math.max(1, selectedShades.length + 1);

    if (!selectedShades.length) {
      body.innerHTML = `<tr><td class="palette-empty-cell" colspan="${colSpan}">No shade selected</td></tr>`;
      return;
    }

    if (!names.length) {
      body.innerHTML = `<tr><td class="palette-empty-cell" colspan="${colSpan}">No colors matched your search</td></tr>`;
      return;
    }

    body.innerHTML = names
      .map((name) => {
        const shadesHtml = selectedShades
          .map((shade) => {
            const hex = fullPalette[name]![shade as keyof (typeof fullPalette)[string]];
            return `<td><button class="matrix-swatch" style="background:${hex};color:${isLightColor(hex) ? "#111" : "#fff"}" data-copy="${hex}" type="button">${hex}</button></td>`;
          })
          .join("");
        return `<tr><td class="sticky"><span class="color-name">${name}<button class="control-chip-ghost" data-copy-row="${name}" type="button">CSS</button></span></td>${shadesHtml}</tr>`;
      })
      .join("");
  }

  private renderGeneratedPalette(): void {
    const target = this.$("#generator-output");
    if (!target) return;
    const generated = this.getCurrentGeneratedPalette();
    target.innerHTML = generated
      .map(
        (hex) =>
          `<button class="big-swatch" style="background:${hex};color:${isLightColor(hex) ? "#111" : "#fff"}" data-copy="${hex}" type="button">${hex}</button>`,
      )
      .join("");
  }

  private renderGradientPreview(): void {
    const text = `linear-gradient(${this.state.gradientAngle}deg, ${this.state.gradientStart}, ${this.state.gradientEnd})`;
    const preview = this.$("#gradient-preview");
    const code = this.$("#gradient-code");
    if (preview) preview.style.background = text;
    if (code) code.textContent = text;
  }

  private renderPalettePanel(): void {
    const stats = this.getVisiblePaletteStats();
    const selectedShades = this.getSelectedShades();
    const s = this.state;
    this.panels.palette.innerHTML = `
    <div class="panel-grid">
      <section class="glass-panel palette-section" style="padding:1rem;">
        <h3>Search and Shade Filters</h3>
        <div class="palette-filter-layout">
          <input id="color-search" class="input" type="search" placeholder="Search color name" value="${escapeAttr(s.colorQuery)}" />
          <p class="palette-stats muted">${stats.colors} colors × ${stats.shades} shades = ${stats.swatches} swatches</p>
          <div class="palette-chip-scroll">
            <button class="control-chip-ghost" data-shades="all" type="button">All</button>
            <button class="control-chip-ghost" data-shades="none" type="button">None</button>
            <button class="control-chip-ghost" data-shade-preset="light" type="button">Light</button>
            <button class="control-chip-ghost" data-shade-preset="core" type="button">Core</button>
            <button class="control-chip-ghost" data-shade-preset="dark" type="button">Dark</button>
            ${allShades.map((shade) => `<button class="control-chip ${s.activeShades.has(shade) ? "active" : ""}" data-shade="${shade}" type="button">${shade}</button>`).join("")}
            <button id="copy-visible-css-vars" class="pill-btn" type="button">Copy CSS Variables</button>
          </div>
        </div>
      </section>

      <section class="glass-panel palette-section" style="padding:1rem;">
        <h3>Color Matrix</h3>
        <div class="matrix-wrap">
          <table class="palette-matrix">
            <thead>
              <tr>
                <th class="sticky">Color</th>
                ${selectedShades.map((shade) => `<th>${shade}</th>`).join("")}
              </tr>
            </thead>
            <tbody id="palette-matrix-body"></tbody>
          </table>
        </div>
      </section>

      <section class="glass-panel palette-section" style="padding:1rem;">
        <h3>Palette Generator</h3>
        <div class="palette-generator-grid">
          <label class="palette-pair">
            <span>Color A</span>
            <input id="gen-color-a" type="color" value="${s.paletteBaseA}" />
            <input id="gen-color-a-text" class="color-text-input" value="${escapeAttr(s.paletteBaseA)}" />
          </label>
          <label class="palette-pair">
            <span>Color B</span>
            <input id="gen-color-b" type="color" value="${s.paletteBaseB}" />
            <input id="gen-color-b-text" class="color-text-input" value="${escapeAttr(s.paletteBaseB)}" />
          </label>
        </div>
        <div class="generator-controls">
          <label class="gradient-item">Blend
            <select id="palette-blend-mode" class="input">
              <option value="hsl" ${s.paletteBlendMode === "hsl" ? "selected" : ""}>HSL (shortest hue)</option>
              <option value="rgb" ${s.paletteBlendMode === "rgb" ? "selected" : ""}>RGB (linear)</option>
            </select>
          </label>
        </div>
        <div class="palette-chip-scroll" style="margin-top:.65rem;">
          ${Array.from({ length: 9 }, (_, i) => i + 2)
            .map(
              (n) =>
                `<button class="control-chip ${s.paletteCount === n ? "active" : ""}" data-count="${n}" type="button">${n} colors</button>`,
            )
            .join("")}
          <button id="palette-random" class="pill-btn" type="button">Random Bases</button>
          <button id="palette-reverse" class="pill-btn" type="button">Reverse</button>
          <button id="palette-generate" class="pill-btn" type="button">Generate</button>
          <button id="copy-generated-palette" class="pill-btn" type="button">Copy Palette</button>
        </div>
        <div id="generator-output" class="generator-output" style="margin-top:.75rem;"></div>
      </section>

      <section class="glass-panel palette-section" style="padding:1rem;">
        <h3>Design Token Export</h3>
        <div class="token-tools">
          <select id="token-format" class="input">
            <option value="css" ${s.tokenFormat === "css" ? "selected" : ""}>CSS Variables</option>
            <option value="json" ${s.tokenFormat === "json" ? "selected" : ""}>JSON</option>
            <option value="tailwind" ${s.tokenFormat === "tailwind" ? "selected" : ""}>Tailwind Config</option>
            <option value="scss" ${s.tokenFormat === "scss" ? "selected" : ""}>SCSS Map</option>
          </select>
          <button id="generate-tokens" class="pill-btn" type="button">Generate Tokens</button>
          <button id="copy-token-output" class="pill-btn" type="button">Copy Output</button>
        </div>
        <textarea id="token-output" class="input" style="margin-top:.65rem; min-height:140px; font-family:ui-monospace, SFMono-Regular, Menlo, monospace;">${this.buildVisibleTokens(s.tokenFormat)}</textarea>
      </section>

      <section class="glass-panel palette-section" style="padding:1rem;">
        <h3>Gradient Lab</h3>
        <div class="gradient-controls">
          <label class="gradient-item">Start <input id="gradient-start" type="color" value="${s.gradientStart}" /></label>
          <input id="gradient-start-text" class="color-text-input" value="${escapeAttr(s.gradientStart)}" />
          <label class="gradient-item">End <input id="gradient-end" type="color" value="${s.gradientEnd}" /></label>
          <input id="gradient-end-text" class="color-text-input" value="${escapeAttr(s.gradientEnd)}" />
          <label class="gradient-item slider-wrap">Angle <input id="gradient-angle" type="range" min="0" max="360" step="1" value="${s.gradientAngle}" /></label>
          <span id="gradient-angle-label" class="gradient-angle-chip">${s.gradientAngle}deg</span>
          <button id="copy-gradient" class="pill-btn" type="button">Copy Gradient CSS</button>
        </div>
        <div id="gradient-preview" class="preview-box" style="margin-top:.7rem; min-height:80px;"></div>
        <code id="gradient-code"></code>
      </section>
    </div>
  `;

    this.renderPaletteMatrixRows();
    this.renderGeneratedPalette();
    this.renderGradientPreview();
  }

  private buildIconSprite(favoritesOnly = false): string {
    const source = favoritesOnly
      ? iconDatabase.filter((i) => this.state.iconFavorites.has(i.name))
      : iconDatabase;
    const symbols = source.map((icon) => {
      const inner = icon.svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1] || "";
      return `<symbol id="icon-${icon.name}" viewBox="0 0 24 24">${inner}</symbol>`;
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${symbols.join("\n")}\n</svg>`;
  }

  private renderIconsPanel(): void {
    const s = this.state;
    this.panels.icons.innerHTML = `
    <section class="glass-panel" style="padding:1rem;">
      <h3>SVG Icon Library</h3>
      <div className="control-row">
        <input id="icon-search" class="input" type="search" placeholder="Search icon" value="${escapeAttr(s.iconQuery)}" style="max-width:240px;" />
        <label class="slider-wrap">Size: <span id="icon-size-label">${s.iconSize}px</span>
        <input id="icon-size" type="range" min="18" max="48" step="1" value="${s.iconSize}" /></label>
        <button id="copy-icon-sprite" class="pill-btn" type="button">Copy Favorites Sprite</button>
      </div>
      <div id="icon-grid" class="icon-grid" style="margin-top:.75rem;"></div>
    </section>
  `;
    this.renderIconGrid();
  }

  private renderIconGrid(): void {
    const q = this.state.iconQuery.trim().toLowerCase();
    const filtered = iconDatabase.filter((icon) =>
      icon.name.toLowerCase().includes(q),
    );
    const grid = this.$("#icon-grid");
    if (!grid) return;
    grid.style.setProperty("--icon-size", `${this.state.iconSize}px`);
    grid.innerHTML = filtered
      .map((icon) => {
        const fav = this.state.iconFavorites.has(icon.name);
        return `<div class="icon-card">${icon.svg}<small>${icon.name}</small><div class="control-row" style="justify-content:center; margin-top:.35rem;"><button class="control-chip-ghost" data-icon-copy="${icon.name}" type="button">Copy</button><button class="control-chip-ghost ${fav ? "active" : ""}" data-icon-fav="${icon.name}" type="button">${fav ? "★" : "☆"}</button></div></div>`;
      })
      .join("");
  }

  private bezierString(): string {
    const { x1, y1, x2, y2 } = this.state.bezier;
    return `cubic-bezier(${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)})`;
  }

  private renderAnimationsPanel(): void {
    const { x1, y1, x2, y2 } = this.state.bezier;
    const s = this.state;
    this.panels.animations.innerHTML = `
    <section class="glass-panel" style="padding:1rem;">
      <h3>Cubic-Bezier Builder</h3>
      <div class="bezier-box">
        ${(
          [
            ["x1", x1, 0, 1, 0.01],
            ["y1", y1, -1, 2, 0.01],
            ["x2", x2, 0, 1, 0.01],
            ["y2", y2, -1, 2, 0.01],
          ] as const
        )
          .map(
            ([name, value, min, max, step]) => `
            <label class="slider-wrap">
              <strong>${name}</strong>
              <input type="range" data-bezier="${name}" min="${min}" max="${max}" step="${step}" value="${value}" />
              <small>${Number(value).toFixed(2)}</small>
            </label>
          `,
          )
          .join("")}
      </div>
      <div class="control-row" style="margin-top:.65rem;">
        <code id="bezier-code">${this.bezierString()}</code>
        <button class="pill-btn" id="play-bezier" type="button">Play</button>
        <button class="pill-btn" id="copy-bezier" type="button">Copy</button>
      </div>
      <div class="bezier-preview">
        <div id="bezier-ball" class="bezier-ball"></div>
      </div>
    </section>

    <section class="glass-panel" style="padding:1rem; margin-top:.8rem;">
      <h3>Animation Studio</h3>
      <div class="control-row">
        <input id="animation-search" class="input" type="search" placeholder="Search animation" value="${escapeAttr(s.animationQuery)}" style="max-width:240px;" />
        <label class="slider-wrap">Duration <input id="anim-duration" type="range" min="0.2" max="4" step="0.1" value="${s.animationDuration}" /></label>
        <span id="anim-duration-label">${s.animationDuration}s</span>
        <label class="slider-wrap">Delay <input id="anim-delay" type="range" min="0" max="2" step="0.1" value="${s.animationDelay}" /></label>
        <span id="anim-delay-label">${s.animationDelay}s</span>
        <label class="slider-wrap">Loops <input id="anim-loops" type="range" min="1" max="6" step="1" value="${s.animationIterations}" /></label>
        <span id="anim-loops-label">${s.animationIterations}</span>
      </div>
      <div class="control-row" style="margin-top:.55rem;">
        <input id="anim-preview-text" class="input" value="${escapeAttr(s.animationPreviewText)}" style="max-width:260px;" />
        <button id="copy-animation-with-settings" class="pill-btn" type="button">Copy Full Animation Snippet</button>
      </div>
      <div id="animation-grid" class="anim-grid" style="margin-top:.75rem;"></div>
      <div class="animation-preview"><div id="selected-animation-pill">${escapeHtml(s.animationPreviewText)}</div></div>
    </section>
  `;

    this.renderAnimationGrid();
    this.playBezierBall();
    this.renderAnimationPreview();
  }

  private renderAnimationGrid(): void {
    const q = this.state.animationQuery.trim().toLowerCase();
    const list = animationsDB.filter((a) => a.name.toLowerCase().includes(q));
    const grid = this.$("#animation-grid");
    if (!grid) return;
    grid.innerHTML = list
      .map(
        (a) =>
          `<button class="anim-card ${this.state.selectedAnimation === a.name ? "active" : ""}" type="button" data-anim-name="${a.name}"><strong>${a.name}</strong></button>`,
      )
      .join("");
  }

  private renderAnimationPreview(): void {
    const selected = animationsDB.find(
      (a) => a.name === this.state.selectedAnimation,
    );
    if (!selected) return;
    let style = document.getElementById(
      DYNAMIC_ANIMATION_STYLE_ID,
    ) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = DYNAMIC_ANIMATION_STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = `${selected.code}\n#selected-animation-pill { animation: ${selected.name} ${this.state.animationDuration}s ease ${this.state.animationDelay}s ${this.state.animationIterations} both; }`;

    const pill = this.$("#selected-animation-pill");
    if (!pill) return;
    pill.textContent = this.state.animationPreviewText;
    pill.style.animation = "none";
    void pill.offsetWidth;
    pill.style.animation = `${selected.name} ${this.state.animationDuration}s ease ${this.state.animationDelay}s ${this.state.animationIterations} both`;
  }

  private playBezierBall(): void {
    const ball = this.$("#bezier-ball");
    if (!ball) return;
    ball.classList.remove("animate");
    ball.style.animationTimingFunction = this.bezierString();
    void ball.offsetWidth;
    ball.classList.add("animate");
  }

  private getContrastRatio(hexA: string, hexB: string): number {
    const l1 = getLuminance(hexToRgb(hexA));
    const l2 = getLuminance(hexToRgb(hexB));
    const high = Math.max(l1, l2);
    const low = Math.min(l1, l2);
    return (high + 0.05) / (low + 0.05);
  }

  private renderStyleToolsPanel(): void {
    const s = this.state;
    this.panels.style.innerHTML = `
    <section class="glass-panel" style="padding:1rem;">
      <h3>Typography Library</h3>
      <div class="control-row">
        <input id="font-search" class="input" type="search" placeholder="Search font" value="${escapeAttr(s.fontQuery)}" style="max-width:240px;" />
        <label class="slider-wrap">Preview Size: <span id="font-size-label">${s.fontPreviewSize}px</span>
        <input id="font-size" type="range" min="14" max="52" step="1" value="${s.fontPreviewSize}" /></label>
      </div>
      <div id="font-grid" class="font-grid" style="margin-top:.75rem;"></div>
    </section>

    <section class="glass-panel" style="padding:1rem; margin-top:.8rem;">
      <h3>WCAG Contrast Checker</h3>
      <div class="control-row">
        <label>Text <input id="contrast-text" type="color" value="${s.contrastText}" /></label>
        <input id="contrast-text-val" class="color-text-input" value="${escapeAttr(s.contrastText)}" style="max-width:120px;" />
        <label>Background <input id="contrast-bg" type="color" value="${s.contrastBg}" /></label>
        <input id="contrast-bg-val" class="color-text-input" value="${escapeAttr(s.contrastBg)}" style="max-width:120px;" />
        <button id="suggest-text-color" class="pill-btn" type="button">Suggest Text Color</button>
      </div>
      <div id="contrast-preview" class="preview-box" style="margin-top:.7rem;">Design systems become stronger when contrast is validated early.</div>
      <p id="contrast-result"></p>
    </section>
  `;

    this.renderFontGrid();
    this.renderContrastResult();
  }

  private renderFontGrid(): void {
    const q = this.state.fontQuery.trim().toLowerCase();
    const target = this.$("#font-grid");
    if (!target) return;
    const list = fontCatalog.filter((f) => f.name.toLowerCase().includes(q));
    target.innerHTML = list
      .map(
        (font) =>
          `<button class="font-card" data-font-name="${font.name}" type="button" style="font-family:${font.family};font-size:${Math.min(this.state.fontPreviewSize, 28)}px;">${escapeHtml(font.name)}</button>`,
      )
      .join("");
  }

  private renderContrastResult(): void {
    const ratio = this.getContrastRatio(
      this.state.contrastText,
      this.state.contrastBg,
    );
    const aaNormal = ratio >= 4.5 ? "Pass" : "Fail";
    const aaaNormal = ratio >= 7 ? "Pass" : "Fail";
    const aaLarge = ratio >= 3 ? "Pass" : "Fail";

    const preview = this.$("#contrast-preview");
    const result = this.$("#contrast-result");
    if (preview) {
      preview.style.color = this.state.contrastText;
      preview.style.background = this.state.contrastBg;
    }
    if (result) {
      result.innerHTML = `Contrast: <strong>${ratio.toFixed(2)}:1</strong> | AA Normal: <strong>${aaNormal}</strong> | AAA Normal: <strong>${aaaNormal}</strong> | AA Large: <strong>${aaLarge}</strong>`;
    }
  }

  private suggestAccessibleTextColor(): void {
    const ratioBlack = this.getContrastRatio("#000000", this.state.contrastBg);
    const ratioWhite = this.getContrastRatio("#ffffff", this.state.contrastBg);
    this.state.contrastText =
      ratioBlack >= ratioWhite ? "#000000" : "#ffffff";
    this.save();
    const textPicker = this.$("#contrast-text") as HTMLInputElement | null;
    const textInput = this.$("#contrast-text-val") as HTMLInputElement | null;
    if (textPicker) textPicker.value = this.state.contrastText;
    if (textInput) textInput.value = this.state.contrastText;
    this.renderContrastResult();
  }

  private renderMaterialTab(tab: string): void {
    const safeTab = sanitizeEnum(tab, ALLOWED_MATERIAL_TABS, "palette");
    this.state.materialTab = safeTab;
    this.save();

    this.root.querySelectorAll(".tab-btn").forEach((btn) => {
      const el = btn as HTMLElement;
      if (el.dataset.tab)
        el.classList.toggle("active", el.dataset.tab === safeTab);
    });

    (Object.entries(this.panels) as [MaterialTab, HTMLElement][]).forEach(
      ([key, panel]) => {
        panel.classList.toggle("active", key === safeTab);
      },
    );

    if (safeTab === "palette") this.renderPalettePanel();
    if (safeTab === "icons") this.renderIconsPanel();
    if (safeTab === "animations") this.renderAnimationsPanel();
    if (safeTab === "style") this.renderStyleToolsPanel();
  }

  private targetEl(event: Event): HTMLElement | null {
    const t = event.target;
    if (t instanceof HTMLElement) return t;
    if (t instanceof Element) return t.parentElement;
    return null;
  }

  private handleClick(event: Event): void {
    const target = this.targetEl(event);
    if (!target) return;

    const tabBtn = target.closest(".tab-btn") as HTMLElement | null;
    if (tabBtn?.dataset.tab) {
      this.renderMaterialTab(
        sanitizeEnum(
          tabBtn.dataset.tab,
          ALLOWED_MATERIAL_TABS,
          this.state.materialTab,
        ),
      );
    }

    const shadeBtn = target.closest("[data-shade]") as HTMLElement | null;
    if (shadeBtn) {
      const shade = Number(shadeBtn.dataset.shade);
      if (this.state.activeShades.has(shade)) this.state.activeShades.delete(shade);
      else this.state.activeShades.add(shade);
      this.save();
      this.renderPalettePanel();
    }

    const shadeAllNone = target.closest("[data-shades]") as HTMLElement | null;
    if (shadeAllNone) {
      const mode = shadeAllNone.dataset.shades;
      if (mode === "all") this.state.activeShades = new Set(allShades);
      if (mode === "none") this.state.activeShades = new Set();
      this.save();
      this.renderPalettePanel();
    }

    const shadePresetBtn = target.closest(
      "[data-shade-preset]",
    ) as HTMLElement | null;
    if (shadePresetBtn?.dataset.shadePreset) {
      this.applyShadePreset(shadePresetBtn.dataset.shadePreset);
      this.save();
      this.renderPalettePanel();
    }

    const countBtn = target.closest("[data-count]") as HTMLElement | null;
    if (countBtn) {
      this.state.paletteCount = Math.max(
        2,
        Math.min(
          10,
          Number(countBtn.dataset.count) || this.state.paletteCount,
        ),
      );
      this.save();
      this.renderPalettePanel();
    }

    if (target.id === "palette-generate") {
      const a =
        normalizeHex(
          (this.$("#gen-color-a-text") as HTMLInputElement | null)?.value ||
            "",
        ) || this.state.paletteBaseA;
      const b =
        normalizeHex(
          (this.$("#gen-color-b-text") as HTMLInputElement | null)?.value ||
            "",
        ) || this.state.paletteBaseB;
      this.state.paletteBaseA = a;
      this.state.paletteBaseB = b;
      const pickerA = this.$("#gen-color-a") as HTMLInputElement | null;
      const pickerB = this.$("#gen-color-b") as HTMLInputElement | null;
      const textA = this.$("#gen-color-a-text") as HTMLInputElement | null;
      const textB = this.$("#gen-color-b-text") as HTMLInputElement | null;
      if (pickerA) pickerA.value = a;
      if (pickerB) pickerB.value = b;
      if (textA) textA.value = a;
      if (textB) textB.value = b;
      this.save();
      this.renderGeneratedPalette();
      this.showToast("Palette regenerated");
    }

    if (target.id === "palette-random") {
      const randomHex = () =>
        `#${Math.floor(Math.random() * 0xffffff)
          .toString(16)
          .padStart(6, "0")}`;
      this.state.paletteBaseA = randomHex();
      this.state.paletteBaseB = randomHex();
      this.save();
      this.renderPalettePanel();
      this.showToast("Random base colors applied");
    }

    if (target.id === "palette-reverse") {
      const nextA = this.state.paletteBaseB;
      const nextB = this.state.paletteBaseA;
      this.state.paletteBaseA = nextA;
      this.state.paletteBaseB = nextB;
      this.save();
      this.renderPalettePanel();
      this.showToast("Palette direction reversed");
    }

    if (target.id === "copy-generated-palette") {
      void this.copyText(
        this.getCurrentGeneratedPalette().join("\n"),
        "Generated palette copied",
      );
    }

    if (target.id === "copy-visible-css-vars")
      void this.copyText(
        this.buildVisibleCssVars(),
        "Visible CSS variables copied",
      );
    if (target.id === "generate-tokens") {
      const tokenTarget = this.$(
        "#token-output",
      ) as HTMLTextAreaElement | null;
      if (tokenTarget)
        tokenTarget.value = this.buildVisibleTokens(this.state.tokenFormat);
      this.showToast("Token output generated");
    }
    if (target.id === "copy-token-output") {
      const tokenTarget = this.$(
        "#token-output",
      ) as HTMLTextAreaElement | null;
      if (tokenTarget) void this.copyText(tokenTarget.value, "Token output copied");
    }
    if (target.id === "copy-gradient") {
      const gradient = `linear-gradient(${this.state.gradientAngle}deg, ${this.state.gradientStart}, ${this.state.gradientEnd})`;
      void this.copyText(`background: ${gradient};`, "Gradient CSS copied");
    }

    const copyRowBtn = target.closest("[data-copy-row]") as HTMLElement | null;
    if (copyRowBtn?.dataset.copyRow) {
      const row = copyRowBtn.dataset.copyRow;
      const shades = allShades
        .filter((shade) => this.state.activeShades.has(shade))
        .map(
          (shade) =>
            `--${row.toLowerCase()}-${shade}: ${fullPalette[row]![shade]};`,
        )
        .join("\n");
      void this.copyText(
        `:root {\n${shades}\n}`,
        `${row} CSS variables copied`,
      );
    }

    const copyBtn = target.closest("[data-copy]") as HTMLElement | null;
    if (copyBtn?.dataset.copy)
      void this.copyText(
        copyBtn.dataset.copy,
        `Copied: ${copyBtn.dataset.copy}`,
      );

    const iconFavBtn = target.closest("[data-icon-fav]") as HTMLElement | null;
    if (iconFavBtn?.dataset.iconFav) {
      const name = iconFavBtn.dataset.iconFav;
      if (this.state.iconFavorites.has(name))
        this.state.iconFavorites.delete(name);
      else this.state.iconFavorites.add(name);
      this.save();
      this.renderIconGrid();
      return;
    }

    const iconBtn = target.closest("[data-icon-copy]") as HTMLElement | null;
    if (iconBtn?.dataset.iconCopy) {
      const icon = iconDatabase.find(
        (i) => i.name === iconBtn.dataset.iconCopy,
      );
      if (icon) void this.copyText(icon.svg, `SVG copied: ${icon.name}`);
    }

    if (target.id === "copy-icon-sprite") {
      void this.copyText(
        this.buildIconSprite(true),
        "Favorite icon sprite copied",
      );
    }

    if (target.id === "play-bezier") this.playBezierBall();
    if (target.id === "copy-bezier")
      void this.copyText(this.bezierString(), "Cubic-bezier function copied");

    const animBtn = target.closest("[data-anim-name]") as HTMLElement | null;
    if (animBtn?.dataset.animName) {
      this.state.selectedAnimation = animBtn.dataset.animName;
      this.save();
      this.renderAnimationGrid();
      this.renderAnimationPreview();
    }

    if (target.id === "copy-animation-with-settings") {
      const selected = animationsDB.find(
        (a) => a.name === this.state.selectedAnimation,
      );
      if (!selected) return;
      const snippet = `${selected.code}\n.demo {\n  animation: ${selected.name} ${this.state.animationDuration}s ease ${this.state.animationDelay}s ${this.state.animationIterations};\n}`;
      void this.copyText(snippet, "Animation snippet copied");
    }

    const fontBtn = target.closest("[data-font-name]") as HTMLElement | null;
    if (fontBtn?.dataset.fontName) {
      const font = fontCatalog.find((f) => f.name === fontBtn.dataset.fontName);
      if (font) {
        const snippet = `@import url('${font.url}');\nfont-family: ${font.family};`;
        void this.copyText(snippet, `Font snippet copied: ${font.name}`);
      }
    }

    if (target.id === "suggest-text-color") this.suggestAccessibleTextColor();
  }

  private handleInput(event: Event): void {
    const target = this.targetEl(event);
    if (!target) return;

    if (target.id === "color-search") {
      const value = (target as HTMLInputElement).value;
      this.debounceKey("colorSearch", () => {
        this.state.colorQuery = value;
        this.save();
        this.renderPaletteMatrixRows();
      });
    }

    if (target.id === "icon-search") {
      const value = (target as HTMLInputElement).value;
      this.debounceKey("iconSearch", () => {
        this.state.iconQuery = value;
        this.save();
        this.renderIconGrid();
      });
    }

    if (target.id === "icon-size") {
      this.state.iconSize = Math.round(
        clampNumber(
          (target as HTMLInputElement).value,
          18,
          48,
          this.state.iconSize,
        ),
      );
      this.save();
      const label = this.$("#icon-size-label");
      if (label) label.textContent = `${this.state.iconSize}px`;
      this.renderIconGrid();
    }

    if (target.id === "animation-search") {
      const value = (target as HTMLInputElement).value;
      this.debounceKey("animationSearch", () => {
        this.state.animationQuery = value;
        this.save();
        this.renderAnimationGrid();
      });
    }

    if (target.id === "anim-preview-text") {
      this.state.animationPreviewText = (target as HTMLInputElement).value;
      this.save();
      this.renderAnimationPreview();
    }

    if (target.id === "anim-duration") {
      this.state.animationDuration = clampNumber(
        (target as HTMLInputElement).value,
        0.2,
        4,
        this.state.animationDuration,
      );
      this.save();
      const label = this.$("#anim-duration-label");
      if (label) label.textContent = `${this.state.animationDuration}s`;
      this.renderAnimationPreview();
    }

    if (target.id === "anim-delay") {
      this.state.animationDelay = clampNumber(
        (target as HTMLInputElement).value,
        0,
        2,
        this.state.animationDelay,
      );
      this.save();
      const label = this.$("#anim-delay-label");
      if (label) label.textContent = `${this.state.animationDelay}s`;
      this.renderAnimationPreview();
    }

    if (target.id === "anim-loops") {
      this.state.animationIterations = Math.round(
        clampNumber(
          (target as HTMLInputElement).value,
          1,
          6,
          this.state.animationIterations,
        ),
      );
      this.save();
      const label = this.$("#anim-loops-label");
      if (label) label.textContent = `${this.state.animationIterations}`;
      this.renderAnimationPreview();
    }

    if (target.id === "font-search") {
      const value = (target as HTMLInputElement).value;
      this.debounceKey("fontSearch", () => {
        this.state.fontQuery = value;
        this.save();
        this.renderFontGrid();
      });
    }

    if (target.id === "font-size") {
      this.state.fontPreviewSize = Math.round(
        clampNumber(
          (target as HTMLInputElement).value,
          14,
          52,
          this.state.fontPreviewSize,
        ),
      );
      this.save();
      const label = this.$("#font-size-label");
      if (label) label.textContent = `${this.state.fontPreviewSize}px`;
      this.renderFontGrid();
    }

    const bezierKey = target.dataset.bezier as BezierKey | undefined;
    if (bezierKey) {
      const ranges: Record<BezierKey, [number, number]> = {
        x1: [0, 1],
        y1: [-1, 2],
        x2: [0, 1],
        y2: [-1, 2],
      };
      const [min, max] = ranges[bezierKey] || [0, 1];
      this.state.bezier[bezierKey] = clampNumber(
        (target as HTMLInputElement).value,
        min,
        max,
        this.state.bezier[bezierKey],
      );
      this.save();
      const code = this.$("#bezier-code");
      if (code) code.textContent = this.bezierString();
      const small = target.parentElement?.querySelector("small");
      if (small)
        small.textContent = Number(
          (target as HTMLInputElement).value,
        ).toFixed(2);
      this.playBezierBall();
    }

    if (target.id === "token-format") {
      this.state.tokenFormat = sanitizeEnum(
        (target as HTMLSelectElement).value,
        ALLOWED_TOKEN_FORMATS,
        this.state.tokenFormat,
      );
      this.save();
    }

    if (target.id === "palette-blend-mode") {
      const value = (target as HTMLSelectElement).value;
      this.state.paletteBlendMode = (
        ALLOWED_BLEND_MODES.includes(value as BlendMode) ? value : "hsl"
      ) as BlendMode;
      this.save();
      this.renderGeneratedPalette();
    }

    if (target.id === "gradient-angle") {
      this.state.gradientAngle = Math.round(
        clampNumber(
          (target as HTMLInputElement).value,
          0,
          360,
          this.state.gradientAngle,
        ),
      );
      this.save();
      const label = this.$("#gradient-angle-label");
      if (label) label.textContent = `${this.state.gradientAngle}deg`;
      this.renderGradientPreview();
    }

    const syncPairs: [string, string, keyof MaterialState][] = [
      ["gen-color-a", "gen-color-a-text", "paletteBaseA"],
      ["gen-color-b", "gen-color-b-text", "paletteBaseB"],
      ["contrast-text", "contrast-text-val", "contrastText"],
      ["contrast-bg", "contrast-bg-val", "contrastBg"],
      ["gradient-start", "gradient-start-text", "gradientStart"],
      ["gradient-end", "gradient-end-text", "gradientEnd"],
    ];

    for (const [pickerId, textId, stateKey] of syncPairs) {
      if (target.id === pickerId || target.id === textId) {
        const fixed = normalizeHex((target as HTMLInputElement).value);
        if (!fixed) return;
        (this.state as unknown as Record<string, string>)[stateKey] = fixed;
        this.save();

        const picker = this.$(`#${pickerId}`) as HTMLInputElement | null;
        const text = this.$(`#${textId}`) as HTMLInputElement | null;
        if (picker) picker.value = fixed;
        if (text) text.value = fixed;

        if (String(stateKey).startsWith("contrast"))
          this.renderContrastResult();
        if (String(stateKey).startsWith("paletteBase"))
          this.renderGeneratedPalette();
        if (String(stateKey).startsWith("gradient"))
          this.renderGradientPreview();
      }
    }
  }
}
