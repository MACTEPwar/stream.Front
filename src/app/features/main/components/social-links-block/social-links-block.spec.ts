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
});
