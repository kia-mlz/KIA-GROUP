import { Module } from '@nestjs/common';

import { CompetitionsSearchProvider } from './competitions-search.provider';
import { CoursesSearchProvider } from './courses-search.provider';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

/**
 * kia. global search module (platform layer). Department modules stay
 * out of this file: providers live in the platform because they only read
 * through Prisma — the dependency direction remains departments → platform.
 */
@Module({
  controllers: [SearchController],
  providers: [SearchService, CoursesSearchProvider, CompetitionsSearchProvider],
  exports: [SearchService],
})
export class SearchModule {}
