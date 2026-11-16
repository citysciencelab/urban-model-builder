import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import type AssistantService from 'hcu-urban-model-builder-client/services/assistant';

export interface SidebarGeneralViewsAssistantSignature {
  Args: {
    modelVersion: ModelsVersion;
  };
  Element: null;
}

/**
 * Sidebar view of the modelling assistant: a chat about the open model version. Before the first use it asks
 * for the user's OpenRouter API key and their consent to send content there.
 */
export default class SidebarGeneralViewsAssistantComponent extends Component<SidebarGeneralViewsAssistantSignature> {
  @service declare assistant: AssistantService;

  @tracked draft = '';
  @tracked keyInput = '';
  @tracked consentChecked = false;
  @tracked isEditingKey = false;
  @tracked showSettings = false;
  @tracked isSaving = false;
  @tracked settingsError = false;

  get conversation() {
    return this.assistant.conversationFor(this.args.modelVersion.id as string);
  }

  get settings() {
    return this.assistant.settings;
  }

  /** The key form is shown until a key is stored, and again to replace it. */
  get showKeyForm() {
    return (
      !!this.settings && (!this.settings.hasOpenRouterKey || this.isEditingKey)
    );
  }

  get needsConsent() {
    return !this.assistant.hasConsented;
  }

  get canSaveKey() {
    return (
      this.keyInput.trim().length >= 20 &&
      (!this.needsConsent || this.consentChecked) &&
      !this.isSaving
    );
  }

  get canSend() {
    return this.draft.trim().length > 0 && !this.conversation.isRunning;
  }

  get modelOptions() {
    return (this.settings?.availableModels ?? []).map((model) => ({
      model,
      isSelected: model === this.assistant.model,
    }));
  }

  @action async load() {
    try {
      await this.assistant.loadSettings();
    } catch (error) {
      console.error(error);
      this.settingsError = true;
    }
  }

  @action onDraftInput(event: Event) {
    this.draft = (event.target as HTMLTextAreaElement).value;
  }

  /** Enter sends, Shift+Enter starts a new line. */
  @action onDraftKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.send();
    }
  }

  @action send(event?: Event) {
    event?.preventDefault();
    if (!this.canSend) {
      return;
    }
    const text = this.draft;
    this.draft = '';
    this.assistant.send(this.args.modelVersion.id as string, text);
  }

  @action clear() {
    this.assistant.clear(this.args.modelVersion.id as string);
  }

  @action onKeyInput(event: Event) {
    this.keyInput = (event.target as HTMLInputElement).value;
  }

  @action onConsentChange(event: Event) {
    this.consentChecked = (event.target as HTMLInputElement).checked;
  }

  @action async saveKey(event: Event) {
    event.preventDefault();
    if (!this.canSaveKey) {
      return;
    }
    await this.changeSettings(() =>
      this.assistant.saveKey(this.keyInput.trim()),
    );
    if (!this.settingsError) {
      this.keyInput = '';
      this.isEditingKey = false;
    }
  }

  @action toggleSettings() {
    this.showSettings = !this.showSettings;
  }

  @action editKey() {
    this.isEditingKey = true;
  }

  @action cancelEditKey() {
    this.isEditingKey = false;
    this.keyInput = '';
  }

  @action removeKey() {
    return this.changeSettings(() => this.assistant.removeKey());
  }

  @action onModelChange(event: Event) {
    const model = (event.target as HTMLSelectElement).value;
    return this.changeSettings(() => this.assistant.setModel(model));
  }

  /** Keeps the newest message in view while an answer is written. */
  @action scrollToEnd(element: HTMLElement) {
    element.scrollTop = element.scrollHeight;
  }

  private async changeSettings(change: () => Promise<void>) {
    this.isSaving = true;
    this.settingsError = false;
    try {
      await change();
    } catch (error) {
      console.error(error);
      this.settingsError = true;
    } finally {
      this.isSaving = false;
    }
  }
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'SidebarGeneral::Views::Assistant': typeof SidebarGeneralViewsAssistantComponent;
  }
}
