import { Component } from '@angular/core';

import { MainCarousel } from '../../components/main-carousel/main-carousel';

/**
 * Временная страница для ручной проверки MainCarousel (stream.Front#28).
 * Виджеты Schedule/Donators/Social (задачи #30/#31/#32) ещё не реализованы —
 * вместо них заглушки. Финальная страница/роут Main — отдельная задача #33,
 * этот компонент будет заменён/дополнен при её реализации.
 */
@Component({
  selector: 'app-main-page',
  imports: [MainCarousel],
  templateUrl: './main-page.html',
  styleUrl: './main-page.scss',
})
export class MainPage {}
