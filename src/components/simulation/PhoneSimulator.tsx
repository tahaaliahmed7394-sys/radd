import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Bot,
  Check,
  MoreVertical,
  Phone,
  Send,
  ShieldCheck,
  UserCheck,
  Video,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store/app';
import { useSimStore } from '../../store/sim';
import { useSettingsStore } from '../../store/settings';
import { useUiStore } from '../../store/ui';
import { runtime } from '../../simulation/runtime';
import { Avatar } from '../Avatar';
import { ChatBubble } from './ChatBubble';
import { TypingIndicator } from './TypingIndicator';
import { dateKey, formatDateLabel, formatTimeLabel } from '../../utils/date';
import { cn } from '../../utils/text';

export function PhoneSimulator() {
  const { t } = useTranslation();
  const businesses = useAppStore((state) => state.businesses);
  const activeBusinessId = useAppStore((state) => state.activeBusinessId);
  const conversations = useAppStore((state) => state.conversations);
  const messages = useAppStore((state) => state.messages);
  const activeConversationId = useAppStore((state) => state.activeConversationId);
  const simConversationId = useSimStore((state) => state.activeConversationId);
  const typing = useSimStore((state) => state.typing);
  const clockIso = useSimStore((state) => state.clockIso);
  const paused = useSimStore((state) => state.paused);
  const role = useUiStore((state) => state.role);
  const language = useSettingsStore((state) => state.language);
  const numerals = useSettingsStore((state) => state.numerals);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const business = businesses.find((item) => item.id === activeBusinessId) ?? null;
  const conversation =
    conversations.find(
      (item) =>
        item.id === (simConversationId ?? activeConversationId) &&
        item.businessId === activeBusinessId,
    ) ?? null;
  const conversationMessages = useMemo(
    () =>
      conversation
        ? messages
            .filter((message) => message.conversationId === conversation.id)
            .sort((a, b) => +new Date(a.at) - +new Date(b.at))
        : [],
    [conversation, messages],
  );

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [conversationMessages.length, typing, conversation?.id]);

  const clock = new Date(clockIso);
  const clockText = formatTimeLabel(
    `${String(clock.getHours()).padStart(2, '0')}:${String(clock.getMinutes()).padStart(2, '0')}`,
    language,
    numerals,
  );
  const status = conversation?.status ?? null;
  const canType = Boolean(business) && status !== 'closed' && (role === 'customer' || Boolean(conversation));
  const statusText =
    typing === 'bot'
      ? t('simulation.typingBot')
      : typing === 'customer'
        ? t('simulation.typingCustomer')
        : status === 'closed'
          ? t('status.closed')
          : status === 'human'
            ? t('conversations.botPaused')
            : t('simulation.online');

  function send(event: FormEvent) {
    event.preventDefault();
    const value = draft.trim();
    if (!value || !canType) return;
    setDraft('');
    if (role === 'customer') {
      void runtime.sendCustomer(value);
    } else {
      runtime.sendOwner(value, conversation?.id ?? null);
    }
    inputRef.current?.focus();
  }

  const placeholder =
    role === 'customer' ? t('simulation.typeAsCustomer') : t('simulation.typeAsOwner');
  const sendLabel =
    role === 'customer' ? t('simulation.sendAsCustomer') : t('simulation.sendAsOwner');
  const emptyCopy = role === 'owner' ? t('simulation.emptyOwner') : t('simulation.writeHint');

  return (
    <div className="mx-auto w-full max-w-[380px]">
      <div className="rounded-[2.5rem] border-[9px] border-slate-900 bg-slate-900 shadow-phone dark:border-slate-700 dark:bg-slate-700">
        <div className="overflow-hidden rounded-[2rem] bg-[#efeae2] dark:bg-[#0b141a]">
          <div className="flex items-center justify-between bg-[rgb(var(--c-chat-header))] px-4 pb-0.5 pt-1.5 text-[10px] font-semibold text-white/85">
            <span className="tabular-nums">{clockText}</span>
            <span className="flex items-center gap-1.5" aria-hidden>
              <span className="flex items-end gap-0.5">
                <span className="h-1 w-0.5 rounded-sm bg-white/80" />
                <span className="h-1.5 w-0.5 rounded-sm bg-white/80" />
                <span className="h-2 w-0.5 rounded-sm bg-white/80" />
                <span className="h-2.5 w-0.5 rounded-sm bg-white/80" />
              </span>
              <span className="text-[9px]">4G</span>
              <span className="inline-block h-2 w-4 rounded-[2px] border border-white/70">
                <span className="block h-full w-3/4 bg-white/80" />
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2 bg-[rgb(var(--c-chat-header))] px-2 pb-2.5 pt-1 text-white">
            <button
              type="button"
              onClick={() => {
                useAppStore.getState().setActiveConversation(null);
                useSimStore.getState().setActiveConversation(null);
              }}
              aria-label={t('common.back')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/90 hover:bg-white/10"
            >
              <ArrowLeft className="flip-x h-5 w-5" aria-hidden />
            </button>
            {business ? (
              <Avatar name={language === 'ar' ? business.name : business.nameEn || business.name} size="md" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                <Bot className="h-5 w-5" aria-hidden />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold leading-tight">
                {business ? (language === 'ar' ? business.name : business.nameEn || business.name) : t('brand.name')}
              </p>
              <p className="truncate text-[10px] font-medium text-white/80">
                {typing ? statusText : conversation ? statusText : t('simulation.bot')}
              </p>
            </div>
            <span className="flex items-center gap-0.5 text-white/85" aria-hidden>
              <span className="flex h-8 w-8 items-center justify-center rounded-full">
                <Video className="h-4 w-4" />
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full">
                <Phone className="h-4 w-4" />
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full">
                <MoreVertical className="h-4 w-4" />
              </span>
            </span>
          </div>

          {(conversation?.afterHours || paused) && (
            <div className="flex flex-wrap justify-center gap-1.5 bg-[rgb(var(--c-chat-header))] px-2 pb-2">
              {conversation?.afterHours && (
                <span className="rounded-full bg-amber-400/95 px-2 py-0.5 text-[10px] font-bold text-amber-950">
                  {t('simulation.afterHoursBadge')}
                </span>
              )}
              {paused && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                  {t('simulation.paused')}
                </span>
              )}
            </div>
          )}

          <div
            ref={scrollRef}
            className="chat-pattern h-[26rem] space-y-1.5 overflow-y-auto px-3 py-3 phone-scroll sm:h-[30rem]"
            aria-live="polite"
            aria-label={t('simulation.phoneAria')}
          >
            {!conversation ? (
              <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/80 text-emerald-700 shadow-sm dark:bg-slate-800 dark:text-emerald-300">
                  <Bot className="h-8 w-8" aria-hidden />
                </span>
                <p className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-200">
                  {t('simulation.selectConversation')}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{emptyCopy}</p>
              </div>
            ) : conversationMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center px-8 text-center">
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('conversations.noMessages')}</p>
              </div>
            ) : (
              <>
                {conversationMessages.map((message, index) => {
                  const messageDate = new Date(message.at);
                  const previous = conversationMessages[index - 1];
                  const newDay = !previous || dateKey(new Date(previous.at)) !== dateKey(messageDate);
                  const today = dateKey(messageDate) === dateKey(new Date());
                  return (
                    <Fragment key={message.id}>
                      {newDay && (
                        <div className="flex justify-center py-1">
                          <span className="rounded-lg bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-slate-600 shadow-sm dark:bg-slate-800/90 dark:text-slate-300">
                            {today
                              ? t('simulation.today')
                              : formatDateLabel(messageDate, language, numerals, {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                          </span>
                        </div>
                      )}
                      <ChatBubble message={message} language={language} numerals={numerals} />
                    </Fragment>
                  );
                })}
              </>
            )}
            {typing && <TypingIndicator side={typing} />}
          </div>

          {conversation && (
            <div className="flex items-center justify-between gap-2 border-t border-black/5 bg-[#f0f2f5] px-2 py-1.5 dark:border-white/5 dark:bg-[#111b21]">
              <span
                className={cn(
                  'flex items-center gap-1 text-[10px] font-semibold',
                  status === 'human'
                    ? 'text-amber-700 dark:text-amber-300'
                    : status === 'closed'
                      ? 'text-slate-500 dark:text-slate-400'
                      : 'text-emerald-700 dark:text-emerald-300',
                )}
              >
                {status === 'human' ? (
                  <UserCheck className="h-3.5 w-3.5" aria-hidden />
                ) : status === 'closed' ? (
                  <X className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                )}
                {status === 'human'
                  ? t('simulation.humanMode')
                  : status === 'closed'
                    ? t('simulation.closedMode')
                    : role === 'owner'
                      ? t('simulation.ownerHint')
                      : t('simulation.botMode')}
              </span>
              <div className="flex items-center gap-1">
                {status !== 'bot' && status !== 'closed' && role === 'owner' && (
                  <button
                    type="button"
                    onClick={() => runtime.returnToBot(conversation.id)}
                    className="rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10"
                  >
                    {t('simulation.returnToBot')}
                  </button>
                )}
                {status === 'bot' && role === 'owner' && (
                  <button
                    type="button"
                    onClick={() => runtime.takeOver(conversation.id)}
                    className="rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10"
                  >
                    {t('simulation.takeOver')}
                  </button>
                )}
                {status === 'closed' ? (
                  <button
                    type="button"
                    onClick={() => runtime.reopenConversation(conversation.id)}
                    className="rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10"
                  >
                    {t('simulation.reopen')}
                  </button>
                ) : (
                  role === 'owner' && (
                    <button
                      type="button"
                      onClick={() => runtime.closeConversation(conversation.id)}
                      className="rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                      {t('simulation.closeConversation')}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          <form onSubmit={send} className="flex items-end gap-2 bg-[#f0f2f5] px-2 py-2 dark:bg-[#111b21]">
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={!canType}
              placeholder={
                conversation
                  ? placeholder
                  : role === 'customer'
                    ? t('simulation.typeAsCustomer')
                    : t('simulation.selectConversation')
              }
              aria-label={t('aria.messageInput')}
              maxLength={1000}
              className="min-h-[44px] min-w-0 flex-1 rounded-full border border-black/5 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-60 dark:border-white/10 dark:bg-[#202c33] dark:text-slate-50"
            />
            <button
              type="submit"
              disabled={!canType || draft.trim().length === 0}
              aria-label={sendLabel}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-45"
            >
              {draft.trim().length > 0 ? <Send className="h-5 w-5" aria-hidden /> : <Check className="h-5 w-5" aria-hidden />}
            </button>
          </form>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">{t('simulation.chatInfo')}</p>
    </div>
  );
}
