import { TestBed } from '@angular/core/testing';

import { Button } from './button';

describe('Button', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [Button] });
  });

  it('рендерит кнопку со статичным SVG', () => {
    const fixture = TestBed.createComponent(Button);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('button.button')).not.toBeNull();
    expect(el.querySelector('svg.button__svg')).not.toBeNull();
  });
});
