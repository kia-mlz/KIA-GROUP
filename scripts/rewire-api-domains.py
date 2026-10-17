#!/usr/bin/env python3
"""One-shot codemod: rewrite relative imports in apps/api/src after moving
module folders into their kia. domains (group/academy/events).

Semantics: file bodies still contain imports that were correct for the OLD
layout (src/<module>/...). We know each file's OLD path from the move table,
resolve each '../' specifier against the OLD directory, remap the resolved
target through the old->new table, and emit a relative specifier that is
correct for the NEW location. Same-directory ('./') imports are untouched.
"""

import os
import re
import sys

SRC = "apps/api/src"

# old module dir (relative to src) -> new module dir
MOVES = {
    "auth": "group/auth",
    "admin": "group/admin",
    "site-settings": "group/site-settings",
    "media": "group/media",
    "email": "group/email",
    "sms": "group/sms",
    "contact": "group/contact",
    "health": "group/health",
    "tickets": "group/support/tickets",
    "messages": "group/support/messages",
    "todos": "group/support/todos",
    "cart": "group/commerce/cart",
    "payments": "group/commerce/payments",
    "stripe": "group/commerce/stripe",
    "assessments": "academy/assessments",
    "courses": "academy/courses",
    "course-exams": "academy/course-exams",
    "progress": "academy/progress",
    "readiness": "academy/readiness",
    "roadmaps": "academy/roadmaps",
    "test-banks": "academy/test-banks",
    "bootcamp": "academy/bootcamp",
    "personality": "academy/personality",
    "competitions": "events/competitions",
    "challenges": "events/challenges",
}

SPEC_RE = re.compile(r"(from\s+|import\(\s*|require\(\s*)['\"](\.\./[^'\"]+)['\"]")

# Reverse map: new module dir (relative to src) -> old module dir.
NEW_TO_OLD = {new: old for old, new in MOVES.items()}


def old_path_of(new_rel):
    """Reconstruct the file's path in the OLD layout from its NEW path."""
    norm = new_rel.replace(os.sep, "/")
    for new_mod, old_mod in NEW_TO_OLD.items():
        if norm == new_mod or norm.startswith(new_mod + "/"):
            return (old_mod + norm[len(new_mod):]).replace("/", os.sep)
    return new_rel  # not moved (common, config, prisma, generated, root files)


def map_target(old_target):
    """Map a resolved OLD-layout target (no extension) to the NEW layout."""
    norm = old_target.replace(os.sep, "/")
    for old_mod, new_mod in MOVES.items():
        if norm == old_mod or norm.startswith(old_mod + "/"):
            return (new_mod + norm[len(old_mod):]).replace("/", os.sep)
    return old_target  # common, config, prisma, generated, dto-inside-module etc.


def resolve_no_ext(base_dir, spec):
    """Resolve a relative specifier against base_dir, extensionless-tolerant."""
    target = os.path.normpath(os.path.join(base_dir, spec))
    candidates = [target]
    if not target.endswith(".ts"):
        candidates.append(target + ".ts")
        candidates.append(os.path.join(target, "index.ts"))
    for c in candidates:
        if os.path.isfile(os.path.join(SRC, c)):
            return target, True
    return target, os.path.isdir(os.path.join(SRC, target))


def rel_spec(from_dir, to_dir):
    rel = os.path.relpath(to_dir, from_dir)
    if not rel.startswith("."):
        rel = "./" + rel
    return rel.replace(os.sep, "/")


changed_files = 0
changed_imports = 0

for root, _dirs, files in os.walk(SRC):
    if os.sep + "generated" in root:
        continue
    for name in files:
        if not name.endswith(".ts") or name.endswith(".d.ts"):
            continue
        path = os.path.join(root, name)
        new_rel = os.path.relpath(path, SRC)
        old_rel = old_path_of(new_rel)
        old_dir = os.path.dirname(old_rel)
        new_dir = os.path.dirname(new_rel)
        with open(path, "r", encoding="utf8") as fh:
            text = fh.read()

        def fix(m):
            global changed_imports
            spec = m.group(2)
            resolved, _ok = resolve_no_ext(old_dir, spec)
            new_target = map_target(resolved)
            new_spec = rel_spec(new_dir, new_target)
            if new_spec != spec:
                changed_imports += 1
            return f"{m.group(1)}'{new_spec}'"

        new_text = SPEC_RE.sub(fix, text)
        if new_text != text:
            changed_files += 1
            with open(path, "w", encoding="utf8") as fh:
                fh.write(new_text)

print(f"rewrote {changed_imports} imports across {changed_files} files")
sys.exit(0)
