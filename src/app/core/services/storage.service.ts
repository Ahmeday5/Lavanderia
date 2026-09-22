import { Injectable } from '@angular/core';

const MODE_KEY = 'app_storage_mode';

/**
 * Thin wrapper around `localStorage`/`sessionStorage` that:
 *   - never throws (handles SSR / disabled storage / quota errors)
 *   - serializes JSON via typed helpers
 *   - switches its backend based on "remember me": `persistent` (localStorage,
 *     survives browser restarts) or `session` (sessionStorage, cleared when
 *     the tab/browser closes)
 *
 * All app code must go through this service so we have a single seam to swap
 * implementations (e.g. cookies, IndexedDB) later if needed.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private mode: 'persistent' | 'session' = this.loadMode();

  /** Call once, before writing session data (e.g. from the login flow). */
  setMode(mode: 'persistent' | 'session'): void {
    this.mode = mode;
    try {
      this.backingStore(true)?.setItem(MODE_KEY, mode);
    } catch {
      /* ignore */
    }
  }

  getMode(): 'persistent' | 'session' {
    return this.mode;
  }

  private loadMode(): 'persistent' | 'session' {
    try {
      const fromSession = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(MODE_KEY) : null;
      if (fromSession === 'session') return 'session';
      const fromLocal = typeof localStorage !== 'undefined' ? localStorage.getItem(MODE_KEY) : null;
      if (fromLocal === 'persistent') return 'persistent';
    } catch {
      /* ignore */
    }
    return 'persistent';
  }

  /** `forWrite=true` always resolves localStorage — used only to persist the mode flag itself. */
  private backingStore(forWrite = false): Storage | null {
    try {
      if (forWrite) {
        return typeof localStorage !== 'undefined' ? localStorage : null;
      }
      if (this.mode === 'session') {
        return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
      }
      return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch {
      return null;
    }
  }

  get(key: string): string | null {
    try {
      return this.backingStore()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    try {
      this.backingStore()?.setItem(key, value);
    } catch {
      /* quota / disabled — ignore */
    }
  }

  remove(key: string): void {
    try {
      this.backingStore()?.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  /** Removes `key` from BOTH backends — used on logout so no stray copy survives a mode switch. */
  removeEverywhere(key: string): void {
    try {
      (typeof localStorage !== 'undefined' ? localStorage : null)?.removeItem(key);
    } catch {
      /* ignore */
    }
    try {
      (typeof sessionStorage !== 'undefined' ? sessionStorage : null)?.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  getJson<T>(key: string): T | null {
    const raw = this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  setJson<T>(key: string, value: T): void {
    try {
      this.set(key, JSON.stringify(value));
    } catch {
      /* circular / non-serializable — ignore */
    }
  }
}
