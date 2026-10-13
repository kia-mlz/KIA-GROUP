'use client';

import Link from 'next/link';
import { Check, Loader2, Plus, Trash2, Undo2, X } from 'lucide-react';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  createDefaultSiteSettings,
  normalizeAdminAccess,
  isStaffRole,
  type AdminRole,
  type AdminUserStatus,
  type SiteAdminAccessSettings,
  type UserRole,
} from '@kia-group/shared';
import { AdminAccessMatrix } from '@/components/admin/AdminAccessMatrix';
import { useAdminAccess } from '@/components/admin/useAdminAccess';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';
import type { AdminUser } from '@kia-group/shared';

const USERS_PAGE_SIZE = 20;

const statusBadgeTone: Record<AdminUserStatus, string> = {
  ACTIVE: 'ok',
  SUSPENDED: 'warning',
  BANNED: 'danger',
};

function roleLabel(role: UserRole, t: (key: string) => string, customNames?: Map<string, string>): string {
  if (role === 'SUPER_ADMIN') return t('domain.roles.superAdmin');
  if (role === 'ADMIN') return t('domain.roles.moderator');
  if (role === 'LEARNER') return t('domain.roles.learner');
  const custom = customNames?.get(role);
  return custom ?? role;
}

const defaultModeratorAccess = () =>
  normalizeAdminAccess(createDefaultSiteSettings().adminAccess);

export default function AdminUsersPage() {
  const { t, format } = useLanguage();
  const { user: me } = useAuth();
  const { can } = useAdminAccess();
  const isSuper = me?.role === 'SUPER_ADMIN';
  // Soft delete and restore are `users.manage` operations on the server; the
  // buttons only exist for operators who hold it.
  const canManageUsers = can('users', 'manage');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [draftRoles, setDraftRoles] = useState<Record<string, UserRole>>({});
  const [draftAccess, setDraftAccess] = useState<Record<string, SiteAdminAccessSettings>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [savingAccessId, setSavingAccessId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, 'success' | 'error'>>({});
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | AdminUserStatus>('');
  const [deletedFilter, setDeletedFilter] = useState<'active' | 'deleted' | 'all'>('active');
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteDialogError, setDeleteDialogError] = useState('');
  const [restoreBusyId, setRestoreBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{
    user: AdminUser;
    status: Exclude<AdminUserStatus, 'ACTIVE'>;
  } | null>(null);
  const [statusActivateUser, setStatusActivateUser] = useState<AdminUser | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusDialogError, setStatusDialogError] = useState('');

  const load = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError('');
      try {
        const [list, roleList] = await Promise.all([
          api.adminListUsers({
            page: targetPage,
            limit: USERS_PAGE_SIZE,
            search: search.trim() || undefined,
            role: roleFilter || undefined,
            status: statusFilter || undefined,
            deleted: deletedFilter === 'active' ? undefined : deletedFilter,
          }),
          api.adminListRoles().catch(() => [] as AdminRole[]),
        ]);
        setUsers(list.items);
        setRoles(roleList);
        setTotal(list.total);
        setPage(list.page);
        setHasNext(list.hasNext);
        setDraftRoles(Object.fromEntries(list.items.map((u) => [u.id, u.role])));
        setDraftAccess(
          Object.fromEntries(
            list.items.map((u) => {
              if (u.role === 'LEARNER' || u.role === 'SUPER_ADMIN') {
                return [u.id, defaultModeratorAccess()] as const;
              }
              // Seed the editor from server-issued access; fall back to the
              // custom role's own matrix, then the site template — mirroring
              // the backend resolution order (ADM-1).
              const roleMatrix = roleList.find((r) => r.key === u.role)?.access;
              return [
                u.id,
                normalizeAdminAccess(u.adminPanelAccess ?? roleMatrix ?? defaultModeratorAccess()),
              ] as const;
            }),
          ),
        );
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t('admin.users.loadError'));
      } finally {
        setLoading(false);
      }
    },
    [search, roleFilter, statusFilter, deletedFilter, t],
  );

  useEffect(() => {
    void load(1);
  }, [roleFilter, statusFilter, deletedFilter]);

  const totalPages = Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));

  const canManageStatus = (user: AdminUser) =>
    user.id !== me?.id && user.role !== 'SUPER_ADMIN' && !user.deleted;

  /** DB-4 soft delete — mandatory reason, audited server-side. */
  const applySoftDelete = async () => {
    const user = deleteTarget;
    if (!user || deleteBusy) return;
    if (!deleteReason.trim()) {
      setDeleteDialogError(t('admin.users.softDeleteReasonRequired'));
      return;
    }
    setDeleteBusy(true);
    setDeleteDialogError('');
    try {
      const updated = await api.adminSoftDeleteUser(user.id, deleteReason.trim());
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      setDeleteTarget(null);
      setDeleteReason('');
      setFeedback((prev) => ({ ...prev, [user.id]: 'success' }));
    } catch (err) {
      setDeleteDialogError(
        err instanceof ApiError ? err.message : t('admin.users.softDeleteError'),
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  /** DB-4 reverse a soft delete — the account and its history come back. */
  const applyRestore = async (user: AdminUser) => {
    if (restoreBusyId) return;
    setRestoreBusyId(user.id);
    setError('');
    try {
      const updated = await api.adminRestoreUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      setFeedback((prev) => ({ ...prev, [user.id]: 'success' }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.users.restoreError'));
    } finally {
      setRestoreBusyId(null);
    }
  };

  const customRoleNames = useMemo(
    () =>
      new Map(roles.filter((r) => !r.isSystem).map((r) => [r.key, r.name || r.key])),
    [roles],
  );

  const applyUserStatus = async () => {
    const activateUser = statusActivateUser;
    const target = statusTarget;
    if (!activateUser && !target) return;
    const user = activateUser ?? target!.user;
    const nextStatus: AdminUserStatus = activateUser ? 'ACTIVE' : target!.status;
    if (nextStatus !== 'ACTIVE' && !statusReason.trim()) {
      setStatusDialogError(t('admin.users.statusReason'));
      return;
    }

    setStatusBusy(true);
    setStatusDialogError('');
    setError('');
    try {
      const updated = await api.adminUpdateUserStatus(user.id, {
        status: nextStatus,
        reason: nextStatus === 'ACTIVE' ? undefined : statusReason.trim(),
      });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      setStatusTarget(null);
      setStatusActivateUser(null);
      setStatusReason('');
      setFeedback((prev) => ({ ...prev, [user.id]: 'success' }));
    } catch (err) {
      setStatusDialogError(
        err instanceof ApiError ? err.message : t('admin.users.statusError'),
      );
    } finally {
      setStatusBusy(false);
    }
  };

  const saveRole = async (user: AdminUser) => {
    const nextRole = draftRoles[user.id];
    if (!nextRole || nextRole === user.role) return;

    if (nextRole === 'SUPER_ADMIN' && !isSuper) {
      setError(t('admin.users.onlySuper'));
      setDraftRoles((prev) => ({ ...prev, [user.id]: user.role }));
      return;
    }

    setUpdatingId(user.id);
    setError('');
    setFeedback((prev) => {
      const next = { ...prev };
      delete next[user.id];
      return next;
    });

    try {
      const updated = await api.adminUpdateUserRole(user.id, nextRole);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      setDraftRoles((prev) => ({ ...prev, [user.id]: updated.role }));
      if (updated.role !== 'LEARNER' && updated.adminPanelAccess) {
        setDraftAccess((prev) => ({
          ...prev,
          [user.id]: normalizeAdminAccess(updated.adminPanelAccess),
        }));
      }
      setFeedback((prev) => ({ ...prev, [user.id]: 'success' }));
    } catch (err) {
      setDraftRoles((prev) => ({ ...prev, [user.id]: user.role }));
      setFeedback((prev) => ({ ...prev, [user.id]: 'error' }));
      setError(err instanceof ApiError ? err.message : t('admin.users.roleError'));
    } finally {
      setUpdatingId(null);
    }
  };

  const saveAccess = async (user: AdminUser) => {
    const access = draftAccess[user.id];
    if (!access || (user.role !== 'ADMIN' && !isStaffRole(user.role))) return;

    setSavingAccessId(user.id);
    setError('');
    try {
      const updated = await api.adminUpdateUserAccess(user.id, access);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      setDraftAccess((prev) => ({
        ...prev,
        [user.id]: normalizeAdminAccess(updated.adminPanelAccess ?? access),
      }));
      setFeedback((prev) => ({ ...prev, [`access-${user.id}`]: 'success' }));
    } catch (err) {
      setFeedback((prev) => ({ ...prev, [`access-${user.id}`]: 'error' }));
      setError(err instanceof ApiError ? err.message : t('admin.users.accessError'));
    } finally {
      setSavingAccessId(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-content auth-loading">
        <Loader2 size={24} className="spin" /> {t('admin.users.loading')}
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="admin-header-row">
        <div>
          <h1>{t('admin.users.title')}</h1>
          <p className="admin-sub">{t('admin.users.sub')}</p>
          {isSuper && <p className="admin-sub">{t('admin.users.moderatorAccessHint')}</p>}
        </div>
        <Link href="/admin/users/create" className="cta-primary">
          <Plus size={16} /> {t('admin.nav.usersCreate')}
        </Link>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="admin-toolbar">
        <label className="form-field" style={{ flex: '1 1 220px', margin: 0 }}>
          <span className="sr-only">{t('admin.users.search')}</span>
          <input
            className="admin-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void load(1);
            }}
            placeholder={t('admin.users.searchPlaceholder')}
          />
        </label>
        <label className="form-field" style={{ flex: '0 1 180px', margin: 0 }}>
          <span className="sr-only">{t('admin.users.deletedViewLabel')}</span>
          <select
            className="admin-select"
            value={deletedFilter}
            onChange={(e) =>
              setDeletedFilter(e.target.value as 'active' | 'deleted' | 'all')
            }
          >
            <option value="active">{t('admin.users.deletedView.active')}</option>
            <option value="deleted">{t('admin.users.deletedView.deleted')}</option>
            <option value="all">{t('admin.users.deletedView.all')}</option>
          </select>
        </label>
        <label className="form-field" style={{ flex: '0 1 180px', margin: 0 }}>
          <span className="sr-only">{t('admin.users.col.status')}</span>
          <select
            className="admin-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as '' | AdminUserStatus)}
          >
            <option value="">{t('admin.users.allStatuses')}</option>
            <option value="ACTIVE">{t('admin.users.status.ACTIVE')}</option>
            <option value="SUSPENDED">{t('admin.users.status.SUSPENDED')}</option>
            <option value="BANNED">{t('admin.users.status.BANNED')}</option>
          </select>
        </label>
        <label className="form-field" style={{ flex: '0 1 180px', margin: 0 }}>
          <span className="sr-only">{t('admin.users.col.role')}</span>
          <select
            className="admin-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">{t('admin.users.allRoles')}</option>
            <option value="LEARNER">{t('domain.roles.learner')}</option>
            <option value="ADMIN">{t('domain.roles.moderator')}</option>
            <option value="SUPER_ADMIN">{t('domain.roles.superAdmin')}</option>
            {roles
              .filter((r) => !r.isSystem)
              .map((r) => (
                <option key={r.id} value={r.key}>
                  {r.name || r.key}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.users.col.name')}</th>
              <th>{t('admin.users.col.email')}</th>
              <th>{t('admin.users.col.role')}</th>
              <th>{t('admin.users.col.status')}</th>
              <th>{t('admin.users.col.joined')}</th>
              <th>{t('admin.users.col.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {/* The deleted view is legitimately empty until something is deleted;
                say so instead of rendering a blank table. */}
            {users.length === 0 ? (
              <tr>
                <td colSpan={6}>{t('admin.users.empty')}</td>
              </tr>
            ) : null}
            {users.map((user) => {
              const draft = draftRoles[user.id] ?? user.role;
              const dirty = draft !== user.role;
              const rowFeedback = feedback[user.id];
              const isModerator = user.role === 'ADMIN' || isStaffRole(user.role);
              const isDeleted = Boolean(user.deleted);
              const showAccess =
                isSuper && isModerator && user.role !== 'SUPER_ADMIN' && !isDeleted;

              return (
                <Fragment key={user.id}>
                  <tr>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span
                        className={`admin-badge${
                          user.role !== 'LEARNER' ? ' ok' : ''
                        }`}
                      >
                        {roleLabel(user.role, t, customRoleNames)}
                      </span>
                    </td>
                    <td>{format.date(user.createdAt)}</td>
                    <td>
                      {isDeleted ? (
                        <span className="admin-badge danger">
                          {t('admin.users.deletedBadge')}
                        </span>
                      ) : (
                        <span className={`admin-badge ${statusBadgeTone[user.status]}`}>
                          {t(`admin.users.status.${user.status}`)}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="admin-role-save-row">
                        <label className="admin-role-picker">
                          <span className="sr-only">{t('admin.users.changeRole')}</span>
                          <select
                            value={draft}
                            disabled={
                              updatingId === user.id ||
                              isDeleted ||
                              (!isSuper && user.role === 'SUPER_ADMIN')
                            }
                            onChange={(e) =>
                              setDraftRoles((prev) => ({
                                ...prev,
                                [user.id]: e.target.value as UserRole,
                              }))
                            }
                          >
                            <option value="LEARNER">{t('domain.roles.learner')}</option>
                            <option value="ADMIN">{t('domain.roles.moderator')}</option>
                            {isSuper && (
                              <option value="SUPER_ADMIN">{t('domain.roles.superAdmin')}</option>
                            )}
                            {roles
                              .filter((r) => !r.isSystem)
                              .map((r) => (
                                <option key={r.id} value={r.key}>
                                  {r.name || r.key}
                                </option>
                              ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          className="btn-next admin-btn"
                          disabled={!dirty || updatingId === user.id}
                          onClick={() => void saveRole(user)}
                        >
                          {updatingId === user.id ? (
                            <>
                              <Loader2 size={14} className="spin" /> {t('admin.users.updating')}
                            </>
                          ) : (
                            t('admin.users.saveRole')
                          )}
                        </button>
                        {rowFeedback === 'success' && (
                          <span className="form-success admin-inline-status">
                            <Check size={14} /> {t('admin.users.roleUpdated')}
                          </span>
                        )}
                        {rowFeedback === 'error' && (
                          <span className="form-error admin-inline-status">
                            <X size={14} /> {t('admin.users.roleError')}
                          </span>
                        )}
                      </div>
                      <div className="admin-role-save-row">
                        {canManageStatus(user) &&
                          (user.status === 'ACTIVE' ? (
                            <>
                              <button
                                type="button"
                                className="btn-next admin-btn"
                                disabled={statusBusy}
                                onClick={() => {
                                  setStatusTarget({ user, status: 'SUSPENDED' });
                                  setStatusReason('');
                                  setStatusDialogError('');
                                }}
                              >
                                {t('admin.users.suspend')}
                              </button>
                              <button
                                type="button"
                                className="btn-next admin-btn"
                                disabled={statusBusy}
                                onClick={() => {
                                  setStatusTarget({ user, status: 'BANNED' });
                                  setStatusReason('');
                                  setStatusDialogError('');
                                }}
                              >
                                {t('admin.users.ban')}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="btn-next admin-btn"
                              disabled={statusBusy}
                              onClick={() => {
                                setStatusActivateUser(user);
                                setStatusReason('');
                                setStatusDialogError('');
                              }}
                            >
                              {t('admin.users.activate')}
                            </button>
                          ))}
                        {/* DB-4: soft-deleted accounts stay listed here (deleted /
                            all views) with the restore path that reverses them. */}
                        {canManageUsers && user.id !== me?.id && user.role !== 'SUPER_ADMIN' && (
                          isDeleted ? (
                            <button
                              type="button"
                              className="btn-next admin-btn"
                              disabled={restoreBusyId === user.id}
                              onClick={() => void applyRestore(user)}
                            >
                              {restoreBusyId === user.id ? (
                                <>
                                  <Loader2 size={14} className="spin" />{' '}
                                  {t('admin.users.restoring')}
                                </>
                              ) : (
                                <>
                                  <Undo2 size={14} /> {t('admin.users.restore')}
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-next admin-btn"
                              disabled={deleteBusy}
                              onClick={() => {
                                setDeleteTarget(user);
                                setDeleteReason('');
                                setDeleteDialogError('');
                              }}
                            >
                              <Trash2 size={14} /> {t('admin.users.softDelete')}
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                  {showAccess && (
                    <tr key={`${user.id}-access`}>
                      <td colSpan={6}>
                        <div className="admin-moderator-access">
                          <h3 className="admin-sub" style={{ marginTop: 0 }}>
                            {t('admin.users.accessFor', { name: user.name })}
                          </h3>
                          <AdminAccessMatrix
                            access={draftAccess[user.id] ?? defaultModeratorAccess()}
                            onChange={(next) =>
                              setDraftAccess((prev) => ({ ...prev, [user.id]: next }))
                            }
                          />
                          <button
                            type="button"
                            className="cta-primary"
                            style={{ marginTop: '0.75rem' }}
                            disabled={savingAccessId === user.id}
                            onClick={() => void saveAccess(user)}
                          >
                            {savingAccessId === user.id
                              ? t('admin.users.savingAccess')
                              : t('admin.users.saveAccess')}
                          </button>
                          {feedback[`access-${user.id}`] === 'success' && (
                            <p className="form-success">{t('admin.users.accessSaved')}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="admin-pagination">
        <button
          type="button"
          className="btn-next admin-btn"
          disabled={page <= 1 || loading}
          onClick={() => void load(page - 1)}
        >
          {t('admin.users.prev')}
        </button>
        <span>{t('admin.users.pageInfo', { page, total: totalPages })}</span>
        <button
          type="button"
          className="btn-next admin-btn"
          disabled={!hasNext || loading}
          onClick={() => void load(page + 1)}
        >
          {t('admin.users.next')}
        </button>
        <span className="admin-sub">{t('admin.users.total', { count: total })}</span>
      </div>

      {(statusTarget || statusActivateUser) && (
        <div
          className="modal-overlay active"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !statusBusy) {
              setStatusTarget(null);
              setStatusActivateUser(null);
            }
          }}
        >
          <div className="modal" role="dialog" aria-modal="true">
            {(() => {
              const user = statusActivateUser ?? statusTarget!.user;
              const nextStatus = statusActivateUser ? 'ACTIVE' : statusTarget!.status;
              return (
                <>
                  <h4>{t('admin.users.statusConfirmTitle')}</h4>
                  <p>
                    {t('admin.users.statusConfirmBody', {
                      name: user.name,
                      status: t(`admin.users.status.${nextStatus}`),
                    })}
                  </p>
                  {nextStatus !== 'ACTIVE' && (
                    <p className="form-error">{t('admin.users.statusConfirmWarning')}</p>
                  )}
                  <label className="form-field" style={{ width: '100%', textAlign: 'start' }}>
                    <span>{t('admin.users.statusReason')}</span>
                    <textarea
                      className="admin-input"
                      rows={3}
                      value={statusReason}
                      disabled={statusBusy}
                      placeholder={t('admin.users.statusReasonPlaceholder')}
                      onChange={(e) => setStatusReason(e.target.value)}
                    />
                  </label>
                  {statusDialogError && <p className="form-error">{statusDialogError}</p>}
                  <div
                    style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}
                  >
                    <button
                      type="button"
                      className="cta-primary"
                      disabled={statusBusy}
                      onClick={() => void applyUserStatus()}
                    >
                      {statusBusy ? (
                        <>
                          <Loader2 size={14} className="spin" /> {t('admin.users.updating')}
                        </>
                      ) : (
                        t('admin.users.statusConfirm')
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn-next admin-btn"
                      disabled={statusBusy}
                      onClick={() => {
                        setStatusTarget(null);
                        setStatusActivateUser(null);
                      }}
                    >
                      {t('admin.users.statusCancel')}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="modal-overlay active"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleteBusy) setDeleteTarget(null);
          }}
        >
          <div className="modal" role="dialog" aria-modal="true">
            <h4>{t('admin.users.softDeleteTitle')}</h4>
            <p>{t('admin.users.softDeleteBody', { name: deleteTarget.name })}</p>
            <p className="form-error">{t('admin.users.softDeleteWarning')}</p>
            <label className="form-field" style={{ width: '100%', textAlign: 'start' }}>
              <span>{t('admin.users.softDeleteReason')}</span>
              <textarea
                className="admin-input"
                rows={3}
                value={deleteReason}
                disabled={deleteBusy}
                placeholder={t('admin.users.softDeleteReasonPlaceholder')}
                onChange={(e) => setDeleteReason(e.target.value)}
              />
            </label>
            {deleteDialogError ? <p className="form-error">{deleteDialogError}</p> : null}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button
                type="button"
                className="cta-primary"
                disabled={deleteBusy}
                onClick={() => void applySoftDelete()}
              >
                {deleteBusy ? (
                  <>
                    <Loader2 size={14} className="spin" />{' '}
                    {t('admin.users.softDeleteWorking')}
                  </>
                ) : (
                  t('admin.users.softDeleteConfirm')
                )}
              </button>
              <button
                type="button"
                className="btn-next admin-btn"
                disabled={deleteBusy}
                onClick={() => setDeleteTarget(null)}
              >
                {t('admin.users.statusCancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
