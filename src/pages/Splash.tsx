import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { Logo } from '../components/Logo';

export function Splash() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/simulation', { replace: true }), 1500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#071a17] px-5 text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -end-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/25 blur-3xl animate-blob" />
        <div className="absolute -bottom-32 -start-24 h-[28rem] w-[28rem] rounded-full bg-blue-700/25 blur-3xl animate-blob [animation-delay:2s]" />
        <div className="absolute start-1/3 top-1/4 h-32 w-32 rounded-full bg-teal-300/10 blur-2xl" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        <motion.div
          initial={{ scale: 0.75, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          className="mx-auto mb-6 w-fit"
        >
          <Logo size={96} />
        </motion.div>
        <motion.h1
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-4xl font-extrabold tracking-tight"
        >
          {t('brand.name')}
        </motion.h1>
        <motion.p
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-2 text-sm font-medium text-emerald-50/80"
        >
          {t('brand.tagline')}
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-8 space-y-3 text-start"
        >
          {[
            { icon: MessageCircle, text: t('scenario.price.desc') },
            { icon: Sparkles, text: t('scenario.booking.desc') },
            { icon: ShieldCheck, text: t('scenario.unknown.desc') },
          ].map((row) => (
            <div
              key={row.text}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 backdrop-blur"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/20 text-emerald-300">
                <row.icon className="h-4 w-4" aria-hidden />
              </span>
              <p className="text-xs leading-snug text-emerald-50/85">{row.text}</p>
            </div>
          ))}
        </motion.div>

        <div className="mt-8">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 1.35, ease: 'easeInOut' }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300"
            />
          </div>
          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="text-xs text-emerald-50/60">{t('splash.loading')}</span>
            <button
              type="button"
              onClick={() => navigate('/simulation', { replace: true })}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-white/15 px-3 text-xs font-bold text-white/85 transition hover:bg-white/10"
            >
              {t('splash.skip')}
              <ArrowLeft className="flip-x h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
