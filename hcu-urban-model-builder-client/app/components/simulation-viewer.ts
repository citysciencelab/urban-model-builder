/**
 * Simulation Viewer Component
 * 
 * This component provides the viewer functionality for comparing multiple simulation runs.
 * It ports the key features from the standalone viewer prototype:
 * - Multiple run selection and comparison
 * - Scenario value table with diff highlighting
 * - Chart display with multiple metrics
 * - CSV export
 */

import { action } from '@ember/object';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import * as echarts from 'echarts';
import type { ECharts, EChartsOption } from 'echarts';
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';
import type Store from '@ember-data/store';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import type Node from 'hcu-urban-model-builder-client/models/node';
import { task } from 'ember-concurrency';
import { cached } from '@glimmer/tracking';
import {
  MAX_SELECTED,
  PALETTE,
  T95,
  BAND_OPACITY,
  SCENARIO_FALLBACK_GROUP,
  RESULT_FALLBACK_GROUP,
  POPULATION_GROUP,
  fmtValue,
  fmtAxis,
  fmtScenario,
  fmtTimestamp,
  sameValue,
  compareVersion,
  timeRange,
  groupKey,
  runColor,
  currentTheme,
  chromeColors,
  tCrit95,
} from '../utils/simulation-viewer';

// Local storage key
const LS_KEY = 'umb-simulation-viewer:v1';

// Types
export interface ViewerRun {
  id: string;
  name: string;
  description: string | null;
  metadata: {
    modelId: string;
    modelName: string;
    version: string;
    timeStart: number;
    timeLength: number;
    timeEnd: number;
    downloadTimestamp: string;
    scenarioName?: string;
  };
  scenario: Record<string, any>;
  results: {
    times: (string | number)[];
    nodes: Record<string, {
      kind?: string;
      values?: (number | null)[];
      unit?: string;
      lo?: (number | null)[];
      hi?: (number | null)[];
      ci?: (number | null)[];
    }>;
  };
  createdAt: string;
  index: number;
  group: any | null;
  isSet?: boolean;
  members?: any[];
  n?: number;
  autoLabel?: string;
}

export interface ViewerGroup {
  key: string;
  name: string;
  version: string;
  range: string;
  modelId: string;
  runs: ViewerRun[];
  sets: ViewerRun[];
  variables: { name: string; kind: string; unit: string; folder: string }[];
}

interface ViewerPrefs {
  selection: Record<string, string[]>;
  labels: Record<string, string>;
  refs: Record<string, string>;
  cols: number;
  yZero: boolean;
  delta: boolean;
  hideConstant: boolean;
  diffOnly: boolean;
  collapsed: Record<string, boolean>;
  theme: string | null;
  aggregate: Record<string, boolean>;
  band: 'range' | 'ci' | 'none';
}

interface ChartEntry {
  g: ViewerGroup;
  variable: { name: string; kind: string; unit: string; folder: string };
  card: HTMLElement;
  chartEl: HTMLElement;
  tableEl: HTMLElement;
  noteEl: HTMLElement;
  badge: HTMLElement;
  titleEl: HTMLElement;
  focusBtn: HTMLElement;
  tableBtn: HTMLElement;
  chart: ECharts | null;
  span: number;
  tableMode: boolean;
  visible: boolean;
  dirty: boolean;
  constant: boolean;
}

// Default preferences
function defaultPrefs(): ViewerPrefs {
  return {
    selection: {},
    labels: {},
    refs: {},
    cols: 3,
    yZero: false,
    delta: false,
    hideConstant: false,
    diffOnly: false,
    collapsed: {},
    theme: null,
    aggregate: {},
    band: 'range',
  };
}

function loadPrefs(): ViewerPrefs {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      return { ...defaultPrefs(), ...JSON.parse(saved) };
    }
  } catch {
    // Ignore
  }
  return defaultPrefs();
}

function savePrefs(prefs: ViewerPrefs): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore
  }
}

export interface SimulationViewerSignature {
  Args: {
    model: ModelsVersion;
  };
  Blocks: {
    default: [];
  };
  Element: null;
}

export default class SimulationViewerComponent extends Component<SimulationViewerSignature> {
  @service declare feathers: FeathersService;
  @service declare store: Store;

  // Preferences
  @tracked prefs: ViewerPrefs = loadPrefs();
  @tracked ui = { scenarioSearch: '', chartSearch: '' };

  // Data
  @tracked simulationResults: ViewerRun[] = [];
  @tracked groups: Map<string, ViewerGroup> = new Map();
  @tracked activeKey: string | null = null;
  @tracked isLoading = false;
  @tracked error: string | null = null;

  // Charts
  @tracked charts: Map<string, ChartEntry> = new Map();
  @tracked io: IntersectionObserver | null = null;
  @tracked ro: ResizeObserver | null = null;

  // Element references
  @tracked groupListElement: HTMLElement | null = null;
  @tracked mainElement: HTMLElement | null = null;
  @tracked runsBarElement: HTMLElement | null = null;
  @tracked scenarioBodyElement: HTMLElement | null = null;
  @tracked chartSectionsElement: HTMLElement | null = null;

  // Theme
  @cached
  get theme(): 'light' | 'dark' {
    return currentTheme(this.prefs.theme);
  }

  @cached
  get palette(): string[] {
    return PALETTE[this.theme];
  }

  // Lifecycle
  constructor(owner: unknown, args: any) {
    super(owner, args);
    this.loadData();
  }

  // Load data
  @action
  async loadData(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const results = await this.feathers.app.service('simulation-results').find({
        query: {
          modelsVersionsId: this.args.model.id,
          $sort: { createdAt: -1 },
        },
      });

      const data = results.data || results || [];
      this.simulationResults = data.map((r: any) => this.normalizeToViewerRun(r));
      this.rebuildGroups();
      
      // Set active key to first group
      if (this.groups.size > 0) {
        this.activeKey = this.groups.keys().next().value || null;
      }
    } catch (e) {
      console.error('Failed to load simulation results:', e);
      this.error = 'Fehler beim Laden der Simulationsergebnisse';
    } finally {
      this.isLoading = false;
    }
  }

  // Normalize backend result to viewer run
  @action
  normalizeToViewerRun(result: any): ViewerRun {
    return {
      id: result.id,
      name: result.name,
      description: result.description,
      metadata: result.metadata,
      scenario: result.scenario,
      results: result.results,
      createdAt: result.createdAt,
      index: 0,
      group: null,
    };
  }

  // Rebuild groups
  @action
  rebuildGroups(): void {
    const groups = new Map<string, ViewerGroup>();

    for (const result of this.simulationResults) {
      const key = groupKey(result.metadata);
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          name: result.metadata.modelName || 'Modell',
          version: result.metadata.version || '?',
          range: timeRange(result.metadata),
          modelId: result.metadata.modelId || '',
          runs: [],
          sets: [],
          variables: [],
        });
      }
      groups.get(key)!.runs.push(result);
    }

    // Sort groups
    const sorted = [...groups.values()].sort((a, b) =>
      a.name.localeCompare(b.name) || compareVersion(b.version, a.version)
    );
    this.groups = new Map(sorted.map((g) => [g.key, g]));

    // Process each group
    for (const g of this.groups.values()) {
      g.runs.sort((a, b) =>
        String(a.metadata.downloadTimestamp || '').localeCompare(String(b.metadata.downloadTimestamp || '')) ||
        a.name.localeCompare(b.name)
      );
      g.runs.forEach((r, i) => { r.index = i; r.group = g; });
      g.sets = this.buildSets(g);
      g.variables = this.collectVariables(g);
    }
  }

  // Build sets for aggregation
  @action
  buildSets(g: ViewerGroup): ViewerRun[] {
    const bySig = new Map<string, ViewerRun[]>();

    for (const run of g.runs) {
      const sig = this.scenarioSignature(run);
      if (!bySig.has(sig)) bySig.set(sig, []);
      bySig.get(sig)!.push(run);
    }

    return [...bySig.entries()].map(([sig, members], i) => {
      const first = members[0];
      const times = members.reduce((acc: any[], r) => (r.results.times.length > acc.length ? r.results.times : acc), first.results.times);
      
      // Aggregate variables
      const variables: Record<string, any> = {};
      for (const name of new Set(members.flatMap((r) => Object.keys(r.results.nodes)))) {
        const vs = members.map((r) => r.results.nodes[name]).filter(Boolean);
        const values: (number | null)[] = [], lo: (number | null)[] = [], hi: (number | null)[] = [], ci: (number | null)[] = [];
        
        times.forEach((_, t) => {
          const xs = vs.map((v) => v.values?.[t]).filter((x: any) => x != null) as number[];
          const m = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
          values.push(m);
          lo.push(xs.length ? Math.min(...xs) : null);
          hi.push(xs.length ? Math.max(...xs) : null);
          
          const sd = xs.length > 1 ? Math.sqrt(xs.reduce((a, x) => a + (x - m!) ** 2, 0) / (xs.length - 1)) : null;
          ci.push(sd == null ? null : tCrit95(xs.length - 1) * sd / Math.sqrt(xs.length));
        });
        
        variables[name] = { ...vs[0], values, lo, hi, ci };
      }
      
      const names = [...new Set(members.map((r) => r.metadata.scenarioName).filter(Boolean))];
      const stem = this.commonStem(members.map((r) => r.name));
      const autoLabel = names.length === 1 ? names[0] : (stem ? stem : `Szenario ${i + 1}`);
      
      return {
        id: `set:${this.hashString(sig)}`,
        name: autoLabel,
        description: null,
        metadata: first.metadata,
        scenario: first.scenario,
        results: { times, nodes: variables },
        createdAt: first.createdAt,
        index: i,
        group: g,
        isSet: true,
        members,
        n: members.length,
        autoLabel,
      };
    });
  }

  // Scenario signature
  @action
  scenarioSignature(run: ViewerRun): string {
    const keys = Object.keys(run.scenario).sort();
    return JSON.stringify([run.metadata.timeStart, run.metadata.timeLength, keys.map((k) => [k, run.scenario[k]])]);
  }

  // Hash string
  @action
  hashString(s: string): string {
    let x = 5381;
    for (let i = 0; i < s.length; i++) x = ((x * 33) ^ s.charCodeAt(i)) >>> 0;
    return x.toString(36);
  }

  // Common stem
  @action
  commonStem(files: string[]): string | null {
    const stems = files.map((f) => f.replace(/\.json$/i, '').replace(/[\-_ ]*(lauf|run)[\-_ ]*\d+/i, ''));
    return stems.every((s) => s === stems[0]) ? stems[0] : null;
  }

  // Collect variables
  @action
  collectVariables(g: ViewerGroup): { name: string; kind: string; unit: string; folder: string }[] {
    const seen = new Map<string, any>();

    for (const run of g.runs) {
      for (const [name, v] of Object.entries(run.results.nodes)) {
        if (!seen.has(name)) {
          seen.set(name, { name, kind: v.kind || 'scalar', unit: v.unit || '', folder: this.folderOf(name, v.kind || 'scalar') });
        }
      }
    }

    const vars = [...seen.values()];
    const order = this.sectionOrder();
    const rank = (f: string) => { const i = order.indexOf(f); return i < 0 ? order.length : i; };
    
    return vars.map((v, i) => ({ v, i })).sort((a, b) => 
      rank(a.v.folder) - rank(b.v.folder) || a.i - b.i
    ).map((x) => x.v);
  }

  // Folder of
  @action
  folderOf(name: string, kind: string): string {
    if (kind === 'population') return POPULATION_GROUP;
    return RESULT_FALLBACK_GROUP;
  }

  // Section order
  @action
  sectionOrder(): string[] {
    return [RESULT_FALLBACK_GROUP];
  }

  // Check aggregation
  @action
  canAggregate(g: ViewerGroup): boolean {
    return g.sets.length < g.runs.length;
  }

  // Is aggregated
  @action
  isAggregated(g: ViewerGroup): boolean {
    const p = this.prefs.aggregate[g.key];
    return this.canAggregate(g) && (p == null ? true : p);
  }

  // Items
  @action
  items(g: ViewerGroup): ViewerRun[] {
    return this.isAggregated(g) ? g.sets : g.runs;
  }

  // Selection key
  @action
  selKey(g: ViewerGroup): string {
    return this.isAggregated(g) ? `${g.key}|sets` : g.key;
  }

  // Selected runs
  @action
  selectedRuns(g: ViewerGroup): ViewerRun[] {
    const list = this.items(g);
    const sel = this.prefs.selection[this.selKey(g)];
    if (!sel) return list.slice(0, MAX_SELECTED);
    const set = new Set(sel);
    return list.filter((r) => set.has(r.id));
  }

  // Set selection
  @action
  setSelection(g: ViewerGroup, ids: string[]): void {
    this.prefs.selection[this.selKey(g)] = ids;
    savePrefs(this.prefs);
    this.onSelectionChanged(g);
  }

  // Toggle run
  @action
  toggleRun(g: ViewerGroup, run: ViewerRun): void {
    const cur = this.selectedRuns(g).map((r) => r.id);
    if (cur.includes(run.id)) {
      this.setSelection(g, cur.filter((id) => id !== run.id));
    } else {
      if (cur.length >= MAX_SELECTED) {
        // TODO: Show toast
        return;
      }
      this.setSelection(g, [...cur, run.id]);
    }
  }

  // Reference run
  @action
  referenceRun(g: ViewerGroup): ViewerRun | null {
    const runs = this.selectedRuns(g);
    const refPath = this.prefs.refs[this.selKey(g)];
    return runs.find((r) => r.id === refPath) || runs[0] || null;
  }

  // On selection changed
  @action
  onSelectionChanged(g: ViewerGroup): void {
    // TODO: Update charts and table
  }

  // Get run label
  @action
  runLabel(run: ViewerRun): string {
    return this.prefs.labels[run.id] || run.name;
  }

  // Initialize chart
  @action
  didInsertChartContainer(element: HTMLElement, variable: any, group: ViewerGroup): void {
    const chart = echarts.init(element, null, { renderer: 'canvas' });
    
    const runs = this.selectedRuns(group);
    if (runs.length === 0) return;
    
    const chartOption = this.buildChartOption(variable, runs, group);
    chart.setOption(chartOption);
    
    // Store chart reference
    const entry: ChartEntry = {
      g: group,
      variable,
      card: element.parentElement?.parentElement || element,
      chartEl: element,
      tableEl: element,
      noteEl: element,
      badge: element,
      titleEl: element,
      focusBtn: element,
      tableBtn: element,
      chart,
      span: 1,
      tableMode: false,
      visible: true,
      dirty: false,
      constant: false,
    };
    this.charts.set(variable.name, entry);
  }

  // Build chart option
  @action
  buildChartOption(variable: any, runs: ViewerRun[], group: ViewerGroup): EChartsOption {
    const colors = chromeColors();
    const c = colors;
    const theme = this.theme;
    
    // Get data for each run
    const seriesList: any[] = [];
    const ref = this.referenceRun(group);
    const delta = this.prefs.delta && ref && runs.length > 0;
    
    const longest = runs.reduce((acc, r) => (r.results.times.length > acc.length ? r.results.times : acc), runs[0]?.results.times || []);
    const times = longest.map(String);
    
    for (const run of runs) {
      if (delta && run === ref) continue;
      
      const nodeData = run.results.nodes[variable.name];
      if (!nodeData || !nodeData.values) continue;
      
      const values = nodeData.values;
      const refValues = delta ? ref?.results.nodes[variable.name]?.values : null;
      
      const data = times.map((_, i) => {
        const x = values[i];
        if (x == null) return null;
        if (!delta) return x;
        const rv = refValues?.[i];
        return rv == null ? null : x - rv;
      });
      
      const color = PALETTE[theme][run.index % PALETTE.light.length];
      
      seriesList.push({
        id: `main:${run.id}`,
        name: this.runLabel(run),
        type: 'line',
        data,
        z: 3,
        color,
        lineStyle: { width: 2 },
        symbol: 'circle',
        symbolSize: 8,
        showSymbol: false,
        itemStyle: { borderColor: c.surface, borderWidth: 2 },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
        blur: { lineStyle: { opacity: 0.25 } },
        connectNulls: false,
      });
    }

    return {
      animation: true,
      animationDuration: 250,
      animationDurationUpdate: 250,
      textStyle: { fontFamily: c.font },
      grid: { left: 8, right: 16, top: 34, bottom: 6, containLabel: true },
      legend: {
        show: runs.length > 1,
        data: seriesList.map((s) => s.name),
        type: 'scroll',
        top: 0,
        left: 8,
        right: undefined,
        icon: 'circle',
        itemWidth: 9,
        itemHeight: 9,
        itemGap: 12,
        textStyle: { color: c.ink2, fontSize: 11 },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line', lineStyle: { color: c.axis, width: 1, type: 'solid' } },
        formatter: (params: any[]) => {
          const unit = variable.unit ? ' ' + variable.unit : '';
          const rows = params
            .filter((p) => String(p.seriesId).startsWith('main:'))
            .map((p) => {
              return `<div><span style="color:${p.color}">●</span> ${p.seriesName}: ${fmtValue(p.value)}${unit}</div>`;
            })
            .join('');
          return `<div><strong>${params[0]?.axisValue}</strong></div>${rows}`;
        },
      },
      xAxis: {
        type: 'category',
        data: times,
        boundaryGap: false,
        axisLine: { lineStyle: { color: c.axis } },
        axisTick: { show: false },
        axisLabel: { color: c.muted, fontSize: 11, hideOverlap: true },
      },
      yAxis: {
        type: 'value',
        scale: !(this.prefs.yZero || delta),
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: c.grid, width: 1, type: 'solid' } },
        axisLabel: { color: c.muted, fontSize: 11, formatter: fmtAxis },
      },
      series: seriesList,
    };
  }

  // Cleanup
  willDestroy(): void {
    super.willDestroy();
    for (const entry of this.charts.values()) {
      if (entry.chart) {
        entry.chart.dispose();
      }
    }
    if (this.io) this.io.disconnect();
    if (this.ro) this.ro.disconnect();
  }
}
