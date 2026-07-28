import { Component, computed, input, model, signal } from '@angular/core';

export type TextFieldType = 'text' | 'password';

let nextTextFieldUid = 0;

/**
 * Переиспользуемое поле ввода — основной текстовый инпут сайта (не только
 * auth-формы), signal-based, без ReactiveFormsModule (`[(value)]` через
 * `model()` вместо `FormControl`, по прямому запросу пользователя).
 * `type()="password"` добавляет кнопку-глаз, переключающую видимость
 * введённого текста — внутреннее состояние (`isPasswordVisible`), не
 * завязанное на `type()` снаружи.
 *
 * Иконка-префикс — опциональна, приоритет по прямому запросу пользователя:
 * 1. `icon()` — класс PrimeIcons (как у `Button.icon`, например `'pi pi-user'`)
 * 2. иначе — спроецированный контент (`<ng-content select="[icon]">`, тот же
 *    приём, что у `DecorativeButton`) — так сохранены прежние bespoke SVG
 *    (раньше выбирались автоматически по `type()`: person/lock, теперь
 *    вынесены в `public/icons/text-field-{person,lock}.svg`, каждый
 *    caller явно проецирует нужный)
 * 3. иначе — компартмента иконки вообще нет (`.text-field__prefix-icon:empty`
 *    в `text-field.scss` схлопывает его, тот же приём, что у `.button__icon`)
 *
 * `required()` — только визуальная звёздочка у лейбла (см. поля "Логин",
 * "Пароль" в макете), не блокирует сабмит сама по себе. `errorText()`
 * подсвечивает красным и рамку, и лейбл (по прямому запросу пользователя —
 * раньше только рамку).
 */
@Component({
  selector: 'app-text-field',
  imports: [],
  templateUrl: './text-field.html',
  styleUrl: './text-field.scss',
})
export class TextField {
  protected readonly uid = `text-field${nextTextFieldUid++}`;

  readonly label = input<string>();
  readonly type = input<TextFieldType>('text');
  readonly required = input<boolean>(false);
  readonly placeholder = input<string>();
  readonly value = model<string>('');
  readonly errorText = input<string | null>(null);
  readonly icon = input<string>();

  protected readonly isPasswordVisible = signal(false);

  protected readonly inputType = computed(() => {
    if (this.type() !== 'password') return this.type();
    return this.isPasswordVisible() ? 'text' : 'password';
  });

  protected readonly toggleButtonLabel = computed(() =>
    this.isPasswordVisible() ? 'Скрыть пароль' : 'Показать пароль',
  );

  protected togglePasswordVisibility(): void {
    this.isPasswordVisible.update((visible) => !visible);
  }

  protected onInput(rawValue: string): void {
    this.value.set(rawValue);
  }
}
