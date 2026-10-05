import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

export type ChartEditorVariable = {
  name: string;
  selected: boolean;
};

// Where a variable's values come from within one result: its batch median,
// the spread band, or a single run ("run-<index>").
export type ChartEditorSource = {
  id: string;
  label: string;
};

export type ChartEditorResult = {
  id: string;
  name: string;
  sources: ChartEditorSource[];
  selectedSourceIds: string[];
  variables: ChartEditorVariable[];
};

interface ChartEditorSidebarSignature {
  Args: {
    open: boolean;
    results: ChartEditorResult[];
    currentResultId: string | null;
    loading?: boolean;
    tightYAxis: boolean;
    onToggleTightYAxis: (event: Event) => void;
    onToggleSidebar: () => void;
    onToggleVariable: (resultId: string, variableName: string) => void;
    onChangeSources: (resultId: string, sources: ChartEditorSource[]) => void;
  };
  Element: HTMLElement;
}

export default class ChartEditorSidebarComponent extends Component<ChartEditorSidebarSignature> {
  // null until the user expands/collapses something themselves, so the
  // result the chart was opened from starts expanded even though the results
  // (and currentResultId) arrive after the sidebar has rendered.
  @tracked private userExpandedResultIds: string[] | null = null;
  // One search term shared by every result's filter field, so a variable
  // searched for in one result is already filtered when opening the next.
  @tracked search = '';
  // The content only fades in once the sidebar has finished widening, so its
  // reflow at intermediate widths is never visible.
  @tracked private revealed = false;
  private revealFallback?: ReturnType<typeof setTimeout>;

  get isRevealed() {
    return this.args.open && this.revealed;
  }

  @action syncReveal(element: HTMLElement) {
    clearTimeout(this.revealFallback);
    this.revealed = false;
    if (!this.args.open) return;
    // No width transition (reduced motion) means there is no transitionend
    // to wait for; the timeout covers the width not changing at all.
    const duration = Number.parseFloat(
      getComputedStyle(element).transitionDuration,
    );
    if (!duration) {
      this.revealed = true;
      return;
    }
    this.revealFallback = setTimeout(
      () => {
        if (!this.isDestroying && !this.isDestroyed) this.revealed = true;
      },
      duration * 1000 + 100,
    );
  }

  @action handleTransitionEnd(event: TransitionEvent) {
    // Ignore transitions bubbling up from the content itself.
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== 'width' || !this.args.open) return;
    clearTimeout(this.revealFallback);
    this.revealed = true;
  }

  willDestroy() {
    super.willDestroy();
    clearTimeout(this.revealFallback);
  }

  get expandedResultIds(): string[] {
    if (this.userExpandedResultIds) return this.userExpandedResultIds;
    return this.args.currentResultId ? [this.args.currentResultId] : [];
  }

  @action isExpanded(resultId: string) {
    return this.expandedResultIds.includes(resultId);
  }

  @action toggleResult(resultId: string) {
    const expanded = this.expandedResultIds;
    this.userExpandedResultIds = expanded.includes(resultId)
      ? expanded.filter((id) => id !== resultId)
      : [...expanded, resultId];
  }

  @action updateSearch(event: Event) {
    this.search = (event.target as HTMLInputElement).value;
  }

  @action filteredVariables(result: ChartEditorResult) {
    const query = this.search.trim().toLocaleLowerCase();
    return query
      ? result.variables.filter((variable) =>
          variable.name.toLocaleLowerCase().includes(query),
        )
      : result.variables;
  }

  @action selectedCount(result: ChartEditorResult) {
    return result.variables.filter((variable) => variable.selected).length;
  }

  @action isSourceSelected(result: ChartEditorResult, sourceId: string) {
    return result.selectedSourceIds.includes(sourceId);
  }

  @action selectedSourcesLabel(result: ChartEditorResult) {
    return result.sources
      .filter((source) => result.selectedSourceIds.includes(source.id))
      .map((source) => source.label)
      .join(', ');
  }

  @action toggleSource(result: ChartEditorResult, sourceId: string) {
    const selected = this.isSourceSelected(result, sourceId)
      ? result.selectedSourceIds.filter((id) => id !== sourceId)
      : [...result.selectedSourceIds, sourceId];
    this.args.onChangeSources(
      result.id,
      result.sources.filter((source) => selected.includes(source.id)),
    );
  }
}
