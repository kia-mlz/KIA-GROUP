# Admin restructuring — department-owned management

## Classification (audited against the real codebase)

Every admin feature falls into one area. UI lives under its department panel;
global APIs stay untouched (HTTP routes keep their paths — no backend changes).

### Global (main admin panel keeps)
| Capability | Route | Why global |
| --- | --- | --- |
| Platform overview | `/admin` | Cross-department stats |
| Departments hub | `/admin/departments` | Entry point to all six panels |
| Users & access | `/admin/users`, `/users/create`, `/users/roles` | Identity is platform-wide |
| Finance | `/admin/finance`, `/payments`, `/orders`, `/entitlements`, `/wallets` | Money is platform-wide |
| Analytics | `/admin/analytics` | Cross-department reports |
| Support | `/admin/tickets`, `/admin/messages`, ticket detail | Support isn't a department |
| Audit | `/admin/audit` | System activity |
| Settings & security | `/admin/settings`, `/admin/security`, `/admin/contact` | Platform configuration |

### Academy (`/admin/academy/*`)
- Dashboard `/admin/academy` (courses/lessons/enrollments from real adminStats)
- Courses `/admin/academy/courses`, `_new_`, `_[slug]/edit_`
- Tests `/admin/academy/tests` (banks editor)

### Events (`/admin/events/*`)
- Dashboard `/admin/events` (competitions/registrations from real endpoints)
- Competitions `/admin/events/competitions`
- Challenges `/admin/events/challenges`

### Work / Material / Community / Labs (`/admin/{work,material,community,labs}`)
- Dashboard pages with the honest "no admin module yet" state (real
  `DEPARTMENT_MODULES` says these departments have no module yet). They offer
  the department's public page link.

## API routes unchanged
`/api/...` paths are untouched, so [api.ts](apps/group/src/lib/api.ts), backend
guards, and permission sections work identically. Only the Next.js UI routing
moves.
