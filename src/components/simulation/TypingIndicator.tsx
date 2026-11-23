import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/text';

export function TypingIndicator({ side = 'bot' }: { side?: 'bot' | 'customer' }) {
  const { t } = useTranslation();
  const outgoing = side === 'customer';
  return (
    <div className={cn('flex w-full', outgoing ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'flex items-center gap-1 rounded-2xl px-3 py-2.5 shadow-sm',
          outgoing
            ? 'rounded-br-md bg-[rgb(var(--c-chat-out))]'
            : 'rounded-bl-md bg-[rgb(var(--c-chat-in))]',
        )}
        role="status"
        aria-label={outgoing ? t('simulation.typingCustomer') : t('simulation.typingBot')}
      >
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-500 dark:bg-slate-300" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-500 dark:bg-slate-300" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-500 dark:bg-slate-300" />
      </div>
    </div>
  );
}
