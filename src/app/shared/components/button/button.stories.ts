import type { Meta, StoryObj } from '@storybook/angular-vite';

import { Button } from './button';

const meta: Meta<Button> = {
  title: 'Shared/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Тонкая обёртка над PrimeNG pButton (stream.Front#89) — используется в админ-панели, не на пользовательском сайте.',
      },
    },
  },
  argTypes: {
    text: { control: 'text' },
    severity: { control: 'radio', options: [undefined, 'danger', 'contrast'] },
    size: { control: 'radio', options: [undefined, 'small'] },
    disabled: { control: 'boolean' },
    icon: { control: 'text' },
    active: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<Button>;

export const Default: Story = {
  name: 'Обычная кнопка с текстом',
  args: { text: 'Сохранить' },
};

export const Severity: Story = {
  name: 'severity() — типы (дефолт/danger)',
  render: () => ({
    template: `
      <div style="display: flex; gap: 12px;">
        <app-button text="Сохранить" />
        <app-button text="Удалить" severity="danger" />
      </div>
    `,
  }),
};

export const Size: Story = {
  name: 'size() — размеры (дефолт/small)',
  render: () => ({
    template: `
      <div style="display: flex; gap: 12px; align-items: center;">
        <app-button text="Сохранить" />
        <app-button text="Сохранить" size="small" />
      </div>
    `,
  }),
};

export const Disabled: Story = {
  args: { text: 'Недоступно', disabled: true },
};

export const WithIcon: Story = {
  name: 'icon() — опциональная (класс PrimeIcons)',
  render: () => ({
    template: `
      <div style="display: flex; gap: 12px;">
        <app-button text="Сохранить" icon="pi pi-check" />
        <app-button text="Удалить" severity="danger" icon="pi pi-trash" />
      </div>
    `,
  }),
};

export const IconOnly: Story = {
  name: 'text() необязателен — icon-only режим (stream.Front#95)',
  render: () => ({
    template: `
      <div style="display: flex; gap: 12px;">
        <app-button icon="pi pi-check" />
        <app-button icon="pi pi-trash" severity="danger" />
      </div>
    `,
  }),
};

export const ContrastSeverity: Story = {
  name: 'severity="contrast" (stream.Front#95) — filter-блок карточек турниров',
  args: { icon: 'pi pi-filter', severity: 'contrast' },
};

export const Active: Story = {
  name: 'active() (stream.Front#95) — визуальное "нажатое" состояние',
  argTypes: {
    active: { control: 'boolean' },
  },
  args: { icon: 'pi pi-eye', severity: 'contrast', active: true },
};
