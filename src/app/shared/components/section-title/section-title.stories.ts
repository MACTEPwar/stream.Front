import type { Meta, StoryObj } from '@storybook/angular-vite';

import { SectionTitle } from './section-title';

const meta: Meta<SectionTitle> = {
  title: 'Shared/SectionTitle',
  component: SectionTitle,
  tags: ['autodocs'],
  argTypes: {
    text: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<SectionTitle>;

export const Short: Story = {
  args: { text: 'Топ' },
};

export const Medium: Story = {
  args: { text: 'Расписание' },
};

export const Long: Story = {
  args: { text: 'Очень длинный заголовок секции для проверки' },
};
