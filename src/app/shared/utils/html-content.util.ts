/**
 * Helpers for rich-text (HTML) content authored in the dashboard and rendered
 * by the customer/driver apps — privacy policy, terms, etc.
 *
 * Dependency-free on purpose: validators import this from eagerly-loaded
 * chunks. Sanitization (DOMPurify) lives in `html-sanitize.util.ts`.
 */

/** Markup an empty editor produces — treated the same as no content. */
const EMPTY_MARKUP = /^(<p>(<br\s*\/?>)?<\/p>|\s)*$/i;

/**
 * Cleans editor output before it is stored.
 *
 * Quill 2's `getSemanticHTML()` encodes *every* space as `&nbsp;`, which
 * would stop text from wrapping in the apps' web views. Single spaces become
 * normal spaces again; runs keep one `&nbsp;` per extra space so intentional
 * spacing survives.
 */
export function normalizeEditorHtml(html: string | null | undefined): string {
  if (!html || EMPTY_MARKUP.test(html)) return '';
  return html
    .replace(/(?:&nbsp;| )+/g, (run) => {
      const count = run.split(/&nbsp;| /).length - 1;
      return ' ' + '&nbsp;'.repeat(count - 1);
    })
    .trim();
}

/** Visible text of an HTML fragment (tags stripped, entities decoded). */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/ /g, ' ');
}

export function isHtmlBlank(html: string | null | undefined): boolean {
  return htmlToPlainText(html).trim() === '';
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
