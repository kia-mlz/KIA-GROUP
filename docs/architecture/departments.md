# kia. — Departments

Six departments, one platform identity. The canonical vocabulary (slugs, roles,
colours) lives in `@kia./brand` (colours) and `@kia./permissions`
(role taxonomy).

| Department | Colour | API domain | Web routes | Status |
| --- | --- | --- | --- | --- |
| **KIA Academy** | `#6464FF` | `kia./kia-academy/` | `/education`, `/assessment`, `/readiness`, `/roadmap`, `/tracks`, `/courses`, `/learn`, `/bootcamp` (alias `/academy`) | Live — the learner journey end-to-end |
| **KIA Work** | `#6492FF` | — (future `apps/api/src/work/`) | `/freelance` (alias `/work`) | Route + hub presence; domain module TODO |
| **KIA Material** | `#148165` | — | `/material` (Material Studio feature) | Live front-end studio (client-side); backend domain TODO |
| **KIA Labs** | `#28C793` | — | `/labs` | Coming-soon page + hub |
| **KIA Events** | `#E32B1B` | `kia./kia-event/` | `/events` | Live — competitions & challenges |
| **KIA Community** | `#FF7344` | — | `/community` | Coming-soon page + hub |

## Department isolation

- Each department's business logic lives in exactly one API domain folder and
  (on the web) one route group. There is no shared "everything" folder.
- Departments never import each other's services. Cross-department behaviour
  goes through:
  1. **shared contracts** (`@kia./shared` types/banks/grading),
  2. **the platform** (search, notifications, identity, commerce),
  3. **domain events** (`group.user.registered`, `group.payment.completed`,
     `events.registration.created`, `academy.course.completed` — see
     `packages/platform/src/common/events/domain-events.ts`).
- Every department carries its own identity colour as a scoped CSS token
  (`--dept-academy`, `--dept-work`, …) defined once in `packages/brand` and
  cross-checked by tests on both sides (`packages/brand/src/tokens.test.ts`,
  `apps/group/src/components/brand/departmentColors.test.ts`).

## Planned department modules (genuine TODOs)

| Department | What is missing | What is needed |
| --- | --- | --- |
| Work | Jobs/projects/applications domain | Prisma models (`Job`, `Project`, `Application`), `apps/api/src/work/*`, `/freelance` API wiring |
| Material | Resource catalog + downloads | `Resource`/`Collection` models, storage integration on top of the existing signed-media service |
| Labs | Research/articles/projects | `Research`, `Article`, `Experiment` models + publishing flow |
| Community | Posts/discussions/moderation | `Post`, `Comment`, `Group` models with the platform moderation + audit services |
