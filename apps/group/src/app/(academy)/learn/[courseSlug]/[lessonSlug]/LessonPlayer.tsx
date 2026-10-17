'use client';

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  ClipboardList,
  Clock,
  Loader2,
  Lock,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { CourseExamSummary, LessonDetail, LessonSummary } from '@kia./shared';
import { parseLessonContent } from '@kia./shared';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { LessonPlayground } from '@/components/lesson/LessonPlayground';
import { LessonVideo } from '@/components/lesson/LessonVideo';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import { markdownToHtml } from '@/lib/markdown';
import { mediaUrl } from '@/lib/mediaUrl';

export default function LessonPlayerPage() {
  const params = useParams<{ courseSlug: string; lessonSlug: string }>();
  const courseSlug = params.courseSlug;
  const lessonSlug = params.lessonSlug;
  const nextPath = courseSlug && lessonSlug ? `/learn/${courseSlug}/${lessonSlug}` : '/courses';

  return (
    <RequireAuth nextPath={nextPath} learnerFlow>
      <LessonPlayerContent courseSlug={courseSlug} lessonSlug={lessonSlug} />
    </RequireAuth>
  );
}

function LessonPlayerContent({
  courseSlug,
  lessonSlug,
}: {
  courseSlug: string;
  lessonSlug: string;
}) {
  const router = useRouter();
  const { t, locale, format } = useLanguage();
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [exams, setExams] = useState<CourseExamSummary[]>([]);
  const [passedExamIds, setPassedExamIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completing, setCompleting] = useState(false);
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  /** Scroll container of the lessons navigation (active lesson pinned to its top). */
  const navRef = useRef<HTMLElement>(null);
  /** True after being redirected here from a failed exam (?examFailed=1). */
  const [failWarning, setFailWarning] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('examFailed') === '1') {
      setFailWarning(true);
    }
  }, []);

  useEffect(() => {
    if (!courseSlug) return;
    let alive = true;
    // Exams anchored to lessons are rendered inside the lessons navigation.
    api
      .listCourseExamsForLearner(courseSlug)
      .then(async (list) => {
        if (!alive) return;
        setExams(list);
        const passed = await Promise.all(
          list.map(async (exam) => {
            try {
              const attempts = await api.listCourseExamAttempts(exam.id);
              return attempts.some((attempt) => attempt.passed);
            } catch {
              return false;
            }
          }),
        );
        if (alive) {
          setPassedExamIds(new Set(list.filter((_, i) => passed[i]).map((exam) => exam.id)));
        }
      })
      .catch(() => {
        if (alive) setExams([]);
      });
    return () => {
      alive = false;
    };
  }, [courseSlug]);

  useEffect(() => {
    if (!courseSlug || !lessonSlug) return;
    setLoading(true);
    const noteKey = `kia-lesson-note:${courseSlug}:${lessonSlug}`;
    setNote(typeof window !== 'undefined' ? (localStorage.getItem(noteKey) ?? '') : '');

    Promise.all([api.getLesson(courseSlug, lessonSlug), api.getCourse(courseSlug)])
      .then(([lessonDetail, course]) => {
        setLesson(lessonDetail);
        setLessons(course.lessons ?? []);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t('lesson.loadError'));
      })
      .finally(() => setLoading(false));
  }, [courseSlug, lessonSlug, t]);

  const filteredLessons = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lessons;
    return lessons.filter((item) => item.title.toLowerCase().includes(q));
  }, [lessons, query]);

  /** Exams anchored right after a specific lesson (midterms). */
  const examsAfterLesson = useMemo(() => {
    const map: Record<string, CourseExamSummary[]> = {};
    for (const exam of exams) {
      if (!exam.afterLessonSlug) continue;
      (map[exam.afterLessonSlug] ??= []).push(exam);
    }
    return map;
  }, [exams]);

  /** Exams held at the end of the course (finals without an anchor lesson). */
  const endOfCourseExams = useMemo(() => exams.filter((exam) => !exam.afterLessonSlug), [exams]);

  /**
   * Sequential gating: lessons up to where an exam exists are open; lessons that
   * come after an exam remain locked until that exam has been passed.
   */
  const lockedLessonSlugs = useMemo(() => {
    const locked = new Set<string>();
    if (!lessons.length) return locked;
    const indexBySlug: Record<string, number> = {};
    lessons.forEach((lesson, i) => {
      indexBySlug[lesson.slug] = i;
    });
    for (let i = 0; i < lessons.length; i++) {
      const gated = Object.entries(examsAfterLesson).some(([anchorSlug, list]) => {
        const anchorIndex = indexBySlug[anchorSlug];
        if (anchorIndex === undefined || anchorIndex >= i) return false;
        return list.some((exam) => !passedExamIds.has(exam.id));
      });
      if (gated) locked.add(lessons[i].slug);
    }
    return locked;
  }, [lessons, examsAfterLesson, passedExamIds]);

  const isLessonLocked = (slug: string) => lockedLessonSlugs.has(slug);

  // Pin the active lesson to the top of the lessons navigation: previous lessons
  // stay above it (reachable by scrolling up), next ones remain below.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>('.lesson-nav-item.active');
    if (!active) return;
    nav.scrollTop = active.offsetTop;
  }, [lessonSlug, lessons, loading]);

  /** If the current lesson is locked, send the learner back to the last open one. */
  useEffect(() => {
    if (!courseSlug || !lessonSlug) return;
    if (loading || !lessons.length) return;
    if (!lockedLessonSlugs.has(lessonSlug)) return;
    let target: LessonSummary | undefined;
    for (let i = lessons.length - 1; i >= 0; i--) {
      if (!lockedLessonSlugs.has(lessons[i].slug)) {
        target = lessons[i];
        break;
      }
    }
    if (target && target.slug !== lessonSlug) {
      router.replace(`/learn/${courseSlug}/${target.slug}`);
    }
  }, [courseSlug, lessonSlug, loading, lessons, lockedLessonSlugs, router]);

  /** Where "complete/next" should advance; routes past a pending exam to that exam. */
  const nextTarget = useMemo(() => {
    if (!courseSlug || !lessonSlug || !lesson) return null;
    const immediateExam = (examsAfterLesson[lessonSlug] ?? []).find(
      (exam) => !passedExamIds.has(exam.id),
    );
    if (immediateExam) return `/courses/${courseSlug}/exams/${immediateExam.id}`;
    if (lesson.nextSlug && !lockedLessonSlugs.has(lesson.nextSlug)) {
      return `/learn/${courseSlug}/${lesson.nextSlug}`;
    }
    return null;
  }, [courseSlug, lessonSlug, lesson, examsAfterLesson, lockedLessonSlugs, passedExamIds]);

  const renderExamNavItem = (exam: CourseExamSummary) => {
    const passed = passedExamIds.has(exam.id);
    return (
      <Link
        key={exam.id}
        href={`/courses/${courseSlug}/exams/${exam.id}`}
        className={`lesson-nav-item lesson-nav-item--exam${passed ? ' done' : ''}`}
      >
        <span className="lesson-nav-title">
          <ClipboardList size={14} className="inline-leading-icon" aria-hidden /> {exam.title}
        </span>
        <span className="lesson-nav-meta">
          {exam.kind === 'MIDTERM' ? t('courses.examKindMidterm') : t('courses.examKindFinal')}
          {' · '}
          {t('courses.examQuestions', { count: exam.questionCount })}
          {' · '}
          {t('courses.examDuration', { min: exam.durationMin })}
          {passed ? ` · ${t('lesson.examPassed')}` : ''}
        </span>
      </Link>
    );
  };

  const parsedContent = useMemo(() => {
    if (!lesson) return null;
    // English mode: use the English lesson body/playground when available.
    const packed = locale === 'en' && lesson.contentEn ? lesson.contentEn : lesson.content;
    return parseLessonContent(packed);
  }, [lesson, locale]);

  const progressPct = useMemo(() => {
    if (!lessons.length) return 0;
    const done = lessons.filter((item) => item.completed).length;
    return Math.round((done / lessons.length) * 100);
  }, [lessons]);

  const markComplete = async () => {
    if (!courseSlug || !lessonSlug || !lesson) return;
    setCompleting(true);
    try {
      await api.completeLesson(courseSlug, lessonSlug);
      setLesson((prev) => (prev ? { ...prev, completed: true } : prev));
      setLessons((prev) =>
        prev.map((item) => (item.slug === lessonSlug ? { ...item, completed: true } : item)),
      );
      // Show the freshly-completed lesson as green for a beat, then auto-advance
      // to the next step (an anchored exam, or the next lesson) so the learner
      // keeps moving forward.
      if (nextTarget) {
        window.setTimeout(() => {
          router.push(nextTarget);
        }, 600);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('lesson.completeError'));
    } finally {
      setCompleting(false);
    }
  };

  const saveNote = (value: string) => {
    setNote(value);
    if (courseSlug && lessonSlug) {
      localStorage.setItem(`kia-lesson-note:${courseSlug}:${lessonSlug}`, value);
    }
  };

  const copyNote = async () => {
    try {
      await navigator.clipboard.writeText(note);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable in some environments.
    }
  };

  if (loading) {
    return (
      <div className="page-content auth-loading">
        <Loader2 size={24} className="spin" /> {t('lesson.loading')}
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="page-content">
        <div className="container lesson-shell kia-lesson-shell">
          <p className="form-error">{error || t('lesson.notFound')}</p>
        </div>
      </div>
    );
  }

  const videoSrc = lesson.videoUrl ? mediaUrl(lesson.videoUrl) : null;

  return (
    <div className="page-content">
      <div className="container lesson-shell kia-lesson-shell">
        <div className="learn-layout">
          <aside className="learn-sidebar glass-panel" aria-label={t('lesson.lessonsNav')}>
            <div className="sidebar-head">
              <h2 className="learn-brand">{lesson.courseTitle}</h2>
              <p className="muted">{t('lesson.sidebarBrand')}</p>
            </div>

            <label className="field-label" htmlFor="lesson-search">
              {t('lesson.searchLessons')}
            </label>
            <input
              id="lesson-search"
              className="input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('lesson.searchPlaceholder')}
            />

            <div className="learn-progress">
              <div className="learn-progress-label">
                <span>{t('lesson.progressLabel')}</span>
                <strong>{progressPct}%</strong>
              </div>
              <div className="progress-bar" aria-hidden="true">
                <span style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            <nav ref={navRef} className="lesson-nav" aria-label={t('lesson.lessonsNav')}>
              {filteredLessons.map((item) => {
                const locked = isLessonLocked(item.slug);
                const soon = item.comingSoon;
                const itemBody = (
                  <>
                    <span className="lesson-nav-title">
                      {soon ? (
                        <Clock size={13} className="inline-leading-icon" aria-hidden />
                      ) : locked ? (
                        <Lock size={13} className="inline-leading-icon" aria-hidden />
                      ) : null}
                      {item.title}
                    </span>
                    <span className="lesson-nav-meta">
                      {soon
                        ? t('lesson.comingSoonHint')
                        : locked
                          ? t('lesson.lockedHint')
                          : `${t('lesson.duration', { minutes: item.durationMin })}${item.completed ? ` · ${t('lesson.completed')}` : ''}`}
                    </span>
                  </>
                );
                return (
                  <Fragment key={item.id}>
                    {soon ? (
                      <span
                        className={`lesson-nav-item${item.slug === lessonSlug ? ' active' : ''} coming-soon`}
                        title={t('lesson.comingSoonHint')}
                      >
                        {itemBody}
                      </span>
                    ) : locked ? (
                      <span
                        className={`lesson-nav-item${item.slug === lessonSlug ? ' active' : ''}${item.completed ? ' done' : ''} locked`}
                        title={t('lesson.lockedHint')}
                      >
                        {itemBody}
                      </span>
                    ) : (
                      <Link
                        href={`/learn/${courseSlug}/${item.slug}`}
                        className={`lesson-nav-item${item.slug === lessonSlug ? ' active' : ''}${item.completed ? ' done' : ''}`}
                      >
                        {itemBody}
                      </Link>
                    )}
                    {(examsAfterLesson[item.slug] ?? []).map(renderExamNavItem)}
                  </Fragment>
                );
              })}
              {endOfCourseExams.map(renderExamNavItem)}
            </nav>
          </aside>

          <section className="learn-main">
            {failWarning ? (
              <div className="exam-fail-warning">
                <span className="exam-fail-warning__msg">
                  <XCircle size={16} className="inline-leading-icon" />
                  {t('lesson.examFailWarning')}
                </span>
                <button type="button" className="pill-btn" onClick={() => setFailWarning(false)}>
                  {t('lesson.dismiss')}
                </button>
              </div>
            ) : null}
            <article className="lesson-content-card glass-panel">
              <div className="lesson-top-row">
                <div>
                  <h1>{lesson.title}</h1>
                  <div className="lesson-meta">
                    <span className="meta-chip">{format.durationMinutes(lesson.durationMin)}</span>
                    {lesson.completed && (
                      <span className="meta-chip meta-chip--done">
                        <CheckCircle size={14} /> {t('lesson.completed')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <LessonVideo src={videoSrc} title={lesson.title} />

              <div
                className="lesson-description lesson-md"
                dangerouslySetInnerHTML={{
                  __html: markdownToHtml(parsedContent?.markdown ?? lesson.content),
                }}
              />

              <div className="lesson-actions-row">
                {lesson.prevSlug ? (
                  <button
                    type="button"
                    className="pill-btn"
                    onClick={() => router.push(`/learn/${courseSlug}/${lesson.prevSlug}`)}
                  >
                    <ArrowLeft size={16} className="nav-arrow" aria-hidden /> {t('lesson.previous')}
                  </button>
                ) : null}
                {nextTarget ? (
                  <button
                    type="button"
                    className="pill-btn"
                    onClick={() => router.push(nextTarget)}
                  >
                    {t('lesson.next')} <ArrowRight size={16} className="nav-arrow" aria-hidden />
                  </button>
                ) : (
                  <Link href="/courses" className="pill-btn">
                    {t('lesson.allLessons')}
                  </Link>
                )}
                {!lesson.completed && (
                  <button
                    type="button"
                    className="pill-btn pill-btn--primary"
                    onClick={markComplete}
                    disabled={completing}
                  >
                    {completing ? t('lesson.saving') : t('lesson.markComplete')}
                  </button>
                )}
              </div>
            </article>

            <section className="learn-utility-grid">
              <article className="notes-card glass-panel">
                <div className="lesson-top-row">
                  <div>
                    <h3>{t('lesson.notesTitle')}</h3>
                    <p className="muted">{t('lesson.notesHint')}</p>
                  </div>
                  <button type="button" className="pill-btn" onClick={() => void copyNote()}>
                    {copied ? t('lesson.notesCopied') : t('lesson.notesCopy')}
                  </button>
                </div>
                <textarea
                  className="note-editor"
                  value={note}
                  onChange={(e) => saveNote(e.target.value)}
                  rows={6}
                  placeholder={t('lesson.notesHint')}
                />
              </article>

              <LessonPlayground
                storageKey={`kia-lesson-code:${courseSlug}:${lessonSlug}`}
                starterHtml={parsedContent?.playground?.html}
                starterCss={parsedContent?.playground?.css}
                starterJs={parsedContent?.playground?.js}
              />
            </section>
          </section>
        </div>
      </div>
    </div>
  );
}
