import { escapeHtml } from '@kia./shared';

/**
 * Mini-Markdown → HTML for lesson content.
 * Supported blocks: fenced code, #/##/### headings, `- `, `* ` and `• `
 * bullets, `1.` / `1)` ordered lists, `> ` blockquotes, paragraphs.
 * List markers may be indented with leading whitespace (Persian course copy
 * often indents `• ` / `1.` items), and bullets accept `•` / `◦` / `-` / `*`.
 * Inline: `code`, **bold**, *italic*, [text](url).
 * All input is escaped before any tag is emitted (no raw HTML passthrough).
 */
export function markdownToHtml(markdown: string): string {
  const lines = markdown.trim().split('\n');
  const blocks: string[] = [];
  let i = 0;

  const isBullet = (l: string) => /^[-*•◦▪+] /.test(l.trimStart());
  const isOrdered = (l: string) => /^\d+[.)] /.test(l.trimStart());
  const isBlockStarter = (l: string) =>
    !l.trim() ||
    l.startsWith('```') ||
    l.trimStart().startsWith('#') ||
    isBullet(l) ||
    isOrdered(l) ||
    l.trimStart().startsWith('> ');

  while (i < lines.length) {
    const line = lines[i]!;

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith('```')) {
        body.push(lines[i]!);
        i++;
      }
      i++; // closing fence (or EOF)
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      blocks.push(`<pre><code${cls}>${escapeHtml(body.join('\n'))}</code></pre>`);
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      blocks.push(`<h3>${inlineFormat(line.slice(4))}</h3>`);
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(`<h2>${inlineFormat(line.slice(3))}</h2>`);
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push(`<h1>${inlineFormat(line.slice(2))}</h1>`);
      i++;
      continue;
    }

    // Unordered list (- / * / •)
    if (isBullet(line)) {
      const items: string[] = [];
      while (i < lines.length && isBullet(lines[i]!)) {
        items.push(`<li>${inlineFormat(lines[i]!.trimStart().slice(2))}</li>`);
        i++;
      }
      blocks.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Ordered list (1. / 1))
    if (isOrdered(line)) {
      const items: string[] = [];
      while (i < lines.length && isOrdered(lines[i]!)) {
        items.push(`<li>${inlineFormat(lines[i]!.trimStart().replace(/^\d+[.)] /, ''))}</li>`);
        i++;
      }
      blocks.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // Blockquote (> )
    if (line.trimStart().startsWith('> ')) {
      const body: string[] = [];
      while (i < lines.length && lines[i]!.trimStart().startsWith('> ')) {
        body.push(lines[i]!.trimStart().slice(2));
        i++;
      }
      blocks.push(`<blockquote>${inlineFormat(body.join(' '))}</blockquote>`);
      continue;
    }

    // Paragraph — gather until the next block starter
    if (line.trim()) {
      const para: string[] = [];
      while (i < lines.length && !isBlockStarter(lines[i]!)) {
        para.push(lines[i]!);
        i++;
      }
      blocks.push(`<p>${inlineFormat(para.join(' '))}</p>`);
      continue;
    }

    i++; // blank line
  }

  return `<div class="lesson-md">${blocks.join('')}</div>`;
}

function inlineFormat(text: string): string {
  const escaped = escapeHtml(text);
  // Protect inline code spans from the other inline rules using a sentinel that
  // cannot appear in `escaped`: `<`/`>` from user input become `&lt;`/`&gt;`
  // during escaping, so a raw `<KIA>` token is a guaranteed-safe marker.
  const codeSpans: string[] = [];
  const withPlaceholders = escaped.replace(/`([^`]+)`/g, (_m, code: string) => {
    codeSpans.push(code);
    return `<KIA_CODE_${codeSpans.length - 1}>`;
  });

  const withBold = withPlaceholders.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const withItalic = withBold.replace(/\*(\S(?:[^*\n]*\S)?)\*/g, '<em>$1</em>');
  const withLinks = withItalic.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g,
    (_m, label: string, href: string) =>
      href.startsWith('http')
        ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`
        : `<a href="${href}">${label}</a>`,
  );

  return withLinks.replace(
    /<KIA_CODE_(\d+)>/g,
    (_m, idx: string) => `<code>${codeSpans[Number(idx)] ?? ''}</code>`,
  );
}
