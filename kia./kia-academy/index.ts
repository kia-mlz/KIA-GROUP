// @kia./kia-academy — KIA Academy department entry point.
// apps/api/src/app.module.ts imports these modules; nothing outside this
// package may import anything else from it (cross-department imports are
// lint-banned).
export { CoursesModule } from './courses/courses/courses.module';
export { CourseExamsModule } from './courses/course-exams/course-exams.module';
export { AssessmentsModule } from './learning-paths/assessments/assessments.module';
export { RoadmapsModule } from './learning-paths/roadmaps/roadmaps.module';
export { ReadinessModule } from './learning-paths/readiness/readiness.module';
export { TestBanksModule } from './learning-paths/test-banks/test-banks.module';
export { PersonalityModule } from './students/personality/personality.module';
export { ProgressModule } from './students/progress/progress.module';
