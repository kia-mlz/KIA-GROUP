import { permanentRedirect } from 'next/navigation';

/**
 * Kia Work department alias (spec routing: `/work`).
 *
 * The Work department entry lives at `/freelance`; this alias keeps the
 * department-rooted URL from the architecture spec working without
 * duplicating the page. A permanent (308) redirect keeps one canonical URL.
 */
export default function WorkAliasPage(): never {
  permanentRedirect('/freelance');
}
