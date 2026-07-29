import type { Meta, StoryObj } from '@storybook/angular-vite';

import { DatepickerRange } from './datepicker-range';

const meta: Meta<DatepickerRange> = {
  title: 'Shared/DatepickerRange',
  component: DatepickerRange,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Два независимых Datepicker(inline, selectionMode="single") (stream.Front#109) — для произвольной разницы между показанными месяцами (в отличие от встроенного numberOfMonths у p-datepicker, который показывает только соседние месяцы). Итоговый диапазон (value, computed, только для чтения) — упорядоченная пара дат из двух независимых календарей, клик в любом из них в любом порядке.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<DatepickerRange>;

// `render`/`props` вместо `args` (stream.Front#109) — `args` в Storybook
// проходят через сериализацию (args store/Actions addon), которая теряет
// `instanceof Date` у объектов даты (сводится к обычному объекту/строке);
// `p-datepicker` при таком "не-Date" `defaultDate` молча падает на "сегодня"
// — оба календаря показывали текущий месяц вместо января/декабря, пока не
// перешли на `props`, тот же приём, что у `Select.WithValue`/`Open`.
export const JanuaryAndDecember: Story = {
  name: 'Слева январь, справа декабрь',
  render: () => ({
    template: `<app-datepicker-range [leftDefaultDate]="leftDefaultDate" [rightDefaultDate]="rightDefaultDate" />`,
    props: {
      leftDefaultDate: new Date(2026, 0, 1),
      rightDefaultDate: new Date(2026, 11, 1),
    },
  }),
};
