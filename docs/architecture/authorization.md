# kia. — Authorization

## Model

Three layers, all server-enforced, all defined in `@kia./permissions`:

1. **Platform roles** — `LEARNER`, `ADMIN` (moderator), `SUPER_ADMIN`, plus
   dynamic custom roles backed by the `Role` table.
2. **Moderator access matrix** — per-section `view/manage/edit` flags
   (`AdminAccessSection`). Resolution is one function, `resolveStaffAdminAccess`:
   per-user override → custom-role matrix → site template. The backend **issues**
   the resolved matrix on `AuthUser.adminPanelAccess`; the admin UI consumes it
   verbatim and never re-derives it (ADM-1).
3. **Department role taxonomy** — `DEPARTMENT_ROLES` names the future
   department-scoped roles (Academy: `INSTRUCTOR`, `STUDENT`; Work: `EMPLOYER`,
   `FREELANCER`; Events: `ORGANIZER`, `JUDGE`; …). Membership persistence is a
   documented TODO until the departments land their domains.

## Enforcement chain (server-side)

```text
ThrottlerGuard (per-route limits) → JwtAuthGuard (identity + status)
  → RolesGuard (@Roles) → AdminAccessGuard (@AdminAccess section/level)
    → DTO validation → service-level ownership checks
```

- Object-level authorization (IDOR) was swept route-by-route (see
  `docs/AUDIT.md` ADM-2): every learner route scopes by `userId` or
  enrollment/entitlement; every admin mutation is audited (`AdminAuditLog`).
- `SUPER_ADMIN` bypasses the matrix; last-super protection prevents demoting
  the final super admin.
- No UI is trusted: hiding a button client-side is UX only — every route is
  guarded on the API.

## Where checks live

- Guards + decorators: `packages/platform/src/common/guards/`, `packages/platform/src/common/decorators/`.
- Matrix resolution: `@kia./permissions` (single home; `shared` re-exports).
- Admin UI consumption: `apps/group/src/components/admin/useAdminAccess.ts`.
