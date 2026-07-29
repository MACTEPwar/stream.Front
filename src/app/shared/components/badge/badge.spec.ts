import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Badge, BadgeSeverity } from './badge';

@Component({
  selector: 'app-badge-host',
  imports: [Badge],
  template: `
    <app-badge
      [text]="text()"
      [severity]="severity()"
      [color]="color()"
      [textColor]="textColor()"
    />
  `,
})
class BadgeHost {
  readonly text = signal('ADMIN');
  readonly severity = signal<BadgeSeverity>('primary');
  readonly color = signal<string | undefined>(undefined);
  readonly textColor = signal<string | undefined>(undefined);
}

describe('Badge', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BadgeHost] });
  });

  it('рендерит p-tag с переданным текстом', () => {
    const fixture = TestBed.createComponent(BadgeHost);
    fixture.detectChanges();

    const tag = fixture.nativeElement.querySelector('.p-tag');
    expect(tag).not.toBeNull();
    expect(tag.textContent.trim()).toBe('ADMIN');
  });

  it('severity="primary" (дефолт) — без доп. severity-класса на p-tag', () => {
    const fixture = TestBed.createComponent(BadgeHost);
    fixture.detectChanges();

    const tag = fixture.nativeElement.querySelector('.p-tag');
    expect(tag.classList.contains('p-tag-secondary')).toBe(false);
    expect(tag.classList.contains('p-tag-danger')).toBe(false);
  });

  it('severity="danger" — прокидывается в p-tag как есть (класс p-tag-danger)', () => {
    const fixture = TestBed.createComponent(BadgeHost);
    fixture.componentInstance.severity.set('danger');
    fixture.detectChanges();

    const tag = fixture.nativeElement.querySelector('.p-tag');
    expect(tag.classList.contains('p-tag-danger')).toBe(true);
  });

  it('severity="contrast" — прокидывается в p-tag как есть (класс p-tag-contrast)', () => {
    const fixture = TestBed.createComponent(BadgeHost);
    fixture.componentInstance.severity.set('contrast');
    fixture.detectChanges();

    const tag = fixture.nativeElement.querySelector('.p-tag');
    expect(tag.classList.contains('p-tag-contrast')).toBe(true);
  });

  it('color() — переопределяет фон инлайн-стилем, независимо от severity', () => {
    const fixture = TestBed.createComponent(BadgeHost);
    fixture.componentInstance.severity.set('danger');
    fixture.componentInstance.color.set('#123456');
    fixture.detectChanges();

    const tag: HTMLElement = fixture.nativeElement.querySelector('.p-tag');
    expect(tag.style.background).toBe('rgb(18, 52, 86)');
  });

  it('textColor() — переопределяет цвет текста инлайн-стилем, независимо от color()/severity', () => {
    const fixture = TestBed.createComponent(BadgeHost);
    fixture.componentInstance.textColor.set('#abcdef');
    fixture.detectChanges();

    const tag: HTMLElement = fixture.nativeElement.querySelector('.p-tag');
    expect(tag.style.color).toBe('rgb(171, 205, 239)');
  });

  it('меняет текст реактивно', () => {
    const fixture = TestBed.createComponent(BadgeHost);
    fixture.detectChanges();

    fixture.componentInstance.text.set('MODERATOR');
    fixture.detectChanges();

    const tag = fixture.nativeElement.querySelector('.p-tag');
    expect(tag.textContent.trim()).toBe('MODERATOR');
  });
});
