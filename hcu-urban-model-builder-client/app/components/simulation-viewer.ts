/**
 * Simulation Viewer Component
 *
 * This component provides the viewer functionality for comparing multiple simulation runs
 * stored in the simulation-results service. It ports the key features from the standalone
 * viewer prototype (outputs/viewer):
 * - Multiple run selection and comparison
 * - Averaging of runs with identical scenario values (mean line + band)
 * - Scenario value table with the parameters that differ between the selected runs
 * - One chart per output variable, PNG export in slide format
 */

import { action } from '@ember/object';
import { service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { htmlSafe } from '@ember/template';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import type FeathersService from 'hcu-urban-model-builder-client/services/feathers';
import type ModelsVersion from 'hcu-urban-model-builder-client/models/models-version';
import {
  MAX_SELECTED,
  PALETTE,
  BAND_OPACITY,
  EXPORT_W,
  EXPORT_H,
  type ViewerVariableData,
  esc,
  fmtValue,
  fmtAxis,
  fmtScenario,
  fmtTimestamp,
  sameValue,
  compareVersion,
  timeRange,
  groupKey,
  chromeColors,
  tCrit95,
} from '../utils/simulation-viewer';

// Local storage key
const LS_KEY = 'umb-simulation-viewer:v1';

// Types
type Series = (number | null)[];

interface ViewerNode extends ViewerVariableData {
  lo?: Series;
  hi?: Series;
  ci?: Series;
}

export interface ViewerRun {
  id: string;
  name: string;
  // unique within its list – used in chips and legends
  label: string;
  description: string | null;
  metadata: {
    modelId: string;
    modelName: string;
    version: string;
    timeStart: number;
    timeLength: number;
    timeEnd: number;
    downloadTimestamp: string;
    // set for runs saved as a batch
    run?: number;
    runs?: number;
  };
  scenario: Record<string, unknown>;
  results: {
    times: (string | number)[];
    nodes: Record<string, ViewerNode>;
  };
  createdAt: string;
  index: number;
  isSet?: boolean;
  members?: ViewerRun[];
  n?: number;
}

export interface ViewerVariable {
  name: string;
  kind: string;
  unit: string;
}

export interface ViewerGroup {
  key: string;
  name: string;
  version: string;
  range: string;
  runs: ViewerRun[];
  sets: ViewerRun[];
  variables: ViewerVariable[];
}

type BandMode = 'range' | 'ci' | 'none';

interface ViewerPrefs {
  selection: Record<string, string[]>;
  yZero: boolean;
  delta: boolean;
  aggregate: Record<string, boolean>;
  band: BandMode;
}

// Default preferences
function defaultPrefs(): ViewerPrefs {
  return {
    selection: {},
    yZero: false,
    delta: false,
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
    reloadKey?: number;
  };
  Blocks: {
    default: [];
  };
  Element: HTMLDivElement;
}

export default class SimulationViewerComponent extends Component<SimulationViewerSignature> {
  @service declare feathers: FeathersService;

  // Preferences – always replaced as a whole so that templates and charts update
  @tracked prefs: ViewerPrefs = loadPrefs();

  // Data
  @tracked groups: Map<string, ViewerGroup> = new Map();
  @tracked activeKey: string | null = null;
  @tracked isLoading = false;
  @tracked error: string | null = null;

  maxSelected = MAX_SELECTED;

  constructor(owner: unknown, args: SimulationViewerSignature['Args']) {
    super(owner, args);
    this.loadData();
  }

  get groupList(): ViewerGroup[] {
    return [...this.groups.values()];
  }

  get activeGroup(): ViewerGroup | null {
    return (
      (this.activeKey && this.groups.get(this.activeKey)) ||
      this.groupList[0] ||
      null
    );
  }

  // Load data
  @action
  async loadData(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      // No $sort: the permission filter hook of the service prefixes every query key with the
      // table name. The groups are sorted below anyway.
      const results = await this.feathers.app
        .service('simulation-results' as any)
        .find({
          query: { modelsVersionsId: this.args.model.id },
        });
      if (this.isDestroying || this.isDestroyed) return;

      const data: any[] = Array.isArray(results) ? results : results.data;
      this.groups = this.buildGroups(
        data.map((r) => this.normalizeToViewerRun(r)),
      );
      if (!this.activeKey || !this.groups.has(this.activeKey)) {
        this.activeKey = this.groupList[0]?.key ?? null;
      }
    } catch (e) {
      console.error('Failed to load simulation results:', e);
      this.error = 'Fehler beim Laden der Simulationsergebnisse';
    } finally {
      if (!this.isDestroying && !this.isDestroyed) {
        this.isLoading = false;
      }
    }
  }

  // Normalize backend result to viewer run
  normalizeToViewerRun(result: any): ViewerRun {
    const { run, runs } = result.metadata ?? {};
    return {
      id: result.id,
      name: result.name,
      label: runs > 1 && run ? `${result.name} · Lauf ${run}` : result.name,
      description: result.description,
      metadata: result.metadata,
      scenario: result.scenario ?? {},
      results: result.results,
      createdAt: result.createdAt,
      index: 0,
    };
  }

  buildGroups(runs: ViewerRun[]): Map<string, ViewerGroup> {
    const groups = new Map<string, ViewerGroup>();

    for (const run of runs) {
      const key = groupKey(run.metadata);
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          name: run.metadata.modelName || 'Modell',
          version: run.metadata.version || '?',
          range: timeRange(run.metadata),
          runs: [],
          sets: [],
          variables: [],
        });
      }
      groups.get(key)!.runs.push(run);
    }

    const sorted = [...groups.values()].sort(
      (a, b) =>
        a.name.localeCompare(b.name) || compareVersion(b.version, a.version),
    );

    for (const g of sorted) {
      g.runs.sort(
        (a, b) =>
          String(a.metadata.downloadTimestamp || a.createdAt).localeCompare(
            String(b.metadata.downloadTimestamp || b.createdAt),
          ) || a.name.localeCompare(b.name),
      );
      g.runs.forEach((r, i) => (r.index = i));
      this.makeLabelsUnique(g.runs);
      g.sets = this.buildSets(g);
      this.makeLabelsUnique(g.sets);
      g.variables = this.collectVariables(g);
    }

    return new Map(sorted.map((g) => [g.key, g]));
  }

  // Runs with identical scenario values are averaged into one set
  buildSets(g: ViewerGroup): ViewerRun[] {
    const bySig = new Map<string, ViewerRun[]>();

    for (const run of g.runs) {
      const sig = this.scenarioSignature(run);
      if (!bySig.has(sig)) bySig.set(sig, []);
      bySig.get(sig)!.push(run);
    }

    return [...bySig.entries()].map(([sig, members], i) => {
      const first = members[0]!;
      const times = members.reduce(
        (acc, r) =>
          r.results.times.length > acc.length ? r.results.times : acc,
        first.results.times,
      );

      const nodes: Record<string, ViewerNode> = {};
      for (const name of new Set(
        members.flatMap((r) => Object.keys(r.results.nodes)),
      )) {
        const vs = members
          .map((r) => r.results.nodes[name])
          .filter(Boolean) as ViewerNode[];
        const values: Series = [];
        const lo: Series = [];
        const hi: Series = [];
        const ci: Series = [];

        times.forEach((_, t) => {
          const xs = vs
            .map((v) => v.values?.[t])
            .filter((x): x is number => x != null);
          const m = xs.length
            ? xs.reduce((a, b) => a + b, 0) / xs.length
            : null;
          values.push(m);
          lo.push(xs.length ? Math.min(...xs) : null);
          hi.push(xs.length ? Math.max(...xs) : null);
          // half width of the 95 % confidence interval of the mean (t distribution)
          const sd =
            xs.length > 1
              ? Math.sqrt(
                  xs.reduce((a, x) => a + (x - m!) ** 2, 0) / (xs.length - 1),
                )
              : null;
          ci.push(
            sd == null
              ? null
              : (tCrit95(xs.length - 1) * sd) / Math.sqrt(xs.length),
          );
        });

        nodes[name] = { ...vs[0]!, values, lo, hi, ci };
      }

      const names = [...new Set(members.map((r) => r.name))];
      const label =
        names.length === 1
          ? names[0]!
          : this.commonStem(names) || `Szenario ${i + 1}`;

      return {
        id: `set:${this.hashString(sig)}`,
        name: label,
        label,
        description: null,
        metadata: first.metadata,
        scenario: first.scenario,
        results: { times, nodes },
        createdAt: first.createdAt,
        index: i,
        isSet: true,
        members,
        n: members.length,
      };
    });
  }

  makeLabelsUnique(list: ViewerRun[]): void {
    const total = new Map<string, number>();
    for (const r of list) total.set(r.label, (total.get(r.label) ?? 0) + 1);
    const seen = new Map<string, number>();
    for (const r of list) {
      if (total.get(r.label)! < 2) continue;
      const k = (seen.get(r.label) ?? 0) + 1;
      seen.set(r.label, k);
      r.label = `${r.label} (${k})`;
    }
  }

  scenarioSignature(run: ViewerRun): string {
    const keys = Object.keys(run.scenario).sort();
    return JSON.stringify([
      run.metadata.timeStart,
      run.metadata.timeLength,
      keys.map((k) => [k, run.scenario[k]]),
    ]);
  }

  hashString(s: string): string {
    let x = 5381;
    for (let i = 0; i < s.length; i++) x = ((x * 33) ^ s.charCodeAt(i)) >>> 0;
    return x.toString(36);
  }

  commonStem(names: string[]): string | null {
    const stems = names.map((f) =>
      f.replace(/[-_ ]*(lauf|run)[-_ ]*\d+/i, '').trim(),
    );
    return stems.every((s) => s === stems[0]) && stems[0] ? stems[0] : null;
  }

  collectVariables(g: ViewerGroup): ViewerVariable[] {
    const seen = new Map<string, ViewerVariable>();

    for (const run of g.runs) {
      for (const [name, v] of Object.entries(run.results.nodes)) {
        if (!seen.has(name)) {
          seen.set(name, {
            name,
            kind: v.kind || 'scalar',
            unit: v.unit || '',
          });
        }
      }
    }

    // populations after the scalar outputs, otherwise in the order of the export
    return [...seen.values()]
      .map((v, i) => ({ v, i }))
      .sort(
        (a, b) =>
          Number(a.v.kind === 'population') -
            Number(b.v.kind === 'population') || a.i - b.i,
      )
      .map((x) => x.v);
  }

  // Preferences
  updatePrefs(patch: Partial<ViewerPrefs>): void {
    this.prefs = { ...this.prefs, ...patch };
    savePrefs(this.prefs);
  }

  @action
  selectGroup(g: ViewerGroup): void {
    this.activeKey = g.key;
  }

  @action
  canAggregate(g: ViewerGroup): boolean {
    return g.sets.length < g.runs.length;
  }

  // Averaging is on by default as soon as a scenario has several runs
  @action
  isAggregated(g: ViewerGroup): boolean {
    const p = this.prefs.aggregate[g.key];
    return this.canAggregate(g) && (p == null ? true : p);
  }

  @action
  toggleAggregate(g: ViewerGroup): void {
    this.updatePrefs({
      aggregate: { ...this.prefs.aggregate, [g.key]: !this.isAggregated(g) },
    });
  }

  @action
  items(g: ViewerGroup): ViewerRun[] {
    return this.isAggregated(g) ? g.sets : g.runs;
  }

  selKey(g: ViewerGroup): string {
    return this.isAggregated(g) ? `${g.key}|sets` : g.key;
  }

  @action
  selectedRuns(g: ViewerGroup): ViewerRun[] {
    const list = this.items(g);
    const sel = this.prefs.selection[this.selKey(g)];
    if (!sel) return list.slice(0, MAX_SELECTED);
    const set = new Set(sel);
    return list.filter((r) => set.has(r.id));
  }

  @action
  isSelected(g: ViewerGroup, run: ViewerRun): boolean {
    return this.selectedRuns(g).includes(run);
  }

  setSelection(g: ViewerGroup, ids: string[]): void {
    this.updatePrefs({
      selection: { ...this.prefs.selection, [this.selKey(g)]: ids },
    });
  }

  @action
  toggleRun(g: ViewerGroup, run: ViewerRun): void {
    const cur = this.selectedRuns(g).map((r) => r.id);
    if (cur.includes(run.id)) {
      this.setSelection(
        g,
        cur.filter((id) => id !== run.id),
      );
    } else if (cur.length < MAX_SELECTED) {
      this.setSelection(g, [...cur, run.id]);
    }
  }

  @action
  selectAll(g: ViewerGroup): void {
    this.setSelection(
      g,
      this.items(g)
        .slice(0, MAX_SELECTED)
        .map((r) => r.id),
    );
  }

  @action
  setBand(event: Event): void {
    this.updatePrefs({
      band: (event.target as HTMLSelectElement).value as BandMode,
    });
  }

  @action
  togglePref(key: 'yZero' | 'delta'): void {
    this.updatePrefs({ [key]: !this.prefs[key] });
  }

  // The reference for the Δ view is the first selected run
  referenceRun(g: ViewerGroup): ViewerRun | null {
    return this.selectedRuns(g)[0] ?? null;
  }

  runColor(run: ViewerRun): string {
    return PALETTE.light[run.index % PALETTE.light.length]!;
  }

  @action
  chipStyle(run: ViewerRun) {
    return htmlSafe(`--c: ${this.runColor(run)}`);
  }

  @action
  runTitle(run: ViewerRun): string {
    if (run.isSet) {
      return `Mittelwert aus ${run.n} ${run.n === 1 ? 'Lauf' : 'Läufen'}:\n${run.members!.map((m) => `${m.label} (${fmtTimestamp(m.createdAt)})`).join('\n')}`;
    }
    return [run.name, fmtTimestamp(run.createdAt), run.description]
      .filter(Boolean)
      .join('\n');
  }

  // Note shown instead of the charts when there is nothing to draw
  @action
  chartNote(g: ViewerGroup): string | null {
    const runs = this.selectedRuns(g);
    if (runs.length === 0) return 'Kein Lauf ausgewählt.';
    if (this.prefs.delta && runs.length === 1) {
      return 'Δ-Ansicht: mindestens einen weiteren Lauf neben der Referenz auswählen.';
    }
    return null;
  }

  // Scenario parameters that differ between the selected runs
  @action
  scenarioDiff(g: ViewerGroup) {
    const runs = this.selectedRuns(g);
    const ref = runs[0];
    if (!ref || runs.length < 2) return null;

    const names = [
      ...new Set(runs.flatMap((r) => Object.keys(r.scenario))),
    ].sort((a, b) => a.localeCompare(b, 'de'));
    const rows = names
      .filter((name) =>
        runs.some((r) => !sameValue(r.scenario[name], ref.scenario[name])),
      )
      .map((name) => ({
        name,
        cells: runs.map((r) => ({
          text: fmtScenario(r.scenario[name]),
          differs:
            r !== ref && !sameValue(r.scenario[name], ref.scenario[name]),
        })),
      }));

    return { runs, rows };
  }

  bandNote(runs: ViewerRun[]): string {
    const sets = runs.filter((r) => r.isSet && r.n! > 1);
    if (!sets.length) return '';
    const ns = [...new Set(sets.map((r) => r.n))];
    const area = {
      range: ' · Fläche: Spannweite der Läufe (Min–Max)',
      ci: ' · Fläche: 95-%-Konfidenzintervall des Mittelwerts',
      none: '',
    }[this.prefs.band];
    return `Linie: Mittelwert aus ${ns.join('/')} Läufen je Szenario${area}`;
  }

  @action
  groupNote(g: ViewerGroup): string {
    return this.bandNote(this.selectedRuns(g));
  }

  seriesFor(variable: ViewerVariable, g: ViewerGroup, runs: ViewerRun[]) {
    const ref = this.referenceRun(g);
    const delta = this.prefs.delta && !!ref;
    const longest = runs.reduce(
      (acc, r) => (r.results.times.length > acc.length ? r.results.times : acc),
      runs[0]?.results.times ?? [],
    );
    const times = longest.map(String);
    const list: {
      run: ViewerRun;
      data: Series;
      band: { lo: Series; hi: Series } | null;
    }[] = [];

    for (const run of runs) {
      if (delta && run === ref) continue;
      const v = run.results.nodes[variable.name];
      const values = v?.values ?? [];
      const refValues = delta
        ? (ref!.results.nodes[variable.name]?.values ?? [])
        : null;
      const data = times.map((_, i) => {
        const x = values[i];
        if (x == null) return null;
        if (!refValues) return x;
        const rv = refValues[i];
        return rv == null ? null : x - rv;
      });

      // band only in the absolute view – the difference of two means has no min/max envelope
      const mode = this.prefs.band;
      let band: { lo: Series; hi: Series } | null = null;
      if (!delta && mode !== 'none' && run.isSet && run.n! > 1 && v?.lo) {
        band =
          mode === 'ci'
            ? {
                lo: times.map((_, i) =>
                  v.values[i] == null || v.ci![i] == null
                    ? null
                    : v.values[i]! - v.ci![i]!,
                ),
                hi: times.map((_, i) =>
                  v.values[i] == null || v.ci![i] == null
                    ? null
                    : v.values[i]! + v.ci![i]!,
                ),
              }
            : {
                lo: times.map((_, i) => v.lo![i] ?? null),
                hi: times.map((_, i) => v.hi![i] ?? null),
              };
      }
      list.push({ run, data, band });
    }

    return { times, list, delta, ref };
  }

  // Build chart option; exp = true renders the PNG export (title, larger font, no animation)
  @action
  chartOption(
    variable: ViewerVariable,
    g: ViewerGroup,
    exp = false,
  ): EChartsOption {
    const c = chromeColors();
    const runs = this.selectedRuns(g);
    const { times, list, delta, ref } = this.seriesFor(variable, g, runs);
    const fs = exp ? 15 : 11;

    const series: any[] = list.map(({ run, data }) => ({
      id: `main:${run.id}`,
      name: run.label,
      type: 'line',
      data,
      z: 3,
      color: this.runColor(run),
      lineStyle: { width: exp ? 3 : 2 },
      symbol: 'circle',
      symbolSize: 8,
      showSymbol: false,
      itemStyle: { borderColor: c.surface, borderWidth: 2 },
      emphasis: { focus: 'series', lineStyle: { width: 3 } },
      blur: { lineStyle: { opacity: 0.25 } },
      connectNulls: false,
    }));
    const legendNames = series.map((s) => s.name);

    // Band as a stacked pair of areas (invisible lower bound + width). Same name as the line so
    // the legend toggles both together; filtered out of the tooltip.
    for (const { run, band } of list) {
      if (!band) continue;
      const common = {
        name: run.label,
        type: 'line',
        stack: `band:${run.id}`,
        stackStrategy: 'all',
        color: this.runColor(run),
        symbol: 'none',
        silent: true,
        z: 1,
        lineStyle: { width: 0, opacity: 0 },
        emphasis: { disabled: true },
        connectNulls: false,
      };
      series.push({ ...common, id: `lo:${run.id}`, data: band.lo });
      series.push({
        ...common,
        id: `band:${run.id}`,
        data: band.hi.map((x, i) =>
          x == null || band.lo[i] == null ? null : x - band.lo[i]!,
        ),
        areaStyle: { color: this.runColor(run), opacity: BAND_OPACITY },
      });
    }
    const bandByName = new Map(
      list.filter((l) => l.band).map((l) => [l.run.label, l.band!]),
    );

    if (delta && series.length) {
      series[0].markLine = {
        silent: true,
        symbol: 'none',
        animation: false,
        lineStyle: { color: c.axis, width: 1, type: 'solid' },
        label: { show: false },
        data: [{ yAxis: 0 }],
      };
    }

    const multi = legendNames.length > 1;
    const unit = variable.unit ? ` ${variable.unit}` : '';
    const sub = [
      delta && ref ? `Δ zu ${ref.label}` : '',
      this.bandNote(runs),
      `${g.name} v${g.version}${g.range ? ` · ${g.range}` : ''}`,
    ]
      .filter(Boolean)
      .join(' · ');
    // export: the legend wraps with long scenario names – estimate the rows
    const legendRows =
      exp && multi
        ? Math.max(
            1,
            Math.ceil(
              legendNames.reduce(
                (w, n) => w + n.length * 15 * 0.56 + 12 + 5 + 22,
                0,
              ) /
                (EXPORT_W - 60),
            ),
          )
        : 1;
    const top = exp ? (multi ? 96 + legendRows * 37 : 84) : multi ? 34 : 14;

    return {
      animation: !exp,
      animationDuration: 250,
      animationDurationUpdate: 250,
      textStyle: { fontFamily: c.font },
      title: exp
        ? {
            text: `${variable.name}${unit ? ` (${variable.unit})` : ''}`,
            subtext: sub,
            left: 20,
            top: 14,
            itemGap: 8,
            textStyle: { color: c.ink, fontSize: 24, fontWeight: 600 },
            subtextStyle: { color: c.muted, fontSize: 14 },
          }
        : undefined,
      grid: {
        left: exp ? 20 : 8,
        right: exp ? 36 : 16,
        top,
        bottom: exp ? 20 : 6,
        containLabel: true,
      },
      legend: {
        show: multi,
        data: legendNames,
        type: exp ? 'plain' : 'scroll',
        top: exp ? 82 : 0,
        left: exp ? 20 : 8,
        right: exp ? 36 : undefined,
        icon: 'circle',
        itemWidth: exp ? 12 : 9,
        itemHeight: exp ? 12 : 9,
        itemGap: exp ? 22 : 12,
        textStyle: { color: c.ink2, fontSize: exp ? 15 : 11 },
      },
      tooltip: exp
        ? { show: false }
        : {
            trigger: 'axis',
            appendToBody: true,
            backgroundColor: c.surface,
            borderColor: c.border,
            borderWidth: 1,
            textStyle: { color: c.ink, fontSize: 12 },
            extraCssText:
              'box-shadow: 0 6px 20px rgba(0,0,0,.14); border-radius: 8px;',
            axisPointer: {
              type: 'line',
              lineStyle: { color: c.axis, width: 1, type: 'solid' },
            },
            formatter: (params: any) => {
              const ps = (Array.isArray(params) ? params : [params]) as any[];
              const rows = ps
                .filter((p) => String(p.seriesId).startsWith('main:'))
                .map((p) => {
                  const b = bandByName.get(p.seriesName);
                  const range =
                    b && b.lo[p.dataIndex] != null
                      ? ` <span style="color:${c.muted}">(${fmtValue(b.lo[p.dataIndex])} – ${fmtValue(b.hi[p.dataIndex])})</span>`
                      : '';
                  return `<div><span style="color:${p.color}">●</span> ${esc(p.seriesName)}: <strong>${fmtValue(p.value)}${esc(unit)}</strong>${range}</div>`;
                })
                .join('');
              const note = bandByName.size
                ? `<div style="color:${c.muted}">Mittelwert · ${this.prefs.band === 'ci' ? '95-%-Intervall des Mittelwerts' : 'Spannweite der Läufe'}</div>`
                : '';
              return `<div><strong>${esc(ps[0]?.axisValue ?? '')}${delta && ref ? ` · Δ zu ${esc(ref.label)}` : ''}</strong></div>${rows}${note}`;
            },
          },
      xAxis: {
        type: 'category',
        data: times,
        boundaryGap: false,
        axisLine: { lineStyle: { color: c.axis } },
        axisTick: { show: false },
        axisLabel: { color: c.muted, fontSize: fs, hideOverlap: true },
      },
      yAxis: {
        type: 'value',
        scale: !(this.prefs.yZero || delta),
        splitNumber: exp ? 5 : 4,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: c.grid, width: 1, type: 'solid' } },
        axisLabel: { color: c.muted, fontSize: fs, formatter: fmtAxis },
      },
      series,
    };
  }

  // PNG in 16:9 slide format, independent of the card size
  @action
  downloadPng(variable: ViewerVariable, g: ViewerGroup): void {
    if (!this.selectedRuns(g).length) return;

    const el = document.createElement('div');
    el.style.cssText = `position:fixed;left:-20000px;top:0;width:${EXPORT_W}px;height:${EXPORT_H}px`;
    document.body.append(el);
    const chart = echarts.init(el, null, {
      renderer: 'canvas',
      width: EXPORT_W,
      height: EXPORT_H,
    });
    try {
      chart.setOption(this.chartOption(variable, g, true));
      const url = chart.getDataURL({
        type: 'png',
        pixelRatio: 2,
        backgroundColor: chromeColors().surface,
      });
      const range = g.range ? `_${g.range}` : '';
      const a = document.createElement('a');
      a.href = url;
      a.download =
        `${g.name}_v${g.version}${range}_${variable.name}.png`.replace(
          /[^\w.\-–·]+/g,
          '_',
        );
      document.body.append(a);
      a.click();
      a.remove();
    } finally {
      chart.dispose();
      el.remove();
    }
  }
}
