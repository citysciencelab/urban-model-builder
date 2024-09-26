import { action } from '@ember/object';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import type ModelModel from 'hcu-urban-model-builder-client/models/model';
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';
import { TrackedAsyncData } from 'ember-async-data';
import type Store from '@ember-data/store';
import type Node from 'hcu-urban-model-builder-client/models/node';
import { NodeType, SimulationAdapter } from 'hcu-urban-model-builder-backend';
import type { ModelsService } from 'hcu-urban-model-builder-backend/lib/services/models/models.class';
import * as echarts from 'echarts';

export interface SimulateModalSignature {
  // The arguments accepted by the component
  Args: {
    model: ModelModel;
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

export default class SimulateModalComponent extends Component<SimulateModalSignature> {
  @service declare feathers: FeathersService;
  @service declare store: Store;

  @tracked isClientSideCalculation = true;
  @tracked activeTab: TabName = TabName.TimeSeries;
  @tracked tabNames = Object.values(TabName);

  @tracked time = 0;

  @tracked chartContainer?: HTMLElement;
  @tracked chart?: echarts.ECharts;

  @tracked simulateResult?: TrackedAsyncData<
    Awaited<ReturnType<ModelsService['simulate']>>
  >;

  tabNameToChartRenderFunction = {
    [TabName.TimeSeries]: this.renderTimeSeriesChart,
    [TabName.ScatterPlot]: this.renderScatterPlotChart,
  };

  @action
  async onShow() {
    this.simulate();
    this.time = this.args.model.timeLength;
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
    this.chart!.clear();

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
    this.time = value;
    if (this.chart) {
      console.log('setting time', value);

      const dataset = await this.getScatterPlotDataset();
      this.chart.setOption({
        series: dataset,
      });
    }
  }

  @action
  async renderTimeSeriesChart() {
    if (!this.simulateResult?.value) {
      return;
    }
    const data = this.simulateResult.value;

    const series = [];
    for (const [nodeId, value] of Object.entries(data.nodes)) {
      const node = await this.store.findRecord<Node>('node', nodeId);

      if (node.type !== NodeType.Flow && node.type !== NodeType.Population) {
        series.push({
          type: 'line',
          name: node.name,
          data: value.series.slice(0, this.time) as number[],
        });
      }
    }

    this.chart!.setOption({
      legend: {},
      xAxis: {
        data: data.times,
      },
      yAxis: {},
      tooltip: {
        trigger: 'axis',
      },
      series,
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

  async getScatterPlotDataset() {
    const data = this.simulateResult!.value!;
    const datasets = [];
    for (const [nodeId, value] of Object.entries(data.nodes)) {
      const node = await this.store.findRecord<Node>('node', nodeId);

      if (node?.type === NodeType.Population) {
        const last = value.series[this.time];
        if (Array.isArray(last)) {
          const populationData: { id: string; value: [number, number] }[] = [];
          const stateLocationsMap = new Map<Node, typeof populationData>();
          console.log(last[0]?.location);

          for (const stateLocation of last) {
            const location = {
              id: stateLocation.id,
              value: stateLocation.location,
            };

            populationData.push(location);
            for (const stateId of stateLocation.state) {
              const node = this.store.peekRecord<Node>('node', stateId);

              if (node) {
                if (!stateLocationsMap.has(node)) {
                  stateLocationsMap.set(node, [location]);
                }
                stateLocationsMap.get(node)!.push(location);
              }
            }
          }

          datasets.push({
            type: 'scatter',
            label: node.name,
            data: populationData,
          });
          for (const [node, locations] of stateLocationsMap.entries()) {
            datasets.push({
              type: 'scatter',
              label: node.name,
              data: locations,
            });
          }
        }
      }
    }

    return datasets;
  }
}
