import { TestBed } from '@angular/core/testing';

import { ModalService } from '@core/services/modal.service';
import { ConfirmModal } from './confirm-modal';

describe('ConfirmModal', () => {
  let modalService: ModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ConfirmModal] });
    modalService = TestBed.inject(ModalService);
  });

  it('рендерит переданное сообщение и дефолтный текст кнопки подтверждения', () => {
    const fixture = TestBed.createComponent(ConfirmModal);
    fixture.componentRef.setInput('data', { message: 'Удалить аккаунт?', onConfirm: () => undefined });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.confirm-modal__message')?.textContent).toContain('Удалить аккаунт?');
    const buttons = el.querySelectorAll<HTMLButtonElement>('app-button button.button');
    expect(buttons[0].textContent).toContain('Подтвердить');
    expect(buttons[1].textContent).toContain('Отмена');
  });

  it('confirmText переопределяет текст кнопки подтверждения', () => {
    const fixture = TestBed.createComponent(ConfirmModal);
    fixture.componentRef.setInput('data', {
      message: 'Удалить?',
      confirmText: 'Удалить',
      onConfirm: () => undefined,
    });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const confirmButton = el.querySelector<HTMLButtonElement>('app-button button.button');
    expect(confirmButton?.textContent).toContain('Удалить');
  });

  it('кнопка подтверждения вызывает onConfirm и закрывает модалку', () => {
    const closeSpy = vi.spyOn(modalService, 'close');
    const onConfirm = vi.fn();
    const fixture = TestBed.createComponent(ConfirmModal);
    fixture.componentRef.setInput('data', { message: 'Удалить?', onConfirm });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    el.querySelectorAll<HTMLButtonElement>('app-button button.button')[0].click();

    expect(onConfirm).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('«Отмена» закрывает модалку без вызова onConfirm', () => {
    const closeSpy = vi.spyOn(modalService, 'close');
    const onConfirm = vi.fn();
    const fixture = TestBed.createComponent(ConfirmModal);
    fixture.componentRef.setInput('data', { message: 'Удалить?', onConfirm });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    el.querySelectorAll<HTMLButtonElement>('app-button button.button')[1].click();

    expect(onConfirm).not.toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
  });
});
