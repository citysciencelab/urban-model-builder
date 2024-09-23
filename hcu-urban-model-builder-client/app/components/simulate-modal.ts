import { action } from '@ember/object';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import type ModelModel from 'hcu-urban-model-builder-client/models/model';
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';
import { TrackedAsyncData } from 'ember-async-data';
import * as echarts from 'echarts';
import type Store from '@ember-data/store';
import type Node from 'hcu-urban-model-builder-client/models/node';
import { NodeType } from 'hcu-urban-model-builder-backend';
import type { ModelsService } from 'hcu-urban-model-builder-backend/lib/services/models/models.class';

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

export default class SimulateModalComponent extends Component<SimulateModalSignature> {
  @service declare feathers: FeathersService;
  @service declare store: Store;

  @tracked simulateResult?: TrackedAsyncData<
    Awaited<ReturnType<ModelsService['simulate']>>
  >;

  @action
  async onShow() {
    this.simulateResult = new TrackedAsyncData(
      this.feathers.app
        .service('models')
        .simulate({ id: Number(this.args.model.id!) }),
    );
  }

  @action
  async didInsertChartContainer(element: HTMLElement) {
    if (!this.simulateResult?.value) {
      return;
    }

    const chart = echarts.init(element, null, {
      height: 400,
      width: 'auto',
    });

    const data = this.simulateResult.value;

    const series = [];
    for (const [nodeId, value] of Object.entries(data.nodes)) {
      const node = await this.store.findRecord<Node>('node', nodeId);

      if (node.type !== NodeType.Flow) {
        series.push({
          name: node.name,
          data: value.series,
          type: 'line',
        });
      }
    }

    chart.setOption({
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
}
