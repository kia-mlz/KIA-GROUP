'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageProvider';

type EditorTab = 'html' | 'css' | 'js';
type PreviewSize = 'fluid' | 'desktop' | 'tablet' | 'mobile';

interface CodeBundle {
  html: string;
  css: string;
  js: string;
}

interface ConsoleLine {
  type: 'log' | 'warn' | 'error' | 'info';
  text: string;
}

interface LessonPlaygroundProps {
  storageKey: string;
  starterHtml?: string;
  starterCss?: string;
  starterJs?: string;
}

const PREVIEW_WIDTHS: Record<PreviewSize, string> = {
  fluid: '100%',
  desktop: '100%',
  tablet: '768px',
  mobile: '390px',
};

function defaultBundle(html?: string, css?: string, js?: string): CodeBundle {
  return {
    html: html ?? '<div class="demo">\n  <h1>Hello Kia</h1>\n  <p>Edit HTML, CSS, and JS — then Run.</p>\n</div>',
    css:
      css ??
      '.demo {\n  font-family: system-ui, sans-serif;\n  padding: 1rem;\n  color: #0e1626;\n}\n.demo h1 { margin: 0 0 0.5rem; }',
    js: js ?? 'console.log("Lesson playground ready");',
  };
}

function loadBundle(key: string, fallback: CodeBundle): CodeBundle {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<CodeBundle>;
    return {
      html: typeof parsed.html === 'string' ? parsed.html : fallback.html,
      css: typeof parsed.css === 'string' ? parsed.css : fallback.css,
      js: typeof parsed.js === 'string' ? parsed.js : fallback.js,
    };
  } catch {
    return fallback;
  }
}

function buildPreviewDoc(bundle: CodeBundle): string {
  const safeJs = (bundle.js || '').replace(/<\/script/gi, '<\\/script');
  const endScript = '<' + '/script>';
  return `<!doctype html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>${bundle.css || ''}</style>
<script>
(function(){
  const send = (type, args) => {
    parent.postMessage({ source: 'kia-preview-console', type, args: Array.from(args).map((a) => {
      try { return typeof a === 'string' ? a : JSON.stringify(a); } catch(e){ return String(a); }
    }).join(' ') }, '*');
  };
  const base = console;
  ['log','warn','error','info'].forEach((k) => {
    const old = base[k].bind(base);
    console[k] = function(){ send(k, arguments); old.apply(base, arguments); };
  });
  window.onerror = function(msg, src, line, col){
    send('error', [msg + ' @ ' + line + ':' + col]);
  };
  window.addEventListener('unhandledrejection', function(e){
    const reason = e && 'reason' in e ? e.reason : '';
    let text = 'Unhandled promise rejection';
    if (typeof reason === 'string' && reason) text += ': ' + reason;
    else if (reason) {
      try { text += ': ' + JSON.stringify(reason); } catch(_err) { text += ': ' + String(reason); }
    }
    send('error', [text]);
  });
})();
${endScript}
</head>
<body>
${bundle.html || ''}
<script>
${safeJs}
${endScript}
</body>
</html>`;
}

export function LessonPlayground({
  storageKey,
  starterHtml,
  starterCss,
  starterJs,
}: LessonPlaygroundProps) {
  const { t } = useLanguage();
  const fallback = useMemo(
    () => defaultBundle(starterHtml, starterCss, starterJs),
    [starterHtml, starterCss, starterJs],
  );
  const [bundle, setBundle] = useState<CodeBundle>(() =>
    typeof window === 'undefined' ? fallback : loadBundle(storageKey, fallback),
  );
  const [tab, setTab] = useState<EditorTab>('html');
  const [autoRun, setAutoRun] = useState(true);
  const [previewSize, setPreviewSize] = useState<PreviewSize>('fluid');
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const runTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runPreview = useCallback(
    (next: CodeBundle = bundle) => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      setLines([]);
      iframe.srcdoc = buildPreviewDoc(next);
    },
    [bundle],
  );

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(bundle));
  }, [bundle, storageKey]);

  useEffect(() => {
    runPreview(bundle);
  }, []); // mount once with initial bundle

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as { source?: string; type?: string; args?: string };
      if (!data || data.source !== 'kia-preview-console') return;
      const type = (data.type as ConsoleLine['type']) || 'log';
      setLines((prev) => [...prev, { type, text: data.args || '' }]);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const updateCode = (value: string) => {
    setBundle((prev) => {
      const next = { ...prev, [tab]: value };
      if (autoRun) {
        if (runTimer.current) clearTimeout(runTimer.current);
        runTimer.current = setTimeout(() => runPreview(next), 280);
      }
      return next;
    });
  };

  const resetCode = () => {
    setBundle(fallback);
    runPreview(fallback);
  };

  return (
    <article className="editor-card glass-panel">
      <div className="editor-head">
        <h3>{t('lesson.playgroundTitle')}</h3>
        <div className="control-row">
          <label className="check-wrap">
            <input
              type="checkbox"
              checked={autoRun}
              onChange={(e) => setAutoRun(e.target.checked)}
            />
            {t('lesson.autoRun')}
          </label>
          <button type="button" className="pill-btn" onClick={() => runPreview()}>
            {t('lesson.run')}
          </button>
          <button type="button" className="pill-btn" onClick={resetCode}>
            {t('lesson.resetCode')}
          </button>
        </div>
      </div>

      <div className="preview-toolbar">
        {(['fluid', 'desktop', 'tablet', 'mobile'] as PreviewSize[]).map((size) => (
          <button
            key={size}
            type="button"
            className={`pill-btn${previewSize === size ? ' active' : ''}`}
            onClick={() => setPreviewSize(size)}
          >
            {t(`lesson.preview.${size}`)}
          </button>
        ))}
      </div>

      <div className="editor-tabs">
        {(['html', 'css', 'js'] as EditorTab[]).map((key) => (
          <button
            key={key}
            type="button"
            className={`pill-btn${tab === key ? ' active' : ''}`}
            onClick={() => setTab(key)}
          >
            {key.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="editor-grid">
        <textarea
          className="code-editor"
          value={bundle[tab]}
          onChange={(e) => updateCode(e.target.value)}
          spellCheck={false}
          aria-label={t('lesson.codeEditor')}
        />
        <div className="preview-stack">
          <div
            className="preview-frame-wrap"
            style={{ maxWidth: PREVIEW_WIDTHS[previewSize], marginInline: 'auto' }}
          >
            <iframe
              ref={iframeRef}
              className="code-preview"
              title={t('lesson.previewFrame')}
              sandbox="allow-scripts"
            />
          </div>
          <div className="console-panel">
            <div className="console-head">
              <strong>{t('lesson.console')}</strong>
              <button type="button" className="pill-btn" onClick={() => setLines([])}>
                {t('lesson.clearConsole')}
              </button>
            </div>
            <div className="console-output" role="log" aria-live="polite">
              {lines.length === 0 ? (
                <div className="console-line">{t('lesson.consoleEmpty')}</div>
              ) : (
                lines.map((line, index) => (
                  <div key={`${index}-${line.text}`} className={`console-line ${line.type}`}>
                    {line.text}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
