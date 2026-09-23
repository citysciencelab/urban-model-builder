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
  result: SimulationResult;
  scenario: Record<string, number>;
  createdAt: string;
  displayCreatedAt: string;
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

  // The stored-results modal renders its own chart independently of the live
  // simulation chart above (both can be open at the same time), so it gets its
  // own container/chart/dataset instead of reusing chartContainer/chart/currentDataset.
  @tracked resultsOpen = false;
  @tracked storedResults: StoredSimulationResult[] = [];
  @tracked resultsCount = 0;
  @tracked resultsPage = 1;
  @tracked selectedStoredResult: StoredSimulationResult | null = null;
  @tracked storedChartContainer?: HTMLElement;
  @tracked storedChart?: echarts.ECharts;
  @tracked storedCurrentDataset: TimeSeriesDataset | ScatterPlotDataset | null =
    null;
  @tracked isGeneratingStoredChart = false;
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
      await this.renderStoredResult();
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
      this.simulationResult = (
        await new SimulationAdapter(
          this.feathers.app,
          this.args.model.id!,
          nodeValuesMap,
        ).simulate()
      ).getResults();
    } else {
      this.simulationResult = (await this.feathers.app
        .service('models')
        .simulate({
          id: this.args.model.id!,
          nodeIdToParameterValueMap: Object.fromEntries(nodeValuesMap),
        })) as any;
    }
  }

  @action
  async saveCurrentResult() {
    if (!this.simulationResult || this.isSavingResult) return;
    this.isSavingResult = true;
    try {
      await (this.feathers.app.service('models') as any).saveSimulationResult({
        modelsVersionsId: this.args.model.id!,
        scenario: Object.fromEntries(this.inMemoryScenario),
        result: this.simulationResult,
      });
      await this.loadStoredResults(false);
    } finally {
      this.isSavingResult = false;
    }
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
    if (selectFirst && this.storedResults.length) {
      await this.selectStoredResult(this.storedResults[0]!);
    }
  }

  @action
  async openStoredResults() {
    this.resultsOpen = true;
    await this.loadStoredResults();
  }

  @action closeStoredResults() {
    if (this.zoomedChartContext === 'stored') {
      this.closeChartZoom();
    }
    this.resultsOpen = false;
    this.selectedStoredResult = null;
    this.showStoredScatterPlotTab = false;
    this.storedSeriesColorOverrides = {};
    this.storedChart?.dispose();
    this.storedChart = undefined;
    this.storedChartContainer = undefined;
    this.storedCurrentDataset = null;
  }

  @action
  async didInsertStoredChart(element: HTMLElement) {
    this.storedChartContainer = element;
    if (this.selectedStoredResult) await this.renderStoredResult();
  }

  @action
  async selectStoredResult(result: StoredSimulationResult) {
    this.selectedStoredResult = result;
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
    if (this.storedChartContainer) await this.renderStoredResult();
  }

  private async renderStoredResult() {
    if (!this.storedChartContainer || !this.selectedStoredResult) return;

    this.isGeneratingStoredChart = true;
    try {
      const rawDataset = await this.tabNameToDatasetFunction[this.activeTab](
        this.selectedStoredResult.result,
      );
      const dataset =
        this.activeTab === TabName.TimeSeries
          ? this.withResolvedSeriesColors(rawDataset as TimeSeriesDataset)
          : rawDataset;
      this.storedCurrentDataset = dataset;

      this.storedChart?.dispose();
      this.storedChart = echarts.init(this.storedChartContainer, null, {
        height: 400,
        width: 'auto',
      });
      const index = dataset.times.length - 1;
      const optionsByIndex = this.tabNameToChartOptionByIndex[this.activeTab](
        index,
        dataset,
        this.storedSeriesColorOverrides,
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
  async handleChartZoomKeydown(context: 'live' | 'stored', event: KeyboardEvent) {
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
          DEFAULT_CHART_COLOR_PALETTE[index % DEFAULT_CHART_COLOR_PALETTE.length],
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
      this.storedChart?.dispose();
      this.storedChart = undefined;
      this.storedCurrentDataset = null;
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

    this.chart!.setOption(optionsByIndex);
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
    const dataset = timeSeriesDataset.series.map((d) => {
      const color = colorOverrides?.[d.name] ?? d.color;
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
        data: d.data.slice(0, index + 1),
      };
    });

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
      },
      animation: false,
      series: dataset,
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
      this.simulationResult,
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
    simulationResult: SimulationResult | null | undefined,
    scenario: Map<string, number>,
  ) {
    if (!simulationResult) {
      return;
    }

    // Get the model name from the related model
    const model = await this.args.model.model;
    const modelName = model?.internalName || 'model';

    // Transform simulationResult to use node names instead of UUIDs
    const resultsWithNodeNames = {
      times: simulationResult.times,
      nodes: {} as Record<string, any>,
    };

    // Replace node UUIDs with node names in the results
    for (const [nodeId, nodeData] of Object.entries(simulationResult.nodes)) {
      try {
        const node = await this.store.findRecord<Node>('node', nodeId);
        const nodeName = node.name || nodeId; // fallback to UUID if name is empty
        resultsWithNodeNames.nodes[nodeName] = nodeData;
      } catch (error) {
        // If node can't be found, keep the original UUID
        resultsWithNodeNames.nodes[nodeId] = nodeData;
      }
    }

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
    };

    // Create and download the file
    const jsonString = JSON.stringify(downloadData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `simulation-results-${modelName}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  private async downloadChartAsPng(
    chart: echarts.ECharts | undefined,
    disabled: boolean,
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
    link.download = `simulation-chart-${modelName}-${new Date().toISOString().split('T')[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
