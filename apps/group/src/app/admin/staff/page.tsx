'use client';

import Link from 'next/link';
import { Loader2, ShieldCheck, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  isStaffRole,
  type AdminRole,
  type AdminUser,
  type UserRole,
} from '@kia./shared';
import { useAdminAccess } from '@/components/admin/useAdminAccess';
import { AdminErrorState } from '@/components/admin/AdminStates';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';

/**
 * Staff & managers — platform operators only (non-learner accounts).
 * Uses the real users API; no mock rows.
 */
export default function AdminStaffPage() {
  const { t, format } = useLanguage();
  const { can } = useAdminAccess();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [list, roleList] = await Promise.all([
        api.adminListUsers({ page: 1, limit: 100, deleted: 'active' }),
        api.adminListRoles().catch(() => [] as AdminRole[]),
      ]);
      setUsers(list.items.filter((user) => isStaffRole(user.role)));
      setRoles(roleList);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.users.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const roleNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const role of roles) map.set(role.key, role.name || role.key);
    return map;
  }, [roles]);

  const labelFor = (role: UserRole) => {
    if (role === 'SUPER_ADMIN') return t('domain.roles.superAdmin');
    if (role === 'ADMIN') return t('domain.roles.moderator');
    return roleNames.get(role) ?? role;
  };

  if (!can('users', 'view')) {
    return (
      <div className="admin-card">
        <AdminErrorState message={t('admin.departments.noAccess')} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-card" style={{ display: 'grid', placeItems: 'center', minHeight: '12rem' }}>
        <Loader2 className="spin" size={22} aria-hidden />
        <span className="admin-sub">{t('admin.users.loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-card">
        <AdminErrorState message={error} onRetry={() => void load()} />
      </div>
    );
  }

  return (
    <div className="am-hub">
      <section className="am-hub__head">
        <span className="am-dash__kicker">{t('admin.staff.kicker')}</span>
        <h2>{t('admin.staff.title')}</h2>
        <p>{t('admin.staff.sub')}</p>
        <div className="am-hub__foot" style={{ marginTop: '0.85rem' }}>
          {can('users', 'manage') || can('users', 'edit') ? (
            <Link href="/admin/users/create" className="am-hub__cta">
              <Users size={13} aria-hidden style={{ marginInlineEnd: '0.3rem' }} />
              {t('admin.staff.create')}
            </Link>
          ) : null}
          <Link href="/admin/users/roles" className="am-hub__ghost">
            <ShieldCheck size={13} aria-hidden style={{ marginInlineEnd: '0.3rem' }} />
            {t('admin.nav.roles')}
          </Link>
          <Link href="/admin/users" className="am-hub__ghost">
            {t('admin.nav.users')}
          </Link>
        </div>
      </section>

      <article className="admin-card admin-table-wrap">
        {users.length === 0 ? (
          <div className="admin-empty">
            <p>{t('admin.staff.empty')}</p>
            {(can('users', 'manage') || can('users', 'edit')) && (
              <Link href="/admin/users/create" className="btn-next admin-btn">
                {t('admin.staff.create')}
              </Link>
            )}
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.users.col.name')}</th>
                <th>{t('admin.users.col.email')}</th>
                <th>{t('admin.users.col.role')}</th>
                <th>{t('admin.users.col.status')}</th>
                <th>{t('admin.users.col.joined')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name || '—'}</td>
                  <td style={{ direction: 'ltr', textAlign: 'right' }}>{user.email}</td>
                  <td>
                    <span className="admin-badge">{labelFor(user.role)}</span>
                  </td>
                  <td>
                    <span
                      className={`admin-badge ${
                        user.status === 'ACTIVE'
                          ? 'ok'
                          : user.status === 'SUSPENDED'
                            ? 'warning'
                            : 'danger'
                      }`}
                    >
                      {t(`admin.users.status.${user.status}`)}
                    </span>
                  </td>
                  <td>{format.date(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </div>
  );
}
