import Service, { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import {
  SimulationAdapter,
  summarizeSimulation,
} from 'hcu-urban-model-builder-backend';
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';

/** The user's settings for the assistant, as the `llm-settings` service returns them. */
export interface AssistantSettings {
  chatAvailable: boolean;
  hasOpenRouterKey: boolean;
  openRouterKeyHint?: string | null;
  model?: string | null;
  defaultModel: string;
  availableModels: string[];
}

/** A tool the assistant used. `ok` is null while the tool is running. */
export interface ToolActivity {
  id: string;
  name: string;
  ok: boolean | null;
}

export type AssistantMessage =
  | { kind: 'user'; content: string }
  | {
      kind: 'assistant';
      content: string;
      tools: ToolActivity[];
      limitReached: boolean;
    }
  | {
      kind: 'checkpoint';
      name: string;
      modelId: string;
      modelVersionId: string;
    }
  | { kind: 'error'; reason: string };

type ChatResponse = {
  status: 'completed';
  message: { content: string };
  toolCalls: { name: string; ok: boolean }[];
  limitReached: boolean;
  checkpoint?: { name: string; modelId: string; modelVersionId: string };
};

/** The server asks the browser to run a simulation for the assistant. */
type SimulationRequest = {
  type: 'simulation_request';
  simulationId: string;
  modelVersionId: string;
  parameterValues: Record<string, number>;
  maxPoints: number;
};

type ChatProgress = { requestId: string } & (
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call'; id: string; name: string }
  | { type: 'tool_result'; id: string; name: string; ok: boolean }
  | { type: 'done'; response: ChatResponse }
  | { type: 'error'; reason?: string }
  | SimulationRequest
);

/** Reasons of a failed turn the interface has a text for (`components.assistant.errors.*`). */
const KNOWN_ERROR_REASONS = [
  'missing_api_key',
  'invalid_api_key',
  'insufficient_credits',
  'rate_limited',
  'too_many_messages',
  'llm_error',
  'busy',
  'timeout',
];

// A turn is stopped by the server after five minutes; a little longer than that without an answer means the
// answer was lost, e.g. because the connection dropped.
const TURN_TIMEOUT_MS = 5.5 * 60 * 1000;

const CONSENT_STORAGE_KEY = 'umb-assistant-consent';
const SETTINGS_ID = 'me';

/** The conversation about one model version. It lives as long as the browser tab. */
export class Conversation {
  @tracked messages: AssistantMessage[] = [];
  @tracked isRunning = false;
  /** Text of the answer that is being written. */
  @tracked streamingText = '';
  /** Tools used so far in the running turn. */
  @tracked activity: ToolActivity[] = [];
  /** A backup copy of the model version is made once per conversation, before the first change. */
  hasCheckpoint = false;
}

/**
 * The modelling assistant of the editor: settings (OpenRouter API key, model) and the conversations. The
 * language model runs behind the backend's `chat` service; this service keeps what the user sees.
 */
export default class AssistantService extends Service {
  @service declare feathers: FeathersService;

  @tracked settings: AssistantSettings | null = null;
  @tracked hasConsented = this.readConsent();

  private conversations = new Map<string, Conversation>();

  conversationFor(modelVersionId: string) {
    let conversation = this.conversations.get(modelVersionId);
    if (!conversation) {
      conversation = new Conversation();
      this.conversations.set(modelVersionId, conversation);
    }
    return conversation;
  }

  clear(modelVersionId: string) {
    const conversation = this.conversationFor(modelVersionId);
    if (!conversation.isRunning) {
      conversation.messages = [];
      conversation.hasCheckpoint = false;
    }
  }

  // Settings ------------------------------------------------------------------

  private get settingsService() {
    return this.feathers.app.service('llm-settings');
  }

  async loadSettings() {
    this.settings = (await this.settingsService.get(
      SETTINGS_ID,
    )) as AssistantSettings;
  }

  /** Stores the API key. Storing it includes the consent to send content to OpenRouter. */
  async saveKey(openRouterKey: string) {
    this.settings = (await this.settingsService.patch(SETTINGS_ID, {
      openRouterKey,
    })) as AssistantSettings;
    this.hasConsented = true;
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, 'true');
    } catch {
      // without storage the consent is asked for again in the next session
    }
  }

  async removeKey() {
    this.settings = (await this.settingsService.patch(SETTINGS_ID, {
      openRouterKey: null,
    })) as AssistantSettings;
  }

  async setModel(model: string) {
    this.settings = (await this.settingsService.patch(SETTINGS_ID, {
      model,
    })) as AssistantSettings;
  }

  get model() {
    return this.settings?.model ?? this.settings?.defaultModel ?? '';
  }

  private readConsent() {
    try {
      return window.localStorage.getItem(CONSENT_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  // Conversation --------------------------------------------------------------

  /** Sends a message of the user and follows the turn until its answer or error has arrived. */
  async send(modelVersionId: string, text: string) {
    const conversation = this.conversationFor(modelVersionId);
    const content = text.trim();
    if (!content || conversation.isRunning) {
      return;
    }

    conversation.messages = [
      ...conversation.messages,
      { kind: 'user', content },
    ];
    conversation.isRunning = true;
    conversation.streamingText = '';
    conversation.activity = [];

    const requestId = crypto.randomUUID();
    const chat = this.feathers.app.service('chat');
    let watchdog: ReturnType<typeof setTimeout> | undefined = undefined;

    const finish = (
      message: AssistantMessage,
      checkpoint?: AssistantMessage,
    ) => {
      clearTimeout(watchdog);
      chat.removeListener('progress', onProgress);
      conversation.messages = [
        ...conversation.messages,
        ...(checkpoint ? [checkpoint] : []),
        message,
      ];
      conversation.streamingText = '';
      conversation.activity = [];
      conversation.isRunning = false;
    };
    const fail = (reason?: string) =>
      finish({
        kind: 'error',
        reason:
          reason && KNOWN_ERROR_REASONS.includes(reason) ? reason : 'unknown',
      });
    const complete = (response: ChatResponse) => {
      if (response.checkpoint) {
        conversation.hasCheckpoint = true;
      }
      finish(
        {
          kind: 'assistant',
          content: response.message.content,
          tools: response.toolCalls.map((call, index) => ({
            id: `${requestId}-${index}`,
            name: call.name,
            ok: call.ok,
          })),
          limitReached: response.limitReached,
        },
        response.checkpoint
          ? { kind: 'checkpoint', ...response.checkpoint }
          : undefined,
      );
    };

    const onProgress = (event: ChatProgress) => {
      if (event.requestId !== requestId) {
        return;
      }
      if (event.type === 'text_delta') {
        conversation.streamingText += event.text;
      } else if (event.type === 'tool_call') {
        // what the model wrote before using a tool is not part of its answer
        conversation.streamingText = '';
        conversation.activity = [
          ...conversation.activity,
          { id: event.id, name: event.name, ok: null },
        ];
      } else if (event.type === 'tool_result') {
        conversation.activity = conversation.activity.map((tool) =>
          tool.id === event.id ? { ...tool, ok: event.ok } : tool,
        );
      } else if (event.type === 'done') {
        complete(event.response);
      } else if (event.type === 'simulation_request') {
        void this.simulate(event);
      } else if (event.type === 'error') {
        fail(event.reason);
      }
    };
    chat.on('progress', onProgress);
    watchdog = setTimeout(() => fail('timeout'), TURN_TIMEOUT_MS);

    try {
      const result = (await chat.create({
        requestId,
        modelVersionId,
        messages: this.history(conversation),
        model: this.model || undefined,
        createCheckpoint: !conversation.hasCheckpoint,
      })) as { status: 'started' } | ChatResponse;
      // over the socket connection the answer follows as a `done` event
      if (result.status === 'completed') {
        complete(result);
      }
    } catch (error) {
      const { name, data } = error as {
        name?: string;
        data?: { reason?: string };
      };
      fail(name === 'Conflict' ? 'busy' : data?.reason);
    }
  }

  /**
   * Runs a simulation the assistant asked for, here in the browser like the simulations of the editor, and
   * sends its summary back. The server neither computes it nor loads its geodata.
   */
  private async simulate(request: SimulationRequest) {
    const chat = this.feathers.app.service('chat');
    let answer;
    try {
      const adapter = await new SimulationAdapter(
        this.feathers.app,
        request.modelVersionId,
        new Map(Object.entries(request.parameterValues)),
      ).simulate();
      const nodes = await this.feathers.app.service('nodes').find({
        query: { modelsVersionsId: request.modelVersionId },
      });
      answer = {
        summary: summarizeSimulation(
          adapter.getResults(),
          nodes.data as Parameters<typeof summarizeSimulation>[1],
          request.maxPoints,
        ),
      };
    } catch (error) {
      const { message, data } = error as {
        message?: string;
        data?: { nodeId?: string | null };
      };
      answer = {
        error: {
          message: String(message ?? error).slice(0, 2000),
          nodeId: data?.nodeId ?? null,
        },
      };
    }
    try {
      await chat.submitSimulation({
        simulationId: request.simulationId,
        ...answer,
      });
    } catch (error) {
      // the turn then ends with the server's own time limit
      console.error('Could not return the simulation to the assistant', error);
    }
  }

  /** The conversation as the language model gets it: the texts of the user and of the assistant. */
  private history(conversation: Conversation) {
    return conversation.messages.flatMap((message) =>
      (message.kind === 'user' || message.kind === 'assistant') &&
      message.content
        ? [{ role: message.kind, content: message.content }]
        : [],
    );
  }
}

// Don't remove this declaration: this is what enables TypeScript to resolve
// this service using `Owner.lookup('service:assistant')`, as well
// as to check when you pass the service name as an argument to the decorator,
// like `@service('assistant') declare altName: AssistantService;`.
declare module '@ember/service' {
  interface Registry {
    assistant: AssistantService;
  }
}
