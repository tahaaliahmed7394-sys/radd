import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  Package,
  Pencil,
  Plus,
  Save,
  Store,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Badge, ConfirmDialog, Field, Switch, TextInput } from '../components/ui/Controls';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/Controls';
import { useAppStore } from '../store/app';
import { useSettingsStore } from '../store/settings';
import { pushToast } from '../store/notifications';
import type {
  Business,
  BusinessType,
  DayKey,
  Language,
  Product,
  WorkingHours,
} from '../data/types';
import { DAY_KEYS, formatMoney } from '../utils/date';
import { isValidPhone } from '../utils/text';
import { cn } from '../utils/text';

type Tab = 'profile' | 'products' | 'hours';

interface ProfileDraft {
  name: string;
  nameEn: string;
  type: BusinessType;
  address: string;
  addressEn: string;
  phone: string;
  botTone: Business['botTone'];
  defaultLanguage: Language;
  accent: string;
}

interface ProductDraft {
  name: string;
  nameEn: string;
  price: string;
  description: string;
  descriptionEn: string;
  available: boolean;
}

const EMPTY_PRODUCT: ProductDraft = {
  name: '',
  nameEn: '',
  price: '',
  description: '',
  descriptionEn: '',
  available: true,
};

function profileOf(business: Business): ProfileDraft {
  return {
    name: business.name,
    nameEn: business.nameEn,
    type: business.type,
    address: business.address,
    addressEn: business.addressEn,
    phone: business.phone,
    botTone: business.botTone,
    defaultLanguage: business.defaultLanguage,
    accent: business.accent,
  };
}

function cloneHours(hours: WorkingHours): WorkingHours {
  return Object.fromEntries(
    DAY_KEYS.map((key) => [key, { ...hours[key] }]),
  ) as WorkingHours;
}

export function Business() {
  const { t } = useTranslation();
  const businesses = useAppStore((state) => state.businesses);
  const activeBusinessId = useAppStore((state) => state.activeBusinessId);
  const products = useAppStore((state) => state.products);
  const updateBusiness = useAppStore((state) => state.updateBusiness);
  const upsertProduct = useAppStore((state) => state.upsertProduct);
  const deleteProduct = useAppStore((state) => state.deleteProduct);
  const resetData = useAppStore((state) => state.resetData);
  const language = useSettingsStore((state) => state.language);
  const numerals = useSettingsStore((state) => state.numerals);
  const [tab, setTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState<ProfileDraft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [productOpen, setProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productDraft, setProductDraft] = useState<ProductDraft>(EMPTY_PRODUCT);
  const [productError, setProductError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [hours, setHours] = useState<WorkingHours | null>(null);
  const [hoursError, setHoursError] = useState('');

  const business = businesses.find((item) => item.id === activeBusinessId) ?? null;
  const businessProducts = useMemo(
    () => products.filter((product) => product.businessId === activeBusinessId).sort((a, b) => a.id - b.id),
    [products, activeBusinessId],
  );

  useEffect(() => {
    if (business) {
      setProfile(profileOf(business));
      setHours(cloneHours(business.hours));
    }
  }, [business]);

  if (!business || !profile || !hours) {
    return (
      <div className="card mx-auto max-w-lg p-6 text-center">
        <EmptyState
          icon={<Store className="h-6 w-6" aria-hidden />}
          title={t('business.noBusiness')}
          hint={t('business.noBusinessHint')}
          action={
            <Button
              onClick={() => {
                resetData();
                pushToast('success', t('settings.resetDone'));
              }}
            >
              {t('business.restore')}
            </Button>
          }
        />
      </div>
    );
  }

  const set = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) =>
    setProfile((current) => (current ? { ...current, [key]: value } : current));

  const saveProfile = () => {
    const nextErrors: Record<string, string> = {};
    if (!profile.name.trim()) nextErrors.name = t('business.validationName');
    if (!isValidPhone(profile.phone)) nextErrors.phone = t('business.validationPhone');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    updateBusiness(business.id, {
      name: profile.name.trim(),
      nameEn: profile.nameEn.trim(),
      type: profile.type,
      address: profile.address.trim(),
      addressEn: profile.addressEn.trim(),
      phone: profile.phone.trim(),
      botTone: profile.botTone,
      defaultLanguage: profile.defaultLanguage,
      accent: profile.accent,
    });
    pushToast('success', t('business.saveSuccess'));
  };

  const openProduct = (product: Product | null) => {
    setEditingProduct(product);
    setProductDraft(
      product
        ? {
            name: product.name,
            nameEn: product.nameEn,
            price: String(product.price),
            description: product.description,
            descriptionEn: product.descriptionEn,
            available: product.available,
          }
        : EMPTY_PRODUCT,
    );
    setProductError('');
    setProductOpen(true);
  };

  const saveProduct = () => {
    const price = Number(productDraft.price);
    if (!productDraft.name.trim()) {
      setProductError(t('business.validationProductName'));
      return;
    }
    if (!Number.isInteger(price) || price < 0) {
      setProductError(t('business.validationPrice'));
      return;
    }
    const nextId =
      editingProduct?.id ??
      businessProducts.reduce((max, product) => Math.max(max, product.id), 0) + 1;
    upsertProduct({
      id: nextId,
      businessId: business.id,
      name: productDraft.name.trim(),
      nameEn: productDraft.nameEn.trim(),
      price,
      description: productDraft.description.trim(),
      descriptionEn: productDraft.descriptionEn.trim(),
      available: productDraft.available,
      createdAt: editingProduct?.createdAt ?? new Date().toISOString(),
    });
    pushToast('success', t('business.saveProductSuccess'));
    setProductOpen(false);
  };

  const saveHours = () => {
    for (const key of DAY_KEYS) {
      const day = hours[key];
      if (!day.closed && (!/^\d{2}:\d{2}$/.test(day.open) || !/^\d{2}:\d{2}$/.test(day.close))) {
        setHoursError(t('errors.invalidTime'));
        return;
      }
    }
    setHoursError('');
    updateBusiness(business.id, { hours });
    pushToast('success', t('business.saveSuccess'));
  };

  const tabs: { id: Tab; label: string; icon: typeof Store }[] = [
    { id: 'profile', label: t('business.tabProfile'), icon: Store },
    { id: 'products', label: t('business.tabProducts'), icon: Package },
    { id: 'hours', label: t('business.tabHours'), icon: Clock },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader title={t('business.title')} subtitle={t('business.subtitle')} />

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
            className={cn(
              'inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition',
              tab === item.id ? 'bg-primary-soft text-primary-strong shadow-sm dark:text-primary' : 'text-muted hover:text-ink',
            )}
          >
            <item.icon className="h-4 w-4" aria-hidden />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="card p-4 sm:p-5">
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-primary-soft/40 px-3 py-2 text-xs leading-relaxed text-ink">
            <Store className="mt-0.5 h-4 w-4 shrink-0 text-primary-strong dark:text-primary" aria-hidden />
            {t('business.dataUsedByBot')}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('business.name')} htmlFor="business-name" error={errors.name}>
              <TextInput id="business-name" value={profile.name} onChange={(event) => set('name', event.target.value)} maxLength={160} />
            </Field>
            <Field label={t('business.nameEn')} htmlFor="business-name-en">
              <TextInput id="business-name-en" value={profile.nameEn} onChange={(event) => set('nameEn', event.target.value)} maxLength={160} dir="ltr" />
            </Field>
            <Field label={t('business.type')} htmlFor="business-type">
              <select id="business-type" value={profile.type} onChange={(event) => set('type', event.target.value as BusinessType)} className="field min-h-[44px]">
                <option value="retail">{t('business.retail')}</option>
                <option value="clinic">{t('business.clinic')}</option>
                <option value="realestate">{t('business.realestate')}</option>
              </select>
            </Field>
            <Field label={t('business.phone')} htmlFor="business-phone" error={errors.phone} hint={t('business.phoneHint')}>
              <TextInput id="business-phone" value={profile.phone} onChange={(event) => set('phone', event.target.value)} inputMode="tel" dir="ltr" />
            </Field>
            <Field label={t('business.address')} htmlFor="business-address" className="sm:col-span-2">
              <TextInput id="business-address" value={profile.address} onChange={(event) => set('address', event.target.value)} maxLength={300} />
            </Field>
            <Field label={t('business.addressEn')} htmlFor="business-address-en" className="sm:col-span-2">
              <TextInput id="business-address-en" value={profile.addressEn} onChange={(event) => set('addressEn', event.target.value)} maxLength={300} dir="ltr" />
            </Field>
            <Field label={t('business.tone')} htmlFor="business-tone" hint={t('settings.toneHint')}>
              <select id="business-tone" value={profile.botTone} onChange={(event) => set('botTone', event.target.value as Business['botTone'])} className="field min-h-[44px]">
                <option value="friendly">{t('business.toneFriendly')}</option>
                <option value="formal">{t('business.toneFormal')}</option>
                <option value="concise">{t('business.toneConcise')}</option>
              </select>
            </Field>
            <Field label={t('business.defaultLanguage')} htmlFor="business-language" hint={t('settings.botLanguageHint')}>
              <select id="business-language" value={profile.defaultLanguage} onChange={(event) => set('defaultLanguage', event.target.value as Language)} className="field min-h-[44px]">
                <option value="ar">{t('language.ar')}</option>
                <option value="en">{t('language.en')}</option>
              </select>
            </Field>
            <Field label="اللون" htmlFor="business-accent" className="sm:col-span-2">
              <div className="flex items-center gap-3">
                <input
                  id="business-accent"
                  type="color"
                  value={profile.accent}
                  onChange={(event) => set('accent', event.target.value)}
                  className="h-11 w-16 cursor-pointer rounded-lg border border-line bg-surface p-1"
                />
                <span className="text-xs text-muted" dir="ltr">
                  {profile.accent}
                </span>
              </div>
            </Field>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={saveProfile} leadingIcon={<Save className="h-4 w-4" aria-hidden />}>
              {t('business.save')}
            </Button>
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-muted">
              {t('business.productsCount', { count: businessProducts.length })}
            </p>
            <Button size="sm" leadingIcon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => openProduct(null)}>
              {t('business.addProduct')}
            </Button>
          </div>
          {businessProducts.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<Package className="h-6 w-6" aria-hidden />}
                title={t('business.noProducts')}
                hint={t('business.addProductHint')}
                action={
                  <Button size="sm" onClick={() => openProduct(null)} leadingIcon={<Plus className="h-4 w-4" aria-hidden />}>
                    {t('business.addProduct')}
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {businessProducts.map((product) => (
                <article key={product.id} className="card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-ink">{language === 'ar' ? product.name : product.nameEn || product.name}</h2>
                      {product.nameEn && language === 'ar' && (
                        <p className="truncate text-[11px] text-muted" dir="ltr">
                          {product.nameEn}
                        </p>
                      )}
                    </div>
                    <Badge tone={product.available ? 'success' : 'neutral'}>
                      {product.available ? t('status.available') : t('status.unavailable')}
                    </Badge>
                  </div>
                  <p className="mt-2 text-lg font-extrabold tabular-nums text-primary-strong dark:text-primary">
                    {formatMoney(product.price, numerals, language)}
                  </p>
                  <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-muted">
                    {(language === 'ar' ? product.description : product.descriptionEn || product.description) || '—'}
                  </p>
                  <div className="mt-3 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => openProduct(product)}
                      aria-label={t('business.editProduct')}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface2 hover:text-ink"
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(product)}
                      aria-label={t('common.delete')}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'hours' && (
        <div className="card p-4 sm:p-5">
          <p className="mb-4 rounded-xl bg-primary-soft/40 px-3 py-2 text-xs leading-relaxed text-ink">
            {t('business.hoursHint')}
          </p>
          <div className="space-y-2">
            {DAY_KEYS.map((key: DayKey) => {
              const day = hours[key];
              return (
                <div key={key} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface2/40 p-2.5">
                  <span className="w-20 text-xs font-bold text-ink">
                    {t(`simulation.${key}` as never) === `simulation.${key}`
                      ? dayName(key, language)
                      : dayName(key, language)}
                  </span>
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      type="time"
                      value={day.open}
                      disabled={day.closed}
                      onChange={(event) =>
                        setHours((current) =>
                          current ? { ...current, [key]: { ...current[key], open: event.target.value } } : current,
                        )
                      }
                      aria-label={`${dayName(key, language)} — ${t('business.open')}`}
                      className="field min-h-[40px] w-32 disabled:opacity-50"
                    />
                    <span className="text-xs text-muted">—</span>
                    <input
                      type="time"
                      value={day.close}
                      disabled={day.closed}
                      onChange={(event) =>
                        setHours((current) =>
                          current ? { ...current, [key]: { ...current[key], close: event.target.value } } : current,
                        )
                      }
                      aria-label={`${dayName(key, language)} — ${t('business.close')}`}
                      className="field min-h-[40px] w-32 disabled:opacity-50"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-[11px] font-semibold', day.closed ? 'text-warning' : 'text-muted')}>
                      {day.closed ? t('business.closed') : t('status.openNow')}
                    </span>
                    <Switch
                      checked={day.closed}
                      label={t('business.closed')}
                      onChange={(closed) =>
                        setHours((current) =>
                          current ? { ...current, [key]: { ...current[key], closed } } : current,
                        )
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {hoursError && <p className="mt-2 text-xs font-medium text-danger">{hoursError}</p>}
          <div className="mt-5 flex justify-end">
            <Button onClick={saveHours} leadingIcon={<Save className="h-4 w-4" aria-hidden />}>
              {t('business.save')}
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={productOpen}
        onClose={() => setProductOpen(false)}
        title={editingProduct ? t('business.editProduct') : t('business.addProductTitle')}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setProductOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" onClick={saveProduct}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('business.productName')} htmlFor="product-name">
              <TextInput
                id="product-name"
                value={productDraft.name}
                onChange={(event) => setProductDraft((current) => ({ ...current, name: event.target.value }))}
                maxLength={160}
              />
            </Field>
            <Field label={t('business.productNameEn')} htmlFor="product-name-en">
              <TextInput
                id="product-name-en"
                value={productDraft.nameEn}
                onChange={(event) => setProductDraft((current) => ({ ...current, nameEn: event.target.value }))}
                maxLength={160}
                dir="ltr"
              />
            </Field>
          </div>
          <Field label={t('business.price')} htmlFor="product-price" hint={t('business.priceHint')}>
            <TextInput
              id="product-price"
              type="number"
              min={0}
              step={1}
              value={productDraft.price}
              onChange={(event) => setProductDraft((current) => ({ ...current, price: event.target.value }))}
            />
          </Field>
          <Field label={t('business.description')} htmlFor="product-description">
            <textarea
              id="product-description"
              value={productDraft.description}
              onChange={(event) => setProductDraft((current) => ({ ...current, description: event.target.value }))}
              maxLength={500}
              rows={2}
              className="field resize-y"
            />
          </Field>
          <Field label={t('business.descriptionEn')} htmlFor="product-description-en">
            <textarea
              id="product-description-en"
              value={productDraft.descriptionEn}
              onChange={(event) => setProductDraft((current) => ({ ...current, descriptionEn: event.target.value }))}
              maxLength={500}
              rows={2}
              dir="ltr"
              className="field resize-y"
            />
          </Field>
          <Switch
            checked={productDraft.available}
            label={t('business.productAvailability')}
            hint={t('business.productUnavailableHint')}
            onChange={(available) => setProductDraft((current) => ({ ...current, available }))}
          />
          {productError && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{productError}</p>}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t('business.deleteProductConfirm')}
        description={deleteTarget?.name}
        confirmLabel={t('business.confirmDelete')}
        onConfirm={() => {
          if (deleteTarget) {
            deleteProduct(deleteTarget.id);
            pushToast('success', t('business.productDeleted'));
          }
          setDeleteTarget(null);
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function dayName(key: DayKey, language: Language): string {
  const names: Record<DayKey, { ar: string; en: string }> = {
    sat: { ar: 'السبت', en: 'Saturday' },
    sun: { ar: 'الأحد', en: 'Sunday' },
    mon: { ar: 'الاثنين', en: 'Monday' },
    tue: { ar: 'الثلاثاء', en: 'Tuesday' },
    wed: { ar: 'الأربعاء', en: 'Wednesday' },
    thu: { ar: 'الخميس', en: 'Thursday' },
    fri: { ar: 'الجمعة', en: 'Friday' },
  };
  return names[key][language];
}
