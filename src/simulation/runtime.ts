import i18n from '../i18n';
import { botConfigFor, useSettingsStore } from '../store/settings';
import { useAppStore } from '../store/app';
import { useSimStore, simNow } from '../store/sim';
import { notify } from '../store/notifications';
import { useUiStore } from '../store/ui';
import { runBot } from './BotEngine';
import { scenarioById } from './scenarios';
import type { DemoScenario } from '../data/types';
import {
  formatDateLabel,
  formatMoney,
  formatTimeLabel,
  fromDateKey,
} from '../utils/date';

const guestPhones: Record<number, string> = {};

function guestPhone(businessId: number): string {
  guestPhones[businessId] ??= `+96478${String(1000000 + businessId)}`;
  return guestPhones[businessId];
}

function clockDate(clock: string | null): Date {
  const d = new Date();
  if (clock) {
    const [h, m] = clock.split(':').map(Number);
    d.setHours(h || 0, m || 0, 0, 0);
  } else {
    d.setHours(10, 0, 0, 0);
  }
  return d;
}

function textFor(lang: 'ar' | 'en', ar: string, en: string): string {
  return lang === 'ar' ? ar : en;
}

class SimulationRuntime {
  private generation = 0;

  private alive(gen: number): boolean {
    return gen === this.generation;
  }

  private sleep(ms: number, gen: number): Promise<boolean> {
    return new Promise((resolve) => {
      let elapsed = 0;
      let last = performance.now();
      const timer = setInterval(() => {
        if (!this.alive(gen)) {
          clearInterval(timer);
          resolve(false);
          return;
        }
        const now = performance.now();
        if (!useSimStore.getState().paused) {
          elapsed += now - last;
        }
        last = now;
        const speed = Math.max(0.5, useSettingsStore.getState().simulationSpeed);
        if (elapsed >= ms / speed) {
          clearInterval(timer);
          resolve(true);
        }
      }, 50);
    });
  }

  private advanceClock(seconds: number): void {
    const next = new Date(simNow().getTime() + seconds * 1000);
    useSimStore.getState().setClock(next.toISOString());
  }

  private typingDelay(text: string): number {
    return Math.min(2200, Math.max(650, text.length * 32));
  }

  private activeConversationFor(businessId: number): number | null {
    const app = useAppStore.getState();
    const sim = useSimStore.getState();
    const candidates = [sim.activeConversationId, app.activeConversationId];
    for (const id of candidates) {
      if (!id) continue;
      const conv = app.conversations.find(
        (c) => c.id === id && c.businessId === businessId && c.status !== 'closed',
      );
      if (conv) return conv.id;
    }
    const customer = app.findOrCreateCustomer({
      name: i18n.t('simulation.guestCustomer'),
      phone: guestPhone(businessId),
    });
    if (!customer) return null;
    const conversation = app.createConversation({ businessId, customerId: customer.id });
    useSimStore.getState().setActiveConversation(conversation.id);
    return conversation.id;
  }

  async startScenario(id: string): Promise<void> {
    const scenario = scenarioById(id);
    if (!scenario) return;
    const app = useAppStore.getState();
    const business =
      app.businesses.find((b) => b.type === scenario.businessType) ??
      app.businesses.find((b) => b.id === app.activeBusinessId);
    if (!business) return;

    this.generation++;
    const gen = this.generation;
    const lang = useSettingsStore.getState().language;
    const start = clockDate(scenario.clock);
    const startIso = start.toISOString();

    useSimStore.getState().start({
      scenarioId: scenario.id,
      totalSteps: scenario.messages.length,
      clockIso: startIso,
    });
    app.setActiveBusiness(business.id);
    useUiStore.getState().setRole('customer');

    const customer =
      app.findOrCreateCustomer({
        name: lang === 'ar' ? scenario.customer.name : scenario.customer.nameEn,
        phone: scenario.customer.phone,
      }) ?? app.customers.find((c) => c.phone === scenario.customer.phone);
    if (!customer) {
      useSimStore.getState().finish();
      return;
    }

    const conversation = app.createConversation({
      businessId: business.id,
      customerId: customer.id,
      createdAt: startIso,
    });
    useSimStore.getState().setActiveConversation(conversation.id);

    for (let index = 0; index < scenario.messages.length; index++) {
      if (!this.alive(gen)) return;
      const step = scenario.messages[index];
      const text = lang === 'ar' ? step.text : step.textEn;

      const thought = await this.sleep(step.delayMs, gen);
      if (!thought || !this.alive(gen)) return;

      useSimStore.getState().setTyping('customer');
      const typed = await this.sleep(this.typingDelay(text), gen);
      useSimStore.getState().setTyping(null);
      if (!typed || !this.alive(gen)) return;

      if (step.role === 'owner') {
        useAppStore.getState().appendMessage({
          conversationId: conversation.id,
          sender: 'human',
          text,
          at: simNow().toISOString(),
        });
        useAppStore.getState().setConversationStatus(conversation.id, 'human');
      } else {
        useAppStore.getState().appendMessage({
          conversationId: conversation.id,
          sender: 'customer',
          text,
          at: simNow().toISOString(),
          status: 'read',
        });
        this.advanceClock(20);
        await this.replyAsBot(conversation.id, text, gen);
      }
      useSimStore.getState().setStep(index + 1);
      this.advanceClock(40);
    }

    if (!this.alive(gen)) return;
    useSimStore.getState().finish();
  }

  private async replyAsBot(conversationId: number, text: string, gen: number): Promise<void> {
    const app = useAppStore.getState();
    const conversation = app.conversations.find((c) => c.id === conversationId);
    if (!conversation || conversation.status !== 'bot') return;
    const business = app.businesses.find((b) => b.id === conversation.businessId);
    const customer = app.customers.find((c) => c.id === conversation.customerId);
    if (!business || !customer) return;

    const result = runBot({
      text,
      business,
      products: app.products,
      appointments: app.appointments,
      customer,
      conversation,
      now: simNow(),
      config: botConfigFor(business.id),
    });

    if (result.replies.length === 0) return;
    useSimStore.getState().setTyping('bot');
    const waited = await this.sleep(this.typingDelay(result.replies.join(' ')), gen);
    useSimStore.getState().setTyping(null);
    if (!waited || !this.alive(gen)) return;

    const replies = result.replies;
    for (let i = 0; i < replies.length; i++) {
      if (!this.alive(gen)) return;
      useAppStore.getState().appendMessage({
        conversationId,
        sender: 'bot',
        text: replies[i],
        at: simNow().toISOString(),
      });
      this.advanceClock(15);
      if (i < replies.length - 1) {
        const gap = await this.sleep(350, gen);
        if (!gap) return;
      }
    }
    useAppStore.getState().markCustomerMessagesRead(conversationId);

    if (result.afterHours) {
      useAppStore.getState().setConversationAfterHours(conversationId, true);
    }
    useAppStore.getState().setConversationBotState(conversationId, result.state);

    if (result.action?.type === 'handoff') {
      useAppStore.getState().setConversationStatus(conversationId, 'human');
      this.raiseHandoff(conversationId);
      return;
    }

    if (result.action?.type === 'appointment') {
      const appointment = useAppStore.getState().addAppointment({
        businessId: business.id,
        customerId: customer.id,
        date: result.action.date,
        time: result.action.time,
        service: result.action.service,
      });
      if (appointment.ok) {
        this.raiseAppointment(
          customer.name,
          result.action.date,
          result.action.time,
          result.lang,
        );
      } else {
        useAppStore.getState().appendMessage({
          conversationId,
          sender: 'bot',
          text: textFor(
            result.lang,
            'أعتذر، هذا الوقت انحجز قبل قليل. اختار وقت ثاني من الأوقات اللي عرضتها عليك، أو خلي أحد من الفريق يتواصل وياك.',
            'Sorry, that slot was just taken. Pick another time from the list, or a team member will follow up with you.',
          ),
          at: simNow().toISOString(),
        });
        useAppStore.getState().setConversationBotState(conversationId, null);
      }
    }

    if (result.action?.type === 'order') {
      const order = useAppStore.getState().addOrder({
        businessId: business.id,
        customerId: customer.id,
        items: result.action.items,
        address: result.action.address,
        phone: result.action.phone,
      });
      if (order.ok) {
        const total = useAppStore
          .getState()
          .orders.find((o) => o.id === order.id)?.total;
        this.raiseOrder(customer.name, total ?? 0, result.lang);
      } else {
        useAppStore.getState().appendMessage({
          conversationId,
          sender: 'bot',
          text: textFor(
            result.lang,
            'أعتذر، صار خلل بتسجيل الطلب. حوّلت محادثتك لصاحب العمل حتى يكمّل وياك.',
            'Sorry, the order could not be recorded. I have handed your chat to the business owner.',
          ),
          at: simNow().toISOString(),
        });
        useAppStore.getState().setConversationStatus(conversationId, 'human');
        this.raiseHandoff(conversationId);
      }
    }
  }

  private raiseOrder(customerName: string, total: number, lang: 'ar' | 'en'): void {
    const settings = useSettingsStore.getState();
    notify(
      'order',
      i18n.t('toasts.order'),
      i18n.t('toasts.orderBody', {
        customer: customerName,
        total: formatMoney(total, settings.numerals, lang),
      }),
    );
  }

  private raiseAppointment(
    customerName: string,
    date: string,
    time: string,
    lang: 'ar' | 'en',
  ): void {
    const settings = useSettingsStore.getState();
    notify(
      'appointment',
      i18n.t('toasts.appointment'),
      i18n.t('toasts.appointmentBody', {
        customer: customerName,
        date: formatDateLabel(fromDateKey(date), lang, settings.numerals, {
          day: 'numeric',
          month: 'short',
        }),
        time: formatTimeLabel(time, lang, settings.numerals),
      }),
    );
  }

  private raiseHandoff(conversationId: number): void {
    const app = useAppStore.getState();
    const conversation = app.conversations.find((c) => c.id === conversationId);
    const customer = conversation
      ? app.customers.find((c) => c.id === conversation.customerId)
      : null;
    notify(
      'handoff',
      i18n.t('toasts.handoff'),
      i18n.t('toasts.handoffBody', { customer: customer?.name ?? '' }),
    );
  }

  async sendCustomer(text: string): Promise<void> {
    const clean = text.trim();
    if (!clean) return;
    const app = useAppStore.getState();
    const business = app.businesses.find((b) => b.id === app.activeBusinessId);
    if (!business) return;
    useSimStore.getState().setPaused(false);
    this.generation++;
    const gen = this.generation;
    useSimStore.getState().finish();

    const conversationId = this.activeConversationFor(business.id);
    if (!conversationId) return;
    const conversation = useAppStore.getState().conversations.find((c) => c.id === conversationId);
    if (!conversation || conversation.status === 'closed') return;

    useAppStore.getState().appendMessage({
      conversationId,
      sender: 'customer',
      text: clean,
      at: simNow().toISOString(),
    });
    this.advanceClock(10);

    if (conversation.status === 'bot') {
      await this.replyAsBot(conversationId, clean, gen);
    }
  }

  sendOwner(text: string, conversationId?: number | null): void {
    const clean = text.trim();
    if (!clean) return;
    const app = useAppStore.getState();
    const id = conversationId ?? useSimStore.getState().activeConversationId ?? app.activeConversationId;
    if (!id) return;
    const conversation = app.conversations.find((c) => c.id === id);
    if (!conversation || conversation.status === 'closed') return;
    if (conversation.status !== 'human') {
      app.setConversationStatus(id, 'human');
    }
    app.appendMessage({
      conversationId: id,
      sender: 'human',
      text: clean,
      at: simNow().toISOString(),
    });
  }

  takeOver(conversationId: number): void {
    useAppStore.getState().setConversationStatus(conversationId, 'human');
  }

  returnToBot(conversationId: number): void {
    const app = useAppStore.getState();
    app.setConversationStatus(conversationId, 'bot');
    app.setConversationBotState(conversationId, null);
    app.setConversationAfterHours(conversationId, false);
  }

  closeConversation(conversationId: number): void {
    useAppStore.getState().setConversationStatus(conversationId, 'closed');
  }

  reopenConversation(conversationId: number): void {
    useAppStore.getState().setConversationStatus(conversationId, 'bot');
  }

  selectConversation(conversationId: number): void {
    const app = useAppStore.getState();
    const conversation = app.conversations.find((c) => c.id === conversationId);
    if (!conversation) return;
    app.setActiveBusiness(conversation.businessId);
    app.setActiveConversation(conversationId);
    useSimStore.getState().setActiveConversation(conversationId);
  }

  pause(): void {
    if (useSimStore.getState().running) useSimStore.getState().setPaused(true);
  }

  resume(): void {
    useSimStore.getState().setPaused(false);
  }

  reset(): void {
    this.generation++;
    useSimStore.getState().reset();
    useAppStore.getState().setActiveConversation(null);
  }

  /** Starts a blank conversation with the guest customer for the active business. */
  newChat(): number | null {
    this.generation++;
    const app = useAppStore.getState();
    const business = app.businesses.find((b) => b.id === app.activeBusinessId);
    if (!business) return null;
    useSimStore.getState().reset();
    useSimStore.getState().setClock(new Date().toISOString());
    useUiStore.getState().setRole('customer');
    const customer = app.findOrCreateCustomer({
      name: i18n.t('simulation.guestCustomer'),
      phone: guestPhone(business.id),
    });
    if (!customer) return null;
    const conversation = useAppStore.getState().createConversation({
      businessId: business.id,
      customerId: customer.id,
    });
    useSimStore.getState().setActiveConversation(conversation.id);
    return conversation.id;
  }

  stop(): void {
    this.generation++;
    useSimStore.getState().finish();
  }
}

export const runtime = new SimulationRuntime();

export function scenarioLanguageText(
  scenario: DemoScenario,
  index: number,
  lang: 'ar' | 'en',
): string {
  const message = scenario.messages[index];
  if (!message) return '';
  return lang === 'ar' ? message.text : message.textEn;
}
