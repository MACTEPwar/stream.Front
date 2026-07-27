import { TestBed } from '@angular/core/testing';

import { KitPage } from './kit-page';

describe('KitPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [KitPage] });
  });

  it('по умолчанию выбран первый компонент (DecorativeButton) — сайдбар подсвечивает его, контент показан', () => {
    const fixture = TestBed.createComponent(KitPage);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const links = Array.from(el.querySelectorAll<HTMLButtonElement>('.kit-page__nav-link'));
    expect(links.map((l) => l.textContent?.trim())).toEqual([
      'DecorativeButton',
      'Button',
      'SectionTitle',
      'List',
      'Таблица',
    ]);
    expect(links[0].classList).toContain('kit-page__nav-link--active');
    expect(el.querySelector('.kit-page__title')?.textContent).toBe('DecorativeButton');
  });

  it('клик по пункту сайдбара переключает видимый контент, скрывая остальные компоненты', () => {
    const fixture = TestBed.createComponent(KitPage);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const links = Array.from(el.querySelectorAll<HTMLButtonElement>('.kit-page__nav-link'));
    links[3].click();
    fixture.detectChanges();

    expect(links[3].classList).toContain('kit-page__nav-link--active');
    expect(links[0].classList).not.toContain('kit-page__nav-link--active');
    expect(el.querySelector('.kit-page__title')?.textContent).toBe('List');
    expect(el.querySelector('app-decorative-button')).toBeNull();
  });

  it('«Button» — рендерит демо прокси-Button (severity/size/disabled/icon)', () => {
    const fixture = TestBed.createComponent(KitPage);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    el.querySelectorAll<HTMLButtonElement>('.kit-page__nav-link')[1].click();
    fixture.detectChanges();

    expect(el.querySelector('.kit-page__title')?.textContent).toBe('Button');
    const buttons = el.querySelectorAll('app-button');
    expect(buttons.length).toBeGreaterThan(0);
    expect(el.querySelector('button.p-button-danger')).not.toBeNull();
    expect(el.querySelector('i.pi-trash')).not.toBeNull();
  });

  it('рендерит demo p-table (stream.Front#75) с тестовыми строками после выбора «Таблица» в сайдбаре', () => {
    const fixture = TestBed.createComponent(KitPage);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    el.querySelectorAll<HTMLButtonElement>('.kit-page__nav-link')[4].click();
    fixture.detectChanges();

    const rows = el.querySelectorAll('.p-datatable-tbody tr');
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain('admin');
    expect(rows[0].textContent).toContain('ADMIN');
  });
});
