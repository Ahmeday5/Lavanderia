import type Quill from 'quill';
import type { StyleAttributor } from 'parchment';
import type { QuillModules } from 'ngx-quill';
import { loadStylesheet } from '../../../core/utils/stylesheet-loader.util';

/** Non-injected style bundle declared in `angular.json` (`bundleName: "quill-snow"`). */
const QUILL_STYLESHEET = 'quill-snow.css';

/** Font sizes offered in the toolbar — `false` is the default (unset) size. */
export const FONT_SIZES: readonly (string | false)[] = ['13px', false, '18px', '24px'];

/**
 * Formats the editor accepts. Anything else — including markup pasted from
 * Word or web pages — is stripped on input, which keeps stored HTML small
 * and renderable by the mobile apps.
 */
export const RICH_TEXT_FORMATS: string[] = [
  'header',
  'size',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'list',
  'indent',
  'align',
  'direction',
  'blockquote',
  'link',
];

const TOOLBAR = [
  ['undo', 'redo'],
  [{ header: [1, 2, 3, false] }],
  [{ size: [...FONT_SIZES] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  // RTL-first: the default ('' → unset) is start = right; 'left' is explicit.
  [{ align: ['', 'center', 'left', 'justify'] }],
  ['blockquote', 'link'],
  ['clean'],
];

type ToolbarContext = { quill: Quill };

export const RICH_TEXT_MODULES: QuillModules = {
  toolbar: {
    container: TOOLBAR,
    handlers: {
      undo(this: ToolbarContext) {
        this.quill.history.undo();
      },
      redo(this: ToolbarContext) {
        this.quill.history.redo();
      },
    },
  },
  // `userOnly`: loading server content must not become an undoable step.
  history: { delay: 600, maxStack: 200, userOnly: true },
  clipboard: { matchVisual: false },
};

const UNDO_ICON =
  '<svg viewBox="0 0 18 18"><polygon class="ql-fill ql-stroke" points="6 10 4 12 2 10 6 10"/><path class="ql-stroke" d="M8.09,13.91A4.6,4.6,0,0,0,9,14,5,5,0,1,0,4,9"/></svg>';
const REDO_ICON =
  '<svg viewBox="0 0 18 18"><polygon class="ql-fill ql-stroke" points="12 10 14 12 16 10 12 10"/><path class="ql-stroke" d="M9.91,13.91A4.6,4.6,0,0,1,9,14a5,5,0,1,1,5-5"/></svg>';

let formatsRegistered = false;

/**
 * One-time Quill setup, run before the first editor renders (ngx-quill's
 * `beforeRender`):
 *
 *   - loads the toolbar/theme stylesheet on demand (no cost on other pages)
 *   - switches align/direction/size from `ql-*` classes to inline styles, so
 *     the stored HTML is self-contained — the mobile apps don't ship Quill's
 *     CSS, and class-based formatting would silently render unformatted
 *   - adds undo/redo toolbar icons
 */
export async function prepareQuill(): Promise<void> {
  const [{ default: QuillCtor }] = await Promise.all([
    import('quill'),
    loadStylesheet(QUILL_STYLESHEET),
  ]);
  if (formatsRegistered) return;

  const SizeStyle = QuillCtor.import('attributors/style/size') as StyleAttributor;
  SizeStyle.whitelist = FONT_SIZES.filter((size): size is string => typeof size === 'string');

  const AlignStyle = QuillCtor.import('attributors/style/align') as StyleAttributor;
  AlignStyle.whitelist = ['right', 'center', 'left', 'justify'];

  QuillCtor.register(
    {
      'formats/align': AlignStyle,
      'formats/direction': QuillCtor.import('attributors/style/direction') as StyleAttributor,
      'formats/size': SizeStyle,
    },
    true,
  );

  const icons = QuillCtor.import('ui/icons') as Record<string, unknown>;
  icons['undo'] = UNDO_ICON;
  icons['redo'] = REDO_ICON;
  // Quill's icon for the default alignment is "align left"; in RTL it's right.
  const align = icons['align'] as Record<string, string>;
  const alignLeftIcon = align[''];
  align[''] = align['right'];
  align['left'] = alignLeftIcon;

  formatsRegistered = true;
}
