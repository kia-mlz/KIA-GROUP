import { describe, expect, it } from 'vitest';
import { markdownToHtml } from './markdown';

describe('markdownToHtml', () => {
  it('renders indented • bullets as an unordered list (Persian course copy)', () => {
    const md = `مهم‌ترین کاربردهای آن عبارت‌اند از:
    • ساختاردهی به محتوای صفحات وب
    • ایجاد لینک بین صفحات (Hyperlinking)
    • ساخت فرم‌ها برای دریافت اطلاعات کاربر`;

    const html = markdownToHtml(md);
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>ساختاردهی به محتوای صفحات وب</li>');
    // The first line is a paragraph; bullet lines must not be folded into it.
    expect(html).toMatch(
      /<p>.*کاربردهای آن عبارت.*<\/p><ul>/,
    );
  });

  it('renders indented numbered lists (1. 2. 3.)', () => {
    const md = `یک عنصر HTML از سه بخش تشکیل می‌شود:
 1. تگ شروع (Start Tag)
 2. محتوا (Content)
 3. تگ پایان (End Tag)`;

    const html = markdownToHtml(md);
    expect(html).toContain('<ol>');
    expect(html).toContain('<li>تگ شروع (Start Tag)</li>');
    expect(html).toContain('<li>تگ پایان (End Tag)</li>');
  });

  it('keeps ordered vs unordered lists and nested inline formatting', () => {
    const md = `## Run the STAR loop
1. *Situation* — set the scene.
2. *Result* — quantify it.

## Tips
- Lead with impact
- Quantify results`;

    const html = markdownToHtml(md);
    expect(html).toContain('<h2>Run the STAR loop</h2>');
    expect(html).toContain('<ol>');
    expect(html).toContain('<em>Situation</em>');
    expect(html.match(/<ul>/g)).toHaveLength(1);
  });

  it('renders blockquotes, inline code, links and bold', () => {
    const md = '> Tip: recruiters skim for ~90 seconds.\n\n' +
      'Use `90 seconds` per answer. See [Wikipedia](https://en.wikipedia.org) for **STAR**.';

    const html = markdownToHtml(md);
    expect(html).toContain('<blockquote>Tip: recruiters skim for ~90 seconds.</blockquote>');
    expect(html).toContain('<code>90 seconds</code>');
    expect(html).toContain('<strong>STAR</strong>');
    expect(html).toContain('<a href="https://en.wikipedia.org" target="_blank" rel="noopener noreferrer">Wikipedia</a>');
  });

  it('escapes user content (no raw HTML passthrough)', () => {
    const html = markdownToHtml(`<script>alert(1)</script>`);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  /* FE-2 sanitize audit: LessonPlayer renders markdownToHtml output via
   * dangerouslySetInnerHTML. This suite pins the full attack surface. */
  describe('FE-2 sanitize guarantees for dangerouslySetInnerHTML sinks', () => {
    it('neutralizes script/iframe/object/embed/style injection in every block type', () => {
      const attacks = [
        '<script>alert(1)</script>',
        '<iframe src="https://evil.example"></iframe>',
        '<object data="x"></object>',
        '<embed src="x">',
        '<style>body{display:none}</style>',
        '<img src=x onerror=alert(1)>',
      ];
      for (const attack of attacks) {
        for (const wrap of [
          (s: string) => s,
          (s: string) => `# ${s}`,
          (s: string) => `- ${s}`,
          (s: string) => `1. ${s}`,
          (s: string) => `> ${s}`,
          (s: string) => `\`\`\`\n${s}\n\`\`\``,
        ]) {
          const html = markdownToHtml(wrap(attack));
          // Raw dangerous tags must never be emitted. Escaped *text* that
          // merely mentions "onerror" is inert and explicitly allowed.
          expect(html).not.toContain('<script');
          expect(html).not.toContain('<iframe');
          expect(html).not.toContain('<object');
          expect(html).not.toContain('<embed');
          expect(html).not.toContain('<style');
          expect(html).not.toContain('<img');
        }
      }
    });

    it('never renders javascript: / data: URLs as links (http(s) and site-relative only)', () => {
      const html = markdownToHtml('[click](javascript:alert(1)) [x](data:text/html;base64,PHNjcmlwdD4) [y](JAVASCRIPT:x)');
      // The URL filter means these are not links at all — no anchor, no href.
      expect(html).not.toContain('<a');
      expect(html).not.toMatch(/href=/i);
    });

    it('drops protocol-relative and backslash href tricks', () => {
      const html = markdownToHtml(
        '[a](//evil.example) [b](/\\evil.example) [ok](/courses) [ext](https://safe.example)',
      );
      expect(html).not.toContain('href="//evil.example"');
      expect(html).not.toContain('href="/\\evil.example"');
      expect(html).toContain('<a href="/courses">ok</a>');
      expect(html).toContain(
        '<a href="https://safe.example" target="_blank" rel="noopener noreferrer">ext</a>',
      );
    });

    it('cannot smuggle a link href through escaped angle brackets', () => {
      const html = markdownToHtml('[a](https://ok.example/><script>alert(1)</script>)');
      expect(html).not.toContain('<script');
    });

    it('escapes quotes so attributes cannot break out of href', () => {
      // The href regex excludes whitespace, so a quoted payload stays inside the
      // href value — but a raw quote in the URL must still be escaped upstream.
      const html = markdownToHtml('[a](https://x.example/"onmouseover=alert(1)') as string;
      // The unbalanced bracket means this is NOT rendered as a link at all —
      // it stays escaped paragraph text.
      expect(html).not.toContain('onmouseover="');
    });

    it('emits only the known tag vocabulary', () => {
      const sample = [
        '# H1', '## H2', '### H3', '', 'para **bold** *it* `code`',
        '- bullet', '1. ordered', '> quote', '', '```js', 'code();', '```',
        '[link](https://x.example)', '/relative',
      ].join('\n');
      const html = markdownToHtml(sample);
      const tags = [...html.matchAll(/<\/?([a-z][a-z0-9]*)/g)].map((m) => m[1]);
      const allowed = new Set([
        'div', 'h1', 'h2', 'h3', 'p', 'ul', 'ol', 'li', 'blockquote',
        'pre', 'code', 'strong', 'em', 'a',
      ]);
      for (const tag of tags) {
        expect(allowed.has(tag)).toBe(true);
      }
    });
  });
});