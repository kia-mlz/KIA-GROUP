'use client';

import {
  evaluatePasswordRequirements,
  PASSWORD_REQUIREMENTS,
  type PasswordRequirement,
} from '@kia./shared';
import { Check, X } from 'lucide-react';

type PasswordStrengthCheckerProps = {
  password: string;
  labels: Record<PasswordRequirement['id'], string>;
  title: string;
};

export function PasswordStrengthChecker({
  password,
  labels,
  title,
}: PasswordStrengthCheckerProps) {
  const results = evaluatePasswordRequirements(password);

  return (
    <div className="password-strength" aria-live="polite">
      <p className="password-strength__title">{title}</p>
      <ul className="password-strength__list">
        {PASSWORD_REQUIREMENTS.map((req) => {
          const ok = results[req.id];
          return (
            <li
              key={req.id}
              className={`password-strength__item${ok ? ' is-ok' : ' is-fail'}`}
            >
              {ok ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}
              <span>{labels[req.id]}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
