# بازی‌های آموزشی تعاملی

Games live inside Kia Academy. They attach to the existing lesson; courses, chapters (optional), lessons, enrollments, and auth stay as they are. There is no separate app, database, or admin panel.

## Architecture

```
apps/group                         learner + existing admin UI
  lesson page  → LessonGames
  course page  → CourseGamesSummary
  /learn/.../play/[gameId] → GamePlay + activity registry
  /admin/academy/games     → «مدیریت بازی‌های آموزشی»

kia./kia-academy/courses/educational-games
  EducationalGamesService     progress, XP, access
  grading/grade.ts            strategy registry
  controllers                 learner + admin

packages/permissions            admin section `educationalGames`
packages/shared                 API contracts
apps/api/prisma                 additive models + migration
```

The play screen picks a React activity from `challengeConfig.ui` (falling back to the game type). Grading picks a strategy from `gradingConfig.strategy` (falling back to `GameStage.challengeType`). Adding a type means registering one activity and, if needed, one grader. The engine core (load, attempt, progress, XP, completion) does not change.

Chapters are optional. `Lesson.chapterId` is nullable, so existing lessons stay valid. The builder lists a chapter when one exists and otherwise lists the course lessons directly.

## Data model

| Model | Role |
| --- | --- |
| `Chapter` | Optional grouping of lessons inside a course |
| `EducationalGame` | One game on a lesson: type, difficulty, points, publish status, pass settings |
| `GameStage` | Ordered mission. `challengeConfig` is learner-facing. `gradingConfig` is server-only |
| `GameAttempt` | One submit: the learner's answer, safe feedback, score |
| `UserGameProgress` | Resume point, score, best score, `everCompleted` |
| `UserXpTransaction` | Idempotent XP. Unique on `(user, sourceType, sourceId, EARN)` |
| `Achievement` / `UserAchievement` | Rule-based badges |
| `LearnerGameStats` | XP, level, Tehran-day streak, games completed |

Level is `1 + floor(xp / 100)`.

## XP rules

- The first time a learner **passes** a stage, that stage's points are awarded once (`sourceType = GAME_STAGE`, `sourceId = stage id`).
- The first time the learner **finishes** the game, `EducationalGame.points` is awarded once (`GAME_COMPLETE`).
- Achievement XP is awarded once (`ACHIEVEMENT`).
- A replay (`restart`) clears the current run and can raise `bestScore`. It does **not** grant stage or game XP again, and it does not increment `gamesCompleted` (`everCompleted` stays true).
- Failed attempts store a row and grant 0 XP.
- `settings.hintPenalty` (default `0`) subtracts from the stage award: `max(0, stagePoints - hintsUsed * hintPenalty)`. The transaction is still written once, for that reduced amount.
- `settings.passScorePct` (default `100`) is the ratio required to pass partial strategies (matching, blanks, multi-choice).

## APIs

Learner routes require the JWT (`JwtAuthGuard`). Play, grade, hint, and restart are throttled.

| Method | Path |
| --- | --- |
| GET | `/api/academy/games/lessons/by-slug/:courseSlug/:lessonSlug` |
| GET | `/api/academy/games/courses/:slug/summary` |
| GET | `/api/academy/games/me/stats` |
| GET | `/api/academy/games/me/history` |
| GET | `/api/academy/games/leaderboard` |
| GET | `/api/academy/games/attempts/:attemptId` |
| GET | `/api/academy/games/:gameId` |
| GET | `/api/academy/games/:gameId/progress` |
| POST | `/api/academy/games/:gameId/start` |
| POST | `/api/academy/games/:gameId/resume` |
| POST | `/api/academy/games/:gameId/restart` |
| POST | `/api/academy/games/:gameId/stages/:stageId/submit` |
| POST | `/api/academy/games/:gameId/stages/:stageId/hint` |

Admin routes use the existing staff guards and the `educationalGames` section. `SUPER_ADMIN` always passes. A regular `ADMIN` needs the section granted in the access matrix (the default template leaves it off).

| Method | Path |
| --- | --- |
| GET | `/api/admin/academy/games/dashboard` |
| GET | `/api/admin/academy/games/catalog` |
| GET | `/api/admin/academy/games` |
| POST | `/api/admin/academy/games` |
| PATCH | `/api/admin/academy/games/reorder` |
| GET | `/api/admin/academy/games/:id` |
| PATCH | `/api/admin/academy/games/:id` |
| POST | `/api/admin/academy/games/:id/duplicate` |
| POST | `/api/admin/academy/games/:id/publish` |
| POST | `/api/admin/academy/games/:id/unpublish` |
| DELETE | `/api/admin/academy/games/:id` |
| GET | `/api/admin/academy/games/:id/results` |
| POST | `/api/admin/academy/chapters` |
| PATCH | `/api/admin/academy/lessons/:lessonId/chapter` |

Unpublished and archived games are omitted from learner queries (`404` on direct id). Attempts and progress are always filtered by the JWT user id.

Lesson access matches courses: the first three lessons are a free preview; later lessons require a course entitlement.

## Game types and grading

| Type | Learner UI (`ui`) | Strategy | What is checked |
| --- | --- | --- | --- |
| Quiz | `quiz` | `mcq` | Selected option ids |
| Drag & drop | `drag` | `drag_drop` | Slot → item map |
| Matching | `match` | `matching` | Left → right map |
| Fill in the blanks | `blanks` | `exact` | Accepted strings per blank |
| Output prediction | `output` | `output` | Normalized expected text. The snippet is not executed |
| Code builder | `blocks` | `exact` | Block id order |
| Bug hunter | `bug` | `pattern` | `mustMatch` / `mustNotMatch` on the submitted source |
| Code editor | `code` | `test_cases` | See below |
| Code adventure | per stage | per stage | A sequence of any strategies |
| Website builder / final project | `website` | `dom` or `html` | Structural tag, text, and attribute checks |
| Simulation | `sim` | `exact` | Step → choice map |
| Manual | any | `manual` | Stays pending. Score stays 0 until a human review exists |

`html` checks required and forbidden tags and rejects `<script>`, inline handlers, and `javascript:` URLs unless `allowScripts` is set.

`test_cases` / `unit`:

- **JavaScript** is parsed with `acorn` (no `eval`, no `vm`). The grader looks for declared functions, calls, forbidden names, and source patterns.
- **Python** is checked with `def` shape and the same patterns. **Python is not executed.** A config that only lists input/output `cases` and has no structural checks fails closed with a message that an isolated worker is required.

### Production code execution

Do not run learner code on the API process. The supported production path for real input/output tests is a separate sandbox worker (container or microVM, no network, CPU/memory/time limits, discarded filesystem) that returns stdout. The API would send the source and the cases to that worker and trust only its result. This repository does not start that worker.

The browser preview is a different path: HTML/CSS/JS run only inside an iframe with `sandbox="allow-scripts"` (no `allow-same-origin`), `referrerpolicy="no-referrer"`, and a CSP of `default-src 'none'`. The iframe cannot read parent cookies or the parent DOM. Python has no in-browser run button.

## Admin

Academy nav entry: **مدیریت بازی‌های آموزشی** (`/admin/academy/games`).

The builder walks course → chapter → lesson → type → title → stages (mission, hints, points, time limit, expected answer) → save draft → publish. Deleting a game that already has attempts archives it instead of removing history.

Time limits are shown to the learner and stored on the stage. They are advisory: a late answer is still graded. Turning the limit into a hard fail needs a per-stage start timestamp and an explicit product rule; it is not enabled by default.

## How to add a game type

1. Add the enum value in `EducationalGameType` (migration) and in `EDUCATIONAL_GAME_TYPES` (`packages/shared`).
2. If the score rule is new, add a `case` in `grading/grade.ts` and a name in `GRADING_STRATEGIES`.
3. Add an activity in `apps/group/src/components/games/Activities.tsx` and a `ui` string.
4. Map the type in `uiForType` and in the admin compiler (`stage-form.ts`).
5. Seed or create one stage whose `challengeConfig.ui` and `gradingConfig.strategy` point at the new pieces.

No change to start/submit/XP is required.

## Production settings

- Migration: `pnpm db:migrate:deploy` (additive only).
- `educationalGames` in the admin access template defaults to off. Grant view/edit/manage per moderator under Admin → Users, or change the template under Settings → Admin access (super admin).
- Rate limits: submit 20/min, hint 30/min, start/resume 20/min, restart 10/min, on top of the global throttle.
- Answer bodies are capped at 40 KB. JavaScript/Python sources over 20 KB are rejected by the grader. Admin regexes are capped at 200 characters.
- Keep `gradingConfig` out of any new learner serializer. `sanitizeChallenge` drops known answer keys if they were saved on the learner config by mistake.
- XP uniqueness depends on the database constraint. Do not award XP from the client.

## Known limitations

- Python and JavaScript are not executed for input/output cases. JavaScript is structural (AST). Python is structural only. Real test-case execution needs the sandbox worker described above.
- DOM checks are structural (tags, attributes, inner text). They do not run a browser on the server.
- Stage time limits do not fail a submission.
- Manual stages never auto-pass; there is no separate reviewer inbox yet (the flag is stored and the score stays 0).
- Replays do not grant XP. They may update `bestScore` when the new run scores higher.
- The default moderator template does not include game management until a super admin grants `educationalGames`.
