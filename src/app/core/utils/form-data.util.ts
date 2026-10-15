/** A value that can travel as one `multipart/form-data` field. */
export type MultipartValue = string | number | boolean | File | null | undefined;

/**
 * Builds a `multipart/form-data` body from a flat record, for endpoints that
 * take files alongside their fields (ASP.NET `[FromForm]` binding).
 *
 *   - `null` / `undefined` / blank strings are OMITTED, not sent empty — so an
 *     edit can leave a password or an image untouched simply by not sending it
 *   - numbers and booleans are serialized invariantly (`12.5`, `true`)
 *   - files keep their name, so the server sees the real extension
 */
export function toMultipartBody(fields: Readonly<Record<string, MultipartValue>>): FormData {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined) continue;
    if (value instanceof File) {
      body.append(key, value, value.name);
    } else if (typeof value === 'string') {
      if (value.trim() !== '') body.append(key, value);
    } else {
      body.append(key, String(value));
    }
  }
  return body;
}
