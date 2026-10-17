'use client';

import Link from 'next/link';
import { Check, Loader2, Lock, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  createDefaultSiteSettings,
  normalizeAdminAccess,
  type AdminRole,
  type SiteAdminAccessSettings,
} from '@kia./shared';
import { AdminAccessMatrix } from '@/components/admin/AdminAccessMatrix';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';

const defaultAccess = () => normalizeAdminAccess(createDefaultSiteSettings().adminAccess);

interface RoleDraft {
  key: string;
  name: string;
  access: SiteAdminAccessSettings;
}

const emptyDraft = (): RoleDraft => ({
  key: '',
  name: '',
  access: defaultAccess(),
});

export default function AdminUserRolesPage() {
  const { t, format } = useLanguage();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<RoleDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<RoleDraft>(emptyDraft());
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null,
  );

  useEffect(() => {
    Promise.all([api.adminListRoles(), api.adminListUsers().catch(() => null)])
      .then(([roleList, userPage]) => {
        setRoles(roleList);
        const counts: Record<string, number> = {};
        for (const user of userPage?.items ?? []) {
          counts[user.role] = (counts[user.role] ?? 0) + 1;
        }
        setMemberCounts(counts);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t('admin.users.roleSaveError'));
      })
      .finally(() => setLoading(false));
  }, [t]);

  const systemRoles = useMemo(() => roles.filter((r) => r.isSystem), [roles]);
  const customRoles = useMemo(() => roles.filter((r) => !r.isSystem), [roles]);

  const roleLabel = (role: AdminRole): string =>
    role.isSystem && role.key === 'LEARNER'
      ? t('domain.roles.learner')
      : role.isSystem && role.key === 'ADMIN'
        ? t('domain.roles.moderator')
        : role.isSystem && role.key === 'SUPER_ADMIN'
          ? t('domain.roles.superAdmin')
          : role.name || role.key;

  const flash = (kind: 'success' | 'error', message: string) => {
    setFeedback({ kind, message });
    if (typeof window !== 'undefined') {
      window.setTimeout(() => setFeedback(null), 4000);
    }
  };

  const createRole = async () => {
    if (!draft.key.trim()) return;
    setSaving(true);
    setError('');
    try {
      const created = await api.adminCreateRole({
        key: draft.key.trim(),
        name: draft.name.trim() || draft.key.trim(),
        access: draft.access,
      });
      setRoles((prev) => [...prev, created]);
      setDraft(emptyDraft());
      setCreating(false);
      flash('success', t('admin.users.roleSaved'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.users.roleSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (role: AdminRole) => {
    setEditingId(role.id);
    setEditDraft({
      key: role.key,
      name: role.name,
      access: role.access ? normalizeAdminAccess(role.access) : defaultAccess(),
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSavingEdit(true);
    setError('');
    try {
      const updated = await api.adminUpdateRole(editingId, {
        name: editDraft.name.trim() || editDraft.key,
        access: editDraft.access,
      });
      setRoles((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
      setEditingId(null);
      flash('success', t('admin.users.roleSaved'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.users.roleSaveError'));
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteRole = async (role: AdminRole) => {
    if (!window.confirm(t('admin.users.roleDeleteConfirm', { name: role.name || role.key }))) {
      return;
    }
    setDeletingId(role.id);
    setError('');
    try {
      await api.adminDeleteRole(role.id);
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      flash('success', t('admin.users.roleDeleted'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.users.roleDeleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-content auth-loading">
        <Loader2 size={24} className="spin" /> {t('admin.users.rolesLoading')}
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="admin-header-row">
        <div>
          <h1>{t('admin.users.rolesTitle')}</h1>
          <p className="admin-sub">{t('admin.users.rolesSub')}</p>
        </div>
        <button type="button" className="cta-primary" onClick={() => setCreating((v) => !v)}>
          <Plus size={16} /> {t('admin.users.createRole')}
        </button>
      </div>

      {feedback && (
        <p className={feedback.kind === 'success' ? 'form-success' : 'form-error'}>
          {feedback.kind === 'success' ? <Check size={14} /> : <X size={14} />} {feedback.message}
        </p>
      )}
      {error && <p className="form-error">{error}</p>}

      {creating && (
        <article className="admin-card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ marginTop: 0 }}>{t('admin.users.createRoleTitle')}</h2>
          <div className="admin-toolbar">
            <label className="form-field" style={{ flex: '1 1 180px' }}>
              <span>{t('admin.users.roleKeyLabel')}</span>
              <input
                className="admin-input"
                dir="ltr"
                value={draft.key}
                placeholder={t('admin.users.roleKeyPlaceholder')}
                onChange={(e) => setDraft((d) => ({ ...d, key: e.target.value }))}
              />
            </label>
            <label className="form-field" style={{ flex: '1 1 180px' }}>
              <span>{t('admin.users.roleNameLabel')}</span>
              <input
                className="admin-input"
                value={draft.name}
                placeholder={t('admin.users.roleNamePlaceholder')}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </label>
          </div>
          <h3 className="admin-sub">{t('admin.users.accessTitle')}</h3>
          <p className="admin-sub">{t('admin.users.accessHint')}</p>
          <AdminAccessMatrix
            access={draft.access}
            onChange={(access) => setDraft((d) => ({ ...d, access }))}
          />
          <div className="admin-role-save-row" style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              className="cta-primary"
              disabled={saving || !draft.key.trim()}
              onClick={() => void createRole()}
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="spin" /> {t('admin.users.savingAccess')}
                </>
              ) : (
                t('admin.users.save')
              )}
            </button>
            <button
              type="button"
              className="btn-next admin-btn"
              onClick={() => {
                setCreating(false);
                setDraft(emptyDraft());
              }}
            >
              {t('admin.users.cancel')}
            </button>
          </div>
        </article>
      )}

      <h2>{t('admin.users.rolesSystem')}</h2>
      <p className="admin-sub">{t('admin.users.rolesSystemSub')}</p>
      <div className="admin-grid admin-grid-3" style={{ marginBottom: '1.5rem' }}>
        {systemRoles.map((role) => (
          <article className="admin-card" key={role.id}>
            <div className="admin-stat-row" style={{ marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0 }}>{roleLabel(role)}</h3>
              <span className="admin-stat-icon">
                <Lock size={16} />
              </span>
            </div>
            <p className="admin-sub" style={{ marginBottom: 0 }}>
              {role.key === 'ADMIN'
                ? t('admin.users.roleModeratorDesc')
                : role.key === 'SUPER_ADMIN'
                  ? t('admin.users.roleSuperDesc')
                  : t('admin.users.roleLearnerDesc')}
            </p>
          </article>
        ))}
      </div>

      <h2>{t('admin.users.rolesCustom')}</h2>
      {customRoles.length === 0 ? (
        <p className="admin-sub">{t('admin.users.rolesNoCustom')}</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.users.roleKeyName')}</th>
                <th>{t('admin.users.roleName')}</th>
                <th>{t('admin.users.roleMembers')}</th>
                <th>{t('admin.users.roleActions')}</th>
              </tr>
            </thead>
            <tbody>
              {customRoles.map((role) => {
                const members = memberCounts[role.key] ?? 0;
                const isEditing = editingId === role.id;
                return (
                  <tr key={role.id}>
                    <td dir="ltr">{role.key}</td>
                    <td>
                      {isEditing ? (
                        <input
                          className="admin-input"
                          value={editDraft.name}
                          placeholder={t('admin.users.roleNamePlaceholder')}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, name: e.target.value }))
                          }
                        />
                      ) : (
                        role.name
                      )}
                    </td>
                    <td>
                      <span className={`admin-badge${members > 0 ? ' ok' : ''}`}>
                        {members > 0
                          ? t('admin.users.roleHasMembers')
                          : t('admin.users.roleNoMembers')}
                      </span>
                      <span className="admin-sub"> ({format.number(members)})</span>
                    </td>
                    <td>
                      <div className="admin-role-save-row">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              className="btn-next admin-btn"
                              disabled={savingEdit}
                              onClick={() => void saveEdit()}
                            >
                              {savingEdit ? (
                                <Loader2 size={14} className="spin" />
                              ) : (
                                t('admin.users.save')
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn-next admin-btn"
                              onClick={() => setEditingId(null)}
                            >
                              {t('admin.users.cancel')}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn-next admin-btn"
                              aria-label={t('admin.users.roleEdit')}
                              onClick={() => startEdit(role)}
                            >
                              <Pencil size={14} /> {t('admin.users.roleEdit')}
                            </button>
                            <button
                              type="button"
                              className="btn-next admin-btn"
                              aria-label={t('admin.users.roleDelete')}
                              disabled={deletingId === role.id}
                              onClick={() => void deleteRole(role)}
                            >
                              {deletingId === role.id ? (
                                <Loader2 size={14} className="spin" />
                              ) : (
                                <>
                                  <Trash2 size={14} /> {t('admin.users.roleDelete')}
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editingId && (
        <article className="admin-card" style={{ marginTop: '1.5rem' }}>
          <h2 style={{ marginTop: 0 }}>
            {t('admin.users.editRoleTitle')} — {editDraft.key}
          </h2>
          <h3 className="admin-sub">{t('admin.users.accessTitle')}</h3>
          <p className="admin-sub">{t('admin.users.accessHint')}</p>
          <AdminAccessMatrix
            access={editDraft.access}
            onChange={(access) => setEditDraft((d) => ({ ...d, access }))}
          />
        </article>
      )}

      <p className="admin-sub">{t('admin.users.rolesHint')}</p>
      <Link href="/admin/users" className="cta-primary">
        {t('admin.users.openUsers')}
      </Link>
    </div>
  );
}
