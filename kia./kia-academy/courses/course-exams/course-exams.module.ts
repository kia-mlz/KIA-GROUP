import { Module } from '@nestjs/common';
import { AdminAccessGuard } from '@kia./platform';
import { RolesGuard } from '@kia./platform';
import { SiteSettingsModule } from '@kia./platform';
import { AdminCourseExamsController } from './admin-course-exams.controller';
import { CourseExamsController } from './course-exams.controller';
import { CourseExamsService } from './course-exams.service';

@Module({
  imports: [SiteSettingsModule],
  controllers: [CourseExamsController, AdminCourseExamsController],
  providers: [CourseExamsService, RolesGuard, AdminAccessGuard],
  exports: [CourseExamsService],
})
export class CourseExamsModule {}

