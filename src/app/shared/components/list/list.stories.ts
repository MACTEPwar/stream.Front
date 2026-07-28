import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';

import { List, ListItemData } from './list';

// Тот же образец данных, что был на /kit (kit-page.ts) — Schedule-подобный
// список, демонстрирующий все варианты сегментов/разделителей/направлений.
const scheduleListItems: ListItemData[] = [
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
  // слева должен сдвинуться вместе с ним (firstSegmentShiftPx() в list-item.ts).
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
  // правый декор зеркально растягивается влево (lastSegmentShiftPx()).
  {
    id: 5,
    segments: [
      { text: 'Пт', width: '58px', align: 'left' },
      { text: 'Финал сезона', width: 1, align: 'center' },
      { text: '21:00 (КИЕВ)', width: '100px', align: 'right' },
    ],
    dividers: ['left', 'right'],
  },
  // Сегментов 2, а не 3 — ровно 1 граница, ровно 1 разделитель (дефолт 'left').
  {
    id: 6,
    segments: [
      { text: 'Сб', width: '48px', align: 'right' },
      { text: 'Кастомная игра', width: 1, align: 'center' },
    ],
  },
  // dividers() — массив по границам между сегментами, длина = segments().length - 1.
  {
    id: 7,
    segments: [
      { text: 'Вс', width: '48px', align: 'right' },
      { text: 'Открытая тренировка', width: 1, align: 'center' },
      { text: '15:00', width: '56px', align: 'right' },
    ],
    dividers: ['none', 'right'],
  },
  // direction: 'right' — весь декор зеркалится целиком, остриё оказывается справа.
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
  // Поддерживаемый диапазон сегментов — 1..4. 1 сегмент — 0 границ, разделителей нет.
  {
    id: 9,
    segments: [{ text: 'Технический перерыв', width: 1, align: 'center' }],
  },
  // 4 сегмента — 3 границы, 3 разделителя.
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

const meta: Meta<List> = {
  title: 'Shared/List',
  component: List,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [List] })],
  parameters: {
    docs: {
      description: {
        component:
          'data (items()) + настройки (settings()) — List раскладывает элементы (direction/itemWidth/gap) и рендерит каждый через ListItem.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<List>;

export const Default: Story = {
  name: 'Обычный список (schedule-подобные данные)',
  args: {
    items: scheduleListItems,
    settings: { gap: 8 },
  },
};

export const Loading: Story = {
  name: 'loading() (stream.Front#52)',
  args: {
    items: [],
    settings: { gap: 8 },
    loading: true,
    loaderSettings: { itemsCount: 5 },
  },
};
