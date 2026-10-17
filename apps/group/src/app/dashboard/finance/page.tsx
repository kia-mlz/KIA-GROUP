'use client';

import type { OrderResponse, PaymentResponse } from '@kia./shared';
import { CreditCard, FileText, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DashboardGate, PanelPage } from '@/components/dashboard/DashboardShell';
import { useLanguage } from '@/context/LanguageProvider';
import { api, ApiError } from '@/lib/api';

function productLabel(
  t: (key: string) => string,
  productType: PaymentResponse['productType'],
) {
  switch (productType) {
    case 'ROADMAP_BUNDLE':
      return t('panel.finance.product.roadmap');
    case 'COURSE':
      return t('panel.finance.product.course');
    case 'READINESS_TEST':
      return t('panel.finance.product.readiness');
    default:
      return productType;
  }
}

function orderStatusKey(status: OrderResponse['status']) {
  switch (status) {
    case 'PENDING':
      return 'panel.finance.orderStatus.pending';
    case 'AWAITING_PAYMENT':
      return 'panel.finance.orderStatus.awaitingPayment';
    case 'PAID':
      return 'panel.finance.orderStatus.paid';
    case 'FAILED':
      return 'panel.finance.orderStatus.failed';
    case 'CANCELLED':
      return 'panel.finance.orderStatus.cancelled';
    case 'REFUNDED':
      return 'panel.finance.orderStatus.refunded';
    default:
      return 'panel.finance.orderStatus.pending';
  }
}

function canRetry(order: OrderResponse) {
  return (
    order.status === 'FAILED' ||
    order.status === 'AWAITING_PAYMENT' ||
    order.paymentStatus === 'FAILED' ||
    order.paymentStatus === 'PENDING'
  );
}

async function downloadInvoice(
  orderId: string,
  invoiceNumber: string | null,
  formatCurrency: (value: number, currency?: string) => string,
) {
  const invoice = await api.getInvoice(orderId);
  const lines = invoice.lineItems
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.title)}</td><td>${item.quantity}</td><td>${escapeHtml(formatCurrency(item.unitPriceCents, invoice.currency))}</td><td>${escapeHtml(formatCurrency(item.finalPriceCents, invoice.currency))}</td></tr>`,
    )
    .join('');
  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(invoice.invoiceNumber)}</title>
<style>
  body { font-family: Tahoma, sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 1.25rem; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: start; }
  th { background: #f5f5f5; }
  .meta { margin: 4px 0; color: #444; font-size: 0.9rem; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>Invoice ${escapeHtml(invoice.invoiceNumber)}</h1>
  <p class="meta">${escapeHtml(invoice.buyerName)}</p>
  <p class="meta">${escapeHtml(invoice.buyerEmail || invoice.buyerPhone || '')}</p>
  <p class="meta">${escapeHtml(invoice.issuedAt)}</p>
  <table>
    <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
    <tbody>${lines}</tbody>
  </table>
  <p><strong>Subtotal:</strong> ${escapeHtml(formatCurrency(invoice.subtotalCents, invoice.currency))}</p>
  <p><strong>Discount:</strong> ${escapeHtml(formatCurrency(invoice.discountCents, invoice.currency))}</p>
  <p><strong>Total:</strong> ${escapeHtml(formatCurrency(invoice.totalCents, invoice.currency))}</p>
</body>
</html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${invoiceNumber || invoice.invoiceNumber || orderId}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export default function FinancePage() {
  const { t, format } = useLanguage();
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [invoiceBusyId, setInvoiceBusyId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [orderList, paymentList] = await Promise.all([api.myOrders(), api.myPayments()]);
      setOrders(orderList);
      setPayments(paymentList);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('panel.finance.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [t]);

  const handleRetry = async (orderId: string) => {
    setActionMsg('');
    setRetryingId(orderId);
    try {
      const payment = await api.retryPayment(orderId);
      if (payment.checkoutUrl) {
        window.location.href = payment.checkoutUrl;
        return;
      }
      const confirmed = await api.confirmPayment(payment.id);
      if (confirmed.status === 'COMPLETED') {
        setActionMsg(t('checkout.successInline'));
        await load();
      } else {
        setActionMsg(t('checkout.incomplete'));
      }
    } catch (err) {
      setActionMsg(err instanceof ApiError ? err.message : t('panel.finance.retryError'));
    } finally {
      setRetryingId(null);
    }
  };

  const handleInvoice = async (order: OrderResponse) => {
    setActionMsg('');
    setInvoiceBusyId(order.id);
    try {
      await downloadInvoice(order.id, order.invoiceNumber, format.currency);
    } catch (err) {
      setActionMsg(err instanceof ApiError ? err.message : t('panel.finance.invoiceError'));
    } finally {
      setInvoiceBusyId(null);
    }
  };

  return (
    <DashboardGate nextPath="/dashboard/finance">
      <PanelPage
        eyebrow={
          <>
            <CreditCard size={14} className="inline-leading-icon" />
            {t('panel.nav.finance')}
          </>
        }
        title={t('panel.finance.title')}
        sub={t('panel.finance.sub')}
      >
        {loading ? (
          <p className="auth-loading">
            <Loader2 size={18} className="spin" /> {t('common.loading')}
          </p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        {actionMsg ? <p className="form-success">{actionMsg}</p> : null}

        <section id="orders" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>
            {t('panel.finance.orders')}
          </h2>
          {!loading && !error && orders.length === 0 ? (
            <p className="panel-muted">{t('panel.finance.ordersEmpty')}</p>
          ) : null}
          <div className="panel-list">
            {orders.map((order) => (
              <div key={order.id} className="panel-row">
                <div className="panel-row__main">
                  <b>
                    {order.invoiceNumber || order.id.slice(0, 8)} · {t(orderStatusKey(order.status))}
                  </b>
                  <span>
                    {order.items.map((i) => i.title).join(' · ') || '—'}
                  </span>
                  <span>{format.date(order.createdAt)}</span>
                </div>
                <div className="panel-row__actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="mono ltr-isolate">{format.currency(order.totalCents)}</span>
                  {order.status === 'PAID' ? (
                    <button
                      type="button"
                      className="btn-outline-full"
                      style={{ width: 'auto', paddingInline: '0.75rem' }}
                      onClick={() => void handleInvoice(order)}
                      disabled={invoiceBusyId === order.id}
                    >
                      {invoiceBusyId === order.id ? (
                        <Loader2 size={14} className="spin" />
                      ) : (
                        <FileText size={14} />
                      )}{' '}
                      {t('panel.finance.invoice')}
                    </button>
                  ) : null}
                  {canRetry(order) && order.status !== 'PAID' ? (
                    <button
                      type="button"
                      className="btn-outline-full"
                      style={{ width: 'auto', paddingInline: '0.75rem' }}
                      onClick={() => void handleRetry(order.id)}
                      disabled={retryingId === order.id}
                    >
                      {retryingId === order.id ? (
                        <Loader2 size={14} className="spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}{' '}
                      {t('panel.finance.retry')}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="transactions">
          <h2 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>
            {t('panel.finance.transactions')}
          </h2>
          {!loading && !error && payments.length === 0 ? (
            <p className="panel-muted">{t('panel.finance.empty')}</p>
          ) : null}
          <div className="panel-list">
            {payments.map((payment) => (
              <div key={payment.id} className="panel-row">
                <div className="panel-row__main">
                  <b>{productLabel(t, payment.productType)}</b>
                  <span className="ltr-isolate mono">
                    {payment.productRef ? `${payment.productRef} · ` : ''}
                    {payment.id.slice(0, 8)}
                  </span>
                  <span>
                    {payment.createdAt ? format.date(payment.createdAt) : '—'} ·{' '}
                    {t(`panel.finance.status.${payment.status.toLowerCase()}`)}
                  </span>
                </div>
                <div className="panel-row__actions">
                  <span className="mono ltr-isolate">
                    {format.currency(payment.amountCents)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </PanelPage>
    </DashboardGate>
  );
}
