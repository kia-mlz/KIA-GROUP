import { hasActiveContent, runDomChecks, tagCount, type DomCheck } from './html-check';
import { checkJavaScript, checkPython, checkSourcePatterns, type StructuralSpec } from './js-ast';

export type GradeCode = 'correct' | 'incorrect' | 'partial' | 'pending' | 'invalid';

export type GradeOutcome = {
  passed: boolean;
  ratio: number;
  points: number;
  code: GradeCode;
  feedback: string;
  pendingManual: boolean;
};

const FEEDBACK: Record<GradeCode, string> = {
  correct: 'درست است.',
  incorrect: 'پاسخ درست نیست. می‌توانی راهنمایی بگیری یا دوباره تلاش کنی.',
  partial: 'بخشی از پاسخ درست است.',
  pending: 'این مرحله برای بررسی انسانی علامت‌گذاری شد و امتیاز خودکار ندارد.',
  invalid: 'پاسخ قابل بررسی نیست.',
};

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeText(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim().toLowerCase();
}

function stringsOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (value === undefined || value === null) return [];
  return [String(value)];
}

function answerRecord(answer: unknown): Record<string, unknown> {
  if (typeof answer === 'string' || typeof answer === 'number' || typeof answer === 'boolean') {
    return { value: String(answer) };
  }
  return asRecord(answer);
}

function codeOf(answer: unknown): string {
  const record = answerRecord(answer);
  const code = record.code ?? record.value ?? record.html ?? '';
  return typeof code === 'string' ? code : '';
}

function ratioOutcome(ratio: number, stagePoints: number, passScorePct: number): GradeOutcome {
  const clamped = Math.max(0, Math.min(1, ratio));
  const passed = clamped * 100 >= passScorePct - 0.001;
  const code: GradeCode = clamped >= 0.999 ? 'correct' : passed ? 'partial' : 'incorrect';
  const feedback =
    code === 'correct' ? FEEDBACK.correct : code === 'partial' ? FEEDBACK.partial : FEEDBACK.incorrect;
  return {
    passed,
    ratio: clamped,
    points: Math.round(stagePoints * clamped),
    code,
    feedback,
    pendingManual: false,
  };
}

function binary(ok: boolean, stagePoints: number): GradeOutcome {
  return ratioOutcome(ok ? 1 : 0, stagePoints, 100);
}

function feedbackForReasons(reasons: string[]): string {
  if (reasons.includes('parse-error')) return 'کد از نظر ساختاری معتبر نیست.';
  if (reasons.includes('code-too-long')) return 'کد از حد مجاز طولانی‌تر است.';
  if (reasons.includes('sandbox-required')) {
    return 'این آزمون به اجرای ایزوله نیاز دارد و روی سرور اصلی اجرا نمی‌شود.';
  }
  const missingFn = reasons.find((reason) => reason.startsWith('missing-function:'));
  if (missingFn) return `تابع ${missingFn.slice('missing-function:'.length)} را تعریف کن.`;
  const missingCall = reasons.find((reason) => reason.startsWith('missing-call:'));
  if (missingCall) return `باید ${missingCall.slice('missing-call:'.length)} را صدا بزنی.`;
  const forbidden = reasons.find((reason) => reason.startsWith('forbidden:'));
  if (forbidden) return `استفاده از ${forbidden.slice('forbidden:'.length)} مجاز نیست.`;
  if (reasons.includes('pattern-forbidden')) return 'یک الگوی غیرمجاز در پاسخ هست.';
  if (reasons.includes('pattern-miss')) return 'بخش لازم در پاسخ دیده نشد.';
  if (reasons.some((reason) => reason.startsWith('missing-tag:'))) return 'ساختار صفحه هنوز کامل نیست.';
  if (reasons.includes('active-content')) return 'برچسب اسکریپت یا رویداد درون‌خطی در این مرحله مجاز نیست.';
  return FEEDBACK.incorrect;
}

function structuralSpec(config: Record<string, unknown>): StructuralSpec {
  const list = (key: string) =>
    Array.isArray(config[key]) ? (config[key] as unknown[]).map((item) => String(item)) : [];
  return {
    mustDeclareFunctions: list('mustDeclareFunctions'),
    mustCall: list('mustCall'),
    forbid: list('forbid'),
    mustMatch: list('mustMatch'),
    mustNotMatch: list('mustNotMatch'),
  };
}

function hasStructuralWork(spec: StructuralSpec): boolean {
  return (
    (spec.mustDeclareFunctions?.length ?? 0) +
      (spec.mustCall?.length ?? 0) +
      (spec.forbid?.length ?? 0) +
      (spec.mustMatch?.length ?? 0) +
      (spec.mustNotMatch?.length ?? 0) >
    0
  );
}

function gradeExact(config: Record<string, unknown>, answer: unknown, points: number, passScorePct: number): GradeOutcome {
  const submitted = answerRecord(answer);
  if (Array.isArray(config.order)) {
    const expected = config.order.map((item) => String(item));
    const got = Array.isArray(submitted.order) ? submitted.order.map((item) => String(item)) : [];
    return binary(expected.length === got.length && expected.every((item, index) => item === got[index]), points);
  }
  if (config.blanks && typeof config.blanks === 'object') {
    const expected = asRecord(config.blanks);
    const got = asRecord(submitted.blanks);
    const keys = Object.keys(expected);
    if (keys.length === 0) return binary(false, points);
    let correct = 0;
    for (const key of keys) {
      const alts = stringsOf(expected[key]).map(normalizeText);
      if (alts.includes(normalizeText(String(got[key] ?? '')))) correct += 1;
    }
    return ratioOutcome(correct / keys.length, points, passScorePct);
  }
  if (config.choices && typeof config.choices === 'object' && !Array.isArray(config.choices)) {
    const expected = asRecord(config.choices);
    const got = asRecord(submitted.choices);
    const keys = Object.keys(expected);
    if (keys.length === 0) return binary(false, points);
    let correct = 0;
    for (const key of keys) {
      if (String(got[key] ?? '') === String(expected[key] ?? '')) correct += 1;
    }
    return ratioOutcome(correct / keys.length, points, passScorePct);
  }
  const expectedValues = stringsOf(config.value ?? config.answer).map(normalizeText);
  const got = normalizeText(String(submitted.value ?? ''));
  return binary(expectedValues.includes(got), points);
}

function gradeMcq(config: Record<string, unknown>, answer: unknown, points: number, passScorePct: number): GradeOutcome {
  const expected = new Set(stringsOf(config.correctIds));
  const selected = new Set(stringsOf(answerRecord(answer).selected));
  if (expected.size === 0) return binary(false, points);
  let matched = 0;
  for (const id of expected) if (selected.has(id)) matched += 1;
  const extras = [...selected].filter((id) => !expected.has(id)).length;
  const ratio = Math.max(0, matched - extras) / expected.size;
  return ratioOutcome(ratio, points, passScorePct);
}

function gradeMap(
  expectedRaw: unknown,
  gotRaw: unknown,
  points: number,
  passScorePct: number,
): GradeOutcome {
  const expected = asRecord(expectedRaw);
  const got = asRecord(gotRaw);
  const keys = Object.keys(expected);
  if (keys.length === 0) return binary(false, points);
  let correct = 0;
  for (const key of keys) {
    if (String(got[key] ?? '') === String(expected[key] ?? '')) correct += 1;
  }
  return ratioOutcome(correct / keys.length, points, passScorePct);
}

function gradePattern(config: Record<string, unknown>, answer: unknown, points: number): GradeOutcome {
  const code = codeOf(answer);
  const reasons = checkSourcePatterns(code, structuralSpec(config));
  if (reasons.length) {
    return { ...binary(false, points), feedback: feedbackForReasons(reasons) };
  }
  return binary(true, points);
}

function gradeHtml(config: Record<string, unknown>, answer: unknown, points: number): GradeOutcome {
  const html = codeOf(answer);
  if (!config.allowScripts && hasActiveContent(html)) {
    return { ...binary(false, points), feedback: feedbackForReasons(['active-content']) };
  }
  const required = stringsOf(config.requiredTags);
  const forbidden = stringsOf(config.forbiddenTags);
  const reasons: string[] = [];
  for (const tag of required) {
    if (tagCount(html, tag) < 1) reasons.push(`missing-tag:${tag}`);
  }
  for (const tag of forbidden) {
    if (tagCount(html, tag) > 0) reasons.push('pattern-forbidden');
  }
  if (reasons.length) return { ...binary(false, points), feedback: feedbackForReasons(reasons) };
  return binary(required.length > 0 || forbidden.length > 0, points);
}

function gradeDom(config: Record<string, unknown>, answer: unknown, points: number): GradeOutcome {
  const html = codeOf(answer);
  if (!config.allowScripts && hasActiveContent(html)) {
    return { ...binary(false, points), feedback: feedbackForReasons(['active-content']) };
  }
  const checks = Array.isArray(config.checks) ? (config.checks as DomCheck[]) : [];
  const reasons = runDomChecks(html, checks);
  if (!checks.length) return binary(false, points);
  if (reasons.length) return { ...binary(false, points), feedback: feedbackForReasons(reasons) };
  return binary(true, points);
}

function gradeOutput(config: Record<string, unknown>, answer: unknown, points: number): GradeOutcome {
  const expected = stringsOf(config.expected ?? config.value).map(normalizeText);
  const got = normalizeText(String(answerRecord(answer).value ?? ''));
  return binary(expected.includes(got), points);
}

function gradeTestCases(config: Record<string, unknown>, answer: unknown, points: number): GradeOutcome {
  const code = codeOf(answer);
  const language = String(config.language ?? 'javascript').toLowerCase();
  const spec = structuralSpec(config);
  const cases = Array.isArray(config.cases) ? config.cases : [];
  if (!hasStructuralWork(spec)) {
    if (cases.length) {
      return {
        ...binary(false, points),
        code: 'invalid',
        feedback: feedbackForReasons(['sandbox-required']),
      };
    }
    return { ...binary(false, points), code: 'invalid', feedback: FEEDBACK.invalid };
  }
  const checked =
    language === 'python' || language === 'py' ? checkPython(code, spec) : checkJavaScript(code, spec);
  if (!checked.ok) return { ...binary(false, points), feedback: feedbackForReasons(checked.reasons) };
  return binary(true, points);
}

export function gradeSubmission(input: {
  challengeType: string;
  gradingConfig: unknown;
  answer: unknown;
  stagePoints: number;
  passScorePct: number;
}): GradeOutcome {
  const config = asRecord(input.gradingConfig);
  const strategy = String(config.strategy ?? input.challengeType ?? '').toLowerCase();
  const points = Math.max(0, input.stagePoints);
  const pass = input.passScorePct;
  switch (strategy) {
    case 'exact':
      return gradeExact(config, input.answer, points, pass);
    case 'mcq':
      return gradeMcq(config, input.answer, points, pass);
    case 'pattern':
      return gradePattern(config, input.answer, points);
    case 'html':
      return gradeHtml(config, input.answer, points);
    case 'dom':
      return gradeDom(config, input.answer, points);
    case 'output':
      return gradeOutput(config, input.answer, points);
    case 'unit':
    case 'test_cases':
      return gradeTestCases(config, input.answer, points);
    case 'drag_drop':
      return gradeMap(config.placements, answerRecord(input.answer).placements, points, pass);
    case 'matching':
      return gradeMap(config.pairs, answerRecord(input.answer).pairs, points, pass);
    case 'manual':
      return {
        passed: false,
        ratio: 0,
        points: 0,
        code: 'pending',
        feedback: FEEDBACK.pending,
        pendingManual: true,
      };
    default:
      return {
        passed: false,
        ratio: 0,
        points: 0,
        code: 'invalid',
        feedback: FEEDBACK.invalid,
        pendingManual: false,
      };
  }
}
