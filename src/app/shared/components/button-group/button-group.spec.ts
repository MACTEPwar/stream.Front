import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Button } from '../button/button';
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

describe('ButtonGroup', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ButtonGroupHost] });
  });

  it('рендерит все спроецированные Button внутри .app-button-group', () => {
    const fixture = TestBed.createComponent(ButtonGroupHost);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.app-button-group button');
    expect(buttons.length).toBe(3);
  });

  it('первая и последняя app-button — не только внутренние (границы под общую рамку выставляются CSS-селекторами first-of-type/last-of-type)', () => {
    const fixture = TestBed.createComponent(ButtonGroupHost);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.app-button-group app-button');
    expect(items.length).toBe(3);
    expect(items[0]).not.toBeNull();
    expect(items[2]).not.toBeNull();
  });
});
