import { Component } from '@angular/core';

import { Button } from '../../../../shared/components/button/button';
import { SectionTitle } from '../../../../shared/components/section-title/section-title';

/**
 * Служебная страница-каталог UI-kit компонентов (stream.Front#39) — не часть
 * пользовательского сайта, только для ручной сверки вариантов при вёрстке.
 */
@Component({
  selector: 'app-kit-page',
  imports: [Button, SectionTitle],
  templateUrl: './kit-page.html',
  styleUrl: './kit-page.scss',
})
export class KitPage {}
