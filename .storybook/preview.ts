import type { Preview } from '@storybook/angular-vite';
import { applicationConfig } from '@storybook/angular-vite';
import { setCompodocJson } from '@storybook/addon-docs/angular';
import { providePrimeNG } from 'primeng/config';

import { AdminPreset } from '../src/app/core/primeng/admin-preset';
import { ruTranslation } from '../src/app/core/primeng/ru-translation';
import { environment } from '../src/environments/environment';
import docJson from '../documentation.json';

import '../src/styles.scss';

setCompodocJson(docJson);

// Та же тема/конфигурация, что и в src/app/app.config.ts (stream.Front#75) —
// AdminPreset применяется здесь глобально (не только к компонентам админки),
// потому что каталог демонстрирует и не-PrimeNG, и PrimeNG-компоненты
// (`p-table`) на одной сцене, а не в контексте реального приложения. `license`
// — тот же Community-ключ, что в app.config.ts (без него PrimeNG рисует
// баннер «Invalid PrimeUI License» поверх всей страницы, в т.ч. в Storybook).
const preview: Preview = {
  decorators: [
    applicationConfig({
      providers: [
        providePrimeNG({
          theme: {
            preset: AdminPreset,
            options: { darkModeSelector: '.p-dark' },
          },
          translation: ruTranslation,
          license: environment.primengLicenseKey,
        }),
      ],
    }),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
};

export default preview;
