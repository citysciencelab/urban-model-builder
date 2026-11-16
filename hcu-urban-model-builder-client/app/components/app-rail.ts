import Component from '@glimmer/component';
import { service } from '@ember/service';
import type RouterService from '@ember/routing/router-service';
import type ThemeService from 'hcu-urban-model-builder-client/services/theme';

export interface AppRailSignature {
  Args: {
    /** Logs the user out; provided by the application controller. */
    onLogout: () => void;
  };
  Element: HTMLElement;
}

export const DOCS_URL = 'https://citysciencelab.github.io/urban-model-builder/';

/**
 * The 64px app rail of Library and content screens (UMB Design System:
 * Rail). It replaces the top navbar; the editor has no rail.
 */
export default class AppRailComponent extends Component<AppRailSignature> {
  @service declare session: {
    isAuthenticated: boolean;
    data?: { authenticated?: { userinfo?: { name?: string } } };
  };
  @service declare router: RouterService;
  @service declare theme: ThemeService;

  readonly docsUrl = DOCS_URL;

  get isModelsActive() {
    return this.router.currentRouteName?.startsWith('models') ?? false;
  }

  get isPublicActive() {
    return this.router.currentRouteName === 'public-models';
  }

  get isLoginActive() {
    return this.router.currentRouteName === 'login';
  }

  get userName(): string {
    return this.session.data?.authenticated?.userinfo?.name ?? '';
  }

  /** Initials for the avatar, e.g. "RH". */
  get initials() {
    const words = this.userName.trim().split(/\s+/).filter(Boolean);
    const first = words[0]?.[0] ?? '';
    const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
    return `${first}${last}`.toUpperCase() || '?';
  }
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    AppRail: typeof AppRailComponent;
  }
}
