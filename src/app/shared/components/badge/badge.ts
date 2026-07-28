import { Component, computed, input } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { TagSeverity } from 'primeng/types/tag';

/**
 * Семантические роли (`UserRole`, `stream.Front#96`) — не сырые PrimeNG
 * `TagSeverity` (в отличие от `ButtonSeverity`, где имена совпадают с
 * реальными severity `pButton`): `Badge` — единственное место, знающее про
 * маппинг роль → PrimeNG-severity (`SEVERITY_MAP` ниже), вызывающий код
 * оперирует только доменным именем роли.
 */
export type BadgeSeverity = 'admin' | 'moderator' | 'user';

/**
 * Lookup-маппинг `BadgeSeverity → TagSeverity` — используется только как
 * CSS-хук (namespace для переопределения `--p-tag-{severity}-*` в
 * `badge.scss`), сами реальные цвета выбранных PrimeNG severity полностью
 * переопределены под палитру ролей, поэтому выбор конкретного значения
 * значения не имеет.
 */
const SEVERITY_MAP: Record<BadgeSeverity, TagSeverity> = {
  admin: 'warn',
  moderator: 'info',
  user: 'secondary',
};

/**
 * Тонкая обёртка над `p-tag` (stream.Front#96) — не полный проксирующий
 * враппер PrimeNG API, только пропсы, реально нужные текущему usage: `text`
 * (`input.required<string>()` — в отличие от `Button`, у бейджа всегда есть
 * подпись, icon-only режим не заводился) и `severity` (`BadgeSeverity`, см.
 * тип выше). `p-tag` не интерактивен (в отличие от `pButton`) — у него нет
 * hover/active состояний, поэтому и переопределяемых CSS-переменных на
 * severity в `badge.scss` только два токена (`background`/`color`), не
 * шесть, как у `Button`.
 */
@Component({
  selector: 'app-badge',
  imports: [TagModule],
  templateUrl: './badge.html',
  styleUrl: './badge.scss',
})
export class Badge {
  readonly text = input.required<string>();
  readonly severity = input.required<BadgeSeverity>();

  protected readonly tagSeverity = computed<TagSeverity>(() => SEVERITY_MAP[this.severity()]);
}
