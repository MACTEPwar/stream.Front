import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { TableModule } from 'primeng/table';

interface AdminPresetTableRow {
  login: string;
  role: string;
}

const primeTableRows: AdminPresetTableRow[] = [
  { login: 'admin', role: 'ADMIN' },
  { login: 'streamer', role: 'USER' },
  { login: 'moderator1', role: 'MODERATOR' },
];

/**
 * demo/проверка AdminPreset (stream.Front#75), не отдельный компонент проекта —
 * PrimeNG-компоненты в проекте применяются только внутри админ-панели, не на
 * пользовательском сайте.
 */
const meta: Meta = {
  title: 'PrimeNG/AdminPreset',
  decorators: [moduleMetadata({ imports: [TableModule] })],
  parameters: {
    docs: {
      description: {
        component: 'p-table под темой AdminPreset (stream.Front#75) — demo/проверка темы.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Table: Story = {
  render: () => ({
    props: { primeTableRows },
    template: `
      <p-table [value]="primeTableRows">
        <ng-template #header>
          <tr>
            <th>Логин</th>
            <th>Роль</th>
          </tr>
        </ng-template>
        <ng-template #body let-row>
          <tr>
            <td>{{ row.login }}</td>
            <td>{{ row.role }}</td>
          </tr>
        </ng-template>
      </p-table>
    `,
  }),
};
