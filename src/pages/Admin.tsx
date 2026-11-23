import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, CalendarClock, PauseCircle, PlayCircle, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Badge, Field, SegmentedControl, TextInput } from '../components/ui/Controls';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useAppStore } from '../store/app';
import { useSettingsStore } from '../store/settings';
import { pushToast } from '../store/notifications';
import { formatDateLabel, formatInt, fromDateKey } from '../utils/date';
import type { Business, PlanStatus } from '../data/types';

const PLAN_TONES: Record<PlanStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  trial: 'warning',
  paused: 'neutral',
};

export function Admin() {
  const { t } = useTranslation();
  const businesses = useAppStore((s) => s.businesses);
  const conversations = useAppStore((s) => s.conversations);
  const appointments = useAppStore((s) => s.appointments);
  const orders = useAppStore((s) => s.orders);
  const updateBusiness = useAppStore((s) => s.updateBusiness);
  const language = useSettingsStore((s) => s.language);
  const numerals = useSettingsStore((s) => s.numerals);
  const [selected, setSelected] = useState<Business | null>(null);
  const [plan, setPlan] = useState<PlanStatus>('trial');

  const rows = useMemo(() => {
    return businesses.map((b) => ({
      business: b,
      conversations: conversations.filter((c) => c.businessId === b.id).length,
      appointments: appointments.filter((a) => a.businessId === b.id).length,
      orders: orders.filter((o) => o.businessId === b.id).length,
    }));
  }, [appointments, businesses, conversations, orders]);

  const counts = useMemo(() => {
    return {
      total: businesses.length,
      active: businesses.filter((b) => b.plan === 'active').length,
      trial: businesses.filter((b) => b.plan === 'trial').length,
      paused: businesses.filter((b) => b.plan === 'paused').length,
    };
  }, [businesses]);

  const openPlan = (business: Business) => {
    setSelected(business);
    setPlan(business.plan);
  };

  const savePlan = () => {
    if (!selected) return;
    updateBusiness(selected.id, { plan });
    pushToast('success', t('admin.planUpdated'));
    setSelected(null);
  };

  const planLabel = (value: PlanStatus) =>
    value === 'active' ? t('admin.planActive') : value === 'trial' ? t('admin.planTrial') : t('admin.planPaused');

  return (
    <div className="space-y-6">
      <PageHeader title={t('admin.title')} subtitle={t('admin.subtitle')} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary"><Building2 className="h-5 w-5" /></span>
            <div><p className="text-xs text-muted">{t('admin.totalBusinesses')}</p><p className="text-xl font-extrabold text-ink">{formatInt(counts.total, numerals)}</p></div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success"><PlayCircle className="h-5 w-5" /></span>
            <div><p className="text-xs text-muted">{t('admin.activeSubscriptions')}</p><p className="text-xl font-extrabold text-ink">{formatInt(counts.active, numerals)}</p></div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning"><CalendarClock className="h-5 w-5" /></span>
            <div><p className="text-xs text-muted">{t('admin.trialSubscriptions')}</p><p className="text-xl font-extrabold text-ink">{formatInt(counts.trial, numerals)}</p></div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface2 text-muted"><PauseCircle className="h-5 w-5" /></span>
            <div><p className="text-xs text-muted">{t('admin.pausedSubscriptions')}</p><p className="text-xl font-extrabold text-ink">{formatInt(counts.paused, numerals)}</p></div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-line px-5 py-4 text-sm text-muted">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>{t('admin.noMoney')}</span>
        </div>
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">{t('admin.emptyHint')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface2/60 text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">{t('admin.business')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('admin.plan')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('admin.renewal')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('admin.conversations')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('admin.appointments')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('admin.orders')}</th>
                  <th className="px-4 py-3 text-start font-semibold">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ business, conversations: c, appointments: a, orders: o }) => (
                  <tr key={business.id} className="border-t border-line align-middle">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink">{language === 'ar' ? business.name : business.nameEn}</div>
                      <div className="text-xs text-muted">{business.type}</div>
                    </td>
                    <td className="px-4 py-3"><Badge tone={PLAN_TONES[business.plan]}>{planLabel(business.plan)}</Badge></td>
                    <td className="px-4 py-3 text-muted">{formatDateLabel(fromDateKey(business.renewalAt.slice(0, 10)), language, numerals)}</td>
                    <td className="px-4 py-3">{formatInt(c, numerals)}</td>
                    <td className="px-4 py-3">{formatInt(a, numerals)}</td>
                    <td className="px-4 py-3">{formatInt(o, numerals)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => openPlan(business)}>
                        {t('admin.manage')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(selected)}
        title={t('admin.setPlan')}
        onClose={() => setSelected(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setSelected(null)}>{t('common.cancel')}</Button>
            <Button onClick={savePlan}>{t('common.save')}</Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {language === 'ar' ? selected.name : selected.nameEn}
            </p>
            <Field label={t('admin.plan')}>
              <SegmentedControl<PlanStatus>
                ariaLabel={t('admin.planAria', { name: language === 'ar' ? selected.name : selected.nameEn })}
                value={plan}
                onChange={setPlan}
                options={[
                  { value: 'trial', label: t('admin.planTrial') },
                  { value: 'active', label: t('admin.planActive') },
                  { value: 'paused', label: t('admin.planPaused') },
                ]}
              />
            </Field>
            <Field label={t('admin.renewalDate')}>
              <TextInput
                type="date"
                value={selected.renewalAt.slice(0, 10)}
                onChange={(e) => updateBusiness(selected.id, { renewalAt: `${e.target.value}T00:00:00.000Z` })}
              />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
