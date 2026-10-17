// @kia./kia-event — KIA Event department entry point.
// apps/api/src/app.module.ts imports these modules; nothing outside this
// package may import anything else from it (cross-department imports are
// lint-banned).
export { CompetitionsModule } from './competitions/competitions/competitions.module';
export { ChallengesModule } from './competitions/challenges/challenges.module';
export { BootcampModule } from './bootcamps/bootcamp/bootcamp.module';
