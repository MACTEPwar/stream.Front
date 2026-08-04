import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { Component, input } from '@angular/core';
import { Subject } from 'rxjs';

import { ModalService } from '@core/services/modal.service';
import { SMALL_QUERY } from '@shared/utils/breakpoints';
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
  let breakpointState$: Subject<BreakpointState>;

  beforeEach(async () => {
    breakpointState$ = new Subject<BreakpointState>();

    await TestBed.configureTestingModule({
      imports: [ModalHost],
      providers: [
        // jsdom не реализует `matchMedia`, от которого зависит реальный
        // `BreakpointObserver` (тот же гочтч, что у `p-select`'s `Overlay`,
        // см. `select.spec.ts`) — начальное синхронное `false` (не `small`),
        // конкретные тесты `--sheet` переключают через `breakpointState$`.
        { provide: BreakpointObserver, useValue: { observe: () => breakpointState$.asObservable() } },
      ],
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

  it('модалка с presentation="sheet-on-mobile" на small-вьюпорте получает класс --sheet', () => {
    modalService.open(TestModalContent, 'Привет', 'sheet-on-mobile');

    const fixture = TestBed.createComponent(ModalHost);
    fixture.detectChanges();
    breakpointState$.next({ matches: true, breakpoints: { [SMALL_QUERY]: true } });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.modal-host__backdrop--sheet')).not.toBeNull();
    expect(el.querySelector('.modal-host__panel--sheet')).not.toBeNull();
  });

  it('модалка с presentation="sheet-on-mobile" вне small-вьюпорта остаётся обычной модалкой', () => {
    modalService.open(TestModalContent, 'Привет', 'sheet-on-mobile');

    const fixture = TestBed.createComponent(ModalHost);
    fixture.detectChanges();
    breakpointState$.next({ matches: false, breakpoints: { [SMALL_QUERY]: false } });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.modal-host__backdrop--sheet')).toBeNull();
    expect(el.querySelector('.modal-host__panel--sheet')).toBeNull();
  });

  it('модалка с presentation="default" на small-вьюпорте НЕ получает класс --sheet', () => {
    modalService.open(TestModalContent, 'Привет');

    const fixture = TestBed.createComponent(ModalHost);
    fixture.detectChanges();
    breakpointState$.next({ matches: true, breakpoints: { [SMALL_QUERY]: true } });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.modal-host__backdrop--sheet')).toBeNull();
    expect(el.querySelector('.modal-host__panel--sheet')).toBeNull();
  });
});
