import { TestBed } from '@angular/core/testing';

import { KitPage } from './kit-page';

describe('KitPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [KitPage] });
  });

  it('рендерит demo p-table (stream.Front#75) с тестовыми строками', () => {
    const fixture = TestBed.createComponent(KitPage);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const rows = el.querySelectorAll('.p-datatable-tbody tr');
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain('admin');
    expect(rows[0].textContent).toContain('ADMIN');
  });
});
