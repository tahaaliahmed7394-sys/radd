import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Package, Search, ShoppingBag } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Avatar } from '../components/Avatar';
import { Badge, EmptyState } from '../components/ui/Controls';
import { Modal } from '../components/ui/Modal';
import { useAppStore } from '../store/app';
import { useSettingsStore } from '../store/settings';
import { pushToast } from '../store/notifications';
import type { Order, OrderStatus } from '../data/types';
import { formatDateLabel, formatInt, formatMoney, formatTimeLabel, dateKey } from '../utils/date';
import { normalizeArabic } from '../utils/text';

const STATUSES: OrderStatus[] = ['new', 'preparing', 'delivered', 'cancelled'];

const TONE: Record<OrderStatus, 'primary' | 'warning' | 'success' | 'danger'> = {
  new: 'primary',
  preparing: 'warning',
  delivered: 'success',
  cancelled: 'danger',
};

export function Orders() {
  const { t } = useTranslation();
  const businesses = useAppStore((state) => state.businesses);
  const activeBusinessId = useAppStore((state) => state.activeBusinessId);
  const orders = useAppStore((state) => state.orders);
  const customers = useAppStore((state) => state.customers);
  const updateOrderStatus = useAppStore((state) => state.updateOrderStatus);
  const language = useSettingsStore((state) => state.language);
  const numerals = useSettingsStore((state) => state.numerals);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | OrderStatus>('all');
  const [detail, setDetail] = useState<Order | null>(null);

  const business = businesses.find((item) => item.id === activeBusinessId) ?? null;
  const customerOf = (id: number) => customers.find((customer) => customer.id === id);

  const filtered = useMemo(() => {
    const term = normalizeArabic(search);
    return orders
      .filter((order) => order.businessId === activeBusinessId)
      .filter((order) => {
        if (filter !== 'all' && order.status !== filter) return false;
        if (!term) return true;
        const customer = customerOf(order.customerId);
        return (
          String(order.id).includes(term) ||
          normalizeArabic(customer?.name ?? '').includes(term) ||
          normalizeArabic(order.phone).includes(term)
        );
      })
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, activeBusinessId, filter, search, customers]);

  const changeStatus = (order: Order, status: OrderStatus) => {
    updateOrderStatus(order.id, status);
    pushToast('success', t('orders.updateSuccess'));
    if (detail?.id === order.id) setDetail({ ...order, status });
  };

  if (!business) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm font-bold text-ink">{t('business.noBusiness')}</p>
        <p className="mt-1 text-xs text-muted">{t('business.noBusinessHint')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        title={t('orders.title')}
        subtitle={t('orders.subtitle')}
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-warning/10 px-3 py-2 text-xs font-semibold text-warning">
            <ShoppingBag className="h-4 w-4" aria-hidden />
            {formatInt(
              orders.filter((order) => order.businessId === activeBusinessId && order.status === 'new').length,
              numerals,
            )}{' '}
            {t('status.new')}
          </span>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('orders.searchPlaceholder')}
              aria-label={t('orders.searchAria')}
              className="field min-h-[44px] ps-9"
            />
          </div>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as 'all' | OrderStatus)}
            aria-label={t('orders.filterAria')}
            className="field min-h-[44px] sm:w-44"
          >
            <option value="all">{t('orders.allStatuses')}</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`status.${status}`)}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Package className="h-6 w-6" aria-hidden />}
            title={t('orders.empty')}
            hint={t('orders.emptyHint')}
          />
        ) : (
          <>
            <div className="hidden grid-cols-[70px_1.2fr_0.8fr_0.9fr_1fr_0.9fr_44px] gap-2 border-b border-line px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted lg:grid">
              <span>{t('orders.order')}</span>
              <span>{t('orders.customer')}</span>
              <span>{t('orders.items')}</span>
              <span>{t('orders.total')}</span>
              <span>{t('common.status')}</span>
              <span>{t('common.date')}</span>
              <span />
            </div>
            <ul className="divide-y divide-line">
              {filtered.map((order) => {
                const customer = customerOf(order.customerId);
                return (
                  <li
                    key={order.id}
                    className="grid gap-2 px-3 py-3 transition hover:bg-surface2/60 lg:grid-cols-[70px_1.2fr_0.8fr_0.9fr_1fr_0.9fr_44px] lg:items-center"
                  >
                    <span className="flex items-center justify-between gap-2 lg:block">
                      <span className="text-xs font-extrabold tabular-nums text-ink">#{order.id}</span>
                      <span className="lg:hidden">
                        <Badge tone={TONE[order.status]}>{t(`status.${order.status}`)}</Badge>
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Avatar name={customer?.name ?? '—'} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-ink">{customer?.name ?? '—'}</span>
                        <span className="block truncate text-[10px] text-muted" dir="ltr">
                          {order.phone}
                        </span>
                      </span>
                    </span>
                    <span className="text-xs text-muted">
                      {t('orders.itemCount', { count: order.items.length })}
                    </span>
                    <span className="text-xs font-extrabold tabular-nums text-ink">
                      {formatMoney(order.total, numerals, language)}
                    </span>
                    <span className="hidden lg:block">
                      <select
                        value={order.status}
                        onChange={(event) => changeStatus(order, event.target.value as OrderStatus)}
                        aria-label={t('orders.statusAria')}
                        className="field field-sm min-h-[36px] font-semibold"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {t(`status.${status}`)}
                          </option>
                        ))}
                      </select>
                    </span>
                    <span className="text-[11px] text-muted">
                      {formatDateLabel(new Date(order.createdAt), language, numerals, {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <span className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setDetail(order)}
                        aria-label={t('orders.viewDetails')}
                        title={t('orders.viewDetails')}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface2 hover:text-ink"
                      >
                        <Eye className="h-4 w-4" aria-hidden />
                      </button>
                    </span>
                    <span className="lg:hidden">
                      <select
                        value={order.status}
                        onChange={(event) => changeStatus(order, event.target.value as OrderStatus)}
                        aria-label={t('orders.statusAria')}
                        className="field field-sm min-h-[40px] w-full font-semibold"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {t(`status.${status}`)}
                          </option>
                        ))}
                      </select>
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <p className="mt-3 rounded-xl bg-surface2/70 px-3 py-2 text-[11px] leading-relaxed text-muted">
        {t('orders.paymentNote')}
      </p>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail ? t('orders.orderNumber', { id: detail.id }) : t('orders.details')}
        description={detail ? customerOf(detail.customerId)?.name : undefined}
        size="lg"
        footer={
          detail && (
            <ButtonClose onClose={() => setDetail(null)} />
          )
        }
      >
        {detail && <OrderDetails order={detail} onStatus={changeStatus} />}
      </Modal>
    </div>
  );
}

function ButtonClose({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClose}
      className="min-h-[44px] rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface2"
    >
      {t('common.close')}
    </button>
  );
}

function OrderDetails({
  order,
  onStatus,
}: {
  order: Order;
  onStatus: (order: Order, status: OrderStatus) => void;
}) {
  const { t } = useTranslation();
  const language = useSettingsStore((state) => state.language);
  const numerals = useSettingsStore((state) => state.numerals);
  const customers = useAppStore((state) => state.customers);
  const customer = customers.find((item) => item.id === order.customerId);
  const isToday = dateKey(new Date(order.createdAt)) === dateKey(new Date());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={TONE[order.status]}>{t(`status.${order.status}`)}</Badge>
        <span className="text-xs text-muted">
          {isToday ? t('common.today') : formatDateLabel(new Date(order.createdAt), language, numerals, { day: 'numeric', month: 'long', year: 'numeric' })}
          {' · '}
          {formatTimeLabel(
            `${String(new Date(order.createdAt).getHours()).padStart(2, '0')}:${String(new Date(order.createdAt).getMinutes()).padStart(2, '0')}`,
            language,
            numerals,
          )}
        </span>
        <select
          value={order.status}
          onChange={(event) => onStatus(order, event.target.value as OrderStatus)}
          aria-label={t('orders.statusAria')}
          className="field field-sm ms-auto min-h-[38px] w-auto font-semibold"
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`status.${status}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-line">
        <table className="w-full text-xs">
          <thead className="bg-surface2 text-muted">
            <tr>
              <th className="px-3 py-2 text-start font-bold">{t('orders.item')}</th>
              <th className="px-3 py-2 text-center font-bold">{t('orders.qty')}</th>
              <th className="px-3 py-2 text-end font-bold">{t('orders.unitPrice')}</th>
              <th className="px-3 py-2 text-end font-bold">{t('common.total')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {order.items.map((item) => (
              <tr key={item.productId}>
                <td className="px-3 py-2 font-semibold text-ink">{item.name}</td>
                <td className="px-3 py-2 text-center tabular-nums">{formatInt(item.qty, numerals)}</td>
                <td className="px-3 py-2 text-end tabular-nums">{formatMoney(item.price, numerals, language)}</td>
                <td className="px-3 py-2 text-end font-bold tabular-nums">{formatMoney(item.price * item.qty, numerals, language)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-primary-soft/40">
            <tr>
              <td colSpan={3} className="px-3 py-2 text-end text-xs font-bold text-ink">
                {t('common.total')}
              </td>
              <td className="px-3 py-2 text-end text-sm font-extrabold tabular-nums text-ink">
                {formatMoney(order.total, numerals, language)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <dl className="grid gap-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-bold text-muted">{t('orders.customer')}</dt>
          <dd className="mt-0.5 font-semibold text-ink">{customer?.name ?? '—'}</dd>
        </div>
        <div>
          <dt className="font-bold text-muted">{t('orders.deliveryPhone')}</dt>
          <dd className="mt-0.5 font-semibold text-ink" dir="ltr">
            {order.phone}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-bold text-muted">{t('orders.address')}</dt>
          <dd className="mt-0.5 leading-relaxed text-ink">{order.address}</dd>
        </div>
      </dl>

      <p className="rounded-lg bg-surface2 px-3 py-2 text-[11px] text-muted">{t('orders.paymentNote')}</p>
    </div>
  );
}
