/** href → load promise. Shared so concurrent callers never append duplicate `<link>`s. */
const loaded = new Map<string, Promise<void>>();

/**
 * Appends a `<link rel="stylesheet">` once and resolves when it has loaded.
 *
 * Pairs with non-injected style bundles in `angular.json`
 * (`{ "bundleName": "x", "inject": false }` → emitted as `x.css`) so heavy
 * third-party CSS is only downloaded by the pages that actually need it.
 *
 * A failed load resolves anyway (and is forgotten, so a later call retries):
 * unstyled UI is recoverable, a component stuck waiting forever is not.
 */
export function loadStylesheet(href: string): Promise<void> {
  const existing = loaded.get(href);
  if (existing) return existing;

  const promise = new Promise<void>((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => {
      // Usually a dev server started before the bundle was added to
      // `angular.json` (restart `ng serve`) — make it visible, not silent.
      console.error(`[loadStylesheet] Failed to load "${href}".`);
      loaded.delete(href);
      link.remove();
      resolve();
    };
    document.head.appendChild(link);
  });

  loaded.set(href, promise);
  return promise;
}
