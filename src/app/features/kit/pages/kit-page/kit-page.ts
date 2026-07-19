import { Component } from '@angular/core';

import { Button } from '../../../../shared/components/button/button';
import { ListContainer } from '../../../../shared/components/list-container/list-container';
import { ScheduleDayRow } from '../../../../shared/components/schedule-day-row/schedule-day-row';
import { SectionTitle } from '../../../../shared/components/section-title/section-title';

/**
 * Служебная страница-каталог UI-kit компонентов (stream.Front#39) — не часть
 * пользовательского сайта, только для ручной сверки вариантов при вёрстке.
 */
@Component({
  selector: 'app-kit-page',
  imports: [Button, SectionTitle, ListContainer, ScheduleDayRow],
  templateUrl: './kit-page.html',
  styleUrl: './kit-page.scss',
})
export class KitPage {}
