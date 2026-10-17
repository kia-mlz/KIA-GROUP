'use client';

import { SWAP_STEPS } from '@kia./shared';
import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageProvider';
import { usePointerReorder } from '@/lib/pointerDrag';

interface ReorderTaskProps {
  onComplete: (correct: number, total: number) => void;
}

function shuffle<T>(arr: readonly T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function ReorderTask({ onComplete }: ReorderTaskProps) {
  const { t } = useLanguage();
  const correctOrder = SWAP_STEPS;
  const [items, setItems] = useState<string[]>(() => shuffle(correctOrder));
  const { listRef, bindItem } = usePointerReorder(items, setItems);

  const checkOrder = useCallback(() => {
    const correctCount = items.filter((s, i) => s === correctOrder[i]).length;
    onComplete(correctCount, correctOrder.length);
  }, [items, correctOrder, onComplete]);

  useEffect(() => {
    checkOrder();
  }, [checkOrder]);

  return (
    <>
      <div className="m-title">{t('readiness.reorder.title')}</div>
      <div className="m-desc">{t('readiness.reorder.desc')}</div>
      <div className="panel">
        <ul className="reorder-list" ref={listRef}>
          {items.map((step, i) => {
            const itemProps = bindItem(i);
            return (
              <li key={step} {...itemProps}>
                <span className="r-num">{i + 1}</span>
                {t(`readiness.reorder.${step}`)}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
