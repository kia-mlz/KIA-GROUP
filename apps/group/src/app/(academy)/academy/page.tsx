import { redirect } from 'next/navigation';

/**
 * Kia Academy department alias (spec routing: `/academy`).
 *
 * The Academy entry experience lives at `/education` (phone-first OTP flow).
 * This alias keeps the department-rooted URL from the architecture spec
 * working — same for `/work` → `/freelance` — without duplicating the page.
 * A permanent redirect keeps one canonical URL in search indexes.
 */
export default function AcademyAliasPage(): never {
  redirect('/education');
}
