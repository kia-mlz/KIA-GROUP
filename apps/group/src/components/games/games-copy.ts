export type GamesCopy = {
  sectionTitle: string;
  sectionHint: string;
  start: string;
  continue: string;
  replay: string;
  locked: string;
  required: string;
  optional: string;
  goal: string;
  stages: string;
  points: string;
  minutes: string;
  empty: string;
  summary: string;
  gameCount: string;
  completed: string;
  remaining: string;
  xp: string;
  level: string;
  streak: string;
  mission: string;
  stage: string;
  score: string;
  hint: string;
  check: string;
  retry: string;
  next: string;
  run: string;
  reset: string;
  preview: string;
  success: string;
  time: string;
  attempts: string;
  accuracy: string;
  badges: string;
  noBadges: string;
  nextLesson: string;
  back: string;
  loading: string;
  difficulty: Record<string, string>;
  status: Record<string, string>;
  pythonNote: string;
};

const fa: GamesCopy = {
  sectionTitle: 'بازی‌های آموزشی تعاملی',
  sectionHint: 'مفهوم همین درس را با یک بازی کوتاه تمرین کن. محتوای درس سر جایش می‌ماند.',
  start: 'شروع بازی',
  continue: 'ادامه بازی',
  replay: 'بازی دوباره',
  locked: 'اول بازی پیش‌نیاز را تمام کن',
  required: 'الزامی',
  optional: 'اختیاری',
  goal: 'هدف یادگیری',
  stages: 'مرحله',
  points: 'امتیاز',
  minutes: 'دقیقه',
  empty: 'برای این درس هنوز بازی منتشر نشده است.',
  summary: 'پیشرفت بازی‌های دوره',
  gameCount: 'تعداد بازی',
  completed: 'تکمیل‌شده',
  remaining: 'باقی‌مانده',
  xp: 'تجربه',
  level: 'سطح',
  streak: 'روز پیاپی',
  mission: 'ماموریت',
  stage: 'مرحله',
  score: 'امتیاز',
  hint: 'راهنمایی',
  check: 'بررسی پاسخ',
  retry: 'تلاش دوباره',
  next: 'مرحله بعد',
  run: 'اجرا',
  reset: 'بازنشانی',
  preview: 'پیش‌نمایش',
  success: 'این بازی را کامل کردی',
  time: 'زمان',
  attempts: 'تلاش‌ها',
  accuracy: 'نرخ پاسخ درست',
  badges: 'نشان‌ها',
  noBadges: 'در این بازی نشان تازه‌ای ثبت نشد.',
  nextLesson: 'درس بعد',
  back: 'بازگشت به درس',
  loading: 'در حال بارگذاری بازی…',
  difficulty: { BEGINNER: 'مقدماتی', INTERMEDIATE: 'متوسط', ADVANCED: 'پیشرفته' },
  status: {
    NOT_STARTED: 'شروع‌نشده',
    IN_PROGRESS: 'در حال انجام',
    COMPLETED: 'تکمیل‌شده',
    LOCKED: 'قفل',
  },
  pythonNote: 'پایتون روی سرور اجرا نمی‌شود. پاسخ با ساختار کد بررسی می‌شود.',
};

const en: GamesCopy = {
  ...fa,
  sectionTitle: 'Interactive lessons',
  sectionHint: 'Practice the same idea in a short game. The lesson itself stays in place.',
  start: 'Start',
  continue: 'Continue',
  replay: 'Play again',
  locked: 'Finish the prerequisite game first',
  required: 'Required',
  optional: 'Optional',
  goal: 'Goal',
  stages: 'stages',
  points: 'points',
  minutes: 'min',
  empty: 'No published game for this lesson yet.',
  summary: 'Course game progress',
  gameCount: 'Games',
  completed: 'Completed',
  remaining: 'Remaining',
  xp: 'XP',
  level: 'Level',
  streak: 'Day streak',
  mission: 'Mission',
  stage: 'Stage',
  score: 'Score',
  hint: 'Hint',
  check: 'Check',
  retry: 'Try again',
  next: 'Next stage',
  run: 'Run',
  reset: 'Reset',
  preview: 'Preview',
  success: 'You finished this game',
  time: 'Time',
  attempts: 'Attempts',
  accuracy: 'Accuracy',
  badges: 'Badges',
  noBadges: 'No new badge on this game.',
  nextLesson: 'Next lesson',
  back: 'Back to the lesson',
  loading: 'Loading the game…',
  difficulty: { BEGINNER: 'Beginner', INTERMEDIATE: 'Intermediate', ADVANCED: 'Advanced' },
  status: { NOT_STARTED: 'Not started', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', LOCKED: 'Locked' },
  pythonNote: 'Python is not executed on the server. The answer is checked structurally.',
};

export function gamesCopy(locale: string): GamesCopy {
  return locale === 'en' ? en : fa;
}

export function uiForType(type: string): string {
  const map: Record<string, string> = {
    CODE_BUILDER: 'blocks',
    CODE_EDITOR: 'code',
    BUG_HUNTER: 'bug',
    DRAG_DROP: 'drag',
    QUIZ: 'quiz',
    WEBSITE_BUILDER: 'website',
    CODE_ADVENTURE: 'code',
    MATCHING: 'match',
    FILL_BLANKS: 'blanks',
    OUTPUT_PREDICTION: 'output',
    SIMULATION: 'sim',
    FINAL_PROJECT: 'website',
  };
  return map[type] ?? 'text';
}
