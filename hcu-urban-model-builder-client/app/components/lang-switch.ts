import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import IntlService from 'ember-intl/services/intl';
import { action } from '@ember/object';

export interface LangSwitchSignature {
  // The arguments accepted by the component
  Args: {};
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class LangSwitchComponent extends Component<LangSwitchSignature> {
  @service intl!: IntlService;

  @action changeLocaleTo(locale: string) {
    this.intl.setLocale(locale);
    localStorage.setItem('locale', locale);
    window.location.reload();
  }
}
