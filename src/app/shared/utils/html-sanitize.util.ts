import DOMPurify from 'dompurify';

/**
 * XSS-safe HTML for `[innerHTML]` previews of server-provided content.
 *
 * Angular's built-in sanitizer strips `style` attributes, which would drop
 * alignment, direction and colors from the preview. DOMPurify keeps safe
 * inline styles while removing scripts, event handlers and `javascript:` URLs;
 * the result is then trusted via `DomSanitizer.bypassSecurityTrustHtml`.
 */
export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target'],
  });
}
