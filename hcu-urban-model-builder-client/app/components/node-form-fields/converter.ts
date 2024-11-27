import { cached } from '@ember-data/tracking';
import { action } from '@ember/object';
import Component from '@glimmer/component';
import { TrackedAsyncData } from 'ember-async-data';
import type Node from 'hcu-urban-model-builder-client/models/node';
import { tracked } from '@glimmer/tracking';
import * as echarts from 'echarts';
import type { TrackedChangeset } from 'hcu-urban-model-builder-client/utils/tracked-changeset';

export interface NodeFormFieldsConverterSignature {
  // The arguments accepted by the component
  Args: {
    node: Node;
    changeset: TrackedChangeset<Node>;
  };
  // Any blocks yielded by the component
  Blocks: {
    default: [];
  };
  // The element to which `...attributes` is applied in the component template
  Element: null;
}

export default class NodeFormFieldsConverterComponent extends Component<NodeFormFieldsConverterSignature> {
  readonly interpolationOptions = ['Linear', 'Discrete'];

  @tracked chartContainer?: HTMLElement;
  @tracked chart?: echarts.ECharts;

  @cached
  get inputNode() {
    const fetchInputNode = async () => {
      const [inputEdge] = await this.args.node.targetEdgesWithGhosts;
      if (!inputEdge) {
        return null;
      }

      const node = (await inputEdge.source)!;

      if (node.isGhost) {
        return node.ghostParent;
      }

      return node;
    };

    return new TrackedAsyncData(fetchInputNode());
  }

  get inputName() {
    if (this.inputNode.isResolved && this.inputNode.value) {
      return this.inputNode.value.name;
    }
    if (this.inputNode.isPending) {
      return 'Loading...';
    }

    return 'Time';
  }

  @action addNewValue() {
    if (!this.args.changeset.dataProxy.data.values) {
      this.args.changeset.dataProxy.data.values = [{ x: 0, y: 0 }];
    } else {
      const len = this.args.changeset.dataProxy.data.values.length;
      this.args.changeset.dataProxy.data.values.push({
        x: len,
        y: len,
      });
    }
  }

  @action
  updateInterpolation(interpolation: 'Linear' | 'Discrete') {
    this.args.changeset.dataProxy.data.interpolation = interpolation;
    this.updateChart();
  }

  @action
  updateValue(index: number, key: 'x' | 'y', val: number | string) {
    this.args.changeset.dataProxy.data.values![index]![key] = Number(val);
    this.updateChart();
  }

  @action
  removeValue(index: number) {
    this.args.changeset.dataProxy.data.values!.splice(index, 1);
    this.updateChart();
  }

  @action updateChart() {
    this.chart?.setOption({
      series: [
        {
          data: this.chartData,
          type: 'line',
          step: this.chartStepData,
        },
      ],
    });
  }

  @action didInsertChartContainer(el: HTMLElement) {
    this.chartContainer = el;
    this.chart = echarts.init(this.chartContainer, null, {
      height: 260,
      width: 'auto',
    });

    this.chart.setOption({
      grid: {
        top: 5,
        bottom: 32,
      },
      xAxis: {
        type: 'value',
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          data: this.chartData,
          type: 'line',
          step: this.chartStepData,
        },
      ],
    });
  }

  get chartData() {
    const seriesData = [];
    for (const value of Object.values(
      this.args.changeset.dataProxy.data.values || [],
    )) {
      seriesData.push([value.x, value.y]);
    }
    return seriesData;
  }

  get chartStepData() {
    return this.args.changeset.dataProxy.data.interpolation == 'Discrete'
      ? 'end'
      : undefined;
  }
}
