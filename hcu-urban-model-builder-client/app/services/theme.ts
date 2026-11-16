import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

/**
 * Paper (light) and Night (dark) theme of the UMB Design System.
 *
 * The theme is set as `data-bs-theme` on the root element: the design tokens
 * (app/styles/design-system/_tokens.scss) and Bootstrap's own dark-mode rules
 * both key off that attribute. Night is opt-in; the operating system setting
 * is deliberately not followed (see the open contrast point of the design
 * system for stock, converter and action nodes).
 */
export default class ThemeService extends Service {
  @tracked current: Theme = 'light';

  get isDark() {
    return this.current === 'dark';
  }

  /** Applies the stored theme. Called once when the application boots. */
  setup() {
    this.apply(this.readStored());
  }

  @action toggle() {
    this.apply(this.isDark ? 'light' : 'dark');
    try {
      window.localStorage.setItem(STORAGE_KEY, this.current);
    } catch {
      // Storage can be unavailable (private mode); the theme then lasts for
      // this page view only.
    }
  }

  private apply(theme: Theme) {
    this.current = theme;
    document.documentElement.setAttribute('data-bs-theme', theme);
  }

  private readStored(): Theme {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'dark'
        ? 'dark'
        : 'light';
    } catch {
      return 'light';
    }
  }
}

declare module '@ember/service' {
  interface Registry {
    theme: ThemeService;
  }
}
