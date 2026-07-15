import { TestBed } from '@angular/core/testing';

import { ErrorMessage } from './error-message';

describe('ErrorMessage', () => {
  it('показывает единый текст «Ошибка загрузки» по умолчанию', () => {
    const fixture = TestBed.createComponent(ErrorMessage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('Ошибка загрузки');
  });

  it('позволяет переопределить текст через input, если понадобится', () => {
    const fixture = TestBed.createComponent(ErrorMessage);
    fixture.componentRef.setInput('message', 'Не удалось загрузить новости');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('Не удалось загрузить новости');
  });
});
