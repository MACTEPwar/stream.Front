import { TestBed } from '@angular/core/testing';
import { Component, input } from '@angular/core';

import { ModalService } from '@core/services/modal.service';
import { ModalHost } from './modal-host';

@Component({
  selector: 'app-test-modal-content',
  template: '<p>{{ data() }}</p>',
})
class TestModalContent {
  readonly data = input<string>();
}

describe('ModalHost', () => {
  let modalService: ModalService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalHost],
    }).compileComponents();

    modalService = TestBed.inject(ModalService);
  });

  it('ничего не рендерит, когда нет активного компонента', () => {
    const fixture = TestBed.createComponent(ModalHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.modal-host__backdrop')).toBeNull();
  });

  it('рендерит активный компонент с переданными данными', () => {
    modalService.open(TestModalContent, 'Привет');

    const fixture = TestBed.createComponent(ModalHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.modal-host__backdrop')).not.toBeNull();
    expect(el.textContent).toContain('Привет');
  });

  it('клик по backdrop закрывает модалку', () => {
    modalService.open(TestModalContent, 'Привет');

    const fixture = TestBed.createComponent(ModalHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLElement>('.modal-host__backdrop')?.click();
    fixture.detectChanges();

    expect(modalService.activeComponent()).toBeNull();
    expect(el.querySelector('.modal-host__backdrop')).toBeNull();
  });

  it('клик по панели не закрывает модалку', () => {
    modalService.open(TestModalContent, 'Привет');

    const fixture = TestBed.createComponent(ModalHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLElement>('.modal-host__panel')?.click();
    fixture.detectChanges();

    expect(modalService.activeComponent()).toBe(TestModalContent);
    expect(el.querySelector('.modal-host__backdrop')).not.toBeNull();
  });

  it('Esc закрывает модалку', () => {
    modalService.open(TestModalContent, 'Привет');

    const fixture = TestBed.createComponent(ModalHost);
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(modalService.activeComponent()).toBeNull();
  });

  it('клик по крестику закрывает модалку', () => {
    modalService.open(TestModalContent, 'Привет');

    const fixture = TestBed.createComponent(ModalHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    el.querySelector<HTMLButtonElement>('.modal-host__close')?.click();
    fixture.detectChanges();

    expect(modalService.activeComponent()).toBeNull();
  });
});
