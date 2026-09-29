import { Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { ApiError } from '../models/api-response.model';
import { createEditableResource } from './editable-resource.util';

describe('createEditableResource', () => {
  const create = <T>(opts: Parameters<typeof createEditableResource<T>>[0]) =>
    runInInjectionContext(TestBed.inject(Injector), () => createEditableResource<T>(opts));

  it('loads immediately and syncs the server copy', () => {
    const synced: string[] = [];
    const resource = create<string>({
      load: () => of('server'),
      save: (v) => of(v),
      onSynced: (v) => synced.push(v),
    });

    expect(resource.status()).toBe('ready');
    expect(resource.saved()).toBe('server');
    expect(synced).toEqual(['server']);
  });

  it('surfaces load failures and recovers on reload', () => {
    let fail = true;
    const error: ApiError = { status: 500, message: 'boom' };
    const resource = create<string>({
      load: () => (fail ? throwError(() => error) : of('ok')),
      save: (v) => of(v),
      onSynced: () => {},
    });

    expect(resource.status()).toBe('error');
    expect(resource.loadError()).toBe(error);

    fail = false;
    resource.reload();
    expect(resource.status()).toBe('ready');
    expect(resource.loadError()).toBeNull();
  });

  it('moves the baseline to the server response only after a successful save', async () => {
    const resource = create<string>({
      load: () => of('v1'),
      save: (v) => of(`${v}-normalized`),
      onSynced: () => {},
    });

    await expectAsync(resource.save('v2')).toBeResolvedTo(true);
    expect(resource.saved()).toBe('v2-normalized');
  });

  it('keeps the baseline and reports the error when a save fails', async () => {
    const error: ApiError = { status: 400, message: 'invalid' };
    const resource = create<string>({
      load: () => of('v1'),
      save: () => throwError(() => error),
      onSynced: () => {},
    });

    await expectAsync(resource.save('v2')).toBeResolvedTo(false);
    expect(resource.saved()).toBe('v1');
    expect(resource.saveError()).toBe(error);
    expect(resource.isSaving()).toBeFalse();
  });

  it('refuses overlapping saves', async () => {
    const pending = new Subject<string>();
    const save = jasmine.createSpy('save').and.returnValue(pending);
    const resource = create<string>({ load: () => of('v1'), save, onSynced: () => {} });

    const first = resource.save('a');
    await expectAsync(resource.save('b')).toBeResolvedTo(false);
    expect(save).toHaveBeenCalledTimes(1);

    pending.next('a');
    pending.complete();
    await expectAsync(first).toBeResolvedTo(true);
  });
});
