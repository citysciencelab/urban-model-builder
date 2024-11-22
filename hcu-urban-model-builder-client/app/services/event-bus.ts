import Service from '@ember/service';

export type TEventBusEvents = 'scenario-value-changed';

export default class EventBus extends Service {
  public events: any = {};

  public on(
    eventName: TEventBusEvents,
    context: any,
    fn: (...args: any[]) => any,
  ) {
    if (!(eventName in this.events)) {
      this.events[eventName] = [];
    }
    this.events[eventName].push({
      context,
      fn,
    });
  }

  public off(
    eventName: TEventBusEvents,
    context: any,
    fn: (...args: any[]) => any,
  ) {
    if (!(eventName in this.events)) {
      return;
    }
    for (const callback of this.events[eventName]) {
      if (callback.fn === fn && callback.context === context) {
        this.events[eventName].splice(
          this.events[eventName].indexOf(callback),
          1,
        );
      }
    }
  }

  public emit(eventName: TEventBusEvents, data: any) {
    if (!(eventName in this.events)) {
      return;
    }
    for (const callback of this.events[eventName]) {
      callback.fn.apply(callback.context, [data]);
    }
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'event-bus': EventBus;
  }
}
