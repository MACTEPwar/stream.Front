import { Component } from '@angular/core';

import { SOCIAL_LINKS } from '../../config/social-links.config';
import { SectionTitle } from '../../../../shared/components/section-title/section-title';
import { SocialLinkItem } from '../social-link-item/social-link-item';

/**
 * Блок соцсетей (stream.Front#32) — заголовок `SectionTitle` («Соц. сети»)
 * + список `SocialLinkItem` (иконка + хэндл), данные — статичный конфиг
 * `SOCIAL_LINKS` (не backend, см. `social-links.config.ts`).
 */
@Component({
  selector: 'app-social-links-block',
  imports: [SectionTitle, SocialLinkItem],
  templateUrl: './social-links-block.html',
  styleUrl: './social-links-block.scss',
})
export class SocialLinksBlock {
  protected readonly links = SOCIAL_LINKS;
}
