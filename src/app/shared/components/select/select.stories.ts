import type { Meta, StoryObj } from '@storybook/angular-vite';

import { Select } from './select';

const meta: Meta<Select> = {
  title: 'Shared/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Тонкая обёртка над PrimeNG p-select (stream.Front#94) — фильтр по роли и селект роли в AdminUsersPage. Высота/цвета — как у TextField, открытое (активное) состояние — как у Button severity="primary".',
      },
    },
  },
  argTypes: {
    optionLabel: { control: 'text' },
    optionValue: { control: 'text' },
    placeholder: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<Select>;

const ROLE_OPTIONS = [
  { label: 'USER', value: 'USER' },
  { label: 'ADMIN', value: 'ADMIN' },
];

export const Default: Story = {
  name: 'Обычный селект (без выбора)',
  args: {
    options: ROLE_OPTIONS,
    optionLabel: 'label',
    optionValue: 'value',
    placeholder: 'Выберите роль',
  },
};

export const WithValue: Story = {
  name: 'С выбранным значением',
  render: () => ({
    template: `<app-select [options]="options" optionLabel="label" optionValue="value" [value]="'ADMIN'" />`,
    props: { options: ROLE_OPTIONS },
  }),
};

export const Open: Story = {
  name: 'Активное (открытое) состояние — как у Button severity="primary"',
  render: () => ({
    template: `
      <div style="width: 240px;">
        <app-select #select [options]="options" optionLabel="label" optionValue="value" placeholder="Выберите роль" />
      </div>
    `,
    props: { options: ROLE_OPTIONS },
  }),
  play: async ({ canvasElement }) => {
    const control = canvasElement.querySelector<HTMLElement>('.p-select');
    control?.click();
  },
};
