import type { Meta, StoryObj } from '@storybook/angular-vite';

import { Badge } from './badge';

const meta: Meta<Badge> = {
  title: 'Shared/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Тонкая обёртка над PrimeNG p-tag (stream.Front#107) — severity та же палитра, что у Button; color/textColor — произвольные CSS-цвета фона/текста, независимо перебивают severity.',
      },
    },
  },
  argTypes: {
    text: { control: 'text' },
    severity: {
      control: 'radio',
      options: ['primary', 'secondary', 'danger', 'contrast', 'info', 'success'],
    },
    color: { control: 'color' },
    textColor: { control: 'color' },
  },
};

export default meta;
type Story = StoryObj<Badge>;

export const Primary: Story = {
  args: { text: 'PRIMARY', severity: 'primary' },
};

export const Danger: Story = {
  args: { text: 'ADMIN', severity: 'danger' },
};

export const Info: Story = {
  args: { text: 'MODERATOR', severity: 'info' },
};

export const Contrast: Story = {
  args: { text: 'USER', severity: 'contrast' },
};

export const AllSeverities: Story = {
  name: 'severity() — все варианты',
  render: () => ({
    template: `
      <div style="display: flex; gap: 12px;">
        <app-badge text="PRIMARY" severity="primary" />
        <app-badge text="SECONDARY" severity="secondary" />
        <app-badge text="DANGER" severity="danger" />
        <app-badge text="CONTRAST" severity="contrast" />
        <app-badge text="INFO" severity="info" />
        <app-badge text="SUCCESS" severity="success" />
      </div>
    `,
  }),
};

export const CustomColors: Story = {
  name: 'color()/textColor() — произвольные цвета, перебивают severity',
  args: { text: 'ТУРНИР', color: '#cf1717', textColor: '#ffffff' },
};
