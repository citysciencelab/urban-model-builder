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
};

const BASE_SPEED = 20;

type EmberBasicDropdownAPI = { actions: { close: () => void } };

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
  basicDropdownInstance: EmberBasicDropdownAPI | null = null;

  @tracked show = false;

  @tracked isClientSideCalculation = true;
  @tracked activeTab: TabName = TabName.TimeSeries;
  @tracked tabNames = Object.values(TabName);

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

  @action
  async switchTab(tabName: TabName) {
    this.activeTab = tabName;
    await this.restartSimulation();
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
  async getTimeSeriesDataset(simulateResult: SimulationResult) {
    const data = simulateResult;

    const series: ChartSeries[] = [];

    for (const [nodeId, value] of Object.entries(data.nodes)) {
      const node = await this.store.findRecord<Node>('node', nodeId);

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
          });
        } else if (this.isNumberArrayArray(value.series)) {
          const subSeries = value.series.reduce((acc, current, timeIndex) => {
            current.forEach((innerValue, subSeriesNumber) => {
              if (!acc[subSeriesNumber]) {
                acc[subSeriesNumber] = {
                  type: 'line',
                  name: `${node.name} - ${subSeriesNumber}`,
                  data: [],
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
              if (typeof stateLocation === 'object' && stateLocation !== null &&
                  'id' in stateLocation && 'location' in stateLocation && 'state' in stateLocation) {
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
  private getTimeseriesChartOptionByIndex(index: number) {
    const dataset = (this.currentDataset! as TimeSeriesDataset).series.map(
      (d) => {
        return {
          ...d,
          data: d.data.slice(0, index + 1),
        };
      },
    );

    return {
      legend: {
        type: 'scroll',
        data: dataset.map((d) => d.name),
        top: 10,
      },
      xAxis: {
        data: this.currentDataset!.times,
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
  private getScatterPlotChartOptionByIndex(index: number) {
    const currentDataset = (this.currentDataset! as ScatterPlotDataset).series[
      index
    ]!;
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
    if (!this.simulationResult) {
      return;
    }

    // Get the model name from the related model
    const model = await this.args.model.model;
    const modelName = model?.internalName || 'model';

    // Transform simulationResult to use node names instead of UUIDs
    const resultsWithNodeNames = {
      times: this.simulationResult.times,
      nodes: {} as Record<string, any>
    };

    // Replace node UUIDs with node names in the results
    for (const [nodeId, nodeData] of Object.entries(this.simulationResult.nodes)) {
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
    for (const [nodeId, value] of this.inMemoryScenario.entries()) {
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
}
