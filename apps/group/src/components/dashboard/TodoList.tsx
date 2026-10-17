'use client';

import type { LearnerTodoDto } from '@kia./shared';
import { Check, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import { CardShell, EmptyState } from './CardShell';
import { useDashboardToast } from './ToastProvider';

export function TodoList() {
  const { t, format } = useLanguage();
  const toast = useDashboardToast();
  const [todos, setTodos] = useState<LearnerTodoDto[]>([]);
  const [input, setInput] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listTodos();
      setTodos([...data].sort((a, b) => Number(a.done) - Number(b.done)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('panel.todos.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    const title = input.trim();
    if (!title || saving) return;
    setSaving(true);
    try {
      const created = await api.createTodo({ title });
      setTodos((prev) => [created, ...prev]);
      setInput('');
      inputRef.current?.focus();
      toast.push(t('dashboard.todo.added'), 'success');
    } catch (err) {
      toast.push(
        err instanceof ApiError ? err.message : t('panel.todos.saveError'),
        'error',
      );
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (todo: LearnerTodoDto) => {
    const next = !todo.done;
    setTodos((prev) =>
      [...prev.map((item) => (item.id === todo.id ? { ...item, done: next } : item))].sort(
        (a, b) => Number(a.done) - Number(b.done),
      ),
    );
    try {
      await api.updateTodo(todo.id, { done: next });
    } catch (err) {
      await load();
      toast.push(
        err instanceof ApiError ? err.message : t('panel.todos.saveError'),
        'error',
      );
    }
  };

  const remove = async (id: string) => {
    const prev = todos;
    setTodos((list) => list.filter((item) => item.id !== id));
    try {
      await api.deleteTodo(id);
    } catch (err) {
      setTodos(prev);
      toast.push(
        err instanceof ApiError ? err.message : t('panel.todos.saveError'),
        'error',
      );
    }
  };

  const visible = showAll ? todos : todos.slice(0, 5);
  const remaining = Math.max(0, todos.length - 5);

  return (
    <CardShell
      title={t('dashboard.todo.title')}
      icon={Check}
      isLoading={loading}
      error={error}
      onRetry={load}
      cta={
        <Link href="/dashboard/todos" className="dash-btn-ghost">
          {t('dashboard.todo.viewAll')}
        </Link>
      }
    >
      <div className="dash-todo-form">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void add();
          }}
          placeholder={t('dashboard.todo.placeholder')}
          aria-label={t('dashboard.todo.placeholder')}
          maxLength={200}
        />
        <button
          type="button"
          className="dash-btn-primary"
          onClick={() => void add()}
          disabled={saving || !input.trim()}
          aria-label={t('dashboard.todo.add')}
        >
          <Plus size={14} aria-hidden="true" />
        </button>
      </div>

      {todos.length === 0 ? (
        <EmptyState icon="✅" text={t('panel.todos.empty')} />
      ) : (
        <div className="dash-stack">
          {visible.map((todo) => (
            <div key={todo.id} className={`dash-todo-row${todo.done ? ' is-done' : ''}`}>
              <button
                type="button"
                className={`dash-check${todo.done ? ' is-checked' : ''}`}
                onClick={() => void toggle(todo)}
                aria-label={
                  todo.done ? t('dashboard.todo.markUndone') : t('dashboard.todo.markDone')
                }
              >
                {todo.done ? <Check size={10} color="#fff" aria-hidden="true" /> : null}
              </button>
              <span>{todo.title}</span>
              <button
                type="button"
                className="dash-icon-btn"
                onClick={() => void remove(todo.id)}
                aria-label={t('dashboard.todo.delete')}
              >
                <Trash2 size={13} aria-hidden="true" />
              </button>
            </div>
          ))}
          {!showAll && remaining > 0 ? (
            <button
              type="button"
              className="dash-btn-ghost dash-btn-block"
              aria-expanded={false}
              onClick={() => setShowAll(true)}
            >
              {t('dashboard.todo.viewMore', { count: format.number(remaining) })}
            </button>
          ) : null}
        </div>
      )}
    </CardShell>
  );
}
