'use client';

import type { LearnerTodoDto } from '@kia./shared';
import { CheckSquare, Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DashboardGate, PanelPage } from '@/components/dashboard/DashboardShell';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';

export default function TodosPage() {
  const { t } = useLanguage();
  const [todos, setTodos] = useState<LearnerTodoDto[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    const data = await api.listTodos();
    setTodos(data);
  };

  useEffect(() => {
    let cancelled = false;
    api
      .listTodos()
      .then((data) => {
        if (!cancelled) setTodos(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t('panel.todos.loadError'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await api.createTodo({ title: title.trim() });
      setTitle('');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('panel.todos.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (todo: LearnerTodoDto) => {
    try {
      await api.updateTodo(todo.id, { done: !todo.done });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('panel.todos.saveError'));
    }
  };

  const remove = async (id: string) => {
    try {
      await api.deleteTodo(id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('panel.todos.saveError'));
    }
  };

  return (
    <DashboardGate nextPath="/dashboard/todos">
      <PanelPage
        eyebrow={
          <>
            <CheckSquare size={14} className="inline-leading-icon" />
            {t('panel.nav.todos')}
          </>
        }
        title={t('panel.todos.title')}
        sub={t('panel.todos.sub')}
      >
        <form className="todo-form" onSubmit={handleCreate}>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('panel.todos.placeholder')}
            maxLength={200}
          />
          <button type="submit" className="btn btn--primary" disabled={saving || !title.trim()}>
            <Plus size={16} aria-hidden="true" />
            {t('common.create')}
          </button>
        </form>
        {loading ? (
          <p className="auth-loading">
            <Loader2 size={18} className="spin" /> {t('common.loading')}
          </p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        {!loading && todos.length === 0 ? (
          <p className="panel-muted">{t('panel.todos.empty')}</p>
        ) : null}
        <div className="panel-list">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className={`panel-row todo-item${todo.done ? ' todo-item--done' : ''}`}
            >
              <label className="panel-row__main" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={() => toggleDone(todo)}
                />
                <b>{todo.title}</b>
              </label>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => remove(todo.id)}
                aria-label={t('common.delete')}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </PanelPage>
    </DashboardGate>
  );
}
