import type { Meta, StoryObj } from '@storybook/angular-vite';

import { TextField } from './text-field';

const meta: Meta<TextField> = {
  title: 'Shared/TextField',
  component: TextField,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Основной текстовый инпут сайта — signal-based, без ReactiveFormsModule. Иконка-префикс опциональна: приоритет icon() (класс PrimeIcons) → спроецированный контент ([icon]) → без иконки.',
      },
    },
  },
  argTypes: {
    label: { control: 'text' },
    type: { control: 'radio', options: ['text', 'password'] },
    required: { control: 'boolean' },
    placeholder: { control: 'text' },
    errorText: { control: 'text' },
    icon: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<TextField>;

export const Default: Story = {
  name: 'Обычное поле (без иконки)',
  args: { label: 'Отображаемое имя', placeholder: 'Введите имя' },
};

export const WithProjectedIcon: Story = {
  name: 'Иконка — спроецированный SVG (без icon())',
  render: () => ({
    template: `
      <app-text-field label="Логин" placeholder="Введите логин">
        <img icon src="/icons/text-field-person.svg" alt="" />
      </app-text-field>
    `,
  }),
};

export const WithPrimeIcon: Story = {
  name: 'Иконка — icon() (класс PrimeIcons, приоритетнее проекции)',
  args: { label: 'Поиск', placeholder: 'Введите запрос', icon: 'pi pi-search' },
};

export const Password: Story = {
  name: 'type="password" — кнопка-глаз + иконка-замок (проекция)',
  render: () => ({
    template: `
      <app-text-field label="Пароль" type="password" placeholder="Введите пароль">
        <img icon src="/icons/text-field-lock.svg" alt="" />
      </app-text-field>
    `,
  }),
};

export const Required: Story = {
  name: 'required() — звёздочка у лейбла',
  args: { label: 'Логин', required: true, placeholder: 'Введите логин' },
};

export const WithError: Story = {
  name: 'errorText() — подсвечивает и рамку, и лейбл',
  args: { label: 'Пароль', errorText: 'Пароли не совпадают' },
};
