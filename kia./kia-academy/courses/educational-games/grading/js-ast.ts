import { parse, type Node } from 'acorn';

export type StructuralSpec = {
  mustDeclareFunctions?: string[];
  mustCall?: string[];
  forbid?: string[];
  mustMatch?: string[];
  mustNotMatch?: string[];
};

type AstNode = {
  type?: string;
  name?: string;
  id?: { name?: string };
  init?: { type?: string };
  callee?: {
    type?: string;
    name?: string;
    property?: { name?: string };
  };
  [key: string]: unknown;
};

const SKIP = new Set(['start', 'end', 'loc', 'range']);

function walk(node: unknown, visit: (node: AstNode) => void): void {
  if (!node || typeof node !== 'object') return;
  const current = node as AstNode;
  if (typeof current.type === 'string') visit(current);
  for (const [key, value] of Object.entries(current)) {
    if (SKIP.has(key)) continue;
    if (Array.isArray(value)) {
      for (const item of value) walk(item, visit);
    } else if (value && typeof value === 'object' && typeof (value as AstNode).type === 'string') {
      walk(value, visit);
    }
  }
}

function safeRegExp(source: string): RegExp | null {
  if (!source || source.length > 200) return null;
  try {
    return new RegExp(source, 'i');
  } catch {
    return null;
  }
}

export function checkSourcePatterns(code: string, spec: StructuralSpec): string[] {
  const reasons: string[] = [];
  for (const pattern of spec.mustMatch ?? []) {
    const re = safeRegExp(pattern);
    if (!re || !re.test(code)) reasons.push('pattern-miss');
  }
  for (const pattern of spec.mustNotMatch ?? []) {
    const re = safeRegExp(pattern);
    if (re && re.test(code)) reasons.push('pattern-forbidden');
  }
  for (const name of spec.forbid ?? []) {
    if (!name) continue;
    const ident = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (ident.test(code)) reasons.push(`forbidden:${name}`);
  }
  return reasons;
}

/**
 * Structural JavaScript checks via acorn. Never evaluates the program.
 */
export function checkJavaScript(code: string, spec: StructuralSpec): { ok: boolean; reasons: string[] } {
  if (code.length > 20_000) return { ok: false, reasons: ['code-too-long'] };
  let tree: Node;
  try {
    tree = parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
  } catch {
    try {
      tree = parse(code, { ecmaVersion: 'latest', sourceType: 'script' });
    } catch {
      return { ok: false, reasons: ['parse-error'] };
    }
  }

  const functions = new Set<string>();
  const calls = new Set<string>();
  walk(tree, (node) => {
    if (node.type === 'FunctionDeclaration' && node.id?.name) functions.add(node.id.name);
    if (node.type === 'VariableDeclarator') {
      const id = node.id?.name;
      const initType = node.init?.type;
      if (id && (initType === 'FunctionExpression' || initType === 'ArrowFunctionExpression')) {
        functions.add(id);
      }
    }
    if (node.type === 'CallExpression' && node.callee) {
      if (node.callee.type === 'Identifier' && node.callee.name) calls.add(node.callee.name);
      if (node.callee.type === 'MemberExpression' && node.callee.property?.name) {
        calls.add(node.callee.property.name);
      }
    }
  });

  const reasons = checkSourcePatterns(code, { ...spec, forbid: [] });
  for (const name of spec.mustDeclareFunctions ?? []) {
    if (!functions.has(name)) reasons.push(`missing-function:${name}`);
  }
  for (const name of spec.mustCall ?? []) {
    if (!calls.has(name)) reasons.push(`missing-call:${name}`);
  }
  for (const name of spec.forbid ?? []) {
    if (calls.has(name) || new RegExp(`\\b${name}\\b`).test(code)) reasons.push(`forbidden:${name}`);
  }
  return { ok: reasons.length === 0, reasons };
}

/**
 * Python is checked with declarations and patterns only.
 * Untrusted Python is never executed on the API process.
 */
export function checkPython(code: string, spec: StructuralSpec): { ok: boolean; reasons: string[] } {
  if (code.length > 20_000) return { ok: false, reasons: ['code-too-long'] };
  const reasons = checkSourcePatterns(code, spec);
  for (const name of spec.mustDeclareFunctions ?? []) {
    if (!new RegExp(`^\\s*def\\s+${name}\\s*\\(`, 'm').test(code)) {
      reasons.push(`missing-function:${name}`);
    }
  }
  return { ok: reasons.length === 0, reasons };
}
