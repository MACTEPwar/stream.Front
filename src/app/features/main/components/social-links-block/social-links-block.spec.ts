import { TestBed } from '@angular/core/testing';

import { SOCIAL_LINKS } from '../../config/social-links.config';
import { SocialLinksBlock } from './social-links-block';

describe('SocialLinksBlock', () => {
  it('рендерит заголовок «Соц. сети» и по одной app-social-link-item на каждую запись SOCIAL_LINKS', async () => {
    const fixture = TestBed.createComponent(SocialLinksBlock);
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-section-title')).not.toBeNull();
    expect(el.querySelectorAll('app-social-link-item')).toHaveLength(SOCIAL_LINKS.length);
  });

  // Регрессия (stream.Front#150): на компактном баре MainCarousel (реальная
  // ширина ~300–360px) иконки+хэндлы в один нерастягиваемый flex-ряд наезжали
  // за край — flex-wrap позволяет им переноситься на новую строку при любой
  // ширине контейнера, а не требует отдельного брейкпоинта.
  it('список иконок переносится на новую строку, если не помещается (flex-wrap)', async () => {
    const fixture = TestBed.createComponent(SocialLinksBlock);
    await fixture.whenStable();

    const list: HTMLElement = fixture.nativeElement.querySelector('.social-links-block__list');
    expect(getComputedStyle(list).flexWrap).toBe('wrap');
  });
});
