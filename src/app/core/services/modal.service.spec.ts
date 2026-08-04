import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';

import { ModalService } from './modal.service';

@Component({ selector: 'app-test-modal-content', template: '' })
class TestModalContent {}

describe('ModalService', () => {
  let service: ModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ModalService);
  });

  it('изначально нет активного компонента', () => {
    expect(service.activeComponent()).toBeNull();
    expect(service.activeData()).toBeUndefined();
    expect(service.activePresentation()).toBe('default');
  });

  it('open() устанавливает активный компонент и данные', () => {
    service.open(TestModalContent, { foo: 'bar' });

    expect(service.activeComponent()).toBe(TestModalContent);
    expect(service.activeData()).toEqual({ foo: 'bar' });
  });

  it('open() без данных оставляет activeData undefined', () => {
    service.open(TestModalContent);

    expect(service.activeComponent()).toBe(TestModalContent);
    expect(service.activeData()).toBeUndefined();
  });

  it('open() без presentation оставляет её "default"', () => {
    service.open(TestModalContent);

    expect(service.activePresentation()).toBe('default');
  });

  it('open() с presentation="sheet-on-mobile" сохраняет её', () => {
    service.open(TestModalContent, undefined, 'sheet-on-mobile');

    expect(service.activePresentation()).toBe('sheet-on-mobile');
  });

  it('close() сбрасывает активный компонент, данные и presentation', () => {
    service.open(TestModalContent, { foo: 'bar' }, 'sheet-on-mobile');

    service.close();

    expect(service.activeComponent()).toBeNull();
    expect(service.activeData()).toBeUndefined();
    expect(service.activePresentation()).toBe('default');
  });
});
