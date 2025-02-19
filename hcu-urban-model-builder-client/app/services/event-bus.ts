import { action } from '@ember/object';
import Service from '@ember/service';

export type TEventBusEvents =
  | 'scenario-value-changed'
  | 'node:selected'
  | 'node:unselected'
  | 'primitive-modal:create-clicked';

export default class EventBus extends Service {
  public _events: Partial<
    Record<TEventBusEvents, Set<(...args: any[]) => any>>
  > = {};

  @action
  public on(eventName: TEventBusEvents, fn: (...args: any[]) => any): void {
    if (!(eventName in this._events)) {
      this._events[eventName] = new Set();
    }
    this._events[eventName]!.add(fn);
  }

  @action public off(eventName: TEventBusEvents, fn: (...args: any[]) => any) {
    if (!(eventName in this._events)) {
      return;
    }
    if (this._events[eventName]) {
      this._events[eventName].delete(fn);
    }
  }

  @action public emit(eventName: TEventBusEvents, ...data: any[]) {
    if (!this._events[eventName]) {
      return;
    }
    for (const [callback] of this._events[eventName]!.entries()) {
      callback(...data);
    }
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'event-bus': EventBus;
  }
}
