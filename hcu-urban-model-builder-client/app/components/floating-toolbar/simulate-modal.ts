import { action } from '@ember/object';
import { scheduleOnce } from '@ember/runloop';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';
import type Store from '@ember-data/store';
import type Node from 'hcu-urban-model-builder-client/models/node';
import {
  EdgeType,
  NodeType,
  SimulationAdapter,
} from 'hcu-urban-model-builder-backend';
import * as echarts from 'echarts';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import type EventBus from 'hcu-urban-model-builder-client/services/event-bus';
import type Scenario from 'hcu-urban-model-builder-client/models/scenario';
import type ScenariosValue from 'hcu-urban-model-builder-client/models/scenarios-value';
import type EmberReactConnectorService from 'hcu-urban-model-builder-client/services/ember-react-connector';
import type StoreEventEmitterService from 'hcu-urban-model-builder-client/services/store-event-emitter';
import { task, timeout } from 'ember-concurrency';
import config from 'hcu-urban-model-builder-client/config/environment';
import type FloatingToolbarDropdownManagerService from 'hcu-urban-model-builder-client/services/floating-toolbar-dropdown-manager';
import type ModelDialogsService from 'hcu-urban-model-builder-client/services/model-dialogs';
import { cached } from '@glimmer/tracking';
import { TrackedAsyncData } from 'ember-async-data';
import { downloadUtf8Json } from 'hcu-urban-model-builder-client/utils/utf8-json';
import type IntlService from 'ember-intl/services/intl';
import type ScenarioSelectionService from 'hcu-urban-model-builder-client/services/scenario-selection';
import type { ActivePreset } from 'hcu-urban-model-builder-client/services/scenario-selection';
import type {
  ChartEditorResult,
  ChartEditorSource,
} from 'hcu-urban-model-builder-client/components/chart-editor-sidebar';

export interface FloatingToolbarSimulateModalSignature {
  // The arguments accepted by the component
  Args: {
    model: ModelsVersion;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

enum TabName {
  TimeSeries = 'time-series',
  ScatterPlot = 'scatter-plot',
}

enum ChartMode {
  Line = 'line',
  Bar = 'bar',
}

type SimulationResult = Awaited<
  ReturnType<SimulationAdapter<any>['getResults']>
>;

type TimeSeriesDataset = Awaited<
  ReturnType<FloatingToolbarSimulateModalComponent['getTimeSeriesDataset']>
>;
type ScatterPlotDataset = Awaited<
  ReturnType<FloatingToolbarSimulateModalComponent['getScatterPlotDataset']>
>;

type ChartSeries = {
  type: 'line';
  name: string;
  data: number[];
  color?: string;
};

type SimulationBatchWorkerMessage =
  | {
      type: 'progress';
      completed: number;
      total: number;
      elapsedMs: number;
      estimatedRemainingMs: number;
    }
  | { type: 'complete'; results: SimulationResult[] }
  | {
      type: 'error';
      error: { name: string; message: string; data?: unknown; stack?: string };
    };

const BASE_SPEED = 20;

// Each run is simulated sequentially in the worker and, once saved, ends up
// stored as a full result blob - an unbounded deviation count would let one
// click keep the worker busy for a very long time and produce a saved payload
// beyond the backend's Socket.IO message limit. The ceiling comes from
// config/environment.js.
const MAX_DEVIATION_COUNT = config.APP.MAX_SIMULATION_BATCH_RUNS;

export function clampDeviationCount(value: unknown): number {
  const count = Math.floor(Number(value));
  return Number.isFinite(count)
    ? Math.min(MAX_DEVIATION_COUNT, Math.max(1, count))
    : 1;
}

// Echarts' own default theme palette (model/globalDefault.js) - series
// without an explicit color are auto-assigned from this list in order, so we
// replicate it to fill in real colors for the stored-results color picker
// instead of guessing/hardcoding a single fallback color.
const DEFAULT_CHART_COLOR_PALETTE = [
  '#5470c6',
  '#91cc75',
  '#fac858',
  '#ee6666',
  '#73c0de',
  '#3ba272',
  '#fc8452',
  '#9a60b4',
  '#ea7ccc',
];

// Chart editor entry standing in for an unsaved live simulation run.
const LIVE_CHART_EDITOR_RESULT_ID = '__live__';

// The most results the backend returns per request.
const CHART_EDITOR_RESULTS_PAGE_SIZE = 100;

// A stored result as the chart editor lists it before its data is loaded.
type ChartEditorResultSummary = { id: string; name: string; runCount: number };

// Dash patterns telling a variable's individual runs apart in the chart
// editor when they're drawn alongside its median or each other.
const CHART_EDITOR_RUN_DASHES = [
  [6, 3],
  [2, 3],
  [10, 3, 2, 3],
  [4, 6],
  [1, 2],
];

type EmberBasicDropdownAPI = { actions: { close: () => void } };

type StoredSimulationResult = {
  id: string;
  name: string;
  result: SimulationResult & {
    batchResults?: SimulationResult[];
    batchScenarios?: Record<string, number>[];
  };
  scenario: Record<string, number>;
  scenariosId?: string | null;
  scenarioName?: string | null;
  createdAt: string;
  displayCreatedAt: string;
};

type StoredParameterInput = {
  nodeId: string;
  name: string;
  value: number | string;
  min?: number;
  max?: number;
  step?: number;
};

type StoredChartCard = {
  id: string;
  title: string;
  dataset: TimeSeriesDataset;
};

export default class FloatingToolbarSimulateModalComponent extends Component<FloatingToolbarSimulateModalSignature> {
  readonly DEBOUNCE_MS = 250;

  @service declare feathers: FeathersService;
  @service declare store: Store;
  @service declare storeEventEmitter: StoreEventEmitterService;
  @service declare eventBus: EventBus;
  @service declare emberReactConnector: EmberReactConnectorService;
  @service
  declare floatingToolbarDropdownManager: FloatingToolbarDropdownManagerService;
  @service declare modelDialogs: ModelDialogsService;
  @service declare intl: IntlService;
  @service declare scenarioSelection: ScenarioSelectionService;
  basicDropdownInstance: EmberBasicDropdownAPI | null = null;

  @tracked show = false;

  @tracked isClientSideCalculation = true;
  @tracked activeTab: TabName = TabName.TimeSeries;
  @tracked tabNames = Object.values(TabName);
  @tracked chartMode: ChartMode = ChartMode.Line;
  @tracked showScatterPlotTab = false;
  @tracked showStoredScatterPlotTab = false;

  @tracked isPlaying = false;
  @tracked animationCursor = 0.01;
  @tracked speed = 1;
  @tracked time = -1;

  @tracked chartContainer?: HTMLElement;
  @tracked chart?: echarts.ECharts;

  @tracked simulationResult?: SimulationResult | null;
  // The parameter values and the preset the current result was simulated
  // with, taken when its run started. Saving uses these, not the values at
  // save time, which may have changed during a long run.
  private simulatedScenario?: {
    values: Record<string, number>;
    preset: ActivePreset | null;
  };

  @tracked simulationError?: any;
  @tracked simulationErrorNode: Node | null = null;

  @tracked currentDataset: TimeSeriesDataset | ScatterPlotDataset | null = null;
  @tracked isSavingResult = false;
  @tracked isCurrentResultSaved = false;
  @tracked simulationName = 'Simulation 1';
  @tracked deviationCount = 1;
  @tracked isBatchRunning = false;
  @tracked completedSimulations = 0;
  @tracked totalSimulations = 0;
  @tracked estimatedRemainingMs = 0;
  @tracked batchResults: SimulationResult[] = [];
  @tracked batchScenarios: Record<string, number>[] = [];
  @tracked batchTimeSeriesDatasets: TimeSeriesDataset[] = [];
  @tracked selectedBatchRun = -1;
  private simulationNameWasEdited = false;
  private simulationWorker?: Worker;
  private simulationWorkerReject?: (reason: unknown) => void;

  // The stored-results modal renders its own chart independently of the live
  // simulation chart above (both can be open at the same time), so it gets its
  // own container/chart/dataset instead of reusing chartContainer/chart/currentDataset.
  @tracked resultsOpen = false;
  @tracked storedResults: StoredSimulationResult[] = [];
  @tracked resultsCount = 0;
  @tracked pendingStoredResultsLoads = 0;
  @tracked showInitialResultsProgress = false;
  @tracked initialResultsLoaded = 0;
  @tracked initialResultsTotal: number | null = null;
  private initialResultsLoadStarted = false;
  private initialResultsProgressTimer?: ReturnType<typeof setTimeout>;
  @tracked resultsPage = 1;
  @tracked isResultsListCollapsed = false;
  @tracked selectedStoredResult: StoredSimulationResult | null = null;
  @tracked storedChartContainer?: HTMLElement;
  @tracked storedChart?: echarts.ECharts;
  @tracked storedCurrentDataset: TimeSeriesDataset | ScatterPlotDataset | null =
    null;
  @tracked storedChartCards: StoredChartCard[] = [];
  @tracked storedChartSearch = '';

  get filteredStoredChartCards() {
    const query = this.storedChartSearch.trim().toLocaleLowerCase();
    const cards = this.storedChartCards.map((card) =>
      card.id === 'all'
        ? { ...card, title: `${card.title} (Simulation ${this.activeStoredRun + 1})` }
        : card,
    );
    return query
      ? cards.filter(
          (card) =>
            card.id !== 'all' && card.title.toLocaleLowerCase().includes(query),
        )
      : cards;
  }
  @tracked storedBatchDatasets: TimeSeriesDataset[] = [];
  @tracked selectedStoredBatchRuns: number[] = [0];
  @tracked activeStoredRun = 0;

  get activeStoredRunChanges() {
    const result = this.selectedStoredResult;
    if (!result || this.activeStoredRun === 0) return [];
    const baseline = result.result.batchScenarios?.[0] ?? result.scenario;
    const scenario = result.result.batchScenarios?.[this.activeStoredRun];
    if (!scenario) return [];
    return [...new Set([...Object.keys(baseline), ...Object.keys(scenario)])]
      .filter((id) => baseline[id] !== scenario[id])
      .map((id) => ({
        id,
        name: this.storedParameterInputs.find((input) => input.nodeId === id)?.name ?? id,
        before: baseline[id] ?? '—',
        after: scenario[id] ?? '—',
      }));
  }
  @tracked showStoredMedian = true;
  @tracked showStoredTunnel = true;
  @tracked showStoredExtendedFunctions = false;
  @tracked storedExtendedTab: 'inputs' | 'outputs' = 'inputs';
  @tracked enabledOverviewOutputs: string[] = [];
  private overviewOutputsInitialized = false;
  @tracked overviewOutputColors: Record<string, string> = {};
  @tracked overviewOutputSort: 'alphabetical' | 'value' = 'alphabetical';

  get overviewOutputOptions() {
    const options = (
      this.storedBatchDatasets[this.activeStoredRun]?.series ?? []
    ).map((series, index) => ({
      name: series.name,
      value: series.data[series.data.length - 1] ?? 0,
      enabled: this.enabledOverviewOutputs.includes(series.name),
      color: this.overviewOutputColors[series.name] ?? series.color ??
        DEFAULT_CHART_COLOR_PALETTE[index % DEFAULT_CHART_COLOR_PALETTE.length]!,
    }));
    return this.overviewOutputSort === 'value'
      ? options.sort((a, b) => b.value - a.value)
      : options.sort((a, b) => a.name.localeCompare(b.name));
  }

  @action selectStoredExtendedTab(tab: 'inputs' | 'outputs') {
    this.storedExtendedTab = tab;
  }

  @action setOverviewOutputSort(sort: 'alphabetical' | 'value') {
    this.overviewOutputSort = sort;
  }

  @action toggleOverviewOutput(name: string) {
    this.enabledOverviewOutputs = this.enabledOverviewOutputs.includes(name)
      ? this.enabledOverviewOutputs.filter((candidate) => candidate !== name)
      : [...this.enabledOverviewOutputs, name];
    this.renderStoredChartCards();
  }

  // Shared by the output chip's right-click and its invert button.
  @action toggleOtherOverviewOutputs(name: string, event: Event) {
    event.preventDefault();
    this.enabledOverviewOutputs = this.enabledOverviewOutputs.includes(name)
      ? [name]
      : this.overviewOutputOptions.filter((output) => output.name !== name).map((output) => output.name);
    this.renderStoredChartCards();
  }

  @action setOverviewOutputColor(name: string, event: Event) {
    this.overviewOutputColors = {
      ...this.overviewOutputColors,
      [name]: (event.target as HTMLInputElement).value,
    };
    this.renderStoredChartCards();
  }
  @tracked storedParameterInputs: StoredParameterInput[] = [];
  @tracked storedMedianColor = '#5470c6';
  @tracked storedTunnelColor = '#5470c6';
  @tracked storedRunColors: Record<number, string> = {};
  @tracked useStoredTightYAxis = false;
  @tracked isGeneratingStoredChart = false;
  private storedCharts = new Map<string, echarts.ECharts>();
  // Per-series color overrides for the currently viewed stored result. Purely
  // client-side/session-only (never sent to the backend) - just a temporary
  // visualization tweak, reset whenever a different stored result is opened.
  @tracked storedSeriesColorOverrides: Record<string, string> = {};
  readonly resultsPageSize = 5;

  // A zoomed-in, near-fullscreen view of whichever chart (live or stored) was
  // clicked, rendered into its own chart instance so it can use the much
  // larger container size (and a higher devicePixelRatio) without touching
  // the small inline chart it was opened from.
  @tracked isChartZoomOpen = false;
  @tracked zoomedChartContext: 'live' | 'stored' | null = null;
  @tracked zoomedChartContainer?: HTMLElement;
  @tracked zoomedChart?: echarts.ECharts;
  @tracked zoomedStoredCardId: string | null = null;
  @tracked isChartEditorSidebarOpen = false;
  @tracked chartEditorResults: ChartEditorResult[] = [];
  @tracked chartEditorHasChanges = false;
  @tracked isChartEditorLoading = false;
  // Every run per result (a single entry for results without a batch), so
  // median, spread and individual runs can all be derived on demand.
  private chartEditorRuns = new Map<string, TimeSeriesDataset[]>();
  // Line color per result + variable, fixed when the variable is added.
  private chartEditorColors = new Map<string, string>();
  // Bumped on every zoom open/close so a slow results load that finishes
  // after the user moved on doesn't overwrite the newer editor state.
  private chartEditorLoadToken = 0;
  // The results list is only loaded once the sidebar is first opened.
  private isChartEditorPrepared = false;
  // Watches the zoom chart's own box rather than the window, so the chart
  // also follows the sidebar opening/closing (including its transition).
  private zoomedChartResizeObserver?: ResizeObserver;

  // The editor entry the zoomed chart was opened from.
  get chartEditorOriginId() {
    if (this.zoomedChartContext === 'live') return LIVE_CHART_EDITOR_RESULT_ID;
    return this.zoomedChartContext === 'stored'
      ? (this.selectedStoredResult?.id ?? null)
      : null;
  }

  get zoomedChartTitle() {
    return this.filteredStoredChartCards.find(
      (card) => card.id === this.zoomedStoredCardId,
    )?.title ?? this.intl.t('components.simulate_modal.title');
  }

  @action async openStoredCardZoom(cardId: string) {
    this.zoomedStoredCardId = cardId;
    await this.openChartZoom('stored');
  }

  @action toggleChartEditorSidebar() {
    this.isChartEditorSidebarOpen = !this.isChartEditorSidebarOpen;
    if (this.isChartEditorSidebarOpen && !this.isChartEditorPrepared) {
      this.isChartEditorPrepared = true;
      void this.prepareChartEditorResults(this.chartEditorLoadToken);
    }
  }

  @action toggleChartEditorVariable(resultId: string, variableName: string) {
    const result = this.chartEditorResults.find(
      (candidate) => candidate.id === resultId,
    );
    const wasSelected = result?.variables.find(
      (variable) => variable.name === variableName,
    )?.selected;
    if (wasSelected) {
      // Free the color for whatever gets added next.
      this.chartEditorColors.delete(
        this.chartEditorColorKey(resultId, variableName),
      );
    } else {
      this.assignChartEditorColor(
        resultId,
        variableName,
        this.chartEditorRuns
          .get(resultId)?.[0]
          ?.series.find((series) => series.name === variableName)?.color,
      );
    }
    this.chartEditorResults = this.chartEditorResults.map((result) =>
      result.id === resultId
        ? {
            ...result,
            variables: result.variables.map((variable) =>
              variable.name === variableName
                ? { ...variable, selected: !variable.selected }
                : variable,
            ),
          }
        : result,
    );
    this.chartEditorHasChanges = true;
    void this.renderZoomedChart();
  }

  @action changeChartEditorSources(resultId: string, sourceIds: string[]) {
    const ids = new Set(sourceIds);
    this.chartEditorResults = this.chartEditorResults.map((result) =>
      result.id === resultId
        ? {
            ...result,
            // Keep the option order (median, spread, runs) regardless of the
            // order the user clicked them in, so legends stay predictable.
            selectedSourceIds: result.sources
              .filter((source) => ids.has(source.id))
              .map((source) => source.id),
          }
        : result,
    );
    this.chartEditorHasChanges = true;
    void this.renderZoomedChart();
  }

  @action async handleStoredCardZoomKeydown(cardId: string, event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    await this.openStoredCardZoom(cardId);
  }

  tabNameToChartOptionByIndex = {
    [TabName.TimeSeries]: this.getTimeseriesChartOptionByIndex,
    [TabName.ScatterPlot]: this.getScatterPlotChartOptionByIndex,
  };

  tabNameToDatasetFunction = {
    [TabName.TimeSeries]: this.getTimeSeriesDataset,
    [TabName.ScatterPlot]: this.getScatterPlotDataset,
  };

  constructor(owner: unknown, args: any) {
    super(owner, args);
    this.eventBus.on(
      'scenario-value-changed',
      this.restartSimulationIfAutomatic,
    );

    this.storeEventEmitter.on(
      'node',
      'created',
      this.restartSimulationIfAutomatic,
    );
    this.storeEventEmitter.on(
      'node',
      'updated',
      this.restartSimulationIfAutomatic,
    );
    this.storeEventEmitter.on(
      'node',
      'deleted',
      this.restartSimulationIfAutomatic,
    );

    this.storeEventEmitter.on(
      'edge',
      'created',
      this.restartSimulationIfAutomatic,
    );
    this.storeEventEmitter.on(
      'edge',
      'updated',
      this.restartSimulationIfAutomatic,
    );
    this.storeEventEmitter.on(
      'edge',
      'deleted',
      this.restartSimulationIfAutomatic,
    );
  }

  get ALLOW_SERVER_SIDE_SIMULATION() {
    return config.APP.ALLOW_SERVER_SIDE_SIMULATION;
  }

  get maxDeviationCount() {
    return MAX_DEVIATION_COUNT;
  }

  // Results saved under an earlier, higher ceiling stay readable but cannot
  // grow any further; the backend rejects such runs as well.
  get isStoredBatchFull() {
    return this.storedBatchDatasets.length >= MAX_DEVIATION_COUNT;
  }

  get isAnimationFinished() {
    return this.animationCursor >= 100;
  }

  get simulationEndTime() {
    return this.args.model.timeStart + this.args.model.timeLength;
  }

  get hasError() {
    return !!this.simulationError;
  }

  get resultsPages() {
    return Math.max(1, Math.ceil(this.resultsCount / this.resultsPageSize));
  }

  get formattedRemainingTime() {
    const seconds = Math.max(0, Math.ceil(this.estimatedRemainingMs / 1000));
    if (seconds < 60) return `${seconds} s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min ${seconds % 60} s`;
  }

  get hasBatchEstimate() {
    return this.completedSimulations > 0;
  }

  get batchProgressPercent() {
    if (!this.totalSimulations) return 0;
    return Math.min(
      100,
      Math.round((this.completedSimulations / this.totalSimulations) * 100),
    );
  }

  get batchProgressTarget() {
    return document.body;
  }

  @action
  setBatchProgressBarWidth(element: HTMLElement) {
    element.style.width = `${this.batchProgressPercent}%`;
  }

  get batchRunOptions() {
    return this.batchResults.map((_, index) => index + 1);
  }

  get storedBatchRunOptions() {
    return this.storedBatchDatasets.map((_, index) => index + 1);
  }

  get showsResultsList() {
    return this.resultsCount > 1 && !this.isResultsListCollapsed;
  }

  get resultPayload():
    | (SimulationResult & {
        batchResults?: SimulationResult[];
        batchScenarios?: Record<string, number>[];
      })
    | null
    | undefined {
    if (!this.simulationResult || this.batchResults.length <= 1) {
      return this.simulationResult;
    }
    return {
      ...this.batchResults[0]!,
      batchResults: this.batchResults,
      batchScenarios: this.batchScenarios,
    };
  }

  @cached
  get _isSimulationPossible() {
    const promise = async () => {
      const nodes = await this.args.model.nodes;
      const filteredNodes = nodes.filter((item) => item.isOutputParameter);
      return filteredNodes && filteredNodes.length > 0;
    };
    return new TrackedAsyncData(promise());
  }

  @cached
  get isSimulationPossible() {
    if (this._isSimulationPossible.isPending) {
      return true;
    } else {
      return this._isSimulationPossible.value;
    }
  }

  get inMemoryScenario(): Map<string, number> {
    // from the store get the current default scenario
    const defaultScenario = this.store
      .peekAll<Scenario>('scenario')
      .find((item) => {
        return (
          item.modelsVersions.id == this.args.model.id && item.isDefault == true
        );
      }) as Scenario;

    if (!defaultScenario) {
      return new Map<string, number>();
    }

    const scenarioValues = this.store
      .peekAll<ScenariosValue>('scenarios-value')
      .filter((item) => {
        return item.scenarios.id == defaultScenario.id;
      });

    const scenarioNodeValueMap = scenarioValues.reduce((acc, item) => {
      acc.set(item.nodes.id!, Number(item.value));
      return acc;
    }, new Map<string, number>());

    return scenarioNodeValueMap;
  }

  @action
  onOpen() {
    this.floatingToolbarDropdownManager.onOpen('simulateModal');
    this.show = true;
    this.simulationTask.perform();
    return this.show;
  }

  @action
  onClose() {
    const canClose =
      !this.floatingToolbarDropdownManager.isSimulateDropdownPinned;

    if (canClose) {
      this.show = false;
    }
    return canClose;
  }

  @action
  async toggleClientSideCalculation(value: boolean) {
    this.isClientSideCalculation = value;
    await this.restartSimulationIfAutomatic();
  }

  @action isTabActive(tabName: TabName) {
    return this.activeTab === tabName;
  }

  @action isChartModeActive(chartMode: ChartMode) {
    return this.chartMode === chartMode;
  }

  @action isLiveTabVisible(tabName: TabName) {
    return tabName !== TabName.ScatterPlot || this.showScatterPlotTab;
  }

  @action isStoredTabVisible(tabName: TabName) {
    return tabName !== TabName.ScatterPlot || this.showStoredScatterPlotTab;
  }

  // Scatter plots only make sense for output nodes that carry agent
  // location/state data (Population nodes) - hide the tab entirely rather
  // than showing an empty chart for results without any.
  private async isScatterPlotAvailable(
    result: SimulationResult | null | undefined,
  ): Promise<boolean> {
    if (!result) return false;
    for (const nodeId of Object.keys(result.nodes)) {
      const node = await this.store.findRecord<Node>('node', nodeId);
      if (node.type === NodeType.Population) {
        return true;
      }
    }
    return false;
  }

  @action
  async switchTab(tabName: TabName) {
    if (this.resultsOpen && this.selectedStoredResult) {
      this.activeTab = tabName;
      if (tabName === TabName.TimeSeries) {
        this.disposeStoredCharts();
        await this.prepareStoredChartCards();
      } else {
        await this.renderStoredResult();
      }
    } else {
      await this.showLiveTab(tabName);
    }
  }

  // Switching tabs only redraws the current result; it neither runs nor saves
  // a new simulation.
  private async showLiveTab(tabName: TabName) {
    const result = this.simulationResult;
    // A run that is about to start or still running draws whatever tab is
    // active once it is done.
    if (!result || this.simulationTask.isRunning) {
      this.activeTab = tabName;
      return;
    }
    const dataset =
      tabName === TabName.TimeSeries && this.batchTimeSeriesDatasets.length > 1
        ? this.createBatchMedianDataset()
        : await this.tabNameToDatasetFunction[tabName](result);
    if (result !== this.simulationResult || this.simulationTask.isRunning) {
      return;
    }
    // Tab and dataset change together, so a running chart animation never
    // draws one tab's dataset with the other tab's chart options.
    this.activeTab = tabName;
    this.currentDataset = dataset;
    this.chart?.clear();
    await this.updateDatasetFromAnimationCursor();
  }

  @action
  async switchChartMode(chartMode: ChartMode) {
    this.chartMode = chartMode;
    if (this.isChartZoomOpen) {
      await this.renderZoomedChart();
    } else if (this.resultsOpen && this.selectedStoredResult) {
      await this.renderStoredResult();
    } else {
      await this.updateDatasetFromAnimationCursor();
    }
  }

  @action
  async restartSimulation() {
    this.simulationTask.perform();
  }

  // Model and scenario changes only start a run when the model version is set
  // to simulate automatically; otherwise the next run starts from the
  // "Simulate" button.
  @action
  async restartSimulationIfAutomatic() {
    if (this.args.model.autoSimulate) {
      await this.restartSimulation();
    }
  }

  simulationTask = task({ restartable: true }, async () => {
    let isCanceled = true;
    try {
      if (!this.show) {
        isCanceled = false;
        return;
      }
      await timeout(this.DEBOUNCE_MS);

      this.simulationError = undefined;
      this.simulationErrorNode = null;
      this.currentDataset = null;
      this.isPlaying = false;
      if (this.chart) {
        this.chart.clear();
      }

      await this.simulate();
      this.isCurrentResultSaved = false;

      this.batchTimeSeriesDatasets =
        this.batchResults.length > 1
          ? await Promise.all(
              this.batchResults.map((result) =>
                this.getTimeSeriesDataset(result),
              ),
            )
          : [];

      // Client-side batches are persistent simulation sessions. Save only
      // after every run has completed so the database never receives a
      // partial batch when a worker fails or is superseded.
      if (this.batchResults.length > 0) {
        await this.saveCurrentResult();
      }

      this.showScatterPlotTab = await this.isScatterPlotAvailable(
        this.simulationResult,
      );
      if (this.activeTab === TabName.ScatterPlot && !this.showScatterPlotTab) {
        this.activeTab = TabName.TimeSeries;
      }

      this.chart = echarts.init(this.chartContainer!, null, {
        height: 400,
        width: 'auto',
      });

      this.currentDataset = await this.tabNameToDatasetFunction[
        this.activeTab
      ]?.(this.simulationResult!);
      if (
        this.activeTab === TabName.TimeSeries &&
        this.batchTimeSeriesDatasets.length > 1
      ) {
        this.currentDataset = this.createBatchMedianDataset();
      }

      this.animationCursor = 0;
      this.startAnimation();
      isCanceled = false;
    } catch (e: any) {
      // A stale run's own batch worker was terminated by a newer one that
      // superseded it (see cancelRunningSimulationBatch) - that newer run is
      // already in charge of the chart/error state, so this instance has
      // nothing left to do.
      if (e?.name === 'SimulationBatchCanceled') {
        return;
      }
      this.simulationError = e;
      if (e.name === 'SimulationError') {
        if (e.data?.nodeId) {
          this.simulationErrorNode = this.store.peekRecord<Node>(
            'node',
            e.data.nodeId,
          );
        }
      } else {
        console.error(e);
      }
      this.chart?.clear();
      return;
    } finally {
      if (isCanceled) {
        console.debug('Simulation task was canceled');
      }
    }
  });

  calculateNextAnimationCursor() {
    this.animationCursor =
      Number(this.animationCursor) + 0.01 * this.speed * BASE_SPEED;
  }

  startAnimation() {
    if (!this.isPlaying) {
      this.isPlaying = true;
      requestAnimationFrame(this.animateChart.bind(this));
    }
  }

  animateChart() {
    if (this.isPlaying && this.animationCursor < 100) {
      this.calculateNextAnimationCursor();
      this.updateDatasetFromAnimationCursor();
      requestAnimationFrame(this.animateChart.bind(this));
    } else {
      // still playing? then we reached the end
      if (this.isPlaying) {
        // ensure we are at the end, no matter what float math says
        this.animationCursor = 100;
        this.updateDatasetFromAnimationCursor();
        this.isPlaying = false;
      }
    }
  }

  @action
  async didInsertChartContainer(element: any) {
    this.chartContainer = element;
  }

  @action
  async simulate() {
    const nodeValuesMap = this.inMemoryScenario;
    const simulatedScenario = {
      values: Object.fromEntries(nodeValuesMap),
      preset: this.scenarioSelection.activePresetFor(this.args.model.id!),
    };

    if (this.isClientSideCalculation) {
      this.batchResults = await this.runSimulationBatch(
        clampDeviationCount(this.deviationCount),
        Object.fromEntries(nodeValuesMap),
      );
      const scenario = Object.fromEntries(nodeValuesMap);
      this.batchScenarios = this.batchResults.map(() => ({ ...scenario }));
      this.selectedBatchRun = -1;
      this.simulationResult = this.batchResults[0] ?? null;
      this.simulatedScenario = simulatedScenario;
    } else {
      this.cancelRunningSimulationBatch();
      this.batchResults = [];
      this.batchScenarios = [];
      this.batchTimeSeriesDatasets = [];
      this.simulationResult = (await this.feathers.app
        .service('models')
        .simulate({
          id: this.args.model.id!,
          nodeIdToParameterValueMap: Object.fromEntries(nodeValuesMap),
        })) as any;
      this.simulatedScenario = simulatedScenario;
    }
  }

  // Cancels whatever batch is currently in flight (if any) and makes sure
  // its Promise actually settles instead of being left to hang forever -
  // worker.terminate() alone never fires onmessage/onerror, so without this
  // the caller that's still awaiting the old runSimulationBatch() call would
  // be stuck permanently.
  private cancelRunningSimulationBatch() {
    if (!this.simulationWorker) return;
    this.simulationWorker.terminate();
    this.simulationWorker = undefined;
    this.simulationWorkerReject?.(
      Object.assign(new Error('Simulation batch was superseded by a newer run.'), {
        name: 'SimulationBatchCanceled',
      }),
    );
    this.simulationWorkerReject = undefined;
    this.isBatchRunning = false;
  }

  private async runSimulationBatch(
    runCount: number,
    scenario: Record<string, number>,
  ): Promise<SimulationResult[]> {
    this.cancelRunningSimulationBatch();
    // Set synchronously (before the snapshot await below) so a second call
    // made from another click handler before this one resumes sees the flag
    // already flipped, instead of both calls racing past the isBatchRunning
    // guard in addRunToStoredBatch/elsewhere.
    this.isBatchRunning = true;
    this.completedSimulations = 0;
    this.totalSimulations = runCount;
    this.estimatedRemainingMs = 0;
    const snapshot = await this.createSimulationSnapshot();

    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL('../../workers/simulation-batch.ts', import.meta.url),
        { type: 'module' },
      );
      this.simulationWorker = worker;
      this.simulationWorkerReject = reject;
      const cleanUp = () => {
        worker.terminate();
        if (this.simulationWorker === worker) {
          this.simulationWorker = undefined;
          this.simulationWorkerReject = undefined;
        }
        this.isBatchRunning = false;
      };

      worker.onmessage = (event: MessageEvent<SimulationBatchWorkerMessage>) => {
        const message = event.data;
        if (message.type === 'progress') {
          this.completedSimulations = message.completed;
          this.totalSimulations = message.total;
          this.estimatedRemainingMs = message.estimatedRemainingMs;
          return;
        }
        cleanUp();
        if (message.type === 'complete') {
          resolve(message.results);
          return;
        }
        reject(
          Object.assign(new Error(message.error.message), {
            name: message.error.name,
            data: message.error.data,
            stack: message.error.stack,
          }),
        );
      };
      worker.onerror = (event) => {
        cleanUp();
        reject(new Error(event.message));
      };
      worker.postMessage({
        type: 'start',
        modelVersionId: this.args.model.id!,
        scenario,
        runCount,
        snapshot,
      });
    });
  }

  /**
   * The canvas already loaded this complete model version. Supplying that
   * snapshot keeps a simulation local and prevents a large imported sub-model
   * from issuing many sequential Socket.IO reads.
   */
  private async createSimulationSnapshot() {
    const nodeModels = await this.args.model.nodes;
    const edgeModels = await this.args.model.edges;
    const nodes = nodeModels.map((node) => ({
      id: node.id!,
      modelsVersionsId: this.args.model.id!,
      type: node.type,
      name: node.name,
      description: node.description,
      data: node.data,
      position: node.position,
      width: node.width,
      height: node.height,
      parentId: node.parent?.id || null,
      ghostParentId: node.ghostParent?.id || null,
      isParameter: node.isParameter,
      isOutputParameter: node.isOutputParameter,
      parameterType: node.parameterType,
      parameterMin: node.parameterMin,
      parameterMax: node.parameterMax,
      parameterStep: node.parameterStep,
      parameterOptions: node.parameterOptions,
    }));
    const edges = edgeModels.map((edge) => ({
      id: edge.id!,
      modelsVersionsId: this.args.model.id!,
      type: edge.type,
      sourceId: edge.source.id,
      targetId: edge.target.id,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      points: edge.points,
    }));

    const modelVersion = {
      id: this.args.model.id!,
      timeUnits: this.args.model.timeUnits,
      timeStart: this.args.model.timeStart,
      timeStep: this.args.model.timeStep,
      timeLength: this.args.model.timeLength,
      algorithm: this.args.model.algorithm,
      globals: this.args.model.globals,
    };

    return JSON.parse(JSON.stringify({ modelVersion, nodes, edges }));
  }

  @action
  async saveCurrentResult() {
    if (!this.simulationResult || this.isSavingResult) return;
    this.isSavingResult = true;
    try {
      const name =
        this.simulationName.trim() || `Simulation ${this.resultsCount + 1}`;
      const simulated = this.simulatedScenario;
      await (this.feathers.app.service('models') as any).saveSimulationResult({
        modelsVersionsId: this.args.model.id!,
        ...(simulated?.preset
          ? {
              scenariosId: simulated.preset.id,
              scenarioName: simulated.preset.name,
            }
          : {}),
        name,
        scenario:
          simulated?.values ?? Object.fromEntries(this.inMemoryScenario),
        result: this.resultPayload,
      });
      this.isCurrentResultSaved = true;
      this.simulationNameWasEdited = false;
      await this.loadStoredResults(false);
    } finally {
      this.isSavingResult = false;
    }
  }

  @action
  updateSimulationName(event: Event) {
    this.simulationName = (event.target as HTMLInputElement).value;
    this.simulationNameWasEdited = true;
  }

  @action
  updateDeviationCount(event: Event) {
    this.deviationCount = clampDeviationCount(
      (event.target as HTMLInputElement).value,
    );
  }

  @action
  async loadStoredResults(selectFirst = true) {
    const isInitialLoad = !this.initialResultsLoadStarted;
    this.initialResultsLoadStarted = true;
    if (isInitialLoad) {
      this.initialResultsProgressTimer = setTimeout(() => {
        if (!this.isDestroying && !this.isDestroyed) this.showInitialResultsProgress = true;
      }, 3000);
    }
    this.pendingStoredResultsLoads++;
    try {
      const skip = (this.resultsPage - 1) * this.resultsPageSize;
      const response = await (
        this.feathers.app.service('models') as any
      ).findSimulationResults({
        modelsVersionsId: this.args.model.id!,
        $skip: skip,
        $limit: isInitialLoad ? 1 : this.resultsPageSize,
      });
      if (isInitialLoad) {
        this.initialResultsTotal = Math.min(this.resultsPageSize, Math.max(0, response.total - skip));
        this.initialResultsLoaded = response.data.length;
        const remaining = await Promise.all(
          Array.from({ length: Math.max(0, this.initialResultsTotal - response.data.length) }, async (_, index) => {
            const page = await (this.feathers.app.service('models') as any).findSimulationResults({
              modelsVersionsId: this.args.model.id!,
              $skip: skip + index + 1,
              $limit: 1,
            });
            if (!this.isDestroying && !this.isDestroyed) this.initialResultsLoaded += page.data.length;
            return page.data;
          }),
        );
        response.data = [...response.data, ...remaining.flat()];
      }
      if (this.isDestroying || this.isDestroyed) return;
      this.storedResults = response.data.map(
        (result: Omit<StoredSimulationResult, 'displayCreatedAt'>) => ({
          ...result,
          displayCreatedAt: new Intl.DateTimeFormat('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
            .format(new Date(result.createdAt))
            .replace(',', ''),
        }),
      );
      this.resultsCount = response.total;
      if (!this.simulationNameWasEdited) {
        this.simulationName = `Simulation ${this.resultsCount + 1}`;
      }
      if (selectFirst && this.storedResults.length) {
        await this.selectStoredResult(this.storedResults[0]!);
      }
    } finally {
      if (isInitialLoad) {
        clearTimeout(this.initialResultsProgressTimer);
        this.initialResultsProgressTimer = undefined;
        if (!this.isDestroying && !this.isDestroyed) this.showInitialResultsProgress = false;
      }
      this.pendingStoredResultsLoads--;
    }
  }

  @action
  async openStoredResults() {
    this.resultsOpen = true;
    this.resultsPage = 1;
    this.isResultsListCollapsed = false;
    await this.loadStoredResults();
  }

  @action toggleResultsList() {
    this.isResultsListCollapsed = !this.isResultsListCollapsed;
    scheduleOnce('afterRender', this, this.resizeStoredCharts);
  }

  private resizeStoredCharts() {
    if (this.isDestroying || this.isDestroyed || !this.resultsOpen) return;
    const charts = new Set(this.storedCharts.values());
    if (this.storedChart) charts.add(this.storedChart);
    for (const chart of charts) {
      if (!chart.isDisposed()) chart.resize();
    }
  }

  @action closeStoredResults() {
    if (this.zoomedChartContext === 'stored') {
      this.closeChartZoom();
    }
    this.resultsOpen = false;
    this.selectedStoredResult = null;
    this.showStoredScatterPlotTab = false;
    this.storedSeriesColorOverrides = {};
    this.disposeStoredCharts();
    this.storedChart = undefined;
    this.storedChartContainer = undefined;
    this.storedCurrentDataset = null;
    this.storedChartCards = [];
    this.storedBatchDatasets = [];
  }

  private disposeStoredCharts() {
    for (const chart of this.storedCharts.values()) chart.dispose();
    this.storedCharts.clear();
  }

  @action
  async didInsertStoredChart(element: HTMLElement) {
    this.storedChartContainer = element;
    if (this.selectedStoredResult) await this.renderStoredResult();
  }

  @action
  didInsertStoredChartCard(element: HTMLElement) {
    const card = this.storedChartCards.find(
      (candidate) => candidate.id === element.dataset['chartId'],
    );
    if (!card) return;
    this.storedCharts.get(card.id)?.dispose();
    const chart = echarts.init(element);
    this.storedCharts.set(card.id, chart);
    if (card.id === 'all') {
      this.storedChart = chart;
      this.storedChartContainer = element;
    }
    chart.setOption(this.getStoredCardOption(card));
  }

  @action
  willDestroyStoredChartCard(element: HTMLElement) {
    const id = element.dataset['chartId'];
    if (!id) return;
    const chart = this.storedCharts.get(id);
    // A replacement card may already have registered a new chart with this ID.
    if (chart?.getDom() !== element) return;
    chart.dispose();
    this.storedCharts.delete(id);
    if (this.storedChart === chart) {
      this.storedChart = undefined;
      this.storedChartContainer = undefined;
    }
  }

  @action
  async selectStoredResult(result: StoredSimulationResult) {
    // Chart cards are keyed by their stable IDs in the template. When two
    // results contain the same outputs, Ember reuses those DOM elements and
    // does not run didInsertStoredChartCard again. Keep their ECharts
    // instances alive here and update them once the new datasets are ready;
    // removed cards are still disposed by willDestroyStoredChartCard.
    this.activeStoredRun = 0;
    this.storedExtendedTab = 'inputs';
    this.enabledOverviewOutputs = [];
    this.overviewOutputsInitialized = false;
    this.overviewOutputColors = {};
    this.storedChartSearch = '';
    this.selectedStoredResult = result;
    this.showStoredExtendedFunctions = false;
    this.storedMedianColor = '#5470c6';
    this.storedTunnelColor = '#5470c6';
    this.storedRunColors = {};
    await this.prepareStoredParameterInputs();
    this.storedSeriesColorOverrides = {};
    this.showStoredScatterPlotTab = await this.isScatterPlotAvailable(
      result.result,
    );
    if (
      this.activeTab === TabName.ScatterPlot &&
      !this.showStoredScatterPlotTab
    ) {
      this.activeTab = TabName.TimeSeries;
    }
    if (this.activeTab === TabName.TimeSeries) {
      await this.prepareStoredChartCards();
    } else if (this.storedChartContainer) {
      await this.renderStoredResult();
    }
  }

  private async prepareStoredParameterInputs() {
    // Capture which result this call is for so that if the user selects a
    // different result before these async node lookups resolve, this now-
    // stale call doesn't overwrite the newer selection's parameter inputs.
    const target = this.selectedStoredResult;
    if (!target) return;
    const inputs = await Promise.all(
      Object.entries(target.scenario).map(async ([nodeId, value]) => {
        const node = await this.store.findRecord<Node>('node', nodeId);
        return {
          nodeId,
          name: node.name,
          value,
          min: node.parameterMin,
          max: node.parameterMax,
          step: node.parameterStep,
        };
      }),
    );
    if (this.selectedStoredResult !== target) return;
    this.storedParameterInputs = inputs;
  }

  private async prepareStoredChartCards() {
    // Same staleness guard as prepareStoredParameterInputs - the dataset
    // build below awaits per-node lookups, so a newer selection can finish
    // first; without this check, this call would then overwrite the newer
    // selection's chart cards with data for the result it isn't showing.
    const target = this.selectedStoredResult;
    if (!target) return;
    this.isGeneratingStoredChart = true;
    try {
      const storedBatchDatasets = await this.getRunDatasets(target.result);
      if (this.selectedStoredResult !== target) return;

      this.storedBatchDatasets = storedBatchDatasets;
      if (!this.overviewOutputsInitialized) {
        this.enabledOverviewOutputs = storedBatchDatasets[0]?.series.map(
          (series) => series.name,
        ) ?? [];
        this.overviewOutputsInitialized = true;
      }
      this.selectedStoredBatchRuns = [0];
      const overview = this.createBatchMedianDataset(
        this.storedBatchDatasets,
      );
      this.storedCurrentDataset = overview;
      this.storedChartCards = [
        {
          id: 'all',
          title: this.intl.t('components.simulate_modal.all_outputs'),
          dataset: overview,
        },
        ...overview.series.map((series, index) => ({
          id: `output-${index}`,
          title: series.name,
          dataset: { times: overview.times, series: [series] },
        })),
      ];
      // Existing keyed card elements are reused when switching results, so
      // explicitly apply the freshly prepared datasets to their charts.
      this.renderStoredChartCards();
    } finally {
      if (this.selectedStoredResult === target) {
        this.isGeneratingStoredChart = false;
      }
    }
  }

  private getStoredBatchChartOption(dataset: TimeSeriesDataset) {
    const chartSeries = dataset.series.flatMap((medianSeries, seriesIndex) => {
      const medianColor = this.storedMedianColor;
      const lower = medianSeries.data.map((_, timeIndex) =>
        this.quantile(
          this.getBatchSeriesValues(
            medianSeries.name,
            timeIndex,
            this.storedBatchDatasets,
          ),
          0.1,
        ),
      );
      const upper = medianSeries.data.map((_, timeIndex) =>
        this.quantile(
          this.getBatchSeriesValues(
            medianSeries.name,
            timeIndex,
            this.storedBatchDatasets,
          ),
          0.9,
        ),
      );
      const stack = `stored-tunnel-${seriesIndex}`;

      return [
        ...(this.showStoredTunnel
          ? [
              {
                name: `${medianSeries.name}-tunnel-base`,
                type: 'line',
                stack,
                stackStrategy: 'all',
                data: lower,
                symbol: 'none',
                lineStyle: { opacity: 0 },
                areaStyle: { opacity: 0 },
                tooltip: { show: false },
                silent: true,
              },
              {
                name: `${medianSeries.name}-tunnel-range`,
                type: 'line',
                stack,
                stackStrategy: 'all',
                data: upper.map(
                  (value, timeIndex) => value - lower[timeIndex]!,
                ),
                symbol: 'none',
                lineStyle: { opacity: 0 },
                areaStyle: { color: this.storedTunnelColor, opacity: 0.18 },
                tooltip: { show: false },
                silent: true,
              },
            ]
          : []),
        ...(this.showStoredMedian
          ? [
              {
                ...medianSeries,
                type: 'line',
                symbol: 'circle',
                symbolSize: 4,
                lineStyle: { color: medianColor, width: 2 },
                itemStyle: { color: medianColor },
              },
            ]
          : []),
        ...this.selectedStoredBatchRuns.flatMap((runIndex) => {
          const selectedSeries = this.storedBatchDatasets[
            runIndex
          ]?.series.find(
            (candidate) => candidate.name === medianSeries.name,
          );
          if (!selectedSeries) return [];
          const runColor =
            this.storedRunColors[runIndex] ??
            DEFAULT_CHART_COLOR_PALETTE[
              (runIndex + 2) % DEFAULT_CHART_COLOR_PALETTE.length
            ]!;
          return [
            {
              name: `${medianSeries.name} – Simulation ${runIndex + 1}`,
              type: 'line',
              data: selectedSeries.data,
              symbol: 'circle',
              symbolSize: 4,
              lineStyle: { color: runColor, width: 2, type: 'dashed' },
              itemStyle: { color: runColor },
            },
          ];
        }),
      ];
    });

    return {
      grid: { left: 48, right: 18, top: 18, bottom: 42 },
      xAxis: { type: 'category', data: dataset.times },
      yAxis: { type: 'value', scale: this.useStoredTightYAxis },
      tooltip: { trigger: 'item' },
      animation: false,
      series: chartSeries,
    };
  }

  private getStoredCardOption(card: StoredChartCard) {
    if (card.id !== 'all') return this.getStoredBatchChartOption(card.dataset);
    const dataset = this.storedBatchDatasets[this.activeStoredRun];
    return {
      grid: { left: 48, right: 18, top: 18, bottom: 42 },
      xAxis: { type: 'category', data: dataset?.times ?? [] },
      yAxis: { type: 'value', scale: this.useStoredTightYAxis },
      tooltip: { trigger: 'item' },
      animation: false,
      series: (dataset?.series ?? []).filter((series) => this.enabledOverviewOutputs.includes(series.name)).map((series) => ({
        ...series,
        type: 'line',
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { color: this.overviewOutputOptions.find((output) => output.name === series.name)?.color },
        itemStyle: { color: this.overviewOutputOptions.find((output) => output.name === series.name)?.color },
      })),
    };
  }

  // Shared by the run chip's right-click and its activate button.
  @action activateStoredRun(runIndex: number, event: Event) {
    event.preventDefault();
    this.activeStoredRun = runIndex;
    this.renderStoredChartCards();
  }

  private renderStoredChartCards() {
    for (const card of this.storedChartCards) {
      this.storedCharts.get(card.id)?.setOption(
        this.getStoredCardOption(card),
        { replaceMerge: ['series'] },
      );
    }
  }

  @action toggleStoredMedian() {
    this.showStoredMedian = !this.showStoredMedian;
    this.renderStoredChartCards();
  }

  @action toggleStoredTunnel() {
    this.showStoredTunnel = !this.showStoredTunnel;
    this.renderStoredChartCards();
  }

  @action toggleStoredBatchRun(runIndex: number) {
    this.selectedStoredBatchRuns = this.selectedStoredBatchRuns.includes(
      runIndex,
    )
      ? this.selectedStoredBatchRuns.filter((index) => index !== runIndex)
      : [...this.selectedStoredBatchRuns, runIndex].sort((a, b) => a - b);
    this.renderStoredChartCards();
  }

  @action isStoredBatchRunSelected(runIndex: number) {
    return this.selectedStoredBatchRuns.includes(runIndex);
  }

  @action toggleStoredExtendedFunctions() {
    this.showStoredExtendedFunctions = !this.showStoredExtendedFunctions;
  }

  @action updateStoredParameter(nodeId: string, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.storedParameterInputs = this.storedParameterInputs.map((input) =>
      input.nodeId === nodeId ? { ...input, value } : input,
    );
  }

  private parseStoredParameter(value: number | string): number {
    const normalized = String(value).trim().replace(',', '.');
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)) {
      return NaN;
    }
    return Number(normalized);
  }

  get hasInvalidStoredParameters() {
    return this.storedParameterInputs.some(
      ({ value }) => !Number.isFinite(this.parseStoredParameter(value)),
    );
  }

  @action updateStoredMedianColor(event: Event) {
    this.storedMedianColor = (event.target as HTMLInputElement).value;
    this.renderStoredChartCards();
  }

  @action updateStoredTunnelColor(event: Event) {
    this.storedTunnelColor = (event.target as HTMLInputElement).value;
    this.renderStoredChartCards();
  }

  @action updateStoredRunColor(runIndex: number, event: Event) {
    this.storedRunColors = {
      ...this.storedRunColors,
      [runIndex]: (event.target as HTMLInputElement).value,
    };
    this.renderStoredChartCards();
  }

  @action toggleStoredYAxisRange(event: Event) {
    this.useStoredTightYAxis = (event.target as HTMLInputElement).checked;
    this.renderStoredChartCards();
  }

  @action getStoredRunColor(runIndex: number) {
    return (
      this.storedRunColors[runIndex] ??
      DEFAULT_CHART_COLOR_PALETTE[
        (runIndex + 2) % DEFAULT_CHART_COLOR_PALETTE.length
      ]!
    );
  }

  @action
  async addRunToStoredBatch() {
    const target = this.selectedStoredResult;
    if (!target || this.isBatchRunning || this.hasInvalidStoredParameters) return;
    if ((target.result.batchResults?.length || 1) >= MAX_DEVIATION_COUNT) return;
    const scenario = Object.fromEntries(
      this.storedParameterInputs.map((input) => [
        input.nodeId,
        this.parseStoredParameter(input.value),
      ]),
    );

    let newResult: SimulationResult | undefined;
    try {
      [newResult] = await this.runSimulationBatch(1, scenario);
    } catch (e: any) {
      // A newer simulation superseded this one (e.g. a scenario change
      // elsewhere restarted the live preview mid-run) - nothing to do here,
      // whichever run is now in charge already owns the UI state.
      if (e?.name === 'SimulationBatchCanceled') return;
      throw e;
    }
    // Bail if the user switched to a different stored result while the run
    // above was in flight - applying it to whatever is now selected would
    // silently attach it to the wrong result.
    if (!newResult || this.selectedStoredResult !== target) return;

    // The merge (appending this run to the stored batch) happens server-side,
    // under a row lock, so two concurrent "add run" calls for the same
    // result can't silently overwrite each other the way a client-side
    // read-modify-write would.
    const updated = await (
      this.feathers.app.service('models') as any
    ).addSimulationResultRun({
      id: target.id,
      run: newResult,
      scenario,
    });
    if (this.selectedStoredResult !== target) return;

    target.result = updated.result;
    await this.prepareStoredChartCards();
    if (this.selectedStoredResult !== target) return;

    this.selectedStoredBatchRuns = [this.storedBatchDatasets.length - 1];
    this.activeStoredRun = this.storedBatchDatasets.length - 1;
    this.renderStoredChartCards();
  }

  private async renderStoredResult() {
    if (!this.storedChartContainer || !this.selectedStoredResult) return;

    const tabName = this.activeTab;
    const chartContainer = this.storedChartContainer;
    if (tabName === TabName.TimeSeries) return;

    this.isGeneratingStoredChart = true;
    try {
      const rawDataset = await this.tabNameToDatasetFunction[tabName](
        this.selectedStoredResult.result,
      );
      if (
        this.activeTab !== tabName ||
        this.storedChartContainer !== chartContainer
      ) {
        return;
      }
      const dataset = rawDataset;
      this.storedCurrentDataset = dataset;

      this.storedChart?.dispose();
      this.storedChart = echarts.init(chartContainer, null, {
        height: 400,
        width: 'auto',
      });
      const index = dataset.times.length - 1;
      const optionsByIndex = this.getScatterPlotChartOptionByIndex(
        index,
        dataset,
      );
      this.storedChart.setOption(optionsByIndex);
    } finally {
      this.isGeneratingStoredChart = false;
    }
  }

  @action
  async openChartZoom(context: 'live' | 'stored') {
    if (context === 'live') this.zoomedStoredCardId = null;
    const dataset =
      context === 'live' ? this.currentDataset : this.storedCurrentDataset;
    if (!dataset) return;

    this.zoomedChartContext = context;
    this.isChartEditorSidebarOpen = false;
    this.chartEditorHasChanges = false;
    this.chartEditorResults = [];
    this.chartEditorRuns = new Map();
    this.chartEditorColors = new Map();
    this.chartEditorLoadToken++;
    this.isChartEditorPrepared = false;
    this.isChartZoomOpen = true;
    if (this.zoomedChartContainer) await this.renderZoomedChart();
  }

  @action
  async handleChartZoomKeydown(
    context: 'live' | 'stored',
    event: KeyboardEvent,
  ) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    await this.openChartZoom(context);
  }

  @action closeChartZoom() {
    this.zoomedStoredCardId = null;
    this.isChartZoomOpen = false;
    this.zoomedChartContext = null;
    this.isChartEditorSidebarOpen = false;
    this.chartEditorResults = [];
    this.chartEditorRuns = new Map();
    this.chartEditorColors = new Map();
    this.chartEditorHasChanges = false;
    this.isChartEditorLoading = false;
    this.chartEditorLoadToken++;
    this.isChartEditorPrepared = false;
    this.zoomedChartResizeObserver?.disconnect();
    this.zoomedChartResizeObserver = undefined;
    this.zoomedChart?.dispose();
    this.zoomedChart = undefined;
    this.zoomedChartContainer = undefined;
  }

  @action
  async didInsertZoomedChartContainer(element: HTMLElement) {
    this.zoomedChartContainer = element;
    this.zoomedChartResizeObserver?.disconnect();
    this.zoomedChartResizeObserver = new ResizeObserver(
      this.handleZoomedChartResize,
    );
    this.zoomedChartResizeObserver.observe(element);
    await this.renderZoomedChart();
  }

  private handleZoomedChartResize = () => {
    this.zoomedChart?.resize();
  };

  private async renderZoomedChart() {
    if (!this.zoomedChartContainer || !this.zoomedChartContext) return;

    if (this.chartEditorHasChanges) {
      // Reuse the instance across checkbox toggles instead of re-creating it
      // each time, which flickered; notMerge drops deselected series.
      this.zoomedChart ??= echarts.init(this.zoomedChartContainer, null, {
        devicePixelRatio: (window.devicePixelRatio || 1) * 2,
      });
      this.zoomedChart.setOption(
        this.withTightYAxisRange(this.getChartEditorOption()),
        { notMerge: true },
      );
      return;
    }

    if (this.zoomedChartContext === 'stored' && this.zoomedStoredCardId) {
      const card = this.storedChartCards.find(
        (candidate) => candidate.id === this.zoomedStoredCardId,
      );
      if (!card) return;
      this.zoomedChart?.dispose();
      this.zoomedChart = echarts.init(this.zoomedChartContainer, null, {
        devicePixelRatio: 2,
      });
      this.zoomedChart.setOption(this.getStoredCardOption(card));
      return;
    }

    const dataset =
      this.zoomedChartContext === 'live'
        ? this.currentDataset
        : this.storedCurrentDataset;
    if (!dataset) return;

    this.zoomedChart?.dispose();
    this.zoomedChart = echarts.init(this.zoomedChartContainer, null, {
      // Render at a higher backing resolution than the small inline charts so
      // the zoomed-in view (and anything exported as PNG from it) stays sharp.
      devicePixelRatio: (window.devicePixelRatio || 1) * 2,
    });
    const index = dataset.times.length - 1;
    const optionsByIndex = this.tabNameToChartOptionByIndex[this.activeTab](
      index,
      dataset,
      this.zoomedChartContext === 'stored'
        ? this.storedSeriesColorOverrides
        : undefined,
    );
    this.zoomedChart.setOption(
      this.activeTab === TabName.TimeSeries
        ? this.withTightYAxisRange(optionsByIndex)
        : optionsByIndex,
    );
  }

  // The stored result charts read useStoredTightYAxis in their own options;
  // the zoomed time-series chart builds its options elsewhere, so the same
  // setting is applied on top here.
  private withTightYAxisRange<T extends { yAxis?: object }>(option: T): T {
    return {
      ...option,
      yAxis: { ...option.yAxis, scale: this.useStoredTightYAxis },
    };
  }

  @action async toggleZoomedYAxisRange(event: Event) {
    this.toggleStoredYAxisRange(event);
    await this.renderZoomedChart();
  }

  // Lists every stored result of this version, but loads only the data the
  // zoomed chart already shows (its own result or the live run). The other
  // results come as names and run counts; their data is loaded when they are
  // expanded (loadChartEditorResult), as a version can hold many results of
  // several MB each.
  private async prepareChartEditorResults(loadToken: number) {
    const isStale = () =>
      loadToken !== this.chartEditorLoadToken ||
      this.isDestroying ||
      this.isDestroyed;
    this.isChartEditorLoading = true;
    try {
      const summaries = await this.findChartEditorResultSummaries(isStale);
      if (isStale()) return;

      const origin =
        this.zoomedChartContext === 'stored' ? this.selectedStoredResult : null;
      const runsByResult = new Map<string, TimeSeriesDataset[]>();
      if (origin) {
        // The open result's runs are already prepared for its charts.
        const originRuns = this.storedBatchDatasets.length
          ? this.storedBatchDatasets
          : await this.getRunDatasets(origin.result);
        if (isStale()) return;
        runsByResult.set(origin.id, originRuns);
      }

      // Preselect exactly what the zoomed chart shows. The "all outputs" card
      // holds every series but only draws the outputs switched on in the
      // extended options, so its selection comes from that list instead.
      const isOverviewCard = this.zoomedStoredCardId === 'all';
      const sourceSeries = this.zoomedStoredCardId
        ? (this.storedChartCards.find(
            (card) => card.id === this.zoomedStoredCardId,
          )?.dataset.series ?? [])
        : this.zoomedChartContext === 'stored'
          ? ((this.storedCurrentDataset as TimeSeriesDataset | null)?.series ??
            [])
          : ((this.currentDataset as TimeSeriesDataset | null)?.series ?? []);
      const selectedNames = new Set(
        isOverviewCard
          ? this.enabledOverviewOutputs
          : sourceSeries.map((series) => series.name),
      );

      // Likewise keep the overview's custom output colors, so the chart
      // doesn't change colors the moment the selection is edited.
      const originRuns = origin ? runsByResult.get(origin.id) : undefined;
      if (isOverviewCard && origin && originRuns) {
        const colors = new Map(
          this.overviewOutputOptions.map((output) => [
            output.name,
            output.color,
          ]),
        );
        runsByResult.set(
          origin.id,
          originRuns.map((run) => ({
            ...run,
            series: run.series.map((series) => ({
              ...series,
              color: colors.get(series.name) ?? series.color,
            })),
          })),
        );
      }

      const entries: ChartEditorResultSummary[] = [...summaries];
      if (origin && !entries.some((entry) => entry.id === origin.id)) {
        entries.unshift({
          id: origin.id,
          name: origin.name,
          runCount: runsByResult.get(origin.id)!.length,
        });
      }
      // A live chart isn't a stored result, so list it as its own entry -
      // otherwise the first checkbox click would replace the chart the user
      // opened with a single unrelated variable.
      const liveDataset = this.currentDataset as TimeSeriesDataset | null;
      if (this.zoomedChartContext === 'live' && liveDataset) {
        const liveRuns =
          this.batchTimeSeriesDatasets.length > 1
            ? this.batchTimeSeriesDatasets
            : [liveDataset];
        runsByResult.set(LIVE_CHART_EDITOR_RESULT_ID, liveRuns);
        entries.unshift({
          id: LIVE_CHART_EDITOR_RESULT_ID,
          name: this.intl.t('components.simulate_modal.current_simulation'),
          runCount: liveRuns.length,
        });
      }
      const originId = this.chartEditorOriginId;

      this.chartEditorRuns = runsByResult;
      this.chartEditorResults = entries.map((entry) => {
        const runs = runsByResult.get(entry.id);
        const sources = this.getChartEditorSources(
          runs?.length ?? entry.runCount,
        );
        return {
          id: entry.id,
          name: entry.name,
          sources,
          selectedSourceIds:
            entry.id === originId
              ? this.getOriginChartEditorSourceIds(
                  runs?.length ?? entry.runCount,
                )
              : [sources[0]!.id],
          variables: (runs?.[0]?.series ?? []).map((series) => ({
            name: series.name,
            selected: entry.id === originId && selectedNames.has(series.name),
          })),
          isLoaded: !!runs,
        };
      });
      // The preselected variables count as added first, keeping the colors
      // the zoomed chart already shows them in.
      const originSeries = originId
        ? (runsByResult.get(originId)?.[0]?.series ?? [])
        : [];
      for (const series of originSeries) {
        if (selectedNames.has(series.name)) {
          this.assignChartEditorColor(originId!, series.name, series.color);
        }
      }
    } catch (error) {
      console.error('Failed to load results for the chart editor', error);
    } finally {
      if (loadToken === this.chartEditorLoadToken) {
        this.isChartEditorLoading = false;
      }
    }
  }

  // Names and run counts of every stored result of this version, without
  // their data, in pages the backend accepts.
  private async findChartEditorResultSummaries(isStale: () => boolean) {
    const summaries: ChartEditorResultSummary[] = [];
    for (;;) {
      const page = await (
        this.feathers.app.service('models') as any
      ).findSimulationResults({
        modelsVersionsId: this.args.model.id!,
        summary: true,
        $skip: summaries.length,
        $limit: CHART_EDITOR_RESULTS_PAGE_SIZE,
      });
      if (isStale()) return summaries;
      summaries.push(...page.data);
      if (!page.data.length || summaries.length >= page.total) {
        return summaries;
      }
    }
  }

  // Loads the data of a result once it is expanded in the editor.
  @action async loadChartEditorResult(resultId: string) {
    const entry = this.chartEditorResults.find(
      (candidate) => candidate.id === resultId,
    );
    if (!entry || entry.isLoaded || entry.isLoading) return;
    const loadToken = this.chartEditorLoadToken;
    const isStale = () =>
      loadToken !== this.chartEditorLoadToken ||
      this.isDestroying ||
      this.isDestroyed;
    this.updateChartEditorResult(resultId, {
      isLoading: true,
      loadFailed: false,
    });
    try {
      // The current page of the results list already holds the data.
      const result =
        this.storedResults.find((candidate) => candidate.id === resultId) ??
        (
          await (
            this.feathers.app.service('models') as any
          ).findSimulationResults({
            modelsVersionsId: this.args.model.id!,
            id: resultId,
            $limit: 1,
          })
        ).data[0];
      if (isStale()) return;
      if (!result) throw new Error(`Simulation result ${resultId} not found`);
      const runs = await this.getRunDatasets(result.result);
      if (isStale()) return;

      this.chartEditorRuns.set(resultId, runs);
      const sources = this.getChartEditorSources(runs.length);
      const sourceIds = new Set(sources.map((source) => source.id));
      const current = this.chartEditorResults.find(
        (candidate) => candidate.id === resultId,
      );
      const selectedSourceIds = (current?.selectedSourceIds ?? []).filter(
        (id) => sourceIds.has(id),
      );
      this.updateChartEditorResult(resultId, {
        sources,
        selectedSourceIds: selectedSourceIds.length
          ? selectedSourceIds
          : [sources[0]!.id],
        variables: (runs[0]?.series ?? []).map((series) => ({
          name: series.name,
          selected: false,
        })),
        isLoaded: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load a result for the chart editor', error);
      if (!isStale()) {
        this.updateChartEditorResult(resultId, {
          isLoading: false,
          loadFailed: true,
        });
      }
    }
  }

  private updateChartEditorResult(
    resultId: string,
    changes: Partial<ChartEditorResult>,
  ) {
    this.chartEditorResults = this.chartEditorResults.map((result) =>
      result.id === resultId ? { ...result, ...changes } : result,
    );
  }

  // Every run of a stored result as a time series; a result without a batch
  // is its own single run.
  private getRunDatasets(result: StoredSimulationResult['result']) {
    const runs = result.batchResults?.length ? result.batchResults : [result];
    return Promise.all(runs.map((run) => this.getTimeSeriesDataset(run)));
  }

  // A batch offers its median, the spread band and each single run; a plain
  // result only has its one run, so there's nothing to choose.
  private getChartEditorSources(runCount: number): ChartEditorSource[] {
    if (runCount <= 1) {
      return [
        {
          id: 'run-0',
          label: this.intl.t('components.simulate_modal.simulation_run', {
            number: 1,
          }),
        },
      ];
    }
    return [
      { id: 'median', label: this.intl.t('components.simulate_modal.median') },
      { id: 'tunnel', label: this.intl.t('components.simulate_modal.tunnel') },
      ...Array.from({ length: runCount }, (_, runIndex) => ({
        id: `run-${runIndex}`,
        label: this.intl.t('components.simulate_modal.simulation_run', {
          number: runIndex + 1,
        }),
      })),
    ];
  }

  // The sources the zoomed chart itself currently draws for the result it
  // was opened from.
  private getOriginChartEditorSourceIds(runCount: number): string[] {
    if (runCount <= 1) return ['run-0'];
    if (this.zoomedChartContext === 'live') {
      return [
        'median',
        ...(this.chartMode === ChartMode.Line ? ['tunnel'] : []),
        ...(this.selectedBatchRun >= 0 ? [`run-${this.selectedBatchRun}`] : []),
      ];
    }
    // The overview card draws only the active run of every enabled output.
    if (this.zoomedStoredCardId === 'all') {
      return [`run-${this.activeStoredRun}`];
    }
    if (!this.zoomedStoredCardId) return ['median'];
    return [
      ...(this.showStoredMedian ? ['median'] : []),
      ...(this.showStoredTunnel ? ['tunnel'] : []),
      ...[...this.selectedStoredBatchRuns]
        .sort((a, b) => a - b)
        .map((runIndex) => `run-${runIndex}`),
    ];
  }

  private chartEditorColorKey(resultId: string, variableName: string) {
    return `${resultId}\u0000${variableName}`;
  }

  // A variable keeps the color it got when it was added for as long as it
  // stays selected, so adding or removing others never recolors the lines
  // already on the chart. It gets its own chart color when that is still
  // free (the same variable from two results would otherwise look alike),
  // else the first palette color nobody uses yet.
  private assignChartEditorColor(
    resultId: string,
    variableName: string,
    preferredColor?: string,
  ) {
    const key = this.chartEditorColorKey(resultId, variableName);
    const assigned = this.chartEditorColors.get(key);
    if (assigned) return assigned;
    const used = new Set(this.chartEditorColors.values());
    const color =
      preferredColor && !used.has(preferredColor)
        ? preferredColor
        : (DEFAULT_CHART_COLOR_PALETTE.find(
            (candidate) => !used.has(candidate),
          ) ??
          DEFAULT_CHART_COLOR_PALETTE[
            used.size % DEFAULT_CHART_COLOR_PALETTE.length
          ]!);
    this.chartEditorColors.set(key, color);
    return color;
  }

  // Builds the zoomed chart from the editor selection: for every selected
  // variable one line per chosen median/run and a band for the spread.
  private getChartEditorOption() {
    const contributing = this.chartEditorResults.filter(
      (result) =>
        result.selectedSourceIds.length > 0 &&
        result.variables.some((variable) => variable.selected),
    );
    const bands: object[] = [];
    const lines: object[] = [];
    const legendNames: string[] = [];
    // Results can cover different time ranges; use the longest axis so no
    // selected series gets cut off.
    let times: TimeSeriesDataset['times'] = [];

    for (const result of contributing) {
      const runs = this.chartEditorRuns.get(result.id) ?? [];
      const firstRun = runs[0];
      if (!firstRun) continue;
      if (firstRun.times.length > times.length) times = firstRun.times;
      const hasSourceChoice = result.sources.length > 1;
      const lineSourceCount = result.selectedSourceIds.filter(
        (id) => id !== 'tunnel',
      ).length;

      for (const variable of result.variables) {
        if (!variable.selected) continue;
        const baseSeries = firstRun.series.find(
          (series) => series.name === variable.name,
        );
        if (!baseSeries) continue;
        // Median, runs and spread of one variable share its color.
        const color = this.assignChartEditorColor(
          result.id,
          variable.name,
          baseSeries.color,
        );
        const valuesAt = (timeIndex: number) =>
          this.getBatchSeriesValues(variable.name, timeIndex, runs);

        for (const sourceId of result.selectedSourceIds) {
          const source = result.sources.find(
            (candidate) => candidate.id === sourceId,
          );
          if (!source) continue;
          const name = hasSourceChoice
            ? `${result.name} · ${variable.name} · ${source.label}`
            : `${result.name} · ${variable.name}`;

          if (sourceId === 'tunnel') {
            // A band only reads as such on a line chart.
            if (this.chartMode !== ChartMode.Line) continue;
            const lower = baseSeries.data.map((_, timeIndex) =>
              this.quantile(valuesAt(timeIndex), 0.1),
            );
            const upper = baseSeries.data.map((_, timeIndex) =>
              this.quantile(valuesAt(timeIndex), 0.9),
            );
            const stack = `chart-editor-tunnel-${bands.length}`;
            bands.push(
              {
                name: `${name}-base`,
                type: 'line',
                stack,
                stackStrategy: 'all',
                data: lower,
                symbol: 'none',
                lineStyle: { opacity: 0 },
                areaStyle: { opacity: 0 },
                tooltip: { show: false },
                silent: true,
              },
              {
                name,
                type: 'line',
                stack,
                stackStrategy: 'all',
                data: upper.map(
                  (value, timeIndex) => value - lower[timeIndex]!,
                ),
                symbol: 'none',
                lineStyle: { opacity: 0 },
                areaStyle: { color, opacity: 0.18 },
                itemStyle: { color },
                tooltip: { show: false },
                silent: true,
              },
            );
            legendNames.push(name);
            continue;
          }

          const isMedian = sourceId === 'median';
          const runIndex = isMedian
            ? -1
            : Number(sourceId.slice('run-'.length));
          const data = isMedian
            ? baseSeries.data.map((_, timeIndex) =>
                this.quantile(valuesAt(timeIndex), 0.5),
              )
            : runs[runIndex]?.series.find(
                (series) => series.name === variable.name,
              )?.data;
          if (!data) continue;
          // With several lines for one variable the median stays solid and
          // each run gets its own dash pattern.
          const isDashed = lineSourceCount > 1 && !isMedian;
          lines.push({
            name,
            type: this.chartMode,
            data,
            symbol: 'none',
            lineStyle: {
              color,
              width: isMedian ? 2.5 : 1.5,
              type: isDashed
                ? CHART_EDITOR_RUN_DASHES[
                    runIndex % CHART_EDITOR_RUN_DASHES.length
                  ]
                : 'solid',
            },
            itemStyle: { color },
          });
          legendNames.push(name);
        }
      }
    }

    return {
      legend: { type: 'scroll', data: legendNames, top: 10 },
      xAxis: { data: times },
      yAxis: {},
      tooltip: { trigger: 'axis' },
      animation: false,
      series: [...bands, ...lines],
    };
  }

  get isZoomedChartDownloadDisabled() {
    return !this.zoomedChart;
  }

  @action
  async downloadZoomedChartPng() {
    await this.downloadChartAsPng(
      this.zoomedChart,
      this.isZoomedChartDownloadDisabled,
    );
  }

  // Series names for the currently displayed stored time-series chart, used
  // to list one color picker row per dataset in the colors menu.
  get storedSeriesNames(): string[] {
    if (this.activeTab !== TabName.TimeSeries) return [];
    const dataset = this.storedCurrentDataset as TimeSeriesDataset | null;
    return dataset?.series.map((series) => series.name) ?? [];
  }

  get hasStoredColorOverrides(): boolean {
    return Object.keys(this.storedSeriesColorOverrides).length > 0;
  }

  @action
  getStoredSeriesColor(seriesName: string): string {
    if (this.storedSeriesColorOverrides[seriesName]) {
      return this.storedSeriesColorOverrides[seriesName];
    }
    const dataset = this.storedCurrentDataset as TimeSeriesDataset | null;
    // Every series gets a resolved color from withResolvedSeriesColors() when
    // the dataset is built, so this default only matters before that's run.
    return (
      dataset?.series.find((series) => series.name === seriesName)?.color ??
      DEFAULT_CHART_COLOR_PALETTE[0]!
    );
  }

  // Fills in the exact color each series will actually render with - either
  // its own persisted chartColor, or the same default palette color echarts
  // would auto-assign it - so the color picker's initial swatch always
  // matches what's currently in the chart instead of a guessed fallback.
  private withResolvedSeriesColors(
    dataset: TimeSeriesDataset,
  ): TimeSeriesDataset {
    return {
      ...dataset,
      series: dataset.series.map((series, index) => ({
        ...series,
        color:
          series.color ??
          DEFAULT_CHART_COLOR_PALETTE[
            index % DEFAULT_CHART_COLOR_PALETTE.length
          ],
      })),
    };
  }

  @action
  setStoredSeriesColor(seriesName: string, event: Event) {
    const color = (event.target as HTMLInputElement).value;
    this.storedSeriesColorOverrides = {
      ...this.storedSeriesColorOverrides,
      [seriesName]: color,
    };
    this.refreshStoredChartColors();
  }

  @action
  resetStoredSeriesColors() {
    this.storedSeriesColorOverrides = {};
    this.refreshStoredChartColors();
  }

  // Re-applies color overrides to the already-built dataset without
  // rebuilding it (no node lookups, no loading spinner) - just a cheap
  // setOption() on whichever chart instances are currently showing it.
  private refreshStoredChartColors() {
    const dataset = this.storedCurrentDataset;
    if (!dataset) return;
    const index = dataset.times.length - 1;

    if (this.storedChart) {
      this.storedChart.setOption(
        this.tabNameToChartOptionByIndex[this.activeTab](
          index,
          dataset,
          this.storedSeriesColorOverrides,
        ),
      );
    }
    if (this.zoomedChart && this.zoomedChartContext === 'stored') {
      this.zoomedChart.setOption(
        this.tabNameToChartOptionByIndex[this.activeTab](
          index,
          dataset,
          this.storedSeriesColorOverrides,
        ),
      );
    }
  }

  @action
  async renameStoredResult(result: StoredSimulationResult, event: Event) {
    const name = (event.target as HTMLInputElement).value.trim();
    if (!name) return;
    result.name = name;
    await (this.feathers.app.service('models') as any).renameSimulationResult({
      id: result.id,
      name,
    });
    this.storedResults = [...this.storedResults];
  }

  @action
  async deleteStoredResult(result: StoredSimulationResult, event: Event) {
    // Stop the click from also bubbling up to the item's own "select" handler.
    event.stopPropagation();

    const confirmed = confirm(
      this.intl.t('components.simulate_modal.confirm_delete_result'),
    );
    if (!confirmed) return;

    await (this.feathers.app.service('models') as any).deleteSimulationResult({
      id: result.id,
    });

    if (this.selectedStoredResult?.id === result.id) {
      this.selectedStoredResult = null;
      this.showStoredScatterPlotTab = false;
      this.disposeStoredCharts();
      this.storedChart = undefined;
      this.storedCurrentDataset = null;
      this.storedChartCards = [];
      this.storedBatchDatasets = [];
    }

    if (this.storedResults.length === 1 && this.resultsPage > 1) {
      this.resultsPage -= 1;
    }
    await this.loadStoredResults(!this.selectedStoredResult);
  }

  @action
  async changeResultsPage(page: number) {
    if (page < 1 || page > this.resultsPages) return;
    this.resultsPage = page;
    await this.loadStoredResults();
  }

  @action
  async getTimeSeriesDataset(simulateResult: SimulationResult) {
    const data = simulateResult;

    const series: ChartSeries[] = [];

    for (const [nodeId, value] of Object.entries(data.nodes)) {
      const node = await this.store.findRecord<Node>('node', nodeId);
      const chartColor = (node.data as { chartColor?: string }).chartColor;

      if (
        node.type !== NodeType.Flow &&
        node.type !== NodeType.OgcApiFeatures &&
        node.type !== NodeType.Population
      ) {
        if (this.isNumberArray(value.series)) {
          series.push({
            type: 'line',
            name: node.name,
            data: value.series,
            color: chartColor,
          });
        } else if (this.isNumberArrayArray(value.series)) {
          const subSeries = value.series.reduce((acc, current, timeIndex) => {
            current.forEach((innerValue, subSeriesNumber) => {
              if (!acc[subSeriesNumber]) {
                acc[subSeriesNumber] = {
                  type: 'line',
                  name: `${node.name} - ${subSeriesNumber}`,
                  data: [],
                  color: chartColor,
                };
              }
              acc[subSeriesNumber].data[timeIndex] = innerValue;
            });
            return acc;
          }, [] as ChartSeries[]);

          series.push(...subSeries);
        } else if (this.isObjectNumberArray(value.series)) {
          const subSeries = value.series.reduce(
            (acc, current, timeIndex) => {
              for (const [key, innerValue] of Object.entries(current)) {
                if (!acc.has(key)) {
                  acc.set(key, {
                    type: 'line',
                    name: `${node.name} - ${key}`,
                    data: [],
                    color: chartColor,
                  });
                }
                acc.get(key)!.data[timeIndex] = innerValue;
              }
              return acc;
            },
            new Map() as Map<string, ChartSeries>,
          );

          series.push(...Array.from(subSeries.values()));
        }
      }
    }

    return { series, times: simulateResult.times };
  }

  private quantile(values: number[], percentile: number) {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const position = (sorted.length - 1) * percentile;
    const lowerIndex = Math.floor(position);
    const fraction = position - lowerIndex;
    const lower = sorted[lowerIndex]!;
    const upper = sorted[lowerIndex + 1] ?? lower;
    return lower + (upper - lower) * fraction;
  }

  private getBatchSeriesValues(
    seriesName: string,
    timeIndex: number,
    datasets = this.batchTimeSeriesDatasets,
  ) {
    return datasets
      .map(
        (dataset) =>
          dataset.series.find((series) => series.name === seriesName)?.data[
            timeIndex
          ],
      )
      .filter((value): value is number => typeof value === 'number');
  }

  private createBatchMedianDataset(
    datasets = this.batchTimeSeriesDatasets,
  ): TimeSeriesDataset {
    const firstDataset = datasets[0]!;
    return {
      times: firstDataset.times,
      series: firstDataset.series.map((series) => ({
        ...series,
        data: series.data.map((_, timeIndex) =>
          this.quantile(
            this.getBatchSeriesValues(series.name, timeIndex, datasets),
            0.5,
          ),
        ),
      })),
    };
  }

  @action
  async selectBatchRun(event: Event) {
    this.selectedBatchRun = Number.parseInt(
      (event.target as HTMLSelectElement).value,
      10,
    );
    this.simulationResult =
      this.selectedBatchRun >= 0
        ? this.batchResults[this.selectedBatchRun]
        : this.batchResults[0];
    this.currentDataset = this.createBatchMedianDataset();
    await this.updateDatasetFromAnimationCursor();
    if (this.isChartZoomOpen && this.zoomedChartContext === 'live') {
      await this.renderZoomedChart();
    }
  }

  @action
  async getScatterPlotDataset(simulateResult: SimulationResult) {
    const series = [];

    for (const [nodeId, value] of Object.entries(simulateResult.nodes)) {
      const populationNode = await this.store.findRecord<Node>('node', nodeId);

      console.log(populationNode.name);

      const [edge] = (await populationNode.targetEdgesWithGhosts).filter(
        (edge) => edge.type === EdgeType.AgentPopulation,
      );

      const allStates = await this.store.query<Node>('node', {
        parentId: edge?.source?.id ?? null,
        type: NodeType.State,
      });

      if (populationNode?.type === NodeType.Population) {
        let timeIndex = 0;
        for (const current of value.series) {
          const datasets = [];
          if (Array.isArray(current)) {
            const populationData: {
              id: string;
              value: [number, number] | null;
            }[] = [];
            const stateLocationsMap = new Map<Node, typeof populationData>(
              allStates.map((s) => [s, []]),
            );

            for (const stateLocation of current) {
              // Type guard to ensure we're working with an object that has the expected properties
              if (
                typeof stateLocation === 'object' &&
                stateLocation !== null &&
                'id' in stateLocation &&
                'location' in stateLocation &&
                'state' in stateLocation
              ) {
                const location = {
                  id: stateLocation.id,
                  value: stateLocation.location,
                };

                populationData.push(location);
                for (const states of allStates) {
                  // Convert state ID to number for comparison since stateLocation.state contains numbers
                  const stateIdAsNumber = parseInt(states.id!, 10);
                  if (stateLocation.state.includes(stateIdAsNumber)) {
                    stateLocationsMap.get(states)!.push(location);
                  } else {
                    stateLocationsMap
                      .get(states)!
                      .push({ id: stateLocation.id, value: null });
                  }
                }
              }
            }

            datasets.push({
              type: 'scatter',
              name: populationNode.name,
              label: populationNode.name,
              data: populationData,
            });
            for (const [stateNodes, locations] of stateLocationsMap.entries()) {
              datasets.push({
                type: 'scatter',
                name: stateNodes.name,
                label: stateNodes.name,
                data: locations,
              });
            }
          }

          if (series[timeIndex]) {
            series[timeIndex]!.push(...datasets);
          } else {
            series[timeIndex] = datasets;
          }
          timeIndex++;
        }
      }
    }

    return { times: simulateResult.times, series };
  }

  @action
  private async updateDatasetFromAnimationCursor() {
    if (!this.currentDataset) {
      return;
    }
    const index = this.getDatasetIndex(this.currentDataset!.times);

    const optionsByIndex =
      this.tabNameToChartOptionByIndex[this.activeTab](index);

    this.chart!.setOption(optionsByIndex, { replaceMerge: ['series'] });
  }

  @action
  private getTimeseriesChartOptionByIndex(
    index: number,
    sourceDataset: TimeSeriesDataset | ScatterPlotDataset | null = this
      .currentDataset,
    colorOverrides?: Record<string, string>,
  ) {
    const timeSeriesDataset = sourceDataset as TimeSeriesDataset;
    const shouldStackBars =
      this.chartMode === ChartMode.Bar && timeSeriesDataset.series.length > 1;

    const slicedSeries = timeSeriesDataset.series.map((d) => ({
      ...d,
      data: d.data.slice(0, index + 1),
    }));

    // In bar mode, series represent ascending value bands (e.g. nested
    // stocks) rather than parts to sum, so instead of stacking the raw
    // values (which echarts would add up as a+b+c), we stack the deltas
    // between consecutive series - that renders each band from the
    // previous series' value up to its own, while the tooltip still shows
    // the original raw value via `rawValue`.
    const dataset = slicedSeries.map((d, seriesIndex) => {
      const color = colorOverrides?.[d.name] ?? d.color;
      const previousSeries = slicedSeries[seriesIndex - 1];
      const data = shouldStackBars
        ? d.data.map((value, i) => ({
            value: value - (previousSeries?.data[i] ?? 0),
            rawValue: value,
          }))
        : d.data;

      return {
        ...d,
        type: this.chartMode,
        stack: shouldStackBars ? 'simulation-values' : undefined,
        ...(color
          ? {
              itemStyle: { color },
              lineStyle: { color },
            }
          : {}),
        data,
      };
    });

    const showsBatchTunnel =
      this.chartMode === ChartMode.Line &&
      sourceDataset === this.currentDataset &&
      this.batchTimeSeriesDatasets.length > 1;
    const tunnelSeries = showsBatchTunnel
      ? slicedSeries.flatMap((series, seriesIndex) => {
          const lower = series.data.map((_, timeIndex) =>
            this.quantile(
              this.getBatchSeriesValues(series.name, timeIndex),
              0.1,
            ),
          );
          const upper = series.data.map((_, timeIndex) =>
            this.quantile(
              this.getBatchSeriesValues(series.name, timeIndex),
              0.9,
            ),
          );
          const color =
            colorOverrides?.[series.name] ??
            series.color ??
            DEFAULT_CHART_COLOR_PALETTE[
              seriesIndex % DEFAULT_CHART_COLOR_PALETTE.length
            ];
          const stack = `simulation-tunnel-${seriesIndex}`;
          const selectedSeries =
            this.selectedBatchRun >= 0
              ? this.batchTimeSeriesDatasets[
                  this.selectedBatchRun
                ]?.series.find((candidate) => candidate.name === series.name)
              : undefined;

          return [
            {
              name: `${series.name}-tunnel-base`,
              type: 'line',
              stack,
              stackStrategy: 'all',
              data: lower,
              symbol: 'none',
              lineStyle: { opacity: 0 },
              areaStyle: { opacity: 0 },
              tooltip: { show: false },
              silent: true,
            },
            {
              name: `${series.name}-tunnel-range`,
              type: 'line',
              stack,
              stackStrategy: 'all',
              data: upper.map((value, timeIndex) => value - lower[timeIndex]!),
              symbol: 'none',
              lineStyle: { opacity: 0 },
              areaStyle: { color, opacity: 0.18 },
              tooltip: { show: false },
              silent: true,
            },
            ...(selectedSeries
              ? [
                  {
                    name: `${series.name} – Simulation ${this.selectedBatchRun + 1}`,
                    type: 'line',
                    data: selectedSeries.data.slice(0, index + 1),
                    symbol: 'none',
                    lineStyle: { color, width: 3 },
                    itemStyle: { color },
                  },
                ]
              : []),
          ];
        })
      : [];

    return {
      legend: {
        type: 'scroll',
        data: dataset.map((d) => d.name),
        top: 10,
      },
      xAxis: {
        data: timeSeriesDataset.times,
      },
      yAxis: {},
      tooltip: {
        trigger: 'axis',
        ...(shouldStackBars
          ? {
              formatter: (params: any) => {
                const items = Array.isArray(params) ? params : [params];
                if (!items.length) return '';
                const rows = items
                  .map((item) => {
                    const rawValue = item.data?.rawValue ?? item.value;
                    return `${item.marker}${item.seriesName}: ${rawValue}`;
                  })
                  .join('<br/>');
                return `${items[0].axisValueLabel ?? items[0].name}<br/>${rows}`;
              },
            }
          : {}),
      },
      animation: false,
      series: [...tunnelSeries, ...dataset],
    };
  }

  @action
  private getScatterPlotChartOptionByIndex(
    index: number,
    sourceDataset: TimeSeriesDataset | ScatterPlotDataset | null = this
      .currentDataset,
  ) {
    const currentDataset = (sourceDataset as ScatterPlotDataset).series[index]!;
    return {
      legend: {
        type: 'scroll',
        data: currentDataset.map((d) => d.name),
        top: 10,
      },
      xAxis: {},
      yAxis: {},
      tooltip: {
        trigger: 'axis',
      },
      animation: false,
      series: currentDataset,
    };
  }

  private isNumberArray(value: any): value is number[] {
    return Array.isArray(value) && typeof value[0] === 'number';
  }

  private isNumberArrayArray(value: any): value is number[][] {
    return Array.isArray(value[0]) && typeof value[0]?.[0] === 'number';
  }

  private isObjectNumberArray(value: any): value is Record<string, number>[] {
    const firstItem = value[0];
    if (typeof firstItem !== 'object') {
      return false;
    }

    const objectKeys = Object.keys(firstItem);
    return (
      objectKeys.length > 0 &&
      typeof firstItem === 'object' &&
      typeof firstItem[objectKeys[0]!] === 'number'
    );
  }

  @action playPause() {
    if (this.isPlaying) {
      this.isPlaying = false;
    } else {
      if (this.isAnimationFinished) {
        this.animationCursor = 0.01;
      }
      this.startAnimation();
    }
  }

  @action setSpeed(value: number) {
    this.speed = value;
  }

  private getDatasetIndex(times: number[]) {
    return Math.floor(((times.length - 1) / 100) * this.animationCursor);
  }

  willDestroy(): void {
    super.willDestroy();
    clearTimeout(this.initialResultsProgressTimer);
    this.cancelRunningSimulationBatch();
    this.eventBus.off(
      'scenario-value-changed',
      this.restartSimulationIfAutomatic,
    );

    this.storeEventEmitter.off(
      'node',
      'created',
      this.restartSimulationIfAutomatic,
    );
    this.storeEventEmitter.off(
      'node',
      'updated',
      this.restartSimulationIfAutomatic,
    );
    this.storeEventEmitter.off(
      'node',
      'deleted',
      this.restartSimulationIfAutomatic,
    );

    this.storeEventEmitter.off(
      'edge',
      'created',
      this.restartSimulationIfAutomatic,
    );
    this.storeEventEmitter.off(
      'edge',
      'updated',
      this.restartSimulationIfAutomatic,
    );
    this.storeEventEmitter.off(
      'edge',
      'deleted',
      this.restartSimulationIfAutomatic,
    );

    this.zoomedChartResizeObserver?.disconnect();
  }

  @action
  toggleDropdown() {
    this.floatingToolbarDropdownManager.togglePin('simulateModal');
  }

  // Opening the panel already runs a simulation (onOpen). A pinned panel stays
  // open, so a click on "Simulate" there starts the next run instead of
  // closing it. An open panel that is not pinned closes as before.
  @action simulateFromTrigger(dd: { isOpen: boolean; disabled: boolean }) {
    if (
      dd.isOpen &&
      !dd.disabled &&
      this.floatingToolbarDropdownManager.isSimulateDropdownPinned
    ) {
      this.restartSimulation();
    }
  }

  @action
  async downloadSimulationResults() {
    await this.downloadResultAsJson(
      this.resultPayload,
      this.simulatedScenario
        ? new Map(Object.entries(this.simulatedScenario.values))
        : this.inMemoryScenario,
    );
  }

  @action
  async downloadStoredResultAsJson() {
    if (!this.selectedStoredResult) return;
    await this.downloadResultAsJson(
      this.selectedStoredResult.result,
      new Map(Object.entries(this.selectedStoredResult.scenario)),
    );
  }

  private async downloadResultAsJson(
    simulationResult:
      | (SimulationResult & {
          batchResults?: SimulationResult[];
          batchScenarios?: Record<string, number>[];
        })
      | null
      | undefined,
    scenario: Map<string, number>,
  ) {
    if (!simulationResult) {
      return;
    }

    // Get the model name from the related model
    const model = await this.args.model.model;
    const modelName = model?.internalName || 'model';

    const resultWithNodeNames = async (result: SimulationResult) => {
      const transformed = {
        times: result.times,
        nodes: {} as Record<string, unknown>,
      };
      for (const [nodeId, nodeData] of Object.entries(result.nodes)) {
        try {
          const node = await this.store.findRecord<Node>('node', nodeId);
          transformed.nodes[node.name || nodeId] = nodeData;
        } catch {
          transformed.nodes[nodeId] = nodeData;
        }
      }
      return transformed;
    };
    const resultsWithNodeNames = await resultWithNodeNames(simulationResult);
    const batchResultsWithNodeNames = simulationResult.batchResults
      ? await Promise.all(
          simulationResult.batchResults.map((result) =>
            resultWithNodeNames(result),
          ),
        )
      : undefined;

    // Transform scenario to use node names instead of UUIDs
    const scenarioWithNodeNames: Record<string, number> = {};
    for (const [nodeId, value] of scenario.entries()) {
      try {
        const node = await this.store.findRecord<Node>('node', nodeId);
        const nodeName = node.name || nodeId; // fallback to UUID if name is empty
        scenarioWithNodeNames[nodeName] = value;
      } catch (error) {
        // If node can't be found, keep the original UUID
        scenarioWithNodeNames[nodeId] = value;
      }
    }

    // Prepare the data for download
    const downloadData = {
      metadata: {
        modelId: this.args.model.id,
        modelName: modelName,
        version: `${this.args.model.majorVersion}.${this.args.model.minorVersion}.${this.args.model.draftVersion}`,
        timeStart: this.args.model.timeStart,
        timeLength: this.args.model.timeLength,
        timeEnd: this.simulationEndTime,
        downloadTimestamp: new Date().toISOString(),
      },
      scenario: scenarioWithNodeNames,
      results: resultsWithNodeNames,
      ...(batchResultsWithNodeNames
        ? { batchResults: batchResultsWithNodeNames }
        : {}),
      ...(simulationResult.batchScenarios
        ? { batchScenarios: simulationResult.batchScenarios }
        : {}),
    };

    // Create and download the file
    downloadUtf8Json(
      downloadData,
      `simulation-results-${modelName}-${new Date().toISOString().split('T')[0]}.json`,
    );
  }

  get isChartDownloadDisabled() {
    // The chart is cleared and reassigned across a restart while
    // simulationTask is still running, so gate on both to avoid downloading a
    // blank chart mid-restart.
    return !this.chart || this.simulationTask.isRunning;
  }

  get isStoredChartDownloadDisabled() {
    return !this.storedChart;
  }

  @action
  async downloadChartPng() {
    await this.downloadChartAsPng(this.chart, this.isChartDownloadDisabled);
  }

  @action
  async downloadStoredChartPng() {
    await this.downloadChartAsPng(
      this.storedChart,
      this.isStoredChartDownloadDisabled,
    );
  }

  @action
  async downloadStoredChartCardPng(cardId: string, title: string) {
    const chart = this.storedCharts.get(cardId);
    await this.downloadChartAsPng(chart, !chart, title);
  }

  // An exported image has to explain itself, but the on-screen charts either
  // have no legend or a paginated one. So the export renders a copy of the
  // chart off-screen with every legend entry laid out in full below the plot,
  // growing the image as tall as that legend needs.
  private getChartPngWithLegend(chart: echarts.ECharts) {
    const option = chart.getOption() as {
      legend?: { data?: unknown[]; selected?: Record<string, boolean> }[];
      grid?: { bottom?: number | string }[];
      series?: { name?: string; silent?: boolean }[];
    };
    const existingLegend = option.legend?.[0];
    // A curated legend list (e.g. the chart editor's) already leaves out the
    // invisible helper series that draw spread bands; otherwise those helpers
    // are the silent series, so list every other named series.
    const names = (
      existingLegend?.data?.length
        ? existingLegend.data.map((item) =>
            typeof item === 'string' ? item : (item as { name: string }).name,
          )
        : (option.series ?? [])
            .filter((series) => !series.silent)
            .map((series) => series.name)
    ).filter((name): name is string => Boolean(name));
    const uniqueNames = [...new Set(names)];

    const exportPng = (target: echarts.ECharts) =>
      target.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
    if (!uniqueNames.length) return exportPng(chart);

    const width = chart.getWidth();
    const fontSize = 12;
    const sidePadding = 16;
    const rowHeight = 22;
    const itemGap = 16;
    const iconWidth = 25 + 5;
    // Lay the entries out the way echarts' plain legend wraps them, to know
    // how many rows - and so how much extra image height - they need.
    const context = document.createElement('canvas').getContext('2d');
    if (context) context.font = `${fontSize}px sans-serif`;
    const availableWidth = width - sidePadding * 2;
    let rows = 1;
    let rowWidth = 0;
    for (const name of uniqueNames) {
      const itemWidth =
        iconWidth +
        (context?.measureText(name).width ?? name.length * 7) +
        itemGap;
      if (rowWidth > 0 && rowWidth + itemWidth > availableWidth) {
        rows++;
        rowWidth = 0;
      }
      rowWidth += itemWidth;
    }
    const legendHeight = rows * rowHeight + sidePadding;

    const originalBottom = option.grid?.[0]?.bottom;
    const plotBottom = typeof originalBottom === 'number' ? originalBottom : 60;
    const container = document.createElement('div');
    const exportChart = echarts.init(container, null, {
      width,
      height: chart.getHeight() + legendHeight,
    });
    try {
      exportChart.setOption({
        ...option,
        animation: false,
        grid: (option.grid?.length ? option.grid : [{}]).map((grid, index) =>
          index === 0 ? { ...grid, bottom: plotBottom + legendHeight } : grid,
        ),
        legend: [
          {
            type: 'plain',
            show: true,
            data: uniqueNames,
            selected: existingLegend?.selected,
            orient: 'horizontal',
            left: sidePadding,
            right: sidePadding,
            bottom: sidePadding / 2,
            itemGap,
            textStyle: { fontSize, color: '#333' },
          },
        ],
      });
      return exportPng(exportChart);
    } finally {
      exportChart.dispose();
    }
  }

  private async downloadChartAsPng(
    chart: echarts.ECharts | undefined,
    disabled: boolean,
    filenameSuffix?: string,
  ) {
    if (disabled || !chart) {
      return;
    }

    const model = await this.args.model.model;
    const modelName = model?.internalName || 'model';
    const link = document.createElement('a');
    link.href = this.getChartPngWithLegend(chart);
    const safeSuffix = filenameSuffix
      ?.trim()
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-|-$/g, '');
    link.download = `simulation-chart-${modelName}${safeSuffix ? `-${safeSuffix}` : ''}-${new Date().toISOString().split('T')[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
