'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import type { UserRole } from '@kia./shared';
import { useAuth } from '@/context/AuthProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';

export default function AdminCreateUserPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user: me } = useAuth();
  const isSuper = me?.role === 'SUPER_ADMIN';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('LEARNER');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.adminCreateUser({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        role,
      });
      router.push('/admin/users');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('admin.users.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-content">
      <h1>{t('admin.users.createTitle')}</h1>
      <p className="admin-sub">{t('admin.users.createSub')}</p>

      <form className="admin-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>{t('admin.users.fieldName')}</span>
          <input
            className="admin-input"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </label>
        <label className="form-field">
          <span>{t('admin.users.fieldEmail')}</span>
          <input
            className="admin-input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="form-field">
          <span>{t('admin.users.fieldPhone')}</span>
          <input
            className="admin-input"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </label>
        <label className="form-field">
          <span>{t('admin.users.fieldPassword')}</span>
          <input
            className="admin-input"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label className="form-field">
          <span>{t('admin.users.fieldRole')}</span>
          <select
            className="admin-select"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            <option value="LEARNER">{t('domain.roles.learner')}</option>
            <option value="ADMIN">{t('domain.roles.moderator')}</option>
            {isSuper && (
              <option value="SUPER_ADMIN">{t('domain.roles.superAdmin')}</option>
            )}
          </select>
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="cta-primary" disabled={submitting}>
          {submitting ? t('admin.users.creating') : t('admin.users.create')}
        </button>
      </form>
    </div>
  );
}
