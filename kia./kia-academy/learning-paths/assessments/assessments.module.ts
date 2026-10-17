import { Module } from '@nestjs/common';
import { ProfileCompleteGuard } from '@kia./platform';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';

@Module({
  controllers: [AssessmentsController],
  providers: [AssessmentsService, ProfileCompleteGuard],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
