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
import { task } from 'ember-concurrency';

export interface SimulateModalSignature {
  // The arguments accepted by the component
  Args: {
    model: ModelsVersion;
    show?: boolean;
    onHide: () => void;
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

type SimulationResult = Awaited<ReturnType<SimulationAdapter<any>['simulate']>>;

type TimeSeriesDataset = Awaited<
  ReturnType<SimulateModalComponent['getTimeSeriesDataset']>
>;
type ScatterPlotDataset = Awaited<
  ReturnType<SimulateModalComponent['getScatterPlotDataset']>
>;

const BASE_SPEED = 20;

export default class SimulateModalComponent extends Component<SimulateModalSignature> {
  @service declare feathers: FeathersService;
  @service declare store: Store;
  @service declare storeEventEmitter: StoreEventEmitterService;
  @service declare eventBus: EventBus;
  @service declare emberReactConnector: EmberReactConnectorService;

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

  get isAnimationFinished() {
    return this.animationCursor >= 100;
  }

  get simulationEndTime() {
    return this.args.model.timeStart + this.args.model.timeLength;
  }

  get hasError() {
    return !!this.simulationError;
  }

  get inMemoryScenario(): Map<number, number> {
    // from the store get the current default scenario
    const defaultScenario = this.store
      .peekAll<Scenario>('scenario')
      .find((item) => {
        return (
          item.modelsVersions.id == this.args.model.id && item.isDefault == true
        );
      }) as Scenario;

    const scenarioValues = this.store
      .peekAll<ScenariosValue>('scenarios-value')
      .filter((item) => {
        return item.scenarios.id == defaultScenario.id;
      });

    const scenarioNodeValueMap = scenarioValues.reduce(
      (acc: Map<number, number>, item: ScenariosValue) => {
        acc.set(Number((item.nodes as any).id), Number(item.value));
        return acc;
      },
      new Map(),
    );

    return scenarioNodeValueMap;
  }

  @action
  onShow() {
    this.simulationTask.perform();
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
      if (!this.args.show) {
        isCanceled = false;
        return;
      }
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
      this.simulationResult = await new SimulationAdapter(
        this.feathers.app,
        Number(this.args.model.id),
        nodeValuesMap,
      ).simulate();
    } else {
      this.simulationResult = await this.feathers.app
        .service('models')
        .simulate({
          id: Number(this.args.model.id!),
          nodeIdToParameterValueMap: Object.fromEntries(nodeValuesMap),
        });
    }
  }

  @action
  async getTimeSeriesDataset(simulateResult: SimulationResult) {
    const data = simulateResult;

    const series = [];

    for (const [nodeId, value] of Object.entries(data.nodes)) {
      const node = await this.store.findRecord<Node>('node', nodeId);

      if (node.type !== NodeType.Flow && node.type !== NodeType.Population) {
        series.push({
          type: 'line',
          name: node.name,
          data: value.series,
        });
      }
    }

    return { series, times: simulateResult.times };
  }

  @action
  async getScatterPlotDataset(simulateResult: SimulationResult) {
    const data = simulateResult;
    const series = [];
    for (const [nodeId, value] of Object.entries(data.nodes)) {
      const populationNode = await this.store.findRecord<Node>('node', nodeId);
      const [edge] = (await populationNode.targetEdgesWithGhosts).filter(
        (edge) => edge.type === EdgeType.AgentPopulation,
      );

      const allStates = await this.store.query<Node>('node', {
        parentId: edge?.source?.id ?? null,
        type: NodeType.State,
      });

      if (populationNode?.type === NodeType.Population) {
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
              const location = {
                id: stateLocation.id,
                value: stateLocation.location,
              };

              populationData.push(location);
              for (const states of allStates) {
                if (stateLocation.state.includes(Number(states.id!))) {
                  stateLocationsMap.get(states)!.push(location);
                } else {
                  stateLocationsMap
                    .get(states)!
                    .push({ id: stateLocation.id, value: null });
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

          series.push(datasets);
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
}
