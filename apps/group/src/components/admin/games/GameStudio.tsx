'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type {
  AdminEducationalGame,
  AdminGamesDashboard,
  EducationalGameType,
  GameCatalogCourse,
  GameDifficulty,
} from '@kia./shared';
import { EDUCATIONAL_GAME_TYPES } from '@kia./shared';
import { AdminErrorState, AdminLoading } from '@/components/admin/AdminStates';
import { useAdminAccess } from '@/components/admin/useAdminAccess';
import { api, ApiError } from '@/lib/api';
import { compileStage, emptyStage, hydrateStage, type StageDraft } from './stage-form';

const TYPE_LABEL: Record<EducationalGameType, string> = {
  CODE_BUILDER: 'کدساز',
  CODE_EDITOR: 'ویرایشگر کد',
  BUG_HUNTER: 'شکار باگ',
  DRAG_DROP: 'کشیدن و رها کردن',
  QUIZ: 'آزمون',
  WEBSITE_BUILDER: 'ساخت صفحه',
  CODE_ADVENTURE: 'ماجرای کد',
  MATCHING: 'تطبیق',
  FILL_BLANKS: 'جای خالی',
  OUTPUT_PREDICTION: 'پیش‌بینی خروجی',
  SIMULATION: 'شبیه‌سازی',
  FINAL_PROJECT: 'پروژه پایانی',
};

export function GamesDashboard() {
  const { can } = useAdminAccess();
  const [data, setData] = useState<AdminGamesDashboard | null>(null);
  const [games, setGames] = useState<AdminEducationalGame[]>([]);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const load = useCallback(() => {
    setError('');
    Promise.all([api.adminGamesDashboard(), api.adminListGames('')])
      .then(([dashboard, list]) => {
        setData(dashboard);
        setGames(list);
      })
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'خطا در بارگذاری'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!can('educationalGames')) {
    return <AdminErrorState message="به مدیریت بازی‌های آموزشی دسترسی نداری." />;
  }
  if (error) return <AdminErrorState message={error} onRetry={load} />;
  if (!data) return <AdminLoading label="در حال بارگذاری بازی‌ها…" />;

  const visible = games.filter((game) => {
    if (status && game.publishStatus !== status) return false;
    if (q && !`${game.title} ${game.courseTitle} ${game.lessonTitle}`.includes(q)) return false;
    return true;
  });

  return (
    <div className="admin-content eg-admin">
      <header className="eg-head">
        <div>
          <h1>مدیریت بازی‌های آموزشی</h1>
          <p className="muted">ساخت، انتشار و نتیجه بازی‌های داخل درس‌های آکادمی.</p>
        </div>
        {can('educationalGames', 'manage') ? (
          <Link className="btn-next admin-btn" href="/admin/academy/games/new">بازی جدید</Link>
        ) : null}
      </header>
      <dl className="eg-metrics">
        <div><dt>کل بازی‌ها</dt><dd>{data.total}</dd></div>
        <div><dt>منتشرشده</dt><dd>{data.published}</dd></div>
        <div><dt>پیش‌نویس</dt><dd>{data.drafts}</dd></div>
        <div><dt>شرکت‌کننده</dt><dd>{data.participants}</dd></div>
        <div><dt>تکمیل</dt><dd>{data.completions}</dd></div>
        <div><dt>میانگین امتیاز</dt><dd>{data.averageScore}</dd></div>
      </dl>
      <section className="admin-card">
        <h2>بازی‌های پربازدید</h2>
        {data.popular.length === 0 ? <p className="muted">هنوز شرکت‌کننده‌ای نیست.</p> : (
          <ul>{data.popular.map((game) => <li key={game.id}>{game.title} — {game.participants}</li>)}</ul>
        )}
        <h2>درس‌های بدون بازی</h2>
        <ul>
          {data.lessonsWithoutGames.map((lesson) => (
            <li key={lesson.lessonId}>{lesson.courseTitle} / {lesson.lessonTitle}</li>
          ))}
        </ul>
      </section>
      <div className="eg-admin-grid">
        <input className="input" value={q} placeholder="جستجو" onChange={(event) => setQ(event.target.value)} />
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">همه وضعیت‌ها</option>
          <option value="PUBLISHED">منتشرشده</option>
          <option value="DRAFT">پیش‌نویس</option>
          <option value="ARCHIVED">بایگانی</option>
        </select>
      </div>
      <table className="eg-table">
        <thead>
          <tr><th>عنوان</th><th>درس</th><th>نوع</th><th>وضعیت</th><th></th></tr>
        </thead>
        <tbody>
          {visible.map((game) => (
            <tr key={game.id}>
              <td>{game.title}</td>
              <td>{game.courseTitle} / {game.lessonTitle}</td>
              <td>{TYPE_LABEL[game.type]}</td>
              <td>{game.publishStatus}</td>
              <td><Link href={`/admin/academy/games/${game.id}`}>ویرایش</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GameBuilder({ gameId }: { gameId?: string }) {
  const router = useRouter();
  const { can } = useAdminAccess();
  const [catalog, setCatalog] = useState<GameCatalogCourse[]>([]);
  const [courseId, setCourseId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [type, setType] = useState<EducationalGameType>('QUIZ');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [difficulty, setDifficulty] = useState<GameDifficulty>('BEGINNER');
  const [minutes, setMinutes] = useState(8);
  const [points, setPoints] = useState(40);
  const [required, setRequired] = useState(false);
  const [stages, setStages] = useState<StageDraft[]>([emptyStage('QUIZ')]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(!gameId);

  useEffect(() => {
    api.adminGamesCatalog().then(setCatalog).catch((err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'خطا');
    });
  }, []);

  useEffect(() => {
    if (!gameId) return;
    api.adminGetGame(gameId).then((game) => {
      setCourseId(game.courseId);
      setChapterId(game.chapterId ?? '');
      setLessonId(game.lessonId);
      setType(game.type);
      setTitle(game.title);
      setDescription(game.description);
      setGoal(game.learningGoal);
      setDifficulty(game.difficulty);
      setMinutes(game.estimatedMin);
      setPoints(game.points);
      setRequired(game.required);
      setStages(game.stages.length ? game.stages.map(hydrateStage) : [emptyStage(game.type)]);
      setLoaded(true);
    }).catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'خطا'));
  }, [gameId]);

  const course = catalog.find((item) => item.id === courseId);
  const lessons = [
    ...(course?.chapters.find((chapter) => chapter.id === chapterId)?.lessons ?? []),
    ...(chapterId ? [] : course?.unassignedLessons ?? []),
    ...(chapterId ? [] : course?.chapters.flatMap((chapter) => chapter.lessons) ?? []),
  ];
  const uniqueLessons = lessons.filter((lesson, index, all) => all.findIndex((item) => item.id === lesson.id) === index);

  const save = async (publish: boolean) => {
    if (!lessonId || !title.trim()) {
      setError('درس و عنوان لازم است.');
      return;
    }
    setBusy(true);
    setError('');
    const body = {
      lessonId,
      title: title.trim(),
      description,
      learningGoal: goal,
      type,
      difficulty,
      estimatedMin: minutes,
      points,
      required,
      publishStatus: publish ? 'PUBLISHED' as const : 'DRAFT' as const,
      stages: stages.map((stage, index) => compileStage(type, stage, index)),
    };
    try {
      const saved = gameId ? await api.adminUpdateGame(gameId, body) : await api.adminCreateGame(body);
      if (publish) await api.adminPublishGame(saved.id);
      router.push('/admin/academy/games');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ذخیره نشد');
    } finally {
      setBusy(false);
    }
  };

  if (!can('educationalGames')) return <AdminErrorState message="دسترسی نداری." />;
  if (!loaded) return <AdminLoading label="در حال بارگذاری سازنده…" />;

  return (
    <div className="admin-content eg-admin">
      <h1>{gameId ? 'ویرایش بازی' : 'بازی جدید'}</h1>
      <p className="muted">۱ دوره، ۲ فصل، ۳ درس، ۴ نوع، سپس مرحله، پاسخ و انتشار.</p>
      <div className="eg-admin-grid">
        <label>دوره
          <select className="input" value={courseId} onChange={(event) => { setCourseId(event.target.value); setChapterId(''); setLessonId(''); }}>
            <option value="">انتخاب دوره</option>
            {catalog.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </label>
        <label>فصل
          <select className="input" value={chapterId} onChange={(event) => setChapterId(event.target.value)}>
            <option value="">بدون فصل / همه درس‌ها</option>
            {course?.chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
          </select>
        </label>
        <label>درس
          <select className="input" value={lessonId} onChange={(event) => setLessonId(event.target.value)}>
            <option value="">انتخاب درس</option>
            {uniqueLessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
          </select>
        </label>
        <label>نوع بازی
          <select className="input" value={type} onChange={(event) => setType(event.target.value as EducationalGameType)}>
            {EDUCATIONAL_GAME_TYPES.map((item) => <option key={item} value={item}>{TYPE_LABEL[item]}</option>)}
          </select>
        </label>
      </div>
      <label>عنوان<input className="input" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label>توضیح<textarea className="input" value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      <label>هدف یادگیری<input className="input" value={goal} onChange={(event) => setGoal(event.target.value)} /></label>
      <div className="eg-admin-grid">
        <label>سطح
          <select className="input" value={difficulty} onChange={(event) => setDifficulty(event.target.value as GameDifficulty)}>
            <option value="BEGINNER">مقدماتی</option>
            <option value="INTERMEDIATE">متوسط</option>
            <option value="ADVANCED">پیشرفته</option>
          </select>
        </label>
        <label>دقیقه<input className="input" type="number" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label>
        <label>امتیاز تکمیل<input className="input" type="number" value={points} onChange={(event) => setPoints(Number(event.target.value))} /></label>
        <label><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} /> الزامی</label>
      </div>
      {stages.map((stage, index) => (
        <fieldset key={stage.id ?? index} className="admin-card">
          <legend>مرحله {index + 1}</legend>
          <label>عنوان<input className="input" value={stage.title} onChange={(event) => updateStage(setStages, index, { title: event.target.value })} /></label>
          <label>ماموریت<textarea className="input" value={stage.mission} onChange={(event) => updateStage(setStages, index, { mission: event.target.value })} /></label>
          <label>راهنمایی‌ها (هر خط یکی)<textarea className="input" value={stage.hints} onChange={(event) => updateStage(setStages, index, { hints: event.target.value })} /></label>
          <div className="eg-admin-grid">
            <label>امتیاز مرحله<input className="input" type="number" value={stage.points} onChange={(event) => updateStage(setStages, index, { points: Number(event.target.value) })} /></label>
            <label>محدودیت ثانیه<input className="input" value={stage.timeLimit} onChange={(event) => updateStage(setStages, index, { timeLimit: event.target.value })} /></label>
          </div>
          <StageFields type={type} stage={stage} onChange={(patch) => updateStage(setStages, index, patch)} />
        </fieldset>
      ))}
      <button type="button" className="pill-btn" onClick={() => setStages((current) => [...current, emptyStage(type)])}>مرحله جدید</button>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="eg-row">
        <button type="button" className="pill-btn" disabled={busy || !can('educationalGames', 'edit') && !can('educationalGames', 'manage')} onClick={() => void save(false)}>ذخیره پیش‌نویس</button>
        <button type="button" className="pill-btn pill-btn--primary" disabled={busy || !can('educationalGames', 'edit')} onClick={() => void save(true)}>انتشار</button>
        <Link className="pill-btn" href="/admin/academy/games">بازگشت</Link>
      </div>
      <p className="muted">پاسخ درست فقط در پیکربندی نمره‌دهی سرور ذخیره می‌شود و به یادگیرنده برنمی‌گردد. عبور پیش‌فرض ۱۰۰٪ است و تجربهٔ هر مرحله فقط یک‌بار داده می‌شود.</p>
    </div>
  );
}

function updateStage(setStages: (value: StageDraft[] | ((current: StageDraft[]) => StageDraft[])) => void, index: number, patch: Partial<StageDraft>) {
  setStages((current) => current.map((stage, stageIndex) => (stageIndex === index ? { ...stage, ...patch } : stage)));
}

function StageFields({ type, stage, onChange }: { type: EducationalGameType; stage: StageDraft; onChange: (patch: Partial<StageDraft>) => void }) {
  if (type === 'QUIZ') {
    return (
      <div>
        <label>صورت سؤال<input className="input" value={stage.prompt} onChange={(event) => onChange({ prompt: event.target.value })} /></label>
        {stage.options.map((option, index) => (
          <div key={option.id} className="eg-row">
            <input className="input" value={option.text} placeholder="گزینه" onChange={(event) => {
              const options = stage.options.map((item, itemIndex) => itemIndex === index ? { ...item, text: event.target.value } : item);
              onChange({ options });
            }} />
            <label><input type="checkbox" checked={option.correct} onChange={(event) => {
              const options = stage.options.map((item, itemIndex) => itemIndex === index ? { ...item, correct: event.target.checked } : item);
              onChange({ options });
            }} /> درست</label>
          </div>
        ))}
      </div>
    );
  }
  if (type === 'DRAG_DROP') {
    return (
      <div className="eg-admin-grid">
        <label>آیتم‌ها (هر خط یک عنوان)<textarea className="input" value={stage.items.map((item) => item.text).join('\n')} onChange={(event) => onChange({ items: event.target.value.split('\n').filter(Boolean).map((text, index) => ({ id: stage.items[index]?.id ?? `i${index}`, text, correct: false })) })} /></label>
        <label>جایگاه‌ها (برچسب=شناسه آیتم)<textarea className="input" value={stage.slots.map((slot) => `${slot.label}=${slot.itemId}`).join('\n')} onChange={(event) => onChange({ slots: event.target.value.split('\n').filter(Boolean).map((line, index) => {
          const [label, itemId] = line.split('=');
          return { id: stage.slots[index]?.id ?? `s${index}`, label: label ?? '', itemId: itemId ?? '' };
        }) })} /></label>
      </div>
    );
  }
  if (type === 'MATCHING') {
    return <label>جفت‌ها (چپ=راست)<textarea className="input" value={stage.pairs.map((pair) => `${pair.left}=${pair.right}`).join('\n')} onChange={(event) => onChange({ pairs: event.target.value.split('\n').filter(Boolean).map((line) => {
      const [left, right] = line.split('=');
      return { left: left ?? '', right: right ?? '' };
    }) })} /></label>;
  }
  if (type === 'FILL_BLANKS') {
    return (
      <>
        <label>الگو با ___<input className="input" value={stage.template} onChange={(event) => onChange({ template: event.target.value })} /></label>
        <label>پاسخ‌ها هر خط یکی<textarea className="input" value={stage.expected} onChange={(event) => onChange({ expected: event.target.value })} /></label>
      </>
    );
  }
  if (type === 'SIMULATION') {
    return <label>گام‌ها (صورت | گزینه درست | گزینه دیگر)<textarea className="input" value={stage.steps.map((step) => `${step.prompt}|${step.choices.map((choice) => `${choice.text}${choice.correct ? '*' : ''}`).join('|')}`).join('\n')} onChange={(event) => onChange({ steps: event.target.value.split('\n').filter(Boolean).map((line, index) => {
      const [prompt, ...rest] = line.split('|');
      return {
        id: stage.steps[index]?.id ?? `st${index}`,
        prompt: prompt ?? '',
        choices: rest.map((choice, choiceIndex) => ({
          id: `c${index}${choiceIndex}`,
          text: choice.replace(/\*$/, ''),
          correct: choice.endsWith('*'),
        })),
      };
    }) })} /></label>;
  }
  return (
    <>
      <label>صورت / توضیح<input className="input" value={stage.prompt} onChange={(event) => onChange({ prompt: event.target.value })} /></label>
      <label>زبان
        <select className="input" value={stage.language} onChange={(event) => onChange({ language: event.target.value })}>
          <option value="html">HTML</option>
          <option value="css">CSS</option>
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="text">متن</option>
        </select>
      </label>
      <label>کد یا بلوک‌ها<textarea className="input eg-code" value={stage.code || stage.blocks.map((block) => block.code).join('\n')} onChange={(event) => onChange({
        code: event.target.value,
        blocks: event.target.value.split('\n').filter(Boolean).map((code, index) => ({ id: stage.blocks[index]?.id ?? `b${index}`, code })),
      })} /></label>
      {type === 'OUTPUT_PREDICTION' ? <label>خروجی مورد انتظار<input className="input" value={stage.expected} onChange={(event) => onChange({ expected: event.target.value })} /></label> : null}
      {type === 'BUG_HUNTER' || type === 'CODE_EDITOR' || type === 'CODE_ADVENTURE' ? (
        <>
          <label>باید دیده شود (الگو، هر خط)<textarea className="input" value={stage.mustMatch} onChange={(event) => onChange({ mustMatch: event.target.value })} /></label>
          <label>نباید دیده شود<textarea className="input" value={stage.mustNotMatch} onChange={(event) => onChange({ mustNotMatch: event.target.value })} /></label>
          <label>نام تابع‌ها<textarea className="input" value={stage.functions} onChange={(event) => onChange({ functions: event.target.value })} /></label>
        </>
      ) : null}
      {type === 'WEBSITE_BUILDER' || type === 'FINAL_PROJECT' ? (
        <label>برچسب‌های لازم<input className="input" value={stage.tags} onChange={(event) => onChange({ tags: event.target.value })} /></label>
      ) : null}
    </>
  );
}
