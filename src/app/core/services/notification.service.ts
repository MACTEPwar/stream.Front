import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  /** null — уведомление persistent, скрывается только через dismiss()/dismissAll() */
  durationMs: number | null;
}

const DEFAULT_DURATION_MS = 4000;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly notificationsSignal = signal<Notification[]>([]);
  readonly notifications = this.notificationsSignal.asReadonly();

  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  show(
    message: string,
    type: NotificationType = 'info',
    durationMs: number | null = DEFAULT_DURATION_MS,
  ): string {
    const id = crypto.randomUUID();
    this.notificationsSignal.update((list) => [...list, { id, message, type, durationMs }]);

    if (durationMs !== null && durationMs > 0) {
      const timer = setTimeout(() => this.dismiss(id), durationMs);
      this.timers.set(id, timer);
    }

    return id;
  }

  dismiss(id: string): void {
    this.clearTimer(id);
    this.notificationsSignal.update((list) =>
      list.filter((notification) => notification.id !== id),
    );
  }

  dismissAll(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.notificationsSignal.set([]);
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }
}
