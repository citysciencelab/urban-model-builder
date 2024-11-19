import { tracked } from '@glimmer/tracking';
import { Value } from '@sinclair/typebox/value';
import { task, timeout } from 'ember-concurrency';
import { deepTracked } from 'ember-deep-tracked';

type ModelLike = Record<any, any> & { save: () => Promise<ModelLike> };

export class TrackedChangeset<T extends ModelLike> {
  private readonly DEBOUNCE_MS = 250;

  @tracked changesetBeforeHash: bigint | null = null;
  @tracked _errors: Record<string, string> | null = null;

  #data!: T;
  model!: T;

  declare validator: (args: any) => true | any;

  get isDirty() {
    if (!this.data) {
      return false;
    }

    return this.changesetBeforeHash !== Value.Hash(this.data);
  }

  get data() {
    return this.#data;
  }

  constructor(model: T, validator: any) {
    this.validator = validator;

    this.model = model;

    this.#data = this.createChangeset(this.model!);

    this.changesetBeforeHash = Value.Hash({ ...this.data });

    return this;
  }

  protected createChangeset(record: T) {
    const attrData: any = {};

    for (const [attrKey] of (record.constructor as any).attributes) {
      attrData[attrKey] = record[attrKey];
    }

    return deepTracked(Value.Clone(attrData));
  }

  validate() {
    let hasError = false;
    this._errors = {};
    for (const [key, value] of Object.entries(this.data!)) {
      const msg = this.validator({
        key: key,
        newValue: value,
        oldValue: (this.model as any)[key],
        changes: {}, // TODO: implement changes
        content: this.data,
      });
      if (msg != true) {
        hasError = true;
        for (const error of msg) {
          if (typeof error === 'string') {
            this._errors = { ...this._errors, [key]: error };
          } else if (typeof error === 'object') {
            this._errors = { ...this._errors, [key]: error };
          } else {
            throw new Error('Unexpected return value from validation');
          }
        }
      }
    }
    return hasError;
  }

  saveTask = task({ restartable: true }, async () => {
    const hasError = this.validate();

    if (hasError) {
      return;
    }

    if (!this.isDirty) {
      return;
    }

    await timeout(this.DEBOUNCE_MS);

    if (!this.isDirty) {
      return;
    }

    await this.finalSaveTask.perform();
  });

  private finalSaveTask = task({ enqueue: true }, async () => {
    Object.assign(this.model!, Value.Clone(this.data));

    await this.model!.save();
    this.changesetBeforeHash = Value.Hash({ ...this.data });
  });
}
