import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Badge, BadgeSeverity } from './badge';

@Component({
  selector: 'app-badge-host',
  imports: [Badge],
  template: `<app-badge [text]="text()" [severity]="severity()" />`,
})
class BadgeHost {
  readonly text = signal('ADMIN');
  readonly severity = signal<BadgeSeverity>('admin');
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

  it('severity="admin" — прокидывается в p-tag как severity="warn" (класс p-tag-warn)', () => {
    const fixture = TestBed.createComponent(BadgeHost);
    fixture.detectChanges();

    const tag = fixture.nativeElement.querySelector('.p-tag');
    expect(tag.classList.contains('p-tag-warn')).toBe(true);
  });

  it('severity="moderator" — прокидывается в p-tag как severity="info" (класс p-tag-info)', () => {
    const fixture = TestBed.createComponent(BadgeHost);
    fixture.componentInstance.severity.set('moderator');
    fixture.detectChanges();

    const tag = fixture.nativeElement.querySelector('.p-tag');
    expect(tag.classList.contains('p-tag-info')).toBe(true);
  });

  it('severity="user" — прокидывается в p-tag как severity="secondary" (класс p-tag-secondary)', () => {
    const fixture = TestBed.createComponent(BadgeHost);
    fixture.componentInstance.severity.set('user');
    fixture.detectChanges();

    const tag = fixture.nativeElement.querySelector('.p-tag');
    expect(tag.classList.contains('p-tag-secondary')).toBe(true);
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
