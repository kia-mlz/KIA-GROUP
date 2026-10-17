/**
 * Department keys mirror `@kia./permissions` (`DEPARTMENT_KEYS`). The API
 * package does not depend on the permissions package (it consumes the shared
 * package), so the union is spelled here and `SearchModule` is the one place
 * to keep in sync when a department gains a search provider.
 */
export type SearchDepartment =
  | 'academy'
  | 'work'
  | 'material'
  | 'labs'
  | 'events'
  | 'community';

/**
 * One search result. `department` is part of the contract (spec §37): the UI
 * must always be able to show which department a hit came from.
 */
export interface SearchHit {
  department: SearchDepartment;
  /** Result kind within the department (course, competition, …). */
  type: string;
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  /** In-app destination path for the hit. */
  url: string;
}

/**
 * A department registers a provider to become searchable. Providers are owned
 * by their department module and registered in `SearchService` — the search
 * layer never imports department services, keeping the dependency rule
 * (departments → platform, never department → department).
 */
export interface SearchableProvider {
  readonly department: SearchDepartment;
  /** Machine-readable result type for this provider (e.g. `course`). */
  readonly type: string;
  /** Run one query. Implementations must cap results at `limit`. */
  search(query: string, limit: number): Promise<SearchHit[]>;
}
