import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Checkbox, CheckboxSeverity } from './checkbox';

@Component({
  selector: 'app-checkbox-host',
  imports: [Checkbox],
  template: `
    <app-checkbox
      [label]="label()"
      [severity]="severity()"
      [color]="color()"
      [iconColor]="iconColor()"
      [(checked)]="checked"
    />
  `,
})
class CheckboxHost {
  readonly label = signal<string | undefined>('Согласен с условиями');
  readonly severity = signal<CheckboxSeverity>('primary');
  readonly color = signal<string | undefined>(undefined);
  readonly iconColor = signal<string | undefined>(undefined);
  readonly checked = signal(false);
}

describe('Checkbox', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CheckboxHost] });
  });

  it('рендерит лейбл справа от коробки', () => {
    const fixture = TestBed.createComponent(CheckboxHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.checkbox__label')?.textContent?.trim()).toBe('Согласен с условиями');
    expect(el.querySelector('p-checkbox')).not.toBeNull();
  });

  it('без label — .checkbox__label не рендерится', () => {
    const fixture = TestBed.createComponent(CheckboxHost);
    fixture.componentInstance.label.set(undefined);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.checkbox__label')).toBeNull();
  });

  it('severity() проставляет класс на корневом <label>', () => {
    const fixture = TestBed.createComponent(CheckboxHost);
    fixture.componentInstance.severity.set('danger');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('label')?.classList).toContain('checkbox--severity-danger');
  });

  it('без color() — класс checkbox--custom-color не добавляется', () => {
    const fixture = TestBed.createComponent(CheckboxHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('label')?.classList).not.toContain('checkbox--custom-color');
  });

  it('color() — добавляет checkbox--custom-color и проставляет CSS-переменную', () => {
    const fixture = TestBed.createComponent(CheckboxHost);
    fixture.componentInstance.color.set('#123456');
    fixture.detectChanges();

    const label = fixture.nativeElement.querySelector('label')!;
    expect(label.classList).toContain('checkbox--custom-color');
    expect(label.style.getPropertyValue('--checkbox-custom-color')).toBe('#123456');
  });

  it('без iconColor() — класс checkbox--custom-icon-color не добавляется', () => {
    const fixture = TestBed.createComponent(CheckboxHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('label')?.classList).not.toContain('checkbox--custom-icon-color');
  });

  it('iconColor() — добавляет checkbox--custom-icon-color и проставляет CSS-переменную независимо от color()', () => {
    const fixture = TestBed.createComponent(CheckboxHost);
    fixture.componentInstance.color.set('#123456');
    fixture.componentInstance.iconColor.set('#abcdef');
    fixture.detectChanges();

    const label = fixture.nativeElement.querySelector('label')!;
    expect(label.classList).toContain('checkbox--custom-color');
    expect(label.classList).toContain('checkbox--custom-icon-color');
    expect(label.style.getPropertyValue('--checkbox-custom-icon-color')).toBe('#abcdef');
  });

  it('изменение checked на хосте отражается в p-checkbox', async () => {
    const fixture = TestBed.createComponent(CheckboxHost);
    fixture.detectChanges();

    fixture.componentInstance.checked.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector<HTMLInputElement>('.p-checkbox-input')!;
    expect(input.checked).toBe(true);
  });

  it('клик по input обновляет [(checked)] на хосте', () => {
    const fixture = TestBed.createComponent(CheckboxHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const input = el.querySelector<HTMLInputElement>('.p-checkbox-input')!;
    input.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.checked()).toBe(true);
  });

  it('checked() — добавляет класс checkbox--checked на корневой label', () => {
    const fixture = TestBed.createComponent(CheckboxHost);
    fixture.detectChanges();

    const label = fixture.nativeElement.querySelector('label')!;
    expect(label.classList).not.toContain('checkbox--checked');

    fixture.componentInstance.checked.set(true);
    fixture.detectChanges();

    expect(label.classList).toContain('checkbox--checked');
  });
});

@Component({
  selector: 'app-checkbox-button-mode-host',
  imports: [Checkbox],
  template: `
    <app-checkbox [buttonMode]="buttonMode()" [(checked)]="checked">
      <i class="pi pi-eye"></i>
    </app-checkbox>
  `,
})
class CheckboxButtonModeHost {
  readonly buttonMode = signal(false);
  readonly checked = signal(false);
}

describe('Checkbox — buttonMode', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CheckboxButtonModeHost] });
  });

  it('buttonMode=false — класс checkbox--button-mode не добавляется', () => {
    const fixture = TestBed.createComponent(CheckboxButtonModeHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('label')?.classList).not.toContain('checkbox--button-mode');
  });

  it('buttonMode=true — добавляет класс checkbox--button-mode на корневой label', () => {
    const fixture = TestBed.createComponent(CheckboxButtonModeHost);
    fixture.componentInstance.buttonMode.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('label')?.classList).toContain('checkbox--button-mode');
  });

  it('buttonMode=true — p-checkbox остаётся в DOM (не удалён)', () => {
    const fixture = TestBed.createComponent(CheckboxButtonModeHost);
    fixture.componentInstance.buttonMode.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('p-checkbox')).not.toBeNull();
  });

  it('buttonMode=true — ng-content проецируется внутрь label', () => {
    const fixture = TestBed.createComponent(CheckboxButtonModeHost);
    fixture.componentInstance.buttonMode.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('i.pi-eye')).not.toBeNull();
  });
});
