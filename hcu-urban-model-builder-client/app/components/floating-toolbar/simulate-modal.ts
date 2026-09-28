import { action } from '@ember/object';
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

type EmberBasicDropdownAPI = { actions: { close: () => void } };

type StoredSimulationResult = {
  id: string;
  name: string;
  result: SimulationResult & {
    batchResults?: SimulationResult[];
    batchScenarios?: Record<string, number>[];
  };
  scenario: Record<string, number>;
  createdAt: string;
  displayCreatedAt: string;
};

type StoredParameterInput = {
  nodeId: string;
  name: string;
  value: number;
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

  // The stored-results modal renders its own chart independently of the live
  // simulation chart above (both can be open at the same time), so it gets its
  // own container/chart/dataset instead of reusing chartContainer/chart/currentDataset.
  @tracked resultsOpen = false;
  @tracked storedResults: StoredSimulationResult[] = [];
  @tracked resultsCount = 0;
  @tracked resultsPage = 1;
  @tracked isResultsListCollapsed = false;
  @tracked selectedStoredResult: StoredSimulationResult | null = null;
  @tracked storedChartContainer?: HTMLElement;
  @tracked storedChart?: echarts.ECharts;
  @tracked storedCurrentDataset: TimeSeriesDataset | ScatterPlotDataset | null =
    null;
  @tracked storedChartCards: StoredChartCard[] = [];
  @tracked storedBatchDatasets: TimeSeriesDataset[] = [];
  @tracked selectedStoredBatchRuns: number[] = [0];
  @tracked showStoredMedian = true;
  @tracked showStoredTunnel = true;
  @tracked showStoredSelectedRun = true;
  @tracked showStoredExtendedFunctions = false;
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
    this.eventBus.on('scenario-value-changed', this.restartSimulation);

    this.storeEventEmitter.on('node', 'created', this.restartSimulation);
    this.storeEventEmitter.on('node', 'updated', this.restartSimulation);
    this.storeEventEmitter.on('node', 'deleted', this.restartSimulation);

    this.storeEventEmitter.on('edge', 'created', this.restartSimulation);
    this.storeEventEmitter.on('edge', 'updated', this.restartSimulation);
    this.storeEventEmitter.on('edge', 'deleted', this.restartSimulation);
  }

  get ALLOW_SERVER_SIDE_SIMULATION() {
    return config.APP.ALLOW_SERVER_SIDE_SIMULATION;
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
    await this.restartSimulation();
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
    this.activeTab = tabName;
    if (this.resultsOpen && this.selectedStoredResult) {
      if (tabName === TabName.TimeSeries) {
        this.disposeStoredCharts();
        await this.prepareStoredChartCards();
      } else {
        await this.renderStoredResult();
      }
    } else {
      await this.restartSimulation();
    }
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

    if (this.isClientSideCalculation) {
      this.batchResults = await this.runSimulationBatch(
        Math.max(1, this.deviationCount),
        Object.fromEntries(nodeValuesMap),
      );
      const scenario = Object.fromEntries(nodeValuesMap);
      this.batchScenarios = this.batchResults.map(() => ({ ...scenario }));
      this.selectedBatchRun = -1;
      this.simulationResult = this.batchResults[0] ?? null;
    } else {
      this.simulationWorker?.terminate();
      this.simulationWorker = undefined;
      this.isBatchRunning = false;
      this.batchResults = [];
      this.batchScenarios = [];
      this.batchTimeSeriesDatasets = [];
      this.simulationResult = (await this.feathers.app
        .service('models')
        .simulate({
          id: this.args.model.id!,
          nodeIdToParameterValueMap: Object.fromEntries(nodeValuesMap),
        })) as any;
    }
  }

  private async runSimulationBatch(
    runCount: number,
    scenario: Record<string, number>,
  ): Promise<SimulationResult[]> {
    this.simulationWorker?.terminate();
    const snapshot = await this.createSimulationSnapshot();
    this.completedSimulations = 0;
    this.totalSimulations = runCount;
    this.estimatedRemainingMs = 0;
    this.isBatchRunning = true;

    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL('../../workers/simulation-batch.ts', import.meta.url),
        { type: 'module' },
      );
      this.simulationWorker = worker;
      const cleanUp = () => {
        worker.terminate();
        if (this.simulationWorker === worker) this.simulationWorker = undefined;
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
      await (this.feathers.app.service('models') as any).saveSimulationResult({
        modelsVersionsId: this.args.model.id!,
        name,
        scenario: Object.fromEntries(this.inMemoryScenario),
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
    const value = Number.parseInt(
      (event.target as HTMLInputElement).value,
      10,
    );
    this.deviationCount = Number.isFinite(value) ? Math.max(1, value) : 1;
  }

  @action
  async loadStoredResults(selectFirst = true) {
    const response = await (
      this.feathers.app.service('models') as any
    ).findSimulationResults({
      modelsVersionsId: this.args.model.id!,
      $skip: (this.resultsPage - 1) * this.resultsPageSize,
      $limit: this.resultsPageSize,
    });
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
    chart.setOption(this.getStoredBatchChartOption(card.dataset));
  }

  @action
  async selectStoredResult(result: StoredSimulationResult) {
    this.disposeStoredCharts();
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
    if (!this.selectedStoredResult) return;
    const inputs = await Promise.all(
      Object.entries(this.selectedStoredResult.scenario).map(
        async ([nodeId, value]) => {
          const node = await this.store.findRecord<Node>('node', nodeId);
          return {
            nodeId,
            name: node.name,
            value,
            min: node.parameterMin,
            max: node.parameterMax,
            step: node.parameterStep,
          };
        },
      ),
    );
    this.storedParameterInputs = inputs;
  }

  private async prepareStoredChartCards() {
    if (!this.selectedStoredResult) return;
    this.isGeneratingStoredChart = true;
    try {
      const batchResults = this.selectedStoredResult.result.batchResults?.length
        ? this.selectedStoredResult.result.batchResults
        : [this.selectedStoredResult.result];
      this.storedBatchDatasets = await Promise.all(
        batchResults.map((result) => this.getTimeSeriesDataset(result)),
      );
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
    } finally {
      this.isGeneratingStoredChart = false;
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
                symbol: 'none',
                lineStyle: { color: medianColor, width: 2 },
                itemStyle: { color: medianColor },
              },
            ]
          : []),
        ...(this.showStoredSelectedRun
          ? this.selectedStoredBatchRuns.flatMap((runIndex) => {
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
                  symbol: 'none',
                  lineStyle: { color: runColor, width: 2, type: 'dashed' },
                  itemStyle: { color: runColor },
                },
              ];
            })
          : []),
      ];
    });

    return {
      grid: { left: 48, right: 18, top: 18, bottom: 42 },
      xAxis: { type: 'category', data: dataset.times },
      yAxis: { type: 'value', scale: this.useStoredTightYAxis },
      tooltip: { trigger: 'axis' },
      animation: false,
      series: chartSeries,
    };
  }

  private renderStoredChartCards() {
    for (const card of this.storedChartCards) {
      this.storedCharts.get(card.id)?.setOption(
        this.getStoredBatchChartOption(card.dataset),
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

  @action toggleStoredSelectedRun() {
    this.showStoredSelectedRun = !this.showStoredSelectedRun;
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
    const value = Number((event.target as HTMLInputElement).value);
    this.storedParameterInputs = this.storedParameterInputs.map((input) =>
      input.nodeId === nodeId ? { ...input, value } : input,
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
    if (!this.selectedStoredResult || this.isBatchRunning) return;
    const scenario = Object.fromEntries(
      this.storedParameterInputs.map((input) => [input.nodeId, input.value]),
    );
    const [newResult] = await this.runSimulationBatch(1, scenario);
    if (!newResult) return;

    const storedResult = this.selectedStoredResult.result;
    const batchResults = storedResult.batchResults?.length
      ? [...storedResult.batchResults, newResult]
      : [storedResult, newResult];
    const existingScenarios = storedResult.batchScenarios?.length
      ? storedResult.batchScenarios
      : [this.selectedStoredResult.scenario];
    const batchScenarios = [...existingScenarios, scenario];
    const result = { ...storedResult, batchResults, batchScenarios };

    await (this.feathers.app.service('models') as any).updateSimulationResult({
      id: this.selectedStoredResult.id,
      result,
    });
    this.selectedStoredResult.result = result;
    await this.prepareStoredChartCards();
    this.selectedStoredBatchRuns = [batchResults.length - 1];
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
    const dataset =
      context === 'live' ? this.currentDataset : this.storedCurrentDataset;
    if (!dataset) return;

    this.zoomedChartContext = context;
    this.isChartZoomOpen = true;
    window.addEventListener('resize', this.handleZoomedChartResize);
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
    this.isChartZoomOpen = false;
    this.zoomedChartContext = null;
    window.removeEventListener('resize', this.handleZoomedChartResize);
    this.zoomedChart?.dispose();
    this.zoomedChart = undefined;
    this.zoomedChartContainer = undefined;
  }

  @action
  async didInsertZoomedChartContainer(element: HTMLElement) {
    this.zoomedChartContainer = element;
    await this.renderZoomedChart();
  }

  private handleZoomedChartResize = () => {
    this.zoomedChart?.resize();
  };

  private async renderZoomedChart() {
    if (!this.zoomedChartContainer || !this.zoomedChartContext) return;

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
    this.zoomedChart.setOption(optionsByIndex);
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
    this.simulationWorker?.terminate();
    this.eventBus.off('scenario-value-changed', this.restartSimulation);

    this.storeEventEmitter.off('node', 'created', this.restartSimulation);
    this.storeEventEmitter.off('node', 'updated', this.restartSimulation);
    this.storeEventEmitter.off('node', 'deleted', this.restartSimulation);

    this.storeEventEmitter.off('edge', 'created', this.restartSimulation);
    this.storeEventEmitter.off('edge', 'updated', this.restartSimulation);
    this.storeEventEmitter.off('edge', 'deleted', this.restartSimulation);

    window.removeEventListener('resize', this.handleZoomedChartResize);
  }

  @action
  toggleDropdown() {
    this.floatingToolbarDropdownManager.togglePin('simulateModal');
  }

  @action removePinOnClose(dd: any) {
    if (
      dd.isOpen &&
      this.floatingToolbarDropdownManager.isSimulateDropdownPinned
    ) {
      this.floatingToolbarDropdownManager.isSimulateDropdownPinned = false;
    }
  }

  @action
  async downloadSimulationResults() {
    await this.downloadResultAsJson(
      this.resultPayload,
      this.inMemoryScenario,
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
    link.href = chart.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    });
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
