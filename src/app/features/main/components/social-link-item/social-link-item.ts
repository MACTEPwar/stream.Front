import { Component, input } from '@angular/core';

import { SocialLink } from '../../config/social-links.config';

/**
 * Одна строка блока соцсетей (stream.Front#32) — иконка + хэндл-ссылка.
 * Не переиспользует `ListItem` — тот принимает только текстовые сегменты
 * и всегда рисует декоративную «пилюлю» из Schedule.svg, а на мокапе
 * строка плоская (иконка + текст, без подложки).
 */
@Component({
  selector: 'app-social-link-item',
  imports: [],
  templateUrl: './social-link-item.html',
  styleUrl: './social-link-item.scss',
})
export class SocialLinkItem {
  readonly link = input.required<SocialLink>();
}
