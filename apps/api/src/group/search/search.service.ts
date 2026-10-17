import { Injectable } from '@nestjs/common';

import { CompetitionsSearchProvider } from './competitions-search.provider';
import { CoursesSearchProvider } from './courses-search.provider';
import type { SearchHit, SearchableProvider } from './search.types';

/** Hard cap per provider per query — protects the DB from unbounded takes. */
export const MAX_HITS_PER_PROVIDER = 10;

/**
 * kia. global search (spec §37).
 *
 * Departments register `SearchableProvider`s; the platform fans a query out to
 * every provider in parallel and tags each hit with its source department.
 * Department modules stay isolated: registering a provider is the only thing a
 * department does to become searchable, and the search layer depends on the
 * interface — never on department services.
 */
@Injectable()
export class SearchService {
  private readonly providers: SearchableProvider[] = [];

  constructor(
    courses: CoursesSearchProvider,
    competitions: CompetitionsSearchProvider,
  ) {
    this.register(courses);
    this.register(competitions);
  }

  /** Register a department provider (idempotent per department+type). */
  register(provider: SearchableProvider): void {
    const exists = this.providers.some(
      (p) => p.department === provider.department && p.type === provider.type,
    );
    if (!exists) this.providers.push(provider);
  }

  /** Query every registered provider in parallel; never throws per-provider. */
  async search(query: string, limit = MAX_HITS_PER_PROVIDER): Promise<SearchHit[]> {
    const q = query.trim();
    if (!q) return [];
    const capped = Math.max(1, Math.min(MAX_HITS_PER_PROVIDER, limit));
    const settled = await Promise.allSettled(
      this.providers.map((provider) => provider.search(q, capped)),
    );
    return settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  }
}
