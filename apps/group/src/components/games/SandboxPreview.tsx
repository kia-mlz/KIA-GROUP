'use client';

function escapeScript(code: string) {
  return code.replace(/<\/script/gi, '<\\/script');
}

export function buildPreviewDocument(input: { html?: string; css?: string; js?: string; mode: 'page' | 'script' }) {
  const css = input.css ?? '';
  const js = escapeScript(input.js ?? '');
  const page = input.mode === 'page' ? (input.html ?? '').replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '') : '';
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'unsafe-inline';"><style>body{font:16px/1.6 sans-serif;margin:16px;color:#141c2e}pre{white-space:pre-wrap}</style><style>${css}</style></head><body>${page}<pre id="kia-log"></pre><script>
    const out = document.getElementById('kia-log');
    const lines = [];
    const write = (line) => { lines.push(String(line)); if (out) out.textContent = lines.join('\\n'); };
    console.log = (...args) => write(args.map((item) => String(item)).join(' '));
    window.onerror = (message) => { write(message); return true; };
    try { ${input.mode === 'script' ? js : ''} } catch (error) { write(error && error.message ? error.message : error); }
  </script></body></html>`;
}

export function SandboxPreview({
  html,
  css,
  js,
  mode,
}: {
  html?: string;
  css?: string;
  js?: string;
  mode: 'page' | 'script';
}) {
  return (
    <iframe
      className="eg-frame"
      title="preview"
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      srcDoc={buildPreviewDocument({ html, css, js, mode })}
    />
  );
}
