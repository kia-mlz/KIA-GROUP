export type DomCheck = {
  tag: string;
  min?: number;
  textIncludes?: string;
  attr?: Record<string, string>;
};

const TAG_NAME = /^[a-z][a-z0-9]*$/i;

export function safeTag(tag: string): string | null {
  const name = tag.trim().toLowerCase();
  return TAG_NAME.test(name) ? name : null;
}

export function tagCount(html: string, tag: string): number {
  const name = safeTag(tag);
  if (!name) return 0;
  const re = new RegExp(`<\\s*${name}\\b`, 'gi');
  return html.match(re)?.length ?? 0;
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([:@a-zA-Z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(raw))) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attrs;
}

export function openingTags(html: string, tag: string): Array<{ attrs: Record<string, string> }> {
  const name = safeTag(tag);
  if (!name) return [];
  const re = new RegExp(`<\\s*${name}\\b([^>]*)>`, 'gi');
  const found: Array<{ attrs: Record<string, string> }> = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    found.push({ attrs: parseAttrs(match[1] ?? '') });
  }
  return found;
}

export function innerTexts(html: string, tag: string): string[] {
  const name = safeTag(tag);
  if (!name) return [];
  const re = new RegExp(`<\\s*${name}\\b[^>]*>([\\s\\S]*?)<\\s*/\\s*${name}\\s*>`, 'gi');
  const texts: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    texts.push(
      (match[1] ?? '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase(),
    );
  }
  return texts;
}

export function hasActiveContent(html: string): boolean {
  return /<\s*script\b/i.test(html) || /\son[a-z]+\s*=/i.test(html) || /javascript\s*:/i.test(html);
}

export function runDomChecks(html: string, checks: DomCheck[]): string[] {
  const reasons: string[] = [];
  for (const check of checks) {
    const tag = safeTag(check.tag);
    if (!tag) {
      reasons.push('invalid-check');
      continue;
    }
    const min = check.min ?? 1;
    if (tagCount(html, tag) < min) {
      reasons.push(`missing-tag:${tag}`);
      continue;
    }
    if (check.textIncludes) {
      const needle = check.textIncludes.trim().toLowerCase();
      const texts = innerTexts(html, tag);
      if (!texts.some((text) => text.includes(needle))) {
        reasons.push(`missing-text:${tag}`);
      }
    }
    if (check.attr) {
      const openings = openingTags(html, tag);
      const ok = openings.some((opening) =>
        Object.entries(check.attr ?? {}).every(
          ([key, value]) => (opening.attrs[key.toLowerCase()] ?? '') === String(value),
        ),
      );
      if (!ok) reasons.push(`missing-attr:${tag}`);
    }
  }
  return reasons;
}
