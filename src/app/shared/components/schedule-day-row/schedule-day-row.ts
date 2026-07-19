import { Component, computed, input } from '@angular/core';

let nextScheduleDayRowUid = 0;

/**
 * Перенос одной строки списка расписания (stream.Front#30) — из приложенного
 * пользователем Schedule.svg (644×392, 7 идентичных блоков по 56px), взят
 * ОДИН блок как единица переноса; 56px шаг между блоками в исходнике — не
 * часть этого компонента, это `gap` будущего `ListContainer` (#38), которым
 * строки будут стекаться в `ScheduleWidget`.
 *
 * Декор (пилюля, обводка, орнаменты по краям, блики, акцентные линии)
 * перенесён 1:1, кроме текста: в исходнике он запечён как `<path>` (сплошной
 * вектор без реального шрифта/кегля — `day`-инстанс Figma был нераскрыт даже
 * в этом экспорте), поэтому вместо копирования контуров текст живой —
 * `weekday()`/`eventTitle()`/`time()` — а из baked-путей взят только сигнал
 * состояния: цвет среднего текстового блока (`#F9F9F9` online / `#CF1717`
 * offline) — это и есть «online — обычный вид; offline — красный лейбл
 * «Оффлайн» и `--:--`» из AC issue #30. Точные зоны/кегль текста — визуальное
 * приближение (сверено на глаз с растровым видом SVG), не точные координаты
 * baked-путей, восстановить которые без привязки к Figma text-style нельзя.
 *
 * У первого блока в исходном SVG фон чуть насыщеннее (stop-opacity 0.75
 * против 0.35 у остальных 6) — по решению пользователя это неровность
 * мокапа, не отдельное состояние: здесь всегда 0.35, как AC issue #30 и
 * требует (только `weekday`/`isOnline`/`eventTitle`/`time`, без `today`).
 *
 * Ширина сейчас фиксированная (644px, как в исходнике) — 9-slice-подобное
 * растягивание на всю ширину родителя (по аналогии с `Button.width()`) не
 * реализовано в этой задаче, отложено на потом.
 */
@Component({
  selector: 'app-schedule-day-row',
  imports: [],
  templateUrl: './schedule-day-row.html',
  styleUrl: './schedule-day-row.scss',
})
export class ScheduleDayRow {
  protected readonly uid = `scheduledayrow${nextScheduleDayRowUid++}`;

  readonly weekday = input.required<string>();
  readonly isOnline = input<boolean>(true);
  readonly eventTitle = input<string>();
  readonly time = input<string>();

  protected readonly displayEvent = computed(() => (this.isOnline() ? (this.eventTitle() ?? '') : 'Оффлайн'));
  protected readonly displayTime = computed(() => (this.isOnline() ? (this.time() ?? '') : '--:--'));
}
