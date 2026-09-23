/**
 * Utility types and functions for the simulation viewer functionality
 * Ported from the standalone viewer prototype in outputs/viewer
 */

export const MAX_SELECTED = 8;
export const BAND_OPACITY = 0.12;
// PNG export in 16:9 slide format (rendered with pixelRatio 2)
export const EXPORT_W = 1280;
export const EXPORT_H = 720;

// Palette for chart colors
export const PALETTE = {
  light: [
    '#2a78d6',
    '#eb6834',
    '#1baf7a',
    '#eda100',
    '#e87ba4',
    '#008300',
    '#4a3aa7',
    '#e34948',
  ],
  dark: [
    '#3987e5',
    '#d95926',
    '#199e70',
    '#c98500',
    '#d55181',
    '#008300',
    '#9085e9',
    '#e66767',
  ],
};

// t-values for 95% confidence interval
export const T95 = [
  12.71, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201,
  2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086,
];

export function tCrit95(df: number): number {
  if (df >= 1 && df <= T95.length) return T95[df - 1]!;
  return df > 60 ? 1.96 : 2.0;
}

// Fallback group names
export const SCENARIO_FALLBACK_GROUP = 'Sonstige Parameter';
export const RESULT_FALLBACK_GROUP = 'Sonstige Kennzahlen';
export const POPULATION_GROUP = 'Populationen · Agenten je Zustand';

/**
 * One output variable as stored in simulation_results.results.nodes
 */
export interface ViewerVariableData {
  kind: 'scalar' | 'population';
  values: (number | null)[];
  unit?: string;
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'boolean') return v ? 1 : 0;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function isAgent(v: unknown): v is { state?: unknown } {
  return !!v && typeof v === 'object' && !Array.isArray(v) && 'state' in v;
}

/**
 * Convert the raw simulation result (keyed by node id, as returned by the SimulationAdapter)
 * into the compact form stored in simulation_results: one numeric series per variable, keyed
 * by node name. Agent populations become one series per state (number of agents in it);
 * vector and record valued outputs one series per element.
 */
export function toViewerNodes(
  nodes: Record<string, { series: unknown }>,
  nameOf: (nodeId: string) => string,
): Record<string, ViewerVariableData> {
  const out: Record<string, ViewerVariableData> = {};

  for (const [nodeId, node] of Object.entries(nodes)) {
    const series = node?.series;
    if (!Array.isArray(series) || series.length === 0) continue;
    const name = nameOf(nodeId);

    if (
      series.every(
        (v) => v == null || typeof v === 'number' || typeof v === 'boolean',
      )
    ) {
      out[name] = { kind: 'scalar', values: series.map(toNumber) };
    } else if (series.some((v) => Array.isArray(v) && v.some(isAgent))) {
      // Agent population: count agents by state
      const counts = new Map<string, number[]>();
      series.forEach((agents, t) => {
        if (!Array.isArray(agents)) return;
        for (const agent of agents) {
          const st = isAgent(agent) ? agent.state : null;
          const states = Array.isArray(st) && st.length ? st : [null];
          for (const s of states) {
            const key = s == null ? '(ohne Zustand)' : nameOf(String(s));
            if (!counts.has(key))
              counts.set(key, new Array(series.length).fill(0));
            counts.get(key)![t]! += 1;
          }
        }
      });
      for (const [stateName, values] of counts) {
        out[`${name} · ${stateName}`] = {
          kind: 'population',
          values,
          unit: 'Agenten',
        };
      }
    } else if (series.some((v) => Array.isArray(v))) {
      const width = Math.max(
        ...series.map((v) => (Array.isArray(v) ? v.length : 0)),
      );
      for (let i = 0; i < width; i++) {
        out[`${name} · ${i + 1}`] = {
          kind: 'scalar',
          values: series.map((v) => (Array.isArray(v) ? toNumber(v[i]) : null)),
        };
      }
    } else if (series.some((v) => v && typeof v === 'object')) {
      const keys = new Set<string>(
        series.flatMap((v): string[] =>
          v && typeof v === 'object'
            ? Object.keys(v as Record<string, unknown>)
            : [],
        ),
      );
      for (const key of keys) {
        out[`${name} · ${key}`] = {
          kind: 'scalar',
          values: series.map((v) =>
            v && typeof v === 'object'
              ? toNumber((v as Record<string, unknown>)[key])
              : null,
          ),
        };
      }
    }
  }

  return out;
}

/**
 * Format number for display
 */
export function fmtValue(v: number | null | undefined): string {
  if (v == null || typeof v !== 'number' || !Number.isFinite(v)) return '–';
  const a = Math.abs(v);
  if (a === 0) return '0';
  if (a < 1)
    return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(
      v,
    );
  if (a < 1000)
    return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(
      v,
    );
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(v);
}

export function fmtAxis(v: number | null | undefined): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '';
  const a = Math.abs(v);
  if (a >= 1e4)
    return new Intl.NumberFormat('de-DE', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(v);
  if (a === 0) return '0';
  if (a < 1)
    return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(
      v,
    );
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(v);
}

export function fmtScenario(v: any): string {
  if (v == null) return '–';
  if (typeof v === 'number')
    return Number.isFinite(v)
      ? new Intl.NumberFormat('de-DE', { maximumFractionDigits: 10 }).format(v)
      : String(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function fmtTimestamp(ts: string | null | undefined): string {
  if (!ts) return '–';
  const d = new Date(ts);
  return Number.isNaN(d.getTime())
    ? String(ts)
    : d.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Compare two values for equality (with tolerance for floating point)
 */
export function sameValue(a: any, b: any): boolean {
  if (typeof a === 'number' && typeof b === 'number')
    return Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a), Math.abs(b));
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Compare version strings
 */
export function compareVersion(a: string, b: string): number {
  const pa = String(a)
    .split('.')
    .map((x) => parseInt(x, 10) || 0);
  const pb = String(b)
    .split('.')
    .map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

/**
 * Get time range string
 */
export function timeRange(meta: any): string {
  return meta.timeStart != null && meta.timeEnd != null
    ? `${meta.timeStart}–${meta.timeEnd}`
    : '';
}

/**
 * Get group key for a run
 */
export function groupKey(meta: any): string {
  const range = timeRange(meta);
  return `${meta.modelName || 'Modell'} v${meta.version || '?'}${range ? ` · ${range}` : ''}`;
}

/**
 * Get chart colors from the Bootstrap CSS variables of the app
 */
export function chromeColors(): {
  ink: string;
  ink2: string;
  muted: string;
  grid: string;
  axis: string;
  surface: string;
  border: string;
  font: string;
} {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string, fallback: string) =>
    cs.getPropertyValue(n).trim() || fallback;
  return {
    ink: v('--bs-emphasis-color', '#000000'),
    ink2: v('--bs-body-color', '#212529'),
    muted: v('--bs-secondary-color', '#6c757d'),
    grid: v('--bs-secondary-bg', '#e9ecef'),
    axis: v('--bs-border-color', '#ced4da'),
    surface: v('--bs-body-bg', '#ffffff'),
    border: v('--bs-border-color', '#dee2e6'),
    font: v('--bs-body-font-family', 'sans-serif'),
  };
}

/**
 * Escape HTML special characters
 */
export function esc(s: string): string {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c]!,
  );
}
