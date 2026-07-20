import { TestBed } from '@angular/core/testing';

import { SocialLink } from '../../config/social-links.config';
import { SocialLinkItem } from './social-link-item';

const link: SocialLink = {
  icon: '/icons/social-link-46.svg',
  handle: '@belkasmailykova',
  url: 'https://example.com/belkasmailykova',
};

describe('SocialLinkItem', () => {
  it('рендерит иконку и хэндл, ссылка ведёт на link().url и открывается в новой вкладке', async () => {
    const fixture = TestBed.createComponent(SocialLinkItem);
    fixture.componentRef.setInput('link', link);
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    const a = el.querySelector('a')!;
    const img = el.querySelector('img')!;

    expect(a.getAttribute('href')).toBe(link.url);
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    expect(img.getAttribute('src')).toBe(link.icon);
    expect(el.querySelector('.social-link-item__handle')?.textContent).toBe(link.handle);
  });
});
