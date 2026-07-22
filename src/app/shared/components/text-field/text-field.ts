import { Component, computed, input, model, signal } from '@angular/core';

export type TextFieldType = 'text' | 'password';

let nextTextFieldUid = 0;

/**
 * Переиспользуемое поле ввода (stream.Front#58/#59) — signal-based, без
 * ReactiveFormsModule (первая форма в проекте, `[(value)]` через `model()`
 * вместо `FormControl`, по прямому запросу пользователя). `type()="password"`
 * добавляет кнопку-глаз, переключающую видимость введённого текста —
 * внутреннее состояние (`isPasswordVisible`), не завязанное на `type()`
 * снаружи. Иконка-префикс выбирается по `type()` (person/lock) — в этой
 * форме других типов полей нет, поэтому отдельный `icon` input не заводился.
 * `required()` — только визуальная звёздочка у лейбла (см. поля "Логин",
 * "Пароль" в макете), не блокирует сабмит сама по себе.
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
