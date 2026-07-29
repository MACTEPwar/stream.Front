import type { Meta, StoryObj } from '@storybook/angular-vite';

import { Datepicker } from './datepicker';

const meta: Meta<Datepicker> = {
  title: 'Shared/Datepicker',
  component: Datepicker,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Тонкая обёртка над PrimeNG p-datepicker (stream.Front#109). Тип выбора — selectionMode ("single"/"range"). Светлая схема — как у Select/TextField, выбранный день/диапазон — цвета Button severity="primary".',
      },
    },
  },
  argTypes: {
    selectionMode: { control: 'radio', options: ['single', 'range'] },
    placeholder: { control: 'text' },
    inline: { control: 'boolean' },
    numberOfMonths: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<Datepicker>;

export const SingleDate: Story = {
  name: 'Одна дата',
  args: {
    selectionMode: 'single',
    placeholder: 'Выберите дату',
  },
};

export const Period: Story = {
  name: 'Период (range)',
  args: {
    selectionMode: 'range',
    placeholder: 'Выберите период',
  },
};

export const Inline: Story = {
  name: 'Инлайн (всегда открыт, без попапа)',
  args: {
    inline: true,
    selectionMode: 'single',
  },
};

export const InlineRangeTwoMonths: Story = {
  name: 'Инлайн, период — 2 месяца рядом (numberOfMonths)',
  args: {
    inline: true,
    selectionMode: 'range',
    numberOfMonths: 2,
  },
};

export const Open: Story = {
  name: 'Открытая панель — как у Select/Button severity="primary"',
  render: () => ({
    template: `
      <div style="width: 240px;">
        <app-datepicker selectionMode="range" placeholder="Выберите период" />
      </div>
    `,
  }),
  play: async ({ canvasElement }) => {
    const control = canvasElement.querySelector<HTMLElement>('.p-datepicker-input');
    control?.click();
  },
};
