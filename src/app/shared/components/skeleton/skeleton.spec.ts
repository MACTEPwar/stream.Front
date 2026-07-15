import { TestBed } from '@angular/core/testing';

import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('применяет размеры по умолчанию', () => {
    const fixture = TestBed.createComponent(Skeleton);
    fixture.detectChanges();

    const el = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.skeleton')!;
    expect(el.style.width).toBe('100%');
    expect(el.style.height).toBe('16px');
    expect(el.style.borderRadius).toBe('4px');
  });

  it('подстраивает форму/размер под переданные inputs (пример использования)', () => {
    const fixture = TestBed.createComponent(Skeleton);
    fixture.componentRef.setInput('width', '240px');
    fixture.componentRef.setInput('height', '48px');
    fixture.componentRef.setInput('radius', '50%');
    fixture.detectChanges();

    const el = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.skeleton')!;
    expect(el.style.width).toBe('240px');
    expect(el.style.height).toBe('48px');
    expect(el.style.borderRadius).toBe('50%');
  });

  it('подключает shimmer-анимацию (класс, несущий @keyframes skeleton-shimmer)', () => {
    const fixture = TestBed.createComponent(Skeleton);
    fixture.detectChanges();

    const el = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.skeleton')!;
    expect(el.classList.contains('skeleton')).toBe(true);
  });
});
