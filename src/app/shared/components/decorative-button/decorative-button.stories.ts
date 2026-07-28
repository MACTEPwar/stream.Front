import type { Meta, StoryObj } from '@storybook/angular-vite';

import { DecorativeButton } from './decorative-button';

const meta: Meta<DecorativeButton> = {
  title: 'Shared/DecorativeButton',
  component: DecorativeButton,
  tags: ['autodocs'],
  argTypes: {
    text: { control: 'text' },
    width: { control: 'text' },
    type: { control: 'radio', options: ['primary', 'secondary'] },
  },
};

export default meta;
type Story = StoryObj<DecorativeButton>;

export const NoIcon: Story = {
  name: 'Без иконки (текст по центру)',
  args: { text: 'Хелп' },
};

export const WithProjectedIcon: Story = {
  name: 'Со спроецированной иконкой ([icon])',
  args: { text: 'Парампапам' },
  render: (args) => ({
    props: args,
    template: `
      <app-decorative-button [text]="text" [width]="width" [type]="type">
        <img icon src="/icons/button-support-icon.svg" alt="" />
      </app-decorative-button>
    `,
  }),
};

export const FixedPixelWidths: Story = {
  name: 'width() — фиксированные пиксели (9-slice)',
  render: () => ({
    template: `
      <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
        <app-decorative-button text="Узкая" [width]="150" />
        <app-decorative-button text="Поддержать" [width]="301" />
        <app-decorative-button text="Поддержать прямо сейчас" [width]="500">
          <img icon src="/icons/button-support-icon.svg" alt="" />
        </app-decorative-button>
        <app-decorative-button text="Совсем широкая" [width]="700" />
      </div>
    `,
  }),
};

export const ParentWidth: Story = {
  name: 'width()="parent" — на всю ширину родительского контейнера',
  render: () => ({
    template: `
      <div style="width: 400px">
        <app-decorative-button text="Во всю ширину контейнера 400px" width="parent" />
      </div>
      <div style="width: 700px; margin-top: 12px">
        <app-decorative-button text="Во всю ширину контейнера 700px" width="parent">
          <img icon src="/icons/button-support-icon.svg" alt="" />
        </app-decorative-button>
      </div>
    `,
  }),
};

export const ContentWidth: Story = {
  name: 'width()="content" — по контенту',
  render: () => ({
    template: `
      <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
        <app-decorative-button text="Ок" width="content" />
        <app-decorative-button text="Поддержать прямо сейчас" width="content" />
        <app-decorative-button text="С иконкой" width="content">
          <img icon src="/icons/button-support-icon.svg" alt="" />
        </app-decorative-button>
      </div>
    `,
  }),
};

export const SecondaryType: Story = {
  name: 'type()="secondary" — те же геометрия/размеры, другие цвета',
  render: () => ({
    template: `
      <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
        <app-decorative-button text="Secondary" type="secondary" />
        <app-decorative-button text="Парампапам" type="secondary">
          <img icon src="/icons/button-support-icon.svg" alt="" />
        </app-decorative-button>
        <app-decorative-button text="Поддержать прямо сейчас" type="secondary" [width]="500" />
      </div>
    `,
  }),
};
