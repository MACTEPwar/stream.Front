import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';

import { Button } from '../button/button';
import { Checkbox } from '../checkbox/checkbox';
import { ButtonGroup } from './button-group';

const meta: Meta<ButtonGroup> = {
  title: 'Shared/ButtonGroup',
  component: ButtonGroup,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [Button, Checkbox] })],
  parameters: {
    docs: {
      description: {
        component:
          'Группирует Button и/или Checkbox (в buttonMode) под одной общей визуальной обводкой (stream.Front#95). Тоггл-кнопки строятся через Checkbox с buttonMode=true и ng-content — семантически верно, визуально неотличимо от прежних app-button с active().',
      },
    },
  },
};

export default meta;
type Story = StoryObj<ButtonGroup>;

export const Default: Story = {
  name: 'Смешанная группа: Button + Checkbox (buttonMode)',
  render: () => ({
    template: `
      <div style="display: flex; gap: 12px;">
        <app-button-group>
          <app-button icon="pi pi-refresh" severity="contrast" />
          <app-checkbox [buttonMode]="true" severity="contrast">
            <i class="pi pi-eye"></i>
          </app-checkbox>
          <app-checkbox [buttonMode]="true" severity="contrast" [checked]="true">
            <i class="pi pi-heart"></i>
          </app-checkbox>
        </app-button-group>
        <app-button icon="pi pi-filter" severity="contrast" />
      </div>
    `,
  }),
};

export const OnlyButtons: Story = {
  name: 'Только Button (без тогглов)',
  render: () => ({
    template: `
      <app-button-group>
        <app-button text="Сохранить" />
        <app-button text="Удалить" severity="danger" />
      </app-button-group>
    `,
  }),
};

export const OnlyCheckboxes: Story = {
  name: 'Только Checkbox в buttonMode (группа тогглов)',
  render: () => ({
    template: `
      <app-button-group>
        <app-checkbox [buttonMode]="true" severity="contrast">
          <i class="pi pi-eye"></i>
        </app-checkbox>
        <app-checkbox [buttonMode]="true" severity="contrast" [checked]="true">
          <i class="pi pi-heart"></i>
        </app-checkbox>
        <app-checkbox [buttonMode]="true" severity="contrast">
          <i class="pi pi-star"></i>
        </app-checkbox>
      </app-button-group>
    `,
  }),
};
