-- Additive educational games attached to existing lessons.
-- Chapters are optional (Lesson.chapterId nullable) so current courses stay valid.

CREATE TYPE "EducationalGameType" AS ENUM (
  'CODE_BUILDER',
  'CODE_EDITOR',
  'BUG_HUNTER',
  'DRAG_DROP',
  'QUIZ',
  'WEBSITE_BUILDER',
  'CODE_ADVENTURE',
  'MATCHING',
  'FILL_BLANKS',
  'OUTPUT_PREDICTION',
  'SIMULATION',
  'FINAL_PROJECT'
);

CREATE TYPE "GameDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

CREATE TYPE "GamePublishStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TYPE "UserGameStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

CREATE TYPE "XpTransactionType" AS ENUM ('EARN', 'ADJUST');

CREATE TABLE "Chapter" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Lesson" ADD COLUMN "chapterId" TEXT;

CREATE TABLE "EducationalGame" (
  "id" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "learningGoal" TEXT NOT NULL DEFAULT '',
  "type" "EducationalGameType" NOT NULL,
  "difficulty" "GameDifficulty" NOT NULL DEFAULT 'BEGINNER',
  "estimatedMin" INTEGER NOT NULL DEFAULT 10,
  "points" INTEGER NOT NULL DEFAULT 50,
  "publishStatus" "GamePublishStatus" NOT NULL DEFAULT 'DRAFT',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "prerequisiteGameId" TEXT,
  "settings" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EducationalGame_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GameStage" (
  "id" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "mission" TEXT NOT NULL DEFAULT '',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "challengeType" TEXT NOT NULL,
  "challengeConfig" JSONB NOT NULL,
  "gradingConfig" JSONB NOT NULL,
  "hints" JSONB NOT NULL DEFAULT '[]',
  "points" INTEGER NOT NULL DEFAULT 10,
  "timeLimitSec" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GameStage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GameAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "stageId" TEXT NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "submittedAnswer" JSONB NOT NULL,
  "gradingResult" JSONB NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 0,
  "passed" BOOLEAN NOT NULL DEFAULT false,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "GameAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserGameProgress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "status" "UserGameStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "currentStageOrder" INTEGER NOT NULL DEFAULT 0,
  "completedStageIds" JSONB NOT NULL DEFAULT '[]',
  "score" INTEGER NOT NULL DEFAULT 0,
  "bestScore" INTEGER NOT NULL DEFAULT 0,
  "attemptsCount" INTEGER NOT NULL DEFAULT 0,
  "correctCount" INTEGER NOT NULL DEFAULT 0,
  "gradedCount" INTEGER NOT NULL DEFAULT 0,
  "timeSpentSec" INTEGER NOT NULL DEFAULT 0,
  "everCompleted" BOOLEAN NOT NULL DEFAULT false,
  "hintsByStage" JSONB NOT NULL DEFAULT '{}',
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserGameProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserXpTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "transactionType" "XpTransactionType" NOT NULL DEFAULT 'EARN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserXpTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Achievement" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "icon" TEXT NOT NULL DEFAULT 'award',
  "xp" INTEGER NOT NULL DEFAULT 0,
  "rule" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserAchievement" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "achievementId" TEXT NOT NULL,
  "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LearnerGameStats" (
  "userId" TEXT NOT NULL,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "level" INTEGER NOT NULL DEFAULT 1,
  "streakDays" INTEGER NOT NULL DEFAULT 0,
  "lastActiveKey" TEXT,
  "gamesCompleted" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearnerGameStats_pkey" PRIMARY KEY ("userId")
);

CREATE INDEX "Chapter_courseId_sortOrder_idx" ON "Chapter"("courseId", "sortOrder");
CREATE INDEX "Lesson_chapterId_idx" ON "Lesson"("chapterId");
CREATE UNIQUE INDEX "EducationalGame_lessonId_slug_key" ON "EducationalGame"("lessonId", "slug");
CREATE INDEX "EducationalGame_lessonId_sortOrder_idx" ON "EducationalGame"("lessonId", "sortOrder");
CREATE INDEX "EducationalGame_publishStatus_idx" ON "EducationalGame"("publishStatus");
CREATE INDEX "GameStage_gameId_sortOrder_idx" ON "GameStage"("gameId", "sortOrder");
CREATE INDEX "GameAttempt_userId_gameId_idx" ON "GameAttempt"("userId", "gameId");
CREATE INDEX "GameAttempt_stageId_idx" ON "GameAttempt"("stageId");
CREATE INDEX "GameAttempt_userId_stageId_idx" ON "GameAttempt"("userId", "stageId");
CREATE UNIQUE INDEX "UserGameProgress_userId_gameId_key" ON "UserGameProgress"("userId", "gameId");
CREATE INDEX "UserGameProgress_userId_status_idx" ON "UserGameProgress"("userId", "status");
CREATE INDEX "UserGameProgress_gameId_idx" ON "UserGameProgress"("gameId");
CREATE UNIQUE INDEX "UserXpTransaction_userId_sourceType_sourceId_transactionType_key" ON "UserXpTransaction"("userId", "sourceType", "sourceId", "transactionType");
CREATE INDEX "UserXpTransaction_userId_createdAt_idx" ON "UserXpTransaction"("userId", "createdAt");
CREATE UNIQUE INDEX "Achievement_key_key" ON "Achievement"("key");
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");
CREATE INDEX "UserAchievement_userId_idx" ON "UserAchievement"("userId");
CREATE INDEX "LearnerGameStats_xp_idx" ON "LearnerGameStats"("xp");

ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EducationalGame" ADD CONSTRAINT "EducationalGame_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EducationalGame" ADD CONSTRAINT "EducationalGame_prerequisiteGameId_fkey" FOREIGN KEY ("prerequisiteGameId") REFERENCES "EducationalGame"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GameStage" ADD CONSTRAINT "GameStage_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "EducationalGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameAttempt" ADD CONSTRAINT "GameAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameAttempt" ADD CONSTRAINT "GameAttempt_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "EducationalGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameAttempt" ADD CONSTRAINT "GameAttempt_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "GameStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserGameProgress" ADD CONSTRAINT "UserGameProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserGameProgress" ADD CONSTRAINT "UserGameProgress_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "EducationalGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserXpTransaction" ADD CONSTRAINT "UserXpTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearnerGameStats" ADD CONSTRAINT "LearnerGameStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
