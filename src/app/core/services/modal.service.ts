import { Injectable, Type, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ModalService {
  private readonly activeComponentSignal = signal<Type<unknown> | null>(null);
  readonly activeComponent = this.activeComponentSignal.asReadonly();

  private readonly activeDataSignal = signal<unknown>(undefined);
  readonly activeData = this.activeDataSignal.asReadonly();

  open<TData = unknown>(component: Type<unknown>, data?: TData): void {
    this.activeComponentSignal.set(component);
    this.activeDataSignal.set(data);
  }

  close(): void {
    this.activeComponentSignal.set(null);
    this.activeDataSignal.set(undefined);
  }
}
