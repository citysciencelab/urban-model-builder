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
import Chart from 'chart.js/auto';
import { assert } from '@ember/debug';

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

  @tracked chartContainer?: HTMLCanvasElement;
  @tracked chart?: Chart;

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
    this.chart?.destroy();
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
    this.chart?.destroy();

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

      this.chart.data.datasets = await this.getScatterPlotDataset();
      this.chart.update();
    }
  }

  @action
  async renderTimeSeriesChart() {
    if (!this.simulateResult?.value) {
      return;
    }
    const data = this.simulateResult.value;

    const datasets = [];
    for (const [nodeId, value] of Object.entries(data.nodes)) {
      const node = await this.store.findRecord<Node>('node', nodeId);

      if (node.type !== NodeType.Flow && node.type !== NodeType.Population) {
        datasets.push({
          label: node.name,
          data: value.series.slice(0, this.time) as number[],
        });
      }
    }

    const chartData = {
      labels: data.times,
      datasets: datasets,
    };

    console.log(datasets);

    this.chart = new Chart(this.chartContainer as any, {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
      },
    });
  }

  @action
  async renderScatterPlotChart() {
    const datasets = await this.getScatterPlotDataset();
    this.chart = new Chart(this.chartContainer as any, {
      type: 'scatter',
      data: {
        datasets,
      },
      options: {
        animation: {
          duration: 0,
        },
      },
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
          const populationData: { x: number; y: number }[] = [];
          const stateLocationsMap = new Map<Node, { x: number; y: number }[]>();
          console.log(last[0]?.location);

          for (const stateLocation of last) {
            const location = {
              x: stateLocation.location[0],
              y: stateLocation.location[1],
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

          for (const [node, locations] of stateLocationsMap.entries()) {
            datasets.push({
              label: node.name,
              data: locations,
            });
          }
          datasets.push({
            label: node.name,
            data: populationData,
          });
        }
      }
    }

    return datasets;
  }
}
