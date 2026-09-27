import { Observable, defer, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { ApiError } from '../models/api-response.model';

export type SavePhase = 'saving' | 'uploading';

export type ImageOutcome =
  /** No image was picked. */
  | 'none'
  | 'uploaded'
  /** The entity saved but its image upload failed — retryable. */
  | 'failed'
  /** The save response carried no id, so there was nothing to attach the image to. */
  | 'no-id';

export interface SaveWithImageResult<T> {
  entity: T;
  image: ImageOutcome;
  imageError?: ApiError;
}

/**
 * Two-step "save entity, then upload its image" flow for backends where the
 * image has its own endpoint (`POST /:id/image`).
 *
 * The save and the upload fail independently: a failed *save* errors the
 * stream (nothing was persisted), while a failed *upload* still resolves,
 * with `image: 'failed'`, because the entity itself IS saved. The caller can
 * then offer a retry of just the upload instead of pretending the whole
 * operation failed, which would lead to duplicate records on retry.
 */
export function saveWithImage<T extends { id: number | string; imageUrl: string | null }>(opts: {
  save: () => Observable<T>;
  file: File | null;
  upload: (id: T['id'], file: File) => Observable<{ imageUrl: string | null }>;
  onPhase?: (phase: SavePhase) => void;
}): Observable<SaveWithImageResult<T>> {
  return defer(() => {
    opts.onPhase?.('saving');
    return opts.save();
  }).pipe(
    switchMap((entity): Observable<SaveWithImageResult<T>> => {
      const file = opts.file;
      if (!file) return of({ entity, image: 'none' });
      if (!entity.id) return of({ entity, image: 'no-id' });

      opts.onPhase?.('uploading');
      return opts.upload(entity.id, file).pipe(
        map((res) => ({
          entity: { ...entity, imageUrl: res.imageUrl ?? entity.imageUrl },
          image: 'uploaded' as const,
        })),
        catchError((err: ApiError) => of({ entity, image: 'failed' as const, imageError: err })),
      );
    }),
  );
}
