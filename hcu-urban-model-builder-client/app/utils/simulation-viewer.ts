/**
 * Utility types and functions for the simulation viewer functionality
 * Ported from the standalone viewer prototype in outputs/viewer
 */

import * as echarts from 'echarts';
import type { EChartsOption, ECharts } from 'echarts';

export const MAX_SELECTED = 8;
export const BAND_OPACITY = 0.12;

// Palette for chart colors
export const PALETTE = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
};

// t-values for 95% confidence interval
export const T95 = [12.71, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086];

export function tCrit95(df: number): number {
  if (df >= 1 && df <= T95.length) return T95[df - 1];
  return df > 60 ? 1.96 : 2.0;
}

// Fallback group names
export const SCENARIO_FALLBACK_GROUP = 'Sonstige Parameter';
export const RESULT_FALLBACK_GROUP = 'Sonstige Kennzahlen';
export const POPULATION_GROUP = 'Populationen · Agenten je Zustand';

/**
 * Normalize a simulation result to the viewer format
 * This transforms the simulation adapter results into the format expected by the viewer
 */
export interface ViewerRun {
  path: string;
  file: string;
  meta: {
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
  times: (string | number)[];
  variables: Record<string, {
    kind: 'scalar' | 'population';
    values: (number | null)[];
    unit?: string;
    lo?: (number | null)[];
    hi?: (number | null)[];
    ci?: (number | null)[];
    population?: string;
    stateId?: string;
  }>;
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
  sets: any[];
  variables: any[];
}

/**
 * Format number for display
 */
export function fmtValue(v: number | null | undefined): string {
  if (v == null || typeof v !== 'number' || !Number.isFinite(v)) return '–';
  const a = Math.abs(v);
  if (a === 0) return '0';
  if (a < 1) return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(v);
  if (a < 1000) return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(v);
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(v);
}

export function fmtAxis(v: number | null | undefined): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '';
  const a = Math.abs(v);
  if (a >= 1e4) return new Intl.NumberFormat('de-DE', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
  if (a === 0) return '0';
  if (a < 1) return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 4 }).format(v);
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(v);
}

export function fmtScenario(v: any): string {
  if (v == null) return '–';
  if (typeof v === 'number') return Number.isFinite(v) ? new Intl.NumberFormat('de-DE', { maximumFractionDigits: 10 }).format(v) : String(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function fmtTimestamp(ts: string | null | undefined): string {
  if (!ts) return '–';
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? String(ts) : d.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
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
  const pa = String(a).split('.').map((x) => parseInt(x, 10) || 0);
  const pb = String(b).split('.').map((x) => parseInt(x, 10) || 0);
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
  return meta.timeStart != null && meta.timeEnd != null ? `${meta.timeStart}–${meta.timeEnd}` : '';
}

/**
 * Get group key for a run
 */
export function groupKey(meta: any): string {
  const range = timeRange(meta);
  return `${meta.modelName || 'Modell'} v${meta.version || '?'}${range ? ` · ${range}` : ''}`;
}

/**
 * Get color for a run based on its index
 */
export function runColor(run: { index: number }, theme: 'light' | 'dark' = 'light'): string {
  return PALETTE[theme][run.index % PALETTE.light.length];
}

/**
 * Get the current theme from the document or preferences
 */
export function currentTheme(prefsTheme: string | null | undefined): 'light' | 'dark' {
  if (prefsTheme) return prefsTheme as 'light' | 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get chart theme colors from CSS variables
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
  const v = (n: string) => cs.getPropertyValue(n).trim();
  return {
    ink: v('--text-primary'),
    ink2: v('--text-secondary'),
    muted: v('--text-muted'),
    grid: v('--gridline'),
    axis: v('--axis'),
    surface: v('--surface-1'),
    border: v('--border-strong'),
    font: v('--font'),
  };
}

/**
 * Escape HTML special characters
 */
export function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

/**
 * Normalize simulation export to viewer format
 */
export function normalizeExport(json: any, path: string): ViewerRun | null {
  if (!json || typeof json !== 'object' || !json.metadata || !json.results || typeof json.results.nodes !== 'object') 
    return null;

  const meta = json.metadata;
  const times = Array.isArray(json.results.times) 
    ? json.results.times.map((t) => (typeof t === 'number' ? t : String(t))) 
    : [];
  
  const variables: Record<string, any> = {};
  
  for (const [name, node] of Object.entries(json.results.nodes)) {
    const series = node && node.series;
    if (!Array.isArray(series) || series.length === 0) continue;
    
    if (series.every((v) => v == null || typeof v === 'number' || typeof v === 'boolean')) {
      variables[name] = {
        kind: 'scalar',
        values: series.map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : (typeof v === 'number' && Number.isFinite(v) ? v : null)))
      };
    } else if (series.some((v) => Array.isArray(v))) {
      // Agenten-Population: count agents by state
      const counts = new Map<string, number[]>();
      series.forEach((agents, t) => {
        if (!Array.isArray(agents)) return;
        for (const ag of agents) {
          const st = ag && ag.state;
          const states = Array.isArray(st) ? st : [st];
          for (const s of states) {
            const key = s == null ? '(ohne Zustand)' : String(s);
            if (!counts.has(key)) counts.set(key, new Array(series.length).fill(0));
            counts.get(key)![t] += 1;
          }
        }
      });
      for (const [stateId, values] of counts) {
        variables[`${name} · ${stateId}`] = { kind: 'population', values, population: name, stateId, unit: 'Agenten' };
      }
    }
  }

  const file = path.split('/').pop() || path;
  return {
    path,
    file,
    meta,
    scenario: json.scenario && typeof json.scenario === 'object' ? json.scenario : {},
    times,
    variables,
    index: 0,
    group: null,
  };
}

/**
 * Get chart theme based on current theme
 */
export function getEChartsTheme(theme: 'light' | 'dark'): string | object {
  // Return the appropriate ECharts theme based on the current UI theme
  // For now, we'll just return the theme name, but we could define custom themes
  return theme === 'dark' ? 'dark' : 'light';
}
