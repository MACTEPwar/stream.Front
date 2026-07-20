import { Component } from '@angular/core';

import { MainCarousel } from '../../components/main-carousel/main-carousel';
import { ScheduleWidget } from '../../components/schedule-widget/schedule-widget';
import { SocialLinksBlock } from '../../components/social-links-block/social-links-block';

/**
 * Временная страница для ручной проверки MainCarousel (stream.Front#28).
 * Donators (#31) ещё не реализован — вместо него заглушка; Schedule (#30)
 * и Social (#32) уже подключены. Финальная страница/роут Main — отдельная
 * задача #33, этот компонент будет заменён/дополнен при её реализации.
 */
@Component({
  selector: 'app-main-page',
  imports: [MainCarousel, ScheduleWidget, SocialLinksBlock],
  templateUrl: './main-page.html',
  styleUrl: './main-page.scss',
})
export class MainPage {}
