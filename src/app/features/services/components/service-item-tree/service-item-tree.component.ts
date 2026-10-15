import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ThumbComponent } from '../../../../shared/components/thumb/thumb.component';
import { ServiceItem, hasSubItems } from '../../models/service-item.model';
import { formatSubItemCount } from '../../utils/service-item-labels.util';

/**
 * Presentational two-level tree of a service's items: root items ("أصناف"),
 * each expandable to show its sub-items ("أنواع").
 *
 * Stateless by design — the expanded set lives with the caller so it survives
 * data reloads (rows are tracked by id) and can be driven programmatically,
 * e.g. to reveal a parent right after one of its types was added.
 */
@Component({
  selector: 'app-service-item-tree',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThumbComponent],
  templateUrl: './service-item-tree.component.html',
  styleUrl: './service-item-tree.component.scss',
})
export class ServiceItemTreeComponent {
  /** Root items, each carrying its `subItems`. */
  readonly items = input.required<ServiceItem[]>();
  readonly expandedIds = input<ReadonlySet<number>>(new Set());

  readonly toggle = output<ServiceItem>();
  readonly addSubItem = output<ServiceItem>();
  readonly edit = output<ServiceItem>();
  readonly remove = output<ServiceItem>();

  protected readonly hasSubItems = hasSubItems;
  protected readonly formatSubItemCount = formatSubItemCount;

  protected isExpanded(item: ServiceItem): boolean {
    return hasSubItems(item) && this.expandedIds().has(item.id);
  }

  protected onRowToggle(item: ServiceItem): void {
    if (hasSubItems(item)) this.toggle.emit(item);
  }
}
