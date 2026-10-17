"use client";

import { useEffect, useRef } from "react";
import { MaterialController } from "./MaterialController";
import "./material-studio.css";

export function MaterialStudio() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const controller = new MaterialController(root);
    return () => controller.destroy();
  }, []);

  return (
    <div ref={rootRef} className="material-studio-root">
      <section
        id="material-mode"
        className="view material-mode active"
        aria-label="استودیوی متریال"
      >
        <div className="tabs" id="material-tabs">
          <button className="tab-btn active" data-tab="palette" type="button">
            پالت
          </button>
          <button className="tab-btn" data-tab="icons" type="button">
            آیکون (۵۵)
          </button>
          <button className="tab-btn" data-tab="animations" type="button">
            انیمیشن
          </button>
          <button className="tab-btn" data-tab="style" type="button">
            ابزار استایل
          </button>
        </div>

        <section id="panel-palette" className="tab-panel active" />
        <section id="panel-icons" className="tab-panel" />
        <section id="panel-animations" className="tab-panel" />
        <section id="panel-style" className="tab-panel" />
      </section>

      <div className="toast" role="status" aria-live="polite" />
    </div>
  );
}
