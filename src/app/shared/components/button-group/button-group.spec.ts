import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Button } from '../button/button';
import { Checkbox } from '../checkbox/checkbox';
import { ButtonGroup } from './button-group';

@Component({
  selector: 'app-button-group-host',
  imports: [ButtonGroup, Button],
  template: `
    <app-button-group>
      <app-button icon="pi pi-refresh" severity="contrast" />
      <app-button icon="pi pi-eye" severity="contrast" />
      <app-button icon="pi pi-heart" severity="contrast" />
    </app-button-group>
  `,
})
class ButtonGroupHost {}

@Component({
  selector: 'app-button-group-mixed-host',
  imports: [ButtonGroup, Button, Checkbox],
  template: `
    <app-button-group>
      <app-button icon="pi pi-refresh" severity="contrast" />
      <app-checkbox [buttonMode]="true" [checked]="eyeChecked()" severity="contrast">
        <i class="pi pi-eye"></i>
      </app-checkbox>
      <app-checkbox [buttonMode]="true" [checked]="heartChecked()" severity="contrast">
        <i class="pi pi-heart"></i>
      </app-checkbox>
    </app-button-group>
  `,
})
class ButtonGroupMixedHost {
  readonly eyeChecked = signal(false);
  readonly heartChecked = signal(true);
}

describe('ButtonGroup — только Button', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ButtonGroupHost] });
  });

  it('рендерит все спроецированные Button внутри .app-button-group', () => {
    const fixture = TestBed.createComponent(ButtonGroupHost);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.app-button-group button');
    expect(buttons.length).toBe(3);
  });

  it('все три app-button находятся внутри группы', () => {
    const fixture = TestBed.createComponent(ButtonGroupHost);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.app-button-group app-button');
    expect(items.length).toBe(3);
  });
});

describe('ButtonGroup — смешанная группа (Button + Checkbox в buttonMode)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ButtonGroupMixedHost] });
  });

  it('рендерит button и label.checkbox внутри .app-button-group', () => {
    const fixture = TestBed.createComponent(ButtonGroupMixedHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.app-button-group button')).not.toBeNull();
    expect(el.querySelector('.app-button-group label.checkbox')).not.toBeNull();
  });

  it('checkbox с checked=true несёт класс checkbox--checked', () => {
    const fixture = TestBed.createComponent(ButtonGroupMixedHost);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const labels = el.querySelectorAll('.app-button-group label.checkbox');
    const checkedLabel = Array.from(labels).find((l) => l.classList.contains('checkbox--checked'));
    expect(checkedLabel).not.toBeUndefined();
  });

  it('всего три прямых ребёнка в группе (1 app-button + 2 app-checkbox)', () => {
    const fixture = TestBed.createComponent(ButtonGroupMixedHost);
    fixture.detectChanges();

    const children = fixture.nativeElement.querySelector('.app-button-group')?.children;
    expect(children?.length).toBe(3);
  });
});
