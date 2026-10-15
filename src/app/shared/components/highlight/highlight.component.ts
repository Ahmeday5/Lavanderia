import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toLatinDigits } from '../../../core/utils/local-search.util';

interface Segment {
  text: string;
  match: boolean;
}

/**
 * Renders `text` with every occurrence of the query's words wrapped in
 * `<mark>` — no `innerHTML`, so user data can never inject markup.
 *
 *   <app-highlight [text]="laundry.name" [query]="query()" />
 *
 * Case-insensitive; Arabic-Indic digits match their Latin twins (the mapping
 * is one character to one, so match offsets stay valid on the original text);
 * a leading `#` (id search) is ignored.
 */
@Component({
  selector: 'app-highlight',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@for (segment of segments(); track $index) {@if (segment.match) {<mark>{{ segment.text }}</mark>} @else {{{ segment.text }}}}`,
  styles: [
    `
      mark {
        padding: 0 1px;
        border-radius: 3px;
        background: rgba(237, 161, 0, 0.28);
        color: inherit;
      }
    `,
  ],
})
export class HighlightComponent {
  readonly text = input.required<string>();
  readonly query = input<string>('');

  protected readonly segments = computed<Segment[]>(() => splitByQuery(this.text(), this.query()));
}

export function splitByQuery(text: string, query: string): Segment[] {
  const terms = toLatinDigits(query)
    .split(/\s+/)
    .map((term) => term.replace(/^#/, ''))
    .filter((term) => term.length > 0)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!text || terms.length === 0) return [{ text, match: false }];

  // Longest first, so "0912" wins over "09" at the same position.
  const pattern = new RegExp(terms.sort((a, b) => b.length - a.length).join('|'), 'gi');
  const haystack = toLatinDigits(text);
  const segments: Segment[] = [];
  let last = 0;
  for (const match of haystack.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (match[0].length === 0) continue;
    if (start > last) segments.push({ text: text.slice(last, start), match: false });
    segments.push({ text: text.slice(start, start + match[0].length), match: true });
    last = start + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), match: false });
  return segments.length ? segments : [{ text, match: false }];
}
