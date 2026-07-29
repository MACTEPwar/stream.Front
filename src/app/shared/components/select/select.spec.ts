import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Select } from './select';

interface Option {
  label: string;
  value: string;
}

const OPTIONS: Option[] = [
  { label: 'USER', value: 'USER' },
  { label: 'ADMIN', value: 'ADMIN' },
];

@Component({
  selector: 'app-select-host',
  imports: [Select],
  template: `
    <app-select
      [id]="id()"
      [options]="options()"
      optionLabel="label"
      optionValue="value"
      [placeholder]="placeholder()"
      [(value)]="value"
    />
  `,
})
class SelectHost {
  readonly id = signal<string | undefined>(undefined);
  readonly options = signal<Option[]>(OPTIONS);
  readonly placeholder = signal<string | undefined>(undefined);
  readonly value = signal<string | null>(null);
}

describe('Select', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SelectHost] });
  });

  it('рендерит p-select с переданными options', () => {
    const fixture = TestBed.createComponent(SelectHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('p-select')).not.toBeNull();
  });

  it('изменение value на хосте отражается в выбранной опции', async () => {
    const fixture = TestBed.createComponent(SelectHost);
    fixture.detectChanges();

    fixture.componentInstance.value.set('ADMIN');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const label = fixture.nativeElement.querySelector('.p-select-label');
    expect(label?.textContent?.trim()).toBe('ADMIN');
  });

  it('id пробрасывается в p-select', () => {
    const fixture = TestBed.createComponent(SelectHost);
    fixture.componentInstance.id.set('role-select');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#role-select')).not.toBeNull();
  });
});
