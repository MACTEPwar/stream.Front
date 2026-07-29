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
    severity: {
      control: 'radio',
      options: [undefined, 'danger', 'contrast', 'secondary', 'info', 'success'],
    },
    size: { control: 'radio', options: [undefined, 'small'] },
    disabled: { control: 'boolean' },
    icon: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<Button>;

export const Default: Story = {
  name: 'Обычная кнопка с текстом',
  args: { text: 'Сохранить' },
};

export const Severity: Story = {
  name: 'severity() — типы (дефолт/danger/secondary/info/success)',
  render: () => ({
    template: `
      <div style="display: flex; gap: 12px;">
        <app-button text="Сохранить" />
        <app-button text="Удалить" severity="danger" />
        <app-button text="Отмена" severity="secondary" />
        <app-button text="Инфо" severity="info" />
        <app-button text="Готово" severity="success" />
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

interface PrimaryColorsArgs {
  bgColor: string;
  borderColor: string;
  textColor: string;
}

/**
 * Playground для severity="primary" (дефолт, без явного severity) — цвета
 * подобраны на конкретных hex-значениях (fon/border/text), не завязаны на
 * пропсы Button (тот их не принимает) — здесь переопределяются те же
 * CSS-переменные, что и в button.scss (--p-button-primary-*), через
 * [style.--var] на обёртке; hover/active остаются производными кода
 * (button.scss), это песочница только для базового состояния кнопки.
 */
export const PrimaryColors: StoryObj<PrimaryColorsArgs> = {
  name: 'Песочница цветов — severity="primary" (дефолт)',
  argTypes: {
    bgColor: { control: 'color' },
    borderColor: { control: 'color' },
    textColor: { control: 'color' },
  },
  args: {
    bgColor: '#f4d2a4',
    borderColor: '#f8ecb3',
    textColor: '#76511c',
  },
  render: (args) => ({
    props: args,
    template: `
      <div
        [style.--p-button-primary-background]="bgColor"
        [style.--p-button-primary-border-color]="borderColor"
        [style.--p-button-primary-color]="textColor"
        style="display: flex; gap: 12px;"
      >
        <app-button text="Сохранить" />
        <app-button icon="pi pi-check" text="С иконкой" />
      </div>
    `,
  }),
};
