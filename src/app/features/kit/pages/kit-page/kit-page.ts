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
  // Сегменты (текст/ширина/цвет/выравнивание) собираются вызывающим кодом
  // (здесь — демо-страницей, в реальном использовании — фичей вроде
  // Schedule): weekday — узкий фиксированный слева, event — растягивается
  // по центру, time — узкий фиксированный справа; online — дефолтным
  // цветом, offline — event/time явно красным.
  protected readonly scheduleListItems: ListItemData[] = [
    {
      id: 1,
      segments: [
        { text: 'Пн', width: '48px', align: 'right' },
        { text: 'Стрим на движке', width: 1, align: 'center' },
        { text: '20:00', width: '56px', align: 'right' },
      ],
    },
    {
      id: 2,
      segments: [
        { text: 'Вт', width: '48px', align: 'center' },
        { text: 'Оффлайн', width: 1, align: 'center', color: '#CF1717' },
        { text: '--:--', width: '56px', align: 'right', color: '#CF1717' },
      ],
    },
    {
      id: 3,
      segments: [
        { text: 'Ср', width: '48px', align: 'left' },
        { text: 'Разбор заявок', width: 1, align: 'center' },
        { text: '19:30', width: '56px', align: 'right' },
      ],
    },
    // Первый сегмент шире, чем у остальных строк (100px вместо 48px) — декор
    // слева (подложка/её граница/разделитель) должен сдвинуться вместе с ним,
    // сохранив те же зазоры (см. firstSegmentShiftPx() в list-item.ts).
    {
      id: 4,
      segments: [
        { text: 'Четверг', width: '100px', align: 'right' },
        { text: 'Турнир', width: 1, align: 'center' },
        { text: '18:00', width: '56px', align: 'right' },
      ],
    },
    // Последний сегмент шире, чем у остальных строк (100px вместо 56px) —
    // правый декор (подложка/её граница/разделитель) зеркально растягивается
    // влево (см. lastSegmentShiftPx() в list-item.ts).
    {
      id: 5,
      segments: [
        { text: 'Пт', width: '148px', align: 'left' },
        { text: 'Финал сезона', width: 1, align: 'center' },
        { text: '21:00 (КИЕВ)', width: '100px', align: 'right' },
      ],
    },
  ];
}
