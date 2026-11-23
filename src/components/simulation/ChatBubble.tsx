import { Check, CheckCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Language, Message, Numerals } from '../../data/types';
import { formatTimeLabel } from '../../utils/date';
import { cn } from '../../utils/text';

function clockOf(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function ChatBubble({
  message,
  language,
  numerals,
  showSender = true,
}: {
  message: Message;
  language: Language;
  numerals: Numerals;
  showSender?: boolean;
}) {
  const { t } = useTranslation();
  const outgoing = message.sender === 'customer';
  return (
    <div className={cn('flex w-full', outgoing ? 'justify-end' : 'justify-start')} dir="auto">
      <div
        className={cn(
          'relative max-w-[86%] rounded-2xl px-2.5 py-1.5 text-[13px] leading-relaxed shadow-sm animate-fade-up',
          outgoing
            ? 'rounded-br-md bg-[rgb(var(--c-chat-out))] text-slate-900 dark:text-slate-50'
            : 'rounded-bl-md bg-[rgb(var(--c-chat-in))] text-slate-900 dark:text-slate-50',
        )}
      >
        {!outgoing && showSender && (
          <p
            className={cn(
              'mb-0.5 text-[10px] font-bold',
              message.sender === 'bot' ? 'text-emerald-700 dark:text-emerald-300' : 'text-blue-700 dark:text-blue-300',
            )}
          >
            {message.sender === 'bot' ? t('simulation.bot') : t('simulation.agent')}
          </p>
        )}
        <p className="whitespace-pre-line break-words pe-1">{message.text}</p>
        <span className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-slate-500 dark:text-slate-300">
          <span>{formatTimeLabel(clockOf(message.at), language, numerals)}</span>
          {outgoing &&
            (message.status === 'read' ? (
              <CheckCheck className="h-3.5 w-3.5 text-sky-600 dark:text-sky-300" aria-label={t('status.available')} />
            ) : (
              <Check className="h-3.5 w-3.5" aria-hidden />
            ))}
        </span>
      </div>
    </div>
  );
}
