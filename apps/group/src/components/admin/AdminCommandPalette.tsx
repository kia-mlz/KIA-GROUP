'use client';

import { useRouter } from 'next/navigation';
import { Search, User } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AdminUser } from '@kia./shared';
import { useLanguage } from '@/context/LanguageProvider';
import { api } from '@/lib/api';

export interface PaletteCommand {
  id: string;
  label: string;
  href: string;
  icon: typeof Search;
}

/**
 * ⌘K / Ctrl+K command palette.
 * - Navigation commands are permission-filtered by the caller.
 * - Typing performs a REAL user search against the admin users API.
 */
export default function AdminCommandPalette({
  open,
  onClose,
  commands,
}: {
  open: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const navMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((cmd) => cmd.label.toLowerCase().includes(q));
  }, [commands, query]);

  const showUserSearch = query.trim().length >= 2;

  const flatItems = useMemo(
    () => [
      ...navMatches.map((cmd) => ({ type: 'nav' as const, cmd })),
      ...users.map((user) => ({ type: 'user' as const, user })),
    ],
    [navMatches, users],
  );

  // Focus input on open; reset transient state on close.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      setQuery('');
      setUsers([]);
      setActiveIndex(0);
    }
  }, [open]);

  // Real user search (debounced) against the admin API.
  useEffect(() => {
    if (!open || !showUserSearch) {
      setUsers([]);
      setUsersLoading(false);
      return;
    }
    setUsersLoading(true);
    const timer = setTimeout(() => {
      api
        .adminListUsers({ search: query.trim(), limit: 5, page: 1 })
        .then((result) => setUsers(result.items))
        .catch(() => setUsers([]))
        .finally(() => setUsersLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [open, query, showUserSearch]);

  // Keep the active option in view.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, flatItems.length]);

  const run = useCallback(
    (index: number) => {
      const item = flatItems[index];
      if (!item) return;
      onClose();
      router.push(
        item.type === 'nav'
          ? item.cmd.href
          : `/admin/users?search=${encodeURIComponent(item.user.email ?? item.user.name)}`,
      );
    },
    [flatItems, onClose, router],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((i) => (flatItems.length ? (i + 1) % flatItems.length : 0));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((i) =>
          flatItems.length ? (i - 1 + flatItems.length) % flatItems.length : 0,
        );
      } else if (event.key === 'Enter') {
        event.preventDefault();
        run(activeIndex);
      }
    },
    [activeIndex, flatItems.length, onClose, run],
  );

  if (!open) return null;

  let optionCursor = -1;

  return (
    <div
      className="admin-palette-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="admin-palette"
        role="dialog"
        aria-modal="true"
        aria-label={t('admin.palette.title')}
        onKeyDown={onKeyDown}
      >
        <div className="admin-palette-input-row">
          <Search size={16} aria-hidden />
          <input
            ref={inputRef}
            className="admin-palette-input"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder={t('admin.palette.placeholder')}
            aria-label={t('admin.palette.placeholder')}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="admin-palette-list" ref={listRef} role="listbox">
          {navMatches.length > 0 ? (
            <li className="admin-palette-group-label" aria-hidden>
              {t('admin.palette.navigation')}
            </li>
          ) : null}
          {navMatches.map((cmd) => {
            optionCursor += 1;
            const index = optionCursor;
            const Icon = cmd.icon;
            return (
              <li key={cmd.id}>
                <button
                  type="button"
                  className="admin-palette-option"
                  role="option"
                  aria-selected={index === activeIndex}
                  data-active={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => run(index)}
                >
                  <Icon size={15} aria-hidden />
                  {cmd.label}
                  <small>{t('admin.palette.go')}</small>
                </button>
              </li>
            );
          })}
          {showUserSearch ? (
            <li className="admin-palette-group-label" aria-hidden>
              {t('admin.palette.users')}
            </li>
          ) : null}
          {showUserSearch && usersLoading
            ? Array.from({ length: 2 }, (_, i) => (
                <li key={`sk-${i}`} style={{ padding: '0 var(--space-2)' }}>
                  <span
                    className="admin-skeleton"
                    style={{ display: 'block', height: '2.2rem' }}
                  />
                </li>
              ))
            : null}
          {showUserSearch && !usersLoading && users.length === 0 ? (
            <li className="admin-palette-empty">{t('admin.palette.noResults')}</li>
          ) : null}
          {users.map((user) => {
            optionCursor += 1;
            const index = optionCursor;
            return (
              <li key={user.id}>
                <button
                  type="button"
                  className="admin-palette-option"
                  role="option"
                  aria-selected={index === activeIndex}
                  data-active={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => run(index)}
                >
                  <User size={15} aria-hidden />
                  <span style={{ minWidth: 0 }}>
                    {user.name}
                    <small style={{ display: 'block' }}>
                      {user.email ?? user.phone ?? user.role}
                    </small>
                  </span>
                </button>
              </li>
            );
          })}
          {!showUserSearch && navMatches.length === 0 ? (
            <li className="admin-palette-empty">{t('admin.palette.noResults')}</li>
          ) : null}
        </div>
        <div className="admin-palette-footer" aria-hidden>
          <span>
            <kbd>↑↓</kbd>
            {t('admin.palette.navigate')}
          </span>
          <span>
            <kbd>↵</kbd>
            {t('admin.palette.open')}
          </span>
          <span>
            <kbd>esc</kbd>
            {t('admin.palette.close')}
          </span>
        </div>
      </div>
    </div>
  );
}
