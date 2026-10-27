import { redirect } from 'next/navigation';

/**
 * Department-rooted academy panel URL. The live Academy learner panel still
 * lives at `/dashboard` (bookmarks + post-login flows); this alias keeps the
 * `/academy/…` tree consistent with the other department panels.
 */
export default function AcademyPanelAliasPage(): never {
  redirect('/dashboard');
}
