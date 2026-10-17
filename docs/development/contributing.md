# kia. — Contributing

## Ground rules

1. **Keep the gates green.** `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
2. **Respect the dependency rule:** departments never import departments.
   Cross-department behaviour goes through shared contracts, the platform
   (search/events/commerce) or new domain events.
3. **Put code where it belongs.** New Academy logic → `kia./kia-academy/…`
   + the `(academy)` route group. Platform logic → `group/` + `(group)`.
4. **Brand values are not tunables.** Colours come from `@kia./brand`;
   the tests pin them. Change the package, not the stylesheet.
5. **No secrets, ever.** Only `*.example` env files are committed. gitleaks
   runs on every PR (full history).
6. **Migrations are append-only.** Never edit a shipped migration.
7. **Conventional Commits** (`feat:`, `fix:`, `docs:`, `refactor:`…).

## Adding a department feature

1. API: module folder under `apps/api/src/<department>/`, registered in
   `app.module.ts` under that department's banner comment.
2. Web: pages under the department's route group in
   `apps/group/src/app/(department)/`.
3. Make it searchable (optional): a `SearchableProvider` registered in
   `SearchService`.
4. Announce it (optional): a typed domain event in
   `common/events/domain-events.ts` + `publish` in the service.

## Adding an admin section

Add the section to `AdminAccessSection` + `normalizeAdminAccess` in
`@kia./permissions`, guard the routes with `@AdminAccess`, record audit
entries for every mutation, and issue the matrix — the UI consumes it verbatim.

## Reviews check

- Is the logic in the right domain folder?
- Is every external input validated server-side?
- Is every admin mutation audited?
- Are new colours/tokens coming from `@kia./brand`?
- Do new cross-department reads go through the platform or events?
