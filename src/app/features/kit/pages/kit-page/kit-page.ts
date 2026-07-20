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
  // цветом, offline — event/time явно красным. dividers: ['left', 'right'] —
  // явно воспроизводит исходный вид Schedule.svg (левый узор у первой границы,
  // правый — у второй), дефолт компонента на каждый неуказанный индекс — 'left'.
  protected readonly scheduleListItems: ListItemData[] = [
    {
      id: 1,
      segments: [
        { text: 'Пн', width: '48px', align: 'right' },
        { text: 'Стрим на движке', width: 1, align: 'center' },
        { text: '20:00', width: '56px', align: 'right' },
      ],
      dividers: ['left', 'right'],
    },
    {
      id: 2,
      segments: [
        { text: 'Вт', width: '48px', align: 'center' },
        { text: 'Оффлайн', width: 1, align: 'center', color: '#CF1717' },
        { text: '--:--', width: '56px', align: 'right', color: '#CF1717' },
      ],
      dividers: ['left', 'right'],
    },
    {
      id: 3,
      segments: [
        { text: 'Ср', width: '48px', align: 'left' },
        { text: 'Разбор заявок', width: 1, align: 'center' },
        { text: '19:30', width: '56px', align: 'right' },
      ],
      dividers: ['left', 'right'],
    },
    // Первый сегмент шире, чем у остальных строк (100px вместо 48px) — декор
    // слева (подложка/её граница) должен сдвинуться вместе с ним, сохранив
    // те же зазоры (см. firstSegmentShiftPx() в list-item.ts); разделители
    // пересчитываются вместе с ним арифметически (boundaryPositions()).
    {
      id: 4,
      segments: [
        { text: 'Четверг', width: '100px', align: 'right' },
        { text: 'Турнир', width: 1, align: 'center' },
        { text: '18:00', width: '56px', align: 'right' },
      ],
      dividers: ['left', 'right'],
    },
    // Последний сегмент шире, чем у остальных строк (100px вместо 56px) —
    // правый декор (подложка/её граница) зеркально растягивается влево
    // (см. lastSegmentShiftPx() в list-item.ts).
    {
      id: 5,
      segments: [
        { text: 'Пт', width: '58px', align: 'left' },
        { text: 'Финал сезона', width: 1, align: 'center' },
        { text: '21:00 (КИЕВ)', width: '100px', align: 'right' },
      ],
      dividers: ['left', 'right'],
    },
    // Сегментов 2, а не 3 — ровно 1 граница (segments().length - 1), ровно 1
    // разделитель (дефолт 'left', явно не указан).
    {
      id: 6,
      segments: [
        { text: 'Сб', width: '48px', align: 'right' },
        { text: 'Кастомная игра', width: 1, align: 'center' },
      ],
    },
    // dividers() — массив по границам между сегментами (по прямому запросу
    // пользователя: "после каждого элемента идёт разделитель, я сам выбираю
    // какой"), длина = segments().length - 1. 'none' на 0-й границе скрывает
    // разделитель после «Вс», на 1-й — 'right' (второй узор) перед «15:00».
    {
      id: 7,
      segments: [
        { text: 'Вс', width: '48px', align: 'right' },
        { text: 'Открытая тренировка', width: 1, align: 'center' },
        { text: '15:00', width: '56px', align: 'right' },
      ],
      dividers: ['none', 'right'],
    },
    // direction: 'right' — весь декор (остриё-«стрелка», разделители, паддинги
    // контента) зеркалится целиком, остриё оказывается справа вместо левого.
    {
      id: 8,
      segments: [
        { text: 'Пн', width: '48px', align: 'right' },
        { text: 'Зеркальное направление', width: 1, align: 'center' },
        { text: '20:00', width: '56px', align: 'right' },
      ],
      dividers: ['left', 'right'],
      direction: 'right',
    },
    // Поддерживаемый диапазон количества сегментов — 1..4 (проверено явно,
    // не только «технически работает»). 1 сегмент — 0 границ, разделителей
    // нет вовсе (по прямому запросу пользователя — "разделителя нет только
    // если 1 элемент"), декор слева/справа завязан на этот же единственный
    // сегмент, каждый край на свою базовую ширину (48px/56px).
    {
      id: 9,
      segments: [{ text: 'Технический перерыв', width: 1, align: 'center' }],
    },
    // 4 сегмента — 3 границы, 3 разделителя (в т.ч. между 2-м и 3-м сегментом
    // — раньше, при ровно 2 фиксированных позициях декора, такой средней
    // границы не было вовсе, теперь общий случай, а не исключение).
    {
      id: 10,
      segments: [
        { text: 'Ср', width: '48px', align: 'right' },
        { text: 'Игра', width: 1, align: 'center' },
        { text: '2ч', width: '60px', align: 'center' },
        { text: '19:00', width: '56px', align: 'right' },
      ],
      dividers: ['left', 'right', 'left'],
    },
  ];
}
