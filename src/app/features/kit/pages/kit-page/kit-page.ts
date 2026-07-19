import { Component } from '@angular/core';

import { Button } from '../../../../shared/components/button/button';
import { List, ListItemData } from '../../../../shared/components/list/list';
import { SectionTitle } from '../../../../shared/components/section-title/section-title';

/**
 * Служебная страница-каталог UI-kit компонентов (stream.Front#39) — не часть
 * пользовательского сайта, только для ручной сверки вариантов при вёрстке.
 */
@Component({
  selector: 'app-kit-page',
  imports: [Button, SectionTitle, List],
  templateUrl: './kit-page.html',
  styleUrl: './kit-page.scss',
})
export class KitPage {
  // Сегменты собираются вызывающим кодом (здесь — демо-страницей, в реальном
  // использовании — фичей вроде Schedule): online-строка — 3 сегмента
  // дефолтным цветом, offline — средний/правый сегмент явно красным.
  protected readonly scheduleListItems: ListItemData[] = [
    { id: 1, segments: [{ text: 'Пн' }, { text: 'Стрим на движке' }, { text: '20:00' }] },
    { id: 2, segments: [{ text: 'Вт' }, { text: 'Оффлайн', color: '#CF1717' }, { text: '--:--', color: '#CF1717' }] },
    { id: 3, segments: [{ text: 'Ср' }, { text: 'Разбор заявок' }, { text: '19:30' }] },
  ];
}
