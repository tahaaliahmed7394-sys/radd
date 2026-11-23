import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/ui/Controls';

export function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="card mx-auto mt-6 max-w-lg">
      <EmptyState
        icon={<Compass className="h-6 w-6" aria-hidden />}
        title={t('notFound.title')}
        hint={t('notFound.subtitle')}
        action={
          <Link
            to="/simulation"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg"
          >
            {t('notFound.back')}
          </Link>
        }
      />
    </div>
  );
}
