import Aura from '@primeuix/themes/aura';
import { definePreset, palette } from '@primeuix/themes';

/**
 * Тема PrimeNG (`stream.Front#75`) — используется только компонентами
 * админ-панели (`stream.Front#76`/`#77` и далее), поверх `Aura` (форма:
 * border-radius/spacing/типографика — дефолтные значения пресета, НЕ
 * переопределяются). Перекрашена ТОЛЬКО цветовая палитра — сгенерирована
 * `palette()` из реальных цветов проекта (`_variables.scss`), не выдумана
 * заново:
 * - `primary` — из `$color-e6c319` (золотой акцент, тот же, что у кнопки
 *   «Поддержать»/`NavActiveIndicator`)
 * - `surface` — из `$color-1e1e1e` (= `$color-black`, нейтральный тёмный
 *   тон, уже используемый как базовый текстовый/фоновый цвет в проекте)
 *
 * Остальной (не-админский) сайт эту тему не подключает и PrimeNG-компоненты
 * не использует — существующие компоненты (`Button`, `SectionTitle` и т.д.)
 * остаются на собственном CSS, эта тема их не затрагивает.
 */
export const AdminPreset = definePreset(Aura, {
  semantic: {
    primary: palette('#e6c319'),
  },
  primitive: {
    // `surface` в Aura читается из primitive-палитры (slate/zinc), не
    // отдельного semantic-токена — переопределяем саму primitive-шкалу,
    // на которую semantic.surface ссылается через light-dark(...).
    slate: palette('#1e1e1e'),
    zinc: palette('#1e1e1e'),
  },
});
