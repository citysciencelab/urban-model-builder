import Modifier from 'ember-modifier';
import { registerDestructor } from '@ember/destroyable';
import * as echarts from 'echarts';
import type { ECharts, EChartsOption } from 'echarts';

interface EchartSignature {
  Element: HTMLElement;
  Args: {
    Positional: [option: EChartsOption];
  };
}

/**
 * Renders an ECharts chart into the element and replaces its option whenever the
 * passed option changes. The chart follows the size of the element.
 */
export default class EchartModifier extends Modifier<EchartSignature> {
  chart: ECharts | null = null;

  modify(element: HTMLElement, [option]: [EChartsOption]) {
    if (!this.chart) {
      const chart = echarts.init(element, null, { renderer: 'canvas' });
      const observer = new ResizeObserver(() => chart.resize());
      observer.observe(element);
      registerDestructor(this, () => {
        observer.disconnect();
        chart.dispose();
      });
      this.chart = chart;
    }
    this.chart.setOption(option, { notMerge: true });
  }
}
