'use client';

import type { CourseSummary, RoadmapResponse } from '@kia./shared';
import { Loader2, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useCart } from '@/context/CartProvider';
import { useLanguage } from '@/context/LanguageProvider';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { api, ApiError } from '@/lib/api';
import { moduleMessageKey } from '@/i18n/domain';

interface PurchaseSectionProps {
  roadmap: RoadmapResponse;
  onEnrollBundle: () => void;
}

export function PurchaseSection({ roadmap, onEnrollBundle }: PurchaseSectionProps) {
  const router = useRouter();
  const { modules, pricing } = roadmap;
  const { t, format } = useLanguage();
  const { settings } = useSiteSettings();
  const { addCourse } = useCart();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [error, setError] = useState('');
  const [cartBusy, setCartBusy] = useState(false);

  const courseUnitPrice = settings.pricing.courseCents;

  useEffect(() => {
    api
      .listCourses()
      .then(setCourses)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : t('roadmap.purchase.coursesLoadError'));
      })
      .finally(() => setLoadingCourses(false));
  }, [t]);

  const selectedSlugs = useMemo(() => [...selected], [selected]);
  const selectedTotal = selectedSlugs.length * courseUnitPrice;

  const toggleCourse = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const purchaseSelected = () => {
    if (!selectedSlugs.length) {
      setError(t('roadmap.purchase.selectAtLeastOne'));
      return;
    }
    const params = new URLSearchParams({
      product: 'COURSE',
      slugs: selectedSlugs.join(','),
    });
    router.push(`/checkout?${params.toString()}`);
  };

  const addSelectedToCart = async () => {
    if (!selectedSlugs.length) {
      setError(t('roadmap.purchase.selectAtLeastOne'));
      return;
    }
    setError('');
    setCartBusy(true);
    try {
      for (const slug of selectedSlugs) {
        try {
          await addCourse(slug);
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) {
            continue;
          }
          throw err;
        }
      }
      router.push('/cart');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('cart.addError'));
    } finally {
      setCartBusy(false);
    }
  };

  return (
    <>
      <div className="purchase-head">
        <h3>{t('roadmap.purchase.head')}</h3>
        <p>{t('roadmap.purchase.sub')}</p>
      </div>
      <div className="purchase-grid">
        <div className="p-card outline">
          <h4>{t('roadmap.purchase.courses.title')}</h4>
          <p className="p-desc">{t('roadmap.purchase.courses.desc')}</p>

          {loadingCourses ? (
            <p className="auth-sub">
              <Loader2 size={16} className="spin" /> {t('roadmap.purchase.coursesLoading')}
            </p>
          ) : courses.length === 0 ? (
            <p className="auth-sub">{t('roadmap.purchase.coursesEmpty')}</p>
          ) : (
            <>
              <div className="course-picker-list">
                {courses.map((course) => {
                  const isSelected = selected.has(course.slug);
                  return (
                    <label
                      key={course.id}
                      className={`course-picker-item${isSelected ? ' selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCourse(course.slug)}
                      />
                      <span>{course.icon || '📘'}</span>
                      <span>{course.title}</span>
                      <span className="course-picker-meta">{format.currency(courseUnitPrice)}</span>
                    </label>
                  );
                })}
              </div>
              {selectedSlugs.length > 0 && (
                <div className="course-picker-total">
                  <span>{t('roadmap.purchase.coursesSelected', { count: selectedSlugs.length })}</span>
                  <span>{format.currency(selectedTotal)}</span>
                </div>
              )}
            </>
          )}

          {error && <p className="form-error">{error}</p>}

          <button
            type="button"
            className="btn-fill-full"
            onClick={() => void addSelectedToCart()}
            disabled={loadingCourses || selectedSlugs.length === 0 || cartBusy}
            style={{ marginBottom: '0.5rem' }}
          >
            {cartBusy ? <Loader2 size={16} className="spin" /> : <ShoppingCart size={16} />}{' '}
            {t('cart.add')}
          </button>
          <button
            type="button"
            className="btn-outline-full"
            onClick={purchaseSelected}
            disabled={loadingCourses || selectedSlugs.length === 0 || cartBusy}
          >
            {t('roadmap.purchase.courses.cta')}
          </button>
        </div>
        <div className="p-card highlight">
          <span className="badge-rec">{t('roadmap.purchase.bundle.badge')}</span>
          <h4>{t('roadmap.purchase.bundle.title')}</h4>
          <p className="p-desc">{t('roadmap.purchase.bundle.desc')}</p>
          {modules.map((m, i) => (
            <div key={m} className="course-mini">
              <span className="mname">{t(moduleMessageKey(m))}</span>
              <span className="mprice">{format.currency(pricing.individual[i])}</span>
            </div>
          ))}
          <ul className="feature-list">
            <li>{t('roadmap.purchase.bundle.feature1')}</li>
            <li>{t('roadmap.purchase.bundle.feature2')}</li>
            <li>{t('roadmap.purchase.bundle.feature3')}</li>
            <li>{t('roadmap.purchase.bundle.feature4')}</li>
          </ul>
          <div className="price-row">
            <span className="price-strike">{format.currency(pricing.total)}</span>
            <span className="price-final">{format.currency(pricing.discounted)}</span>
          </div>
          <div className="price-sub">{t('roadmap.purchase.bundle.priceSub')}</div>
          <button type="button" className="btn-fill-full" onClick={onEnrollBundle}>
            {t('roadmap.purchase.bundle.cta')}
          </button>
        </div>
      </div>
    </>
  );
}
