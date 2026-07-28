import type { Meta, StoryObj } from '@storybook/angular-vite';

import { Badge } from './badge';

const meta: Meta<Badge> = {
  title: 'Shared/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Тонкая обёртка над PrimeNG p-tag (stream.Front#96) — вывод роли пользователя в AdminUsersPage.',
      },
    },
  },
  argTypes: {
    text: { control: 'text' },
    severity: { control: 'radio', options: ['admin', 'moderator', 'user'] },
  },
};

export default meta;
type Story = StoryObj<Badge>;

export const Admin: Story = {
  args: { text: 'ADMIN', severity: 'admin' },
};

export const Moderator: Story = {
  args: { text: 'MODERATOR', severity: 'moderator' },
};

export const User: Story = {
  args: { text: 'USER', severity: 'user' },
};

export const AllSeverities: Story = {
  name: 'severity() — семантические роли (admin/moderator/user)',
  render: () => ({
    template: `
      <div style="display: flex; gap: 12px;">
        <app-badge text="ADMIN" severity="admin" />
        <app-badge text="MODERATOR" severity="moderator" />
        <app-badge text="USER" severity="user" />
      </div>
    `,
  }),
};
