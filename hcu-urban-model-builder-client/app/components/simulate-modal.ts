import { action } from '@ember/object';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';
import { TrackedAsyncData } from 'ember-async-data';
import type Store from '@ember-data/store';
import type Node from 'hcu-urban-model-builder-client/models/node';
import { NodeType, SimulationAdapter } from 'hcu-urban-model-builder-backend';
import type { ModelsService } from 'hcu-urban-model-builder-backend/lib/services/models/models.class';
import * as echarts from 'echarts';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';

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

const BASE_SPEED = 20;

export default class SimulateModalComponent extends Component<SimulateModalSignature> {
  @service declare feathers: FeathersService;
  @service declare store: Store;

  @tracked isClientSideCalculation = true;
  @tracked activeTab: TabName = TabName.TimeSeries;
  @tracked tabNames = Object.values(TabName);

  @tracked isPlaying = false;
  @tracked animationCursor = 0.01;
  @tracked speed = 1;
  @tracked time = -1;

  @tracked chartContainer?: HTMLElement;
  @tracked chart?: echarts.ECharts;

  @tracked simulateResult?: TrackedAsyncData<
    Awaited<ReturnType<ModelsService['simulate']>>
  >;

  tabNameToChartRenderFunction = {
    [TabName.TimeSeries]: this.renderTimeSeriesChart,
    [TabName.ScatterPlot]: this.renderScatterPlotChart,
  };

  tabNameToDatasetFunction = {
    [TabName.TimeSeries]: this.getTimeSeriesDataset,
    [TabName.ScatterPlot]: this.getScatterPlotDataset,
  };

  get isAnimationFinished() {
    return this.animationCursor >= 100;
  }

  get simulationEndTime() {
    return this.args.model.timeStart + this.args.model.timeLength;
  }

  calculateNextAnimationCursor() {
    this.animationCursor =
      Number(this.animationCursor) + 0.01 * this.speed * BASE_SPEED;
  }

  startAnimation() {
    this.isPlaying = true;
    requestAnimationFrame(this.animateChart.bind(this));
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
        this.setTime(Number(this.simulationEndTime));
        this.isPlaying = false;
      }
    }
  }

  @action
  async onShow() {
    this.simulate();
    this.startAnimation();
  }

  @action
  toggleClientSideCalculation(value: boolean) {
    this.isClientSideCalculation = value;
    this.simulate();
  }

  @action isTabActive(tabName: TabName) {
    return this.activeTab === tabName;
  }

  @action
  async switchTab(tabName: TabName) {
    this.activeTab = tabName;
    this.chart?.clear();

    await this.renderChart();
  }

  @action simulate() {
    if (this.isClientSideCalculation) {
      this.simulateResult = new TrackedAsyncData(
        new SimulationAdapter(
          this.feathers.app,
          Number(this.args.model.id),
        ).simulate(),
      );
    } else {
      this.simulateResult = new TrackedAsyncData(
        this.feathers.app
          .service('models')
          .simulate({ id: Number(this.args.model.id!) }),
      );
    }
  }

  @action
  async didInsertChartContainer(element: any) {
    this.chartContainer = element;
    this.chart = echarts.init(this.chartContainer, null, {
      height: 400,
      width: 'auto',
    });
    await this.renderChart();
  }

  @action
  async renderChart() {
    if (this.chartContainer) {
      await this.tabNameToChartRenderFunction[this.activeTab]?.();
    }
  }

  @action
  async setTime(value: number) {
    this.time = Number(value);
    if (this.chart) {
      const dataset = await this.tabNameToDatasetFunction[this.activeTab]?.();
      this.chart.setOption({
        series: dataset,
      });
    }
  }

  @action
  async renderTimeSeriesChart() {
    const datasets = await this.getTimeSeriesDataset();

    this.chart!.setOption({
      legend: {},
      xAxis: {
        data: this.simulateResult!.value!.times,
      },
      yAxis: {},
      tooltip: {
        trigger: 'axis',
      },
      series: datasets,
    });
  }

  @action
  async renderScatterPlotChart() {
    const datasets = await this.getScatterPlotDataset();

    this.chart!.setOption({
      legend: {},
      xAxis: {},
      yAxis: {},
      tooltip: {
        trigger: 'axis',
      },
      series: datasets,
    });
  }

  @action
  async getTimeSeriesDataset() {
    if (!this.simulateResult?.value) {
      return;
    }
    const data = this.simulateResult.value;

    const series = [];

    for (const [nodeId, value] of Object.entries(data.nodes)) {
      const node = await this.store.findRecord<Node>('node', nodeId);

      const dataIndex = Math.floor(
        (data.times.length / 100) * this.animationCursor,
      );

      if (node.type !== NodeType.Flow && node.type !== NodeType.Population) {
        series.push({
          type: 'line',
          name: node.name,
          data: value.series.slice(0, dataIndex) as number[],
          animation: false,
        });
      }
    }

    return series;
  }

  @action
  async getScatterPlotDataset() {
    const data = this.simulateResult!.value!;
    const datasets = [];
    for (const [nodeId, value] of Object.entries(data.nodes)) {
      const populationNode = await this.store.findRecord<Node>('node', nodeId);

      const allStates = await this.store.query<Node>('node', {
        parentId: Number(populationNode.data.agentBaseId),
        type: NodeType.State,
      });

      if (populationNode?.type === NodeType.Population) {
        const last = value.series[this.time];
        if (Array.isArray(last)) {
          const populationData: {
            id: string;
            value: [number, number] | null;
          }[] = [];
          const stateLocationsMap = new Map<Node, typeof populationData>(
            allStates.map((s) => [s, []]),
          );

          for (const stateLocation of last) {
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
            label: populationNode.name,
            data: populationData,
          });
          for (const [stateNodes, locations] of stateLocationsMap.entries()) {
            datasets.push({
              type: 'scatter',
              label: stateNodes.name,
              data: locations,
            });
          }
        }
      }
    }

    return datasets;
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

  @action updateDatasetFromAnimationCursor() {
    this.setTime((this.args.model.timeLength / 100) * this.animationCursor);
  }
}
