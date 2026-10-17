'use client';

import { scoreFizzBuzz } from '@kia./shared';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useApp } from '@/context/AppProvider';
import { useLanguage } from '@/context/LanguageProvider';

const INITIAL_SECONDS = 15 * 60;
const DEFAULT_CODE = `function fizzbuzz(n) {
  
}`;

export default function ChallengePage() {
  return (
    <RequireAuth nextPath="/bootcamp/challenge">
      <ChallengeContent />
    </RequireAuth>
  );
}

function ChallengeContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const { submitChallenge, modal } = useApp();
  const [code, setCode] = useState(DEFAULT_CODE);
  const [seconds, setSeconds] = useState(INITIAL_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevModal = useRef(modal);

  const liveScore = scoreFizzBuzz(code);

  const updateCountdown = useCallback(() => {
    setSeconds((s) => {
      if (s <= 1) {
        if (timerRef.current) clearInterval(timerRef.current);
        return 0;
      }
      return s - 1;
    });
  }, []);

  useEffect(() => {
    setSeconds(INITIAL_SECONDS);
    timerRef.current = setInterval(updateCountdown, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [updateCountdown]);

  useEffect(() => {
    if (prevModal.current && !modal) {
      router.push('/rewards');
    }
    prevModal.current = modal;
  }, [modal, router]);

  const handleSubmit = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    await submitChallenge(code);
  };

  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  const exampleLines = t('bootcamp.solver.examples').split(' / ');

  return (
    <div className="page-content">
      <div className="container challenge-shell">
        <div className="ch-top">
          <div
            className="timer-box"
            style={{ color: seconds < 60 ? 'var(--indigo-bright)' : 'var(--amber)' }}
          >
            {m}:{s}
          </div>
        </div>
        <div className="ch-grid">
          <div className="problem-panel">
            <h3>{t('bootcamp.solver.title')}</h3>
            <p>{t('bootcamp.solver.prompt')}</p>
            <div className="example-box" dir="ltr">
              {exampleLines.map((line, i) => (
                <span key={line}>
                  {line}
                  {i < exampleLines.length - 1 ? <br /> : null}
                </span>
              ))}
            </div>
          </div>
          <div className="editor-panel">
            <textarea
              className="code-editor"
              dir="ltr"
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <div className="score-preview">
              <span className="sp-label">{t('bootcamp.solver.liveScore')}</span>
              <span className="sp-val">{liveScore}%</span>
            </div>
            <button type="button" className="submit-btn" onClick={handleSubmit}>
              {t('bootcamp.solver.submit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
