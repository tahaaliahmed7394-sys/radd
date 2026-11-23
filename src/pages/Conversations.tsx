import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bot,
  MessagesSquare,
  Search,
  Send,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Avatar } from '../components/Avatar';
import { Badge, EmptyState } from '../components/ui/Controls';
import { ChatBubble } from '../components/simulation/ChatBubble';
import { useAppStore } from '../store/app';
import { useSettingsStore } from '../store/settings';
import { runtime } from '../simulation/runtime';
import { pushToast } from '../store/notifications';
import { dateKey, formatDateLabel, timeAgoLabel } from '../utils/date';
import { cn, normalizeArabic } from '../utils/text';

type Filter = 'all' | 'bot' | 'human' | 'closed' | 'afterHours';

export function Conversations() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const businesses = useAppStore((state) => state.businesses);
  const activeBusinessId = useAppStore((state) => state.activeBusinessId);
  const conversations = useAppStore((state) => state.conversations);
  const customers = useAppStore((state) => state.customers);
  const messages = useAppStore((state) => state.messages);
  const activeConversationId = useAppStore((state) => state.activeConversationId);
  const markRead = useAppStore((state) => state.markCustomerMessagesRead);
  const language = useSettingsStore((state) => state.language);
  const numerals = useSettingsStore((state) => state.numerals);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<number | null>(activeConversationId);
  const [reply, setReply] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const customerOf = (id: number) => customers.find((customer) => customer.id === id);

  const filtered = useMemo(() => {
    const term = normalizeArabic(search);
    return conversations
      .filter((conversation) => conversation.businessId === activeBusinessId)
      .filter((conversation) => {
        if (filter === 'afterHours') return conversation.afterHours;
        if (filter !== 'all' && conversation.status !== filter) return false;
        if (!term) return true;
        const customer = customerOf(conversation.customerId);
        if (!customer) return false;
        return (
          normalizeArabic(customer.name).includes(term) ||
          normalizeArabic(customer.phone).includes(term)
        );
      })
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, activeBusinessId, filter, search, customers]);

  const selected =
    filtered.find((conversation) => conversation.id === selectedId) ??
    conversations.find(
      (conversation) => conversation.id === selectedId && conversation.businessId === activeBusinessId,
    ) ??
    null;
  const customer = selected ? customerOf(selected.customerId) : null;
  const thread = useMemo(
    () =>
      selected
        ? messages
            .filter((message) => message.conversationId === selected.id)
            .sort((a, b) => +new Date(a.at) - +new Date(b.at))
        : [],
    [messages, selected],
  );

  useEffect(() => {
    if (activeConversationId && conversations.some((c) => c.id === activeConversationId)) {
      setSelectedId(activeConversationId);
    }
  }, [activeConversationId, conversations]);

  useEffect(() => {
    if (selectedId) markRead(selectedId);
  }, [selectedId, markRead, thread.length]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [thread.length, selectedId]);

  const select = (id: number) => {
    setSelectedId(id);
    runtime.selectConversation(id);
    setReply('');
  };

  const sendReply = (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !reply.trim()) return;
    runtime.sendOwner(reply, selected.id);
    setReply('');
  };

  const business = businesses.find((item) => item.id === activeBusinessId);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        title={t('conversations.title')}
        subtitle={t('conversations.subtitle')}
        actions={
          business && (
            <span className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink">
              <Avatar name={language === 'ar' ? business.name : business.nameEn || business.name} size="sm" accent={business.accent} />
              <span className="max-w-[12rem] truncate">
                {language === 'ar' ? business.name : business.nameEn || business.name}
              </span>
            </span>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className={cn('card overflow-hidden', selected && 'hidden lg:block')}>
          <div className="space-y-2 border-b border-line p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('conversations.searchPlaceholder')}
                aria-label={t('aria.searchConversations')}
                className="field min-h-[44px] ps-9"
              />
            </div>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as Filter)}
              aria-label={t('conversations.filterAria')}
              className="field min-h-[40px] text-xs font-semibold"
            >
              <option value="all">{t('conversations.allStatuses')}</option>
              <option value="bot">{t('status.bot')}</option>
              <option value="human">{t('status.human')}</option>
              <option value="closed">{t('status.closed')}</option>
              <option value="afterHours">{t('conversations.afterHoursFilter')}</option>
            </select>
            <p className="text-[11px] text-muted">
              {filtered.length} {t('common.results')}
            </p>
          </div>

          <div className="max-h-[32rem] overflow-y-auto lg:max-h-[calc(100vh-16rem)]">
            {filtered.length === 0 ? (
              <EmptyState
                compact
                icon={<MessagesSquare className="h-5 w-5" aria-hidden />}
                title={t('conversations.empty')}
                hint={t('conversations.emptyHint')}
              />
            ) : (
              <ul className="divide-y divide-line">
                {filtered.map((conversation) => {
                  const person = customerOf(conversation.customerId);
                  const list = messages.filter((message) => message.conversationId === conversation.id);
                  const last = list[list.length - 1];
                  const active = conversation.id === selectedId;
                  return (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        onClick={() => select(conversation.id)}
                        className={cn(
                          'flex w-full items-start gap-3 px-3 py-3 text-start transition hover:bg-surface2',
                          active && 'bg-primary-soft/50',
                        )}
                      >
                        <Avatar name={person?.name ?? '—'} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-bold text-ink">{person?.name ?? '—'}</span>
                            <span className="shrink-0 text-[10px] text-muted">
                              {timeAgoLabel(conversation.updatedAt, language, numerals)}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted">
                            {last?.text ?? t('conversations.noMessages')}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-1">
                            <Badge
                              tone={
                                conversation.status === 'bot'
                                  ? 'success'
                                  : conversation.status === 'human'
                                    ? 'warning'
                                    : 'neutral'
                              }
                            >
                              {t(`status.${conversation.status}`)}
                            </Badge>
                            {conversation.afterHours && <Badge tone="secondary">{t('simulation.afterHoursBadge')}</Badge>}
                            <span className="text-[10px] text-muted">
                              {t('conversations.messageCount', { count: list.length })}
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className={cn('card flex min-h-[30rem] flex-col overflow-hidden', !selected && 'hidden lg:flex')}>
          {!selected || !customer ? (
            <EmptyState
              icon={<MessagesSquare className="h-6 w-6" aria-hidden />}
              title={t('conversations.selectPrompt')}
              hint={t('conversations.emptyHint')}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label={t('conversations.backToList')}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-surface2 hover:text-ink lg:hidden"
                >
                  <ArrowLeft className="flip-x h-5 w-5" aria-hidden />
                </button>
                <Avatar name={customer.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{customer.name}</p>
                  <a href={`tel:${customer.phone}`} className="block text-xs text-muted hover:text-ink" dir="ltr">
                    {customer.phone}
                  </a>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    tone={selected.status === 'bot' ? 'success' : selected.status === 'human' ? 'warning' : 'neutral'}
                  >
                    {t(`status.${selected.status}`)}
                  </Badge>
                  {selected.afterHours && <Badge tone="secondary">{t('simulation.afterHoursBadge')}</Badge>}
                  <button
                    type="button"
                    onClick={() => {
                      runtime.selectConversation(selected.id);
                      navigate('/simulation');
                    }}
                    className="min-h-[36px] rounded-lg px-2 text-xs font-semibold text-secondary hover:bg-secondary/10"
                  >
                    {t('conversations.openInSimulation')}
                  </button>
                </div>
              </div>

              {(selected.status === 'human' || selected.afterHours) && (
                <div className="flex flex-wrap items-center gap-2 border-b border-line bg-warning/5 px-3 py-2 text-[11px] font-semibold text-warning">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  {selected.status === 'human' ? t('conversations.takeoverNote') : t('conversations.afterHoursNote')}
                </div>
              )}

              <div ref={scrollRef} className="flex-1 space-y-1.5 overflow-y-auto bg-surface2/30 px-3 py-3">
                {thread.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted">{t('conversations.noMessages')}</p>
                ) : (
                  thread.map((message, index) => {
                    const previous = thread[index - 1];
                    const newDay = !previous || dateKey(new Date(previous.at)) !== dateKey(new Date(message.at));
                    return (
                      <div key={message.id} className="space-y-1.5">
                        {newDay && (
                          <div className="flex justify-center py-1">
                            <span className="rounded-lg bg-surface px-2.5 py-1 text-[10px] font-semibold text-muted shadow-sm">
                              {formatDateLabel(new Date(message.at), language, numerals, {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>
                        )}
                        <ChatBubble message={message} language={language} numerals={numerals} />
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-line p-3">
                {selected.status === 'closed' ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted">{t('conversations.closedNotice')}</p>
                    <button
                      type="button"
                      onClick={() => {
                        runtime.reopenConversation(selected.id);
                        pushToast('success', t('conversations.reopen'));
                      }}
                      className="min-h-[40px] rounded-xl bg-primary px-3 text-xs font-bold text-primary-fg"
                    >
                      {t('conversations.reopen')}
                    </button>
                  </div>
                ) : selected.status === 'bot' ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      <Bot className="h-4 w-4" aria-hidden />
                      {t('conversations.botHandles')}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        runtime.takeOver(selected.id);
                        pushToast('success', t('conversations.takeoverNote'));
                      }}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-warning px-3 text-xs font-bold text-white"
                    >
                      <UserCheck className="h-4 w-4" aria-hidden />
                      {t('conversations.takeOver')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <form onSubmit={sendReply} className="flex items-end gap-2">
                      <input
                        value={reply}
                        onChange={(event) => setReply(event.target.value)}
                        placeholder={t('conversations.replyPlaceholder')}
                        aria-label={t('aria.messageInput')}
                        maxLength={2000}
                        className="field min-h-[44px] flex-1"
                      />
                      <button
                        type="submit"
                        disabled={!reply.trim()}
                        aria-label={t('conversations.replyAsOwner')}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-fg disabled:opacity-45"
                      >
                        <Send className="h-4 w-4" aria-hidden />
                      </button>
                    </form>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          runtime.returnToBot(selected.id);
                          pushToast('success', t('conversations.returnedNote'));
                        }}
                        className="min-h-[36px] rounded-lg px-2 text-xs font-semibold text-secondary hover:bg-secondary/10"
                      >
                        {t('conversations.returnToBot')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          runtime.closeConversation(selected.id);
                          pushToast('success', t('conversations.closedNote'));
                        }}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-xs font-semibold text-muted hover:bg-surface2 hover:text-danger"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                        {t('conversations.close')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
