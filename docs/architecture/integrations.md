# kia. — Cross-Department Integrations

Departments cooperate without importing each other. Three sanctioned channels:

## 1. Shared contracts (`@kia./shared`)

Types, banks, grading and validators used by both apps. Contracts are the
stable vocabulary — a department may read another department's *contract*, but
never its database tables or services.

## 2. Domain events (`packages/platform/src/common/events`)

Typed in-process bus. Publishing never blocks the emitting flow; consumers are
idempotent; payloads carry IDs, never secrets.

| Event | Published by | Meaning |
| --- | --- | --- |
| `group.user.registered` | platform auth | a new identity exists |
| `group.user.profile_completed` | platform auth | first profile completion |
| `group.payment.completed` | commerce | payment complete + granted entitlement keys |
| `events.registration.created` | Events | learner registered for a competition |
| `academy.course.completed` | Academy | learner finished 100% of a course |

Today every event is observable through the structured log (built-in consumer).
The bus is the seam for the future notification center and for cross-department
reactions (e.g. `events.registration.created` → community activity) — consumers
subscribe without the Events module knowing about them.

## 3. Platform services

- **Global search** (`apps/api/src/group/search`): departments register
  `SearchableProvider`s; results always carry their `department`. Academy
  courses and Events competitions are registered; new departments add a
  provider in their own folder and register it in `SearchService`.
- **Entitlements & commerce:** `Entitlement.resourceType` is a vocabulary
  (`course`/`roadmap`/`readiness`), not an FK — fulfilment writes platform rows
  without touching Academy models, and Academy checks entitlements by key.
- **Identity:** one `User` row; every department table keys users by
  `User.id`.

## Planned (spec §12, not yet built)

| Channel | Status |
| --- | --- |
| Academy skills → Work profile | TODO when Work domain lands |
| Course → Event promotion | TODO (event link on course) |
| Material resource → Lesson attachment | TODO (Material catalog + `CourseAttachment` extension) |
| Event → Community activity | TODO (consume `events.registration.created`) |
| Labs research → Academy article | TODO |
