'use client';

import type { SiteAdminAccessSettings } from '@kia./shared';
import { useLanguage } from '@/context/LanguageProvider';

export function AdminAccessMatrix({
  access,
  onChange,
  disabled = false,
}: {
  access: SiteAdminAccessSettings;
  onChange: (access: SiteAdminAccessSettings) => void;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  const keys: Array<keyof SiteAdminAccessSettings> = [
    'stats',
    'settings',
    'courses',
    'challenges',
    'users',
    'payments',
    'discounts',
    'tests',
    'tickets',
    'messages',
    'competitions',
    'audit',
  ];
  const levels = ['view', 'manage', 'edit'] as const;

  const toggle = (
    section: keyof SiteAdminAccessSettings,
    level: (typeof levels)[number],
    checked: boolean,
  ) => {
    const current = access[section];
    const next = { ...current, [level]: checked };
    if (checked && (level === 'manage' || level === 'edit')) {
      next.view = true;
    }
    if (!checked && level === 'view') {
      next.manage = false;
      next.edit = false;
    }
    onChange({
      ...access,
      [section]: next,
    });
  };

  return (
    <div className="admin-access-fields">
      <div className="admin-table-wrap">
        <table className="admin-perm-table">
          <thead>
            <tr>
              <th>{t('admin.settings.adminAccess.sectionCol')}</th>
              {levels.map((level) => (
                <th key={level}>{t(`admin.settings.adminAccess.level.${level}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr key={key}>
                <td>{t(`admin.settings.adminAccess.${key}`)}</td>
                {levels.map((level) => (
                  <td key={level}>
                    <label className="admin-access-toggle">
                      <input
                        type="checkbox"
                        checked={access[key][level]}
                        disabled={disabled}
                        onChange={(e) => toggle(key, level, e.target.checked)}
                      />
                      <span className="sr-only">
                        {t(`admin.settings.adminAccess.${key}`)} —{' '}
                        {t(`admin.settings.adminAccess.level.${level}`)}
                      </span>
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
