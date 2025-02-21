import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export interface UiSaveIndicatorSignature {
  // The arguments accepted by the component
  Args: {
    isSaving: boolean;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class UiSaveIndicatorComponent extends Component<UiSaveIndicatorSignature> {
  // start with 1 as we assume the node is already saved
  @tracked currentProgress = 1.0;
  // internal state to track if we are saving
  @tracked _isSavingInternal = false;
  // internal state to track if we are showing the progress bar
  @tracked isProgressing = false;
  // interval id to keep track of the animation callback
  intervalId = -1;

  // computed property to get the progress in percentage
  get progress() {
    return this.currentProgress * 100;
  }

  unscheduleAnimation() {
    clearInterval(this.intervalId); // stop the interval, stay at 90% until finished
    this.intervalId = -1;
  }

  scheduleAnimation() {
    this.intervalId = setInterval(() => {
      this.currentProgress += 0.05;
      if (this.currentProgress >= 0.95) {
        this.unscheduleAnimation();
      }
    }, 1000 / 60) as unknown as number;
  }

  @action
  update() {
    // manage the state
    if (this.args.isSaving && !this._isSavingInternal) {
      // start saving
      this._isSavingInternal = this.args.isSaving;
      this.currentProgress = 0;
      this.isProgressing = true;
      this.scheduleAnimation();
    } else if (!this.args.isSaving && this._isSavingInternal) {
      // done saving
      this.unscheduleAnimation();
      this._isSavingInternal = false;
      this.currentProgress = 1.0;
      this.isProgressing = false;
    } else if (this.args.isSaving && this._isSavingInternal) {
      // restart saving
      this.currentProgress = 0.0;
    }
  }

  @action destroyAnimation() {
    this.unscheduleAnimation();
  }
}
