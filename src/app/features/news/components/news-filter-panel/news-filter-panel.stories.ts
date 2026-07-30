import type { Meta, StoryObj } from '@storybook/angular-vite';

import { NewsFilterPanel } from './news-filter-panel';

const meta: Meta<NewsFilterPanel> = {
  title: 'Features/News/NewsFilterPanel',
  component: NewsFilterPanel,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Панель фильтра новостей по тегам и диапазону дат (stream.Front#111) — демо, БЕЗ попап-обвязки и БЕЗ применения к реальному списку новостей. Теги — мок NewsTagService. Список тегов слева отсортирован: выбранные наверху (в исходном порядке), невыбранные ниже; выбор синхронизирован с чипами сверху. Справа — DatepickerRange(inline, 2 месяца). filterChange эмитит { dateFrom, dateTo, tags } при любом изменении.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<NewsFilterPanel>;

export const Default: Story = {
  name: 'По умолчанию',
};
