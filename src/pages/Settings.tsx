import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Bot,
  Database,
  Download,
  Globe,
  Info,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/Button';
import { ConfirmDialog, Field, SegmentedControl, Switch, TextInput } from '../components/ui/Controls';
import { SCENARIOS } from '../simulation/scenarios';
import { useAppStore } from '../store/app';
import { useSettingsStore } from '../store/settings';
import { pushToast } from '../store/notifications';
import { buildExportBundle, downloadCsvZip, downloadJsonBundle, parseImportBundle } from '../utils/export';
import { cn } from '../utils/text';
import type { BotConfig, FontSize, Language, Numerals, ThemeMode } from '../data/types';

function Section({
  icon,
  title,
  hint,
  children,
  danger,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section className={cn('card p-5 sm:p-6', danger && 'border-danger/30')}>
      <div className="mb-5 flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            danger ? 'bg-danger/10 text-danger' : 'bg-primary-soft text-primary-strong dark:text-primary',
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-ink">{title}</h2>
          {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function settingsSnapshot() {
  const s = useSettingsStore.getState();
  return {
    theme: s.theme,
    fontSize: s.fontSize,
    reduceMotion: String(s.reduceMotion),
    language: s.language,
    numerals: s.numerals,
    simulationSpeed: String(s.simulationSpeed),
    defaultScenarioId: s.defaultScenarioId,
    notifications: JSON.stringify(s.notifications),
    botConfigs: JSON.stringify(s.botConfigs),
  } as Record<string, string>;
}

function applyImportedSettings(settings: Record<string, string>) {
  const store = useSettingsStore.getState();
  const theme = settings.theme;
  if (theme === 'light' || theme === 'dark' || theme === 'system') store.setTheme(theme);
  const fontSize = settings.fontSize;
  if (fontSize === 'sm' || fontSize === 'md' || fontSize === 'lg') store.setFontSize(fontSize);
  if (settings.reduceMotion != null) store.setReduceMotion(settings.reduceMotion === 'true');
  const language = settings.language;
  if (language === 'ar' || language === 'en') store.setLanguage(language);
  const numerals = settings.numerals;
  if (numerals === 'western' || numerals === 'eastern') store.setNumerals(numerals);
  const speed = Number(settings.simulationSpeed);
  if (Number.isFinite(speed)) store.setSimulationSpeed(speed);
  if (typeof settings.defaultScenarioId === 'string' && settings.defaultScenarioId) {
    store.setDefaultScenario(settings.defaultScenarioId);
  }
  if (settings.notifications) {
    try {
      const n = JSON.parse(settings.notifications) as Record<string, unknown>;
      if (typeof n.order === 'boolean') store.setNotification('order', n.order);
      if (typeof n.appointment === 'boolean') store.setNotification('appointment', n.appointment);
      if (typeof n.handoff === 'boolean') store.setNotification('handoff', n.handoff);
    } catch {
      /* ignore */
    }
  }
  if (settings.botConfigs) {
    try {
      const cfg = JSON.parse(settings.botConfigs) as Record<string, BotConfig>;
      if (cfg && typeof cfg === 'object') {
        useSettingsStore.setState((state) => ({ botConfigs: { ...state.botConfigs, ...cfg } }));
      }
    } catch {
      /* ignore */
    }
  }
}

export function Settings() {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const activeBusinessId = useAppStore((s) => s.activeBusinessId);
  const businesses = useAppStore((s) => s.businesses);
  const resetData = useAppStore((s) => s.resetData);
  const clearAll = useAppStore((s) => s.clearAll);
  const replaceAll = useAppStore((s) => s.replaceAll);

  const theme = useSettingsStore((s) => s.theme);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const language = useSettingsStore((s) => s.language);
  const numerals = useSettingsStore((s) => s.numerals);
  const notifications = useSettingsStore((s) => s.notifications);
  const simulationSpeed = useSettingsStore((s) => s.simulationSpeed);
  const defaultScenarioId = useSettingsStore((s) => s.defaultScenarioId);
  const botConfigs = useSettingsStore((s) => s.botConfigs);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const setReduceMotion = useSettingsStore((s) => s.setReduceMotion);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const setNumerals = useSettingsStore((s) => s.setNumerals);
  const setNotification = useSettingsStore((s) => s.setNotification);
  const setSimulationSpeed = useSettingsStore((s) => s.setSimulationSpeed);
  const setDefaultScenario = useSettingsStore((s) => s.setDefaultScenario);
  const updateBotConfig = useSettingsStore((s) => s.updateBotConfig);

  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [importing, setImporting] = useState(false);

  const activeBusiness = businesses.find((b) => b.id === activeBusinessId) ?? businesses[0] ?? null;
  const config = activeBusiness ? botConfigs[String(activeBusiness.id)] ?? {} : {};

  const exportJson = () => {
    try {
      const state = useAppStore.getState();
      const data = {
        businesses: state.businesses,
        products: state.products,
        customers: state.customers,
        conversations: state.conversations,
        messages: state.messages,
        appointments: state.appointments,
        orders: state.orders,
      };
      downloadJsonBundle(buildExportBundle(data, settingsSnapshot()));
      pushToast('success', t('settings.exportDone'));
    } catch {
      pushToast('error', t('settings.exportFailed'));
    }
  };

  const exportCsv = async () => {
    try {
      const state = useAppStore.getState();
      await downloadCsvZip({
        businesses: state.businesses,
        products: state.products,
        customers: state.customers,
        conversations: state.conversations,
        messages: state.messages,
        appointments: state.appointments,
        orders: state.orders,
      });
      pushToast('success', t('settings.exportDone'));
    } catch {
      pushToast('error', t('settings.exportFailed'));
    }
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    try {
      const raw = await file.text();
      const { data, settings } = parseImportBundle(raw);
      replaceAll(data);
      if (settings) applyImportedSettings(settings);
      pushToast('success', t('settings.importSuccess'));
    } catch {
      pushToast('error', t('settings.importError'));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const confirmWord = t('settings.confirmWord');

  return (
    <div className="space-y-6">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <Section icon={<Palette className="h-5 w-5" />} title={t('settings.appearance')} hint={t('settings.appearanceHint')}>
        <Field label={t('theme.label')} hint={t('settings.themeHint')}>
          <SegmentedControl<ThemeMode>
            ariaLabel={t('theme.label')}
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: t('theme.light'), icon: <Sun className="h-4 w-4" /> },
              { value: 'dark', label: t('theme.dark'), icon: <Moon className="h-4 w-4" /> },
              { value: 'system', label: t('theme.system'), icon: <Monitor className="h-4 w-4" /> },
            ]}
          />
        </Field>
        <Field label={t('settings.fontSize')}>
          <SegmentedControl<FontSize>
            ariaLabel={t('settings.fontSize')}
            value={fontSize}
            onChange={setFontSize}
            options={[
              { value: 'sm', label: 'A-' },
              { value: 'md', label: 'A' },
              { value: 'lg', label: 'A+' },
            ]}
          />
        </Field>
        <Switch
          checked={reduceMotion}
          onChange={setReduceMotion}
          label={t('settings.reduceMotion')}
          hint={t('settings.reduceMotionHint')}
        />
      </Section>

      <Section icon={<Globe className="h-5 w-5" />} title={t('settings.language')} hint={t('settings.languageHint')}>
        <Field label={t('settings.appLanguage')}>
          <SegmentedControl<Language>
            ariaLabel={t('settings.appLanguage')}
            value={language}
            onChange={setLanguage}
            options={[
              { value: 'ar', label: 'العربية' },
              { value: 'en', label: 'English' },
            ]}
          />
        </Field>
        <Field label={language === 'ar' ? 'الأرقام' : 'Numerals'}>
          <SegmentedControl<Numerals>
            ariaLabel={language === 'ar' ? 'الأرقام' : 'Numerals'}
            value={numerals}
            onChange={setNumerals}
            options={[
              { value: 'western', label: language === 'ar' ? 'غربية 123' : 'Western 123' },
              { value: 'eastern', label: language === 'ar' ? 'شرقية ١٢٣' : 'Eastern ١٢٣' },
            ]}
          />
        </Field>
      </Section>

      <Section icon={<Bot className="h-5 w-5" />} title={t('settings.bot')} hint={t('settings.botHint')}>
        <p className="text-sm text-muted">
          {activeBusiness
            ? t('settings.activeBusiness', { name: language === 'ar' ? activeBusiness.name : activeBusiness.nameEn })
            : t('settings.changeBusiness')}
        </p>
        {activeBusiness && (
          <>
            <Field label={t('settings.welcomeMessage')} hint={t('settings.welcomeHint')}>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput
                  value={config.welcome?.ar ?? ''}
                  onChange={(e) =>
                    updateBotConfig(activeBusiness.id, {
                      welcome: { ar: e.target.value, en: config.welcome?.en ?? '' },
                    })
                  }
                  placeholder={t('settings.welcomePlaceholder')}
                  aria-label={`${t('settings.welcomeMessage')} AR`}
                />
                <TextInput
                  value={config.welcome?.en ?? ''}
                  onChange={(e) =>
                    updateBotConfig(activeBusiness.id, {
                      welcome: { ar: config.welcome?.ar ?? '', en: e.target.value },
                    })
                  }
                  placeholder="Welcome! How can I help?"
                  dir="ltr"
                  aria-label={`${t('settings.welcomeMessage')} EN`}
                />
              </div>
            </Field>
            <Field label={t('settings.outOfHoursMessage')} hint={t('settings.outOfHoursHint')}>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput
                  value={config.outOfHours?.ar ?? ''}
                  onChange={(e) =>
                    updateBotConfig(activeBusiness.id, {
                      outOfHours: { ar: e.target.value, en: config.outOfHours?.en ?? '' },
                    })
                  }
                  placeholder={t('settings.outOfHoursPlaceholder')}
                  aria-label={`${t('settings.outOfHoursMessage')} AR`}
                />
                <TextInput
                  value={config.outOfHours?.en ?? ''}
                  onChange={(e) =>
                    updateBotConfig(activeBusiness.id, {
                      outOfHours: { ar: config.outOfHours?.ar ?? '', en: e.target.value },
                    })
                  }
                  placeholder="We received your message outside working hours."
                  dir="ltr"
                  aria-label={`${t('settings.outOfHoursMessage')} EN`}
                />
              </div>
            </Field>
            <Field label={t('settings.handoffKeywords')} hint={t('settings.handoffHint')}>
              <TextInput
                value={config.handoffKeywords ?? ''}
                onChange={(e) => updateBotConfig(activeBusiness.id, { handoffKeywords: e.target.value })}
                placeholder={t('settings.keywordsPlaceholder')}
              />
            </Field>
          </>
        )}
        <p className="text-xs text-muted">{t('settings.botLanguageHint')}</p>
      </Section>

      <Section icon={<Bell className="h-5 w-5" />} title={t('settings.notifications')} hint={t('settings.notificationsHint')}>
        <Switch checked={notifications.order} onChange={(v) => setNotification('order', v)} label={t('settings.notifyOrder')} />
        <Switch checked={notifications.appointment} onChange={(v) => setNotification('appointment', v)} label={t('settings.notifyAppointment')} />
        <Switch checked={notifications.handoff} onChange={(v) => setNotification('handoff', v)} label={t('settings.notifyHandoff')} />
      </Section>

      <Section icon={<SlidersHorizontal className="h-5 w-5" />} title={t('settings.simulation')} hint={t('settings.simulationHint')}>
        <Field label={`${t('settings.defaultSpeed')}: ${simulationSpeed}×`}>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.5}
            value={simulationSpeed}
            onChange={(e) => setSimulationSpeed(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label={t('settings.defaultSpeed')}
          />
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>0.5×</span><span>1×</span><span>2×</span><span>3×</span>
          </div>
        </Field>
        <Field label={t('settings.defaultScenario')}>
          <select
            className="field"
            value={defaultScenarioId}
            onChange={(e) => setDefaultScenario(e.target.value)}
            aria-label={t('settings.defaultScenario')}
          >
            {SCENARIOS.map((s) => (
              <option key={s.id} value={s.id}>
                {t(s.titleKey)}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" leadingIcon={<RotateCcw className="h-4 w-4" />} onClick={() => setConfirmReset(true)}>
            {t('settings.resetDemo')}
          </Button>
        </div>
        <p className="text-xs text-muted">{t('settings.resetDemoHint')}</p>
      </Section>

      <Section icon={<Database className="h-5 w-5" />} title={t('settings.data')} hint={t('settings.dataHint')} danger>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" leadingIcon={<Download className="h-4 w-4" />} onClick={exportJson}>
            {t('settings.exportJson')}
          </Button>
          <Button variant="outline" leadingIcon={<Download className="h-4 w-4" />} onClick={() => void exportCsv()}>
            {t('settings.exportCsv')}
          </Button>
          <Button variant="outline" leadingIcon={<Upload className="h-4 w-4" />} loading={importing} onClick={() => fileRef.current?.click()}>
            {t('settings.importJson')}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void onImport(e.target.files?.[0])}
          />
        </div>
        <p className="text-xs text-muted">{t('settings.importHint')}</p>

        <div className="rounded-xl border border-danger/20 bg-danger/5 p-4">
          <p className="text-sm font-semibold text-danger">{t('settings.dangerZone')}</p>
          <p className="mt-1 text-sm text-muted">{t('settings.deleteAllHint')}</p>
          <div className="mt-3">
            <Button variant="danger" leadingIcon={<Trash2 className="h-4 w-4" />} onClick={() => { setDeleteText(''); setConfirmDelete(true); }}>
              {t('settings.deleteAll')}
            </Button>
          </div>
        </div>
      </Section>

      <Section icon={<Info className="h-5 w-5" />} title={t('settings.about')} hint={t('settings.aboutHint')}>
        <p className="text-sm text-muted">{t('settings.aboutDescription')}</p>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-muted">{t('settings.version')}</dt><dd className="font-semibold text-ink">1.0.0</dd></div>
          <div><dt className="text-muted">{t('settings.license')}</dt><dd className="font-semibold text-ink">{t('settings.licenseValue')}</dd></div>
          <div><dt className="text-muted">{t('settings.contact')}</dt><dd className="font-semibold text-ink">{t('settings.contactValue')}</dd></div>
        </dl>
        <p className="text-xs text-muted">{t('settings.madeIn')} · {t('settings.savedAutomatically')}</p>
      </Section>

      <ConfirmDialog
        open={confirmReset}
        title={t('settings.resetDemo')}
        description={t('settings.resetDemoConfirm')}
        confirmLabel={t('common.reset')}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetData();
          setConfirmReset(false);
          pushToast('success', t('settings.resetDone'));
        }}
        tone="primary"
      />

      <ConfirmDialog
        open={confirmDelete}
        title={t('settings.deleteAll')}
        description={t('settings.deleteAllWarning')}
        confirmLabel={t('settings.deleteAll')}
        confirmDisabled={deleteText.trim() !== confirmWord}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (deleteText.trim() !== confirmWord) return;
          clearAll();
          setConfirmDelete(false);
          setDeleteText('');
          pushToast('success', t('settings.deleteDone'));
        }}
      >
        <div className="mt-4">
          <Field label={t('settings.typeToConfirm')}>
            <TextInput value={deleteText} onChange={(e) => setDeleteText(e.target.value)} placeholder={confirmWord} />
          </Field>
        </div>
      </ConfirmDialog>
    </div>
  );
}
