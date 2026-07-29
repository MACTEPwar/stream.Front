import type { Meta, StoryObj } from '@storybook/angular-vite';

import { Checkbox } from './checkbox';

const meta: Meta<Checkbox> = {
  title: 'Shared/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Тонкая обёртка над PrimeNG p-checkbox (binary, stream.Front#105) — коробка и лейбл справа от неё как раздельные элементы. severity — та же палитра фонов, что у Button (бордер того же цвета, что фон); color — произвольный CSS-цвет, перебивает severity целиком; iconColor — цвет галочки отдельно от фона/severity.',
      },
    },
  },
  argTypes: {
    label: { control: 'text' },
    severity: {
      control: 'radio',
      options: ['primary', 'secondary', 'danger', 'contrast', 'info', 'success'],
    },
    color: { control: 'color' },
    iconColor: { control: 'color' },
    buttonMode: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<Checkbox>;

export const Default: Story = {
  name: 'Обычный (primary, не отмечен)',
  args: { label: 'Согласен с условиями' },
};

export const Checked: Story = {
  name: 'Отмечен (primary)',
  args: { label: 'Согласен с условиями', checked: true },
};

export const AllSeverities: Story = {
  name: 'severity() — все варианты, отмечены',
  render: () => ({
    template: `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <app-checkbox label="primary" severity="primary" [checked]="true" />
        <app-checkbox label="secondary" severity="secondary" [checked]="true" />
        <app-checkbox label="danger" severity="danger" [checked]="true" />
        <app-checkbox label="contrast" severity="contrast" [checked]="true" />
        <app-checkbox label="info" severity="info" [checked]="true" />
        <app-checkbox label="success" severity="success" [checked]="true" />
      </div>
    `,
  }),
};

export const CustomColor: Story = {
  name: 'color() — произвольный цвет, перебивает severity',
  args: { label: 'Свой цвет', color: '#8e44ad', checked: true },
};

export const CustomIconColor: Story = {
  name: 'iconColor() — свой цвет галочки, независимо от severity/color',
  args: { label: 'Своя галочка', severity: 'primary', iconColor: '#af4141', checked: true },
};

export const ButtonModeIconOnly: Story = {
  name: 'buttonMode() — icon-only тоггл (как была кнопка с active)',
  render: () => ({
    template: `
      <div style="display: flex; gap: 12px; align-items: center;">
        <app-checkbox buttonMode severity="contrast">
          <i class="pi pi-eye"></i>
        </app-checkbox>
        <app-checkbox buttonMode severity="contrast" [checked]="true">
          <i class="pi pi-heart"></i>
        </app-checkbox>
      </div>
    `,
  }),
};

export const ButtonModeAllSeverities: Story = {
  name: 'buttonMode() — все severity, отмечены',
  render: () => ({
    template: `
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <app-checkbox buttonMode severity="primary" [checked]="true">primary</app-checkbox>
        <app-checkbox buttonMode severity="secondary" [checked]="true">secondary</app-checkbox>
        <app-checkbox buttonMode severity="danger" [checked]="true">danger</app-checkbox>
        <app-checkbox buttonMode severity="contrast" [checked]="true">contrast</app-checkbox>
        <app-checkbox buttonMode severity="info" [checked]="true">info</app-checkbox>
        <app-checkbox buttonMode severity="success" [checked]="true">success</app-checkbox>
      </div>
    `,
  }),
};
