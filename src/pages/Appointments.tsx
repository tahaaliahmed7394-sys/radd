import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  UserPlus,
  X,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Badge, ConfirmDialog, Field, TextInput } from '../components/ui/Controls';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useAppStore } from '../store/app';
import { useSettingsStore } from '../store/settings';
import { pushToast } from '../store/notifications';
import type { Appointment } from '../data/types';
import {
  DAY_KEYS,
  addDays,
  dateKey,
  formatDateLabel,
  formatTimeLabel,
  fromDateKey,
  isBusinessOpenAt,
  slotsForDay,
  startOfWeekSaturday,
} from '../utils/date';
import { cn } from '../utils/text';

interface FormState {
  customerId: number | null;
  service: string;
  date: string;
  time: string;
}

const EMPTY_FORM = (date: string): FormState => ({
  customerId: null,
  service: '',
  date,
  time: '',
});

export function Appointments() {
  const { t } = useTranslation();
  const businesses = useAppStore((state) => state.businesses);
  const activeBusinessId = useAppStore((state) => state.activeBusinessId);
  const appointments = useAppStore((state) => state.appointments);
  const customers = useAppStore((state) => state.customers);
  const addAppointment = useAppStore((state) => state.addAppointment);
  const updateAppointment = useAppStore((state) => state.updateAppointment);
  const cancelAppointment = useAppStore((state) => state.cancelAppointment);
  const findOrCreateCustomer = useAppStore((state) => state.findOrCreateCustomer);
  const language = useSettingsStore((state) => state.language);
  const numerals = useSettingsStore((state) => state.numerals);

  const [weekStart, setWeekStart] = useState(() => startOfWeekSaturday(new Date()));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState<FormState>(() => EMPTY_FORM(dateKey(new Date())));
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [customerError, setCustomerError] = useState('');

  const business = businesses.find((item) => item.id === activeBusinessId) ?? null;
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weekStartKey = dateKey(weekStart);
  const weekEndKey = dateKey(addDays(weekStart, 6));
  const weekAppointments = appointments.filter(
    (appointment) =>
      appointment.businessId === activeBusinessId &&
      appointment.date >= weekStartKey &&
      appointment.date <= weekEndKey,
  );
  const customerOf = (id: number) => customers.find((customer) => customer.id === id);

  const slotOptions = useMemo(() => {
    if (!business || !form.date) return [];
    const dateObj = fromDateKey(form.date);
    const taken = appointments
      .filter(
        (appointment) =>
          appointment.businessId === activeBusinessId &&
          appointment.date === form.date &&
          appointment.status !== 'cancelled' &&
          appointment.id !== editing?.id,
      )
      .map((appointment) => appointment.time);
    const options = slotsForDay(business.hours, dateObj, taken, new Date());
    if (editing && editing.date === form.date && !options.some((option) => option.time === editing.time)) {
      options.push({ date: form.date, time: editing.time });
    }
    return options.sort((a, b) => a.time.localeCompare(b.time));
  }, [business, form.date, appointments, activeBusinessId, editing]);

  if (!business) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm font-bold text-ink">{t('business.noBusiness')}</p>
        <p className="mt-1 text-xs text-muted">{t('business.noBusinessHint')}</p>
      </div>
    );
  }

  const openNew = () => {
    const today = dateKey(new Date());
    const fallback = today >= weekStartKey && today <= weekEndKey ? today : weekStartKey;
    setEditing(null);
    setForm(EMPTY_FORM(fallback));
    setError('');
    setShowNewCustomer(false);
    setNewCustomer({ name: '', phone: '' });
    setCustomerError('');
    setOpen(true);
  };

  const openEdit = (appointment: Appointment) => {
    setEditing(appointment);
    setForm({
      customerId: appointment.customerId,
      service: appointment.service,
      date: appointment.date,
      time: appointment.time,
    });
    setError('');
    setShowNewCustomer(false);
    setCustomerError('');
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditing(null);
    setError('');
  };

  const save = () => {
    if (!form.customerId) {
      setError(t('appointments.customerRequired'));
      return;
    }
    if (!form.service.trim()) {
      setError(t('appointments.serviceRequired'));
      return;
    }
    if (!form.date || !form.time) {
      setError(t('appointments.timeRequired'));
      return;
    }
    const input = {
      businessId: business.id,
      customerId: form.customerId,
      date: form.date,
      time: form.time,
      service: form.service.trim(),
    };
    const result = editing ? updateAppointment(editing.id, input) : addAppointment(input);
    if (!result.ok) {
      setError(result.error === 'conflict' ? t('appointments.conflict') : t('errors.generic'));
      return;
    }
    pushToast('success', t(editing ? 'appointments.updateSuccess' : 'appointments.createSuccess'));
    closeModal();
  };

  const addCustomer = () => {
    const customer = findOrCreateCustomer({ name: newCustomer.name, phone: newCustomer.phone });
    if (!customer) {
      setCustomerError(t('appointments.invalidCustomer'));
      return;
    }
    setForm((current) => ({ ...current, customerId: customer.id }));
    setNewCustomer({ name: '', phone: '' });
    setCustomerError('');
    setShowNewCustomer(false);
    pushToast('success', t('appointments.customerAdded'));
  };

  const markDone = () => {
    if (!editing) return;
    const result = updateAppointment(editing.id, { status: 'done' });
    if (result.ok) {
      pushToast('success', t('appointments.updateSuccess'));
      closeModal();
    }
  };

  const confirmCancel = () => {
    if (!cancelTarget) return;
    cancelAppointment(cancelTarget.id);
    pushToast('success', t('appointments.cancelSuccess'));
    setCancelTarget(null);
    if (editing?.id === cancelTarget.id) closeModal();
  };

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        title={t('appointments.title')}
        subtitle={t('appointments.subtitle')}
        actions={
          <Button leadingIcon={<Plus className="h-4 w-4" aria-hidden />} onClick={openNew}>
            {t('appointments.new')}
          </Button>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              aria-label={t('appointments.prevWeek')}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-surface2 hover:text-ink"
            >
              <ChevronLeft className="flip-x h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              aria-label={t('appointments.nextWeek')}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-surface2 hover:text-ink"
            >
              <ChevronRight className="flip-x h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(startOfWeekSaturday(new Date()))}
              className="min-h-[36px] rounded-lg px-2 text-xs font-semibold text-secondary hover:bg-secondary/10"
            >
              {t('common.today')}
            </button>
          </div>
          <p className="text-sm font-bold text-ink">
            {t('appointments.weekOf', {
              date: formatDateLabel(weekStart, language, numerals, { day: 'numeric', month: 'long', year: 'numeric' }),
            })}
          </p>
          <p className="text-xs text-muted">{t('appointments.count', { count: weekAppointments.length })}</p>
        </div>

        <div className="overflow-x-auto">
          <div className="grid min-w-[900px] grid-cols-7 divide-x divide-line rtl:divide-x-reverse">
            {days.map((day, index) => {
              const key = dateKey(day);
              const dayAppointments = weekAppointments
                .filter((appointment) => appointment.date === key)
                .sort((a, b) => a.time.localeCompare(b.time));
              const hours = business.hours[DAY_KEYS[index]];
              const isToday = key === dateKey(new Date());
              const openNow = isBusinessOpenAt(business.hours, new Date()) && isToday;
              return (
                <div key={key} className="min-h-[22rem]">
                  <div className={cn('border-b border-line px-2 py-2 text-center', isToday && 'bg-primary-soft/40')}>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                      {formatDateLabel(day, language, numerals, { weekday: 'short' })}
                    </p>
                    <p className={cn('text-lg font-extrabold tabular-nums text-ink', isToday && 'text-primary-strong dark:text-primary')}>
                      {formatDateLabel(day, language, numerals, { day: 'numeric' })}
                    </p>
                    <p className="text-[10px] text-muted">
                      {hours.closed
                        ? t('appointments.closedDay')
                        : `${formatTimeLabel(hours.open, language, numerals)} – ${formatTimeLabel(hours.close, language, numerals)}`}
                    </p>
                    {openNow && <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-success" aria-label={t('status.openNow')} />}
                  </div>
                  <div className="space-y-1.5 p-1.5">
                    {dayAppointments.length === 0 ? (
                      <p className="py-6 text-center text-[10px] text-muted/70">—</p>
                    ) : (
                      dayAppointments.map((appointment) => {
                        const customer = customerOf(appointment.customerId);
                        return (
                          <button
                            key={appointment.id}
                            type="button"
                            onClick={() => openEdit(appointment)}
                            className={cn(
                              'w-full rounded-lg border p-1.5 text-start transition hover:shadow-sm',
                              appointment.status === 'cancelled'
                                ? 'border-line bg-surface2/60 opacity-60'
                                : appointment.status === 'done'
                                  ? 'border-success/30 bg-success/5'
                                  : 'border-primary/30 bg-primary-soft/40 hover:border-primary/60',
                            )}
                          >
                            <span className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-extrabold tabular-nums text-ink">
                                {formatTimeLabel(appointment.time, language, numerals)}
                              </span>
                              <Badge
                                tone={
                                  appointment.status === 'confirmed'
                                    ? 'success'
                                    : appointment.status === 'done'
                                      ? 'primary'
                                      : 'danger'
                                }
                                className="px-1.5 py-0 text-[9px]"
                              >
                                {t(`status.${appointment.status}`)}
                              </Badge>
                            </span>
                            <span className={cn('mt-1 block truncate text-[11px] font-semibold text-ink', appointment.status === 'cancelled' && 'line-through')}>
                              {customer?.name ?? '—'}
                            </span>
                            <span className="block truncate text-[10px] text-muted">{appointment.service}</span>
                          </button>
                        );
                      })
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(null);
                        setForm({ ...EMPTY_FORM(key), time: '' });
                        setError('');
                        setOpen(true);
                      }}
                      aria-label={`${t('appointments.new')} — ${key}`}
                      className="flex w-full items-center justify-center rounded-lg border border-dashed border-line py-1 text-muted/70 hover:border-primary/50 hover:text-primary"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="border-t border-line px-3 py-2 text-[11px] text-muted lg:hidden">{t('appointments.mobileHint')}</p>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
        <CalendarDays className="h-4 w-4" aria-hidden />
        {weekAppointments.length === 0 ? t('appointments.emptyHint') : t('appointments.subtitle')}
      </div>

      <Modal
        open={open}
        onClose={closeModal}
        title={editing ? t('appointments.formEdit') : t('appointments.formNew')}
        description={editing ? `${formatDateLabel(fromDateKey(editing.date), language, numerals, { weekday: 'long', day: 'numeric', month: 'long' })}` : undefined}
        size="md"
        footer={
          <>
            {editing && editing.status === 'confirmed' && (
              <Button variant="danger" size="sm" onClick={() => setCancelTarget(editing)}>
                {t('appointments.cancel')}
              </Button>
            )}
            {editing && editing.status === 'confirmed' && (
              <Button variant="outline" size="sm" onClick={markDone}>
                {t('appointments.markDone')}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={closeModal}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" onClick={save}>
              {t('appointments.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label={t('appointments.customer')} htmlFor="appointment-customer">
            <div className="flex gap-2">
              <select
                id="appointment-customer"
                value={form.customerId ?? ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    customerId: event.target.value ? Number(event.target.value) : null,
                  }))
                }
                className="field min-h-[44px]"
              >
                <option value="">{t('appointments.selectCustomer')}</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} — {customer.phone}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewCustomer((value) => !value)}
                aria-label={t('appointments.quickAddCustomer')}
                title={t('appointments.quickAddCustomer')}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-muted hover:bg-surface2 hover:text-ink"
              >
                {showNewCustomer ? <X className="h-4 w-4" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
              </button>
            </div>
          </Field>

          {showNewCustomer && (
            <div className="rounded-xl border border-line bg-surface2/50 p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <TextInput
                  value={newCustomer.name}
                  onChange={(event) => setNewCustomer((current) => ({ ...current, name: event.target.value }))}
                  placeholder={t('appointments.customerName')}
                  aria-label={t('appointments.customerName')}
                />
                <TextInput
                  value={newCustomer.phone}
                  onChange={(event) => setNewCustomer((current) => ({ ...current, phone: event.target.value }))}
                  placeholder={t('appointments.customerPhone')}
                  aria-label={t('appointments.customerPhone')}
                  inputMode="tel"
                  dir="ltr"
                />
              </div>
              {customerError && <p className="mt-1.5 text-xs font-medium text-danger">{customerError}</p>}
              <Button size="sm" className="mt-2" onClick={addCustomer}>
                {t('appointments.addCustomer')}
              </Button>
            </div>
          )}

          <Field label={t('appointments.service')} htmlFor="appointment-service">
            <TextInput
              id="appointment-service"
              value={form.service}
              onChange={(event) => setForm((current) => ({ ...current, service: event.target.value }))}
              placeholder={t('appointments.servicePlaceholder')}
              maxLength={160}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('common.date')} htmlFor="appointment-date">
              <TextInput
                id="appointment-date"
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, date: event.target.value, time: '' }))
                }
                className="min-h-[44px]"
              />
            </Field>
            <Field label={t('common.time')} htmlFor="appointment-time">
              <select
                id="appointment-time"
                value={form.time}
                onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
                className="field min-h-[44px]"
              >
                <option value="">{t('common.select')}</option>
                {slotOptions.map((slot) => (
                  <option key={slot.time} value={slot.time}>
                    {formatTimeLabel(slot.time, language, numerals)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {form.date && slotOptions.length === 0 && (
            <p className="flex items-center gap-1.5 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {t('appointments.noSlots')}
            </p>
          )}

          {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{error}</p>}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title={t('appointments.cancelConfirm')}
        description={cancelTarget ? `${customerOf(cancelTarget.customerId)?.name ?? ''} — ${formatTimeLabel(cancelTarget.time, language, numerals)}` : undefined}
        confirmLabel={t('appointments.cancel')}
        onConfirm={confirmCancel}
        onClose={() => setCancelTarget(null)}
      />

      {weekAppointments.length === 0 && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-dashed border-line px-3 py-2">
          <p className="text-xs text-muted">{t('appointments.empty')}</p>
          <button type="button" onClick={openNew} className="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {t('appointments.new')}
          </button>
        </div>
      )}
    </div>
  );
}
