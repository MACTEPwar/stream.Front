import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';

import { Button } from '../button/button';
import { ButtonGroup } from './button-group';

const meta: Meta<ButtonGroup> = {
  title: 'Shared/ButtonGroup',
  component: ButtonGroup,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [Button] })],
  parameters: {
    docs: {
      description: {
        component:
          'Группирует несколько Button под одной общей визуальной обводкой (stream.Front#95) — сброс + 2 тоггла + отдельная кнопка-воронка рядом, уже вне группы.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<ButtonGroup>;

export const Default: Story = {
  render: () => ({
    template: `
      <div style="display: flex; gap: 12px;">
        <app-button-group>
          <app-button icon="pi pi-refresh" severity="contrast" />
          <app-button icon="pi pi-eye" severity="contrast" [active]="false" />
          <app-button icon="pi pi-heart" severity="contrast" [active]="true" />
        </app-button-group>
        <app-button icon="pi pi-filter" severity="contrast" />
      </div>
    `,
  }),
};
