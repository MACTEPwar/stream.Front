import type { Translation } from 'primeng/api';

/**
 * Русская локализация PrimeNG (stream.Front#109) — глобальный `translation`
 * в `providePrimeNG()` (единственный способ локализовать `p-datepicker`:
 * названия месяцев/дней, `dateFormat` и т.п. приходят из общего
 * `PrimeNGConfig.translation`, отдельного per-компонентного `locale`-input в
 * этой версии PrimeNG нет). Затрагивает не только `Datepicker` — весь текст
 * остальных PrimeNG-компонентов (`p-table`, `p-select` и т.д.), для которого
 * нет отдельного текстового input в этом проекте, тоже станет русским.
 *
 * `dateFormat: 'dd.mm.yy'` — `yy` (двойное) даёт полный 4-значный год
 * (см. `formatDate()`/`case 'y'` в `primeng-datepicker.mjs`: `lookAhead('y')`
 * true → `date.getFullYear()`; одиночное `y` дало бы 2 цифры), точка —
 * привычный русский разделитель даты.
 */
export const ruTranslation: Translation = {
  dayNames: [
    'воскресенье',
    'понедельник',
    'вторник',
    'среда',
    'четверг',
    'пятница',
    'суббота',
  ],
  dayNamesShort: ['вск', 'пнд', 'втр', 'срд', 'чтв', 'птн', 'сбт'],
  dayNamesMin: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  monthNames: [
    'январь',
    'февраль',
    'март',
    'апрель',
    'май',
    'июнь',
    'июль',
    'август',
    'сентябрь',
    'октябрь',
    'ноябрь',
    'декабрь',
  ],
  monthNamesShort: [
    'янв',
    'фев',
    'мар',
    'апр',
    'май',
    'июн',
    'июл',
    'авг',
    'сен',
    'окт',
    'ноя',
    'дек',
  ],
  today: 'Сегодня',
  clear: 'Очистить',
  dateFormat: 'dd.mm.yy',
  firstDayOfWeek: 1,
  weekHeader: 'Нед',
  chooseYear: 'Выбрать год',
  chooseMonth: 'Выбрать месяц',
  chooseDate: 'Выбрать дату',
  prevDecade: 'Предыдущее десятилетие',
  nextDecade: 'Следующее десятилетие',
  prevYear: 'Предыдущий год',
  nextYear: 'Следующий год',
  prevMonth: 'Предыдущий месяц',
  nextMonth: 'Следующий месяц',
  prevHour: 'Предыдущий час',
  nextHour: 'Следующий час',
  prevMinute: 'Предыдущая минута',
  nextMinute: 'Следующая минута',
  prevSecond: 'Предыдущая секунда',
  nextSecond: 'Следующая секунда',
  am: 'дп',
  pm: 'пп',
  accept: 'Да',
  reject: 'Нет',
  choose: 'Выбрать',
  upload: 'Загрузить',
  cancel: 'Отмена',
  completed: 'Завершено',
  pending: 'В ожидании',
  weak: 'Слабый',
  medium: 'Средний',
  strong: 'Надёжный',
  passwordPrompt: 'Введите пароль',
  emptyMessage: 'Результатов не найдено',
  emptyFilterMessage: 'Результатов не найдено',
};
