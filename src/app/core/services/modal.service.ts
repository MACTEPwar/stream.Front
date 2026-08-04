import { Injectable, Type, signal } from '@angular/core';

/**
 * Вариант презентации модалки (`stream.Front#122`) — `'default'` (обычная
 * центральная панель, поведение по умолчанию) или `'sheet-on-mobile'`
 * (на `small`-вьюпорте `ModalHost` показывает панель нижней шторкой —
 * bottom sheet — вместо центральной модалки; на `middle`/`large` разницы
 * нет). Решение, какой конкретно компонент хочет альтернативную презентацию
 * на мобильном — за вызывающим кодом (`ModalService.open()`), не за самим
 * `ModalHost` — он остаётся общим слотом без знания о конкретных
 * модалках-потребителях (первый и пока единственный потребитель —
 * `NewsDetailModal`, см. `NewsPage.onOpenDetail()`).
 */
export type ModalPresentation = 'default' | 'sheet-on-mobile';

@Injectable({ providedIn: 'root' })
export class ModalService {
  private readonly activeComponentSignal = signal<Type<unknown> | null>(null);
  readonly activeComponent = this.activeComponentSignal.asReadonly();

  private readonly activeDataSignal = signal<unknown>(undefined);
  readonly activeData = this.activeDataSignal.asReadonly();

  private readonly activePresentationSignal = signal<ModalPresentation>('default');
  readonly activePresentation = this.activePresentationSignal.asReadonly();

  open<TData = unknown>(component: Type<unknown>, data?: TData, presentation: ModalPresentation = 'default'): void {
    this.activeComponentSignal.set(component);
    this.activeDataSignal.set(data);
    this.activePresentationSignal.set(presentation);
  }

  close(): void {
    this.activeComponentSignal.set(null);
    this.activeDataSignal.set(undefined);
    this.activePresentationSignal.set('default');
  }
}
